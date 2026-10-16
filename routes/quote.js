const express = require('express');
const { db } = require('../db');
const { sendLeadAlert, sendCustomerReceipt } = require('../lib/mailer');

const router = express.Router();

// tiny in-memory rate limit: 6 submissions per hour per IP
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > 6;
}

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

router.post('/', async (req, res) => {
  const b = req.body || {};

  // honeypot: bots fill the hidden "website" field
  if (clean(b.website, 200)) return res.json({ ok: true });

  if (limited(req.ip)) {
    return res.status(429).json({ error: 'Too many requests. Please call (207) 899-6084.' });
  }

  const lead = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    email: clean(b.email, 160),
    service: clean(b.service, 80),
    town: clean(b.town, 80),
    message: clean(b.message, 3000),
    source: clean(b.source, 40) || 'website',
  };

  if (!lead.name || !lead.phone) {
    return res.status(400).json({ error: 'Please add your name and phone number.' });
  }
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return res.status(400).json({ error: 'That email address looks off. Please check it.' });
  }

  const info = db
    .prepare(
      `INSERT INTO leads (name, phone, email, service, town, message, source)
       VALUES (@name, @phone, @email, @service, @town, @message, @source)`
    )
    .run(lead);
  lead.id = info.lastInsertRowid;

  // respond immediately; email runs in the background so a mail problem never loses a lead
  res.json({ ok: true });
  sendLeadAlert(lead).catch((e) => console.error('[mailer] alert failed:', e.message));
  sendCustomerReceipt(lead).catch((e) => console.error('[mailer] receipt failed:', e.message));
});

module.exports = router;
