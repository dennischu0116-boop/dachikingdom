# 前端重新設計測試環境

基於 v1.4.4，維持遊戲玩法、數值及本機存檔格式。測試專用修改不增加正式版本號。

- 分支 `frontend/redesign-gas-test`
- GAS `https://script.google.com/home/projects/1aLEZaabh42IV9BTWEz9JXEehVolipj37eq330UwY9iyGLA3wMbNgupeZ/edit`
- Workflow `Deploy frontend test GAS`，僅在此分支上傳至指定新 GAS。

## 本次更新

測試版免登入，隱藏 Google 登入及雲端存檔入口，使用獨立瀏覽器本機存檔。排行榜提供 24 筆固定假資料，涵蓋七種榜單所需數值、長名稱、不同年號及統一／未統一狀態。所有成績上傳、歷史成績匯入及 OAuth 均停用，後端不包含 Drive 或試算表讀寫程式。

不需要執行 `setupTestEnvironment()`、`setupLeaderboard()` 或 `setupCloudSaves()`，也不需要 OAuth、試算表或存檔資料夾。如果之前已建立測試資料，它們會保留但不再使用。

## 開啟測試版

1. 等待 `Deploy frontend test GAS` 成功。
2. 在新 GAS 選擇「部署 → 新增部署作業 → 網頁應用程式」，執行身分選擇自己，依測試對象設定存取權限。
3. 若已有測試部署，選擇「管理部署作業 → 編輯 → 新版本 → 部署」。
4. 開啟測試 `/exec`，直接建立遊戲。頁面標示測試版，排行榜標示固定假資料。

GAS 本身若要求部署者授權，依 Google 畫面完成即可；遊戲不需要 Google 登入。程式上傳不會自動更新既有 `/exec` 部署版本。

## 資料與部署隔離

`stage-gas-test.mjs` 在 `.gas-test` 產生 16 個應用程式檔案，替換為測試後端、獨立本機儲存鍵及測試介面。正式根目錄程式及 `.clasp.json` 保留原狀供正式驗證使用，**不要在根目錄執行 clasp push**。workflow 只在 `.gas-test` 使用測試專案設定，並要求上傳日誌確認 16 個檔案。

既有測試本機遊客進度與偏好繼續沿用。舊測試雲端登入及綁定不會恢復，雲端資料不會下載或刪除。正式玩家存檔、登入與偏好不讀取、不搬移。人物圖片繼續使用既有公開圖庫。

前端修改仍編輯根目錄 HTML，由打包流程產生測試版。正式 main 不受影響，合併與正式部署另行確認。

## 驗證

```sh
npm ci
npm run verify:production
npm run build:beta-preview
node scripts/stage-gas-test.mjs
node scripts/verify-gas-test.mjs
```

驗證包含 JSX 編譯、儲存鍵隔離、假資料一致性、不呼叫 Google 資料服務、免登入入口及成績上傳停用後仍完成回呼。
