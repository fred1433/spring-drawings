// Assembles the static page into site/dist: page files, the drawing module, the compression records,
// the favicon, and the current product images when they are present locally (they are not in the repository).
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const dist = new URL('site/dist/', root);
mkdirSync(new URL('current/', dist), { recursive: true });
for (const f of ['index.html', 'style.css', 'app.js', 'favicon.svg', 'favicon.png', 'magento-test-store.jpg']) cpSync(new URL(`site/${f}`, root), new URL(f, dist));
cpSync(new URL('src/spring.js', root), new URL('spring.js', dist));
const recs = JSON.parse(readFileSync(new URL('data/springs.json', root))).filter((r) => r.family === 'compression');
writeFileSync(new URL('springs.json', dist), JSON.stringify(recs));
const imgs = new URL('data/current-images/', root);
if (existsSync(imgs)) for (const f of readdirSync(imgs)) cpSync(new URL(f, imgs), new URL(`current/${f}`, dist));
console.log(`site/dist: ${recs.length} compression records`);
