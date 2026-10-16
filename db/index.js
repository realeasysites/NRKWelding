const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'nrk.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    service TEXT,
    town TEXT,
    message TEXT,
    source TEXT DEFAULT 'website',
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
`);

const STATUSES = ['new', 'contacted', 'quoted', 'won', 'lost', 'archived'];

module.exports = { db, STATUSES, dbPath };
