/**
 * 大清帝國模擬器 v1.3.3 - OAuth2 授權碼登入及五槽雲端存檔
 * 玩家身分以 Google OAuth2 authorization-code flow 驗證；存檔仍由部署者 DriveApp 寫入。
 * Session token 僅存在前端 sessionStorage／記憶體及 GAS Script Properties（僅保存雜湊索引）。
 * 與世界排行榜欄位及 API 完全隔離。
 */
const QCS_PREFIX = 'QING_CLOUD_';
const QCS_SLOTS = 5;
const QCS_HEADERS = ['userId','slotId','name','fileId','revision','updatedAt','eraName','year','gameId',
  'emperorName','treasury','ministerCount','consortCount','descendantCount','unified'];
const QCS_OAUTH_STATE_PREFIX = 'QING_OAUTH_STATE_';
const QCS_SESSION_PREFIX = 'QING_SESSION_';
const QCS_HANDOFF_PREFIX = 'QING_OAUTH_HANDOFF_';
const QCS_HANDOFF_TTL_MS = 5 * 60 * 1000;
const QCS_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const QCS_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function qcsProperties_() { return PropertiesService.getScriptProperties(); }
function qcsClientId_() { return qcsProperties_().getProperty(QCS_PREFIX + 'CLIENT_ID') || ''; }
function qcsClientSecret_() { return qcsProperties_().getProperty('QING_OAUTH_CLIENT_SECRET') || ''; }
function qcsRedirectUri_() {
  const url = ScriptApp.getService().getUrl();
  if (!url) throw new Error('請先部署 GAS 網頁應用程式，再設定 OAuth 重新導向 URI');
  return url;
}
function qcsRandom_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function qcsSha256_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)).replace(/=+$/g, '');
}
function qcsSafeJsonForHtml_(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** 管理員首次設定後執行；建立 Drive 資料夾及玩家雲端存檔索引分頁。 */
function setupCloudSaves() {
  if (!qcsClientId_()) throw new Error('請在指令碼屬性設定 QING_CLOUD_CLIENT_ID');
  if (!qcsClientSecret_()) throw new Error('請在指令碼屬性設定 QING_OAUTH_CLIENT_SECRET');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const p = qcsProperties_();
    let folderId = p.getProperty(QCS_PREFIX + 'FOLDER_ID');
    if (!folderId) {
      folderId = DriveApp.createFolder('大清帝國_玩家雲端存檔').getId();
      p.setProperty(QCS_PREFIX + 'FOLDER_ID', folderId);
    } else {
      DriveApp.getFolderById(folderId).getName(); // 確認管理者仍可存取資料夾
    }
    qcsSheet_();
    return { ok: true, folderId, spreadsheetId: QING_SPREADSHEET_ID, redirectUri: qcsRedirectUri_() };
  } finally { lock.releaseLock(); }
}

/** 僅回傳非機密設定；Client Secret 絕不傳到瀏覽器。 */
function getCloudPublicConfig() {
  return { ok: true, oauthReady: !!(qcsClientId_() && qcsClientSecret_()), maxSlots: QCS_SLOTS };
}

/** 建立一次性 OAuth state，支援多個玩家同時開啟登入流程。 */
function getGoogleAuthUrl(mode) {
  try {
    const clientId = qcsClientId_();
    if (!clientId || !qcsClientSecret_()) throw new Error('管理員尚未設定 QING_CLOUD_CLIENT_ID／QING_OAUTH_CLIENT_SECRET');
    const state = qcsRandom_();
    const nonce = qcsRandom_();
    const loginMode = mode === 'same_tab' ? 'same_tab' : 'popup';
    qcsProperties_().setProperty(QCS_OAUTH_STATE_PREFIX + state, JSON.stringify({ nonce, loginMode, createdAt: Date.now() }));
    const params = {
      client_id: clientId,
      redirect_uri: qcsRedirectUri_(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      access_type: 'online',
      prompt: 'select_account'
    };
    const query = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
    return { ok: true, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query, state, loginMode };
  } catch (e) {
    console.error('getGoogleAuthUrl: ' + e);
    return { ok: false, error: String(e.message || e) };
  }
}

/**
 * OAuth 回呼：使用一次性 handoff，不依賴 window.opener / postMessage。
 * Google 登入頁可能因 Cross-Origin-Opener-Policy 切斷 popup opener，
 * 因此回呼只把短效 handoff 寫入 Script Properties，原遊戲分頁會自動輪詢兌換。
 */
function qcsOAuthCallback_(e) {
  const p = (e && e.parameter) || {};
  const state = String(p.state || '');
  let message = '';
  let success = false;
  let props = null;
  let stateData = null;
  let loginMode = 'popup';
  try {
    if (!/^[a-f0-9]{64}$/.test(state)) throw new Error('OAuth 回呼資料不完整，請重新登入');
    props = qcsProperties_();
    const stateKey = QCS_OAUTH_STATE_PREFIX + state;
    const rawState = props.getProperty(stateKey);
    if (!rawState) throw new Error('登入驗證已逾時或已使用，請重新登入');
    props.deleteProperty(stateKey);
    stateData = JSON.parse(rawState);
    loginMode = stateData.loginMode === 'same_tab' ? 'same_tab' : 'popup';
    if (!stateData.createdAt || Date.now() - Number(stateData.createdAt) > QCS_OAUTH_STATE_TTL_MS) {
      throw new Error('登入驗證已逾時，請重新登入');
    }
    if (p.error) throw new Error('Google 授權未完成：' + String(p.error).slice(0, 120));
    const code = String(p.code || '');
    if (!code) throw new Error('OAuth 回呼資料不完整，請重新登入');

    const tokenResponse = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: {
        code,
        client_id: qcsClientId_(),
        client_secret: qcsClientSecret_(),
        redirect_uri: qcsRedirectUri_(),
        grant_type: 'authorization_code'
      },
      muteHttpExceptions: true
    });
    if (tokenResponse.getResponseCode() !== 200) {
      console.error('OAuth token exchange failed: ' + tokenResponse.getContentText().slice(0, 1000));
      throw new Error('Google 授權碼交換失敗，請確認 Client ID、Client Secret 及重新導向 URI');
    }
    const tokenData = JSON.parse(tokenResponse.getContentText());
    if (!tokenData.id_token) throw new Error('Google 未回傳身分識別憑證');
    const verifyResponse = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tokenData.id_token),
      { muteHttpExceptions: true }
    );
    if (verifyResponse.getResponseCode() !== 200) throw new Error('Google 身分憑證驗證失敗');
    const info = JSON.parse(verifyResponse.getContentText());
    if (info.aud !== qcsClientId_() ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(info.iss) ||
        !info.sub || !/^\d+$/.test(String(info.sub)) ||
        Number(info.exp) * 1000 <= Date.now() ||
        info.nonce !== stateData.nonce || String(info.email_verified) !== 'true') {
      throw new Error('Google 帳號身分驗證未通過');
    }

    const sessionToken = qcsCreateSession_(
      String(info.sub), String(info.name || info.email || 'Google 玩家').slice(0, 60)
    );
    // handoff 只可兌換一次，5 分鐘後失效；Session Token 不放在 URL。
    props.setProperty(QCS_HANDOFF_PREFIX + state, JSON.stringify({
      sessionToken, createdAt: Date.now()
    }));
    success = true;
    message = loginMode === 'same_tab'
      ? 'Google 帳號授權成功，正在自動返回大清帝國。'
      : 'Google 帳號授權成功，原本的遊戲分頁將自動完成登入。';
  } catch (err) {
    console.error('OAuth callback: ' + err);
    message = '登入未完成：' + String(err.message || err);
    if (props && stateData && /^[a-f0-9]{64}$/.test(state)) {
      props.setProperty(QCS_HANDOFF_PREFIX + state, JSON.stringify({
        error: String(err.message || err), createdAt: Date.now()
      }));
    }
  }

  const safeMessage = qcsHtmlEscape_(message);
  const closeButton = '<button onclick="window.close()" style="margin-top:14px;padding:10px 18px;border:0;border-radius:8px;background:#e7e5e4;color:#292524;font-weight:bold">關閉此登入視窗</button>';
  const returnUrl = qcsSafeJsonForHtml_(qcsRedirectUri_());
  const automaticAction = loginMode === 'same_tab'
    ? '<script>setTimeout(function(){window.location.replace(' + returnUrl + ');},900);</script>'
    : success ? '<script>setTimeout(function(){window.close();},700);</script>' : '';
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>大清帝國 Google 登入</title></head>' +
    '<body style="font-family:Arial,sans-serif;padding:28px;text-align:center;background:#fffdf5;color:#292524">' +
    '<h2>' + (success ? 'Google 授權成功' : 'Google 登入未完成') + '</h2>' +
    '<p style="line-height:1.8">' + safeMessage + '</p>' + closeButton +
    '<p style="font-size:12px;color:#78716c;margin-top:22px">若瀏覽器未自動關閉或返回，可使用上方按鈕後回到遊戲。</p>' +
    automaticAction +
    '</body></html>'
  );
}

function qcsHtmlEscape_(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 遊戲原分頁以 OAuth state 兌換一次性 handoff；Session Token 不放在網址。 */
function consumeCloudLoginHandoff(state) {
  try {
    const keyState = String(state || '');
    if (!/^[a-f0-9]{64}$/.test(keyState)) throw new Error('登入返回識別碼格式錯誤');
    const props = qcsProperties_();
    const key = QCS_HANDOFF_PREFIX + keyState;
    const raw = props.getProperty(key);
    if (!raw) return { ok: true, pending: true };
    props.deleteProperty(key);
    const handoff = JSON.parse(raw);
    if (handoff.error) throw new Error(String(handoff.error));
    if (!handoff.sessionToken || !handoff.createdAt ||
        Date.now() - Number(handoff.createdAt) > QCS_HANDOFF_TTL_MS) {
      throw new Error('登入結果已逾時，請重新登入');
    }
    return { ok: true, sessionToken: String(handoff.sessionToken) };
  } catch (err) {
    console.error('consumeCloudLoginHandoff: ' + err);
    return { ok: false, error: String(err.message || err) };
  }
}

function qcsCreateSession_(userId, name) {
  const token = qcsRandom_() + qcsRandom_();
  const now = Date.now();
  const value = { userId, name, createdAt: now, expiresAt: now + QCS_SESSION_TTL_MS };
  qcsProperties_().setProperty(QCS_SESSION_PREFIX + qcsSha256_(token), JSON.stringify(value));
  qcsCleanupSessions_();
  return token;
}
function qcsCleanupSessions_() {
  const p = qcsProperties_();
  const now = Date.now();
  const last = Number(p.getProperty('QING_SESSION_CLEANUP_AT') || 0);
  if (now - last < 24 * 60 * 60 * 1000) return;
  const all = p.getProperties();
  Object.keys(all).forEach(key => {
    if (key.indexOf(QCS_SESSION_PREFIX) === 0) {
      try { if (Number(JSON.parse(all[key]).expiresAt || 0) <= now) p.deleteProperty(key); }
      catch (e) { p.deleteProperty(key); }
    } else if (key.indexOf(QCS_OAUTH_STATE_PREFIX) === 0 || key.indexOf(QCS_HANDOFF_PREFIX) === 0) {
      try {
        const item = JSON.parse(all[key]);
        const ttl = key.indexOf(QCS_HANDOFF_PREFIX) === 0 ? QCS_HANDOFF_TTL_MS : QCS_OAUTH_STATE_TTL_MS;
        if (now - Number(item.createdAt || 0) > ttl) p.deleteProperty(key);
      } catch (e) { p.deleteProperty(key); }
    }
  });
  p.setProperty('QING_SESSION_CLEANUP_AT', String(now));
}
function qcsUser_(sessionToken) {
  if (typeof sessionToken !== 'string' || sessionToken.length < 80 || sessionToken.length > 200) throw new Error('登入狀態無效，請重新登入 Google 帳號');
  const key = QCS_SESSION_PREFIX + qcsSha256_(sessionToken);
  const raw = qcsProperties_().getProperty(key);
  if (!raw) throw new Error('登入已逾期或已登出，請重新登入');
  let session;
  try { session = JSON.parse(raw); } catch (e) { qcsProperties_().deleteProperty(key); throw new Error('登入狀態無效，請重新登入'); }
  if (!session.userId || Number(session.expiresAt) <= Date.now()) {
    qcsProperties_().deleteProperty(key);
    throw new Error('登入已逾期，請重新登入');
  }
  // 使用中的 Session 採滑動期限，最長每次延長 30 天。
  session.expiresAt = Date.now() + QCS_SESSION_TTL_MS;
  qcsProperties_().setProperty(key, JSON.stringify(session));
  return { id: String(session.userId), name: String(session.name || 'Google 玩家') };
}
function logoutCloudSession(sessionToken) {
  try {
    if (typeof sessionToken === 'string' && sessionToken.length >= 80 && sessionToken.length <= 200) {
      qcsProperties_().deleteProperty(QCS_SESSION_PREFIX + qcsSha256_(sessionToken));
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

function qcsSheet_() {
  const book = SpreadsheetApp.openById(QING_SPREADSHEET_ID);
  let sheet = book.getSheetByName('玩家雲端存檔');
  if (!sheet) sheet = book.insertSheet('玩家雲端存檔');
  if (sheet.getMaxColumns() < QCS_HEADERS.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), QCS_HEADERS.length - sheet.getMaxColumns());
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, QCS_HEADERS.length).setValues([QCS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, QCS_HEADERS.length).setFontWeight('bold').setBackground('#14532d').setFontColor('#ffffff');
  } else {
    const existingCount = Math.max(1, sheet.getLastColumn());
    const h = sheet.getRange(1, 1, 1, existingCount).getValues()[0].map(String);
    if (h.some((v, i) => v !== QCS_HEADERS[i])) throw new Error('玩家存檔索引欄位不符，已停止以保護資料');
    if (existingCount < QCS_HEADERS.length) {
      sheet.getRange(1, existingCount + 1, 1, QCS_HEADERS.length - existingCount).setValues([QCS_HEADERS.slice(existingCount)]);
    }
  }
  return sheet;
}
function qcsSlot_(slot) {
  const n = Number(slot);
  if (!Number.isInteger(n) || n < 1 || n > QCS_SLOTS) throw new Error('存檔槽必須為 1～5');
  return n;
}
function qcsName_(name) {
  let s = String(name || '未命名王朝').trim().slice(0, 50).replace(/[\u0000-\u001f\u007f]/g, '');
  if (!s) s = '未命名王朝';
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function qcsRows_(sheet, userId) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, QCS_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2, userId: String(r[0]), slot: Number(r[1]), name: String(r[2]), fileId: String(r[3]),
    revision: Number(r[4]) || 0, updatedAt: Number(r[5]) || 0, eraName: String(r[6]), year: Number(r[7]) || 0, gameId: String(r[8]),
    emperorName: String(r[9] || ''), treasury: Number(r[10]) || 0, ministerCount: Number(r[11]) || 0,
    consortCount: Number(r[12]) || 0, descendantCount: Number(r[13]) || 0,
    unified: r[14] === true || String(r[14]).toLowerCase() === 'true'
  })).filter(r => r.userId === userId);
}
function qcsResult_(fn) {
  try { return fn(); }
  catch (e) { console.error('CloudSave: ' + e); return { ok: false, error: String(e.message || e) }; }
}
function qcsLocked_(operation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return operation(); }
  finally { lock.releaseLock(); }
}
function qcsDynasty_(game) {
  return String(game.dynastyId || ('dynasty_' + game.gameId));
}
function qcsSummary_(g) {
  return {
    eraName: String(g.eraName || '').slice(0, 40), year: Number(g.year) || 0,
    gameId: String(g.gameId), dynastyId: qcsDynasty_(g),
    emperorName: String(g.playerName || '').slice(0, 80), treasury: Number(g.treasury) || 0,
    ministerCount: Array.isArray(g.ministers) ? g.ministers.length : 0,
    consortCount: Array.isArray(g.consorts) ? g.consorts.length : 0,
    descendantCount: Array.isArray(g.childrenList) ? g.childrenList.length : 0,
    unified: !!(g.gameWon || g.unificationGameId)
  };
}
function qcsSlotRows_(rows, slot) {
  return rows.filter(row => row.slot === slot);
}
function qcsNeedsReview_(slot, message) {
  return { slot, status: 'review', error: message || '檔案遺失、無法讀取或與槽位不符，請保留本機備份後重新核對。' };
}
function qcsConflict_(message) {
  return { ok: false, conflict: true, error: message };
}
function qcsRequirePayload_(payload) {
  if (!payload || typeof payload.gameState !== 'object' || !payload.gameState ||
      !Array.isArray(payload.logs) || !Array.isArray(payload.gameState.ministers) ||
      !Array.isArray(payload.gameState.provinces) || !String(payload.gameState.gameId || '').trim() ||
      String(payload.gameState.gameId).length > 120) throw new Error('遊戲存檔資料格式不正確');
  return payload.gameState;
}
function qcsFilePrefix_(userId, slot) {
  return 'save_' + qcsSha256_(userId).slice(0, 12) + '_' + slot;
}
function qcsReadFile_(row, includePayload) {
  if (!row.fileId || !row.gameId || row.revision < 1) throw new Error('存檔索引不完整');
  const file = DriveApp.getFileById(row.fileId);
  if (file.isTrashed()) throw new Error('存檔已移至垃圾桶');
  // Drive 的檔案狀態仍須每次核對；快取只用來避免重複下載與解析 JSON。
  const cache = CacheService.getScriptCache();
  const key = 'cloud-summary-' + qcsSha256_(JSON.stringify([row.userId, row.slot, row.fileId, row.gameId, row.revision, row.name, row.updatedAt, file.getLastUpdated().getTime(), file.getName()]));
  if (!includePayload) {
    const cached = cache.get(key);
    if (cached) return JSON.parse(cached);
  }
  const stored = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  const payload = stored?.cloudSaveFormat === 1 ? stored.payload : stored;
  const summary = qcsSummary_(qcsRequirePayload_(payload));
  if (summary.gameId !== row.gameId) throw new Error('索引與檔案的遊戲編號不符');
  let slotIdentity = row.fileId;
  let creationId = '';
  if (stored?.cloudSaveFormat === 1) {
    if (stored.userId !== row.userId || stored.slot !== row.slot || !stored.slotIdentity ||
        stored.dynastyId !== summary.dynastyId || !Number.isInteger(stored.fileRevision) ||
        stored.fileRevision < 1 || stored.fileRevision > row.revision) throw new Error('檔案與帳號、槽位或版本不符');
    slotIdentity = stored.slotIdentity;
    creationId = stored.creationId || '';
  } else if (file.getName() !== qcsFilePrefix_(row.userId, row.slot) + '.json') {
    throw new Error('無法確認舊存檔的歸屬');
  }
  const record = { slot:row.slot, name:row.name, revision:row.revision, updatedAt:row.updatedAt, slotIdentity, ...summary };
  cache.put(key, JSON.stringify({record, creationId}), 300);
  return { record, creationId, payload };
}
function listCloudSaves(sessionToken) {
  return qcsResult_(() => {
    const user = qcsUser_(sessionToken);
    return qcsLocked_(() => {
      const rows = qcsRows_(qcsSheet_(), user.id);
      const slots = [];
      for (let slot = 1; slot <= QCS_SLOTS; slot++) {
        const matches = qcsSlotRows_(rows, slot);
        if (!matches.length) continue;
        if (matches.length !== 1) {
          slots.push(qcsNeedsReview_(slot, '此槽位有重複索引，請保留本機備份並聯絡管理員。'));
          continue;
        }
        try { slots.push(qcsReadFile_(matches[0], false).record); }
        catch (error) { slots.push(qcsNeedsReview_(slot)); }
      }
      return { ok:true, user:{id:user.id, name:user.name}, slots };
    });
  });
}
function loadCloudSave(sessionToken, slot, expectedRevision, expectedIdentity) {
  return qcsResult_(() => {
    const user = qcsUser_(sessionToken), n = qcsSlot_(slot);
    return qcsLocked_(() => {
      const matches = qcsSlotRows_(qcsRows_(qcsSheet_(), user.id), n);
      if (matches.length !== 1) return qcsConflict_('雲端槽位已變更或需要核對，請重新整理。');
      if (expectedRevision != null && matches[0].revision !== Number(expectedRevision)) return qcsConflict_('存檔已變更，請核對清單後再讀取。');
      let current;
      try { current = qcsReadFile_(matches[0], true); }
      catch (error) { return qcsConflict_('雲端檔案需要核對，未讀取此槽位。'); }
      if (expectedIdentity && current.record.slotIdentity !== expectedIdentity) return qcsConflict_('存檔已變更，請核對清單後再讀取。');
      return { ok:true, userId:user.id, ...current.record, payload:current.payload };
    });
  });
}
function qcsSaveReply_(record, userId) {
  return { ok:true, userId, ...record, summary:record };
}
function saveCloudGame(sessionToken, slot, name, payload, expectedRevision, expectedGameId, expectedIdentity, creationId) {
  return qcsResult_(() => {
    const user = qcsUser_(sessionToken), n = qcsSlot_(slot), label = qcsName_(name);
    const game = qcsRequirePayload_(payload), summary = qcsSummary_(game);
    if (JSON.stringify(payload).length > 7000000) throw new Error('存檔過大，超過 7MB 限制');
    const expected = Number(expectedRevision);
    if (!Number.isInteger(expected) || expected < 0) throw new Error('存檔版本無效');
    const requestId = expected === 0 ? String(creationId || summary.gameId) : '';
    if (requestId.length > 160) throw new Error('建立識別無效');
    return qcsLocked_(() => {
      const sheet = qcsSheet_(), rows = qcsRows_(sheet, user.id), matches = qcsSlotRows_(rows, n);
      if (matches.length > 1) return qcsConflict_('槽位有重複索引，無法安全寫入。');
      const old = matches[0];
      const current = old ? qcsReadFile_(old, false) : null;
      if (current && expected === 0 && current.creationId === requestId && current.record.dynastyId === summary.dynastyId) {
        return {...qcsSaveReply_(current.record, user.id), payload:qcsReadFile_(old, true).payload};
      }
      if ((old && old.revision !== expected) || (!old && expected !== 0)) return qcsConflict_('雲端槽位已變更，請重新整理或讀取最新存檔。');
      if (current && (current.record.dynastyId !== summary.dynastyId ||
          (expectedGameId && current.record.gameId !== String(expectedGameId)) ||
          (expectedIdentity && current.record.slotIdentity !== expectedIdentity))) return qcsConflict_('此槽位屬於另一份存檔，已停止覆蓋。');
      if (!old) {
        for (const row of rows) {
          if (row.gameId === summary.gameId) return qcsConflict_('此遊戲已存在於另一個雲端槽位。');
          let other;
          try { other = qcsReadFile_(row, false); } catch (error) { continue; }
          if (other.record.dynastyId === summary.dynastyId) return qcsConflict_('此王朝已存在於另一個雲端槽位。');
        }
      }
      const folderId = qcsProperties_().getProperty(QCS_PREFIX + 'FOLDER_ID');
      if (!folderId) throw new Error('管理員尚未執行 setupCloudSaves');
      const folder = DriveApp.getFolderById(folderId), revision = expected + 1, updatedAt = Date.now();
      let slotIdentity = current?.record.slotIdentity;
      const envelope = {cloudSaveFormat:1, userId:user.id, slot:n, dynastyId:summary.dynastyId,
        fileRevision:revision, creationId:current?.creationId || requestId, payload};
      // 若索引寫入結果不明，重試可沿用相同的待提交檔案。
      const filename = qcsFilePrefix_(user.id, n) + '_' + qcsSha256_(JSON.stringify({...envelope, slotIdentity})) + '.json';
      const candidates = folder.getFilesByName(filename);
      let file;
      while (candidates.hasNext()) {
        const candidate = candidates.next();
        if (candidate.isTrashed()) continue;
        const raw = candidate.getBlob().getDataAsString('UTF-8');
        let candidateIdentity;
        try { candidateIdentity = JSON.parse(raw).slotIdentity; } catch (error) { continue; }
        if (candidateIdentity && (!slotIdentity || candidateIdentity === slotIdentity) &&
            raw === JSON.stringify({...envelope, slotIdentity:candidateIdentity})) {
          slotIdentity = candidateIdentity;
          file = candidate;
          break;
        }
      }
      if (!file) {
        slotIdentity = slotIdentity || qcsRandom_();
        const stored = JSON.stringify({...envelope, slotIdentity});
        file = folder.createFile(Utilities.newBlob(stored, 'application/json', filename));
      }
      const values = [user.id, n, label, file.getId(), revision, updatedAt, summary.eraName, summary.year,
        summary.gameId, summary.emperorName, summary.treasury, summary.ministerCount,
        summary.consortCount, summary.descendantCount, summary.unified];
      if (old) sheet.getRange(old.row, 1, 1, QCS_HEADERS.length).setValues([values]);
      else sheet.appendRow(values);
      SpreadsheetApp.flush();
      if (old && old.fileId !== file.getId() && !rows.some(row => row.row !== old.row && row.fileId === old.fileId)) {
        try { DriveApp.getFileById(old.fileId).setTrashed(true); } catch (error) { console.warn('舊版存檔清理失敗'); }
      }
      return qcsSaveReply_({slot:n, name:label, revision, updatedAt, slotIdentity, ...summary}, user.id);
    });
  });
}
function renameCloudSave(sessionToken, slot, name, expectedRevision, expectedIdentity) {
  return qcsResult_(() => {
    const user = qcsUser_(sessionToken), n = qcsSlot_(slot);
    return qcsLocked_(() => {
      const sheet = qcsSheet_(), matches = qcsSlotRows_(qcsRows_(sheet, user.id), n);
      if (matches.length !== 1) return qcsConflict_('槽位已變更或需要核對。');
      const row = matches[0], {record} = qcsReadFile_(row, false);
      if (row.revision !== Number(expectedRevision) || (expectedIdentity && record.slotIdentity !== expectedIdentity)) return qcsConflict_('雲端版本已變更，請重新整理。');
      const label = qcsName_(name), revision = row.revision + 1, updatedAt = Date.now();
      sheet.getRange(row.row, 3, 1, 4).setValues([[label, row.fileId, revision, updatedAt]]);
      SpreadsheetApp.flush();
      return { ok:true, ...record, name:label, revision, updatedAt };
    });
  });
}
function deleteCloudSave(sessionToken, slot, expectedRevision, expectedIdentity) {
  return qcsResult_(() => {
    const user = qcsUser_(sessionToken), n = qcsSlot_(slot);
    return qcsLocked_(() => {
      const sheet = qcsSheet_(), rows = qcsRows_(sheet, user.id), matches = qcsSlotRows_(rows, n);
      if (matches.length !== 1) return qcsConflict_('槽位已變更或需要核對。');
      const row = matches[0], {record} = qcsReadFile_(row, false);
      if (row.revision !== Number(expectedRevision) || (expectedIdentity && record.slotIdentity !== expectedIdentity)) return qcsConflict_('雲端版本已變更，請重新整理。');
      sheet.deleteRow(row.row);
      SpreadsheetApp.flush();
      if (!rows.some(other => other.row !== row.row && other.fileId === row.fileId)) {
        try { DriveApp.getFileById(row.fileId).setTrashed(true); } catch (error) { console.warn('舊版存檔清理失敗'); }
      }
      return { ok:true };
    });
  });
}
