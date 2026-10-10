# AI 營養協作平台（第二階段互動原型）

跨住院、社區、居家的高齡營養照護協作原型：ICOPE 營養初篩 → MNA-SF 篩檢 → GLIM 診斷與嚴重度分級，並提供追蹤任務、團隊訊息、趨勢與週報。

公開網站：https://yht5582-source.github.io/ai-icope-bmi-ai-ai-ai/

> 教學與需求討論用原型，不取代臨床判斷，也不是醫療器材。工作台分級規則與 AI 餐食辨識未經驗證。

## 分頁

| 分頁 | 內容 |
| --- | --- |
| 01 全期總覽 | 個案數、營養不良／有風險、待辦任務；體重減輕、攝食不足、吞嚥警訊、社區需追蹤；個案工作台（依分級篩選）；全期趨勢（體重、BMI、MNA-SF、攝食量、白蛋白） |
| 02 評估建檔 | 新個案或既有個案的追蹤評估；右側即時判讀 |
| 03 臨床端 | ICOPE／MNA-SF／GLIM 明細、每日熱量蛋白質目標、處置建議（可一鍵加入追蹤）、評估紀錄；餐食紀錄（吃了幾成 → 帶入攝食量）；關懷追蹤與照會；團隊訊息 |
| 04 社區端 | 社區／居家需追蹤名單（可直接回寫訪視評估）、衛教重點、跨場域照護路徑 |
| 05 資料與方法 | 週報 CSV／列印、JSON 備份與匯入、示例個案、清除本機資料；判讀邏輯與驗證狀態、參考文獻、免責聲明 |

## 判讀邏輯

- **ICOPE 營養初篩**（WHO 2019）：3 個月非刻意體重減輕 >3 kg 或食慾不好，任一為是即陽性 → 進行 MNA-SF。有 3 個月前體重時第 1 題自動判定。
- **MNA-SF**（Kaiser 2009）：A–F 共 14 分；12–14 正常、8–11 有風險、0–7 營養不良。B（體重減輕）與 F（BMI；無 BMI 時用小腿圍）由體位資料自動計算。題目為摘要改寫，正式紀錄請用 Nestlé 官方表單。
- **GLIM**（Cederholm 2019）：≥1 表現型（6 個月內體重減輕 >5%；BMI 亞洲切點 <70 歲 <18.5、≥70 歲 <20；經驗證方法的肌肉量減少）＋ ≥1 病因型（攝食 ≤50% 需求 >1 週或任何減少 >2 週；慢性腸胃吸收問題；發炎）。嚴重度依 GLIM 表 4；只由 BMI 判定為第 2 級時會提示亞洲嚴重度切點尚未建立。
- **工作台分級**（本頁作業規則）：營養不良＝GLIM 確診或 MNA-SF ≤7；有風險＝MNA-SF 8–11，或 ICOPE 陽性但 MNA-SF 未完成；正常＝MNA-SF ≥12 或 ICOPE 陰性；其餘為資料不足。
- **目標**：熱量 30 kcal/kg、蛋白質 ≥1.0 g/kg（ESPEN 2019，需個別調整）；ONS 建議每日 ≥400 kcal、蛋白質 ≥30 g。
- **白蛋白／CRP** 只記錄與畫趨勢，不納入分級（ASPEN 2021）。
- 趨勢圖只畫實際輸入的評估，不再產生推估資料。

## 資料保存

資料存在瀏覽器 `localStorage`（鍵值 `ai-nutrition-v4`），不會上傳。換瀏覽器、無痕視窗或清除網站資料會遺失，請用「匯出備份（JSON）」保存。

舊版（v1–v3）資料會在第一次開啟時自動轉入：保留 BMI、白蛋白、攝食量、吞嚥與 ICOPE 勾選，舊版自動產生的趨勢資料不轉入，重複的個案編號會重新編號。轉入的個案標示「舊版」，請新增一次完整評估。舊版資料在「清除本機全部資料」時一併刪除。

## 開發

單檔 `index.html`。判讀引擎位於 `/*ENGINE-START*/ … /*ENGINE-END*/` 區塊，可獨立測試：

```bash
node tests.cjs
```

本機預覽：

```bash
python3 -m http.server 8803
```

部署：GitHub Pages，`main` 分支根目錄（legacy build）。

## 參考文獻

1. WHO. Integrated care for older people (ICOPE): guidance for person-centred assessment and pathways in primary care. 2019.
2. Kaiser MJ, et al. Validation of the MNA®-SF. J Nutr Health Aging 2009;13:782-8.
3. Cederholm T, et al. GLIM criteria for the diagnosis of malnutrition. Clin Nutr 2019;38:1-9.
4. Chen LK, et al. AWGS 2019 consensus update. J Am Med Dir Assoc 2020;21:300-7.
5. Volkert D, et al. ESPEN guideline on clinical nutrition and hydration in geriatrics. Clin Nutr 2019;38:10-47.
6. Evans DC, et al. Visceral proteins as nutrition markers: an ASPEN position paper. Nutr Clin Pract 2021;36:22-8.
