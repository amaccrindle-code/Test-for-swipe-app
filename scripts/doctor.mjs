#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   What is actually in products.json, and why are photos missing?

   Reports how many options resolved, how many have a cached file on
   disk, and how many are relying on the retailer's own URL because the
   download failed. Then re-tries a handful of the failed downloads and
   prints the real HTTP error, which is the only way to tell hotlink
   protection from a dead URL.

     npm run scrape:doctor              report only
     npm run scrape:doctor -- --fix     retry every failed download and
                                        save the ones that now work
   ──────────────────────────────────────────────────────────── */

import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_OPTIONS } from "../src/data/items.js";
import { fetchBuffer, setRateLimit } from "./lib/net.js";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

setRateLimit(500);
const fix = argv.includes("--fix");
const retryCount = fix ? Infinity : Number(value("retry", 6));

const products = JSON.parse(await readFile(resolvePath(ROOT, "src/data/products.json"), "utf8"));
const exists = (p) => access(p, constants.F_OK).then(() => true, () => false);

const entries = Object.entries(products);
const stats = { total: ALL_OPTIONS.length, resolved: entries.length, onDisk: 0, missingFile: 0, noRemote: 0, noPrice: 0 };
const brokenDownloads = [];

for (const [key, p] of entries) {
  if (p.price == null) stats.noPrice += 1;
  if (p.localImage) {
    const file = resolvePath(ROOT, "public", p.localImage.replace(/^\//, ""));
    if (await exists(file)) stats.onDisk += 1;
    else {
      stats.missingFile += 1;
      brokenDownloads.push([key, p]);
    }
  } else if (p.remoteImage) {
    brokenDownloads.push([key, p]);
  } else {
    stats.noRemote += 1;
  }
}

const pct = (a) => `${Math.round((a / stats.total) * 100)}%`;

console.log(`\n  Options in items.js          ${stats.total}`);
console.log(`  Resolved to a product        ${stats.resolved}  ${pct(stats.resolved)}`);
console.log(`  Image cached on disk         ${stats.onDisk}  ${pct(stats.onDisk)}`);
console.log(`  Download failed, URL kept    ${brokenDownloads.length}  ${pct(brokenDownloads.length)}   ← these now hotlink instead`);
console.log(`  No image URL at all          ${stats.noRemote}  ${pct(stats.noRemote)}   ← these have no card`);
console.log(`  Resolved but no price        ${stats.noPrice}`);

if (!brokenDownloads.length) {
  console.log(`\n  Every resolved image is cached locally. Nothing to diagnose.\n`);
  process.exit(0);
}

console.log(
  `\n  Re-trying ${Math.min(retryCount, brokenDownloads.length)} failed download(s)` +
    `${fix ? " and saving what works" : " to see the real error"}:\n`
);

let sharp = null;
try {
  ({ default: sharp } = await import("sharp"));
} catch {}

let repaired = 0;

const byHost = {};
for (const [key, p] of brokenDownloads.slice(0, retryCount)) {
  const url = p.remoteImage || p.image;
  let host = "?";
  try {
    host = new URL(url).host;
  } catch {}
  try {
    const buf = await fetchBuffer(url, { referer: p.sourceUrl });
    if (fix) {
      const [itemId, optionIndex] = key.split(":");
      const filename = `${itemId}-${optionIndex}.jpg`;
      const target = resolvePath(ROOT, "public/products", filename);
      if (sharp) {
        await sharp(buf).flatten({ background: "#ffffff" }).resize(800, 800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(target);
      } else {
        await writeFile(target, buf);
      }
      products[key] = { ...p, localImage: `/products/${filename}` };
      repaired += 1;
    }
    console.log(`    ✓ ${key.padEnd(20)} ${host}  ${(buf.length / 1024).toFixed(0)}kB${fix ? " — cached" : " — works now, run with --fix"}`);
    byHost[host] = byHost[host] || { ok: 0, fail: 0 };
    byHost[host].ok += 1;
  } catch (err) {
    console.log(`    ✗ ${key.padEnd(20)} ${host}  ${err.message}`);
    byHost[host] = byHost[host] || { ok: 0, fail: 0 };
    byHost[host].fail += 1;
  }
}

if (fix && repaired) {
  await writeFile(resolvePath(ROOT, "src/data/products.json"), JSON.stringify(products, null, 2) + "\n");
  console.log(`\n  Cached ${repaired} image${repaired === 1 ? "" : "s"} and updated products.json.`);
}

console.log(`\n  by host: ${JSON.stringify(byHost)}`);
console.log(
  `\n  A 403 here means the CDN refuses server-side fetches. The app now falls\n` +
    `  back to the retailer's own URL in that case, so the photo still shows —\n` +
    `  it just loads from their server rather than from disk.\n`
);
