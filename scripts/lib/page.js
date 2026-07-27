/* ────────────────────────────────────────────────────────────
   Fetch a page, escalating to a headless browser when the retailer
   blocks the plain request.

   Every attempt is appended to `tried`, so the probe and the failure
   log can show exactly which rung of the ladder produced the result —
   or where it stopped.
   ──────────────────────────────────────────────────────────── */

import { fetchText, HttpError } from "./net.js";
import { renderPage, browserUnavailableReason } from "./browser.js";

export async function getPage(url, tried = [], label = "page") {
  try {
    const { text, finalUrl } = await fetchText(url);
    tried.push({ step: `${label}:fetch`, url, ok: true });
    return { html: text, finalUrl, via: "fetch" };
  } catch (err) {
    const blocked = err instanceof HttpError && err.blocked;
    const timedOut = err.name === "AbortError" || /aborted|timeout/i.test(err.message);
    tried.push({ step: `${label}:fetch`, url, ok: false, error: err.message, blocked });

    /* A 404 means the URL is wrong — a browser will not help. Only
       escalate for bot protection or a stall. */
    if (!blocked && !timedOut) return { html: null, finalUrl: url, error: err.message, tried };

    const rendered = await renderPage(url);
    if (!rendered) {
      const error = browserUnavailableReason();
      tried.push({ step: `${label}:browser`, url, ok: false, error });
      return { html: null, finalUrl: url, error, tried };
    }
    if (!rendered.html) {
      tried.push({ step: `${label}:browser`, url, ok: false, error: rendered.error });
      return { html: null, finalUrl: url, error: rendered.error, tried };
    }
    tried.push({ step: `${label}:browser`, url, ok: true });
    return { html: rendered.html, finalUrl: rendered.finalUrl, via: "browser" };
  }
}
