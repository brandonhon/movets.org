#!/usr/bin/env node

/**
 * News + RSS generator for MoVets.org
 *
 * Reads scripts/news-posts.json and produces:
 *   - site/rss.xml         (RSS 2.0 feed, styled via rss.xsl)
 *   - site/news/index.html (News index listing page)
 *
 * Usage:
 *   node scripts/generate-news.js
 *   npm run generate:news
 *
 * Adding a new post: see docs/NEWS.md
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://movets.org';
const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'news-posts.json');
const RSS_OUT = path.join(ROOT, 'site', 'rss.xml');
const INDEX_OUT = path.join(ROOT, 'site', 'news', 'index.html');

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toRfc822(iso) {
  const d = new Date(iso);
  return d.toUTCString();
}

function formatDateHuman(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

function loadManifest() {
  const raw = fs.readFileSync(MANIFEST, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.posts)) {
    throw new Error('news-posts.json must contain a "posts" array');
  }
  // Validate every post has required fields
  for (const p of data.posts) {
    const required = ['slug', 'filename', 'title', 'description', 'pubDate'];
    for (const key of required) {
      if (!p[key]) throw new Error(`Post missing "${key}": ${JSON.stringify(p)}`);
    }
    const postPath = path.join(ROOT, 'site', 'news', p.filename);
    if (!fs.existsSync(postPath)) {
      throw new Error(`Post HTML file not found: site/news/${p.filename}`);
    }
  }
  // Sort newest first by pubDate
  data.posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return data.posts;
}

function generateRss(posts) {
  const now = new Date().toUTCString();
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${SITE_URL}/news/${xmlEscape(p.filename)}</link>
      <guid isPermaLink="true">${SITE_URL}/news/${xmlEscape(p.filename)}</guid>
      <pubDate>${toRfc822(p.pubDate)}</pubDate>
      <description>${xmlEscape(p.description)}</description>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MoVets.org — Missouri Disabled Veterans Homestead Exemption</title>
    <link>${SITE_URL}/</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>News and updates on Missouri HB2089 — fair property tax relief for disabled veterans.</description>
    <language>en-us</language>
    <copyright>MoVets.org — Non-partisan veteran advocacy</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>1440</ttl>
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>MoVets.org</title>
      <link>${SITE_URL}/</link>
    </image>
${items}
  </channel>
</rss>
`;
}

function generateIndex(posts) {
  const cards = posts
    .map(
      (p) => `        <a href="${htmlEscape(p.filename)}" class="card news-card" style="display:block;text-decoration:none;color:inherit;padding:32px;margin-bottom:20px;transition:transform 0.15s ease, box-shadow 0.15s ease;">
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
            <span class="section-tag" style="margin:0;">${htmlEscape(p.tag || 'News')}</span>
            <span style="font-size:14px;color:#717379;">${htmlEscape(formatDateHuman(p.pubDate))}</span>
          </div>
          <h2 style="font-size:24px;font-weight:700;color:#0E121E;margin:0 0 10px;line-height:1.3;">${htmlEscape(p.title)}</h2>
          <p style="font-size:16px;line-height:26px;color:#53565E;margin:0 0 12px;">${htmlEscape(p.description)}</p>
          <span style="color:#FF344C;font-weight:600;font-size:15px;">Read more &rarr;</span>
        </a>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News — MoVets.org | HB2089 Updates</title>
  <meta name="description" content="News and updates on Missouri HB2089 — the Disabled Veterans Homestead Exemption.">
  <link rel="canonical" href="${SITE_URL}/news/">
  <meta property="og:title" content="MoVets.org News | HB2089 Updates">
  <meta property="og:description" content="News and updates on Missouri HB2089 — the Disabled Veterans Homestead Exemption.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/news/">
  <meta property="og:site_name" content="MoVets.org">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="MoVets.org News">
  <meta name="twitter:description" content="News and updates on Missouri HB2089.">
  <meta name="twitter:image" content="${SITE_URL}/og-image.png">
  <link rel="alternate" type="application/rss+xml" title="MoVets.org News" href="../rss.xml">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="../css/styles.css" rel="stylesheet">
  <link href="../css/style.css" rel="stylesheet">
  <style>
    .news-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(14, 18, 30, 0.08); }
  </style>
</head>
<body>

  <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:bg-primary-1 focus:text-white focus:p-3 focus:z-50">Skip to content</a>

  <nav class="nav" id="navbar">
    <div class="nav-inner">
      <a href="../index.html" class="nav-logo">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="8" fill="#FF344C"/>
          <path d="M10 18L14 10L18 18L22 10L26 18" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 24H28" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        MoVets
      </a>
      <div class="nav-links">
        <a href="../index.html">Home</a>
        <a href="../about-bill.html">The Bill</a>
        <a href="../take-action.html">Take Action</a>
        <a href="index.html" class="active">News</a>
        <a href="../about.html">About</a>
        <a href="../contact.html">Contact</a>
        <a href="../impact.html">Our Impact</a>
        <a href="../data-sources.html">Data &amp; Sources</a>
      </div>
      <a href="../take-action.html" class="btn btn-primary btn-sm nav-cta">Take Action</a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <div class="mobile-nav" id="mobileNav">
    <a href="../index.html">Home</a>
    <a href="../about-bill.html">The Bill</a>
    <a href="../take-action.html">Take Action</a>
    <a href="index.html">News</a>
    <a href="../about.html">About</a>
    <a href="../contact.html">Contact</a>
    <a href="../impact.html">Our Impact</a>
    <a href="../data-sources.html">Data &amp; Sources</a>
    <a href="../take-action.html" class="btn btn-primary" style="margin-top:16px;text-align:center;">Take Action</a>
  </div>

  <main id="main">
    <div class="page-header">
      <span class="section-tag">Updates</span>
      <h1>News &amp; Updates</h1>
      <p>The latest on HB2089 and Missouri's push for fair property tax relief for disabled veterans.</p>
      <div style="margin-top:20px;">
        <a href="../rss.xml" style="display:inline-flex;align-items:center;gap:8px;color:#FF344C;font-weight:600;text-decoration:none;font-size:15px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.18 15.64a2.18 2.18 0 012.18 2.18C8.36 19 7.38 20 6.18 20A2.18 2.18 0 014 17.82a2.18 2.18 0 012.18-2.18M4 4.44A15.56 15.56 0 0119.56 20h-2.83A12.73 12.73 0 004 7.27V4.44m0 5.66a9.9 9.9 0 019.9 9.9h-2.83A7.07 7.07 0 004 12.93V10.1z"/></svg>
          Subscribe via RSS
        </a>
      </div>
    </div>

    <section class="section">
      <div style="max-width:820px;margin:0 auto;">
${cards}
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="../index.html" class="nav-logo" style="color:#fff;margin-bottom:8px;">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="36" height="36" rx="8" fill="#FF344C"/>
            <path d="M10 18L14 10L18 18L22 10L26 18" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 24H28" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          MoVets
        </a>
        <p>Supporting Missouri's disabled veterans through advocacy for HB2089 — the Homestead Exemption bill.</p>
      </div>
      <div>
        <h4>Pages</h4>
        <ul class="footer-links">
          <li><a href="../index.html">Home</a></li>
          <li><a href="../about-bill.html">The Bill</a></li>
          <li><a href="../take-action.html">Take Action</a></li>
          <li><a href="index.html">News</a></li>
          <li><a href="../about.html">About</a></li>
          <li><a href="../contact.html">Contact</a></li>
          <li><a href="../impact.html">Our Impact</a></li>
          <li><a href="../privacy.html">Privacy</a></li>
          <li><a href="../data-sources.html">Data &amp; Sources</a></li>
        </ul>
      </div>
      <div>
        <h4>Resources</h4>
        <ul class="footer-links">
          <li><a href="https://house.mo.gov/Bill.aspx?bill=HB2089&amp;year=2026" target="_blank" rel="noopener">HB2089 Full Text</a></li>
          <li><a href="https://house.mo.gov" target="_blank" rel="noopener">MO House</a></li>
          <li><a href="../rss.xml">RSS Feed</a></li>
        </ul>
      </div>
      <div>
        <h4>Stay Updated</h4>
        <p style="font-size:14px;color:#717379;margin-bottom:16px;">Get updates on HB2089 and how you can help.</p>
        <form class="newsletter-form" onsubmit="event.preventDefault();">
          <input type="email" placeholder="Your email address">
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 MoVets.org. Non-partisan veteran advocacy.</span>
      <span>Not affiliated with the State of Missouri.</span>
    </div>
  </footer>

  <script>
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
    });
    const navToggle = document.getElementById('navToggle');
    const mobileNav = document.getElementById('mobileNav');
    navToggle.addEventListener('click', () => mobileNav.classList.toggle('open'));
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileNav.classList.remove('open')));
  </script>
  <script src="../js/subscribe.js"></script>
</body>
</html>
`;
}

function main() {
  const posts = loadManifest();
  fs.writeFileSync(RSS_OUT, generateRss(posts));
  fs.writeFileSync(INDEX_OUT, generateIndex(posts));
  console.log(`Generated:`);
  console.log(`  - ${path.relative(ROOT, RSS_OUT)} (${posts.length} items)`);
  console.log(`  - ${path.relative(ROOT, INDEX_OUT)} (${posts.length} items)`);
}

main();
