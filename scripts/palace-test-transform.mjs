import fs from 'node:fs';
import assert from 'node:assert/strict';
export function palaceTestTransform(name, source) {
  let text=source;
  const swap=(a,b)=>{assert(text.includes(a),`Palace transform missing in ${name}: ${a.slice(0,70)}`);text=text.replace(a,b);};
  if(name==='ClientShell.html')text+='\nconst PALACE_MAP_IMAGE = "data:image/webp;base64,'+fs.readFileSync('assets/palace/imperial-palace.webp').toString('base64')+'";\n'+fs.readFileSync('scripts/fixtures/palace-map.jsx','utf8');
  if(name==='ClientContent.html')swap('const PALACE_RELEASE_NOTES = [', `const PALACE_RELEASE_NOTES = [
{version:'宮廷地圖測試版',title:'全景宮廷・固定資源與待辦',details:['新增原創宮廷全景、建築牌匾與快捷導覽。拖曳地圖或使用方向鍵探索，以右上角按鈕縮放。','頂部資源與御前待辦保持固定；點擊待辦前往任命、戰線或生死裁決，手機可收合面板。','點擊宮殿開啟既有功能，戶部與朝政入口保留完整政務操作；返回地圖保留原本視角。結束本年仍遵守原有條件。','測試版免登入，沿用獨立本機存檔，排行榜為固定假資料；減少動畫設定會關閉落花。玩法、數值與存檔格式不變。']},`);
  if(name==='Styles.html')text+='\n'+fs.readFileSync('scripts/fixtures/palace-map.css','utf8');
  if(name==='AppState.html') {
    swap("const [currentView, setCurrentView] = useState('THRONE');", "const [currentView, setPalaceCurrentView] = useState('THRONE');\nconst [palacePanel,setPalacePanel]=useState(false);\nconst setCurrentView=value=>{setPalacePanel(false);setPalaceCurrentView(value);};");
  }
  if(name==='AppWarAndMain.html') {
    swap('className="min-h-screen bg-[#fdfbf7]', 'className="palace-shell min-h-screen bg-[#fdfbf7]');
    swap('className="bg-stone-900 text-amber-50 p-2 shadow-md sticky top-0 z-40"','className="palace-hud bg-stone-900 text-amber-50 p-2 shadow-md sticky top-0 z-40"');
    swap('className="flex-1 max-w-6xl mx-auto w-full p-2 md:p-4 flex flex-col"','className="palace-content flex-1 max-w-6xl mx-auto w-full p-2 md:p-4 flex flex-col"');
    swap("{currentView === 'THRONE' && (\n          <div className=\"grid", "{true && (\n          <div className=\"palace-resources grid");
    swap('<main className="game-main-surface flex-1 relative bg-amber-50 border-4 border-double border-stone-300 rounded-xl shadow-xl overflow-hidden">',`<main className="palace-main game-main-surface flex-1 relative">
      <PalaceMap reduceMotion={reduceMotion} onNavigate={setCurrentView}
        onAction={action=>{if(action==='court')handleCourt();else if(action==='adventure')handleAdventure();else if(action==='settings')setShowSystemSettings(true);else {setCurrentView('THRONE');setPalacePanel(true);}}}
        onNextYear={nextYear} yearDisabled={!!gameState.pendingRetirementPlan||getPendingRetirementMinisters(gameState).length>0}
        yearLabel={getPendingRetirementMinisters(gameState).length?'請先裁決老臣告老':'結束本年'} onRankings={fetchLeaderboard}
        badges={{MINISTERS:getOpenGovernmentPosts(gameState).length,WAR:(gameState.pendingBattleLines||[]).length,HAREM:dangerousConsorts.length}}
        onSummary={openAnnualSummary} hasSummary={!!gameState.annualSummary?.report}
        taskCount={getOpenGovernmentPosts(gameState).length+rescueCandidates.length+(gameState.pendingBattleLines||[]).length+dangerousMinisters.length+dangerousConsorts.length+getPendingRetirementMinisters(gameState).length+Number(!!gameState.pendingPalaceEvent)+Number(!!gameState.pendingAnnualDraft)}
        tasks={<>
          {getOpenGovernmentPosts(gameState).length>0&&<button onClick={()=>setCurrentView('MINISTERS')}>官職待任命 · {getOpenGovernmentPosts(gameState).length}<small>{getOpenGovernmentPosts(gameState).map(p=>p.label||p.provinceName||'空缺').slice(0,3).join('、')}</small></button>}
          {getOpenGovernmentPosts(gameState).some(p=>p.kind==='province')&&<button onClick={()=>setCurrentView('PROVINCES')}>前往地方官任命 →</button>}
          {rescueCandidates.length>0&&<button onClick={()=>setFullRescueBatch(rescueBatch)}>生死待決 · {rescueCandidates.length} 人</button>}
          {(gameState.pendingBattleLines||[]).length>0&&<button onClick={()=>setCurrentView('DEFEND')}>邊疆待部署 · {gameState.pendingBattleLines.length} 條戰線</button>}
          {getPendingRetirementMinisters(gameState).length>0&&<button onClick={()=>{setCurrentView('THRONE');setPalacePanel(true);}}>老臣告老待裁決 · {getPendingRetirementMinisters(gameState).length}</button>}
          {dangerousMinisters.length>0&&<button onClick={()=>setCurrentView('MINISTERS')}>官員忠誠告急 · {dangerousMinisters.length}</button>}
          {dangerousConsorts.length>0&&<button onClick={()=>setCurrentView('HAREM')}>後宮危機 · {dangerousConsorts.length}</button>}
          {!!(gameState.pendingPalaceEvent||gameState.pendingAnnualDraft)&&<button onClick={()=>setCurrentView('THRONE')}>宮廷事件待決 →</button>}
        </>}/>
      <div className="palace-panel" hidden={currentView==='THRONE'&&!palacePanel}>
      <button className="palace-panel-close" onClick={()=>{setCurrentView('THRONE');setPalacePanel(false);}}>返回宮廷地圖 ✕</button>`);
    swap('        </main>','      </div>\n        </main>');
  }
  return text;
}
