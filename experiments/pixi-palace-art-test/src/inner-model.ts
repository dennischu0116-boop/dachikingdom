/** UI-only state: never serialized and never mutates production or fixture data. */
export const officials = [
 {id:'shen',name:'沈文清',portrait:'official-civil',type:'一般官員',status:'閒置',age:48,civil:86,military:34,loyalty:82,aptitude:88,skill:'熟諳河務，長於民政。'},
 {id:'gu',name:'顧秉衡',portrait:'official-revenue',type:'歷史人才',status:'已任職',age:58,civil:79,military:42,loyalty:88,aptitude:84,skill:'精研財賦，擅長戶籍核算。'},
 {id:'lu',name:'陸承毅',portrait:'official-general',type:'一般官員',status:'閒置',age:38,civil:45,military:91,loyalty:76,aptitude:90,skill:'熟悉邊防，長於統軍。'},
] as const;
export type InnerState={search:string;type:string;status:string;sort:string;selected:string[];training:Record<string,string>;notice:string;result:string;recruitRevealed:boolean;recruitCount:number};
export const createInnerState=():InnerState=>({search:'',type:'全部',status:'全部',sort:'default',selected:[],training:{},notice:'',result:'',recruitRevealed:false,recruitCount:1});
export function visibleOfficials(s:InnerState){return officials.map((p,index)=>({...p,index})).filter(p=>p.name.includes(s.search.trim())&&(s.type==='全部'||p.type===s.type)&&(s.status==='全部'||p.status===s.status)).sort((a,b)=>{
 if(s.sort==='default')return a.index-b.index;
 const key=s.sort as 'civil'|'military'|'loyalty'|'aptitude'|'age';
 return (b[key]??0)-(a[key]??0);
});}
export function selectOfficial(s:InnerState,id:string,selected:boolean){if(!officials.some(p=>p.id===id))return;s.selected=selected?[...new Set([...s.selected,id])]:s.selected.filter(x=>x!==id);}
export function setTraining(s:InnerState,id:string,course:string){if(!officials.some(p=>p.id===id)||!['','經史','騎射'].includes(course))return;const next={...s.training};if(course)next[id]=course;else delete next[id];s.training=next;}
export function batchPreview(s:InnerState,action:string){if(!s.selected.length)return;s.result=`${action}預覽：${officials.filter(p=>s.selected.includes(p.id)).map(p=>p.name).join('、')}。這是操作預覽，人物與資源保持不變。`;}
export const themes:Record<string,{background:string;emblem:string;section:string;summary:string}>={
 court:{background:'hall',emblem:'edict',section:'朝廷',summary:'御前奏事 · 百官候旨'},ministries:{background:'hall',emblem:'seal',section:'吏部',summary:'知人善任 · 百官各司其職'},government:{background:'study',emblem:'edict',section:'六部',summary:'理財賦 · 興百業 · 睦邦交'},council:{background:'study',emblem:'edict',section:'軍機',summary:'慎密察訪 · 案牘有據'},military:{background:'camp',emblem:'helmet',section:'兵部',summary:'整軍經武 · 守土安邦'},harem:{background:'garden',emblem:'ruyi',section:'內廷',summary:'庭深花靜 · 宮中日常'},school:{background:'study',emblem:'books',section:'上書房',summary:'明德修業 · 皇嗣課讀'},study:{background:'study',emblem:'books',section:'御書房',summary:'勤學修身 · 文武兼備'},clan:{background:'study',emblem:'seal',section:'宗人府',summary:'玉牒世系 · 皇室家乘'},treasury:{background:'hall',emblem:'ruyi',section:'內府',summary:'珍藏有序 · 賞賜有度'},gate:{background:'garden',emblem:'edict',section:'天下',summary:'巡覽山河 · 體察民情'},emperor:{background:'hall',emblem:'seal',section:'御覽',summary:'弘熙十二年 · 山河在抱'},year:{background:'hall',emblem:'edict',section:'歲計',summary:'歲終稽核 · 朝野總覽'},system:{background:'study',emblem:'books',section:'設定',summary:'宮城偏好 · 操作指南'},resources:{background:'study',emblem:'seal',section:'國勢',summary:'民生軍政 · 一覽天下'},
};
