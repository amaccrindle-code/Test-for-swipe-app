/* ────────────────────────────────────────────────────────────
   Polite HTTP.

   One request per second globally, a real browser User-Agent (IKEA
   redirects or blocks without one), and a hard timeout so a hanging
   retailer cannot stall a 210-option run.
   ──────────────────────────────────────────────────────────── */

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

let minGapMs = 1000;

/* One schedule per host rather than one for everything.

   A single global queue meant eleven shops took eleven times as long as
   one, despite none of them being asked for more than a request a
   second. Keyed by hostname, each site still sees the same polite rate,
   but they are no longer made to queue behind each other — which is the
   difference between a 40-minute scrape and a seven-hour one. */
const nextSlot = new Map();

export function setRateLimit(ms) {
  minGapMs = Math.max(0, ms);
}

export function resetRateLimiter() {
  nextSlot.clear();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
};

async function takeSlot(url) {
  const host = hostOf(url);
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(host) || 0);
  nextSlot.set(host, at + minGapMs);
  if (at > now) await sleep(at - now);
}

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.url = url;
    /* 403/429 from a retailer means bot protection, not a dead page —
       that is the signal to escalate to a real browser. */
    this.blocked = status === 403 || status === 429 || status === 503;
  }
}

export async function fetchText(url, { timeoutMs = 20000, headers = {}, accept } = {}) {
  await takeSlot(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { ...BROWSER_HEADERS, ...(accept ? { Accept: accept } : {}), ...headers },
    });
    if (!res.ok) throw new HttpError(res.status, url);
    return { text: await res.text(), finalUrl: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, opts = {}) {
  const { text, finalUrl } = await fetchText(url, {
    ...opts,
    accept: "application/json,text/plain,*/*",
  });
  return { json: JSON.parse(text), finalUrl };
}

export async function fetchBuffer(url, { timeoutMs = 30000, referer } = {}) {
  await takeSlot(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        ...(referer ? { Referer: referer } : {}),
      },
    });
    if (!res.ok) throw new HttpError(res.status, url);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}
