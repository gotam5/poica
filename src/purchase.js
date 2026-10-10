// One-time purchase that lifts the free card limit. Uses StoreKit through expo-iap; nothing is sent to other servers.
// Expo Go has no StoreKit module, so there the limit is simply off (test purchases in a development build or TestFlight).
import { requireOptionalNativeModule } from 'expo-modules-core';

export const PRODUCT_ID = 'com.gotam5.poica.unlimited';
export const FREE_LIMIT = 5;
export const iapAvailable = !!requireOptionalNativeModule('ExpoIap');

let lib = null;
let connecting = null;
async function store() {
  if (!iapAvailable) throw new Error('StoreKit is not available here');
  if (!lib) lib = require('expo-iap');
  if (!connecting) connecting = lib.initConnection().catch((e) => { connecting = null; throw e; });
  await connecting;
  return lib;
}

const isOurs = (p) => p && (p.productId === PRODUCT_ID || p.id === PRODUCT_ID);

export async function checkOwned() {
  const s = await store();
  const list = await s.getAvailablePurchases();
  const mine = (list || []).filter(isOurs);
  // Finish anything left unfinished (e.g. the app closed mid-purchase), so StoreKit stops re-delivering it.
  for (const p of mine) s.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
  return mine.length > 0;
}

// The price as the App Store shows it in the user's currency (never written into the app by hand).
export async function fetchPrice() {
  const s = await store();
  const products = await s.fetchProducts({ skus: [PRODUCT_ID], type: 'in-app' });
  return (products || []).find(isOurs)?.displayPrice || null;
}

// true when bought; false when it is waiting for approval (e.g. Ask to Buy).
export async function buy() {
  const s = await store();
  const result = await s.requestPurchase({ request: { apple: { sku: PRODUCT_ID }, google: { skus: [PRODUCT_ID] } }, type: 'in-app' });
  const p = (Array.isArray(result) ? result : [result]).find(isOurs);
  if (!p) return false;
  await s.finishTransaction({ purchase: p, isConsumable: false });
  return true;
}

export async function restore() {
  const s = await store();
  await s.restorePurchases();
  return checkOwned();
}

export const isCancel = (e) => e?.code === 'user-cancelled' || /cancel/i.test(String(e?.message || ''));
