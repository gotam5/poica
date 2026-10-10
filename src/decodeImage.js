// Reads a 1D barcode or QR from a still image (e.g. a screenshot of a member-card screen).
// iOS's built-in image scanner only finds QR codes, so we decode pixels ourselves with ZXing.
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';
import UPNG from 'upng-js';
import jpeg from 'jpeg-js';

const ZX_TO_FMT = {
  EAN_13: 'EAN13', EAN_8: 'EAN8', UPC_A: 'UPC', CODE_128: 'CODE128', CODE_39: 'CODE39',
  CODABAR: 'codabar', ITF: 'ITF', QR_CODE: 'QR', DATA_MATRIX: 'QR', AZTEC: 'QR',
};

const FORMATS_TO_TRY = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR, BarcodeFormat.ITF, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
];

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

export function base64ToBytes(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(len);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)];
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const c = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const d = B64_LOOKUP[clean.charCodeAt(i + 3)];
    out[o++] = (a << 2) | (b >> 4);
    if (i + 2 < clean.length && o < len) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < clean.length && o < len) out[o++] = ((c & 3) << 6) | d;
  }
  return out;
}

function toRGBA(bytes) {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  if (isPng) {
    const img = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    return { width: img.width, height: img.height, rgba: new Uint8Array(UPNG.toRGBA8(img)[0]) };
  }
  const img = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return { width: img.width, height: img.height, rgba: img.data };
}

function luminance({ width, height, rgba }) {
  const lum = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    const a = rgba[p + 3] / 255;
    // transparent pixels read as white
    const r = rgba[p] * a + 255 * (1 - a);
    const g = rgba[p + 1] * a + 255 * (1 - a);
    const b = rgba[p + 2] * a + 255 * (1 - a);
    lum[i] = (r * 306 + g * 601 + b * 117) >> 10;
  }
  return lum;
}

function tryDecode(lum, width, height) {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.RETURN_CODABAR_START_END, true);
  // codabar (NW-7, common on Japanese member cards) is only tried when listed explicitly
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS_TO_TRY);
  const reader = new MultiFormatReader();
  reader.setHints(hints);
  try {
    const bmp = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height)));
    const r = reader.decode(bmp, hints);
    return { code: r.getText(), format: ZX_TO_FMT[BarcodeFormat[r.getBarcodeFormat()]] || 'CODE128' };
  } catch {
    return null;
  }
}

// bytes: PNG or JPEG file contents. Returns { code, format } or null.
export function decodeBarcodeImage(bytes) {
  const img = toRGBA(bytes);
  const lum = luminance(img);
  const hit = tryDecode(lum, img.width, img.height);
  if (hit) return hit;
  // A screenshot is mostly UI; retry on horizontal bands so the barcode fills more of the frame.
  const band = Math.floor(img.height / 3);
  for (let y = 0; y + band <= img.height; y += Math.floor(band / 2)) {
    const slice = lum.subarray(y * img.width, (y + band) * img.width);
    const r = tryDecode(new Uint8ClampedArray(slice), img.width, band);
    if (r) return r;
  }
  return null;
}
