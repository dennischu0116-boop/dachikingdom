# 前端重新設計測試環境

基於 v1.4.4，玩法、數值與存檔格式維持原版。本次僅設定測試基礎設施，不增加正式版本號。

- 分支 `frontend/redesign-gas-test`
- GAS `https://script.google.com/home/projects/1aLEZaabh42IV9BTWEz9JXEehVolipj37eq330UwY9iyGLA3wMbNgupeZ/edit`
- Workflow `Deploy frontend test GAS`，只在此分支執行，使用既有 `CLASPRC_JSON` 對應帳號，該帳號必須有新專案編輯權限。
- 正式 `.clasp.json` 保留供正式驗證使用。**不要在 repository 根目錄執行 clasp push**。測試 workflow 在 `.gas-test` 中使用獨立設定上傳。

## 首次初始化

1. 等待測試 workflow 成功，在新 GAS 編輯器執行 `setupTestEnvironment()` 並完成 Google 權限授權。它會建立新的測試試算表和資料夾，再次執行會沿用已建立的資料。
2. 接著單獨執行 `setupLeaderboard()` 建立測試排行榜分頁。
3. 在新 GAS「部署 → 新增部署作業 → 網頁應用程式」，執行身分選擇自己，依測試對象設定存取權限，取得測試 `/exec` 網址。
4. 此時可以使用遊客模式測試前端。頁面顯示「前端測試版・獨立存檔」。
5. 若要測試 Google 登入，在 OAuth 用戶端加入新測試 `/exec` 的已授權重新導向 URI；可使用獨立測試 OAuth 用戶端。測試模式下須將測試帳號列入 OAuth 測試使用者。
6. 在新 GAS 指令碼屬性設定 `QING_CLOUD_CLIENT_ID` 與 `QING_OAUTH_CLIENT_SECRET`，然後執行 `setupCloudSaves()`。密鑰只填入 GAS，不貼在聊天或提交到 Git。
7. 後續分支推送僅上傳程式碼；要更新既有測試 `/exec`，使用「管理部署作業 → 編輯 → 新版本 → 部署」。

## 資料隔離與相容性

`stage-gas-test.mjs` 複製 16 個應用程式檔案至忽略追蹤的 `.gas-test`，替換測試版的資料存取與本機儲存鍵，加入測試標示，不改動正式來源。測試使用 `QING_TEST_SPREADSHEET_ID` 和 `QING_TEST_FOLDER_ID`，未初始化時會停止資料操作，不回退到正式資料。所有資料存取只允許指定的測試 GAS 專案。

初始化不複製正式玩家資料，也不讀取或遷移正式瀏覽器存檔、登入紀錄、偏好及舊排行榜紀錄。測試的五槽存檔及排行榜各有新的分頁。請勿將正式資料夾或試算表 ID 填入測試屬性。人物圖片仍讀取既有公開圖庫。

前端編輯仍修改根目錄 HTML；推送時重新產生測試版。正式 `main` 不受此流程影響。重新設計完成後，合併與正式部署需另外確認。

## 本機驗證

```sh
npm ci
npm run verify:production
npm run build:beta-preview
node scripts/stage-gas-test.mjs
node scripts/verify-gas-test.mjs
```

測試隔離驗證涵蓋 JSX 編譯、本機儲存鍵、錯誤 GAS 拒絕執行、未初始化停止讀寫、初始化重試不重建資料、錯誤資料夾拒絕存取。Google 權限授權與 OAuth 回呼仍需在新專案完成設定後驗證。
