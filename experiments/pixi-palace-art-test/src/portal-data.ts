/** Fictional, read-only fixtures. No production state, services or game rules are imported. */
export type DemoItem = {
    title: string;
    meta: string;
    description: string;
    action?: string;
    effect?: string;
    route?: string;
    tab?: string;
};
export type DemoTab = {
    id: string;
    title: string;
    intro: string;
    items: DemoItem[];
};
export type Portal = {
    id: string;
    title: string;
    subtitle: string;
    asset?: string;
    tabs: DemoTab[];
};
const item = (title: string, meta: string, description: string, action?: string, effect?: string): DemoItem => ({ title, meta, description, action, effect });
const tab = (id: string, title: string, intro: string, items: DemoItem[]): DemoTab => ({ id, title, intro, items });
export const portals: Portal[] = [
    { id: 'court', title: '太和殿', subtitle: '朝廷 · 御前聽政', asset: 'taihe', tabs: [
            tab('court', '上朝聽政', '殿門初啟，百官候旨。選擇奏章查看御前議事流程。', [
                item('江南水患奏報', '戶部 · 急奏', '江南連日暴雨，地方請撥銀修堤並設粥廠。', '預覽批示', '示範批示：准予勘災、核實災戶後賑濟。正式消耗與結果由現有遊戲規則決定。'),
                item('上朝聽政', '御前議事', '召集百官，檢視本年奏報與待決事項。', '預覽上朝', '示範朝會開啟，體力與國家狀態不變。')
            ]),
            tab('pending', '待決事件', '重要政務集中呈報，點選可查看詳情或前往相關衙門。', [
                { title: '邊疆戰線待部署', meta: '兵部 · 2 條戰線', description: '北境與西陲需要配置兵力及將領。', route: 'military', tab: 'defense' },
                { title: '中央官職任命', meta: '吏部 · 三個官職席位', description: '查閱候選官員並預覽任命。', route: 'ministries', tab: 'officials' },
                item('老臣請辭', '御前待決', '禮部老臣奏請告老，請選擇慰留或准辭。', '預覽裁決', '裁決預覽已呈報，不更動官員資料。')
            ]),
            tab('summary', '本年摘要', '以下為固定年度示例，方便檢視摘要版面。', [
                item('國庫收支', '收入 12,600 · 支出 8,400', '人口稅、地方收入與官俸、軍餉按項列示。'),
                item('朝野近況', '民心 78 · 管轄 12 省', '本年完成兩件政務，三處官職待補。')
            ])
        ] },
    { id: 'ministries', title: '中央與百官', subtitle: '吏部 · 知人善任', asset: 'east-hall', tabs: [
            tab('officials', '官職任命', '先選官職，再檢視候選官員的能力與任職資訊。', [
                item('丞相', '中央官職 · 文治', '候選：沈文清，文治 86、忠誠 82。主管朝政，任命資訊以示範呈現。', '預覽任命', '丞相任命預覽，候選人依下方選擇摘要；未任命、未扣除資源。'),
                item('戶部尚書', '中央官職 · 文治', '候選：顧秉衡，文治 79、忠誠 88。', '預覽任命', '戶部尚書任命預覽，候選人依下方選擇摘要。'),
                item('兵部尚書', '中央官職 · 武力', '候選：陸承毅，武力 91、忠誠 76。', '預覽任命', '兵部尚書任命預覽，候選人依下方選擇摘要。')
            ]),
            tab('roster', '官員清單', '人物為虛構示例；可打開完整資料卡。', [
                item('沈文清', '文治 86 · 忠誠 82', '江南士人，長於民政與河務。現為待任候選。'),
                item('顧秉衡', '文治 79 · 忠誠 88', '熟悉財賦制度，現任地方官，可預覽調任戶部。'),
                item('陸承毅', '武力 91 · 忠誠 76', '熟悉邊地軍務，現為兵部候選。')
            ]),
            tab('recruit', '科舉招募', '檢視招募方式與名帖展示。', [
                item('科舉取士', '文官招募', '名帖示例：沈文清，江南籍，經義優等。', '預覽單次招募', '展示一張示範名帖，不抽取新人物。'),
                item('綜合十連招募', '文武人才', '展示批次招募的確認與結果摘要。', '預覽十連', '示範結果摘要：文官 6 位、武官 4 位。未抽獎、未扣費。')
            ]),
            tab('finance', '稅政賑糧', '稅率與金額為版面示例，本次不模擬經濟。', [
                item('年度人口稅率', '示範稅率 · 三成', '查看人口稅、民心與人口成長的政策說明。', '預覽稅政', '稅率政策預覽，稅率依下方選擇摘要，不改動正式稅率。'),
                item('強徵稅賦', '國庫增加 · 民心下降', '正式操作會消耗體力並影響民心。', '預覽徵稅', '顯示徵稅確認流程；未徵收、未消耗體力。'),
                item('開倉賑糧', '國庫支出 · 民心提升', '核實災情後撥款賑濟。', '預覽賑糧', '顯示賑糧確認流程；未支出國庫。')
            ]),
            tab('reform', '改革科技', '按項目查看改革內容、條件及進度示例。', [
                item('河工整治', '民生 · 研議中', '整修河道堤防，改善地方治理。', '預覽研發', '河工整治研發預覽，不解鎖科技。'),
                item('軍制整頓', '軍務 · 尚未研議', '整頓軍籍、訓練及軍餉發放。', '預覽研發', '軍制整頓研發預覽。')
            ]),
            tab('diplomacy', '外交和親', '查看邦交、贈禮及宗室婚配的入口。', [
                item('北境部族', '邦交 · 友善', '使節請求互通商旅。', '預覽贈禮', '使節贈禮流程預覽，不消耗物品。'),
                item('公主和親', '禮部 · 待議', '可查看公主人選、對方使節與婚配條件。', '預覽和親', '顯示和親條件與人選資料，不建立婚配。')
            ])
        ] },
    { id: 'council', title: '軍機處', subtitle: '密奏 · 貪官密查', asset: 'council', tabs: [
            tab('cases', '案件清單', '密查案件依線索、調查與證據整理。', [
                item('漕糧虧空案', '待查 · 江南', '地方糧冊與實收不符，需核對倉儲紀錄。', '預覽調查', '密查流程預覽：查閱糧冊、訪查倉吏、彙整證詞。'),
                item('軍餉冒領案', '調查中 · 進度 60%', '軍籍名冊出現重複記錄，現正查核。', '預覽處理', '案件裁決預覽，未更動任何官員狀態。')
            ])
        ] },
    { id: 'military', title: '兵營', subtitle: '軍事 · 經略四方', asset: 'barracks', tabs: [
            tab('army', '兵馬管理', '兵力與成本為示範資訊。', [
                item('招兵買馬', '現有軍力 · 86 千', '募兵會消耗人口、銀兩與體力；正式數值沿用現有規則。', '預覽募兵', '募兵確認預覽，兵力、人口與國庫不變。'),
                item('遣散兵馬', '軍籍調整', '遣散兵馬返鄉，查看人口回補說明。', '預覽遣散', '遣散確認預覽，未更動軍力。')
            ]),
            tab('campaign', '御駕親征', '選取目標後檢視地區與出征準備。', [
                item('北境平原', '出征目標 · 平原', '地勢平緩，需備齊糧餉並指派主將。', '預覽出征', '北境出征準備預覽：將領、兵力、糧餉。未開戰。'),
                item('西陲關隘', '出征目標 · 山地', '關隘險峻，應留意地形與守備。', '預覽出征', '西陲出征準備預覽，未開戰。')
            ]),
            tab('defense', '邊疆部署', '兩條待部署戰線的版面示例。', [
                item('北境防線', '待部署 · 可用兵力 86 千', '候選主將：陸承毅。檢視分兵與守備安排。', '預覽部署', '北境防線部署摘要：主將與兵力欄位供確認，未派兵。'),
                item('西陲防線', '待部署 · 關隘防守', '需同時考慮其他戰線的可用兵力。', '預覽部署', '西陲防線部署摘要，未派兵。')
            ])
        ] },
    { id: 'harem', title: '後宮', subtitle: '內廷 · 深宮日常', asset: 'west-pavilion', tabs: [
            tab('consorts', '妃嬪名冊', '虛構人物示例，呈現位分、好感與人物背景。', [
                item('婉妃 · 沈氏', '好感 82 · 居景仁宮', '性情溫婉，喜詩書。人物詳情包含年齡、位分、子女及生平。', '預覽探望', '探望互動預覽，未增加好感或消耗體力。'),
                item('寧嬪 · 顧氏', '好感 64 · 居永和宮', '擅長書畫，與宮中女官往來密切。', '預覽探望', '探望互動預覽，人物資料不變。')
            ]),
            tab('stories', '深宮秘聞', '查閱宮中事件及調查入口。', [
                item('御花園拾得書信', '宮中傳聞', '一封未署名的書信，引出宮中往來的疑問。', '預覽查訪', '查訪流程預覽，不觸發正式事件。'),
                item('后宮案件簿', '案件 · 1 件待查', '記錄案由、相關人物與證據。', '預覽案件', '案件示例：遺失首飾，證據為值夜紀錄與侍女證詞。')
            ])
        ] },
    { id: 'school', title: '上書房', subtitle: '皇嗣 · 皇家書院', asset: 'school', tabs: [
            tab('children', '皇嗣教育', '查看皇嗣與教育安排。', [
                item('皇長子 · 承瑾', '12 歲 · 經史課業', '本期課業：經史、書法、騎射。', '預覽教育安排', '教育安排預覽：選定經史課業，不更動成長資料。'),
                item('皇次子 · 承珩', '8 歲 · 啟蒙', '本期課業：識字、禮儀。', '預覽入學', '入學確認預覽，不更動學籍。')
            ]),
            tab('academy', '皇家書院', '呈現人才培養與課程詳情。', [
                item('文才研習', '課程 · 民政與經義', '適合文職人才的學習路線。', '預覽培養', '培養方案預覽，不消耗資源。'),
                item('武略研習', '課程 · 兵法與騎射', '適合武職人才的學習路線。', '預覽培養', '培養方案預覽，不提升數值。')
            ])
        ] },
    { id: 'study', title: '御書房', subtitle: '修身 · 文武兼備', asset: 'study', tabs: [
            tab('training', '文武培養', '皇帝能力示例：文才 72，武略 65。', [
                item('研讀經史', '文才 · 72', '展開研讀項目及效果說明。', '預覽研讀', '研讀經史的操作預覽，不提升文才。'),
                item('演習武備', '武略 · 65', '展開操練項目及效果說明。', '預覽演習', '演習武備的操作預覽，不提升武略。')
            ])
        ] },
    { id: 'clan', title: '宗人府', subtitle: '宗室 · 玉牒世系', asset: 'clan', tabs: [
            tab('tree', '皇室族譜', '由皇帝延伸至后妃與子女，點選查看關係。', [
                item('皇帝 · 弘熙', '在位 · 第十二年', '配偶：婉妃、寧嬪。子女：承瑾、承珩、昭寧公主。'),
                item('皇長子 · 承瑾', '父：弘熙帝 · 母：婉妃', '12 歲，於上書房研習經史。'),
                item('昭寧公主', '父：弘熙帝 · 母：寧嬪', '宗室資料包含親屬關係與婚配紀錄。')
            ]),
            tab('history', '歷代皇帝', '以虛構紀錄示範歷代君主資料。', [
                item('景和帝', '先帝 · 在位二十六年', '政績摘要：整頓吏治、修築河堤。'),
                item('弘熙帝', '今上 · 在位十二年', '當朝皇帝示範資料。')
            ]),
            tab('family', '宗室事務', '查閱婚配及宗室記錄。', [
                item('公主婚配紀錄', '禮部會辦 · 待議', '查閱候選對象與相關邦交。', '預覽婚配紀錄', '婚配詳情示例，不建立正式婚配。')
            ])
        ] },
    { id: 'treasury', title: '皇家寶庫', subtitle: '內府 · 珍藏器物', asset: 'treasury', tabs: [
            tab('supplies', '補給', '庫存為示範資料，選取物品可查看用途。', [
                item('養心丹', '補給 · 3 件', '供皇帝調養使用，正式效果以現有物品規則為準。', '預覽使用', '物品使用預覽，數量維持 3 件。'),
                item('補氣湯', '補給 · 5 件', '用於恢復體力的補給品示例。', '預覽使用', '物品使用預覽，體力與庫存不變。')
            ]),
            tab('gifts', '珍玩', '適合賞賜或外交贈禮的器物示例。', [
                item('玉如意', '珍玩 · 2 件', '溫潤白玉雕成，供賞賜與贈禮。', '預覽賞賜', '賞賜對象選擇流程預覽，不轉移物品。'),
                item('御製墨錠', '珍玩 · 4 件', '供文士賞玩的墨錠。', '預覽賞賜', '賞賜預覽，庫存不變。')
            ])
        ] },
    { id: 'gate', title: '宮門', subtitle: '出宮 · 巡覽天下', asset: 'gate', tabs: [
            tab('travel', '微服私訪', '選擇行程，查看可能遇見的風土人物。', [
                item('京城街市', '行程 · 民間見聞', '街市繁盛，可聽取商旅與百姓的議論。', '預覽私訪', '行程預覽：茶肆聽聞、街市見聞，不觸發隨機事件。'),
                item('近郊田野', '行程 · 農事巡覽', '查看農事與水利情況。', '預覽私訪', '行程預覽：巡看田畝，不消耗體力。')
            ]),
            tab('provinces', '疆域管理', '省份為示例，可查看建設與地方官員。', [
                item('直隸', '地方官：沈恪 · 民心 80', '建設：道路二級、農田三級。地方收支與官員資料供介面預覽。', '預覽地方建設', '建設確認預覽，未更動疆域資料。'),
                item('江蘇', '地方官：待任命 · 民心 76', '建設：河堤二級、農田四級。', '預覽地方建設', '建設確認預覽，未扣除資源。'),
                item('浙江', '地方官：顧明遠 · 民心 82', '建設：商埠三級、道路二級。', '預覽地方建設', '建設確認預覽，未扣除資源。')
            ])
        ] },
    { id: 'emperor', title: '皇帝', subtitle: '弘熙十二年 · 皇帝資料', tabs: [
            tab('profile', '皇帝資料', '所有人物與數值均為獨立示範。', [
                item('弘熙帝', '32 歲 · 健康 92 · 體力 86 / 100', '文才 72、武略 65。在位十二年。'),
                { title: '御書房修習', meta: '文武培養', description: '查看文武課程。', route: 'study' }
            ]),
            tab('achievements', '成就', '呈現已取得與尚未取得的成就樣式。', [
                item('勤政愛民', '示範 · 已取得', '檢視成就條件與紀錄版面。'), item('四海昇平', '示範 · 未取得', '查看目標說明，不追蹤正式進度。')
            ]),
            tab('ranking', '排行榜', '此為本機虛構榜單，沒有連接排行榜服務。', [
                item('景和王朝', '第 1 名 · 示範分數 128,600', '虛構榜單資料。'), item('弘熙王朝', '第 2 名 · 示範分數 116,200', '虛構榜單資料。')
            ])
        ] },
    { id: 'year', title: '結束本年', subtitle: '年度結算 · 流程預覽', tabs: [
            tab('review', '年度檢視', '正式遊戲需先處理阻擋事項；本頁只展示流程。', [
                { title: '邊疆戰線尚待部署', meta: '待辦 · 2 條', description: '可前往查看部署介面。', route: 'military', tab: 'defense' },
                { title: '老臣請辭尚待裁決', meta: '待辦 · 1 件', description: '前往太和殿查看待決事件。', route: 'court', tab: 'pending' },
                item('年度結算預覽', '收入 12,600 · 支出 8,400', '預覽收支、朝野近況與年份交接摘要。', '查看結算示例', '本年結餘示例為 4,200 兩。正式年份不推進；示範畫面維持弘熙十二年。')
            ])
        ] },
    { id: 'system', title: '宮城設定', subtitle: '本機示範 · 場景控制', tabs: [
            tab('settings', '設定', '日夜、動畫及鏡頭設定立即作用於測試場景。', []),
            tab('save', '存檔狀態', '只保存主城建築位置；正式存檔服務未連接。', [
                item('建築配置', '本機瀏覽器 · 獨立儲存', '配置模式放開建築後自動儲存。儲存遭封鎖時只保留於本次頁面。'),
                item('正式遊戲存檔', '未連接', '本示範不讀取、上傳、覆寫或匯入正式遊戲存檔。')
            ]),
            tab('manual', '玩法說明', '這是入口介面示範，沒有遊戲進度與資源消耗。', [
                item('探索宮城', '點選建築 · 拖動空地', '點建築或底部捷徑開啟相同面板；分頁、詳情及返回可自由切換。滾輪與雙指可縮放。'),
                item('調整配置', '設定 · 配置模式', '開啟配置模式後拖移十座建築，標籤與遮擋排序跟隨更新。還原配置可回到預設位置。'),
                item('手機操作', '全螢幕內頁 · 分頁閱讀', '主要功能以全螢幕呈現；人物、資訊與操作區依手機寬度重新排列。關閉後保留鏡頭位置。')
            ]),
            tab('updates', '更新說明', '本次只更新獨立實驗專案。', [
                item('內頁視覺改版', 'inner-visuals-1', '十五個功能入口改為全螢幕宮廷內頁，加入人物肖像與器物素材。中央官員提供任命、名冊篩選、書院及招募示例；各功能採專屬布局。保留配置編輯與場景工具。')
            ])
        ] },
    { id: 'resources', title: '國家概況', subtitle: '弘熙十二年 · 示範資料', tabs: [
            tab('overview', '國家概況', '資源固定展示，不與正式遊戲同步。', [
                item('國庫', '128,400 兩', '國家財政資源，用於軍務、建設與賑濟。'),
                item('人口', '982 萬', '管轄地區人口的概況。'), item('民心', '78', '百姓對朝政的支持程度。'),
                item('軍力', '86 千', '現有軍隊的示範數量。'), item('疆域', '12 省', '頂部顯示總數，疆域面板列出三個省份樣例。')
            ])
        ] },
];
// Four official tabs match the current game's information architecture.
const ministers=portals.find(p=>p.id==='ministries')!;
const governmentTabs=ministers.tabs.filter(t=>['finance','reform','diplomacy'].includes(t.id));
ministers.tabs=ministers.tabs.filter(t=>!governmentTabs.includes(t));
ministers.tabs.splice(2,0,tab('academy','皇家書院','官員課程與訓練後能力的介面預覽，最多十名、年滿十六歲；此處提供三名示例。',[
 item('沈文清','48 歲 · 文治 86／武力 34','可安排經史或騎射課程；預覽不更動能力。','預覽課程','課程安排預覽，未登記年度訓練。'),
 item('顧秉衡','58 歲 · 文治 79／武力 42','查看官員年度訓練安排。','預覽課程','課程安排預覽，未扣費。'),
 item('陸承毅','38 歲 · 文治 45／武力 91','查看軍事人才的訓練安排。','預覽課程','課程安排預覽，能力不變。')
]));
ministers.tabs.find(t=>t.id==='recruit')!.title='人才招募';
portals.splice(2,0,{id:'government',title:'六部衙門',subtitle:'國政 · 理財治事',asset:'east-hall',tabs:governmentTabs});
export const buildingRoutes: Record<string, string> = { taihe: 'court', 'east-hall': 'government', 'west-pavilion': 'harem', council: 'council', barracks: 'military', school: 'school', study: 'study', clan: 'clan', treasury: 'treasury', gate: 'gate' };
export const shortcuts = [['court', 'court', '朝廷', '朝'], ['ministries', 'officials', '官員', '官'], ['harem', 'consorts', '後宮', '宮'], ['military', 'army', '軍事', '武'], ['government', 'finance', '國政', '政'], ['gate', 'provinces', '疆域', '疆'], ['treasury', 'supplies', '寶庫', '藏']];
export function resolvePortal(id: string, tabId?: string) { const portal = portals.find(p => p.id === id); if (!portal)
    throw new Error(`Unknown portal: ${id}`); const active = portal.tabs.find(t => t.id === tabId) ?? portal.tabs[0]; return { portal, tab: active }; }
export type PreviewField = {
    name: string;
    label: string;
    options: string[];
};
export function previewFields(route: string, tab: string | undefined, index: number | undefined): PreviewField[] {
    if (index === undefined)
        return [];
    if (route === 'ministries' && tab === 'officials')
        return [{ name: 'candidate', label: '候選官員', options: ['沈文清 · 文治 86', '顧秉衡 · 文治 79', '陸承毅 · 武力 91'] }];
    if (route === 'government' && tab === 'finance' && index === 0)
        return [{ name: 'tax', label: '稅率示例', options: ['三成', '四成', '五成'] }];
    if (route === 'military' && tab !== 'army')
        return [{ name: 'general', label: '領軍將領', options: ['陸承毅', '顧秉衡'] }, { name: 'troops', label: '兵力配置示例', options: ['10 千', '20 千', '30 千'] }];
    if (route === 'school' || route === 'ministries' && tab === 'academy')
        return [{ name: 'course', label: '課程選擇', options: ['經史', '書法', '騎射'] }];
    if (route === 'treasury')
        return [{ name: 'quantity', label: '使用數量示例', options: ['1 件', '2 件'] }];
    if (route === 'harem' && tab === 'consorts')
        return [{ name: 'visit', label: '探望方式', options: ['問候起居', '共賞詩書'] }];
    if (route === 'government' && tab === 'diplomacy')
        return index === 0 ? [{ name: 'gift', label: '禮部方案', options: ['玉如意贈禮', '御製墨錠贈禮'] }] : [{ name: 'princess', label: '公主人選', options: ['昭寧公主'] }, { name: 'envoy', label: '使節提案', options: ['北境部族', '西陲盟邦'] }];
    return [];
}
export type PortalLocation = {
    route: string;
    tab?: string;
    item?: number;
    preview?: boolean;
    choices?: Record<string, string>;
};
export class PortalNavigation {
    history: PortalLocation[] = [];
    get current() { return this.history.at(-1); }
    open(route: string, tab?: string) { const resolved = resolvePortal(route, tab); this.history.push({ route, tab: resolved.tab.id }); }
    selectTab(tab: string) { if (!this.current)
        return; const resolved = resolvePortal(this.current.route, tab); this.history[this.history.length - 1] = { route: this.current.route, tab: resolved.tab.id }; }
    detail(index: number) { if (!this.current)
        return; const { tab } = resolvePortal(this.current.route, this.current.tab); if (!tab.items[index])
        throw new Error('Unknown item'); this.history.push({ ...this.current, item: index }); }
    choose(name: string, value: string) { const loc = this.current; if (!loc || loc.preview)
        return; const field = previewFields(loc.route, loc.tab, loc.item).find(f => f.name === name); if (!field?.options.includes(value))
        return; loc.choices = { ...loc.choices, [name]: value }; }
    preview() { if (this.current?.item === undefined)
        return; const loc = this.current; const fields = previewFields(loc.route, loc.tab, loc.item); const choices = Object.fromEntries(fields.map(f => [f.name, loc.choices?.[f.name] ?? f.options[0]])); this.history.push({ ...loc, choices, preview: true }); }
    back() { this.history.pop(); }
    close() { this.history = []; }
}
