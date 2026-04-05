# Market Research: Promoting MoVets.org to Missouri Veterans

_Research date: 2026-04-05_

## 1. Executive Summary

Missouri has ~341,000 veterans (~7% of the adult population) — a large, well-organized, and highly concentrated audience on Facebook (VFW/American Legion posts), Reddit (r/Missouri, r/Veterans), and local community groups. The site's goal (rallying support for HB2089) can be promoted reliably via a **low-cost scheduler (Buffer or Publer free tier) + a simple RSS/webhook auto-poster** — no custom scraping or fragile APIs required.

**⚠ Important finding that affects strategy:** HB2089's sibling legislation (HB552/HB921/SJR88) has already **gained bipartisan support and is on track for implementation January 1, 2027** — it may appear on the 2026 Missouri ballot as a constitutional amendment. The messaging window is shifting from *"tell your rep to support it"* to *"vote YES on the ballot measure"* and *"here's how to claim your exemption"*. Confirm bill status before launching any campaign.

---

## 2. Key Findings

### Audience (Missouri Veterans)
- **~341,191 veterans** in Missouri (~7.1% of adults)
- **~227,000 veteran-occupied homes** — the directly-addressable HB2089 audience
- **~546 homeless veterans** (not the target for this ask)
- Geographic concentration: St. Louis metro, Kansas City metro, Springfield, Columbia, Jefferson City

### Where MO Veterans Are Online
| Channel | Why it matters |
|---|---|
| **Facebook** — VFW posts, American Legion Dept. of Missouri, local post pages | Highest concentration of older veterans (the group most affected by property tax burden) |
| **Missouri Veterans Commission social groups directory** (veteranbenefits.mo.gov/social-groups/) | Official state-maintained list — pre-vetted channels |
| **Reddit** — r/Missouri, r/Veterans, r/VeteransBenefits | Younger, policy-engaged veterans |
| **Nextdoor** — neighborhood-level | Homeowner veterans specifically |
| **X / Threads** | Political engagement, reaching legislators |

### HB2089 Legislative Context (as of 2026)
- Provides property tax exemption tiered by VA disability rating:
  - 30–50% → $2,500 annual exemption
  - 50–70% → $5,000 annual exemption
  - 70%+ → 100% property tax exemption
- Home value cap: $250,000
- Surviving spouses receiving DIC also qualify
- Effective date: **January 1, 2027**
- Likely companion ballot measure in November 2026 (Ballotpedia: "Missouri Property Tax Exemptions for Disabled Veterans Amendment (2026)")

### Automation Tool Landscape
| Tool | Best for movets.org | Cost |
|---|---|---|
| **Buffer** (free tier) | Simple, 3 channels, 10 scheduled posts — perfect for a single-issue advocacy site | Free |
| **Publer** (free tier) | 3 channels, 10 scheduled posts, **includes RSS auto-posting** | Free |
| **Make.com / n8n** | Build a "new blog post / new legislative update → auto-post everywhere" pipeline | Free tier sufficient |
| **Hootsuite** | Overkill unless you add team members | $$ |

---

## 3. Recommendation: Automation Architecture

**Don't pay for a SaaS suite.** For a single-issue, single-operator advocacy site, use this free stack:

```
  movets.org (new page/news/bill update)
           │
           ▼
     RSS feed  ◄── add /rss.xml to the static site
           │
           ▼
  ┌────────────────┐        ┌──────────────────────┐
  │  Publer (free) │   OR   │  Make.com scenario   │
  │  RSS → FB/X/LI │        │  RSS → FB/X/LI/Reddit│
  └────────────────┘        └──────────────────────┘
```

### Concrete Plan (in order of effort)

**Step 1 — Content foundation (1 day)**
- Add an `rss.xml` feed to the static site. The sitemap generator already exists; add a minimal RSS generator in the same build step. This becomes the trigger for everything downstream.
- Create a `/news/` directory with 6–10 pre-written posts: bill status updates, "how the exemption works," veteran testimonials, representative spotlights, ballot measure explainer.

**Step 2 — Pick ONE scheduler (30 min)**
- **Publer free** (recommended) — connects to Facebook Page, X, LinkedIn, Threads, Bluesky; supports RSS auto-posting natively. No code.
- Alternative: **Buffer free** — simpler UI, no RSS on free tier (paste manually).

**Step 3 — Create official accounts (1 hour)**
Create: Facebook Page "MoVets.org", X @movetsorg, LinkedIn Page, Threads, Bluesky. Use the existing OG image.

**Step 4 — Seed the posting calendar (2 hours)**
Load 4 weeks of posts into Publer:
- 2×/week: bill education posts
- 1×/week: "find your rep" (link to take-action page)
- 1×/week: statistics/impact post
- Ad-hoc: legislative updates

**Step 5 — Organic distribution (ongoing, not automated)**
This is where actual reach comes from. Automation does not replace this:
- Post the link in VFW Post and American Legion Post Facebook groups (manual — they ban auto-posters)
- Cross-post to r/Missouri with a disclosure
- Email VFW Dept. of Missouri and American Legion Dept. of Missouri directly asking for a share
- Submit to Missouri Veterans Commission's social groups directory

**Step 6 — Optional: Make.com pipeline (if full automation is wanted)**
Scenario: `RSS trigger → Format post for each platform → Facebook/X/LinkedIn/Reddit modules`. Free tier (1,000 operations/month) is plenty for this volume.

---

## 4. Risks & Caveats

| Risk | Mitigation |
|---|---|
| **Bill may already be law** — rallying support becomes moot | Verify HB2089 status on house.mo.gov before launching. Pivot messaging to ballot measure support and exemption claim instructions if needed. |
| **Facebook groups ban link-drop automation** | Never auto-post to groups. Only auto-post to your own Page. Group outreach must be manual and relationship-based. |
| **Reddit auto-posting = instant ban** | Post manually to r/Missouri with genuine context. Don't use automation here. |
| **X/Meta API changes break auto-posters regularly** | Publer/Buffer absorb this for you — another reason not to build custom code. |
| **Single-issue sites get low engagement** | Add human-interest content (veteran stories, local post spotlights) — not just bill asks. |
| **Data is 2023-vintage** | 341k veteran figure is USAFacts/VA 2023. Directionally correct; don't quote precisely. |

---

## 5. Decision

**Do this:**
1. **First — verify HB2089's current legislative status this week.** The whole messaging strategy depends on whether it's still pending, signed, or heading to 2026 ballot.
2. Add an RSS feed to the static site (small code change in the existing build pipeline).
3. Create a Publer free account, connect Facebook Page + X + LinkedIn, point it at the RSS feed.
4. Spend the *real* effort on manual outreach to VFW Dept. of Missouri, American Legion Dept. of Missouri, and the MVC social groups directory — that's where the audience actually lives.

**Don't do this:**
- Don't pay for Hootsuite/Sprout — overkill.
- Don't build a custom scraper/poster — the platform APIs change too often.
- Don't auto-post to Facebook groups or Reddit — you'll get banned.

---

## Sources

- [Missouri Veterans Statistics — USAFacts](https://usafacts.org/topics/veterans/state/missouri/)
- [VA Missouri State Summary](https://www.data.va.gov/stories/s/State-Summaries_Missouri/ggvb-7ke9/)
- [Missouri Veteran Tax Relief Plan Gains Bipartisan Support — Missourinet](https://www.missourinet.com/2026/02/20/missouri-veteran-tax-relief-plan-gains-bipartisan-support/)
- [HB552 — Missouri Disabled Veterans' Homestead Exemption](https://senate.mo.gov/25info/BTS_Web/Bill.aspx?SessionType=R&BillID=18266318)
- [Missouri Property Tax Exemptions for Disabled Veterans Amendment (2026) — Ballotpedia](https://ballotpedia.org/Missouri_Property_Tax_Exemptions_for_Disabled_Veterans_Amendment_(2026))
- [MO HB2089 — BillTrack50](https://www.billtrack50.com/billdetail/1913772)
- [Missouri Veterans Commission — Social Groups Directory](https://veteranbenefits.mo.gov/social-groups/)
- [American Legion Department of Missouri — Facebook](https://www.facebook.com/missourilegion/)
- [Social Media Automation Tools 2026 — Publer](https://publer.com/blog/social-media-automation/)
- [Best Social Media Management Tools 2026 — Buffer](https://buffer.com/resources/best-social-media-management-tools/)
- [11 Best Social Media Automation Tools — Hostinger](https://www.hostinger.com/tutorials/best-social-media-automation-tools)
