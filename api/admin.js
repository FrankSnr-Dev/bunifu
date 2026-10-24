'use strict';
const crypto = require('crypto');
const engine = require('./_lib/engine');
const auth = require('./_lib/auth');
const store = require('./_lib/store');

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const OK_IMG = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

async function readBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const t = Buffer.concat(chunks).toString('utf8');
  return t ? JSON.parse(t) : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const send = (code, obj) => res.status(code).json(obj);
  try {
    const a = String((req.query || {}).a || '');
    const post = req.method === 'POST';
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
    if (post && req.headers['x-requested-with'] !== 'admin') return send(403, { error: 'Forbidden' });

    if (a === 'login' && post) {
      if (auth.throttled(ip)) return send(429, { error: 'Too many attempts. Try again in 15 minutes.' });
      const b = await readBody(req);
      const r = await auth.checkLogin(b.user, b.password);
      if (!r) { auth.fail(ip); await new Promise((x) => setTimeout(x, 700)); return send(401, { error: 'Wrong username or password.' }); }
      res.setHeader('Set-Cookie', auth.makeCookie(r.v));
      return send(200, { ok: true });
    }
    if (a === 'logout') { res.setHeader('Set-Cookie', auth.clearCookie()); return send(200, { ok: true }); }
    if (!(await auth.verify(req))) return send(401, { error: 'Please sign in.' });

    if (a === 'me') return send(200, { ok: true, storage: store.mode(), pages: engine.PAGES });

    if (a === 'fields') {
      const name = String(req.query.page || '');
      if (!engine.PAGES[name]) return send(404, { error: 'Unknown page' });
      return send(200, await engine.fieldsFor(name));
    }
    if (a === 'savefields' && post) {
      const b = await readBody(req), name = String(b.page || '');
      if (!engine.PAGES[name]) return send(404, { error: 'Unknown page' });
      const C = await engine.getContent(true);
      C.pages[name] = C.pages[name] || {};
      for (const e of (Array.isArray(b.set) ? b.set : [])) {
        const bucket = e.s === '*' ? C.shared : C.pages[name];
        const k = str(e.k, 2000);
        if (!/^(text|src|poster|href|alt|placeholder)\|/.test(k)) continue;
        if (e.v === null) delete bucket[k]; else bucket[k] = str(e.v, 5000);
      }
      if (b.meta) {
        C.meta[name] = { title: str(b.meta.title, 200), description: str(b.meta.description, 400) };
        if (b.meta.reset) delete C.meta[name];
      }
      await store.writeJSON('cms/content.json', C);
      return send(200, { ok: true });
    }

    if (a === 'posts') return send(200, { posts: await engine.getPosts(true) });
    if (a === 'savepost' && post) {
      const b = await readBody(req), P = await engine.getPosts(true);
      const title = str(b.title, 160).trim();
      if (!title) return send(400, { error: 'Title is required.' });
      let slug = slugify(b.slug || title) || 'post';
      const old = b.oldSlug ? P.findIndex((x) => x.slug === b.oldSlug) : -1;
      if (P.some((x, i) => x.slug === slug && i !== old)) return send(400, { error: 'Another post already uses the address "' + slug + '".' });
      const rec = { slug, title, category: str(b.category, 40) || 'General', date: /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : new Date().toISOString().slice(0, 10),
        status: b.status === 'draft' ? 'draft' : 'published', c1: str(b.c1, 9), c2: str(b.c2, 9), cover: str(b.cover, 1000), excerpt: str(b.excerpt, 400), body: str(b.body, 60000) };
      if (old >= 0) P[old] = rec; else P.unshift(rec);
      await store.writeJSON('cms/posts.json', P);
      return send(200, { ok: true, slug });
    }
    if (a === 'delpost' && post) {
      const b = await readBody(req), P = await engine.getPosts(true);
      await store.writeJSON('cms/posts.json', P.filter((x) => x.slug !== b.slug));
      return send(200, { ok: true });
    }
    if (a === 'preview' && post) {
      const b = await readBody(req);
      return send(200, { html: engine.md(str(b.body, 60000)) });
    }

    if (a === 'media') return send(200, { files: await store.listFiles('media/') });
    if (a === 'upload' && post) {
      const b = await readBody(req), ext = OK_IMG[b.type];
      if (!ext) return send(400, { error: 'Only PNG, JPG, WEBP or GIF images can be uploaded.' });
      const buf = Buffer.from(String(b.data || ''), 'base64');
      if (!buf.length || buf.length > 3.6 * 1024 * 1024) return send(400, { error: 'Image is too large (max about 3.5 MB).' });
      const base = slugify(String(b.name || 'image').replace(/\.[a-z0-9]+$/i, '')) || 'image';
      const url = await store.putFile('media/' + base + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext, buf, b.type);
      return send(200, { ok: true, url });
    }
    if (a === 'delmedia' && post) {
      const b = await readBody(req);
      await store.delFile(String(b.url || ''));
      return send(200, { ok: true });
    }

    if (a === 'settings') return send(200, { settings: await engine.getSettings(true) });
    if (a === 'savesettings' && post) {
      const b = await readBody(req).then((x) => x.settings || {});
      const S = {
        phone: str(b.phone, 40).trim() || engine.DEF_SETTINGS.phone,
        wa: str(b.wa, 20).replace(/\D/g, '') || engine.DEF_SETTINGS.wa,
        email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(str(b.email, 120).trim()) ? str(b.email, 120).trim() : engine.DEF_SETTINGS.email,
        colors: {},
      };
      for (const k of ['blue', 'cyan', 'violet', 'band']) if (/^#[0-9a-fA-F]{6}$/.test((b.colors || {})[k] || '')) S.colors[k] = b.colors[k];
      await store.writeJSON('cms/settings.json', S);
      return send(200, { ok: true });
    }
    if (a === 'password' && post) {
      const b = await readBody(req);
      const cur = await auth.checkLogin(b.user || 'admin', b.current);
      if (!cur) return send(400, { error: 'Current password is wrong.' });
      if (String(b.next || '').length < 10) return send(400, { error: 'New password must be at least 10 characters.' });
      const v = await auth.changePassword(String(b.next));
      res.setHeader('Set-Cookie', auth.makeCookie(v));
      return send(200, { ok: true });
    }
    if (a === 'backup') return send(200, { content: await engine.getContent(true), settings: await engine.getSettings(true), posts: await engine.getPosts(true) });
    if (a === 'restore' && post) {
      const b = await readBody(req);
      if (b.content) await store.writeJSON('cms/content.json', b.content);
      if (b.settings) await store.writeJSON('cms/settings.json', b.settings);
      if (Array.isArray(b.posts)) await store.writeJSON('cms/posts.json', b.posts);
      return send(200, { ok: true });
    }
    return send(404, { error: 'Unknown action' });
  } catch (e) {
    console.error('admin error', e && e.stack || e);
    return res.status(500).json({ error: 'Something went wrong: ' + String(e && e.message || e) });
  }
};
