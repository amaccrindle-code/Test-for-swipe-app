/* ────────────────────────────────────────────────────────────
   A real .xlsx, written by hand.

   An xlsx is a zip of XML parts, so the only dependency is fflate for
   the zipping. Writing the XML directly rather than pulling in a
   spreadsheet library keeps the bundle small and avoids the audit noise
   around the popular ones — and the file we need is a header, some
   rows, and a SUM.

   Deliberate choices:
   - Inline strings rather than a shared-strings table. Slightly larger
     file, one fewer part to keep consistent.
   - The total is a real =SUM() formula, not a baked number, so editing
     a price in Excel updates it.
   - Links use the HYPERLINK() formula rather than the relationship
     plumbing real hyperlinks need. Clickable, and the URL stays legible
     as text.
   ──────────────────────────────────────────────────────────── */

import { zipSync, strToU8 } from "fflate";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Excel column letters: 0 → A, 26 → AA. */
function colName(index) {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

/* Style indices, matching the cellXfs order in STYLES below. */
const S = { plain: 0, bold: 1, money: 2, moneyBold: 3, muted: 4 };

function cell(ref, value, style = S.plain) {
  if (value == null || value === "") return `<c r="${ref}" s="${style}"/>`;

  if (typeof value === "number") {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  if (typeof value === "object" && value.formula) {
    /* No cached <v>: Excel evaluates on open, which keeps the SUM
       honest if rows are edited before it is first calculated. */
    return `<c r="${ref}" s="${style}"><f>${esc(value.formula)}</f></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

const link = (url, label) =>
  url ? { formula: `HYPERLINK("${String(url).replace(/"/g, "")}","${String(label ?? url).replace(/"/g, "")}")` } : "";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const workbook = (sheetName) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

/* Excel is strict here: two fills are required, and the first must be
   none and the second gray125, whether or not anything uses them. */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;£&quot;#,##0.00"/></numFmts>
<fonts count="3">
<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF808080"/><name val="Calibri"/></font>
</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/* Build the sheet from an array of rows, each an array of cells.
   A cell is a string, a number, {formula}, or {v, s} to set a style. */
function sheet(rows, widths) {
  const cols = widths
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";

  /* Normalise every shape a caller might pass — bare value, {v, s},
     {formula}, or {formula, s} — so a styled formula keeps its style. */
  const norm = (c) => {
    if (c == null) return { value: "", style: S.plain };
    if (typeof c === "object") {
      if (c.formula) return { value: { formula: c.formula }, style: c.s ?? S.plain };
      return { value: c.v, style: c.s ?? S.plain };
    }
    return { value: c, style: S.plain };
  };

  const body = rows
    .map((cells, r) => {
      const inner = cells
        .map((c, i) => {
          const { value, style } = norm(c);
          return cell(`${colName(i)}${r + 1}`, value, style);
        })
        .join("");
      return `<row r="${r + 1}">${inner}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${cols}<sheetData>${body}</sheetData>
</worksheet>`;
}

export function buildXlsx({ rows, widths, sheetName = "Sheet1" }) {
  const zipped = zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES),
      "_rels/.rels": strToU8(ROOT_RELS),
      "xl/workbook.xml": strToU8(workbook(sheetName)),
      "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
      "xl/styles.xml": strToU8(STYLES),
      "xl/worksheets/sheet1.xml": strToU8(sheet(rows, widths)),
    },
    { level: 6 }
  );
  return new Blob([zipped], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoking immediately can cancel the download in some browsers. */
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export { S as XLSX_STYLES, link as xlsxLink };
