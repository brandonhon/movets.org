# Local Development Guide (macOS)

Complete guide for running MoVets.org locally, including the static site, Cloudflare Worker, D1 database, and Brevo email testing.

## Prerequisites

```bash
# Node.js 20+
node --version

# npm (comes with Node)
npm --version

# Docker (optional, for containerized site)
docker --version
```

## 1. Install Dependencies

### Project dependencies

```bash
cd /path/to/movets.org
npm install
```

### Wrangler (Cloudflare CLI)

```bash
# Install globally
npm install -g wrangler

# Verify
wrangler --version

# Login to Cloudflare (opens browser)
wrangler login
```

### Worker dependencies

```bash
cd worker
npm install
cd ..
```

## 2. Run the Static Site

### Option A: Tailwind watch + local server

```bash
make dev
# Site at http://localhost:8080
# Tailwind recompiles on file changes
```

### Option B: Build once and serve

```bash
make build
make serve
# Site at http://localhost:8080
```

### Option C: Docker

```bash
make docker-run
# Site at http://localhost:8080
```

## 3. Run the Cloudflare Worker Locally

Wrangler runs a local Worker with a local SQLite database (no Cloudflare account needed for local dev).

### Initialize the local D1 database

```bash
cd worker
npm run db:init:local
```

This creates a local SQLite file at `worker/.wrangler/state/v3/d1/` with the schema from `schema.sql`.

### Start the local Worker

```bash
cd worker
npm run dev
# Worker at http://localhost:8787
```

The local Worker has:
- Local D1 database (SQLite file on disk)
- All environment variables from `wrangler.toml` `[vars]`
- **No secrets** — Turnstile and Brevo calls will fail unless you set them

### Set local secrets for testing

Create a `.dev.vars` file in the `worker/` directory (gitignored by Wrangler):

```bash
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
DEV_MODE=true
EOF
```

`DEV_MODE=true` enables these behaviors:
- **Skips Turnstile** — no CAPTCHA needed on the form
- **Skips Brevo** — emails are logged to the terminal instead of sent
- **Relaxes repEmail** — accepts any valid email, not just `@house.mo.gov`

For production-like testing (real Turnstile + real Brevo sends), remove `DEV_MODE` and add:

```bash
cat > worker/.dev.vars << 'EOF'
ALLOWED_ORIGIN=http://localhost:8080
BREVO_API_KEY=your-brevo-api-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
EOF
```

### Point the frontend at the local Worker

In `site/js/contact.js`, temporarily change:

```js
const API_URL = 'http://localhost:8787/send-email';
```

In `site/js/subscribe.js`, temporarily change:

```js
const API_URL = 'http://localhost:8787/subscribe';
```

**Don't commit these changes.** Revert before pushing.

## 4. Working with the Local D1 Database

### Open the local database

The local D1 database is a SQLite file. You can query it directly:

```bash
cd worker

# Run a query
wrangler d1 execute movets-email-log --local --command "SELECT * FROM emails"

# Count emails
wrangler d1 execute movets-email-log --local --command "SELECT COUNT(*) FROM emails"

# View subscribers
wrangler d1 execute movets-email-log --local --command "SELECT * FROM subscribers"

# View emails by IP (check rate limiting)
wrangler d1 execute movets-email-log --local --command "SELECT ip_address, COUNT(*) as cnt FROM emails GROUP BY ip_address"
```

### Browse with a SQLite GUI (optional)

The local database file is at:

```
worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
```

Find it:

```bash
find worker/.wrangler -name "*.sqlite" 2>/dev/null
```

Open with any SQLite browser:
- [DB Browser for SQLite](https://sqlitebrowser.org/) — `brew install --cask db-browser-for-sqlite`
- [TablePlus](https://tableplus.com/) — `brew install --cask tableplus`

### Clean the local database after testing

```bash
cd worker

# Delete all test emails
wrangler d1 execute movets-email-log --local --command "DELETE FROM emails"

# Delete all test subscribers
wrangler d1 execute movets-email-log --local --command "DELETE FROM subscribers"

# Reset auto-increment counters
wrangler d1 execute movets-email-log --local --command "DELETE FROM sqlite_sequence"

# Or nuke everything and re-init
rm -rf .wrangler/state
npm run db:init:local
```

## 5. Working with the Remote D1 Database

### Query the remote database

```bash
cd worker

# View emails
wrangler d1 execute movets-email-log --command "SELECT * FROM emails ORDER BY created_at DESC LIMIT 10"

# View subscribers
wrangler d1 execute movets-email-log --command "SELECT * FROM subscribers ORDER BY subscribed_at DESC"

# Count by IP
wrangler d1 execute movets-email-log --command "SELECT ip_address, COUNT(*) as cnt FROM emails GROUP BY ip_address ORDER BY cnt DESC"
```

### Clean the remote database

```bash
cd worker

# Delete all emails (careful — production data!)
wrangler d1 execute movets-email-log --command "DELETE FROM emails"

# Delete all subscribers
wrangler d1 execute movets-email-log --command "DELETE FROM subscribers"

# Reset counters
wrangler d1 execute movets-email-log --command "DELETE FROM sqlite_sequence"
```

### Use the dashboard script

```bash
# Set env vars
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export D1_DATABASE_ID="your-d1-id"

# Full dashboard
node scripts/visualize.js

# Export to CSV
node scripts/visualize.js --export-csv
```

## 6. Testing Brevo Email Delivery

### Test with a real Brevo API key

1. Get your API key from Brevo: **Settings > SMTP & API > API Keys**
2. Add it to `worker/.dev.vars` (see section 3)
3. Start the local Worker: `cd worker && npm run dev`
4. Submit the contact form — the email will actually send

### Test without sending real emails

To test the Worker logic without sending emails, you can temporarily modify `worker/src/index.js` to skip the Brevo call:

```js
// Comment out the real send and log instead
// await sendViaBrevo(env.BREVO_API_KEY, { ... });
console.log('WOULD SEND:', { to: repEmail, subject, replyTo: email });
```

### Check Brevo delivery logs

After sending, verify delivery in Brevo:
- **Transactional > Email > Logs** — shows sent/delivered/bounced status
- **Transactional > Email > Statistics** — aggregate delivery rates

### Test the newsletter locally

```bash
# Set env vars (uses remote D1 to fetch subscribers)
export BREVO_API_KEY="your-key"
export D1_DATABASE_ID="your-d1-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Dry run — lists recipients, saves preview HTML
node scripts/send-newsletter.js --subject "Test" --content scripts/newsletter-example.html --dry-run

# Preview the rendered email
open /tmp/newsletter-preview.html
```

## 7. Testing Turnstile CAPTCHA

### Local development with Turnstile

Turnstile works on `localhost` if you added it as a hostname when creating the widget (see Cloudflare dashboard > Turnstile > your widget > Settings > add `localhost`).

### Bypass Turnstile for local testing

Cloudflare provides test keys that always pass or fail:

| Key | Behavior |
|-----|----------|
| Site key: `1x00000000000000000000AA` | Always passes |
| Site key: `2x00000000000000000000AB` | Always blocks |
| Secret key: `1x0000000000000000000000000000000AA` | Always passes |
| Secret key: `2x0000000000000000000000000000000AA` | Always fails |

To use: put the test site key in your HTML and the test secret key in `worker/.dev.vars`. No Cloudflare account needed.

## 8. Testing the Geo-Block

The local Worker doesn't have `request.cf.country` populated (it's `undefined` locally). The geo-block check passes when country is `undefined`:

```js
if (country && country !== 'US') { // undefined passes through
```

This means geo-blocking is only enforced in production on Cloudflare's edge. To test it locally, temporarily hardcode a country:

```js
const country = 'GB'; // simulate non-US request
```

## 9. Full Local Stack

Run everything together:

**Terminal 1 — Static site:**
```bash
make dev
# http://localhost:8080
```

**Terminal 2 — Worker API:**
```bash
cd worker && npm run dev
# http://localhost:8787
```

Update `contact.js` and `subscribe.js` to point at `http://localhost:8787`, then test the full flow:
1. Open http://localhost:8080
2. Go to Take Action
3. Enter a ZIP code, find your rep
4. Fill in the form, complete Turnstile, submit
5. Check the local D1 database for the record
6. Subscribe via the footer form
7. Check the subscribers table

## Troubleshooting

### "CAPTCHA verification failed" locally

- Make sure `worker/.dev.vars` has `TURNSTILE_SECRET_KEY`
- Or use the Cloudflare test keys (section 7)
- Make sure `localhost` is in your Turnstile widget's allowed hostnames

### "Brevo API error" locally

- Check `worker/.dev.vars` has `BREVO_API_KEY`
- Verify your sender domain is verified in Brevo
- Check Brevo's transactional email logs for details

### Worker not picking up changes

- Wrangler hot-reloads on file save, but sometimes needs a restart
- Kill the process and run `npm run dev` again

### Local D1 database is empty after restart

- Local D1 persists in `worker/.wrangler/state/`. If you deleted that folder, re-init: `npm run db:init:local`

### CORS errors in browser console

- The local Worker returns `Access-Control-Allow-Origin: https://movets.org` by default
- For local testing, temporarily change `ALLOWED_ORIGIN` in `wrangler.toml` to `http://localhost:8080`
- Or override in `.dev.vars`: `ALLOWED_ORIGIN=http://localhost:8080`
