// Free-tier and paid limits. The defaults live here; the developer can change them without an app update
// by editing config.json on the public site. The fetch is a plain GET that sends nothing about the user.
import { getSetting, setSetting } from './storage';

export const LIMITS_URL = 'https://gotam5.github.io/poica-site/config.json'; // placeholder until the site's host is decided
export const DEFAULT_LIMITS = { freeCardLimit: 5, freeNearbyLimit: 1, paidNearbyLimit: 3 };
const DAY = 24 * 60 * 60 * 1000;

// Keep only sane whole numbers (0-10); anything else falls back to `base`.
// Buyers are never given less than they paid for: paidNearbyLimit never drops below the default.
function clean(raw, base) {
  const pick = (k, min) => (Number.isInteger(raw?.[k]) && raw[k] >= min && raw[k] <= 10 ? raw[k] : base[k]);
  const out = {
    freeCardLimit: pick('freeCardLimit', 1),
    freeNearbyLimit: pick('freeNearbyLimit', 0),
    paidNearbyLimit: Math.max(pick('paidNearbyLimit', 1), DEFAULT_LIMITS.paidNearbyLimit),
  };
  out.freeNearbyLimit = Math.min(out.freeNearbyLimit, out.paidNearbyLimit);
  return out;
}

// The last values saved on the phone, else the defaults.
export async function loadLimits() {
  try { return clean(await getSetting('limits', null), DEFAULT_LIMITS); } catch { return DEFAULT_LIMITS; }
}

// Fetch config.json at most once a day. Returns the new limits, or null when nothing was fetched.
export async function refreshLimits() {
  try {
    const last = await getSetting('limitsFetchedAt', 0);
    if (Date.now() - last < DAY) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(LIMITS_URL, { signal: ctl.signal, cache: 'no-store' }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const raw = await res.json();
    const limits = clean(raw, await loadLimits());
    await setSetting('limits', limits);
    // Where the opt-in usage report goes (report.js); empty or missing turns sending off.
    await setSetting('usageUrl', typeof raw?.usageUrl === 'string' && /^https:\/\//.test(raw.usageUrl) ? raw.usageUrl : null);
    await setSetting('limitsFetchedAt', Date.now());
    return limits;
  } catch {
    return null;
  }
}
