# Local Development Guide (macOS)

## Quick Start

Get the full stack running locally in 4 steps.

### 1. Install everything

```bash
cd /path/to/movets.org

# Project + Worker dependencies
npm install && cd worker && npm install && cd ..

# Wrangler CLI (if not already installed)
npm install -g wrangler
```

### 2. Configure the Worker for local dev

```bash
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
DEV_MODE=true
BREVO_API_KEY=your-brevo-api-key
DEV_TEST_EMAIL=your-email@example.com
EOF
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `ALLOWED_ORIGIN` | Yes | CORS — must match the site URL |
| `DEV_MODE` | Yes | Skips Turnstile, relaxes repEmail validation |
| `BREVO_API_KEY` | Optional | Set to actually send emails; omit to just log to console |
| `DEV_TEST_EMAIL` | Optional | Redirects all contact form emails to this address instead of the rep (requires `DEV_MODE=true` and `BREVO_API_KEY`) |

### 3. Initialize the local database

```bash
cd worker && npm run db:init:local && cd ..
```

### 4. Start both servers

**Terminal 1 — Site:**
```bash
make dev
# http://localhost:8080
```

**Terminal 2 — Worker:**
```bash
cd worker && npm run dev
# http://localhost:8787
```

Open http://localhost:8080 and test:
- **Take Action** — find a rep, fill the form, submit (no CAPTCHA needed)
- **Footer subscribe** — enter an email, get the popup
- **Worker terminal** — see email logs and DB writes

---

## How DEV_MODE Works

When `DEV_MODE=true` in `.dev.vars`:

| Feature | Production | Dev Mode |
|---------|-----------|----------|
| Turnstile CAPTCHA | Required | Skipped |
| repEmail domain | Must be `@house.mo.gov` | Any valid email |
| Email delivery | Sent to representative | Sent to `DEV_TEST_EMAIL` if set |
| Console logging | Minimal | Full email details logged |
| Geo-block | US only | Passes (no `request.cf` locally) |

Without `BREVO_API_KEY`, the email body is logged to the terminal but not sent. With `BREVO_API_KEY` + `DEV_TEST_EMAIL`, the email is actually sent to your test address so you can verify the full end-to-end flow.

---

## Querying the Local Database

```bash
cd worker

# View all emails
wrangler d1 execute movets-email-log --local --command "SELECT * FROM emails"

# View all subscribers
wrangler d1 execute movets-email-log --local --command "SELECT * FROM subscribers"

# Check IP rate limits
wrangler d1 execute movets-email-log --local --command \
  "SELECT ip_address, COUNT(*) as cnt FROM emails GROUP BY ip_address"

# Or use the dashboard script
node ../scripts/visualize.js --local
```

### Browse with a SQLite GUI (optional)

```bash
# Find the database file
find worker/.wrangler -name "*.sqlite" 2>/dev/null

# Install a viewer
brew install --cask db-browser-for-sqlite
```

### Clean the database after testing

```bash
cd worker

# Delete all test data
wrangler d1 execute movets-email-log --local --command "DELETE FROM emails"
wrangler d1 execute movets-email-log --local --command "DELETE FROM subscribers"
wrangler d1 execute movets-email-log --local --command "DELETE FROM sqlite_sequence"

# Or nuke and re-init
rm -rf .wrangler/state && npm run db:init:local
```

---

## Production-Like Testing

To test with real Turnstile and Brevo (no dev shortcuts):

```bash
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
BREVO_API_KEY=your-brevo-api-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
EOF
```

Add `localhost` to your Turnstile widget's allowed hostnames in the Cloudflare dashboard.

Or use Cloudflare's test keys (no account needed):

| Key | Behavior |
|-----|----------|
| Site key: `1x00000000000000000000AA` | Always passes |
| Secret key: `1x0000000000000000000000000000000AA` | Always passes |

Put the test site key in the HTML and the test secret key in `.dev.vars`.

---

## Testing the Newsletter

```bash
# Set env vars (newsletter reads subscribers from remote D1)
export BREVO_API_KEY="your-key"
export D1_DATABASE_ID="your-d1-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Dry run — lists recipients, saves preview HTML
node scripts/send-newsletter.js --subject "Test" --content scripts/newsletter-example.html --dry-run

# Preview
open /tmp/newsletter-preview.html
```

---

## Working with the Remote Database

```bash
cd worker

# Query
wrangler d1 execute movets-email-log --command "SELECT * FROM emails ORDER BY created_at DESC LIMIT 10"
wrangler d1 execute movets-email-log --command "SELECT * FROM subscribers ORDER BY subscribed_at DESC"

# Dashboard
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export D1_DATABASE_ID="your-d1-id"
node scripts/visualize.js

# Export to CSV
node scripts/visualize.js --export-csv
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors in browser | Check `ALLOWED_ORIGIN=http://localhost:8080` in `.dev.vars` |
| "CAPTCHA verification failed" | Add `DEV_MODE=true` to `.dev.vars`, or set Turnstile test keys |
| "Brevo API error" | Check `BREVO_API_KEY` in `.dev.vars`, verify sender domain in Brevo |
| Worker not picking up changes | Restart: kill and re-run `npm run dev` |
| Local D1 database empty | Run `cd worker && npm run db:init:local` |
| Form says "connection error" | Make sure the Worker is running on port 8787 |
