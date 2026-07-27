/* ────────────────────────────────────────────────────────────
   HTML → product facts.

   No DOM library on purpose: retailer pages are enormous and we only
   want four fields. Everything here is pure and side-effect free, so
   scripts/test-parsers.mjs can exercise it against fixtures without
   touching the network.
   ──────────────────────────────────────────────────────────── */

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  pound: "£",
  eacute: "é",
  auml: "ä",
  ouml: "ö",
  aring: "å",
};

export function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

/* Parse the attributes of a single tag into a plain object. */
function attrs(tag) {
  const out = {};
  const re = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(tag))) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/* All <meta> tags as {name|property|itemprop → content}. */
export function metaTags(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = attrs(m[0]);
    const key = a.property || a.name || a.itemprop;
    if (key && a.content != null) out[key.toLowerCase()] = a.content;
  }
  return out;
}

/* Every <script type="application/ld+json"> block, parsed and flattened.

   Handles the three shapes retailers actually ship: a bare object, a
   top-level array, and a @graph wrapper. Blocks that fail to parse are
   skipped rather than throwing — a page often has several and only one
   needs to be good. */
export function jsonLdBlocks(html) {
  const blocks = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let raw = m[1].trim();
    // Some CMSes wrap the payload in a CDATA guard.
    raw = raw.replace(/^\/\/\s*<!\[CDATA\[/, "").replace(/\/\/\s*\]\]>$/, "");
    raw = raw.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const node of flatten(parsed)) blocks.push(node);
  }
  return blocks;
}

function flatten(node, seen = new Set()) {
  if (!node || typeof node !== "object") return [];
  if (seen.has(node)) return [];
  seen.add(node);
  if (Array.isArray(node)) return node.flatMap((n) => flatten(n, seen));
  const out = [node];
  if (node["@graph"]) out.push(...flatten(node["@graph"], seen));
  return out;
}

const isType = (node, type) => {
  const t = node?.["@type"];
  if (!t) return false;
  return Array.isArray(t) ? t.includes(type) : t === type;
};

/* The Product node from a page's JSON-LD, if there is one. */
export function findProductNode(html) {
  return jsonLdBlocks(html).find((n) => isType(n, "Product")) || null;
}

/* JSON-LD `image` is polymorphic: a URL string, an array of them, an
   ImageObject, or an array of ImageObjects. Return the first usable URL. */
export function firstImage(image) {
  const pick = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      for (const entry of v) {
        const got = pick(entry);
        if (got) return got;
      }
      return null;
    }
    if (typeof v === "object") return pick(v.url || v.contentUrl || v["@id"]);
    return null;
  };
  return pick(image);
}

/* JSON-LD `offers` is equally polymorphic. Return a number in pounds. */
export function offerPrice(offers) {
  const pick = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) {
      for (const entry of v) {
        const got = pick(entry);
        if (got != null) return got;
      }
      return null;
    }
    if (typeof v !== "object") return parsePrice(v);
    return (
      parsePrice(v.price) ??
      parsePrice(v.lowPrice) ??
      pick(v.priceSpecification) ??
      pick(v.offers) ??
      null
    );
  };
  return pick(offers);
}

/* "£45.00", "45.00", "1,299.99", 45 → 45 / 1299.99. Null if not a price. */
export function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/[£$€\s]/g, "")
    .replace(/,/g, "");
  const m = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function absoluteUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/* Pull the four fields we care about off a product page, trying
   JSON-LD first and falling back to Open Graph / microdata metas.

   Returns { name, image, price, via } where `via` records which rung of
   the ladder produced the image, so the probe and the summary can show
   whether JSON-LD is actually carrying its weight. */
export function extractProduct(html, pageUrl) {
  const node = findProductNode(html);
  const meta = metaTags(html);

  const ldImage = node ? firstImage(node.image) : null;
  const ldPrice = node ? offerPrice(node.offers) : null;
  const ldName = node?.name ? decodeEntities(String(node.name)).trim() : null;

  const metaImage = meta["og:image"] || meta["twitter:image"] || meta.image || null;
  const metaName = meta["og:title"] || meta["twitter:title"] || null;
  const metaPrice =
    parsePrice(meta["product:price:amount"]) ??
    parsePrice(meta["og:price:amount"]) ??
    parsePrice(meta.price) ??
    null;

  const image = absoluteUrl(ldImage || metaImage, pageUrl);
  const name = ldName || (metaName ? decodeEntities(metaName).trim() : null) || titleTag(html);
  const price = ldPrice ?? metaPrice;

  return {
    name: name || null,
    image,
    price,
    via: {
      image: ldImage ? "json-ld" : metaImage ? "og:image" : null,
      name: ldName ? "json-ld" : metaName ? "og:title" : name ? "<title>" : null,
      price: ldPrice != null ? "json-ld" : metaPrice != null ? "meta" : null,
    },
    hasJsonLd: Boolean(node),
  };
}

function titleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : null;
}

/* Hrefs matching a predicate, in document order, deduped. Used to pull
   product links out of a search results page. */
export function links(html, base, predicate) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = absoluteUrl(attrs(m[0]).href, base);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    if (predicate(href)) out.push(href);
  }
  return out;
}

/* Product URLs sometimes only appear inside inlined JSON state rather
   than in an <a href>. Sweep the raw source for anything URL-shaped. */
export function urlsInSource(html, base, predicate) {
  /* Inlined JSON escapes its slashes, as \/ or /. Normalise first
     so one plain URL pattern can match both those and real hrefs. */
  const source = html.replace(/\\\//g, "/").replace(/\\u002[fF]/g, "/");
  const out = [];
  const seen = new Set();
  const re = /https?:\/\/[^\s"'<>\\)]+|\/[a-z0-9][^\s"'<>\\)]*/gi;
  let m;
  while ((m = re.exec(source))) {
    const href = absoluteUrl(m[0], base);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    if (predicate(href)) out.push(href);
  }
  return out;
}
