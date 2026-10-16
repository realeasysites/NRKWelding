const crypto = require('crypto');

const COOKIE = 'nrk_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

function configured() {
  const pw = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.SESSION_SECRET || '';
  return pw.length >= 8 && secret.length >= 16;
}

function sign(payload) {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || '')
    .update(payload)
    .digest('hex');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function checkPassword(input) {
  if (!configured()) return false;
  return safeEqual(input || '', process.env.ADMIN_PASSWORD);
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function issueSession(res, req) {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = String(exp);
  const token = `${payload}.${sign(payload)}`;
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_MS / 1000}${secure ? '; Secure' : ''}`
  );
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function isAuthed(req) {
  if (!configured()) return false;
  const token = parseCookies(req)[COOKIE];
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (!safeEqual(sig, sign(payload))) return false;
  return Number(payload) > Date.now();
}

function requireAdminPage(req, res, next) {
  if (isAuthed(req)) return next();
  return res.redirect('/admin/login');
}

function requireAdminApi(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: 'Not signed in' });
}

module.exports = {
  configured,
  checkPassword,
  issueSession,
  clearSession,
  isAuthed,
  requireAdminPage,
  requireAdminApi,
};
