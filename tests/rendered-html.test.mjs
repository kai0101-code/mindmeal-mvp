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
  for (const screen of ["onboarding", "analysis", "success", "nearby", "trend", "profile"]) {
    assert.match(page, new RegExp(`\\b${screen}\\b`));
  }
});
