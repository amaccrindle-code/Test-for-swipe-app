#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   Does each shop actually work?

   Eleven adapters were written without being able to reach any of the
   sites, so this checks all of them at once before a full scrape is
   worth starting. For each shop it runs one real search and reports
   three things: whether the search page came back, whether any product
   links were found in it, and whether one of those product pages parses
   into a name, a price and an image.

   Shops are different hosts, so they run concurrently — the whole sweep
   takes seconds rather than minutes.

     npm run scrape:shops
     npm run scrape:shops -- --query="floor lamp"
     npm run scrape:shops -- --shop=Dunelm       just one, verbosely
   ──────────────────────────────────────────────────────────── */

import { RETAILERS } from "../src/data/retailers.js";
import { getPage } from "./lib/page.js";
import { extractProduct, links, urlsInSource } from "./lib/parse.js";
import { setRateLimit } from "./lib/net.js";
import { closeBrowser } from "./lib/browser.js";

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

setRateLimit(Number(value("rate", 1000)));

/* Something every homeware shop stocks, so a miss means the adapter is
   wrong rather than the shop simply not selling it. */
const QUERY = value("query", "table lamp");
const ONLY = value("shop", null);

const shops = Object.values(RETAILERS).filter((r) => !ONLY || r.name.toLowerCase() === ONLY.toLowerCase());

const pad = (s, n) => String(s).padEnd(n);
const truncate = (s, n) => (String(s ?? "").length > n ? String(s).slice(0, n - 1) + "…" : String(s ?? ""));

async function checkShop(config) {
  const out = { shop: config.name, searchOk: false, candidates: 0, productOk: false };
  const tried = [];

  const searchUrl = config.searchUrl(QUERY);
  const page = await getPage(searchUrl, tried, "search");
  out.via = page?.via;
  if (!page?.html) {
    out.error = page?.error || "no response";
    out.blocked = tried.some((t) => t.blocked);
    return out;
  }
  out.searchOk = true;
  out.bytes = page.html.length;

  const anchored = links(page.html, page.finalUrl, (h) => config.productUrl.test(h));
  const found = anchored.length ? anchored : urlsInSource(page.html, page.finalUrl, (h) => config.productUrl.test(h));
  out.candidates = found.length;
  out.fromAnchors = anchored.length > 0;
  if (!found.length) {
    out.error = "search page returned no product links — the productUrl pattern is probably wrong";
    return out;
  }

  const productTried = [];
  const productPage = await getPage(found[0], productTried, "product");
  out.productUrl = found[0];
  if (!productPage?.html) {
    out.error = `product page unreachable: ${productPage?.error || "no response"}`;
    out.blocked = productTried.some((t) => t.blocked);
    return out;
  }

  const parsed = extractProduct(productPage.html, productPage.finalUrl);
  out.name = parsed.name;
  out.price = parsed.price;
  out.image = parsed.image;
  out.jsonLd = parsed.hasJsonLd;
  out.productOk = Boolean(parsed.image);
  if (!out.productOk) out.error = "product page had no image — no JSON-LD and no og:image";
  return out;
}

console.log(`\nChecking ${shops.length} shop${shops.length === 1 ? "" : "s"} with the search "${QUERY}".`);
console.log(`Different hosts, so these run concurrently.\n`);

const results = await Promise.all(shops.map((c) => checkShop(c).catch((err) => ({ shop: c.name, error: err.message }))));
await closeBrowser();

for (const r of results) {
  const mark = r.productOk ? "✓" : r.searchOk ? "~" : "✗";
  const bits = [
    pad(r.shop, 13),
    r.searchOk ? `search ${pad(r.candidates + " links", 10)}` : pad("search FAILED", 17),
    r.productOk ? `product ✓ ${r.jsonLd ? "json-ld" : "og:image"}` : pad(r.searchOk ? "product ✗" : "", 18),
  ];
  console.log(`  ${mark} ${bits.join(" ")}`);
  if (r.productOk) console.log(`      ${truncate(r.name, 56)}  ${r.price != null ? "£" + r.price : "no price"}`);
  if (r.error) console.log(`      ${r.error}${r.blocked ? "  [bot-blocked]" : ""}`);
  if (r.via === "browser") console.log(`      needed the headless browser`);
}

const working = results.filter((r) => r.productOk);
const partial = results.filter((r) => !r.productOk && r.searchOk);
const broken = results.filter((r) => !r.searchOk);

console.log(`\n${"─".repeat(66)}`);
console.log(`  ✓ usable        ${working.length}   ${working.map((r) => r.shop).join(", ") || "—"}`);
console.log(`  ~ search only   ${partial.length}   ${partial.map((r) => r.shop).join(", ") || "—"}`);
console.log(`  ✗ unreachable   ${broken.length}   ${broken.map((r) => r.shop).join(", ") || "—"}`);

if (partial.length || broken.length) {
  console.log(
    `\n  A shop marked ~ found the search page but no usable product, which almost\n` +
      `  always means its productUrl pattern does not match its real product links.\n` +
      `  A shop marked ✗ was blocked or the search URL is wrong. Paste this back and\n` +
      `  I can fix the adapters — the patterns were written without being able to\n` +
      `  reach any of these sites.`
  );
}
if (working.length >= 4) {
  console.log(`\n  ${working.length} working shops is enough to scrape with. Broken ones are skipped, not fatal.`);
}
console.log("");
