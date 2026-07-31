# Swipe the flat

A personal app for kitting out a ground floor flat in Wandsworth. 70 things,
three options each (thrifty / sensible / splurge), one card at a time. Swipe
left for the next option, right to put it in the basket.

Product photos and prices are resolved **once, at build time**, by a scraper
that writes a local data file and caches the images. The app itself does no
lookup at runtime.

The point is a card with a real photo and a real price to decide against. An
exact match is the goal, but a sensible alternative beats a drawing — so the
scraper never rejects a product for being merely inexact. It resolves the
nearest real thing and the card says so.

## Running it

```bash
npm install
npm run scrape:probe   # prove the scraper works before scaling to 210
npm run scrape         # resolve all 210 options (~10-20 min)
npm run dev            # http://localhost:5173
```

Recent npm versions block packages from running install scripts unless
approved. `esbuild` and `sharp` both need theirs — esbuild to place its
platform binary, sharp to check its own — so the approval is committed in
`package.json` under `allowScripts`. If npm still warns, run
`npm approve-scripts esbuild sharp` and `npm install` once more.

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
  range. A candidate leading with a *different* brand is penalised hard; one
  that merely drops a sub-brand while still leading with a word you asked for
  ("John Lewis Beech Chopping Board" vs "John Lewis ANYDAY beech chopping
  board") only gets a nudge.
- **Size.** 45L against 50L, or 16 piece against 24 piece, is the wrong
  variant even when every other word agrees. Units are normalised first, so
  `40 l`, `40L` and `40 litres` compare as the same size.

The scraper opens the top few candidates and keeps the **best-scoring resolved
product** rather than the first one over a threshold — search pages return
eight near-identical bins and the right one does not reliably sort first.

Nothing is discarded for scoring low. The result carries a quality band
instead:

| Band | Score | What the card shows |
| --- | --- | --- |
| **exact** | ≥ 0.70 | the product as named |
| **close** | ≥ 0.45 | the product, plus `CLOSEST TO <what you asked for>` |
| **substitute** | > 0 | the product, plus `STAND-IN FOR <what you asked for>` in red |
| *(none)* | — | the hand-drawn icon and your estimated price |

So a card almost always has a photo and a live price, and you always know
whether it is the thing you named. `npm run scrape:sample` reports the mix.

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

Filter by **Stand-in** to see everything the scraper substituted, and by
**Close** for likely variants. Both have photos and real prices and are
perfectly usable — the filters exist so you can upgrade the ones you care
about, not because they are broken.

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

## Adding a retailer

Add an entry to `src/data/retailers.js`:

```js
Argos: {
  name: "Argos",
  searchUrl: (q) => `https://www.argos.co.uk/search/${encodeURIComponent(q)}/`,
  productUrl: /argos\.co\.uk\/product\/\d+/i,
},
```

Then use that `name` as the retailer string on any option in `items.js`. That
is the whole job — the scraper builds an adapter from the config, the app
picks up the search links, and the receipt groups by it automatically.

The generic adapter is search page → product links → JSON-LD, which is how
nearly every retailer works. Only add a `strategy` if a site needs something
else; IKEA has one because it publishes a JSON search endpoint that answers in
a single request. A couple of ready-made examples sit commented out in the
file.

If a new retailer blocks plain requests, the headless-browser rung kicks in
automatically — `npx playwright install chromium` to have it available.

## Layout

```
src/
  SwipeTheFlat.jsx     the swipe UI
  Review.jsx           the scrape review page
  theme.js             design tokens, shared by both
  data/
    items.js           the 70 items and 210 options — the source of truth
    retailers.js       where things can be bought; add a shop here
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
