import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@babel/core';
import presetReact from '@babel/preset-react';
import BabelStandalone from '@babel/standalone';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('assets/characters/manifest.json'));
assert(packageJson.version === '1.4.3', 'package.json must be v1.4.3');
assert(manifest.version === 'v1.4.2' && manifest.status === 'PRODUCTION', 'character manifest is not production v1.4.2');
assert(read('ClientCore.html').includes('const APP_VERSION = "v1.4.3"'), 'ClientCore version mismatch');
assert(/const QING_SAVE_KEY\s*=\s*'qing_saveData'/.test(read('ClientShell.html')), 'production save key is missing');
assert(read('Index.html').includes('https://unpkg.com/@babel/standalone@7.28.5/babel.min.js'), 'browser Babel version must stay pinned to 7.28.5');
assert(read('ImageBeta.html').includes('const BETA_IMAGE_BASE=String(globalThis.QING_IMAGE_BETA_ASSET_BASE || "https://'), 'production image base must use the GAS-safe single-line literal');
assert(!read('AppWarAndMain.html').includes("bg-[url('https://"), 'external background URLs must not be embedded in JSX utility classes');
assert(read('AppWarAndMain.html').includes('className="game-main-surface ') && read('Styles.html').includes('.game-main-surface {'), 'main background must use the GAS-safe CSS class');
assert(read('AppWarAndMain.html').includes("onClick={()=>setShowCloudPanel(true)}") && read('AppWarAndMain.html').includes("cloudSlot?`槽位 ${cloudSlot}`:'雲端已登入'"), 'in-game cloud slot button is missing');
assert(read('AppWarAndMain.html').includes('appBooting&&<AppLoadingScreen/>') && !read('AppWarAndMain.html').includes('appBooting||cloudSessionChecking'), 'cloud session checks must not trigger the full-screen loader');
assert(read('AppWarAndMain.html').includes("cloudSessionChecking?'雲端核對中…'"), 'cloud session check needs a non-blocking status indicator');
const modalSource=read('AppModals.html');
assert(modalSource.includes("!event.nativeEvent?.isComposing&&event.keyCode!==229"), 'text prompts must not submit while a Chinese IME is composing');
assert(!modalSource.includes('完成 Google 登入'), 'manual cloud-login completion button remains');
assert(modalSource.includes("beginCloudLogin('same_tab')")&&modalSource.includes('改在目前頁面登入'), 'same-tab OAuth fallback is missing');
const cloudServer=read('CodeSave.js');
assert(cloudServer.includes("mode === 'same_tab'")&&cloudServer.includes('window.location.replace('), 'same-tab OAuth return is missing');
assert(cloudServer.includes('setTimeout(function(){window.close();},700)')&&cloudServer.includes('pending: true'), 'automatic popup close or pending handoff response is missing');
assert(read('AppState.html').includes("setTimeout(poll,attempts<20?1500:5000)")&&read('AppState.html').includes("consumeCloudLoginHandoff")&&read('AppState.html').includes('visibilitychange'), 'automatic OAuth handoff polling is missing');
const styleSource=read('Styles.html');
assert(styleSource.includes('.recruit-flip-card.is-revealed .recruit-flip-back { visibility:hidden; }'), 'revealed recruit cards do not hide the exam-card back');
assert(styleSource.includes('@media(max-width:899px)')&&styleSource.includes('@media(max-width:359px)'), 'responsive recruit-card breakpoints are missing');
assert(read('ClientContent.html').includes('const enemyHomelandOccupation = (state, enemyName) =>'), 'foreign occupation resolver is missing');
assert(read('AppWarAndMain.html').includes('displacedHomeland=enemyHomelandOccupation(gameState,target.name)') && read('AppWarAndMain.html').includes('請改為攻打${displacedHomeland.occupier}收復失土'), 'foreign-occupied homeland attack guard is missing');
assert(read('AppWarAndMain.html').includes('舊地遭${displacedHomeland.occupier}佔領'), 'foreign occupation target status is missing');
const territoryRuleMatch=read('ClientContent.html').match(/      const enemyTerritoryName =[\s\S]*?(?=      \/\/ 保護現有省份)/);
assert(territoryRuleMatch, 'could not isolate territory occupation rules');
const territoryRuleContext={globalThis:{}};
territoryRuleContext.globalThis=territoryRuleContext;
vm.runInNewContext(`${territoryRuleMatch[0]}\nglobalThis.__enemyHomelandOccupation=enemyHomelandOccupation;`,territoryRuleContext);
const foreignOccupiedState={provinces:[],lostProvinces:[{id:'former-a',name:'甲國舊地',occupier:'乙國'}]};
assert(territoryRuleContext.__enemyHomelandOccupation(foreignOccupiedState,'甲國')?.occupier==='乙國', 'foreign occupier was not resolved from lost territory');
assert(territoryRuleContext.__enemyHomelandOccupation({provinces:[{id:'owned-a',name:'甲國舊地'}],lostProvinces:[]},'甲國')===null, 'owned homeland must not be treated as foreign occupied');
assert(territoryRuleContext.__enemyHomelandOccupation({provinces:[],lostProvinces:[{id:'former-a',name:'甲國舊地',occupier:'甲國'}]},'甲國')===null, 'enemy reclaiming its own homeland must remain an actionable occupier');

const clasp = JSON.parse(read('.clasp.json'));
assert(clasp.scriptId === '1XgG3H6UsAsOkhYWEMnkf8svciGRGrXqcwQYzJtrEhABvrrfCfo0K9C0t', 'unexpected production GAS script ID');
assert(!fs.existsSync(path.join(root, 'BetaServer.js')), 'BetaServer.js must not be shipped to production');
for (const required of ['程式碼.js', 'CodeSave.js', 'Index.html']) {
  assert(fs.existsSync(path.join(root, required)), `missing production source: ${required}`);
}

const handoffValues=new Map();
const handoffProperties={
  getProperty:key=>handoffValues.has(key)?handoffValues.get(key):null,
  setProperty:(key,value)=>handoffValues.set(key,value),
  deleteProperty:key=>handoffValues.delete(key)
};
const cloudSaveContext={console:{error(){},warn(){},log(){}},PropertiesService:{getScriptProperties:()=>handoffProperties}};
cloudSaveContext.globalThis=cloudSaveContext;
vm.runInNewContext(`${read('CodeSave.js')}\nglobalThis.__consumeCloudLoginHandoff=consumeCloudLoginHandoff;`,cloudSaveContext);
const handoffState='a'.repeat(64),handoffKey=`QING_OAUTH_HANDOFF_${handoffState}`;
assert(cloudSaveContext.__consumeCloudLoginHandoff(handoffState).pending===true,'unfinished OAuth handoff must remain pending');
handoffValues.set(handoffKey,JSON.stringify({sessionToken:'session-token',createdAt:Date.now()}));
assert(cloudSaveContext.__consumeCloudLoginHandoff(handoffState).sessionToken==='session-token','completed OAuth handoff was not consumed');
handoffValues.set(handoffKey,JSON.stringify({error:'玩家取消授權',createdAt:Date.now()}));
const failedHandoff=cloudSaveContext.__consumeCloudLoginHandoff(handoffState);
assert(failedHandoff.ok===false&&failedHandoff.error.includes('玩家取消授權'),'OAuth callback failure was not returned to the game');

const includePattern = /<\?!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g;
const compiled = read('Index.html').replace(includePattern, (_, name) => read(`${name}.html`));
assert(!compiled.includes('<?!='), 'unresolved Apps Script template include');
const babelSource = compiled.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)?.[1];
assert(babelSource, 'could not find the Babel application script');
transformSync(babelSource, { presets: [[presetReact, { runtime: 'classic' }]], babelrc: false, configFile: false });
BabelStandalone.transform(babelSource, { presets: ['react'], sourceType: 'script' });

const expectedCounts = { civil: 24, military: 20, consort: 30, special: 10, special_military: 17, special_civil: 8, royal_prince: 32, royal_princess: 32, emperor: 4 };
assert(JSON.stringify(manifest.counts) === JSON.stringify(expectedCounts), 'character category counts changed unexpectedly');
const entries = Object.entries(manifest.portraits || {});
assert(entries.length === 173, `expected 173 character IDs, found ${entries.length}`);
const dimensions = { thumbs: [128, 128, 64 * 1024], headshots: [256, 256, 96 * 1024], portraits: [768, 1152, 384 * 1024] };

const webpSize = buffer => {
  assert(buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP', 'invalid WebP header');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)];
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  if (chunk === 'VP8 ') return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
  throw new Error(`unsupported WebP chunk ${chunk}`);
};

const expectedFiles = new Set();
for (const [id, entry] of entries) {
  for (const [field, directory] of [['thumb', 'thumbs'], ['headshot', 'headshots'], ['full', 'portraits']]) {
    const relative = entry[field];
    assert(relative === `${directory}/${id}.webp`, `unexpected ${field} path for ${id}`);
    expectedFiles.add(relative);
    const fullPath = path.join(root, 'assets/characters', relative);
    assert(fs.existsSync(fullPath), `missing image ${relative}`);
    const buffer = fs.readFileSync(fullPath);
    const [width, height] = webpSize(buffer);
    const [expectedWidth, expectedHeight, maxBytes] = dimensions[directory];
    assert(width === expectedWidth && height === expectedHeight, `${relative} is ${width}x${height}, expected ${expectedWidth}x${expectedHeight}`);
    assert(buffer.length <= maxBytes, `${relative} exceeds ${maxBytes} bytes`);
  }
}
const actualFiles = [];
for (const directory of Object.keys(dimensions)) {
  for (const file of fs.readdirSync(path.join(root, 'assets/characters', directory))) {
    if (file.endsWith('.webp')) actualFiles.push(`${directory}/${file}`);
  }
}
assert(actualFiles.length === 519, `expected 519 WebP files, found ${actualFiles.length}`);
assert(actualFiles.every(file => expectedFiles.has(file)), 'unlisted WebP file found');
const emperorEntries=Object.entries(manifest.emperorAvatars||{});
assert(emperorEntries.length===4,'expected four emperor avatar entries');
for(const [id,relative] of emperorEntries){
  assert(relative===`emperors/${id}.webp`,`unexpected emperor avatar path for ${id}`);
  const buffer=fs.readFileSync(path.join(root,'assets/characters',relative));
  const [width,height]=webpSize(buffer);
  assert(width===256&&height===256,`${relative} must be 256x256`);
  assert(buffer.length<=96*1024,`${relative} exceeds 96KB`);
}

const state = read('AppState.html');
assert(state.includes('betaPortraitAssignments:latest.betaPortraitAssignments||{}'), 'cloud sync omits portrait assignments');
assert(state.includes('setBetaPortraitAssignments(normalized.betaPortraitAssignments||{})'), 'cloud load omits portrait assignments');
assert(!state.includes('圖片測試版已停用排行榜連線'), 'beta leaderboard guard remains');
assert(!read('AppWarAndMain.html').includes('圖片效能實驗室'), 'image performance lab remains in player UI');
assert(state.includes('...emperorLeaderboardAvatarPayload(stateToSave)'), 'leaderboard submission omits emperor avatar');
assert(state.includes('submitScore(gameState, true, loadLeaderboard)') && state.includes('else if (showLeaderboard) loadLeaderboard()'), 'leaderboard refresh must sync once without recursion');
assert(state.includes('submitScore(next,true)'), 'avatar changes must immediately update the leaderboard');
assert(read('AppModals.html').includes("id===String(gameState.gameId||'')") && read('AppModals.html').includes('assets={gameState.emperorAvatarAssets}'), 'current leaderboard entry must use the local avatar');
const leaderboardServer=read('程式碼.js');
assert(leaderboardServer.includes("'avatarKind', 'avatarValue'"), 'leaderboard avatar columns are missing');
assert(leaderboardServer.includes('function getLeaderboardAvatar(gameId)'), 'on-demand leaderboard avatar endpoint is missing');
assert(read('ClientShell.html').includes('fullCanvas.width=256')&&read('ClientShell.html').includes('boardCanvas.width=96'), 'avatar upload resize rules are missing');

const portraitSource = read('ImageBeta.html').split('      const BetaPortrait =')[0] + `
globalThis.__portraits={BETA_IMAGE_META,betaAllocatePortraits,betaPortraitKey,betaRoyalPortraitId,betaPortraitIdForPerson,betaPortraitIdForCandidate,normalizeEmperorAvatarState,emperorLeaderboardAvatarPayload};`;
const portraitContext = {
  globalThis: {},
  getConsortAge: person => Number(person.age) || 20,
  isRoyalChildMinister: person => !!person?.isRoyalChild,
  royalIdOf: person => person?.royalId || person?.id
};
portraitContext.globalThis = portraitContext;
vm.runInNewContext(portraitSource, portraitContext);
const portraits = portraitContext.__portraits;
const royalChild = { id: 'child-1', royalId: 'royal-1', name: '未賜名', gender: 'male', age: 15 };
const sampleState = {
  gameId: 'run-production-check',
  ministers: [{ id: 'minister-1', name: '測試官', age: 32, civil: 80, military: 40 }],
  consorts: [{ id: 'consort-1', name: '測試妃', age: 22, rank: '答應' }],
  retiredMinisters: [], deceasedConsorts: [], historicalConsorts: [],
  childrenList: [royalChild], royalFamily: []
};
const firstAssignments = portraits.betaAllocatePortraits(sampleState, {});
assert(Object.keys(portraits.BETA_IMAGE_META).length===173,'expanded portrait metadata count is incorrect');
assert(portraits.BETA_IMAGE_META.civil_young_008&&portraits.BETA_IMAGE_META.military_senior_004&&portraits.BETA_IMAGE_META.consort_senior_005&&portraits.BETA_IMAGE_META.royal_princess_016_adult,'expanded portrait IDs are missing');
const specialTalentIds=['guan_yu','lu_bu','yue_fei','sun_wu','bai_qi','xiang_yu','li_jing','wu_qi','zhao_yun','zhang_fei','han_xin','huo_qubing','wei_qing','xu_da','qi_jiguang','zhou_yu','guo_ziyi','zhuge_liang','zhang_liang','xiao_he','wei_zheng','di_renjie','bao_zheng','fan_zhongyan','wang_an_shi'];
assert(specialTalentIds.every(id=>portraits.BETA_IMAGE_META[`special_talent_${id}`]),'dedicated special-talent portrait IDs are missing');
assert(specialTalentIds.every(id=>read('ClientCore.html').includes(`key:'${id}'`)),'portrait list and special-person roster are out of sync');
const preservedAssignments=portraits.betaAllocatePortraits(sampleState,{'minister:minister-1':'civil_young_001','consort:consort-1':'consort_young_001'});
assert(preservedAssignments['minister:minister-1']==='civil_young_001'&&preservedAssignments['consort:consort-1']==='consort_young_001','existing portrait assignments changed after pool expansion');
const specialMinister={id:'special-guan',name:'關羽',age:38,civil:75,military:110,specialId:'guan_yu'};
const specialAssignments=portraits.betaAllocatePortraits({...sampleState,ministers:[specialMinister]}, {'minister:special-guan':'military_middle_001'});
assert(specialAssignments['minister:special-guan']==='special_talent_guan_yu','old generic assignment did not migrate to the dedicated special-talent portrait');
assert(portraits.betaPortraitIdForPerson(sampleState,{'minister:special-guan':'military_middle_001'},'minister',specialMinister)==='special_talent_guan_yu','special-talent detail view did not immediately override an old generic assignment');
const archivedSpecialAssignments=portraits.betaAllocatePortraits({...sampleState,ministers:[],retiredMinisters:[specialMinister]}, {'minister:special-guan':'military_middle_001'});
assert(archivedSpecialAssignments['minister:special-guan']==='special_talent_guan_yu','archived special talent did not retain the dedicated portrait');
const specialCandidate={id:'candidate-zhuge',name:'諸葛亮',age:35,civil:115,military:72,specialId:'zhuge_liang'};
assert(portraits.betaPortraitIdForCandidate(sampleState,{},'minister',specialCandidate)==='special_talent_zhuge_liang','special recruit candidate did not receive its dedicated portrait');
const expandedPoolState={...sampleState,gameId:'expanded-pool-check',childrenList:[],
  ministers:[...[...Array(8)].map((_,index)=>({id:`civil-${index}`,name:`文官${index}`,age:25,civil:80,military:20})),
    ...[...Array(8)].map((_,index)=>({id:`military-${index}`,name:`武將${index}`,age:25,civil:20,military:80}))],
  consorts:[...Array(13)].map((_,index)=>({id:`consort-${index}`,name:`妃嬪${index}`,age:22,rank:'答應'}))};
const expandedPoolAssignments=Object.values(portraits.betaAllocatePortraits(expandedPoolState,{}));
assert(expandedPoolAssignments.some(id=>/^civil_young_00[5-8]$/.test(id)),'new civil portraits are not reachable by allocation');
assert(expandedPoolAssignments.some(id=>/^military_young_00[5-8]$/.test(id)),'new military portraits are not reachable by allocation');
assert(expandedPoolAssignments.some(id=>/^consort_young_0(09|1[0-3])$/.test(id)),'new consort portraits are not reachable by allocation');
const renamedAssignments = portraits.betaAllocatePortraits({ ...sampleState, childrenList: [{ ...royalChild, name: '永安' }] }, firstAssignments);
assert(firstAssignments['royal:royal-1'] === renamedAssignments['royal:royal-1'], 'royal portrait changed after renaming');
const childPortrait = portraits.betaRoyalPortraitId(sampleState, firstAssignments, royalChild);
const adultPortrait = portraits.betaRoyalPortraitId(sampleState, firstAssignments, { ...royalChild, age: 16 });
assert(childPortrait.endsWith('_child') && adultPortrait.endsWith('_adult'), 'royal age-stage switch failed');
assert(childPortrait.replace('_child', '') === adultPortrait.replace('_adult', ''), 'royal child/adult pair does not share one identity');
const royalMinister = { id: 'minister-royal', royalId: 'royal-1', isRoyalChild: true, name: '皇子 永安', gender: 'male', age: 20 };
const officialPortrait = portraits.betaPortraitIdForPerson({ ...sampleState, ministers: [royalMinister] }, firstAssignments, 'minister', royalMinister);
assert(officialPortrait === adultPortrait, 'adult royal official did not retain the paired adult portrait');
const customAsset={full:'data:image/webp;base64,AAAA',leaderboard:'data:image/webp;base64,AAAA'};
const customState=portraits.normalizeEmperorAvatarState({gameId:'run-avatar',currentEmperorId:'emperor-avatar',emperorHistory:[],
  emperorAvatar:{kind:'custom',assetId:'custom_1234abcd'},emperorAvatarAssets:{custom_1234abcd:customAsset,custom_deadbeef:customAsset}});
assert(customState.emperorAvatar.kind==='custom'&&Object.keys(customState.emperorAvatarAssets).length===1,'custom emperor avatar deduplication/pruning failed');
assert(portraits.emperorLeaderboardAvatarPayload(customState).avatarValue===customAsset.leaderboard,'leaderboard thumbnail selection failed');

console.log('Production verification passed: v1.4.3, Babel syntax, automatic OAuth handoff, IME-safe prompts, responsive recruit cards, 173 character IDs and 523 WebP assets.');
