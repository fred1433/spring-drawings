import { drawPlate, drawPlateWide, drawSheet, catalogImage, model, route, findRecord, fmt, num, parseInput, BOUNDS } from './spring.js';

const PLATE_A = ['C.692.560.0500.I', 'C.700.400.3400.A'];
const PLATE_B = ['C.248.320.0224.A', 'C.980.550.1000.I', 'C.700.600.1200.I', 'C.371.320.1020.AP', 'C.700.600.2000.I', 'C.180.300.0780.A'];
const DEFAULT_REF = 'C.700.600.2000.I';

const I18N = {
  fr: {
    title: 'Ressorts dessinés à leurs cotes',
    where: "Planche d'essai pour vanel.tech",
    h1: 'Huit de vos ressorts, dessinés à leurs propres cotes.',
    lede: "Chaque dessin vient des attributs de la fiche produit, lus sur vanel.tech le 30 septembre 2026. En regard, l'image que la fiche affichait ce jour-là et l'image générée, à la même taille.",
    h1Short: 'Vos ressorts, dessinés à leurs cotes.',
    synth: 'Ressorts de compression : SVG coté + PNG catalogue. Rattachement testé sur une boutique Magento locale.',
    editLink: 'Modifier une cote',
    colNow: 'Image actuelle de la fiche', colGen: 'Image générée', colDraw: 'Dessin coté, extrémités schématiques',
    heldUnground: (n) => `${n} ressorts non meulés sont retenus : pour eux, la convention de longueur libre de vos fiches reste à valider ensemble avant de dessiner.`,
    heldEndsRef: () => "Pas de dessin : extrémités non meulées, la convention de vos fiches pour ce cas reste à valider.",
    variantPng: "L'image catalogue ne se télécharge que pour les valeurs de la fiche.",
    validate: 'À valider ensemble : le rendu de référence, les attributs Magento et le premier lot.',
    plateTitle: 'Planche',
    now: 'image de la fiche, 30/09/2026',
    tbTitle: 'Ressorts de compression, planche 1',
    tbSource: 'Source', tbSourceV: 'attributs des fiches vanel.tech, lus le 30/09/2026',
    tbMethod: 'Méthode', tbMethodV: 'gabarit paramétrique, aucune retouche',
    tbKey: 'Couleur', tbRead: 'cote lue dans la fiche',
    tbLeft: 'À gauche', tbLeftV: 'image affichée par la fiche le 30/09/2026',
    held: (sku, f, n) => `<b>${sku}</b> n'est pas dessinée : ${f} ${n > 1 ? 'manquent' : 'manque'} dans la liste de sa catégorie, seule source lue pour elle (sa page produit n'est pas liée depuis la liste et la recherche du site ne la renvoie pas).`,
    heldEnd: 'Une fiche incomplète est retenue, jamais complétée au jugé.',
    tryTitle: 'Essayez une de ces références',
    tryLede: "Choisissez une des {n} références lues le 30/09/2026, ou collez l'adresse de sa fiche : le ressort se dessine. Corrigez une cote, le dessin suit.",
    refLabel: 'Référence', dimsLegend: 'Cotes', fD: 'Diamètre du fil', fOd: 'Diamètre extérieur', fL: 'Longueur libre', fN: 'Spires totales',
    reset: 'Revenir aux valeurs de la fiche',
    capSheet: 'Dessin de spécification', dlSvg: 'Télécharger le SVG',
    capCatalog: 'Image catalogue, même cadrage pour toutes les références', dlPng: 'Télécharger le PNG',
    sourcesTitle: "D'où vient chaque trait",
    readOn: 'Fiche lue le', open: 'ouvrir la fiche',
    notFound: (n) => `Pas de dessin : cette référence n'est pas parmi les ${n} ressorts de compression lus le 30/09/2026. Essayez C.180.300.0780.A ou C.700.500.3600.I.`,
    heldRef: (f, n) => `Pas de dessin : fiche retenue, ${f} ${n > 1 ? 'manquent' : 'manque'} dans ce qui a été lu.`,
    found: (n) => `Une des ${n} références de ressorts de compression lues le 30/09/2026.`,
    bad: (f, lo, hi) => `${f} : un nombre décimal entre ${lo} et ${hi}, avec une virgule ou un point.`,
    variant: 'Variante hypothétique : les cotes modifiées sont en ocre, le Ø int. est recalculé, la longueur à charge max. de la fiche ne s\'applique plus.',
    invalid: "Ces valeurs ne décrivent pas un ressort dessinable : il faut un Ø ext. supérieur à deux fois le fil, plus de deux spires, un pas plus grand que le fil et une longueur libre supérieure à la longueur à bloc.",
    items: { d: 'Diamètre du fil', od: 'Diamètre extérieur', freeLength: 'Longueur libre', coils: 'Spires totales', id: 'Diamètre intérieur', lengthAtMaxLoad: 'Longueur à charge max. (note)', meanDiameter: "Diamètre moyen de l'hélice", pitch: 'Pas des spires actives', ends: 'Extrémités', winding: "Sens d'enroulement" },
    from: { sheet: 'lu dans la fiche', edited: 'modifié ici', derived: 'calculé', assumed: "par convention : la famille n'a pas d'attribut de sens" },
    values: { 'closed, ground': 'rapprochées, meulées', closed: 'rapprochées, non meulées', 'right-hand': 'à droite' },
    howTitle: 'Ce que la chaîne fait déjà, et ce qui reste à brancher',
    how: [
      ['Ce qu\'elle lit.', 'Les attributs déjà publiés sur vos fiches : fil, diamètres, longueur libre, nombre de spires, pas, longueur à bloc. Rien d\'autre, et aucune IA dans le dessin.'],
      ['Ce qu\'elle produit.', 'Pour chaque référence, deux fichiers tirés des mêmes données : le dessin coté en SVG et une image catalogue en PNG, au même cadrage pour toute la famille. Dans cette démo, modifiez une cote : le SVG et le PNG se redessinent. La lecture automatique de vos attributs Magento reste à brancher.'],
      ['Sur quoi repose la géométrie.', 'Sur les {n} fiches complètes lues, la longueur libre vaut toujours (spires − 2) × pas + 2 × fil : les spires sont comptées totales, une spire rapprochée à chaque bout. Le meulage se lit dans la longueur à bloc, (spires + 0,5) × fil quand le ressort est meulé. Le sens d\'enroulement ne figure pas parmi les attributs : il est dessiné à droite, et le tableau des sources le dit.'],
      ['L\'aiguillage.', 'Une fiche complète et cohérente (pas, longueur à bloc, Ø int. contrôlés) est dessinée : dessinable avec ce gabarit, ce qui ne vaut pas validation mécanique. Une fiche à qui manque une valeur essentielle, ou qui échoue à un contrôle, est retenue et signalée. Une famille sans gabarit, aujourd\'hui la traction et la torsion, reste hors gabarit : aucune image n\'est inventée pour elle.'],
      ['Magento.', '{magento}'],
      ['Et la CAO ?', 'Pour les familles prises en charge, un gabarit piloté par les attributs évite d\'ouvrir un modèle CAO à chaque mise à jour. La CAO reste utile là où elle donne une meilleure géométrie.'],
      ['Ce que cette planche ne prouve pas.', 'Les ressorts de traction et de torsion, la conversion de fichiers CAO ou STEP, la mise en service sur votre boutique, et le décodage des valeurs d\'options Magento : ici, la catégorie tient lieu de source.'],
    ],
    proofCap: "Boutique Magento locale de test, fin du parcours scripté : extraits de la page produit du SKU TEST-C.700.600.2000.I, image générée rattachée. Scénario local réussi, pas votre boutique.",
    madeBy: 'Réalisé par', repo: 'Code et tests',
    material: { 'Stainless Steel': 'inox', 'Music Wire': 'corde à piano' },
  },
  en: {
    title: 'Springs drawn to their dimensions',
    where: 'Test plate for vanel.tech',
    h1: 'Eight of your springs, drawn to their own dimensions.',
    lede: 'Each drawing comes from the product sheet attributes, read on vanel.tech on September 30, 2026. Beside it, the image the sheet showed that day and the generated image, at the same size.',
    h1Short: 'Your springs, drawn to their dimensions.',
    synth: 'Compression springs: dimensioned SVG + catalog PNG. Attachment tested on a local Magento store.',
    editLink: 'Change a dimension',
    colNow: 'Current image on the sheet', colGen: 'Generated image', colDraw: 'Dimensioned drawing, ends schematic',
    heldUnground: (n) => `${n} unground springs are held back: for them, the free-length convention of your sheets is to be validated together before drawing.`,
    heldEndsRef: () => 'No drawing: unground ends, the convention of your sheets for this case is to be validated.',
    variantPng: 'The catalog image downloads only for the sheet values.',
    validate: 'To validate together: the reference rendering, the Magento attributes and the first batch.',
    plateTitle: 'Plate',
    now: 'image on the sheet, 2026-09-30',
    tbTitle: 'Compression springs, plate 1',
    tbSource: 'Source', tbSourceV: 'vanel.tech product sheet attributes, read 2026-09-30',
    tbMethod: 'Method', tbMethodV: 'parametric template, no retouching',
    tbKey: 'Color', tbRead: 'dimension read on the sheet',
    tbLeft: 'Left', tbLeftV: 'image shown on the sheet on 2026-09-30',
    held: (sku, f, n) => `<b>${sku}</b> is not drawn: ${f} ${n > 1 ? 'are' : 'is'} missing from its category list, the only source read for it (its product page is not linked from the list and the site search does not return it).`,
    heldEnd: 'An incomplete sheet is held back, never filled in by guesswork.',
    tryTitle: 'Try one of these references',
    tryLede: 'Pick one of the {n} references read on 2026-09-30, or paste its product page address: the spring is drawn. Change a dimension, the drawing follows.',
    refLabel: 'Reference', dimsLegend: 'Dimensions', fD: 'Wire diameter', fOd: 'Outside diameter', fL: 'Free length', fN: 'Total coils',
    reset: 'Back to the sheet values',
    capSheet: 'Specification drawing', dlSvg: 'Download SVG',
    capCatalog: 'Catalog image, same framing for every reference', dlPng: 'Download PNG',
    sourcesTitle: 'Where every line comes from',
    readOn: 'Sheet read on', open: 'open the sheet',
    notFound: (n) => `No drawing: this reference is not among the ${n} compression springs read on 2026-09-30. Try C.180.300.0780.A or C.700.500.3600.I.`,
    heldRef: (f, n) => `No drawing: held back, ${f} ${n > 1 ? 'are' : 'is'} missing from what was read.`,
    found: (n) => `One of the ${n} compression spring references read on 2026-09-30.`,
    bad: (f, lo, hi) => `${f}: a decimal number between ${lo} and ${hi}, with a point or a comma.`,
    variant: 'Hypothetical variant: changed dimensions are in ochre, the ID is recalculated, the max-load length of the sheet no longer applies.',
    invalid: 'These values do not make a drawable spring: the OD must exceed twice the wire, more than two coils, a pitch larger than the wire and a free length above the block length.',
    items: { d: 'Wire diameter', od: 'Outside diameter', freeLength: 'Free length', coils: 'Total coils', id: 'Inside diameter', lengthAtMaxLoad: 'Length at max. load (note)', meanDiameter: 'Mean helix diameter', pitch: 'Pitch of the active coils', ends: 'Ends', winding: 'Winding sense' },
    from: { sheet: 'read on the sheet', edited: 'changed here', derived: 'calculated', assumed: 'by convention: the family has no winding attribute' },
    values: { 'closed, ground': 'closed, ground', closed: 'closed, not ground', 'right-hand': 'right-hand' },
    howTitle: 'What the pipeline already does, and what is left to connect',
    how: [
      ['What it reads.', 'The attributes already published on your product sheets: wire, diameters, free length, coil count, pitch, block length. Nothing else, and no AI in the drawing.'],
      ['What it produces.', 'For each reference, two files from the same data: the dimensioned drawing as SVG and a catalog image as PNG, framed the same way across the family. In this demo, change a dimension: the SVG and the PNG are redrawn. Reading your Magento attributes automatically is still to be connected.'],
      ['What the geometry rests on.', 'On the {n} complete sheets read, free length always equals (coils − 2) × pitch + 2 × wire: coils are counted as total, one closed coil at each end. Grinding is read from the block length, (coils + 0.5) × wire when ground. Winding sense is not among the attributes: it is drawn right-hand, and the provenance table says so.'],
      ['Routing.', 'A complete and consistent sheet (pitch, block length, ID checked) is drawn: drawable with this template, which is not a mechanical validation. A sheet missing an essential value, or failing a check, is held back and flagged. A family without a template, today extension and torsion springs, stays outside the template: no image is invented for it.'],
      ['Magento.', '{magento}'],
      ['What about CAD?', 'For the supported families, an attribute-driven template avoids opening a CAD model at every update. CAD stays useful where it gives better geometry.'],
      ['What this plate does not prove.', 'Extension and torsion springs, converting CAD or STEP files, going live on your store, and decoding Magento option values: here the category stands in as the source.'],
    ],
    proofCap: 'Local Magento test store, end of the scripted run: excerpts of the product page of SKU TEST-C.700.600.2000.I, generated image attached. A local scenario that passed, not your store.',
    madeBy: 'Made by', repo: 'Code and tests',
    material: {},
  },
};

const MAGENTO = {
  fr: "Essayé sur une boutique Magento de test installée pour l'occasion (Mage-OS 3.5, basée sur Magento 2.4.9), pas sur la vôtre : le SVG est refusé par la galerie produit, le PNG tiré du même dessin est accepté. Il est rattaché au bon SKU avec les rôles image, petite image et vignette, visible en page produit ; une relance n'ajoute rien, une valeur corrigée remplace seulement l'image gérée par la chaîne, et un retour arrière rend son rôle à l'image d'avant.",
  en: "Tried on a Magento test store installed for the occasion (Mage-OS 3.5, based on Magento 2.4.9), not on yours: the product gallery refuses the SVG and takes the PNG made from the same drawing. It is attached to the right SKU with the base, small and thumbnail roles and shows on the product page; a rerun adds nothing, a corrected value replaces only the image the pipeline manages, and a rollback gives the previous image its role back.",
};

let lang = 'fr';
let records = [];
let current = null;

const $ = (s) => document.querySelector(s);
const L = () => I18N[lang];

function setLang(l) {
  lang = l === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
  document.title = L().title;
  for (const b of document.querySelectorAll('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const v = L()[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v.replace('{n}', String(records.length ? drawable().length : ''));
  }
  try { localStorage.setItem('lang', lang); } catch (e) { /* storage unavailable */ }
  renderPlate();
  renderHow();
  renderTry();
}

function cellHtml(r) {
  const mat = L().material[r.attrs.material] || r.attrs.material || '';
  const now = r.currentImage ? `<img src="current/${r.currentImage.file}" alt="${lang === 'fr' ? 'Image affichée par la fiche' : 'Image shown on the sheet'} ${r.sku}" loading="lazy">` : '';
  return `<div class="cell-head"><span class="sku">${r.sku}</span><span class="mat">${mat}</span></div>` +
    `<div class="pair"><figure class="now">${now}</figure><figure class="gen">${catalogImage(r, 220).svg}</figure></div>` +
    `<div class="drawn wide">${drawPlateWide(r, lang).svg}</div><div class="drawn compact">${drawPlate(r, lang).svg}</div>`;
}

function renderPlate() {
  for (const [id, list] of [['#cellsA', PLATE_A], ['#cellsB', PLATE_B]]) {
    const ol = $(id);
    ol.innerHTML = '';
    for (const sku of list) {
      const r = records.find((x) => x.sku === sku);
      if (!r || route(r).route !== 'svg') continue;
      const li = document.createElement('li');
      li.className = 'cell';
      li.innerHTML = cellHtml(r);
      ol.appendChild(li);
    }
  }
  animatePlate();
  const held = records.filter((r) => route(r).route === 'held');
  const missing = held.filter((r) => route(r).reason === 'missing');
  const unground = held.filter((r) => route(r).reason === 'ends-convention');
  $('#held').innerHTML = [
    ...missing.map((r) => { const f = route(r).fields; return L().held(r.sku, names(f), f.length); }),
    unground.length ? L().heldUnground(unground.length) : '',
    held.length ? L().heldEnd : '',
  ].join(' ');
}

let animated = false;
function animatePlate() {
  // one moment on first load: every coil is traced, cell after cell; the dimensions follow
  if (animated) return;
  animated = true;
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  if (reduce || !('animate' in Element.prototype)) return;
  document.querySelectorAll('.cells .drawn svg').forEach((svg, i) => {
    const delay = 250 + i * 140;
    svg.querySelectorAll('g[clip-path] path').forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1500, delay, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' });
    });
    [...svg.children].filter((c) => !(c.tagName === 'g' || c.tagName === 'clipPath' || c.tagName === 'style' || (c.tagName === 'rect' && c.getAttribute('fill') === '#fff'))).forEach((c) => {
      c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: delay + 1200, fill: 'backwards' });
    });
  });
}

const names = (f) => { const a = f.map(fieldName); return a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')}${lang === 'fr' ? ' et ' : ' and '}${a.at(-1)}`; };

function fieldName(k) {
  const fr = { coils: 'le nombre de spires', pitch: 'le pas', blockLength: 'la longueur à bloc', d: 'le diamètre du fil', od: 'le diamètre extérieur', freeLength: 'la longueur libre' };
  const en = { coils: 'the coil count', pitch: 'the pitch', blockLength: 'the block length', d: 'the wire diameter', od: 'the outside diameter', freeLength: 'the free length' };
  return (lang === 'fr' ? fr : en)[k] || k;
}

function renderHow() {
  const n = records.filter((r) => route(r).route === 'svg').length;
  $('#howBody').innerHTML = L().how.map(([h, p]) => `<p><b>${h}</b> ${p.replace('{n}', n).replace('{magento}', MAGENTO[lang])}</p>`).join('') + `<p class="validate"><b>${L().validate}</b></p>`;
}

function overrides() {
  const o = {};
  for (const inp of document.querySelectorAll('#dims input')) o[inp.name] = inp.value;
  return o;
}

function fillDims(r) {
  for (const inp of document.querySelectorAll('#dims input')) {
    inp.value = fmt(r ? r.attrs[inp.name] : '', lang);
    inp.classList.remove('changed');
  }
}

let msg = null; // { key, args, bad }
function showMsg() {
  const el = $('#refMsg');
  el.textContent = msg ? L()[msg.key](...msg.args()) : '';
  el.classList.toggle('bad', !!msg?.bad);
}
let shown = false; // the drawing on screen belongs to the reference in the field

function fade(on) {
  for (const id of ['#sheet', '#catalog']) $(id).style.opacity = on ? '0.18' : '';
  $('#dlSvg').disabled = on;
  $('#dlPng').disabled = on;
  if (on) $('#sources').innerHTML = '';
}

function renderTry() {
  showMsg();
  if (!current || !shown) { fade(true); return; }
  const o = overrides();
  const m = model(current, o);
  for (const inp of document.querySelectorAll('#dims input')) {
    const p = parseInput(inp.name, inp.value);
    inp.classList.toggle('changed', !p.ok || p.value !== num(current.attrs[inp.name]));
    inp.setAttribute('aria-invalid', String(!p.ok));
  }
  $('#reset').hidden = !m.variant && m.ok;
  if (!m.ok) {
    const T = { d: L().fD, od: L().fOd, freeLength: L().fL, coils: L().fN };
    $('#variantMsg').textContent = m.reason === 'input'
      ? m.badInput.map((b) => L().bad(T[b.field], fmt(String(BOUNDS[b.field][0]), lang), fmt(String(BOUNDS[b.field][1]), lang))).join(' ')
      : L().invalid;
    fade(true);
    return;
  }
  fade(false);
  $('#dlPng').disabled = m.variant;
  $('#variantMsg').textContent = m.variant ? `${L().variant} ${L().variantPng}` : '';
  const narrow = window.matchMedia('(max-width: 600px)').matches;
  $('#sheet').innerHTML = narrow ? drawPlate(current, lang, o).svg : drawSheet(current, lang, o).svg;
  $('#catalog').innerHTML = catalogImage(current, 800, o).svg;
  const rows = m.sources.map((s) => {
    const fromTxt = L().from[s.from] + (s.formula ? `${lang === 'fr' ? ' : ' : ': '}${pretty(s.formula)}` : '');
    const val = L().values[s.value] || `${fmt(s.value, lang)}${['coils', 'ends', 'winding'].includes(s.item) ? '' : ' mm'}`;
    return `<tr><td>${L().items[s.item] || s.item}</td><td class="from-${s.from}">${val}</td><td class="from-${s.from}">${fromTxt}</td></tr>`;
  });
  $('#sources').innerHTML = rows.join('');
  const url = current.productUrl || current.categoryUrl;
  $('#sourceLink').innerHTML = `${L().readOn} ${current.productReadAt || current.readAt} : <a href="${url}" rel="noopener" target="_blank">${L().open}</a>`;
}

const FORMULAS = {
  'od - 2 d': { fr: 'Ø ext. − 2 × fil', en: 'OD − 2 × wire' },
  'od - d': { fr: 'Ø ext. − fil', en: 'OD − wire' },
  '(freeLength - 2 d) / (coils - 2)': { fr: '(longueur libre − 2 × fil) / (spires − 2)', en: '(free length − 2 × wire) / (coils − 2)' },
  '(freeLength - 3 d) / (coils - 2)': { fr: '(longueur libre − 3 × fil) / (spires − 2)', en: '(free length − 3 × wire) / (coils − 2)' },
  'blockLength = (coils + 0.5) d if ground, (coils + 1.5) d if not': { fr: 'longueur à bloc = (spires + 0,5) × fil si meulé, (spires + 1,5) × fil sinon', en: 'block length = (coils + 0.5) × wire if ground, (coils + 1.5) × wire if not' },
};
function pretty(f) { return FORMULAS[f]?.[lang] || f; }

function drawable() { return records.filter((r) => r.family === 'compression' && route(r).route === 'svg'); }

function selectRef(input, fromUser) {
  const r = findRecord(records, input);
  const n = drawable().length;
  if (!r || r.family !== 'compression') {
    if (fromUser && String(input).trim()) { msg = { key: 'notFound', args: () => [n], bad: true }; shown = false; renderTry(); }
    return;
  }
  const rt = route(r);
  if (rt.route !== 'svg') {
    const f = rt.fields || [];
    msg = rt.reason === 'ends-convention' ? { key: 'heldEndsRef', args: () => [], bad: true } : { key: 'heldRef', args: () => [names(f), f.length], bad: true };
    shown = false;
    renderTry();
    return;
  }
  current = r;
  shown = true;
  $('#ref').value = r.sku;
  msg = { key: 'found', args: () => [n], bad: false };
  fillDims(r);
  renderTry();
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

async function init() {
  const res = await fetch('springs.json');
  records = await res.json();
  const dl = $('#skus');
  for (const r of drawable()) {
    const o = document.createElement('option');
    o.value = r.sku;
    dl.appendChild(o);
  }
  let start = 'fr';
  const q = new URLSearchParams(location.search);
  if (q.get('lang')) start = q.get('lang');
  else { try { start = localStorage.getItem('lang') || 'fr'; } catch (e) { /* storage unavailable */ } }
  current = records.find((r) => r.sku === DEFAULT_REF);
  fillDims(current);
  setLang(start);
  if (q.get('ref')) selectRef(q.get('ref'), true);
  else selectRef(DEFAULT_REF, false);

  for (const b of document.querySelectorAll('.lang button')) b.addEventListener('click', () => { const o = overrides(); setLang(b.dataset.lang); for (const inp of document.querySelectorAll('#dims input')) if (parseInput(inp.name, o[inp.name]).ok) inp.value = fmt(o[inp.name].replace(',', '.'), lang); renderTry(); });
  $('#ref').addEventListener('change', (e) => selectRef(e.target.value, true));
  $('#ref').addEventListener('input', (e) => { const r = findRecord(records, e.target.value); if (r && r.sku !== current?.sku) selectRef(e.target.value, true); else if (!r && shown && e.target.value.trim() !== current?.sku) { shown = false; msg = null; renderTry(); } });
  $('#controls').addEventListener('submit', (e) => { e.preventDefault(); selectRef($('#ref').value, true); });
  $('#dims').addEventListener('input', renderTry);
  window.matchMedia('(max-width: 600px)').addEventListener('change', renderTry);
  $('#reset').addEventListener('click', () => { fillDims(current); renderTry(); });
  $('#dlSvg').addEventListener('click', () => { const svg = drawSheet(current, lang, overrides()).svg; if (!shown || !svg) return; download(`${current.sku}${model(current, overrides()).variant ? (lang === 'fr' ? '-variante' : '-variant') : ''}.svg`, new Blob([svg], { type: 'image/svg+xml' })); });
  $('#dlPng').addEventListener('click', () => {
    const svg = catalogImage(current, 800, overrides()).svg;
    if (!shown || !svg || model(current, overrides()).variant) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 800; c.height = 800;
      c.getContext('2d').drawImage(img, 0, 0, 800, 800);
      c.toBlob((b) => download(`${current.sku}.png`, b), 'image/png');
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

init();
