// Minimal Magento 2 REST client for the image step: find what needs an image, attach the managed image
// to the right SKU without duplicates, replace only the file this pipeline manages, roll back.
// Endpoints used (checked against a running Mage-OS 3.5.0 / Magento 2.4.9 test store, see magento/README.md):
//   GET    /rest/V1/products/{sku}
//   GET    /rest/V1/products/{sku}/media
//   POST   /rest/V1/products/{sku}/media
//   PUT    /rest/V1/products/{sku}/media/{entryId}
//   DELETE /rest/V1/products/{sku}/media/{entryId}
import { createHash } from 'node:crypto';

export const MARK = '-sd-'; // files this pipeline manages carry "-sd-<content hash>" in their name
const ROLES = ['image', 'small_image', 'thumbnail'];

export function contentHash(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 10);
}

export function managedName(sku, buf) {
  return `${sku.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${MARK}${contentHash(buf)}.png`;
}

export const isManaged = (entry) => typeof entry.file === 'string' && entry.file.includes(MARK);
export const hashOf = (entry) => (isManaged(entry) ? entry.file.split(MARK)[1].slice(0, 10) : null);

export class Magento {
  constructor({ baseUrl, token, fetchImpl = fetch }) {
    this.base = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.fetch = fetchImpl;
  }

  async call(method, path, body) {
    const res = await this.fetch(`${this.base}/rest/V1${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const err = new Error(`${method} ${path}: HTTP ${res.status} ${typeof data === 'object' && data?.message ? data.message : text.slice(0, 200)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  media(sku) { return this.call('GET', `/products/${encodeURIComponent(sku)}/media`); }

  // What a SKU needs: nothing to do, no image at all, or only an image shared with other SKUs.
  // `sharedFiles` is the set of image base names seen on many SKUs of a family (a family placeholder).
  async classify(sku, sharedFiles = new Set()) {
    const entries = await this.media(sku);
    if (!entries.length) return { sku, need: 'no-image', entries };
    if (entries.some(isManaged)) return { sku, need: 'managed', entries };
    const main = entries.find((e) => (e.types || []).includes('image')) || entries[0];
    const base = main.file.split('/').pop().replace(/_\d+(\.\w+)$/, '$1');
    if (sharedFiles.has(base)) return { sku, need: 'shared-image', entries };
    return { sku, need: 'own-image', entries };
  }

  // Attach the PNG as the main image of the SKU.
  // Same content already in place with its roles and enabled: nothing happens (roles are repaired if needed).
  // New content: the new file is uploaded and checked first; only then is the previous managed file removed.
  // Returns a journal entry that `rollback` can undo.
  async upsertManagedImage(sku, png, { label, dryRun = false, previous = null } = {}) {
    const S = encodeURIComponent(sku);
    const entries = await this.media(sku);
    const hash = contentHash(png);
    const mine = entries.filter(isManaged);
    const same = mine.find((e) => hashOf(e) === hash);
    const healthy = (e) => e && !e.disabled && ROLES.every((t) => (e.types || []).includes(t));
    if (same && mine.length === 1 && healthy(same)) return { sku, action: 'unchanged', hash };
    const previousRoles = previous?.previousRoles || entries.filter((e) => !isManaged(e)).map((e) => ({ id: e.id, types: e.types || [] }));
    if (dryRun) return { sku, action: same ? 'would-repair' : 'would-upload', hash, replaces: mine.map((e) => e.id) };
    if (same) {
      // right file, wrong state: give it back its roles, enable it, drop any other managed copy
      await this.call('PUT', `/products/${S}/media/${same.id}`, { entry: { id: same.id, media_type: same.media_type || 'image', label: label || same.label, position: 0, disabled: false, types: ROLES, file: same.file } });
      for (const e of mine.filter((x) => x.id !== same.id)) await this.call('DELETE', `/products/${S}/media/${e.id}`);
      return { sku, action: 'repaired', hash, entryId: same.id, previousRoles };
    }
    const id = Number(await this.call('POST', `/products/${S}/media`, {
      entry: {
        media_type: 'image',
        label: label || sku,
        position: 0,
        disabled: false,
        types: ROLES,
        content: { base64_encoded_data: Buffer.from(png).toString('base64'), type: 'image/png', name: managedName(sku, png) },
      },
    }));
    const after = await this.media(sku);
    const added = after.find((e) => e.id === id);
    if (!added || !isManaged(added) || hashOf(added) !== hash || !healthy(added)) {
      const err = new Error(`${sku}: new image not in place after upload, previous image kept`);
      err.journal = { sku, action: 'failed', hash, entryId: id, kept: mine.map((e) => e.id) };
      throw err;
    }
    for (const e of mine) await this.call('DELETE', `/products/${S}/media/${e.id}`);
    return { sku, action: mine.length ? 'replaced' : 'added', hash, entryId: id, removed: mine.map((e) => e.id), previousRoles };
  }

  // Undo an upsert: remove the managed entry and give the roles back to the entries that had them.
  async rollback(journal) {
    const { sku } = journal;
    const entries = await this.media(sku);
    for (const e of entries.filter(isManaged)) await this.call('DELETE', `/products/${encodeURIComponent(sku)}/media/${e.id}`);
    for (const p of journal.previousRoles || []) {
      const e = entries.find((x) => x.id === p.id);
      if (!e) continue;
      await this.call('PUT', `/products/${encodeURIComponent(sku)}/media/${e.id}`, {
        entry: { id: e.id, media_type: e.media_type, label: e.label, position: e.position, disabled: e.disabled, types: p.types, file: e.file },
      });
    }
    return { sku, action: 'rolled-back' };
  }
}
