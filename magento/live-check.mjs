// End-to-end check against a Magento TEST store (magento/testbed), never a live shop.
// Creates three test products, gives two of them the same placeholder image, then runs the image step:
// classify, refuse SVG, attach PNG, rerun without duplicate, replace only the managed file, roll back,
// and checks the storefront product page. Writes what it saw to magento/live-check-result.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { Magento, isManaged } from './client.mjs';
import { toPng } from '../scripts/png.mjs';
import { catalogImage, drawSheet } from '../src/spring.js';

const BASE = process.env.MAGENTO_URL || 'http://127.0.0.1:8088';
const USER = process.env.MAGENTO_USER || 'testadmin';
const PASS = process.env.MAGENTO_PASS || 'testadmin123';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE) && process.env.I_KNOW_THIS_IS_A_TEST_STORE !== 'yes') {
  console.error('Refusing to run against a non-local store.');
  process.exit(2);
}

const log = [];
const note = (step, data) => { log.push({ step, ...data }); console.log(step, JSON.stringify(data)); };
const assert = (cond, msg) => { if (!cond) throw new Error(`check failed: ${msg}`); };

const token = await (await fetch(`${BASE}/rest/V1/integration/admin/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: USER, password: PASS }),
})).json();
const mg = new Magento({ baseUrl: BASE, token });
const version = await (await fetch(`${BASE}/magento_version`)).text().catch(() => 'unknown');
note('store', { base: BASE, version: version.trim() });

const recs = JSON.parse(readFileSync(new URL('../data/springs.json', import.meta.url)));
const rec = recs.find((r) => r.sku === 'C.700.600.2000.I');
const SKUS = ['TEST-C.700.600.2000.I', 'TEST-SHARED-2', 'TEST-NO-IMAGE'];

// a flat grey placeholder, standing in for a family image shared by many SKUs
const placeholder = toPng('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="#cfd4d8"/></svg>', 300);

for (const [i, sku] of SKUS.entries()) {
  try { await mg.call('DELETE', `/products/${encodeURIComponent(sku)}`); } catch { /* not there yet */ }
  await mg.call('POST', '/products', {
    product: {
      sku, name: `Test ${sku}`, attribute_set_id: 4, price: 1, status: 1, visibility: 4, type_id: 'simple', weight: 1,
      extension_attributes: { website_ids: [1], stock_item: { qty: 10, is_in_stock: true } },
      custom_attributes: [{ attribute_code: 'url_key', value: `test-spring-${i}-${Date.now()}` }],
    },
  });
  if (i < 2) {
    await mg.call('POST', `/products/${encodeURIComponent(sku)}/media`, {
      entry: { media_type: 'image', label: 'placeholder', position: 1, disabled: false, types: ['image', 'small_image', 'thumbnail'],
        content: { base64_encoded_data: placeholder.toString('base64'), type: 'image/png', name: 'compression_product.png' } },
    });
  }
}
note('setup', { products: SKUS });

const shared = new Set(['compression_product.png']);
const classes = [];
for (const sku of SKUS) classes.push(await mg.classify(sku, shared));
note('classify', { result: classes.map((c) => ({ sku: c.sku, need: c.need })) });
assert(classes[0].need === 'shared-image' && classes[1].need === 'shared-image' && classes[2].need === 'no-image', 'classification');

// SVG in the gallery: expected to be refused by a stock store
let svgRefused = null;
try {
  await mg.call('POST', `/products/${encodeURIComponent(SKUS[2])}/media`, {
    entry: { media_type: 'image', label: 'svg', position: 0, disabled: false, types: [],
      content: { base64_encoded_data: Buffer.from(drawSheet(rec, 'en').svg).toString('base64'), type: 'image/svg+xml', name: 'drawing.svg' } },
  });
  svgRefused = false;
} catch (e) { svgRefused = e.message; }
note('svg-upload', { refused: svgRefused });

const sku = SKUS[0];
const png1 = toPng(catalogImage(rec).svg);
const j1 = await mg.upsertManagedImage(sku, png1, { label: 'Compression spring C.700.600.2000.I' });
let media = await mg.media(sku);
note('upload', { action: j1.action, entries: media.map((e) => ({ id: e.id, file: e.file, types: e.types, label: e.label })) });
assert(j1.action === 'added', 'first upload adds');
const mine = media.find(isManaged);
assert(mine && ['image', 'small_image', 'thumbnail'].every((t) => mine.types.includes(t)), 'managed image holds the roles');

const j2 = await mg.upsertManagedImage(sku, png1);
const media2 = await mg.media(sku);
note('rerun', { action: j2.action, count: media2.length });
assert(j2.action === 'unchanged' && media2.length === media.length, 'rerun adds nothing');

// storefront: the product page shows the managed image
const prod = await mg.call('GET', `/products/${encodeURIComponent(sku)}`);
const urlKey = prod.custom_attributes.find((a) => a.attribute_code === 'url_key').value;
const page = await (await fetch(`${BASE}/${urlKey}.html`)).text();
const file = mine.file.split('/').pop().replace('.png', '');
note('storefront', { url: `${BASE}/${urlKey}.html`, showsManagedImage: page.includes(file), altLabel: page.includes('Compression spring C.700.600.2000.I') });
assert(page.includes(file), 'product page shows the image');

// a corrected value upstream: only the managed file is replaced, the placeholder stays
const png2 = toPng(catalogImage(rec, 800, { freeLength: '220' }).svg);
const j3 = await mg.upsertManagedImage(sku, png2, { label: 'Compression spring C.700.600.2000.I', previous: j1 });
const media3 = await mg.media(sku);
note('replace', { action: j3.action, removed: j3.removed, entries: media3.map((e) => ({ id: e.id, file: e.file, types: e.types })) });
assert(j3.action === 'replaced' && media3.length === media.length, 'replace keeps the count');
assert(media3.some((e) => !isManaged(e) && e.file === media.find((x) => !isManaged(x)).file), 'placeholder untouched');

const r = await mg.rollback(j3);
const media4 = await mg.media(sku);
note('rollback', { action: r.action, entries: media4.map((e) => ({ id: e.id, file: e.file, types: e.types })) });
assert(!media4.some(isManaged), 'managed image removed');
assert(media4.some((e) => (e.types || []).includes('image')), 'placeholder has its role back');

writeFileSync(new URL('./live-check-result.json', import.meta.url), JSON.stringify({ ranAt: new Date().toISOString(), log }, null, 1));
console.log('ALL CHECKS PASSED');
