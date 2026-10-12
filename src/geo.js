// Location helpers. Places are learned from where a card was shown; no store database.
export const LEARN_MAX_ACC = 120; // m: only learn when the fix is at least this good
export const MERGE_DIST = 70;     // m: a fix this close to a known place reinforces it
export const POS_FRESH_MS = 3 * 60 * 1000;

export function distance(a, b) {
  const R = 6371e3;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestPlace(card, pos) {
  if (!pos || !card.places || !card.places.length) return null;
  let best = null;
  for (const p of card.places) {
    const d = distance(pos, p);
    if (best == null || d < best) best = d;
  }
  return best;
}

// How close counts as "this shop": widen it when the GPS fix is poor (indoors).
export function nearRadius(pos) {
  return Math.min(400, Math.max(150, (pos ? pos.acc : 0) * 1.5));
}

export function formatDistance(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
}

// Returns a new places array and whether a new place was added.
export function learnPlace(card, pos, force = false) {
  const places = (card.places || []).map((p) => ({ ...p }));
  if (!pos) return { places, added: false };
  if (!force && (Date.now() - pos.t > POS_FRESH_MS || pos.acc > LEARN_MAX_ACC)) return { places, added: false };
  const hit = places.find((p) => distance(pos, p) < MERGE_DIST);
  if (hit) {
    const n = hit.n || 1;
    hit.lat = (hit.lat * n + pos.lat) / (n + 1);
    hit.lng = (hit.lng * n + pos.lng) / (n + 1);
    hit.n = n + 1;
    hit.t = Date.now();
    return { places, added: false };
  }
  places.push({ lat: pos.lat, lng: pos.lng, n: 1, t: Date.now() });
  places.sort((a, b) => b.t - a.t);
  return { places: places.slice(0, 30), added: true };
}

// Home screen sections:
//  recent  - the last things used (up to 2)
//  suggest - near you (up to maxSuggest, 3 by default): cards used most around here first, then a shop of the card's chain
//  all     - every card, last used first
// storeHasCard(store, card) says whether a nearby shop (from nearbyStores.js) has that card's app.
// How many times a card was shown within r metres of pos (each learned place counts its uses in n).
export function usesNear(card, pos, r) {
  if (!pos || !card.places) return 0;
  return card.places.reduce((sum, p) => (distance(pos, p) <= r ? sum + (p.n || 1) : sum), 0);
}

export function arrange(cards, pos, query, stores = [], storeHasCard = () => false, maxSuggest = 3) {
  const r = nearRadius(pos);
  const byId = new Map();
  for (const c of cards) {
    const d = nearestPlace(c, pos);
    if (d != null && d <= r) byId.set(c.id, { card: c, dist: d, reason: 'used', here: usesNear(c, pos, r) });
  }
  if (pos && stores.length) {
    for (const c of cards) {
      let best = null;
      for (const st of stores) {
        if (!storeHasCard(st, c)) continue;
        const d = distance(pos, st);
        if (!best || d < best.dist) best = { dist: d, store: st.name };
      }
      if (!best || best.dist > 300) continue;
      const prev = byId.get(c.id);
      if (!prev) byId.set(c.id, { card: c, dist: best.dist, reason: 'store', store: best.store, here: 0 });
    }
  }
  const suggest = [...byId.values()]
    .sort((a, b) => b.here - a.here || a.dist - b.dist || (b.card.uses || 0) - (a.card.uses || 0))
    .slice(0, maxSuggest);
  const shown = new Set(suggest.map((x) => x.card.id));
  const recent = cards
    .filter((c) => c.lastUsed && !shown.has(c.id))
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, 2);
  const q = (query || '').trim().toLowerCase();
  const all = cards
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0) || (b.created || 0) - (a.created || 0));
  return { recent, suggest, all };
}
