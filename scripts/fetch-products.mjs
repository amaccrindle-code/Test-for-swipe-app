#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   Build-time product scraper.

   Resolves every option in src/data/items.js to a real product page,
   image, price and name; caches the image locally; writes the lot to
   src/data/products.json. The app then reads static data and does no
   lookup at runtime.

   Resumable: anything already in products.json with its image still on
   disk is skipped, so you can stop it and rerun without redoing work.

     npm run scrape
     npm run scrape -- --retailer=IKEA        only one retailer
     npm run scrape -- --only=bin             one item (or bin:0 for one option)
     npm run scrape -- --limit=10             first N unresolved
     npm run scrape -- --force                redo even if already resolved
     npm run scrape -- --rate=2000            ms between requests (default 1000)
     npm run scrape:reset                     throw away products.json first

   Personal use. Polite rate limit, cached images are not redistributed.
   ──────────────────────────────────────────────────────────── */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_OPTIONS } from "../src/data/items.js";
import { adapterFor } from "./lib/retailers.js";
import { setRateLimit, fetchBuffer } from "./lib/net.js";
import { extractProduct } from "./lib/parse.js";
import { closeBrowser } from "./lib/browser.js";
import { getPage } from "./lib/page.js";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = resolvePath(ROOT, "src/data/products.json");
const OVERRIDES = resolvePath(ROOT, "src/data/overrides.json");
const IMAGE_DIR = resolvePath(ROOT, "public/products");

/* ── Arguments ────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const opts = {
  reset: flag("reset"),
  force: flag("force"),
  only: value("only", null),
  retailer: value("retailer", null),
  limit: Number(value("limit", 0)) || 0,
  rate: Number(value("rate", 1000)),
};

setRateLimit(opts.rate);

/* ── State ────────────────────────────────────────────────── */

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
};

const exists = (path) =>
  access(path, constants.F_OK).then(
    () => true,
    () => false
  );

const products = opts.reset ? {} : await readJson(PRODUCTS, {});
const overrides = await readJson(OVERRIDES, {});

await mkdir(IMAGE_DIR, { recursive: true });

let dirty = false;
const saveProducts = async () => {
  if (!dirty) return;
  await writeFile(PRODUCTS, JSON.stringify(sortKeys(products), null, 2) + "\n");
  dirty = false;
};

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

/* ── Which options need doing ─────────────────────────────── */

async function needsWork(option) {
  if (opts.force) return true;
  const existing = products[option.key];
  if (!existing) return true;
  /* products.json can outlive the images: they are gitignored, so a
     fresh clone has the data but no files. Re-download in that case. */
  if (existing.localImage) {
    const onDisk = await exists(resolvePath(ROOT, "public", existing.localImage.replace(/^\//, "")));
    if (!onDisk) return true;
  }
  return false;
}

let queue = ALL_OPTIONS;
if (opts.retailer) {
  const want = opts.retailer.toLowerCase();
  queue = queue.filter((o) => o.retailer.toLowerCase() === want);
}
if (opts.only) {
  queue = queue.filter((o) => o.key === opts.only || o.itemId === opts.only);
}

const skipped = [];
const todo = [];
for (const option of queue) {
  if (await needsWork(option)) todo.push(option);
  else skipped.push(option);
}
const work = opts.limit ? todo.slice(0, opts.limit) : todo;

/* ── Image caching ────────────────────────────────────────── */

let sharp = null;
let sharpWarned = false;

async function getSharp() {
  if (sharp) return sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    if (!sharpWarned) {
      console.warn("  ! sharp not installed — saving images at full size");
      sharpWarned = true;
    }
    sharp = null;
  }
  return sharp;
}

async function cacheImage(imageUrl, option, referer) {
  const filename = `${option.itemId}-${option.optionIndex}.jpg`;
  const target = resolvePath(IMAGE_DIR, filename);
  const raw = await fetchBuffer(imageUrl, { referer });

  const s = await getSharp();
  if (s) {
    await s(raw)
      /* Retailer cutouts are often transparent PNG; without a white
         floor they turn black when written as JPEG. */
      .flatten({ background: "#ffffff" })
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(target);
  } else {
    await writeFile(target, raw);
  }
  return `/products/${filename}`;
}

/* ── Resolve one option ───────────────────────────────────── */

async function resolveOption(option) {
  const override = overrides[option.key];

  /* An override that names the correct product page short-circuits the
     search entirely: the human has already done the hard part, we just
     read the page. overrides.json itself is never written to. */
  if (override?.sourceUrl) {
    const page = await getPage(override.sourceUrl, [], "override");
    if (!page?.html) throw new Error(`override sourceUrl unreachable: ${page?.error || "no response"}`);
    const parsed = extractProduct(page.html, page.finalUrl);
    if (!parsed.image && !override.image) throw new Error("override sourceUrl had no image");
    return {
      url: page.finalUrl,
      name: override.name || parsed.name,
      image: override.image || parsed.image,
      price: override.price ?? parsed.price,
      strategy: "override:sourceUrl",
      score: 1,
    };
  }

  const found = await adapterFor(option.retailer).find(option.title, { extraQueries: [option.itemName] });
  if (!found.ok) {
    const err = new Error(found.reason);
    err.tried = found.tried;
    throw err;
  }
  if (!found.image) {
    const err = new Error("resolved a product but no image URL");
    err.tried = found.tried;
    throw err;
  }
  return found;
}

/* ── Run ──────────────────────────────────────────────────── */

const failures = [];
let resolved = 0;

const truncate = (str, len) => {
  const v = String(str ?? "");
  return v.length > len ? v.slice(0, len - 1) + "…" : v;
};

console.log(
  `\nSwipe the flat — product scraper\n` +
    `  ${ALL_OPTIONS.length} options total, ${skipped.length} already done, ${work.length} to do` +
    (opts.retailer ? `  [retailer=${opts.retailer}]` : "") +
    (opts.only ? `  [only=${opts.only}]` : "") +
    `\n  ${opts.rate}ms between requests\n`
);

let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
  console.log("\n  interrupted — saving progress");
});

for (const [index, option] of work.entries()) {
  if (interrupted) break;
  const label = `[${String(index + 1).padStart(3)}/${work.length}] ${option.key}`;
  const shortTitle = option.title.length > 46 ? option.title.slice(0, 45) + "…" : option.title;

  try {
    const found = await resolveOption(option);
    let localImage = null;
    try {
      localImage = await cacheImage(found.image, option, found.url);
    } catch (err) {
      /* A resolved product with an un-downloadable image is still worth
         keeping: the app can fall back to the drawing but still link to
         the real page and show the real price. */
      console.warn(`${label}  image download failed (${err.message})`);
    }

    products[option.key] = {
      localImage,
      sourceUrl: found.url,
      price: found.price ?? null,
      name: found.name || option.title,
      retailer: option.retailer,
      remoteImage: found.image,
      strategy: found.strategy,
      match: found.score == null ? null : Number(found.score.toFixed(2)),
      /* exact | close | substitute — the app labels the last two on the
         card rather than passing them off as the product asked for. */
      quality: found.quality || null,
      wanted: option.title,
      scrapedAt: new Date().toISOString(),
    };
    dirty = true;
    resolved += 1;
    await saveProducts();

    const price = found.price != null ? `£${found.price}` : "no price";
    const mark = { exact: "✓", close: "~", substitute: "≈" }[found.quality] || "✓";
    const note = found.quality === "exact" ? "" : `  ${found.quality}: ${truncate(found.name, 40)}`;
    console.log(`${label}  ${mark} ${shortTitle}  →  ${price}${note}`);
  } catch (err) {
    failures.push({ option, reason: err.message, tried: err.tried });

    console.log(`${label}  ✗ ${shortTitle}  →  ${err.message}`);
  }
}

await saveProducts();
await closeBrowser();

/* ── Summary ──────────────────────────────────────────────── */

const totalResolved = Object.keys(products).length;

console.log(`\n${"─".repeat(64)}`);
console.log(`  attempted   ${work.length}`);
console.log(`  resolved    ${resolved}`);
console.log(`  failed      ${failures.length}`);
console.log(`  skipped     ${skipped.length}  (already in products.json)`);
console.log(`  ${totalResolved}/${ALL_OPTIONS.length} of all options now have data`);

if (failures.length) {
  const byRetailer = failures.reduce((acc, f) => {
    acc[f.option.retailer] = (acc[f.option.retailer] || 0) + 1;
    return acc;
  }, {});
  console.log(`\n  failed by retailer: ${JSON.stringify(byRetailer)}`);
  console.log(`\n  failures:`);
  for (const f of failures) {
    console.log(`    ${f.option.key.padEnd(22)} ${f.option.retailer.padEnd(12)} ${f.option.title}`);
    console.log(`    ${" ".repeat(22)} ${f.reason}`);
  }
  console.log(
    `\n  Re-run to retry just these, or open the review page (npm run dev → /review.html)\n` +
      `  and paste the correct product URL into src/data/overrides.json as\n` +
      `    { "<key>": { "sourceUrl": "https://..." } }\n` +
      `  then re-run. The scraper reads overrides but never writes to that file.`
  );
}

const bands = Object.values(products).reduce((acc, p) => {
  if (p.quality) acc[p.quality] = (acc[p.quality] || 0) + 1;
  return acc;
}, {});

if (Object.keys(bands).length) {
  console.log(`\n  match quality:`);
  console.log(`    exact       ${String(bands.exact || 0).padStart(3)}  the product asked for`);
  console.log(`    close       ${String(bands.close || 0).padStart(3)}  right category, likely a variant`);
  console.log(`    substitute  ${String(bands.substitute || 0).padStart(3)}  a stand-in, labelled as such on the card`);
}

const swaps = Object.entries(products).filter(([, p]) => p.quality && p.quality !== "exact" && p.name);
if (swaps.length) {
  console.log(`\n  ${swaps.length} option${swaps.length === 1 ? "" : "s"} resolved to something other than what was asked for:`);
  for (const [key, p] of swaps.slice(0, 15)) {
    console.log(`    ${key.padEnd(20)} ${truncate(p.wanted, 34).padEnd(34)} → ${truncate(p.name, 40)}`);
  }
  if (swaps.length > 15) console.log(`    … and ${swaps.length - 15} more`);
  console.log(`\n  All have a real photo and price. Review them at /review.html and swap any\n  you dislike by pasting a better URL into overrides.json.`);
}

console.log("");
process.exit(failures.length && !resolved ? 1 : 0);
