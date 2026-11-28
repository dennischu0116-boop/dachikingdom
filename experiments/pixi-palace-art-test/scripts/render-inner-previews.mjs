// Exports actual inner-page markup plus explicitly illustrative SVG art proofs.
// Neither output is a browser screenshot or browser QA result.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {portals,PortalNavigation} from '../src/portal-data.ts';
import {renderInnerPage} from '../src/inner-view.ts';
import {officials} from '../src/inner-model.ts';
const out='docs/inner-pages';await mkdir(out,{recursive:true});
const css=(await readFile('src/style.css','utf8'))+'\n'+await readFile('src/inner-pages.css','utf8');
const extra='body{overflow:auto;background:#17231e}.preview-notice{padding:12px 20px;background:#11231b;border-bottom:1px solid #b99b5c;color:#e5d4a9;font:14px/1.7 system-ui;position:relative;z-index:2}.preview-notice a{color:#f1cf8a}.preview-directory{padding:30px;position:relative;z-index:2;max-width:1100px;margin:auto}.preview-directory a{display:block;padding:12px;color:#e7cf96;border-bottom:1px solid #b99b5c44}.preview-directory p{font:16px/1.8 system-ui}.preview-directory h2{font-size:25px}';
const rows=[];
for(const p of portals){const links=[];for(const t of p.tabs){const nav=new PortalNavigation();nav.open(p.id,t.id);const name=`${p.id}-${t.id}.html`;
 const html=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.title} · ${t.title} · 靜態排版預覽</title><base href="../../public/"><style>${css}\n${extra}</style></head><body><div class="preview-notice">實際內頁 HTML／CSS 靜態排版，非瀏覽器截圖；本檔按鈕不操作。互動版請啟動專案後開啟 /?page=${p.id}&amp;tab=${t.id}。 <a href="../docs/inner-pages/index.html">全部頁面</a></div>${renderInnerPage(nav)}</body></html>`;
 await writeFile(`${out}/${name}`,html);links.push({name,title:t.title,route:p.id,tab:t.id});}
 rows.push({title:p.title,links});}
await writeFile(`${out}/index.html`,`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>大清帝國 · 內頁預覽目錄</title><style>${css}\n${extra}</style></head><body><main class="preview-directory"><h1>內頁視覺預覽</h1><p>下列頁面使用網站相同的 HTML 產生函式、CSS 與 WebP 素材，可直接在本機瀏覽器開啟。這些是靜態排版，按鈕沒有互動；不是已通過瀏覽器驗收的證明。手機可直接縮小視窗檢視響應式布局。</p><p>互動版：npm ci、npm run dev，開啟 /?page=ministries&amp;tab=officials。</p>${rows.map(p=>`<section><h2>${p.title}</h2>${p.links.map(l=>`<a href="${l.name}">${l.title}</a>`).join('')}</section>`).join('')}</main></body></html>`);
await writeFile(`${out}/index.json`,JSON.stringify({kind:'actual-markup-static-gallery',browserVerified:false,pages:rows.flatMap(r=>r.links)},null,2));
// Compositional proofs intentionally use SVG, not HTML rasterization.
const names=['hall','garden','camp','official-civil','official-revenue','official-general','consort-red','consort-jade','medicine','ruyi','books','inkstick','seal','frontier'];const uri={};
for(const name of names)uri[name]='data:image/png;base64,'+(await sharp(`public/assets/ui/${name}.webp`).png().toBuffer()).toString('base64');
const img=(name,x,y,w,h,fit='xMidYMax meet')=>`<image href="${uri[name]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}"/>`;
const rect=(x,y,w,h,fill,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
const text=(value,x,y,size=20,color='#e9d9ad',anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-family="Noto Serif CJK TC,serif">${value}</text>`;
const frame=(body,w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`;
const banner=(w,h,title)=>rect(0,0,w,h,'#16231d')+img('hall',0,0,w,h,'xMidYMid slice')+rect(0,0,w,h,'#0c1d16a8')+rect(0,0,w,60,'#152019ef')+text('大清帝國 · 吏部',30,38,20)+text('返回主城',w-30,38,18,'#e5c78a','end')+text(title,45,128,38)+(w>700?text('示範資料 · 靜態美術排版示意',w-35,122,15,'#d0bc8a','end'):'');
let svg=banner(1440,960,'中央與百官');
svg+=rect(40,160,1360,55,'#17251de8','#9d814e');
['官職任命','官員清單','皇家書院','人才招募'].forEach((t,i)=>{if(!i)svg+=rect(48+i*180,166,170,43,'#703e2e');svg+=text(t,132+i*180,195,19,'#e6d2a1','middle');});
svg+=text('中央三職',45,260,26)+text('候選肖像、能力資料與任命操作區',210,260,17,'#c7c2a8');
const jobs=['丞相','戶部尚書','兵部尚書'];
officials.forEach((p,i)=>{const x=45+i*455;svg+=rect(x,290,430,575,'#15251de8','#b49755')+rect(x+5,295,420,55,'#5f3228','#a88a4d')+text(jobs[i],x+215,332,26,'#f0d8a5','middle')+img(p.portrait,x+45,365,340,300)+rect(x+6,665,418,194,'#17261eee')+text(p.name,x+215,703,28,'#ead7a9','middle')+text(`文治 ${p.civil}     武力 ${p.military}     忠誠 ${p.loyalty}`,x+215,747,19,'#dbc18b','middle')+rect(x+30,785,370,49,'#703b2b','#b59456')+text('查看任命',x+215,817,21,'#f5deb0','middle');});
svg+=rect(0,912,1440,48,'#102019')+text('SVG 美術排版示意，非瀏覽器截圖；實際文字、互動與響應式效果以網站為準。',30,943,17,'#c6bd9d');
await sharp(Buffer.from(frame(svg,1440,960))).png().toFile('docs/officials-visual-desktop.png');
let mobile=banner(430,1320,'中央與百官');
mobile+=rect(12,156,406,48,'#17251def','#987e4c');['任命','官員','書院','招募'].forEach((t,i)=>mobile+=text(t,62+i*101,187,17,'#e6d2a1','middle'));
officials.forEach((p,i)=>{const y=225+i*337;mobile+=rect(16,y,398,320,'#17261ef0','#b49755')+rect(20,y+4,390,44,'#5e3328')+text(jobs[i],215,y+34,23,'#ecd5a2','middle')+img(p.portrait,20,y+65,185,248)+text(p.name,302,y+112,24,'#ead7a9','middle')+text(`文 ${p.civil} · 武 ${p.military}`,302,y+160,17,'#dbc18b','middle')+text(`忠誠 ${p.loyalty}`,302,y+195,17,'#dbc18b','middle')+rect(218,y+233,170,49,'#733d2b','#b59456')+text('查看任命',303,y+265,18,'#f5deb0','middle');});
mobile+=rect(0,1255,430,65,'#102019')+text('手機版美術排版示意（SVG）',215,1280,14,'#c6bd9d','middle')+text('非瀏覽器截圖 · 非實機驗證',215,1304,13,'#c6bd9d','middle');
await sharp(Buffer.from(frame(mobile,430,1320))).png().toFile('docs/officials-visual-mobile.png');
let overview='';
const cell=(x,y,bg,title)=>img(bg,x,y,720,480,'xMidYMid slice')+rect(x,y,720,480,'#10201899')+rect(x,y,720,60,'#16251eef')+text(title,x+25,y+40,26)+text('靜態排版示意',x+690,y+36,14,'#d2bd8d','end');
overview+=cell(0,0,'hall','中央與百官');officials.forEach((p,i)=>{const x=20+i*233;overview+=rect(x,85,215,350,'#17261ee0','#aa8e51')+text(jobs[i],x+107,120,20,'#e8d2a1','middle')+img(p.portrait,x+8,140,199,220)+text(p.name,x+107,395,21,'#ead7a9','middle');});
overview+=cell(720,0,'garden','後宮 · 妃嬪名冊');['consort-red','consort-jade'].forEach((n,i)=>{const x=760+i*330;overview+=img(n,x,90,290,300)+rect(x,385,290,46,'#17261ee0','#b39855')+text(i?'寧嬪 · 顧氏':'婉妃 · 沈氏',x+145,415,22,'#ead7a9','middle');});
overview+=cell(0,480,'hall','皇家寶庫');['medicine','ruyi','inkstick'].forEach((n,i)=>{const x=20+i*233;overview+=rect(x,575,215,320,'#17261ee0','#b39855')+img(n,x+20,590,175,210)+text(['養心丹','玉如意','御製墨錠'][i],x+107,855,22,'#ead7a9','middle');});
overview+=cell(720,480,'camp','軍事 · 邊疆部署')+img('frontier',740,570,390,310,'xMidYMid slice')+img('official-general',1140,590,280,270)+rect(1150,857,255,38,'#17261eee','#b39855')+text('陸承毅 · 部署預覽',1277,883,18,'#ead7a9','middle');
overview+=rect(0,940,1440,40,'#102019')+text('美術素材與布局方向示意（SVG），非網站截圖。完整實際 HTML／CSS 預覽見 docs/inner-pages/index.html。',25,966,16,'#c6bd9d');
await sharp(Buffer.from(frame(overview,1440,980))).png().toFile('docs/inner-visual-overview.png');
console.log(`Exported ${rows.flatMap(p=>p.links).length} actual-markup static pages and 3 explicitly labeled SVG design proofs.`);
