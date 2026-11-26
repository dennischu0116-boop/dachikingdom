import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cameraBounds,zoomTransform} from '../src/camera.ts';
test('wheel/pinch keeps the same world point under the cursor, including scale limits',()=>{
  for(const factor of [.01,.8,1.5,100]){
    const c={x:-250,y:-90,scale:1.25},p={x:350,y:240};
    const result=zoomTransform(c,factor,p,.5,3);
    assert.ok(Math.abs((p.x-c.x)/c.scale-(p.x-result.x)/result.scale)<1e-9);
    assert.ok(Math.abs((p.y-c.y)/c.scale-(p.y-result.y)/result.scale)<1e-9);
    assert.ok(result.scale>=.5&&result.scale<=3);
  }
});
test('drag constraints never expose empty ground in desktop and portrait viewports',()=>{
  for(const [vw,vh] of [[1440,900],[390,844],[844,390]])for(const scale of [.2,.8,2])for(const x of [-9000,250,0]){
    const c=cameraBounds({x,y:x,scale},vw,vh,1800,1200);
    if(1800*scale>=vw){assert.ok(c.x<=0);assert.ok(c.x+1800*scale>=vw);}else assert.equal(c.x,(vw-1800*scale)/2);
    if(1200*scale>=vh){assert.ok(c.y<=0);assert.ok(c.y+1200*scale>=vh);}else assert.equal(c.y,(vh-1200*scale)/2);
  }
});
