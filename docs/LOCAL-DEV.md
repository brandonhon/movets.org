# Local Development Setup (macOS)

Full local dev environment: static site + Cloudflare Worker + D1 database.

## Quick Start

```bash
# 1. Clone and install everything
git clone git@github.com:brandonhon/movets.org.git
cd movets.org
make setup

# 2. Configure the Worker
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
DEV_MODE=true
BREVO_API_KEY=your-brevo-api-key
DEV_TEST_EMAIL=your-email@example.com
DEV_CONTACT_EMAIL=your-email@example.com
EOF

# 3. Start the site (Terminal 1)
make dev
# http://localhost:8080

# 4. Start the Worker (Terminal 2)
make worker
# http://localhost:8787
```

Open http://localhost:8080 and test the full flow.

## Prerequisites

```bash
# Node.js 20+
brew install node

# Wrangler CLI
npm install -g wrangler

# Docker (optional)
brew install --cask docker
```

## Worker .dev.vars

| Variable | Required | Purpose |
|----------|----------|---------|
| `ALLOWED_ORIGIN` | Yes | CORS origin — must be `http://localhost:8080` |
| `DEV_MODE` | Yes | Skips Turnstile, relaxes repEmail validation |
| `BREVO_API_KEY` | Optional | Actually send emails; omit to just log to console |
| `DEV_TEST_EMAIL` | Optional | Redirects Take Action emails to this address instead of the rep |
| `DEV_CONTACT_EMAIL` | Optional | Redirects Contact page emails to this address instead of `info@movets.org` |

## How DEV_MODE Works

| Feature | Production | Dev Mode |
|---------|-----------|----------|
| Turnstile CAPTCHA | Required | Skipped |
| repEmail domain | Must be `@house.mo.gov` | Any valid email |
| Take Action emails | Sent to representative | Sent to `DEV_TEST_EMAIL` if set |
| Contact page emails | Sent to `info@movets.org` | Sent to `DEV_CONTACT_EMAIL` if set |
| Console logging | Minimal | Full email details |

**Without** `BREVO_API_KEY` — emails are logged to the terminal but not sent.
**With** `BREVO_API_KEY` + `DEV_TEST_EMAIL` — emails are sent to your test address for full e2e testing.

## Local Database

### Query

```bash
cd worker

wrangler d1 execute movets-email-log --local --command "SELECT * FROM emails"
wrangler d1 execute movets-email-log --local --command "SELECT * FROM subscribers"

# Or use the dashboard
make dashboard-local
```

### Browse with a GUI

```bash
find worker/.wrangler -name "*.sqlite" 2>/dev/null
brew install --cask db-browser-for-sqlite
```

### Reset

```bash
make db-reset
```

## Docker

```bash
make docker-run
# http://localhost:8080
```

## Production-Like Testing

Test with real Turnstile and Brevo (no dev shortcuts):

```bash
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
BREVO_API_KEY=your-brevo-api-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
EOF
```

Add `localhost` to your Turnstile widget's allowed hostnames in the Cloudflare dashboard.

Or use Cloudflare's test keys:

| Key | Behavior |
|-----|----------|
| Site key: `1x00000000000000000000AA` | Always passes |
| Secret key: `1x0000000000000000000000000000000AA` | Always passes |

## Testing the Newsletter

```bash
export BREVO_API_KEY="your-key"
export D1_DATABASE_ID="your-d1-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Dry run
node scripts/send-newsletter.js --subject "Test" --content scripts/newsletter-example.html --dry-run
open /tmp/newsletter-preview.html
```

## Remote Database

```bash
cd worker
wrangler d1 execute movets-email-log --command "SELECT * FROM emails ORDER BY created_at DESC LIMIT 10"

# Or use the dashboard
make dashboard
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors | Check `ALLOWED_ORIGIN=http://localhost:8080` in `.dev.vars` |
| CAPTCHA failed | Add `DEV_MODE=true` to `.dev.vars` |
| Brevo API error | Check `BREVO_API_KEY` in `.dev.vars`, verify sender domain |
| Worker not reloading | Kill and re-run `make worker` |
| D1 database empty | Run `make db-reset` |
| "Connection error" on form | Make sure Worker is running (`make worker`) |
