import { z } from "zod";
import { apiResponse, consumeUsage, handleAiError, requestStructuredOutput, validateAiRequest, type OpenRouterEnv } from "./openrouter";

export type MealAnalysisEnv = OpenRouterEnv;

const mealSchema = z.object({
  name: z.string().min(1).max(60),
  calories: z.number().int().min(0).max(5000),
  protein: z.number().int().min(0).max(500),
  carbs: z.number().int().min(0).max(1000),
  fat: z.number().int().min(0).max(500),
  rice: z.enum(["半碗", "一碗", "加飯", "無主食"]),
  sauce: z.enum(["少", "正常", "多", "無"]),
  completion: z.literal("吃完"),
  ingredients: z.array(z.string().min(1).max(30)).min(1).max(12),
});

const mealAnalysisSchema = z.object({
  recognized: z.boolean(),
  meal: mealSchema,
  meta: z.object({
    confidence: z.enum(["high", "medium", "low"]),
    summary: z.string().max(160),
    assumptions: z.array(z.string().max(100)).max(4),
  }),
});

const mealProperties = {
  name: { type: "string", description: "Concise Traditional Chinese name for the complete meal" },
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
  required: ["recognized", "meal", "meta"],
  properties: {
    recognized: { type: "boolean", description: "Whether a meal can be identified from the image" },
    meal: {
      type: "object",
      additionalProperties: false,
      required: ["name", "calories", "protein", "carbs", "fat", "rice", "sauce", "completion", "ingredients"],
      properties: mealProperties,
    },
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["confidence", "summary", "assumptions"],
      properties: {
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        summary: { type: "string" },
        assumptions: { type: "array", maxItems: 4, items: { type: "string" } },
      },
    },
  },
};

export async function handleMealAnalysis(request: Request, env: MealAnalysisEnv) {
  const invalid = validateAiRequest(request, env);
  if (invalid) return invalid;
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4 * 1024 * 1024) return apiResponse(request, env, { error: "照片資料過大，請改用較小的圖片。" }, 413);

  let image = "";
  try {
    const body = await request.json() as { image?: unknown };
    image = typeof body.image === "string" ? body.image : "";
  } catch {
    return apiResponse(request, env, { error: "無法讀取照片資料。" }, 400);
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image) || image.length > 3.5 * 1024 * 1024) {
    return apiResponse(request, env, { error: "照片格式不支援或資料過大。" }, 400);
  }

  try {
    const usage = await consumeUsage(request, env, "photo");
    const model = env.OPENROUTER_PHOTO_MODEL || "google/gemini-3.6-flash";
    const output = await requestStructuredOutput({
      env,
      model,
      schemaName: "mindmeal_photo_analysis",
      jsonSchema,
      validator: mealAnalysisSchema,
      maxTokens: 1200,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "你是台灣飲食紀錄輔助工具。分析照片中可見的整份餐點，保守估算總熱量、蛋白質、碳水與脂肪，數值使用合理整數。餐點名稱與食材使用繁體中文，不要另外建立克數、重量或份量欄位。若照片不是食物或完全無法辨識，recognized 設為 false；若只能部分判斷，recognized 設為 true、confidence 設為 low。不可描述為醫療診斷、過敏原確認或精確營養處方。" },
          { type: "image_url", image_url: { url: image } },
        ],
      }],
    });
    if (!output.recognized) return apiResponse(request, env, { error: "這張照片暫時無法辨識為餐點，請換一張照片或改用手動輸入。", code: "not_food" }, 422);
    return apiResponse(request, env, {
      meal: output.meal,
      meta: { ...output.meta, model: "OpenRouter AI", source: "photo-ai", remaining: usage.remaining },
    });
  } catch (error) {
    return handleAiError(request, env, error, "AI 暫時無法完成分析，請重新拍攝或改用手動輸入。");
  }
}
