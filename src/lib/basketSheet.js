/* ────────────────────────────────────────────────────────────
   The basket as a spreadsheet.

   One row per thing to buy, grouped by shop with a subtotal each, and a
   grand total at the bottom as a live =SUM() so editing a price in
   Excel updates it. Prices the scraper could not find are marked as
   estimates rather than passed off as real.
   ──────────────────────────────────────────────────────────── */

import { buildXlsx, downloadBlob, XLSX_STYLES as S, xlsxLink } from "./xlsx.js";

const HEADERS = ["Room", "What it's for", "Product", "Shop", "Price", "Price is", "Link"];
const WIDTHS = [14, 26, 46, 13, 11, 10, 52];

export function basketRows(bought) {
  const byShop = bought.reduce((acc, b) => {
    const shop = b.product?.retailer || b.opt.retailer;
    (acc[shop] = acc[shop] || []).push(b);
    return acc;
  }, {});

  const rows = [HEADERS.map((h) => ({ v: h, s: S.bold }))];
  /* Row numbers are 1-based and the header is row 1, so the first data
     row is 2. Tracked as we go so the SUM ranges are right. */
  const priceRows = [];

  for (const [shop, list] of Object.entries(byShop)) {
    const firstRow = rows.length + 1;

    for (const b of list) {
      rows.push([
        b.item.room,
        b.item.name,
        b.product?.name || b.opt.title,
        shop,
        { v: b.price, s: S.money },
        b.product?.price != null ? "scraped" : "estimate",
        xlsxLink(b.product?.sourceUrl, b.product?.sourceUrl || ""),
      ]);
      priceRows.push(rows.length);
    }

    const lastRow = rows.length;
    rows.push([
      "",
      "",
      { v: `${shop} subtotal`, s: S.bold },
      "",
      { s: S.moneyBold, formula: `SUM(E${firstRow}:E${lastRow})` },
      "",
      "",
    ]);
    rows.push([]);
  }

  rows.push([
    "",
    "",
    { v: "TOTAL", s: S.bold },
    "",
    { s: S.moneyBold, formula: priceRows.length ? priceRows.map((r) => `E${r}`).join("+") : "0" },
    "",
    "",
  ]);

  rows.push([]);
  rows.push([{ v: `Saved ${new Date().toLocaleString("en-GB")} · prices as scraped, re-run the scraper before ordering`, s: S.muted }]);

  return rows;
}

export function downloadBasket(bought) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = buildXlsx({
    rows: basketRows(bought),
    widths: WIDTHS,
    sheetName: "Basket",
  });
  downloadBlob(blob, `swipe-the-flat-basket-${stamp}.xlsx`);
}
