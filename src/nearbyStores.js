// Finds shops near the user, then checks which of them have their own app in Poica's catalog
// (appCatalog.json's "stores" patterns, matched against the shop's name or brand on OpenStreetMap).
// A card is suggested only through its catalog app, never by its own name: the name a user gives a card
// is not the shop's name. Asks the Overpass API with the position rounded to about 100 m; results are
// cached per rounded spot.
import catalog from './appCatalog.json';
import { catalogApp } from './appLink';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const RADIUS_M = 250;
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map(); // key -> { t, stores }

const round = (v) => Math.round(v * 1000) / 1000; // ~100 m

// Short Latin names (GU, JINS, H&M...) must stand alone, so 「GU」 doesn't match 「Gusto」.
// Overpass gets the plain patterns; this stricter check runs on what comes back.
const strict = (pattern) => pattern.split('|')
  .map((alt) => (/^[A-Za-z0-9&. -]+$/.test(alt) ? `(^|[^A-Za-z])${alt.replace(/[.]/g, '\\.')}([^A-Za-z]|$)` : alt))
  .join('|');
const CHAINS = catalog.apps
  .filter((x) => x.stores)
  .map((x) => ({ id: x.id, re: new RegExp(strict(x.stores), 'i'), pattern: x.stores }));
const ALL = CHAINS.map((x) => x.pattern).join('|').replace(/"/g, '');

// Which catalog apps belong to this shop (by its name or brand tag).
function appsOf(tags) {
  const text = [tags.name, tags.brand, tags['brand:ja'], tags['name:ja']].filter(Boolean).join(' ');
  return CHAINS.filter((x) => x.re.test(text)).map((x) => x.id);
}

// radius: metres to search (the user's 近くの範囲), 250 when automatic.
export async function fetchNearbyStores(pos, radius = RADIUS_M) {
  if (!pos || !ALL) return [];
  const lat = round(pos.lat);
  const lng = round(pos.lng);
  const key = `${lat},${lng},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.stores;

  const around = `(around:${radius},${lat},${lng})`;
  // Only shops, restaurants, fuel stations and the like, so bus stops or flats named 「〜プラザ」 don't use up the result limit.
  const kind = '[~"^(shop|amenity|leisure)$"~"."]';
  const query = `[out:json][timeout:12];(nwr["name"~"${ALL}",i]${kind}${around};nwr["brand"~"${ALL}",i]${kind}${around};);out center tags 200;`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 14000);
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
        name: e.tags?.name || e.tags?.brand || '',
        lat: e.lat ?? e.center?.lat,
        lng: e.lon ?? e.center?.lon,
        apps: appsOf(e.tags || {}),
      }))
      .filter((s) => s.name && s.lat != null && s.lng != null && s.apps.length);
    cache.set(key, { t: Date.now(), stores });
    return stores;
  } finally {
    clearTimeout(timer);
  }
}

// Does this nearby shop have this card's app? Only cards made from the catalog can match.
export function storeHasCard(store, card) {
  if (card.kind !== 'app' || !card.catalogId) return false;
  const app = catalogApp(card.catalogId);
  return !!app && !!app.stores && store.apps.includes(card.catalogId);
}
