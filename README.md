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
- **Rate limiting** — 1 message per email address, 3 messages per IP (enforced via D1 database)
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
| Hosting | Docker (nginx:alpine) on port 8080 |
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
│   ├── favicon.svg                    # Site icon
│   ├── css/
│   │   ├── style.css                  # Custom theme (Politician X)
│   │   └── styles.css                 # Tailwind output (generated)
│   ├── js/
│   │   ├── contact.js                 # Form handler + Turnstile
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

### Step 1: Cloudflare Setup

1. Create a free Cloudflare account
2. Get your **Account ID** from the dashboard
3. Create an **API Token** with Workers, D1, and Turnstile permissions
4. Go to **Turnstile** in the dashboard and create a widget — note the **Site Key** and **Secret Key**
5. Verify your sender domain in Brevo (SMTP & API > Senders & IPs)
6. Get your **Brevo API Key** from SMTP & API > API Keys

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
- `worker_url` — update `API_URL` in `site/js/contact.js`

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

### Step 4: Update Frontend Config

Replace these placeholders in the site files:

| Placeholder | File(s) | Replace With |
|-------------|---------|-------------|
| `YOUR_TURNSTILE_SITE_KEY` | `site/take-action.html`, `site/contact.html` | Turnstile site key |
| `https://movets-api.YOUR_ACCOUNT.workers.dev/send-email` | `site/js/contact.js` | Worker URL |

### Step 5: Build & Deploy the Site

```bash
# Build CSS
npm run build

# Option A: Docker
make docker-run
# Site available at http://localhost:8080

# Option B: Any static host
# Upload the site/ directory to GitHub Pages, Netlify, Vercel, etc.
```

### Firewall Ports

If hosting behind a firewall, ensure these ports are open:

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| **8080** | TCP | Inbound | nginx serves the site |
| **443** | TCP | Outbound | Worker → Brevo API, Turnstile verification |

## Makefile Commands

```bash
make help          # Show all commands
make dev           # Tailwind watch + local server
make build         # Build Tailwind CSS (production)
make serve         # Serve site locally (port 8080)
make docker        # Build Docker image
make docker-run    # Build + run Docker container
make check-links   # Check all internal/external links
make deploy-worker # Deploy Cloudflare Worker
make deploy-infra  # Apply Terraform
```

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
