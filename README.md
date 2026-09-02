# MindMeal 有意食

MindMeal 是一款以「今天還差什麼，下一餐可以怎麼吃？」為核心的飲食導航 MVP。

## 團隊入口

- [產品需求 PRD](docs/PRD.md)
- [視覺與互動規範 DESIGN](docs/DESIGN.md)
- [開發任務與驗收 TASK](docs/TASK.md)
- [協作方式](CONTRIBUTING.md)

## V2 預覽（僅供參考）

- [開啟 MindMeal V2 預覽網站](https://miaochenyou.github.io/mindmeal_v2_backup/)
- 此連結為獨立備份版本，不代表主專案已合併或正式發布。

## 目前可測試流程

- 五步驟個人目標設定
- 今日營養 Dashboard
- 手機相機／相簿照片輸入
- OpenRouter 多模態餐點分析與 AI 食物搜尋（需部署端設定 `OPENROUTER_API_KEY`）
- 飯量、醬料與食用狀況修正
- 儲存後更新營養進度
- 下一餐店家推薦與採買清單
- 七日趨勢與個人設定

照片營養數值為 AI 估算；店家餐點卡仍為 MVP 示範資料。所有結果均不構成醫療診斷、過敏原確認或營養處方。

## 本機開發

需要 Node.js 22.13 以上。

```bash
npm install
npm run dev
```

本機測試 AI 分析時，請在伺服器環境設定 `OPENROUTER_API_KEY`。前端只呼叫 `/api/analyze-meal` 與 `/api/search-food`，不得把金鑰放入 `VITE_` 變數或提交到 Git。

部署獨立 AI Worker 時，請使用 Cloudflare Secret 設定金鑰：

```bash
npx wrangler secret put OPENROUTER_API_KEY --config wrangler.ai.jsonc
```

每日照片 20 次、搜尋 50 次及兩秒冷卻需要建立 KV namespace，並把 Wrangler 回傳的 namespace id 綁定為 `AI_USAGE`：

```bash
npx wrangler kv namespace create AI_USAGE --config wrangler.ai.jsonc
```

將回傳的 id 加入 `wrangler.ai.jsonc` 的 `kv_namespaces` 後，再執行：

```bash
npx wrangler deploy --config wrangler.ai.jsonc
```

## 驗證與部署

```bash
npm test
npm run build:pages
```

推送到 `main` 後，GitHub Actions 會自動建立並更新 GitHub Pages。第一次建立 repository 後，請在 **Settings → Pages → Source** 選擇 **GitHub Actions**。
