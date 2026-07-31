/* ────────────────────────────────────────────────────────────
   Retailer adapters.

   Each adapter turns a wanted product title into one resolved product:
   page URL, image URL, price and exact name. Both follow the same
   ladder, and every rung is recorded in `tried` so the probe and the
   failure log can show exactly where a lookup fell over.

     IKEA        search API (name + image + price in one hop)
                 → search page HTML → product page JSON-LD
     John Lewis  search page HTML → product page JSON-LD
                 → headless browser for either, when blocked

   Nothing here writes to disk. fetch-products.mjs owns all state.
   ──────────────────────────────────────────────────────────── */

import { fetchJson } from "./net.js";
import { getPage } from "./page.js";
import { extractProduct, links, urlsInSource } from "./parse.js";

export const IKEA = "IKEA";
export const JL = "John Lewis";

/* ── Matching ─────────────────────────────────────────────── */

const STOP = new Set([
  "the", "a", "an", "and", "of", "for", "with", "in", "set", "pack", "john", "lewis",
]);

/* Units get folded onto their number so "40 l", "40L" and "40 litres"
   all become the one token "40l" — a size mismatch is one of the
   clearest signals that a candidate is the wrong product. */
const UNIT = { litres: "l", litre: "l", ltr: "l", l: "l", cm: "cm", mm: "mm", pieces: "pc", piece: "pc", pcs: "pc", pc: "pc" };
const UNIT_RE = /(\d+)\s*(litres|litre|ltr|l|cm|mm|pieces|piece|pcs|pc)\b/g;

function normalise(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9åäöéø\s]/g, " ")
    .replace(UNIT_RE, (_, n, u) => n + UNIT[u]);
}

function tokens(str) {
  return normalise(str)
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

const SIZE_RE = /^\d+(l|cm|mm|pc)$/;
const sizes = (list) => list.filter((t) => SIZE_RE.test(t));

/* How well does a candidate product name match what we asked for?
   0 → nothing in common, 1 → every meaningful word accounted for.

   Word overlap alone is not enough. "ANYDAY sensor bin 45L" and "EKO
   Deluxe Mirage Sensor Bin 50L" share two words out of four and score
   0.50, but they are different products at different prices. So two
   penalties sit on top:

     lead token  the first meaningful word is almost always the brand or
                 range (ANYDAY, Brabantia, KNODD). A candidate missing it
                 is a different product line.
     size        45L against 50L, or 16 piece against 24 piece, is the
                 wrong variant even when every other word agrees. */
export function matchScore(candidateName, wantedTitle) {
  const want = tokens(wantedTitle);
  const gotList = tokens(candidateName);
  const got = new Set(gotList);
  if (!want.length || !got.size) return 0;

  let score = want.filter((t) => got.has(t)).length / want.length;

  const article = ikeaArticleName(wantedTitle);
  if (article && got.has(article.toLowerCase())) score = Math.min(1, score + 0.4);

  /* A missing lead token means one of two very different things.

     If the candidate leads with some other brand — ANYDAY wanted, EKO
     offered — it is a different product line and the penalty is harsh.
     If it just omits a sub-brand while still leading with a word we
     asked for ("John Lewis Beech Chopping Board" against "John Lewis
     ANYDAY beech chopping board"), that is naming drift on the same
     product and deserves only a nudge. */
  const lead = want.find((t) => !SIZE_RE.test(t));
  if (lead && !got.has(lead)) {
    const theirLead = gotList.find((t) => !SIZE_RE.test(t));
    const differentBrand = theirLead && !want.includes(theirLead);
    score *= differentBrand ? 0.5 : 0.85;
  }

  const wantSizes = sizes(want);
  const gotSizes = sizes(gotList);
  if (wantSizes.length && gotSizes.length && !wantSizes.some((s) => gotSizes.includes(s))) score *= 0.6;

  return score;
}

/* Leading all-caps token, e.g. "KNODD bin with lid 40L" → "KNODD". */
export function ikeaArticleName(title) {
  const m = String(title || "").match(/^([A-ZÅÄÖÉØÆÜ]{3,}(?:\s+[A-ZÅÄÖÉØÆÜ0-9]{2,})?)\b/);
  return m ? m[1].trim() : null;
}

/* Progressively looser queries. The first that returns a good match wins,
   so ordering matters: most specific first. */
export function queryVariants(title, retailer) {
  const out = [];
  const push = (q) => {
    const clean = String(q || "").replace(/\s+/g, " ").trim();
    if (clean && !out.includes(clean)) out.push(clean);
  };

  if (retailer === IKEA) {
    const article = ikeaArticleName(title);
    if (article) push(article);
    push(title);
    if (article) push(title.slice(article.length));
  } else {
    push(title);
    /* "John Lewis ANYDAY cutlery set 16 piece" → "ANYDAY cutlery set 16 piece".
       Keep ANYDAY: it is a brand, not boilerplate. */
    push(title.replace(/^John Lewis\s+(?!ANYDAY)/i, ""));
    push(title.replace(/^John Lewis\s+/i, ""));
    /* Drop the trailing count, which often differs from the listed SKU. */
    push(title.replace(/\b\d+\s*(piece|pc|pcs|pack)\b/i, ""));
  }
  return out;
}

/* ── Shared helpers ───────────────────────────────────────── */

/* Resolve a candidate product page into the four fields. */
async function readProductPage(url, tried) {
  const page = await getPage(url, tried, "product");
  if (!page?.html) return null;
  const product = extractProduct(page.html, page.finalUrl);
  tried.push({
    step: "product:parse",
    url: page.finalUrl,
    ok: Boolean(product.image),
    jsonLd: product.hasJsonLd,
    via: product.via,
  });
  if (!product.image) return null;
  return { ...product, url: page.finalUrl, renderedWith: page.via };
}

/* Walk a JSON tree collecting every object that satisfies a predicate. */
function deepCollect(node, predicate, out = [], seen = new Set()) {
  if (!node || typeof node !== "object" || seen.has(node)) return out;
  seen.add(node);
  if (!Array.isArray(node) && predicate(node)) out.push(node);
  for (const value of Object.values(node)) deepCollect(value, predicate, out, seen);
  return out;
}

const num = (v) => {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/* ── IKEA ─────────────────────────────────────────────────── */

const IKEA_PRODUCT_RE = /\/gb\/en\/p\/[^/]+\/?$/i;

function ikeaCandidatesFromApi(json) {
  /* The search payload shape shifts between releases, so rather than
     hardcode a path we collect anything carrying a pipUrl. */
  return deepCollect(json, (n) => typeof n.pipUrl === "string").map((p) => ({
    url: p.pipUrl,
    name: [p.name, p.typeName, p.itemMeasureReferenceText].filter(Boolean).join(" ").trim(),
    image: p.mainImageUrl || p.imageUrl || p.contextualImageUrl || null,
    price:
      num(p.salesPrice?.numeral) ??
      num(p.priceNumeral) ??
      num(p.price?.numeral) ??
      num(p.salesPrice?.current?.wholeNumber) ??
      num(p.price?.mainPriceProps?.price) ??
      null,
  }));
}

const ikeaAdapter = {
  name: IKEA,

  searchUrl: (q) => `https://www.ikea.com/gb/en/search/?q=${encodeURIComponent(q)}`,

  async find(title, { minScore = 0.5, maxPageFetches = 2 } = {}) {
    const tried = [];
    let best = null;

    for (const q of queryVariants(title, IKEA)) {
      /* Rung 1: the JSON search endpoint the website itself calls.
         It returns name, image and price together, so a hit here costs
         one request instead of two. */
      const api = `https://sik.search.blue.cdtapps.com/gb/en/search-result-page?q=${encodeURIComponent(
        q
      )}&size=12&types=PRODUCT`;
      let candidates = [];
      try {
        const { json } = await fetchJson(api);
        candidates = ikeaCandidatesFromApi(json);
        tried.push({ step: "ikea:api", url: api, ok: true, found: candidates.length });
      } catch (err) {
        tried.push({ step: "ikea:api", url: api, ok: false, error: err.message });
      }

      /* Rung 2: scrape product links off the human search page. */
      if (!candidates.length) {
        const searchUrl = ikeaAdapter.searchUrl(q);
        const page = await getPage(searchUrl, tried, "ikea:search");
        if (page?.html) {
          const found = [
            ...links(page.html, page.finalUrl, (h) => IKEA_PRODUCT_RE.test(h)),
            ...urlsInSource(page.html, page.finalUrl, (h) => IKEA_PRODUCT_RE.test(h)),
          ];
          candidates = [...new Set(found)].slice(0, 8).map((url) => ({ url, name: slugName(url) }));
          tried.push({ step: "ikea:search:links", ok: candidates.length > 0, found: candidates.length });
        }
      }

      const ranked = candidates
        .map((c) => ({ ...c, score: matchScore(c.name || slugName(c.url), title) }))
        .sort((a, b) => b.score - a.score);

      if (ranked.length && (!best || ranked[0].score > best.score)) best = ranked[0];

      /* Good enough and already complete: no product page fetch needed. */
      if (best && best.score >= minScore && best.image && best.price != null) {
        return done(best, tried, "ikea:api");
      }

      /* Otherwise fill the gaps from the product page itself. */
      let fetches = 0;
      for (const cand of ranked) {
        if (cand.score < minScore || fetches >= maxPageFetches) break;
        fetches += 1;
        const product = await readProductPage(cand.url, tried);
        if (product) {
          return done(
            {
              url: product.url,
              name: product.name || cand.name,
              image: product.image || cand.image,
              price: product.price ?? cand.price,
              score: cand.score,
            },
            tried,
            "ikea:product-page"
          );
        }
      }
    }

    if (best?.image) return done(best, tried, "ikea:api:weak-match");
    return { ok: false, reason: best ? `best match scored ${best.score.toFixed(2)}` : "no candidates", tried };
  },
};

/* ── John Lewis ───────────────────────────────────────────── */

/* John Lewis product URLs end in /pNNNNNNN. */
const JL_PRODUCT_RE = /johnlewis\.com\/[^?#]*\/p\d{5,}/i;

const jlAdapter = {
  name: JL,

  searchUrl: (q) => `https://www.johnlewis.com/search?search-term=${encodeURIComponent(q)}`,

  /* Gather candidates across every query variant first, then read the
     most promising product pages and score their real names.

     Scoring the URL slug alone is too crude to pick between eight
     near-identical bins, and taking the first candidate over the
     threshold means a mediocre match wins simply by sorting earlier.
     So: rank by slug, open the best few, and keep the highest-scoring
     resolved product — stopping early only when one is clearly right. */
  async find(title, { minScore = 0.55, confident = 0.85, maxPageFetches = 3 } = {}) {
    const tried = [];
    const seen = new Set();
    const candidates = [];

    for (const q of queryVariants(title, JL)) {
      const page = await getPage(jlAdapter.searchUrl(q), tried, "jl:search");
      if (!page?.html) continue;

      /* Anchors are the curated result list. The source sweep also
         catches "customers also viewed" and carousel state, which is
         why an unfiltered pass returned 118 candidates for one bin —
         so only fall back to it when there are no anchors at all. */
      const anchored = links(page.html, page.finalUrl, (h) => JL_PRODUCT_RE.test(h));
      const found = anchored.length
        ? anchored
        : urlsInSource(page.html, page.finalUrl, (h) => JL_PRODUCT_RE.test(h));
      let added = 0;
      for (const href of found) {
        const url = canonicalJlUrl(href);
        if (seen.has(url)) continue;
        seen.add(url);
        candidates.push({ url, slugScore: matchScore(slugName(url), title) });
        added += 1;
      }
      tried.push({ step: "jl:search:links", ok: added > 0, found: added });

      /* A strong slug match means the search term was good enough;
         no need to try looser variants and collect noise. */
      if (candidates.some((c) => c.slugScore >= confident)) break;
    }

    if (!candidates.length) return { ok: false, reason: "no candidates", tried };

    candidates.sort((a, b) => b.slugScore - a.slugScore);

    let best = null;
    let fetches = 0;
    for (const cand of candidates) {
      if (fetches >= maxPageFetches) break;
      /* Slug scores run low even for right answers, so open anything
         not obviously wrong rather than pre-filtering on minScore. */
      if (cand.slugScore < 0.25 && best) break;
      fetches += 1;

      const product = await readProductPage(cand.url, tried);
      if (!product) continue;

      const score = matchScore(product.name || slugName(cand.url), title);
      tried.push({ step: "jl:score", url: cand.url, ok: score >= minScore, score: Number(score.toFixed(2)), name: product.name });

      if (!best || score > best.score) best = { ...product, score };
      if (score >= confident) break;
    }

    if (best && best.score >= minScore) {
      return done({ url: best.url, name: best.name, image: best.image, price: best.price, score: best.score }, tried, "jl:product-page");
    }
    return {
      ok: false,
      reason: best
        ? `best match "${best.name}" scored ${best.score.toFixed(2)}, below ${minScore}`
        : "no candidate page could be read",
      tried,
      /* Rejected, but recorded: a near-miss is often a perfectly good
         substitute and only Andy can judge that. The scraper stores it
         without using it, and the review page offers it for one-click
         acceptance. */
      near: best || null,
    };
  },
};

/* Strip tracking and variant query strings so the same product does not
   appear as several candidates. */
function canonicalJlUrl(href) {
  try {
    const u = new URL(href);
    u.search = "";
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return href;
  }
}

/* Product URLs are slugged with the product name, which is a usable
   match target before we have fetched the page. */
function slugName(url) {
  try {
    const path = new URL(url).pathname.replace(/\/p\d+\/?$/i, "").replace(/\/$/, "");
    const last = path.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last).replace(/-\d{6,}$/, "").replace(/-/g, " ");
  } catch {
    return "";
  }
}

function done(best, tried, strategy) {
  return {
    ok: true,
    url: best.url,
    name: best.name || null,
    image: best.image || null,
    price: best.price ?? null,
    score: best.score ?? null,
    strategy,
    tried,
  };
}

export const ADAPTERS = { [IKEA]: ikeaAdapter, [JL]: jlAdapter };

export function adapterFor(retailer) {
  const adapter = ADAPTERS[retailer];
  if (!adapter) throw new Error(`No adapter for retailer "${retailer}"`);
  return adapter;
}
