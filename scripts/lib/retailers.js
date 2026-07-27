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
  "the", "a", "an", "and", "of", "for", "with", "in", "set", "piece", "pc",
  "pcs", "pack", "john", "lewis", "cm", "ltr", "l",
]);

function tokens(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9åäöéø\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/* How well does a candidate product name match what we asked for?
   0 → nothing in common, 1 → every meaningful word accounted for.
   The IKEA article name is worth a big bonus: if the candidate is
   called KNODD and we asked for KNODD, it is the right product
   whatever the rest of the description says. */
export function matchScore(candidateName, wantedTitle) {
  const want = tokens(wantedTitle);
  const got = new Set(tokens(candidateName));
  if (!want.length || !got.size) return 0;

  const hits = want.filter((t) => got.has(t)).length;
  let score = hits / want.length;

  const article = ikeaArticleName(wantedTitle);
  if (article && got.has(article.toLowerCase())) score = Math.min(1, score + 0.4);

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

  async find(title, { minScore = 0.4, maxPageFetches = 2 } = {}) {
    const tried = [];
    let bestSeen = null;

    for (const q of queryVariants(title, JL)) {
      const searchUrl = jlAdapter.searchUrl(q);
      const page = await getPage(searchUrl, tried, "jl:search");
      if (!page?.html) continue;

      const found = [
        ...links(page.html, page.finalUrl, (h) => JL_PRODUCT_RE.test(h)),
        ...urlsInSource(page.html, page.finalUrl, (h) => JL_PRODUCT_RE.test(h)),
      ];
      const candidates = [...new Set(found.map(canonicalJlUrl))].slice(0, 8);
      tried.push({ step: "jl:search:links", ok: candidates.length > 0, found: candidates.length });

      const ranked = candidates
        .map((url) => ({ url, name: slugName(url), score: matchScore(slugName(url), title) }))
        .sort((a, b) => b.score - a.score);

      if (ranked.length && (!bestSeen || ranked[0].score > bestSeen.score)) bestSeen = ranked[0];

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
              image: product.image,
              price: product.price,
              score: cand.score,
            },
            tried,
            "jl:product-page"
          );
        }
      }
    }

    return {
      ok: false,
      reason: bestSeen ? `best match scored ${bestSeen.score.toFixed(2)}` : "no candidates",
      tried,
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
