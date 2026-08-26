import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("MindMeal product metadata replaces starter content", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(layout, /MindMeal 有意食/);
  assert.match(page, /今天吃什麼/);
  assert.match(page, /AI MEAL SCAN/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});

test("core user flow screens are included", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const screen of ["onboarding", "album", "food-search", "manual-entry", "analysis", "result", "nearby", "store", "profile", "settings", "edit-meal"]) {
    assert.match(page, new RegExp(`\\b${screen}\\b`));
  }
});

test("v2 sitemap changes preserve the first-version body visual", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const yellowMan = await readFile(new URL("app/YellowManModel.tsx", root), "utf8");
  for (const label of ["首頁", "紀錄飲食", "下一餐地圖", "我的資料"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /YellowManModel/);
  assert.match(yellowMan, /YELLOW_MAN\.glb/);
  assert.match(yellowMan, /FEMALE_MANNEQUIN\.glb/);
  assert.match(page, /function RingMetric/);
  assert.match(page, /熱 量 尚 缺/);
  assert.doesNotMatch(page, /className="gap-tabs"/);
  assert.match(page, /dashboard-swipe-card/);
  assert.match(page, /dashboard-data-window/);
  assert.match(page, /dashboard-fixed-figure/);
  assert.match(page, /活動紀錄/);
  assert.match(page, /消耗熱量/);
  assert.match(page, /體態趨勢／平衡分數/);
  assert.match(page, /今日紀錄餐點/);
  assert.match(page, /儲存並更新今日營養/);
  assert.match(page, /手動輸入/);
  assert.match(page, /Google Maps/);
  assert.doesNotMatch(page, /key: "trend"/);
  assert.doesNotMatch(page, /SCAN AREA/);
  assert.match(page, /function ProfileSettings/);
  assert.match(page, /editSetup=\{openSettings\}/);
  assert.match(page, /儲存所有設定/);
  assert.match(page, /尚未儲存變更/);
  assert.match(page, /<\/main><BottomNav screen="settings" go=\{leave\}/);
  assert.doesNotMatch(page, /<i>一次完成<\/i>/);
  assert.match(page, /麥當勞漢堡/);
  assert.match(page, /紅燒牛肉麵/);
  assert.match(page, /placeholder="搜尋：牛肉麵、漢堡、雞蛋…"/);
  assert.match(page, /function ManualEntry/);
  assert.match(page, /確認並查看分析/);
  assert.match(page, /className=\{`shutter-btn/);
  assert.match(page, /選擇一張餐點照片？/);
  assert.match(page, /function AlbumGallery/);
  assert.match(page, /scrollIntoView\(\{ behavior: "smooth"/);
  assert.match(page, /editSetup\("contexts"\)/);
  assert.match(page, /id="settings-contexts"/);
  assert.match(page, /function calculateNutritionTargets/);
  assert.match(page, /Mifflin–St Jeor/);
  assert.match(page, /目前每日估算/);
  assert.match(page, /previewTargets\.calories/);
  assert.doesNotMatch(page, /<option>其他<\/option>/);
});

test("camera photos are analyzed by Gemini and returned nutrition updates the app", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const worker = await readFile(new URL("worker/meal-analysis.ts", root), "utf8");
  const workerEntry = await readFile(new URL("worker/ai-api.ts", root), "utf8");
  const workflow = await readFile(new URL(".github/workflows/pages.yml", root), "utf8");
  assert.match(page, /capture="environment"/);
  assert.match(page, /accept="image\/\*"/);
  assert.match(page, /VITE_MINDMEAL_ANALYSIS_API_URL/);
  assert.match(page, /analyzeMealPhoto/);
  assert.match(page, /setMeals\(current => \[\.\.\.current/);
  assert.match(page, /儲存並更新今日營養/);
  assert.match(workerEntry, /\/api\/analyze-meal/);
  assert.match(worker, /gemini-3\.6-flash/);
  assert.match(worker, /Output\.object/);
  assert.match(worker, /GEMINI_API_KEY/);
  assert.doesNotMatch(page, /GEMINI_API_KEY/);
  assert.match(workflow, /VITE_MINDMEAL_ANALYSIS_API_URL: https:\/\/mindmeal-nutrition-api\..+\/api\/analyze-meal/);
});

test("survey findings are reflected in the current experience", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /NEXT MEAL NAVIGATION \/ 下一餐導航/);
  assert.match(page, /調整分析結果（份量、醬料、食材）/);
  assert.match(page, /1 碗約 200g/);
  assert.match(page, /營養缺口、距離與價格/);
  assert.match(page, /目前是關鍵字搜尋，不是特定店家的直接導航/);
});

test("nearby view uses a real Google Maps embed and keeps permission controls visible", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const styles = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(page, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(page, /maps\.google\.com\/maps\?q=/);
  assert.match(page, /Google Maps 附近健康餐搜尋結果/);
  assert.match(page, /地圖與店家搜尋結果由 Google Maps 即時提供/);
  assert.match(styles, /\.modal-backdrop\{[^}]*z-index:1200/);
  assert.match(styles, /max-height:calc\(100dvh - 36px\)/);
});
