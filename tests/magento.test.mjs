// The image step against an in-memory stand-in for the Magento media endpoints.
// The same scenario runs against a real test store with `npm run magento:live` (see magento/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Magento, isManaged } from '../magento/client.mjs';

function fakeStore(initial, { failPost = false, dropRolesOnPost = false } = {}) {
  const media = structuredClone(initial);
  let next = 100;
  const fetchImpl = async (url, opt) => {
    const m = url.match(/\/rest\/V1\/products\/([^/]+)\/media(?:\/(\d+))?$/);
    const sku = decodeURIComponent(m[1]);
    const list = (media[sku] ||= []);
    const ok = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
    if (opt.method === 'GET') return ok(list);
    if (opt.method === 'DELETE') { media[sku] = list.filter((e) => e.id !== Number(m[2])); return ok(true); }
    const body = JSON.parse(opt.body).entry;
    if (opt.method === 'POST') {
      if (failPost) return { ok: false, status: 500, text: async () => JSON.stringify({ message: 'upload failed' }) };
      if (body.content.type !== 'image/png') return { ok: false, status: 400, text: async () => JSON.stringify({ message: 'The image content must be valid base64 encoded data.' }) };
      for (const e of list) e.types = e.types.filter((t) => !body.types.includes(t)); // a role belongs to one image
      const id = next++;
      list.push({ id, file: `/x/${body.content.name}`, types: dropRolesOnPost ? [] : body.types, label: body.label, media_type: 'image', position: 0, disabled: false });
      if (dropRolesOnPost) for (const e of list) if (e.id !== id) e.types = [...ROLES];
      return ok(String(id));
    }
    if (opt.method === 'PUT') {
      for (const e of list) if (e.id !== body.id) e.types = e.types.filter((t) => !body.types.includes(t));
      Object.assign(list.find((e) => e.id === body.id), { types: body.types, disabled: body.disabled });
      return ok(true);
    }
  };
  return { media, fetchImpl };
}

const ROLES = ['image', 'small_image', 'thumbnail'];

test('classify, attach, rerun, replace, roll back', async () => {
  const store = fakeStore({
    A: [{ id: 1, file: '/c/o/compression_product.jpg', types: [...ROLES] }],
    B: [{ id: 2, file: '/c/o/compression_product_1.jpg', types: [...ROLES] }],
    C: [],
    D: [{ id: 3, file: '/o/w/own.jpg', types: [...ROLES] }],
  });
  const mg = new Magento({ baseUrl: 'http://test', token: 't', fetchImpl: store.fetchImpl });
  const shared = new Set(['compression_product.jpg']);
  const needs = await Promise.all(['A', 'B', 'C', 'D'].map((s) => mg.classify(s, shared)));
  assert.deepEqual(needs.map((n) => n.need), ['shared-image', 'shared-image', 'no-image', 'own-image']);

  const png1 = Buffer.from('png-one');
  const j1 = await mg.upsertManagedImage('A', png1);
  assert.equal(j1.action, 'added');
  assert.deepEqual(store.media.A.find(isManaged).types, ROLES);
  assert.deepEqual(store.media.A.find((e) => e.id === 1).types, []);

  assert.equal((await mg.upsertManagedImage('A', png1)).action, 'unchanged');
  assert.equal(store.media.A.length, 2);

  const j3 = await mg.upsertManagedImage('A', Buffer.from('png-two'), { previous: j1 });
  assert.equal(j3.action, 'replaced');
  assert.equal(store.media.A.length, 2);
  assert.ok(store.media.A.some((e) => e.id === 1), 'the image the pipeline does not manage stays');

  await mg.rollback(j3);
  assert.equal(store.media.A.filter(isManaged).length, 0);
  assert.deepEqual(store.media.A.find((e) => e.id === 1).types, ROLES);
});

test('dry run touches nothing', async () => {
  const store = fakeStore({ A: [] });
  const mg = new Magento({ baseUrl: 'http://test', token: 't', fetchImpl: store.fetchImpl });
  assert.equal((await mg.upsertManagedImage('A', Buffer.from('x'), { dryRun: true })).action, 'would-upload');
  assert.equal(store.media.A.length, 0);
});

test('a failed upload leaves the previous managed image in place', async () => {
  const start = { A: [{ id: 1, file: '/a/a-sd-aaaaaaaaaa.png', types: [...ROLES], disabled: false }] };
  const store = fakeStore(start, { failPost: true });
  const mg = new Magento({ baseUrl: 'http://test', token: 't', fetchImpl: store.fetchImpl });
  await assert.rejects(() => mg.upsertManagedImage('A', Buffer.from('new')));
  assert.deepEqual(store.media.A.map((e) => e.id), [1]);
});

test('an upload that lands without its roles does not remove the previous image', async () => {
  const start = { A: [{ id: 1, file: '/a/a-sd-aaaaaaaaaa.png', types: [...ROLES], disabled: false }] };
  const store = fakeStore(start, { dropRolesOnPost: true });
  const mg = new Magento({ baseUrl: 'http://test', token: 't', fetchImpl: store.fetchImpl });
  await assert.rejects(() => mg.upsertManagedImage('A', Buffer.from('new')), /previous image kept/);
  assert.ok(store.media.A.some((e) => e.id === 1));
});

test('same file but disabled or without roles is repaired, not skipped', async () => {
  const png = Buffer.from('png-one');
  const store = fakeStore({ A: [] });
  const mg = new Magento({ baseUrl: 'http://test', token: 't', fetchImpl: store.fetchImpl });
  await mg.upsertManagedImage('A', png);
  store.media.A[0].types = [];
  store.media.A[0].disabled = true;
  assert.equal((await mg.upsertManagedImage('A', png)).action, 'repaired');
  assert.deepEqual(store.media.A[0].types, ROLES);
  assert.equal(store.media.A[0].disabled, false);
});
