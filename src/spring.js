// Parametric drawings of compression springs, generated from catalog attributes only.
// No dependency, no network: the same module runs in the browser and in Node (tests, CLI).
//
// Two outputs from the same record:
//   catalogImage(rec)  clean product image: side view, fixed frame, no dimensions
//   drawSheet(rec)     specification drawing: end view, side view, dimensions, title block
//
// What the geometry rests on (see README, "Where every line comes from"):
//   - helix on the mean diameter, OD - wire;
//   - "Nr of Coils" counted as TOTAL coils, one closed coil at each end. Established on the sheets read:
//     free length = (coils - 2) x pitch + 2 x wire holds on every complete compression record (test);
//   - ground or not: read from the block length the sheet gives, (coils + 0.5) x wire when ground,
//     (coils + 1.5) x wire when not (holds on every record that has both fields, test);
//   - winding sense is not on the sheet: drawn right-hand, and said so.
// Every printed dimension is a value read on the sheet, printed as read, unless the visitor changed it
// (then it is marked as a hypothetical variant) or it is derived (then it is marked as calculated).

export const INK = '#1d2126';
export const READ = '#1c4f9c';
export const EDITED = '#9a5b00';
const FRONT = '#eef1f3'; // wire seen in front
const BACK = '#c4cbd1';  // wire seen through the gaps, behind

const TXT = {
  fr: {
    wire: 'fil', od: 'Ø ext.', id: 'Ø int.', calc: 'calculé',
    lmax: 'Longueur à charge max.', coilsTotal: 'spires totales',
    ground: 'Extrémités rapprochées et meulées', closed: 'Extrémités rapprochées, non meulées',
    family: 'Ressort de compression', source: 'Attributs lus sur vanel.tech le', variant: 'Variante hypothétique, cotes modifiées en ocre',
    material: { 'Stainless Steel': 'inox', 'Music Wire': 'corde à piano', 'Piano Wire': 'corde à piano' },
    field: { d: 'Diamètre du fil', od: 'Diamètre extérieur', id: 'Diamètre intérieur', freeLength: 'Longueur libre', coils: 'Nombre de spires', pitch: 'Pas', blockLength: 'Longueur à bloc', lengthAtMaxLoad: 'Longueur à charge max.' },
  },
  en: {
    wire: 'wire', od: 'OD', id: 'ID', calc: 'calculated',
    lmax: 'Length at max. load', coilsTotal: 'total coils',
    ground: 'Closed and ground ends', closed: 'Closed ends, not ground',
    family: 'Compression spring', source: 'Attributes read on vanel.tech on', variant: 'Hypothetical variant, changed dimensions in ochre',
    material: {},
    field: { d: 'Wire diameter', od: 'Outside diameter', id: 'Inside diameter', freeLength: 'Free length', coils: 'Number of coils', pitch: 'Pitch', blockLength: 'Block length', lengthAtMaxLoad: 'Length at max. load' },
  },
};
export const txt = (lang) => TXT[lang] || TXT.fr;

export const num = (s) => {
  if (s === null || s === undefined || String(s).trim() === '') return null;
  const v = Number(String(s).trim().replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

// A value as read on the sheet; only the decimal separator follows the language.
export function fmt(raw, lang) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  return lang === 'fr' ? s.replace('.', ',') : s.replace(',', '.');
}
const fmtNum = (x, lang) => fmt(String(Math.round(x * 100) / 100), lang);

export const REQUIRED = ['d', 'od', 'freeLength', 'coils', 'pitch'];
export const EDITABLE = ['d', 'od', 'freeLength', 'coils'];

// Where a record goes: drawn by the template, held back for a missing value, or not handled by this template.
// Ends of the spring, from the record as read (never from a visitor's changes):
// the block length the sheet gives, (coils + 0.5) x wire when ground, (coils + 1.5) x wire when not.
export function endsOf(rec) {
  const d = num(rec.attrs.d), n = num(rec.attrs.coils), b = num(rec.attrs.blockLength);
  if (b !== null && d !== null && n !== null) {
    const g = Math.abs(b - (n + 0.5) * d), ng = Math.abs(b - (n + 1.5) * d);
    return { ground: g < ng, from: 'block' };
  }
  if (/^(yes|no)$/i.test(rec.attrs.grinding || '')) return { ground: /^yes$/i.test(rec.attrs.grinding), from: 'grinding' };
  return null;
}

// Where a record goes: drawn by the template, held back for a missing value, or not handled by this template.
export function route(rec) {
  if (rec.family !== 'compression') return { route: 'unsupported', reason: 'family' };
  const missing = REQUIRED.filter((k) => num(rec.attrs[k]) === null);
  if (!endsOf(rec)) missing.push('blockLength');
  if (missing.length) return { route: 'held', reason: 'missing', fields: missing, productPageRead: !!rec.productPageRead };
  const m = model(rec);
  if (!m.ok) return { route: 'review', reason: m.reason };
  return { route: 'svg' };
}

// What a visitor may type: a plain decimal number (comma or point), within plausible bounds.
export const BOUNDS = { d: [0.05, 30], od: [0.5, 600], freeLength: [0.5, 3000], coils: [2.5, 150] };
export function parseInput(k, s) {
  const t = String(s ?? '').trim();
  if (!/^\d+([.,]\d+)?$/.test(t)) return { ok: false, reason: 'format' };
  const v = Number(t.replace(',', '.'));
  const [lo, hi] = BOUNDS[k];
  if (!(v >= lo && v <= hi)) return { ok: false, reason: 'bounds', lo, hi };
  return { ok: true, value: v };
}

// Turn a record into a drawing model. `overrides` are values typed by a visitor (hypothetical variant).
export function model(rec, overrides = {}) {
  const raw = { ...rec.attrs };
  const edited = {};
  const badInput = [];
  for (const k of EDITABLE) {
    const o = overrides[k];
    if (o === undefined || o === null) continue;
    if (String(o).trim() === '') { badInput.push({ field: k, reason: 'empty' }); continue; }
    const p = parseInput(k, o);
    if (!p.ok) { badInput.push({ field: k, ...p }); continue; }
    if (p.value !== num(raw[k])) { raw[k] = String(p.value); edited[k] = true; }
  }
  const v = {};
  for (const [k, s] of Object.entries(raw)) v[k] = num(s);
  const m = { rec, raw, v, edited, variant: Object.keys(edited).length > 0, ok: true, sources: [] };
  if (badInput.length) return { ...m, ok: false, reason: 'input', badInput };
  const missing = REQUIRED.filter((k) => v[k] === null);
  if (missing.length) return { ...m, ok: false, reason: 'missing', missing };
  if (!(v.d > 0 && v.od > 2 * v.d && v.freeLength > 2 * v.d && v.coils > 2)) return { ...m, ok: false, reason: 'geometry' };

  m.rm = (v.od - v.d) / 2;
  m.hand = 1;
  // ends are a property of the product, read once from the record as read, and kept in a variant
  const ends = endsOf(rec);
  if (!ends) return { ...m, ok: false, reason: 'missing', missing: ['blockLength'] };
  m.ground = ends.ground;
  m.groundFrom = ends.from;
  // the pitch the drawing uses: the one that closes the free length with one closed coil at each end
  const span = m.ground ? v.freeLength : v.freeLength - v.d;
  m.activePitch = (span - 2 * v.d) / (v.coils - 2);
  if (!(m.activePitch > v.d)) return { ...m, ok: false, reason: 'geometry' };
  // inside diameter: read on the sheet unless the visitor changed wire or OD, then calculated
  if (!edited.d && !edited.od && v.id !== null && v.id !== undefined) { m.idValue = raw.id; m.idCalc = false; }
  else { m.idValue = String(Math.round((v.od - 2 * v.d) * 100) / 100); m.idCalc = true; }
  m.sources = sources(m);
  return m;
}

// One line per thing drawn: what it is, where its value comes from.
function sources(m) {
  const S = [];
  const read = (k, drawnAs) => S.push({ item: k, value: m.raw[k], from: m.edited[k] ? 'edited' : 'sheet', drawnAs });
  read('d', 'dimension');
  read('od', 'dimension');
  read('freeLength', 'dimension');
  read('coils', 'geometry');
  S.push({ item: 'id', value: m.idValue, from: m.idCalc ? 'derived' : 'sheet', formula: m.idCalc ? 'od - 2 d' : null, drawnAs: 'dimension' });
  if (m.raw.lengthAtMaxLoad) S.push({ item: 'lengthAtMaxLoad', value: m.raw.lengthAtMaxLoad, from: 'sheet', drawnAs: 'note' });
  S.push({ item: 'meanDiameter', value: String(Math.round((m.v.od - m.v.d) * 100) / 100), from: 'derived', formula: 'od - d', drawnAs: 'geometry' });
  S.push({ item: 'pitch', value: String(Math.round(m.activePitch * 100) / 100), from: 'derived', formula: m.ground ? '(freeLength - 2 d) / (coils - 2)' : '(freeLength - 3 d) / (coils - 2)', drawnAs: 'geometry' });
  S.push({ item: 'ends', value: m.ground ? 'closed, ground' : 'closed', from: m.groundFrom === 'block' ? 'derived' : m.groundFrom === 'grinding' ? 'sheet' : 'assumed', formula: m.groundFrom === 'block' ? 'blockLength = (coils + 0.5) d if ground, (coils + 1.5) d if not' : null, drawnAs: 'geometry' });
  S.push({ item: 'winding', value: 'right-hand', from: 'assumed', drawnAs: 'geometry' });
  return S;
}

// ---------- geometry ----------

// Coil centerline in mm: axis along x, y up, z toward the viewer. Right-hand helix.
export function centerline(m, samplesPerTurn = 64) {
  const { d, coils: n } = m.v;
  const x0 = m.ground ? 0 : d / 2;
  const N = Math.ceil(n * samplesPerTurn);
  const pts = [];
  const xAt = (t) => {
    if (t <= 1) return x0 + t * d;
    if (t <= n - 1) return x0 + d + (t - 1) * m.activePitch;
    return x0 + d + (n - 2) * m.activePitch + (t - (n - 1)) * d;
  };
  for (let i = 0; i <= N; i++) {
    const t = (n * i) / N;
    const th = 2 * Math.PI * t;
    pts.push({ t, x: xAt(t), y: m.rm * Math.cos(th), z: m.hand * m.rm * Math.sin(th) });
  }
  return pts;
}

// Outer extent of the drawn spring along its axis, in mm.
export function envelope(m) {
  const pts = centerline(m);
  const r = m.v.d / 2;
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p.x - r); hi = Math.max(hi, p.x + r); }
  if (m.ground) { lo = Math.max(lo, 0); hi = Math.min(hi, m.v.freeLength); }
  return [lo, hi];
}

function runs(pts) {
  const out = [];
  let cur = null;
  for (let i = 0; i < pts.length; i++) {
    const front = pts[i].z >= 0;
    if (!cur || cur.front !== front) {
      cur = { front, from: i, to: i };
      out.push(cur);
    } else cur.to = i;
  }
  return out;
}

// ---------- svg primitives ----------

const f2 = (x) => String(Math.round(x * 100) / 100);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const poly = (pp) => pp.map((p, i) => `${i ? 'L' : 'M'}${f2(p[0])} ${f2(p[1])}`).join('');

// Wire as an outlined tube: dark band at wire width, white core; back half first so the front hides it.
function coilPaths(m, P, wpx, lw, shade = true) {
  const pts = centerline(m);
  const rs = runs(pts);
  const seg = (r, pad) => pts.slice(Math.max(0, r.from - pad), Math.min(pts.length, r.to + 1 + pad)).map((p) => P(p.x, p.y));
  const back = rs.filter((r) => !r.front).map((r) => poly(seg(r, 1))).join('');
  const front = rs.filter((r) => r.front).map((r) => poly(seg(r, 1))).join('');
  const band = (d, w, c) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (wpx <= 3.2 * lw) return band(back, Math.max(wpx, lw), INK) + band(front, Math.max(wpx, lw), INK);
  return band(back, wpx, INK) + band(back, wpx - 2 * lw, shade ? BACK : '#fff') + band(front, wpx, INK) + band(front, wpx - 2 * lw, shade ? FRONT : '#fff');
}

function sideView(m, box, lw, shade = true, kind = 'v', sFixed = null, alignLeft = false) {
  const { d, od, freeLength: L } = m.v;
  const s = sFixed || Math.min(box.w / L, box.h / od);
  const cx = alignLeft ? box.x : box.x + (box.w - L * s) / 2, cy = box.y + box.h / 2;
  const P = (x, y) => [cx + x * s, cy - y * s];
  const top = cy - (od / 2) * s, bot = cy + (od / 2) * s;
  const x0 = cx, x1 = cx + L * s;
  const id = `clip-${m.rec.sku.replace(/[^A-Za-z0-9]/g, '')}-${kind}${m.variant ? '-var' : ''}`;
  let svg = `<g class="side" data-scale="${f2(s * 1000) / 1000}"></g><clipPath id="${id}"><rect x="${f2(x0)}" y="${f2(top - lw * 2)}" width="${f2(x1 - x0)}" height="${f2(bot - top + lw * 4)}"/></clipPath>`;
  svg += `<g clip-path="url(#${id})">${coilPaths(m, P, d * s, lw, shade)}</g>`;
  if (m.ground) svg += `<path d="M${f2(x0)} ${f2(top)}V${f2(bot)}M${f2(x1)} ${f2(top)}V${f2(bot)}" stroke="${INK}" stroke-width="${lw}"/>`;
  return { svg, s, P, cy, top, bot, x0, x1 };
}

function endView(m, cx, cy, r, lw) {
  const ro = r, ri = r * (m.v.od / 2 - m.v.d) / (m.v.od / 2);
  const ring = `M${f2(cx - ro)} ${f2(cy)}a${f2(ro)} ${f2(ro)} 0 1 0 ${f2(2 * ro)} 0a${f2(ro)} ${f2(ro)} 0 1 0 ${f2(-2 * ro)} 0ZM${f2(cx - ri)} ${f2(cy)}a${f2(ri)} ${f2(ri)} 0 1 0 ${f2(2 * ri)} 0a${f2(ri)} ${f2(ri)} 0 1 0 ${f2(-2 * ri)} 0Z`;
  const svg = `<path class="ring" d="${ring}" fill="${FRONT}" fill-rule="evenodd"/><circle class="ro" cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(ro)}" fill="none" stroke="${INK}" stroke-width="${lw}"/>` +
    `<circle class="ri" cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(ri)}" fill="none" stroke="${INK}" stroke-width="${lw}"/>` +
    `<path d="M${f2(cx)} ${f2(cy - ri)}V${f2(cy - ro)}" stroke="${INK}" stroke-width="${lw}"/>`;
  return { svg, ro, ri };
}

function arrow(x, y, ang, size, color) {
  const a1 = ang + Math.PI - 0.3, a2 = ang + Math.PI + 0.3;
  return `<path d="M${f2(x)} ${f2(y)}L${f2(x + size * Math.cos(a1))} ${f2(y + size * Math.sin(a1))}L${f2(x + size * Math.cos(a2))} ${f2(y + size * Math.sin(a2))}Z" fill="${color}"/>`;
}
const text = (x, y, s, size, color, anchor = 'middle', cls = 'dim') =>
  `<text x="${f2(x)}" y="${f2(y)}" font-size="${size}" fill="${color}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;

function hDim(xa, xb, yFeat, yDim, label, S, color) {
  return `<path d="M${f2(xa)} ${f2(yFeat - 4)}V${f2(yDim - 5)}M${f2(xb)} ${f2(yFeat - 4)}V${f2(yDim - 5)}M${f2(xa)} ${f2(yDim)}H${f2(xb)}" stroke="${color}" stroke-width="${S.thin}" fill="none"/>` +
    arrow(xa, yDim, Math.PI, S.arrow, color) + arrow(xb, yDim, 0, S.arrow, color) +
    text((xa + xb) / 2, yDim - S.gap, label, S.font, color);
}
function vDim(ya, yb, xFeat, xDim, label, S, color) {
  return `<path d="M${f2(xFeat + 4)} ${f2(ya)}H${f2(xDim + 5)}M${f2(xFeat + 4)} ${f2(yb)}H${f2(xDim + 5)}M${f2(xDim)} ${f2(ya)}V${f2(yb)}" stroke="${color}" stroke-width="${S.thin}" fill="none"/>` +
    arrow(xDim, ya, -Math.PI / 2, S.arrow, color) + arrow(xDim, yb, Math.PI / 2, S.arrow, color) +
    text(xDim + S.gap + 3, (ya + yb) / 2 + S.font * 0.35, label, S.font, color, 'start');
}
function leader(x, y, tx, ty, label, S, color) {
  return `<path d="M${f2(x)} ${f2(y)}L${f2(tx)} ${f2(ty)}H${f2(tx + 10)}" stroke="${color}" stroke-width="${S.thin}" fill="none"/>` +
    arrow(x, y, Math.atan2(y - ty, x - tx), S.arrow, color) + text(tx + 14, ty + S.font * 0.35, label, S.font, color, 'start');
}

const col = (m, k) => (m.edited[k] ? EDITED : READ);
const mm = (m, k, lang) => `${fmt(m.raw[k], lang)} mm`;
const STYLE = `<style>text{font-family:Archivo,'Helvetica Neue',Arial,sans-serif;font-stretch:87.5%;font-variant-numeric:tabular-nums;font-weight:500}.note{font-weight:400}.sku{font-weight:650;font-stretch:100%}</style>`;

function wireLeader(m, sv, S, maxY) {
  // on the lower silhouette of the middle coil
  const pts = centerline(m);
  const mid = Math.floor(pts.length / 2);
  let b = pts[mid];
  for (let i = mid; i < Math.min(pts.length, mid + 80); i++) if (pts[i].y < b.y) b = pts[i];
  const [x, y] = sv.P(b.x, b.y - m.v.d / 2);
  return { x, y: y + 1, ty: Math.min(maxY, y + 34) };
}

// ---------- outputs ----------

// Compact dimensioned side view for a catalog plate: free length, OD, wire.
export function drawPlate(rec, lang = 'fr', overrides = {}) {
  const m = model(rec, overrides);
  const W = 560, H = 236;
  const S = { thin: 1, arrow: 8, font: 18, gap: 8 };
  const T = txt(lang);
  if (!m.ok) return { svg: '', model: m };
  const sv = sideView(m, { x: 14, y: 56, w: 360, h: 134 }, 1.6, false, 'plate');
  let b = sv.svg;
  b += hDim(sv.x0, sv.x1, sv.top, 34, mm(m, 'freeLength', lang), S, col(m, 'freeLength'));
  b += vDim(sv.top, sv.bot, sv.x1, sv.x1 + 20, `${T.od} ${mm(m, 'od', lang)}`, S, col(m, 'od'));
  const wl = wireLeader(m, sv, S, H - 14);
  b += leader(wl.x, wl.y, wl.x + 26, wl.ty, `${T.wire} ${mm(m, 'd', lang)}`, S, col(m, 'd'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${T.family} ${rec.sku}`)}">${STYLE}<rect width="${W}" height="${H}" fill="#fff"/>${b}</svg>`;
  return { svg, model: m };
}

// Catalog row: end view and side view at the same scale, free length, OD, ID and wire.
export function drawPlateWide(rec, lang = 'fr', overrides = {}) {
  const m = model(rec, overrides);
  const W = 1000, H = 250;
  const S = { thin: 1, arrow: 8, font: 18, gap: 8 };
  const T = txt(lang);
  if (!m.ok) return { svg: '', model: m };
  const { od, freeLength: L } = m.v;
  const s = Math.min(560 / L, 150 / od);
  const ecx = 110, ecy = 128;
  const ev = endView(m, ecx, ecy, (od / 2) * s, 1.6);
  let b = ev.svg;
  const idCol = m.idCalc ? (m.variant ? EDITED : '#5b636b') : READ;
  b += hDim(ecx - ev.ri, ecx + ev.ri, ecy - ev.ri * 0.3, ecy - ev.ro - 18, `${T.id} ${fmt(m.idValue, lang)} mm${m.idCalc ? ` (${T.calc})` : ''}`, S, idCol);
  const sv = sideView(m, { x: 250, y: 53, w: 560, h: 150 }, 1.6, true, 'row', s, true);
  b += sv.svg;
  b += hDim(sv.x0, sv.x1, sv.top, Math.min(sv.top - 18, 44), mm(m, 'freeLength', lang), S, col(m, 'freeLength'));
  b += vDim(sv.top, sv.bot, sv.x1, sv.x1 + 22, `${T.od} ${mm(m, 'od', lang)}`, S, col(m, 'od'));
  // wire: under the ring, pointing at the wall where its thickness reads directly
  const wy = ecy + (ev.ro + ev.ri) / 2, ty = ecy + ev.ro + 30;
  b += `<path d="M${f2(ecx)} ${f2(ty - S.font + 2)}V${f2(wy + 2)}" stroke="${col(m, 'd')}" stroke-width="${S.thin}"/>` + arrow(ecx, wy, -Math.PI / 2, S.arrow, col(m, 'd'));
  b += text(ecx, ty, `${T.wire} ${mm(m, 'd', lang)}`, S.font, col(m, 'd'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${T.family} ${rec.sku}`)}">${STYLE}<rect width="${W}" height="${H}" fill="#fff"/>${b}</svg>`;
  return { svg, model: m };
}

// Clean catalog image: side view only, same frame and margins for every product, no dimensions.
export function catalogImage(rec, size = 800, overrides = {}) {
  const m = model(rec, overrides);
  if (!m.ok) return { svg: '', model: m };
  const pad = size * 0.1;
  const sv = sideView(m, { x: pad, y: pad, w: size - 2 * pad, h: size - 2 * pad }, Math.max(1.6, size / 400), true, 'cat');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(rec.sku)}"><rect width="${size}" height="${size}" fill="#fff"/>${sv.svg}</svg>`;
  return { svg, model: m };
}

// Specification drawing in the manner of a catalog 2-D sheet: end view, side view, notes, title block.
export function drawSheet(rec, lang = 'fr', overrides = {}) {
  const m = model(rec, overrides);
  const W = 1000, H = 620;
  const S = { thin: 1, arrow: 8, font: 17, gap: 8 };
  const T = txt(lang);
  if (!m.ok) return { svg: '', model: m };
  let b = `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  // end view
  // one scale for both views
  const sc = Math.min(440 / m.v.freeLength, 230 / m.v.od);
  const ecx = 215, ecy = 265, er = (m.v.od / 2) * sc;
  const ev = endView(m, ecx, ecy, er, 1.6);
  b += ev.svg;
  const idCol = m.idCalc ? (m.variant ? EDITED : '#5b636b') : READ;
  const idLabel = `${T.id} ${fmt(m.idValue, lang)} mm${m.idCalc ? ` (${T.calc})` : ''}`;
  b += hDim(ecx - ev.ri, ecx + ev.ri, ecy - ev.ri * 0.2, ecy - er - 26, idLabel, S, idCol);
  const yOd = ecy + er + 36;
  b += `<path d="M${f2(ecx - ev.ro)} ${f2(ecy + 4)}V${f2(yOd + 5)}M${f2(ecx + ev.ro)} ${f2(ecy + 4)}V${f2(yOd + 5)}M${f2(ecx - ev.ro)} ${f2(yOd)}H${f2(ecx + ev.ro)}" stroke="${col(m, 'od')}" stroke-width="${S.thin}" fill="none"/>`;
  b += arrow(ecx - ev.ro, yOd, Math.PI, S.arrow, col(m, 'od')) + arrow(ecx + ev.ro, yOd, 0, S.arrow, col(m, 'od'));
  b += text(ecx, yOd + S.font + 8, `${T.od} ${mm(m, 'od', lang)}`, S.font, col(m, 'od'));
  // side view
  const sv = sideView(m, { x: 470, y: 150, w: 440, h: 230 }, 1.6, true, 'sheet', sc);
  b += sv.svg;
  b += hDim(sv.x0, sv.x1, sv.top, Math.min(sv.top - 28, 120), mm(m, 'freeLength', lang), S, col(m, 'freeLength'));
  const wl = wireLeader(m, sv, S, 450);
  b += leader(wl.x, wl.y, wl.x + 30, wl.ty, `${T.wire} ${mm(m, 'd', lang)}`, S, col(m, 'd'));
  // notes: other states and properties, never drawn on the free silhouette
  const notes = [];
  if (m.raw.lengthAtMaxLoad && !m.variant) notes.push([`${T.lmax} : ${fmtNum(num(m.raw.lengthAtMaxLoad), lang)} mm`, READ]);
  notes.push([`${fmt(m.raw.coils, lang)} ${T.coilsTotal}`, col(m, 'coils')]);
  if (m.groundFrom !== 'unknown') notes.push([m.ground ? T.ground : T.closed, '#3f464d']);
  if (m.variant) notes.push([T.variant, EDITED]);
  b += notes.map(([n, c], i) => text(34, 500 + i * 23, n, 16, c, 'start', 'note')).join('');
  // title block
  const tx = 610, ty = 480;
  b += `<path d="M${tx} ${ty}H${W - 10}M${tx} ${ty}V${H - 10}M${tx} ${ty + 58}H${W - 10}" stroke="${INK}" stroke-width="1"/>`;
  b += text(tx + 18, ty + 39, rec.sku, 27, INK, 'start', 'sku');
  const mat = T.material[m.raw.material] || m.raw.material || '';
  b += text(tx + 18, ty + 86, `${T.family}${mat ? `, ${mat}` : ''}`, 16, INK, 'start', 'note');
  b += text(tx + 18, ty + 110, `${T.source} ${rec.readAt}`, 13.5, '#5b636b', 'start', 'note');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${T.family} ${rec.sku}`)}">${STYLE}<rect width="${W}" height="${H}" fill="#fff"/>${b}</svg>`;
  return { svg, model: m };
}

// Find a reference inside whatever the visitor pasted: a SKU, or a product URL.
export function findRecord(records, input) {
  if (!input) return null;
  const s = String(input).trim().toUpperCase();
  const bySku = new Map(records.map((r) => [r.sku.toUpperCase(), r]));
  if (bySku.has(s)) return bySku.get(s);
  const hit = s.match(/[A-Z]{1,2}[.-]\d{3}[.-]\d{3}[.-]\d{4}(?:[.-][A-Z]{1,3})?/);
  if (hit) {
    const k = hit[0].replace(/-/g, '.');
    if (bySku.has(k)) return bySku.get(k);
  }
  return null;
}
