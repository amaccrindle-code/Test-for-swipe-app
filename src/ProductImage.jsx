import React, { useEffect, useState } from "react";
import { T, MONO } from "./theme.js";

/* ────────────────────────────────────────────────────────────
   A product photo that knows where else to look.

   Tries the locally cached file first, then the retailer's own URL if
   that one 404s. Both cases are normal rather than exceptional: cached
   images are gitignored, so a fresh clone and the deployed site both
   have the data without the files.
   ──────────────────────────────────────────────────────────── */

export default function ProductImage({ product, alt = "", style, fallbackLabel = "NO PHOTO", draggable }) {
  const [attempt, setAttempt] = useState(0);

  const sources = [product?.image, product?.fallbackImage].filter(Boolean);

  /* A new product means a fresh set of chances. */
  useEffect(() => setAttempt(0), [product?.image, product?.fallbackImage]);

  if (!sources.length || attempt >= sources.length) {
    return fallbackLabel ? (
      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".12em", color: T.inkFaint, textAlign: "center", padding: 6 }}>
        {fallbackLabel}
      </span>
    ) : null;
  }

  return (
    <img
      src={sources[attempt]}
      alt={alt}
      draggable={draggable}
      onError={() => setAttempt((n) => n + 1)}
      style={style}
    />
  );
}
