const express = require('express');
const path = require('path');

const quoteRoutes = require('./routes/quote');
const adminRoutes = require('./routes/admin');
const auth = require('./lib/auth');
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // behind Render's proxy
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use('/api/quote', quoteRoutes);
app.use('/admin', adminRoutes);

app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`NRK Welding site running on port ${PORT}`);
  if (!auth.configured()) {
    console.warn('[admin] ADMIN_PASSWORD (8+ chars) and SESSION_SECRET (16+ chars) are not set, so /admin login is disabled.');
  }
});
