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
  if (name === '程式碼.js') {
    assert(text.includes("const QING_SPREADSHEET_ID = '1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE';"));
    text = text.replace("const QING_SPREADSHEET_ID = '1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE';", "const QING_SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('QING_TEST_SPREADSHEET_ID') || '';" );
    text = text.replace(".setTitle('大清帝國模擬器')", ".setTitle('大清帝國模擬器・前端測試版')");
    text += `
// Test infrastructure only. Run manually as the new project's owner.
function qingAssertTestProject_() {
  if (ScriptApp.getScriptId() !== '${scriptId}') throw new Error('測試程式只能在指定測試 GAS 執行');
}
function qingTestBook_() {
  qingAssertTestProject_();
  if (!QING_SPREADSHEET_ID || QING_SPREADSHEET_ID === '1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE') throw new Error('請先執行 setupTestEnvironment，禁止使用正式試算表');
  return SpreadsheetApp.openById(QING_SPREADSHEET_ID);
}
function qingTestFolder_(id) {
  qingAssertTestProject_();
  const expected = PropertiesService.getScriptProperties().getProperty('QING_TEST_FOLDER_ID');
  if (!id || id !== expected || id === '16SqJuP8tp6hofGfdJ3P8-RVSE18Vuhmq') throw new Error('測試存檔資料夾尚未初始化或設定不符');
  return DriveApp.getFolderById(id);
}
function qingTestFile_(id) {
  qingAssertTestProject_();
  const folderId = PropertiesService.getScriptProperties().getProperty('QING_TEST_FOLDER_ID');
  qingTestFolder_(folderId);
  const file = DriveApp.getFileById(id);
  const parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return file;
  throw new Error('檔案不屬於測試資料夾，已停止操作');
}
function setupTestEnvironment() {
  qingAssertTestProject_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const p = PropertiesService.getScriptProperties();
    let bookId = p.getProperty('QING_TEST_SPREADSHEET_ID');
    if (!bookId) {
      bookId = SpreadsheetApp.create('大清帝國_前端測試_排行榜與存檔索引').getId();
      p.setProperty('QING_TEST_SPREADSHEET_ID', bookId);
    }
    if (bookId === '1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE') throw new Error('禁止使用正式試算表');
    let folderId = p.getProperty('QING_TEST_FOLDER_ID');
    if (!folderId) {
      folderId = DriveApp.createFolder('大清帝國_前端測試_雲端存檔').getId();
      p.setProperty('QING_TEST_FOLDER_ID', folderId);
    }
    qingTestFolder_(folderId);
    p.setProperty('QING_CLOUD_FOLDER_ID', folderId);
    console.log('測試資料建立完成，請接著執行 setupLeaderboard。試算表 ID：' + bookId);
    return {spreadsheetId:bookId,folderId};
  } finally { lock.releaseLock(); }
}
`;
    // Replace only application access; preserve the guarded helper's actual open.
    text = text.replace('const book = SpreadsheetApp.openById(QING_SPREADSHEET_ID);','const book = qingTestBook_();');
  }
  if (name === 'CodeSave.js') {
    text = text.replaceAll('SpreadsheetApp.openById(QING_SPREADSHEET_ID)', 'qingTestBook_()');
    text = text.replaceAll('DriveApp.getFolderById(', 'qingTestFolder_(');
    text = text.replaceAll('DriveApp.getFileById(', 'qingTestFile_(');
    text = text.replace("folderId = DriveApp.createFolder('大清帝國_玩家雲端存檔').getId();", "throw new Error('請先執行 setupTestEnvironment');");
  }
  if (name === 'Index.html') text = text.replace('<body>', '<body>\n<div role="note" style="position:fixed;bottom:0;right:0;z-index:2147483647;background:#7f1d1d;color:white;padding:4px 12px;font-size:12px;pointer-events:none">前端測試版・獨立存檔</div>');
  fs.writeFileSync(path.join(out,name),text);
}
fs.writeFileSync(path.join(out,'.clasp.json'),JSON.stringify({scriptId,rootDir:'.'},null,2)+'\n');
console.log('Staged 16 application files for isolated frontend test GAS.');
