# Manual Deployment Guide

Deploy MoVets.org without GitHub Actions — run everything from your local machine.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Terraform](https://www.terraform.io/) 1.5+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- Accounts: [Cloudflare](https://dash.cloudflare.com/sign-up) (free), [Brevo](https://app.brevo.com/account/register) (free)

## 1. Cloudflare Setup

1. Create a free Cloudflare account
2. Get your **Account ID** from Workers & Pages in the dashboard
3. Create an **API Token** with Workers Scripts, D1, Turnstile, and Pages permissions
4. Go to **Turnstile** and create a widget — note the **Site Key** and **Secret Key**
5. Go to **Web Analytics** and create a site — note the **Analytics Token**

## 2. Brevo Setup

1. Create a free Brevo account
2. Go to **Settings > Senders, Domains & Dedicated IPs > Domains** and verify `movets.org`
3. Add DNS records (SPF, DKIM) to your DNS provider as instructed by Brevo
4. Go to **Settings > Senders, Domains & Dedicated IPs > Senders** and add `noreply@movets.org`
5. Go to **Settings > SMTP & API > API Keys** and create a key

## 3. Deploy Infrastructure (Terraform)

```bash
cd terraform

cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values:
#   cloudflare_api_token, cloudflare_account_id, domain,
#   brevo_api_key, turnstile_site_key, turnstile_secret_key,
#   github_owner, github_repo

terraform init
terraform plan
terraform apply
```

Note the outputs:
- `d1_database_id` — update in `worker/wrangler.toml`
- `turnstile_site_key` — use in Step 5
- `worker_url` — use in Step 5
- `pages_url` — your Cloudflare Pages URL

## 4. Deploy the Worker

```bash
cd worker
npm install

# Initialize the D1 database schema
npm run db:init

# Set secrets (you'll be prompted for values)
wrangler secret put BREVO_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY

# Deploy
npm run deploy
```

## 5. Build and Deploy the Site

Set environment variables for the build:

```bash
export TURNSTILE_SITE_KEY="your-turnstile-site-key"
export CF_ANALYTICS_TOKEN="your-analytics-token"
export WORKER_URL="https://movets-api.YOUR_ACCOUNT.workers.dev"
```

Build with env injection:

```bash
npm install
npm run build:deploy
```

This runs Tailwind CSS and replaces all placeholder tokens in the HTML/JS files.

### Option A: Cloudflare Pages (recommended)

If Terraform created the Pages project connected to GitHub, just push to `main`:

```bash
git push origin main
```

Pages auto-builds and deploys. Set the same 3 env vars (`TURNSTILE_SITE_KEY`, `CF_ANALYTICS_TOKEN`, `WORKER_URL`) in **Cloudflare Pages > Settings > Environment variables**.

### Option B: Wrangler Pages Direct Upload

Deploy the built `site/` directory directly without GitHub:

```bash
npx wrangler pages deploy site --project-name movets-org
```

### Option C: Docker (self-hosted)

```bash
make docker
docker run -d --name movets -p 8080:8080 movets-org
```

Site available at `http://your-server:8080`. You'll need to configure SSL separately (e.g., with a reverse proxy like Caddy or nginx + Let's Encrypt).

## 6. DNS Setup

Add CNAME records in your DNS provider:

| Type | Host | Value |
|------|------|-------|
| CNAME | `@` or `movets.org` | `movets-org.pages.dev` |
| CNAME | `www` | `movets-org.pages.dev` |

Also add the Brevo DNS records for email deliverability:

| Type | Host | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:sendinblue.com ~all` |
| CNAME | `mail._domainkey` | (provided by Brevo) |

## Redeploying After Changes

### Site changes only

```bash
npm run build:deploy
npx wrangler pages deploy site --project-name movets-org
```

Or push to `main` if Pages is connected to GitHub.

### Worker changes

```bash
cd worker && npm run deploy
```

### Infrastructure changes

```bash
cd terraform && terraform apply
```

## Dashboard & Newsletter

```bash
# Set env vars
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export D1_DATABASE_ID="your-d1-id"
export BREVO_API_KEY="your-brevo-key"

# Dashboard
node scripts/visualize.js

# Export data
node scripts/visualize.js --export-csv

# Newsletter dry run
node scripts/send-newsletter.js --subject "HB2089 Update" --content scripts/newsletter-example.html --dry-run

# Send newsletter
node scripts/send-newsletter.js --subject "HB2089 Update" --content your-content.html
```

## Updating District Data

```bash
# Edit representative list in scripts/merge-reps.js, then:
node scripts/merge-reps.js
npm run build:deploy
# Redeploy site
```
