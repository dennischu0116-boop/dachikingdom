import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectGround,unprojectGround,groundCoverage,roadCorners} from '../src/ground.ts';
import {BuildingLayout} from '../src/building-layout.ts';
const layout=JSON.parse(await readFile(new URL('../src/layout.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../public/assets/manifest.json',import.meta.url),'utf8'));
const basis=layout.ground.basis;

test('shared ground projection covers every world corner without stretching a perspective image',()=>{
 const bounds=groundCoverage(basis,layout.width,layout.height);
 for(const screen of [{x:0,y:0},{x:2600,y:0},{x:0,y:1800},{x:2600,y:1800},{x:1300,y:900}]){
  const p=unprojectGround(basis,screen);assert.ok(p.x>=bounds.x&&p.x<=bounds.x+bounds.width);assert.ok(p.y>=bounds.y&&p.y<=bounds.y+bounds.height);
  const q=projectGround(basis,p);assert.ok(Math.abs(q.x-screen.x)<1e-8&&Math.abs(q.y-screen.y)<1e-8);
 }
 assert.throws(()=>unprojectGround({a:1,b:1,c:1,d:1},{x:0,y:0}),/invertible/);
});

test('independent road uses the same two directions as the paving',()=>{
 const [a,b,c,d]=roadCorners(basis,layout.ground.road);
 assert.ok(Math.abs((b.y-a.y)/(b.x-a.x)-basis.b/basis.a)<1e-8);
 assert.ok(Math.abs((d.x-a.x)/(d.y-a.y)-basis.c/basis.d)<1e-8);
 assert.ok(Math.abs((c.x-b.x)-(d.x-a.x))<1e-8);
});

test('default Taihe and gate stair-foot anchors sit on the road centerline',()=>{
 const road=layout.ground.road;
 for(const [id,key] of [['taihe','palaceFoot'],['gate','gateFoot']]){
  const b=layout.buildings.find(x=>x.id===id),asset=manifest.assets.find(x=>x.name===b.asset),anchor=layout.ground.alignment[key];
  const p={x:b.x+b.width*(anchor.u-.5),y:b.y+b.width*asset.height/asset.width*(anchor.v-1)};
  const local=unprojectGround(basis,{x:p.x-road.x,y:p.y-road.y});
  assert.ok(Math.abs(local.x)<12,`${id} stair foot is ${local.x} plane units from road center`);
  assert.ok(local.y>=-2&&local.y<road.length);
 }
});

test('previous city layout remains loadable; only explicit reset adopts the new gate and barracks defaults',()=>{
 const polygon=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
 const specs=layout.buildings.map(b=>({id:b.id,x:b.x,y:b.y,width:b.width,height:b.width*manifest.assets.find(a=>a.name===b.asset).height/manifest.assets.find(a=>a.name===b.asset).width,labelOffset:{x:b.label.x-b.x,y:b.label.y-b.y},polygon}));
 const model=new BuildingLayout(specs,layout.width,layout.height);
 const data=JSON.parse(model.serialize());data.positions.gate={x:1320,y:1670};data.positions.barracks={x:2130,y:1430};
 assert.ok(model.restore(JSON.stringify(data)));assert.equal(model.buildings.find(b=>b.id==='gate').x,1320);assert.equal(model.buildings.find(b=>b.id==='barracks').x,2130);
 model.reset();assert.equal(model.buildings.find(b=>b.id==='gate').x,2154);assert.equal(model.buildings.find(b=>b.id==='barracks').x,1130);
});
