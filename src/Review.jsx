/* ────────────────────────────────────────────────────────────
   Scrape review.

   Every option, its resolved image and the name the scraper landed on,
   side by side with what was asked for — so a wrong match is obvious at
   a glance rather than a surprise on the swipe screen.

   Fixing one is two steps: paste the correct product URL here, copy the
   generated overrides.json, re-run `npm run scrape`. The scraper reads
   overrides.json and never writes to it, so corrections survive.

     npm run dev  →  http://localhost:5173/review.html
   ──────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from "react";

import { ITEMS, ALL_OPTIONS, searchUrl } from "./data/items.js";
import { PRODUCTS } from "./data/products.js";
import overrides from "./data/overrides.json";
import { D } from "./data/icons.jsx";
import { T, DISPLAY, BODY, MONO, money } from "./theme.js";

/* Same weak-match threshold the scraper warns at. */
const WEAK = 0.6;

const rowsFor = () =>
  ALL_OPTIONS.map((option) => {
    const product = PRODUCTS[option.key] || null;
    const status = !product
      ? "missing"
      : product.rejected && !product.image
        ? "rejected"
        : !product.image
          ? "nophoto"
          : product.match != null && product.match < WEAK
            ? "weak"
            : "ok";
    return { ...option, product, status };
  });

const STATUS = {
  ok: { label: "Resolved", colour: T.olive },
  weak: { label: "Weak match", colour: "#9A7B18" },
  rejected: { label: "Near miss", colour: "#9A7B18" },
  nophoto: { label: "No photo", colour: T.brick },
  missing: { label: "Not scraped", colour: T.brick },
};

export default function Review() {
  const rows = useMemo(rowsFor, []);
  const [filter, setFilter] = useState("all");
  const [retailer, setRetailer] = useState("all");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState({});
  const [copied, setCopied] = useState(false);

  const counts = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        { all: rows.length }
      ),
    [rows]
  );

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (retailer !== "all" && r.retailer !== retailer) return false;
    if (query) {
      const hay = `${r.itemName} ${r.title} ${r.product?.name || ""} ${r.room}`.toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  /* Merge the pasted URLs into whatever overrides.json already holds. */
  const nextOverrides = useMemo(() => {
    const out = structuredClone(overrides);
    for (const [key, url] of Object.entries(drafts)) {
      const trimmed = url.trim();
      if (!trimmed) continue;
      out[key] = { ...(out[key] || {}), sourceUrl: trimmed };
    }
    return out;
  }, [drafts]);

  const draftCount = Object.values(drafts).filter((v) => v.trim()).length;

  const copyOverrides = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(nextOverrides, null, 2) + "\n");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* Clipboard is blocked on some setups; the textarea below is the fallback. */
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
          outline: 2px solid ${T.olive}; outline-offset: 2px;
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "34px 20px 80px" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.olive }}>
          Swipe the flat · quality control
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1.05, margin: "12px 0 0", color: T.oliveDeep, letterSpacing: "-.015em" }}>
          What the scraper found
        </h1>
        <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.55, color: T.inkSoft, margin: "12px 0 0", maxWidth: 620 }}>
          Wanted on the left, resolved on the right. Anything flagged is worth a look. To correct one, open the retailer, find the
          right product, and paste its URL into the box on that row — then copy the overrides below into{" "}
          <code style={{ fontFamily: MONO, fontSize: 13 }}>src/data/overrides.json</code> and re-run the scraper.
        </p>

        <Summary counts={counts} total={rows.length} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 22, alignItems: "center" }}>
          {["all", "ok", "weak", "rejected", "nophoto", "missing"].map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "Everything" : STATUS[f].label} <Count>{counts[f] || 0}</Count>
            </Chip>
          ))}
          <span style={{ width: 12 }} />
          {["all", "IKEA", "John Lewis"].map((r) => (
            <Chip key={r} active={retailer === r} onClick={() => setRetailer(r)}>
              {r === "all" ? "Both shops" : r}
            </Chip>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or room"
            style={{
              fontFamily: BODY,
              fontSize: 13.5,
              padding: "9px 12px",
              borderRadius: 3,
              border: `1px solid ${T.rule}`,
              background: T.card,
              color: T.ink,
              minWidth: 220,
              flex: "1 1 220px",
            }}
          />
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.inkFaint, letterSpacing: ".1em", margin: "18px 0 10px" }}>
          SHOWING {visible.length} OF {rows.length}
        </div>

        {visible.map((row) => (
          <Row
            key={row.key}
            row={row}
            draft={drafts[row.key] || ""}
            onDraft={(v) => setDrafts((d) => ({ ...d, [row.key]: v }))}
          />
        ))}

        {!visible.length && (
          <div style={{ fontFamily: BODY, fontSize: 15, color: T.inkSoft, padding: "40px 0", textAlign: "center" }}>
            Nothing matches that filter.
          </div>
        )}

        <OverridesPanel json={nextOverrides} count={draftCount} copied={copied} onCopy={copyOverrides} />
      </div>
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────── */

function Summary({ counts, total }) {
  const scraped = total - (counts.missing || 0);
  const withPhoto = counts.ok || 0;
  const pct = total ? Math.round((withPhoto / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
      <Stat big label="Clean photos" value={`${withPhoto}`} sub={`${pct}% of ${total}`} colour={T.olive} />
      <Stat label="Weak matches" value={String(counts.weak || 0)} sub="check these first" colour="#9A7B18" />
      <Stat label="Near misses" value={String(counts.rejected || 0)} sub="a click to accept" colour="#9A7B18" />
      <Stat label="No photo" value={String(counts.nophoto || 0)} sub="resolved but no image" colour={T.brick} />
      <Stat label="Not scraped" value={String(counts.missing || 0)} sub={scraped ? "re-run to retry" : "run npm run scrape"} colour={T.brick} />
    </div>
  );
}

function Stat({ label, value, sub, colour, big }) {
  return (
    <div
      style={{
        flex: big ? "1 1 200px" : "1 1 150px",
        background: T.card,
        border: `1px solid ${T.rule}`,
        borderTop: `2px solid ${colour}`,
        borderRadius: 4,
        padding: "13px 15px",
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: T.inkFaint }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 30, color: colour, marginTop: 4, letterSpacing: "-.02em" }}>{value}</div>
      <div style={{ fontFamily: BODY, fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: ".08em",
        padding: "8px 11px",
        borderRadius: 3,
        cursor: "pointer",
        background: active ? T.olive : T.card,
        color: active ? "#F7F5EE" : T.olive,
        border: `1px solid ${active ? T.olive : T.rule}`,
      }}
    >
      {children}
    </button>
  );
}

const Count = ({ children }) => <span style={{ opacity: 0.65, marginLeft: 4 }}>{children}</span>;

function Row({ row, draft, onDraft }) {
  const { product, status } = row;
  const meta = STATUS[status];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px minmax(0, 1fr) minmax(0, 1fr)",
        gap: 16,
        alignItems: "start",
        background: T.card,
        border: `1px solid ${T.rule}`,
        borderLeft: `3px solid ${meta.colour}`,
        borderRadius: 4,
        padding: 14,
        marginBottom: 9,
      }}
    >
      <Preview product={product} id={row.itemId} />

      {/* Wanted */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em", color: T.inkFaint }}>
          {row.key} · {row.room.toUpperCase()} · {row.tier.toUpperCase()}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 14.5, fontWeight: 600, color: T.ink, marginTop: 5 }}>{row.title}</div>
        <div style={{ fontFamily: BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>
          {row.itemName} · {row.retailer} · est. {money(row.price)}
        </div>
      </div>

      {/* Resolved */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".14em", color: meta.colour }}>{meta.label.toUpperCase()}</span>
          {product?.match != null && (
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: T.inkFaint }}>match {product.match.toFixed(2)}</span>
          )}
          {product?.overridden && (
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: T.olive, background: T.oliveWash, padding: "2px 5px", borderRadius: 2 }}>
              OVERRIDDEN
            </span>
          )}
        </div>

        <div style={{ fontFamily: BODY, fontSize: 14, color: product?.name ? T.ink : T.inkFaint, marginTop: 5 }}>
          {product?.name || "— nothing resolved —"}
        </div>

        <div style={{ fontFamily: MONO, fontSize: 12, color: T.ink, marginTop: 3 }}>
          {product?.price != null ? money(product.price) : <span style={{ color: T.inkFaint }}>no scraped price</span>}
        </div>

        {product?.rejected && (
          <div style={{ marginTop: 8, padding: "9px 11px", background: T.oliveWash, borderRadius: 3 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".14em", color: T.inkFaint }}>
              CLOSEST FOUND · SCORED {product.rejected.match?.toFixed(2)} · TOO DIFFERENT TO TRUST
            </div>
            <div style={{ fontFamily: BODY, fontSize: 13.5, color: T.ink, marginTop: 4 }}>
              {product.rejected.name}
              {product.rejected.price != null && (
                <span style={{ fontFamily: MONO, fontSize: 12, marginLeft: 8 }}>{money(product.rejected.price)}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Link href={product.rejected.url}>have a look ↗</Link>
              <button
                onClick={() => onDraft(product.rejected.url)}
                style={{
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: ".08em",
                  padding: "5px 9px",
                  borderRadius: 2,
                  cursor: "pointer",
                  background: T.olive,
                  color: "#F7F5EE",
                  border: `1px solid ${T.olive}`,
                }}
              >
                USE THIS ONE
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
          {product?.sourceUrl && (
            <Link href={product.sourceUrl}>open resolved page ↗</Link>
          )}
          <Link href={searchUrl(row.retailer, row.title)}>search {row.retailer} ↗</Link>
        </div>

        <input
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          placeholder="Wrong? Paste the correct product URL"
          style={{
            fontFamily: MONO,
            fontSize: 11.5,
            padding: "8px 10px",
            borderRadius: 3,
            border: `1px solid ${draft.trim() ? T.olive : T.rule}`,
            background: draft.trim() ? T.oliveWash : T.paper,
            color: T.ink,
            width: "100%",
            marginTop: 9,
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}

function Preview({ product, id }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(product?.image) && !broken;

  return (
    <div
      style={{
        width: 92,
        height: 92,
        background: showImg ? "#fff" : T.oliveWash,
        border: `1px solid ${T.rule}`,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImg ? (
        <img
          src={product.image}
          alt=""
          onError={() => setBroken(true)}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      ) : (
        <svg width={44} height={44} viewBox="0 0 48 48" fill="none" stroke={T.olive} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {D[id] || <circle cx="24" cy="24" r="14" />}
        </svg>
      )}
    </div>
  );
}

function Link({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".08em", color: T.olive, textDecoration: "none" }}
    >
      {children}
    </a>
  );
}

function OverridesPanel({ json, count, copied, onCopy }) {
  const text = JSON.stringify(json, null, 2);
  return (
    <div style={{ marginTop: 30, background: T.card, border: `1px solid ${T.rule}`, borderRadius: 4, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".16em", color: T.olive }}>SRC/DATA/OVERRIDES.JSON</div>
          <div style={{ fontFamily: BODY, fontSize: 13, color: T.inkSoft, marginTop: 4 }}>
            {count > 0
              ? `${count} correction${count === 1 ? "" : "s"} pending. Paste this over the file, then re-run npm run scrape.`
              : "Paste a product URL into any row above and the corrected file appears here."}
          </div>
        </div>
        <button
          onClick={onCopy}
          disabled={!count}
          style={{
            fontFamily: BODY,
            fontSize: 14,
            fontWeight: 600,
            padding: "11px 16px",
            borderRadius: 3,
            cursor: count ? "pointer" : "default",
            background: count ? T.olive : "transparent",
            color: count ? "#F7F5EE" : T.inkFaint,
            border: `1px solid ${count ? T.olive : T.rule}`,
          }}
        >
          {copied ? "Copied" : "Copy overrides.json"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        rows={Math.min(20, text.split("\n").length)}
        style={{
          fontFamily: MONO,
          fontSize: 11.5,
          lineHeight: 1.5,
          width: "100%",
          marginTop: 12,
          padding: 12,
          borderRadius: 3,
          border: `1px solid ${T.rule}`,
          background: T.paper,
          color: T.ink,
          boxSizing: "border-box",
          resize: "vertical",
        }}
      />
    </div>
  );
}
