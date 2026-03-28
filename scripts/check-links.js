#!/usr/bin/env node

/**
 * Link checker for MoVets.org
 * Scans all HTML files in site/ for href and src attributes,
 * verifies internal files exist and external URLs respond.
 *
 * Usage: node scripts/check-links.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SITE_DIR = path.join(__dirname, '..', 'site');
const TIMEOUT_MS = 10000;

// Collect all HTML files
function findHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

// Extract href and src attributes from HTML (skip preconnect hints)
function extractLinks(html) {
  const links = [];
  const pattern = /(?:href|src)\s*=\s*["']([^"'#]+)/gi;
  // Also detect rel="preconnect" lines to skip them
  const preconnectPattern = /rel\s*=\s*["']preconnect["'][^>]*href\s*=\s*["']([^"']+)["']|href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']preconnect["']/gi;
  const preconnectUrls = new Set();
  let m;
  while ((m = preconnectPattern.exec(html)) !== null) {
    preconnectUrls.add(m[1] || m[2]);
  }

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1].split('#')[0].split('?')[0];
    if (!preconnectUrls.has(match[1].split('#')[0])) {
      links.push(url);
    }
  }
  return [...new Set(links)];
}

// Check if an external URL is reachable
// Uses HEAD first, falls back to GET if HEAD returns 403/405
function checkUrl(url, method = 'HEAD') {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const opts = {
      method,
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoVetsLinkChecker/1.0)' },
    };
    const req = mod.request(url, opts, (res) => {
      // Consume response body to free socket
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve({ url, status: res.statusCode, ok: true, redirect: res.headers.location });
      } else if ((res.statusCode === 403 || res.statusCode === 405) && method === 'HEAD') {
        // Retry with GET — some servers block HEAD
        checkUrl(url, 'GET').then(resolve);
      } else {
        resolve({ url, status: res.statusCode, ok: res.statusCode < 400 });
      }
    });
    req.on('error', (err) => resolve({ url, status: 0, ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 0, ok: false, error: 'timeout' }); });
    req.end();
  });
}

async function main() {
  const htmlFiles = findHtmlFiles(SITE_DIR);
  console.log(`Scanning ${htmlFiles.length} HTML files...\n`);

  const results = { pass: 0, fail: 0, skip: 0 };
  const failures = [];
  const externalChecked = new Map();

  for (const file of htmlFiles) {
    const relFile = path.relative(SITE_DIR, file);
    const html = fs.readFileSync(file, 'utf-8');
    const links = extractLinks(html);

    for (const link of links) {
      // Skip data URIs, mailto, tel, javascript, font stylesheets (need query params)
      if (/^(data:|mailto:|tel:|javascript:)/.test(link) || /fonts\.googleapis\.com\/css/.test(link)) {
        results.skip++;
        continue;
      }

      // External URL
      if (/^https?:\/\//.test(link)) {
        if (externalChecked.has(link)) {
          const cached = externalChecked.get(link);
          if (!cached.ok) {
            failures.push({ file: relFile, link, reason: `HTTP ${cached.status} ${cached.error || ''}` });
            results.fail++;
          } else {
            results.pass++;
          }
          continue;
        }

        const result = await checkUrl(link);
        externalChecked.set(link, result);

        if (result.ok) {
          results.pass++;
        } else {
          failures.push({ file: relFile, link, reason: `HTTP ${result.status} ${result.error || ''}` });
          results.fail++;
        }
        continue;
      }

      // Internal link
      const fileDir = path.dirname(file);
      const target = path.resolve(fileDir, link);

      if (fs.existsSync(target)) {
        results.pass++;
      } else {
        failures.push({ file: relFile, link, reason: 'File not found' });
        results.fail++;
      }
    }
  }

  // Report
  console.log('--- Results ---');
  console.log(`  Pass: ${results.pass}`);
  console.log(`  Fail: ${results.fail}`);
  console.log(`  Skip: ${results.skip}`);
  console.log();

  if (failures.length > 0) {
    console.log('--- Broken Links ---');
    for (const f of failures) {
      console.log(`  ${f.file}`);
      console.log(`    ${f.link}`);
      console.log(`    Reason: ${f.reason}`);
      console.log();
    }
    process.exit(1);
  } else {
    console.log('All links OK!');
  }
}

main().catch((err) => {
  console.error('Link checker error:', err);
  process.exit(1);
});
