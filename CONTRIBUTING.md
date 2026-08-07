# 團隊協作方式

## 建議流程

1. 從最新的 `main` 建立功能分支，例如 `feature/meal-history`。
2. 一個分支只處理一個可驗收的目標。
3. 開發前在 `docs/TASK.md` 找到對應任務或補上新任務。
4. 完成後執行 `npm test` 與 `npm run build:pages`。
5. 建立 Pull Request，說明使用情境、變更內容、測試方法與畫面差異。
6. 至少一位團隊成員確認後再合併至 `main`。

## 分支命名

- `feature/功能名稱`
- `fix/問題名稱`
- `docs/文件名稱`
- `experiment/假設名稱`

## Pull Request 檢核

- [ ] 變更對應 PRD 或已說明新假設
- [ ] 手機寬度 390px 可正常操作
- [ ] 核心流程沒有死路
- [ ] 文案溫和、具體、無責備
- [ ] 示範資料沒有被描述成真實醫療建議
- [ ] 自動測試與 Pages build 通過

## 產品決策記錄

若調整核心流程、資訊架構或視覺規則，請同步更新 `docs/PRD.md`、`docs/DESIGN.md` 或 `docs/TASK.md`，避免設計與程式碼各自演進。
