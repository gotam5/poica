// Card usage counted per day, on the phone only. Nothing here is sent anywhere.
// Each count is keyed by what kind of card it is, never by its name, number or code:
//   app:<catalogId> for apps from the list, app:custom for other apps, barcode / photo / dynamic for the rest.
// This is the shape a future, opt-in anonymous report would send, so it must stay free of anything personal.
import { db } from './storage';
import { appMode, catalogApp } from './appLink';

const KEEP_DAYS = 90;

export function usageKey(card) {
  if (card.kind === 'app') return appMode(card) === 'catalog' && catalogApp(card.catalogId) ? `app:${card.catalogId}` : 'app:custom';
  return card.kind || 'unknown';
}

const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayOf(d); };

let ready = null;
async function table() {
  const d = await db();
  if (!ready) {
    ready = (async () => {
      await d.execAsync('CREATE TABLE IF NOT EXISTS usage_daily (day TEXT NOT NULL, key TEXT NOT NULL, opens INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, key));');
      await d.runAsync('DELETE FROM usage_daily WHERE day < ?', [daysAgo(KEEP_DAYS)]);
    })().catch((e) => { ready = null; throw e; });
  }
  await ready;
  return d;
}

// failed: an app card whose app could not be opened (a sign the URL scheme in the list is wrong or the app is gone).
export async function recordUse(card, { failed = false } = {}) {
  const d = await table();
  await d.runAsync(
    'INSERT INTO usage_daily (day, key, opens, fails) VALUES (?, ?, ?, ?) ON CONFLICT(day, key) DO UPDATE SET opens = opens + excluded.opens, fails = fails + excluded.fails',
    [dayOf(new Date()), usageKey(card), failed ? 0 : 1, failed ? 1 : 0],
  );
}

// Per key: how many cards of it are registered now, and how they were used over the last `days` days.
// usedCards / registered is the usage rate of that kind of card.
export async function usageSummary(cards, days = 30) {
  const d = await table();
  const rows = await d.getAllAsync(
    'SELECT key, SUM(opens) AS opens, SUM(fails) AS fails, COUNT(DISTINCT day) AS activeDays FROM usage_daily WHERE day >= ? GROUP BY key',
    [daysAgo(days - 1)],
  );
  const since = Date.now() - days * 86400000;
  const out = {};
  const at = (k) => (out[k] ||= { registered: 0, usedCards: 0, opens: 0, fails: 0, activeDays: 0 });
  for (const c of cards) {
    const e = at(usageKey(c));
    e.registered += 1;
    if (c.lastUsed && c.lastUsed >= since) e.usedCards += 1;
  }
  for (const r of rows) Object.assign(at(r.key), { opens: r.opens, fails: r.fails, activeDays: r.activeDays });
  return out;
}
