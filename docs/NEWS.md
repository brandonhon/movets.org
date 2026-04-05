# How to Add a News Post

The MoVets.org site has a news section at `/news/` with an auto-generated RSS feed at `/rss.xml`. This guide shows you how to add a new post.

## Overview

- **Posts live in**: `site/news/` — one HTML file per post
- **Manifest**: `scripts/news-posts.json` — lists every post with its metadata
- **Generator**: `scripts/generate-news.js` — reads the manifest and writes `site/rss.xml` + `site/news/index.html`
- **RSS stylesheet**: `site/rss.xsl` — styles the feed when viewed in a browser

The news index page and the RSS feed are **generated** — never edit them by hand. Edit the manifest and individual post files, then run the generator.

---

## Steps to add a post

### 1. Copy an existing post as a template

```bash
cp site/news/2026-04-05-welcome.html site/news/2026-05-10-my-new-post.html
```

Naming convention: `YYYY-MM-DD-short-slug.html`

### 2. Edit the new HTML file

Update these fields in the new file:

| Where | What to change |
|---|---|
| `<title>` | Post title — MoVets.org |
| `<meta name="description">` | 1-2 sentence summary |
| `<link rel="canonical">` | `https://movets.org/news/FILENAME.html` |
| `og:title`, `og:description`, `og:url` | Match the post |
| `twitter:title`, `twitter:description` | Match the post |
| Page header `<span class="section-tag">` | `News · Month D, YYYY` |
| Page header `<h1>` | Post title |
| Page header `<p>` | 1-sentence hook |
| `<main>` article body | Your content (inside the existing `<div class="card">`) |

**Do not modify** the nav, footer, or script tags — those must stay consistent across all posts.

### 3. Add the post to the manifest

Open `scripts/news-posts.json` and add a new entry **at the top** of the `posts` array (newest first):

```json
{
  "slug": "2026-05-10-my-new-post",
  "filename": "2026-05-10-my-new-post.html",
  "title": "My New Post Title",
  "description": "A 1-2 sentence summary that shows in the RSS feed and the news index.",
  "pubDate": "2026-05-10T09:00:00-05:00",
  "tag": "Policy Update"
}
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `slug` | yes | Unique identifier (match the filename without `.html`) |
| `filename` | yes | HTML filename inside `site/news/` |
| `title` | yes | Used in RSS and the news index card |
| `description` | yes | 1-2 sentences, plain text (no HTML) |
| `pubDate` | yes | ISO 8601 format with timezone, e.g. `2026-05-10T09:00:00-05:00` |
| `tag` | no | Short label for the card, e.g. `Policy Update`, `Explainer`, `Announcement` |

### 4. Generate the RSS feed and news index

```bash
npm run generate:news
```

This regenerates:
- `site/rss.xml` (the RSS feed)
- `site/news/index.html` (the news listing page)

You should see output like:
```
Generated:
  - site/rss.xml (4 items)
  - site/news/index.html (4 items)
```

### 5. Preview locally

```bash
npm run serve
```

Then visit:
- http://localhost:8080/news/ — news index
- http://localhost:8080/news/YOUR-POST.html — your new post
- http://localhost:8080/rss.xml — styled RSS feed

### 6. Validate

```bash
npm run check-links
```

This scans every HTML file for broken links. Fix any failures before committing.

### 7. Commit and push

Use a conventional commit message:

```bash
git checkout -b news/my-new-post
git add site/news/2026-05-10-my-new-post.html scripts/news-posts.json site/rss.xml site/news/index.html site/sitemap.xml
git commit -m "feat(news): add post on [topic]"
git push -u origin news/my-new-post
```

Open a PR on GitHub. On merge to `main`, Cloudflare Pages auto-deploys the site and the RSS feed updates automatically.

---

## Removing a post

1. Delete the HTML file: `rm site/news/FILENAME.html`
2. Remove its entry from `scripts/news-posts.json`
3. Run `npm run generate:news`
4. Remove the entry from `site/sitemap.xml`
5. Commit all 4 file changes together

---

## Updating a post's metadata

If you only need to change the title, description, or date:

1. Edit the entry in `scripts/news-posts.json`
2. Also update the matching `<title>`, `<meta>`, and hero text inside the post's HTML file
3. Run `npm run generate:news`
4. Commit

---

## How it's wired up

```
scripts/news-posts.json    (you edit this)
site/news/*.html           (you edit these)
         │
         ▼
scripts/generate-news.js   (reads both, runs on `npm run generate:news`)
         │
         ├──► site/rss.xml          (generated, committed)
         └──► site/news/index.html  (generated, committed)
```

The generator runs automatically during `npm run build:deploy`, but you should still run `npm run generate:news` before committing so the generated files stay in sync with the manifest in version control.

---

## FAQ

**Q: Can I skip the manifest and just drop an HTML file in `site/news/`?**
No. The RSS feed and news index are built from the manifest — a file without a manifest entry won't appear in either. It will still be accessible by direct URL, but nobody will find it.

**Q: Can I use markdown instead of HTML?**
Not currently. Posts are plain HTML so they can use the site's existing CSS classes (`card`, `section-tag`, `btn`, etc.). If you want to add markdown support later, extend `scripts/generate-news.js`.

**Q: The news index doesn't update after I edit a post.**
You have to re-run `npm run generate:news` — the index is generated, not live.

**Q: Can I schedule a post for the future?**
The generator includes all posts in the manifest regardless of `pubDate`. If you want true scheduling, add a filter: `posts.filter(p => new Date(p.pubDate) <= new Date())`.

**Q: How does the RSS feed get styled when opened in a browser?**
`site/rss.xml` includes an `<?xml-stylesheet?>` reference to `site/rss.xsl`, which transforms the feed into a styled HTML page matching the site's theme. Feed readers ignore the stylesheet and consume the raw XML.
