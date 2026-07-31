import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { ITEMS, ALREADY, searchUrl } from "./data/items.js";
import { productFor, SCRAPE_STATS } from "./data/products.js";
import { D } from "./data/icons.jsx";
import { T, DISPLAY, BODY, MONO, money } from "./theme.js";

const STORAGE_KEY = "flatswipe:v1";

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
  const [flying, setFlying] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startX = useRef(null);
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
      ITEMS.filter((x) => choices[x.id] && choices[x.id].type === "buy").map((x) => {
        const chosen = choices[x.id].o;
        const opt = x.options[chosen];
        const product = productFor(x.id, chosen);
        return { item: x, opt, product, price: priceOf(product, opt) };
      }),
    [choices]
  );
  const total = bought.reduce((s, b) => s + b.price, 0);

  const nextItem = useCallback(
    (from) => {
      if (from + 1 >= ITEMS.length) setPhase("done");
      else {
        setI(from + 1);
        setO(0);
      }
    },
    []
  );

  const reject = useCallback(() => {
    setFlying("left");
    setTimeout(
      () => {
        setFlying(null);
        setDrag(0);
        if (o < 2) setO(o + 1);
        else {
          setChoices((c) => (c[ITEMS[i].id] ? c : { ...c, [ITEMS[i].id]: { type: "skip" } }));
          nextItem(i);
        }
      },
      reduced ? 0 : 200
    );
  }, [i, o, nextItem, reduced]);

  const accept = useCallback(() => {
    setFlying("right");
    setTimeout(
      () => {
        setFlying(null);
        setDrag(0);
        setChoices((c) => ({ ...c, [ITEMS[i].id]: { type: "buy", o } }));
        nextItem(i);
      },
      reduced ? 0 : 200
    );
  }, [i, o, nextItem, reduced]);

  const haveIt = useCallback(() => {
    setChoices((c) => ({ ...c, [ITEMS[i].id]: { type: "have" } }));
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
        delete n[ITEMS[i - 1].id];
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

  const onStart = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };
  const onMove = (e) => {
    if (startX.current === null) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDrag(x - startX.current);
  };
  const onEnd = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (drag > 95) accept();
    else if (drag < -95) reject();
    else setDrag(0);
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
            {ITEMS.length} things, three options each, one card at a time. Swipe left to reject and see the next option. Swipe right to put it
            in the basket.
          </p>

          <div style={{ marginTop: 24, background: T.card, border: `1px solid ${T.rule}`, borderRadius: 5, padding: "14px 16px" }}>
            <Eyebrow>{SCRAPE_STATS.withPhoto > 0 ? "Where the photos came from" : "No photos yet"}</Eyebrow>
            <p style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.5, color: T.inkSoft, margin: "8px 0 0" }}>
              {SCRAPE_STATS.withPhoto > 0 ? (
                <>
                  {SCRAPE_STATS.withPhoto} of {ITEMS.length * 3} options have a real product photo, scraped once and cached locally
                  — nothing is looked up while you swipe. Anything without one shows a drawing, labelled as such, and the card
                  still links to the shop. A price marked <Est /> is my estimate rather than a scraped one.
                </>
              ) : (
                <>
                  Run <code style={{ fontFamily: MONO, fontSize: 12.5 }}>npm run scrape</code> to fetch real product photos and
                  prices. Until then every card shows a drawing and my estimated price, which still works fine for deciding.
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
                  setI(Math.min(saved.i || 0, ITEMS.length - 1));
                  setO(saved.o || 0);
                  setPhase(Object.keys(saved.choices).length >= ITEMS.length ? "done" : "swipe");
                }}
              >
                Carry on
                <span style={{ fontFamily: MONO, fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
                  {Object.keys(saved.choices).length}/{ITEMS.length}
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
      (acc[b.opt.retailer] = acc[b.opt.retailer] || []).push(b);
      return acc;
    }, {});
    const haveList = ITEMS.filter((x) => choices[x.id] && choices[x.id].type === "have");
    const skipList = ITEMS.filter((x) => choices[x.id] && choices[x.id].type === "skip");

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
                      href={p?.sourceUrl || searchUrl(b.opt.retailer, b.opt.title)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", padding: "9px 0", borderBottom: `1px dotted ${T.rule}` }}
                    >
                      <Thumb product={p} id={b.item.id} />
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
              <BigButton onClick={copyText}>{copied ? "Copied" : "Copy the list"}</BigButton>
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
  const item = ITEMS[i];
  const opt = item.options[o];
  const product = productFor(item.id, o);
  const rot = drag / 22;
  const flyX = flying === "left" ? -520 : flying === "right" ? 520 : drag;

  return (
    <Shell>
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: T.paper, borderBottom: `1px solid ${T.rule}` }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "11px 16px 9px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={back} aria-label="Back" style={{ fontFamily: MONO, fontSize: 17, background: "none", border: "none", color: T.olive, cursor: "pointer", padding: "2px 4px 2px 0" }}>
            ←
          </button>
          <div style={{ flex: 1, height: 3, background: T.rule, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(decided / ITEMS.length) * 100}%`, background: T.olive, transition: reduced ? "none" : "width 220ms ease" }} />
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
            {String(i + 1).padStart(2, "0")}/{ITEMS.length}
          </span>
        </div>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 27, lineHeight: 1.15, color: T.oliveDeep, margin: "8px 0 0", letterSpacing: "-.01em" }}>{item.name}</h2>
        <p style={{ fontFamily: BODY, fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft, margin: "5px 0 0" }}>{item.note}</p>

        {/* option pips */}
        <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ flex: 1, height: 3, borderRadius: 2, background: k <= o ? T.olive : T.rule }} />
          ))}
        </div>

        {/* card */}
        <div
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
          onMouseDown={onStart}
          onMouseMove={(e) => startX.current !== null && onMove(e)}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          style={{
            marginTop: 12,
            background: T.card,
            border: `1px solid ${T.rule}`,
            borderRadius: 8,
            overflow: "hidden",
            transform: `translateX(${flyX}px) rotate(${flying ? (flying === "left" ? -14 : 14) : rot}deg)`,
            transition: startX.current !== null || reduced ? "none" : "transform 200ms ease, opacity 200ms ease",
            opacity: flying ? 0 : 1,
            touchAction: "pan-y",
            userSelect: "none",
            position: "relative",
          }}
        >
          {/* stamps */}
          <Stamp show={drag > 55} side="right" label="IN THE BASKET" colour={T.olive} />
          <Stamp show={drag < -55} side="left" label="NEXT OPTION" colour={T.brick} />

          <PhotoPane product={product} id={item.id} />

          <div style={{ padding: "14px 16px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em", color: opt.tier === "Splurge" ? T.brick : T.olive }}>
                {opt.tier.toUpperCase()} · {opt.retailer.toUpperCase()}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 15, color: T.ink, whiteSpace: "nowrap" }}>
                {money(priceOf(product, opt))}
                {isEstimate(product) && <Est />}
              </span>
            </div>
            <div style={{ fontFamily: BODY, fontSize: 17, fontWeight: 600, color: T.ink, marginTop: 6 }}>
              {product?.name || opt.title}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 13.5, color: T.inkSoft, marginTop: 3 }}>{opt.desc}</div>
            <Swap product={product} wanted={opt.title} />
            <a
              href={product?.sourceUrl || searchUrl(opt.retailer, opt.title)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", marginTop: 11, fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: T.olive, textDecoration: "none" }}
            >
              {product?.sourceUrl ? "OPEN AT " : "SEARCH "}{opt.retailer.toUpperCase()} ↗
            </a>
          </div>
        </div>

        {/* controls */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <RoundButton onClick={reject} label="✕" colour={T.brick} title="Next option" />
          <button
            onClick={haveIt}
            style={{ flex: 1, fontFamily: BODY, fontSize: 14, padding: "13px 10px", borderRadius: 3, cursor: "pointer", background: T.card, color: T.inkSoft, border: `1px dashed ${T.rule}` }}
          >
            Already have it
          </button>
          <RoundButton onClick={accept} label="♥" colour={T.olive} title="Add to basket" />
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, color: T.inkFaint, marginTop: 14, letterSpacing: ".08em", textAlign: "center" }}>
          SWIPE LEFT FOR THE NEXT OPTION · RIGHT TO BUY · {o + 1} OF 3
        </div>
      </div>
    </Shell>
  );
}

/* ────────────────────────────────────────────────────────────
   Bits
   ──────────────────────────────────────────────────────────── */
function PhotoPane({ product, id }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [product && product.image]);

  const showImg = Boolean(product && product.image) && !broken;

  return (
    <div style={{ height: 250, background: showImg ? "#fff" : T.oliveWash, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${T.rule}`, position: "relative" }}>
      {showImg ? (
        <img
          src={product.image}
          alt=""
          onError={() => setBroken(true)}
          draggable={false}
          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        />
      ) : (
        <div style={{ textAlign: "center", padding: "0 16px" }}>
          <Sketch id={id} size={78} color={T.oliveDeep} />
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", color: T.inkFaint, marginTop: 8 }}>
            {broken ? "PHOTO MISSING FROM DISK · RE-RUN THE SCRAPER" : "DRAWING · NO PHOTO SCRAPED"}
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ product, id }) {
  const [broken, setBroken] = useState(false);
  if (product && product.image && !broken)
    return <img src={product.image} alt="" onError={() => setBroken(true)} style={{ width: 34, height: 34, objectFit: "contain", background: "#fff", borderRadius: 3 }} />;
  return <Sketch id={id} size={26} color={T.olive} />;
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

function Stamp({ show, side, label, colour }) {
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
        transform: `rotate(${side === "right" ? -9 : 9}deg)`,
        opacity: show ? 1 : 0,
        transition: "opacity 120ms ease",
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
        width: 54,
        height: 54,
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

function Sketch({ id, size = 48, color = T.olive, stroke = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {D[id] || <circle cx="24" cy="24" r="14" />}
    </svg>
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
