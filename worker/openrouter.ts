import { z } from "zod";

export type AiRequestKind = "photo" | "search";

interface UsageState {
  photo: number;
  search: number;
  lastPhoto: number;
  lastSearch: number;
}

interface UsageNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface OpenRouterEnv {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_PHOTO_MODEL?: string;
  OPENROUTER_SEARCH_MODEL?: string;
  ALLOWED_ORIGINS?: string;
  AI_USAGE?: UsageNamespace;
}

export class AiApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function aiHeaders(request: Request, env: OpenRouterEnv) {
  const origin = request.headers.get("Origin");
  const requestOrigin = new URL(request.url).origin;
  const configured = (env.ALLOWED_ORIGINS || "https://kai0101-code.github.io").split(",").map(value => value.trim()).filter(Boolean);
  const local = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
  const allowedOrigin = !origin || origin === requestOrigin || local || configured.includes(origin) ? origin || "*" : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-MindMeal-Device",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

export function apiResponse(request: Request, env: OpenRouterEnv, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: aiHeaders(request, env) });
}

export function validateAiRequest(request: Request, env: OpenRouterEnv): Response | null {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: aiHeaders(request, env) });
  if (request.method !== "POST") return apiResponse(request, env, { error: "Method not allowed" }, 405);
  const origin = request.headers.get("Origin");
  if (origin && !aiHeaders(request, env)["Access-Control-Allow-Origin"]) return apiResponse(request, env, { error: "此來源未獲授權。" }, 403);
  if (!env.OPENROUTER_API_KEY) return apiResponse(request, env, { error: "AI 分析服務尚未完成設定。" }, 503);
  return null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function consumeUsage(request: Request, env: OpenRouterEnv, kind: AiRequestKind) {
  const limit = kind === "photo" ? 20 : 50;
  if (!env.AI_USAGE) return { remaining: null as number | null, limit, enforced: false };

  const rawDevice = request.headers.get("X-MindMeal-Device") || "anonymous-device";
  const device = /^[a-zA-Z0-9_-]{8,100}$/.test(rawDevice) ? rawDevice : "invalid-device";
  const network = request.headers.get("CF-Connecting-IP") || "local-network";
  const date = new Date().toISOString().slice(0, 10);
  const identity = await sha256(`${device}:${network}`);
  const key = `usage:${date}:${identity}`;
  const now = Date.now();
  const empty: UsageState = { photo: 0, search: 0, lastPhoto: 0, lastSearch: 0 };
  let state = empty;
  try {
    const saved = await env.AI_USAGE.get(key);
    if (saved) state = { ...empty, ...JSON.parse(saved) as Partial<UsageState> };
  } catch {
    state = empty;
  }

  const countKey = kind;
  const lastKey = kind === "photo" ? "lastPhoto" : "lastSearch";
  if (now - state[lastKey] < 2000) throw new AiApiError(429, "cooldown", "請稍候兩秒再重新送出。");
  if (state[countKey] >= limit) throw new AiApiError(429, "daily_limit", kind === "photo" ? "今天的照片分析次數已用完，可改用搜尋或手動輸入。" : "今天的 AI 搜尋次數已用完，可使用本機結果或手動輸入。");

  state[countKey] += 1;
  state[lastKey] = now;
  await env.AI_USAGE.put(key, JSON.stringify(state), { expirationTtl: 172800 });
  return { remaining: Math.max(0, limit - state[countKey]), limit, enforced: true };
}

type JsonSchema = Record<string, unknown>;

function responseText(payload: unknown): string {
  const parsed = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(item => typeof item === "object" && item && "text" in item ? String((item as { text: unknown }).text) : "").join("");
  return "";
}

export async function requestStructuredOutput<T>(options: {
  env: OpenRouterEnv;
  model: string;
  schemaName: string;
  jsonSchema: JsonSchema;
  validator: z.ZodType<T>;
  messages: unknown[];
  maxTokens: number;
}): Promise<T> {
  const deadline = Date.now() + 45000;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1000) break;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://kai0101-code.github.io",
          "X-Title": "MindMeal",
        },
        body: JSON.stringify({
          model: options.model,
          temperature: 0,
          max_tokens: options.maxTokens,
          messages: options.messages,
          response_format: {
            type: "json_schema",
            json_schema: { name: options.schemaName, strict: true, schema: options.jsonSchema },
          },
          provider: { require_parameters: true, data_collection: "deny" },
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 402 || status === 403 || status === 429) {
          throw new AiApiError(status === 402 ? 503 : status, status === 429 ? "provider_limit" : "provider_auth", status === 429 ? "AI 服務目前較忙，請稍後再試。" : "AI 服務額度或設定需要確認。");
        }
        continue;
      }
      const text = responseText(payload);
      const result = options.validator.safeParse(JSON.parse(text));
      if (result.success) return result.data;
    } catch (error) {
      if (error instanceof AiApiError) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new AiApiError(502, "invalid_ai_response", "AI 暫時無法回傳可用的餐點資料，請重新嘗試。");
}

export function handleAiError(request: Request, env: OpenRouterEnv, error: unknown, fallbackMessage: string) {
  if (error instanceof AiApiError) return apiResponse(request, env, { error: error.message, code: error.code }, error.status);
  console.error("MindMeal AI request failed", error instanceof Error ? error.name : "UnknownError");
  return apiResponse(request, env, { error: fallbackMessage, code: "ai_unavailable" }, 502);
}
