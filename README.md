# MoVets.org

A multi-page static website supporting Missouri HB2089 — the Disabled Veterans Homestead Exemption. Helps Missouri veterans find their state representative and voice their support for the bill.

Designed after the [Politician X Webflow template](https://politiciantemplate.webflow.io/home) with a modern, professional political aesthetic.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `site/index.html` | Hero, stats, bill benefits, how-to-help, CTA |
| The Bill | `site/about-bill.html` | Detailed HB2089 info, key provisions, quick facts |
| Take Action | `site/take-action.html` | Interactive district map + contact form |
| About | `site/about.html` | Mission, values, why it matters |
| Contact | `site/contact.html` | General contact form + rep lookup |
| Data & Sources | `site/data-sources.html` | Data attribution & methodology |

## Features

- **Interactive district map** — All 163 Missouri House districts colored by party (R/D), with rep info popups
- **ZIP-to-district lookup** — Geocodes ZIP via Nominatim + Census reverse geocoder
- **Contact form** — Sends messages via Cloudflare Worker + Brevo API
- **Cloudflare Turnstile** — Free, privacy-friendly CAPTCHA (no annoying puzzles)
- **Anti-spam** — 1 message per email, 4 per IP, US-only geo-block, repEmail domain validation
- **Newsletter** — Footer subscribe form + CLI send script via Brevo
- **Responsive design** — Sticky nav, mobile hamburger menu, fluid layout
- **Docker support** — Runs in nginx container on port 8080

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, Tailwind CSS v3, vanilla JavaScript, Inter font |
| Mapping | Leaflet.js + Census TIGER/Line GeoJSON (~440KB) |
| Backend | Cloudflare Workers (serverless) |
| Database | Cloudflare D1 (SQLite) |
| Email | Brevo API (free: 300/day) |
| CAPTCHA | Cloudflare Turnstile (free) |
| Hosting | Cloudflare Pages (production), Docker (local dev) |
| Analytics | Cloudflare Web Analytics (free, no cookies) |
| IaC | Terraform (Cloudflare provider) |

## Quick Start

```bash
# Install dependencies
npm install

# Build CSS and serve locally
make dev
# Or manually:
npm run build && npm run serve
```

Open http://localhost:8080

## Project Structure

```
.
├── site/                              # Static site files
│   ├── index.html                     # Home page
│   ├── about-bill.html                # About the Bill
│   ├── take-action.html               # Map + contact form
│   ├── about.html                     # About MoVets.org
│   ├── contact.html                   # Contact page
│   ├── data-sources.html              # Data sources
│   ├── robots.txt                     # Search engine crawl rules
│   ├── sitemap.xml                    # Sitemap for search engines
│   ├── favicon.svg                    # Site icon
│   ├── css/
│   │   ├── style.css                  # Custom theme (Politician X)
│   │   └── styles.css                 # Tailwind output (generated)
│   ├── icons/                         # Flaticon.com PNG icons (512x512)
│   ├── js/
│   │   ├── contact.js                 # Form handler + Turnstile
│   │   ├── subscribe.js               # Newsletter subscription
│   │   ├── map.js                     # Leaflet map + districts
│   │   └── zip-lookup.js              # ZIP geocoding cascade
│   └── data/
│       └── mo-house-districts.geojson # 163 districts + rep data
├── worker/                            # Cloudflare Worker (API)
│   ├── src/index.js                   # Request handler
│   ├── wrangler.toml                  # Worker config
│   ├── schema.sql                     # D1 database schema
│   └── package.json                   # Worker dependencies
├── terraform/                         # Infrastructure as Code
│   ├── main.tf                        # CF Worker, D1, Turnstile
│   ├── variables.tf                   # Input variables
│   ├── outputs.tf                     # Output values
│   └── terraform.tfvars.example       # Example config
├── scripts/
│   ├── merge-reps.js                  # Merge rep data into GeoJSON
│   ├── check-links.js                 # Link checker
│   ├── inject-env.js                  # Replace placeholders with env vars at build
│   ├── visualize.js                   # D1 database dashboard + CSV export
│   ├── send-newsletter.js             # Send newsletter to subscribers
│   ├── newsletter-template.html       # Newsletter HTML template
│   ├── newsletter-example.html        # Example newsletter content
│   └── generate_architecture_diagrams.py
├── docs/
│   ├── ARCHITECTURE.md                # Architecture overview
│   └── architecture/                  # Generated diagrams (PNG)
├── Dockerfile                         # Multi-stage build (nginx)
├── docker-compose.yml                 # Docker Compose config
├── nginx.conf                         # nginx site config
├── Makefile                           # Dev/build/deploy commands
├── tailwind.config.js                 # Tailwind design tokens
├── tailwind.css                       # Tailwind input
└── package.json                       # npm scripts
```

## Deployment

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://docs.docker.com/get-docker/) (for containerized hosting)
- [Terraform](https://www.terraform.io/) 1.5+ (for infrastructure)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Accounts: [Cloudflare](https://dash.cloudflare.com/sign-up) (free), [Brevo](https://app.brevo.com/account/register) (free)

### Step 1: GitHub Secrets & Variables

Go to your repo **Settings > Secrets and variables > Actions** and add:

**Secrets** (sensitive):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |

**Variables** (non-sensitive):

| Variable | Value |
|----------|-------|
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics token |
| `WORKER_URL` | Worker URL (e.g. `https://movets-api.xxx.workers.dev`) |

The Cloudflare Pages build uses `TURNSTILE_SITE_KEY`, `CF_ANALYTICS_TOKEN`, and `WORKER_URL` to inject values into the site HTML/JS at build time via `scripts/inject-env.js`.

Set these same 3 variables in **Cloudflare Pages > your project > Settings > Environment variables** so they're available during the Pages build.

### Step 2: Cloudflare Setup

1. Create a free Cloudflare account
2. Get your **Account ID** from Workers & Pages in the dashboard
3. Create an **API Token** with Workers Scripts, D1, Turnstile, and Pages permissions
4. Go to **Turnstile** and create a widget — note the **Site Key** and **Secret Key**
5. Go to **Web Analytics** and create a site — note the **Analytics Token**
6. Connect your GitHub repo to Cloudflare Pages (Terraform handles this)
7. Verify your sender domain in Brevo (Settings > SMTP & API > Senders & IPs)
8. Get your **Brevo API Key** from Brevo (Settings > SMTP & API > API Keys)

### Step 2: Deploy Infrastructure (Terraform)

```bash
cd terraform

# Create your config
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

Note the outputs:
- `d1_database_id` — update in `worker/wrangler.toml`
- `turnstile_site_key` — update in `site/take-action.html` and `site/contact.html`
- `worker_url` — update `API_URL` in `site/js/contact.js` and `site/js/subscribe.js`
- `pages_url` — your Cloudflare Pages URL (auto-deploys from GitHub)

### Step 3: Deploy the Worker

```bash
cd worker
npm install

# Initialize the D1 database schema
npm run db:init

# Set secrets
wrangler secret put BREVO_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy
npm run deploy
```

### Step 4: Frontend Config (Automatic)

Placeholders are replaced automatically at build time by `scripts/inject-env.js`. Set these environment variables in **Cloudflare Pages > Settings > Environment variables**:

| Variable | Replaces |
|----------|----------|
| `TURNSTILE_SITE_KEY` | `YOUR_TURNSTILE_SITE_KEY` in HTML |
| `CF_ANALYTICS_TOKEN` | `YOUR_CF_ANALYTICS_TOKEN` in HTML |
| `WORKER_URL` | API URLs in `contact.js` and `subscribe.js` |

The build command (`npm run build:deploy`) runs Tailwind CSS then injects these values.

### Step 5: DNS Setup

Add a CNAME record in your DNS provider (Namecheap, etc.):

| Type | Host | Value |
|------|------|-------|
| CNAME | `@` or `movets.org` | `movets-org.pages.dev` |
| CNAME | `www` | `movets-org.pages.dev` |

Cloudflare Pages handles SSL automatically.

### Hosting

The site is hosted on **Cloudflare Pages** (free tier):
- Auto-deploys on every push to `main`
- Global CDN with edge caching
- Free SSL
- Unlimited bandwidth

Docker is available for local development only (`make docker-run`).

## Makefile Commands

```bash
make help          # Show all commands
make dev           # Tailwind watch + local server
make build         # Build Tailwind CSS (production)
make serve         # Serve site locally (port 8080)
make docker        # Build Docker image
make docker-run    # Build + run Docker container
make check-links       # Check all internal/external links
make dashboard         # Show email + subscriber stats from D1
make dashboard-emails  # Email stats only
make dashboard-subs    # Subscriber stats only
make export-csv        # Export emails and subscribers to CSV
make newsletter-preview # Dry-run newsletter (no emails sent)
make newsletter-send   # Send newsletter to all subscribers
make deploy-worker     # Deploy Cloudflare Worker
make deploy-infra      # Apply Terraform
```

## Dashboard

View email activity and subscriber stats from the D1 database.

```bash
# Set environment variables (same for dashboard, newsletter, and CSV export)
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export D1_DATABASE_ID="your-d1-id"

# Full dashboard (emails + subscribers)
make dashboard

# Email stats only
make dashboard-emails

# Subscriber stats only
make dashboard-subs

# Export both tables to CSV
make export-csv
```

## Sending a Newsletter

```bash
# 1. Write your content as an HTML fragment (see scripts/newsletter-example.html)
# 2. Set environment variables
export BREVO_API_KEY="your-key"
export D1_DATABASE_ID="your-d1-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# 3. Preview (dry run — no emails sent)
node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html --dry-run

# 4. Send to all subscribers
node scripts/send-newsletter.js --subject "HB2089 Update" --content your-content.html
```

The script reads subscribers from D1, merges your content into `scripts/newsletter-template.html`, and sends individually via Brevo.

## SEO

| Feature | Status |
|---------|--------|
| Meta descriptions | All 6 pages |
| Open Graph tags | All 6 pages |
| Twitter Card tags | All 6 pages |
| Canonical URLs | All 6 pages |
| JSON-LD schema | `index.html` (Organization) |
| `robots.txt` | Allow all, sitemap pointer |
| `sitemap.xml` | All 6 pages with priorities |
| Cloudflare Web Analytics | All 6 pages (no cookies, GDPR-compliant) |

## Anti-Spam Measures

| Measure | Implementation |
|---------|---------------|
| 1 email per sender | `UNIQUE` constraint on `sender_email` in D1 |
| 4 emails per IP | D1 count query before send |
| US-only geo-block | `request.cf.country` check in Worker |
| CAPTCHA | Cloudflare Turnstile (server-side verification) |
| Rep email validation | Must be `@house.mo.gov` domain |
| Honeypot field | Hidden form field for bot traps |
| Input sanitization | HTML stripping, 5000 char cap |
| Request size limit | 10KB max POST body |
| CORS | Restricted to `https://movets.org` |

## Updating District Data

```bash
# Edit representative list in scripts/merge-reps.js, then:
node scripts/merge-reps.js
npm run build
```

## Design System

Based on the [Politician X style guide](https://politiciantemplate.webflow.io/utility-pages/style-guide):

| Token | Value | Usage |
|-------|-------|-------|
| Primary 1 | `#FF344C` | CTAs, accents, Republican districts |
| Primary 2 | `#26385E` | Nav, headings, Democrat districts |
| Font | Inter | All text (400-800 weights) |
| Buttons | Pill shape | `border-radius: 80px` |
| Cards | 16px radius | `border: 1px solid #E0E2E7` |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture overview with diagrams.

## License

ISC
