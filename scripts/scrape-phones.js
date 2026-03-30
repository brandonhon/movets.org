#!/usr/bin/env node

/**
 * Scrape phone numbers for all 163 Missouri House representatives
 * from house.mo.gov and add them to the GeoJSON data file.
 *
 * Usage: node scripts/scrape-phones.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GEOJSON_PATH = path.join(__dirname, '..', 'site', 'data', 'mo-house-districts.geojson');
const DELAY_MS = 500; // polite delay between requests

function fetchPage(district) {
  const padded = String(district).padStart(3, '0');
  const url = `https://house.mo.gov/MemberDetails.aspx?year=2026&district=${padded}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function extractPhone(html) {
  // Look for phone patterns near "Phone" or "Capitol" text
  const phonePatterns = [
    /Phone[:\s]*<[^>]*>?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /(\d{3}[-.\s]\d{3}[-.\s]\d{4})/,
    /(\(\d{3}\)\s*\d{3}[-.\s]\d{4})/,
  ];

  for (const pattern of phonePatterns) {
    const match = html.match(pattern);
    if (match) {
      // Normalize to xxx-xxx-xxxx
      return match[1].replace(/[().\s]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
  }
  return null;
}

async function main() {
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf-8'));
  const phoneMap = {};
  let found = 0;
  let missing = 0;

  console.log('Scraping phone numbers for 163 districts...\n');

  for (let d = 1; d <= 163; d++) {
    try {
      const html = await fetchPage(d);
      const phone = extractPhone(html);

      if (phone) {
        phoneMap[d] = phone;
        process.stdout.write(`  District ${String(d).padStart(3)}: ${phone}\n`);
        found++;
      } else {
        process.stdout.write(`  District ${String(d).padStart(3)}: not found\n`);
        missing++;
      }
    } catch (err) {
      process.stdout.write(`  District ${String(d).padStart(3)}: ERROR ${err.message}\n`);
      missing++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nFound: ${found}, Missing: ${missing}`);

  // Update GeoJSON
  let updated = 0;
  for (const feature of geojson.features) {
    const dist = feature.properties.district;
    if (phoneMap[dist]) {
      feature.properties.phone = phoneMap[dist];
      updated++;
    }
  }

  fs.writeFileSync(GEOJSON_PATH, JSON.stringify(geojson));
  console.log(`Updated ${updated} districts in GeoJSON.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
