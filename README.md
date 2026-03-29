# MoVets.org

A multi-page static website supporting Missouri HB2089 — the Disabled Veterans Homestead Exemption. Helps Missouri veterans find their state representative and voice their support for the bill.

## Features

- **Interactive district map** — All 163 Missouri House districts colored by party (R/D)
- **Contact form** — Send messages to representatives via Cloudflare Worker + Brevo
- **Newsletter** — Footer subscribe form + CLI send script
- **Anti-spam** — 1 email per sender, 4 per IP, US-only geo-block, Turnstile CAPTCHA
- **SEO** — Open Graph, Twitter Cards, canonical URLs, JSON-LD, sitemap

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, Tailwind CSS v3, vanilla JavaScript |
| Backend | Cloudflare Workers (serverless) |
| Database | Cloudflare D1 (SQLite) |
| Email | Brevo API (free: 300/day) |
| CAPTCHA | Cloudflare Turnstile (free) |
| Hosting | Cloudflare Pages (free CDN, SSL) |
| Analytics | Cloudflare Web Analytics (free, no cookies) |
| IaC | Terraform (Cloudflare provider) |
| CI/CD | GitHub Actions |

## Deployment (GitHub CI/CD)

Pushes to `main` auto-deploy the site via Cloudflare Pages and trigger GitHub Actions for infrastructure/worker changes. All changes must go through a pull request.

### 1. Prerequisites

- Accounts: [Cloudflare](https://dash.cloudflare.com/sign-up) (free), [Brevo](https://app.brevo.com/account/register) (free), [GitHub](https://github.com)
- Cloudflare: create API token, Turnstile widget, Web Analytics site
- Brevo: verify sender domain, get API key

### 2. GitHub Secrets & Variables

Go to repo **Settings > Secrets and variables > Actions** and add all of the following.

**Secrets** (sensitive — used by GitHub Actions for Terraform and Worker deploys):

| Secret | Where to find |
|--------|--------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare > Profile > API Tokens > Create Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare > Workers & Pages > right sidebar |
| `BREVO_API_KEY` | Brevo > Settings > SMTP & API > API Keys |
| `TURNSTILE_SECRET_KEY` | Cloudflare > Turnstile > your widget > Secret Key |
| `R2_ACCESS_KEY_ID` | Cloudflare > R2 > Manage R2 API Tokens > Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare > R2 > Manage R2 API Tokens > Secret Access Key |

**Variables** (non-sensitive — used by GitHub Actions for Terraform):

| Variable | Where to find |
|----------|--------------|
| `WORKERS_SUBDOMAIN` | Cloudflare > Workers & Pages > Overview > "Your subdomain" (e.g. `bh-cloudflare-8d4`) |
| `CF_ANALYTICS_TOKEN` | Cloudflare > Web Analytics > your site > JS snippet token |

`github_owner` and `github_repo` are derived automatically from the repository — no manual setup needed.

### 3. Cloudflare Pages Environment Variables

**Managed by Terraform** — no manual setup needed.

Terraform automatically sets these in the Pages build environment:
- `TURNSTILE_SITE_KEY` — from the Terraform-created Turnstile widget
- `CF_ANALYTICS_TOKEN` — from the `cf_analytics_token` variable
- `WORKER_URL` — constructed from `workers_subdomain`

These are injected into the HTML/JS at build time by `scripts/inject-env.js`.

### 4. DNS Setup

Add CNAME records in your DNS provider:

| Type | Host | Value |
|------|------|-------|
| CNAME | `@` or `movets.org` | `movets-org.pages.dev` |
| CNAME | `www` | `movets-org.pages.dev` |

### 5. Deploy

```bash
# Create a branch, make changes, push, open a PR
git checkout -b my-feature
# ... make changes ...
git add . && git commit -m "feat: my change"
git push -u origin my-feature

# Open PR on GitHub, merge to main
# Cloudflare Pages auto-deploys the site
# GitHub Actions deploys terraform/worker if those files changed
```

### What Happens on Merge to Main

| Component | How it deploys |
|-----------|---------------|
| **Static site** | Cloudflare Pages auto-builds (`npm run build:deploy`) and deploys to CDN |
| **Terraform** | GitHub Actions runs `terraform apply` (only if `terraform/` files changed) |
| **Worker** | GitHub Actions runs `wrangler deploy` (only if `worker/` files changed) |

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/LOCAL-DEV.md](docs/LOCAL-DEV.md) | Full local development setup guide |
| [docs/MANUAL-DEPLOY.md](docs/MANUAL-DEPLOY.md) | Manual deployment without CI/CD |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture overview with diagrams |

## Project Structure

```
.
├── site/                              # Static site files
│   ├── *.html                         # 6 pages (index, about-bill, take-action, about, contact, data-sources)
│   ├── robots.txt                     # Search engine crawl rules
│   ├── sitemap.xml                    # Sitemap for search engines
│   ├── css/                           # Tailwind + custom CSS
│   ├── icons/                         # Flaticon.com PNG icons
│   ├── js/                            # contact.js, contact-general.js, subscribe.js, map.js, zip-lookup.js
│   └── data/                          # GeoJSON district boundaries
├── worker/                            # Cloudflare Worker API
│   ├── src/index.js                   # POST /send-email, /subscribe, /contact
│   ├── schema.sql                     # D1 database schema
│   └── wrangler.toml                  # Worker config
├── terraform/                         # Cloudflare infrastructure (Worker, D1, Turnstile, Pages)
├── scripts/                           # Utilities (link checker, newsletter, dashboard, env injection)
├── .github/workflows/deploy.yml       # CI/CD pipeline
├── docs/                              # Documentation + architecture diagrams
├── Dockerfile                         # Local dev container (nginx)
└── Makefile                           # Dev/build/deploy commands
```

## Makefile

```bash
make help                # Show all commands
make setup               # Install deps + init local D1
make dev                 # Tailwind watch + local server
make worker              # Start local Worker
make build               # Build Tailwind CSS (production)
make docker-run          # Build + run Docker container
make check-links         # Check all site links
make dashboard           # Remote D1 stats (emails + subscribers)
make dashboard-emails    # Remote D1 email stats only
make dashboard-subs      # Remote D1 subscriber stats only
make dashboard-local     # Local D1 stats (emails + subscribers)
make dashboard-local-emails  # Local D1 email stats only
make dashboard-local-subs    # Local D1 subscriber stats only
make export-csv          # Export remote D1 to CSV
make export-csv-local    # Export local D1 to CSV
make newsletter-preview  # Dry-run newsletter
make newsletter-send     # Send newsletter to subscribers
make deploy-worker       # Deploy Worker to production
make deploy-infra        # Apply Terraform
make db-reset            # Reset local D1 database
make clean               # Remove build artifacts
```

## Anti-Spam

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

## License

ISC
