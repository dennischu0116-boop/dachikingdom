import { buildingRoutes, PortalNavigation, shortcuts, portals } from './portal-data.ts';
import { renderInnerPage } from './inner-view.ts';
import { createInnerState, visibleOfficials, selectOfficial, setTraining, batchPreview, officials } from './inner-model.ts';
import type { InnerState } from './inner-model.ts';
export { escapeHTML } from './ui-html.ts';
export function portalContent(nav:PortalNavigation,state?:InnerState):string { return renderInnerPage(nav,state); }
export function setupPortals() {
    const host = document.getElementById('city-ui')!;
    host.innerHTML = `
 <header class="city-top">
  <button class="emperor-button" data-route="emperor" aria-label="皇帝資料、成就與排行榜"><span class="imperial-seal emperor-headshot"><img src="assets/ui/emperor.webp" alt="皇帝示範肖像"></span><span><strong>大清帝國</strong><small>弘熙十二年 · 示範</small></span></button>
  <div class="vitals"><span>健康 <b>92</b></span><span>體力 <b>86 / 100</b></span></div>
  <nav class="system-nav" aria-label="系統工具"><button data-route="system" data-tab="save">存檔</button><button data-route="system" data-tab="manual">玩法</button><button data-route="system" data-tab="updates">更新</button><button data-audio id="audio-toggle" aria-pressed="false">音訊關閉</button><button data-route="system" data-tab="settings">設定</button></nav>
 </header>
 <div class="resource-bar" aria-label="國家資源">${[['國庫', '12.84萬'], ['人口', '982萬'], ['民心', '78'], ['軍力', '86千'], ['疆域', '12省']].map(([label, value]) => `<button data-route="resources"><small>${label}</small><b>${value}</b></button>`).join('')}</div>
 <aside class="affairs" aria-label="政務待辦"><p>御前待辦 <span>示範</span></p><button data-route="court" data-tab="pending"><b>待決事件</b><span>奏報與老臣請辭</span></button><button data-route="ministries" data-tab="officials"><b>中央官職 <i>3</i></b><span>中央三職任命</span></button><button data-route="military" data-tab="defense"><b>邊疆部署 <i>2</i></b><span>防線尚待配置</span></button><button data-route="harem" data-tab="stories"><b>危機預警</b><span>宮中事件待查</span></button></aside>
 <details class="chronicle"><summary>起居注 <span>戶部奏報：江南河務，候旨議處。</span></summary><ol><li>卯時 · 百官入朝，恭候聖駕。</li><li>辰時 · 戶部奏報江南河務。</li><li>巳時 · 兵部呈報北境與西陲防線。</li></ol><small>固定示範紀錄</small></details>
 <nav class="city-nav" aria-label="主城快捷入口">${shortcuts.map(([route, tab, title, glyph]) => `<button data-route="${route}" data-tab="${tab}"><span class="nav-medallion" aria-hidden="true">${glyph}</span><span>${title}</span></button>`).join('')}</nav>
 <button class="year-button" data-route="year"><span>結束本年</span><small>結算預覽</small></button>
 <div id="ui-announcement" class="ui-announcement" role="status" aria-live="polite"></div>
 <dialog class="inner-dialog" id="portal-dialog" aria-labelledby="portal-title"><div class="panel-toolbar"><button data-back>返回</button><button data-expand aria-pressed="false">展開面板</button><button data-close aria-label="關閉面板，返回主城">返回主城 ×</button></div><div class="panel-scroll" id="portal-content"></div><footer class="panel-footer">大清帝國 · 主城介面示範</footer></dialog>`;
    const dialog = document.getElementById('portal-dialog') as HTMLDialogElement;
    const content = document.getElementById('portal-content')!;
    const nav = new PortalNavigation();
    const innerState=createInnerState();
    let lastFocus: HTMLElement | null = null;
    let audio = false;
    let audioContext: AudioContext | null = null;
    let noticeTimer = 0;
    const announce = (message: string) => { const el = document.getElementById('ui-announcement')!; el.textContent = message; clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => el.textContent = '', 4000); };
    const render = (keepScroll=false) => {
        const scroll=content.scrollTop;
        const active=document.activeElement as HTMLInputElement|HTMLSelectElement|null;
        const focusKey=active?.dataset.filter?'filter':active?.dataset.person?'person':active?.dataset.training?'training':null;
        const focusValue=focusKey?active?.dataset[focusKey]:null;
        const caret=active instanceof HTMLInputElement&&active.type==='search'?active.selectionStart:null;
        content.innerHTML=portalContent(nav,innerState);content.scrollTop=keepScroll?scroll:0;
        const back=dialog.querySelector<HTMLButtonElement>('[data-back]')!;back.disabled=nav.history.length<2;back.textContent=nav.current?.preview?'返回詳情':'返回';
        if(keepScroll&&focusKey&&focusValue){const next=content.querySelector<HTMLInputElement>(`[data-${focusKey}="${CSS.escape(focusValue)}"]`);next?.focus({preventScroll:true});if(caret!==null&&next?.type==='search')next.setSelectionRange(caret,caret);}
    };
    const close = () => { nav.close(); dialog.close(); dialog.classList.remove('expanded'); dialog.querySelector('[data-expand]')!.setAttribute('aria-pressed', 'false'); dialog.querySelector('[data-expand]')!.textContent = '展開面板'; lastFocus?.focus({ preventScroll: true }); };
    const expand = (value: boolean) => { dialog.classList.toggle('expanded', value); const button = dialog.querySelector('[data-expand]')!; button.textContent = value ? '收合面板' : '展開面板'; button.setAttribute('aria-pressed', String(value)); };
    const open = (route: string, tab?: string) => { if (!dialog.open) {
        lastFocus = document.activeElement as HTMLElement;
        nav.close();
    } nav.open(route, tab); render(); if (!dialog.open)
        dialog.showModal(); };
    const toggleAudio = async () => { audio = !audio; const button = document.getElementById('audio-toggle')!; button.textContent = audio ? '音訊開啟' : '音訊關閉'; button.setAttribute('aria-pressed', String(audio)); if (!audio) {
        await audioContext?.suspend();
        announce('示範音效已關閉');
        return;
    } try {
        audioContext ??= new AudioContext();
        await audioContext.resume();
        const time = audioContext.currentTime;
        for (const frequency of [220, 440, 616]) {
            const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(.035, time);
            gain.gain.exponentialRampToValueAtTime(.0001, time + 1.8);
            oscillator.connect(gain).connect(audioContext.destination);
            oscillator.start(time);
            oscillator.stop(time + 1.8);
        }
        announce('示範宮鐘音效已開啟');
    }
    catch {
        audio = false;
        button.textContent = '音訊關閉';
        button.setAttribute('aria-pressed', 'false');
        announce('此瀏覽器無法播放示範音效');
    } };
    host.addEventListener('input',event=>{if((event as InputEvent).isComposing)return;const target=event.target as HTMLInputElement;if(target.dataset.filter==='search'){innerState.search=target.value;render(true);}});
    host.addEventListener('compositionend',event=>{const target=event.target as HTMLInputElement;if(target.dataset.filter==='search'){innerState.search=target.value;render(true);}});
    host.addEventListener('change', event => {
        const target=event.target as HTMLInputElement|HTMLSelectElement;
        if(target.dataset.choice)nav.choose(target.dataset.choice,target.value);
        if(target.dataset.filter&&['type','status','sort'].includes(target.dataset.filter)){innerState[target.dataset.filter as 'type'|'status'|'sort']=target.value;render(true);}
        if(target.dataset.person){selectOfficial(innerState,target.dataset.person,(target as HTMLInputElement).checked);render(true);}
        if(target.dataset.training){setTraining(innerState,target.dataset.training,target.value);render(true);}
    });
    host.addEventListener('click', event => {
        const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!target)
            return;
        const d = target.dataset;
        if(d.batch){batchPreview(innerState,d.batch);render(true);content.querySelector('.edict-result')?.scrollIntoView({block:'nearest'});return;}
        if(d.recruit){innerState.recruitRevealed=true;innerState.recruitCount=d.recruit==='10'?10:1;render(true);content.querySelector('.recruit-reveal')?.scrollIntoView({block:'nearest'});return;}
        if(d.ui){
            if(d.ui==='select-visible')visibleOfficials(innerState).forEach(p=>selectOfficial(innerState,p.id,true));
            if(d.ui==='clear-selection')innerState.selected=[];
            if(d.ui==='reset-filters'){innerState.search='';innerState.type='全部';innerState.status='全部';innerState.sort='default';}
            if(d.ui==='dismiss-result')innerState.result='';
            if(d.ui==='appointment-edict')innerState.result='任命總詔示例：沈文清任丞相、顧秉衡任戶部尚書、陸承毅任兵部尚書。僅供預覽，未任命或消耗體力。';
            if(d.ui==='training-preview')innerState.result=Object.keys(innerState.training).length?'訓練安排預覽：'+officials.filter(p=>innerState.training[p.id]).map(p=>p.name+'・'+innerState.training[p.id]).join('、')+'。能力與資源不變。':'尚未選擇課程，請先為官員安排課程。';
            render(true);if(innerState.result)content.querySelector('.edict-result')?.scrollIntoView({block:'nearest'});return;
        }
        if (d.route) {
            open(d.route, d.tab);
            return;
        }
        if ('panelTab' in d) {
            innerState.result='';
            nav.selectTab(d.panelTab!);
            render();
            return;
        }
        if ('detail' in d) {
            nav.detail(Number(d.detail));
            expand(true);
            render();
            return;
        }
        if ('preview' in d) {
            nav.preview();
            render();
            return;
        }
        if ('back' in d) {
            nav.back();
            render();
            return;
        }
        if ('close' in d) {
            close();
            return;
        }
        if ('expand' in d) {
            expand(!dialog.classList.contains('expanded'));
            return;
        }
        if (d.scene) {
            const id = d.scene;
            close();
            document.getElementById(id)?.click();
            return;
        }
        if ('audio' in d)
            void toggleAudio();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
            close();
    } });
    const previewParams=new URLSearchParams(location.search);
    const previewRoute=previewParams.get('page');
    if(previewRoute&&portals.some(p=>p.id===previewRoute))queueMicrotask(()=>open(previewRoute,previewParams.get('tab')??undefined));
    return { open, close, openBuilding: (id: string) => { const route = buildingRoutes[id]; if (route)
            open(route); }, snapshot: () => ({ current: nav.current, historyLength: nav.history.length, open: dialog.open, audio }) };
}
