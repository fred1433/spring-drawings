import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { model, route, drawSheet, drawPlate, drawPlateWide, catalogImage, envelope, centerline, findRecord, num, READ, EDITED } from '../src/spring.js';

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

const fieldOf = (label) => (/^(Ø ext\.|OD)/.test(label) ? 'od' : /^(Ø int\.|ID)/.test(label) ? 'id' : /^(fil|wire)/.test(label) ? 'd' : 'freeLength');

test('every dimension printed is the value of its own field on the sheet, as read', () => {
  for (const r of complete) {
    for (const lang of ['fr', 'en']) {
      for (const draw of [drawSheet, drawPlateWide, drawPlate]) {
        const dims = dimTexts(draw(r, lang).svg).filter((d) => d.text);
        assert.ok(dims.length >= 3, `${r.sku}: ${dims.length} dimensions`);
        for (const d of dims) {
          const vals = [...d.text.matchAll(/(\d+(?:[.,]\d+)?) mm/g)].map((x) => x[1].replace(',', '.'));
          assert.equal(vals.length, 1, `${r.sku}: "${d.text}"`);
          const k = fieldOf(d.text);
          assert.equal(vals[0], r.attrs[k], `${r.sku} ${draw.name}: "${d.text}" is not ${k} = ${r.attrs[k]}`);
          assert.equal(d.color, READ);
        }
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

test('the wire is drawn at its true thickness, at the scale of the drawing, in side and end views', () => {
  for (const r of complete) {
    for (const draw of [drawPlateWide, drawSheet, drawPlate]) {
      const { svg, model: m } = draw(r, 'fr');
      const scale = Number(svg.match(/class="side" data-scale="([\d.]+)"/)[1]);
      const bands = [...svg.matchAll(/<path d="[^"]+" fill="none" stroke="#1d2126" stroke-width="([\d.]+)" stroke-linecap="round"/g)].map((x) => Number(x[1]));
      assert.ok(bands.length >= 2, `${r.sku}: no wire band`);
      const expected = Math.max(m.v.d * scale, 1.6);
      for (const w of bands) assert.ok(Math.abs(w - expected) <= 0.02 * expected + 0.01, `${r.sku} ${draw.name}: wire ${w}px, expected ${expected}px`);
      const ro = svg.match(/class="ro" cx="[^"]+" cy="[^"]+" r="([\d.]+)"/);
      const ri = svg.match(/class="ri" cx="[^"]+" cy="[^"]+" r="([\d.]+)"/);
      if (ro && ri) {
        const t = (Number(ro[1]) - Number(ri[1])) / (2 * Number(ro[1]));
        assert.ok(Math.abs(t - m.v.d / m.v.od) < 0.002, `${r.sku}: ring wall ${t} vs ${m.v.d / m.v.od}`);
      }
    }
  }
});

test('in a catalog row, end view and side view share one scale', () => {
  for (const r of complete) {
    const { svg, model: m } = drawPlateWide(r, 'fr');
    const scale = Number(svg.match(/data-scale="([\d.]+)"/)[1]);
    const ro = Number(svg.match(/class="ro" cx="[^"]+" cy="[^"]+" r="([\d.]+)"/)[1]);
    assert.ok(Math.abs(2 * ro - m.v.od * scale) <= 0.01 * m.v.od * scale + 0.02, r.sku);
  }
});

test('the ends come from the record as read and stay in a variant', () => {
  const r = recs.find((x) => x.sku === 'C.700.600.2000.I');
  assert.equal(model(r).ground, true);
  for (const o of [{ d: '6,2' }, { coils: '11' }, { d: '6.2', coils: '12', freeLength: '240' }]) {
    const m = model(r, o);
    assert.equal(m.ok, true);
    assert.equal(m.ground, true, JSON.stringify(o));
    assert.ok(drawSheet(r, 'fr', o).svg.includes('rapprochées et meulées'));
  }
  assert.equal(model(recs.find((x) => x.sku === 'C.600.600.3600.I'), { d: '5' }).ground, false);
});

test('a sheet without its block length is held back, not drawn with guessed ends', () => {
  for (const r of comp) {
    const hasEnds = r.attrs.blockLength || /^(yes|no)$/i.test(r.attrs.grinding || '');
    if (!hasEnds) assert.equal(route(r).route, 'held', r.sku);
  }
  for (const r of complete) assert.ok(num(r.attrs.blockLength) !== null, `${r.sku} drawn without a block length`);
});

test('typed values: plain decimals with comma or point, within bounds, nothing else', () => {
  const r = recs.find((x) => x.sku === 'C.700.600.2000.I');
  for (const bad of ['1e3', 'abc', '2,5,1', '', ' ', '-5', '0x10', '20000']) {
    const m = model(r, { freeLength: bad });
    assert.equal(m.ok, false, `accepted "${bad}"`);
    assert.equal(drawSheet(r, 'fr', { freeLength: bad }).svg, '');
  }
  assert.equal(model(r, { coils: '200' }).ok, false);
  assert.equal(model(r, { coils: '2' }).ok, false);
  const ok = model(r, { freeLength: '250,5' });
  assert.equal(ok.ok, true);
  assert.equal(ok.raw.freeLength, '250.5');
  assert.ok(drawSheet(r, 'fr', { freeLength: '250,50' }).svg.includes('250,5 mm'));
});

test('specification sheet: end view and side view at one scale', () => {
  for (const r of complete) {
    const { svg, model: m } = drawSheet(r, 'fr');
    const scale = Number(svg.match(/data-scale="([\d.]+)"/)[1]);
    const ro = Number(svg.match(/class="ro" cx="[^"]+" cy="[^"]+" r="([\d.]+)"/)[1]);
    assert.ok(Math.abs(2 * ro - m.v.od * scale) <= 0.01 * m.v.od * scale + 0.02, r.sku);
  }
});
