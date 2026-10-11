// Cards live in on-device SQLite only. Photos are copied into the app's document folder;
// we store just the file name because iOS changes the container path between installs/updates.
import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

let dbPromise = null;

export function db() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('poica.db');
      await d.execAsync('CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL);');
      return d;
    })();
  }
  return dbPromise;
}

export async function loadCards() {
  const d = await db();
  const rows = await d.getAllAsync('SELECT json FROM cards');
  const out = [];
  for (const r of rows) {
    try { out.push(JSON.parse(r.json)); } catch {}
  }
  return out;
}

export async function saveCard(card) {
  const d = await db();
  await d.runAsync('INSERT OR REPLACE INTO cards (id, json) VALUES (?, ?)', [card.id, JSON.stringify(card)]);
}

export async function deleteCard(card) {
  const d = await db();
  await d.runAsync('DELETE FROM cards WHERE id = ?', [card.id]);
  if (card.photo) removePhoto(card.photo);
  if (typeof card.bgImage === 'string') removePhoto(card.bgImage);
}

function photoDir() {
  const dir = new Directory(Paths.document, 'cards');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function photoUri(name) {
  return name ? new File(Paths.document, 'cards', name).uri : null;
}

// Copy a picked/taken image (temporary uri) into permanent storage, return its file name.
export async function keepPhoto(tempUri, id) {
  const name = `${id}-${Date.now()}.jpg`;
  const dest = new File(photoDir(), name);
  await new File(tempUri).copy(dest);
  return name;
}

export function removePhoto(name) {
  try {
    const f = new File(Paths.document, 'cards', name);
    if (f.exists) f.delete();
  } catch {}
}

// Small key/value settings next to the cards.
export async function getSetting(key, fallback) {
  const d = await db();
  await d.execAsync('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
  const row = await d.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

export async function setSetting(key, value) {
  const d = await db();
  await d.execAsync('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
  await d.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}
