import { z } from "zod";
import { apiResponse, consumeUsage, handleAiError, requestStructuredOutput, validateAiRequest, type OpenRouterEnv } from "./openrouter";

const nutritionSchema = z.object({
  calories: z.number().int().min(0).max(10000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(2000),
  fat: z.number().int().min(0).max(1000),
});

const requestSchema = z.object({
  date: z.string().min(8).max(20),
  totals: nutritionSchema,
  targets: nutritionSchema,
  profile: z.object({
    goal: z.string().max(40),
    preferences: z.array(z.string().max(40)).max(20),
    exclusions: z.array(z.string().max(40)).max(20),
    contexts: z.array(z.string().max(40)).max(20),
    frequency: z.string().max(40),
  }),
  recentMeals: z.array(z.string().max(80)).max(12),
});

const recommendationSchema = z.object({
  meal: z.string().min(1).max(60),
  searchQuery: z.string().min(1).max(60),
  focus: z.string().min(1).max(40),
  orderTip: z.string().min(1).max(100),
  notice: z.string().min(1).max(120),
  calories: z.number().int().min(0).max(3000),
  protein: z.number().int().min(0).max(300),
  carbs: z.number().int().min(0).max(500),
  fat: z.number().int().min(0).max(300),
});

const outputSchema = z.object({
  focusLabel: z.string().min(1).max(40),
  guidance: z.string().min(1).max(100),
  recommendations: z.array(recommendationSchema).length(3),
});

const nutritionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["calories", "protein", "carbs", "fat"],
  properties: {
    calories: { type: "integer", minimum: 0, maximum: 3000 },
    protein: { type: "integer", minimum: 0, maximum: 300 },
    carbs: { type: "integer", minimum: 0, maximum: 500 },
    fat: { type: "integer", minimum: 0, maximum: 300 },
  },
};

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["focusLabel", "guidance", "recommendations"],
  properties: {
    focusLabel: { type: "string" },
    guidance: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["meal", "searchQuery", "focus", "orderTip", "notice", "calories", "protein", "carbs", "fat"],
        properties: {
          meal: { type: "string" },
          searchQuery: { type: "string" },
          focus: { type: "string" },
          orderTip: { type: "string" },
          notice: { type: "string" },
          ...nutritionJsonSchema.properties,
        },
      },
    },
  },
};

export async function handleNextMealRecommendation(request: Request, env: OpenRouterEnv) {
  const invalid = validateAiRequest(request, env);
  if (invalid) return invalid;

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return apiResponse(request, env, { error: "無法讀取今日營養與飲食設定。" }, 400);
  }

  try {
    const usage = await consumeUsage(request, env, "search");
    const model = env.OPENROUTER_SEARCH_MODEL || "google/gemini-2.5-flash-lite";
    const output = await requestStructuredOutput({
      env,
      model,
      schemaName: "mindmeal_next_meal",
      jsonSchema,
      validator: outputSchema,
      maxTokens: 1800,
      messages: [{
        role: "user",
        content: `你是台灣日常飲食選擇輔助工具。請依下列結構化資料提供下一餐方向：
${JSON.stringify(input)}

請產生剛好 3 個彼此不同、可在台灣一般餐廳或便利商店找到的餐點建議。每筆需包含適合直接交給 Google Maps 的繁體中文 searchQuery，但不可捏造店名、距離、價格或營業資訊。考量今日已記錄的營養量、目標、飲食偏好、排除項目、常見用餐情境及今天已吃的餐點；不要重複 recentMeals。

語氣保持平靜、不製造壓力，不使用「尚缺」「超標」「必須」等字眼。focusLabel 與 guidance 說明今天下一餐可以優先考量的方向；orderTip 要能直接用於點餐；notice 只提醒一個實用注意點。營養數值為整份餐點的合理整數估算。這不是醫療診斷或精確營養處方。`,
      }],
    });

    return apiResponse(request, env, { ...output, usage: { remaining: usage.remaining } });
  } catch (error) {
    return handleAiError(request, env, error, "下一餐建議暫時無法產生，請稍後再試。");
  }
}
