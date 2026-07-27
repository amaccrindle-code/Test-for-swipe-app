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
| `npm run scrape:probe` | Fetch one product page per retailer and print what parsed |
| `npm run scrape:reset` | Throw away `products.json` and start over |
| `npm run build` | Production build of both pages |
| `node scripts/test-parsers.mjs` | Parser tests against fixtures, no network |

## Start with the probe

`npm run scrape:probe` fetches one IKEA product page and one John Lewis
product page and prints exactly what came back: whether a JSON-LD `Product`
node was there, which rung of the ladder produced each field, and the parsed
image, price and name. It then runs a full search-to-product lookup for one
real title at each retailer.

Run it before the full scrape. If it says the approach holds, run the scrape.
If something did not resolve, the output shows which step failed and is worth
pasting back rather than guessing.

**John Lewis is the hard half** — 136 of the 210 options, against IKEA's 74.
If plain fetch gets blocked there, install the browser fallback:

```bash
npx playwright install chromium
```

The scraper escalates to a headless browser automatically for pages that come
back `403`/`429`, and says so in the log when it does.

## How the scraper works

For each option it runs a ladder and records every rung, so a failure tells
you where it fell over rather than just that it did:

- **IKEA** — the JSON search endpoint the website itself calls, which returns
  name, image and price in one hop. Falls back to scraping product links off
  the HTML search page, then reading JSON-LD off the product page.
- **John Lewis** — product links off the search page, then JSON-LD (or
  `og:image` / `product:price:amount`) off the product page.
- **Either** — if a page returns 403/429, retry it in a headless browser.

Candidates are scored against the wanted title by word overlap, with a bonus
for an exact IKEA article-name match (`KNODD`, `VÖRDA`). Anything scoring
below 0.6 is flagged as a weak match in the log and on the review page.

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
