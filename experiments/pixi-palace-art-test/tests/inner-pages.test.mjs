import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {portals,PortalNavigation,resolvePortal} from '../src/portal-data.ts';
import {renderInnerPage} from '../src/inner-view.ts';
import {createInnerState,visibleOfficials,selectOfficial,setTraining,batchPreview,officials,themes} from '../src/inner-model.ts';
const manifest=JSON.parse(await readFile(new URL('../public/assets/ui/manifest.json',import.meta.url),'utf8'));
const files=new Set(manifest.assets.map(a=>a.file));

test('every inner tab and detail has a theme and real image assets; no unresolved image or route references',()=>{
 for(const p of portals){assert.ok(themes[p.id]);for(const t of p.tabs){const nav=new PortalNavigation();nav.open(p.id,t.id);
  for(const index of [-1,...t.items.map((_,i)=>i)]){if(index>=0)nav.detail(index);const html=renderInnerPage(nav);assert.ok(html.includes('示範資料'));assert.ok(html.includes('id="portal-title"'));
   for(const match of html.matchAll(/src="([^"]+)"/g))assert.ok(files.has(match[1]),`${p.id}/${t.id}: ${match[1]}`);
   for(const match of html.matchAll(/data-route="([^"]+)"(?: data-tab="([^"]*)")?/g)){const result=resolvePortal(match[1],match[2]);if(match[2])assert.equal(result.tab.id,match[2]);}
   if(index>=0)nav.back();
  }
 }}
});

test('central officers have the four current tabs and three correct office seats',()=>{
 const p=resolvePortal('ministries').portal;assert.deepEqual(p.tabs.map(t=>t.id),['officials','roster','academy','recruit']);assert.deepEqual(p.tabs[0].items.map(i=>i.title),['丞相','戶部尚書','兵部尚書']);
 const nav=new PortalNavigation();nav.open('ministries','officials');const html=renderInnerPage(nav);assert.equal((html.match(/class="office-seat"/g)||[]).length,3);assert.ok(html.includes('official-civil.webp'));assert.ok(html.includes('official-general.webp'));assert.ok(html.includes('擬定任命總詔'));
});

test('roster filtering, numeric sorting and selection keep original detail indices stable',()=>{
 const s=createInnerState();s.sort='military';assert.equal(visibleOfficials(s)[0].name,'陸承毅');assert.equal(visibleOfficials(s)[0].index,2);s.search='顧';assert.deepEqual(visibleOfficials(s).map(x=>x.id),['gu']);s.type='一般官員';assert.equal(visibleOfficials(s).length,0);s.type='歷史人才';s.status='已任職';assert.equal(visibleOfficials(s).length,1);
 selectOfficial(s,'gu',true);selectOfficial(s,'gu',true);selectOfficial(s,'unknown',true);assert.deepEqual(s.selected,['gu']);batchPreview(s,'賞賜');assert.ok(s.result.includes('顧秉衡'));assert.ok(s.result.includes('人物與資源保持不變'));selectOfficial(s,'gu',false);assert.equal(s.selected.length,0);
});

test('training and batch previews only mutate in-memory UI state, not fixtures or building storage',()=>{
 const before=JSON.stringify({portals,officials}),s=createInnerState();setTraining(s,'shen','經史');assert.deepEqual(s.training,{shen:'經史'});setTraining(s,'shen','invalid');setTraining(s,'missing','騎射');assert.deepEqual(s.training,{shen:'經史'});setTraining(s,'shen','');assert.deepEqual(s.training,{});selectOfficial(s,'lu',true);batchPreview(s,'進修');assert.equal(JSON.stringify({portals,officials}),before);
});

test('empty roster is actionable and recruitment produces the requested number of demo name cards',()=>{
 const nav=new PortalNavigation(),s=createInnerState();nav.open('ministries','roster');s.search='不存在';assert.ok(renderInnerPage(nav,s).includes('data-ui="reset-filters"'));nav.selectTab('recruit');s.recruitRevealed=true;s.recruitCount=10;assert.equal((renderInnerPage(nav,s).match(/class="revealed-card"/g)||[]).length,10);s.recruitCount=1;assert.equal((renderInnerPage(nav,s).match(/class="revealed-card"/g)||[]).length,1);
});

test('key functions use dedicated visual layouts instead of a shared generic card list',()=>{
 for(const [route,tab,signature] of [['harem','consorts','consort-gallery'],['clan','tree','family-tree'],['treasury','gifts','treasure-grid'],['military','defense','illustrated-map'],['government','finance','paper-ledger'],['school','children','children-gallery'],['council','cases','case-timeline'],['year','review','year-layout']]){
  const nav=new PortalNavigation();nav.open(route,tab);assert.ok(renderInnerPage(nav).includes(signature),route);
 }
});
