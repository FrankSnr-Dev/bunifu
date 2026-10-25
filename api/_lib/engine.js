'use strict';
const fs = require('fs');
const path = require('path');
const store = require('./store');
const seed = require('./seed');

const TDIR = path.join(__dirname, '..', '_templates');
const BASE = 'https://bunifudigitalagency.vercel.app';
const PAGES = {
  index: { path: '/', label: 'Home' }, about: { path: '/about.html', label: 'About' },
  services: { path: '/services.html', label: 'Services' }, 'how-we-work': { path: '/how-we-work.html', label: 'How we work' }, pricing: { path: '/pricing.html', label: 'Pricing' }, 'social-media-management': { path: '/services/social-media-management', label: 'Service: Social media management' }, 'graphic-design-branding': { path: '/services/graphic-design-branding', label: 'Service: Graphic design and branding' }, 'digital-marketing-ads': { path: '/services/digital-marketing-ads', label: 'Service: Digital marketing and ads' }, 'website-development': { path: '/services/website-development', label: 'Service: Website development' }, 'app-development': { path: '/services/app-development', label: 'Service: App development' }, 'search-local-visibility': { path: '/services/search-local-visibility', label: 'Service: Search and local visibility' }, 'short-video-content': { path: '/services/short-video-content', label: 'Service: Short video and content' },
  blog: { path: '/blog', label: 'Blog page' }, faq: { path: '/faq.html', label: 'FAQ' },
  contact: { path: '/contact.html', label: 'Contact' }, privacy: { path: '/privacy.html', label: 'Privacy Policy' },
};
const DEF_SETTINGS = { phone: '0722 822 256', wa: '254722822256', email: 'bunifudigitalagency@gmail.com', colors: {} };

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
function safeUrl(u) {
  u = String(u || '').trim();
  if (/^[\s\x00-\x1f]*(javascript|data|vbscript):/i.test(u.replace(/[\s\x00-\x1f]/g, ''))) return '#';
  return u;
}
const tpl = {};
function template(name) { return tpl[name] || (tpl[name] = fs.readFileSync(path.join(TDIR, name + '.html'), 'utf8')); }

/* ---------- content store ---------- */
async function getContent(strict) { const c = await store.readJSON('cms/content.json', {}, strict); return { pages: c.pages || {}, shared: c.shared || {}, meta: c.meta || {} }; }
async function getSettings(strict) { const s = await store.readJSON('cms/settings.json', {}, strict); return { ...DEF_SETTINGS, ...s, colors: { ...(s.colors || {}) } }; }
async function getPosts(strict) { const p = await store.readJSON('cms/posts.json', null, strict); return Array.isArray(p) ? p : seed.posts.map((x) => ({ ...x })); }

/* ---------- walker: extracts / applies field overrides ---------- */
const TOK = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<\/?[a-zA-Z][^>]*>|[^<]+|</g;
function walk(html, ov, collect) {
  const bi = html.search(/<body[\s>]/i);
  const head = bi < 0 ? '' : html.slice(0, bi), body = bi < 0 ? html : html.slice(bi);
  let scope = 'p', depthEnd = null, last = '';
  const getOne = (s, k) => { const o = ov && (s === '*' ? ov.shared : ov.page); return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; };
  const get = (s, k, bk) => { const v = getOne(s, k); return v === undefined && bk && bk !== k ? getOne(s, bk) : v; };
  const seen = new Set(), cnt = {};
  const out = body.replace(TOK, (m) => {
    if (m[0] !== '<' || m === '<') {
      if (m === '<') return m;
      const t = m.trim();
      if (!t) return m;
      const bk = 'text|' + t;
      let k = bk;
      if (/\d/.test(t)) { const n = (cnt[scope + bk] = (cnt[scope + bk] || 0) + 1); if (n > 1) k = bk + '#' + n; }
      if (collect && !seen.has(scope + k)) { seen.add(scope + k); collect.push({ s: scope, k, bk, kind: 'text', tag: last, orig: unesc(t) }); }
      const v = get(scope, k, bk);
      if (v === undefined) return m;
      const lead = m.match(/^\s*/)[0], trail = m.match(/\s*$/)[0];
      return lead + esc(v) + trail;
    }
    if (m.startsWith('<!--') || /^<(script|style)/i.test(m)) return m;
    const tm = m.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/);
    const closing = tm[1] === '/', tag = tm[2].toLowerCase();
    if (closing) {
      if (depthEnd && tag === depthEnd) { scope = 'p'; depthEnd = null; }
      return m;
    }
    last = tag;
    if (!depthEnd) {
      if (tag === 'header' || tag === 'footer') { scope = '*'; depthEnd = tag; }
      else if (tag === 'section' && /class="[^"]*\bcta\b/.test(m)) { scope = '*'; depthEnd = 'section'; }
    }
    let sc = scope;
    if (tag === 'a' && /class="[^"]*\bwa-float\b/.test(m)) sc = '*';
    return m.replace(/(\s)(src|poster|href|alt|placeholder)="([^"]*)"/g, (all, sp, a, val) => {
      if (!val.trim()) return all;
      if (tag === 'link' || tag === 'base' || tag === 'meta') return all;
      if (a === 'src' && !/^(img|source|video|iframe)$/.test(tag)) return all;
      if (a === 'poster' && tag !== 'video') return all;
      if (a === 'href' && (tag !== 'a' || /^(mailto:|tel:)|wa\.me/.test(val))) return all;
      const k = a + '|' + val;
      if (collect && !seen.has(sc + k)) { seen.add(sc + k); collect.push({ s: sc, k, kind: a, tag, orig: unesc(val) }); }
      let v = get(sc, k);
      if (v === undefined) return all;
      if (a === 'src' || a === 'poster' || a === 'href') v = safeUrl(v);
      return sp + a + '="' + esc(v) + '"';
    });
  });
  return head + out;
}

/* ---------- markdown ---------- */
function inline(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
  return s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + esc(safeUrl(unesc(u))) + '">' + t + '</a>');
}
function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = []; let para = [], list = null, quote = [];
  const flush = () => {
    if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    if (list) { out.push('<' + list.t + '>' + list.i.map((x) => '<li>' + inline(x) + '</li>').join('') + '</' + list.t + '>'); list = null; }
    if (quote.length) { out.push('<div class="callout"><p>' + inline(quote.join(' ')) + '</p></div>'); quote = []; }
  };
  for (const raw of lines) {
    const l = raw.trim(); let m;
    if (!l) { flush(); continue; }
    if ((m = l.match(/^(#{2,3})\s+(.*)$/))) { flush(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { if (!quote.length) flush(); quote.push(m[1]); continue; }
    if ((m = l.match(/^([-*]|\d+\.)\s+(.*)$/))) { const t = /\d/.test(m[1]) ? 'ol' : 'ul'; if (!list || list.t !== t) { flush(); list = { t, i: [] }; } list.i.push(m[2]); continue; }
    if (list || quote.length) flush();
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) { flush(); out.push('<p><img src="' + esc(safeUrl(m[2])) + '" alt="' + esc(m[1]) + '" loading="lazy" style="max-width:100%;border-radius:12px"></p>'); continue; }
    para.push(l);
  }
  flush();
  return out.join('\n');
}

/* ---------- posts ---------- */
const fmtDate = (d) => { const t = new Date(d + 'T00:00:00Z'); return isNaN(t) ? '' : t.getUTCDate() + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][t.getUTCMonth()] + ' ' + t.getUTCFullYear(); };
const mins = (p) => Math.max(1, Math.round(String(p.body || '').split(/\s+/).length / 200));
const cssColor = (c, d) => (/^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : d);
function card(p) {
  const img = p.cover ? '<img src="' + esc(safeUrl(p.cover)) + '" alt="" loading="lazy">' : '';
  return '<a class="post-card" href="/blog/' + esc(p.slug) + '"><div class="pc-cover' + (p.cover ? ' has-img' : '') + '" style="--c1:' + cssColor(p.c1, '#0A5CFF') + ';--c2:' + cssColor(p.c2, '#4B2A8E') + '">' + img + '<b>' + esc(p.category) + '</b></div><div class="pc-body"><span class="meta">' + fmtDate(p.date) + ' · ' + mins(p) + ' min read</span><h3>' + esc(p.title) + '</h3><p>' + esc(p.excerpt) + '</p><span class="go">Read article →</span></div></a>';
}
const published = (posts) => posts.filter((p) => p.status !== 'draft').sort((a, b) => String(b.date).localeCompare(String(a.date)));

/* ---------- page assembly ---------- */
function absUrl(u) { u = safeUrl(u); return /^https?:\/\//i.test(u) ? u : BASE + (u.startsWith('/') ? '' : '/') + u; }
function setMeta(html, title, desc, url, image, type) {
  const t = esc(title), d = esc(desc);
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + t + '</title>');
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => a + d + b);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, (m, a, b) => a + t + b);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => a + d + b);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (m, a, b) => a + esc(url) + b);
  const img = esc(image || BASE + '/logo.png');
  html = html.replace(/<meta property="og:image" content="[^"]*">/, () => '<meta property="og:image" content="' + img + '"><meta property="og:image:alt" content="' + t + '"><meta property="og:url" content="' + esc(url) + '"><meta property="og:site_name" content="Bunifu Digital Agency"><meta name="twitter:card" content="' + (image ? 'summary_large_image' : 'summary') + '"><meta name="twitter:title" content="' + t + '"><meta name="twitter:description" content="' + d + '"><meta name="twitter:image" content="' + img + '">');
  return html.replace(/(<meta property="og:type" content=")[^"]*(")/, (m, a, b) => a + (type || 'website') + b);
}
function finish(html, S) {
  const c = S.colors || {};
  const css = ['blue', 'cyan', 'violet', 'band'].filter((k) => /^#[0-9a-fA-F]{6}$/.test(c[k] || '')).map((k) => '--' + k + ':' + c[k]).join(';');
  if (css) html = html.replace('</head>', () => '<style>:root,:root[data-theme="dark"]{' + css + '}</style></head>');
  if (/^#[0-9a-fA-F]{6}$/.test(c.blue || '')) html = html.replace(/(<meta name="theme-color" content=")[^"]*(")/, (m, a, b) => a + c.blue + b);
  const digits = String(S.wa || '').replace(/\D/g, '') || DEF_SETTINGS.wa;
  html = html.replace(/\+254722822256|254722822256|0722 822 256|bunifudigitalagency@gmail\.com/g, (m) => (m === '+254722822256' ? '+' + digits : m === '254722822256' ? digits : m === '0722 822 256' ? S.phone : S.email));
  return html;
}
function metaOf(html) {
  return { title: unesc((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''), description: unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '') };
}

async function renderPage(name) {
  if (!PAGES[name]) return null;
  const [C, S, P] = await Promise.all([getContent(), getSettings(), getPosts()]);
  let html = template(name);
  const m = (C.meta || {})[name] || {}, orig = metaOf(html);
  html = walk(html, { shared: C.shared, page: C.pages[name] || {} });
  if (html.includes('<!--G-->')) {
    const pr = walk(template('pricing'), { shared: C.shared, page: C.pages.pricing || {} });
    const g = pr.match(new RegExp('<!--G:' + name + '-->([\\s\\S]*?)<!--/G-->'));
    html = html.replace('<!--G-->', () => (g ? g[1] : ''));
  }
  const pub = published(P);
  html = html.replace('<!--POSTS_TEASER-->', () => pub.slice(0, 3).map(card).join('')).replace('<!--POSTS_GRID-->', () => (pub.length ? pub.map(card).join('') : '<p>New articles are coming soon.</p>'));
  html = setMeta(html, m.title || orig.title, m.description || orig.description, BASE + PAGES[name].path);
  return finish(html, S);
}
async function renderPost(slug) {
  const [C, S, P] = await Promise.all([getContent(), getSettings(), getPosts()]);
  const pub = published(P), p = pub.find((x) => x.slug === slug);
  if (!p) return null;
  let html = walk(template('post'), { shared: C.shared, page: {} });
  const more = pub.filter((x) => x.slug !== slug).slice(0, 3).map((x) => '<li><a href="/blog/' + esc(x.slug) + '">' + esc(x.title) + '</a></li>').join('');
  html = html.replace('<!--POST_CAT-->', () => esc(p.category)).replace('<!--POST_TITLE-->', () => esc(p.title))
    .replace('<!--POST_META-->', () => fmtDate(p.date) + ' · ' + mins(p) + ' min read')
    .replace('<!--POST_BODY-->', () => (p.cover ? '<p><img src="' + esc(safeUrl(p.cover)) + '" alt="' + esc(p.title) + '" style="max-width:100%;border-radius:14px"></p>' : '') + md(p.body))
    .replace('<!--MORE_POSTS-->', () => more);
  if (!more) html = html.replace(/<div class="more-posts">[\s\S]*?<\/ul><\/div>/, '');
  html = setMeta(html, p.title + ' | Bunifu Digital Agency', p.excerpt, BASE + '/blog/' + p.slug, p.cover ? absUrl(p.cover) : '', 'article');
  return finish(html, S);
}
async function postRedirect(slug) {
  const P = published(await getPosts());
  const m = P.find((x) => (x.prev || []).includes(slug));
  return m ? '/blog/' + m.slug : null;
}
async function renderNotFound() {
  const [C, S] = await Promise.all([getContent(), getSettings()]);
  let html = walk(template('notfound'), { shared: C.shared, page: {} });
  html = html.replace(/(<meta name="robots"[^>]*>)?<\/head>/, '<meta name="robots" content="noindex"></head>');
  return finish(html, S);
}
async function sitemap() {
  const P = published(await getPosts());
  const u = Object.keys(PAGES).map((n) => BASE + PAGES[n].path).concat(P.map((p) => BASE + '/blog/' + p.slug));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + u.map((x) => '<url><loc>' + esc(x) + '</loc></url>').join('') + '</urlset>';
}

/* fields for the admin editor */
async function fieldsFor(name) {
  const C = await getContent(true);
  const list = [];
  walk(template(name), { shared: {}, page: {} }, list);
  const seenShared = new Set();
  const items = list.map((f) => {
    const bucket = f.s === '*' ? C.shared : C.pages[name] || {};
    let cur = bucket[f.k];
    if (cur === undefined && f.bk && f.bk !== f.k) cur = bucket[f.bk];
    return { s: f.s, k: f.k, kind: f.kind, tag: f.tag, orig: f.orig, val: cur === undefined ? f.orig : cur, edited: cur !== undefined };
  });
  const m = (C.meta || {})[name] || {}, o = metaOf(template(name));
  return { items, meta: { title: m.title || o.title, description: m.description || o.description, otitle: o.title, odescription: o.description } };
}
function tplText(name) { return template(name); }

module.exports = { PAGES, DEF_SETTINGS, esc, md, safeUrl, getContent, getSettings, getPosts, renderPage, renderPost, postRedirect, renderNotFound, sitemap, fieldsFor, walk, tplText, published };
