/* ────────────────────────────────────────────────────────────
   Where things can be bought.

   One entry per retailer, shared by the app (which needs search links
   and display names) and the scraper (which needs the same plus the
   URL shape of a product page). Browser-safe: no Node imports, so both
   sides load this file.

   ADDING A RETAILER
   Add an entry here, then use its `name` as the retailer string in
   items.js. That is the whole job — the scraper builds an adapter from
   this config automatically and the app picks it up. Only add a
   `strategy` if the site needs something beyond "search page → product
   links → JSON-LD", which most do not.
   ──────────────────────────────────────────────────────────── */

export const RETAILERS = {
  IKEA: {
    name: "IKEA",
    /* IKEA ships a JSON search endpoint that returns name, image and
       price together, so it skips the product page in the happy path. */
    strategy: "ikea",
    searchUrl: (q) => `https://www.ikea.com/gb/en/search/?q=${encodeURIComponent(q)}`,
    productUrl: /\/gb\/en\/p\/[^/]+\/?$/i,
  },

  "John Lewis": {
    name: "John Lewis",
    searchUrl: (q) => `https://www.johnlewis.com/search?search-term=${encodeURIComponent(q)}`,
    /* Product URLs end in /pNNNNNNN. */
    productUrl: /johnlewis\.com\/[^?#]*\/p\d{5,}/i,
  },

  Argos: {
    name: "Argos",
    searchUrl: (q) => `https://www.argos.co.uk/search/${encodeURIComponent(q)}/`,
    productUrl: /argos\.co\.uk\/product\/\d+/i,
  },

  Dunelm: {
    name: "Dunelm",
    searchUrl: (q) => `https://www.dunelm.com/search?doSearch=true&q=${encodeURIComponent(q)}`,
    productUrl: /dunelm\.com\/product\/[^/?#]+/i,
  },

  Amazon: {
    name: "Amazon",
    searchUrl: (q) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}`,
    productUrl: /amazon\.co\.uk\/(?:[^/]*\/)?dp\/[A-Z0-9]{10}/i,
    /* Amazon detects and blocks automated requests aggressively and its
       terms disallow scraping. Kept out of the automatic cross-retailer
       fallback for that reason: it is available if an option names it
       explicitly, but the scraper will not reach for it on its own, and
       it will likely need the Playwright rung even then. */
    fallback: false,
  },

};

export const RETAILER_NAMES = Object.keys(RETAILERS);

/* Shops the scraper may try on its own when an option's own retailer
   comes up short. Order matters — it stops at the first good result. */
export const FALLBACK_RETAILERS = Object.values(RETAILERS)
  .filter((r) => r.fallback !== false)
  .map((r) => r.name);

export const retailerConfig = (name) => RETAILERS[name] || null;

/* The retailer's own search page for a title. Used as the card link
   whenever the scraper could not resolve a real product URL. */
export function searchUrl(retailer, query) {
  const config = retailerConfig(retailer);
  if (config) return config.searchUrl(query);
  /* An unknown retailer should still produce a usable link rather than
     a dead one, so a new entry in items.js degrades gracefully. */
  return `https://duckduckgo.com/?q=${encodeURIComponent(`${retailer} ${query}`)}`;
}
