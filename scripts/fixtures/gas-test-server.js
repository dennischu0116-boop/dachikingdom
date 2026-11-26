// Frontend-only test server. No database, Drive, OAuth or player writes.
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('大清帝國・免登入前端測試版')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}
function getCloudPublicConfig() {
  return {ok:true, oauthReady:false, maxSlots:0};
}
function getLeaderboard() {
  const eras=['承安','景祐','弘化','光緒','永寧','建隆','天啟'];
  const names=['測試皇帝・長名字版面測試','測試明君','測試武帝','測試仁宗'];
  const data=Array.from({length:24},(_,i)=>({
    gameId:'run_test_'+i, dynastyId:'dynasty_test_'+i,
    name:names[i%names.length]+(i+1), eraName:eras[i%eras.length],
    years:8+i*4, gameWon:i%3!==0, winYears:i%3!==0?8+i:0,
    unificationOwnerGameId:i%3!==0?'run_test_'+i:'',
    maxMinisterScore:180+i*9, maxMinisterName:'測試名臣'+(i+1),
    maxChildScore:120+i*7, maxChildName:'測試皇子'+(i+1),
    maxTreasury:(i+1)*123456, maxConsortCount:1+i, maxDescendantCount:i*3,
    timestamp:1795651200000+i*1000, avatarKind:'', avatarValue:'',hasCustomAvatar:false
  }));
  return {ok:true,data,mine:{},testData:true};
}
function submitLeaderboardScore() { return {ok:true,skipped:true,testData:true}; }
function importExistingLeaderboardScores() { return {ok:true,skipped:true,testData:true}; }
function getLeaderboardAvatar() { return {ok:true,kind:'',value:''}; }
