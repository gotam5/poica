// Opt-in anonymous usage report. Off unless the user turns on 「利用データを送る」 in 設定.
// What is sent is only usage.js's summary: per kind of card (app:<catalogId>, app:custom, barcode, …)
// how many are registered and how often they were opened or failed to open over 30 days.
// No card names, numbers, codes, photos, places, or any id for the phone or person.
// Where it goes comes from config.json's "usageUrl" (https only); until that is set, nothing is sent.
import { Platform } from 'react-native';
import appJson from '../app.json';
import { getSetting, setSetting } from './storage';
import { usageSummary } from './usage';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function buildReport(cards) {
  return {
    app: appJson.expo.version,
    os: `${Platform.OS} ${Platform.Version}`,
    days: 30,
    cards: cards.length,
    usage: await usageSummary(cards, 30),
  };
}

// At most once a week, and only when the user opted in and a destination is configured.
export async function sendReportIfDue(cards) {
  try {
    if (!(await getSetting('shareUsage', false))) return false;
    const url = await getSetting('usageUrl', null);
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) return false;
    if (Date.now() - (await getSetting('usageSentAt', 0)) < WEEK) return false;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await buildReport(cards)),
      signal: ctl.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return false;
    await setSetting('usageSentAt', Date.now());
    return true;
  } catch {
    return false;
  }
}
