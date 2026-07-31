# Swipe the flat

A personal app for kitting out a ground floor flat in Wandsworth. 70 things,
three options each (thrifty / sensible / splurge), one card at a time. Swipe
left for the next option, right to put it in the basket.

Product photos and prices are resolved **once, at build time**, by a scraper
that writes a local data file and caches the images. The app itself does no
lookup at runtime.

Every card is a real product with a real photo and a live price. An exact
match is the goal, but a sensible alternative is a good outcome — the scraper
resolves the nearest real thing and the card says so. **An option with no
photo is not shown at all**, and an item where nothing resolved drops out of
the list entirely.

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

There is nothing to swipe until you scrape — the app shows only options that
resolved to a real photo.

| Command | What it does |
| --- | --- |
| `npm run dev` | The app on `/`, the scrape review on `/review.html` |
| `npm run dev:mobile` | Same, but reachable from your phone on the same wifi |
| `npm run scrape` | Resolve products, cache images, write `products.json` |
| `npm run scrape:probe` | Resolve one product per retailer and print what parsed |
| `npm run scrape:sample` | Score a spread of options to measure the real hit rate |
| `npm run scrape:doctor` | Why are photos missing? Add `-- --fix` to repair them |
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
- **IKEA article names** (`KNODD`, `VÖRDA`) act as a floor, not a bonus, and
  only at IKEA. They prove the right *range*, not the right *variant* — a
  GRILLSKÄR gas barbecue is not a GRILLSKÄR charcoal one — and the pattern
  "leading capitals" would otherwise hand the same credit to `OXO` and `LED`
  at other shops.
- **Size.** 45L against 50L, or 16 piece against 24 piece, is the wrong
  variant even when every other word agrees. Units are normalised first, so
  `40 l`, `40L` and `40 litres` compare as the same size.
- **Head noun.** The last meaningful word or two is what the thing *is* —
  bin, fryer, lamp. A candidate missing it is not a variant, it is a
  different kind of object. Without this a set of towels stood in for a
  sensor bin and a steam iron for an air fryer, both scoring on shared
  adjectives alone.
- **Price.** An order-of-magnitude gap from the estimate in `items.js` is
  strong evidence the wrong variant was picked — "Smeg 50s Retro TSF01" and
  "Smeg Dolce & Gabbana TSF01DGBUK" share a model number and nearly every
  word, but one is £170 and the other £599. This only demotes, so a bad
  estimate cannot block a good match when there is nothing better.

Anything scoring below `MINIMUM` (0.12) is discarded rather than offered as a
substitute. Inexact is fine; unrelated is not.

The scraper opens the top few candidates and keeps the **best-scoring resolved
product** rather than the first one over a threshold — search pages return
eight near-identical bins and the right one does not reliably sort first.

Nothing is discarded for scoring low. The result carries a quality band
instead:

| Band | Score | What the card shows |
| --- | --- | --- |
| **exact** | ≥ 0.70 | the product as named |
| **close** | ≥ 0.55 | the product, plus `CLOSEST TO <what you asked for>` |
| **substitute** | > 0 | the product, plus `STAND-IN FOR <what you asked for>` in red |
| *(none)* | — | nothing — the option is left out of the app |

So every card has a photo and a live price, and you always know whether it is
the thing you named. `npm run scrape:sample` reports the mix.

### Photos that would not download

Retailer CDNs often refuse server-side fetches with a `403` while serving the
same image happily to a browser. When a download fails the scraper keeps the
retailer's own URL, and the app falls back to it — so the photo still appears,
it just loads from their server instead of from disk.

`npm run scrape:doctor` reports how many are in that state and re-tries a few
to show the real HTTP error. `npm run scrape:doctor -- --fix` retries every one
and caches whatever now works, without redoing any searching.

### Comparing the options

Each card carries a strip of every option for that item — photo, tier and
price — so the three can be compared side by side rather than remembered
across swipes. Tapping one jumps straight to it; swiping left still walks them
in order.

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

## Shopping across several shops

Each option in `items.js` names a retailer, but that is a preference rather
than a constraint. If the named shop has nothing good — not stocked, or only a
poor stand-in — the scraper tries the others and keeps the best result across
all of them. A better product from Argos beats a worse one from John Lewis.

It stops as soon as it finds an `exact` match, so a well-named product still
costs one shop's worth of requests. Options sourced elsewhere are marked, and
the card, the receipt and the review filters all show the shop that actually
supplied the product.

Configured shops: **IKEA, John Lewis, Argos, Dunelm, Amazon**.

Amazon is deliberately excluded from automatic fallback (`fallback: false` in
`retailers.js`). It detects and blocks automated requests aggressively and its
terms disallow scraping, so the scraper will not reach for it on its own — it
is only used if an option names it directly, and will likely need the
Playwright rung even then.

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
  lib/
    xlsx.js            writes a real .xlsx with no spreadsheet library
    basketSheet.js     lays the basket out as rows and totals
scripts/
  fetch-products.mjs   the scraper
  probe.mjs            the one-product-per-retailer spike
  test-parsers.mjs     fixture tests, no network
  lib/                 parsing, HTTP, browser fallback, retailer adapters
public/products/       cached images, gitignored
```

Choices persist to `localStorage` under `flatswipe:v2` as you swipe — there is
nothing to press to save them.

## Using it on a phone

```bash
npm run dev:mobile
```

Vite prints a **Network** address alongside the local one, something like
`http://192.168.1.42:5173/`. Type that into your phone's browser while it is
on the same wifi as the PC. Add it to the home screen and it behaves like an
app.

Two things to know:

- The PC has to stay awake with the command running — close the terminal and
  the phone loses it.
- Choices live in `localStorage`, which is **per device**. Swiping on the
  phone does not update the basket on the PC. Do a run in one place and
  export the spreadsheet at the end.

Windows will likely pop up a firewall prompt the first time. Allow it on
private networks; there is no need to allow public ones.

For access without the PC running, `npm run build` produces a plain static
site in `dist/` that any host will serve.

## Getting the basket out

The finish screen has **Save as a spreadsheet**, which downloads a real
`.xlsx`: one row per thing to buy with room, product name, shop, price,
whether that price was scraped or estimated, and a clickable link. Rows are
grouped by shop with a subtotal each and a grand total at the bottom.

The totals are live `=SUM()` formulas rather than baked numbers, so editing a
price in Excel updates them.

The file is written by hand in `src/lib/xlsx.js` — an xlsx is a zip of XML
parts, so the only dependency is `fflate` for the zipping. That keeps the
bundle small and avoids the known vulnerabilities in the popular spreadsheet
libraries.

There is also **Copy the list as text** for pasting into a message.

## Notes

- **Prices go stale.** The scraper resolves them at build time. Re-run it the
  week you actually order. A price shown with a small `EST` is the estimate
  from `items.js`, not something scraped.
- Cached images are for personal use and are gitignored, not redistributed.
  `products.json` is committed, so a fresh clone has the data but no image
  files — re-running the scraper re-downloads only what is missing.
- The request rate is deliberately polite. Leave it that way.
