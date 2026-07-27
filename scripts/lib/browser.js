/* ────────────────────────────────────────────────────────────
   Headless browser, loaded only if we actually need it.

   John Lewis is behind bot protection that plain fetch may not get
   past. Rather than make Playwright a hard dependency of every run, we
   import it lazily the first time a page comes back blocked, and
   degrade with a clear message if it is not installed.
   ──────────────────────────────────────────────────────────── */

import { USER_AGENT } from "./net.js";

let browserPromise = null;
let unavailableReason = null;

export function browserUnavailableReason() {
  return unavailableReason;
}

async function launch() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    unavailableReason =
      "playwright is not installed — run `npm install playwright && npx playwright install chromium` to enable the browser fallback";
    return null;
  }
  try {
    const browser = await chromium.launch({
      args: ["--disable-blink-features=AutomationControlled"],
    });
    return browser;
  } catch (err) {
    unavailableReason = `playwright could not launch a browser (${err.message.split("\n")[0]}) — run \`npx playwright install chromium\``;
    return null;
  }
}

async function getBrowser() {
  if (unavailableReason) return null;
  if (!browserPromise) browserPromise = launch();
  return browserPromise;
}

/* Render a page and return its HTML after client-side scripts have run.
   Returns null if no browser is available, so callers can treat it as
   just another failed rung on the ladder. */
export async function renderPage(url, { timeoutMs = 45000, settleMs = 2500 } = {}) {
  const browser = await getBrowser();
  if (!browser) return null;

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-GB",
    timezoneId: "Europe/London",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9" },
  });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    /* Give any interstitial challenge and the JSON-LD injection a moment. */
    await page.waitForTimeout(settleMs);
    const html = await page.content();
    return { html, finalUrl: page.url() };
  } catch (err) {
    return { html: null, finalUrl: url, error: err.message.split("\n")[0] };
  } finally {
    await context.close().catch(() => {});
  }
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  if (browser) await browser.close().catch(() => {});
  browserPromise = null;
}
