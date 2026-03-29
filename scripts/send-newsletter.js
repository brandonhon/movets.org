#!/usr/bin/env node

/**
 * Send a newsletter to all MoVets.org subscribers via Brevo.
 *
 * Usage:
 *   node scripts/send-newsletter.js --subject "HB2089 Update" --content content.html
 *   node scripts/send-newsletter.js --subject "HB2089 Update" --content content.html --dry-run
 *
 * Environment variables:
 *   BREVO_API_KEY        - Brevo API key (required)
 *   D1_DATABASE_ID       - Cloudflare D1 database ID (required)
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID (required)
 *   CLOUDFLARE_API_TOKEN  - Cloudflare API token with D1 read access (required)
 *   FROM_EMAIL           - Sender email (default: noreply@movets.org)
 *   FROM_NAME            - Sender name (default: MoVets.org)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Parse CLI args ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const subject = getArg('--subject');
const contentFile = getArg('--content');
const dryRun = args.includes('--dry-run');

if (!subject || !contentFile) {
  console.error('Usage: node scripts/send-newsletter.js --subject "Subject" --content content.html [--dry-run]');
  process.exit(1);
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@movets.org';
const FROM_NAME = process.env.FROM_NAME || 'MoVets.org';

if (!BREVO_API_KEY || !D1_DATABASE_ID || !CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('Missing required environment variables. See script header for details.');
  process.exit(1);
}

// --- Load template + content ---
const templatePath = path.join(__dirname, 'newsletter-template.html');
const template = fs.readFileSync(templatePath, 'utf-8');
const content = fs.readFileSync(contentFile, 'utf-8');

const html = template
  .replace(/\{\{SUBJECT\}\}/g, subject)
  .replace('{{CONTENT}}', content);

// --- HTTP helpers ---
function fetchJson(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// --- Fetch subscribers from D1 via Cloudflare API ---
async function getSubscribers() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  const res = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: 'SELECT email FROM subscribers WHERE unsubscribed_at IS NULL' }),
  });

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(res.data)}`);
  }

  return res.data.result[0].results.map((row) => row.email);
}

// --- Send single email via Brevo ---
async function sendEmail(to) {
  const url = 'https://api.brevo.com/v3/smtp/email';
  const res = await fetchJson(url, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  return { email: to, status: res.status, ok: res.status === 201 };
}

// --- Main ---
async function main() {
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${contentFile}`);
  console.log(`Dry run: ${dryRun}`);
  console.log();

  const subscribers = await getSubscribers();
  console.log(`Found ${subscribers.length} subscriber(s)\n`);

  if (subscribers.length === 0) {
    console.log('No subscribers. Nothing to send.');
    return;
  }

  if (dryRun) {
    console.log('DRY RUN — would send to:');
    subscribers.forEach((e) => console.log(`  ${e}`));
    console.log(`\nTemplate preview saved to: /tmp/newsletter-preview.html`);
    fs.writeFileSync('/tmp/newsletter-preview.html', html);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const email of subscribers) {
    try {
      const result = await sendEmail(email);
      if (result.ok) {
        console.log(`  OK: ${email}`);
        sent++;
      } else {
        console.log(`  FAIL (${result.status}): ${email}`);
        failed++;
      }
      // Brevo rate: stay well under 1000/sec
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.log(`  ERROR: ${email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
