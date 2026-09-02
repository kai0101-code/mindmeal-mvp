"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import YellowManModel, { preloadYellowManModel } from "./YellowManModel";

type Screen = "welcome" | "onboarding" | "home" | "history" | "scan" | "album" | "food-search" | "manual-entry" | "analysis" | "result" | "nearby" | "store" | "profile" | "account" | "settings" | "reminders" | "edit-meal";
type AlbumPermission = "unknown" | "allowed";
type SettingsSection = "body" | "preferences" | "contexts";
type LocationPermission = "unknown" | "allowed" | "denied";
type CameraPermission = "unknown" | "allowed" | "denied";
type MealType = "早餐" | "午餐" | "晚餐" | "宵夜／點心";
type ReminderMeal = "早餐" | "午餐" | "晚餐";
type ReminderWindow = { enabled: boolean; start: string; end: string };
type ReminderWindows = Record<ReminderMeal, ReminderWindow>;
type Profile = {
  name: string;
  email: string;
  avatar: string;
  avatarX: number;
  avatarY: number;
  avatarZoom: number;
  age: string;
  height: string;
  weight: string;
  gender: string;
  activity: string;
  goal: string;
  preferences: string[];
  exclusions: string[];
  contexts: string[];
  frequency: string;
  meals: string[];
  reminder: string;
  reminderWindows: ReminderWindows;
  camera: CameraPermission;
  location: LocationPermission;
};
type Meal = {
  id: number;
  name: string;
  mealType?: MealType;
  eatenAt?: string;
  recordedAt?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  rice: string;
  sauce: string;
  completion: string;
  ingredients: string[];
};
type NutritionTargets = { calories: number; protein: number; carbs: number; fat: number; water: number };
type MealAnalysisMeta = {
  confidence: "high" | "medium" | "low";
  summary: string;
  assumptions: string[];
  model: string;
  source?: "photo-ai" | "search-ai" | "local";
  remaining?: number | null;
};
type MealPhotoAnalysis = { meal: Meal; meta: MealAnalysisMeta; imageUrl: string };
type FoodSearchCandidate = { meal: Meal; meta?: MealAnalysisMeta; needsClarification?: boolean };
type NextMealRecommendation = {
  meal: string;
  searchQuery: string;
  focus: string;
  orderTip: string;
  notice: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
type NextMealPlan = {
  focusLabel: string;
  guidance: string;
  recommendations: NextMealRecommendation[];
};

const reminderMealTypes: ReminderMeal[] = ["早餐", "午餐", "晚餐"];
const defaultReminderWindows: ReminderWindows = {
  早餐: { enabled: true, start: "07:00", end: "10:00" },
  午餐: { enabled: true, start: "11:30", end: "14:00" },
  晚餐: { enabled: true, start: "17:30", end: "21:00" },
};

const emptyProfile: Profile = {
  name: "",
  email: "",
  avatar: "",
  avatarX: 50,
  avatarY: 50,
  avatarZoom: 1.3,
  age: "28",
  height: "168",
  weight: "62",
  gender: "女性",
  activity: "",
  goal: "減脂",
  preferences: [],
  exclusions: [],
  contexts: [],
  frequency: "幾乎不外食",
  meals: ["早餐"],
  reminder: "用餐前 20 分鐘",
  reminderWindows: defaultReminderWindows,
  camera: "unknown",
  location: "unknown",
};
const base = { calories: 212, protein: 0, carbs: 34, fat: 7, water: 900 };
const demoMeal: Meal = {
  id: 1,
  name: "香煎雞胸時蔬飯",
  calories: 620,
  protein: 42,
  carbs: 72,
  fat: 18,
  rice: "一碗",
  sauce: "正常",
  completion: "吃完",
  ingredients: ["雞胸肉", "白飯", "花椰菜", "玉米筍"],
};
const foodLibrary: Meal[] = [
  { id: 11, name: "麥當勞漢堡", calories: 263, protein: 13, carbs: 31, fat: 10, rice: "一碗", sauce: "正常", completion: "吃完", ingredients: ["牛肉", "漢堡麵包", "酸黃瓜", "洋蔥"] },
  { id: 12, name: "紅燒牛肉麵", calories: 650, protein: 32, carbs: 78, fat: 22, rice: "一碗", sauce: "正常", completion: "吃完", ingredients: ["牛肉", "麵條", "青菜", "紅燒湯頭"] },
  { id: 13, name: "烤雞腿便當", calories: 720, protein: 38, carbs: 92, fat: 20, rice: "一碗", sauce: "正常", completion: "吃完", ingredients: ["雞腿", "白飯", "高麗菜", "滷蛋"] },
  { id: 14, name: "鮭魚生菜飯碗", calories: 560, protein: 34, carbs: 64, fat: 18, rice: "一碗", sauce: "少", completion: "吃完", ingredients: ["鮭魚", "糙米", "生菜", "玉米"] },
  { id: 15, name: "茶葉蛋", calories: 73, protein: 7, carbs: 1, fat: 5, rice: "一碗", sauce: "少", completion: "吃完", ingredients: ["雞蛋"] },
  { id: 16, name: "無糖豆漿", calories: 180, protein: 12, carbs: 20, fat: 6, rice: "一碗", sauce: "少", completion: "吃完", ingredients: ["黃豆", "水"] },
];

function normalizeProfile(value?: Partial<Profile> & { location?: LocationPermission | boolean; camera?: CameraPermission | boolean }): Profile {
  const location = value?.location === true ? "allowed" : value?.location === false ? "unknown" : value?.location || "unknown";
  const camera = value?.camera === true ? "allowed" : value?.camera === false ? "denied" : value?.camera || "unknown";
  const name = value?.name && value.name !== "7000" ? value.name : "";
  const reminderWindows = reminderMealTypes.reduce((result, mealType) => {
    const saved = value?.reminderWindows?.[mealType];
    result[mealType] = {
      enabled: typeof saved?.enabled === "boolean" ? saved.enabled : defaultReminderWindows[mealType].enabled,
      start: typeof saved?.start === "string" && saved.start.length === 5 && saved.start.includes(":") ? saved.start : defaultReminderWindows[mealType].start,
      end: typeof saved?.end === "string" && saved.end.length === 5 && saved.end.includes(":") ? saved.end : defaultReminderWindows[mealType].end,
    };
    return result;
  }, {} as ReminderWindows);
  const contexts = (value?.contexts || emptyProfile.contexts).map(item => item === "便當" ? "便當店" : item);
  return { ...emptyProfile, ...value, name, camera, location, reminderWindows, contexts };
}

async function requestCameraStream(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Camera access requires a secure browser context.", "SecurityError");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  } catch (failure) {
    const name = failure instanceof Error ? failure.name : "";
    if (name !== "OverconstrainedError" && name !== "NotFoundError" && name !== "TypeError") throw failure;
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

function cameraFailureCopy(failure: unknown): string {
  const name = failure instanceof DOMException ? failure.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return "相機權限尚未開啟，請在瀏覽器的網站設定中允許相機後重試。";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "找不到可使用的相機設備。";
  if (name === "SecurityError") return "相機需要透過安全網址開啟，請使用 GitHub 發布的 HTTPS 網頁。";
  if (name === "AbortError") return "相機啟動逾時，請重新點擊開啟，或改用系統拍照。";
  return "相機目前被其他程式使用，或暫時無法開啟。";
}

const mealTypes: MealType[] = ["早餐", "午餐", "晚餐", "宵夜／點心"];

function suggestedMealType(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "早餐";
  if (hour >= 11 && hour < 15) return "午餐";
  if (hour >= 17 && hour < 22) return "晚餐";
  return "宵夜／點心";
}

function validMealDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameLocalDate(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function localDateKey(date = new Date()): string {
  return date.getFullYear() + "-" + padDatePart(date.getMonth() + 1) + "-" + padDatePart(date.getDate());
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function deterministicMinute(date: Date, mealType: ReminderMeal, window: ReminderWindow): number {
  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);
  const span = Math.max(1, end - start);
  const seed = localDateKey(date) + "-" + mealType;
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return start + (hash % span);
}

function toDateTimeInput(value?: string): string {
  const date = validMealDate(value) || new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatMealTime(value?: string): string {
  const date = validMealDate(value) || new Date();
  return new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatMealMoment(value?: string, reference = new Date()): string {
  const date = validMealDate(value) || reference;
  if (sameLocalDate(date, reference)) return `今天 ${formatMealTime(date.toISOString())}`;
  const yesterday = new Date(reference);
  yesterday.setDate(reference.getDate() - 1);
  if (sameLocalDate(date, yesterday)) return `昨天 ${formatMealTime(date.toISOString())}`;
  const day = new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(date);
  return `${day} ${formatMealTime(date.toISOString())}`;
}

function formatHistoryDate(value?: string, reference = new Date()): string {
  const date = validMealDate(value) || reference;
  if (sameLocalDate(date, reference)) return "今天";
  const yesterday = new Date(reference);
  yesterday.setDate(reference.getDate() - 1);
  if (sameLocalDate(date, yesterday)) return "昨天";
  return new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function normalizeMeal(value?: Partial<Meal> | null): Meal | null {
  if (!value) return null;
  const now = new Date();
  const eatenAt = (validMealDate(value.eatenAt) || now).toISOString();
  const recordedAt = (validMealDate(value.recordedAt) || now).toISOString();
  const mealType = value.mealType && mealTypes.includes(value.mealType) ? value.mealType : suggestedMealType(new Date(eatenAt));
  return { ...demoMeal, ...value, id: value.id || 1, mealType, eatenAt, recordedAt };
}

function calculateNutritionTargets(profile: Profile): NutritionTargets {
  // Mifflin–St Jeor resting energy, adjusted by activity and goal; macros stay within adult AMDR ranges.
  const age = Math.min(80, Math.max(18, Number(profile.age) || 28));
  const height = Math.min(220, Math.max(130, Number(profile.height) || 168));
  const weight = Math.min(250, Math.max(35, Number(profile.weight) || 62));
  const restingEnergy = 10 * weight + 6.25 * height - 5 * age + (profile.gender === "男性" ? 5 : -161);
  const activityFactor = profile.activity === "每週 4 天以上" ? 1.7 : profile.activity === "每週 2–3 天" ? 1.5 : profile.activity === "每週 1 天" ? 1.35 : 1.2;
  const goalFactor = profile.goal === "減脂" ? .85 : profile.goal === "增肌" ? 1.1 : 1;
  const calories = Math.round(Math.min(4500, Math.max(1200, restingEnergy * activityFactor * goalFactor)) / 10) * 10;
  const activityProtein = profile.activity === "每週 4 天以上" ? 1.4 : profile.activity === "每週 2–3 天" ? 1.2 : profile.activity === "每週 1 天" ? 1 : .8;
  const proteinFactor = profile.goal === "增肌" ? Math.max(1.6, activityProtein) : profile.goal === "減脂" ? Math.max(1.4, activityProtein) : activityProtein;
  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round(calories * .3 / 9);
  const carbs = Math.max(130, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round(Math.max(1500, weight * 30) / 50) * 50;
  return { calories, protein, carbs, fat, water };
}

function avatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("Canvas unavailable")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", .84));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Invalid image")); };
    image.src = url;
  });
}

function mealPhotoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) { reject(new Error("請選擇 JPG、PNG 或 WebP 餐點照片。")); return; }
    if (file.size > 12 * 1024 * 1024) { reject(new Error("照片超過 12MB，請改用較小的圖片。")); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const render = (maxSize: number, quality: number) => {
        const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return "";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", quality);
      };
      let result = render(1600, .82);
      if (result.length > 3.25 * 1024 * 1024) result = render(1280, .72);
      URL.revokeObjectURL(url);
      if (!result) { reject(new Error("這台裝置無法處理照片。")); return; }
      if (result.length > 3.25 * 1024 * 1024) { reject(new Error("照片壓縮後仍然過大，請換一張再試。")); return; }
      resolve(result);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法讀取這張照片，請換一張再試。")); };
    image.src = url;
  });
}

function aiEndpoint(path: "/api/analyze-meal" | "/api/search-food" | "/api/recommend-next-meal"): string {
  const configuredUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MINDMEAL_ANALYSIS_API_URL;
  if (!configuredUrl) return path;
  return configuredUrl.replace(/\/api\/analyze-meal\/?$/, path);
}

function aiDeviceId(): string {
  const key = "mindmeal-ai-device";
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;
  const created = typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

async function analyzeMealPhoto(imageUrl: string): Promise<MealPhotoAnalysis> {
  const response = await fetch(aiEndpoint("/api/analyze-meal"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MindMeal-Device": aiDeviceId() },
    body: JSON.stringify({ image: imageUrl }),
  });
  const payload = await response.json().catch(() => null) as ({ meal?: Partial<Meal>; meta?: Partial<MealAnalysisMeta>; error?: string } | null);
  if (!response.ok || !payload?.meal) throw new Error(payload?.error || "AI 分析服務暫時無法使用，請稍後再試或改用手動輸入。");
  const meal = normalizeMeal(payload.meal);
  if (!meal) throw new Error("AI 沒有回傳可用的營養資料，請重新拍攝。 ");
  return {
    meal: { ...meal, id: Date.now() },
    imageUrl,
    meta: {
      confidence: payload.meta?.confidence === "high" || payload.meta?.confidence === "low" ? payload.meta.confidence : "medium",
      summary: payload.meta?.summary || "已依照片中的可見食材與份量完成估算。",
      assumptions: Array.isArray(payload.meta?.assumptions) ? payload.meta.assumptions.filter(Boolean) : [],
      model: payload.meta?.model || "OpenRouter AI",
      source: "photo-ai",
      remaining: typeof payload.meta?.remaining === "number" ? payload.meta.remaining : null,
    },
  };
}

async function searchFoodWithAi(query: string): Promise<FoodSearchCandidate[]> {
  const response = await fetch(aiEndpoint("/api/search-food"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MindMeal-Device": aiDeviceId() },
    body: JSON.stringify({ query }),
  });
  const payload = await response.json().catch(() => null) as ({ results?: Array<{ meal?: Partial<Meal>; meta?: Partial<MealAnalysisMeta>; needsClarification?: boolean }>; error?: string } | null);
  if (!response.ok || !Array.isArray(payload?.results)) throw new Error(payload?.error || "AI 搜尋暫時無法使用，請稍後再試。");
  return payload.results.flatMap((candidate, index) => {
    const meal = normalizeMeal(candidate.meal);
    if (!meal) return [];
    const confidence = candidate.meta?.confidence === "high" || candidate.meta?.confidence === "low" ? candidate.meta.confidence : "medium";
    return [{
      meal: { ...meal, id: Date.now() + index },
      meta: {
        confidence,
        summary: candidate.meta?.summary || "已依搜尋內容完成估算。",
        assumptions: Array.isArray(candidate.meta?.assumptions) ? candidate.meta.assumptions.filter(Boolean) : [],
        model: candidate.meta?.model || "OpenRouter AI",
        source: "search-ai" as const,
      },
      needsClarification: Boolean(candidate.needsClarification),
    }];
  });
}

async function recommendNextMealWithAi(input: {
  date: string;
  totals: Pick<NutritionTargets, "calories" | "protein" | "carbs" | "fat">;
  targets: Pick<NutritionTargets, "calories" | "protein" | "carbs" | "fat">;
  profile: Pick<Profile, "goal" | "preferences" | "exclusions" | "contexts" | "frequency">;
  recentMeals: string[];
}): Promise<NextMealPlan> {
  const response = await fetch(aiEndpoint("/api/recommend-next-meal"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-MindMeal-Device": aiDeviceId() },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null) as (Partial<NextMealPlan> & { error?: string } | null);
  if (!response.ok || !payload || typeof payload.focusLabel !== "string" || typeof payload.guidance !== "string" || !Array.isArray(payload.recommendations)) {
    throw new Error(payload?.error || "下一餐建議暫時無法產生，請稍後再試。");
  }
  const recommendations = payload.recommendations.filter(item =>
    item && typeof item.meal === "string" && typeof item.searchQuery === "string" &&
    typeof item.focus === "string" && typeof item.orderTip === "string" && typeof item.notice === "string" &&
    ["calories", "protein", "carbs", "fat"].every(key => Number.isFinite(Number(item[key as keyof NextMealRecommendation])))
  ).slice(0, 3).map(item => ({
    ...item,
    calories: Math.max(0, Math.round(Number(item.calories))),
    protein: Math.max(0, Math.round(Number(item.protein))),
    carbs: Math.max(0, Math.round(Number(item.carbs))),
    fat: Math.max(0, Math.round(Number(item.fat))),
  }));
  if (recommendations.length !== 3) throw new Error("AI 暫時無法回傳完整建議，請重新產生。");
  return { focusLabel: payload.focusLabel, guidance: payload.guidance, recommendations };
}

function avatarTransform(x: number, y: number, zoom = 1.3) {
  return `translate(${(50 - x) * .35}%, ${(50 - y) * .35}%) scale(${zoom})`;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'));
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function Brand({ onHome, staticMark = false }: { onHome?: () => void; staticMark?: boolean }) {
  const artwork = <><span className="brand-line" /><span className="brand-zh">有 意 食</span><span className="brand-en">Mind Meal<span className="brand-dot" aria-hidden="true" /></span></>;
  if (staticMark) return <div className="brand" aria-label="MindMeal 有意食">{artwork}</div>;
  return <button type="button" className="brand brand-home-link" onClick={onHome || (() => window.dispatchEvent(new Event("mindmeal-go-home")))} aria-label="返回首頁">{artwork}</button>;
}

function ProfileIcon() {
  return <svg className="profile-placeholder-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.6-4.7 3-7 7.5-7s6.9 2.3 7.5 7" /></svg>;
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.7 12s3.3-5.2 9.3-5.2 9.3 5.2 9.3 5.2-3.3 5.2-9.3 5.2S2.7 12 2.7 12Z" /><circle cx="12" cy="12" r="2.6" />{!visible && <path d="m4 4 16 16" />}</svg>;
}

function Wave() {
  return <div className="wave" aria-hidden="true" />;
}

function AppHeader({ label }: { label?: string }) {
  return <header className="app-header" aria-label={label ? "MindMeal" : undefined}><Brand /></header>;
}

function BottomNav({ screen, go, blocked = false }: { screen: Screen; go: (screen: Screen) => void; blocked?: boolean }) {
  const active = screen === "nearby" || screen === "store" ? "nearby" : screen === "profile" || screen === "account" || screen === "settings" || screen === "reminders" ? "profile" : screen === "scan" || screen === "album" || screen === "food-search" || screen === "manual-entry" || screen === "analysis" ? "scan" : "home";
  const items: { key: "home" | "scan" | "nearby" | "profile"; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "首頁" },
    { key: "scan", icon: "+", label: "紀錄飲食" },
    { key: "nearby", icon: "⌖", label: "下一餐地圖" },
    { key: "profile", icon: "○", label: "我的資料" },
  ];
  return <nav className="bottom-nav icon-only-nav" aria-label="主要導覽" aria-hidden={blocked} inert={blocked}>{items.map(item => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""} ${item.key === "scan" ? "scan-nav" : ""}`} onClick={() => go(item.key)} aria-label={item.label} aria-current={active === item.key ? "page" : undefined}><span className="nav-icon">{item.key === "profile" ? <ProfileIcon /> : item.icon}</span></button>)}</nav>;
}

function CalorieRollingNumber({ value }: { value: number }) {
  let digitIndex = 0;
  return <span key={value} className="calorie-roll-value" aria-label={value.toLocaleString()}>{value.toLocaleString().split("").map((character, index) => {
    if (!/\d/.test(character)) return <span className="calorie-roll-separator" aria-hidden="true" key={`${character}-${index}`}>{character}</span>;
    const delay = digitIndex * 65;
    digitIndex += 1;
    return <span className="calorie-roll-digit" aria-hidden="true" key={`${value}-${index}`}><span className="calorie-roll-strip" style={{ "--digit-stop": Number(character) + 10, "--digit-delay": `${delay}ms` } as React.CSSProperties}>{Array.from({ length: 20 }, (_, digit) => <i key={digit}>{digit % 10}</i>)}</span></span>;
  })}</span>;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function accountSetupKey(email: string): string {
  return `mindmeal-account-setup:${email.trim().toLowerCase()}`;
}

function Welcome({ login, start, guest }: { login: (email: string) => void; start: (email: string) => void; guest: () => void }) {
  const [stage, setStage] = useState<"login" | "verify" | "password">("login");
  const [authMode, setAuthMode] = useState<"signup" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupEmailTouched, setSignupEmailTouched] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupPasswordVisible, setSignupPasswordVisible] = useState({ next: false, confirm: false });
  const [accountCreated, setAccountCreated] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0;
  const emailInvalid = emailTouched && email.trim().length > 0 && !isValidEmail(email);
  const signupEmailInvalid = signupEmailTouched && signupEmail.trim().length > 0 && !isValidEmail(signupEmail);
  const canVerify = verificationSent && verificationCode.length === 6;
  const canCreate = newPassword.length >= 6 && newPassword === confirmPassword;
  const completionOpen = accountCreated || passwordReset;
  const openLogin = () => {
    setStage("login");
    setVerificationSent(false);
    setVerificationCode("");
    setLoginPasswordVisible(false);
    setSignupPasswordVisible({ next: false, confirm: false });
    setAccountCreated(false);
    setPasswordReset(false);
  };
  const beginAuthFlow = (mode: "signup" | "forgot") => {
    setAuthMode(mode);
    setSignupEmail(mode === "forgot" && isValidEmail(email) ? email : "");
    setSignupEmailTouched(false);
    setVerificationSent(false);
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setLoginPasswordVisible(false);
    setSignupPasswordVisible({ next: false, confirm: false });
    setStage("verify");
  };
  const openVerify = () => {
    setStage("verify");
    setLoginPasswordVisible(false);
    setSignupPasswordVisible({ next: false, confirm: false });
  };
  return <main className="welcome-screen login-screen screen-enter">
    <header className="login-brand"><Brand staticMark /></header>
    <div className="login-flow-window" aria-hidden={completionOpen} inert={completionOpen}>
      <div className={`login-flow-track stage-${stage}`}>
        <section className="auth-panel auth-panel-login" aria-hidden={stage !== "login"}>
          <form className="login-form" noValidate onSubmit={event => { event.preventDefault(); setEmailTouched(true); if (canSubmit && isValidEmail(email)) login(email); }}>
            <label className="login-field"><span>email</span><input name="email" type="email" value={email} onChange={event => { setEmail(event.target.value); setEmailTouched(false); }} autoComplete="email" inputMode="email" spellCheck={false} aria-label="電子信箱" aria-invalid={emailInvalid} aria-describedby={emailInvalid ? "login-email-error" : undefined} /><small id="login-email-error" className={`login-field-error ${emailInvalid ? "is-visible" : ""}`} role={emailInvalid ? "alert" : undefined} aria-hidden={!emailInvalid}>{emailInvalid ? "信箱格式不正確，請重新確認" : " "}</small></label>
            <label className="login-field"><span>password</span><span className="login-password-shell"><input name="password" type={loginPasswordVisible ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" aria-label="密碼" /><button type="button" className="login-password-toggle" onClick={() => setLoginPasswordVisible(current => !current)} aria-label={loginPasswordVisible ? "隱藏登入密碼" : "顯示登入密碼"}><PasswordEyeIcon visible={loginPasswordVisible} /></button></span></label>
            <button type="submit" className="login-submit" disabled={!canSubmit} aria-label="登入"><span>→</span></button>
            <div className="login-secondary-actions"><button type="button" onClick={() => beginAuthFlow("signup")}>建立帳號</button><button type="button" onClick={() => beginAuthFlow("forgot")}>忘記密碼</button><button type="button" onClick={guest}>訪客登入</button></div>
          </form>
        </section>
        <section className="auth-panel" aria-hidden={stage !== "verify"}>
          <form className="auth-step-form" noValidate onSubmit={event => {
            event.preventDefault();
            setSignupEmailTouched(true);
            if (isValidEmail(signupEmail) && canVerify) { setSignupPasswordVisible({ next: false, confirm: false }); setStage("password"); }
          }}>
            <button type="button" className="auth-back" onClick={openLogin} aria-label="返回登入">←</button>
            <span className="auth-step-label">{authMode === "signup" ? "CREATE ACCOUNT / 01" : "RESET PASSWORD / 01"}</span>
            <h1>{authMode === "signup" ? "建立帳號" : "重設密碼"}</h1>
            <p>{verificationSent ? <>驗證碼已寄到<br /><strong>{signupEmail}</strong></> : authMode === "signup" ? "先驗證你的信箱，我們會寄送六位數驗證碼。" : "先驗證你的信箱，確認後即可設定新密碼。"}</p>
            <label className="login-field"><span>email</span><input name="signup-email" type="email" value={signupEmail} onChange={event => { setSignupEmail(event.target.value); setSignupEmailTouched(false); setVerificationSent(false); setVerificationCode(""); }} autoComplete="email" inputMode="email" spellCheck={false} aria-label={authMode === "signup" ? "註冊信箱" : "帳號信箱"} aria-invalid={signupEmailInvalid} aria-describedby={signupEmailInvalid ? "signup-email-error" : undefined} /><small id="signup-email-error" className={`login-field-error ${signupEmailInvalid ? "is-visible" : ""}`} role={signupEmailInvalid ? "alert" : undefined} aria-hidden={!signupEmailInvalid}>{signupEmailInvalid ? "信箱格式不正確，請重新確認" : " "}</small></label>
            <button type="button" className="auth-send-code" disabled={!signupEmail.trim()} onClick={() => { setSignupEmailTouched(true); if (isValidEmail(signupEmail)) { setVerificationSent(true); setVerificationCode(""); } }}>{verificationSent ? "重新寄送驗證碼" : "寄送驗證碼"}</button>
            <label className="login-field auth-code-field"><span>驗證碼</span><input name="verification-code" value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="六位數驗證碼" placeholder="—  —  —  —  —  —" disabled={!verificationSent} /></label>
            <button type="submit" className="auth-primary" disabled={!isValidEmail(signupEmail) || !canVerify}>確認驗證 <span>→</span></button>
          </form>
        </section>
        <section className="auth-panel" aria-hidden={stage !== "password"}>
          <form className="auth-step-form" onSubmit={event => { event.preventDefault(); if (!canCreate) return; if (authMode === "signup") setAccountCreated(true); else setPasswordReset(true); }}>
            <button type="button" className="auth-back" onClick={openVerify} aria-label="返回信箱驗證">←</button>
            <span className="auth-step-label">{authMode === "signup" ? "CREATE ACCOUNT / 02" : "RESET PASSWORD / 02"}</span>
            <h1>{authMode === "signup" ? "設定登入密碼" : "重設登入密碼"}</h1>
            <p>{authMode === "signup" ? "使用至少六個字元，完成後即可設定你的飲食資訊。" : "設定至少六個字元的新密碼，完成後返回登入。"}</p>
            <label className="login-field"><span>password</span><span className="login-password-shell"><input name="new-password" type={signupPasswordVisible.next ? "text" : "password"} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" aria-label={authMode === "signup" ? "設定密碼" : "重設密碼"} /><button type="button" className="login-password-toggle" onClick={() => setSignupPasswordVisible(current => ({ ...current, next: !current.next }))} aria-label={signupPasswordVisible.next ? (authMode === "signup" ? "隱藏設定密碼" : "隱藏重設密碼") : (authMode === "signup" ? "顯示設定密碼" : "顯示重設密碼")}><PasswordEyeIcon visible={signupPasswordVisible.next} /></button></span></label>
            <label className="login-field"><span>confirm password</span><span className="login-password-shell"><input name="confirm-password" type={signupPasswordVisible.confirm ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" aria-label="確認密碼" /><button type="button" className="login-password-toggle" onClick={() => setSignupPasswordVisible(current => ({ ...current, confirm: !current.confirm }))} aria-label={signupPasswordVisible.confirm ? "隱藏確認密碼" : "顯示確認密碼"}><PasswordEyeIcon visible={signupPasswordVisible.confirm} /></button></span></label>
            <button type="submit" className="auth-primary" disabled={!canCreate}>{authMode === "signup" ? "建立帳號" : "更新密碼"} <span>→</span></button>
            {confirmPassword && newPassword !== confirmPassword && <small className="auth-field-error" role="status">兩次輸入的密碼不同</small>}
            <button type="button" className="auth-text-action" onClick={openLogin}>返回登入</button>
          </form>
        </section>
      </div>
    </div>
    <div className="login-orbit" aria-hidden="true"><span /><i /></div>
    <Wave />
    {completionOpen && <div className="account-created-backdrop">
      <section className="account-created-card" role="dialog" aria-modal="true" aria-labelledby="auth-complete-title" aria-describedby="auth-complete-description">
        <span className="account-created-mark" aria-hidden="true">✓</span>
        <h2 id="auth-complete-title">{accountCreated ? "帳號建立完成" : "密碼重設完成"}</h2>
        <p id="auth-complete-description">{accountCreated ? "接著完成飲食資訊設定" : "請使用新密碼重新登入"}</p>
        <button type="button" className="auth-primary" autoFocus onClick={() => { if (accountCreated) start(signupEmail); else { setEmail(signupEmail); setPassword(""); setEmailTouched(false); openLogin(); } }}>{accountCreated ? "開始設定" : "返回登入"} <span>→</span></button>
      </section>
    </div>}
  </main>;
}

function ToggleChip({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`chip ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>{value}<span>{selected ? "✓" : "＋"}</span></button>;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatPickerDate(date: Date): string {
  return `${date.getFullYear()} / ${padDatePart(date.getMonth() + 1)} / ${padDatePart(date.getDate())}`;
}

function formatPickerTime(date: Date): string {
  return `${padDatePart(date.getHours())} : ${padDatePart(date.getMinutes())}`;
}

function MealRecordFields({ mealType, eatenAt, onMealTypeChange, onEatenAtChange }: { mealType: MealType; eatenAt: string; onMealTypeChange: (value: MealType) => void; onEatenAtChange: (value: string) => void }) {
  const selectedDate = validMealDate(eatenAt) || new Date();
  const [pickerOpen, setPickerOpen] = useState(false);

  const [draftDate, setDraftDate] = useState(selectedDate);
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const future = selectedDate.getTime() > Date.now();
  const draftFuture = draftDate.getTime() > Date.now();
  const monthStartOffset = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index - monthStartOffset + 1));

  useEffect(() => {
    if (!pickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPickerOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);

    };
  }, [pickerOpen]);

  const openPicker = () => {
    const next = validMealDate(eatenAt) || new Date();
    setDraftDate(next);
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    setPickerOpen(true);
  };
  const changeTime = (unit: "hour" | "minute", amount: number) => setDraftDate(current => {
    const next = new Date(current);
    if (unit === "hour") next.setHours(next.getHours() + amount);
    else next.setMinutes(next.getMinutes() + amount);
    return next;
  });
  const chooseDay = (date: Date) => {
    const next = new Date(draftDate);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraftDate(next);
    if (date.getMonth() !== viewMonth.getMonth()) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const confirmPicker = () => {
    if (draftFuture) return;
    onEatenAtChange(draftDate.toISOString());
    setPickerOpen(false);
  };

  return <section className="meal-record-fields" aria-label="餐次與用餐時間">
    <fieldset><legend>餐次</legend><div className="meal-type-options">{mealTypes.map(value => <button type="button" key={value} className={mealType === value ? "selected" : ""} onClick={() => onMealTypeChange(value)} aria-pressed={mealType === value}>{value}</button>)}</div></fieldset>
    <div className="meal-time-field"><span>用餐時間 <small>（預設為紀錄時間）</small></span><button type="button" className="meal-time-trigger" onClick={openPicker} aria-haspopup="dialog"><span className="meal-datetime-value"><i aria-hidden="true">▦</i><span>{formatPickerDate(selectedDate)}　{formatPickerTime(selectedDate)}</span></span><b aria-hidden="true">›</b></button>{future ? <small className="field-error">用餐時間不能晚於現在，請重新選擇。</small> : null}</div>
    {pickerOpen && typeof document !== "undefined" ? createPortal(<div className="meal-time-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPickerOpen(false); }}><section className="meal-time-sheet" role="dialog" aria-modal="true" aria-labelledby="meal-time-sheet-title"><span className="sheet-handle" aria-hidden="true" /><h3 id="meal-time-sheet-title">選擇用餐時間</h3><div className="compact-time-picker" aria-label="調整用餐時間"><div><button type="button" onClick={() => changeTime("hour", 1)} aria-label="增加一小時">⌃</button><strong>{padDatePart(draftDate.getHours())}</strong><button type="button" onClick={() => changeTime("hour", -1)} aria-label="減少一小時">⌄</button></div><b>:</b><div><button type="button" onClick={() => changeTime("minute", 5)} aria-label="增加五分鐘">⌃</button><strong>{padDatePart(draftDate.getMinutes())}</strong><button type="button" onClick={() => changeTime("minute", -5)} aria-label="減少五分鐘">⌄</button></div></div><div className="calendar-heading"><button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} aria-label="上個月">‹</button><strong>{viewMonth.getFullYear()}年 {viewMonth.getMonth() + 1}月</strong><button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} aria-label="下個月">›</button></div><div className="calendar-weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map(date => { const outside = date.getMonth() !== viewMonth.getMonth(); const selected = sameLocalDate(date, draftDate); const unavailable = date.getTime() > new Date().setHours(23, 59, 59, 999); return <button type="button" key={date.toISOString()} className={`${outside ? "outside" : ""} ${selected ? "selected" : ""}`} disabled={unavailable} onClick={() => chooseDay(date)} aria-pressed={selected}>{date.getDate()}</button>; })}</div>{draftFuture ? <p className="sheet-time-error">時間不能晚於現在</p> : null}<footer><button type="button" onClick={() => setPickerOpen(false)}>取消</button><button type="button" className="confirm-time" disabled={draftFuture} onClick={confirmPicker}>完成</button></footer></section></div>, document.body) : null}
  </section>;
}
async function requestReminderPermission(): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  try { await Notification.requestPermission(); } catch { /* in-app reminders still work */ }
}

function ReminderRows({ value, onChange }: { value: ReminderWindows; onChange: (value: ReminderWindows) => void }) {
  const [editing, setEditing] = useState<ReminderMeal | null>(null);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const invalidRange = timeToMinutes(draftEnd || "00:00") <= timeToMinutes(draftStart || "00:00");

  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setEditing(null); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editing]);

  const openEditor = (mealType: ReminderMeal) => {
    setDraftStart(value[mealType].start);
    setDraftEnd(value[mealType].end);
    setEditing(mealType);
  };
  const toggleReminder = (mealType: ReminderMeal) => {
    onChange({ ...value, [mealType]: { ...value[mealType], enabled: !value[mealType].enabled } });
  };
  const saveWindow = () => {
    if (!editing || invalidRange) return;
    onChange({ ...value, [editing]: { ...value[editing], start: draftStart, end: draftEnd } });
    setEditing(null);
  };

  return <>
    <div className="reminder-row-list">
      {reminderMealTypes.map((mealType, index) => {
        const reminder = value[mealType];
        return <div className="reminder-row" key={mealType}>
          <button type="button" className="reminder-time-button" onClick={() => openEditor(mealType)} aria-label={"調整" + mealType + "提醒時段"}>
            <strong>{mealType}</strong>
            <span>{reminder.start} — {reminder.end}</span>
          </button>
          <button type="button" className={"reminder-switch " + (reminder.enabled ? "is-on" : "")} role="switch" aria-checked={reminder.enabled} aria-label={mealType + "提醒"} onClick={() => toggleReminder(mealType)}>
            <i aria-hidden="true" />
          </button>
          {index < reminderMealTypes.length - 1 ? <span className="reminder-divider" aria-hidden="true" /> : null}
        </div>;
      })}
    </div>
    {editing && typeof document !== "undefined" ? createPortal(<div className="reminder-time-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}>
      <section className="reminder-time-sheet" role="dialog" aria-modal="true" aria-labelledby="reminder-time-title">
        <span className="sheet-handle" aria-hidden="true" />
        <h3 id="reminder-time-title">調整{editing}時段</h3>
        <p>系統會在這個範圍內隨機提醒一次。</p>
        <div className="reminder-time-inputs">
          <label><span>開始時間</span><input type="time" value={draftStart} onChange={event => setDraftStart(event.target.value)} /></label>
          <i aria-hidden="true">—</i>
          <label><span>結束時間</span><input type="time" value={draftEnd} onChange={event => setDraftEnd(event.target.value)} /></label>
        </div>
        {invalidRange ? <small className="field-error">結束時間需晚於開始時間。</small> : null}
        <footer><button type="button" onClick={() => setEditing(null)}>取消</button><button type="button" className="confirm-time" disabled={invalidRange} onClick={saveWindow}>完成</button></footer>
      </section>
    </div>, document.body) : null}
  </>;
}
function Onboarding({ profile, setProfile, finish, back }: { profile: Profile; setProfile: (profile: Profile) => void; finish: () => void; back: () => void }) {
  const [step, setStep] = useState(0);
  const avatarDrag = useRef({ pointerX: 0, pointerY: 0, avatarX: 50, avatarY: 50, moved: false });
  const avatarImage = useRef<HTMLImageElement>(null);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile({ ...profile, [key]: value });
  const toggle = (key: "preferences" | "exclusions" | "contexts" | "meals", value: string) => update(key, profile[key].includes(value) ? profile[key].filter(item => item !== value) : [...profile[key], value]);
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setProfile({ ...profile, avatar: await avatarDataUrl(file), avatarX: 50, avatarY: 50, avatarZoom: 1.3 }); } catch { /* keep the current avatar */ }
    event.target.value = "";
  };
  const startAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar) return;
    avatarDrag.current = { pointerX: event.clientX, pointerY: event.clientY, avatarX: profile.avatarX, avatarY: profile.avatarY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveAvatar = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - avatarDrag.current.pointerX;
    const dy = event.clientY - avatarDrag.current.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) avatarDrag.current.moved = true;
    const clamp = (value: number) => Math.max(17, Math.min(83, value));
    const avatarX = clamp(avatarDrag.current.avatarX - dx);
    const avatarY = clamp(avatarDrag.current.avatarY - dy);
    if (avatarImage.current) avatarImage.current.style.transform = avatarTransform(avatarX, avatarY, profile.avatarZoom);
    avatarDrag.current.avatarX = avatarX;
    avatarDrag.current.avatarY = avatarY;
    avatarDrag.current.pointerX = event.clientX;
    avatarDrag.current.pointerY = event.clientY;
    event.preventDefault();
  };
  const finishAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (avatarDrag.current.moved) setProfile({ ...profile, avatarX: avatarDrag.current.avatarX, avatarY: avatarDrag.current.avatarY });
  };
  const steps = [
    <div className="step-body body-step" key="body">
      <p className="why-copy">身體資料只用來估算每日範圍；目標會影響份量與下一餐建議，可隨時到「我的資料」修改。</p>
      <div className="form-grid">
        <label className="name-field">姓名或暱稱<input value={profile.name} onChange={event => update("name", event.target.value)} placeholder="例如：小明" maxLength={20} /></label>
        <label>年齡<input inputMode="numeric" value={profile.age} onChange={event => update("age", event.target.value)} /><span>歲</span></label>
        <label>身高<input inputMode="numeric" value={profile.height} onChange={event => update("height", event.target.value)} /><span>cm</span></label>
        <label>體重<input inputMode="numeric" value={profile.weight} onChange={event => update("weight", event.target.value)} /><span>kg</span></label>
        <label>性別<select value={profile.gender} onChange={event => update("gender", event.target.value)}><option>女性</option><option>男性</option></select></label>
      </div>
      <div className="field-block"><span className="field-title">當前目標</span><div className="chip-row wrap">{["減脂", "維持", "增肌", "均衡飲食"].map(value => <ToggleChip key={value} value={value} selected={profile.goal === value} onClick={() => update("goal", value)} />)}</div></div>
    </div>,
    <div className="step-body" key="taste">
      <p className="why-copy">硬性限制會直接排除；口味、預算與日常飲食環境只影響推薦排序，不會限制你的選擇。</p>
      <div className="field-block"><span className="field-title">運動量</span><div className="chip-row wrap">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(value => <ToggleChip key={value} value={value} selected={profile.activity === value} onClick={() => update("activity", profile.activity === value ? "" : value)} />)}</div></div>
      <div className="field-block"><span className="field-title">過敏／宗教／醫療限制</span><div className="chip-row wrap">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(value => <ToggleChip key={value} value={value} selected={profile.exclusions.includes(value)} onClick={() => toggle("exclusions", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">口味與排序偏好</span><div className="chip-row wrap">{["少辣", "低糖", "預算 150 內"].map(value => <ToggleChip key={value} value={value} selected={profile.preferences.includes(value)} onClick={() => toggle("preferences", value)} />)}</div></div>
      <label className="select-field">外食頻率<select value={profile.frequency} onChange={event => update("frequency", event.target.value)}><option>幾乎不外食</option><option>每週外食 1–3 次</option><option>每週外食 4–6 次</option><option>幾乎每天外食</option></select></label>
      <div className="field-block"><span className="field-title">日常飲食環境</span><small className="field-help">可複選，將用於調整下一餐推薦。</small><div className="chip-row wrap">{["自煮", "便利商店", "便當店", "餐廳"].map(value => <ToggleChip key={value} value={value} selected={profile.contexts.includes(value)} onClick={() => toggle("contexts", value)} />)}</div></div>
    </div>,
    <div className="step-body reminder-step" key="reminder">
      <p className="why-copy">設定常用用餐時段；若已完成紀錄，當次提醒會自動跳過。</p>
      <ReminderRows value={profile.reminderWindows} onChange={reminderWindows => update("reminderWindows", reminderWindows)} />
    </div>,
  ];
  const titles = ["我的身體", "理想生活表", "提醒超人"];
  const invalid = step === 0
    ? (!profile.name.trim() || !profile.age || !profile.height || !profile.weight)
    : step === 1
      ? !profile.activity
      : false;
  return <main className="onboarding-screen screen-enter"><header className="onboarding-header"><button onClick={step === 0 ? back : () => setStep(step - 1)} aria-label="上一步">←</button><span>步驟 {step + 1} / 3</span><Brand /></header><div className="step-track"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><section className={`onboarding-content ${step === 0 ? "body-onboarding-content" : step === 1 ? "preferences-onboarding-content" : "reminder-onboarding-content"}`}>{step === 0 && <label className={`setup-avatar-placeholder ${profile.avatar ? "is-draggable" : ""}`} aria-label="選擇或拖曳調整大頭貼" onPointerDown={startAvatarDrag} onPointerMove={moveAvatar} onPointerUp={finishAvatarDrag} onPointerCancel={finishAvatarDrag} onClick={event => { if (avatarDrag.current.moved) { event.preventDefault(); avatarDrag.current.moved = false; } }}><span className="setup-avatar-clip">{profile.avatar ? <img ref={avatarImage} src={profile.avatar} alt="大頭貼預覽" draggable={false} style={{ transform: avatarTransform(profile.avatarX, profile.avatarY, profile.avatarZoom) }} /> : <ProfileIcon />}</span><input type="file" accept="image/*" onChange={chooseAvatar} /></label>}<span className="eyebrow">SETUP / 0{step + 1}</span><h1>{titles[step]}</h1>{steps[step]}</section><div className="sticky-action"><button disabled={invalid} className="primary-btn" onClick={step === 2 ? finish : () => setStep(step + 1)}>{step === 2 ? "儲存提醒設定" : "下一步"}<span>→</span></button></div></main>;
}

function RingMetric({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  const remaining = Math.max(0, target - current);
  const degrees = Math.min(360, Math.max(0, Math.round(current / target * 360)));
  return <div className="ring-metric"><i aria-hidden="true" style={{ "--ring-progress-target": `${degrees}deg`, "--ring-orange-target": `${Math.round(degrees * .58)}deg` } as React.CSSProperties} /><span><small>尚缺 {label}</small><strong>{remaining.toLocaleString()}<b>{unit}</b></strong></span></div>;
}

function ActivityMetric({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const degrees = Math.min(360, Math.round(value / target * 360));
  return <div className="activity-metric"><i aria-hidden="true" style={{ background: `conic-gradient(var(--orange) ${degrees}deg, #fff ${degrees}deg)` }} /><span><small>{label}</small><strong>{value}<b>{unit}</b></strong><em>{label === "運動量" ? `目標 ${target} 分鐘` : "今日活動估算"}</em></span></div>;
}

function Dashboard({ meals, recordDays, profile, go, editMeal }: { meals: Meal[]; recordDays: number; profile: Profile; go: (screen: Screen) => void; editMeal: (meal: Meal) => void }) {
  const [dashboardPage, setDashboardPage] = useState(0);
  const [trendOpen, setTrendOpen] = useState(false);
  const [mealsOpen, setMealsOpen] = useState(true);
  const [cardTouchStart, setCardTouchStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const targets = useMemo(() => calculateNutritionTargets(profile), [profile.age, profile.height, profile.weight, profile.gender, profile.activity, profile.goal]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const greeting = now.getHours() < 12 ? "早安" : now.getHours() < 18 ? "午安" : "晚安";
  const displayName = profile.name && profile.name !== "7000" ? profile.name : "朋友";
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(now).toUpperCase();
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(now).toUpperCase();
const todayMeals = meals.filter(item => sameLocalDate(validMealDate(item.eatenAt) || now, now)).sort((left, right) => (validMealDate(left.eatenAt)?.getTime() || 0) - (validMealDate(right.eatenAt)?.getTime() || 0));
  const meal = todayMeals.length ? todayMeals[todayMeals.length - 1] : null;
  const totals = todayMeals.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const eaten = base.calories + totals.calories;
  const remaining = Math.max(0, targets.calories - eaten);
  const protein = base.protein + totals.protein;
  const carbs = base.carbs + totals.carbs;
  const fat = base.fat + totals.fat;
  const endCardTouch = (x: number) => {
    if (cardTouchStart === null) return;
    if (Math.abs(x - cardTouchStart) > 36) setDashboardPage(x < cardTouchStart ? 1 : 0);
    setCardTouchStart(null);
  };
  return <main className="app-screen home-screen screen-enter">
    <header className="home-reference-header">
      <div><strong>{greeting}，{displayName}</strong><span>{weekday} · {monthDay}</span></div>
      <button className="home-avatar" onClick={() => go("account")} aria-label="開啟帳號與個人資料"><span className="home-avatar-clip">{profile.avatar ? <img src={profile.avatar} alt="" style={{ transform: avatarTransform(profile.avatarX, profile.avatarY, profile.avatarZoom) }} /> : <ProfileIcon />}</span></button>
    </header>
    <div className="unified-app-content home-content-scale">
    <section className="priority-overview">
      <div className="hero reference-hero"><span className="eyebrow">熱 量 尚 缺</span><div className="calorie-number"><CalorieRollingNumber value={remaining} /><small>卡</small></div></div>
    </section>
    <div className="dashboard-swipe-card">
      <div className="dashboard-data-window" role="slider" aria-label="營養與運動數值，可左右滑動切換" aria-valuemin={0} aria-valuemax={1} aria-valuenow={dashboardPage} aria-valuetext={dashboardPage === 0 ? "營養摘要" : "活動摘要"} tabIndex={0} onKeyDown={event => { if (event.key === "ArrowRight") setDashboardPage(1); if (event.key === "ArrowLeft") setDashboardPage(0); }} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setCardTouchStart(event.clientX); }} onPointerUp={event => endCardTouch(event.clientX)} onPointerCancel={() => setCardTouchStart(null)}>
        <div className="dashboard-card-track" style={{ transform: `translateX(-${dashboardPage * 100}%)` }}>
          <article className="dashboard-card-page nutrition-summary-page" aria-hidden={dashboardPage !== 0}><div className="ring-list"><RingMetric label="蛋白質" current={protein} target={targets.protein} unit="g" /><RingMetric label="碳水" current={carbs} target={targets.carbs} unit="g" /><RingMetric label="脂肪" current={fat} target={targets.fat} unit="g" /></div></article>
          <article className="dashboard-card-page compact-activity-page" aria-hidden={dashboardPage !== 1}><span className="activity-kicker">ACTIVITY / TODAY</span><h2>活動紀錄</h2><div className="compact-activity-list"><ActivityMetric label="運動量" value={38} target={45} unit="分鐘" /><ActivityMetric label="消耗熱量" value={286} target={350} unit="kcal" /></div></article>
        </div>
        <div className="dashboard-card-pager"><span aria-hidden="true">{dashboardPage === 0 ? "←" : "→"}</span><div><button className={dashboardPage === 0 ? "active" : ""} onClick={() => setDashboardPage(0)} aria-label="顯示營養摘要" /><button className={dashboardPage === 1 ? "active" : ""} onClick={() => setDashboardPage(1)} aria-label="顯示活動摘要" /></div></div>
      </div>
      <div className="dashboard-fixed-figure"><span className="dot-field" aria-hidden="true" /><YellowManModel gender={profile.gender} /></div>
    </div>
    <section className="insight-strip"><span>NEXT MEAL NAVIGATION / 下一餐導航</span><p>{meal ? "蛋白質仍有缺口，下一餐選雞胸、豆腐、魚或茶葉蛋，再加一份蔬菜會更平衡。" : "先拍下這一餐，MindMeal 會依今天的營養缺口告訴你下一餐怎麼選。"}</p><button onClick={() => go(meal ? "nearby" : "scan")}>{meal ? "查看下一餐建議" : "拍照記錄這一餐"} →</button></section>
    <section className="collapsible-card"><button className="card-toggle" onClick={() => setTrendOpen(!trendOpen)} aria-expanded={trendOpen}><span><small>體態趨勢／平衡分數</small><strong>{recordDays < 3 ? `${recordDays} / 3 天` : "76 分"}</strong></span><i>{trendOpen ? "−" : "＋"}</i></button>{trendOpen && <div className="card-detail">{recordDays < 3 ? <div className="unlock"><span style={{ width: `${recordDays / 3 * 100}%` }} /><p>再記錄 {3 - recordDays} 天可查看週趨勢。現在先專注把日常留下來就好。</p></div> : <><div className="mini-bars compact-bars">{[48, 62, 55, 70, 66, 82, 76].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><p>本週平衡分數穩定上升，飲水與蛋白質最值得繼續留意。</p></>}</div>}</section>
    <section className="collapsible-card"><button className="card-toggle" onClick={() => setMealsOpen(!mealsOpen)} aria-expanded={mealsOpen}><span><small>今日紀錄餐點</small><strong>{todayMeals.length ? `${todayMeals.length} 餐` : "還沒有紀錄"}</strong></span><i>{mealsOpen ? "−" : "＋"}</i></button>{mealsOpen && <div className="card-detail">{todayMeals.length ? <div className="meal-list">{[...todayMeals].reverse().map(item => <button className="meal-row" key={item.id} onClick={() => editMeal(item)}><span><b>{item.name}</b><small>{item.mealType || suggestedMealType(validMealDate(item.eatenAt) || now)} · {formatMealTime(item.eatenAt)} · {item.calories} kcal</small></span><i>編輯 →</i></button>)}</div> : <button className="empty-meal" onClick={() => go("scan")}>拍下第一餐，AI 幫你開始分析 <span>＋</span></button>}<button className="history-entry" onClick={() => go("history")}>查看全部飲食紀錄 <span>→</span></button></div>}</section>
    </div>
    <BottomNav screen="home" go={go} />
  </main>;
}

function HistoryScreen({ meals, go, editMeal }: { meals: Meal[]; go: (screen: Screen) => void; editMeal: (meal: Meal) => void }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const dateKey = (value?: string) => {
    const date = validMealDate(value) || new Date();
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  };
  const selectedDateObject = selectedDate ? new Date(`${selectedDate}T12:00:00`) : null;
  const monthOffset = new Date(filterMonth.getFullYear(), filterMonth.getMonth(), 1).getDay();
  const filterDays = Array.from({ length: 42 }, (_, index) => new Date(filterMonth.getFullYear(), filterMonth.getMonth(), index - monthOffset + 1));
  const ordered = [...meals].sort((left, right) => (validMealDate(right.eatenAt)?.getTime() || 0) - (validMealDate(left.eatenAt)?.getTime() || 0));
  const visibleMeals = selectedDate ? ordered.filter(item => dateKey(item.eatenAt) === selectedDate) : ordered;
  const groups = visibleMeals.reduce<{ key: string; label: string; meals: Meal[] }[]>((result, item) => {
    const key = dateKey(item.eatenAt);
    const current = result[result.length - 1];
    if (current?.key === key) current.meals.push(item);
    else result.push({ key, label: formatHistoryDate(item.eatenAt), meals: [item] });
    return result;
  }, []);
  useEffect(() => {
    if (!datePickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDatePickerOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [datePickerOpen]);
  const openDatePicker = () => {
    const initial = selectedDateObject || new Date();
    setFilterMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setDatePickerOpen(true);
  };
  const chooseFilterDate = (date: Date) => {
    setSelectedDate(dateKey(date.toISOString()));
    setDatePickerOpen(false);
  };
  const selectedDateLabel = selectedDateObject ? new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(selectedDateObject) : "選擇日期";
  const emptyTitle = selectedDate ? "這天沒有飲食紀錄" : "還沒有飲食紀錄";
  const emptyCopy = selectedDate ? "選擇其他日期，或清除日期查看全部紀錄。" : "從第一餐開始，之後就能在這裡查看時間軸。";
  return <main className="app-screen history-screen screen-enter"><header className="simple-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><span>飲食紀錄</span><i>{meals.length} 筆</i></header><div className="unified-app-content history-content-scale"><section className="history-intro"><span className="eyebrow">MEAL HISTORY</span><div className="history-date-filter"><span>搜尋日期</span><div><button type="button" className="history-date-trigger" onClick={openDatePicker} aria-haspopup="dialog"><i aria-hidden="true">▦</i><span>{selectedDateLabel}</span><b aria-hidden="true">›</b></button>{selectedDate ? <button type="button" className="history-date-clear" onClick={() => setSelectedDate("")} aria-label="清除日期篩選">清除</button> : null}</div></div></section>{groups.length ? <div className="history-groups">{groups.map(group => { const calories = group.meals.reduce((sum, item) => sum + item.calories, 0); return <section className="history-day" key={group.key}><header><span><strong>{group.label}</strong><small>{group.meals.length} 餐</small></span><b>{calories.toLocaleString()} kcal</b></header><div>{group.meals.map(item => <button className="history-meal-row" key={item.id} onClick={() => editMeal(item)}><span className="history-time">{formatMealTime(item.eatenAt)}</span><span><strong>{item.name}</strong><small>{item.mealType || suggestedMealType(validMealDate(item.eatenAt) || new Date())} · {item.calories} kcal</small></span><i>→</i></button>)}</div></section>; })}</div> : <section className="history-empty"><strong>{emptyTitle}</strong><p>{emptyCopy}</p>{selectedDate ? <button type="button" onClick={() => setSelectedDate("")}>查看全部紀錄</button> : null}</section>}<button className="primary-btn history-add" onClick={() => go("scan")}>新增或補登餐點 <span>＋</span></button></div>{datePickerOpen && typeof document !== "undefined" ? createPortal(<div className="history-calendar-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setDatePickerOpen(false); }}><section className="history-calendar-sheet" role="dialog" aria-modal="true" aria-labelledby="history-calendar-title"><span className="sheet-handle" aria-hidden="true" /><header><h2 id="history-calendar-title">搜尋紀錄日期</h2><button type="button" onClick={() => setDatePickerOpen(false)} aria-label="關閉日期選擇">×</button></header><div className="calendar-heading"><button type="button" onClick={() => setFilterMonth(new Date(filterMonth.getFullYear(), filterMonth.getMonth() - 1, 1))} aria-label="上個月">‹</button><strong>{filterMonth.getFullYear()}年 {filterMonth.getMonth() + 1}月</strong><button type="button" onClick={() => setFilterMonth(new Date(filterMonth.getFullYear(), filterMonth.getMonth() + 1, 1))} aria-label="下個月">›</button></div><div className="calendar-weekdays" aria-hidden="true">{["日", "一", "二", "三", "四", "五", "六"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{filterDays.map(date => { const outside = date.getMonth() !== filterMonth.getMonth(); const selected = selectedDateObject ? sameLocalDate(date, selectedDateObject) : false; const unavailable = date.getTime() > new Date().setHours(23, 59, 59, 999); return <button type="button" key={date.toISOString()} className={`${outside ? "outside" : ""} ${selected ? "selected" : ""}`} disabled={unavailable} onClick={() => chooseFilterDate(date)} aria-pressed={selected}>{date.getDate()}</button>; })}</div>{selectedDate ? <button type="button" className="history-calendar-clear" onClick={() => { setSelectedDate(""); setDatePickerOpen(false); }}>清除日期，查看全部紀錄</button> : null}</section></div>, document.body) : null}<BottomNav screen="history" go={go} /></main>;
}
function Scan({ go, analyze, albumPermission, allowAlbum, cameraPermission, setCameraPermission }: { go: (screen: Screen) => void; analyze: (imageUrl: string, isActive: () => boolean) => Promise<void>; albumPermission: AlbumPermission; allowAlbum: () => void; cameraPermission: CameraPermission; setCameraPermission: (permission: CameraPermission) => void }) {
  const analysisSteps = ["辨識餐點與食材", "判讀整份餐點", "整理營養資訊"];
  const [scanning, setScanning] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [takingLong, setTakingLong] = useState(false);
  const [showAlbumPermission, setShowAlbumPermission] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "opening" | "live">("idle");
  const [cameraReady, setCameraReady] = useState(false);
  const requestId = useRef(0);
  const cameraSession = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);

  const releaseCamera = () => {
    cameraSession.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  const closeCamera = () => {
    releaseCamera();
    setCameraReady(false);
    setCameraState("idle");
  };
  const openCamera = async () => {
    if (scanning || cameraState === "opening") return;
    releaseCamera();
    setCameraReady(false);
    setCameraError("");
    setError("");
    setCameraState("opening");
    const session = ++cameraSession.current;
    let openingTimeout = 0;
    try {
      const streamRequest = requestCameraStream();
      void streamRequest.then(stream => {
        if (session !== cameraSession.current) stream.getTracks().forEach(track => track.stop());
      }).catch(() => undefined);
      const stream = await Promise.race([
        streamRequest,
        new Promise<MediaStream>((_, reject) => {
          openingTimeout = window.setTimeout(() => reject(new DOMException("Camera opening timed out.", "AbortError")), 12000);
        }),
      ]);
      window.clearTimeout(openingTimeout);
      if (session !== cameraSession.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraPermission("allowed");
      setCameraState("live");
    } catch (failure) {
      window.clearTimeout(openingTimeout);
      if (session !== cameraSession.current) return;
      releaseCamera();
      setCameraState("idle");
      const name = failure instanceof DOMException ? failure.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") setCameraPermission("denied");
      setCameraError(cameraFailureCopy(failure));
    }
  };

  useEffect(() => {
    if (cameraState !== "live" || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setCameraError("即時畫面無法播放，請改用系統拍照。"));
  }, [cameraState]);

  useEffect(() => {
    if (cameraPermission === "allowed") void openCamera();
    return () => releaseCamera();
  }, []);

  useEffect(() => {
    if (!scanning) return;
    setAnalysisStep(0);
    setTakingLong(false);
    const stepTimer = window.setInterval(() => setAnalysisStep(current => (current + 1) % analysisSteps.length), 1800);
    const lateTimer = window.setTimeout(() => setTakingLong(true), 10000);
    return () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(lateTimer);
    };
  }, [scanning, analysisSteps.length]);

  const runAnalysis = async (imageUrl: string) => {
    closeCamera();
    const activeRequest = ++requestId.current;
    setScanning(true);
    setError("");
    setCameraError("");
    try {
      await analyze(imageUrl, () => requestId.current === activeRequest);
      if (requestId.current === activeRequest) setScanning(false);
    } catch (failure) {
      if (requestId.current !== activeRequest) return;
      setError(failure instanceof Error ? failure.message : "可能是畫面較暗、餐點被遮住，或食材不夠清楚。");
      setScanning(false);
    }
  };
  const preparePhoto = async (file: File) => {
    try {
      const imageUrl = await mealPhotoDataUrl(file);
      setPreview(imageUrl);
      await runAnalysis(imageUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "無法讀取這張照片，請換一張再試。");
      setScanning(false);
    }
  };
  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    closeCamera();
    await preparePhoto(file);
  };
  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setCameraError("鏡頭仍在準備中，請稍候再拍攝。");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("無法擷取目前畫面，請改用系統拍照。");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .9));
    if (!blob) {
      setCameraError("無法建立照片，請重新拍攝。");
      return;
    }
    closeCamera();
    await preparePhoto(new File([blob], `mindmeal-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };
  const begin = () => cameraState === "live" ? captureFrame() : openCamera();
  const cancelAnalysis = () => {
    requestId.current += 1;
    setScanning(false);
    setTakingLong(false);
    setError("");
    window.setTimeout(() => openCamera(), 0);
  };
  const openAlbum = () => {
    closeCamera();
    if (albumPermission === "allowed") albumInput.current?.click();
    else setShowAlbumPermission(true);
  };
  const approveAlbum = () => { allowAlbum(); setShowAlbumPermission(false); window.setTimeout(() => albumInput.current?.click(), 0); };

  return <main className="app-screen dark-screen scan-screen screen-enter">
    <header className="dark-header"><button onClick={() => { closeCamera(); go("home"); }} aria-label="返回首頁">←</button><Brand /><span>AI ANALYSIS</span></header>
    <div className="unified-app-content scan-content-scale">
      <section className="scan-copy"><span className="eyebrow">AI MEAL SCAN</span><h1>{scanning ? "正在分析餐點" : cameraState === "live" ? "將餐點完整放入框內" : "拍下完整餐點"}</h1><p>{scanning ? "完成後會自動顯示營養分析結果。" : cameraState === "live" ? "確認光線與畫面後，按下方快門拍攝。" : "光線充足、餐點完整入鏡，估算會更可靠。"}</p></section>
      <div className={`camera-frame ${scanning ? "scanning" : ""} ${cameraState === "live" ? "camera-live" : ""}`}>
        {(cameraState === "opening" || cameraState === "live") ? <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => setCameraReady(true)} aria-label="相機即時畫面" /> : preview ? <img src={preview} alt="待分析餐點預覽" /> : null}
        <span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" /><i className="scan-line" />
        {cameraState === "live" && !scanning ? <span className="camera-live-label">LIVE</span> : null}
        {scanning ? <span className="scan-analysis-status" role="status" aria-live="polite"><span className="scan-analysis-orbit" aria-hidden="true"><i /></span><strong>{analysisSteps[analysisStep]}</strong><small>{takingLong ? "分析時間比平常久，請再稍候" : "通常約需數秒"}</small></span> : cameraState === "opening" ? <span className="camera-opening" role="status">正在開啟相機…</span> : cameraState !== "live" ? <button type="button" className="camera-open-overlay" onClick={() => openCamera()}>{preview ? "重新拍攝" : cameraPermission === "allowed" ? "開啟相機" : "允許並開啟相機"}</button> : null}
      </div>
      <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
      <input ref={albumInput} className="visually-hidden" type="file" accept="image/*" onChange={handlePhoto} />
      {!scanning && cameraError ? <div className="scan-camera-error" role="alert"><span>{cameraError}</span><button type="button" onClick={() => cameraInput.current?.click()}>使用系統拍照</button></div> : null}
      {scanning ? <button type="button" className="scan-cancel-analysis" onClick={cancelAnalysis}>取消並重新選擇</button> : error ? <section className="scan-failure" role="alert">
        <span className="eyebrow">ANALYSIS PAUSED</span><h2>這張照片暫時無法辨識</h2><p>{error}</p>
        <div className="scan-failure-actions"><button type="button" className="primary-btn" onClick={() => preview ? runAnalysis(preview) : openCamera()}>{preview ? "重新分析" : "重新拍攝"} <span>→</span></button><button type="button" className="secondary-btn" onClick={() => openCamera()}>重新拍攝</button><button type="button" className="secondary-btn" onClick={openAlbum}>從相簿選擇</button></div>
        <div className="scan-failure-alternatives"><button type="button" onClick={() => go("food-search")}>搜尋食物</button><button type="button" onClick={() => go("manual-entry")}>手動輸入</button></div>
      </section> : <><button className={`shutter-btn ${cameraState === "opening" ? "opening" : ""}`} onClick={begin} disabled={cameraState === "opening" || (cameraState === "live" && !cameraReady)} aria-label={cameraState === "live" ? "拍攝並分析餐點" : "開啟裝置相機"}><span /></button><div className="capture-options"><button onClick={openAlbum}>從相簿選擇</button><button onClick={() => go("food-search")}>搜尋食物</button><button onClick={() => go("manual-entry")}>手動輸入</button></div></>}
    </div>
    {showAlbumPermission && <div className="modal-backdrop album-permission-backdrop"><section className="permission-modal album-permission-modal" role="dialog" aria-modal="true" aria-labelledby="album-permission-title"><span className="permission-icon">▦</span><span className="eyebrow">PHOTO ACCESS</span><h2 id="album-permission-title">選擇一張餐點照片？</h2><p>MindMeal 只會讀取你主動選擇的照片，用於完成這次營養分析。</p><button className="primary-btn" onClick={approveAlbum}>選擇照片並分析 <span>→</span></button><button className="secondary-btn" onClick={() => setShowAlbumPermission(false)}>暫不選擇</button></section></div>}
    <BottomNav screen="scan" go={go} blocked={scanning} />
  </main>;
}

function AlbumGallery({ choose, go }: { choose: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const symbols = ["🍔", "🍜", "🍱", "🥗", "🥚", "🥛"];
  return <main className="app-screen album-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回相機">←</button><span>相簿</span><i>最近項目</i></header><div className="unified-app-content album-content-scale"><section className="album-intro"><span className="eyebrow">PHOTO LIBRARY</span><h1>選擇餐點照片</h1><p>選一張照片後，會帶入對應的示範餐點進行營養分析。</p></section><section className="album-grid" aria-label="相簿預覽">{foodLibrary.map((food, index) => <button key={food.id} onClick={() => choose(food)} aria-label={`選擇 ${food.name}`}><span className={`album-thumb album-thumb-${index + 1}`}><b aria-hidden="true">{symbols[index]}</b></span><strong>{food.name}</strong><small>{food.calories} kcal</small></button>)}</section></div><BottomNav screen="album" go={go} /></main>;
}

function FoodSearch({ choose, go }: { choose: (meal: Meal, meta?: MealAnalysisMeta) => void; go: (screen: Screen) => void }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [aiResults, setAiResults] = useState<FoodSearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [takingLong, setTakingLong] = useState(false);
  const [error, setError] = useState("");
  const normalized = query.trim().toLowerCase();
  const candidates = useMemo(() => {
    const seen = new Set<string>();
    return aiResults.filter(item => {
      const key = item.meal.name.replace(/\s/g, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [aiResults]);
  const runSearch = async (searchQuery = query.trim()) => {
    if (!searchQuery.trim() || searching) return;
    setSubmittedQuery(searchQuery.trim());
    setAiResults([]);
    setSearching(true);
    setTakingLong(false);
    setError("");
    const lateTimer = window.setTimeout(() => setTakingLong(true), 10000);
    try {
      setAiResults(await searchFoodWithAi(searchQuery.trim()));
    } catch (failure) {
      setAiResults([]);
      setError(failure instanceof Error ? failure.message : "AI 搜尋暫時無法使用，請稍後再試。");
    } finally {
      window.clearTimeout(lateTimer);
      setTakingLong(false);
      setSearching(false);
    }
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    setSubmittedQuery("");
    setAiResults([]);
    setError("");
  };
  return <main className="app-screen food-search-screen screen-enter">
    <header className="simple-header"><button onClick={() => go("scan")} aria-label="返回紀錄飲食">←</button><span>搜尋食物</span><i /></header>
    <div className="unified-app-content food-search-content-scale">
      <section className="food-search-intro"><span className="eyebrow">FOOD DATABASE</span><h1>今天吃了什麼？</h1><p>輸入餐點、品牌、食材或數量，確認後再儲存 AI 估算結果。</p></section>
      <form className="food-search-field" onSubmit={event => { event.preventDefault(); runSearch(); }}>
        <span aria-hidden="true">⌕</span>
        <input type="search" value={query} onChange={event => updateQuery(event.target.value)} placeholder="搜尋：牛肉麵、漢堡、雞蛋…" aria-label="搜尋食物" />
        <button type="submit" disabled={!normalized || searching} aria-label="送出食物搜尋">{searching ? "…" : "→"}</button>
      </form>
      {submittedQuery ? <>
        <div className="food-results-heading"><span>搜尋結果</span><small>{searching ? "搜尋中" : `${candidates.length} 項`}</small></div>
        <section className={`food-result-list ${searching || error ? "has-status" : ""}`}>
          {searching ? <div className="food-search-loading" role="status" aria-live="polite">
            <strong>{takingLong ? "還在整理結果，請稍候" : "正在使用 AI 搜尋"}</strong>
            <div className="food-search-progress" aria-hidden="true"><i /></div>
          </div> : null}
          {!searching && error ? <div className="food-search-status is-error" role="status">
            {error}
            <span><button type="button" onClick={() => runSearch(submittedQuery)}>重新搜尋</button><button type="button" onClick={() => go("manual-entry")}>手動輸入</button></span>
          </div> : null}
          {!searching && !error ? candidates.map(candidate => <button key={`${candidate.meta?.source || "ai"}-${candidate.meal.id}-${candidate.meal.name}`} onClick={() => choose(candidate.meal, candidate.meta)}><span className="food-result-icon">{candidate.meal.name.slice(0, 1)}</span><span className="food-result-copy"><strong>{candidate.meal.name}{candidate.meta?.source === "search-ai" ? <em>AI 估算</em> : null}</strong><small>{candidate.meal.calories} kcal · 蛋白質 {candidate.meal.protein}g · 碳水 {candidate.meal.carbs}g · 脂肪 {candidate.meal.fat}g</small>{candidate.needsClarification ? <small className="food-result-clarify">請補充品牌、數量或料理方式</small> : null}</span><i>→</i></button>) : null}
          {!searching && !error && candidates.length === 0 ? <div className="food-empty"><strong>找不到「{submittedQuery}」</strong><p>可以補充品牌、數量或料理方式後，再從搜尋框送出。</p></div> : null}
        </section>
      </> : null}
    </div>
    <BottomNav screen="food-search" go={go} blocked={searching} />
  </main>;
}

function ManualEntry({ choose, go }: { choose: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const [form, setForm] = useState({ name: "", ingredients: "", calories: "", protein: "0", carbs: "0", fat: "0" });
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const nutritionKeys: ("calories" | "protein" | "carbs" | "fat")[] = ["calories", "protein", "carbs", "fat"];
  const invalid = !form.name.trim() || !form.calories.trim() || nutritionKeys.some(key => Number(form[key]) < 0 || Number.isNaN(Number(form[key])));
  const submit = () => choose({ id: Date.now(), name: form.name.trim(), calories: Number(form.calories), protein: Number(form.protein), carbs: Number(form.carbs), fat: Number(form.fat), rice: "一碗", sauce: "正常", completion: "吃完", ingredients: form.ingredients.split(/[、,，]/).map(item => item.trim()).filter(Boolean) });
  return <main className="app-screen manual-entry-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回紀錄飲食">←</button><span>手動輸入</span><i /></header><div className="unified-app-content manual-entry-content-scale"><section className="manual-entry-intro"><span className="eyebrow">CUSTOM MEAL</span><h1>建立自己的餐點</h1><p>輸入包裝標示或你知道的數值，之後仍可在分析頁再次調整。</p></section><section className="manual-form"><label className="manual-wide"><span>餐點名稱 <b>必填</b></span><input value={form.name} onChange={event => update("name", event.target.value)} placeholder="例如：自製雞胸沙拉" /></label><label className="manual-wide"><span>食材</span><textarea value={form.ingredients} onChange={event => update("ingredients", event.target.value)} placeholder="雞胸肉、蘿蔓、番茄、玉米" rows={3} /><small>可用頓號或逗號分隔多項食材</small></label><div className="manual-nutrition-title"><strong>營養資訊</strong><small>每份估算</small></div><div className="manual-nutrition-grid"><label><span>熱量 <b>必填</b></span><div><input inputMode="decimal" type="number" min="0" value={form.calories} onChange={event => update("calories", event.target.value)} placeholder="0" /><i>kcal</i></div></label><label><span>蛋白質</span><div><input inputMode="decimal" type="number" min="0" value={form.protein} onChange={event => update("protein", event.target.value)} /><i>g</i></div></label><label><span>碳水</span><div><input inputMode="decimal" type="number" min="0" value={form.carbs} onChange={event => update("carbs", event.target.value)} /><i>g</i></div></label><label><span>脂肪</span><div><input inputMode="decimal" type="number" min="0" value={form.fat} onChange={event => update("fat", event.target.value)} /><i>g</i></div></label></div><div className="manual-preview"><span>目前總計</span><strong>{Number(form.calories) || 0} kcal</strong><small>蛋白質 {Number(form.protein) || 0}g · 碳水 {Number(form.carbs) || 0}g · 脂肪 {Number(form.fat) || 0}g</small></div><button className="primary-btn" disabled={invalid} onClick={submit}>確認並查看分析 <span>→</span></button></section></div><BottomNav screen="manual-entry" go={go} /></main>;
}

function Option({ title, hint, values, value, setValue }: { title: string; hint?: string; values: string[]; value: string; setValue: (value: string) => void }) {
  return <div className="option-block"><div className="option-heading"><strong>{title}</strong>{hint ? <small>{hint}</small> : null}</div><div>{values.map(item => <button key={item} className={value === item ? "selected" : ""} onClick={() => setValue(item)} aria-pressed={value === item}>{item}</button>)}</div></div>;
}

function Analysis({ initialMeal, imageUrl, meta, save, go }: { initialMeal: Meal; imageUrl?: string; meta?: MealAnalysisMeta; save: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [rice, setRice] = useState(initialMeal.rice);
  const [sauce, setSauce] = useState(initialMeal.sauce);
  const [completion, setCompletion] = useState(initialMeal.completion);
  const [ingredients, setIngredients] = useState(initialMeal.ingredients.join("、"));
  const [customCalories, setCustomCalories] = useState("");
  const [pendingLeave, setPendingLeave] = useState(false);
  const initialMealTime = validMealDate(initialMeal.eatenAt) || new Date();
  const [mealType, setMealType] = useState<MealType>(initialMeal.mealType || suggestedMealType(initialMealTime));
  const [eatenAt, setEatenAt] = useState(initialMealTime.toISOString());
  const futureMealTime = (validMealDate(eatenAt)?.getTime() || 0) > Date.now();
  const isTodayMeal = sameLocalDate(validMealDate(eatenAt) || new Date(), new Date());
  const dirty = rice !== initialMeal.rice
    || sauce !== initialMeal.sauce
    || completion !== initialMeal.completion
    || ingredients !== initialMeal.ingredients.join("、")
    || customCalories !== ""
    || mealType !== (initialMeal.mealType || suggestedMealType(initialMealTime))
    || eatenAt !== initialMealTime.toISOString();
  const meal = useMemo(() => {
    const riceRatio = rice === "半碗" ? .78 : rice === "加飯" ? 1.18 : 1;
    const sauceDelta = sauce === "多" ? 55 : sauce === "少" ? -25 : 0;
    const completionRatio = completion === "剩一些" ? .8 : 1;
    return {
      ...initialMeal,
      id: 0,
      calories: customCalories ? Math.max(0, Number(customCalories) || 0) : Math.round((initialMeal.calories * riceRatio + sauceDelta) * completionRatio),
      protein: Math.round(initialMeal.protein * completionRatio),
      carbs: Math.round(initialMeal.carbs * riceRatio * completionRatio),
      fat: Math.round((initialMeal.fat + sauceDelta * .08) * completionRatio),
      rice,
      sauce,
      completion,
ingredients: ingredients.split("、").map(item => item.trim()).filter(Boolean),
      mealType,
      eatenAt,
      recordedAt: initialMeal.recordedAt || new Date().toISOString(),
    };
  }, [initialMeal, rice, sauce, completion, ingredients, customCalories, mealType, eatenAt]);
  useEffect(() => {
    if (!dirty) return;
    const preventAccidentalLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventAccidentalLeave);
    return () => window.removeEventListener("beforeunload", preventAccidentalLeave);
  }, [dirty]);
  const leaveAnalysis = () => dirty ? setPendingLeave(true) : go("scan");
  const lowConfidence = meta?.confidence === "low";
  return <><main className="app-screen analysis-screen screen-enter"><header className="simple-header"><button onClick={leaveAnalysis} aria-label="返回掃描">←</button><span>AI 分析結果</span><i>{meta ? meta.model : "資料庫估算"}</i></header><section className={`food-visual ${imageUrl ? "has-meal-photo" : ""}`}>{imageUrl ? <img src={imageUrl} alt="本次分析的餐點照片" /> : <div className="plate"><span className="food rice" /><span className="food chicken" /><span className="food greens g1" /><span className="food greens g2" /></div>}{lowConfidence ? <span className="detected">辨識可能不完整，請確認餐點與份量</span> : null}</section><section className="analysis-content"><span className="eyebrow">MULTIMODAL NUTRITION ESTIMATE</span><h1>{meal.name}</h1><p className="estimate-note">AI 估算，儲存前請確認</p><div className="macro-summary" aria-live="polite"><span><b>{meal.calories}</b> kcal</span><span><b>{meal.protein}g</b> 蛋白質</span><span><b>{meal.carbs}g</b> 碳水</span><span><b>{meal.fat}g</b> 脂肪</span></div><div className="detected-foods">{meal.ingredients.map(item => <span key={item}>{item}</span>)}</div><section className="analysis-adjustment-card"><button type="button" className="advanced-toggle" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>{advanced ? "收起微調" : "微調這餐"}<span className={`adjustment-state-icon ${advanced ? "is-expanded" : ""}`} aria-hidden="true">{advanced ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="m6 15 6-6 6 6" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>}</span></button><p className="analysis-adjustment-hint">飯量、醬料、食用量或食材</p>{advanced && <div className="advanced-panel"><Option title="白飯份量" hint="1 碗約 200g" values={["半碗", "一碗", "加飯"]} value={rice} setValue={setRice} /><Option title="醬料份量" hint="約影響 ±25–55 kcal" values={["少", "正常", "多"]} value={sauce} setValue={setSauce} /><Option title="實際食用量" hint="剩一些以約 80% 估算" values={["吃完", "剩一些"]} value={completion} setValue={setCompletion} /><label>辨識食材（以頓號分隔）<input value={ingredients} onChange={event => setIngredients(event.target.value)} /></label><label>自行輸入熱量（kcal）<input inputMode="numeric" placeholder={String(meal.calories)} value={customCalories} onChange={event => setCustomCalories(event.target.value)} /></label></div>}</section><MealRecordFields mealType={mealType} eatenAt={eatenAt} onMealTypeChange={setMealType} onEatenAtChange={setEatenAt} /><button className="primary-btn" disabled={futureMealTime} onClick={() => save(meal)}>{isTodayMeal ? "儲存這餐" : "儲存補登紀錄"} <span>→</span></button><p className="medical-disclaimer">AI 營養數值為照片估算，不適用於醫療診斷、過敏原確認或精確飲食處方。</p></section></main>{pendingLeave && <div className="modal-backdrop analysis-unsaved-backdrop"><section className="permission-modal analysis-unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-unsaved-title"><span className="eyebrow">UNSAVED MEAL</span><h2 id="analysis-unsaved-title">這餐尚未儲存</h2><p>要先儲存目前的餐點內容，再離開分析頁嗎？</p><button type="button" className="primary-btn" disabled={futureMealTime} onClick={() => save(meal)}>儲存這餐 <span>→</span></button><button type="button" className="secondary-btn" onClick={() => go("scan")}>不儲存，直接離開</button><button type="button" className="keep-editing-btn" onClick={() => setPendingLeave(false)}>繼續編輯</button></section></div>}</>;
}

function Result({ meal, meals, profile, go }: { meal: Meal; meals: Meal[]; profile: Profile; go: (screen: Screen) => void }) {
  const targets = calculateNutritionTargets(profile);
  const totals = useMemo(() => {
    const resultDate = validMealDate(meal.eatenAt) || new Date();
    return meals.reduce((result, item) => {
      const itemDate = validMealDate(item.eatenAt);
      if (!itemDate || !sameLocalDate(itemDate, resultDate)) return result;
      result.protein += item.protein;
      result.carbs += item.carbs;
      result.fat += item.fat;
      return result;
    }, { protein: 0, carbs: 0, fat: 0 });
  }, [meal.eatenAt, meals]);
  const metrics = useMemo(() => [
    { label: "蛋白質", current: totals.protein, target: targets.protein, unit: "g", suggestion: "下一餐可以參考蛋白質與蔬菜的搭配。" },
    { label: "碳水", current: totals.carbs, target: targets.carbs, unit: "g", suggestion: "下一餐可以搭配適量主食，延續一天的均衡。" },
    { label: "脂肪", current: totals.fat, target: targets.fat, unit: "g", suggestion: "下一餐可以依喜好搭配魚類、堅果或酪梨。" },
  ], [targets.carbs, targets.fat, targets.protein, totals.carbs, totals.fat, totals.protein]);
  const focusMetricIndex = useMemo(() => metrics.reduce((best, item, index) => item.current / Math.max(1, item.target) < metrics[best].current / Math.max(1, metrics[best].target) ? index : best, 0), [metrics]);
  const [activeMetric, setActiveMetric] = useState(0);
  const [metricVisible, setMetricVisible] = useState(true);
  const [manualMetric, setManualMetric] = useState(false);
  const manualMetricTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(manualMetricTimer.current), []);
  useEffect(() => {
    if (manualMetric || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (!manualMetric) setActiveMetric(focusMetricIndex);
      return;
    }
    let steps = 0;
    let fadeTimer = 0;
    const rotationTimer = window.setInterval(() => {
      setMetricVisible(false);
      fadeTimer = window.setTimeout(() => {
        steps += 1;
        setActiveMetric(current => steps >= 6 ? focusMetricIndex : (current + 1) % metrics.length);
        setMetricVisible(true);
        if (steps >= 6) window.clearInterval(rotationTimer);
      }, 720);
    }, 4200);
    return () => {
      window.clearInterval(rotationTimer);
      window.clearTimeout(fadeTimer);
    };
  }, [focusMetricIndex, manualMetric, metrics.length]);
  const metric = metrics[activeMetric] || metrics[0];
  const degrees = Math.min(360, Math.max(0, Math.round(metric.current / Math.max(1, metric.target) * 360)));
  const chooseMetric = (index: number) => {
    setManualMetric(true);
    if (index === activeMetric) return;
    window.clearTimeout(manualMetricTimer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActiveMetric(index);
      setMetricVisible(true);
      return;
    }
    setMetricVisible(false);
    manualMetricTimer.current = window.setTimeout(() => {
      setActiveMetric(index);
      setMetricVisible(true);
    }, 720);
  };
  return <main className="success-screen result-screen screen-enter"><Brand /><span className="eyebrow result-saved-label">MEAL SAVED</span><h1>記錄完成</h1><div className="meal-record-confirmation">{formatMealMoment(meal.eatenAt)} · {meal.mealType || suggestedMealType(validMealDate(meal.eatenAt) || new Date())}</div><p className="result-saved-copy">已加入 <b>{meal.calories} kcal</b>（估算）。這份紀錄已同步更新今天的營養進度。</p><section className={`result-nutrition-slide ${metricVisible ? "is-visible" : "is-hidden"}`} aria-live="polite" aria-label={`今日${metric.label}進度`}><i key={metric.label} className="result-nutrition-ring" aria-hidden="true" style={{ "--ring-progress-target": `${degrees}deg`, "--ring-orange-target": `${Math.round(degrees * .58)}deg` } as React.CSSProperties}><span>{metric.label}</span></i><strong>{metric.current.toLocaleString()}<small> / {metric.target.toLocaleString()}{metric.unit}</small></strong><p>{metric.suggestion}</p></section><div className="result-metric-pager" aria-label="切換營養進度">{metrics.map((item, index) => <button type="button" key={item.label} className={activeMetric === index ? "active" : ""} onClick={() => chooseMetric(index)} aria-label={`顯示今日${item.label}進度`} aria-pressed={activeMetric === index} />)}</div><div className="success-actions"><button className="primary-btn" onClick={() => go("home")}>回到首頁 <span>→</span></button><button className="secondary-btn" onClick={() => go("nearby")}>查看下一餐選擇</button></div><Wave /></main>;
}


function NearbyRecommendations({ meals, profile, setProfile, go, selectRecommendation }: { meals: Meal[]; profile: Profile; setProfile: (profile: Profile) => void; go: (screen: Screen) => void; selectRecommendation: (recommendation: NextMealRecommendation) => void }) {
  const today = new Date();
  const targets = calculateNutritionTargets(profile);
  const todayMeals = meals.filter(item => {
    const eatenAt = validMealDate(item.eatenAt);
    return eatenAt && sameLocalDate(eatenAt, today);
  });
  const totals = todayMeals.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbs: sum.carbs + item.carbs,
    fat: sum.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const requestInput = {
    date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    totals,
    targets: { calories: targets.calories, protein: targets.protein, carbs: targets.carbs, fat: targets.fat },
    profile: {
      goal: profile.goal,
      preferences: profile.preferences,
      exclusions: profile.exclusions,
      contexts: profile.contexts,
      frequency: profile.frequency,
    },
    recentMeals: todayMeals.map(item => item.name).slice(-12),
  };
  const recommendationSignature = JSON.stringify(requestInput);
  const [plan, setPlan] = useState<NextMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [showPermission, setShowPermission] = useState(profile.location === "unknown");

  useEffect(() => {
    let cancelled = false;
    const cached = window.localStorage.getItem("mindmeal-next-meal-cache-v1");
    if (!retryKey && cached) {
      try {
        const saved = JSON.parse(cached) as { signature?: string; plan?: NextMealPlan };
        if (saved.signature === recommendationSignature && saved.plan?.recommendations?.length === 3) {
          setPlan(saved.plan);
          setLoading(false);
          return () => { cancelled = true; };
        }
      } catch {
        window.localStorage.removeItem("mindmeal-next-meal-cache-v1");
      }
    }
    setLoading(true);
    setError("");
    recommendNextMealWithAi(requestInput).then(result => {
      if (cancelled) return;
      setPlan(result);
      window.localStorage.setItem("mindmeal-next-meal-cache-v1", JSON.stringify({ signature: recommendationSignature, plan: result }));
    }).catch(failure => {
      if (!cancelled) {
        setPlan(null);
        setError(failure instanceof Error ? failure.message : "下一餐建議暫時無法產生，請稍後再試。");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [recommendationSignature, retryKey]);

  const locate = (rememberChoice: boolean) => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      if (rememberChoice) setProfile({ ...profile, location: "denied" });
      setShowPermission(false);
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(position => {
      setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationStatus("ready");
      if (rememberChoice) setProfile({ ...profile, location: "allowed" });
      setShowPermission(false);
    }, () => {
      setLocationStatus("error");
      if (rememberChoice) setProfile({ ...profile, location: "denied" });
      setShowPermission(false);
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  };

  useEffect(() => {
    if (profile.location === "allowed" && locationStatus === "idle") locate(false);
  }, [profile.location]);

  const mapSearchUrl = (recommendation: NextMealRecommendation) => {
    const locationHint = coordinates ? ` near ${coordinates.latitude},${coordinates.longitude}` : "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recommendation.searchQuery + locationHint)}`;
  };

  return <><main className="app-screen nearby-screen screen-enter" aria-hidden={showPermission} inert={showPermission}>
    <AppHeader label="NEXT / MEAL" />
    <div className="nearby-content">
      <section className="nearby-hero">
        <span className="eyebrow">NEXT MEAL DIRECTION</span>
        <h1>下一餐怎麼選？</h1>
      </section>
      <section className="next-meal-summary" aria-label="依今日紀錄整理的下一餐方向">
        <span>依今日紀錄整理</span>
        <strong>{loading ? "正在產生建議" : plan?.focusLabel || "稍後再試"}</strong>
      </section>
      {plan?.guidance ? <p className="next-meal-guidance">{plan.guidance}</p> : null}
      <section className="next-meal-list" aria-labelledby="next-meal-list-title">
        <h2 id="next-meal-list-title">推薦餐點</h2>
        <div>
          {loading ? <div className="next-meal-loading" role="status"><strong>正在依今天的紀錄整理</strong><div><i /></div></div> : null}
          {!loading && error ? <div className="next-meal-error" role="status"><strong>目前無法產生建議</strong><p>{error}</p><button type="button" onClick={() => setRetryKey(value => value + 1)}>重新產生</button></div> : null}
          {!loading && !error ? plan?.recommendations.map(recommendation => <article className="next-meal-card" key={recommendation.meal}>
            <button type="button" onClick={() => selectRecommendation(recommendation)} aria-label={`查看${recommendation.meal}詳細資訊`}>
              <strong>{recommendation.meal}</strong>
              <small>{recommendation.focus}・約 {recommendation.calories} kcal</small>
            </button>
            <a href={mapSearchUrl(recommendation)} target="_blank" rel="noreferrer">在地圖搜尋 <span aria-hidden="true">↗</span></a>
          </article>) : null}
        </div>
      </section>
      <p className="next-meal-map-note">{coordinates ? "將依目前位置開啟 Google Maps 搜尋，店家資訊以地圖結果為準。" : "將開啟 Google Maps 搜尋附近店家，店家資訊以地圖結果為準。"}</p>
    </div>
    <BottomNav screen="nearby" go={go} blocked={showPermission} />
  </main>{showPermission ? <div className="modal-backdrop location-modal-backdrop"><section className="permission-modal location-permission-modal" role="dialog" aria-modal="true" aria-labelledby="location-title"><span className="permission-icon">⌖</span><span className="eyebrow">只在你需要時詢問</span><h2 id="location-title">要看看附近選擇嗎？</h2><p>定位只用來協助 Google Maps 搜尋附近店家，不會影響飲食紀錄。</p><button className="primary-btn" disabled={locationStatus === "loading"} onClick={() => locate(true)}>{locationStatus === "loading" ? "正在取得位置…" : "允許這次定位"} <span>→</span></button><button className="secondary-btn" disabled={locationStatus === "loading"} onClick={() => { setProfile({ ...profile, location: "denied" }); setShowPermission(false); }}>暫時不要</button></section></div> : null}</>;
}

function StoreDetail({ recommendation, go }: { recommendation: NextMealRecommendation; go: (screen: Screen) => void }) {
  const searchGoogleMaps = () => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recommendation.searchQuery)}`, "_blank", "noopener,noreferrer");
  return <main className="app-screen store-detail-screen screen-enter">
    <header className="simple-header"><button onClick={() => go("nearby")} aria-label="返回推薦餐點">←</button><span>餐點建議</span><i>AI 建議</i></header>
    <div className="store-detail-content">
      <section className="store-detail-hero">
        <span className="eyebrow">建議餐點</span>
        <h1>{recommendation.meal}</h1>
        <p>{recommendation.focus}</p>
      </section>
      <section className="store-detail-facts" aria-label="餐點營養與點餐建議">
        <div>
          <span>建議點法</span>
          <strong>{recommendation.orderTip}</strong>
        </div>
        <div>
          <span>營養估算</span>
          <strong>約 {recommendation.calories} kcal・蛋白質 {recommendation.protein}g・碳水 {recommendation.carbs}g・脂肪 {recommendation.fat}g</strong>
        </div>
        <div className="store-diet-note">
          <span>飲食提醒</span>
          <p>{recommendation.notice}</p>
        </div>
      </section>
      <div className="store-detail-actions">
        <button className="primary-btn" onClick={searchGoogleMaps}>在 Google Maps 搜尋附近店家 <span>↗</span></button>
        <p>將以「{recommendation.searchQuery}」搜尋，店家與餐點資訊以地圖結果為準。</p>
        <button type="button" className="text-btn" onClick={() => go("nearby")}>← 查看其他推薦</button>
      </div>
    </div>
    <BottomNav screen="store" go={go} />
  </main>;
}

function EditMeal({ meal, update, remove, go }: { meal: Meal; update: (meal: Meal) => void; remove: () => void; go: (screen: Screen) => void }) {
  const [draft, setDraft] = useState(meal);
  const [confirming, setConfirming] = useState(false);
  const draftMealTime = validMealDate(draft.eatenAt) || new Date();
  const futureMealTime = draftMealTime.getTime() > Date.now();
  const save = () => {
    const riceRatio = draft.rice === "半碗" ? .78 : draft.rice === "加飯" ? 1.18 : 1;
    const sauceDelta = draft.sauce === "多" ? 55 : draft.sauce === "少" ? -25 : 0;
    const completionRatio = draft.completion === "剩一些" ? .8 : 1;
    update({ ...draft, calories: Math.round((620 * riceRatio + sauceDelta) * completionRatio), protein: Math.round(42 * completionRatio), carbs: Math.round(72 * riceRatio * completionRatio), fat: Math.round((18 + sauceDelta * .08) * completionRatio) });
    go("home");
  };
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><span>編輯餐點</span><i>估算</i></header><section className="edit-card"><span className="eyebrow">TODAY&apos;S MEAL</span><h1>{draft.name}</h1><label>份量<select value={draft.rice} onChange={event => setDraft({ ...draft, rice: event.target.value })}><option>半碗</option><option>一碗</option><option>加飯</option></select></label><label>醬料<select value={draft.sauce} onChange={event => setDraft({ ...draft, sauce: event.target.value })}><option>少</option><option>正常</option><option>多</option></select></label><label>完食度<select value={draft.completion} onChange={event => setDraft({ ...draft, completion: event.target.value })}><option>吃完</option><option>剩一些</option></select></label><label>食材<input value={draft.ingredients.join("、")} onChange={event => setDraft({ ...draft, ingredients: event.target.value.split("、").map(item => item.trim()).filter(Boolean) })} /></label><MealRecordFields mealType={draft.mealType || suggestedMealType(draftMealTime)} eatenAt={draftMealTime.toISOString()} onMealTypeChange={mealType => setDraft({ ...draft, mealType })} onEatenAtChange={eatenAt => setDraft({ ...draft, eatenAt })} /><button className="primary-btn" disabled={futureMealTime} onClick={save}>儲存修改 <span>→</span></button><button className="delete-btn" onClick={() => setConfirming(true)}>刪除這筆紀錄</button></section>{confirming && <div className="modal-backdrop"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">確定刪除這餐？</h2><p>刪除後，首頁進度與下一餐建議會一起更新。</p><button className="delete-confirm" onClick={remove}>確認刪除</button><button className="secondary-btn" onClick={() => setConfirming(false)}>先保留</button></section></div>}</main>;
}

function ProfileSettings({ profile, save, go }: { profile: Profile; save: (profile: Profile) => void; go: (screen: Screen) => void }) {
  const [draft, setDraft] = useState(() => profile.name === "7000" ? { ...profile, name: "" } : profile);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft(current => ({ ...current, [key]: value }));
  const toggle = (key: "preferences" | "exclusions" | "contexts", value: string) => update(key, draft[key].includes(value) ? draft[key].filter(item => item !== value) : [...draft[key], value]);
  const invalid = !draft.age.trim() || !draft.height.trim() || !draft.weight.trim();
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const previewTargets = calculateNutritionTargets(draft);
  const leave = (next: Screen) => dirty ? setPendingScreen(next) : go(next);
  const saveAndGo = (next: Screen) => { save(draft); go(next); };
  return <><main className="app-screen settings-screen screen-enter">
    <header className="simple-header"><button onClick={() => leave("profile")} aria-label="返回我的資料">←</button><span>資料設定</span><i /></header>
    <div className="settings-content-scale">
    <section className="settings-intro"><span className="eyebrow">PROFILE SETTINGS</span><h1>調整你的飲食方向</h1><p>身體與目標、飲食偏好和日常飲食環境都能在這一頁<br />修改；儲存後會一起更新建議。</p></section>
    <section className="settings-section" id="settings-body"><div className="settings-section-title"><span>01</span><div><h2>身體與目標</h2><p>用來估算每日範圍與份量方向。</p></div></div><div className="form-grid"><label>年齡<input inputMode="numeric" value={draft.age} onChange={event => update("age", event.target.value)} /><span>歲</span></label><label>身高<input inputMode="numeric" value={draft.height} onChange={event => update("height", event.target.value)} /><span>cm</span></label><label>體重<input inputMode="numeric" value={draft.weight} onChange={event => update("weight", event.target.value)} /><span>kg</span></label><label>性別<select value={draft.gender} onChange={event => update("gender", event.target.value)}><option>女性</option><option>男性</option></select></label></div><div className="field-block"><span className="field-title">目前目標</span><div className="chip-row wrap">{["減脂", "維持", "增肌", "均衡飲食"].map(value => <ToggleChip key={value} value={value} selected={draft.goal === value} onClick={() => update("goal", value)} />)}</div></div><div className="field-block"><span className="field-title">運動量</span><div className="chip-row wrap">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(value => <ToggleChip key={value} value={value} selected={draft.activity === value} onClick={() => update("activity", value)} />)}</div></div><div className="nutrition-target-preview"><span>目前每日估算</span><strong>{previewTargets.calories.toLocaleString()} kcal</strong><div><b>蛋白質 {previewTargets.protein}g</b><b>碳水 {previewTargets.carbs}g</b><b>脂肪 {previewTargets.fat}g</b></div><small>會隨上方資料即時試算；儲存後同步更新首頁。此為生活管理估算，非醫療處方。</small></div></section>
    <section className="settings-section" id="settings-preferences"><div className="settings-section-title"><span>02</span><div><h2>飲食偏好</h2><p>硬性限制會排除；口味只影響排序。</p></div></div><div className="field-block"><span className="field-title">過敏／宗教／醫療限制</span><div className="chip-row wrap">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(value => <ToggleChip key={value} value={value} selected={draft.exclusions.includes(value)} onClick={() => toggle("exclusions", value)} />)}</div></div><div className="field-block"><span className="field-title">口味與排序偏好</span><div className="chip-row wrap">{["少辣", "低糖", "預算 150 內"].map(value => <ToggleChip key={value} value={value} selected={draft.preferences.includes(value)} onClick={() => toggle("preferences", value)} />)}</div></div></section>
    <section className="settings-section" id="settings-contexts"><div className="settings-section-title"><span>03</span><div><h2>日常飲食環境</h2><p>讓下一餐推薦更貼近日常選擇。</p></div></div><label className="select-field">外食頻率<select value={draft.frequency} onChange={event => update("frequency", event.target.value)}><option>幾乎不外食</option><option>每週外食 1–3 次</option><option>每週外食 4–6 次</option><option>幾乎每天外食</option></select></label><div className="field-block"><span className="field-title">常見選擇</span><small className="field-help">可複選，將用於調整下一餐推薦。</small><div className="chip-row wrap">{["自煮", "便利商店", "便當店", "餐廳"].map(value => <ToggleChip key={value} value={value} selected={draft.contexts.includes(value)} onClick={() => toggle("contexts", value)} />)}</div></div></section>
    <div className="settings-actions"><button className="primary-btn" disabled={invalid} onClick={() => saveAndGo("profile")}>儲存所有設定 <span>→</span></button><button className="secondary-btn" onClick={() => leave("profile")}>取消</button></div>
    </div>
    {pendingScreen && <div className="modal-backdrop unsaved-backdrop"><section className="permission-modal unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><span className="eyebrow">UNSAVED CHANGES</span><h2 id="unsaved-title">尚未儲存變更</h2><p>要先儲存這次修改，再前往其他頁面嗎？</p><button className="primary-btn" disabled={invalid} onClick={() => saveAndGo(pendingScreen)}>儲存後離開 <span>→</span></button><button className="secondary-btn" onClick={() => go(pendingScreen)}>不儲存，直接離開</button><button className="keep-editing-btn" onClick={() => setPendingScreen(null)}>繼續編輯</button></section></div>}
  </main><BottomNav screen="settings" go={leave} /></>;
}

function ReminderSettingsScreen({ profile, save, go }: { profile: Profile; save: (profile: Profile) => void; go: (screen: Screen) => void }) {
  const [draft, setDraft] = useState(profile.reminderWindows);
  const [pendingLeave, setPendingLeave] = useState(false);
  const enabledCount = reminderMealTypes.filter(mealType => draft[mealType].enabled).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.reminderWindows);
  const leave = () => dirty ? setPendingLeave(true) : go("profile");
  const saveAndLeave = async () => {
    save({ ...profile, reminderWindows: draft });
    if (enabledCount) await requestReminderPermission();
    setPendingLeave(false);
    go("profile");
  };
  useEffect(() => {
    if (!dirty) return;
    const preventAccidentalLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventAccidentalLeave);
    return () => window.removeEventListener("beforeunload", preventAccidentalLeave);
  }, [dirty]);
  return <><main className="app-screen reminder-settings-screen screen-enter" aria-hidden={pendingLeave} inert={pendingLeave}>
    <header className="simple-header"><button onClick={leave} aria-label="返回我的資料">←</button><span>提醒設定</span><i /></header>
    <section className="reminder-settings-content">
      <span className="eyebrow">REMINDER SETTINGS</span>
      <h1>提醒超人</h1>
      <p>設定常用用餐時段；若已完成紀錄，當次提醒會自動跳過。</p>
      <ReminderRows value={draft} onChange={setDraft} />
    </section>
    <div className="sticky-action reminder-save-action"><button type="button" className="primary-btn" onClick={saveAndLeave}>儲存提醒設定 <span>→</span></button></div>
  </main>{pendingLeave && <div className="modal-backdrop unsaved-backdrop"><section className="permission-modal unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-unsaved-title"><span className="eyebrow">UNSAVED CHANGES</span><h2 id="reminder-unsaved-title">提醒設定尚未儲存</h2><p>要先儲存這次修改，再返回我的資料嗎？</p><button type="button" className="primary-btn" onClick={saveAndLeave}>儲存後離開 <span>→</span></button><button type="button" className="secondary-btn" onClick={() => go("profile")}>不儲存，直接離開</button><button type="button" className="keep-editing-btn" onClick={() => setPendingLeave(false)}>繼續編輯</button></section></div>}</>;
}
function AccountProfileScreen({ profile, save, go, returnTo }: { profile: Profile; save: (profile: Profile) => void; go: (screen: Screen) => void; returnTo: "home" | "profile" }) {
  const [draft, setDraft] = useState(profile);
  const [avatarEditor, setAvatarEditor] = useState<{ src: string; x: number; y: number; zoom: number } | null>(null);
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({ current: "", next: "", confirm: "" });
  const [passwordVisible, setPasswordVisible] = useState({ current: false, next: false, confirm: false });
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const cropDrag = useRef({ pointerId: null as number | null, pointerX: 0, pointerY: 0, x: 50, y: 50 });
  const avatarEditorCloseRef = useRef<HTMLButtonElement>(null);
  const editorOpen = avatarEditor !== null;
  const emailInvalid = draft.email.trim().length > 0 && !isValidEmail(draft.email);
  const invalid = !draft.name.trim() || emailInvalid;
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const passwordMismatch = passwordFields.confirm.length > 0 && passwordFields.next !== passwordFields.confirm;
  const passwordReady = passwordFields.current.length > 0 && passwordFields.next.length >= 6 && passwordFields.next === passwordFields.confirm;
  useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAvatarEditor(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    avatarEditorCloseRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); previousFocus?.focus(); };
  }, [editorOpen]);
  useEffect(() => {
    if (!dirty) return;
    const preventAccidentalLeave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventAccidentalLeave);
    return () => window.removeEventListener("beforeunload", preventAccidentalLeave);
  }, [dirty]);
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatar = await avatarDataUrl(file);
      setAvatarEditor({ src: avatar, x: 50, y: 50, zoom: 1.3 });
    } catch { /* keep the current avatar */ }
    event.target.value = "";
  };
  const startCropDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!avatarEditor) return;
    cropDrag.current = { pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, x: avatarEditor.x, y: avatarEditor.y };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer id tracking keeps drag active */ }
    event.preventDefault();
  };
  const moveCrop = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!avatarEditor || cropDrag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - cropDrag.current.pointerX;
    const dy = event.clientY - cropDrag.current.pointerY;
    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    const x = clamp(cropDrag.current.x - dx * .28);
    const y = clamp(cropDrag.current.y - dy * .28);
    setAvatarEditor(current => current ? { ...current, x, y } : current);
    event.preventDefault();
  };
  const finishCropDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (cropDrag.current.pointerId !== event.pointerId) return;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    cropDrag.current.pointerId = null;
  };
  const moveCropWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!avatarEditor || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    setAvatarEditor(current => current ? {
      ...current,
      x: clamp(current.x + (event.key === "ArrowLeft" ? 2 : event.key === "ArrowRight" ? -2 : 0)),
      y: clamp(current.y + (event.key === "ArrowUp" ? 2 : event.key === "ArrowDown" ? -2 : 0)),
    } : current);
  };
  const applyAvatar = () => {
    if (!avatarEditor) return;
    setDraft(current => ({ ...current, avatar: avatarEditor.src, avatarX: avatarEditor.x, avatarY: avatarEditor.y, avatarZoom: avatarEditor.zoom }));
    setAvatarEditor(null);
  };
  const closePasswordEditor = () => {
    setPasswordEditorOpen(false);
    setPasswordFields({ current: "", next: "", confirm: "" });
    setPasswordVisible({ current: false, next: false, confirm: false });
  };
  const togglePasswordVisibility = (field: keyof typeof passwordVisible) => setPasswordVisible(current => ({ ...current, [field]: !current[field] }));
  const changePassword = () => {
    if (!passwordReady) return;
    closePasswordEditor();
    setPasswordUpdated(true);
    window.setTimeout(() => setPasswordUpdated(false), 2600);
  };
  const leave = (next: Screen) => dirty ? setPendingScreen(next) : go(next);
  const saveProfile = (next: Screen = returnTo) => {
    if (invalid) return;
    if (draft.email.trim()) window.localStorage.setItem(accountSetupKey(draft.email), "complete");
    save({ ...draft, email: draft.email.trim() });
    setPendingScreen(null);
    go(next);
  };
  return <><main className="app-screen account-profile-screen screen-enter" aria-hidden={!!pendingScreen} inert={!!pendingScreen}>
    <header className="simple-header" aria-hidden={editorOpen} inert={editorOpen}><button type="button" onClick={() => leave(returnTo)} aria-label={returnTo === "home" ? "返回首頁" : "返回我的資料"}>←</button><span>個人資料</span><i /></header>
    <section className="account-profile-content" aria-hidden={editorOpen} inert={editorOpen}>
      <span className="eyebrow">ACCOUNT PROFILE</span>
      <h1>帳號與個人資料</h1>
      <p>點擊頭像、名稱或信箱即可調整。</p>
      <section className="settings-identity account-profile-identity">
        <label className="avatar-upload" aria-label="上傳並調整大頭貼"><span>{draft.avatar ? <img src={draft.avatar} alt="大頭貼預覽" draggable={false} style={{ transform: avatarTransform(draft.avatarX, draft.avatarY, draft.avatarZoom) }} /> : <ProfileIcon />}</span><small>點擊更換</small><input type="file" accept="image/*" onChange={chooseAvatar} /></label>
        <label className="profile-name-field"><span>使用者名稱</span><input name="profile-name" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="輸入使用者名稱…" maxLength={20} autoComplete="name" /></label>
      </section>
      <section className="account-detail-list">
        <label className="account-detail-row"><span>電子信箱</span><input name="profile-email" type="email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} placeholder="輸入電子信箱…" autoComplete="email" inputMode="email" spellCheck={false} aria-invalid={emailInvalid} />{emailInvalid && <small role="alert">請輸入正確的信箱格式</small>}</label>
        <button type="button" className="account-detail-button" onClick={() => passwordEditorOpen ? closePasswordEditor() : setPasswordEditorOpen(true)} aria-expanded={passwordEditorOpen} aria-controls="account-password-panel"><span>登入密碼</span><b>更改密碼 {passwordEditorOpen ? "↑" : "↓"}</b></button>
        {passwordEditorOpen && <form id="account-password-panel" className="account-password-panel" onSubmit={event => { event.preventDefault(); changePassword(); }}>
          <p>輸入目前密碼，並設定至少六個字元的新密碼。</p>
          <label><span>目前密碼</span><span className="password-input-shell"><input name="current-password" type={passwordVisible.current ? "text" : "password"} value={passwordFields.current} onChange={event => setPasswordFields(current => ({ ...current, current: event.target.value }))} autoComplete="current-password" /><button type="button" className="password-visibility-toggle" onClick={() => togglePasswordVisibility("current")} aria-label={passwordVisible.current ? "隱藏目前密碼" : "顯示目前密碼"}><PasswordEyeIcon visible={passwordVisible.current} /></button></span></label>
          <label><span>新密碼</span><span className="password-input-shell"><input name="new-account-password" type={passwordVisible.next ? "text" : "password"} value={passwordFields.next} onChange={event => setPasswordFields(current => ({ ...current, next: event.target.value }))} autoComplete="new-password" /><button type="button" className="password-visibility-toggle" onClick={() => togglePasswordVisibility("next")} aria-label={passwordVisible.next ? "隱藏新密碼" : "顯示新密碼"}><PasswordEyeIcon visible={passwordVisible.next} /></button></span></label>
          <label><span>確認新密碼</span><span className="password-input-shell"><input name="confirm-account-password" type={passwordVisible.confirm ? "text" : "password"} value={passwordFields.confirm} onChange={event => setPasswordFields(current => ({ ...current, confirm: event.target.value }))} autoComplete="new-password" aria-invalid={passwordMismatch} /><button type="button" className="password-visibility-toggle" onClick={() => togglePasswordVisibility("confirm")} aria-label={passwordVisible.confirm ? "隱藏確認密碼" : "顯示確認密碼"}><PasswordEyeIcon visible={passwordVisible.confirm} /></button></span>{passwordMismatch && <small role="alert">兩次輸入的密碼不同</small>}</label>
          <button type="submit" className="primary-btn" disabled={!passwordReady}>確認更改 <span>→</span></button>
        </form>}
      </section>
      <div className="account-profile-actions"><button type="button" className="primary-btn" disabled={invalid} onClick={() => saveProfile(returnTo)}>儲存個人資料 <span>→</span></button><button type="button" className="secondary-btn" onClick={() => leave(returnTo)}>取消</button></div>
    </section>
    {avatarEditor && <div className="avatar-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAvatarEditor(null); }}>
      <section className="avatar-editor-card" role="dialog" aria-modal="true" aria-labelledby="avatar-editor-title" onKeyDown={trapDialogFocus}>
        <header><div><span className="eyebrow">PROFILE PHOTO</span><h2 id="avatar-editor-title">調整頭像</h2></div><button ref={avatarEditorCloseRef} type="button" onClick={() => setAvatarEditor(null)} aria-label="關閉頭像調整">×</button></header>
        <p id="avatar-editor-help">拖曳圖片或使用方向鍵調整位置，使用滑桿控制縮放。</p>
        <div className="avatar-crop-stage" role="group" tabIndex={0} aria-label="調整頭像位置" aria-describedby="avatar-editor-help" onKeyDown={moveCropWithKeyboard} onPointerDown={startCropDrag} onPointerMove={moveCrop} onPointerUp={finishCropDrag} onPointerCancel={finishCropDrag}>
          <div className="avatar-crop-circle"><img src={avatarEditor.src} alt="待調整的頭像" draggable={false} style={{ transform: avatarTransform(avatarEditor.x, avatarEditor.y, avatarEditor.zoom) }} /></div>
        </div>
        <label className="avatar-zoom-control"><span>縮放</span><input type="range" min="1" max="2.2" step="0.05" value={avatarEditor.zoom} onChange={event => setAvatarEditor(current => current ? { ...current, zoom: Number(event.target.value) } : current)} aria-label="調整頭像縮放" /></label>
        <footer><button type="button" className="secondary-btn" onClick={() => setAvatarEditor(null)}>取消</button><button type="button" className="primary-btn" onClick={applyAvatar}>套用頭像 <span>→</span></button></footer>
      </section>
    </div>}
    {passwordUpdated && <div className="account-update-toast" role="status" aria-live="polite">密碼已更新</div>}
    <BottomNav screen="account" go={leave} blocked={editorOpen || !!pendingScreen} />
  </main>{pendingScreen && <div className="modal-backdrop unsaved-backdrop"><section className="permission-modal unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="account-unsaved-title"><span className="eyebrow">UNSAVED CHANGES</span><h2 id="account-unsaved-title">個人資料尚未儲存</h2><p>要先儲存這次修改，再離開個人資料嗎？</p><button type="button" className="primary-btn" disabled={invalid} onClick={() => saveProfile(pendingScreen)}>儲存後離開 <span>→</span></button><button type="button" className="secondary-btn" onClick={() => go(pendingScreen)}>不儲存，直接離開</button><button type="button" className="keep-editing-btn" onClick={() => setPendingScreen(null)}>繼續編輯</button></section></div>}</>;
}

function ProfileScreen({ profile, setProfile, editSetup, openReminders, reset, go }: { profile: Profile; setProfile: (profile: Profile) => void; editSetup: (section: SettingsSection) => void; openReminders: () => void; reset: () => void; go: (screen: Screen) => void }) {
  const targets = calculateNutritionTargets(profile);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cameraRequesting, setCameraRequesting] = useState(false);
  const [cameraPermissionMessage, setCameraPermissionMessage] = useState("");
  const cameraAllowed = profile.camera === "allowed";
  const locationAllowed = profile.location === "allowed";
  const toggleCamera = async () => {
    setCameraPermissionMessage("");
    if (cameraAllowed) {
      setProfile({ ...profile, camera: "denied" });
      return;
    }
    setCameraRequesting(true);
    try {
      const stream = await requestCameraStream();
      stream.getTracks().forEach(track => track.stop());
      setProfile({ ...profile, camera: "allowed" });
    } catch (failure) {
      setProfile({ ...profile, camera: "denied" });
      setCameraPermissionMessage(cameraFailureCopy(failure));
    } finally {
      setCameraRequesting(false);
    }
  };
  const toggleLocation = () => setProfile({ ...profile, location: locationAllowed ? "denied" : "allowed" });
  return <><main className="app-screen profile-screen screen-enter" aria-hidden={confirmReset} inert={confirmReset}><AppHeader label="ME / 02" /><div className="profile-content-scale">
    <button type="button" className="profile-hero profile-account-card" onClick={() => go("account")} aria-label="查看與編輯帳號及個人資料"><span className="avatar">{profile.avatar ? <img src={profile.avatar} alt="" style={{ transform: avatarTransform(profile.avatarX, profile.avatarY, profile.avatarZoom) }} /> : <ProfileIcon />}</span><span className="profile-account-copy"><span className="eyebrow">帳號與個人資料</span><strong>{profile.goal} の {profile.name || "使用者"}</strong></span><span className="profile-account-action">查看 <b>→</b></span></button>
    <section className="daily-advice"><span>每日建議</span><strong>{targets.calories.toLocaleString()} kcal · 蛋白質 {targets.protein}g</strong><small>依目前資料估算，並非醫療處方。</small></section>
    <section className="profile-list"><button onClick={() => editSetup("body")}><span>身體與目標</span><b>{profile.height}cm · {profile.weight}kg →</b></button><button onClick={() => editSetup("preferences")}><span>飲食偏好</span><b>{[...profile.preferences, ...profile.exclusions].join("、") || "無"} →</b></button><button onClick={() => editSetup("contexts")}><span>日常飲食環境</span><b>{profile.contexts.join("、") || "未設定"} →</b></button><button onClick={openReminders}><span>提醒設定</span><b>{reminderMealTypes.filter(mealType => profile.reminderWindows[mealType].enabled).length} 餐已開啟 →</b></button><button type="button" className="profile-location-row" role="switch" aria-checked={cameraAllowed} aria-label={`相機權限，目前${cameraAllowed ? "已允許" : "未允許"}`} disabled={cameraRequesting} onClick={() => void toggleCamera()}><span className="profile-location-copy"><span>相機權限</span><small>{cameraPermissionMessage || (cameraRequesting ? "正在要求裝置權限…" : cameraAllowed ? "拍照記錄餐點時使用" : "點擊後要求裝置權限")}</small></span><span className={`profile-location-switch ${cameraAllowed ? "is-on" : ""}`} aria-hidden="true"><i /></span></button><button type="button" className="profile-location-row" role="switch" aria-checked={locationAllowed} aria-label={`定位與隱私權，目前${locationAllowed ? "已允許" : "使用手動地點"}`} onClick={toggleLocation}><span className="profile-location-copy"><span>定位與隱私權</span><small>附近店家搜尋時使用</small></span><span className={`profile-location-switch ${locationAllowed ? "is-on" : ""}`} aria-hidden="true"><i /></span></button></section>
    <button className="reset-btn" onClick={() => setConfirmReset(true)}>重設示範資料</button><button className="profile-logout-btn" onClick={() => go("welcome")}>登出</button><p className="prototype-note">MindMeal MVP · 所有健康數值皆為互動示範</p>
  </div><BottomNav screen="profile" go={go} blocked={confirmReset} /></main>{confirmReset && <div className="modal-backdrop unsaved-backdrop"><section className="permission-modal unsaved-modal reset-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title"><span className="eyebrow">RESET DEMO DATA</span><h2 id="reset-confirm-title">重設示範資料？</h2><p>個人設定、提醒與飲食紀錄都會清除，並回到資料填寫流程。</p><button type="button" className="delete-confirm" onClick={() => { setConfirmReset(false); reset(); }}>確認重設</button><button type="button" className="secondary-btn" onClick={() => setConfirmReset(false)}>先保留目前資料</button></section></div>}</>;
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [selectedMeal, setSelectedMeal] = useState<Meal>(demoMeal);
  const [selectedMealImage, setSelectedMealImage] = useState("");
  const [selectedMealMeta, setSelectedMealMeta] = useState<MealAnalysisMeta | undefined>();
  const [albumPermission, setAlbumPermission] = useState<AlbumPermission>("unknown");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recordDays, setRecordDays] = useState(1);
  const [ready, setReady] = useState(false);
  const [undo, setUndo] = useState<{ message: string; meals: Meal[] } | null>(null);
  const [pendingMealType, setPendingMealType] = useState<ReminderMeal | null>(null);
  const [reminderNotice, setReminderNotice] = useState<ReminderMeal | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<NextMealRecommendation | null>(null);
  const [pendingAccountEmail, setPendingAccountEmail] = useState("");
  const [accountReturnScreen, setAccountReturnScreen] = useState<"home" | "profile">("profile");
  const meal = meals.length ? meals[meals.length - 1] : null;
  const reminderActive = screen !== "welcome" && screen !== "onboarding";
  useEffect(() => {
    const goHome = () => {
      setScreen("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("mindmeal-go-home", goHome);
    return () => window.removeEventListener("mindmeal-go-home", goHome);
  }, []);
  useEffect(() => {
    let active = true;
    const restore = window.setTimeout(async () => {
      let restoredProfile = emptyProfile;
      try {
        const raw = window.localStorage.getItem("mindmeal-demo");
        const avatarResetKey = "mindmeal-avatar-reset-20260819";
        if (!raw) window.localStorage.setItem(avatarResetKey, "1");
        if (window.localStorage.getItem("mindmeal-album-permission") === "allowed") setAlbumPermission("allowed");
        if (raw) {
          const data = JSON.parse(raw);
          restoredProfile = normalizeProfile(data.profile);
          if (!window.localStorage.getItem(avatarResetKey)) {
            restoredProfile = { ...restoredProfile, avatar: "", avatarX: 50, avatarY: 50, avatarZoom: 1.3 };
            window.localStorage.setItem(avatarResetKey, "1");
          }
          const initialSelectionsKey = "mindmeal-first-option-defaults-20260819";
          if (!window.localStorage.getItem(initialSelectionsKey)) {
            restoredProfile = {
              ...restoredProfile,
              goal: "減脂",
              activity: "幾乎不運動",
              exclusions: ["不吃牛"],
              preferences: ["少辣"],
              contexts: ["便利商店"],
              frequency: "幾乎不外食",
              meals: ["早餐"],
              reminder: "用餐前 20 分鐘",
            };
            window.localStorage.setItem(initialSelectionsKey, "1");
          }
          const optionalSelectionsKey = "mindmeal-optional-selections-empty-20260819";
          if (!window.localStorage.getItem(optionalSelectionsKey)) {
            restoredProfile = { ...restoredProfile, exclusions: [], preferences: [], contexts: [] };
            window.localStorage.setItem(optionalSelectionsKey, "1");
          }
          const activitySelectionKey = "mindmeal-activity-unselected-20260819";
          if (!window.localStorage.getItem(activitySelectionKey)) {
            restoredProfile = { ...restoredProfile, activity: "" };
            window.localStorage.setItem(activitySelectionKey, "1");
          }
          const stepTwoSelectionsKey = "mindmeal-step-two-unselected-20260819";
          if (!window.localStorage.getItem(stepTwoSelectionsKey)) {
            restoredProfile = { ...restoredProfile, activity: "", exclusions: [], preferences: [], contexts: [] };
            window.localStorage.setItem(stepTwoSelectionsKey, "1");
          }
          setProfile(restoredProfile);
          const restoredMeals = Array.isArray(data.meals) ? data.meals.map((item: Partial<Meal>) => normalizeMeal(item)).filter(Boolean) as Meal[] : (normalizeMeal(data.meal) ? [normalizeMeal(data.meal) as Meal] : []);
          setMeals(restoredMeals);
          setRecordDays(data.recordDays || (restoredMeals.length ? 7 : 1));
          const loginPreview = new URLSearchParams(window.location.search).get("preview") === "login";
          setScreen(loginPreview ? "welcome" : data.onboarded ? (restoredProfile.name.trim() ? "home" : "onboarding") : "welcome");
        }
      } catch { /* use demo defaults */ }
      await preloadYellowManModel(restoredProfile.gender);
      if (active) setReady(true);
    }, 0);
    return () => { active = false; window.clearTimeout(restore); };
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem("mindmeal-demo", JSON.stringify({ profile, meals, meal, recordDays, onboarded: screen !== "welcome" && screen !== "onboarding" }));
  }, [profile, meals, meal, recordDays, screen, ready]);
  useEffect(() => {
    if (ready && albumPermission === "allowed") window.localStorage.setItem("mindmeal-album-permission", "allowed");
  }, [albumPermission, ready]);
  useEffect(() => {
    if (!ready || !reminderActive) return;
    const now = new Date();
    const timers: number[] = [];
    for (const mealType of reminderMealTypes) {
      const reminder = profile.reminderWindows[mealType];
      if (!reminder.enabled || meals.some(item => item.mealType === mealType && sameLocalDate(validMealDate(item.eatenAt) || now, now))) continue;
      const notifiedKey = "mindmeal-reminder-" + localDateKey(now) + "-" + mealType;
      if (window.localStorage.getItem(notifiedKey)) continue;
      const startMinute = timeToMinutes(reminder.start);
      const endMinute = timeToMinutes(reminder.end);
      if (endMinute <= startMinute) continue;
      const start = new Date(now);
      start.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
      const end = new Date(now);
      end.setHours(Math.floor(endMinute / 60), endMinute % 60, 0, 0);
      if (now >= end) continue;
      const targetMinute = deterministicMinute(now, mealType, reminder);
      const target = new Date(now);
      target.setHours(Math.floor(targetMinute / 60), targetMinute % 60, 0, 0);
      if (target <= now) target.setTime(Math.min(end.getTime() - 1000, now.getTime() + 60000));
      const timer = window.setTimeout(() => {
        const checkTime = new Date();
        const alreadyRecorded = meals.some(item => item.mealType === mealType && sameLocalDate(validMealDate(item.eatenAt) || checkTime, checkTime));
        if (alreadyRecorded) return;
        window.localStorage.setItem(notifiedKey, "1");
        setReminderNotice(mealType);
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
          const notification = new Notification("MindMeal " + mealType + "提醒", { body: "今天的" + mealType + "還沒記錄，點一下即可補登。" });
          notification.onclick = () => {
            window.focus();
            setPendingMealType(mealType);
            setReminderNotice(null);
            setScreen("scan");
            window.scrollTo({ top: 0, behavior: "smooth" });
            notification.close();
          };
        }
      }, Math.max(0, target.getTime() - now.getTime()));
      timers.push(timer);
    }
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [ready, reminderActive, profile.reminderWindows, meals]);
  const go = (next: Screen) => {
    if (next === "account") setAccountReturnScreen(screen === "home" ? "home" : "profile");
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const beginReminderEntry = (mealType: ReminderMeal) => {
    setPendingMealType(mealType);
    setReminderNotice(null);
    go("scan");
  };
  const analyzePhoto = async (imageUrl: string, isActive: () => boolean) => {
    const analysis = await analyzeMealPhoto(imageUrl);
    if (!isActive()) return;
    const timestamp = new Date();
    setSelectedMeal({ ...analysis.meal, mealType: pendingMealType || suggestedMealType(timestamp), eatenAt: timestamp.toISOString(), recordedAt: timestamp.toISOString() });
    setPendingMealType(null);
    setSelectedMealImage(analysis.imageUrl);
    setSelectedMealMeta(analysis.meta);
    go("analysis");
  };
  const chooseExistingMeal = (next: Meal, meta?: MealAnalysisMeta) => {
    const timestamp = new Date();
    const normalized = normalizeMeal({ ...next, mealType: pendingMealType || suggestedMealType(timestamp), eatenAt: timestamp.toISOString(), recordedAt: timestamp.toISOString() });
    if (!normalized) return;
    setSelectedMeal(normalized);
    setPendingMealType(null);
    setSelectedMealImage("");
    setSelectedMealMeta(meta);
    go("analysis");
  };
  const openSettings = (section: SettingsSection) => {
    setScreen("settings");
    window.setTimeout(() => document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
  };
const saveMeal = (next: Meal) => {
    const timestamp = new Date();
    const saved = normalizeMeal({ ...next, id: Date.now(), eatenAt: next.eatenAt || timestamp.toISOString(), recordedAt: next.recordedAt || timestamp.toISOString(), mealType: next.mealType || suggestedMealType(timestamp) });
    if (!saved) return;
    setSelectedMeal(saved);
    setPendingMealType(null);
    setMeals(current => [...current, saved]);
    setRecordDays(current => Math.max(2, current));
    go("result");
  };
  const updateMeal = (next: Meal) => {
    const previous = meals;
    setMeals(current => current.map(item => item.id === next.id ? next : item));
    setUndo({ message: "餐點已更新", meals: previous });
    window.setTimeout(() => setUndo(null), 5000);
  };
  const removeMeal = () => {
    const previous = meals;
    setMeals(current => current.filter(item => item.id !== selectedMeal.id));
    setUndo({ message: "餐點已刪除", meals: previous });
    go("home");
    window.setTimeout(() => setUndo(null), 5000);
  };
  const reset = () => {
    window.localStorage.removeItem("mindmeal-demo");
    window.localStorage.removeItem("mindmeal-album-permission");
    setProfile(emptyProfile);
    setMeals([]);
    setRecordDays(1);
    setAlbumPermission("unknown");
    setPendingAccountEmail("");
    go("onboarding");
  };
  if (!ready) return <main className="loading-screen"><Brand /><span>LOADING DIRECTION</span></main>;
  let content;
  if (screen === "welcome") content = <Welcome login={email => {
    const setupComplete = window.localStorage.getItem(accountSetupKey(email)) === "complete";
    setProfile(current => ({ ...current, email: email.trim() }));
    if (setupComplete && profile.name.trim()) go("home");
    else { setPendingAccountEmail(email); go("onboarding"); }
  }} start={email => { setProfile(current => ({ ...current, email: email.trim() })); setPendingAccountEmail(email); go("onboarding"); }} guest={() => { setProfile(current => ({ ...current, email: "" })); setPendingAccountEmail(""); go("onboarding"); }} />;
  else if (screen === "onboarding") content = <Onboarding profile={profile} setProfile={setProfile} finish={async () => { if (reminderMealTypes.some(mealType => profile.reminderWindows[mealType].enabled)) await requestReminderPermission(); if (pendingAccountEmail) window.localStorage.setItem(accountSetupKey(pendingAccountEmail), "complete"); setPendingAccountEmail(""); go("home"); }} back={() => go("welcome")} />;
  else if (screen === "history") content = <HistoryScreen meals={meals} go={go} editMeal={item => { setSelectedMeal(item); go("edit-meal"); }} />;
  else if (screen === "scan") content = <Scan go={go} analyze={analyzePhoto} albumPermission={albumPermission} allowAlbum={() => setAlbumPermission("allowed")} cameraPermission={profile.camera} setCameraPermission={camera => setProfile(current => ({ ...current, camera }))} />;
  else if (screen === "album") content = <AlbumGallery choose={chooseExistingMeal} go={go} />;
  else if (screen === "food-search") content = <FoodSearch choose={chooseExistingMeal} go={go} />;
  else if (screen === "manual-entry") content = <ManualEntry choose={chooseExistingMeal} go={go} />;
  else if (screen === "analysis") content = <Analysis initialMeal={selectedMeal} imageUrl={selectedMealImage} meta={selectedMealMeta} go={go} save={saveMeal} />;
  else if (screen === "result" && meal) content = <Result meal={meal} meals={meals} profile={profile} go={go} />;
  else if (screen === "nearby") content = <NearbyRecommendations meals={meals} profile={profile} setProfile={setProfile} go={go} selectRecommendation={recommendation => { setSelectedRecommendation(recommendation); go("store"); }} />;
  else if (screen === "store" && selectedRecommendation) content = <StoreDetail recommendation={selectedRecommendation} go={go} />;
  else if (screen === "profile") content = <ProfileScreen profile={profile} setProfile={setProfile} editSetup={openSettings} openReminders={() => go("reminders")} reset={reset} go={go} />;
  else if (screen === "account") content = <AccountProfileScreen profile={profile} save={setProfile} go={go} returnTo={accountReturnScreen} />;
  else if (screen === "settings") content = <ProfileSettings profile={profile} save={setProfile} go={go} />;
  else if (screen === "reminders") content = <ReminderSettingsScreen profile={profile} save={setProfile} go={go} />;
  else if (screen === "edit-meal") content = <EditMeal meal={selectedMeal} update={updateMeal} remove={removeMeal} go={go} />;
  else content = <Dashboard meals={meals} recordDays={recordDays} profile={profile} go={go} editMeal={item => { setSelectedMeal(item); go("edit-meal"); }} />;
  return <>{content}{reminderNotice && <aside className="reminder-toast" role="status" aria-live="polite"><div><strong>{reminderNotice}還沒記錄</strong><span>現在補登，也能調整實際用餐時間。</span></div><button type="button" onClick={() => beginReminderEntry(reminderNotice)}>前往紀錄</button><button type="button" className="reminder-toast-close" onClick={() => setReminderNotice(null)} aria-label="稍後再說">×</button></aside>}{undo && <div className="undo-toast" role="status"><span>{undo.message}</span><button onClick={() => { setMeals(undo.meals); setUndo(null); }}>復原</button></div>}</>;
}
