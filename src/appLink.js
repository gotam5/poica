// How a "公式アプリ" card opens its app directly (never via the App Store page).
//  - catalog: a known app picked from appCatalog.json; Poica tries its URL schemes in order. No setup.
//  - url: the app's own URL scheme typed by the user (e.g. "xxxx://").
//  - shortcut: runs an iOS Shortcut whose only action is "Appを開く". Last resort for apps not in the list.
import { Linking } from 'react-native';
import catalog from './appCatalog.json';

export const CATALOG = catalog.apps;

// A catalog entry is either a bare scheme ("paypay") or a full URL with a path ("tpointapp://top").
export const schemeUrl = (sc) => (sc.includes('://') ? sc : `${sc}://`);

export function catalogApp(id) {
  return CATALOG.find((a) => a.id === id) || null;
}

export function guessCatalogApp(name) {
  const n = String(name || '').toLowerCase().replace(/[\s・‐-]/g, '');
  if (!n) return null;
  // Prefer the longest matching key, so 「VポイントPay」 finds VポイントPay rather than Vポイント.
  let best = null;
  let bestLen = 0;
  for (const a of CATALOG) {
    for (const k of a.keys) {
      const key = k.toLowerCase().replace(/[\s・‐-]/g, '');
      if (key.length > bestLen && n.includes(key)) { best = a; bestLen = key.length; }
    }
  }
  return best;
}

export function appMode(card) {
  if (card.appMode) return card.appMode;
  if (card.catalogId) return 'catalog';
  return card.shortcutName ? 'shortcut' : 'url';
}

// Every URL worth trying for this card, best first.
export function launchCandidates(card) {
  const mode = appMode(card);
  if (mode === 'catalog') {
    const app = catalogApp(card.catalogId);
    if (!app) return [];
    const urls = app.schemes.map(schemeUrl);
    // The user can pin the variant that works best on their phone (some apps bounce one variant to Safari).
    return card.launch && urls.includes(card.launch) ? [card.launch, ...urls.filter((u) => u !== card.launch)] : urls;
  }
  if (mode === 'shortcut') {
    const name = (card.shortcutName || '').trim();
    return name ? [`shortcuts://run-shortcut?name=${encodeURIComponent(name)}`] : [];
  }
  const url = (card.appUrl || '').trim();
  return url ? [url] : [];
}

// Kept for display: the first candidate.
export function launchUrl(card) {
  return launchCandidates(card)[0] || null;
}

// Tries each candidate; resolves true once one opens. iOS rejects a scheme no installed app handles.
export async function openCardApp(card) {
  for (const url of launchCandidates(card)) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {}
  }
  return false;
}

// Which catalog apps are installed. Needs LSApplicationQueriesSchemes (set in app.config.js),
// so in Expo Go this usually finds nothing and the full list is shown instead.
export async function installedCatalogIds() {
  const found = [];
  for (const app of CATALOG) {
    for (const sc of new Set(app.schemes.map((x) => x.split('://')[0]))) {
      try {
        if (await Linking.canOpenURL(`${sc}://`)) { found.push(app.id); break; }
      } catch {}
    }
  }
  return found;
}

// App Store pages open the store, not the app.
export function isStoreUrl(url) {
  return /^(https?:\/\/)?(apps|itunes)\.apple\.com\//i.test(url || '') || /^itms(-apps)?:/i.test(url || '');
}

// Accept "xxxx://", "xxxx:" or a web link; add https:// only to bare domains.
export function normalizeAppUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  if (/^[a-z][a-z0-9+-]*$/i.test(v)) return `${v}://`;
  return `https://${v}`;
}

export const TYPE_LABEL = { point: 'ポイントカード', pay: '支払い' };

// Which home sections a card belongs to: 'point', or 'pay' (both when the app does both).
export function cardTypes(card) {
  if (card.kind === 'app') {
    const app = catalogApp(card.catalogId);
    if (app && app.types) return app.types;
    if (card.types && card.types.length) return card.types;
  }
  return ['point'];
}

// The card face colors: the user's choice, else the official app's (or a same-named shop's) image colors, else the card color with white.
export function cardPalette(card, allCards = []) {
  if (card.palette && card.palette.length) return card.palette;
  if (card.kind === 'app' && card.catalogId) {
    // Also for listed apps opened through a shortcut (e.g. Vポイント).
    const app = catalogApp(card.catalogId);
    if (app && app.colors) return app.colors;
  }
  // Cards made by hand (barcode/photo, other apps) take the shop's colors when the name matches a known shop.
  const guess = guessCatalogApp(card.name);
  if (guess && guess.colors) return guess.colors;
  return [card.color || '#3D4A55', '#FFFFFF'];
}
