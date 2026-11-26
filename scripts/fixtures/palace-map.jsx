const PALACE_BUILDINGS = [
  {name:'太和殿',sub:'上朝聽政',x:50,y:29,action:'court'},
  {name:'養心殿',sub:'皇帝與設定',x:27,y:27,action:'settings'},
  {name:'後宮',sub:'妃嬪與探望',x:75,y:24,view:'HAREM'},
  {name:'文華殿',sub:'官員與科舉',x:20,y:49,view:'MINISTERS'},
  {name:'上書房',sub:'皇室教育',x:79,y:49,view:'SCHOOL'},
  {name:'戶部',sub:'稅賦與賑災',x:29,y:69,action:'government'},
  {name:'兵部',sub:'兵馬與征戰',x:70,y:70,view:'WAR'},
  {name:'工部',sub:'建設與改革',x:12,y:75,view:'WORKS'},
  {name:'宮門',sub:'微服私訪',x:50,y:86,action:'adventure'}
];
function PalaceMap({onNavigate,onAction,tasks,taskCount,badges={},reduceMotion,onNextYear,yearDisabled,yearLabel,onRankings,onSummary,hasSummary}) {
  const [zoom,setZoom]=useState(1);
  const [tasksOpen,setTasksOpen]=useState(true);
  const viewport=useRef(null), drag=useRef(null);
  useEffect(()=>{const el=viewport.current;if(el)el.scrollLeft=(el.scrollWidth-el.clientWidth)/2;},[]);
  const changeZoom=amount=>{
    const el=viewport.current;
    const next=Math.max(.7,Math.min(1.6,Math.round((zoom+amount)*10)/10));
    const cx=el?(el.scrollLeft+el.clientWidth/2)/el.scrollWidth:.5;
    const cy=el?(el.scrollTop+el.clientHeight/2)/el.scrollHeight:.5;
    setZoom(next);
    requestAnimationFrame(()=>{if(el){el.scrollLeft=cx*el.scrollWidth-el.clientWidth/2;el.scrollTop=cy*el.scrollHeight-el.clientHeight/2;}});
  };
  return <section className={'palace-world '+(reduceMotion?'palace-still':'')} aria-label="宮廷全景地圖">
    <div className="palace-map-viewport" ref={viewport} tabIndex={0} aria-label="拖曳或使用方向鍵探索宮廷，亦可使用下方快捷導覽"
      onPointerDown={e=>{if(e.target.closest('button')||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(!drag.current)return;e.currentTarget.scrollLeft=drag.current.left+drag.current.x-e.clientX;e.currentTarget.scrollTop=drag.current.top+drag.current.y-e.clientY;}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      <div className="palace-map-canvas" style={{width:`max(100%, ${1400*zoom}px)`}}>
        <img className="palace-panorama" src={PALACE_MAP_IMAGE} alt="宮廷全景：中央太和殿、左右院落與南側宮門" draggable="false"/>
        <div className="palace-map-shade"/>
        {!reduceMotion&&<div className="palace-petals" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{left:`${i*12}%`,animationDelay:`-${i*2}s`,animationDuration:`${14+i}s`}}/>)}</div>}
        {PALACE_BUILDINGS.map(b=><button key={b.name} className="palace-building" style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={()=>b.view?onNavigate(b.view):onAction(b.action)} aria-label={`${b.name}：${b.sub}`}><span className="palace-plaque">{b.name}</span>{badges[b.view]>0&&<b className="palace-badge">{badges[b.view]}</b>}<span className="palace-building-sub">{b.sub}</span></button>)}
      </div>
    </div>
    <div className="palace-map-title" aria-hidden="true"><small>THE IMPERIAL PALACE</small><strong>紫禁御苑</strong><span>一朝風華 · 萬里山河</span></div>
    <aside className="palace-tasks"><button className="palace-tasks-heading" onClick={()=>setTasksOpen(v=>!v)} aria-expanded={tasksOpen}>御前待辦 <b>{taskCount}</b><span>{tasksOpen?'收合 −':'展開 ＋'}</span></button>{tasksOpen&&<div className="palace-task-list">{tasks}{taskCount===0&&<p>朝務已清，四海待治。</p>}{hasSummary&&<button onClick={onSummary}>查看本年摘要 →</button>}</div>}</aside>
    <div className="palace-zoom" aria-label="地圖縮放"><button aria-label="縮小地圖" onClick={()=>changeZoom(-.1)} disabled={zoom<=.7}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="放大地圖" onClick={()=>changeZoom(.1)} disabled={zoom>=1.6}>＋</button></div>
    <footer className="palace-dock"><nav aria-label="宮廷快捷導覽">{[['朝政','government'],['官員','MINISTERS'],['後宮','HAREM'],['皇室','BUREAU'],['征戰','WAR'],['寶庫','TREASURY']].map(([label,key])=><button key={key} onClick={()=>key==='government'?onAction(key):onNavigate(key)}>{label}</button>)}<button onClick={onRankings}>排行榜</button></nav><button className="palace-year" onClick={onNextYear} disabled={yearDisabled}>{yearLabel} <span>→</span></button></footer>
  </section>;
}
