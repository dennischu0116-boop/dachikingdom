import { buildingRoutes, PortalNavigation, resolvePortal, shortcuts, previewFields } from './portal-data.ts';
export const escapeHTML = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const e = escapeHTML;
export function portalContent(nav: PortalNavigation): string {
    const loc = nav.current;
    if (!loc)
        return '';
    const { portal, tab } = resolvePortal(loc.route, loc.tab);
    const entry = loc.item === undefined ? undefined : tab.items[loc.item];
    const fields = previewFields(loc.route, loc.tab, loc.item);
    const form = fields.length ? `<div class="preview-fields">${fields.map(f => `<label>${e(f.label)}<select data-choice="${e(f.name)}">${f.options.map(v => `<option${(loc.choices?.[f.name] ?? f.options[0]) === v ? ' selected' : ''}>${e(v)}</option>`).join('')}</select></label>`).join('')}<small>僅供操作預覽，不計算或消耗資源。</small></div>` : '';
    const choices = fields.map(f => `<p>${e(f.label)}：${e(loc.choices?.[f.name] ?? f.options[0])}</p>`).join('');
    const head = `<div class="panel-kicker">${e(portal.subtitle)}</div><h2 id="portal-title">${e(entry?.title ?? portal.title)}</h2><p class="demo-note">示範資料 · 操作不影響正式遊戲</p>`;
    if (entry) {
        return head + `<div class="detail-mark" aria-hidden="true">${e(portal.title.slice(0, 1))}</div><p class="entry-meta">${e(entry.meta)}</p><p class="detail-copy">${e(entry.description)}</p>${loc.preview ? `<div class="preview-result" role="status"><b>操作效果預覽</b><p>${e(entry.effect ?? '僅供介面預覽。')}</p>${choices}<small>所有示範數值保持不變。</small></div>` : entry.action ? `${form}<button class="primary-action" data-preview>${e(entry.action)}</button>` : ''}`;
    }
    let body = tab.items.map((item, i) => `<button class="entry-card" ${item.route ? `data-route="${e(item.route)}" data-tab="${e(item.tab ?? '')}"` : `data-detail="${i}"`}><span class="entry-heading">${e(item.title)}</span><span class="entry-meta">${e(item.meta)}</span><span class="entry-copy">${e(item.description)}</span><span class="entry-link">${item.route ? '前往查看' : '查看詳情'}</span></button>`).join('');
    if (portal.id === 'system' && tab.id === 'settings')
        body = `<div class="settings-grid"><button data-scene="day-night">切換白晝／夜晚</button><button data-scene="animation">切換動畫</button><button data-scene="reset">重置鏡頭</button><button data-scene="edit-layout">開啟／結束配置模式</button><button data-audio>試聽宮鐘／切換靜音</button></div><p>日夜與動畫的目前狀態顯示於主城工具列。配置模式下可拖移十座建築。</p>`;
    return head + `<nav class="panel-tabs" aria-label="${e(portal.title)}分頁">${portal.tabs.map(t => `<button data-panel-tab="${e(t.id)}" aria-current="${t.id === tab.id ? 'page' : 'false'}">${e(t.title)}</button>`).join('')}</nav><p class="panel-intro">${e(tab.intro)}</p><div class="entries">${body}</div>`;
}
export function setupPortals() {
    const host = document.getElementById('city-ui')!;
    host.innerHTML = `
 <header class="city-top">
  <button class="emperor-button" data-route="emperor" aria-label="皇帝資料、成就與排行榜"><span class="imperial-seal">清</span><span><strong>大清帝國</strong><small>弘熙十二年 · 示範</small></span></button>
  <div class="vitals"><span>健康 <b>92</b></span><span>體力 <b>86 / 100</b></span></div>
  <nav class="system-nav" aria-label="系統工具"><button data-route="system" data-tab="save">存檔</button><button data-route="system" data-tab="manual">玩法</button><button data-route="system" data-tab="updates">更新</button><button data-audio id="audio-toggle" aria-pressed="false">音訊關閉</button><button data-route="system" data-tab="settings">設定</button></nav>
 </header>
 <div class="resource-bar" aria-label="國家資源">${[['國庫', '12.84萬'], ['人口', '982萬'], ['民心', '78'], ['軍力', '86千'], ['疆域', '12省']].map(([label, value]) => `<button data-route="resources"><small>${label}</small><b>${value}</b></button>`).join('')}</div>
 <aside class="affairs" aria-label="政務待辦"><p>御前待辦 <span>示範</span></p><button data-route="court" data-tab="pending"><b>待決事件</b><span>奏報與老臣請辭</span></button><button data-route="ministries" data-tab="officials"><b>官職空缺 <i>3</i></b><span>地方與中央待補</span></button><button data-route="military" data-tab="defense"><b>邊疆部署 <i>2</i></b><span>防線尚待配置</span></button><button data-route="harem" data-tab="stories"><b>危機預警</b><span>宮中事件待查</span></button></aside>
 <details class="chronicle"><summary>起居注 <span>戶部奏報：江南河務，候旨議處。</span></summary><ol><li>卯時 · 百官入朝，恭候聖駕。</li><li>辰時 · 戶部奏報江南河務。</li><li>巳時 · 兵部呈報北境與西陲防線。</li></ol><small>固定示範紀錄</small></details>
 <nav class="city-nav" aria-label="主城快捷入口">${shortcuts.map(([route, tab, title, glyph]) => `<button data-route="${route}" data-tab="${tab}"><span class="nav-medallion" aria-hidden="true">${glyph}</span><span>${title}</span></button>`).join('')}</nav>
 <button class="year-button" data-route="year"><span>結束本年</span><small>結算預覽</small></button>
 <div id="ui-announcement" class="ui-announcement" role="status" aria-live="polite"></div>
 <dialog id="portal-dialog" aria-labelledby="portal-title"><div class="panel-toolbar"><button data-back>返回</button><button data-expand aria-pressed="false">展開面板</button><button data-close aria-label="關閉面板，返回主城">返回主城 ×</button></div><div class="panel-scroll" id="portal-content"></div><footer class="panel-footer">大清帝國 · 主城介面示範</footer></dialog>`;
    const dialog = document.getElementById('portal-dialog') as HTMLDialogElement;
    const content = document.getElementById('portal-content')!;
    const nav = new PortalNavigation();
    let lastFocus: HTMLElement | null = null;
    let audio = false;
    let audioContext: AudioContext | null = null;
    let noticeTimer = 0;
    const announce = (message: string) => { const el = document.getElementById('ui-announcement')!; el.textContent = message; clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => el.textContent = '', 4000); };
    const render = () => { content.innerHTML = portalContent(nav); content.scrollTop = 0; dialog.querySelector<HTMLButtonElement>('[data-back]')!.disabled = nav.history.length < 2; const back = dialog.querySelector<HTMLButtonElement>('[data-back]')!; back.textContent = nav.current?.preview ? '返回詳情' : '返回'; };
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
    host.addEventListener('change', event => { const target = event.target as HTMLSelectElement; if (target.dataset.choice)
        nav.choose(target.dataset.choice, target.value); });
    host.addEventListener('click', event => {
        const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!target)
            return;
        const d = target.dataset;
        if (d.route) {
            open(d.route, d.tab);
            return;
        }
        if ('panelTab' in d) {
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
    return { open, close, openBuilding: (id: string) => { const route = buildingRoutes[id]; if (route)
            open(route); }, snapshot: () => ({ current: nav.current, historyLength: nav.history.length, open: dialog.open, audio }) };
}
