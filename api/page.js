'use strict';
const engine = require('./_lib/engine');

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const p = String(q.p || 'index');
    let html, status = 200;
    if (p === 'sitemap') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(await engine.sitemap());
    }
    if (p === 'post') {
      html = await engine.renderPost(String(q.slug || ''));
      if (!html) { const to = await engine.postRedirect(String(q.slug || '')); if (to) { res.setHeader('Location', to); return res.status(301).end(); } }
    }
    else html = await engine.renderPage(p);
    if (!html) { html = await engine.renderNotFound(); status = 404; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' : 'public, max-age=0, s-maxage=30');
    res.status(status).send(html);
  } catch (e) {
    console.error('page error', e && e.stack || e);
    res.status(500).setHeader('Content-Type', 'text/plain').send('Temporarily unavailable. Please refresh in a moment.');
  }
};
