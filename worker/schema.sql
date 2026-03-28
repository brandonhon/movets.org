-- MoVets.org email log and rate limiting schema
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
