import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

export interface MealAnalysisEnv {
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

const mealAnalysisSchema = z.object({
  meal: z.object({
    name: z.string().describe("Concise Traditional Chinese name for the complete meal"),
    calories: z.number().describe("Estimated total kilocalories, rounded to a whole number"),
    protein: z.number().describe("Estimated protein grams, rounded to a whole number"),
    carbs: z.number().describe("Estimated carbohydrate grams, rounded to a whole number"),
    fat: z.number().describe("Estimated fat grams, rounded to a whole number"),
    rice: z.enum(["半碗", "一碗", "加飯", "無主食"]),
    sauce: z.enum(["少", "正常", "多", "無"]),
    completion: z.literal("吃完"),
    ingredients: z.array(z.string()).describe("Visible primary ingredients in Traditional Chinese"),
  }),
  meta: z.object({
    confidence: z.enum(["high", "medium", "low"]),
    summary: z.string().describe("One concise Traditional Chinese explanation of the estimate"),
    assumptions: z.array(z.string()).describe("Two to four Traditional Chinese assumptions about portions, oil, sauce, or hidden ingredients"),
  }),
});

export function mealAnalysisHeaders(request: Request, env: MealAnalysisEnv) {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  const configured = (env.ALLOWED_ORIGINS || "https://kai0101-code.github.io").split(",").map(value => value.trim()).filter(Boolean);
  const local = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
  const allowedOrigin = !origin || origin === requestOrigin || local || configured.includes(origin) ? origin || "*" : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function apiResponse(request: Request, env: MealAnalysisEnv, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: mealAnalysisHeaders(request, env) });
}

export async function handleMealAnalysis(request: Request, env: MealAnalysisEnv) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: mealAnalysisHeaders(request, env) });
  if (request.method !== "POST") return apiResponse(request, env, { error: "Method not allowed" }, 405);
  const origin = request.headers.get("Origin");
  const headers = mealAnalysisHeaders(request, env);
  if (origin && !headers["Access-Control-Allow-Origin"]) return apiResponse(request, env, { error: "此來源未獲授權。" }, 403);
  if (!env.GEMINI_API_KEY) return apiResponse(request, env, { error: "AI 分析服務尚未完成設定。" }, 503);
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 9 * 1024 * 1024) return apiResponse(request, env, { error: "照片資料過大，請改用較小的圖片。" }, 413);
  let image = "";
  try {
    const body = await request.json() as { image?: unknown };
    image = typeof body.image === "string" ? body.image : "";
  } catch {
    return apiResponse(request, env, { error: "無法讀取照片資料。" }, 400);
  }
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image) || image.length > 9 * 1024 * 1024) {
    return apiResponse(request, env, { error: "照片格式不支援或資料過大。" }, 400);
  }
  try {
    const google = createGoogle({ apiKey: env.GEMINI_API_KEY });
    const { output } = await generateText({
      model: google("gemini-3.6-flash"),
      temperature: 0,
      timeout: { totalMs: 45000 },
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
      output: Output.object({ schema: mealAnalysisSchema }),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "你是飲食紀錄輔助工具。分析這張餐點照片中可見的整份餐點，估算總熱量、蛋白質、碳水與脂肪。請以台灣常見份量與烹調方式作保守估算；不可把結果描述為醫療診斷。若照片不清楚、不是食物、份量被遮擋或無法判斷，將 confidence 設為 low 並在 assumptions 清楚說明。數值必須為非負的合理整數；食材、摘要與假設使用繁體中文。" },
          { type: "file", mediaType: "image/jpeg", data: image },
        ],
      }],
    });
    const clamp = (value: number, maximum: number) => Math.min(maximum, Math.max(0, Math.round(value)));
    return apiResponse(request, env, {
      meal: {
        ...output.meal,
        calories: clamp(output.meal.calories, 5000),
        protein: clamp(output.meal.protein, 500),
        carbs: clamp(output.meal.carbs, 1000),
        fat: clamp(output.meal.fat, 500),
        ingredients: output.meal.ingredients.slice(0, 12),
      },
      meta: { ...output.meta, assumptions: output.meta.assumptions.slice(0, 4), model: "Gemini 3.6 Flash" },
    });
  } catch (error) {
    console.error("Gemini meal analysis failed", error instanceof Error ? error.message : "Unknown error");
    return apiResponse(request, env, { error: "Gemini 暫時無法完成分析，請重新拍攝或改用手動輸入。" }, 502);
  }
}
