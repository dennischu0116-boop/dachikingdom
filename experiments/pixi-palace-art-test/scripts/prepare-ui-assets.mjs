import sharp from 'sharp';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('public/assets/ui',{recursive:true});
const entries=[];
async function emit(name,source,rect,width,alpha){
 let p=sharp(`source-art/ui/${source}.png`).extract({left:rect[0],top:rect[1],width:rect[2],height:rect[3]});
 if(alpha)p=sharp(await p.png().toBuffer()).trim({background:'#00000000',threshold:12});
 const file=`assets/ui/${name}.webp`;
 await p.resize({width,withoutEnlargement:true}).webp({quality:87,alphaQuality:100,effort:4}).toFile('public/'+file);
 const meta=await sharp('public/'+file).metadata();entries.push({name,file,source:`source-art/ui/${source}.png`,width:meta.width,height:meta.height,alpha,bytes:(await stat('public/'+file)).size,sha256:createHash('sha256').update(await readFile('public/'+file)).digest('hex')});
}
for(const [i,name] of ['hall','garden','study','camp'].entries())await emit(name,'environments',[(i%2)*768,Math.floor(i/2)*512,768,512],768,false);
for(const [i,name] of ['official-civil','official-revenue','official-general','emperor','consort-red','consort-jade'].entries())await emit(name,'portraits',[(i%3)*512,Math.floor(i/3)*512,512,512],512,true);
for(const [i,name] of ['seal','ruyi','medicine','books','edict','helmet'].entries())await emit(name,'artifacts',[(i%3)*512,Math.floor(i/3)*512,512,512],384,true);
for(const [i,name] of ['map','market','countryside','frontier'].entries())await emit(name,'landscapes',[(i%2)*768,Math.floor(i/2)*512,768,512],768,false);
for(const [i,name] of ['prince-elder','prince-young'].entries())await emit(name,'princes',[i*768,0,768,1024],512,true);
for(const [i,name] of ['inkstick','herbal-soup'].entries())await emit(name,'treasury-extras',[i*768,0,768,1024],384,true);
await writeFile('public/assets/ui/manifest.json',JSON.stringify({revision:'inner-visuals-1',origin:'Generated in this conversation using OpenAI image generation; fictional portraits and illustrative geography',loading:'HTML image assets loaded on opening their page, except emperor headshot in initial HUD; not part of Pixi scene preload',assets:entries,totalBytes:entries.reduce((s,a)=>s+a.bytes,0)},null,2));
console.log(`UI art: ${entries.length} WebP files, ${entries.reduce((s,a)=>s+a.bytes,0)} bytes`);
