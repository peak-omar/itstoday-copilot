# Angleworks

*Spy on winners. Launch better ads. Keep your accounts.*

**Upload a competitor's ad (or start from an offer) → Angleworks reverse-engineers what makes it work, then builds compliant, launch-ready ads for Meta, TikTok, Taboola & Google — each one pre-checked against platform policy so your accounts stay alive.**

> Built for the It's Today Media $5,000 Build Challenge.
> Live demo: _<add your Vercel URL here>_ · Works instantly in demo mode; add an API key for live generation on any real offer.

---

## What this tool does

A media buyer's day starts with a blank canvas and a deadline: take an offer, find an angle, write copy for four platforms that each have their own format and their own landmines, mock up a creative, and — the part everyone forgets until an account gets banned — make sure none of it trips ad policy.

Angleworks does that whole first pass in one click. It has two ways in:

0. **Tear down a competitor's ad *(the centerpiece)*.** Upload a screenshot of a competitor's live ad and Claude's vision reverse-engineers it — the **angle, hook, target emotion, funnel stage, offer, why it works, and its weaknesses** — then generates **"beat-it" angles** engineered to outperform it. This is the buyer's real daily job (mining winners), automated. It's grounded in a real ad, not invented from a blank page.

1. **Or read an offer.** Paste a landing-page URL (or a description) and it scrapes the page and extracts a tight campaign brief — product, value prop, audience, key benefits, and the **compliance-sensitive claims** a regulator or ad platform would scrutinize.
2. **Generates angles, not just copy.** It proposes four genuinely distinct marketing angles — each with its psychological driver (curiosity gap, problem-agitate, fear-of-loss, aspiration) and the platforms it tends to win on. Angles are the unit affiliates actually test; that's the real leverage.
3. **Writes platform-native creatives.** Pick an angle and it produces launch-ready ads for **Meta, TikTok, Taboola, and Google** in parallel — each respecting that platform's real fields and character limits (Meta primary text + headline, a TikTok hook + UGC script, a Taboola curiosity headline, a Google RSA with 3 headlines + 2 descriptions), plus A/B variants, an art-direction brief, and a visual mockup of the ad in context.
4. **Audits its own copy for compliance.** This is the part that protects the business. Every creative is scored (0–100) for policy risk on its platform, with the **exact risky phrase flagged, the specific policy cited, a severity (ad rejected → account ban → permanent ban), and a compliant rewrite that keeps the persuasion.** One click **applies the fix** straight into the copy. There's also a campaign-wide compliance score. Health claims, income promises, before/after framing, misleading authority — the things that get affiliate accounts nuked.
5. **Lets you edit, regenerate, and export.** Every copy field is editable inline, any single creative can be regenerated, and one click per platform downloads a CSV close to what you'd paste into that platform's bulk uploader.

It works like a real tool: **campaign history** is saved locally so you can revisit past offers, and it **degrades gracefully** — with no API key it serves a full sample campaign (a real nutra vertical) so the deployed URL is always clickable and complete.

## Why I built THIS one

Because it sits exactly where an affiliate business makes and loses money.

No experienced media buyer invents angles from a blank page — they start from **what's already winning** and launch a better version before competitors do. So the tool starts there too: tear down a proven competitor ad, then build against it. That's the highest-leverage activity in affiliate, and it's what makes this more than an AI copywriter.

The brief said you advertise at scale across Google, Meta, Taboola and TikTok, and that "this simple process requires immense technical input." The two biggest taxes on a media-buying team are **creative velocity** (you burn through angles and assets faster than humans can produce them) and **compliance risk** (one bad phrase and a profitable account is gone overnight). Most tools help with one. I wanted the tool that does the daily grind *and* has the account-safety instinct baked into every output — because a buyer shouldn't have to choose between "persuasive" and "won't get me banned."

I also deliberately avoided "a dashboard." A reporting dashboard is the obvious build, it's crowded, and it can't be demoed without your live spend data. Creative Ops Copilot delivers real value from a single public URL — nothing about the demo depends on access I don't have. It shows judgment work an AI can genuinely do: angle strategy, platform-native copywriting, and policy reasoning.

## What I'd build next (if this were my full-time job)

This is the seed of a full **creative operating system** for the buying team:

- **Close the loop with performance data.** Connect the ad-platform APIs (Meta/Google/TikTok/Taboola) so the tool learns which *angles and hooks actually convert* for our offers, then biases generation toward proven winners — and auto-flags creative fatigue before CTR craters.
- **Real creative generation.** Wire in image + video models (drop-in already scaffolded) to produce the actual thumbnails and UGC-style video cuts from the art-direction briefs, not just concepts.
- **A living compliance engine.** Replace static policy heuristics with a continuously-updated rulebook per platform (and per vertical: nutra, finance, biz-opp), trained on our own historical rejections and account strikes — so it gets sharper every time a real ad gets flagged.
- **One-click launch.** Push approved, compliant creatives straight into ad accounts as paused drafts via MCP connectors, so the path from "offer" to "ready-to-launch campaign" is genuinely one screen.
- **Landing-page arm.** Extend the same brief into on-brand, compliant landing pages with lead capture — matching the ad's angle end to end.

The throughline: **more winning creative, shipped faster, without losing accounts.** That's the needle.

---

## Tech & architecture

- **Next.js 16 (App Router) + TypeScript + Tailwind 4**, deployed on Vercel.
- **Anthropic Claude** as the reasoning engine, called via **forced tool-use** so every response is schema-valid JSON — no brittle parsing (`src/lib/anthropic.ts`).
- Clear separation of concerns:
  - `src/lib/platforms.ts` — platform specs: copy fields, char limits, and the policy themes that most often flag affiliate ads. This one file drives both generation and the compliance audit, so adding a platform is a single object.
  - `src/lib/prompts.ts` — the marketing intelligence: brief/angle extraction and the per-platform "write it, then audit your own copy" creative prompt.
  - `src/lib/scrape.ts` — offer-page scraping (Cheerio) reduced to the signal Claude needs.
  - `src/app/api/analyze` + `src/app/api/creatives` — two thin routes; creatives fan out one Claude call per platform in parallel, and the creatives route accepts a platform subset so a single card can be regenerated.
  - `src/components/*` — presentational, reusable UI (app shell, brief, angle cards, per-platform creative cards with live mockups, editable copy + apply-fix compliance panels, progress stepper).
  - `src/lib/history.ts` — localStorage-backed campaign history so the app has memory across sessions.
- **Graceful degradation** (`src/lib/demo.ts`): no `ANTHROPIC_API_KEY` → a full sample campaign; with a key → live generation from any offer.

## Run it locally

```bash
npm install
cp .env.example .env.local     # add your ANTHROPIC_API_KEY (optional — demo mode works without)
npm run dev                    # http://localhost:3000
```

- No key? It runs in **demo mode** with a complete sample campaign.
- With a key, paste any offer/landing-page URL and generate live.
- Get a key at [console.anthropic.com](https://console.anthropic.com); a few dollars covers heavy testing.

## Deploy

Push to GitHub and import into Vercel. Set `ANTHROPIC_API_KEY` in the Vercel project's environment variables for live generation (leave it unset to ship the demo). No other config required.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Optional | Enables live generation. Unset → demo mode. |
| `CREATIVE_MODEL` | Optional | Override the model (defaults to `claude-sonnet-5`). |
