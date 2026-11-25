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
assert(packageJson.version === '1.4.1', 'package.json must be v1.4.1');
assert(manifest.version === 'v1.4.1' && manifest.status === 'PRODUCTION', 'character manifest is not production v1.4.1');
assert(read('ClientCore.html').includes('const APP_VERSION = "v1.4.1"'), 'ClientCore version mismatch');
assert(/const QING_SAVE_KEY\s*=\s*'qing_saveData'/.test(read('ClientShell.html')), 'production save key is missing');
assert(read('Index.html').includes('https://unpkg.com/@babel/standalone@7.28.5/babel.min.js'), 'browser Babel version must stay pinned to 7.28.5');
assert(read('ImageBeta.html').includes('const BETA_IMAGE_BASE=String(globalThis.QING_IMAGE_BETA_ASSET_BASE || "https://'), 'production image base must use the GAS-safe single-line literal');
assert(!read('AppWarAndMain.html').includes("bg-[url('https://"), 'external background URLs must not be embedded in JSX utility classes');
assert(read('AppWarAndMain.html').includes('className="game-main-surface ') && read('Styles.html').includes('.game-main-surface {'), 'main background must use the GAS-safe CSS class');
assert(read('AppWarAndMain.html').includes("onClick={()=>setShowCloudPanel(true)}") && read('AppWarAndMain.html').includes("cloudSlot?`槽位 ${cloudSlot}`:'雲端已登入'"), 'in-game cloud slot button is missing');

const clasp = JSON.parse(read('.clasp.json'));
assert(clasp.scriptId === '1XgG3H6UsAsOkhYWEMnkf8svciGRGrXqcwQYzJtrEhABvrrfCfo0K9C0t', 'unexpected production GAS script ID');
assert(!fs.existsSync(path.join(root, 'BetaServer.js')), 'BetaServer.js must not be shipped to production');
for (const required of ['程式碼.js', 'CodeSave.js', 'Index.html']) {
  assert(fs.existsSync(path.join(root, required)), `missing production source: ${required}`);
}

const includePattern = /<\?!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g;
const compiled = read('Index.html').replace(includePattern, (_, name) => read(`${name}.html`));
assert(!compiled.includes('<?!='), 'unresolved Apps Script template include');
const babelSource = compiled.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)?.[1];
assert(babelSource, 'could not find the Babel application script');
transformSync(babelSource, { presets: [[presetReact, { runtime: 'classic' }]], babelrc: false, configFile: false });
BabelStandalone.transform(babelSource, { presets: ['react'], sourceType: 'script' });

const expectedCounts = { civil: 12, military: 10, consort: 18, special: 10, royal_prince: 16, royal_princess: 16, emperor: 4 };
assert(JSON.stringify(manifest.counts) === JSON.stringify(expectedCounts), 'character category counts changed unexpectedly');
const entries = Object.entries(manifest.portraits || {});
assert(entries.length === 82, `expected 82 character IDs, found ${entries.length}`);
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
assert(actualFiles.length === 246, `expected 246 WebP files, found ${actualFiles.length}`);
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
const leaderboardServer=read('程式碼.js');
assert(leaderboardServer.includes("'avatarKind', 'avatarValue'"), 'leaderboard avatar columns are missing');
assert(leaderboardServer.includes('function getLeaderboardAvatar(gameId)'), 'on-demand leaderboard avatar endpoint is missing');
assert(read('ClientShell.html').includes('fullCanvas.width=256')&&read('ClientShell.html').includes('boardCanvas.width=96'), 'avatar upload resize rules are missing');

const portraitSource = read('ImageBeta.html').split('      const BetaPortrait =')[0] + `
globalThis.__portraits={betaAllocatePortraits,betaPortraitKey,betaRoyalPortraitId,betaPortraitIdForPerson,normalizeEmperorAvatarState,emperorLeaderboardAvatarPayload};`;
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

console.log('Production verification passed: v1.4.1, Babel syntax, GAS target, 82 character IDs, 4 emperor avatars and 250 WebP assets.');
