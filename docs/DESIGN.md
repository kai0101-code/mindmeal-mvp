# MindMeal（有意食）MVP 視覺與互動設計規範

**設計目標：** 讓使用者在 3 秒內知道「今天還差什麼」，並以單手完成主要操作。

## 1. 設計方向

關鍵字：Simple、Clean、Healthy、Friendly、Modern、Light、Breathing、Less Text、AI Assistant。

參考氣質：Apple Health 的清楚層級、Oura 的健康感、Arc Browser／Nothing 的品牌辨識、Headspace 的友善；僅作方向參考，不複製既有介面。

核心原則：

- 先顯示方向，再補充數據。
- 讓重要資訊一眼可讀，避免圖表堆疊。
- 一個畫面只保留一個主要動作。
- 使用大量留白與少量高彩度品牌色。
- 動畫提供狀態回饋，不做炫技。
- 所有健康提示保持溫和、不責備。

## 2. 品牌

- 中文名稱：有意食
- 英文名稱：MindMeal
- 標語：Eat with Intention.
- 品牌概念：有意識地吃，而不是被數字控制。
- 視覺元素：微量波浪、不規則柔和圓弧、呼吸感人體輪廓。

## 3. 色彩系統

| Token | 色碼 | 用途 |
|---|---|---|
| `--color-primary` | `#FF5408` | 主要 CTA、重點數字、掃描按鈕 |
| `--color-accent` | `#EDFF03` | 品牌點綴、選取狀態、局部高亮 |
| `--color-bg` | `#F7F7F5` | App 背景 |
| `--color-surface` | `#FFFFFF` | 卡片與表單 |
| `--color-border` | `#EDEDED` | 分隔線、未完成進度 |
| `--color-text` | `#111111` | 主要文字 |
| `--color-text-secondary` | `#7C7C7C` | 次要文字 |
| `--color-success` | `#34C759` | 完成與正向狀態 |
| `--color-warning` | `#FF9500` | 需注意但不責備的提示 |

高彩度橘與黃不應同時大面積鋪滿；背景以淺灰／白為主，色彩只標示焦點。文字與背景需維持可讀對比，不以螢光黃承載小字。

## 4. 字體與文字層級

優先使用系統字體：`-apple-system, BlinkMacSystemFont, "SF Pro Display", "Noto Sans TC", sans-serif`。

| 樣式 | 建議尺寸 | 字重 | 用途 |
|---|---:|---:|---|
| Display Number | 64–72px | 600 | 今日剩餘熱量、平衡分數 |
| Page Title | 40–48px | 700 | Welcome／關鍵結果 |
| Section Title | 22px | 600 | 卡片區段標題 |
| Body | 16px | 400 | 主要說明 |
| Label | 14px | 500 | 控制項與營養標籤 |
| Caption | 13px | 400 | 補充說明、估算提示 |

文案盡量一至兩行；避免連續長段落與全大寫英文。

## 5. 版面與間距

- Mobile first，設計基準寬度 390–430px，最大內容寬度 430px。
- 使用 8pt grid；常用間距為 8、16、24、32、40px。
- 左右頁面留白 20–24px。
- 遵守頂部與底部 safe area，兼容 Dynamic Island。
- Bottom Navigation 視覺高度約 72px，含 safe area 後約 88px。
- 主要 CTA 優先放在單手拇指可及區。

## 6. 形狀與陰影

- 大卡片圓角：32px。
- 一般卡片：24px。
- 按鈕：24px；膠囊按鈕可用 999px。
- 輸入欄位：20px。
- 陰影：模糊 24px、黑色約 8% 不透明度，避免厚重或多層陰影。
- 卡片可用 1px 淺灰邊界協助分層。

## 7. 核心元件

### 按鈕

- Primary：橘底、白字，最小高度 52px。
- Secondary：白底、深色字、淺灰邊框。
- Icon／Floating Scan：中央突出，可用橘色圓形或膠囊形。
- Disabled：降低對比，但仍需清楚可辨。

### 表單與選擇

- Onboarding 一頁一組問題。
- 選項使用大面積 choice chip／card，整張可點。
- 顯示清楚的已選狀態與五步進度。
- 數值欄位提供單位；錯誤訊息就近呈現。

### 營養資訊

- 優先使用水平 Progress Bar，不使用多個相似甜甜圈。
- 每列包含營養名稱、目前值／目標值與視覺進度。
- 超出建議值時不用紅色警報，改以文字提供下一步。

### 卡片

- AI Insight Card：一句缺口＋最多四個具體選項。
- Restaurant Card：店名、距離、適配理由、簡化評分與 CTA。
- Food Card：食物名、份量與估算營養。
- Glass Card 僅少量使用，不犧牲文字對比。

### AI 人體

- 使用簡潔平面人體輪廓，不做寫實 3D 或卡通角色。
- 以柔和光暈標示當日需求區域；需同時有文字說明，不能只靠顏色傳意。

## 8. 頁面設計規格

### Splash／Welcome

- 白色或淺灰背景，中央品牌。
- 底部可有緩慢流動的螢光黃波浪。
- Welcome 只保留主問題與「開始」CTA。

### Onboarding

- 五步進度條與返回操作。
- 基本資料、目標、偏好、外食、結果各自成頁。
- 趣味文案短且與選項相關，不阻斷任務。

### Dashboard

由上至下：

1. 品牌／問候與連續紀錄。
2. Hero：「今天還差」＋大型剩餘熱量。
3. 「開始記錄」主要 CTA。
4. 今日營養 Progress Bars＋AI 人體。
5. AI Insight。
6. 下一餐推薦預覽。
7. 已完成餐次與平衡分數。
8. Bottom Navigation。

首頁不堆疊過多圖表，首屏需清楚看見核心數字與記錄 CTA。

### Scan／AI Analysis

- Camera 畫面使用柔和圓角框，不做厚重黑框。
- 掃描中顯示細緻掃描線與明確狀態。
- 分析頁順序：食物圖 → 辨識食物 → 營養 → 份量／醬料修正 → 儲存。
- 儲存後顯示短暫成功狀態及下一步選擇。

### Next Meal／Nearby

- 先顯示營養缺口，再顯示店家與採買選項。
- 地圖是輔助，不應蓋過建議理由。
- 店家卡可橫向滑動；採買清單以大尺寸 checkbox 呈現。

### Trend

- 只保留本週熱量、蛋白質、體重、飲水與平衡分數卡。
- 圖表標籤清楚，使用者不需學習即可理解趨勢。

### Profile

- 分組列表呈現每日目標、健康資料、偏好、通知、定位與帳號。
- 切換控制提供文字狀態，不只靠顏色。

## 9. 導覽

Bottom Navigation 共五項：Home、Trend、Scan、Nearby、Profile。Scan 置中並突出。當前頁需同時以圖示與標籤狀態辨識；頁面切換後保留使用者資料與今日狀態。

## 10. 動態與回饋

- 整體：Slow、Soft、Ease Out。
- Logo：微幅漂浮／波浪流動。
- Card：淡入上移，距離小於 16px。
- Progress：資料載入或更新時平滑填滿。
- Camera：掃描線循環。
- Bottom Navigation：輕微 spring，但不跳動過度。
- AI 人體：緩慢呼吸光暈。
- 尊重 `prefers-reduced-motion`，關閉非必要動畫。
- 單次轉場建議 180–400ms，背景氛圍動畫可更慢。

## 11. 狀態設計

- Loading：說明正在分析，不只顯示 spinner。
- Empty：「今天還沒有紀錄。拍下第一餐，AI 幫你開始分析。」
- Error：指出可恢復動作，例如重新拍攝或手動新增。
- Permission denied：解釋定位用途，提供「稍後再說」與手動選區。
- Offline：核心流程與既有假資料仍可操作。
- Success：回饋已儲存，並提供「回到今天」及「看下一餐」。

## 12. 無障礙與響應式驗收

- 可點區域至少 44×44px。
- 鍵盤可走完所有表單與主要操作。
- 有可見 focus 樣式；圖示按鈕有文字標籤或 `aria-label`。
- 色彩不是唯一的狀態提示。
- 一般文字達 WCAG AA 對比目標。
- 支援 320px 至桌面寬度；桌面上以手機容器置中但不裁切。
- 字體放大後，重要內容與 CTA 不重疊。

## 13. 原型實作建議

- 以單一離線 HTML 搭配 CSS／JavaScript 實作，無外部 CDN 依賴。
- CSS 使用 design tokens 管理色彩、圓角、間距、陰影與動態。
- 使用內嵌 SVG 或 CSS 圖形，避免依賴遠端圖示。
- 狀態資料集中管理，並用 localStorage 保存 onboarding 與餐點。
- AI、地圖、定位、語音及條碼明確標示為模擬體驗。
