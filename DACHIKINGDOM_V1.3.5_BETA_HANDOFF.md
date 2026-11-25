# 《大清帝國》v1.3.10-beta 人物立繪測試版：進度、待辦與操作手冊（已封存）

> **封存說明：**這是早期測試交接紀錄。相關功能已於 `v1.4.0` 整合至正式版；目前發布與驗證方式請以 `BETA_IMAGE_TESTING.md` 及正式 workflow 為準，以下操作不得當作現行正式部署指示。

> **v1.3.10-beta 補充：**新增8組皇子與8組公主的幼年／成年配對，共32個皇室圖片ID、96張WebP；總素材增為82個人物ID、246張WebP。皇嗣依永久皇室ID固定配對，0～15歲使用幼年圖，16歲起及成年入仕後使用同人物成年圖；舊存檔自動補配。上書房、宗人府、繼位、公主和親及皇室官員畫面已接入，圖片URL也加入版本參數避免舊快取。

> **v1.3.9-beta 補充：**既有50位角色的150張WebP已由修正版素材覆蓋，維持原本ID與人物固定對應；立繪更新為768×1152、頭像256×256、縮圖128×128，並同步更新素材容量驗證規格。遊戲數值、抽卡機率、存檔欄位與人物分配規則均未修改。

> **v1.3.8-beta 補充：**十連候選卡、官員／武將詳情及妃嬪詳情改回暖白底，並修正勾選候選人時頭貼短暫退回剪影；既有150張WebP尺寸、內容與固定人物對應完全不變。原 v1.3.5-beta 素材包檔名保留作為歷史來源。

> 文件建立：2026-11-24（臺灣時間）  
> 用途：讓專案維護者或後續開發者知道目前已做什麼、尚缺什麼、如何安全地把測試版跑起來，以及如何驗收。  
> **2026-11-24 實作更新：v1.3.10-beta目前含82個人物ID、246張WebP；新增皇子與公主幼年／成年圖片延續，GitHub Pages與獨立beta GAS部署結構維持不變。仍須完成桌面與手機Chromium核對，以及50／100／300／500人多輪效能驗收，切勿把此文件視為正式上線證明。**

## 1. 專案與安全界線

| 項目 | 位置 / 規則 | 目前狀態 |
|---|---|---|
| GitHub 專案 | <https://github.com/dennischu0116-boop/dachikingdom> | 已有 |
| 正式分支 | `main`，現行版 `v1.3.4` | **保持不變** |
| 圖片測試分支 | [`performance-image-beta`](https://github.com/dennischu0116-boop/dachikingdom/tree/performance-image-beta) | **已建立並有程式提交** |
| 測試版版本 | `v1.3.10-beta` | 已寫入測試分支 |
| 測試 GAS | 使用**不同於正式版**的 Script ID、部署與憑證 | **已建立並自動部署 beta 分支** |
| 圖片服務 | GitHub Pages：`https://dennischu0116-boop.github.io/dachikingdom/assets/characters/` | **已發布；每次 beta 素材推送自動更新** |
| 測試存檔 | `localStorage` 鍵 `qing_image_beta_saveData_v1` | 本機瀏覽器已驗證與正式鍵隔離 |
| 正式存檔 | `qing_saveData` 與正式 Google 雲端槽位 | **不得存取或覆寫** |
| 測試設備 | Chromium 1200×900 與 390×844 | 官員、妃嬪、候選舞台及響應式畫面已通過；完整效能驗收待辦 |

**絕對禁止：**直接將測試分支合併至 `main`、在測試環境使用正式 `.clasp.json` / 正式 Script ID、共用正式部署密鑰、讓測試版讀寫正式雲端存檔，以及在未驗證前宣稱效能合格。

## 2. 已完成：已推送到測試分支的程式與設定

這裡的「完成」表示檔案已實作；有標註本機驗證者才代表已在瀏覽器執行，仍不等同遠端部署或完整效能驗收。

- [x] **圖片測試分支**：建立 `performance-image-beta`；目前測試版版本為 `v1.3.10-beta`。
- [x] **圖片管理模組**：新增 `ImageBeta.html`，內含圖片 ID、三類人物圖片池、固定外貌分配、按需顯示圖片、載入失敗剪影。
- [x] **官員畫面**：`AppGovernment.html` 的官員清單加入縮圖，官員詳細資料加入較大的立繪。
- [x] **后宮畫面**：`AppWarAndMain.html` 的妃嬪列表加入縮圖與完整立繪檢視視窗。
- [x] **人物對應紀錄**：依人物 ID 管理圖片對應，優先避免在世人物撞臉，不足時允許重複；歸檔人物保留對應，不顯示歷史立繪。
- [x] **獨立本機存檔**：將測試版儲存鍵與正式版分離；匯入時加入存檔內容預覽，並嘗試備份原有測試資料。
- [x] **切斷部分正式端點**：測試版不顯示雲端存檔入口，`qingCloudGas` 在測試版拒絕執行，排行榜載入與提交加入測試版攔截；所有相關入口仍須實測核對。
- [x] **效能實驗室初版**：可切換 50 / 100 / 300 / 500 人，以及 A 無圖片、B 全預載、C 可見縮圖、D 可見縮圖加首張高清圖；具 FPS、畫格 P95、長任務、圖片載入情況、可得的記憶體與 DOM 數等監控，以及 JSON / CSV 匯出。
- [x] **素材路徑定義**：`assets/characters/manifest.json` 已列出82個圖片ID及246張全身、縮圖與近景頭貼，包含50組官員／妃嬪及32組皇室幼年／成年圖片。
- [x] **部署保護**：測試分支已移除正式 `.clasp.json`；原正式 GAS 工作流程在測試分支增加 `main` 限制；建立手動測試 GAS 部署與 GitHub Pages 發布工作流程。
- [x] **靜態檢查流程**：加入 `.github/workflows/verify-image-beta.yml`，檢查 Babel/JSX 可解析性、Manifest 數量及正式 `.clasp.json` 是否缺席。
- [x] **初版素材包**：已建立獨立 ZIP，含 50 個 WebP 完整立繪與 50 個 WebP 縮圖；為**角色設計表裁切的概念測試素材**，不是已單獨精修的正式立繪。
- [x] **素材整合**：50 張 768×1152 立繪、50 張 256×256 頭像與 50 張 128×128 縮圖已放入測試分支；尺寸、數量、Manifest 對應與檔案上限均通過檢查。
- [x] **安全測試伺服器**：新增僅供測試版的 `BetaServer.js`；GAS 工作流程只允許此伺服器與 HTML，會拒絕正式後端混入。
- [x] **可重現本機預覽**：`npm ci` 後執行 `npm run build:beta-preview`，以本機 HTTP server 開啟 `.beta-preview/index.html`。
- [x] **本機瀏覽器 smoke test**：官員／妃嬪圖片、500 人模式、量測面板、重新載入後外貌固定、正式存檔鍵未變更及 404 剪影備援均通過。

## 3. 已確定的功能規格

| 分類 | 數量 | 年齡外貌配額 |
|---|---:|---|
| 一般文官 | 12 | 青年 4 / 中年 5 / 年長 3 |
| 一般武官 | 10 | 青年 4 / 中年 4 / 年長 2 |
| 一般妃嬪 | 18 | 青年 8 / 中年 7 / 年長 3 |
| 十位特殊佳人 | 10 | 每位使用固定專屬圖片 |
| 皇子幼年／成年 | 16 | 8組固定人物配對 |
| 公主幼年／成年 | 16 | 8組固定人物配對 |
| **合計** | **82** | 每個ID各有完整立繪、頭像與縮圖 |

十位特殊佳人的程式 ID：`diao_chan`、`wang_zhaojun`、`xi_shi`、`yang_yuhuan`、`zhen_mi`、`yu_ji`、`zhao_feiyan`、`zhangsun`、`xiaozhuang`、`wei_zifu`。

- 美術：精緻古風遊戲插畫、人物透明背景，完整立繪 2:3（規劃尺寸 512 × 768）、清單縮圖 128 × 128。
- 原則：人物首次分配後不換圖；共享圖片池盡量避免在世角色撞臉；官員、妃嬪圖片池獨立。
- 顯示：只在官員與妃嬪的清單及詳情顯示。歷史人物只保存圖片對應，測試版不顯示。
- 效能：列表優先懶載入；高清圖片只在詳細視窗需要時讀取；失敗時顯示古代人物剪影；本階段不新增動畫、不改遊戲數值。
- **注意：**「4 個並行下載任務上限」是原先的設計目標，**目前程式並未完成獨立下載佇列的嚴格併行控制**；必須補做或經效能測試決定是否需要。

## 4. 未完成事項：依優先順序

| 優先級 | 待辦 | 完成定義 |
|---|---|---|
| 完成 | **將 100 張 WebP 整合至測試分支** | `portraits/` 50 張、`thumbs/` 50 張，檔名與 Manifest 完全一致 |
| P0 | **設定 GitHub Pages** | 50 張對應路徑可正常回應圖片，而不只是 Manifest 有資料 |
| P0 | **建立獨立測試 GAS** | 取得測試 Script ID，與正式版 ID 不同；安全核對部署權限 |
| 完成 | **跑一次非部署靜態驗證** | Babel/JSX、Manifest、WebP、部署隔離及本機預覽建置均通過 |
| P0 | **在測試 GAS 部署並驗證網頁** | 可用測試網址開啟，且完全未更新正式 Script ID |
| 部分完成 | **確認存檔與雲端真正隔離** | 本機已確認正式 localStorage 鍵不變、測試伺服器無雲端端點；遠端 GAS 仍待部署後核對 Network／日誌 |
| P1 | **功能驗收** | 官員與妃嬪功能、讀檔、編輯、年度結算、圖片錯誤回退均正常 |
| P1 | **效能驗收** | 桌機多次測試，匯出 JSON/CSV，比較 A/B/C/D、50–500 人、冷/暖快取 |
| P1 | **完善監控統計** | 確認跨來源資源統計、下載量/快取語意、P50/P95、實驗重複次數與計數邏輯無誤 |
| P1 | **實作/評估下載佇列與清單虛擬化** | 根據實測確認是否需要限制並行 4 個、避免 500 筆 DOM 引發卡頓 |
| P2 | **美術精修** | 將概念切圖逐一改善成統一品質的透明背景單人插畫 |
| P2 | **正式版整合評估** | 僅在測試通過、重新確認更新範圍後討論；目前不得合併至 `main` |

## 5. 實際操作：上傳人物 WebP 素材

### 5.1 準備素材

1. 從本次 ChatGPT 對話下載：`dachikingdom-v1.3.5-beta-character-assets.zip`。
2. 在電腦解壓縮。ZIP 的根目錄包含 `portraits/`、`thumbs/`、`manifest.json` 和 `README.txt`。
3. **只使用 ZIP 內的 `portraits/` 與 `thumbs/`。不要用 ZIP 內的 `manifest.json` 覆蓋 GitHub 測試分支的 `assets/characters/manifest.json`：兩者資料結構不同。**
4. 目標結構如下：

```text
assets/
  characters/
    manifest.json               # 保留 GitHub 分支既有版本
    portraits/                  # 50 張完整立繪
      civil_young_001.webp
      ...
      special_diao_chan.webp
    thumbs/                     # 50 張縮圖
      civil_young_001.webp
      ...
      special_diao_chan.webp
```

### 5.2 Git 指令範例（使用者本機終端機）

在有 Git 的電腦執行，**不要切換到 `main` 進行素材提交**：

```bash
git clone https://github.com/dennischu0116-boop/dachikingdom.git
cd dachikingdom
git fetch origin
git switch performance-image-beta

# 將 ZIP 解壓到臨時資料夾（使用自己的實際路徑）
unzip /path/to/dachikingdom-v1.3.5-beta-character-assets.zip -d /tmp/qing-beta-art
mkdir -p assets/characters/portraits assets/characters/thumbs
cp /tmp/qing-beta-art/portraits/*.webp assets/characters/portraits/
cp /tmp/qing-beta-art/thumbs/*.webp assets/characters/thumbs/

git status
# 只加入圖片檔，不加入 ZIP 內的 manifest.json
git add assets/characters/portraits assets/characters/thumbs
git commit -m "Add 50 beta portrait concepts and 50 thumbnails"
git push origin performance-image-beta
```

Windows 可改用檔案總管將兩個資料夾複製到測試分支的專案目錄，再使用 GitHub Desktop 提交。若開發時需要 GitHub Pages，素材應公開可讀，避免在 Pages 發布任何私密檔案。

### 5.3 檢查圖片路徑

發布後可以用瀏覽器檢查以下預期路徑（**未發布前可能 404；網址目前是預定路徑而非已上線保證**）：

```text
https://dennischu0116-boop.github.io/dachikingdom/assets/characters/portraits/special_diao_chan.webp
https://dennischu0116-boop.github.io/dachikingdom/assets/characters/thumbs/civil_young_001.webp
https://dennischu0116-boop.github.io/dachikingdom/assets/characters/manifest.json
```

## 6. 實際操作：設定 GitHub Pages

1. 進入 GitHub 儲存庫 → **Settings → Pages**。
2. 工作流程的 `actions/configure-pages` 會先嘗試自動啟用 Pages；若權限不允許，請確認有管理權後手動選擇 **GitHub Actions** 作為發布來源。不要誤把整個 GAS 程式碼目錄當成公開網站發布。
3. 檢查 `performance-image-beta` 上的 `.github/workflows/deploy-image-beta-pages.yml`。此流程會先確認 100 個 WebP 是否齊全，再只上傳 `assets/characters/` 所需靜態資源。
4. 從 **Actions** 找到 `Publish beta character assets to GitHub Pages (manual)`，選擇測試分支手動執行（**若工作流程只存在於非預設分支，GitHub 可能不提供手動執行入口；不要因此擅自複製到 `main`，先依 GitHub 當下的工作流程可見性設定設計安全替代方案**）。
5. 等工作流程回報成功後，檢查前述三個 URL 能否開啟；如不存在，先確認 Pages 網址、分支、部署產物的目錄層級與是否需重新整理快取。
6. 在瀏覽器 Network 分頁確認圖片 HTTP 狀態 200，以及檔案類型 `image/webp`。圖片 404 時測試版可能只顯示剪影，這不是成功載入圖片的證據。

**特別提醒：**GitHub Pages 一個儲存庫的 Pages 發布狀態可能是共用的；此測試方案不能保證覆蓋/重新配置 Pages 不影響其他已使用該儲存庫 Pages 的網站。若儲存庫已有 Pages 正式用途，需先確認不會破壞既有發布。

## 7. 實際操作：建立獨立 Google Apps Script 測試版

1. 到 <https://script.google.com/>，**新建一個專門用於 v1.3.5-beta 的 Apps Script 專案**，不要複製到正式 Script ID 後就直接推送。
2. 在新的 GAS 專案 → **專案設定（Project Settings）** 找到 **Script ID**。
3. 核對測試 Script ID **與正式 GAS 不同**。本文件不記錄任何正式或測試 Script ID 的真值。
4. GitHub 儲存庫 → **Settings → Secrets and variables → Actions → New repository secret**，加入：

   | 名稱 | 必須填入 | 注意 |
   |---|---|---|
   | `BETA_GAS_SCRIPT_ID` | 新建立的測試 GAS Script ID | **不可使用正式 Script ID** |
   | `CLASPRC_BETA_JSON` | 測試部署用、經授權的 clasp 登入憑證 JSON | **不可直接複製正式 `CLASPRC_JSON`** |

5. 檢查測試分支 `.github/workflows/deploy-beta-gas.yml` 的內容，它使用上述秘密變數產生本次執行環境的 `.clasp.json`，然後推送 GAS 原始碼。
6. 同樣地，因為 `workflow_dispatch` 工作流程可能必須先存在於預設分支才能從 GitHub 介面手動執行，**現在不可假定測試工作流程已能被按鈕觸發**；需先確認 Actions 介面可見性，必要時由維護者使用本機、**明確指定測試 Script ID** 的 clasp 流程，或先設計不會觸發正式部署的替代方案。
7. 部署前必須核對 GAS 工作流程實際會複製哪些檔案、`rootDir` 設定與 `.gs/.html/appsscript.json` 是否齊全；新 GAS 後端若缺少原專案必要的伺服器函數，不應直接發布為可玩版。
8. 僅在**測試 GAS** 執行程式推送後，才到該 GAS 專案的 **Deploy → New deployment → Web app** 建立新的測試 Web App 部署（執行身分、權限依需求設定）。不要在正式專案按部署。
9. 記錄獨立測試 Web App 網址，測試版開啟時應顯示 `v1.3.5-beta`，不應顯示正式版 `v1.3.4`。

**部署前額外檢查：**不要只隱藏雲端 UI，就認定沒有後端副作用。需要從程式端與 Network/Apps Script 記錄確認所有 Google 雲端、排行榜、存檔的正式寫入端點都不會被呼叫。對不確定的後端設定，先停止部署並查明。

## 8. 實際操作：讀入正式版存檔副本

1. 到**正式版**，透過原有系統設定手動匯出完整存檔 TXT / 代碼，另存一份安全備份。
2. 確認已進入**v1.3.5-beta 獨立測試 Web App**，而不是正式遊戲網址。
3. 從系統設定選擇匯入（或代碼讀檔），貼上正式版存檔代碼，或選取原先下載的 TXT/JSON 檔。
4. 系統先顯示年號、年份、官員數、妃嬪數及遊戲 ID。核對無誤，再按「確認匯入測試版」。
5. 匯入後關閉重開測試 Web App，核對年份與人物圖仍一致；測試版只用 `qing_image_beta_saveData_v1` 儲存。
6. 不要用測試版的備份反向覆蓋正式版存檔。測試版不提供雲端同步；換裝置或清除瀏覽器網站資料前務必先備份。

**已知限制：**目前匯入前備份是 best-effort（遇到本機容量不足會警告）；保存前的原子性、錯誤恢復及非常舊格式存檔仍需要真實測試，不應宣稱百分之百保證安全。

## 9. 實際操作：圖片效能實驗室

1. 使用**桌面版**瀏覽器開啟測試 GAS Web App。
2. 點擊遊戲上方的「🧪 圖片效能實驗室」。
3. 人物數量先選 50，再依序測 100、300、500。
4. 模式依序測：A 無圖；B 全預載；C 可見縮圖；D 可見縮圖＋首張高清圖。
5. 每種模式向下捲動清單，觀察圖片請求及 FPS、P95 畫格、長任務、DOM 數、圖片完成數與失敗數。
6. 使用「匯出 JSON」及「匯出 CSV」保存測試結果，命名時包含日期、模式、人物數量與冷/暖快取狀態。
7. 每種配置至少重複 5 輪，並使用一致的視窗尺寸、瀏覽器版本、資料集與網路條件。冷快取測試可透過 DevTools 的 Disable cache（僅在 DevTools 開啟時有效），暖快取則關閉該選項後重跑。
8. 另外在正常遊戲中，核對官員與妃嬪列表的縮圖、點擊詳情的高清圖、失敗剪影以及存檔後重新讀取時的圖片一致性。
9. 依據無圖版（A）作為效能對照；對照實驗室本身的額外 UI/React 成本，不能把所有差異歸咎於圖片。

**注意監控限制：**`performance.memory` 在部分瀏覽器不存在；跨來源圖片沒有合適的 `Timing-Allow-Origin` 時，資源下載大小及詳細時序未必可得；HTTP 快取命中不能單憑圖片元素 `onLoad` 判斷。資料顯示 0 與「無法測量」意義不同。完整的 P50/P95 指標、長時間多次採樣、自動測試報表以及併行 4 任務控制仍屬待加強事項。

### 暫定驗收條件（尚未實測）

| 指標 | 工程目標 | 驗證方式 |
|---|---|---|
| 縮圖檔案 | ≤ 30 KB / 張 | 檢查 WebP 實際檔案大小 |
| 高清立繪 | ≤ 150 KB / 張 | 檢查 WebP 實際檔案大小 |
| 頁面開啟延遲 | 相對無圖基準，P95 增量 ≤ 300 ms | 相同裝置/條件下重複採樣 |
| 捲動流暢度 | P95 畫格間隔 ≤ 33 ms | 一致的清單捲動情境 |
| 500 人情境 | 不在進入清單時下載全部 500 張圖片 | DevTools Network 觀察 |
| 圖片失敗 | 缺圖時正常顯示剪影，遊戲仍可操作 | 模擬 404 / 網路離線 |
| 記憶體 | 重複切換、開關詳情後沒有持續累積趨勢 | 觀察記憶體與 Chrome Performance |
| 正式版安全 | 正式存檔/正式 GAS/排行榜零寫入 | 比對正式環境、測試 GAS 日誌與呼叫 |

如果未達到目標，**不要合併至 `main`**。先記錄問題與重現條件，調整圖片大小、快取、下載佇列或清單渲染方式，再重新測試。

## 10. 已知風險與常見問題

| 問題 / 現象 | 先確認 | 處理原則 |
|---|---|---|
| 所有人物都是剪影 | Pages 尚未部署、圖片路徑 404、Manifest 與實際檔名不相符 | 確認 100 張 WebP 都可取得；不要盲目修改圖片 ID |
| GitHub Actions 沒有「Run workflow」 | 手動工作流程只存在於測試分支 | 不要為了顯示按鈕將測試部署檔直接合併 `main`；先改採安全的獨立操作流程 |
| GAS 網頁空白或錯誤 | JSX 語法、Include 順序、伺服器檔案或使用者權限 | 先看靜態檢查與 Apps Script Logs，再修正測試分支 |
| 測試版登入 Google / 出現正式排行榜操作 | 後端還有未隔離的直接呼叫 | 立即停止測試，檢查端點及寫入歷史 |
| 重新讀檔人物換臉 | 視覺對應紀錄是否隨存檔保存、是否使用相同 gameId | 不能只靠姓名或圖片陣列位置分配 |
| 500 人清單卡頓 | DOM 行數、React 更新、圖片解碼與傳輸 | 對照 A/B/C/D，再判斷是否需要虛擬化 |
| 檔案容量超過目標 | 個別透明 WebP 的實際大小 | 逐張重壓縮；不能只看整個 ZIP 大小 |
| 測試版無雲端備份 | 這是刻意的隔離策略 | 定期匯出本機存檔 |

## 11. 後續維護者建議依序執行

- [x] 完整檢查 `performance-image-beta` 的語法與依賴，包括 `ImageBeta.html`、存檔轉換及雲端讀寫隔離。
- [x] 整合 150 張 WebP；保留 GitHub 版本的 Manifest。
- [x] 確認 GitHub Pages 發布只包含公開人物素材，不影響 GAS 原始碼。
- [x] 驗證靜態 CI 與 beta 自動部署工作流。
- [x] 獨立建立測試 GAS Script ID、權限及部署設定；與正式 GAS 隔離。
- [ ] 以本機 Web App 預覽核對 `v1.3.9-beta`、白底候選卡、官員與妃嬪詳情及候選頭貼穩定顯示。
- [ ] 手動匯入正式存檔副本，確認不會修改正式版。
- [ ] 完成官員、后宮、存檔、錯誤處理的功能測試。
- [ ] 完成 50 / 100 / 300 / 500 人效能對照，至少五輪，整理報告。
- [ ] 修正實測發現的問題並重新驗證；**取得額外確認後**才討論正式版整合。

## 12. 重要檔案索引

| 檔案 | 用途 |
|---|---|
| `Index.html` | GAS 首頁、載入順序與 `ImageBeta` Include |
| `ImageBeta.html` | 人物圖片表、分配邏輯、圖片元件及效能實驗室 |
| `AppGovernment.html` | 官員清單與詳情圖片 |
| `AppWarAndMain.html` | 妃嬪列表、詳細立繪、效能實驗室入口 |
| `AppState.html` | 圖片分配狀態、獨立存檔、匯入與測試隔離 |
| `ClientShell.html` | 本機存檔鍵、匯入介面及雲端介接阻斷 |
| `ClientRules.html` | 存檔格式正規化與圖片分配對應匯入 |
| `ClientContent.html` | v1.3.9-beta 版本說明、特殊佳人 ID |
| `assets/characters/manifest.json` | 50 名圖片 ID、50 張完整立繪、50 張縮圖與 50 張近景頭貼 |
| `.github/workflows/verify-image-beta.yml` | 非部署式靜態檢查 |
| `.github/workflows/deploy-image-beta-pages.yml` | beta 圖片素材 GitHub Pages 自動發布 |
| `.github/workflows/deploy-beta-gas.yml` | 獨立 GAS 手動備援部署 |
| `.github/workflows/deploy-gas.yml` | 正式部署流程；**不得用於測試版** |
| `.clasp.beta.example.json` | 測試 GAS 設定格式參考，不可直接使用佔位 ID |
| `BETA_IMAGE_TESTING.md` | 原有簡版測試說明 |
| `AGENTS.md` | 專案協作、版本確認、測試及部署規則 |

---

**交接結論：**v1.3.9-beta 已覆蓋150個修正版人物圖片素材，具備白底十連候選卡、白底官員與妃嬪詳情及穩定頭貼，並沿用GitHub Pages與獨立GAS部署結構。目前仍需實際畫面核對及多輪50／100／300／500人完整效能驗收；未另行確認前不得合併或部署至正式版。
