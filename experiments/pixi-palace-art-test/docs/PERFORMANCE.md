# 效能與驗證紀錄

## 目前實際結果

| 項目 | 結果 |
| --- | --- |
| TypeScript 型別檢查、Vite production build | 通過 |
| 游標中心縮放（含上下限）、桌面／直式鏡頭邊界測試 | 通過，2 個測試案例，涵蓋多組比例及視窗尺寸 |
| 12 張 WebP 的尺寸、透明通道、SHA-256、檔案容量與動畫格線 | 通過，12 張素材全部符合 manifest |
| WebP 實際檔案容量 | 1,380,444 bytes（1.380 MB / 1.317 MiB） |
| 實際冷載入傳輸容量 | 未測，不以檔案容量代替網路傳輸量 |
| 桌面 FPS | 未測 |
| 手機實機 FPS／雙指縮放 | 未測 |
| 第二次重製素材的靜態排版檢查 | 已檢查；由共用座標與實際 WebP 排版，非 PixiJS 截圖 |
| 晝夜、高亮、拖曳、遮擋的瀏覽器驗收 | 未完成 |

阻塞原因：managed preview 回報 `relay could not open browser port 4173: timed out waiting for relay readiness`。初始化並啟動雲端瀏覽器後再試仍相同。未改用另一個伺服器或繞過預覽基礎設施。本次重製重新嘗試啟動專案預覽仍回報相同錯誤。無法由成功編譯或靜態排版圖推論瀏覽器操作或效能合格。

開發環境套件：PixiJS 8.23.0、Vite 7.3.8、TypeScript 5.9.3、Sharp 0.34.5、Node 24.22.3。實際鎖定版本見 package-lock.json。

## 本機重現測量

1. `npm ci && npm test && npm run build && npm run preview`。
2. 用前景分頁開啟 production 網址。關閉瀏覽器開發工具中的 CPU／網路節流，記下裝置型號、作業系統、瀏覽器版本與 GPU；不把遠端／模擬手機當成實機。
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
