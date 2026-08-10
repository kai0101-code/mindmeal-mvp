"use client";

import { useEffect, useMemo, useState } from "react";

type Screen = "welcome" | "onboarding" | "home" | "scan" | "analysis" | "result" | "nearby" | "store" | "profile" | "edit-meal";
type LocationPermission = "unknown" | "allowed" | "denied";
type Profile = {
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

const emptyProfile: Profile = {
  age: "28",
  height: "168",
  weight: "62",
  gender: "女性",
  activity: "每週 2–3 天",
  goal: "均衡飲食",
  preferences: ["少辣"],
  exclusions: [],
  contexts: ["便利商店", "便當"],
  frequency: "每週外食 4–6 次",
  meals: ["午餐", "晚餐"],
  reminder: "用餐前 20 分鐘",
  location: "unknown",
};
const targets = { calories: 1900, protein: 120, carbs: 220, fat: 60, water: 2000 };
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

function normalizeProfile(value?: Partial<Profile> & { location?: LocationPermission | boolean }): Profile {
  const location = value?.location === true ? "allowed" : value?.location === false ? "unknown" : value?.location || "unknown";
  return { ...emptyProfile, ...value, location };
}

function normalizeMeal(value?: Partial<Meal> | null): Meal | null {
  if (!value) return null;
  return { ...demoMeal, ...value, id: value.id || 1 };
}

function Brand() {
  return <div className="brand" aria-label="有意食 MindMeal"><span className="brand-line" /><span className="brand-zh">有 意 食</span><span className="brand-en">Mind Meal<span className="brand-dot">.</span></span></div>;
}

function Wave() {
  return <div className="wave" aria-hidden="true" />;
}

function HumanFigure() {
  return <div className="human-wrap" aria-label="AI 身體需求：目前優先補充蛋白質"><div className="human" aria-hidden="true"><span className="head" /><span className="body" /><span className="arm arm-left" /><span className="arm arm-right" /><span className="leg leg-left" /><span className="leg leg-right" /></div><span className="human-shadow" /><span className="human-label">PROTEIN</span></div>;
}

function AppHeader({ label }: { label?: string }) {
  return <header className="app-header"><Brand />{label && <span className="edition">{label}</span>}</header>;
}

function BottomNav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const active = screen === "nearby" || screen === "store" ? "nearby" : screen === "profile" ? "profile" : screen === "scan" || screen === "analysis" ? "scan" : "home";
  const items: { key: "home" | "scan" | "nearby" | "profile"; icon: string; label: string }[] = [
    { key: "home", icon: "⌂", label: "首頁" },
    { key: "scan", icon: "+", label: "紀錄飲食" },
    { key: "nearby", icon: "⌖", label: "下一餐地圖" },
    { key: "profile", icon: "○", label: "我的資料" },
  ];
  return <nav className="bottom-nav" aria-label="主要導覽">{items.map(item => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""} ${item.key === "scan" ? "scan-nav" : ""}`} onClick={() => go(item.key)} aria-label={item.label} aria-current={active === item.key ? "page" : undefined}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span></button>)}</nav>;
}

function Welcome({ start, demo }: { start: () => void; demo: () => void }) {
  return <main className="welcome-screen screen-enter"><div className="welcome-top"><Brand /><span className="edition">MVP / 02</span></div><section className="welcome-copy"><span className="eyebrow">EAT WITH INTENTION.</span><h1>今天吃什麼，<br />才能符合身體需求？</h1><p>不用計算每一口。拍下餐點，讓有意食告訴你下一餐的方向。</p></section><div className="welcome-orbit" aria-hidden="true"><span>有意</span><i /></div><div className="welcome-actions"><button className="primary-btn" onClick={start}>三步完成設定 <span>→</span></button><button className="text-btn" onClick={demo}>直接查看示範首頁</button></div><Wave /></main>;
}

function ToggleChip({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`chip ${selected ? "selected" : ""}`} onClick={onClick}>{value}<span>{selected ? "✓" : "＋"}</span></button>;
}

function Onboarding({ profile, setProfile, finish, back }: { profile: Profile; setProfile: (profile: Profile) => void; finish: () => void; back: () => void }) {
  const [step, setStep] = useState(0);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile({ ...profile, [key]: value });
  const toggle = (key: "preferences" | "exclusions" | "contexts" | "meals", value: string) => update(key, profile[key].includes(value) ? profile[key].filter(item => item !== value) : [...profile[key], value]);
  const steps = [
    <div className="step-body" key="body">
      <p className="why-copy">身體資料只用來估算每日範圍；目標會影響份量與下一餐建議，可隨時到「我的資料」修改。</p>
      <div className="form-grid">
        <label>年齡<input inputMode="numeric" value={profile.age} onChange={event => update("age", event.target.value)} /><span>歲</span></label>
        <label>身高<input inputMode="numeric" value={profile.height} onChange={event => update("height", event.target.value)} /><span>cm</span></label>
        <label>體重<input inputMode="numeric" value={profile.weight} onChange={event => update("weight", event.target.value)} /><span>kg</span></label>
        <label>性別<select value={profile.gender} onChange={event => update("gender", event.target.value)}><option>女性</option><option>男性</option><option>其他</option></select></label>
      </div>
      <div className="field-block"><span className="field-title">目前目標</span><div className="chip-row wrap">{["減脂", "維持", "增肌", "均衡飲食"].map(value => <ToggleChip key={value} value={value} selected={profile.goal === value} onClick={() => update("goal", value)} />)}</div></div>
    </div>,
    <div className="step-body" key="taste">
      <p className="why-copy">硬性限制會直接排除；口味、預算與外食情境只影響推薦排序，不會限制你的選擇。</p>
      <div className="field-block"><span className="field-title">運動量</span><div className="chip-row wrap">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(value => <ToggleChip key={value} value={value} selected={profile.activity === value} onClick={() => update("activity", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">過敏／宗教／醫療限制（硬性排除）</span><div className="chip-row wrap">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(value => <ToggleChip key={value} value={value} selected={profile.exclusions.includes(value)} onClick={() => toggle("exclusions", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">口味與排序偏好</span><div className="chip-row wrap">{["少辣", "低糖", "預算 150 內"].map(value => <ToggleChip key={value} value={value} selected={profile.preferences.includes(value)} onClick={() => toggle("preferences", value)} />)}</div></div>
      <div className="field-block"><span className="field-title">日常外食情境</span><div className="chip-row wrap">{["便利商店", "便當", "餐廳", "自煮"].map(value => <ToggleChip key={value} value={value} selected={profile.contexts.includes(value)} onClick={() => toggle("contexts", value)} />)}</div></div>
      <label className="select-field">外食頻率<select value={profile.frequency} onChange={event => update("frequency", event.target.value)}><option>幾乎不外食</option><option>每週外食 1–3 次</option><option>每週外食 4–6 次</option><option>幾乎每天外食</option></select></label>
    </div>,
    <div className="step-body" key="reminder">
      <p className="why-copy">提醒會配合你想記錄的餐次；該餐已記錄時會自動取消，不會用責備語氣催促。</p>
      <div className="field-block"><span className="field-title">想記錄的餐次</span><div className="chip-row wrap">{["早餐", "午餐", "晚餐", "點心"].map(value => <ToggleChip key={value} value={value} selected={profile.meals.includes(value)} onClick={() => toggle("meals", value)} />)}</div></div>
      <label className="select-field">提醒時間<select value={profile.reminder} onChange={event => update("reminder", event.target.value)}><option>用餐前 20 分鐘</option><option>用餐時間</option><option>用餐後 30 分鐘</option><option>不要提醒</option></select></label>
      <div className="soft-preview"><span>提醒預覽</span><strong>要記錄午餐嗎？</strong><small>如果已記錄，這次提醒就不會出現。</small></div>
    </div>,
  ];
  const titles = ["先讓建議符合你的身體", "把現實生活放進推薦裡", "決定什麼時候提醒你"];
  const invalid = step === 0 && (!profile.age || !profile.height || !profile.weight);
  return <main className="onboarding-screen screen-enter"><header className="onboarding-header"><button onClick={step === 0 ? back : () => setStep(step - 1)} aria-label="上一步">←</button><span>步驟 {step + 1} / 3</span><Brand /></header><div className="step-track"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><section className="onboarding-content"><span className="eyebrow">SETUP / 0{step + 1}</span><h1>{titles[step]}</h1>{steps[step]}</section><div className="sticky-action"><button disabled={invalid} className="primary-btn" onClick={step === 2 ? finish : () => setStep(step + 1)}>{step === 2 ? "完成，看看今天" : "下一步"}<span>→</span></button></div></main>;
}

function Progress({ label, current, target, unit, accent = false }: { label: string; current: number; target: number; unit: string; accent?: boolean }) {
  const pct = Math.min(100, Math.round(current / target * 100));
  return <div className="progress-row"><div className="progress-head"><span>{label}</span><span><b>{current}</b> / {target}{unit}</span></div><div className="progress-track"><i className={accent ? "accent" : ""} style={{ width: `${pct}%` }} /></div></div>;
}

function Dashboard({ meal, recordDays, go }: { meal: Meal | null; recordDays: number; go: (screen: Screen) => void }) {
  const [gap, setGap] = useState(0);
  const [trendOpen, setTrendOpen] = useState(false);
  const [mealsOpen, setMealsOpen] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const eaten = base.calories + (meal?.calories || 0);
  const remaining = Math.max(0, targets.calories - eaten);
  const protein = meal?.protein || 0;
  const carbs = base.carbs + (meal?.carbs || 0);
  const fat = base.fat + (meal?.fat || 0);
  const gaps = [
    { label: "熱量", eyebrow: "熱 量 尚 缺", value: remaining.toLocaleString(), unit: "卡", note: meal ? "記錄完成。晚餐優先補充蛋白質與蔬菜。" : "先記錄今天第一餐，讓方向更準確。" },
    { label: "蛋白質", eyebrow: "蛋 白 質 尚 缺", value: String(Math.max(0, targets.protein - protein)), unit: "g", note: meal ? "下一餐先選一個手掌大的蛋白質。" : "拍下第一餐後，就能看見真正的缺口。" },
    { label: "水分", eyebrow: "水 分 尚 缺", value: (targets.water - base.water).toLocaleString(), unit: "ml", note: "下午分幾次慢慢補足，不需要一次喝完。" },
  ];
  const changeGap = (direction: number) => setGap(current => (current + direction + gaps.length) % gaps.length);
  const endTouch = (x: number) => {
    if (touchStart === null) return;
    if (Math.abs(x - touchStart) > 36) changeGap(x < touchStart ? 1 : -1);
    setTouchStart(null);
  };
  return <main className="app-screen home-screen screen-enter">
    <AppHeader />
    <section className="priority-overview" onTouchStart={event => setTouchStart(event.touches[0].clientX)} onTouchEnd={event => endTouch(event.changedTouches[0].clientX)}>
      <div className="priority-heading"><span className="eyebrow">今日最優先營養缺口</span><span>0{gap + 1} / 0{gaps.length}</span></div>
      <div className="hero"><span className="eyebrow">{gaps[gap].eyebrow}</span><div className="calorie-number">{gaps[gap].value}<small>{gaps[gap].unit}</small></div><p>{gaps[gap].note}</p></div>
      <div className="gap-tabs" aria-label="切換營養缺口">{gaps.map((item, index) => <button key={item.label} className={gap === index ? "active" : ""} onClick={() => setGap(index)}>{item.label}</button>)}</div>
    </section>
    <section className="nutrition-body-grid"><div className="nutrition-panel"><div className="panel-top"><span>TODAY / 01</span><span>估算</span></div><Progress label="蛋白質" current={protein} target={targets.protein} unit="g" accent /><Progress label="碳水" current={carbs} target={targets.carbs} unit="g" /><Progress label="脂肪" current={fat} target={targets.fat} unit="g" /><Progress label="水分" current={base.water} target={targets.water} unit="ml" /><div className="pager"><i /><i className="current" /><i /></div></div><HumanFigure /></section>
    <section className="insight-strip"><span>NEXT MEAL / AI DIRECTION</span><p>{meal ? "蛋白質仍有缺口，下一餐選雞胸、豆腐、魚或茶葉蛋，再加一份蔬菜會更平衡。" : "目前資料還很少。拍下餐點後，我們會把複雜數字整理成下一步。"}</p><button onClick={() => go(meal ? "nearby" : "scan")}>{meal ? "查看下一餐建議" : "開始記錄"} →</button></section>
    <section className="collapsible-card"><button className="card-toggle" onClick={() => setTrendOpen(!trendOpen)} aria-expanded={trendOpen}><span><small>體態趨勢／平衡分數</small><strong>{recordDays < 3 ? `${recordDays} / 3 天` : "76 分"}</strong></span><i>{trendOpen ? "−" : "＋"}</i></button>{trendOpen && <div className="card-detail">{recordDays < 3 ? <div className="unlock"><span style={{ width: `${recordDays / 3 * 100}%` }} /><p>再記錄 {3 - recordDays} 天可查看週趨勢。現在先專注把日常留下來就好。</p></div> : <><div className="mini-bars compact-bars">{[48, 62, 55, 70, 66, 82, 76].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><p>本週平衡分數穩定上升，飲水與蛋白質最值得繼續留意。</p></>}</div>}</section>
    <section className="collapsible-card"><button className="card-toggle" onClick={() => setMealsOpen(!mealsOpen)} aria-expanded={mealsOpen}><span><small>今日紀錄餐點</small><strong>{meal ? "1 餐" : "還沒有紀錄"}</strong></span><i>{mealsOpen ? "−" : "＋"}</i></button>{mealsOpen && <div className="card-detail">{meal ? <button className="meal-row" onClick={() => go("edit-meal")}><span><b>{meal.name}</b><small>{meal.calories} kcal · 估算</small></span><i>編輯 →</i></button> : <button className="empty-meal" onClick={() => go("scan")}>拍下第一餐，AI 幫你開始分析 <span>＋</span></button>}</div>}</section>
    <BottomNav screen="home" go={go} />
  </main>;
}

function Scan({ go }: { go: (screen: Screen) => void }) {
  const [scanning, setScanning] = useState(false);
  const begin = () => {
    setScanning(true);
    window.setTimeout(() => go("analysis"), 1200);
  };
  return <main className="app-screen dark-screen scan-screen screen-enter"><header className="dark-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><Brand /><span>DEMO</span></header><section className="scan-copy"><span className="eyebrow">AI MEAL SCAN</span><h1>{scanning ? "正在整理這一餐" : "讓食物進入框內"}</h1><p>{scanning ? "辨識主要食材與份量，請稍候。" : "原型會使用示範餐點，不會上傳照片。"}</p></section><button className={`camera-frame ${scanning ? "scanning" : ""}`} onClick={begin} disabled={scanning} aria-label="拍照並分析餐點"><span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" /><i className="scan-line" /><b>{scanning ? "ANALYZING..." : "+"}</b></button><div className="capture-options"><button onClick={begin}>相簿</button><button onClick={begin}>搜尋食物</button><button onClick={begin}>手動輸入</button></div><BottomNav screen="scan" go={go} /></main>;
}

function Option({ title, values, value, setValue }: { title: string; values: string[]; value: string; setValue: (value: string) => void }) {
  return <div className="option-block"><span>{title}</span><div>{values.map(item => <button key={item} className={value === item ? "selected" : ""} onClick={() => setValue(item)}>{item}</button>)}</div></div>;
}

function Analysis({ save, go }: { save: (meal: Meal) => void; go: (screen: Screen) => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [rice, setRice] = useState("一碗");
  const [sauce, setSauce] = useState("正常");
  const [completion, setCompletion] = useState("吃完");
  const [ingredients, setIngredients] = useState(demoMeal.ingredients.join("、"));
  const [customCalories, setCustomCalories] = useState("");
  const meal = useMemo(() => {
    const riceRatio = rice === "半碗" ? .78 : rice === "加飯" ? 1.18 : 1;
    const sauceDelta = sauce === "多" ? 55 : sauce === "少" ? -25 : 0;
    const completionRatio = completion === "剩一些" ? .8 : 1;
    return {
      ...demoMeal,
      id: 0,
      calories: customCalories ? Math.max(0, Number(customCalories) || 0) : Math.round((620 * riceRatio + sauceDelta) * completionRatio),
      protein: Math.round(42 * completionRatio),
      carbs: Math.round(72 * riceRatio * completionRatio),
      fat: Math.round((18 + sauceDelta * .08) * completionRatio),
      rice,
      sauce,
      completion,
      ingredients: ingredients.split("、").map(item => item.trim()).filter(Boolean),
    };
  }, [rice, sauce, completion, ingredients, customCalories]);
  return <main className="app-screen analysis-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")} aria-label="返回掃描">←</button><span>AI 分析結果</span><i>估算</i></header><section className="food-visual"><div className="plate"><span className="food rice" /><span className="food chicken" /><span className="food greens g1" /><span className="food greens g2" /></div><span className="detected">辨識信心高 · 可直接儲存</span></section><section className="analysis-content"><span className="eyebrow">CHICKEN RICE BOWL</span><h1>{meal.name}</h1><p className="estimate-note">以下為 AI 估算值，會因食材與烹調方式不同；信心低時才會請你確認。</p><div className="macro-summary"><span><b>{meal.calories}</b> kcal</span><span><b>{meal.protein}g</b> 蛋白質</span><span><b>{meal.carbs}g</b> 碳水</span><span><b>{meal.fat}g</b> 脂肪</span></div><div className="detected-foods">{meal.ingredients.map(item => <span key={item}>{item}</span>)}</div><button className="primary-btn" onClick={() => save(meal)}>一鍵儲存這餐 <span>→</span></button><button className="advanced-toggle" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>{advanced ? "收起進階調整" : "進階調整食材與數值"}<span>{advanced ? "−" : "＋"}</span></button>{advanced && <div className="advanced-panel"><Option title="飯量" values={["半碗", "一碗", "加飯"]} value={rice} setValue={setRice} /><Option title="醬料" values={["少", "正常", "多"]} value={sauce} setValue={setSauce} /><Option title="實際吃完" values={["吃完", "剩一些"]} value={completion} setValue={setCompletion} /><label>食材（以頓號分隔）<input value={ingredients} onChange={event => setIngredients(event.target.value)} /></label><label>自行輸入熱量<input inputMode="numeric" placeholder={String(meal.calories)} value={customCalories} onChange={event => setCustomCalories(event.target.value)} /></label></div>}</section></main>;
}

function Result({ meal, go }: { meal: Meal; go: (screen: Screen) => void }) {
  return <main className="success-screen result-screen screen-enter"><Brand /><div className="success-mark">✓</div><span className="eyebrow">MEAL SAVED</span><h1>這餐，完成。</h1><p>已加入 <b>{meal.calories} kcal</b>（估算）。今天油脂已經較充足，下一餐用清爽蛋白質與蔬菜接住就好。</p><section className="updated-progress"><span>蛋白質進度更新</span><strong>{meal.protein} / {targets.protein}g</strong><div className="progress-track"><i className="accent animate-progress" style={{ width: `${meal.protein / targets.protein * 100}%` }} /></div></section><section className="result-next"><span className="eyebrow">更新後的下一餐</span><h2>清爽蛋白質＋兩份蔬菜</h2><p>魚、豆腐或雞肉都可以；主食保留半碗到一碗。</p><button onClick={() => go("nearby")}>查看附近選擇 →</button></section><div className="success-actions"><button className="primary-btn" onClick={() => go("home")}>回到首頁 <span>→</span></button><button className="secondary-btn" onClick={() => go("nearby")}>找附近吃什麼</button></div><Wave /></main>;
}

const stores = [
  { name: "好日子健康餐盒", distance: "350m", meal: "香草雞胸＋雙份青菜", price: "$145", score: "96" },
  { name: "SUBWAY", distance: "480m", meal: "嫩切雞肉沙拉＋蛋", price: "$159", score: "92" },
  { name: "7-ELEVEN", distance: "120m", meal: "舒肥雞胸＋無糖豆漿", price: "$109", score: "88" },
];

function Nearby({ profile, setProfile, go }: { profile: Profile; setProfile: (profile: Profile) => void; go: (screen: Screen) => void }) {
  const [filter, setFilter] = useState("蛋白質");
  const [place, setPlace] = useState("公司附近");
  const [showPermission, setShowPermission] = useState(profile.location === "unknown");
  const chooseLocation = (value: LocationPermission) => {
    setProfile({ ...profile, location: value });
    setShowPermission(false);
  };
  return <main className="app-screen nearby-screen screen-enter"><AppHeader label="NEXT / MEAL" />{showPermission && <div className="modal-backdrop"><section className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="location-title"><span className="permission-icon">⌖</span><span className="eyebrow">只在你需要時詢問</span><h2 id="location-title">要看看附近選擇嗎？</h2><p>定位只用來排序店家距離，不會影響飲食記錄。</p><button className="primary-btn" onClick={() => chooseLocation("allowed")}>允許這次定位 <span>→</span></button><button className="secondary-btn" onClick={() => chooseLocation("denied")}>改用常用地點</button></section></div>}<section className="nearby-hero"><span className="eyebrow">依今日最優先缺口排序</span><h1>蛋白質還差<br /><b>約 78g</b></h1><p>先選餐點組合，再看哪一家離你最近。</p></section>{profile.location === "denied" && <label className="location-field">目前區域<select value={place} onChange={event => setPlace(event.target.value)}><option>公司附近</option><option>住家附近</option><option>學校附近</option><option>手動輸入地點</option></select></label>}<div className="filter-row" aria-label="推薦條件">{["蛋白質", "1 公里內", "少辣", "全部店家"].map(item => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><section><div className="section-heading"><span>推薦餐點組合</span><small>{filter}優先</small></div><div className="meal-combos">{stores.slice(0, 2).map((store, index) => <button key={store.name} onClick={() => go("store")}><span className="combo-rank">0{index + 1}</span><strong>{store.meal}</strong><small>{store.name} · {store.distance}</small><b>{store.price}</b></button>)}</div></section><section className="map-card" aria-label="附近店家示意地圖"><div className="map-grid" /><span className="road r1" /><span className="road r2" /><i className="pin p1">1</i><i className="pin p2">2</i><i className="pin p3">3</i><div className="you-are-here">{profile.location === "allowed" ? "目前位置" : place}</div><small>示意地圖 · 位置僅供原型排序</small></section><section><div className="section-heading"><span>店家</span><small>依條件排序</small></div>{stores.map(store => <button className="store-row" key={store.name} onClick={() => go("store")}><span><b>{store.name}</b><small>{store.meal}<br />{store.distance}</small></span><strong>{store.score}</strong></button>)}</section><aside className="fallback-note">沒有完全符合？<button onClick={() => setFilter("1 公里內")}>放寬距離</button><button onClick={() => setFilter("全部店家")}>看便利商店組合</button></aside><BottomNav screen="nearby" go={go} /></main>;
}

function StoreDetail({ go }: { go: (screen: Screen) => void }) {
  const navigate = () => window.open("https://www.google.com/maps/search/?api=1&query=健康餐盒", "_blank", "noopener,noreferrer");
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("nearby")} aria-label="返回地圖">←</button><span>店家資訊</span><i>350m</i></header><section className="store-hero"><span className="eyebrow">MATCH 96</span><h1>好日子健康餐盒</h1><p>步行約 5 分鐘 · 示範店家</p></section><section className="recommended-dish"><span className="eyebrow">今日推薦</span><h2>香草雞胸＋雙份青菜</h2><p>蛋白質約 38g，醬汁另外放，主食半份。</p><strong>$145</strong></section><button className="primary-btn" onClick={navigate}>用 Google Maps 開始導航 <span>↗</span></button><p className="prototype-note">選擇餐點不會自動記為已攝取；吃完後請用「＋」記錄。</p><BottomNav screen="store" go={go} /></main>;
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

function ProfileScreen({ profile, setProfile, editSetup, reset, go }: { profile: Profile; setProfile: (profile: Profile) => void; editSetup: () => void; reset: () => void; go: (screen: Screen) => void }) {
  return <main className="app-screen profile-screen screen-enter"><AppHeader label="ME / 02" /><section className="profile-hero"><span className="avatar">意</span><div><span className="eyebrow">目前目標</span><h1>{profile.goal}</h1><p>{profile.activity}</p></div></section><section className="daily-advice"><span>每日建議</span><strong>1,900 kcal · 蛋白質 120g</strong><small>依目前資料估算，並非醫療處方。</small></section><section className="profile-list"><button onClick={editSetup}><span>身體與目標</span><b>{profile.height}cm · {profile.weight}kg →</b></button><button onClick={editSetup}><span>飲食偏好</span><b>{[...profile.preferences, ...profile.exclusions].join("、") || "無"} →</b></button><button onClick={editSetup}><span>外食情境</span><b>{profile.contexts.join("、") || "未設定"} →</b></button><button onClick={() => setProfile({ ...profile, reminder: profile.reminder === "不要提醒" ? "用餐前 20 分鐘" : "不要提醒" })}><span>提醒設定</span><b>{profile.reminder}</b></button><button onClick={() => setProfile({ ...profile, location: profile.location === "allowed" ? "denied" : "allowed" })}><span>定位與隱私權</span><b>{profile.location === "allowed" ? "已允許" : "手動地點"}</b></button></section><button className="reset-btn" onClick={reset}>重設示範資料</button><p className="prototype-note">MindMeal MVP · 所有健康數值皆為互動示範</p><BottomNav screen="profile" go={go} /></main>;
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [recordDays, setRecordDays] = useState(1);
  const [ready, setReady] = useState(false);
  const [undo, setUndo] = useState<{ message: string; meal: Meal | null } | null>(null);
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("mindmeal-demo");
        if (raw) {
          const data = JSON.parse(raw);
          setProfile(normalizeProfile(data.profile));
          setMeal(normalizeMeal(data.meal));
          setRecordDays(data.recordDays || (data.meal ? 7 : 1));
          setScreen(data.onboarded ? "home" : "welcome");
        }
      } catch { /* use demo defaults */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem("mindmeal-demo", JSON.stringify({ profile, meal, recordDays, onboarded: screen !== "welcome" && screen !== "onboarding" }));
  }, [profile, meal, recordDays, screen, ready]);
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveMeal = (next: Meal) => {
    setMeal({ ...next, id: Date.now() });
    setRecordDays(Math.max(2, recordDays));
    go("result");
  };
  const updateMeal = (next: Meal) => {
    const previous = meal;
    setMeal(next);
    setUndo({ message: "餐點已更新", meal: previous });
    window.setTimeout(() => setUndo(null), 5000);
  };
  const removeMeal = () => {
    const previous = meal;
    setMeal(null);
    setUndo({ message: "餐點已刪除", meal: previous });
    go("home");
    window.setTimeout(() => setUndo(null), 5000);
  };
  const reset = () => {
    window.localStorage.removeItem("mindmeal-demo");
    setProfile(emptyProfile);
    setMeal(null);
    setRecordDays(1);
    setScreen("welcome");
  };
  if (!ready) return <main className="loading-screen"><Brand /><span>LOADING DIRECTION</span></main>;
  let content;
  if (screen === "welcome") content = <Welcome start={() => go("onboarding")} demo={() => { setMeal(demoMeal); setRecordDays(7); go("home"); }} />;
  else if (screen === "onboarding") content = <Onboarding profile={profile} setProfile={setProfile} finish={() => go("home")} back={() => go("welcome")} />;
  else if (screen === "scan") content = <Scan go={go} />;
  else if (screen === "analysis") content = <Analysis go={go} save={saveMeal} />;
  else if (screen === "result" && meal) content = <Result meal={meal} go={go} />;
  else if (screen === "nearby") content = <Nearby profile={profile} setProfile={setProfile} go={go} />;
  else if (screen === "store") content = <StoreDetail go={go} />;
  else if (screen === "profile") content = <ProfileScreen profile={profile} setProfile={setProfile} editSetup={() => go("onboarding")} reset={reset} go={go} />;
  else if (screen === "edit-meal" && meal) content = <EditMeal meal={meal} update={updateMeal} remove={removeMeal} go={go} />;
  else content = <Dashboard meal={meal} recordDays={recordDays} go={go} />;
  return <>{content}{undo && <div className="undo-toast" role="status"><span>{undo.message}</span><button onClick={() => { setMeal(undo.meal); setUndo(null); }}>復原</button></div>}</>;
}
