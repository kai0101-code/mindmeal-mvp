"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import YellowManModel, { preloadYellowManModel } from "./YellowManModel";

type Screen = "welcome" | "onboarding" | "home" | "scan" | "album" | "food-search" | "manual-entry" | "analysis" | "result" | "nearby" | "store" | "profile" | "settings" | "edit-meal";
type AlbumPermission = "unknown" | "allowed";
type SettingsSection = "body" | "preferences" | "contexts";
type LocationPermission = "unknown" | "allowed" | "denied";
type Profile = {
  name: string;
  avatar: string;
  avatarX: number;
  avatarY: number;
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
  location: LocationPermission;
};
type Meal = {
  id: number;
  name: string;
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
};
type MealPhotoAnalysis = { meal: Meal; meta: MealAnalysisMeta; imageUrl: string };

const emptyProfile: Profile = {
  name: "",
  avatar: "",
  avatarX: 50,
  avatarY: 50,
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

function normalizeProfile(value?: Partial<Profile> & { location?: LocationPermission | boolean }): Profile {
  const location = value?.location === true ? "allowed" : value?.location === false ? "unknown" : value?.location || "unknown";
  const name = value?.name && value.name !== "7000" ? value.name : "";
  return { ...emptyProfile, ...value, name, location };
}

function normalizeMeal(value?: Partial<Meal> | null): Meal | null {
  if (!value) return null;
  return { ...demoMeal, ...value, id: value.id || 1 };
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
    if (!file.type.startsWith("image/")) { reject(new Error("請選擇 JPG、PNG、WebP 或 HEIC 餐點照片。")); return; }
    if (file.size > 12 * 1024 * 1024) { reject(new Error("照片超過 12MB，請改用較小的圖片。")); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSize = 1600;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(url); reject(new Error("這台裝置無法處理照片。")); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", .84));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("無法讀取這張照片，請換一張再試。")); };
    image.src = url;
  });
}

async function analyzeMealPhoto(imageUrl: string): Promise<MealPhotoAnalysis> {
  const configuredUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MINDMEAL_ANALYSIS_API_URL;
  const response = await fetch(configuredUrl || "/api/analyze-meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
      model: payload.meta?.model || "Gemini Flash",
    },
  };
}

function avatarTransform(x: number, y: number) {
  return `translate(${(50 - x) * .35}%, ${(50 - y) * .35}%) scale(1.3)`;
}

function Brand({ onHome }: { onHome?: () => void }) {
  const artwork = <><span className="brand-line" /><span className="brand-zh">有 意 食</span><span className="brand-en">Mind Meal<span className="brand-dot" aria-hidden="true" /></span></>;
  return <button type="button" className="brand brand-home-link" onClick={onHome || (() => window.dispatchEvent(new Event("mindmeal-go-home")))} aria-label="返回首頁">{artwork}</button>;
}

function ProfileIcon() {
  return <svg className="profile-placeholder-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.6-4.7 3-7 7.5-7s6.9 2.3 7.5 7" /></svg>;
}

function Wave() {
  return <div className="wave" aria-hidden="true" />;
}

function AppHeader({ label }: { label?: string }) {
  return <header className="app-header" aria-label={label ? "MindMeal" : undefined}><Brand /></header>;
}

function BottomNav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const active = screen === "nearby" || screen === "store" ? "nearby" : screen === "profile" || screen === "settings" ? "profile" : screen === "scan" || screen === "album" || screen === "food-search" || screen === "manual-entry" || screen === "analysis" ? "scan" : "home";
  const items: { key: "home" | "scan" | "nearby" | "profile"; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "首頁" },
    { key: "scan", icon: "+", label: "紀錄飲食" },
    { key: "nearby", icon: "⌖", label: "下一餐地圖" },
    { key: "profile", icon: "○", label: "我的資料" },
  ];
  return <nav className="bottom-nav icon-only-nav" aria-label="主要導覽">{items.map(item => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""} ${item.key === "scan" ? "scan-nav" : ""}`} onClick={() => go(item.key)} aria-label={item.label} aria-current={active === item.key ? "page" : undefined}><span className="nav-icon">{item.key === "profile" ? <ProfileIcon /> : item.icon}</span></button>)}</nav>;
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

function Welcome({ start, demo }: { start: () => void; demo: () => void }) {
  return <main className="welcome-screen screen-enter"><div className="welcome-top"><Brand /></div><section className="welcome-copy"><span className="eyebrow">EAT WITH INTENTION.</span><h1>今天吃什麼？</h1><p>不用計算每一口<br />拍下餐點<br />讓有意食告訴你下一餐的方向</p></section><div className="welcome-orbit" aria-hidden="true"><span /><i /></div><div className="welcome-actions"><button className="primary-btn" onClick={start}>三步完成設定 <span>→</span></button><button className="text-btn" onClick={demo}>直接查看示範首頁</button></div><Wave /></main>;
}

function ToggleChip({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`chip ${selected ? "selected" : ""}`} onClick={onClick}>{value}<span>{selected ? "✓" : "＋"}</span></button>;
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
    try { setProfile({ ...profile, avatar: await avatarDataUrl(file), avatarX: 50, avatarY: 50 }); } catch { /* keep the current avatar */ }
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
    if (avatarImage.current) avatarImage.current.style.transform = avatarTransform(avatarX, avatarY);
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
      <p className="why-copy">硬性限制會直接排除；口味、預算與外食情境只影響推薦排序，不會限制你的選擇。</p>
      <div className="field-block"><span className="field-title">運動量</span><div className="chip-row wrap">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(value => <ToggleChip key={value} value={value} selected={profile.activity === value} onClick={() => update("activity", profile.activity === value ? "" : value)} />)}</div></div>
      <div className="field-block"><span className="field-title">過敏／宗教／醫療限制</span><div className="chip-row wrap">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(value => <ToggleChip key={value} value={value} selected={profile.exclusions.includes(value)} onClick={() => toggle("exclusions", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">口味與排序偏好</span><div className="chip-row wrap">{["少辣", "低糖", "預算 150 內"].map(value => <ToggleChip key={value} value={value} selected={profile.preferences.includes(value)} onClick={() => toggle("preferences", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">日常外食情境</span><div className="chip-row wrap">{["便利商店", "便當", "餐廳", "自煮"].map(value => <ToggleChip key={value} value={value} selected={profile.contexts.includes(value)} onClick={() => toggle("contexts", value)} />)}</div></div>
      <label className="select-field">外食頻率<select value={profile.frequency} onChange={event => update("frequency", event.target.value)}><option>幾乎不外食</option><option>每週外食 1–3 次</option><option>每週外食 4–6 次</option><option>幾乎每天外食</option></select></label>
    </div>,
    <div className="step-body" key="reminder">
      <p className="why-copy">提醒會配合你想記錄的餐次；該餐已記錄時會自動取消。</p>
      <div className="field-block"><span className="field-title">想記錄的餐次</span><div className="chip-row wrap">{["早餐", "午餐", "晚餐", "點心"].map(value => <ToggleChip key={value} value={value} selected={profile.meals.includes(value)} onClick={() => toggle("meals", value)} />)}</div></div>
      <label className="select-field">提醒時間<select value={profile.reminder} onChange={event => update("reminder", event.target.value)}><option>用餐前 20 分鐘</option><option>用餐時間</option><option>用餐後 30 分鐘</option><option>不要提醒</option></select></label>
    </div>,
  ];
  const titles = ["我的身體", "理想生活表", "提醒超人"];
  const invalid = step === 0
    ? (!profile.name.trim() || !profile.age || !profile.height || !profile.weight)
    : step === 1
      ? (!profile.activity || profile.contexts.length === 0)
      : false;
  return <main className="onboarding-screen screen-enter"><header className="onboarding-header"><button onClick={step === 0 ? back : () => setStep(step - 1)} aria-label="上一步">←</button><span>步驟 {step + 1} / 3</span><Brand /></header><div className="step-track"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><section className={`onboarding-content ${step === 0 ? "body-onboarding-content" : step === 1 ? "preferences-onboarding-content" : "reminder-onboarding-content"}`}>{step === 0 && <label className={`setup-avatar-placeholder ${profile.avatar ? "is-draggable" : ""}`} aria-label="選擇或拖曳調整大頭貼" onPointerDown={startAvatarDrag} onPointerMove={moveAvatar} onPointerUp={finishAvatarDrag} onPointerCancel={finishAvatarDrag} onClick={event => { if (avatarDrag.current.moved) { event.preventDefault(); avatarDrag.current.moved = false; } }}><span className="setup-avatar-clip">{profile.avatar ? <img ref={avatarImage} src={profile.avatar} alt="大頭貼預覽" draggable={false} style={{ transform: avatarTransform(profile.avatarX, profile.avatarY) }} /> : <ProfileIcon />}</span><input type="file" accept="image/*" onChange={chooseAvatar} /></label>}<span className="eyebrow">SETUP / 0{step + 1}</span><h1>{titles[step]}</h1>{steps[step]}</section><div className="sticky-action"><button disabled={invalid} className="primary-btn" onClick={step === 2 ? finish : () => setStep(step + 1)}>{step === 2 ? "開啟美好生活，Let's go" : "下一步"}<span>→</span></button></div></main>;
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
  const meal = meals.length ? meals[meals.length - 1] : null;
  const totals = meals.reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
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
      <button className="home-avatar" onClick={() => go("profile")} aria-label="開啟個人資料"><span className="home-avatar-clip">{profile.avatar ? <img src={profile.avatar} alt="" style={{ transform: avatarTransform(profile.avatarX, profile.avatarY) }} /> : <ProfileIcon />}</span></button>
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
    <section className="collapsible-card"><button className="card-toggle" onClick={() => setMealsOpen(!mealsOpen)} aria-expanded={mealsOpen}><span><small>今日紀錄餐點</small><strong>{meals.length ? `${meals.length} 餐` : "還沒有紀錄"}</strong></span><i>{mealsOpen ? "−" : "＋"}</i></button>{mealsOpen && <div className="card-detail">{meals.length ? <div className="meal-list">{[...meals].reverse().map(item => <button className="meal-row" key={item.id} onClick={() => editMeal(item)}><span><b>{item.name}</b><small>{item.calories} kcal · 估算</small></span><i>編輯 →</i></button>)}</div> : <button className="empty-meal" onClick={() => go("scan")}>拍下第一餐，AI 幫你開始分析 <span>＋</span></button>}</div>}</section>
    </div>
    <BottomNav screen="home" go={go} />
  </main>;
}

function Scan({ go, analyze, albumPermission, allowAlbum }: { go: (screen: Screen) => void; analyze: (imageUrl: string) => Promise<void>; albumPermission: AlbumPermission; allowAlbum: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [showAlbumPermission, setShowAlbumPermission] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const cameraInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);
  const begin = () => cameraInput.current?.click();
  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanning(true);
    setError("");
    try {
      const imageUrl = await mealPhotoDataUrl(file);
      setPreview(imageUrl);
      await analyze(imageUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "照片分析失敗，請重新拍攝。");
      setScanning(false);
    }
  };
  const openAlbum = () => albumPermission === "allowed" ? albumInput.current?.click() : setShowAlbumPermission(true);
  const approveAlbum = () => { allowAlbum(); setShowAlbumPermission(false); window.setTimeout(() => albumInput.current?.click(), 0); };
  return <main className="app-screen dark-screen scan-screen screen-enter"><header className="dark-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><Brand /><span>GEMINI AI</span></header><div className="unified-app-content scan-content-scale"><section className="scan-copy"><span className="eyebrow">AI MEAL SCAN</span><h1>{scanning ? "正在分析這一餐" : "拍下完整餐點"}</h1><p>{scanning ? "Gemini 正在辨識食材、份量與營養素，通常約需數秒。" : "光線充足、餐點完整入鏡，估算會更可靠。"}</p></section><button type="button" className={`camera-frame ${scanning ? "scanning" : ""}`} onClick={begin} disabled={scanning} aria-label="開啟手機相機拍攝餐點">{preview && <img src={preview} alt="待分析餐點預覽" />}<span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" /><i className="scan-line" /><b>{scanning ? "ANALYZING..." : "開啟相機"}</b></button><input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handlePhoto} /><input ref={albumInput} className="visually-hidden" type="file" accept="image/*" onChange={handlePhoto} /><button className={`shutter-btn ${scanning ? "scanning" : ""}`} onClick={begin} disabled={scanning} aria-label="開啟手機相機拍照並分析餐點"><span /></button>{error && <div className="scan-error" role="alert"><strong>這次沒有分析成功</strong><p>{error}</p><button onClick={begin}>重新拍攝</button></div>}<div className="capture-options"><button onClick={openAlbum} disabled={scanning}>從相簿選擇</button><button onClick={() => go("food-search")} disabled={scanning}>搜尋食物</button><button onClick={() => go("manual-entry")} disabled={scanning}>手動輸入</button></div><p className="scan-privacy">照片會傳送至 Gemini 進行本次營養估算；不會儲存在 MindMeal 伺服器。</p></div>{showAlbumPermission && <div className="modal-backdrop album-permission-backdrop"><section className="permission-modal album-permission-modal" role="dialog" aria-modal="true" aria-labelledby="album-permission-title"><span className="permission-icon">▦</span><span className="eyebrow">PHOTO ACCESS</span><h2 id="album-permission-title">選擇一張餐點照片？</h2><p>MindMeal 只會讀取你主動選擇的照片，並將壓縮版本傳送至 Gemini 完成本次營養分析。</p><button className="primary-btn" onClick={approveAlbum}>選擇照片並分析 <span>→</span></button><button className="secondary-btn" onClick={() => setShowAlbumPermission(false)}>暫不選擇</button></section></div>}<BottomNav screen="scan" go={go} /></main>;
}

function AlbumGallery({ choose, go }: { choose: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const symbols = ["🍔", "🍜", "🍱", "🥗", "🥚", "🥛"];
  return <main className="app-screen album-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回相機">←</button><span>相簿</span><i>最近項目</i></header><div className="unified-app-content album-content-scale"><section className="album-intro"><span className="eyebrow">PHOTO LIBRARY</span><h1>選擇餐點照片</h1><p>選一張照片後，會帶入對應的示範餐點進行營養分析。</p></section><section className="album-grid" aria-label="相簿預覽">{foodLibrary.map((food, index) => <button key={food.id} onClick={() => choose(food)} aria-label={`選擇 ${food.name}`}><span className={`album-thumb album-thumb-${index + 1}`}><b aria-hidden="true">{symbols[index]}</b></span><strong>{food.name}</strong><small>{food.calories} kcal</small></button>)}</section></div><BottomNav screen="album" go={go} /></main>;
}

function FoodSearch({ choose, go }: { choose: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const results = foodLibrary.filter(food => !normalized || food.name.toLowerCase().includes(normalized) || food.ingredients.some(item => item.toLowerCase().includes(normalized)));
  return <main className="app-screen food-search-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回紀錄飲食">←</button><span>搜尋食物</span><i /></header><div className="unified-app-content food-search-content-scale"><section className="food-search-intro"><span className="eyebrow">FOOD DATABASE</span><h1>今天吃了什麼？</h1><p>搜尋餐點名稱或食材，營養數值皆為單份示範估算。</p></section><label className="food-search-field"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋：牛肉麵、漢堡、雞蛋…" aria-label="搜尋食物" />{query && <button onClick={() => setQuery("")} aria-label="清除搜尋">×</button>}</label><div className="food-results-heading"><span>{normalized ? "搜尋結果" : "常見食物"}</span><small>{results.length} 項</small></div><section className="food-result-list">{results.map(food => <button key={food.id} onClick={() => choose(food)}><span className="food-result-icon">{food.name.slice(0, 1)}</span><span className="food-result-copy"><strong>{food.name}</strong><small>{food.calories} kcal · 蛋白質 {food.protein}g · 碳水 {food.carbs}g · 脂肪 {food.fat}g</small></span><i>→</i></button>)}{results.length === 0 && <div className="food-empty"><strong>找不到「{query}」</strong><p>可以換個名稱或改用主要食材搜尋。</p><button onClick={() => setQuery("")}>查看全部食物</button></div>}</section></div><BottomNav screen="food-search" go={go} /></main>;
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
    };
  }, [initialMeal, rice, sauce, completion, ingredients, customCalories]);
  const confidenceLabel = meta?.confidence === "high" ? "辨識信心高" : meta?.confidence === "low" ? "辨識信心較低，建議確認" : "辨識信心中等，建議快速確認";
  return <main className="app-screen analysis-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回掃描">←</button><span>AI 分析結果</span><i>{meta ? meta.model : "資料庫估算"}</i></header><section className={`food-visual ${imageUrl ? "has-meal-photo" : ""}`}>{imageUrl ? <img src={imageUrl} alt="本次分析的餐點照片" /> : <div className="plate"><span className="food rice" /><span className="food chicken" /><span className="food greens g1" /><span className="food greens g2" /></div>}<span className="detected">{confidenceLabel}</span></section><section className="analysis-content"><span className="eyebrow">MULTIMODAL NUTRITION ESTIMATE</span><h1>{meal.name}</h1><p className="estimate-note">{meta?.summary || "以下為餐點資料庫估算值。照片無法確認隱藏食材、實際重量與用油量，儲存前請快速檢查。"}</p><div className="macro-summary" aria-live="polite"><span><b>{meal.calories}</b> kcal</span><span><b>{meal.protein}g</b> 蛋白質</span><span><b>{meal.carbs}g</b> 碳水</span><span><b>{meal.fat}g</b> 脂肪</span></div><div className="detected-foods">{meal.ingredients.map(item => <span key={item}>{item}</span>)}</div>{meta?.assumptions.length ? <div className="analysis-assumptions"><strong>估算依據</strong><ul>{meta.assumptions.map(item => <li key={item}>{item}</li>)}</ul></div> : null}<button className="primary-btn" onClick={() => save(meal)}>儲存並更新今日營養 <span>→</span></button><section className="analysis-adjustment-card"><button className="advanced-toggle" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>{advanced ? "收起調整項目" : "調整分析結果（份量、醬料、食材）"}<span>{advanced ? "−" : "＋"}</span></button><p className="analysis-adjustment-hint">辨識不完全正確？可修改份量、醬料、食材與<br />熱量，數值會立即重算。</p>{advanced && <div className="advanced-panel"><Option title="白飯份量" hint="1 碗約 200g" values={["半碗", "一碗", "加飯"]} value={rice} setValue={setRice} /><Option title="醬料份量" hint="約影響 ±25–55 kcal" values={["少", "正常", "多"]} value={sauce} setValue={setSauce} /><Option title="實際食用量" hint="剩一些以約 80% 估算" values={["吃完", "剩一些"]} value={completion} setValue={setCompletion} /><label>辨識食材（以頓號分隔）<input value={ingredients} onChange={event => setIngredients(event.target.value)} /></label><label>自行輸入熱量（kcal）<input inputMode="numeric" placeholder={String(meal.calories)} value={customCalories} onChange={event => setCustomCalories(event.target.value)} /></label></div>}</section><p className="medical-disclaimer">AI 營養數值為照片估算，不適用於醫療診斷、過敏原確認或精確飲食處方。</p></section></main>;
}

function Result({ meal, profile, go }: { meal: Meal; profile: Profile; go: (screen: Screen) => void }) {
  const targets = calculateNutritionTargets(profile);
  return <main className="success-screen result-screen screen-enter"><Brand /><div className="success-mark">✓</div><span className="eyebrow">MEAL SAVED</span><h1>這餐，完成。</h1><p>已加入 <b>{meal.calories} kcal</b>（估算）。今天油脂已經較充足，下一餐用清爽蛋白質與蔬菜接住就好。</p><section className="updated-progress"><span>蛋白質進度更新</span><strong>{meal.protein} / {targets.protein}g</strong><div className="progress-track"><i className="accent animate-progress" style={{ width: `${meal.protein / targets.protein * 100}%` }} /></div></section><section className="result-next"><span className="eyebrow">更新後的下一餐</span><h2>清爽蛋白質＋兩份蔬菜</h2><p>魚、豆腐或雞肉都可以；主食保留半碗到一碗。</p><button onClick={() => go("nearby")}>查看附近選擇 →</button></section><div className="success-actions"><button className="primary-btn" onClick={() => go("home")}>回到首頁 <span>→</span></button><button className="secondary-btn" onClick={() => go("nearby")}>找附近吃什麼</button></div><Wave /></main>;
}

const stores = [
  { name: "好日子健康餐盒", distance: "350m", meal: "香草雞胸＋雙份青菜", price: "$145", hours: "營業中", reason: "高蛋白、蔬菜份量充足", score: "96" },
  { name: "SUBWAY", distance: "480m", meal: "嫩切雞肉沙拉＋蛋", price: "$159", hours: "營業中", reason: "可調整醬料與蔬菜", score: "92" },
  { name: "7-ELEVEN", distance: "120m", meal: "舒肥雞胸＋無糖豆漿", price: "$109", hours: "24 小時", reason: "距離近、組合容易取得", score: "88" },
];

function Nearby({ profile, setProfile, go }: { profile: Profile; setProfile: (profile: Profile) => void; go: (screen: Screen) => void }) {
  const [filter, setFilter] = useState("蛋白質");
  const [place, setPlace] = useState("台北市");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [showPermission, setShowPermission] = useState(profile.location === "unknown");
  const chooseLocation = (value: LocationPermission) => {
    if (value === "allowed" && navigator.geolocation) {
      setLocationStatus("loading");
      navigator.geolocation.getCurrentPosition(position => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setProfile({ ...profile, location: "allowed" });
        setLocationStatus("ready");
        setShowPermission(false);
      }, () => {
        setProfile({ ...profile, location: "denied" });
        setLocationStatus("error");
        setShowPermission(false);
      }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
      return;
    }
    setProfile({ ...profile, location: "denied" });
    setLocationStatus("idle");
    setShowPermission(false);
  };
  const mapQuery = coordinates ? "健康餐盒" : `${place.trim() || "台北市"} 健康餐盒`;
  const mapCenter = coordinates ? `&ll=${coordinates.latitude},${coordinates.longitude}` : "";
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}${mapCenter}&z=15&output=embed`;
  const mapSearchQuery = coordinates ? `健康餐盒 near ${coordinates.latitude},${coordinates.longitude}` : mapQuery;
  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`;
  return <main className="app-screen nearby-screen screen-enter"><AppHeader label="NEXT / MEAL" />{showPermission && <div className="modal-backdrop location-modal-backdrop"><section className="permission-modal location-permission-modal" role="dialog" aria-modal="true" aria-labelledby="location-title"><span className="permission-icon">⌖</span><span className="eyebrow">只在你需要時詢問</span><h2 id="location-title">要看看附近選擇嗎？</h2><p>定位只用來顯示附近的 Google Maps 搜尋結果，不會影響飲食記錄。</p><button className="primary-btn" disabled={locationStatus === "loading"} onClick={() => chooseLocation("allowed")}>{locationStatus === "loading" ? "正在取得位置…" : "允許這次定位"} <span>→</span></button><button className="secondary-btn" disabled={locationStatus === "loading"} onClick={() => chooseLocation("denied")}>改用手動地點</button></section></div>}<section className="nearby-hero"><span className="eyebrow">依今日最優先缺口排序</span><h1>下一餐先補<br /><b>蛋白質＋蔬菜</b></h1><p>依目前示範資料，蛋白質約還差 78g；以下餐點依營養缺口、距離與價格整理。</p></section><section className="recommendation-summary" aria-label="推薦依據"><span>營養缺口</span><span>附近餐廳</span><span>距離</span><span>價格</span></section>{profile.location === "denied" && <label className="location-field">搜尋地區<input type="search" value={place} onChange={event => setPlace(event.target.value)} placeholder="例如：台北車站、信義區" /><small>{locationStatus === "error" ? "無法取得定位，已改用手動搜尋。" : "輸入地區後，地圖會自動更新。"}</small></label>}<div className="filter-row" aria-label="推薦條件">{["蛋白質", "1 公里內", "少辣", "全部店家"].map(item => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><section><div className="section-heading"><span>推薦餐點組合</span><small>MVP 示範 · {filter}優先</small></div><div className="meal-combos">{stores.slice(0, 2).map((store, index) => <button key={store.name} onClick={() => go("store")}><span className="combo-rank">0{index + 1}</span><strong>{store.meal}</strong><small>{store.name} · {store.distance}</small><b>{store.price}</b></button>)}</div></section><section className="real-map-card" aria-label="Google Maps 附近健康餐搜尋"><iframe title="Google Maps 附近健康餐搜尋結果" src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /><div className="real-map-status"><span>{coordinates ? "依目前位置搜尋" : `搜尋地區：${place || "台北市"}`}</span><a href={mapSearchUrl} target="_blank" rel="noreferrer">在 Google Maps 查看完整結果 ↗</a></div></section><p className="real-map-note">地圖與店家搜尋結果由 Google Maps 即時提供；下方餐點卡仍為 MVP 示範資料。</p><section><div className="section-heading"><span>餐點推薦示範</span><small>非即時店家資料</small></div>{stores.map(store => <button className="store-row" key={store.name} onClick={() => go("store")}><span><b>{store.name}</b><small>{store.meal}<br />{store.distance} · {store.price} · {store.hours}<br />推薦原因：{store.reason}</small></span><strong><small>適合度</small>{store.score}</strong></button>)}</section><aside className="fallback-note">沒有完全符合？<button onClick={() => setFilter("1 公里內")}>放寬距離</button><button onClick={() => setFilter("全部店家")}>看便利商店組合</button></aside><BottomNav screen="nearby" go={go} /></main>;
}

function StoreDetail({ go }: { go: (screen: Screen) => void }) {
  const searchGoogleMaps = () => window.open("https://www.google.com/maps/search/?api=1&query=健康餐盒", "_blank", "noopener,noreferrer");
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("nearby")} aria-label="返回地圖">←</button><span>店家資訊</span><i>350m</i></header><section className="store-hero"><span className="eyebrow">MATCH 96</span><h1>好日子健康餐盒</h1><p>步行約 5 分鐘 · 示範店家</p></section><section className="recommended-dish"><span className="eyebrow">今日推薦</span><h2>香草雞胸＋雙份青菜</h2><p>蛋白質約 38g，醬汁另外放，主食半份。</p><strong>$145</strong></section><div className="maps-expectation"><strong>接下來會發生什麼？</strong><p>將在新分頁開啟 Google Maps，搜尋「健康餐盒」。目前是關鍵字搜尋，不是特定店家的直接導航。</p></div><button className="primary-btn" onClick={searchGoogleMaps}>在 Google Maps 搜尋健康餐盒 <span>↗</span></button><p className="prototype-note">選擇餐點不會自動記為已攝取；吃完後請用「＋」記錄。</p><BottomNav screen="store" go={go} /></main>;
}

function EditMeal({ meal, update, remove, go }: { meal: Meal; update: (meal: Meal) => void; remove: () => void; go: (screen: Screen) => void }) {
  const [draft, setDraft] = useState(meal);
  const [confirming, setConfirming] = useState(false);
  const save = () => {
    const riceRatio = draft.rice === "半碗" ? .78 : draft.rice === "加飯" ? 1.18 : 1;
    const sauceDelta = draft.sauce === "多" ? 55 : draft.sauce === "少" ? -25 : 0;
    const completionRatio = draft.completion === "剩一些" ? .8 : 1;
    update({ ...draft, calories: Math.round((620 * riceRatio + sauceDelta) * completionRatio), protein: Math.round(42 * completionRatio), carbs: Math.round(72 * riceRatio * completionRatio), fat: Math.round((18 + sauceDelta * .08) * completionRatio) });
    go("home");
  };
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><span>編輯餐點</span><i>估算</i></header><section className="edit-card"><span className="eyebrow">TODAY&apos;S MEAL</span><h1>{draft.name}</h1><label>份量<select value={draft.rice} onChange={event => setDraft({ ...draft, rice: event.target.value })}><option>半碗</option><option>一碗</option><option>加飯</option></select></label><label>醬料<select value={draft.sauce} onChange={event => setDraft({ ...draft, sauce: event.target.value })}><option>少</option><option>正常</option><option>多</option></select></label><label>完食度<select value={draft.completion} onChange={event => setDraft({ ...draft, completion: event.target.value })}><option>吃完</option><option>剩一些</option></select></label><label>食材<input value={draft.ingredients.join("、")} onChange={event => setDraft({ ...draft, ingredients: event.target.value.split("、").map(item => item.trim()).filter(Boolean) })} /></label><button className="primary-btn" onClick={save}>儲存修改 <span>→</span></button><button className="delete-btn" onClick={() => setConfirming(true)}>刪除這筆紀錄</button></section>{confirming && <div className="modal-backdrop"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">確定刪除這餐？</h2><p>刪除後，首頁進度與下一餐建議會一起更新。</p><button className="delete-confirm" onClick={remove}>確認刪除</button><button className="secondary-btn" onClick={() => setConfirming(false)}>先保留</button></section></div>}</main>;
}

function ProfileSettings({ profile, save, go }: { profile: Profile; save: (profile: Profile) => void; go: (screen: Screen) => void }) {
  const [draft, setDraft] = useState(() => profile.name === "7000" ? { ...profile, name: "" } : profile);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const avatarDrag = useRef({ pointerId: null as number | null, pointerX: 0, pointerY: 0, avatarX: 50, avatarY: 50, moved: false });
  const avatarImage = useRef<HTMLImageElement>(null);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setDraft(current => ({ ...current, [key]: value }));
  const toggle = (key: "preferences" | "exclusions" | "contexts", value: string) => update(key, draft[key].includes(value) ? draft[key].filter(item => item !== value) : [...draft[key], value]);
  const invalid = !draft.name.trim() || !draft.age.trim() || !draft.height.trim() || !draft.weight.trim();
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const previewTargets = calculateNutritionTargets(draft);
  const leave = (next: Screen) => dirty ? setPendingScreen(next) : go(next);
  const saveAndGo = (next: Screen) => { save(draft); go(next); };
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const avatar = await avatarDataUrl(file);
      setDraft(current => ({ ...current, avatar, avatarX: 50, avatarY: 50 }));
    } catch { /* keep the current avatar */ }
    event.target.value = "";
  };
  const startAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!draft.avatar) return;
    avatarDrag.current = { pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, avatarX: draft.avatarX, avatarY: draft.avatarY, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer id tracking keeps drag active */ }
    event.preventDefault();
  };
  const moveAvatar = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!draft.avatar || avatarDrag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - avatarDrag.current.pointerX;
    const dy = event.clientY - avatarDrag.current.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) avatarDrag.current.moved = true;
    const clamp = (value: number) => Math.max(17, Math.min(83, value));
    const avatarX = clamp(avatarDrag.current.avatarX - dx);
    const avatarY = clamp(avatarDrag.current.avatarY - dy);
    if (avatarImage.current) avatarImage.current.style.transform = avatarTransform(avatarX, avatarY);
    avatarDrag.current = { ...avatarDrag.current, pointerX: event.clientX, pointerY: event.clientY, avatarX, avatarY };
    setDraft(current => current.avatarX === avatarX && current.avatarY === avatarY ? current : { ...current, avatarX, avatarY });
    event.preventDefault();
  };
  const finishAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!draft.avatar || avatarDrag.current.pointerId !== event.pointerId) return;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    if (avatarDrag.current.moved) setDraft(current => ({ ...current, avatarX: avatarDrag.current.avatarX, avatarY: avatarDrag.current.avatarY }));
    avatarDrag.current.pointerId = null;
  };
  return <><main className="app-screen settings-screen screen-enter">
    <header className="simple-header"><button onClick={() => leave("profile")} aria-label="返回我的資料">←</button><span>資料設定</span><i /></header>
    <div className="settings-content-scale">
    <section className="settings-intro"><span className="eyebrow">PROFILE SETTINGS</span><h1>調整你的飲食方向</h1><p>身體與目標、飲食偏好和外食情境都能在這一頁<br />修改；儲存後會一起更新建議。</p></section>
    <section className="settings-identity"><label className={`avatar-upload ${draft.avatar ? "is-draggable" : ""}`} aria-label="選擇或拖曳調整大頭貼" onPointerDown={startAvatarDrag} onPointerMove={moveAvatar} onPointerUp={finishAvatarDrag} onPointerCancel={finishAvatarDrag} onClick={event => { if (avatarDrag.current.moved) { event.preventDefault(); avatarDrag.current.moved = false; } }}><span>{draft.avatar ? <img ref={avatarImage} src={draft.avatar} alt="大頭貼預覽" draggable={false} style={{ transform: avatarTransform(draft.avatarX, draft.avatarY) }} /> : <ProfileIcon />}</span><input type="file" accept="image/*" onChange={chooseAvatar} /></label><label className="profile-name-field"><span>姓名或暱稱</span><input value={draft.name} onChange={event => update("name", event.target.value)} placeholder="輸入姓名或暱稱" maxLength={20} /></label></section>
    <section className="settings-section" id="settings-body"><div className="settings-section-title"><span>01</span><div><h2>身體與目標</h2><p>用來估算每日範圍與份量方向。</p></div></div><div className="form-grid"><label>年齡<input inputMode="numeric" value={draft.age} onChange={event => update("age", event.target.value)} /><span>歲</span></label><label>身高<input inputMode="numeric" value={draft.height} onChange={event => update("height", event.target.value)} /><span>cm</span></label><label>體重<input inputMode="numeric" value={draft.weight} onChange={event => update("weight", event.target.value)} /><span>kg</span></label><label>性別<select value={draft.gender} onChange={event => update("gender", event.target.value)}><option>女性</option><option>男性</option></select></label></div><div className="field-block"><span className="field-title">目前目標</span><div className="chip-row wrap">{["減脂", "維持", "增肌", "均衡飲食"].map(value => <ToggleChip key={value} value={value} selected={draft.goal === value} onClick={() => update("goal", value)} />)}</div></div><div className="field-block"><span className="field-title">運動量</span><div className="chip-row wrap">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(value => <ToggleChip key={value} value={value} selected={draft.activity === value} onClick={() => update("activity", value)} />)}</div></div><div className="nutrition-target-preview"><span>目前每日估算</span><strong>{previewTargets.calories.toLocaleString()} kcal</strong><div><b>蛋白質 {previewTargets.protein}g</b><b>碳水 {previewTargets.carbs}g</b><b>脂肪 {previewTargets.fat}g</b></div><small>會隨上方資料即時試算；儲存後同步更新首頁。此為生活管理估算，非醫療處方。</small></div></section>
    <section className="settings-section" id="settings-preferences"><div className="settings-section-title"><span>02</span><div><h2>飲食偏好</h2><p>硬性限制會排除；口味只影響排序。</p></div></div><div className="field-block"><span className="field-title">過敏／宗教／醫療限制</span><div className="chip-row wrap">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(value => <ToggleChip key={value} value={value} selected={draft.exclusions.includes(value)} onClick={() => toggle("exclusions", value)} />)}</div></div><div className="field-block"><span className="field-title">口味與排序偏好</span><div className="chip-row wrap">{["少辣", "低糖", "預算 150 內"].map(value => <ToggleChip key={value} value={value} selected={draft.preferences.includes(value)} onClick={() => toggle("preferences", value)} />)}</div></div></section>
    <section className="settings-section" id="settings-contexts"><div className="settings-section-title"><span>03</span><div><h2>外食情境</h2><p>讓下一餐推薦更貼近日常選擇。</p></div></div><div className="field-block"><span className="field-title">常見用餐方式</span><div className="chip-row wrap">{["便利商店", "便當", "餐廳", "自煮"].map(value => <ToggleChip key={value} value={value} selected={draft.contexts.includes(value)} onClick={() => toggle("contexts", value)} />)}</div></div><label className="select-field">外食頻率<select value={draft.frequency} onChange={event => update("frequency", event.target.value)}><option>幾乎不外食</option><option>每週外食 1–3 次</option><option>每週外食 4–6 次</option><option>幾乎每天外食</option></select></label></section>
    <div className="settings-actions"><button className="primary-btn" disabled={invalid} onClick={() => saveAndGo("profile")}>儲存所有設定 <span>→</span></button><button className="secondary-btn" onClick={() => leave("profile")}>取消</button></div>
    </div>
    {pendingScreen && <div className="modal-backdrop unsaved-backdrop"><section className="permission-modal unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><span className="eyebrow">UNSAVED CHANGES</span><h2 id="unsaved-title">尚未儲存變更</h2><p>要先儲存這次修改，再前往其他頁面嗎？</p><button className="primary-btn" disabled={invalid} onClick={() => saveAndGo(pendingScreen)}>儲存後離開 <span>→</span></button><button className="secondary-btn" onClick={() => go(pendingScreen)}>不儲存，直接離開</button><button className="keep-editing-btn" onClick={() => setPendingScreen(null)}>繼續編輯</button></section></div>}
  </main><BottomNav screen="settings" go={leave} /></>;
}

function ProfileScreen({ profile, setProfile, editSetup, reset, go }: { profile: Profile; setProfile: (profile: Profile) => void; editSetup: (section: SettingsSection) => void; reset: () => void; go: (screen: Screen) => void }) {
  const targets = calculateNutritionTargets(profile);
  const avatarDrag = useRef({ pointerId: null as number | null, pointerX: 0, pointerY: 0, avatarX: 50, avatarY: 50, moved: false });
  const avatarImage = useRef<HTMLImageElement>(null);
  const chooseAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setProfile({ ...profile, avatar: await avatarDataUrl(file), avatarX: 50, avatarY: 50 }); } catch { /* keep the current avatar */ }
    event.target.value = "";
  };
  const startAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar) return;
    avatarDrag.current = { pointerId: event.pointerId, pointerX: event.clientX, pointerY: event.clientY, avatarX: profile.avatarX, avatarY: profile.avatarY, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer id tracking keeps drag active */ }
    event.preventDefault();
  };
  const moveAvatar = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar || avatarDrag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - avatarDrag.current.pointerX;
    const dy = event.clientY - avatarDrag.current.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 3) avatarDrag.current.moved = true;
    const clamp = (value: number) => Math.max(17, Math.min(83, value));
    const avatarX = clamp(avatarDrag.current.avatarX - dx);
    const avatarY = clamp(avatarDrag.current.avatarY - dy);
    if (avatarImage.current) avatarImage.current.style.transform = avatarTransform(avatarX, avatarY);
    avatarDrag.current = { ...avatarDrag.current, pointerX: event.clientX, pointerY: event.clientY, avatarX, avatarY };
    event.preventDefault();
  };
  const finishAvatarDrag = (event: React.PointerEvent<HTMLLabelElement>) => {
    if (!profile.avatar || avatarDrag.current.pointerId !== event.pointerId) return;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer may already be released */ }
    if (avatarDrag.current.moved) setProfile({ ...profile, avatarX: avatarDrag.current.avatarX, avatarY: avatarDrag.current.avatarY });
    avatarDrag.current.pointerId = null;
  };
  return <main className="app-screen profile-screen screen-enter"><AppHeader label="ME / 02" /><div className="profile-content-scale"><section className="profile-hero"><label className={`avatar profile-avatar-picker ${profile.avatar ? "is-draggable" : ""}`} aria-label="選擇或拖曳調整大頭貼" onPointerDown={startAvatarDrag} onPointerMove={moveAvatar} onPointerUp={finishAvatarDrag} onPointerCancel={finishAvatarDrag} onClick={event => { if (avatarDrag.current.moved) { event.preventDefault(); avatarDrag.current.moved = false; } }}>{profile.avatar ? <img ref={avatarImage} src={profile.avatar} alt="大頭貼預覽" draggable={false} style={{ transform: avatarTransform(profile.avatarX, profile.avatarY) }} /> : <ProfileIcon />}<input type="file" accept="image/*" onChange={chooseAvatar} /></label><div><span className="eyebrow">目前目標</span><h1>{profile.goal} の {profile.name || "使用者"}</h1><p>{profile.activity}</p></div></section><section className="daily-advice"><span>每日建議</span><strong>{targets.calories.toLocaleString()} kcal · 蛋白質 {targets.protein}g</strong><small>依目前資料估算，並非醫療處方。</small></section><section className="profile-list"><button onClick={() => editSetup("body")}><span>身體與目標</span><b>{profile.height}cm · {profile.weight}kg →</b></button><button onClick={() => editSetup("preferences")}><span>飲食偏好</span><b>{[...profile.preferences, ...profile.exclusions].join("、") || "無"} →</b></button><button onClick={() => editSetup("contexts")}><span>外食情境</span><b>{profile.contexts.join("、") || "未設定"} →</b></button><button onClick={() => setProfile({ ...profile, reminder: profile.reminder === "不要提醒" ? "用餐前 20 分鐘" : "不要提醒" })}><span>提醒設定</span><b>{profile.reminder}</b></button><button onClick={() => setProfile({ ...profile, location: profile.location === "allowed" ? "denied" : "allowed" })}><span>定位與隱私權</span><b>{profile.location === "allowed" ? "已允許" : "手動地點"}</b></button></section><button className="reset-btn" onClick={reset}>重設示範資料</button><p className="prototype-note">MindMeal MVP · 所有健康數值皆為互動示範</p></div><BottomNav screen="profile" go={go} /></main>;
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
  const meal = meals.length ? meals[meals.length - 1] : null;
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
        if (window.localStorage.getItem("mindmeal-album-permission") === "allowed") setAlbumPermission("allowed");
        if (raw) {
          const data = JSON.parse(raw);
          restoredProfile = normalizeProfile(data.profile);
          const avatarResetKey = "mindmeal-avatar-reset-20260819";
          if (!window.localStorage.getItem(avatarResetKey)) {
            restoredProfile = { ...restoredProfile, avatar: "", avatarX: 50, avatarY: 50 };
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
          setScreen(data.onboarded ? (restoredProfile.name.trim() ? "home" : "onboarding") : "welcome");
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
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const analyzePhoto = async (imageUrl: string) => {
    const analysis = await analyzeMealPhoto(imageUrl);
    setSelectedMeal(analysis.meal);
    setSelectedMealImage(analysis.imageUrl);
    setSelectedMealMeta(analysis.meta);
    go("analysis");
  };
  const chooseExistingMeal = (next: Meal) => {
    setSelectedMeal(next);
    setSelectedMealImage("");
    setSelectedMealMeta(undefined);
    go("analysis");
  };
  const openSettings = (section: SettingsSection) => {
    setScreen("settings");
    window.setTimeout(() => document.getElementById(`settings-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
  };
  const saveMeal = (next: Meal) => {
    setMeals(current => [...current, { ...next, id: Date.now() }]);
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
    setScreen("welcome");
  };
  if (!ready) return <main className="loading-screen"><Brand /><span>LOADING DIRECTION</span></main>;
  let content;
  if (screen === "welcome") content = <Welcome start={() => go("onboarding")} demo={() => { setMeals([demoMeal]); setRecordDays(7); go("home"); }} />;
  else if (screen === "onboarding") content = <Onboarding profile={profile} setProfile={setProfile} finish={() => go("home")} back={() => go("welcome")} />;
  else if (screen === "scan") content = <Scan go={go} analyze={analyzePhoto} albumPermission={albumPermission} allowAlbum={() => setAlbumPermission("allowed")} />;
  else if (screen === "album") content = <AlbumGallery choose={chooseExistingMeal} go={go} />;
  else if (screen === "food-search") content = <FoodSearch choose={chooseExistingMeal} go={go} />;
  else if (screen === "manual-entry") content = <ManualEntry choose={chooseExistingMeal} go={go} />;
  else if (screen === "analysis") content = <Analysis initialMeal={selectedMeal} imageUrl={selectedMealImage} meta={selectedMealMeta} go={go} save={saveMeal} />;
  else if (screen === "result" && meal) content = <Result meal={meal} profile={profile} go={go} />;
  else if (screen === "nearby") content = <Nearby profile={profile} setProfile={setProfile} go={go} />;
  else if (screen === "store") content = <StoreDetail go={go} />;
  else if (screen === "profile") content = <ProfileScreen profile={profile} setProfile={setProfile} editSetup={openSettings} reset={reset} go={go} />;
  else if (screen === "settings") content = <ProfileSettings profile={profile} save={setProfile} go={go} />;
  else if (screen === "edit-meal") content = <EditMeal meal={selectedMeal} update={updateMeal} remove={removeMeal} go={go} />;
  else content = <Dashboard meals={meals} recordDays={recordDays} profile={profile} go={go} editMeal={item => { setSelectedMeal(item); go("edit-meal"); }} />;
  return <>{content}{undo && <div className="undo-toast" role="status"><span>{undo.message}</span><button onClick={() => { setMeals(undo.meals); setUndo(null); }}>復原</button></div>}</>;
}
