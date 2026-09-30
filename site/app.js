import { drawPlate, drawPlateWide, drawSheet, catalogImage, model, route, findRecord, fmt, num } from './spring.js';

const PLATE = ['C.692.560.0500.I', 'C.248.320.0224.A', 'C.980.550.1000.I', 'C.700.600.1200.I', 'C.371.320.1020.AP', 'C.700.600.2000.I', 'C.180.300.0780.A', 'C.600.600.3600.I'];
const DEFAULT_REF = 'C.700.600.2000.I';

const I18N = {
  fr: {
    title: 'Ressorts dessinés à leurs cotes',
    where: "Planche d'essai pour vanel.tech",
    h1: 'Huit de vos ressorts, dessinés à leurs propres cotes.',
    lede: "Chaque dessin vient des attributs de la fiche produit, lus sur vanel.tech le 30 septembre 2026. À gauche de chaque dessin, l'image que la fiche affichait ce jour-là.",
    plateTitle: 'Planche',
    now: 'image de la fiche, 30/09/2026',
    tbTitle: 'Ressorts de compression, planche 1',
    tbSource: 'Source', tbSourceV: 'attributs des fiches vanel.tech, lus le 30/09/2026',
    tbMethod: 'Méthode', tbMethodV: 'gabarit paramétrique, aucune retouche',
    tbKey: 'Couleur', tbRead: 'cote lue dans la fiche',
    tbLeft: 'À gauche', tbLeftV: 'image affichée par la fiche le 30/09/2026',
    held: (sku, f) => `<b>${sku}</b> n'est pas dessinée : ${f} ${f.includes(' et ') ? 'sont vides' : 'est vide'} dans sa fiche. Une fiche incomplète est retenue, jamais complétée au jugé.`,
    tryTitle: 'Essayez une autre référence',
    tryLede: "Collez une référence ou l'adresse de sa fiche : le ressort se dessine. Corrigez une cote, le dessin suit.",
    refLabel: 'Référence', dimsLegend: 'Cotes', fD: 'Diamètre du fil', fOd: 'Diamètre extérieur', fL: 'Longueur libre', fN: 'Spires totales',
    reset: 'Revenir aux valeurs de la fiche',
    capSheet: 'Dessin de spécification', dlSvg: 'Télécharger le SVG',
    capCatalog: 'Image catalogue, même cadrage pour toutes les références', dlPng: 'Télécharger le PNG',
    sourcesTitle: "D'où vient chaque trait",
    readOn: 'Fiche lue le', open: 'ouvrir la fiche',
    notFound: (n) => `Cette référence n'est pas parmi les ${n} fiches de ressorts de compression lues. Essayez C.180.300.0780.A ou C.700.500.3600.I.`,
    heldRef: (f) => `Fiche retenue : ${f} ${f.includes(' et ') ? 'sont vides' : 'est vide'} dans la fiche, rien n'est dessiné.`,
    found: (n) => `Une des ${n} fiches de ressorts de compression lues le 30/09/2026.`,
    variant: 'Variante hypothétique : les cotes modifiées sont en ocre, le Ø int. est recalculé, la longueur à charge max. de la fiche ne s\'applique plus.',
    invalid: "Ces valeurs ne décrivent pas un ressort dessinable : il faut un Ø ext. supérieur à deux fois le fil, plus de deux spires et un pas plus grand que le fil.",
    items: { d: 'Diamètre du fil', od: 'Diamètre extérieur', freeLength: 'Longueur libre', coils: 'Spires totales', id: 'Diamètre intérieur', lengthAtMaxLoad: 'Longueur à charge max. (note)', meanDiameter: "Diamètre moyen de l'hélice", pitch: 'Pas des spires actives', ends: 'Extrémités', winding: "Sens d'enroulement" },
    from: { sheet: 'lu dans la fiche', edited: 'modifié ici', derived: 'calculé', assumed: 'par convention, absent de la fiche' },
    values: { 'closed, ground': 'rapprochées, meulées', closed: 'rapprochées, non meulées', 'right-hand': 'à droite' },
    howTitle: 'Ce que la chaîne fait déjà, et ce qui reste à brancher',
    how: [
      ['Ce qu\'elle lit.', 'Les attributs déjà publiés sur vos fiches : fil, diamètres, longueur libre, nombre de spires, pas, longueur à bloc. Rien d\'autre, et aucune IA dans le dessin.'],
      ['Ce qu\'elle produit.', 'Pour chaque référence, deux fichiers tirés des mêmes données : le dessin coté en SVG et une image catalogue en PNG, au même cadrage pour toute la famille. Une valeur corrigée dans la fiche, et les deux se redessinent.'],
      ['Sur quoi repose la géométrie.', 'Sur les {n} fiches complètes lues, la longueur libre vaut toujours (spires − 2) × pas + 2 × fil : les spires sont comptées totales, une spire rapprochée à chaque bout. Le meulage se lit dans la longueur à bloc, (spires + 0,5) × fil quand le ressort est meulé. Le sens d\'enroulement ne figure pas dans la fiche : il est dessiné à droite, et c\'est écrit.'],
      ['L\'aiguillage.', 'Une fiche complète est dessinée. Une fiche à qui manque une valeur essentielle est retenue et signalée. Une famille sans gabarit, aujourd\'hui la traction et la torsion, part en « à revoir » : aucune image n\'est inventée pour elle.'],
      ['Magento.', '{magento}'],
      ['Et la CAO ?', 'Pour les familles prises en charge, un gabarit piloté par les attributs évite d\'ouvrir un modèle CAO à chaque mise à jour. La CAO reste utile là où elle donne une meilleure géométrie.'],
      ['Ce que cette planche ne prouve pas.', 'Les ressorts de traction et de torsion, la conversion de fichiers CAO ou STEP, la mise en service sur votre boutique, et le décodage des valeurs d\'options Magento : ici, la catégorie tient lieu de source.'],
    ],
    proofCap: "Page produit de la boutique de test, avec l'image générée rattachée au SKU.",
    madeBy: 'Réalisé par', repo: 'Code et tests',
    material: { 'Stainless Steel': 'inox', 'Music Wire': 'corde à piano' },
  },
  en: {
    title: 'Springs drawn to their dimensions',
    where: 'Test plate for vanel.tech',
    h1: 'Eight of your springs, drawn to their own dimensions.',
    lede: 'Each drawing comes from the product sheet attributes, read on vanel.tech on September 30, 2026. Left of each drawing, the image the sheet showed that day.',
    plateTitle: 'Plate',
    now: 'image on the sheet, 2026-09-30',
    tbTitle: 'Compression springs, plate 1',
    tbSource: 'Source', tbSourceV: 'vanel.tech product sheet attributes, read 2026-09-30',
    tbMethod: 'Method', tbMethodV: 'parametric template, no retouching',
    tbKey: 'Color', tbRead: 'dimension read on the sheet',
    tbLeft: 'Left', tbLeftV: 'image shown on the sheet on 2026-09-30',
    held: (sku, f) => `<b>${sku}</b> is not drawn: ${f} ${f.includes(' and ') ? 'are' : 'is'} empty on its sheet. An incomplete sheet is held back, never filled in by guesswork.`,
    tryTitle: 'Try another reference',
    tryLede: 'Paste a reference or its product page address: the spring is drawn. Change a dimension, the drawing follows.',
    refLabel: 'Reference', dimsLegend: 'Dimensions', fD: 'Wire diameter', fOd: 'Outside diameter', fL: 'Free length', fN: 'Total coils',
    reset: 'Back to the sheet values',
    capSheet: 'Specification drawing', dlSvg: 'Download SVG',
    capCatalog: 'Catalog image, same framing for every reference', dlPng: 'Download PNG',
    sourcesTitle: 'Where every line comes from',
    readOn: 'Sheet read on', open: 'open the sheet',
    notFound: (n) => `This reference is not among the ${n} compression spring sheets read. Try C.180.300.0780.A or C.700.500.3600.I.`,
    heldRef: (f) => `Held back: ${f} ${f.includes(' and ') ? 'are' : 'is'} empty on the sheet, nothing is drawn.`,
    found: (n) => `One of the ${n} compression spring sheets read on 2026-09-30.`,
    variant: 'Hypothetical variant: changed dimensions are in ochre, the ID is recalculated, the max-load length of the sheet no longer applies.',
    invalid: 'These values do not make a drawable spring: the OD must exceed twice the wire, with more than two coils and a pitch larger than the wire.',
    items: { d: 'Wire diameter', od: 'Outside diameter', freeLength: 'Free length', coils: 'Total coils', id: 'Inside diameter', lengthAtMaxLoad: 'Length at max. load (note)', meanDiameter: 'Mean helix diameter', pitch: 'Pitch of the active coils', ends: 'Ends', winding: 'Winding sense' },
    from: { sheet: 'read on the sheet', edited: 'changed here', derived: 'calculated', assumed: 'by convention, not on the sheet' },
    values: { 'closed, ground': 'closed, ground', closed: 'closed, not ground', 'right-hand': 'right-hand' },
    howTitle: 'What the pipeline already does, and what is left to connect',
    how: [
      ['What it reads.', 'The attributes already published on your product sheets: wire, diameters, free length, coil count, pitch, block length. Nothing else, and no AI in the drawing.'],
      ['What it produces.', 'For each reference, two files from the same data: the dimensioned drawing as SVG and a catalog image as PNG, framed the same way across the family. Correct a value on the sheet and both are redrawn.'],
      ['What the geometry rests on.', 'On the {n} complete sheets read, free length always equals (coils − 2) × pitch + 2 × wire: coils are counted as total, one closed coil at each end. Grinding is read from the block length, (coils + 0.5) × wire when ground. Winding sense is not on the sheet: it is drawn right-hand, and the drawing says so.'],
      ['Routing.', 'A complete sheet is drawn. A sheet missing an essential value is held back and flagged. A family without a template, today extension and torsion springs, goes to "review": no image is invented for it.'],
      ['Magento.', '{magento}'],
      ['What about CAD?', 'For the supported families, an attribute-driven template avoids opening a CAD model at every update. CAD stays useful where it gives better geometry.'],
      ['What this plate does not prove.', 'Extension and torsion springs, converting CAD or STEP files, going live on your store, and decoding Magento option values: here the category stands in as the source.'],
    ],
    proofCap: 'Product page of the test store, with the generated image attached to the SKU.',
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
    if (typeof v === 'string') el.textContent = v;
  }
  try { localStorage.setItem('lang', lang); } catch (e) { /* storage unavailable */ }
  renderPlate();
  renderHow();
  renderTry();
}

function renderPlate() {
  const cells = $('#cells');
  cells.innerHTML = '';
  for (const sku of PLATE) {
    const r = records.find((x) => x.sku === sku);
    if (!r) continue;
    const li = document.createElement('li');
    li.className = 'cell';
    const mat = L().material[r.attrs.material] || r.attrs.material || '';
    const img = r.currentImage ? `<figure class="now"><img src="current/${r.currentImage.file}" alt="${lang === 'fr' ? 'Image affichée par la fiche' : 'Image shown on the sheet'} ${sku}" loading="lazy"></figure>` : '<div></div>';
    li.innerHTML = `<div class="cell-head"><span class="sku">${sku}</span><span class="mat">${mat}</span></div>${img}<div class="drawn wide">${drawPlateWide(r, lang).svg}</div><div class="drawn compact">${drawPlate(r, lang).svg}</div>`;
    cells.appendChild(li);
  }
  animatePlate();
  const held = records.filter((r) => route(r).route === 'held');
  const names = (f) => f.map(fieldName).join(lang === 'fr' ? ' et ' : ' and ');
  $('#held').innerHTML = held.length ? L().held(held[0].sku, names(route(held[0]).fields)) : '';
}

let animated = false;
function animatePlate() {
  // one moment on first load: every coil is traced, cell after cell; the dimensions follow
  if (animated) return;
  animated = true;
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  if (reduce || !('animate' in Element.prototype)) return;
  document.querySelectorAll('#cells .drawn svg').forEach((svg, i) => {
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

function fieldName(k) {
  const fr = { coils: 'le nombre de spires', pitch: 'le pas', d: 'le diamètre du fil', od: 'le diamètre extérieur', freeLength: 'la longueur libre' };
  const en = { coils: 'the coil count', pitch: 'the pitch', d: 'the wire diameter', od: 'the outside diameter', freeLength: 'the free length' };
  return (lang === 'fr' ? fr : en)[k] || k;
}

function renderHow() {
  const n = records.filter((r) => route(r).route === 'svg').length;
  $('#howBody').innerHTML = L().how.map(([h, p]) => `<p><b>${h}</b> ${p.replace('{n}', n).replace('{magento}', MAGENTO[lang])}</p>`).join('');
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

function renderTry() {
  if (!current) return;
  const o = overrides();
  const m = model(current, o);
  for (const inp of document.querySelectorAll('#dims input')) {
    const changed = inp.value.trim() !== '' && num(inp.value) !== num(current.attrs[inp.name]);
    inp.classList.toggle('changed', changed);
  }
  $('#reset').hidden = !m.variant;
  if (!m.ok) {
    $('#variantMsg').textContent = m.reason === 'missing' ? '' : L().invalid;
    $('#sheet').style.opacity = '0.35';
    $('#catalog').style.opacity = '0.35';
    return;
  }
  $('#sheet').style.opacity = '';
  $('#catalog').style.opacity = '';
  $('#variantMsg').textContent = m.variant ? L().variant : '';
  $('#reset').hidden = !m.variant;
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
  $('#sourceLink').innerHTML = `${L().readOn} ${current.readAt} : <a href="${url}" rel="noopener" target="_blank">${L().open}</a>`;
}

const FORMULAS = {
  'od - 2 d': { fr: 'Ø ext. − 2 × fil', en: 'OD − 2 × wire' },
  'od - d': { fr: 'Ø ext. − fil', en: 'OD − wire' },
  '(freeLength - 2 d) / (coils - 2)': { fr: '(longueur libre − 2 × fil) / (spires − 2)', en: '(free length − 2 × wire) / (coils − 2)' },
  '(freeLength - 3 d) / (coils - 2)': { fr: '(longueur libre − 3 × fil) / (spires − 2)', en: '(free length − 3 × wire) / (coils − 2)' },
  'blockLength = (coils + 0.5) d if ground, (coils + 1.5) d if not': { fr: 'longueur à bloc = (spires + 0,5) × fil si meulé, (spires + 1,5) × fil sinon', en: 'block length = (coils + 0.5) × wire if ground, (coils + 1.5) × wire if not' },
};
function pretty(f) { return FORMULAS[f]?.[lang] || f; }

function selectRef(input, fromUser) {
  const comp = records.filter((r) => r.family === 'compression');
  const r = findRecord(comp, input);
  if (!r) {
    if (fromUser && String(input).trim()) { $('#refMsg').textContent = L().notFound(comp.length); $('#refMsg').classList.add('bad'); }
    return;
  }
  $('#refMsg').classList.remove('bad');
  const rt = route(r);
  if (rt.route === 'held') {
    $('#refMsg').textContent = L().heldRef(rt.fields.map(fieldName).join(lang === 'fr' ? ' et ' : ' and '));
    $('#refMsg').classList.add('bad');
    return;
  }
  current = r;
  $('#ref').value = r.sku;
  $('#refMsg').textContent = L().found(comp.length);
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
  for (const r of records.filter((x) => x.family === 'compression' && route(x).route === 'svg')) {
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

  for (const b of document.querySelectorAll('.lang button')) b.addEventListener('click', () => { const o = overrides(); setLang(b.dataset.lang); for (const inp of document.querySelectorAll('#dims input')) if (o[inp.name]) inp.value = fmt(o[inp.name], lang); renderTry(); });
  $('#ref').addEventListener('change', (e) => selectRef(e.target.value, true));
  $('#ref').addEventListener('input', (e) => { const r = findRecord(records, e.target.value); if (r && r.sku !== current?.sku) selectRef(e.target.value, true); });
  $('#controls').addEventListener('submit', (e) => { e.preventDefault(); selectRef($('#ref').value, true); });
  $('#dims').addEventListener('input', renderTry);
  window.matchMedia('(max-width: 600px)').addEventListener('change', renderTry);
  $('#reset').addEventListener('click', () => { fillDims(current); renderTry(); });
  $('#dlSvg').addEventListener('click', () => download(`${current.sku}.svg`, new Blob([drawSheet(current, lang, overrides()).svg], { type: 'image/svg+xml' })));
  $('#dlPng').addEventListener('click', () => {
    const svg = catalogImage(current, 800, overrides()).svg;
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
