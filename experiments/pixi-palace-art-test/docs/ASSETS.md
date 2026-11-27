# 美術素材清單 · 主城入口

本次替換 courtyard 為正俯視石磚材質，新增 imperial-road 正俯視御道；其餘建築與物件素材保留，共九張來源 PNG、二十張執行用 WebP。來源為本次對話的圖片生成工具；未擷取《新三國志》遊戲素材，未把含 UI 的概念圖作為遊戲背景。

| 素材 | 執行檔案 | 實際像素 | bytes | 透明背景 |
| --- | --- | --- | ---: | --- |
| 太和殿＋三層台基／階梯 | assets/taihe.webp | 1512 × 877 | 397354 | 有 |
| 六部衙門（原東配殿） | assets/east-hall.webp | 838 × 408 | 106622 | 有 |
| 後宮（原西配殿） | assets/west-pavilion.webp | 634 × 409 | 85774 | 有 |
| 松樹 | assets/pine.webp | 501 × 408 | 104284 | 有 |
| 闊葉樹 | assets/broadleaf.webp | 496 × 438 | 114964 | 有 |
| 花樹 | assets/blossom.webp | 500 × 407 | 117598 | 有 |
| 正俯視石磚材料 | assets/courtyard.webp | 1536 × 1024 | 583602 | 無，鋪滿地面 |
| 正俯視御道材料 | assets/imperial-road.webp | 512 × 768 | 136308 | 無，獨立地面圖層 |
| 旗杆 | assets/flagpole.webp | 106 × 597 | 14776 | 有 |
| 龍紋旗布 | assets/banner.webp | 254 × 560 | 61820 | 有 |
| 宮燈 | assets/lantern.webp | 181 × 562 | 25548 | 有 |
| 香爐 | assets/brazier.webp | 256 × 276 | 24862 | 有 |
| 士兵圖集（4方向×2幀） | assets/guards.webp | 256 × 384 | 23746 | 有 |
| 軍機處 | assets/council.webp | 440 × 357 | 58318 | 有 |
| 兵營 | assets/barracks.webp | 549 × 334 | 68308 | 有 |
| 上書房 | assets/school.webp | 462 × 346 | 62064 | 有 |
| 御書房 | assets/study.webp | 439 × 461 | 71198 | 有 |
| 宗人府 | assets/clan.webp | 571 × 400 | 85770 | 有 |
| 皇家寶庫 | assets/treasury.webp | 464 × 408 | 73898 | 有 |
| 宮門 | assets/gate.webp | 1024 × 740 | 297098 | 有 |

WebP 合計 **2513912 bytes**。來源、尺寸及 SHA-256 見 manifest.json。原始 PNG 不由網站載入。

## 畫面方向

- 以重製太和殿為配殿、植栽與道具的視覺參考：固定西南方向斜俯視、可見建築前方與左側、左上方日光。
- 瓦面改為霧面赭金陶瓦，朱紅木構降低飽和度；保留灰白石材的細節與陰影。
- 主殿與台基、階梯整體生成；地面、樹木、人物、旗幟、燈光、標籤仍各自分層。
- 地面與御道共用一組投影，植栽另置；十座建築分布於主殿周邊，沒有將建築或人物烘焙到地面。新增機構建築使用灰瓦／赭金屋頂及各自可辨識的輪廓。
- 人物改成俯視圖，每格 128×96，四方向各兩幀。沒有把幾乎相同的六幀宣稱為完整步行動畫。

## 檔案與重建

`source-art/` 內為 taihe、architecture（兩座配殿）、courtyard、trees（三種樹）、guards、props、city-buildings（六座新附屬建築）、gate、imperial-road 共九張原圖。`npm run assets` 以 Sharp 做固定裁切、透明留白修整及 WebP 編碼；`npm test` 檢查尺寸、容量、透明通道、動畫格線及雜湊。

`src/layout.json` 同時提供給 PixiJS 場景及 `scripts/render-layout.mjs`。`docs/art-layout-preview.png` 是實際素材排版證明圖，不是遊戲背景或 PixiJS 瀏覽器截圖。

## 尚存限制

AI 生成素材沒有嚴格的共同相機標定，約 40–45° 是製作方向而非幾何測量結果。太和殿是清代宮廷風格詮釋，未作歷史測繪。人物兩幀動畫仍有限，建築內明暗與接觸陰影已烘焙，夜景不是物理重新打光。整體美術接近程度仍需使用者評閱；瀏覽器動態畫面與實際 FPS 尚未驗證。
