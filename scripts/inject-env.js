#!/usr/bin/env node

/**
 * Replace placeholder tokens in site files with environment variables.
 * Run after `npm run build` and before deployment.
 *
 * Usage: node scripts/inject-env.js
 *
 * Environment variables:
 *   TURNSTILE_SITE_KEY     - Cloudflare Turnstile site key
 *   CF_ANALYTICS_TOKEN     - Cloudflare Web Analytics token
 *   WORKER_URL             - Cloudflare Worker base URL (e.g. https://movets-api.xxx.workers.dev)
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');

const replacements = {
  'YOUR_TURNSTILE_SITE_KEY': process.env.TURNSTILE_SITE_KEY || '',
  'YOUR_CF_ANALYTICS_TOKEN': process.env.CF_ANALYTICS_TOKEN || '',
};

// Worker URL replacements (contact.js and subscribe.js)
const workerUrl = process.env.WORKER_URL || '';
if (workerUrl) {
  replacements['http://localhost:8787/send-email'] = `${workerUrl}/send-email`;
  replacements['https://movets-api.YOUR_ACCOUNT.workers.dev/send-email'] = `${workerUrl}/send-email`;
  replacements['http://localhost:8787/subscribe'] = `${workerUrl}/subscribe`;
  replacements['https://movets-api.YOUR_ACCOUNT.workers.dev/subscribe'] = `${workerUrl}/subscribe`;
}

function findFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles(SITE_DIR, ['.html', '.js']);
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!value) continue;
    if (content.includes(placeholder)) {
      content = content.split(placeholder).join(value);
      changed = true;
      totalReplacements++;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`  Updated: ${path.relative(process.cwd(), file)}`);
  }
}

// Warn about missing env vars
const missing = [];
if (!process.env.TURNSTILE_SITE_KEY) missing.push('TURNSTILE_SITE_KEY');
if (!process.env.CF_ANALYTICS_TOKEN) missing.push('CF_ANALYTICS_TOKEN');
if (!process.env.WORKER_URL) missing.push('WORKER_URL');

if (missing.length > 0) {
  console.log(`\n  Warning: Missing env vars (placeholders not replaced): ${missing.join(', ')}`);
}

console.log(`\nDone. ${totalReplacements} replacement(s) across ${files.length} files.`);
