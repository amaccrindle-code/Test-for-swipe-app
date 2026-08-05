import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { ITEMS, ALREADY, searchUrl } from "./data/items.js";
import { productFor, SCRAPE_STATS } from "./data/products.js";
import { T, DISPLAY, BODY, MONO, money } from "./theme.js";
import { downloadBasket } from "./lib/basketSheet.js";
import ProductImage from "./ProductImage.jsx";

const STORAGE_KEY = "flatswipe:v2";

/* How far, or how fast, a drag has to go before it counts as a decision.
   Distance alone makes short flicks feel unresponsive; velocity alone
   makes a slow deliberate drag impossible to abandon. Both, either. */
const COMMIT_DISTANCE = 96;
const COMMIT_VELOCITY = 0.45; // px per ms

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Only options the scraper resolved to a real photo make it into the
   app. A card exists to be judged on a picture and a price, so an
   option without one is not shown at all rather than falling back to a
   drawing — and an item where nothing resolved drops out entirely.

   `idx` keeps the original position so products.json, overrides.json
   and the tier labels all still line up after filtering. */
const CATALOGUE = ITEMS.map((item) => ({
  ...item,
  options: item.options
    .map((opt, idx) => ({ ...opt, idx, product: productFor(item.id, idx) }))
    .filter((opt) => opt.product && opt.product.image),
})).filter((item) => item.options.length > 0);

const DROPPED = {
  items: ITEMS.length - CATALOGUE.length,
  options: ITEMS.reduce((n, x) => n + x.options.length, 0) - CATALOGUE.reduce((n, x) => n + x.options.length, 0),
};

/* The scraped price when the scraper found one, my estimate otherwise.
   In one place so the card, the receipt and the running total agree. */
const priceOf = (product, opt) => (product && product.price != null ? product.price : opt.price);
const isEstimate = (product) => !product || product.price == null;

/* ────────────────────────────────────────────────────────────
   App
   ──────────────────────────────────────────────────────────── */
export default function SwipeKitOut() {
  const [phase, setPhase] = useState("loading");
  const [i, setI] = useState(0); // item index
  const [o, setO] = useState(0); // option index within item
  const [choices, setChoices] = useState({});
  const [saved, setSaved] = useState(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved2, setSaved2] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startX = useRef(null);
  /* Last pointer sample, for velocity. A flick should throw the card
     even if it never travelled far enough to cross the distance
     threshold — that is most of what makes a swipe feel physical. */
  const pointer = useRef({ x: 0, t: 0, v: 0 });
  const saveTimer = useRef(null);

  useEffect(() => {
    try {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {}
  }, []);

  /* Load saved state */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (p && p.choices && Object.keys(p.choices).length) setSaved(p);
    } catch (e) {}
    setPhase("intro");
  }, []);

  /* Persist choices */
  useEffect(() => {
    if (phase === "loading" || phase === "intro") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ choices, i, o }));
      } catch (e) {}
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [choices, i, o, phase]);


  const decided = Object.keys(choices).length;
  const bought = useMemo(
    () =>
      CATALOGUE.filter((x) => choices[x.id] && choices[x.id].type === "buy").map((x) => {
        const opt = x.options[choices[x.id].o] || x.options[0];
        return { item: x, opt, product: opt.product, price: priceOf(opt.product, opt) };
      }),
    [choices]
  );
  const total = bought.reduce((s, b) => s + b.price, 0);

  const nextItem = useCallback(
    (from) => {
      if (from + 1 >= CATALOGUE.length) setPhase("done");
      else {
        setI(from + 1);
        setO(0);
      }
    },
    []
  );

  /* Swiping is a decision about the *item*, not a way to page through
     options: right takes the option currently showing, left declines the
     thing entirely and moves on. Comparing the three is what the option
     strip under the card is for. */
  const reject = useCallback(() => {
    setFlying("left");
    setTimeout(
      () => {
        setFlying(null);
        setDrag(0);
        setChoices((c) => ({ ...c, [CATALOGUE[i].id]: { type: "skip" } }));
        nextItem(i);
      },
      reduced ? 0 : 200
    );
  }, [i, nextItem, reduced]);

  const accept = useCallback(() => {
    setFlying("right");
    setTimeout(
      () => {
        setFlying(null);
        setDrag(0);
        setChoices((c) => ({ ...c, [CATALOGUE[i].id]: { type: "buy", o } }));
        nextItem(i);
      },
      reduced ? 0 : 200
    );
  }, [i, o, nextItem, reduced]);

  const haveIt = useCallback(() => {
    setChoices((c) => ({ ...c, [CATALOGUE[i].id]: { type: "have" } }));
    setDrag(0);
    nextItem(i);
  }, [i, nextItem]);

  const back = useCallback(() => {
    setDrag(0);
    if (o > 0) setO(o - 1);
    else if (i > 0) {
      setI(i - 1);
      setO(0);
      setChoices((c) => {
        const n = { ...c };
        delete n[CATALOGUE[i - 1].id];
        return n;
      });
    }
  }, [i, o]);

  useEffect(() => {
    if (phase !== "swipe") return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") accept();
      else if (e.key === "ArrowLeft") reject();
      else if (e.key.toLowerCase() === "h") haveIt();
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, accept, reject, haveIt, back]);

  const pointerX = (e) => (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);

  const onStart = (e) => {
    startX.current = pointerX(e);
    pointer.current = { x: startX.current, t: performance.now(), v: 0 };
    setDragging(true);
  };

  const onMove = (e) => {
    if (startX.current === null) return;
    const x = pointerX(e);
    const t = performance.now();
    const dt = t - pointer.current.t;
    /* Ignore zero-length frames; they produce infinite velocity. */
    if (dt > 0) pointer.current.v = (x - pointer.current.x) / dt;
    pointer.current.x = x;
    pointer.current.t = t;
    setDrag(x - startX.current);
  };

  const onEnd = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);

    const v = pointer.current.v; // px per ms
    const direction = Math.sign(drag);
    const far = Math.abs(drag) > COMMIT_DISTANCE;
    /* Velocity can only confirm the direction the card actually moved.
       Reading direction off velocity alone meant a small pull-back at
       the end of a rightward drag registered as a left swipe. */
    const flicked = Math.abs(v) > COMMIT_VELOCITY && Math.sign(v) === direction && Math.abs(drag) > 14;
    if (!far && !flicked) return setDrag(0);

    if (direction > 0) accept();
    else reject();
  };

  if (phase === "loading")
    return (
      <Shell>
        <div style={{ padding: "90px 24px", textAlign: "center", fontFamily: MONO, fontSize: 11, color: T.inkFaint, letterSpacing: ".16em" }}>
          OPENING THE LIST
        </div>
      </Shell>
    );

  /* ── Intro ── */
  if (phase === "intro")
    return (
      <Shell>
        <div style={{ padding: "38px 22px 60px", maxWidth: 560, margin: "0 auto" }}>
          <Eyebrow>North Side SW18 · completion 10 August</Eyebrow>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 44, lineHeight: 1, margin: "14px 0 0", color: T.oliveDeep, letterSpacing: "-.015em" }}>
            Swipe the
            <br />
            flat into
            <br />
            existence
          </h1>
          <p style={{ fontFamily: BODY, fontSize: 16, lineHeight: 1.55, color: T.inkSoft, margin: "18px 0 0" }}>
            {CATALOGUE.length} things, {CATALOGUE.reduce((n, x) => n + x.options.length, 0)} options between them, one card at a time.
            Swipe left to see the next option, right to put it in the basket. Every card is a real product with a real photo and a
            live price — tap the row underneath to compare the options side by side.
          </p>

          <div style={{ marginTop: 24, background: T.card, border: `1px solid ${T.rule}`, borderRadius: 5, padding: "14px 16px" }}>
            <Eyebrow>{CATALOGUE.length ? "Where these came from" : "Nothing scraped yet"}</Eyebrow>
            <p style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.5, color: T.inkSoft, margin: "8px 0 0" }}>
              {CATALOGUE.length ? (
                <>
                  Scraped once from IKEA and John Lewis and cached, so nothing is looked up while you swipe. Where the exact product
                  was not stocked the nearest real one stands in, labelled on the card.
                  {DROPPED.options > 0 && (
                    <>
                      {" "}
                      {DROPPED.options} option{DROPPED.options === 1 ? "" : "s"} found no photo and{" "}
                      {DROPPED.options === 1 ? "is" : "are"} left out
                      {DROPPED.items > 0 && `, dropping ${DROPPED.items} item${DROPPED.items === 1 ? "" : "s"} entirely`}. Re-run{" "}
                      <code style={{ fontFamily: MONO, fontSize: 12.5 }}>npm run scrape</code> to try them again.
                    </>
                  )}
                </>
              ) : (
                <>
                  Run <code style={{ fontFamily: MONO, fontSize: 12.5 }}>npm run scrape</code> to fetch product photos and prices.
                  There is nothing to swipe until then.
                </>
              )}
            </p>
          </div>

          <div style={{ marginTop: 22, borderTop: `1px solid ${T.rule}`, paddingTop: 14 }}>
            <Eyebrow>Not asking about</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {ALREADY.map((a) => (
                <span key={a} style={{ fontFamily: MONO, fontSize: 10.5, color: T.olive, background: T.oliveWash, padding: "5px 8px", borderRadius: 2 }}>
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {saved && (
              <BigButton
                onClick={() => {
                  setChoices(saved.choices);
                  setI(Math.min(saved.i || 0, CATALOGUE.length - 1));
                  setO(saved.o || 0);
                  setPhase(Object.keys(saved.choices).length >= CATALOGUE.length ? "done" : "swipe");
                }}
              >
                Carry on
                <span style={{ fontFamily: MONO, fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
                  {Object.keys(saved.choices).length}/{CATALOGUE.length}
                </span>
              </BigButton>
            )}
            <BigButton
              ghost={!!saved}
              onClick={() => {
                setChoices({});
                setI(0);
                setO(0);
                setPhase("swipe");
              }}
            >
              {saved ? "Start again" : "Start swiping"}
            </BigButton>
          </div>
        </div>
      </Shell>
    );

  /* ── Done ── */
  if (phase === "done") {
    const byRetailer = bought.reduce((acc, b) => {
      const shop = b.product?.retailer || b.opt.retailer;
      (acc[shop] = acc[shop] || []).push(b);
      return acc;
    }, {});
    const haveList = CATALOGUE.filter((x) => choices[x.id] && choices[x.id].type === "have");
    const skipList = CATALOGUE.filter((x) => choices[x.id] && choices[x.id].type === "skip");

    const copyText = () => {
      const lines = [];
      Object.entries(byRetailer).forEach(([r, list]) => {
        lines.push(r.toUpperCase());
        list.forEach((b) =>
          lines.push(
            `  ${b.item.name}: ${b.product?.name || b.opt.title} (${money(b.price)})${
              b.product?.sourceUrl ? `\n    ${b.product.sourceUrl}` : ""
            }`
          )
        );
        lines.push(`  Subtotal ${money(list.reduce((s, b) => s + b.price, 0))}`, "");
      });
      lines.push(`TOTAL ${money(total)}`);
      if (skipList.length) lines.push("", "SKIPPED: " + skipList.map((x) => x.name).join(", "));
      try {
        navigator.clipboard.writeText(lines.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e) {}
    };

    return (
      <Shell>
        <div style={{ padding: "26px 14px 60px", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ background: T.card, border: `1px solid ${T.rule}`, borderBottom: "none", padding: "26px 18px 22px" }}>
            <div style={{ textAlign: "center" }}>
              <Eyebrow center>The basket</Eyebrow>
              <div style={{ fontFamily: DISPLAY, fontSize: 48, color: T.oliveDeep, marginTop: 8, letterSpacing: "-.02em" }}>{money(total)}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.inkFaint, letterSpacing: ".1em", marginTop: 6 }}>
                {bought.length} TO BUY · {haveList.length} OWNED · {skipList.length} SKIPPED
              </div>
            </div>

            {Object.entries(byRetailer).map(([retailer, list]) => (
              <div key={retailer} style={{ marginTop: 24 }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: T.olive, borderBottom: `1px solid ${T.rule}`, paddingBottom: 7, display: "flex", justifyContent: "space-between" }}>
                  <span>{retailer.toUpperCase()}</span>
                  <span>{money(list.reduce((s, b) => s + b.price, 0))}</span>
                </div>
                {list.map((b) => {
                  const p = b.product;
                  return (
                    <a
                      key={b.item.id}
                      href={p?.sourceUrl || searchUrl(p?.retailer || b.opt.retailer, b.opt.title)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", padding: "9px 0", borderBottom: `1px dotted ${T.rule}` }}
                    >
                      <Thumb product={p} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: BODY, fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{b.item.name}</div>
                        <div style={{ fontFamily: BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 1 }}>{p?.name || b.opt.title}</div>
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 13, color: T.ink, whiteSpace: "nowrap" }}>
                        {money(b.price)}
                        {isEstimate(b.product) && <Est />}
                      </div>
                    </a>
                  );
                })}
              </div>
            ))}

            {skipList.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: T.brick, borderBottom: `1px solid ${T.rule}`, paddingBottom: 7 }}>
                  SKIPPED FOR NOW
                </div>
                <div style={{ fontFamily: BODY, fontSize: 13.5, color: T.inkSoft, marginTop: 9, lineHeight: 1.6 }}>{skipList.map((x) => x.name).join(" · ")}</div>
              </div>
            )}

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 9 }}>
              <BigButton
                onClick={() => {
                  downloadBasket(bought);
                  setSaved2(true);
                  setTimeout(() => setSaved2(false), 2400);
                }}
              >
                {saved2 ? "Saved to your downloads" : "Save as a spreadsheet"}
              </BigButton>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".08em", color: T.inkFaint, textAlign: "center", lineHeight: 1.6 }}>
                EXCEL FILE · NAME, SHOP, PRICE AND LINK · TOTALS PER SHOP
              </div>
              <BigButton ghost onClick={copyText}>{copied ? "Copied" : "Copy the list as text"}</BigButton>
              <BigButton
                ghost
                onClick={() => {
                  setI(0);
                  setO(0);
                  setPhase("swipe");
                }}
              >
                Go back through it
              </BigButton>
            </div>
          </div>
          <TornEdge />
        </div>
      </Shell>
    );
  }

  /* ── Swipe ── */
  if (!CATALOGUE.length)
    return (
      <Shell>
        <div style={{ padding: "80px 24px", maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow center>Nothing to swipe</Eyebrow>
          <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.55, color: T.inkSoft, marginTop: 14 }}>
            No option has a product photo yet. Run{" "}
            <code style={{ fontFamily: MONO, fontSize: 13 }}>npm run scrape</code>, then reload.
          </p>
        </div>
      </Shell>
    );

  const item = CATALOGUE[i];
  const opt = item.options[o];
  const product = opt.product;
  /* How committed the current drag looks, 0 to 1. Drives the stamp,
     the tilt and how far the card behind has risen. */
  const progress = Math.min(Math.abs(drag) / COMMIT_DISTANCE, 1);
  const rot = clamp(drag / 16, -13, 13);
  const flyX = flying === "left" ? -640 : flying === "right" ? 640 : drag;
  const flyRot = flying === "left" ? -22 : flying === "right" ? 22 : rot;
  /* Lifts very slightly as it is picked up, the way a card would. */
  const scale = flying ? 0.94 : 1 - progress * 0.02;

  const cardTransition = reduced
    ? "none"
    : dragging
      ? "none"
      : flying
        ? "transform 280ms cubic-bezier(.4,0,.9,.35), opacity 240ms ease-out"
        : /* Settling back: overshoot slightly, then come to rest. */
          "transform 460ms cubic-bezier(.22,1.28,.36,1)";

  /* The next card you would see, sitting under this one so the stack
     reads as a deck rather than a slideshow. */
  const beneath =
    item.options[o + 1] || (CATALOGUE[i + 1] && CATALOGUE[i + 1].options[0]) || null;

  return (
    <Shell>
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: T.paper, borderBottom: `1px solid ${T.rule}` }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "11px 16px 9px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={back} aria-label="Back" style={{ fontFamily: MONO, fontSize: 17, background: "none", border: "none", color: T.olive, cursor: "pointer", padding: "2px 4px 2px 0" }}>
            ←
          </button>
          <div style={{ flex: 1, height: 3, background: T.rule, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(decided / CATALOGUE.length) * 100}%`, background: T.olive, transition: reduced ? "none" : "width 220ms ease" }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, background: T.oliveWash, color: T.oliveDeep, padding: "6px 9px", borderRadius: 2 }}>{money(total)}</span>
          <button onClick={() => setPhase("done")} style={{ fontFamily: MONO, fontSize: 12, background: "none", border: "none", color: T.olive, cursor: "pointer" }}>
            Finish
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>{item.room}</Eyebrow>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: T.inkFaint }}>
            {String(i + 1).padStart(2, "0")}/{CATALOGUE.length}
          </span>
        </div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 27, lineHeight: 1.15, color: T.oliveDeep, margin: "8px 0 0", letterSpacing: "-.01em" }}>{item.name}</h2>
        <p style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft, margin: "5px 0 0" }}>{item.note}</p>

        {/* option pips */}
        <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
          {item.options.map((_, k) => (
            <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: k <= o ? T.olive : T.rule }} />
          ))}
        </div>

        {/* card, with the next one showing beneath it */}
        <div style={{ position: "relative", marginTop: 12 }}>
          {beneath && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: T.card,
                border: `1px solid ${T.rule}`,
                borderRadius: 10,
                overflow: "hidden",
                /* Rises and squares up as the top card is drawn away. */
                transform: `scale(${0.945 + progress * 0.055}) translateY(${(1 - progress) * 12}px)`,
                opacity: 0.35 + progress * 0.45,
                transition: reduced || dragging ? "none" : "transform 460ms cubic-bezier(.22,1.28,.36,1), opacity 300ms ease",
              }}
            >
              <div style={{ height: "clamp(170px, 31vh, 260px)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ProductImage product={beneath.product} fallbackLabel="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
              </div>
            </div>
          )}

          <div
            onTouchStart={onStart}
            onTouchMove={onMove}
            onTouchEnd={onEnd}
            onMouseDown={onStart}
            onMouseMove={(e) => startX.current !== null && onMove(e)}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            style={{
              position: "relative",
              background: T.card,
              border: `1px solid ${T.rule}`,
              borderRadius: 10,
              overflow: "hidden",
              transform: `translateX(${flyX}px) rotate(${flyRot}deg) scale(${scale})`,
              transition: cardTransition,
              opacity: flying ? 0 : 1,
              boxShadow: dragging ? "0 10px 26px rgba(34,38,28,.13)" : "0 1px 2px rgba(34,38,28,.05)",
              touchAction: "pan-y",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Stamp show={drag > 44} side="right" label="IN THE BASKET" colour={T.olive} progress={progress} />
            <Stamp show={drag < -44} side="left" label="NOT FOR ME" colour={T.brick} progress={progress} />

            <PhotoPane product={product} />

            <div style={{ padding: "14px 16px 6px" }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em", color: opt.tier === "Splurge" ? T.brick : T.olive }}>
                {opt.tier.toUpperCase()} · {(product?.retailer || opt.retailer).toUpperCase()}
              </div>

              {/* Name and price on one baseline: the two things being
                  judged, given equal billing and nothing between them. */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 7 }}>
                <h3 style={{ flex: 1, minWidth: 0, fontFamily: BODY, fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: T.ink, margin: 0 }}>
                  {product?.name || opt.title}
                </h3>
                <span style={{ fontFamily: MONO, fontSize: 19, color: T.ink, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {money(priceOf(product, opt))}
                  {isEstimate(product) && <Est />}
                </span>
              </div>

              <p style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft, margin: "5px 0 0" }}>{opt.desc}</p>
              <Swap product={product} wanted={opt.title} />
            </div>

            {/* Its own row, ruled off and tall enough for a thumb. */}
            <a
              href={product?.sourceUrl || searchUrl(opt.retailer, opt.title)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                /* A drag that ends over the link should not navigate. */
                if (Math.abs(drag) > 8) e.preventDefault();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: 46,
                marginTop: 10,
                padding: "0 16px",
                borderTop: `1px solid ${T.rule}`,
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: ".1em",
                color: T.olive,
                textDecoration: "none",
              }}
            >
              {product?.sourceUrl ? "OPEN AT " : "SEARCH "}
              {(product?.retailer || opt.retailer).toUpperCase()} ↗
            </a>
          </div>
        </div>

        <OptionStrip item={item} current={o} onPick={(k) => { setDrag(0); setO(k); }} />

        {/* controls */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <RoundButton onClick={reject} label="✕" colour={T.brick} title="Skip this — not for me" />
          <button
            onClick={haveIt}
            style={{ flex: 1, fontFamily: BODY, fontSize: 14, padding: "13px 10px", borderRadius: 3, cursor: "pointer", background: T.card, color: T.inkSoft, border: `1px dashed ${T.rule}` }}
          >
            Already have it
          </button>
          <RoundButton onClick={accept} label="♥" colour={T.olive} title="Add to basket" />
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, color: T.inkFaint, marginTop: 14, letterSpacing: ".08em", textAlign: "center" }}>
          SWIPE RIGHT TO BUY · LEFT TO SKIP
          {item.options.length > 1 && ` · TAP BELOW TO COMPARE ${item.options.length}`}
        </div>
      </div>
    </Shell>
  );
}

/* ────────────────────────────────────────────────────────────
   Bits
   ──────────────────────────────────────────────────────────── */
function PhotoPane({ product }) {
  return (
    <div style={{ height: "clamp(170px, 31vh, 260px)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${T.rule}`, position: "relative" }}>
      <ProductImage
        product={product}
        draggable={false}
        fallbackLabel="PHOTO WOULD NOT LOAD"
        style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function Thumb({ product }) {
  return (
    <div style={{ width: 34, height: 34, background: "#fff", borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <ProductImage product={product} fallbackLabel="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
    </div>
  );
}

/* All of an item's options at a glance, so the choice can be compared
   on picture and price rather than remembered across swipes. Tapping
   one jumps straight to it; swiping still walks them in order. */
function OptionStrip({ item, current, onPick }) {
  if (item.options.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
      {item.options.map((opt, k) => {
        const active = k === current;
        return (
          <button
            key={opt.idx}
            onClick={() => onPick(k)}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              padding: "8px 6px",
              cursor: "pointer",
              background: active ? T.oliveWash : T.card,
              border: `1px solid ${active ? T.olive : T.rule}`,
              borderRadius: 4,
            }}
          >
            <span style={{ width: "100%", height: 46, background: "#fff", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <ProductImage product={opt.product} fallbackLabel="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".1em", color: active ? T.oliveDeep : T.inkFaint }}>
              {opt.tier.toUpperCase()}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: T.ink }}>{money(priceOf(opt.product, opt))}</span>
          </button>
        );
      })}
    </div>
  );
}

/* When the scraper could not find the exact product it resolves the
   nearest real one instead — a photo and a live price beat a drawing.
   That is only honest if the card says so, so it names what was
   originally asked for. */
function Swap({ product, wanted }) {
  if (!product || !product.quality || product.quality === "exact") return null;
  const substitute = product.quality === "substitute";
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: ".1em",
        color: substitute ? T.brick : T.inkFaint,
        marginTop: 7,
        lineHeight: 1.5,
      }}
    >
      {substitute ? "STAND-IN FOR" : "CLOSEST TO"} {wanted.toUpperCase()}
    </div>
  );
}

/* Marks a price as my own estimate rather than a scraped one, so the
   basket total is never mistaken for a real quote. */
function Est() {
  return (
    <span
      title="My estimate — the scraper did not find a live price"
      style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".1em", color: T.inkFaint, marginLeft: 4, verticalAlign: "super" }}
    >
      EST
    </span>
  );
}

function Stamp({ show, side, label, colour, progress = 0 }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        [side === "right" ? "left" : "right"]: 16,
        zIndex: 3,
        border: `2px solid ${colour}`,
        color: colour,
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: ".14em",
        padding: "5px 9px",
        borderRadius: 3,
        background: "rgba(251,248,242,.92)",
        /* Grows into place as the drag commits, rather than blinking on. */
        transform: `rotate(${side === "right" ? -9 : 9}deg) scale(${show ? 0.9 + progress * 0.18 : 0.8})`,
        opacity: show ? Math.min(0.35 + progress * 1.1, 1) : 0,
        transition: "opacity 120ms ease, transform 160ms cubic-bezier(.22,1.3,.36,1)",
        pointerEvents: "none",
      }}
    >
      {label}
    </div>
  );
}

function RoundButton({ onClick, label, colour, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 58,
        height: 58,
        borderRadius: "50%",
        border: `1px solid ${colour}`,
        background: T.card,
        color: colour,
        fontSize: 20,
        cursor: "pointer",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        @keyframes fkPulse { 0%,100% { opacity:.4 } 50% { opacity:1 } }
        button:focus-visible, a:focus-visible { outline: 2px solid ${T.olive}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>
      {children}
    </div>
  );
}

function Eyebrow({ children, center }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: T.olive, textAlign: center ? "center" : "left" }}>
      {children}
    </div>
  );
}

function BigButton({ children, onClick, ghost }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: BODY,
        fontSize: 15.5,
        fontWeight: 600,
        padding: "15px 18px",
        borderRadius: 3,
        cursor: "pointer",
        width: "100%",
        background: ghost ? "transparent" : T.olive,
        color: ghost ? T.olive : "#F7F5EE",
        border: `1px solid ${T.olive}`,
      }}
    >
      {children}
    </button>
  );
}

function TornEdge() {
  return (
    <div
      style={{
        height: 12,
        background: `linear-gradient(45deg, ${T.card} 34%, transparent 34%) 0 0/13px 13px repeat-x, linear-gradient(-45deg, ${T.card} 34%, transparent 34%) 0 0/13px 13px repeat-x`,
        filter: `drop-shadow(0 1px 0 ${T.rule})`,
      }}
    />
  );
}
