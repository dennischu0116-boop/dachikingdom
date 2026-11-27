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
await emit('taihe', 'taihe', [0,0,1536,1024], 1536);
await emit('east-hall', 'architecture', [0,250,870,550], 870);
await emit('west-pavilion', 'architecture', [880,250,656,550], 656);
await emit('pine', 'trees', [0,250,514,500], 512);
await emit('broadleaf', 'trees', [518,250,502,500], 512);
await emit('blossom', 'trees', [1024,250,512,500], 512);
await emit('courtyard', 'courtyard', null, 1536);
await emit('flagpole', 'props', [180,0,270,620], 160);
await emit('banner', 'props', [720,0,480,620], 256);
await emit('lantern', 'props', [150,625,330,629], 192);
await emit('brazier', 'props', [650,625,600,629], 256);
// Six isolated city buildings; crop boundaries follow the generated silhouettes.
await emit('council', 'city-buildings', [0,0,470,480], 512);
await emit('barracks', 'city-buildings', [470,0,580,480], 580);
await emit('school', 'city-buildings', [1050,0,486,480], 512);
await emit('study', 'city-buildings', [0,480,470,544], 512);
await emit('clan', 'city-buildings', [470,480,580,544], 580);
await emit('treasury', 'city-buildings', [1050,480,486,544], 512);
await emit('gate', 'gate', [0,0,1536,1024], 1024);
// Two distinct poses in each of four directions; keep their shared cell registration.
await sharp('source-art/guards.png').resize(256,384).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile('public/assets/guards.webp');
entries.push({ name:'guards', file:'assets/guards.webp', source:'source-art/guards.png', width:256, height:384, bytes:(await stat('public/assets/guards.webp')).size, alpha:true, columns:2, rows:4, frameWidth:128, frameHeight:96 });
for(const a of entries) a.sha256=createHash('sha256').update(await readFile('public/'+a.file)).digest('hex');
await writeFile('public/assets/manifest.json', JSON.stringify({ generated:'2026-11-27', origin:'OpenAI image generation tool, generated for this experiment; no third-party game assets', revision:'city-portals-1', note:'Ten building entrances: retained main hall and two side halls, six new distinct institutional buildings and one palace gate. Shared southwest elevated camera and muted ceramic palette. Historical geometry is illustrative.', assets:entries, totalBytes:entries.reduce((s,e)=>s+e.bytes,0) }, null, 2));
console.log(entries.map(x=>`${x.name}: ${x.width}×${x.height}, ${x.bytes} bytes`).join('\n'));
console.log('Total WebP bytes:',entries.reduce((s,e)=>s+e.bytes,0));
