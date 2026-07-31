#!/usr/bin/env node
/* ────────────────────────────────────────────────────────────
   Parser tests against fixtures — no network.

   The scraper's riskiest code is not the fetching, it is the parsing:
   JSON-LD `image` and `offers` are polymorphic and every retailer ships
   a different shape. These fixtures cover the shapes IKEA and John
   Lewis actually use, plus the awkward ones.

     node scripts/test-parsers.mjs
   ──────────────────────────────────────────────────────────── */

import {
  extractProduct,
  findProductNode,
  firstImage,
  offerPrice,
  parsePrice,
  metaTags,
  links,
  urlsInSource,
  decodeEntities,
} from "./lib/parse.js";
import { matchScore, ikeaArticleName, queryVariants, IKEA, JL } from "./lib/retailers.js";

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failures.push(`${name}\n      expected ${e}\n      actual   ${a}`);
  }
}

function ok(name, condition, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${name}${detail ? `\n      ${detail}` : ""}`);
}

/* ── Fixtures ─────────────────────────────────────────────── */

/* IKEA: single Product node, image as a bare string, offers as an
   object with a plain numeric price. */
const IKEA_PAGE = `<!doctype html><html><head>
<title>KNODD Bin with lid, white, 40 l - IKEA</title>
<meta property="og:title" content="KNODD Bin with lid, white, 40 l">
<meta property="og:image" content="https://www.ikea.com/gb/en/images/products/knodd-bin-with-lid-white__0713874_pe729434_s5.jpg">
<script type="application/ld+json">
{"@context":"https://schema.org/","@type":"Product","name":"KNODD Bin with lid, white, 40 l",
"image":"https://www.ikea.com/gb/en/images/products/knodd-bin-with-lid-white__0713874_pe729434_s5.jpg",
"sku":"70289984","brand":{"@type":"Brand","name":"IKEA"},
"offers":{"@type":"Offer","priceCurrency":"GBP","price":"45.00","availability":"https://schema.org/InStock"}}
</script></head><body></body></html>`;

/* John Lewis: @graph wrapper, image as an array, offers as an array
   with priceSpecification nesting, and an HTML-entity in the name. */
const JL_PAGE = `<!doctype html><html><head>
<title>Brabantia Touch Bin, 40L | John Lewis &amp; Partners</title>
<meta property="og:image" content="https://johnlewis.scene7.com/is/image/JohnLewis/003182495?$rsp-pdp-port-640$">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
 {"@type":"BreadcrumbList","itemListElement":[]},
 {"@type":"Product","name":"Brabantia Touch Bin, 40L, Matt Steel &amp; Fingerprint Proof",
  "image":["https://johnlewis.scene7.com/is/image/JohnLewis/003182495","https://johnlewis.scene7.com/is/image/JohnLewis/003182495alt"],
  "offers":[{"@type":"Offer","priceCurrency":"GBP",
    "priceSpecification":{"@type":"UnitPriceSpecification","price":"189.00","priceCurrency":"GBP"}}]}
]}
</script></head><body>
<a href="/brabantia-touch-bin-40l/white/p3182495">Brabantia Touch Bin 40L</a>
<a href="/joseph-joseph-index-chopping-board-set/p231889?colour=green">Joseph Joseph</a>
<a href="/help/delivery">Delivery</a>
</body></html>`;

/* A page where JSON-LD is absent entirely and only Open Graph is there. */
const OG_ONLY_PAGE = `<html><head>
<meta property="og:title" content="ANYDAY Sensor Bin, 45L">
<meta property="og:image" content="/media/anyday-sensor-bin.jpg">
<meta property="product:price:amount" content="80.00">
</head><body></body></html>`;

/* Bot-protection interstitial: looks like a page, has nothing useful. */
const BLOCKED_PAGE = `<html><head><title>Access Denied</title></head><body>
<h1>Pardon the interruption</h1></body></html>`;

/* ── extractProduct ───────────────────────────────────────── */

const ikea = extractProduct(IKEA_PAGE, "https://www.ikea.com/gb/en/p/knodd-70289984/");
check("IKEA name", ikea.name, "KNODD Bin with lid, white, 40 l");
check("IKEA price", ikea.price, 45);
check("IKEA image via json-ld", ikea.via.image, "json-ld");
ok("IKEA image is absolute", ikea.image?.startsWith("https://www.ikea.com/gb/en/images/"), ikea.image);

const jl = extractProduct(JL_PAGE, "https://www.johnlewis.com/x/p3182495");
check("JL name decoded from @graph", jl.name, "Brabantia Touch Bin, 40L, Matt Steel & Fingerprint Proof");
check("JL price from nested priceSpecification", jl.price, 189);
check("JL image is first of array", jl.image, "https://johnlewis.scene7.com/is/image/JohnLewis/003182495");
check("JL found json-ld", jl.hasJsonLd, true);

const og = extractProduct(OG_ONLY_PAGE, "https://www.johnlewis.com/anyday/p1");
check("OG-only name", og.name, "ANYDAY Sensor Bin, 45L");
check("OG-only price", og.price, 80);
check("OG-only image made absolute", og.image, "https://www.johnlewis.com/media/anyday-sensor-bin.jpg");
check("OG-only records og:image rung", og.via.image, "og:image");
check("OG-only has no json-ld", og.hasJsonLd, false);

const blocked = extractProduct(BLOCKED_PAGE, "https://www.johnlewis.com/x");
check("blocked page yields no image", blocked.image, null);
check("blocked page yields no price", blocked.price, null);
ok("blocked page is detectably useless", !blocked.image && !blocked.price);

/* ── Polymorphic field handling ───────────────────────────── */

check("image as string", firstImage("https://x/a.jpg"), "https://x/a.jpg");
check("image as array", firstImage(["https://x/a.jpg", "https://x/b.jpg"]), "https://x/a.jpg");
check("image as ImageObject", firstImage({ "@type": "ImageObject", url: "https://x/c.jpg" }), "https://x/c.jpg");
check("image as ImageObject array", firstImage([{ contentUrl: "https://x/d.jpg" }]), "https://x/d.jpg");
check("image empty", firstImage(null), null);

check("offers plain", offerPrice({ price: "45.00" }), 45);
check("offers array", offerPrice([{ price: 12 }, { price: 99 }]), 12);
check("offers lowPrice", offerPrice({ "@type": "AggregateOffer", lowPrice: "220.00" }), 220);
check("offers nested spec", offerPrice({ priceSpecification: { price: "7.50" } }), 7.5);
check("offers missing", offerPrice(undefined), null);

check("price with symbol", parsePrice("£1,299.99"), 1299.99);
check("price bare number", parsePrice(45), 45);
check("price junk", parsePrice("Call for price"), null);
check("price zero", parsePrice("0.00"), 0);

check("entities", decodeEntities("Matt Steel &amp; More &#163;5 &pound;6"), "Matt Steel & More £5 £6");

/* ── Meta and link extraction ─────────────────────────────── */

const metas = metaTags(JL_PAGE);
ok("meta og:image found", metas["og:image"]?.includes("scene7"), JSON.stringify(metas));

const jlLinks = links(JL_PAGE, "https://www.johnlewis.com", (h) => /\/p\d{5,}/.test(h));
check("JL product links found", jlLinks.length, 2);
ok("JL link is absolute", jlLinks[0].startsWith("https://www.johnlewis.com/"), jlLinks[0]);

/* Product URLs hiding in inlined JSON state rather than an <a href>. */
const STATE_PAGE = `<script>window.__STATE__={"items":[{"url":"\\/gb\\/en\\/p\\/vorda-knife-set-3-piece-30289571\\/"}]}</script>`;
const stateUrls = urlsInSource(STATE_PAGE, "https://www.ikea.com", (h) => /\/gb\/en\/p\//.test(h));
ok("escaped URL recovered from inline JSON", stateUrls.length >= 1, JSON.stringify(stateUrls));

/* ── Matching and query building ──────────────────────────── */

check("article name simple", ikeaArticleName("KNODD bin with lid 40L"), "KNODD");
check("article name accented", ikeaArticleName("VÖRDA knife set 3 piece"), "VÖRDA");
check("article name absent", ikeaArticleName("John Lewis ANYDAY cutlery set"), null);

ok(
  "exact IKEA match scores high",
  matchScore("KNODD Bin with lid, white, 40 l", "KNODD bin with lid 40L") > 0.8,
  String(matchScore("KNODD Bin with lid, white, 40 l", "KNODD bin with lid 40L"))
);
ok(
  "wrong IKEA product scores low",
  matchScore("HEMNES chest of drawers", "KNODD bin with lid 40L") < 0.3,
  String(matchScore("HEMNES chest of drawers", "KNODD bin with lid 40L"))
);
ok(
  "right product beats wrong product",
  matchScore("Brabantia Touch Bin 40L Matt Steel", "Brabantia Touch Bin 40L") >
    matchScore("Brabantia Bo Pedal Bin 60L", "Brabantia Touch Bin 40L")
);
check("empty match is zero", matchScore("", "anything"), 0);

/* Regression: the live probe resolved "ANYDAY sensor bin 45L" to "EKO
   Deluxe Mirage Sensor Bin, 50L" at 0.50 — wrong brand, wrong size,
   yet over the old 0.4 threshold. Both signals must now sink it. */
const ekoScore = matchScore("EKO Deluxe Mirage Sensor Bin, 50L, Stainless Steel", "ANYDAY sensor bin 45L");
ok("wrong brand and size is rejected", ekoScore < 0.3, `scored ${ekoScore.toFixed(2)}`);

const rightBin = matchScore("John Lewis ANYDAY Sensor Bin, 45L, Stainless Steel", "ANYDAY sensor bin 45L");
ok("right brand and size scores high", rightBin > 0.85, `scored ${rightBin.toFixed(2)}`);
ok("right product beats the EKO near-miss", rightBin > ekoScore * 2.5);

/* Size alone should separate two otherwise identical listings. */
const size40 = matchScore("Brabantia Touch Bin, 40L, Matt Steel", "Brabantia Touch Bin 40L");
const size60 = matchScore("Brabantia Touch Bin, 60L, Matt Steel", "Brabantia Touch Bin 40L");
ok("matching size wins over mismatched size", size40 > size60, `${size40.toFixed(2)} vs ${size60.toFixed(2)}`);

/* Units normalise: "40 l", "40L" and "40 litres" are the same size. */
check("litres and L are the same token", matchScore("KNODD Bin with lid 40 litres", "KNODD bin with lid 40L") > 0.9, true);
check("IKEA API name still scores 1.00", Number(matchScore("KNODD Bin with lid 40 l", "KNODD bin with lid 40L").toFixed(2)), 1);

/* Piece counts behave like sizes. */
const p16 = matchScore("John Lewis ANYDAY Cutlery Set, 16 Piece", "John Lewis ANYDAY cutlery set 16 piece");
const p24 = matchScore("John Lewis ANYDAY Cutlery Set, 24 Piece", "John Lewis ANYDAY cutlery set 16 piece");
ok("matching piece count wins", p16 > p24, `${p16.toFixed(2)} vs ${p24.toFixed(2)}`);

/* A missing brand must not be rescued by generic words alone. */
const generic = matchScore("Joseph Joseph Chopping Board Set", "Brabantia Touch Bin 40L");
ok("unrelated product scores near zero", generic < 0.2, `scored ${generic.toFixed(2)}`);

const ikeaQueries = queryVariants("KNODD bin with lid 40L", IKEA);
check("IKEA queries lead with article name", ikeaQueries[0], "KNODD");
const jlQueries = queryVariants("John Lewis ANYDAY cutlery set 16 piece", JL);
check("JL queries lead with full title", jlQueries[0], "John Lewis ANYDAY cutlery set 16 piece");
ok("JL queries keep ANYDAY when trimming", jlQueries.some((q) => q.startsWith("ANYDAY")), JSON.stringify(jlQueries));

/* ── Report ───────────────────────────────────────────────── */

console.log(`\n  parser tests: ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`    ✗ ${f}\n`);
  process.exit(1);
}
console.log("  Parsing logic is sound for the shapes IKEA and John Lewis ship.");
console.log("  What it cannot prove without network access: that the live pages still");
console.log("  serve those shapes, and that John Lewis lets a plain fetch through.");
console.log("  Run `npm run scrape:probe` on your machine to settle both.\n");
