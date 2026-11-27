# 效能與驗證紀錄

## 目前實際結果

| 項目 | 結果 |
| --- | --- |
| TypeScript 型別檢查、Vite production build | 通過 |
| 游標中心縮放（含上下限）、桌面／直式鏡頭邊界測試 | 通過，2 個測試案例，涵蓋多組比例及視窗尺寸 |
| 建築配置狀態與手勢邏輯 | 通過，13 個新增測試；加上鏡頭測試共 15 項 |
| 12 張 WebP 的尺寸、透明通道、SHA-256、檔案容量與動畫格線 | 通過，12 張素材全部符合 manifest |
| WebP 實際檔案容量 | 1,380,444 bytes（1.380 MB / 1.317 MiB） |
| 實際冷載入傳輸容量 | 未測，不以檔案容量代替網路傳輸量 |
| 桌面 FPS | 未測 |
| 手機實機 FPS／雙指縮放 | 未測 |
| 第二次重製素材的靜態排版檢查 | 已檢查；由共用座標與實際 WebP 排版，非 PixiJS 截圖 |
| 配置模式、晝夜、高亮、拖曳、遮擋的瀏覽器驗收 | 未完成 |

阻塞原因：managed preview 回報 `relay could not open browser port 4173: timed out waiting for relay readiness`。初始化並啟動雲端瀏覽器後再試仍相同。未改用另一個伺服器或繞過預覽基礎設施。本次配置模式實作後重新嘗試啟動專案預覽仍回報相同錯誤。無法由成功編譯或靜態排版圖推論瀏覽器操作或效能合格。

開發環境套件：PixiJS 8.23.0、Vite 7.3.8、TypeScript 5.9.3、Sharp 0.34.5、Node 24.22.3。實際鎖定版本見 package-lock.json。

## 配置模式驗證

自動測試使用網站實際引用的 `BuildingLayout` 與 `SceneGestures`，不是另寫的手勢模擬實作：

- 2× 鏡頭縮放下移動建築，世界座標、標籤、點擊位置及深度同步；鏡頭不被帶動。
- 一般模式拖曳鏡頭；配置模式拖空地仍移動鏡頭。
- 第二隻手指接手後保存單指移動，再縮放；剩下一隻手指時不意外拖動建築。
- 取消拖移回復原位且不保存；切換模式提交正在拖移的位置。
- 輕微抖動不誤判拖曳；最後一筆 pointerup 位置仍會處理。
- 三座建築的場景邊界、重疊時的拾取順序與同比例輪廓命中。
- 重新載入位置保存、還原只刪除此測試的儲存鍵。
- 損壞／舊版資料不部分套用；超出範圍的已儲存座標受限制；瀏覽器拒絕儲存時不報成功。

仍需實際瀏覽器確認：開啟配置模式，拖動三座建築；縮放後再拖；拖至互相遮擋；重新整理確認位置；還原配置；關閉配置模式驗證鏡頭拖曳。手機另驗證單指轉雙指、瀏覽器觸控取消與窄螢幕控制列。這些目前未標記為實測通過。

## 本機重現測量

1. `npm ci && npm test && npm run build && npm run preview`。
2. 用前景分頁開啟 production 網址；先在配置模式按還原配置並結束配置，以預設位置量測。關閉瀏覽器開發工具中的 CPU／網路節流，記下裝置型號、作業系統、瀏覽器版本與 GPU；不把遠端／模擬手機當成實機。
3. 使用下列 query 分別測量，每頁先暖機 5 秒，再採樣 60 秒；測量期間不要切換分頁或改變動畫／晝夜狀態：
   - `/?benchmark=day`
   - `/?benchmark=night`
   - `/?benchmark=day-paused`
   - `/?benchmark=night-paused`
4. 完成後 Console 會印出 `PALACE_BENCHMARK` JSON。也可在 Console 執行 `window.__palace.downloadMeasurements()` 下載 JSON，或讀取頁面中 `#benchmark-result` 的 JSON。測量入口不增加遊戲選單。
5. 平移／縮放情境：Console 執行 `window.__palace.benchmark('camera-interaction', 60)`，關閉 Console 後持續拖曳與滾輪操作，完成後下載。手機另以實機進行雙指測試。
6. 冷載入容量：使用無快取新分頁／停用快取後重新載入；記錄 JSON 的 `transferBytes`、`encodedBodyBytes` 及各資源清單。0 transferSize 可能表示快取，不能當成零成本。資料包含 HTML navigation 與同源子資源；原始 PNG 未載入。

採樣回傳：實際持續時間、幀數、平均 FPS、第 95 百分位幀時間、最低約 1 秒視窗 FPS、可見性／狀態中斷、視窗大小、DPR、renderer resolution、渲染後端、User Agent、素材 bytes、傳輸 bytes 及各資源資料。GPU 型號與裝置型號需人工補記。DPR 上限 2。

FPS 是 requestAnimationFrame/ticker 間隔推算，非 GPU 完成時間。背景分頁或狀態改變會標記 interrupted，該筆不可當成正常情境結果。高亮、鏡頭、巡邏遮擋仍需實際視覺驗收。
