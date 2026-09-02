import { z } from "zod";
import { apiResponse, consumeUsage, handleAiError, requestStructuredOutput, validateAiRequest, type OpenRouterEnv } from "./openrouter";

const candidateSchema = z.object({
  meal: z.object({
    name: z.string().min(1).max(60),
    calories: z.number().int().min(0).max(5000),
    protein: z.number().int().min(0).max(500),
    carbs: z.number().int().min(0).max(1000),
    fat: z.number().int().min(0).max(500),
    rice: z.enum(["半碗", "一碗", "加飯", "無主食"]),
    sauce: z.enum(["少", "正常", "多", "無"]),
    completion: z.literal("吃完"),
    ingredients: z.array(z.string().min(1).max(30)).min(1).max(12),
  }),
  confidence: z.enum(["high", "medium", "low"]),
  needsClarification: z.boolean(),
});

const searchSchema = z.object({ results: z.array(candidateSchema).min(3).max(5) });

const mealProperties = {
  name: { type: "string" },
  calories: { type: "integer", minimum: 0, maximum: 5000 },
  protein: { type: "integer", minimum: 0, maximum: 500 },
  carbs: { type: "integer", minimum: 0, maximum: 1000 },
  fat: { type: "integer", minimum: 0, maximum: 500 },
  rice: { type: "string", enum: ["半碗", "一碗", "加飯", "無主食"] },
  sauce: { type: "string", enum: ["少", "正常", "多", "無"] },
  completion: { type: "string", enum: ["吃完"] },
  ingredients: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } },
};

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["meal", "confidence", "needsClarification"],
        properties: {
          meal: {
            type: "object",
            additionalProperties: false,
            required: ["name", "calories", "protein", "carbs", "fat", "rice", "sauce", "completion", "ingredients"],
            properties: mealProperties,
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          needsClarification: { type: "boolean" },
        },
      },
    },
  },
};

export async function handleFoodSearch(request: Request, env: OpenRouterEnv) {
  const invalid = validateAiRequest(request, env);
  if (invalid) return invalid;
  let query = "";
  try {
    const body = await request.json() as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return apiResponse(request, env, { error: "無法讀取搜尋內容。" }, 400);
  }
  if (query.length < 1 || query.length > 100) return apiResponse(request, env, { error: "請輸入 1–100 個字的餐點名稱或食材。" }, 400);

  try {
    const usage = await consumeUsage(request, env, "search");
    const model = env.OPENROUTER_SEARCH_MODEL || "google/gemini-2.5-flash-lite";
    const output = await requestStructuredOutput({
      env,
      model,
      schemaName: "mindmeal_food_search",
      jsonSchema,
      validator: searchSchema,
      maxTokens: 1500,
      messages: [{
        role: "user",
        content: `你是台灣飲食紀錄輔助工具。使用者搜尋：「${query}」。請依名稱、品牌、數量與料理方式的相符程度，提供 3 到 5 個不重複的候選餐點，最符合者排最前。保留使用者寫出的數量在餐點名稱中，例如「2 顆茶葉蛋」，但不要建立克數、重量或額外份量欄位。估算每個候選的總熱量、蛋白質、碳水與脂肪，使用合理整數；名稱與食材使用繁體中文。若品牌、數量或料理方式不足以合理判斷，needsClarification 設為 true 且 confidence 設為 low。這是 AI 估算，不可宣稱為官方品牌資料、醫療診斷或精確營養處方。`,
      }],
    });
    return apiResponse(request, env, {
      results: output.results.map(result => ({
        meal: result.meal,
        meta: {
          confidence: result.confidence,
          summary: result.needsClarification ? "請補充品牌、數量或料理方式。" : "已依搜尋內容完成估算。",
          assumptions: [],
          model: "OpenRouter AI",
          source: "search-ai",
        },
        needsClarification: result.needsClarification,
      })),
      usage: { remaining: usage.remaining },
    });
  } catch (error) {
    return handleAiError(request, env, error, "AI 搜尋暫時無法使用，已保留本機搜尋與手動輸入。");
  }
}
