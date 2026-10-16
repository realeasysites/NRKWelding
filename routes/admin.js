const express = require('express');
const path = require('path');
const { db, STATUSES } = require('../db');
const auth = require('../lib/auth');

const router = express.Router();
const views = path.join(__dirname, '..', 'views');

// simple login throttle: 8 attempts per 15 min per IP
const attempts = new Map();
function throttled(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 8;
}

router.get('/login', (req, res) => {
  if (auth.isAuthed(req)) return res.redirect('/admin');
  res.sendFile(path.join(views, 'admin-login.html'));
});

router.post('/login', (req, res) => {
  if (!auth.configured()) {
    return res.status(503).json({
      error: 'Admin is not set up yet. Set ADMIN_PASSWORD (8+ chars) and SESSION_SECRET (16+ chars) in the host settings.',
    });
  }
  if (throttled(req.ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  if (!auth.checkPassword(req.body && req.body.password)) {
    return res.status(401).json({ error: 'Wrong password.' });
  }
  auth.issueSession(res, req);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  auth.clearSession(res);
  res.json({ ok: true });
});

router.get('/', auth.requireAdminPage, (req, res) => {
  res.sendFile(path.join(views, 'admin.html'));
});

// ---- JSON API (all require a signed-in session) ----
router.get('/api/leads', auth.requireAdminApi, (req, res) => {
  const status = String(req.query.status || '');
  const rows = STATUSES.includes(status)
    ? db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY id DESC').all(status)
    : db.prepare("SELECT * FROM leads WHERE status != 'archived' ORDER BY id DESC").all();
  const counts = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  db.prepare('SELECT status, COUNT(*) c FROM leads GROUP BY status').all().forEach((r) => (counts[r.status] = r.c));
  res.json({ leads: rows, counts, statuses: STATUSES });
});

router.patch('/api/leads/:id', auth.requireAdminApi, (req, res) => {
  if (!(req.headers['content-type'] || '').includes('application/json')) {
    return res.status(415).json({ error: 'JSON only' });
  }
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  }
  if (notes !== undefined) {
    db.prepare('UPDATE leads SET notes = ? WHERE id = ?').run(String(notes).slice(0, 4000), id);
  }
  res.json({ ok: true });
});

router.get('/api/export.csv', auth.requireAdminApi, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  const cols = ['id', 'created_at', 'name', 'phone', 'email', 'service', 'town', 'message', 'status', 'notes', 'source'];
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => q(r[c])).join(','))).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="nrk-leads.csv"');
  res.send(csv);
});

module.exports = router;
