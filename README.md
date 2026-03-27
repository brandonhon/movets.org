# MoVets.org

A multi-page static website supporting Missouri HB2089 — the Disabled Veterans Homestead Exemption. Helps Missouri veterans find their state representative and voice their support for the bill.

Designed after the [Politician X Webflow template](https://politiciantemplate.webflow.io/home) with a modern, professional political aesthetic.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero, stats, bill benefits, how-to-help, CTA |
| The Bill | `about-bill.html` | Detailed HB2089 info, key provisions, quick facts |
| Take Action | `take-action.html` | Interactive district map + contact form |
| About | `about.html` | Mission, values, why it matters |
| Contact | `contact.html` | General contact form + rep lookup |

## Features

- **Interactive district map** — All 163 Missouri House districts colored by party (R/D), with rep info popups
- **ZIP-to-district lookup** — Geocodes ZIP via Nominatim + Census reverse geocoder
- **Contact form** — Sends messages via AWS SES backend (Lambda + API Gateway)
- **Responsive design** — Sticky nav, mobile hamburger menu, fluid layout
- **Politician X design system** — `#FF344C` / `#26385E` color scheme, Inter font, pill buttons, card UI

## Tech Stack

- **Frontend:** HTML, Tailwind CSS v3, vanilla JavaScript, Inter font
- **Mapping:** Leaflet.js with Census TIGER/Line GeoJSON boundaries (simplified to ~440KB)
- **Backend:** AWS Lambda + API Gateway + SES (SAM template included)
- **ZIP lookup:** Nominatim (OpenStreetMap) + Census geocoder + client-side point-in-polygon fallback

## Quick Start

```bash
npm install
npm run build          # Build Tailwind CSS
npm run dev            # Watch mode for development
npx serve .            # Local server at http://localhost:3000
```

## Project Structure

```
.
├── index.html                     # Home page
├── about-bill.html                # About the Bill page
├── take-action.html               # Take Action (map + contact form)
├── about.html                     # About MoVets.org
├── contact.html                   # Contact page
├── css/
│   ├── style.css                  # Custom theme (Politician X inspired)
│   └── styles.css                 # Tailwind build output (generated)
├── js/
│   ├── contact.js                 # Contact form handler
│   ├── map.js                     # Leaflet map with GeoJSON districts
│   └── zip-lookup.js              # ZIP-to-district lookup (Nominatim + Census)
├── data/
│   └── mo-house-districts.geojson # District boundaries + rep data (generated)
├── lambda/
│   └── send-email/
│       └── index.mjs              # AWS Lambda email handler
├── scripts/
│   └── merge-reps.js              # Merge rep data into GeoJSON boundaries
├── template.yaml                  # AWS SAM template for backend
├── tailwind.css                   # Tailwind input file
├── tailwind.config.js             # Tailwind config (Politician X color system)
└── package.json
```

## Design System

Based on the [Politician X style guide](https://politiciantemplate.webflow.io/utility-pages/style-guide):

| Token | Value | Usage |
|-------|-------|-------|
| Primary 1 | `#FF344C` | CTAs, accents, Republican districts |
| Primary 2 | `#26385E` | Nav, headings, Democrat districts |
| Secondary 1 | `#FFEFF1` | Light pink tags/badges |
| Secondary 2 | `#DC1E35` | Hover states |
| Neutral 800 | `#0E121E` | Body text, footer bg |
| Neutral 600 | `#717379` | Muted text |
| Font | Inter | All text (400–800 weights) |
| Buttons | Pill shape | `border-radius: 80px` |
| Cards | 16px radius | `border: 1px solid #E0E2E7` |

## Backend Setup (AWS SES)

```bash
# 1. Verify domain
aws ses verify-domain-identity --domain movets.org

# 2. Deploy
sam build && sam deploy --guided

# 3. Update API URL in js/contact.js
# Replace YOUR_API_GATEWAY_URL with the ApiUrl output
```

See [template.yaml](template.yaml) for full SAM configuration.

## Updating District Data

```bash
# Edit reps in scripts/merge-reps.js, then:
node scripts/merge-reps.js
npm run build
```

## Deployment

Static site — deploy to GitHub Pages, Netlify, Vercel, or AWS S3 + CloudFront.

Run `npm run build` before deploying to generate `css/styles.css`.

## License

ISC
