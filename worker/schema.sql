-- MoVets.org email log, rate limiting, and newsletter schema
-- Applied to Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_email TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  sender_zip TEXT NOT NULL,
  rep_email TEXT NOT NULL,
  rep_name TEXT,
  district TEXT,
  message_type INTEGER DEFAULT 1,
  ip_address TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ip ON emails(ip_address);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT UNIQUE,
  subscribed_at TEXT DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

