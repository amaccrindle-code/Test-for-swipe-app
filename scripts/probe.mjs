#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   The spike, before you commit to 210 options.

   For each retailer it runs the real lookup — search, rank, open the
   product page — then inspects whatever page that landed on: was there
   a JSON-LD Product node, which rung produced each field, and what did
   image, price and name actually parse to.

   Deriving the page from a live search rather than a hardcoded URL
   matters: product IDs get discontinued, and a stale example reports a
   404 or a catch-all page as though the scraper were broken.

     npm run scrape:probe

   Optional:
     npm run scrape:probe -- --search="Brabantia Touch Bin 40L"
     npm run scrape:probe -- --ikea-url=https://www.ikea.com/gb/en/p/...
     npm run scrape:probe -- --jl-url=https://www.johnlewis.com/.../p123456
     npm run scrape:probe -- --rate=2000
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

setRateLimit(Number(value("rate", 1000)));

const URL_FLAG = { [IKEA]: value("ikea-url", null), [JL]: value("jl-url", null) };
const CUSTOM_SEARCH = value("search", null);

const rule = (label = "") =>
  console.log(`\n${"─".repeat(70)}${label ? `\n  ${label}` : ""}\n${"─".repeat(70)}`);

const show = (k, v) => console.log(`    ${String(k).padEnd(14)} ${v ?? "—"}`);

const indent = (str, n) =>
  str
    .split("\n")
    .map((l) => " ".repeat(n) + l)
    .join("\n");

function printTrail(tried) {
  for (const t of tried) {
    const bits = [t.ok ? "✓" : "✗", t.step];
    if (t.found != null) bits.push(`${t.found} candidates`);
    if (t.score != null) bits.push(`score ${t.score}`);
    if (t.name) bits.push(`"${t.name}"`);
    if (t.jsonLd != null) bits.push(t.jsonLd ? "json-ld" : "no json-ld");
    if (t.error) bits.push(t.error);
    if (t.blocked) bits.push("[bot-blocked]");
    console.log(`    ${bits.join("  ")}`);
  }
}

/* ── Part one: search → product ───────────────────────────── */

async function probeSearch(retailer, title) {
  rule(`${retailer} — full lookup for "${title}"`);

  const started = Date.now();
  const found = await adapterFor(retailer).find(title);
  printTrail(found.tried);

  console.log("");
  if (found.ok) {
    show("name", found.name);
    show("image", found.image);
    show("price", found.price != null ? `£${found.price}` : null);
    show("url", found.url);
    show("strategy", found.strategy);
    show("match", found.score != null ? found.score.toFixed(2) : null);
    show("quality", found.quality);
    const inexact = found.quality && found.quality !== "exact";
    console.log(
      `\n  → RESOLVED in ${((Date.now() - started) / 1000).toFixed(1)}s` +
        (inexact ? `  — a ${found.quality} match, which the card will label as such` : "")
    );
  } else {
    console.log(`  → FAILED: ${found.reason}`);
  }
  return found;
}

/* ── Part two: does that product page parse cleanly? ───────── */

async function probePage(retailer, url) {
  rule(`${retailer} — parsing ${url}`);

  const tried = [];
  const page = await getPage(url, tried, "probe");
  printTrail(tried);

  if (!page?.html) {
    console.log(`\n    COULD NOT FETCH. ${page?.error || ""}`);
    console.log(`    If that was a 403 and no browser rung appears above, install the fallback:`);
    console.log(`      npx playwright install chromium`);
    return { retailer, ok: false };
  }

  console.log(`\n    fetched ${page.html.length.toLocaleString()} bytes via ${page.via}`);

  const node = findProductNode(page.html);
  console.log(`\n  JSON-LD Product node: ${node ? "FOUND" : "NOT FOUND"}`);
  if (node) {
    console.log(`    keys: ${Object.keys(node).join(", ")}`);
    console.log(`\n  Raw JSON-LD (name / image / offers):`);
    console.log(indent(JSON.stringify({ name: node.name, image: node.image, offers: node.offers, sku: node.sku }, null, 2), 4));
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

  /* An image is the point of the exercise; a missing price is survivable
     because the card falls back to the estimate. */
  const usable = Boolean(parsed.image);
  const complete = usable && parsed.price != null && Boolean(parsed.name);
  console.log(
    `\n  → ${complete ? "COMPLETE — image, price and name all resolved" : usable ? "USABLE — image resolved, some fields missing" : "UNUSABLE — no image"}`
  );

  return { retailer, ok: usable, complete, hadJsonLd: Boolean(node), via: page.via };
}

/* ── Run ──────────────────────────────────────────────────── */

console.log("\nSwipe the flat — scraper probe");
console.log("Proving the approach on one product per retailer before scaling to 210.\n");

const results = [];

for (const retailer of [IKEA, JL]) {
  const title = CUSTOM_SEARCH || ALL_OPTIONS.find((o) => o.retailer === retailer)?.title;
  const search = title ? await probeSearch(retailer, title) : null;

  /* Inspect the page the search actually landed on, unless one was
     named explicitly. Never a hardcoded default — those go stale. */
  const url = URL_FLAG[retailer] || search?.url || null;
  const page = url ? await probePage(retailer, url) : null;
  if (!url) console.log(`\n  (no page to parse — the lookup found nothing)`);

  results.push({ retailer, title, search, page });
}

await closeBrowser();

rule("VERDICT");
for (const { retailer, search, page } of results) {
  const s = search?.ok
    ? `✓ resolved (${search.quality}, ${search.score.toFixed(2)})`
    : `✗ ${search?.reason || "no lookup"}`;
  console.log(`    ${retailer.padEnd(12)} search→product  ${s}`);
  console.log(`    ${" ".repeat(12)} product page    ${page?.ok ? `✓ parses (json-ld: ${page.hadJsonLd ? "yes" : "no"}, via: ${page.via})` : "✗ did not parse"}`);
}

const weak = results.filter((r) => r.search?.ok && r.search.quality !== "exact");
const allGood = results.every((r) => r.search?.ok && r.page?.ok);

console.log(
  allGood
    ? `\n  Approach holds${weak.length ? `, with ${weak.length} inexact match${weak.length === 1 ? "" : "es"} — that is working as\n  intended: a real photo and price, labelled as a stand-in on the card` : ""}.\n` +
        `  Run \`npm run scrape:sample\` to check the hit rate across the list, or\n` +
        `  \`npm run scrape\` to do all 210 — roughly 15-20 minutes.\n`
    : `\n  Something above did not resolve at all. Paste this output back and I will adjust\n` +
        `  the adapter for whatever the page actually returned.\n`
);

process.exit(allGood ? 0 : 1);
