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
  for (const label of ["首頁", "紀錄飲食", "下一餐地圖", "我的資料"]) {
    assert.match(page, new RegExp(label));
  }
  assert.match(page, /function HumanFigure/);
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
  assert.match(page, /一鍵儲存這餐/);
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
  assert.match(page, /允許存取相簿？/);
  assert.match(page, /function AlbumGallery/);
  assert.match(page, /scrollIntoView\(\{ behavior: "smooth"/);
  assert.match(page, /editSetup\("contexts"\)/);
  assert.match(page, /id="settings-contexts"/);
});
