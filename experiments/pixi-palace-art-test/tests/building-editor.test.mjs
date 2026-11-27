import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BuildingLayout, LAYOUT_STORAGE_KEY, loadLayout, saveLayout, clearLayout } from '../src/building-layout.ts';
import { SceneGestures } from '../src/gestures.ts';

const rectangle=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
const specs=[
 {id:'taihe',x:350,y:450,width:300,height:200,labelOffset:{x:15,y:-100},polygon:rectangle},
 {id:'east-hall',x:700,y:450,width:150,height:100,labelOffset:{x:0,y:-50},polygon:rectangle},
 {id:'west-pavilion',x:950,y:450,width:150,height:100,labelOffset:{x:0,y:-50},polygon:rectangle},
];
const make=()=>new BuildingLayout(specs,1200,900);
function fixture(editing=true){
 const model=make(),camera={x:40,y:-20,scale:2},events={saves:0,taps:0,zooms:0};
 const toWorld=p=>({x:(p.x-camera.x)/camera.scale,y:(p.y-camera.y)/camera.scale});
 const screen=p=>({x:p.x*camera.scale+camera.x,y:p.y*camera.scale+camera.y});
 const gestures=new SceneGestures({
  toWorld,pick:p=>model.pick(p)?.id,begin:(id,p)=>model.begin(id,p),move:p=>model.move(p),
  finish:()=>{if(model.finish())events.saves++;},cancel:()=>model.cancel(),
  pan:(x,y)=>{camera.x+=x;camera.y+=y;},
  zoom:(factor,p)=>{const world=toWorld(p);camera.scale*=factor;camera.x=p.x-world.x*camera.scale;camera.y=p.y-world.y*camera.scale;events.zooms++;},
  tap:()=>events.taps++,
 });
 gestures.editing=editing;
 return {model,camera,events,gestures,screen};
}
test('dragging a building at 2× zoom moves world coordinates, label, depth and hit region together',()=>{
 const f=fixture(),p=f.screen({x:350,y:350}),camera={...f.camera};
 f.gestures.down(1,p);f.gestures.move(1,{x:p.x+100,y:p.y+60});
 const b=f.model.buildings[0];
 assert.equal(b.x,400);assert.equal(b.y,480);assert.equal(b.depth,480);
 assert.deepEqual(b.labelPosition,{x:415,y:380});assert.deepEqual(f.camera,camera);
 assert.equal(f.model.pick({x:210,y:350}),undefined);
 assert.equal(f.model.pick({x:400,y:380})?.id,'taihe');
 assert.equal(f.events.saves,0);
 f.gestures.up(1,{x:p.x+100,y:p.y+60});
 assert.equal(f.events.saves,1);assert.equal(f.events.taps,0);
});
test('normal mode drags the camera even over a building; empty ground pans in editing mode',()=>{
 for(const [editing,world] of [[false,{x:350,y:350}],[true,{x:80,y:800}]]){
  const f=fixture(editing),p=f.screen(world),before=f.model.serialize();
  f.gestures.down(1,p);f.gestures.move(1,{x:p.x+30,y:p.y+40});f.gestures.up(1,{x:p.x+30,y:p.y+40});
  assert.deepEqual(f.camera,{x:70,y:20,scale:2});assert.equal(f.model.serialize(),before);assert.equal(f.events.saves,0);
 }
});
test('a second finger commits an existing drag once then pinches without moving any building',()=>{
 const f=fixture(),p=f.screen({x:350,y:350});
 f.gestures.down(1,p);f.gestures.move(1,{x:p.x+20,y:p.y+20});
 f.gestures.down(2,{x:p.x+160,y:p.y+20});
 const layout=f.model.serialize();assert.equal(f.events.saves,1);
 f.gestures.move(2,{x:p.x+220,y:p.y+40});
 assert.ok(f.events.zooms>0);assert.equal(f.model.serialize(),layout);
 f.gestures.up(2,{x:p.x+220,y:p.y+40});
 f.gestures.move(1,{x:p.x+100,y:p.y+100});f.gestures.up(1,{x:p.x+100,y:p.y+100});
 assert.equal(f.model.serialize(),layout);assert.equal(f.events.saves,1);assert.equal(f.events.taps,0);
 const next=f.screen({x:360,y:360});f.gestures.down(3,next);f.gestures.move(3,{x:next.x+40,y:next.y});f.gestures.up(3,{x:next.x+40,y:next.y});
 assert.equal(f.events.saves,2);
});
test('cancelled capture rolls back position and label without writing a layout',()=>{
 const f=fixture(),before=f.model.serialize(),p=f.screen({x:350,y:350});
 f.gestures.down(1,p);f.gestures.move(1,{x:p.x+70,y:p.y+30});f.gestures.cancel();
 assert.equal(f.model.serialize(),before);assert.deepEqual(f.model.buildings[0].labelPosition,{x:365,y:350});
 f.gestures.move(1,{x:0,y:0});f.gestures.up(1,{x:0,y:0});assert.equal(f.events.saves,0);assert.equal(f.events.taps,0);
});
test('small touch jitter stays a tap; a final pointerup position is still committed',()=>{
 const f=fixture(),p=f.screen({x:350,y:350});
 f.gestures.down(1,p);f.gestures.up(1,{x:p.x+2,y:p.y+2});
 assert.equal(f.events.taps,1);assert.equal(f.events.saves,0);
 f.gestures.down(2,p);f.gestures.up(2,{x:p.x+80,y:p.y+40});
 assert.equal(f.model.buildings[0].x,390);assert.equal(f.events.saves,1);
});
test('finishing editing commits an active drag and releases gesture state',()=>{
 const f=fixture(),p=f.screen({x:350,y:350});
 f.gestures.down(1,p);f.gestures.move(1,{x:p.x+70,y:p.y});f.gestures.finish();
 assert.equal(f.events.saves,1);assert.equal(f.gestures.pointers.size,0);
 f.gestures.up(1,p);assert.equal(f.events.saves,1);
});
test('all three buildings remain fully inside the world when dragged far beyond an edge',()=>{
 for(const spec of specs){
  const m=make();m.begin(spec.id,{x:spec.x,y:spec.y-20});m.move({x:-99999,y:-99999});
  const b=m.buildings.find(b=>b.id===spec.id);assert.equal(b.x,spec.width/2);assert.equal(b.y,spec.height);
  m.move({x:99999,y:99999});assert.equal(b.x,1200-spec.width/2);assert.equal(b.y,900);
 }
});
test('overlapping buildings are picked in the same stable depth order used for rendering',()=>{
 const m=make();m.begin('east-hall',{x:700,y:450});m.move({x:350,y:480});m.finish();
 assert.equal(m.pick({x:350,y:400})?.id,'east-hall');
 m.begin('taihe',{x:350,y:450});m.move({x:350,y:500});m.finish();
 assert.equal(m.pick({x:350,y:400})?.id,'taihe');
});
test('normalized silhouettes exclude transparent corners and scale with sprite dimensions',()=>{
 const polygon=[{x:.5,y:0},{x:1,y:1},{x:0,y:1}];
 for(const width of [100,400]){
  const m=new BuildingLayout([{...specs[0],width,height:width,polygon}],1200,900);
  assert.equal(m.pick({x:350-width*.45,y:450-width*.9}),undefined);
  assert.equal(m.pick({x:350,y:450-width*.5})?.id,'taihe');
 }
});
test('reload restores saved world coordinates and derived label/depth; reset clears only this experiment',()=>{
 const data=new Map([['production-save','keep']]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const m=make();m.begin('taihe',{x:350,y:450});m.move({x:500,y:650});m.finish();assert.equal(saveLayout(m,storage),true);
 const reload=make();assert.equal(loadLayout(reload,storage),'restored');assert.equal(reload.serialize(),m.serialize());
 assert.deepEqual(reload.buildings[0].labelPosition,{x:515,y:550});assert.equal(reload.buildings[0].depth,650);
 reload.reset();assert.equal(clearLayout(storage),true);assert.equal(data.has(LAYOUT_STORAGE_KEY),false);assert.equal(data.get('production-save'),'keep');
 assert.equal(loadLayout(make(),storage),'default');assert.equal(reload.serialize(),make().serialize());
});
test('invalid or incompatible storage cannot partially move buildings; valid out-of-bounds data is clamped',()=>{
 const good=JSON.parse(make().serialize());
 for(const raw of ['{','null',JSON.stringify({...good,version:0}),JSON.stringify({...good,scene:'different'}),JSON.stringify({...good,positions:{taihe:{x:500,y:600}}}),JSON.stringify({...good,positions:{...good.positions,'east-hall':{x:'700',y:null}}})]){
  const m=make(),before=m.serialize();assert.equal(m.restore(raw),false);assert.equal(m.serialize(),before);
 }
 const m=make();good.positions.taihe={x:99999,y:-100};assert.equal(m.restore(JSON.stringify(good)),true);
 assert.equal(m.buildings[0].x,1050);assert.equal(m.buildings[0].y,200);
});
test('denied storage does not crash editing or report a successful save/reset',()=>{
 const denied={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('denied');}};
 const m=make();assert.equal(loadLayout(m,denied),'unavailable');assert.equal(saveLayout(m,denied),false);assert.equal(clearLayout(denied),false);
 assert.equal(loadLayout(m,null),'unavailable');assert.equal(saveLayout(m,null),false);assert.equal(clearLayout(null),false);
 m.begin('taihe',{x:350,y:450});m.move({x:450,y:550});assert.equal(m.finish(),true);assert.equal(m.buildings[0].x,450);
});

test('current renderer order decides equal-depth overlap after previous drags',()=>{
 const m=make();m.begin('east-hall',{x:700,y:450});m.move({x:350,y:450});m.finish();
 assert.equal(m.pick({x:350,y:400},['taihe','east-hall','west-pavilion'])?.id,'taihe');
 assert.equal(m.pick({x:350,y:400},['east-hall','taihe','west-pavilion'])?.id,'east-hall');
});
