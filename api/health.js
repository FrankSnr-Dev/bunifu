'use strict';
const store = require('./_lib/store');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const t = String(Date.now());
    await store.writeJSON('cms/health.json', { t });
    const back = await store.readJSON('cms/health.json', null, true, { fresh: true });
    res.status(200).json({ ok: !!back && back.t === t, storage: store.mode() });
  } catch (e) {
    res.status(500).json({ ok: false, storage: store.mode(), error: String(e && e.message || e) });
  }
};
