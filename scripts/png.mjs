// SVG master to PNG: the catalog image of each drawable record, 800 x 800, into png/.
// Magento's product gallery takes raster images (see magento/README.md), so the PNG is what gets uploaded.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { catalogImage, route } from '../src/spring.js';

export function toPng(svg, width = 800) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: '#ffffff' }).render().asPng();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recs = JSON.parse(readFileSync(new URL('../data/springs.json', import.meta.url)));
  mkdirSync(new URL('../png/', import.meta.url), { recursive: true });
  let n = 0;
  for (const r of recs) {
    if (route(r).route !== 'svg') continue;
    writeFileSync(new URL(`../png/${r.sku}.png`, import.meta.url), toPng(catalogImage(r).svg));
    n++;
  }
  console.log(`${n} PNG written to png/`);
}
