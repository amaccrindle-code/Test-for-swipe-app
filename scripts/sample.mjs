#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   How good is the matching, really?

   One failed lookup tells you almost nothing — the product might not
   exist, the title might be a description rather than a listing, or the
   matching might be wrong. This runs a spread of options across both
   retailers, all rooms and all three tiers, and prints wanted against
   resolved with the score, so the hit rate is a number rather than an
   impression.

   It writes nothing and downloads no images. Safe to run repeatedly.

     npm run scrape:sample
     npm run scrape:sample -- --n=30          bigger sample
     npm run scrape:sample -- --retailer="John Lewis"
   ──────────────────────────────────────────────────────────── */

import { ALL_OPTIONS } from "../src/data/items.js";
import { adapterFor } from "./lib/retailers.js";
import { setRateLimit } from "./lib/net.js";
import { closeBrowser } from "./lib/browser.js";

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

setRateLimit(Number(value("rate", 1000)));

const wantRetailer = value("retailer", null);
const n = Number(value("n", 16));

let pool = ALL_OPTIONS;
if (wantRetailer) pool = pool.filter((o) => o.retailer.toLowerCase() === wantRetailer.toLowerCase());

/* Spread the sample evenly through the list rather than taking the
   first N, so it covers every room and tier instead of just kitchen
   thrifty options. */
const step = Math.max(1, Math.floor(pool.length / n));
const sample = pool.filter((_, i) => i % step === 0).slice(0, n);

const truncate = (s, len) => {
  const str = String(s ?? "—");
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
};

console.log(`\nSampling ${sample.length} of ${pool.length} options${wantRetailer ? ` at ${wantRetailer}` : ""}, ~1/sec.\n`);

const results = [];

for (const [index, option] of sample.entries()) {
  let found = null;
  try {
    found = await adapterFor(option.retailer).find(option.title, { extraQueries: [option.itemName] });
  } catch (err) {
    found = { ok: false, reason: err.message };
  }

  results.push({ option, found });

  const mark = !found.ok ? "·" : { exact: "✓", close: "~", substitute: "≈" }[found.quality] || "?";
  const score = found.ok ? found.score.toFixed(2) : "—";
  const resolved = found.ok ? found.name : found.reason;
  const price = found.ok && found.price != null ? `£${found.price}` : "";

  console.log(
    `${String(index + 1).padStart(3)}. ${mark} ${String(score).padStart(4)}  ${option.retailer.padEnd(11)} ` +
      `${truncate(option.title, 42).padEnd(42)} → ${truncate(resolved, 52)} ${price}`
  );
}

await closeBrowser();

/* ── Report ───────────────────────────────────────────────── */

const by = (retailer) => results.filter((r) => r.option.retailer === retailer);
const band = (list, q) => list.filter((r) => r.found.ok && r.found.quality === q).length;
const withPhoto = (list) => list.filter((r) => r.found.ok && r.found.image).length;
const nothing = (list) => list.filter((r) => !r.found.ok).length;

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");

console.log(`\n${"─".repeat(78)}`);
console.log(`  ✓ exact       the product asked for`);
console.log(`  ~ close       right category, likely a variant or sibling`);
console.log(`  ≈ substitute  a real product standing in, labelled as such on the card`);
console.log(`  · nothing     no photo at all — the card falls back to a drawing`);
console.log(`${"─".repeat(78)}\n`);

for (const retailer of [...new Set(results.map((r) => r.option.retailer))]) {
  const list = by(retailer);
  console.log(
    `  ${retailer.padEnd(12)} ${String(list.length).padStart(3)} sampled   ` +
      `✓ ${String(band(list, "exact")).padStart(3)}   ` +
      `~ ${String(band(list, "close")).padStart(3)}   ` +
      `≈ ${String(band(list, "substitute")).padStart(3)}   ` +
      `· ${String(nothing(list)).padStart(3)}   ` +
      `→ ${pct(withPhoto(list), list.length)} swipeable`
  );
}

console.log(`\n  overall      ${withPhoto(results)}/${results.length} cards would show a real photo and price (${pct(withPhoto(results), results.length)})`);

const swaps = results.filter((r) => r.found.ok && r.found.quality !== "exact");
if (swaps.length) {
  console.log(`\n  Resolved to something other than what was asked for:`);
  for (const r of swaps) {
    console.log(`    wanted    ${r.option.title}`);
    console.log(`    got       ${r.found.name}  ${r.found.price != null ? `£${r.found.price}` : ""}  (${r.found.quality}, ${r.found.score.toFixed(2)})`);
  }
  console.log(`\n  These all show a photo and a real price, labelled on the card. Swap any you\n  dislike from /review.html.`);
}

const blanks = results.filter((r) => !r.found.ok);
if (blanks.length) {
  console.log(`\n  Found nothing at all — these fall back to a drawing:`);
  for (const r of blanks) console.log(`    ${r.option.retailer.padEnd(12)} ${r.option.title}  — ${r.found.reason}`);
}

console.log("");
