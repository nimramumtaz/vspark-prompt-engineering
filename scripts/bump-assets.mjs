/**
 * Stamps a cache-busting version onto the CSS links so browsers pick up
 * design changes immediately. Run: node scripts/bump-assets.mjs 3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2] || String(Date.now());
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  'public/index.html',
  'public/register.html',
  'public/status.html',
  'public/404.html',
  'public/admin/login.html',
  'views/admin/dashboard.html'
];

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replace(/\/css\/styles\.css(\?v=[^"]*)?"/g, `/css/styles.css?v=${version}"`)
    .replace(/\/css\/admin\.css(\?v=[^"]*)?"/g, `/css/admin.css?v=${version}"`);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log('stamped', rel);
  }
}
console.log(`asset version: ${version}`);
