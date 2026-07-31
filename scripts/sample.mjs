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
    found = await adapterFor(option.retailer).find(option.title);
  } catch (err) {
    found = { ok: false, reason: err.message };
  }

  const near = found.ok ? null : found.near;
  results.push({ option, found, near });

  const mark = found.ok ? (found.score >= 0.7 ? "✓" : "~") : near ? "✗" : "·";
  const score = found.ok ? found.score?.toFixed(2) : near ? near.score.toFixed(2) : "—";
  const resolved = found.ok ? found.name : near ? `(rejected) ${near.name}` : found.reason;
  const price = found.ok && found.price != null ? `£${found.price}` : "";

  console.log(
    `${String(index + 1).padStart(3)}. ${mark} ${String(score).padStart(4)}  ${option.retailer.padEnd(11)} ` +
      `${truncate(option.title, 42).padEnd(42)} → ${truncate(resolved, 52)} ${price}`
  );
}

await closeBrowser();

/* ── Report ───────────────────────────────────────────────── */

const by = (retailer) => results.filter((r) => r.option.retailer === retailer);
const strong = (list) => list.filter((r) => r.found.ok && r.found.score >= 0.7).length;
const weak = (list) => list.filter((r) => r.found.ok && r.found.score < 0.7).length;
const rejected = (list) => list.filter((r) => !r.found.ok && r.near).length;
const nothing = (list) => list.filter((r) => !r.found.ok && !r.near).length;

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");

console.log(`\n${"─".repeat(78)}`);
console.log(`  ✓ strong   confident match, score ≥ 0.70`);
console.log(`  ~ weak     resolved but worth eyeballing`);
console.log(`  ✗ rejected found something plausible but too different to trust`);
console.log(`  · nothing  no candidate at all`);
console.log(`${"─".repeat(78)}\n`);

for (const retailer of [...new Set(results.map((r) => r.option.retailer))]) {
  const list = by(retailer);
  console.log(
    `  ${retailer.padEnd(12)} ${String(list.length).padStart(3)} sampled   ` +
      `✓ ${String(strong(list)).padStart(3)} (${pct(strong(list), list.length)})   ` +
      `~ ${String(weak(list)).padStart(3)}   ✗ ${String(rejected(list)).padStart(3)}   · ${String(nothing(list)).padStart(3)}`
  );
}

const total = results.length;
const good = strong(results) + weak(results);
console.log(`\n  overall      ${good}/${total} resolved (${pct(good, total)})`);

const rejects = results.filter((r) => !r.found.ok && r.near);
if (rejects.length) {
  console.log(`\n  Rejected near-misses — are any of these actually fine?`);
  for (const r of rejects) {
    console.log(`    wanted    ${r.option.title}`);
    console.log(`    offered   ${r.near.name}  ${r.near.price != null ? `£${r.near.price}` : ""}  (${r.near.score.toFixed(2)})`);
    console.log(`              ${r.near.url}`);
  }
  console.log(
    `\n  If these look like reasonable substitutes, the titles in items.js are\n` +
      `  descriptions rather than real listings, and the fix is to rename those\n` +
      `  options to products John Lewis actually stocks — not to loosen matching.`
  );
}

console.log("");
