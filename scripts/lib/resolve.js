/* ────────────────────────────────────────────────────────────
   Resolve one option, across shops if need be.

   Each option in items.js names a retailer, but that is a starting
   preference rather than a constraint. If the named shop has nothing
   good — the product is not stocked, or only a poor stand-in turns up —
   the other shops are tried and the best result across all of them
   wins. A better product from Argos beats a bad one from John Lewis.

   Amazon is excluded from automatic fallback (see retailers.js); it is
   only used when an option names it directly.
   ──────────────────────────────────────────────────────────── */

import { FALLBACK_RETAILERS } from "../../src/data/retailers.js";
import { adapterFor, QUALITY } from "./retailers.js";

/* Stop looking once a result is this good — no point spending requests
   on three more shops when the named one already nailed it. */
const GOOD_ENOUGH = QUALITY.exact;

export async function resolveAcrossRetailers(option, { maxShops = 3, extraQueries = [] } = {}) {
  /* The list's own estimate, used to demote wildly mispriced variants —
     a £599 designer toaster where £170 was expected. */
  const estimate = option.price ?? null;
  const attempts = [];

  const order = [
    option.retailer,
    ...FALLBACK_RETAILERS.filter((name) => name !== option.retailer),
  ].slice(0, maxShops);

  let best = null;

  for (const retailer of order) {
    let found;
    try {
      found = await adapterFor(retailer).find(option.title, { extraQueries, estimate });
    } catch (err) {
      attempts.push({ retailer, ok: false, reason: err.message });
      continue;
    }

    attempts.push({
      retailer,
      ok: found.ok,
      score: found.ok ? Number(found.score.toFixed(2)) : null,
      name: found.ok ? found.name : null,
      reason: found.ok ? null : found.reason,
    });

    if (found.ok && found.image && (!best || found.score > best.score)) {
      best = { ...found, retailer };
    }
    if (best && best.score >= GOOD_ENOUGH) break;
  }

  if (!best) {
    return {
      ok: false,
      reason: attempts.map((a) => `${a.retailer}: ${a.reason || "no image"}`).join("; ") || "no shop had it",
      attempts,
    };
  }

  return {
    ...best,
    attempts,
    /* True when the winner came from somewhere other than the shop the
       option named — the app shows the real retailer, and the receipt
       groups by it, so this needs to be visible. */
    switchedRetailer: best.retailer !== option.retailer,
  };
}
