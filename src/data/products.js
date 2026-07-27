/* ────────────────────────────────────────────────────────────
   Scraped products, with hand corrections layered on top.

   products.json  written by `npm run scrape`. Never edit by hand — a
                  re-run will overwrite it.
   overrides.json written by you, from the review page. The scraper
                  reads it but never writes to it, so your corrections
                  survive every re-scrape.

   An override may set any subset of { sourceUrl, name, price, image,
   localImage }. A `sourceUrl` on its own is the useful case: the next
   scrape resolves that exact page instead of searching for it.
   ──────────────────────────────────────────────────────────── */

import scraped from "./products.json";
import overrides from "./overrides.json";

function merge(base = {}, over = {}) {
  const out = { ...base };
  /* Only defined keys win, so a partial override does not blank out
     fields the scraper got right. */
  for (const [k, v] of Object.entries(over)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  /* The locally cached file is preferred over any remote URL: it is
     resized, always reachable, and does not hotlink the retailer. */
  out.image = out.localImage || out.image || null;
  out.overridden = Object.keys(over).length > 0;
  return out;
}

const keys = new Set([...Object.keys(scraped), ...Object.keys(overrides)]);

export const PRODUCTS = Object.fromEntries(
  [...keys].map((key) => [key, merge(scraped[key], overrides[key])])
);

/* The scraped record for one option, or null if it was never resolved. */
export function productFor(itemId, optionIndex) {
  return PRODUCTS[`${itemId}:${optionIndex}`] || null;
}

/* True once a scrape has produced anything at all — used to decide
   whether to tell the user to run the scraper. */
export const HAS_SCRAPED_DATA = keys.size > 0;

export const SCRAPE_STATS = {
  resolved: keys.size,
  withPhoto: [...keys].filter((k) => PRODUCTS[k].image).length,
  withPrice: [...keys].filter((k) => PRODUCTS[k].price != null).length,
  overridden: [...keys].filter((k) => PRODUCTS[k].overridden).length,
};
