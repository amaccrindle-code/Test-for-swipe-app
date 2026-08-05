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

  "Next Home": {
    name: "Next Home",
    searchUrl: (q) => `https://www.next.co.uk/search?w=${encodeURIComponent(q)}`,
    productUrl: /next\.co\.uk\/(?:g|style)\d+/i,
  },

  "Zara Home": {
    name: "Zara Home",
    searchUrl: (q) => `https://www.zarahome.com/gb/en/search?searchTerm=${encodeURIComponent(q)}`,
    productUrl: /zarahome\.com\/gb\/en\/[^?#]*-p\d+/i,
  },

  Habitat: {
    name: "Habitat",
    searchUrl: (q) => `https://www.habitat.co.uk/search/${encodeURIComponent(q)}/`,
    productUrl: /habitat\.co\.uk\/product\/[^/?#]+/i,
  },

  Wayfair: {
    name: "Wayfair",
    searchUrl: (q) => `https://www.wayfair.co.uk/keyword.php?keyword=${encodeURIComponent(q)}`,
    productUrl: /wayfair\.co\.uk\/[^?#]*-(?:pdp|W)\d+/i,
  },

  "La Redoute": {
    name: "La Redoute",
    searchUrl: (q) => `https://www.laredoute.co.uk/search/?q=${encodeURIComponent(q)}`,
    productUrl: /laredoute\.co\.uk\/ppdp\/[^/?#]+/i,
  },

  Lakeland: {
    name: "Lakeland",
    searchUrl: (q) => `https://www.lakeland.co.uk/search?q=${encodeURIComponent(q)}`,
    productUrl: /lakeland\.co\.uk\/\d+\/[^/?#]+/i,
  },

  Amazon: {
    name: "Amazon",
    searchUrl: (q) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}`,
    productUrl: /amazon\.co\.uk\/(?:[^/]*\/)?dp\/[A-Z0-9]{10}/i,
    /* In the rotation at Andy's request. Amazon's terms disallow
       scraping and it blocks automated requests hard, so expect it to
       need the browser rung and still underperform. Their Product
       Advertising API is the supported route if it matters. */
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
