/* ────────────────────────────────────────────────────────────
   How an item is described.

   The old model gave each of the three options its own hand-written
   product name, resolved independently. That is what let two tiers land
   on the identical mixing bowl, let a £100 splurge sit under a £160
   sensible, and let "serving dishes and a water jug" resolve to plates.

   An item is now one product *type* and three price targets. The
   scraper searches the type once per shop and picks a product near each
   target. Same type across all three, prices in order, no duplicates —
   all by construction rather than by matching heuristics.

     cat("bin-kitchen", "Kitchen", "Kitchen bin",
         "30 to 50L, with a lid",
         "kitchen bin with lid 40 litre",
         [30, 80, 200])

   The three numbers are what you would expect to pay at each tier. They
   are targets, not limits: the scraper prefers products near them and
   only widens if a tier would otherwise come up empty.
   ──────────────────────────────────────────────────────────── */

export const TIERS = ["Thrifty", "Sensible", "Splurge"];

/* How far either side of a target a product may sit before it stops
   counting as that tier. Wide enough to cope with a rough estimate,
   tight enough that tiers stay distinguishable. */
const BAND = { lower: 0.45, upper: 2.2 };

export function priceBand(target) {
  return { target, min: Math.round(target * BAND.lower), max: Math.round(target * BAND.upper) };
}

/* One item: a thing you need, and roughly what each tier costs.

   `query` is what actually gets typed into a shop's search box, so it
   should read like a shopper's search rather than a product name —
   "floor lamp" not "HEKTAR Floor lamp". `note` is the human aside shown
   on the card. */
export const cat = (id, room, name, note, query, targets) => ({
  id,
  room,
  name,
  note,
  query,
  tiers: TIERS.map((tier, i) => ({ tier, ...priceBand(targets[i]) })),
});

/* Search terms that should never be treated as part of the product
   type. Kept here rather than in the scraper so the catalogue and the
   matcher agree on what a query means. */
export const QUERY_STOPWORDS = ["cheap", "best", "good", "quality"];
