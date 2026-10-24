'use strict';
const crypto = require('crypto');
const store = require('./store');

const SECRET = () => process.env.SESSION_SECRET || 'dev-secret-change-me';
const USER = () => process.env.ADMIN_USER || 'admin';
const hmac = (s) => crypto.createHmac('sha256', SECRET()).update(s).digest('hex');
const AUTH_PATH = () => 'cms/auth-' + hmac('auth-path').slice(0, 16) + '.json';
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const scrypt = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');

async function getAuth(strict) { return store.readJSON(AUTH_PATH(), null, strict, { fresh: true }); }

async function checkLogin(user, pw) {
  const a = await getAuth(true);
  const okUser = same(String(user || '').toLowerCase(), (a && a.user) || USER());
  let okPw;
  if (a && a.hash) okPw = same(scrypt(String(pw || ''), a.salt), a.hash);
  else okPw = !!process.env.ADMIN_PASSWORD && same(String(pw || ''), process.env.ADMIN_PASSWORD);
  return okUser && okPw ? { v: (a && a.v) || 1 } : null;
}
function makeCookie(v) {
  const exp = Date.now() + 7 * 864e5, body = exp + '.' + v;
  const val = body + '.' + hmac('s:' + body);
  return 'bd_admin=' + val + '; Path=/; Max-Age=' + 7 * 86400 + '; HttpOnly; Secure; SameSite=Strict';
}
const clearCookie = () => 'bd_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict';

async function verify(req) {
  const m = String(req.headers.cookie || '').match(/(?:^|;\s*)bd_admin=([^;]+)/);
  if (!m) return false;
  const [exp, v, sig] = m[1].split('.');
  if (!sig || !same(sig, hmac('s:' + exp + '.' + v)) || Number(exp) < Date.now()) return false;
  const a = await getAuth(false);
  return String((a && a.v) || 1) === String(v);
}
async function changePassword(newPw) {
  const a = (await getAuth(true)) || {};
  const salt = crypto.randomBytes(16).toString('hex');
  const next = { user: a.user || USER(), salt, hash: scrypt(newPw, salt), v: (a.v || 1) + 1 };
  await store.writeJSON(AUTH_PATH(), next);
  return next.v;
}
const attempts = new Map();
function throttled(ip) {
  const now = Date.now(), r = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60e3);
  attempts.set(ip, r);
  return r.length >= 8;
}
const fail = (ip) => attempts.set(ip, (attempts.get(ip) || []).concat(Date.now()));

module.exports = { checkLogin, makeCookie, clearCookie, verify, changePassword, throttled, fail };
