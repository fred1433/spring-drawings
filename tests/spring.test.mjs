import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { model, route, drawSheet, drawPlate, catalogImage, envelope, centerline, findRecord, num, READ, EDITED } from '../src/spring.js';

const recs = JSON.parse(readFileSync(new URL('../data/springs.json', import.meta.url)));
const comp = recs.filter((r) => r.family === 'compression');
const complete = comp.filter((r) => route(r).route === 'svg');

test('the sheets read hold compression records', () => {
  assert.ok(comp.length >= 50, `only ${comp.length} compression records`);
  assert.ok(complete.length >= 50);
});

test('coil convention: free length = (coils - 2) x pitch + 2 x wire on every complete record', () => {
  for (const r of complete) {
    const a = Object.fromEntries(Object.entries(r.attrs).map(([k, v]) => [k, num(v)]));
    const L = (a.coils - 2) * a.pitch + 2 * a.d;
    assert.ok(Math.abs(L - a.freeLength) <= 0.01 * a.freeLength, `${r.sku}: ${L} vs ${a.freeLength}`);
  }
});

test('ground or not: every block length on the sheets is (coils + 0.5) d or (coils + 1.5) d', () => {
  let n = 0;
  for (const r of complete) {
    const a = Object.fromEntries(Object.entries(r.attrs).map(([k, v]) => [k, num(v)]));
    if (a.blockLength === null || a.blockLength === undefined) continue;
    const best = Math.min(Math.abs(a.blockLength - (a.coils + 0.5) * a.d), Math.abs(a.blockLength - (a.coils + 1.5) * a.d));
    assert.ok(best < 0.05, `${r.sku}: block ${a.blockLength} fits neither relation`);
    n++;
  }
  assert.ok(n >= 30, `only ${n} records with a block length`);
});

test('the drawn spring spans exactly the free length, with the coil count of the sheet', () => {
  for (const r of complete) {
    const m = model(r);
    const [lo, hi] = envelope(m);
    assert.ok(Math.abs(hi - lo - m.v.freeLength) <= 0.005 * m.v.freeLength, `${r.sku}: drawn ${hi - lo} vs ${m.v.freeLength}`);
    const pts = centerline(m);
    assert.ok(Math.abs(pts.at(-1).t - m.v.coils) < 1e-9);
    assert.ok(Math.abs(m.rm * 2 - (m.v.od - m.v.d)) < 1e-9, 'helix on the mean diameter');
  }
});

const dimTexts = (svg) => [...svg.matchAll(/<text[^>]*fill="([^"]+)"[^>]*class="dim"[^>]*>([^<]*)<\/text>/g)].map((x) => ({ color: x[1], text: x[2] }));

test('every dimension printed is a value read on the sheet, as read', () => {
  for (const r of complete) {
    for (const lang of ['fr', 'en']) {
      const { svg } = drawSheet(r, lang);
      const dims = dimTexts(svg);
      assert.ok(dims.length >= 4, `${r.sku}: ${dims.length} dimensions`);
      for (const d of dims) {
        const vals = [...d.text.matchAll(/(\d+(?:[.,]\d+)?) mm/g)].map((x) => x[1].replace(',', '.'));
        assert.ok(vals.length === 1, `${r.sku}: "${d.text}"`);
        const attrs = Object.values(r.attrs).filter(Boolean);
        assert.ok(attrs.includes(vals[0]), `${r.sku}: ${vals[0]} is not a value of the sheet`);
        assert.equal(d.color, READ);
      }
    }
  }
});

test('a record with an empty essential value is held back and nothing is drawn', () => {
  const held = comp.filter((r) => route(r).route === 'held');
  assert.ok(held.length >= 1);
  for (const r of held) {
    assert.equal(drawSheet(r).svg, '');
    assert.equal(catalogImage(r).svg, '');
    assert.ok(route(r).fields.length >= 1);
  }
});

test('families without a template are routed out, not drawn', () => {
  for (const r of recs.filter((x) => x.family !== 'compression')) assert.equal(route(r).route, 'unsupported');
});

test('a changed value is a hypothetical variant: ochre, drawing follows, inside diameter becomes calculated', () => {
  const r = recs.find((x) => x.sku === 'C.700.600.2000.I');
  const base = model(r);
  const v = model(r, { freeLength: '260', od: '80' });
  assert.equal(v.variant, true);
  assert.equal(v.idCalc, true);
  assert.equal(v.idValue, '68');
  const [lo, hi] = envelope(v);
  assert.ok(Math.abs(hi - lo - 260) < 1.3);
  assert.ok(v.activePitch > base.activePitch);
  const { svg } = drawSheet(r, 'fr', { freeLength: '260', od: '80' });
  assert.ok(svg.includes(EDITED));
  assert.ok(/260 mm/.test(svg) && /80 mm/.test(svg));
  assert.ok(!/Longueur à charge max/.test(svg), 'the max-load length of the sheet no longer applies to a variant');
});

test('values that do not make a spring are refused, not drawn', () => {
  const r = recs.find((x) => x.sku === 'C.700.600.2000.I');
  assert.equal(model(r, { od: '10' }).ok, false);
  assert.equal(model(r, { coils: '2' }).ok, false);
  assert.equal(drawPlate(r, 'fr', { freeLength: '5' }).svg, '');
});

test('output is deterministic', () => {
  const r = complete[3];
  assert.equal(drawSheet(r).svg, drawSheet(r).svg);
  assert.equal(catalogImage(r).svg, catalogImage(r).svg);
});

test('a reference is found from a SKU or a product URL', () => {
  assert.equal(findRecord(recs, ' c.700.600.2000.i ')?.sku, 'C.700.600.2000.I');
  assert.equal(findRecord(recs, 'https://www.vanel.tech/catalog/product/view/id/124251/s/c-700-600-2000-i/category/545/')?.sku, 'C.700.600.2000.I');
  assert.equal(findRecord(recs, 'nothing'), null);
});

test('every record keeps the URL it was read from and the date', () => {
  for (const r of recs) {
    assert.match(r.categoryUrl, /^https:\/\/www\.vanel\.tech\//);
    assert.match(r.readAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});
