import { Application, Assets, Container, Graphics, MeshPlane, Polygon, Rectangle, Sprite, Text, Texture, WebGLRenderer } from 'pixi.js';
import './style.css';
import { cameraBounds, zoomTransform } from './camera';

type AssetRecord = { name: string; file: string; width: number; height: number; bytes: number };
type Manifest = { assets: AssetRecord[]; totalBytes: number };
type Point = { x: number; y: number };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const WIDTH = 1800, HEIGHT = 1200;
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
let palace: Container, highlight: Sprite, taiheLabel: Text;
const palaceHit = new Polygon([-285,-635, 285,-635, 315,-440, 395,-360, 395,-130, 255,5, -270,5, -395,-130, -395,-360, -310,-440]);
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
  const pole=sprite('flagpole',24,0,0,c);
  const mesh=new MeshPlane({texture:tex.banner,verticesX:10,verticesY:8});
  mesh.width=48;mesh.height=76;mesh.position.set(0,-pole.height+12);c.addChild(mesh);
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
  // Buildings share a ground-contact depth with their complete terrace; walkways route around the plinth.
  palace=new Container();palace.position.set(900,700);palace.zIndex=700;objects.addChild(palace);
  sprite('terrace',790,0,0,palace);
  highlight=sprite('taihe',616,0,-266,palace);highlight.tint=0xffe19a;highlight.alpha=.48;highlight.visible=false;
  sprite('taihe',600,0,-270,palace);
  shadow(910,640,365,60,.18);
  const east=sprite('east-hall',370,360,650); shadow(375,650,180,28);
  const west=sprite('west-pavilion',315,1455,605);shadow(1460,605,140,27);
  // Two side halls, one main hall. Ground-contact Y makes passing behind/in front observable.
  east.label='east-hall';west.label='west-pavilion';
  taiheLabel=label('太和殿',900,338,true);label('東配殿',355,522);label('西配殿',1450,466);
  const trees:[string,number,number,number][]=[['pine',167,385,255],['cypress',340,310,165],['pine',1515,320,250],['cypress',1650,460,155],['pine',185,835,240],['cypress',1600,850,180],['pine',425,1015,240],['pine',1435,1040,260],['cypress',75,1085,200],['cypress',1730,1090,180]];
  trees.forEach(t=>addTree(...t));
  [[590,710],[1210,710],[620,900],[1180,900]].forEach(([x,y],i)=>addFlag(x,y,i*1.3));
  [[690,680],[1110,680],[670,890],[1130,890],[480,755],[1320,755]].forEach(([x,y])=>addLamp(x,y));
  sprite('brazier',58,780,675);sprite('brazier',58,1020,675);
  frames=Array.from({length:4},(_,row)=>Array.from({length:6},(_,col)=>new Texture({source:tex.guards.source,frame:new Rectangle(col*128,row*128,128,128)})));
  const routes:Point[][]=[
    [{x:485,y:740},{x:1290,y:820},{x:1270,y:955},{x:490,y:880}],
    [{x:1290,y:820},{x:1270,y:955},{x:490,y:880},{x:485,y:740}],
    [{x:210,y:535},{x:490,y:565},{x:490,y:725},{x:210,y:690}],
    [{x:1300,y:520},{x:1570,y:550},{x:1570,y:710},{x:1300,y:680}],
  ];
  routes.forEach((route,i)=>{const s=new Sprite(frames[0][0]);s.anchor.set(.5,.94);s.width=55;s.height=55;objects.addChild(s);const sh=shadow(0,0,9,3,.24);guards.push({sprite:s,shadow:sh,route,segment:0,progress:i*.06,speed:27+i*2});});
  updateGuards(0);setNight(false);setAnimation(animate);
}
function updateGuards(dt:number) {
  for(const g of guards){
    let a=g.route[g.segment],b=g.route[(g.segment+1)%g.route.length];
    g.progress+=dt*g.speed/Math.hypot(b.x-a.x,b.y-a.y);
    if(g.progress>=1){g.progress%=1;g.segment=(g.segment+1)%g.route.length;a=g.route[g.segment];b=g.route[(g.segment+1)%g.route.length];}
    const dx=b.x-a.x,dy=b.y-a.y;
    const row=dy>=0?(dx>=0?0:1):(dx>=0?2:3);
    g.sprite.texture=frames[row][Math.floor(clock*7)%6];
    g.sprite.position.set(a.x+dx*g.progress,a.y+dy*g.progress);
    g.sprite.zIndex=g.sprite.y;g.shadow.position.set(g.sprite.x+4,g.sprite.y+2);
  }
}
function setNight(value:boolean){if(activeRun&&value!==night)activeRun.interrupted=true;night=value;world.tint=night?0x7389b5:0xffffff;lightLayer.tint=night?0xffe4b5:0xffffff;lightLayer.visible=night;shadows.alpha=night?.45:1;labels.tint=night?0xffe7b2:0xffffff;$('day-night').setAttribute('aria-pressed',String(night));$('day-night').querySelector('span')!.textContent=night?'夜晚':'白晝';}
function setAnimation(value:boolean){if(activeRun&&value!==animate)activeRun.interrupted=true;animate=value;$('animation').setAttribute('aria-pressed',String(animate));$('animation').querySelector('span')!.textContent=animate?'動畫開啟':'動畫關閉';}
function select(value:boolean){selected=value;highlight.visible=value;taiheLabel.style.fill=value?0xffefb5:0xf4dfaf;$('hint').textContent=value?'已選取太和殿 · 拖曳移動 · 滾輪／雙指縮放':'拖曳移動 · 滾輪／雙指縮放 · 點選太和殿';}
let baseScale=1;
function clampCamera(){const p=cameraBounds({x:camera.x,y:camera.y,scale:camera.scale.x},app.screen.width,app.screen.height,WIDTH,HEIGHT);camera.position.set(p.x,p.y);}
function resetCamera(){baseScale=Math.max(app.screen.width/WIDTH,app.screen.height/HEIGHT);camera.scale.set(baseScale);camera.position.set((app.screen.width-WIDTH*baseScale)/2,(app.screen.height-HEIGHT*baseScale)/2+30);clampCamera();}
function zoomAt(factor:number,point:Point){const p=zoomTransform({x:camera.x,y:camera.y,scale:camera.scale.x},factor,point,baseScale*.85,baseScale*2.6);camera.position.set(p.x,p.y);camera.scale.set(p.scale);clampCamera();}
const pointers=new Map<number,Point>();let down:Point|null=null,dragged=false,pinched=false;
function bindCamera(){
  const canvas=app.canvas;const point=(e:PointerEvent|WheelEvent):Point=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*app.screen.width/r.width,y:(e.clientY-r.top)*app.screen.height/r.height};};
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const p=point(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){down=p;dragged=false;pinched=false;}else{pinched=true;dragged=true;}canvas.classList.add('dragging');});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e),prev=pointers.get(e.pointerId)!;
    if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)![1];const oldDistance=Math.hypot(prev.x-other.x,prev.y-other.y),newDistance=Math.hypot(p.x-other.x,p.y-other.y);const before={x:(prev.x+other.x)/2,y:(prev.y+other.y)/2},after={x:(p.x+other.x)/2,y:(p.y+other.y)/2};if(oldDistance>1){zoomAt(newDistance/oldDistance,before);camera.x+=after.x-before.x;camera.y+=after.y-before.y;}}
    else if(pointers.size===1){camera.x+=p.x-prev.x;camera.y+=p.y-prev.y;if(down&&Math.hypot(p.x-down.x,p.y-down.y)>5)dragged=true;}
    pointers.set(e.pointerId,p);clampCamera();
  });
  const end=(e:PointerEvent)=>{if(!pointers.has(e.pointerId))return;if(e.type==='pointerup'&&!dragged&&!pinched&&pointers.size===1){const local=palace.toLocal(point(e));select(palaceHit.contains(local.x,local.y));}pointers.delete(e.pointerId);if(pointers.size===0){canvas.classList.remove('dragging');down=null;}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('dragging');});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const unit=e.deltaMode===1?16:e.deltaMode===2?app.screen.height:1;zoomAt(Math.exp(-e.deltaY*unit*.0012),point(e));},{passive:false});
  $('reset').onclick=resetCamera;$('day-night').onclick=()=>setNight(!night);$('animation').onclick=()=>setAnimation(!animate);
  app.renderer.on('resize',resetCamera);
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
    snapshot:()=>({night,animate,selected,clock,camera:{x:camera.x,y:camera.y,scale:camera.scale.x},guards:guards.map(g=>({x:g.sprite.x,y:g.sprite.y,zIndex:g.sprite.zIndex})),palaceDepth:palace.zIndex,assetBytes:manifest.totalBytes,resources:resources(),renderer:rendererName(),viewport:{width:app.screen.width,height:app.screen.height,dpr:devicePixelRatio,resolution:app.renderer.resolution}}),
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
