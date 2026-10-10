// How a "公式アプリ" card opens its app directly (never via the App Store page).
//  - shortcut: runs an iOS Shortcut whose only action is "Appを開く". Works for any app.
//  - url: the app's own URL scheme (e.g. "xxxx://") or a link the app claims (universal link).

export function appMode(card) {
  if (card.appMode) return card.appMode;
  return card.shortcutName ? 'shortcut' : 'url';
}

export function launchUrl(card) {
  if (appMode(card) === 'shortcut') {
    const name = (card.shortcutName || '').trim();
    return name ? `shortcuts://run-shortcut?name=${encodeURIComponent(name)}` : null;
  }
  return (card.appUrl || '').trim() || null;
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
