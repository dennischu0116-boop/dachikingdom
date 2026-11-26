import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import babel from '@babel/core';
const read = name=>fs.readFileSync('.gas-test/'+name,'utf8');
const id = '1aLEZaabh42IV9BTWEz9JXEehVolipj37eq330UwY9iyGLA3wMbNgupeZ';
assert.equal(JSON.parse(read('.clasp.json')).scriptId,id);
for(const name of fs.readdirSync('.gas-test').filter(n=>n.endsWith('.html'))) assert(!/['"]qing_(?!redesign_test_)/.test(read(name)), name+' has production browser storage');
const index=read('Index.html');
assert(index.includes('前端測試版・獨立存檔'));
const jsx=[...index.matchAll(/include\('([^']+)'\)/g)].filter(m=>m[1]!=='Styles').map(m=>read(m[1]+'.html')).join('\n');
babel.transformSync(jsx,{presets:['@babel/preset-react'],configFile:false,babelrc:false});
const props=new Map();let creates=0;let project=id;
const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v)})},
  ScriptApp:{getScriptId:()=>project},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  SpreadsheetApp:{create:()=>{creates++;return {getId:()=> 'test-sheet'};},openById:key=>{assert.equal(key,'test-sheet');return {}; }},
  DriveApp:{createFolder:()=>{creates++;return {getId:()=> 'test-folder'};},getFolderById:key=>{assert.equal(key,'test-folder');return {}; }},console:{log(){}}
});
const source=read('程式碼.js')+'\n'+read('CodeSave.js');
vm.runInContext(source,context);
assert.throws(()=>context.qingTestBook_(),/setupTestEnvironment/);
context.setupTestEnvironment();context.setupTestEnvironment();assert.equal(creates,2);
assert.equal(props.get('QING_CLOUD_FOLDER_ID'),'test-folder');
assert.throws(()=>context.qingTestFolder_('production-folder'),/設定不符/);
project='production-project';assert.throws(()=>context.setupTestEnvironment(),/指定測試 GAS/);project=id;
// Each Apps Script execution re-evaluates globals after initialization.
const fresh=vm.createContext({...context});
vm.runInContext(source,fresh);
fresh.qingTestBook_();
props.set('QING_TEST_SPREADSHEET_ID','1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE');
const wrong=vm.createContext({...context});vm.runInContext(source,wrong);
assert.throws(()=>wrong.qingTestBook_(),/禁止使用正式試算表/);
assert(!read('CodeSave.js').includes('SpreadsheetApp.openById'));
assert(!read('CodeSave.js').includes('DriveApp.getFolderById'));
console.log('Test isolation passed: JSX, browser keys, project guard, missing setup, idempotent setup, folder guard.');
