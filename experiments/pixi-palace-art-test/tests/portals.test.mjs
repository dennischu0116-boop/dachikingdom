import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { portals, shortcuts, buildingRoutes, PortalNavigation, resolvePortal } from '../src/portal-data.ts';
import { portalContent, escapeHTML } from '../src/portals.ts';
import { BuildingLayout, LAYOUT_STORAGE_KEY } from '../src/building-layout.ts';
const layout=JSON.parse(await readFile(new URL('../src/layout.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../public/assets/manifest.json',import.meta.url),'utf8'));

test('all ten world entrances and seven shortcuts resolve to populated, reachable panels',()=>{
 assert.equal(layout.buildings.length,10);assert.equal(shortcuts.length,7);
 assert.equal(new Set(layout.buildings.map(b=>b.id)).size,10);
 for(const b of layout.buildings){assert.ok(buildingRoutes[b.id]);const {portal}=resolvePortal(buildingRoutes[b.id]);assert.equal(portal.asset,b.asset);assert.ok(manifest.assets.find(a=>a.name===b.asset));assert.ok(b.x-b.width/2>=0&&b.x+b.width/2<=layout.width);assert.ok(b.y<=layout.height);}
 for(const [route,tab] of shortcuts)assert.equal(resolvePortal(route,tab).tab.id,tab);
 for(const p of portals){assert.equal(new Set(p.tabs.map(t=>t.id)).size,p.tabs.length);for(const t of p.tabs){assert.ok(t.items.length||p.id==='system'&&t.id==='settings');for(const item of t.items){if(item.route){const resolved=resolvePortal(item.route,item.tab);if(item.tab)assert.equal(resolved.tab.id,item.tab);}if(item.action)assert.ok(item.effect);}}}
});

test('every tab, detail and operation preview renders with demo disclosure; fixtures never mutate',()=>{
 const before=JSON.stringify(portals);let details=0,previews=0;
 for(const p of portals)for(const t of p.tabs){const nav=new PortalNavigation();nav.open(p.id,t.id);const html=portalContent(nav);assert.ok(html.includes('示範資料'));assert.ok(html.includes(p.title));
  t.items.forEach((item,index)=>{if(item.route)return;nav.detail(index);assert.ok(portalContent(nav).includes(escapeHTML(item.description)));details++;
   if(item.action){nav.preview();assert.ok(portalContent(nav).includes(escapeHTML(item.effect)));assert.ok(portalContent(nav).includes('所有示範數值保持不變'));nav.back();assert.equal(nav.current.item,index);previews++;}
   nav.back();assert.equal(nav.current.item,undefined);assert.equal(nav.current.tab,t.id);
  });
 }
 assert.ok(details>50);assert.ok(previews>30);assert.equal(JSON.stringify(portals),before);
});

test('nested route navigation returns to source tab; switching tab leaves no stale detail',()=>{
 const nav=new PortalNavigation();nav.open('court','pending');nav.open('military','defense');nav.detail(0);nav.preview();nav.back();assert.equal(nav.current.item,0);nav.back();assert.equal(nav.current.tab,'defense');nav.back();assert.equal(nav.current.route,'court');assert.equal(nav.current.tab,'pending');nav.selectTab('summary');assert.equal(nav.history.length,1);assert.equal(nav.current.tab,'summary');assert.equal(nav.current.item,undefined);nav.close();assert.equal(nav.current,undefined);assert.equal(portalContent(nav),'');
});

test('unknown routes fail explicitly and text is escaped before HTML rendering',()=>{
 assert.throws(()=>resolvePortal('missing'),/Unknown portal/);assert.equal(resolvePortal('court','missing').tab.id,'court');assert.equal(escapeHTML('<img src="x" onerror=\'x\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;');
});

test('all ten buildings can move and restore; older three-building configuration is not applied',()=>{
 const polygon=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
 const specs=layout.buildings.map(b=>({id:b.id,x:b.x,y:b.y,width:b.width,height:b.width*manifest.assets.find(a=>a.name===b.asset).height/manifest.assets.find(a=>a.name===b.asset).width,labelOffset:{x:b.label.x-b.x,y:b.label.y-b.y},polygon}));
 const model=new BuildingLayout(specs,layout.width,layout.height);
 for(const b of model.buildings){const before={x:b.x,y:b.y};model.begin(b.id,before);model.move({x:before.x+10,y:before.y+10});assert.equal(model.finish(),true);assert.equal(b.x,before.x+10);assert.equal(b.y,before.y+10);assert.equal(b.depth,b.y);assert.equal(b.labelPosition.y,b.y+b.labelOffset.y);}
 const saved=model.serialize();model.reset();assert.equal(model.restore(saved),true);assert.equal(model.serialize(),saved);
 const old=JSON.parse(saved);old.scene='art-remake-2';assert.equal(model.restore(JSON.stringify(old)),false);assert.equal(model.serialize(),saved);
 assert.equal(LAYOUT_STORAGE_KEY,'dachikingdom:pixi-palace:city-layout:v1');
});

test('preview selections are retained through confirmation and back without changing fixture data',()=>{
 const before=JSON.stringify(portals);const nav=new PortalNavigation();nav.open('military','defense');nav.detail(0);nav.choose('general','顧秉衡');nav.choose('troops','20 千');nav.choose('troops','invalid');nav.preview();assert.equal(nav.current.choices.general,'顧秉衡');assert.equal(nav.current.choices.troops,'20 千');assert.ok(portalContent(nav).includes('兵力配置示例：20 千'));nav.back();assert.equal(nav.current.choices.troops,'20 千');assert.ok(portalContent(nav).includes('<option selected>20 千</option>'));assert.equal(JSON.stringify(portals),before);
});
