// Static art layout proof using the SAME asset bytes and scene coordinates as Pixi.
// This export is NOT a Pixi renderer screenshot or performance test.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const layout=JSON.parse(await readFile('src/layout.json','utf8'));
const manifest=JSON.parse(await readFile('public/assets/manifest.json','utf8'));
const assets=Object.fromEntries(manifest.assets.map(a=>[a.name,a]));
const uris={};
for(const a of manifest.assets)uris[a.name]='data:image/png;base64,'+(await sharp('public/'+a.file).png().toBuffer()).toString('base64');
const image=(asset,x,y,w,h)=>`<image href="${uris[asset]}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
const sprite=(asset,x,y,w)=>image(asset,x-w/2,y-w*assets[asset].height/assets[asset].width,w,w*assets[asset].height/assets[asset].width);
const groups=[];
const put=(y,svg)=>groups.push({y,svg});
put(layout.palace.y,sprite('taihe',layout.palace.x,layout.palace.y,layout.palace.width));
for(const t of [...layout.halls,...layout.trees])put(t.y,sprite(t.asset,t.x,t.y,t.width));
for(const [x,y] of layout.flags){const ph=20*assets.flagpole.height/assets.flagpole.width;put(y,sprite('flagpole',x,y,20)+image('banner',x,y-ph+12,29,68));}
for(const [x,y] of layout.lamps)put(y,sprite('lantern',x,y,29));
for(const [x,y] of layout.braziers)put(y,sprite('brazier',x,y,43));
for(const [i,route] of layout.routes.entries()){
 const a=route[0],b=route[1],p=i*.06,x=a.x+(b.x-a.x)*p,y=a.y+(b.y-a.y)*p;
 const row=b.y-a.y>=0?(b.x-a.x>=0?0:1):(b.x-a.x>=0?2:3);
 const key='guard'+i;uris[key]='data:image/png;base64,'+(await sharp('public/assets/guards.webp').extract({left:0,top:row*96,width:128,height:96}).png().toBuffer()).toString('base64');
 put(y,image(key,x-29,y-43.5*.95,58,43.5));
}
const shadows=layout.trees.map(t=>`<ellipse cx="${t.x+t.width*.37*.22}" cy="${t.y+8}" rx="${t.width*.37}" ry="18" fill="#18281f" opacity=".19"/>`).join('');
const labels=layout.labels.map(l=>`<g transform="translate(${l.x} ${l.y})"><rect x="${l.main?-66:-50}" y="-17" width="${l.main?132:100}" height="34" rx="6" fill="#17231f" fill-opacity=".92" stroke="#bda16a"/><text x="0" y="7" text-anchor="middle" font-family="Noto Serif CJK TC,serif" font-size="${l.main?22:17}" letter-spacing="3" fill="#f4dfaf">${l.text}</text></g>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1200" viewBox="0 0 1800 1200">${image('courtyard',0,0,1800,1200)}${shadows}${groups.sort((a,b)=>a.y-b.y).map(g=>g.svg).join('')}${labels}<rect y="1152" width="1800" height="48" fill="#14231f" fill-opacity=".85"/><text x="30" y="1184" fill="#e4d8ba" font-family="Noto Serif CJK TC,serif" font-size="20">美術重製・靜態素材排版預覽（非瀏覽器截圖）</text></svg>`;
await mkdir('docs',{recursive:true});
await sharp(Buffer.from(svg)).resize(1440).png().toFile('docs/art-layout-preview.png');
await writeFile('docs/art-layout-preview.json',JSON.stringify({type:'static-layout-proof',renderer:'SVG / Sharp, NOT PixiJS',source:'src/layout.json + public/assets/manifest.json',excludes:['camera transforms','HTML interface','mesh animation','night lighting','runtime FPS']},null,2));
console.log('Saved static art layout proof: docs/art-layout-preview.png');
