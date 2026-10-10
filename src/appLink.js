// How a "公式アプリ" card opens its app directly (never via the App Store page).
//  - catalog: a known app picked from appCatalog.json; Poica tries its URL schemes in order. No setup.
//  - url: the app's own URL scheme typed by the user (e.g. "xxxx://").
//  - shortcut: runs an iOS Shortcut whose only action is "Appを開く". Last resort for apps not in the list.
import { Linking } from 'react-native';
import catalog from './appCatalog.json';

export const CATALOG = catalog.apps;

export function catalogApp(id) {
  return CATALOG.find((a) => a.id === id) || null;
}

export function guessCatalogApp(name) {
  const n = String(name || '').toLowerCase().replace(/[\s・‐-]/g, '');
  if (!n) return null;
  return CATALOG.find((a) => a.keys.some((k) => n.includes(k.toLowerCase().replace(/[\s・‐-]/g, '')))) || null;
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
    return app ? app.schemes.map((sc) => `${sc}://`) : [];
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
    for (const sc of app.schemes) {
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
