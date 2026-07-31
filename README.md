# Swipe the flat

A personal app for kitting out a ground floor flat in Wandsworth. 70 things,
three options each (thrifty / sensible / splurge), one card at a time. Swipe
left for the next option, right to put it in the basket.

Product photos and prices are resolved **once, at build time**, by a scraper
that writes a local data file and caches the images. The app itself does no
lookup at runtime.

## Running it

```bash
npm install
npm run scrape:probe   # prove the scraper works before scaling to 210
npm run scrape         # resolve all 210 options (~10-20 min)
npm run dev            # http://localhost:5173
```

The app works fine before you scrape — every card falls back to a hand-drawn
icon and the estimated price, which is enough to make decisions with. Photos
just make it nicer.

| Command | What it does |
| --- | --- |
| `npm run dev` | The app on `/`, the scrape review on `/review.html` |
| `npm run scrape` | Resolve products, cache images, write `products.json` |
| `npm run scrape:probe` | Resolve one product per retailer and print what parsed |
| `npm run scrape:sample` | Score a spread of options to measure the real hit rate |
| `npm run scrape:reset` | Throw away `products.json` and start over |
| `npm run build` | Production build of both pages |
| `npm test` | Parser and matching tests against fixtures, no network |

## Start with the probe

`npm run scrape:probe` fetches one IKEA product page and one John Lewis
product page and prints exactly what came back: whether a JSON-LD `Product`
node was there, which rung of the ladder produced each field, and the parsed
image, price and name. It then runs a full search-to-product lookup for one
real title at each retailer.

Run it before the full scrape. If it says the approach holds, run the scrape.
If something did not resolve, the output shows which step failed and is worth
pasting back rather than guessing.

**John Lewis turned out not to need a browser.** A plain fetch gets through
and the product pages carry JSON-LD, so the Playwright fallback is there for
insurance rather than routine use. If a page ever does come back `403`/`429`
the scraper escalates automatically and says so in the log; install the
browser first if you want that rung available:

```bash
npx playwright install chromium
```

John Lewis is still the bulk of the work — 136 of the 210 options against
IKEA's 74 — but the risk there is picking the *wrong* product, not being
locked out. See matching below.

## Measuring the hit rate

`npm run scrape:sample` runs a spread of options across both retailers, all
rooms and all three tiers, printing wanted against resolved with the score.
It writes nothing and downloads no images, so it is safe to re-run while
tuning. Use it to decide whether a matching problem is worth chasing before
committing to a full 15-minute scrape.

It groups results four ways:

- **✓ strong** — confident match, score ≥ 0.70
- **~ weak** — resolved but worth eyeballing
- **✗ rejected** — found something plausible but too different to trust
- **· nothing** — no candidate at all

A pile of *rejected* results at John Lewis usually means the titles in
`items.js` are descriptions rather than real listings — "ANYDAY sensor bin
45L" is a reasonable thing to want but may not be a product John Lewis
actually sells. The fix for that is renaming those options to real products,
not loosening the matching.

## How the scraper works

For each option it runs a ladder and records every rung, so a failure tells
you where it fell over rather than just that it did:

- **IKEA** — the JSON search endpoint the website itself calls, which returns
  name, image and price in one hop. Falls back to scraping product links off
  the HTML search page, then reading JSON-LD off the product page.
- **John Lewis** — product links off the search page, then JSON-LD (or
  `og:image` / `product:price:amount`) off the product page.
- **Either** — if a page returns 403/429, retry it in a headless browser.

Candidates are scored against the wanted title by word overlap, plus a bonus
for an exact IKEA article-name match (`KNODD`, `VÖRDA`) and two penalties that
word overlap alone misses:

- **Lead token.** The first meaningful word is nearly always the brand or
  range. A candidate without it is a different product line — which is how
  "ANYDAY sensor bin 45L" was resolving to an EKO bin on shared words alone.
- **Size.** 45L against 50L, or 16 piece against 24 piece, is the wrong
  variant even when every other word agrees. Units are normalised first, so
  `40 l`, `40L` and `40 litres` compare as the same size.

For John Lewis the scraper opens the top few candidates and keeps the
**best-scoring resolved product**, rather than the first one over the
threshold — the search page returns eight near-identical bins and the right
one does not reliably sort first. Anything below 0.6 is flagged as a weak
match in the log and on the review page.

It is **resumable**: anything already in `products.json` with its image still
on disk is skipped, so you can stop it and rerun without redoing work. It
rate limits to one request per second and prints a summary at the end —
how many resolved, how many failed, and which ones.

Useful flags:

```bash
npm run scrape -- --retailer=IKEA     # one retailer only
npm run scrape -- --only=bin          # one item (or bin:0 for one option)
npm run scrape -- --limit=10          # first N unresolved
npm run scrape -- --force             # redo even if already resolved
npm run scrape -- --rate=2000         # slow it down
```

## Fixing what it got wrong

Open `/review.html`. Every option is listed with what was wanted on the left
and what the scraper resolved on the right, filtered by status — weak matches
and failures first.

Rejected near-misses are kept rather than thrown away. The scraper records
what it found and why it refused it, and the review page shows it with a
**USE THIS ONE** button — one click if the substitute is actually fine. These
never reach a swipe card on their own; only your acceptance promotes them.

When one is wrong: open the retailer, find the right product, paste its URL
into the box on that row. The page builds the corrected `overrides.json` at
the bottom; copy it over `src/data/overrides.json` and re-run the scrape.
The scraper resolves that exact page instead of searching for it.

An override can set any of `sourceUrl`, `name`, `price`, `image`,
`localImage`. Only the keys you set win, so a partial override does not blank
out fields the scraper got right.

```json
{
  "bin:2": { "sourceUrl": "https://www.johnlewis.com/.../p3182495" },
  "knives:2": { "name": "Robert Welch Signature Knife Block", "price": 180 }
}
```

**`overrides.json` is only ever read by the scraper, never written to**, so
corrections survive every re-scrape.

## Layout

```
src/
  SwipeTheFlat.jsx     the swipe UI
  Review.jsx           the scrape review page
  theme.js             design tokens, shared by both
  data/
    items.js           the 70 items and 210 options — the source of truth
    icons.jsx          hand-drawn SVG fallbacks, one per item
    products.json      written by the scraper. Do not hand-edit
    overrides.json     your corrections. The scraper never writes here
    products.js        merges the two for the app
scripts/
  fetch-products.mjs   the scraper
  probe.mjs            the one-product-per-retailer spike
  test-parsers.mjs     fixture tests, no network
  lib/                 parsing, HTTP, browser fallback, retailer adapters
public/products/       cached images, gitignored
```

Choices persist to `localStorage` under `flatswipe:v1`.

## Notes

- **Prices go stale.** The scraper resolves them at build time. Re-run it the
  week you actually order. A price shown with a small `EST` is the estimate
  from `items.js`, not something scraped.
- Cached images are for personal use and are gitignored, not redistributed.
  `products.json` is committed, so a fresh clone has the data but no image
  files — re-running the scraper re-downloads only what is missing.
- The request rate is deliberately polite. Leave it that way.
