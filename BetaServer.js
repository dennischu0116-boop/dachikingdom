/**
 * v1.3.5-beta minimal Google Apps Script server.
 *
 * The beta deployment workflow copies this file instead of the production
 * leaderboard/cloud-save backends. Keep this server read-only: it only renders
 * the isolated image test page and resolves its approved HTML fragments.
 */
const BETA_HTML_FRAGMENTS = new Set([
  'Styles',
  'ClientCore',
  'ClientContent',
  'ClientShell',
  'ClientRules',
  'ImageBeta',
  'AppState',
  'AppModals',
  'AppGovernment',
  'AppRoyal',
  'AppWarAndMain'
]);

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('大清帝國 v1.3.5-beta 人物立繪測試')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  if (!BETA_HTML_FRAGMENTS.has(String(filename))) {
    throw new Error('不允許載入未列入測試版白名單的 HTML：' + filename);
  }
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}
