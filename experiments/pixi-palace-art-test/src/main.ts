import { Application, Assets, Container, Graphics, MeshPlane, Rectangle, Sprite, Text, Texture, WebGLRenderer } from 'pixi.js';
import './style.css';
import layout from './layout.json';
import { cameraBounds, zoomTransform } from './camera';
import { BuildingLayout, loadLayout, saveLayout, clearLayout } from './building-layout';
import type { BuildingSpec, LayoutStorage } from './building-layout';
import { SceneGestures } from './gestures';

type AssetRecord = { name: string; file: string; width: number; height: number; bytes: number };
type Manifest = { assets: AssetRecord[]; totalBytes: number };
type Point = { x: number; y: number };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const WIDTH = layout.width, HEIGHT = layout.height;
const app = new Application();
let night = false, animate = !matchMedia('(prefers-reduced-motion: reduce)').matches, selected = false, clock = 0;
let manifest: Manifest;
const camera = new Container(), world = new Container(), floor = new Container(), shadows = new Container(), objects = new Container(), lightLayer = new Container(), labels = new Container();
objects.sortableChildren = true;
world.addChild(floor, shadows, objects, lightLayer, labels);
camera.addChild(world);
const tex: Record<string, Texture> = {};
const flags: { mesh: MeshPlane; base: Float32Array; phase: number }[] = [];
const guards: { sprite: Sprite; shadow: Graphics; route: Point[]; segment: number; progress: number; speed: number }[] = [];
const lamps: Graphics[] = [];
const labelTexts: Text[] = [];
let palace: Container;
let buildingLayout: BuildingLayout;
let editing = false;
let selectedBuilding: string | null = null;
let gestures: SceneGestures;
const buildingViews = new Map<string, { node: Container; highlight: Sprite; label: Text }>();
let storage: LayoutStorage | null = null;
try { storage = window.localStorage; } catch { /* Private/blocked storage: editing still works in memory. */ }
const mainSilhouette = [[.30,.07],[.69,0],[.82,.23],[.91,.24],[.85,.34],[.94,.43],[.94,.60],[1,.84],[.88,.89],[.61,1],[.22,.96],[0,.66],[.09,.48],[.08,.37],[.17,.28],[.13,.25]].map(([x,y])=>({x,y}));
const hallSilhouette = [[.14,.10],[.80,0],[.92,.16],[1,.28],[.97,.80],[.74,.98],[.18,1],[0,.72],[.05,.31],[.01,.25]].map(([x,y])=>({x,y}));
let frames: Texture[][];

function sprite(name: string, width: number, x = 0, y = 0, parent: Container = objects) {
  const s = new Sprite(tex[name]); s.anchor.set(.5, 1); s.width = width; s.scale.y = s.scale.x; s.position.set(x,y); s.zIndex = y; parent.addChild(s); return s;
}
function shadow(x: number, y: number, w: number, h: number, alpha=.19) {
  const g = new Graphics().ellipse(0,0,w,h).fill({color:0x18281f,alpha});g.position.set(x+w*.22,y+8);shadows.addChild(g);return g;
}
function label(text: string, x: number, y: number, main = false) {
  const c = new Container();c.position.set(x,y);
  const width = main?132:100;
  const bg = new Graphics().poly([-width/2+8,-17,width/2-8,-17,width/2,-8,width/2,8,width/2-8,17,-width/2+8,17,-width/2,8,-width/2,-8]).fill({color:0x17231f,alpha:.92}).stroke({color:0xbda16a,width:1,alpha:.8});
  const t = new Text({text,style:{fontFamily:'"Noto Serif TC", "PMingLiU", serif',fontSize:main?22:17,fill:0xf4dfaf,letterSpacing:3,fontWeight:'500'}});t.anchor.set(.5);c.addChild(bg,t);labels.addChild(c);labelTexts.push(t);return t;
}
function addTree(name: string, x: number, y: number, width: number) { shadow(x,y,width*.37,18);sprite(name,width,x,y); }
function addFlag(x:number,y:number,phase:number) {
  const c=new Container();c.position.set(x,y);c.zIndex=y;objects.addChild(c);
  const pole=sprite('flagpole',20,0,0,c);
  const mesh=new MeshPlane({texture:tex.banner,verticesX:10,verticesY:8});
  mesh.width=29;mesh.height=68;mesh.position.set(0,-pole.height+12);c.addChild(mesh);
  flags.push({mesh,base:new Float32Array(mesh.geometry.positions),phase});shadow(x,y,18,5,.15);
}
function addLamp(x:number,y:number) {
  sprite('lantern',29,x,y);shadow(x,y,11,4,.13);
  const glow=new Graphics();
  for(let i=6;i>=1;i--)glow.ellipse(0,0,i*10,i*6).fill({color:0xffbb50,alpha:.018+(6-i)*.006});
  glow.circle(0,0,4).fill({color:0xffe6a5,alpha:.85});glow.position.set(x,y-47);glow.blendMode='add';lightLayer.addChild(glow);lamps.push(glow);
}
function buildScene() {
  const ground = new Sprite(tex.courtyard);ground.width=WIDTH;ground.height=HEIGHT;floor.addChild(ground);
  // A coherent architectural sprite includes the hall, three-tier plinth and stairs.
  // Terrain, vegetation, flags, guards, labels and effects remain independent layers.
  const definitions = [
    { id:'taihe', asset:'taihe', ...layout.palace, label:layout.labels[0] },
    ...layout.halls.map((h,i)=>({ id:h.asset, ...h, label:layout.labels[i+1] })),
  ];
  const specs: BuildingSpec[] = definitions.map(d=>({
    id:d.id, x:d.x, y:d.y, width:d.width, height:d.width*tex[d.asset].height/tex[d.asset].width,
    labelOffset:{ x:d.label.x-d.x, y:d.label.y-d.y }, polygon:d.id==='taihe'?mainSilhouette:hallSilhouette,
  }));
  buildingLayout = new BuildingLayout(specs, WIDTH, HEIGHT);
  definitions.forEach(d=>{
    const node=new Container();objects.addChild(node);
    const halo=sprite(d.asset,d.width+18,0,4,node);halo.tint=0xffe19a;halo.alpha=.48;halo.visible=false;
    sprite(d.asset,d.width,0,0,node);
    const title=label(d.label.text,d.label.x,d.label.y,d.label.main);
    buildingViews.set(d.id,{node,highlight:halo,label:title});
    if(d.id==='taihe')palace=node;
  });
  const loaded=loadLayout(buildingLayout,storage);
  $('layout-status').textContent=loaded==='restored'?'已載入此瀏覽器的配置':loaded==='unavailable'?'瀏覽器無法儲存；調整只保留於本次頁面':'放開建築後，自動儲存於此瀏覽器';
  applyBuildingPositions();
  layout.trees.forEach(t=>addTree(t.asset,t.x,t.y,t.width));
  layout.flags.forEach(([x,y],i)=>addFlag(x,y,i*1.3));
  layout.lamps.forEach(([x,y])=>addLamp(x,y));
  layout.braziers.forEach(([x,y])=>sprite('brazier',43,x,y));
  frames=Array.from({length:4},(_,row)=>Array.from({length:2},(_,col)=>new Texture({source:tex.guards.source,frame:new Rectangle(col*128,row*96,128,96)})));
  const routes:Point[][]=layout.routes;
  routes.forEach((route,i)=>{const s=new Sprite(frames[0][0]);s.anchor.set(.5,.95);s.width=58;s.height=43.5;objects.addChild(s);const sh=shadow(0,0,7,2.5,.22);guards.push({sprite:s,shadow:sh,route,segment:0,progress:i*.06,speed:27+i*2});});
  updateGuards(0);setNight(false);setAnimation(animate);
}
function updateGuards(dt:number) {
  for(const g of guards){
    let a=g.route[g.segment],b=g.route[(g.segment+1)%g.route.length];
    g.progress+=dt*g.speed/Math.hypot(b.x-a.x,b.y-a.y);
    if(g.progress>=1){g.progress%=1;g.segment=(g.segment+1)%g.route.length;a=g.route[g.segment];b=g.route[(g.segment+1)%g.route.length];}
    const dx=b.x-a.x,dy=b.y-a.y;
    const row=dy>=0?(dx>=0?0:1):(dx>=0?2:3);
    g.sprite.texture=frames[row][Math.floor(clock*4.2)%2];
    g.sprite.position.set(a.x+dx*g.progress,a.y+dy*g.progress);
    g.sprite.zIndex=g.sprite.y;g.shadow.position.set(g.sprite.x+4,g.sprite.y+2);
  }
}
function setNight(value:boolean){if(activeRun&&value!==night)activeRun.interrupted=true;night=value;world.tint=night?0x7389b5:0xffffff;lightLayer.tint=night?0xffe4b5:0xffffff;lightLayer.visible=night;shadows.alpha=night?.45:1;labels.tint=night?0xffe7b2:0xffffff;$('day-night').setAttribute('aria-pressed',String(night));$('day-night').querySelector('span')!.textContent=night?'夜晚':'白晝';}
function setAnimation(value:boolean){if(activeRun&&value!==animate)activeRun.interrupted=true;animate=value;$('animation').setAttribute('aria-pressed',String(animate));$('animation').querySelector('span')!.textContent=animate?'動畫開啟':'動畫關閉';}
function applyBuildingPositions() {
  for(const b of buildingLayout.buildings) {
    const view=buildingViews.get(b.id)!;
    view.node.position.set(b.x,b.y);view.node.zIndex=b.depth;
    view.label.parent!.position.set(b.labelPosition.x,b.labelPosition.y);
  }
}
function pickBuilding(p: Point) {
  objects.sortChildren();
  const ids=[...buildingViews.keys()].sort((a,b)=>objects.getChildIndex(buildingViews.get(b)!.node)-objects.getChildIndex(buildingViews.get(a)!.node));
  return buildingLayout.pick(p,ids);
}
function updateHint() {
  $('hint').textContent=editing?'拖動建築調整位置 · 拖空地移動鏡頭 · 滾輪／雙指縮放':selected?'已選取太和殿 · 拖曳移動 · 滾輪／雙指縮放':'拖曳移動 · 滾輪／雙指縮放 · 點選太和殿';
}
function selectBuilding(id: string | null) {
  selectedBuilding=id;selected=id==='taihe';
  for(const [key,view] of buildingViews) {
    view.highlight.visible=key===id;view.label.style.fill=key===id?0xffefb5:0xf4dfaf;
  }
  updateHint();
}
function finishBuildingDrag() {
  if(buildingLayout.finish()) {
    const saved=saveLayout(buildingLayout,storage);
    $('layout-status').textContent=saved?'配置已儲存於此瀏覽器':'瀏覽器無法儲存；調整只保留於本次頁面';
  }
}
let baseScale=1;
function clampCamera(){const p=cameraBounds({x:camera.x,y:camera.y,scale:camera.scale.x},app.screen.width,app.screen.height,WIDTH,HEIGHT);camera.position.set(p.x,p.y);}
function resetCamera(){baseScale=Math.max(app.screen.width/WIDTH,app.screen.height/HEIGHT);camera.scale.set(baseScale);camera.position.set((app.screen.width-WIDTH*baseScale)/2,(app.screen.height-HEIGHT*baseScale)/2+30);clampCamera();}
function zoomAt(factor:number,point:Point){const p=zoomTransform({x:camera.x,y:camera.y,scale:camera.scale.x},factor,point,baseScale*.85,baseScale*2.6);camera.position.set(p.x,p.y);camera.scale.set(p.scale);clampCamera();}
function bindCamera() {
  const canvas=app.canvas;
  const point=(e:PointerEvent|WheelEvent):Point=>{
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*app.screen.width/r.width,y:(e.clientY-r.top)*app.screen.height/r.height};
  };
  gestures=new SceneGestures({
    toWorld:p=>world.toLocal(p),
    pick:p=>pickBuilding(p)?.id,
    begin:(id,p)=>{buildingLayout.begin(id,p);selectBuilding(id);},
    move:p=>{buildingLayout.move(p);applyBuildingPositions();if(activeRun)activeRun.interrupted=true;},
    finish:finishBuildingDrag,
    cancel:()=>{buildingLayout.cancel();applyBuildingPositions();$('layout-status').textContent='已取消本次移動';},
    pan:(dx,dy)=>{camera.x+=dx;camera.y+=dy;clampCamera();},
    zoom:zoomAt,
    tap:p=>{const hit=pickBuilding(world.toLocal(p));selectBuilding(editing?(hit?.id??null):hit?.id==='taihe'?'taihe':null);},
  });
  const release=(ids:number[])=>{for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);canvas.classList.remove('dragging');};
  const stop=(commit:boolean)=>{const ids=[...gestures.pointers.keys()];if(commit)gestures.finish();else gestures.cancel();release(ids);};
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    gestures.down(e.pointerId,point(e));canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove',e=>gestures.move(e.pointerId,point(e)));
  canvas.addEventListener('pointerup',e=>{
    gestures.up(e.pointerId,point(e));
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(!gestures.pointers.size)canvas.classList.remove('dragging');
  });
  canvas.addEventListener('pointercancel',()=>stop(false));
  canvas.addEventListener('lostpointercapture',e=>{if(gestures.pointers.has(e.pointerId))stop(false);});
  window.addEventListener('blur',()=>stop(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(false);});
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();stop(true);
    const unit=e.deltaMode===1?16:e.deltaMode===2?app.screen.height:1;
    zoomAt(Math.exp(-e.deltaY*unit*.0012),point(e));
  },{passive:false});
  $('edit-layout').onclick=()=>{
    stop(true);editing=!editing;gestures.editing=editing;
    $('edit-layout').setAttribute('aria-pressed',String(editing));
    $('edit-layout').querySelector('span')!.textContent=editing?'完成配置':'配置模式';
    $('layout-tools').hidden=!editing;
    if(!editing&&selectedBuilding!=='taihe')selectBuilding(null);else updateHint();
    if(activeRun)activeRun.interrupted=true;
  };
  $('restore-layout').onclick=()=>{
    stop(false);buildingLayout.reset();applyBuildingPositions();selectBuilding(null);
    const cleared=clearLayout(storage);
    $('layout-status').textContent=cleared?'已還原預設配置':'已還原畫面，但瀏覽器無法清除已儲存配置';
    if(activeRun)activeRun.interrupted=true;
  };
  $('reset').onclick=()=>{stop(false);resetCamera();};
  $('day-night').onclick=()=>setNight(!night);$('animation').onclick=()=>setAnimation(!animate);
  app.renderer.on('resize',()=>{stop(false);resetCamera();});
}

type Measurement = { scenario:string; durationMs:number; frames:number; averageFPS:number; p95FrameMs:number; minFPS1s:number; interrupted:boolean; viewport:{width:number;height:number;dpr:number;resolution:number}; renderer:string; userAgent:string; night:boolean; animation:boolean; resourceBytes:number; transferBytes:number; encodedBodyBytes:number; resources:unknown[] };
let activeRun:{scenario:string;start:number;duration:number;times:number[];interrupted:boolean;resolve:(m:Measurement)=>void;night:boolean;animation:boolean}|null=null;
const measurements:Measurement[]=[];
let lastFrame=0,fpsTimes:number[]=[],fpsElapsed=0;
function rendererName(){return app.renderer instanceof WebGLRenderer?'WebGL':'WebGPU';}
function resources(){return [...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].filter(e=>e.name.startsWith(location.origin)).map(e=>{const r=e as PerformanceResourceTiming;return{name:new URL(r.name).pathname,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,durationMs:Math.round(r.duration)};});}
function finishRun(now:number){const r=activeRun!;const sorted=[...r.times].sort((a,b)=>a-b);let bucket=0,count=0,min=Infinity;for(const t of r.times){bucket+=t;count++;if(bucket>=1000){min=Math.min(min,1000*count/bucket);bucket=0;count=0;}}
  const res=resources();const m:Measurement={scenario:r.scenario,durationMs:now-r.start,frames:r.times.length,averageFPS:1000*r.times.length/r.times.reduce((a,b)=>a+b,0),p95FrameMs:sorted[Math.floor(sorted.length*.95)]||0,minFPS1s:Number.isFinite(min)?min:0,interrupted:r.interrupted,viewport:{width:app.screen.width,height:app.screen.height,dpr:devicePixelRatio,resolution:app.renderer.resolution},renderer:rendererName(),userAgent:navigator.userAgent,night:r.night,animation:r.animation,resourceBytes:manifest.totalBytes,transferBytes:res.reduce((s,r)=>s+r.transferSize,0),encodedBodyBytes:res.reduce((s,r)=>s+r.encodedBodySize,0),resources:res};measurements.push(m);activeRun=null;r.resolve(m);
}
function tick(){const now=performance.now();const raw=lastFrame?now-lastFrame:0;lastFrame=now;if(!raw||document.hidden)return;const dt=Math.min(raw,50)/1000;
  if(animate){clock+=dt;updateGuards(dt);for(const f of flags){const pos=f.mesh.geometry.positions;for(let i=0;i<pos.length;i+=2){const u=f.base[i]/tex.banner.width;pos[i+1]=f.base[i+1]+Math.sin(clock*3.3+u*5+f.phase)*u*11;pos[i]=f.base[i]+Math.sin(clock*2.7+u*4+f.phase)*u*3;}f.mesh.geometry.getBuffer('aPosition').update();}}
  fpsTimes.push(raw);fpsElapsed+=raw;if(fpsElapsed>=500){$('fps').textContent=String(Math.round(1000*fpsTimes.length/fpsElapsed));fpsTimes=[];fpsElapsed=0;}
  if(activeRun){activeRun.times.push(raw);if(now-activeRun.start>=activeRun.duration)finishRun(now);}
}
document.addEventListener('visibilitychange',()=>{lastFrame=0;if(activeRun)activeRun.interrupted=true;});

async function init(){
  performance.setResourceTimingBufferSize(1000);
  await app.init({resizeTo:window,background:0x343d30,antialias:true,autoDensity:true,resolution:Math.min(devicePixelRatio,2),preference:'webgl',powerPreference:'high-performance'});
  $('scene').appendChild(app.canvas);app.stage.addChild(camera);
  manifest=await (await fetch(`${import.meta.env.BASE_URL}assets/manifest.json`)).json();
  let loaded=0;await Promise.all(manifest.assets.map(async a=>{tex[a.name]=await Assets.load(`${import.meta.env.BASE_URL}${a.file}`);$('load-message').textContent=`正在載入宮城素材… ${++loaded} / ${manifest.assets.length}`;}));
  buildScene();resetCamera();bindCamera();$('renderer').textContent=`PIXIJS 8 · ${rendererName().toUpperCase()}`;
  app.ticker.add(tick);$('loading').classList.add('loaded');
  const api={
    ready:true,measurements,
    snapshot:()=>({night,animate,selected,editing,buildings:buildingLayout.buildings.map(b=>({id:b.id,x:b.x,y:b.y,depth:b.depth,label:b.labelPosition})),clock,camera:{x:camera.x,y:camera.y,scale:camera.scale.x},guards:guards.map(g=>({x:g.sprite.x,y:g.sprite.y,zIndex:g.sprite.zIndex})),palaceDepth:palace.zIndex,assetBytes:manifest.totalBytes,resources:resources(),renderer:rendererName(),viewport:{width:app.screen.width,height:app.screen.height,dpr:devicePixelRatio,resolution:app.renderer.resolution}}),
    benchmark:(scenario='manual',seconds=60)=>new Promise<Measurement>((resolve,reject)=>{if(!Number.isFinite(seconds)||seconds<1)return reject(new Error('Benchmark duration must be at least 1 second'));if(activeRun)return reject(new Error('A benchmark is already active'));activeRun={scenario,start:performance.now(),duration:seconds*1000,times:[],interrupted:document.hidden,resolve,night,animation:animate};}),
    setNight,setAnimation,resetCamera,
    // Coordinates only, for reproducible UI input verification without bypassing input handlers.
    palacePoint:()=>palace.toGlobal({x:0,y:-400}),
    downloadMeasurements:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(measurements,null,2)],{type:'application/json'}));a.download='palace-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);},
  };
  Object.assign(window,{__palace:api});
  // Opt-in measurement mode: no additional game controls or external telemetry.
  const mode=new URLSearchParams(location.search).get('benchmark');
  if(mode&&['day','night','day-paused','night-paused'].includes(mode)){
    api.setNight(mode.startsWith('night'));api.setAnimation(!mode.endsWith('paused'));
    setTimeout(()=>void api.benchmark(mode,60).then(result=>{
      const output=document.createElement('script');output.type='application/json';output.id='benchmark-result';output.textContent=JSON.stringify(result);document.body.appendChild(output);console.info('PALACE_BENCHMARK',JSON.stringify(result));
    }),5000);
  }
}
init().catch(error=>{console.error(error);$('loading').classList.add('error');$('load-message').textContent=`場景載入失敗：${error instanceof Error?error.message:String(error)}。請重新整理，或確認 WebGL 與素材檔案可用。`;});
