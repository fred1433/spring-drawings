// Writes, for every compression record that the template can draw: the specification sheet (svg/<sku>.svg),
// the clean catalog image (svg/<sku>.catalog.svg) and where each value came from (svg/<sku>.sources.json).
// Records it cannot draw are listed in svg/routing.json with the reason.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { drawSheet, catalogImage, route, model } from '../src/spring.js';
const recs = JSON.parse(readFileSync(new URL('../data/springs.json', import.meta.url)));
const lang = process.argv[2] === 'fr' ? 'fr' : 'en';
mkdirSync(new URL('../svg/', import.meta.url), { recursive: true });
const routing = [];
for (const r of recs) {
  const rt = route(r);
  routing.push({ sku: r.sku, family: r.family, ...rt, url: r.productUrl || r.categoryUrl });
  if (rt.route !== 'svg') continue;
  writeFileSync(new URL(`../svg/${r.sku}.svg`, import.meta.url), drawSheet(r, lang).svg);
  writeFileSync(new URL(`../svg/${r.sku}.catalog.svg`, import.meta.url), catalogImage(r).svg);
  writeFileSync(new URL(`../svg/${r.sku}.sources.json`, import.meta.url), JSON.stringify({ sku: r.sku, url: r.productUrl || r.categoryUrl, readAt: r.readAt, sources: model(r).sources }, null, 1));
}
writeFileSync(new URL('../svg/routing.json', import.meta.url), JSON.stringify(routing, null, 1));
const count = (k) => routing.filter((x) => x.route === k).length;
console.log(`drawn ${count('svg')}, held ${count('held')}, review ${count('review')}, other family ${count('unsupported')}`);
