import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("MindMeal product metadata replaces starter content", async () => {
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(layout, /MindMeal 有意食/);
  assert.match(page, /下一餐/);
  assert.match(page, /AI MEAL SCAN/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});

test("core user flow screens are included", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const screen of ["onboarding", "analysis", "result", "nearby", "store", "profile", "edit-meal"]) {
    assert.match(page, new RegExp(`\\b${screen}\\b`));
  }
});

test("v2 sitemap uses four primary entries and home-based trend summary", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /首頁/);
  assert.match(page, /記錄飲食/);
  assert.match(page, /下一餐/);
  assert.match(page, /我的/);
  assert.match(page, /體態趨勢／平衡分數/);
  assert.match(page, /再記錄.*天可查看週趨勢/);
});
