import { palaceTestTransform } from './palace-test-transform.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const scriptId = '1aLEZaabh42IV9BTWEz9JXEehVolipj37eq330UwY9iyGLA3wMbNgupeZ';
const out = '.gas-test';
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out);
const files = ['程式碼.js','CodeSave.js','appsscript.json', ...fs.readdirSync('.').filter(n=>n.endsWith('.html'))];
assert.equal(files.length,16);
for (const name of files) {
  let text = fs.readFileSync(name,'utf8');
  if (name.endsWith('.html') || name === 'CodeSave.js') text = text.replaceAll('qing_', 'qing_redesign_test_');
  if (name === '程式碼.js') text = fs.readFileSync('scripts/fixtures/gas-test-server.js','utf8');
  if (name === 'CodeSave.js') text = '// Cloud saves and OAuth are disabled in the frontend-only test build.\n';
  const replaceOnce = (from,to) => {
    assert(text.includes(from), name + ': expected test transformation missing: ' + from);
    text = text.replace(from,to);
  };
  if (name === 'ClientShell.html') {
    replaceOnce('<button onClick={onCloud} className="bg-blue-700 text-white text-sm px-3 py-2 rounded">☁️ {cloudStatus || \'Google 登入／雲端存檔\'}</button>', '<span className="text-sm text-stone-600">免登入・僅本機存檔</span>');
  }
  if (name === 'ClientCore.html') {
    replaceOnce('const readCloudNewGameDraft = () => {', 'const readCloudNewGameDraft = () => { return null;');
    replaceOnce('const readCloudBinding = () => {', 'const readCloudBinding = () => { return null;');
  }
  if (name === 'AppState.html') {
    replaceOnce('const initialCloudBinding=cloudBindingMatches(initialSave?.cloudBinding,initialSave?.gameState)?initialSave.cloudBinding:null;', 'const initialCloudBinding=null;');
    replaceOnce("const [cloudLoginState, setCloudLoginState] = useState(()=>{try{return sessionStorage.getItem('qing_redesign_test_cloud_oauth_state')||'';}catch(error){return '';}});", "const [cloudLoginState, setCloudLoginState] = useState('');");
    replaceOnce("const config=await qingCloudGas('getCloudPublicConfig');", 'const config={oauthReady:false,maxSlots:0};');
    replaceOnce("try{session=sessionStorage.getItem('qing_redesign_test_cloud_session')||'';}catch(error){}", '// Login sessions are not restored in the guest-only test build.');
    replaceOnce('const submitScore = (stateToSave = gameState, silent = false, onDone = null) => {', 'const submitScore = (stateToSave = gameState, silent = false, onDone = null) => { if(onDone)onDone(); return;');
    replaceOnce('if (legacyImportRunningRef.current) return;', 'return; // Test fixtures never import player scores.');
  }
  if (name === 'AppWarAndMain.html') {
    replaceOnce('{showCloudPanel && CloudSavePanel()}', '{false && CloudSavePanel()}');
    replaceOnce('<button onClick={()=>setShowCloudPanel(true)} aria-busy={cloudSessionChecking} className={`text-[11px] bg-sky-700 rounded px-2 py-1 whitespace-nowrap ${cloudSessionChecking?\'animate-pulse\':\'\'}`}>☁ {cloudSessionChecking?\'雲端核對中…\':currentSaveLocation}</button>', '<span className="text-[11px] rounded px-2 py-1">本機存檔・測試版</span>');
  }
  if (name === 'AppModals.html') {
    replaceOnce('所有玩家共用 · 七榜各取前20名；點擊詳情可查看同一局保存的全部成績', '固定假資料 · 僅供版面測試，不會上傳遊戲成績');
  }
  if (name === 'Index.html') text = text.replace('<body>', '<body>\n<div role="note" style="position:fixed;bottom:0;right:0;z-index:2147483647;background:#7f1d1d;color:white;padding:4px 12px;font-size:12px;pointer-events:none">前端測試版・獨立存檔</div>');
  text = palaceTestTransform(name,text);
  fs.writeFileSync(path.join(out,name),text);
}
fs.writeFileSync(path.join(out,'.clasp.json'),JSON.stringify({scriptId,rootDir:'.'},null,2)+'\n');
console.log('Staged 16 application files for isolated frontend test GAS.');
