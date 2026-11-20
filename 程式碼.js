/**
 * 大清帝國模擬器 - Google Apps Script 後端
 * 世界排行榜：使用既有的 Google Sheets，所有玩家共用。
 * 部署：網頁應用程式；執行身分「我」；存取權限「任何人」。
 * 可手動執行 setupLeaderboard() 授權及確認試算表。
 * v1.1.3 排行榜擴充：保留 A:M 舊欄位，首次讀寫時自動補齊 N:P。
 */
const QING_SHEET_PROPERTY = 'QING_LEADERBOARD_SPREADSHEET_ID';
const QING_SPREADSHEET_ID = '1-4Jbgl5C7_HoJj7VNY2E4GyVm5h1AIWSBxyufWgwKPE';
const QING_SHEET_NAME = '世界排行榜';
const QING_LEGACY_HEADERS = [
  'gameId', 'name', 'eraName', 'years', 'maxMinisterScore',
  'maxMinisterName', 'maxChildScore', 'maxChildName', 'timestamp', 'gameWon'
];
const QING_HEADERS = [
  ...QING_LEGACY_HEADERS, 'winYears', 'dynastyId', 'unificationOwnerGameId',
  'maxTreasury', 'maxConsortCount', 'maxDescendantCount'
];

function doGet(e) {
  // Google OAuth2 授權碼回呼與遊戲首頁共用同一個正式 /exec 網址。
  if (e && e.parameter && e.parameter.state && (e.parameter.code || e.parameter.error) &&
      typeof qcsOAuthCallback_ === 'function') {
    return qcsOAuthCallback_(e);
  }
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('大清帝國模擬器')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 將拆分後的 HTML／CSS／前端程式依 Index.html 的順序組合成同一個頁面。 */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}

/** 管理者可手動執行，授權並確認排行榜指向既有的試算表。 */
function setupLeaderboard() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getLeaderboardSheet_();
    const url = sheet.getParent().getUrl();
    console.log('世界排行榜試算表：' + url);
    return url;
  } finally {
    lock.releaseLock();
  }
}

/** 固定使用現有試算表，避免未設定指令碼屬性時建立新檔案。 */
function getLeaderboardSheet_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(QING_SHEET_PROPERTY) !== QING_SPREADSHEET_ID) {
    props.setProperty(QING_SHEET_PROPERTY, QING_SPREADSHEET_ID);
  }
  const book = SpreadsheetApp.openById(QING_SPREADSHEET_ID);
  let sheet = book.getSheetByName(QING_SHEET_NAME);
  if (!sheet) {
    const sheets = book.getSheets();
    const first = sheets[0];
    if (sheets.length === 1 && first && first.getLastRow() === 0) {
      sheet = first;
      sheet.setName(QING_SHEET_NAME);
    } else {
      // 無相符工作表時不猜測其他分頁；建立指定的排行榜分頁。
      sheet = book.insertSheet(QING_SHEET_NAME);
    }
  }
  ensureLeaderboardHeaders_(sheet);
  return sheet;
}

/**
 * 升級已存在的 A:J 或 A:M 排行榜：不移動、不刪除也不重寫既有紀錄。
 * 為防止欄位錯位，既有欄名必須位於預期位置；右側缺少的欄名會自動補齊。
 */
function ensureLeaderboardHeaders_(sheet) {
  const width = QING_HEADERS.length;
  if (sheet.getMaxColumns() < width) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, width).setValues([QING_HEADERS]);
  } else {
    const actual = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
    for (let i = 0; i < QING_LEGACY_HEADERS.length; i++) {
      if (actual[i] !== QING_LEGACY_HEADERS[i]) {
        throw new Error('排行榜欄名不符（' + (i + 1) + ' 欄），已停止寫入以保護舊資料');
      }
    }
    for (let i = QING_LEGACY_HEADERS.length; i < width; i++) {
      if (actual[i] && actual[i] !== QING_HEADERS[i]) {
        throw new Error('排行榜欄名不符（' + (i + 1) + ' 欄），已停止寫入以保護舊資料');
      }
    }
    sheet.getRange(1, QING_LEGACY_HEADERS.length + 1, 1, width - QING_LEGACY_HEADERS.length)
      .setValues([QING_HEADERS.slice(QING_LEGACY_HEADERS.length)]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width)
    .setFontWeight('bold').setBackground('#7f1d1d').setFontColor('#ffffff');
}

function safeText_(value, maxLength) {
  let text = String(value === undefined || value === null ? '' : value)
    .trim().slice(0, maxLength).replace(/[\u0000-\u001f\u007f]/g, '');
  // 防止玩家輸入被 Sheets 解析為公式。
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function safeNumber_(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, Math.floor(n)));
}

/** 前後端一致的皇室官員舊姓名前綴規則。 */
function isRoyalChildMinisterName_(name) {
  return /^(皇子|公主|宗室|長公主|宗親)\s/.test(String(name || '').trim());
}

function stripRoyalChildMinister_(record) {
  if (isRoyalChildMinisterName_(record.maxMinisterName)) {
    record.maxMinisterName = '無';
    record.maxMinisterScore = 0;
  }
  return record;
}

function normalizeScore_(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('成績資料格式不正確');
  }
  const gameId = String(input.gameId || '').trim();
  if (!/^run_[A-Za-z0-9_-]{1,80}$/.test(gameId)) {
    throw new Error('缺少有效的遊戲編號，請重新開始遊戲');
  }
  const years = safeNumber_(input.years, 100000);
  const dynastyId = safeText_(input.dynastyId || '', 120);
  const owner = safeText_(input.unificationOwnerGameId || '', 120);
  const gameWon = !!input.gameWon && (!owner || owner === gameId);
  // 不能將目前在位年數假裝成已知的首次統一年數。
  const requestedWinYears = safeNumber_(input.winYears, 100000);
  const winYears = gameWon && requestedWinYears > 0 ? requestedWinYears : 0;
  return stripRoyalChildMinister_({
    gameId,
    name: safeText_(input.name || '無名氏', 30),
    eraName: safeText_(input.eraName || '天命', 20),
    years,
    maxMinisterScore: safeNumber_(input.maxMinisterScore, 100000),
    maxMinisterName: safeText_(input.maxMinisterName || '無', 40),
    maxChildScore: safeNumber_(input.maxChildScore, 100000),
    maxChildName: safeText_(input.maxChildName || '無', 40),
    timestamp: Date.now(),
    gameWon,
    winYears,
    dynastyId,
    unificationOwnerGameId: owner,
    maxTreasury: safeNumber_(input.maxTreasury, 1000000000000000),
    maxConsortCount: safeNumber_(input.maxConsortCount, 100000),
    maxDescendantCount: safeNumber_(input.maxDescendantCount, 100000)
  });
}

function rowToObject_(row) {
  const o = {};
  QING_HEADERS.forEach((key, index) => { o[key] = row[index]; });
  o.years = safeNumber_(o.years, 100000);
  o.maxMinisterScore = safeNumber_(o.maxMinisterScore, 100000);
  o.maxChildScore = safeNumber_(o.maxChildScore, 100000);
  o.timestamp = Number(o.timestamp) || 0;
  o.gameWon = o.gameWon === true || String(o.gameWon).toLowerCase() === 'true';
  o.winYears = safeNumber_(o.winYears, 100000);
  o.dynastyId = String(o.dynastyId || '');
  o.unificationOwnerGameId = String(o.unificationOwnerGameId || '');
  o.maxTreasury = safeNumber_(o.maxTreasury, 1000000000000000);
  o.maxConsortCount = safeNumber_(o.maxConsortCount, 100000);
  o.maxDescendantCount = safeNumber_(o.maxDescendantCount, 100000);
  if (o.unificationOwnerGameId && o.unificationOwnerGameId !== o.gameId) {
    o.gameWon = false;
    o.winYears = 0;
  }
  return stripRoyalChildMinister_(o);
}

function scoreToRow_(record) {
  return QING_HEADERS.map(key => record[key]);
}

/**
 * 合併同一局的分數；延遲年度不能覆蓋較新年度。
 * 首次統一年份一經確認不因繼續遊玩更新；舊資料缺失時允許補入。
 */
function mergeLeaderboardScore_(old, incoming) {
  const mergedPeaks = {
    maxTreasury: Math.max(old.maxTreasury || 0, incoming.maxTreasury || 0),
    maxConsortCount: Math.max(old.maxConsortCount || 0, incoming.maxConsortCount || 0),
    maxDescendantCount: Math.max(old.maxDescendantCount || 0, incoming.maxDescendantCount || 0)
  };
  // 舊瀏覽器存檔可能落後於雲端年度：只補缺失的統一資訊，不覆寫較新的進度。
  if (incoming.years < old.years) {
    const patched = { ...old, ...mergedPeaks };
    if (!patched.dynastyId && incoming.dynastyId) patched.dynastyId = incoming.dynastyId;
    if ((!patched.unificationOwnerGameId || patched.unificationOwnerGameId === 'unknown') &&
        incoming.unificationOwnerGameId) {
      patched.unificationOwnerGameId = incoming.unificationOwnerGameId;
    }
    if (patched.unificationOwnerGameId && patched.unificationOwnerGameId !== patched.gameId) {
      patched.gameWon = false;
      patched.winYears = 0;
    } else if (!patched.winYears && incoming.winYears && incoming.gameWon) {
      patched.winYears = incoming.winYears;
      patched.gameWon = true;
    }
    return patched.dynastyId !== old.dynastyId ||
      patched.unificationOwnerGameId !== old.unificationOwnerGameId ||
      patched.gameWon !== old.gameWon || patched.winYears !== old.winYears ||
      patched.maxTreasury !== old.maxTreasury ||
      patched.maxConsortCount !== old.maxConsortCount ||
      patched.maxDescendantCount !== old.maxDescendantCount ? patched : null;
  }
  Object.assign(incoming, mergedPeaks);
  if (incoming.maxMinisterScore < old.maxMinisterScore) {
    incoming.maxMinisterScore = old.maxMinisterScore;
    incoming.maxMinisterName = old.maxMinisterName;
  }
  if (incoming.maxChildScore < old.maxChildScore) {
    incoming.maxChildScore = old.maxChildScore;
    incoming.maxChildName = old.maxChildName;
  }
  incoming.dynastyId = incoming.dynastyId || old.dynastyId || '';
  incoming.unificationOwnerGameId = incoming.unificationOwnerGameId && incoming.unificationOwnerGameId !== 'unknown'
    ? incoming.unificationOwnerGameId : (old.unificationOwnerGameId || incoming.unificationOwnerGameId || '');
  if (incoming.unificationOwnerGameId && incoming.unificationOwnerGameId !== incoming.gameId) {
    incoming.gameWon = false;
    incoming.winYears = 0;
  } else {
    incoming.gameWon = incoming.gameWon || old.gameWon;
    // 已保存的首次統一年份具有優先權，避免後續年度覆寫。
    incoming.winYears = old.winYears > 0 ? old.winYears : (incoming.gameWon ? incoming.winYears : 0);
  }
  return incoming;
}

/** 每次年末、勝利或駕崩更新同一局；多使用者同時提交時加鎖。 */
function submitLeaderboardScore(input) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const incoming = normalizeScore_(input);
    lock.waitLock(30000);
    locked = true;
    const sheet = getLeaderboardSheet_();
    const last = sheet.getLastRow();
    let existingRow = -1;
    if (last > 1) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      const index = ids.findIndex(row => String(row[0]) === incoming.gameId);
      if (index >= 0) existingRow = index + 2;
    }
    if (existingRow > 0) {
      const old = rowToObject_(sheet.getRange(existingRow, 1, 1, QING_HEADERS.length).getValues()[0]);
      const merged = mergeLeaderboardScore_(old, incoming);
      if (!merged) return { ok: true, updated: false };
      sheet.getRange(existingRow, 1, 1, QING_HEADERS.length).setValues([scoreToRow_(merged)]);
    } else {
      sheet.appendRow(scoreToRow_(incoming));
    }
    SpreadsheetApp.flush();
    return { ok: true, updated: true };
  } catch (error) {
    console.error('submitLeaderboardScore: ' + error);
    return { ok: false, error: String(error.message || error) };
  } finally {
    if (locked) lock.releaseLock();
  }
}

/** 回傳七種排行榜的前 20 名集合，並附上指定本局在各榜的完整名次。 */
function getLeaderboard(playerGameId) {
  try {
    const sheet = getLeaderboardSheet_();
    const last = sheet.getLastRow();
    if (last <= 1) return { ok: true, data: [], mine: {} };
    const values = sheet.getRange(2, 1, last - 1, QING_HEADERS.length).getValues();
    const all = values.map(rowToObject_).filter(record => record.gameId);
    const worldYears = record => record.winYears > 0 ? record.winYears : (record.years || 9999);
    const rankings = {
      WORLD: all.filter(record => record.gameWon)
        .sort((a, b) => worldYears(a) - worldYears(b) || a.timestamp - b.timestamp),
      MINISTER: all.filter(record => record.maxMinisterScore > 0)
        .sort((a, b) => b.maxMinisterScore - a.maxMinisterScore || a.timestamp - b.timestamp),
      CHILD: all.filter(record => record.maxChildScore > 0)
        .sort((a, b) => b.maxChildScore - a.maxChildScore || a.timestamp - b.timestamp),
      MONEY: all.filter(record => record.maxTreasury > 0)
        .sort((a, b) => b.maxTreasury - a.maxTreasury || a.timestamp - b.timestamp),
      CONSORT: all.filter(record => record.maxConsortCount > 0)
        .sort((a, b) => b.maxConsortCount - a.maxConsortCount || a.timestamp - b.timestamp),
      DESCENDANT: all.filter(record => record.maxDescendantCount > 0)
        .sort((a, b) => b.maxDescendantCount - a.maxDescendantCount || a.timestamp - b.timestamp),
      REIGN: all.filter(record => record.years > 0)
        .sort((a, b) => b.years - a.years || a.timestamp - b.timestamp)
    };
    const unique = new Map();
    Object.values(rankings).flatMap(items => items.slice(0, 20))
      .forEach(item => unique.set(item.gameId, item));
    const mine = {};
    const wantedId = String(playerGameId || '');
    if (wantedId) Object.keys(rankings).forEach(key => {
      const index = rankings[key].findIndex(item => String(item.gameId) === wantedId);
      if (index >= 0) mine[key] = { rank: index + 1, record: rankings[key][index] };
    });
    return { ok: true, data: [...unique.values()], mine };
  } catch (error) {
    console.error('getLeaderboard: ' + error);
    return { ok: false, error: String(error.message || error), data: [], mine: {} };
  }
}

/**
 * 遷移舊版瀏覽器排行榜資料；以 gameId 合併，不清空雲端資料。
 * 單次最多 200 筆，且在鎖內一次讀取、一次回寫。
 */
function importExistingLeaderboardScores(records) {
  if (!Array.isArray(records)) return { ok: false, error: '匯入資料不是陣列' };
  if (records.length > 200) return { ok: false, error: '每批最多匯入 200 筆' };
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const normalized = records.map(normalizeScore_);
    lock.waitLock(30000);
    locked = true;
    const sheet = getLeaderboardSheet_();
    const last = sheet.getLastRow();
    const current = last > 1 ? sheet.getRange(2, 1, last - 1, QING_HEADERS.length).getValues() : [];
    const byId = new Map();
    current.forEach((row, i) => byId.set(String(row[0]), i));
    let added = 0, updated = 0, skipped = 0;
    normalized.forEach(incoming => {
      const index = byId.get(incoming.gameId);
      if (index === undefined) {
        byId.set(incoming.gameId, current.length);
        current.push(scoreToRow_(incoming));
        added++;
      } else {
        const old = rowToObject_(current[index]);
        const merged = mergeLeaderboardScore_(old, incoming);
        if (!merged) { skipped++; return; }
        if (merged.years === old.years && merged.maxMinisterScore === old.maxMinisterScore &&
            merged.maxMinisterName === old.maxMinisterName &&
            merged.maxChildScore === old.maxChildScore && merged.maxChildName === old.maxChildName &&
            merged.gameWon === old.gameWon && merged.winYears === old.winYears &&
            merged.dynastyId === old.dynastyId &&
            merged.unificationOwnerGameId === old.unificationOwnerGameId &&
            merged.maxTreasury === old.maxTreasury &&
            merged.maxConsortCount === old.maxConsortCount &&
            merged.maxDescendantCount === old.maxDescendantCount) {
          skipped++;
          return;
        }
        current[index] = scoreToRow_(merged);
        updated++;
      }
    });
    if (current.length && (added || updated)) {
      sheet.getRange(2, 1, current.length, QING_HEADERS.length).setValues(current);
      SpreadsheetApp.flush();
    }
    return { ok: true, added, updated, skipped };
  } catch (error) {
    console.error('importExistingLeaderboardScores: ' + error);
    return { ok: false, error: String(error.message || error) };
  } finally {
    if (locked) lock.releaseLock();
  }
}
