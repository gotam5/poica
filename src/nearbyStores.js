// Finds chain shops near the user so their own card/app can be suggested before it was ever used there.
// Asks OpenStreetMap (Overpass API) with the position rounded to about 100 m. Only shop names that
// match the user's registered cards are requested, and results are cached per rounded spot.
import { catalogApp } from './appLink';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 250;
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map(); // key -> { t, stores }

const round = (v) => Math.round(v * 1000) / 1000; // ~100 m

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()[\]\\"]/g, '\\$&');
}

// patterns: array of "A|B" strings (already safe alternations from the catalog or escaped card names)
export async function fetchNearbyStores(pos, patterns) {
  const uniq = [...new Set(patterns.filter(Boolean))];
  if (!pos || !uniq.length) return [];
  const lat = round(pos.lat);
  const lng = round(pos.lng);
  const key = `${lat},${lng}|${uniq.sort().join('|')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.stores;

  const regex = uniq.join('|').replace(/"/g, '');
  const query = `[out:json][timeout:8];nwr["name"~"${regex}",i](around:${RADIUS_M},${lat},${lng});out center tags 40;`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const stores = (json.elements || [])
      .map((e) => ({
        name: e.tags?.name || '',
        lat: e.lat ?? e.center?.lat,
        lng: e.lon ?? e.center?.lon,
      }))
      .filter((s) => s.name && s.lat != null && s.lng != null);
    cache.set(key, { t: Date.now(), stores });
    return stores;
  } finally {
    clearTimeout(timer);
  }
}

export function namePattern(name) {
  const core = String(name || '').replace(/^見本\s*/, '').replace(/(ポイント)?(カード|アプリ|会員証)$/g, '').trim();
  return core.length >= 2 ? escapeRegex(core) : null;
}

// The shop-name pattern for a card: its catalog chain, else its own name. Sets combine their members.
export function storePatternOf(card, allCards) {
  if (card.kind === 'set') {
    const parts = (card.steps || [])
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c) => c && c.kind !== 'set')
      .map((c) => storePatternOf(c, allCards));
    const own = namePattern(card.name);
    return [own, ...parts].filter(Boolean).join('|') || null;
  }
  if (card.kind === 'app' && card.catalogId) {
    const app = catalogApp(card.catalogId);
    return app ? app.stores || null : null; // common points / payments are not tied to a shop
  }
  return namePattern(card.name);
}

export function storeRegex(pattern) {
  if (!pattern) return null;
  try { return new RegExp(pattern, 'i'); } catch { return null; }
}
