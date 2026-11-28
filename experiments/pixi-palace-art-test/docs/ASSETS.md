# 美術素材清單 · 主城與內頁

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

## 內頁美術 · inner-visuals-1

新增六張來源 PNG，裁切為二十四張 WebP。人物採寫實半身／立像、獨立透明背景；宮廷環境與景觀採橫幅構圖。所有文字與操作控制均由 HTML 呈現，沒有烘焙到圖片。

| 素材檔名（assets/ui/） | 實際像素 | bytes | 透明背景 |
| --- | --- | ---: | --- |
| hall.webp | 768 × 512 | 121944 | 無 |
| garden.webp | 768 × 512 | 139164 | 無 |
| study.webp | 768 × 512 | 120138 | 無 |
| camp.webp | 768 × 512 | 112074 | 無 |
| official-civil.webp | 449 × 508 | 58922 | 有 |
| official-revenue.webp | 433 × 509 | 53926 | 有 |
| official-general.webp | 451 × 508 | 68340 | 有 |
| emperor.webp | 488 × 512 | 67448 | 有 |
| consort-red.webp | 409 × 502 | 70306 | 有 |
| consort-jade.webp | 402 × 505 | 64566 | 有 |
| seal.webp | 384 × 399 | 48758 | 有 |
| ruyi.webp | 384 × 440 | 53668 | 有 |
| medicine.webp | 384 × 456 | 46688 | 有 |
| books.webp | 384 × 381 | 48540 | 有 |
| edict.webp | 384 × 375 | 42530 | 有 |
| helmet.webp | 384 × 437 | 64948 | 有 |
| map.webp | 768 × 512 | 171488 | 無 |
| market.webp | 768 × 512 | 155092 | 無 |
| countryside.webp | 768 × 512 | 162698 | 無 |
| frontier.webp | 768 × 512 | 111258 | 無 |
| prince-elder.webp | 512 × 1021 | 112216 | 有 |
| prince-young.webp | 493 × 891 | 82492 | 有 |
| inkstick.webp | 384 × 346 | 40038 | 有 |
| herbal-soup.webp | 384 × 405 | 51962 | 有 |

內頁 WebP 合計 **2,069,204 bytes**；連同主城，共 **44 張、4,583,116 bytes**。這是磁碟上的實際檔案大小，不是冷載入傳輸量。

人物／器物／宮廷／景觀／皇子／額外寶庫物件來源分別為 `source-art/ui/portraits.png`、`artifacts.png`、`environments.png`、`landscapes.png`、`princes.png`、`treasury-extras.png`。`npm run assets:ui` 可重建；獨立 manifest 包含各檔 SHA-256 與來源。全部來源 PNG 均不進入 dist。

內頁圖像依開啟的分頁載入，皇帝頭像同時用於初始主頁。沒有把 24 張內頁圖片加入 Pixi 預載；全部走本機靜態檔案，不呼叫圖片生成或付費服務。半身人物以腰線裁切，服裝為宮廷風格示例；地圖不代表精確疆界。
