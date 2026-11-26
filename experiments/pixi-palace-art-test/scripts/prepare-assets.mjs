// Mechanical atlas extraction / WebP encoding. Original generated art is preserved.
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
await mkdir('public/assets', { recursive: true });
const entries = [];
async function emit(name, source, rect, maxWidth) {
  let pipeline = sharp(`source-art/${source}.png`);
  if (rect) pipeline = sharp(await pipeline.extract({ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }).png().toBuffer()).trim({ background: '#00000000', threshold: 15 });
  const path = `public/assets/${name}.webp`;
  await pipeline.resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(path);
  const meta = await sharp(path).metadata();
  entries.push({ name, file: `assets/${name}.webp`, source: `source-art/${source}.png`, width: meta.width, height: meta.height, bytes: (await stat(path)).size, alpha: meta.hasAlpha, sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
}
await emit('taihe', 'taihe', [0,0,1536,1024], 1280);
await emit('east-hall', 'architecture', [624,0,510,490], 768);
await emit('west-pavilion', 'architecture', [1140,0,396,490], 768);
await emit('terrace', 'architecture', [0,550,640,450], 1024);
await emit('pine', 'architecture', [640,510,490,514], 512);
await emit('cypress', 'architecture', [1140,490,396,534], 512);
await emit('courtyard', 'courtyard', null, 1536);
await emit('flagpole', 'props', [180,0,270,620], 160);
await emit('banner', 'props', [720,0,480,620], 256);
await emit('lantern', 'props', [150,625,330,629], 192);
await emit('brazier', 'props', [650,625,600,629], 256);
// Keep exact cell registration: no per-frame trim or resize.
await sharp('source-art/guards.png').resize(768,512).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile('public/assets/guards.webp');
entries.push({ name:'guards', file:'assets/guards.webp', source:'source-art/guards.png', width:768, height:512, bytes:(await stat('public/assets/guards.webp')).size, alpha:true, columns:6, rows:4, frameWidth:128, frameHeight:128 });
for(const a of entries) a.sha256=createHash('sha256').update(await readFile('public/'+a.file)).digest('hex');
await writeFile('public/assets/manifest.json', JSON.stringify({ generated:'2026-11-27', origin:'OpenAI image generation tool, generated for this experiment; no third-party game assets', note:'AI art: approximate perspective and Qing details; guard walk frames have limited pose variation.', assets:entries, totalBytes:entries.reduce((s,e)=>s+e.bytes,0) }, null, 2));
console.log(entries.map(x=>`${x.name}: ${x.width}×${x.height}, ${x.bytes} bytes`).join('\n'));
console.log('Total WebP bytes:',entries.reduce((s,e)=>s+e.bytes,0));
