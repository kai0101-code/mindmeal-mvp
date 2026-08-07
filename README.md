# MindMeal 有意食

MindMeal 是一款以「今天還差什麼，下一餐可以怎麼吃？」為核心的飲食導航 MVP。

## 團隊入口

- [產品需求 PRD](docs/PRD.md)
- [視覺與互動規範 DESIGN](docs/DESIGN.md)
- [開發任務與驗收 TASK](docs/TASK.md)
- [協作方式](CONTRIBUTING.md)
- 線上 MVP：GitHub Pages 啟用後會顯示於 repository 首頁右側

## 目前可測試流程

- 五步驟個人目標設定
- 今日營養 Dashboard
- 模擬 AI 餐點掃描與分析
- 飯量、醬料與食用狀況修正
- 儲存後更新營養進度
- 下一餐店家推薦與採買清單
- 七日趨勢與個人設定

AI、店家、地圖、定位與營養數值均為 MVP 示範資料，不構成醫療或營養處方。

## 本機開發

需要 Node.js 22.13 以上。

```bash
npm install
npm run dev
```

## 驗證與部署

```bash
npm test
npm run build:pages
```

推送到 `main` 後，GitHub Actions 會自動建立並更新 GitHub Pages。第一次建立 repository 後，請在 **Settings → Pages → Source** 選擇 **GitHub Actions**。
