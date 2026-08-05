/* ────────────────────────────────────────────────────────────
   Retailer adapters.

   Turns a wanted product title into one resolved product: page URL,
   image, price and exact name.

   The point of the app is a card with a real photo and a real price to
   swipe on. An exact match is the goal, but a sensible alternative with
   a photo beats a drawing — so nothing is rejected merely for being
   inexact. Instead every result carries a quality band:

     exact       ≥ 0.70   confidently the product that was asked for
     close       ≥ 0.45   right category, likely a variant or sibling
     substitute  > 0      a stand-in; real product, not the one named
     (failure)            nothing resolved at all

   The app labels close and substitute honestly on the card, and the
   review page sorts by band so the doubtful ones are easy to correct.

   Adapters are built from src/data/retailers.js. Most sites need
   nothing but a search URL and a product-URL pattern; only IKEA has a
   bespoke strategy, because it publishes a JSON search endpoint that
   answers in one request.
   ──────────────────────────────────────────────────────────── */

import { RETAILERS, retailerConfig } from "../../src/data/retailers.js";
import { fetchJson } from "./net.js";
import { getPage } from "./page.js";
import { extractProduct, links, urlsInSource } from "./parse.js";

export const IKEA = "IKEA";
export const JL = "John Lewis";

export const QUALITY = { exact: 0.7, close: 0.55 };

/* Below this a candidate shares essentially nothing with what was asked
   for, and calling it a substitute is not honesty, it is noise. Set low
   on purpose: its job is to require *some* real overlap, not to judge
   quality — the bands do that. */
export const MINIMUM = 0.12;

/* Words that mark a listing as a different kind of object entirely, in a
   way word overlap cannot see. "TÅRTSPADE washing up brush" resolved to
   a "John Lewis Washing Up Set Toy" — every word matched, but it is a
   children's toy. Only penalised when the wanted title did not ask. */
const OFF_CATEGORY = [
  "toy", "toys", "playset", "role play", "pretend", "dolls", "doll",
  "kids", "children", "childrens", "child", "infant", "baby", "nursery",
  "miniature", "replacement", "spare", "refill", "cartridge",
];

export function bandFor(score) {
  if (score >= QUALITY.exact) return "exact";
  if (score >= QUALITY.close) return "close";
  return "substitute";
}

/* ── Matching ─────────────────────────────────────────────── */

const STOP = new Set([
  "the", "a", "an", "and", "of", "for", "with", "in", "set", "pack", "john", "lewis",
]);

/* Units get folded onto their number so "40 l", "40L" and "40 litres"
   all become the one token "40l" — a size mismatch is one of the
   clearest signals that a candidate is a different variant. */
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
   Deluxe Mirage Sensor Bin 50L" share two words out of four, so two
   penalties sit on top to keep the right product ahead of its
   neighbours in the ranking. */
export function matchScore(candidateName, wantedTitle, { retailer } = {}) {
  const want = tokens(wantedTitle);
  const gotList = tokens(candidateName);
  const got = new Set(gotList);
  if (!want.length || !got.size) return 0;

  let score = want.filter((t) => got.has(t)).length / want.length;

  /* An IKEA article name is a strong signal, but only at IKEA, and only
     about the product *line*. Two mistakes to avoid:

     Scoping. The pattern is "leading capitals", which also matches OXO
     and LED, so at John Lewis it was handing a brand bonus to any
     acronym — "LED Lenser rechargeable torch" scored 0.90 against a
     Ronhill running light.

     Strength. As an additive bonus it swamped real differences:
     GRILLSKÄR charcoal against GRILLSKÄR gas scored a confident 1.00.
     A floor says "at least the right range" without claiming the right
     variant, which is what an article name actually tells you. */
  const article = retailer === IKEA ? ikeaArticleName(wantedTitle) : null;
  if (article && got.has(article.toLowerCase())) score = Math.max(score, 0.6);

  /* A missing lead token means one of two very different things.

     If the candidate leads with some other brand — ANYDAY wanted, EKO
     offered — it is a different product line. If it just omits a
     sub-brand while still leading with a word we asked for ("John Lewis
     Beech Chopping Board" against "John Lewis ANYDAY beech chopping
     board"), that is naming drift on the same product. */
  const lead = want.find((t) => !SIZE_RE.test(t));
  if (lead && !got.has(lead)) {
    const theirLead = gotList.find((t) => !SIZE_RE.test(t));
    const differentBrand = theirLead && !want.includes(theirLead);
    score *= differentBrand ? 0.5 : 0.85;
  }

  const wantSizes = sizes(want);
  const gotSizes = sizes(gotList);
  if (wantSizes.length && gotSizes.length && !wantSizes.some((s) => gotSizes.includes(s))) score *= 0.6;

  /* A listing that announces itself as a toy, a spare part or a
     children's version is not a substitute for the real thing. */
  const wantedText = normalise(wantedTitle);
  const candidateText = normalise(candidateName);
  for (const word of OFF_CATEGORY) {
    if (candidateText.includes(word) && !wantedText.includes(word)) {
      score *= 0.15;
      break;
    }
  }

  /* The head noun is what the thing *is* — bin, fryer, lamp, towels.
     Everything before it is brand and qualifier. A candidate missing it
     is not a variant or a substitute, it is a different kind of object,
     which is how a set of towels came to stand in for a sensor bin and
     a steam iron for an air fryer. Both scored on shared adjectives.

     Checked against the last few tokens rather than only the final one,
     since "air fryer" and "pedal bin" put the noun second-to-last. */
  const wantNouns = want.filter((t) => !SIZE_RE.test(t)).slice(-2);
  if (wantNouns.length && !wantNouns.some((t) => got.has(t))) score *= 0.25;

  return score;
}

/* Price is a sanity check on identity, not a filter on taste.

   "Smeg 50s Retro toaster TSF01" and "Smeg Dolce & Gabbana TSF01DGBUK
   Mediterraneo" share a model number and almost every word, but one is
   £170 and the other £599 — a designer edition, not the thing that was
   asked for. Same for a £695 illuminated cabinet standing in for a
   bathroom shelf unit.

   The estimates in items.js are rough but honest, so an order-of-
   magnitude gap is strong evidence the wrong variant was picked. This
   only demotes: a badly wrong estimate cannot stop a good match winning
   when there is nothing better, it just stops the £599 one outranking
   the £170 one. */
export function pricePlausibility(price, estimate) {
  if (price == null || !estimate) return 1;
  const ratio = price / estimate;
  if (ratio > 4 || ratio < 0.2) return 0.4;
  if (ratio > 2.5 || ratio < 0.35) return 0.7;
  return 1;
}

/* Leading all-caps token, e.g. "KNODD bin with lid 40L" → "KNODD". */
export function ikeaArticleName(title) {
  const m = String(title || "").match(/^([A-ZÅÄÖÉØÆÜ]{3,}(?:\s+[A-ZÅÄÖÉØÆÜ0-9]{2,})?)\b/);
  return m ? m[1].trim() : null;
}

/* Progressively looser queries, most specific first.

   The later variants matter more than they used to: when the exact
   product does not exist, a broader query is what surfaces the category
   so a substitute can be found at all. */
export function queryVariants(title, retailer, extra = []) {
  const out = [];
  const push = (q) => {
    const clean = String(q || "").replace(/\s+/g, " ").trim();
    if (clean && clean.length > 2 && !out.includes(clean)) out.push(clean);
  };

  if (retailer === IKEA) {
    const article = ikeaArticleName(title);
    if (article) push(article);
    push(title);
    if (article) push(title.slice(article.length));
    for (const q of extra) push(q);
    return out;
  }

  push(title);
  /* Own-brand prefixes are noise in a search box. Keep ANYDAY, which is
     a real range, but drop the "John Lewis" that precedes it. */
  push(title.replace(/^John Lewis\s+(?!ANYDAY)/i, ""));
  push(title.replace(/^John Lewis\s+/i, ""));
  /* Counts and sizes often differ from the listed SKU. */
  push(title.replace(/\b\d+\s*(piece|pc|pcs|pack)\b/i, ""));
  /* Last resort: the generic noun phrase, brand and numbers gone. This
     is what finds a stand-in when the named product does not exist —
     "ANYDAY sensor bin 45L" becomes "sensor bin". */
  push(
    tokens(title)
      .filter((t) => !SIZE_RE.test(t) && !/^\d+$/.test(t))
      .slice(-3)
      .join(" ")
  );
  /* Whatever the caller can add — in practice the item's own
     description ("Kitchen and recycling bins"). It describes a category
     rather than a product, so a search engine answers it with promo
     tiles and bestsellers. Useful as a last resort, dangerous earlier,
     which is why it sits at the end and why MINIMUM exists. */
  for (const q of extra) push(q);
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
  });
  if (!product.image) return null;
  return { ...product, url: page.finalUrl };
}

/* Product URLs are slugged with the product name, which is a usable
   match target before the page has been fetched. */
function slugName(url) {
  try {
    const path = new URL(url).pathname.replace(/\/p\d+\/?$/i, "").replace(/\/$/, "");
    const last = path.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last).replace(/-\d{6,}$/, "").replace(/-/g, " ");
  } catch {
    return "";
  }
}

/* Strip tracking and variant query strings so one product does not
   appear as several candidates. */
function canonical(href) {
  try {
    const u = new URL(href);
    u.search = "";
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return href;
  }
}

function result(best, tried, strategy) {
  const score = best.score ?? 0;
  return {
    ok: true,
    url: best.url,
    name: best.name || null,
    image: best.image || null,
    price: best.price ?? null,
    score,
    quality: bandFor(score),
    strategy,
    tried,
  };
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

/* ── The generic adapter ──────────────────────────────────── */

/* Search page → product links → JSON-LD on the product page. This is
   how nearly every retailer works, so a new one usually needs no code
   at all: just an entry in src/data/retailers.js. */
function createAdapter(config) {
  return {
    name: config.name,
    searchUrl: config.searchUrl,

    async find(title, { confident = 0.85, maxPageFetches = 4, extraQueries = [], estimate = null, exclude = [], minPrice = null } = {}) {
      const tried = [];
      const seen = new Set();
      const candidates = [];

      for (const query of queryVariants(title, config.name, extraQueries)) {
        const page = await getPage(config.searchUrl(query), tried, "search");
        if (!page?.html) continue;

        /* Anchors are the curated result list. The source sweep also
           catches carousels and "customers also viewed", which is why
           an unfiltered pass returned 118 candidates for one bin — so
           only fall back to it when there are no anchors at all. */
        const anchored = links(page.html, page.finalUrl, (h) => config.productUrl.test(h));
        const found = anchored.length
          ? anchored
          : urlsInSource(page.html, page.finalUrl, (h) => config.productUrl.test(h));

        let added = 0;
        for (const href of found) {
          const url = canonical(href);
          if (seen.has(url)) continue;
          seen.add(url);
          /* Already taken by a cheaper tier of the same item — offering
             it again would give two options the identical product. */
          if (exclude.includes(url)) continue;
          candidates.push({ url, slugScore: matchScore(slugName(url), title, { retailer: config.name }) });
          added += 1;
        }
        tried.push({ step: "search:links", query, ok: added > 0, found: added });

        /* A strong slug match means this query was good enough; looser
           variants would only add noise. */
        if (candidates.some((c) => c.slugScore >= confident)) break;
      }

      if (!candidates.length) return { ok: false, reason: "no candidates found", tried };

      candidates.sort((a, b) => b.slugScore - a.slugScore);

      /* Open the most promising few and score their real names — slug
         scores are too crude to separate near-identical listings, and
         the best candidate does not reliably sort first. */
      let best = null;
      let fetches = 0;
      for (const candidate of candidates) {
        if (fetches >= maxPageFetches) break;
        fetches += 1;

        const product = await readProductPage(candidate.url, tried);
        if (!product) continue;

        const base = matchScore(product.name || slugName(candidate.url), title, { retailer: config.name });
        const priceFactor = pricePlausibility(product.price, estimate);
        /* Tiers must climb. A splurge that costs less than the sensible
           option is not a splurge, whatever it scores on words. */
        const tierFactor = minPrice != null && product.price != null && product.price < minPrice ? 0.3 : 1;
        const score = base * priceFactor * tierFactor;
        tried.push({
          step: "score",
          url: candidate.url,
          ok: true,
          score: Number(score.toFixed(2)),
          band: bandFor(score),
          price: product.price,
          belowTier: tierFactor === 1 ? undefined : true,
          priceFactor: priceFactor === 1 ? undefined : priceFactor,
          name: product.name,
        });

        if (!best || score > best.score) best = { ...product, score };
        if (score >= confident) break;
      }

      if (!best) return { ok: false, reason: "found candidates but no page yielded an image", tried };

      /* Inexact is fine and expected — unrelated is not. */
      if (best.score < MINIMUM) {
        return {
          ok: false,
          reason: `nothing relevant: best was "${best.name}" at ${best.score.toFixed(2)}`,
          tried,
          near: best,
        };
      }
      return result(best, tried, `${config.name}:product-page`);
    },
  };
}

/* ── IKEA ─────────────────────────────────────────────────── */

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
      null,
  }));
}

function createIkeaAdapter(config) {
  const generic = createAdapter(config);

  return {
    name: config.name,
    searchUrl: config.searchUrl,

    async find(title, opts = {}) {
      const tried = [];
      let best = null;
      const { estimate = null } = opts;

      /* The JSON endpoint the website itself calls returns name, image
         and price together — one request instead of two, and the names
         are cleaner than any slug. */
      for (const query of queryVariants(title, IKEA, opts.extraQueries || [])) {
        const api = `https://sik.search.blue.cdtapps.com/gb/en/search-result-page?q=${encodeURIComponent(
          query
        )}&size=12&types=PRODUCT`;
        try {
          const { json } = await fetchJson(api);
          const exclude = opts.exclude || [];
          const minPrice = opts.minPrice ?? null;
          const ranked = ikeaCandidatesFromApi(json)
            .filter((c) => !exclude.includes(canonical(c.url)))
            .map((c) => ({
              ...c,
              score:
                matchScore(c.name || slugName(c.url), title, { retailer: IKEA }) *
                pricePlausibility(c.price, opts.estimate) *
                (minPrice != null && c.price != null && c.price < minPrice ? 0.3 : 1),
            }))
            .sort((a, b) => b.score - a.score);
          tried.push({ step: "ikea:api", query, ok: ranked.length > 0, found: ranked.length });

          if (ranked.length && (!best || ranked[0].score > best.score)) best = ranked[0];
          if (best && best.image && best.score >= QUALITY.exact) return result(best, tried, "ikea:api");
        } catch (err) {
          tried.push({ step: "ikea:api", query, ok: false, error: err.message });
        }
      }

      if (best?.image && best.score >= MINIMUM) return result(best, tried, "ikea:api");

      /* No usable API result: fall back to the ordinary search-page path. */
      const fallback = await generic.find(title, opts);
      fallback.tried = [...tried, ...(fallback.tried || [])];
      return fallback;
    },
  };
}

/* ── Registry ─────────────────────────────────────────────── */

const BUILDERS = { ikea: createIkeaAdapter };

export const ADAPTERS = Object.fromEntries(
  Object.values(RETAILERS).map((config) => [
    config.name,
    (BUILDERS[config.strategy] || createAdapter)(config),
  ])
);

export function adapterFor(retailer) {
  const adapter = ADAPTERS[retailer];
  if (!adapter) {
    throw new Error(
      `No adapter for retailer "${retailer}". Add an entry to src/data/retailers.js — ` +
        `a name, a searchUrl and a productUrl pattern is usually all it needs.`
    );
  }
  return adapter;
}

export { retailerConfig };
