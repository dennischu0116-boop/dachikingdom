import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const outputDir = path.join(root, '.beta-preview');
const indexPath = path.join(root, 'Index.html');

const includePattern = /<\?!=\s*include\(['"]([^'"]+)['"]\);\s*\?>/g;
let html = fs.readFileSync(indexPath, 'utf8').replace(includePattern, (_, name) => {
  const fragment = path.join(root, `${name}.html`);
  if (!fs.existsSync(fragment)) throw new Error(`Missing GAS include: ${name}.html`);
  return fs.readFileSync(fragment, 'utf8');
});

if (html.includes('<?!=')) throw new Error('Unresolved Apps Script template include');

html = html.replace(
  '<script type="text/babel">',
  '<script>window.QING_IMAGE_BETA_ASSET_BASE="/assets/characters/";</script>\n    <script type="text/babel">'
);
html = html
  .replace('https://unpkg.com/react@18/umd/react.production.min.js', '/node_modules/react/umd/react.production.min.js')
  .replace('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', '/node_modules/react-dom/umd/react-dom.production.min.js')
  .replace('https://unpkg.com/@babel/standalone@7.28.5/babel.min.js', '/node_modules/@babel/standalone/babel.min.js')
  .replace('<script src="https://cdn.tailwindcss.com"></script>', '<link rel="stylesheet" href="/.beta-preview/tailwind.css">')
  .replace("bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] ", '')
  .replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n    <link rel="icon" href="data:,">');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'index.html'), html);
console.log('Built .beta-preview/index.html');
