#!/usr/bin/env node

/**
 * MoVets.org D1 Database Visualizer
 *
 * Queries the Cloudflare D1 database (remote or local) and prints a
 * dashboard summary of email activity and newsletter subscribers.
 *
 * Usage:
 *   node scripts/visualize.js                # Remote D1 (full dashboard)
 *   node scripts/visualize.js --local        # Local dev D1 (full dashboard)
 *   node scripts/visualize.js --emails       # Email stats only
 *   node scripts/visualize.js --subscribers  # Subscriber stats only
 *   node scripts/visualize.js --export-csv   # Export both tables to CSV
 *
 * Local mode (--local):
 *   Reads from worker/.wrangler/state/v3/d1/ SQLite files directly.
 *   No environment variables needed.
 *
 * Remote mode (default):
 *   Environment variables:
 *     CLOUDFLARE_ACCOUNT_ID  - Cloudflare account ID (required)
 *     CLOUDFLARE_API_TOKEN   - Cloudflare API token with D1 read access (required)
 *     D1_DATABASE_ID         - Cloudflare D1 database ID (required)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const showEmails = args.includes('--emails') || (!args.includes('--subscribers') && !args.includes('--export-csv'));
const showSubscribers = args.includes('--subscribers') || (!args.includes('--emails') && !args.includes('--export-csv'));
const exportCsv = args.includes('--export-csv');

// --- Query backends ---

let query;

if (isLocal) {
  let sqlite3;
  try {
    sqlite3 = require('better-sqlite3');
  } catch {
    // Fall back to spawning the sqlite3 CLI
    sqlite3 = null;
  }

  // Find the local D1 SQLite file
  const d1Dir = path.join(__dirname, '..', 'worker', '.wrangler', 'state', 'v3', 'd1');

  function findSqliteFile(dir) {
    if (!fs.existsSync(dir)) return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findSqliteFile(full);
        if (found) return found;
      } else if (entry.name.endsWith('.sqlite')) {
        return full;
      }
    }
    return null;
  }

  const dbPath = findSqliteFile(d1Dir);
  if (!dbPath) {
    console.error('Local D1 database not found at worker/.wrangler/state/v3/d1/');
    console.error('Run "cd worker && npm run db:init:local" first.');
    process.exit(1);
  }

  console.log(`Using local database: ${path.relative(process.cwd(), dbPath)}\n`);

  if (sqlite3) {
    const db = sqlite3(dbPath, { readonly: true });
    query = async (sql) => db.prepare(sql).all();
  } else {
    // Use sqlite3 CLI as fallback
    const { execSync } = require('child_process');
    query = async (sql) => {
      try {
        const out = execSync(`sqlite3 -json "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
        return out.trim() ? JSON.parse(out) : [];
      } catch (err) {
        if (err.stdout && err.stdout.trim()) return JSON.parse(err.stdout);
        return [];
      }
    };
  }
} else {
  const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const D1_DATABASE_ID = process.env.D1_DATABASE_ID;

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !D1_DATABASE_ID) {
    console.error('Missing required environment variables:');
    console.error('  CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID');
    console.error('\nFor local dev database, use: node scripts/visualize.js --local');
    process.exit(1);
  }

  query = (sql) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ sql });
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.success) {
              reject(new Error(`D1 error: ${JSON.stringify(parsed.errors)}`));
            } else {
              resolve(parsed.result[0].results);
            }
          } catch (e) {
            reject(new Error(`Parse error: ${data.slice(0, 200)}`));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  };
}

// --- Display helpers ---

function line(char = '=', len = 60) { return char.repeat(len); }

function bar(value, max, width = 30) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

function pad(str, len) { return String(str).padEnd(len); }
function rpad(str, len) { return String(str).padStart(len); }

// --- Email dashboard ---

async function emailDashboard() {
  const [
    totalRows,
    byTypeRows,
    topDistrictRows,
    topRepRows,
    topZipRows,
    byDateRows,
    uniqueSenders,
    uniqueReps,
    dateRange,
    byIpRows,
  ] = await Promise.all([
    query('SELECT COUNT(*) as cnt FROM emails'),
    query('SELECT message_type, COUNT(*) as cnt FROM emails GROUP BY message_type'),
    query('SELECT district, COUNT(*) as cnt FROM emails WHERE district != "" GROUP BY district ORDER BY cnt DESC LIMIT 15'),
    query('SELECT rep_name, rep_email, COUNT(*) as cnt FROM emails WHERE rep_name != "" GROUP BY rep_email ORDER BY cnt DESC LIMIT 15'),
    query('SELECT sender_zip, COUNT(*) as cnt FROM emails GROUP BY sender_zip ORDER BY cnt DESC LIMIT 15'),
    query('SELECT DATE(created_at) as d, COUNT(*) as cnt FROM emails GROUP BY d ORDER BY d'),
    query('SELECT COUNT(DISTINCT sender_email) as cnt FROM emails'),
    query('SELECT COUNT(DISTINCT rep_email) as cnt FROM emails'),
    query('SELECT MIN(created_at) as first_at, MAX(created_at) as last_at FROM emails'),
    query('SELECT ip_address, COUNT(*) as cnt FROM emails GROUP BY ip_address ORDER BY cnt DESC LIMIT 10'),
  ]);

  const total = totalRows[0].cnt;

  console.log('\n' + line());
  console.log('  MoVets.org — Email Dashboard');
  console.log(line());

  if (total === 0) {
    console.log('  No emails sent yet.\n');
    return;
  }

  const first = dateRange[0].first_at?.slice(0, 10) || '—';
  const last = dateRange[0].last_at?.slice(0, 10) || '—';

  console.log(`  Total emails:          ${total}`);
  console.log(`  Unique senders:        ${uniqueSenders[0].cnt}`);
  console.log(`  Unique reps contacted: ${uniqueReps[0].cnt}`);
  console.log(`  Date range:            ${first} to ${last}`);
  console.log();

  // Message types
  const typeNames = { 1: 'Base Support', 2: 'Support + Revisions' };
  console.log('  Message Types:');
  for (const row of byTypeRows) {
    const name = typeNames[row.message_type] || `Type ${row.message_type}`;
    const pct = ((row.cnt / total) * 100).toFixed(1);
    console.log(`    ${pad(name, 25)} ${rpad(row.cnt, 5)}  (${pct}%)`);
  }
  console.log();

  // Emails by date
  if (byDateRows.length > 0) {
    const maxDay = Math.max(...byDateRows.map((r) => r.cnt));
    console.log('  Emails by Date:');
    for (const row of byDateRows) {
      console.log(`    ${row.d}  ${bar(row.cnt, maxDay, 25)} ${row.cnt}`);
    }
    console.log();
  }

  // Top districts
  if (topDistrictRows.length > 0) {
    const maxD = topDistrictRows[0].cnt;
    console.log('  Top Districts:');
    for (const row of topDistrictRows) {
      console.log(`    District ${rpad(row.district, 4)}  ${bar(row.cnt, maxD, 20)} ${row.cnt}`);
    }
    console.log();
  }

  // Top reps
  if (topRepRows.length > 0) {
    const maxR = topRepRows[0].cnt;
    console.log('  Top Representatives:');
    for (const row of topRepRows) {
      console.log(`    ${pad(row.rep_name.slice(0, 25), 26)} ${bar(row.cnt, maxR, 18)} ${row.cnt}`);
    }
    console.log();
  }

  // Top ZIPs
  if (topZipRows.length > 0) {
    const maxZ = topZipRows[0].cnt;
    console.log('  Top ZIP Codes:');
    for (const row of topZipRows) {
      console.log(`    ${row.sender_zip}  ${bar(row.cnt, maxZ, 20)} ${row.cnt}`);
    }
    console.log();
  }

  // IP usage
  if (byIpRows.length > 0) {
    const maxIp = byIpRows[0].cnt;
    console.log('  Top IPs (rate limit check):');
    for (const row of byIpRows) {
      const flag = row.cnt >= 4 ? ' [LIMIT]' : '';
      console.log(`    ${pad(row.ip_address, 18)} ${bar(row.cnt, maxIp, 15)} ${row.cnt}/4${flag}`);
    }
    console.log();
  }

  console.log(line());
}

// --- Subscriber dashboard ---

async function subscriberDashboard() {
  const [
    totalRows,
    activeRows,
    byDateRows,
    recentRows,
  ] = await Promise.all([
    query('SELECT COUNT(*) as cnt FROM subscribers'),
    query('SELECT COUNT(*) as cnt FROM subscribers WHERE unsubscribed_at IS NULL'),
    query('SELECT DATE(subscribed_at) as d, COUNT(*) as cnt FROM subscribers GROUP BY d ORDER BY d'),
    query('SELECT email, subscribed_at FROM subscribers WHERE unsubscribed_at IS NULL ORDER BY subscribed_at DESC LIMIT 10'),
  ]);

  const total = totalRows[0].cnt;
  const active = activeRows[0].cnt;
  const unsub = total - active;

  console.log('\n' + line());
  console.log('  MoVets.org — Newsletter Subscribers');
  console.log(line());

  if (total === 0) {
    console.log('  No subscribers yet.\n');
    return;
  }

  console.log(`  Total subscribers:     ${total}`);
  console.log(`  Active:                ${active}`);
  console.log(`  Unsubscribed:          ${unsub}`);
  console.log();

  // Subscriptions by date
  if (byDateRows.length > 0) {
    const maxDay = Math.max(...byDateRows.map((r) => r.cnt));
    console.log('  Subscriptions by Date:');
    for (const row of byDateRows) {
      console.log(`    ${row.d}  ${bar(row.cnt, maxDay, 25)} ${row.cnt}`);
    }
    console.log();
  }

  // Recent subscribers
  if (recentRows.length > 0) {
    console.log('  Recent Subscribers:');
    for (const row of recentRows) {
      console.log(`    ${row.subscribed_at?.slice(0, 16) || '—'}  ${row.email}`);
    }
    console.log();
  }

  console.log(line());
}

// --- CSV export ---

async function exportToCsv() {
  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });

  // Emails
  const emails = await query('SELECT * FROM emails ORDER BY created_at');
  if (emails.length > 0) {
    const cols = Object.keys(emails[0]);
    const rows = emails.map((r) => cols.map((c) => r[c]));
    const csv = [cols.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const emailPath = path.join(outDir, 'emails.csv');
    fs.writeFileSync(emailPath, csv);
    console.log(`Exported ${emails.length} emails to ${emailPath}`);
  } else {
    console.log('No emails to export.');
  }

  // Subscribers
  const subs = await query('SELECT * FROM subscribers ORDER BY subscribed_at');
  if (subs.length > 0) {
    const cols = Object.keys(subs[0]);
    const rows = subs.map((r) => cols.map((c) => r[c]));
    const csv = [cols.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const subPath = path.join(outDir, 'subscribers.csv');
    fs.writeFileSync(subPath, csv);
    console.log(`Exported ${subs.length} subscribers to ${subPath}`);
  } else {
    console.log('No subscribers to export.');
  }
}

// --- Main ---

async function main() {
  try {
    if (exportCsv) {
      await exportToCsv();
    } else {
      if (showEmails) await emailDashboard();
      if (showSubscribers) await subscriberDashboard();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
