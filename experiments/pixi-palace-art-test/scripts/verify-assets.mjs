import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const manifest=JSON.parse(await readFile('public/assets/manifest.json','utf8'));
let total=0;
for(const a of manifest.assets){
 const path='public/'+a.file;
 const bytes=(await stat(path)).size;const meta=await sharp(path).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);
 assert.equal(bytes,a.bytes);assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),a.sha256);
 assert.ok(meta.width<=2048&&meta.height<=2048);
 if(!['courtyard','imperial-road'].includes(a.name)){
  assert.ok(meta.hasAlpha,`${a.name} must have alpha`);
  const stats=await sharp(path).stats();assert.equal(stats.channels.at(-1).min,0,`${a.name} needs transparent background`);
 }
 total+=bytes;
}
const guards=manifest.assets.find(a=>a.name==='guards');assert.equal(guards.width,guards.columns*guards.frameWidth);assert.equal(guards.height,guards.rows*guards.frameHeight);
assert.equal(total,manifest.totalBytes);console.log(`Verified ${manifest.assets.length} WebP files, ${total} bytes; alpha, dimensions, hashes and animation grid passed.`);

const ui=JSON.parse(await readFile('public/assets/ui/manifest.json','utf8'));
let uiTotal=0;
for(const a of ui.assets){
 const path='public/'+a.file,meta=await sharp(path).metadata(),bytes=(await stat(path)).size;
 assert.equal(meta.format,'webp');assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);assert.ok(meta.width<=1024&&meta.height<=1024);
 assert.equal(bytes,a.bytes);assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),a.sha256);
 if(a.alpha){assert.ok(meta.hasAlpha);const stats=await sharp(path).stats();assert.equal(stats.channels.at(-1).min,0,`${a.name} needs transparent space`);}
 uiTotal+=bytes;
}
assert.equal(uiTotal,ui.totalBytes);console.log(`Verified ${ui.assets.length} UI WebP files, ${uiTotal} bytes; loaded by HTML pages, separate from Pixi preload.`);
