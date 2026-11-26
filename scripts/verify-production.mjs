import fs from 'node:fs';
import { createHash } from 'node:crypto';
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
assert(packageJson.version === '1.4.6', 'package.json must be v1.4.6');
assert(manifest.version === 'v1.4.2' && manifest.status === 'PRODUCTION', 'character manifest is not production v1.4.2');
assert(read('ClientCore.html').includes('const APP_VERSION = "v1.4.6"'), 'ClientCore version mismatch');
assert(/const QING_SAVE_KEY\s*=\s*'qing_saveData'/.test(read('ClientShell.html')), 'production save key is missing');
assert(read('Index.html').includes('https://unpkg.com/@babel/standalone@7.28.5/babel.min.js'), 'browser Babel version must stay pinned to 7.28.5');
assert(read('ImageBeta.html').includes('const BETA_IMAGE_BASE=String(globalThis.QING_IMAGE_BETA_ASSET_BASE || "https://'), 'production image base must use the GAS-safe single-line literal');
assert(!read('AppWarAndMain.html').includes("bg-[url('https://"), 'external background URLs must not be embedded in JSX utility classes');
assert(read('AppWarAndMain.html').includes('className="game-main-surface ') && read('Styles.html').includes('.game-main-surface {'), 'main background must use the GAS-safe CSS class');
assert(read('AppWarAndMain.html').includes("onClick={()=>setShowCloudPanel(true)}") && read('AppWarAndMain.html').includes("cloudSessionChecking?'雲端核對中…':currentSaveLocation"), 'in-game cloud slot button is missing');
assert(read('AppWarAndMain.html').includes('appBooting&&<AppLoadingScreen/>') && !read('AppWarAndMain.html').includes('appBooting||cloudSessionChecking'), 'cloud session checks must not trigger the full-screen loader');
assert(read('AppWarAndMain.html').includes("cloudSessionChecking?'雲端核對中…'"), 'cloud session check needs a non-blocking status indicator');
const modalSource=read('AppModals.html');
const dialogSource=read('ClientShell.html').slice(read('ClientShell.html').indexOf('      const GameDialogModal ='));
assert(!modalSource.includes('const GameDialogModal')&&read('AppWarAndMain.html').includes('key={gameDialog.id} dialog={gameDialog}'),
  'text prompts must preserve a stable input component across game updates');
const promptRefs=[];
const promptResults=[];
const dialogContext={
  React:{createElement:(type,props,...children)=>({type,props,children})},
  useRef:value=>{const ref={current:value};promptRefs.push(ref);return ref;},
  promptResults
};
vm.createContext(dialogContext);
vm.runInContext(transformSync(`${dialogSource}
globalThis.promptTree=GameDialogModal({dialog:{id:1,type:'prompt',value:'景祐'},onResolve:value=>promptResults.push(value)});
`,{presets:[presetReact]}).code,dialogContext);
const promptNodes=(node)=>node?.children?[node,...node.children.flatMap(promptNodes)]:[];
const textField=promptNodes(dialogContext.promptTree).find(node=>node.type==='input').props;
const confirmPrompt=promptNodes(dialogContext.promptTree).filter(node=>node.type==='button')[1].props;
textField.ref.current={value:'景祐ㄅ'};
const imeEnter=(timeStamp,nativeEvent={})=>textField.onKeyDown({key:'Enter',timeStamp,nativeEvent,preventDefault(){}});
assert(textField.defaultValue==='景祐'&&textField.value===undefined,'browser must own the composing text');
textField.onCompositionStart();
imeEnter(100);
confirmPrompt.onClick();
textField.ref.current.value='景祐寶';
textField.onCompositionEnd({timeStamp:150});
imeEnter(151);
imeEnter(220,{keyCode:229});
assert(promptResults.length===0,'candidate selection must never submit unfinished input');
imeEnter(250);
assert(promptResults.length===1&&promptResults[0]==='景祐寶','Enter after composition must submit committed Chinese text');
assert(!modalSource.includes('完成 Google 登入'), 'manual cloud-login completion button remains');
assert(modalSource.includes("beginCloudLogin('same_tab')")&&modalSource.includes('改在目前頁面登入'), 'same-tab OAuth fallback is missing');
const cloudServer=read('CodeSave.js');
assert(cloudServer.includes("mode === 'same_tab'")&&cloudServer.includes('window.location.replace('), 'same-tab OAuth return is missing');
assert(cloudServer.includes('setTimeout(function(){window.close();},700)')&&cloudServer.includes('pending: true'), 'automatic popup close or pending handoff response is missing');
assert(read('AppState.html').includes("setTimeout(poll,attempts<20?1500:5000)")&&read('AppState.html').includes("consumeCloudLoginHandoff")&&read('AppState.html').includes('visibilitychange'), 'automatic OAuth handoff polling is missing');
const styleSource=read('Styles.html');
const recruitStyle=styleSource.slice(styleSource.indexOf('.recruit-reveal-shell {'),styleSource.indexOf('/* v1.4.1：'));
assert(recruitStyle.includes('transform:scaleX(0)')&&!/rotateY|translateZ|perspective|preserve-3d|backface-visibility/.test(recruitStyle), 'recruit animation must use only flat transforms');
const recruitFrontRule=recruitStyle.match(/^\s*\.recruit-flip-front\s*\{([^}]+)\}/m)?.[1];
assert(recruitFrontRule&&!/\b(?:transform|animation|visibility|opacity)\s*:/.test(recruitFrontRule), 'settled recruit-card front must render without animation styles');
assert(modalSource.includes('{!revealed&&<span className="recruit-flip-face recruit-flip-back"')&&modalSource.includes("{phase!=='covered'&&<span"), 'recruit-card faces must match the reveal phase');
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

// Exercise the cloud API with separate Drive and Sheets stores and injectable write failures.
const cloudRows=[];
const cloudFiles=new Map();
const cloudSummaryCache=new Map();
let failIndexWrite=false,failFlush=false,cloudUuid=0;
const cloudSheet={
  getLastRow:()=>cloudRows.length+1,
  getRange:(start,column,count,width)=>({
    getValues:()=>cloudRows.slice(start-2,start-2+count).map(row=>row.slice(column-1,column-1+width)),
    setValues:([values])=>{
      if(failIndexWrite)throw new Error('index write failed');
      cloudRows[start-2].splice(column-1,values.length,...values);
    }
  }),
  appendRow:values=>{
    if(failIndexWrite)throw new Error('index write failed');
    cloudRows.push([...values]);
  },
  deleteRow:row=>cloudRows.splice(row-2,1)
};
const cloudDriveFolder={
  getFilesByName:name=>{
    const matches=[...cloudFiles.values()].filter(file=>file.getName()===name);
    return {hasNext:()=>matches.length>0,next:()=>matches.shift()};
  },
  createFile:({name,raw,parent='folder'})=>{
    const id='file-'+(cloudFiles.size+1);
    let trashed=false;
    const file={
      getId:()=>id, getName:()=>name, getLastUpdated:()=>new Date(1000), isTrashed:()=>trashed,
      getParents:()=>{let more=true;return {hasNext:()=>more,next:()=>{more=false;return {getId:()=>parent};}};},
      setTrashed:value=>{trashed=value;}, getBlob:()=>({getDataAsString:()=>raw})
    };
    cloudFiles.set(id,file);
    return file;
  }
};
const cloudApiContext={
  console:{error(){},warn(){}},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  SpreadsheetApp:{flush:()=>{if(failFlush)throw new Error('flush reply lost');}},
  CacheService:{getScriptCache:()=>({get:key=>cloudSummaryCache.get(key),put:(key,value)=>cloudSummaryCache.set(key,value)})},
  DriveApp:{
    getFolderById:()=>cloudDriveFolder,
    getFileById:id=>{
      const file=cloudFiles.get(id);
      if(!file)throw new Error('missing Drive file');
      return file;
    }
  },
  Utilities:{newBlob:(raw,type,name)=>({raw,name})},
  cloudSheet,hash:value=>createHash('sha256').update(value).digest('base64url'),
  newId:()=>String(++cloudUuid)
};
vm.createContext(cloudApiContext);
vm.runInContext(`${cloudServer}
qcsUser_ = token => ({id: token, name: token});
qcsSheet_ = () => cloudSheet;
qcsProperties_ = () => ({getProperty: () => 'folder'});
qcsSha256_ = hash;
qcsRandom_ = newId;
`,cloudApiContext);
const {listCloudSaves,loadCloudSave,saveCloudGame,renameCloudSave,deleteCloudSave}=cloudApiContext;
const cloudPayload=(gameId,dynastyId,year)=>({version:2,savedAt:1,gameState:{gameId,dynastyId,year,ministers:[],provinces:[]},logs:[]});
const legacyPayload=cloudPayload('run_old','dynasty_old',8);
const legacyFile=cloudDriveFolder.createFile({name:`save_${cloudApiContext.hash('player').slice(0,12)}_1.json`,raw:JSON.stringify(legacyPayload)});
cloudRows.push(['player',1,'舊檔',legacyFile.getId(),1,1,'',2,'run_old']);
const legacySlot=listCloudSaves('player').slots[0];
assert(legacySlot.year===8&&legacySlot.dynastyId==='dynasty_old','legacy summary must come from the validated Drive payload');
assert(loadCloudSave('player',1,1,legacySlot.slotIdentity).payload.gameState.gameId==='run_old','legacy raw save must remain readable');
const successor=cloudPayload('run_heir','dynasty_old',1);
failIndexWrite=true;
assert(!saveCloudGame('player',1,'舊檔',successor,1,'run_old',legacySlot.slotIdentity).ok&&!legacyFile.isTrashed()&&
  loadCloudSave('player',1,1,legacySlot.slotIdentity).payload.gameState.gameId==='run_old','failed index update changed the previous save');
const fileCount=cloudFiles.size;
failIndexWrite=false;
const synced=saveCloudGame('player',1,'舊檔',successor,1,'run_old',legacySlot.slotIdentity);
assert(synced.ok&&synced.gameId==='run_heir'&&synced.slotIdentity===legacySlot.slotIdentity&&cloudFiles.size===fileCount,'succession must reuse the pending file and preserve slot identity');
assert(loadCloudSave('player',1,1,synced.slotIdentity).conflict,'a stale list revision must not load a different snapshot');
assert(saveCloudGame('player',1,'舊檔',legacyPayload,1,'run_old',synced.slotIdentity).conflict,'another tab must not overwrite a newer revision');
assert(saveCloudGame('player',2,'重複',successor,0).conflict,'the same dynasty must not acquire a second slot');
const fresh=cloudPayload('run_fresh','dynasty_fresh',1);
failFlush=true;
assert(!saveCloudGame('player',2,'新檔',fresh,0,'','','request-a').ok,'flush reply failure must be reported');
failFlush=false;
const afterFlushSize=cloudFiles.size;
const replayed=saveCloudGame('player',2,'新檔',fresh,0,'','','request-a');
assert(replayed.ok&&replayed.payload.gameState.gameId==='run_fresh'&&cloudFiles.size===afterFlushSize&&cloudRows.length===2,'retry must retrieve the committed creation without duplicating it');
assert(saveCloudGame('player',2,'新檔',fresh,0,'','','request-b').conflict,'different creation cannot take over an occupied slot');
assert(renameCloudSave('player',2,'改名',1,replayed.slotIdentity).ok,'rename should preserve verified identity');
assert(deleteCloudSave('player',2,2,replayed.slotIdentity).ok,'healthy file can be deleted by the requested revision');
const replacement=saveCloudGame('player',2,'重建',fresh,0,'','','request-a');
assert(replacement.ok&&replacement.slotIdentity!==replayed.slotIdentity&&
  loadCloudSave('player',2,1,replayed.slotIdentity).conflict,'deleting and recreating a slot must not accept a stale identity with the same revision');
assert(listCloudSaves('different-player').slots.length===0,'one account must not see another account’s slots');
cloudFiles.get(cloudRows[1][3]).setTrashed(true);
assert(listCloudSaves('player').slots[1].status==='review'&&
  !saveCloudGame('player',2,'覆寫',fresh,0,'','','request-a').ok,'trashed file must remain protected even when its summary was cached');
cloudRows.push([...cloudRows[0]]);
assert(listCloudSaves('player').slots[0].status==='review'&&!loadCloudSave('player',1,2,synced.slotIdentity).ok,'duplicate index rows must not resolve to an arbitrary save');

const legacyName=(user,slot)=>`save_${cloudApiContext.hash(user).slice(0,12)}_${slot}.json`;
const putLegacy=(slot,gameId,payload,name=legacyName('player',slot),parent='folder')=>{
  const file=cloudDriveFolder.createFile({name,raw:JSON.stringify(payload),parent});
  cloudRows.push(['player',slot,'相容檔',file.getId(),1,1,'',1,gameId]);
  return file;
};
putLegacy(3,'run_renamed',{gameState:cloudPayload('run_renamed','dynasty_renamed',4).gameState},'以前的存檔.json');
const renamed=listCloudSaves('player').slots.find(slot=>slot.slot===3);
assert(renamed.gameId==='run_renamed'&&loadCloudSave('player',3,1,renamed.slotIdentity).payload.logs.length===0,
  'verified renamed legacy save should load even without historical logs');
const inherited=cloudPayload('run_inherited','dynasty_inherited',1);
inherited.gameState.emperorHistory=[{gameId:'run_predecessor',successorId:'heir'}];
const originalRecovery=putLegacy(4,'run_predecessor',inherited);
const recovery=listCloudSaves('player').slots.find(slot=>slot.slot===4);
assert(recovery.status==='recoverable'&&!loadCloudSave('player',4,1,recovery.slotIdentity).ok&&
  loadCloudSave('player',4,1,recovery.slotIdentity,true).payload.gameState.gameId==='run_inherited'&&
  !loadCloudSave('player',4,1,'different-file',true).ok,'successor may only use the verified local recovery path');
assert(!saveCloudGame('player',4,'新檔',inherited,1,'run_predecessor',recovery.slotIdentity).ok&&
  !renameCloudSave('player',4,'改名',1,recovery.slotIdentity).ok&&!deleteCloudSave('player',4,1,recovery.slotIdentity).ok&&
  !originalRecovery.isTrashed(),'local recovery must preserve the original slot and file');
putLegacy(5,'run_foreign',cloudPayload('run_foreign','dynasty_foreign',5),legacyName('different-player',5));
assert(listCloudSaves('player').slots.find(slot=>slot.slot===5).status==='review',
  'a file with a foreign-managed filename must not bypass account checks, even with the same game ID');
cloudRows.push(['different-player',3,'別的帳號',renamed.slotIdentity,1,1,'',4,'run_renamed']);
assert(!loadCloudSave('player',3,1,renamed.slotIdentity).ok&&!loadCloudSave('different-player',3,1,renamed.slotIdentity).ok,
  'a file referenced by more than one account must be unavailable to both');
assert(listCloudSaves('player').slots.find(slot=>slot.slot===2).error.includes('垃圾桶'),
  'the recoverability screen must explain known Drive errors');

const cloudClient=read('AppState.html');
const switchSource=cloudClient.slice(cloudClient.indexOf('        const applyLoadedCloudSave ='),cloudClient.indexOf('        const loadCloudSlot ='));
const restoreSource=cloudClient.slice(cloudClient.indexOf('        const restoreCloudBinding='),cloudClient.indexOf('        useEffect(() => {',cloudClient.indexOf('        const restoreCloudBinding=')));
const coreSource=read('ClientCore.html');
const identitySource=coreSource.slice(coreSource.indexOf('      const cloudDynastyId'),coreSource.indexOf('      const ANNUAL_TAX_POLICIES'));
const clientWrites=[];
let rejectLocalWrite=true;
const cloudClientContext={
  cloudUser:{id:'player'}, cloudToken:'player', QING_SAVE_KEY:'qing_saveData',
  localStorage:{setItem:(key,value)=>{
    if(rejectLocalWrite)throw new Error('quota exceeded');
    clientWrites.push(['local',key,JSON.parse(value)]);
  }},
  normalizeLoadedGame:payload=>({...payload,betaPortraitAssignments:{}}), cleanGameStateForSave:state=>state,
  cloudBindingFor:record=>({slot:record.slot,gameId:record.gameId,dynastyId:record.dynastyId,userId:record.userId}),
  bindCloudRecord:(record,binding)=>clientWrites.push(['bind',binding]),
  clearCloudBinding:()=>clientWrites.push(['detach']),clearCloudSyncTimer(){},
  cloudPauseRef:{current:false}, setTimeout(){}, cancelCloudNewGame(){},
  cloudBindingRef:{current:{userId:'player',slot:1,revision:1,gameId:'run_old',dirty:false}},
  cloudLatestRef:{current:{isGameStarted:true,gameState:successor.gameState}},
  cloudContextRef:{current:{}},cloudSyncBlockedRef:{current:false},cloudDirtyRef:{current:false},
  saveCloudBinding:binding=>clientWrites.push(['binding',binding]),
  setCloudSlot:slot=>clientWrites.push(['slot',slot]),setCloudGuard:guard=>clientWrites.push(['guard',guard]),
  setGameState:state=>clientWrites.push(['game',state])
};
for(const name of ['BetaPortraitAssignments','Logs','IsGameStarted','CurrentView','CurrentEvent','YearReport','ShowVictoryModal',
  'ShowHeirSelection','RecruitReveal','ExamResult','DeathEvent','RetireEvent','ShowCloudPanel','ShowSystemSettings',
  'CloudRevision','CloudName','CloudSavedAt','CloudStatus']) cloudClientContext['set'+name]=()=>{};
vm.createContext(cloudClientContext);
vm.runInContext(`${identitySource}
${restoreSource}
${switchSource}
globalThis.applyLoadedCloudSave=applyLoadedCloudSave;
globalThis.restoreCloudBinding=restoreCloudBinding;`,cloudClientContext);
const cloudLoadResponse={...synced,userId:'player',payload:successor};
try { cloudClientContext.applyLoadedCloudSave(cloudLoadResponse); } catch(error) { assert(error.message==='quota exceeded','unexpected local write error'); }
assert(clientWrites.length===0,'a failed local write must not replace current game or binding');
rejectLocalWrite=false;
try { cloudClientContext.applyLoadedCloudSave({...cloudLoadResponse,userId:'other'}); } catch(error) { assert(error.message.includes('不符'),'unexpected identity validation error'); }
assert(clientWrites.length===0,'a response for another account must not be committed locally');
cloudClientContext.applyLoadedCloudSave(cloudLoadResponse);
assert(clientWrites[0][0]==='local'&&clientWrites[0][2].cloudBinding.slot===1&&clientWrites[0][2].gameState.gameId==='run_heir'&&
  clientWrites[1][0]==='bind'&&clientWrites[2][0]==='game','load must commit the matched payload and binding before switching UI');
clientWrites.length=0;
cloudClientContext.cloudLatestRef.current.gameState={...successor.gameState,emperorHistory:[{gameId:'run_old'}]};
cloudClientContext.restoreCloudBinding({user:{id:'player'},slots:[legacySlot]},'player');
const migratedBinding=clientWrites.find(([kind])=>kind==='binding')?.[1];
assert(migratedBinding?.dynastyId==='dynasty_old'&&migratedBinding.gameId==='run_old'&&migratedBinding.dirty,
  'an unsynced legacy succession must keep its original slot and expected remote reign');

clientWrites.length=0;
const localRecoveryResponse=loadCloudSave('player',4,1,recovery.slotIdentity,true);
try { cloudClientContext.applyLoadedCloudSave(localRecoveryResponse); } catch(error) { assert(error.message.includes('不符'),'unexpected recovery mode error'); }
assert(clientWrites.length===0,'local-only response cannot be applied by the normal cloud load path');
cloudClientContext.applyLoadedCloudSave(localRecoveryResponse,true);
assert(clientWrites[0][0]==='local'&&clientWrites[0][2].cloudBinding===null&&
  clientWrites[0][2].gameState.gameId==='run_inherited'&&!clientWrites.some(([kind])=>kind==='bind')&&
  cloudClientContext.cloudContextRef.current.slot===null,'local recovery must update the browser save without binding or enabling sync');

const preferenceSource=read('ClientPreferences.html');
const audioContextMarker=preferenceSource.indexOf('      const usePlayerPreferences');
assert(audioContextMarker>0,'missing player preferences hook');
let intervalId=0,testsAudioContext;
const liveAudioIntervals=new Set();
const storageForPreferences=new Map();
const preferencesContext={
  localStorage:{getItem:key=>storageForPreferences.get(key)},
  cloudDynastyId:state=>state.dynastyId,
  rulerIdOf:state=>state.currentEmperorId,
  royalIdOf:person=>person.royalId||person.id,
  royalConsortIdOf:(person,ruler)=>person.royalConsortId||ruler+'_'+person.id,
  setInterval:()=>{liveAudioIntervals.add(++intervalId);return intervalId;},
  clearInterval:id=>liveAudioIntervals.delete(id),
  setTimeout:callback=>callback()
};
vm.createContext(preferencesContext);
vm.runInContext(`${preferenceSource.slice(0,audioContextMarker)}
Object.assign(globalThis,{normalizePreferences,readPlayerPreferences,rescuePersonKey,rescueNeedsPopup,createPalaceAudio,eventOutcomeCue,defenseOutcomeCue});
`,preferencesContext);
const {normalizePreferences,readPlayerPreferences,rescuePersonKey,rescueNeedsPopup,createPalaceAudio}=preferencesContext;
assert(preferencesContext.eventOutcomeCue(true)==='eventSuccess'&&preferencesContext.eventOutcomeCue(false)==='eventFailure'&&
  preferencesContext.eventOutcomeCue(undefined)===null&&preferencesContext.defenseOutcomeCue(['win','loss'])==='mixed'&&
  preferencesContext.defenseOutcomeCue(['draw'])==='draw','only actual outcomes should select distinct cues');
const settingsDefault=readPlayerPreferences();
assert(settingsDefault.muted&&settingsDefault.musicVolume===30&&settingsDefault.effectsVolume===45&&settingsDefault.report==='popup','old browser should retain visible notices and start muted');
const dynasty={dynastyId:'dynasty_a',gameId:'run_old',childrenList:[{id:7,royalId:'royal_7',name:'幼名'}]};
const scopedRoyal=rescuePersonKey(dynasty,'royal','royal_7');
const settings=normalizePreferences({theme:'dark',layout:'single',textScale:130,musicVolume:105,effectsVolume:-4,muted:false,
  rescueGroups:{royal:'tasks',consort:'tasks',emperor:'tasks'},rescuePeople:{[scopedRoyal]:'popup'}});
storageForPreferences.set('qing_player_preferences_v1',JSON.stringify(settings));
assert(readPlayerPreferences().theme==='dark'&&settings.musicVolume===100&&settings.effectsVolume===0,'display, sound and stored settings must normalize');
const heir={...dynasty,gameId:'run_heir',childrenList:[{id:7,royalId:'royal_7',name:'新名'}]};
assert(rescueNeedsPopup(heir,{kind:'royal',personId:7},settings),'person exception must survive renaming and changing the reigning emperor');
assert(!rescueNeedsPopup({...heir,dynastyId:'dynasty_b'},{kind:'royal',personId:7},settings),'person exception must belong to its dynasty');
assert(!rescueNeedsPopup(heir,{kind:'consort',personId:8},settings)&&
  rescueNeedsPopup(heir,{kind:'emperor',personId:1},settings),'quiet candidates must be filtered, but emperor always announces');
class TestAudioContext {
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.oscillators=[];testsAudioContext=this;}
  parameter(){return {value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};}
  createGain(){return {gain:this.parameter(),connect(){},disconnect(){}};}
  createOscillator(){
    const node={frequency:this.parameter(),connect(){},disconnect(){},start(){},stops:[],stop(time){this.stops.push(time);}};
    this.oscillators.push(node);
    return node;
  }
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
}
const playerAudio=createPalaceAudio(TestAudioContext);
playerAudio.update(settingsDefault,'title',true);
assert(testsAudioContext.oscillators.length===0,'muted audio must not schedule any notes');
await playerAudio.resume();
playerAudio.update({...settingsDefault,muted:false},'title',true);
assert(liveAudioIntervals.size===1&&testsAudioContext.oscillators.length>0,'enabled score must start a single music scheduler');
const titleNoteCount=testsAudioContext.oscillators.length;
playerAudio.update({...settingsDefault,muted:false},'war',true);
const warNoteCount=testsAudioContext.oscillators.length;
assert(liveAudioIntervals.size===1&&warNoteCount>titleNoteCount,'scene change must replace the score scheduler');
playerAudio.play('recruit');
assert(testsAudioContext.oscillators.length===warNoteCount+3,'recruit should schedule one complete event cue');
playerAudio.update({...settingsDefault,muted:false},'war',false);
playerAudio.play('win');
assert(liveAudioIntervals.size===0&&testsAudioContext.state==='suspended'&&testsAudioContext.oscillators.length===warNoteCount+3,
  'background tab must stop scheduling score and event cues');
await playerAudio.resume();
playerAudio.update({...settingsDefault,muted:false,music:false,effects:true},'court',true);
playerAudio.play('report');
assert(liveAudioIntervals.size===0&&testsAudioContext.oscillators.length===warNoteCount+5,'event cues must work with background music disabled');
playerAudio.dispose();

const deathSource=cloudClient.slice(cloudClient.indexOf('        const resolvePendingDeaths ='),cloudClient.indexOf('        const handleAdventure ='));
const deaths=[{id:'death_1',kind:'emperor',personId:'emperor_a',name:'皇帝'},
  {id:'death_2',kind:'retired',personId:22,name:'退休官員'}];
const decisionContext={
  showFullRescue:false,deathDecisionRef:{current:false},rescueCandidates:deaths,rescueBatch:'death_1|death_2',
  deathRescueSelection:['death_2'],gameState:{pendingDeathCandidates:deaths,inventory:{revival_pill:2}},decisionCount:0,
  requestGameConfirm:async()=>{decisionContext.decisionCount+=1;return true;},showMessage(){},
  setGameState:update=>{decisionContext.gameState=update(decisionContext.gameState);},setDeathRescueSelection(){},
  rulerIdOf:()=> 'emperor_a',appendStateLog:state=>state,normalizeRoyalState:state=>state
};
vm.createContext(decisionContext);
vm.runInContext(`${deathSource}
globalThis.resolvePendingDeaths=resolvePendingDeaths;`,decisionContext);
await decisionContext.resolvePendingDeaths();
assert(decisionContext.decisionCount===0&&decisionContext.gameState.pendingDeathCandidates.length===2,
  'a filtered list must not adjudicate any unreviewed candidates');
decisionContext.showFullRescue=true;
await decisionContext.resolvePendingDeaths();
assert(decisionContext.decisionCount===1&&decisionContext.gameState.pendingDeathCandidates.length===0&&
  decisionContext.gameState.inventory.revival_pill===1&&decisionContext.gameState.declinedRevivalForEmperor==='emperor_a',
  'the complete list requires one decision and must consume exactly one pill for a selected candidate');
assert(cloudClient.includes('annualSummary:{report:annualReport,schoolNames:sixYearOldNames}')&&
  cloudClient.includes("sixYearOldNames.length&&preferences.school==='popup'")&&cloudClient.includes("preferences.report==='popup'"),
  'annual data must remain available independently of notification preferences');

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

console.log('Production verification passed: v1.4.6, Babel syntax, automatic OAuth handoff, cloud save integrity, IME-safe prompts, legacy cloud recovery, event and battle cues, responsive recruit cards, player preferences and annual notices, 173 character IDs and 523 WebP assets.');
