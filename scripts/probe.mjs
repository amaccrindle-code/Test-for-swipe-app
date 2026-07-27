#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   The spike, before you commit to 210 options.

   Fetches one IKEA product page and one John Lewis product page, and
   prints exactly what came back: whether JSON-LD was present, which
   rung of the ladder produced each field, and the parsed image, price
   and name. Then runs a full end-to-end lookup for one real title from
   items.js at each retailer, showing every step it took.

   Run this first:
     npm run scrape:probe

   Optional: probe specific pages or titles instead of the defaults.
     npm run scrape:probe -- --ikea-url=https://www.ikea.com/gb/en/p/...
     npm run scrape:probe -- --jl-url=https://www.johnlewis.com/.../p123456
     npm run scrape:probe -- --search="KNODD bin with lid 40L"
     npm run scrape:probe -- --no-search      just parse the two pages
   ──────────────────────────────────────────────────────────── */

import { ALL_OPTIONS, IKEA, JL } from "../src/data/items.js";
import { getPage } from "./lib/page.js";
import { extractProduct, findProductNode } from "./lib/parse.js";
import { adapterFor } from "./lib/retailers.js";
import { setRateLimit } from "./lib/net.js";
import { closeBrowser } from "./lib/browser.js";

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const flag = (name) => argv.includes(`--${name}`);

setRateLimit(Number(value("rate", 1000)));

/* Two known-good, long-lived product pages. Override with flags if
   either has been discontinued by the time you run this. */
const DEFAULTS = {
  [IKEA]: value("ikea-url", "https://www.ikea.com/gb/en/p/knodd-bin-with-lid-white-70289984/"),
  [JL]: value("jl-url", "https://www.johnlewis.com/brabantia-touch-bin-40l/white/p3182495"),
};

const rule = (label = "") =>
  console.log(`\n${"─".repeat(70)}${label ? `\n  ${label}` : ""}\n${"─".repeat(70)}`);

const show = (k, v) => console.log(`    ${String(k).padEnd(14)} ${v ?? "—"}`);

/* ── Part one: can we parse a product page at all? ─────────── */

async function probePage(retailer, url) {
  rule(`${retailer} — ${url}`);

  const tried = [];
  const page = await getPage(url, tried, "probe");

  for (const t of tried) {
    console.log(`    ${t.ok ? "✓" : "✗"} ${t.step}${t.error ? `  ${t.error}` : ""}${t.blocked ? "  [bot-blocked]" : ""}`);
  }

  if (!page?.html) {
    console.log(`\n    COULD NOT FETCH. ${page?.error || ""}`);
    console.log(`    If this says 403 and the browser rung is missing, install Playwright:`);
    console.log(`      npm install playwright && npx playwright install chromium`);
    return { retailer, ok: false };
  }

  console.log(`\n    fetched ${page.html.length.toLocaleString()} bytes via ${page.via}`);

  const node = findProductNode(page.html);
  console.log(`\n  JSON-LD Product node: ${node ? "FOUND" : "NOT FOUND"}`);
  if (node) {
    console.log(`    keys: ${Object.keys(node).join(", ")}`);
    console.log(`\n  Raw JSON-LD (image / offers / name):`);
    console.log(
      indent(
        JSON.stringify({ name: node.name, image: node.image, offers: node.offers, sku: node.sku, brand: node.brand }, null, 2),
        4
      )
    );
  }

  const parsed = extractProduct(page.html, page.finalUrl);
  console.log(`\n  Parsed result:`);
  show("name", parsed.name);
  show("image", parsed.image);
  show("price", parsed.price != null ? `£${parsed.price}` : null);
  console.log(`\n  Which rung produced each field:`);
  show("name via", parsed.via.name);
  show("image via", parsed.via.image);
  show("price via", parsed.via.price);

  const complete = Boolean(parsed.name && parsed.image && parsed.price != null);
  console.log(`\n  → ${complete ? "COMPLETE — image, price and name all resolved" : "INCOMPLETE — see missing fields above"}`);

  return { retailer, ok: complete, parsed, hadJsonLd: Boolean(node), via: page.via };
}

const indent = (str, n) =>
  str
    .split("\n")
    .map((l) => " ".repeat(n) + l)
    .join("\n");

/* ── Part two: does the search-to-product path work? ───────── */

async function probeSearch(retailer, title) {
  rule(`${retailer} — full lookup for "${title}"`);

  const started = Date.now();
  const found = await adapterFor(retailer).find(title);

  for (const t of found.tried) {
    const bits = [t.ok ? "✓" : "✗", t.step];
    if (t.found != null) bits.push(`${t.found} candidates`);
    if (t.jsonLd != null) bits.push(t.jsonLd ? "json-ld" : "no json-ld");
    if (t.error) bits.push(t.error);
    if (t.blocked) bits.push("[bot-blocked]");
    console.log(`    ${bits.join("  ")}`);
  }

  console.log("");
  if (found.ok) {
    show("name", found.name);
    show("image", found.image);
    show("price", found.price != null ? `£${found.price}` : null);
    show("url", found.url);
    show("strategy", found.strategy);
    show("match", found.score != null ? found.score.toFixed(2) : null);
    console.log(`\n  → RESOLVED in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } else {
    console.log(`  → FAILED: ${found.reason}`);
  }
  return found;
}

/* ── Run ──────────────────────────────────────────────────── */

console.log("\nSwipe the flat — scraper probe");
console.log("Proving the approach on one product per retailer before scaling to 210.");

const pageResults = [];
for (const [retailer, url] of Object.entries(DEFAULTS)) {
  pageResults.push(await probePage(retailer, url));
}

const searchResults = [];
if (!flag("no-search")) {
  const custom = value("search", null);
  for (const retailer of [IKEA, JL]) {
    const title = custom || ALL_OPTIONS.find((o) => o.retailer === retailer)?.title;
    if (title) searchResults.push({ retailer, result: await probeSearch(retailer, title) });
  }
}

await closeBrowser();

rule("VERDICT");
for (const r of pageResults) {
  console.log(
    `    ${r.retailer.padEnd(12)} product page  ${r.ok ? "✓ parses cleanly" : "✗ did not parse"}` +
      (r.hadJsonLd != null ? `  (json-ld: ${r.hadJsonLd ? "yes" : "no"}, via: ${r.via})` : "")
  );
}
for (const { retailer, result } of searchResults) {
  console.log(`    ${retailer.padEnd(12)} search→product ${result.ok ? "✓ resolved" : `✗ ${result.reason}`}`);
}

const allGood = pageResults.every((r) => r.ok) && searchResults.every((s) => s.result.ok);
console.log(
  allGood
    ? `\n  Approach holds. Run \`npm run scrape\` — 210 options at ~1/sec is roughly 10-20 minutes.\n`
    : `\n  Something above did not resolve. Paste this output back to me before running the\n` +
        `  full scrape and I will adjust the adapter for whatever the page actually returned.\n`
);

process.exit(allGood ? 0 : 1);
