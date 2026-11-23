# 大清帝國 v1.3.5-beta 圖片測試分支

> 本分支為圖片測試版，**不得合併或部署到正式環境**。

## 目前完成狀態

- 已加入 50 張 512×768 WebP 立繪與 50 張 128×128 WebP 縮圖，檔名全部符合 `assets/characters/manifest.json`。
- 吏部／御花園清單按需讀取縮圖；官員詳情與妃嬪肖像視窗只在需要時讀取大圖。
- 固定人物圖片對照會跟測試專用存檔一起保存；圖片失敗時改顯示剪影，不中斷遊戲。
- 測試版只使用 `qing_image_beta_saveData_v1`，不讀寫正式版 `qing_saveData`。
- Google 登入、雲端存檔及排行榜讀寫在測試版停用。
- 圖片效能實驗室支援 50／100／300／500 人及 A～D 四種載入模式，可匯出 JSON／CSV。
- 本機靜態預覽已在 Chromium 通過圖片、存檔隔離、重新載入與失敗備援的自動化 smoke test。

## 本機實際測試

需要 Node.js 20+、npm、Python 3 與桌面瀏覽器。

```bash
git switch performance-image-beta
npm ci
npm run build:beta-preview
python3 -m http.server 4173 --bind 127.0.0.1
```

開啟：

```text
http://127.0.0.1:4173/.beta-preview/index.html
```

本機預覽會使用儲存庫內的圖片與 npm 依賴，不需要 GitHub Pages 或 GAS。`.beta-preview/` 是建置產物，不提交 Git。

建議依序測試：

1. 建立新遊戲，確認頂端顯示 `v1.3.5-beta`。
2. 進入吏部及御花園，確認清單縮圖與詳情立繪可顯示。
3. 開啟「圖片效能實驗室」，測試 50／100／300／500 人與 A～D 模式。
4. 重新整理頁面，確認人物外貌分配不變。
5. 在瀏覽器開發工具 Application → Local Storage 確認只新增 `qing_image_beta_saveData_v1`，正式鍵 `qing_saveData` 未被改動。

## 隔離與部署政策

- `main` 與正式 GAS 不得更動。
- `BetaServer.js` 是測試版唯一允許部署的伺服器程式，只提供頁面範本，不含 Spreadsheet、Drive、雲端存檔或排行榜端點。
- 測試 GAS 工作流程只會打包 `BetaServer.js`、HTML 與 `appsscript.json`，並在部署前檢查正式後端未混入。
- 測試 GAS 必須使用獨立的 `BETA_GAS_SCRIPT_ID` 與 `CLASPRC_BETA_JSON`；不得使用正式 Script ID 或憑證。
- GitHub Pages 工作流程只發布 `assets/characters/`，不發布 GAS 原始碼。
- 正式存檔只能先從正式版手動匯出，再將副本匯入測試版；不可讓測試版直接接觸正式雲端存檔。

## 尚待外部設定

1. 在儲存庫 Settings → Pages 選用 GitHub Actions，確認圖片 Pages URL 可讀。
2. 建立完全獨立的 Google Apps Script 測試專案與 Web App 部署；正式專案不可使用。
3. 在實際目標桌機上完成多輪冷／暖快取性能驗收並保留 JSON／CSV 結果。
4. 目前素材是角色概念表裁切圖；正式上線前仍需逐張美術精修。

## 效能驗收目標

- 每個 A～D 模式測 50、100、300、500 人，每組至少 5 次並比較冷／暖快取。
- 縮圖 ≤30KB／張，高清圖 ≤150KB／張；目前素材已通過檔案大小檢查。
- 頁面 P95 額外延遲 ≤300ms，捲動 P95 畫格間隔 ≤33ms（與無圖對照）。
- 瀏覽器不提供跨來源時序時須標記「無法測量」，不可填成 0。
- 本機 smoke test 只證明流程可運作，不等同上述完整性能門檻已達標。

## 已知限制

- 人物分配以首次記錄的文／武側重與年齡挑選圖片，之後不會自動換臉。
- GitHub Pages 尚未確認發布成功時，遠端 GAS 版可能只顯示剪影；本機預覽不受影響。
- 圖片效能實驗室的跨來源傳輸統計仍需在真實 Pages＋GAS 部署驗證。
- 若清除瀏覽器網站資料，測試版進度可能消失，請先匯出備份。
