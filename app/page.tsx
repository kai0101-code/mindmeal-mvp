"use client";

import { useEffect, useMemo, useState } from "react";

type Screen = "welcome" | "onboarding" | "home" | "scan" | "analysis" | "result" | "nearby" | "store" | "profile" | "edit-meal";
type Profile = {
  age: string; height: string; weight: string; gender: string; goal: string;
  activity: string; preferences: string[]; exclusions: string[]; contexts: string[];
  meals: string[]; reminder: string; location: "unknown" | "allowed" | "denied";
};
type Meal = { id: number; name: string; calories: number; protein: number; carbs: number; fat: number; rice: string; sauce: string; completion: string; ingredients: string[] };

const initialProfile: Profile = {
  age: "28", height: "168", weight: "62", gender: "女性", goal: "均衡飲食",
  activity: "每週 2–3 天", preferences: ["少辣"], exclusions: [], contexts: ["便利商店", "便當"],
  meals: ["午餐", "晚餐"], reminder: "用餐前 20 分鐘", location: "unknown",
};
const targets = { calories: 1900, protein: 120, carbs: 220, fat: 60, water: 2000 };

function Brand() {
  return <div className="brand" aria-label="有意食 MindMeal"><span className="brand-line" /><span className="brand-zh">有 意 食</span><span className="brand-en">Mind Meal<span className="brand-dot">.</span></span></div>;
}

function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const active = screen === "nearby" || screen === "store" ? "nearby" : screen === "profile" ? "profile" : screen === "scan" || screen === "analysis" ? "scan" : "home";
  return <nav className="bottom-nav" aria-label="主要導覽">
    <button className={`nav-item ${active === "home" ? "active" : ""}`} onClick={() => go("home")}><span className="nav-symbol">⌂</span><span>首頁</span></button>
    <button className={`nav-item scan-nav ${active === "scan" ? "active" : ""}`} onClick={() => go("scan")} aria-label="記錄飲食"><span>＋</span></button>
    <button className={`nav-item ${active === "nearby" ? "active" : ""}`} onClick={() => go("nearby")}><span className="nav-symbol">⌖</span><span>下一餐</span></button>
    <button className={`nav-item ${active === "profile" ? "active" : ""}`} onClick={() => go("profile")}><span className="nav-symbol">◎</span><span>我的</span></button>
  </nav>;
}

function AppHeader({ label = "TODAY / 01" }: { label?: string }) {
  return <header className="app-header"><Brand /><span className="edition">{label}</span></header>;
}

function Welcome({ start, demo }: { start: () => void; demo: () => void }) {
  return <main className="welcome-screen screen-enter"><div className="welcome-top"><Brand /><span className="edition">MVP / 02</span></div><section className="welcome-copy"><span className="eyebrow">EAT WITH INTENTION.</span><h1>下一餐，<br />吃得更有方向。</h1><p>拍下餐點，看懂今天最需要補充什麼。少一點計算，多一點剛剛好的選擇。</p></section><div className="welcome-orbit" aria-hidden="true"><span>有意</span><i /></div><div className="welcome-actions"><button className="primary-btn" onClick={start}>三步完成設定 <span>→</span></button><button className="text-btn" onClick={demo}>先看看今天的首頁</button></div><div className="wave" /></main>;
}

function ToggleChip({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return <button type="button" className={`chip ${selected ? "selected" : ""}`} onClick={onClick}>{value}<span>{selected ? "✓" : "＋"}</span></button>;
}

function Onboarding({ profile, setProfile, finish, back }: { profile: Profile; setProfile: (p: Profile) => void; finish: () => void; back: () => void }) {
  const [step, setStep] = useState(0);
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setProfile({ ...profile, [key]: value });
  const toggle = (key: "preferences" | "exclusions" | "contexts" | "meals", value: string) => update(key, profile[key].includes(value) ? profile[key].filter(v => v !== value) : [...profile[key], value]);
  const steps = [
    <div className="step-body" key="body"><p className="why-copy">用來估算你的每日範圍與下一餐份量，可隨時到「我的資料」修改。</p><div className="form-grid"><label>年齡<input inputMode="numeric" value={profile.age} onChange={e => update("age", e.target.value)} /><span>歲</span></label><label>身高<input inputMode="numeric" value={profile.height} onChange={e => update("height", e.target.value)} /><span>cm</span></label><label>體重<input inputMode="numeric" value={profile.weight} onChange={e => update("weight", e.target.value)} /><span>kg</span></label><label>性別<select value={profile.gender} onChange={e => update("gender", e.target.value)}><option>女性</option><option>男性</option><option>其他</option></select></label></div><div className="field-block"><span className="field-title">目前目標</span><div className="chip-row">{["減脂", "維持", "增肌", "均衡飲食"].map(v => <ToggleChip key={v} value={v} selected={profile.goal === v} onClick={() => update("goal", v)} />)}</div></div></div>,
    <div className="step-body" key="taste"><p className="why-copy">硬性限制會直接排除；口味與情境只影響推薦排序，不會限制你的選擇。</p><div className="field-block"><span className="field-title">運動量</span><div className="chip-row">{["幾乎不運動", "每週 1 天", "每週 2–3 天", "每週 4 天以上"].map(v => <ToggleChip key={v} value={v} selected={profile.activity === v} onClick={() => update("activity", v)} />)}</div></div><div className="field-block"><span className="field-title">過敏／宗教／醫療限制（硬性排除）</span><div className="chip-row">{["不吃牛", "無乳製品", "堅果過敏", "素食"].map(v => <ToggleChip key={v} value={v} selected={profile.exclusions.includes(v)} onClick={() => toggle("exclusions", v)} />)}</div></div><div className="field-block"><span className="field-title">口味與外食情境（推薦排序）</span><div className="chip-row">{["少辣", "低糖", "預算 150 內", "便利商店", "便當", "餐廳"].map(v => <ToggleChip key={v} value={v} selected={profile.preferences.includes(v) || profile.contexts.includes(v)} onClick={() => ["便利商店", "便當", "餐廳"].includes(v) ? toggle("contexts", v) : toggle("preferences", v)} />)}</div></div></div>,
    <div className="step-body" key="reminders"><p className="why-copy">提醒會配合你的餐次；該餐已記錄時會自動取消，不會用責備語氣催促。</p><div className="field-block"><span className="field-title">想記錄的餐次</span><div className="chip-row">{["早餐", "午餐", "晚餐", "點心"].map(v => <ToggleChip key={v} value={v} selected={profile.meals.includes(v)} onClick={() => toggle("meals", v)} />)}</div></div><label className="select-field">提醒時間<select value={profile.reminder} onChange={e => update("reminder", e.target.value)}><option>用餐前 20 分鐘</option><option>用餐時間</option><option>用餐後 30 分鐘</option><option>不要提醒</option></select></label><div className="soft-preview"><span>提醒預覽</span><strong>要記錄午餐嗎？</strong><small>如果已記錄，這次提醒就不會出現。</small></div></div>,
  ];
  const titles = ["先讓建議符合你的身體", "把現實生活放進推薦裡", "決定什麼時候提醒你"];
  const invalid = step === 0 && (!profile.age || !profile.height || !profile.weight);
  return <main className="onboarding-screen screen-enter"><header className="onboarding-header"><button onClick={step === 0 ? back : () => setStep(step - 1)} aria-label="上一步">←</button><span>步驟 {step + 1} / 3</span><Brand /></header><div className="step-track"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div><section className="onboarding-content"><span className="eyebrow">SETUP / 0{step + 1}</span><h1>{titles[step]}</h1>{steps[step]}</section><div className="sticky-action"><button disabled={invalid} className="primary-btn" onClick={step === 2 ? finish : () => setStep(step + 1)}>{step === 2 ? "完成，看看今天" : "下一步"}<span>→</span></button></div></main>;
}

function Dashboard({ meal, recordDays, go }: { meal: Meal | null; recordDays: number; go: (s: Screen) => void }) {
  const [gap, setGap] = useState(0), [trendOpen, setTrendOpen] = useState(false), [mealsOpen, setMealsOpen] = useState(true);
  const gaps = meal ? [{ nutrient: "蛋白質", amount: "還差約 78g", note: "晚餐先選一個手掌大的蛋白質" }, { nutrient: "蔬菜", amount: "還差 2 份", note: "加一份深綠色蔬菜最剛好" }, { nutrient: "水分", amount: "還差 1,100ml", note: "下午分 3 次慢慢補足" }] : [{ nutrient: "先記一餐", amount: "才能找出缺口", note: "拍下餐點，大約 10 秒完成" }, { nutrient: "目前 1 天", amount: "資料累積中", note: "再多一點紀錄，建議會更貼近你" }];
  return <main className="app-screen screen-enter"><AppHeader /><section className="home-intro"><span className="eyebrow">最優先營養缺口</span><div className="priority-card" aria-live="polite"><div><span>{gaps[gap].nutrient}</span><strong>{gaps[gap].amount}</strong><p>{gaps[gap].note}</p></div><span className="priority-index">0{gap + 1} / 0{gaps.length}</span></div><div className="pager-tabs" aria-label="切換營養缺口">{gaps.map((item, i) => <button key={item.nutrient} className={i === gap ? "active" : ""} onClick={() => setGap(i)}>{item.nutrient}</button>)}</div></section><section className="next-card"><span className="card-kicker">NEXT MEAL</span><h2>{meal ? "清爽蛋白質＋兩份蔬菜" : "先記錄第一餐，再給你下一步"}</h2><p>{meal ? "雞胸、魚、豆腐都可以；主食保留半碗到一碗。" : "不用逐項計算，拍照後可直接儲存。"}</p><button onClick={() => go(meal ? "nearby" : "scan")}>{meal ? "找附近選擇" : "開始記錄"}<span>→</span></button></section><section className="collapsible-card"><button className="card-toggle" onClick={() => setTrendOpen(!trendOpen)} aria-expanded={trendOpen}><span><small>體態趨勢／平衡分數</small><strong>{recordDays < 3 ? `${recordDays} / 3 天` : "76 分"}</strong></span><i>{trendOpen ? "−" : "＋"}</i></button>{trendOpen && <div className="card-detail">{recordDays < 3 ? <div className="unlock"><span style={{ width: `${recordDays / 3 * 100}%` }} /><p>再記錄 {3 - recordDays} 天可查看週趨勢。現在先專注把日常留下來就好。</p></div> : <><div className="bars">{[48, 62, 55, 70, 66, 82, 76].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div><p>本週平衡分數穩定上升。</p></>}</div>}</section><section className="collapsible-card"><button className="card-toggle" onClick={() => setMealsOpen(!mealsOpen)} aria-expanded={mealsOpen}><span><small>今日紀錄餐點</small><strong>{meal ? "1 餐" : "還沒有紀錄"}</strong></span><i>{mealsOpen ? "−" : "＋"}</i></button>{mealsOpen && <div className="card-detail">{meal ? <button className="meal-row" onClick={() => go("edit-meal")}><span><b>{meal.name}</b><small>{meal.calories} kcal · 估算</small></span><i>編輯 →</i></button> : <button className="empty-meal" onClick={() => go("scan")}>拍下第一餐，AI 幫你開始分析 <span>＋</span></button>}</div>}</section><BottomNav screen="home" go={go} /></main>;
}

function Scan({ go }: { go: (s: Screen) => void }) {
  const [scanning, setScanning] = useState(false);
  const begin = () => { setScanning(true); window.setTimeout(() => go("analysis"), 1200); };
  return <main className="app-screen dark-screen screen-enter"><header className="dark-header"><button onClick={() => go("home")} aria-label="返回首頁">←</button><Brand /><span>CAMERA</span></header><section className="scan-copy"><span className="eyebrow">AI MEAL SCAN</span><h1>{scanning ? "正在辨識這一餐" : "把餐點放進框內"}</h1><p>{scanning ? "正在估算食材與營養，請稍候。" : "照片只用於本次示範，不會上傳。"}</p></section><button className={`camera-frame ${scanning ? "scanning" : ""}`} onClick={begin} disabled={scanning}><span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" /><i className="scan-line" /><b>{scanning ? "ANALYZING" : "拍照"}</b></button><div className="capture-options"><button onClick={begin}>相簿</button><button onClick={begin}>搜尋食物</button><button onClick={begin}>手動輸入</button></div><BottomNav screen="scan" go={go} /></main>;
}

function Analysis({ save, go }: { save: (m: Meal) => void; go: (s: Screen) => void }) {
  const [advanced, setAdvanced] = useState(false), [rice, setRice] = useState("一碗"), [completion, setCompletion] = useState("吃完");
  const meal = useMemo(() => { const ratio = rice === "半碗" ? .82 : rice === "加飯" ? 1.16 : 1, finish = completion === "剩一些" ? .8 : 1; return { id: 0, name: "香煎雞胸時蔬飯", calories: Math.round(620 * ratio * finish), protein: Math.round(42 * finish), carbs: Math.round(72 * ratio * finish), fat: Math.round(18 * finish), rice, sauce: "正常", completion, ingredients: ["雞胸肉", "白飯", "花椰菜", "玉米筍"] }; }, [rice, completion]);
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("scan")}>←</button><span>AI 辨識結果</span><i>估算</i></header><section className="food-visual"><div className="plate"><span className="food rice" /><span className="food chicken" /><span className="food greens g1" /><span className="food greens g2" /></div><span className="detected">辨識信心高 · 可直接儲存</span></section><section className="analysis-content"><span className="eyebrow">MEAL FOUND</span><h1>{meal.name}</h1><p className="estimate-note">以下為 AI 估算值，會因食材與烹調方式不同。</p><div className="macro-summary"><span><b>{meal.calories}</b>kcal</span><span><b>{meal.protein}g</b>蛋白質</span><span><b>{meal.carbs}g</b>碳水</span><span><b>{meal.fat}g</b>脂肪</span></div><div className="detected-foods">{meal.ingredients.map(v => <span key={v}>{v}</span>)}</div><button className="primary-btn" onClick={() => save(meal)}>一鍵儲存這餐 <span>→</span></button><button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>{advanced ? "收起進階調整" : "進階調整食材與數值"}<span>{advanced ? "−" : "＋"}</span></button>{advanced && <div className="advanced-panel"><label>飯量<select value={rice} onChange={e => setRice(e.target.value)}><option>半碗</option><option>一碗</option><option>加飯</option></select></label><label>完食度<select value={completion} onChange={e => setCompletion(e.target.value)}><option>吃完</option><option>剩一些</option></select></label><label>自行輸入熱量<input inputMode="numeric" placeholder={String(meal.calories)} /></label><button onClick={() => setRice("一碗")}>＋ 手動新增食材</button></div>}</section></main>;
}

function Result({ meal, go }: { meal: Meal; go: (s: Screen) => void }) {
  return <main className="result-screen screen-enter"><AppHeader label="RECORD / SAVED" /><section className="result-hero"><span className="success-mark">✓</span><span className="eyebrow">這餐已記錄</span><h1>今天的方向，<br />更新好了。</h1><p>{meal.name} · {meal.calories} kcal（估算）</p></section><section className="updated-progress"><span>蛋白質進度更新</span><strong>{meal.protein} / {targets.protein}g</strong><div className="progress-track"><i className="accent animate-progress" style={{ width: `${meal.protein / targets.protein * 100}%` }} /></div></section><section className="result-next"><span className="card-kicker">更新後的下一餐</span><h2>清爽蛋白質＋兩份蔬菜</h2><p>你已經有足夠的澱粉與油脂，下一餐不用複雜，補一份魚、豆腐或雞肉就很好。</p><button onClick={() => go("nearby")}>查看附近選擇 →</button></section><button className="primary-btn" onClick={() => go("home")}>回到首頁 <span>→</span></button></main>;
}

const stores = [{ name: "好日子健康餐盒", distance: "350m", meal: "香草雞胸＋雙份青菜", price: "$145", score: "96" }, { name: "SUBWAY", distance: "480m", meal: "嫩切雞肉沙拉＋蛋", price: "$159", score: "92" }, { name: "7-ELEVEN", distance: "120m", meal: "舒肥雞胸＋無糖豆漿", price: "$109", score: "88" }];
function Nearby({ profile, setProfile, go }: { profile: Profile; setProfile: (p: Profile) => void; go: (s: Screen) => void }) {
  const [filter, setFilter] = useState("蛋白質"), [place, setPlace] = useState("公司附近"), [showPermission, setShowPermission] = useState(profile.location === "unknown");
  const chooseLocation = (value: "allowed" | "denied") => { setProfile({ ...profile, location: value }); setShowPermission(false); };
  return <main className="app-screen screen-enter"><AppHeader label="NEXT / MEAL" />{showPermission && <div className="modal-backdrop"><section className="permission-modal" role="dialog" aria-modal="true"><span className="permission-icon">⌖</span><span className="eyebrow">只在你需要時詢問</span><h2>要看看附近選擇嗎？</h2><p>定位只用來排序店家距離，不會影響飲食記錄。</p><button className="primary-btn" onClick={() => chooseLocation("allowed")}>允許這次定位 <span>→</span></button><button className="secondary-btn" onClick={() => chooseLocation("denied")}>改用常用地點</button></section></div>}<section className="nearby-hero"><span className="eyebrow">依今日最優先缺口排序</span><h1>蛋白質還差<br /><b>約 78g</b></h1><p>先選餐點組合，再看哪一家離你最近。</p></section>{profile.location === "denied" && <label className="location-field">目前區域<select value={place} onChange={e => setPlace(e.target.value)}><option>公司附近</option><option>住家附近</option><option>學校附近</option><option>手動輸入地點</option></select></label>}<div className="filter-row" aria-label="推薦條件">{["蛋白質", "1 公里內", "少辣", "全部店家"].map(v => <button className={filter === v ? "active" : ""} key={v} onClick={() => setFilter(v)}>{v}</button>)}</div><section><div className="section-heading"><span>推薦餐點組合</span><small>{filter}優先</small></div><div className="meal-combos">{stores.slice(0, 2).map((store, i) => <button key={store.name} onClick={() => go("store")}><span className="combo-rank">0{i + 1}</span><strong>{store.meal}</strong><small>{store.name} · {store.distance}</small><b>{store.price}</b></button>)}</div></section><section className="map-card" aria-label="附近店家示意地圖"><div className="map-grid" /><span className="road r1" /><span className="road r2" /><i className="pin p1">1</i><i className="pin p2">2</i><i className="pin p3">3</i><div className="you-are-here">{profile.location === "allowed" ? "目前位置" : place}</div><small>示意地圖 · 位置僅供原型排序</small></section><section><div className="section-heading"><span>店家</span><small>查看全部</small></div>{stores.map(store => <button className="store-row" key={store.name} onClick={() => go("store")}><span><b>{store.name}</b><small>{store.meal}<br />{store.distance}</small></span><strong>{store.score}</strong></button>)}</section><aside className="fallback-note">沒有完全符合？<button onClick={() => setFilter("1 公里內")}>放寬距離</button><button onClick={() => setFilter("全部店家")}>看便利商店組合</button></aside><BottomNav screen="nearby" go={go} /></main>;
}

function StoreDetail({ go }: { go: (s: Screen) => void }) {
  const navigate = () => window.open("https://www.google.com/maps/search/?api=1&query=健康餐盒", "_blank", "noopener,noreferrer");
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("nearby")}>←</button><span>店家資訊</span><i>350m</i></header><section className="store-hero"><span className="eyebrow">MATCH 96</span><h1>好日子健康餐盒</h1><p>步行約 5 分鐘 · 示範店家</p></section><section className="recommended-dish"><span className="card-kicker">今日推薦</span><h2>香草雞胸＋雙份青菜</h2><p>蛋白質約 38g，醬汁另外放，主食半份。</p><strong>$145</strong></section><button className="primary-btn" onClick={navigate}>用 Google Maps 開始導航 <span>↗</span></button><p className="prototype-note">選擇餐點不會自動記為已攝取；吃完後請用「＋」記錄。</p></main>;
}

function EditMeal({ meal, update, remove, go }: { meal: Meal; update: (m: Meal) => void; remove: () => void; go: (s: Screen) => void }) {
  const [draft, setDraft] = useState(meal), [confirming, setConfirming] = useState(false);
  return <main className="app-screen screen-enter"><header className="simple-header"><button onClick={() => go("home")}>←</button><span>編輯餐點</span><i>估算</i></header><section className="edit-card"><span className="eyebrow">TODAY&apos;S MEAL</span><h1>{draft.name}</h1><label>份量<select value={draft.rice} onChange={e => setDraft({ ...draft, rice: e.target.value })}><option>半碗</option><option>一碗</option><option>加飯</option></select></label><label>完食度<select value={draft.completion} onChange={e => setDraft({ ...draft, completion: e.target.value })}><option>吃完</option><option>剩一些</option></select></label><label>食材<input value={draft.ingredients.join("、")} onChange={e => setDraft({ ...draft, ingredients: e.target.value.split("、") })} /></label><button className="primary-btn" onClick={() => { update(draft); go("home"); }}>儲存修改 <span>→</span></button><button className="delete-btn" onClick={() => setConfirming(true)}>刪除這筆紀錄</button></section>{confirming && <div className="modal-backdrop"><section className="permission-modal" role="dialog" aria-modal="true"><h2>確定刪除這餐？</h2><p>刪除後，首頁進度與下一餐建議會一起更新。</p><button className="delete-confirm" onClick={remove}>確認刪除</button><button className="secondary-btn" onClick={() => setConfirming(false)}>先保留</button></section></div>}</main>;
}

function ProfileScreen({ profile, setProfile, editSetup, reset, go }: { profile: Profile; setProfile: (p: Profile) => void; editSetup: () => void; reset: () => void; go: (s: Screen) => void }) {
  return <main className="app-screen screen-enter"><AppHeader label="MY / DATA" /><section className="profile-hero"><span className="avatar">意</span><div><span className="eyebrow">目前目標</span><h1>{profile.goal}</h1><p>{profile.activity}</p></div></section><section className="daily-advice"><span>每日建議</span><strong>1,900 kcal · 蛋白質 120g</strong><small>依目前資料估算，並非醫療處方。</small></section><section className="profile-list"><button onClick={editSetup}><span>身體與目標</span><b>{profile.height}cm · {profile.weight}kg →</b></button><button onClick={editSetup}><span>飲食偏好</span><b>{[...profile.preferences, ...profile.exclusions].join("、") || "無"} →</b></button><button onClick={() => setProfile({ ...profile, reminder: profile.reminder === "不要提醒" ? "用餐前 20 分鐘" : "不要提醒" })}><span>提醒設定</span><b>{profile.reminder}</b></button><button onClick={() => setProfile({ ...profile, location: profile.location === "allowed" ? "denied" : "allowed" })}><span>定位與隱私權</span><b>{profile.location === "allowed" ? "已允許" : "手動地點"}</b></button></section><button className="reset-btn" onClick={reset}>重設原型資料</button><BottomNav screen="profile" go={go} /></main>;
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("welcome"), [profile, setProfile] = useState<Profile>(initialProfile), [meal, setMeal] = useState<Meal | null>(null), [recordDays, setRecordDays] = useState(1), [ready, setReady] = useState(false), [undo, setUndo] = useState<{ message: string; meal: Meal | null } | null>(null);
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("mindmeal-v2-demo");
        if (raw) {
          const data = JSON.parse(raw);
          setProfile({ ...initialProfile, ...data.profile });
          setMeal(data.meal || null);
          setRecordDays(data.recordDays || 1);
          setScreen(data.onboarded ? "home" : "welcome");
        }
      } catch { /* use defaults */ }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem("mindmeal-v2-demo", JSON.stringify({ profile, meal, recordDays, onboarded: screen !== "welcome" && screen !== "onboarding" })); }, [profile, meal, recordDays, screen, ready]);
  const go = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const saveMeal = (next: Meal) => { setMeal({ ...next, id: Date.now() }); setRecordDays(Math.max(2, recordDays)); go("result"); };
  const updateMeal = (next: Meal) => { const old = meal; setMeal(next); setUndo({ message: "餐點已更新", meal: old }); window.setTimeout(() => setUndo(null), 5000); };
  const removeMeal = () => { const old = meal; setMeal(null); setUndo({ message: "餐點已刪除", meal: old }); go("home"); window.setTimeout(() => setUndo(null), 5000); };
  const reset = () => { window.localStorage.removeItem("mindmeal-v2-demo"); setProfile(initialProfile); setMeal(null); setRecordDays(1); setScreen("welcome"); };
  if (!ready) return <main className="loading-screen"><Brand /><span>LOADING DIRECTION</span></main>;
  let content;
  if (screen === "welcome") content = <Welcome start={() => go("onboarding")} demo={() => go("home")} />;
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
