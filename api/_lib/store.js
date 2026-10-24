'use strict';
/* Storage for the admin panel.
   On Vercel it uses the connected Blob store (BLOB_READ_WRITE_TOKEN).
   Without a token (local testing) it falls back to a folder on disk. */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const FS_DIR = process.env.CMS_DIR || '/tmp/bunifu-cms';
const TTL = 8000;
const cache = new Map();

let sdk = null;
const B = () => sdk || (sdk = require('@vercel/blob'));
const mode = () => (TOKEN ? 'blob' : 'fs');

async function findBlob(pathname) {
  const r = await B().list({ prefix: pathname, limit: 10, token: TOKEN });
  return (r.blobs || []).find((b) => b.pathname === pathname) || null;
}

/* strict=true: a failed read throws (so an edit never overwrites data it could not read).
   A missing file is not an error: it returns def. */
async function readJSON(pathname, def, strict, opts) {
  const c = cache.get(pathname);
  if (!(opts && opts.fresh) && c && Date.now() - c.t < TTL) return c.v;
  try {
    let v = def;
    if (TOKEN) {
      const b = await findBlob(pathname);
      if (b) {
        const stamp = new Date(b.uploadedAt || Date.now()).getTime();
        const r = await fetch(b.url + (b.url.includes('?') ? '&' : '?') + 'v=' + stamp);
        if (!r.ok) throw new Error('Storage read failed (' + r.status + ')');
        v = await r.json();
      }
    } else {
      const f = path.join(FS_DIR, pathname);
      if (fs.existsSync(f)) v = JSON.parse(fs.readFileSync(f, 'utf8'));
    }
    cache.set(pathname, { t: Date.now(), v });
    return v;
  } catch (e) {
    if (strict) throw e;
    if (c) return c.v;
    return def;
  }
}

async function writeJSON(pathname, obj) {
  const body = JSON.stringify(obj);
  if (TOKEN) {
    await B().put(pathname, body, {
      access: 'public',
      token: TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
  } else {
    const f = path.join(FS_DIR, pathname);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
  cache.set(pathname, { t: Date.now(), v: obj });
}

async function putFile(pathname, buffer, contentType) {
  if (TOKEN) {
    const r = await B().put(pathname, buffer, {
      access: 'public',
      token: TOKEN,
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
    });
    return r.url;
  }
  const f = path.join(FS_DIR, pathname);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buffer);
  return '/_fs/' + pathname;
}

async function listFiles(prefix) {
  if (TOKEN) {
    const out = [];
    let cursor;
    for (let i = 0; i < 5; i++) {
      const r = await B().list({ prefix, limit: 200, cursor, token: TOKEN });
      (r.blobs || []).forEach((b) => out.push({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: new Date(b.uploadedAt).toISOString() }));
      if (!r.hasMore) break;
      cursor = r.cursor;
    }
    return out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }
  const dir = path.join(FS_DIR, prefix);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((n) => {
    const st = fs.statSync(path.join(dir, n));
    return { url: '/_fs/' + prefix + n, pathname: prefix + n, size: st.size, uploadedAt: st.mtime.toISOString() };
  }).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

async function delFile(url) {
  if (TOKEN) return B().del(url, { token: TOKEN });
  const rel = String(url).replace(/^\/_fs\//, '');
  const f = path.join(FS_DIR, rel);
  if (f.startsWith(FS_DIR) && fs.existsSync(f)) fs.unlinkSync(f);
}

module.exports = { readJSON, writeJSON, putFile, listFiles, delFile, mode, FS_DIR };
