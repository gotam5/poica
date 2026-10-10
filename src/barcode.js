// Turns a code into black/white modules for drawing, using JsBarcode's encoders and qrcode-generator.
import JsBarcodeEncoders from 'jsbarcode/bin/barcodes';
import qrcode from 'qrcode-generator';

const Encoders = JsBarcodeEncoders.default || JsBarcodeEncoders;

export const FORMATS = [
  { key: 'CODE128', label: '自動' },
  { key: 'EAN13', label: 'JAN 13桁' },
  { key: 'EAN8', label: 'JAN 8桁' },
  { key: 'codabar', label: 'NW-7' },
  { key: 'CODE39', label: 'CODE39' },
  { key: 'ITF', label: 'ITF' },
  { key: 'UPC', label: 'UPC-A' },
  { key: 'QR', label: 'QR' },
];

// expo-camera reports types like "ean13" or, on some iOS versions, "org.gs1.EAN-13".
export function formatFromScan(type) {
  const t = String(type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (t.includes('ean13')) return 'EAN13';
  if (t.includes('ean8')) return 'EAN8';
  if (t.includes('upca')) return 'UPC';
  if (t.includes('codabar')) return 'codabar';
  if (t.includes('code39')) return 'CODE39';
  if (t.includes('itf') || t.includes('interleaved')) return 'ITF';
  if (t.includes('qr') || t.includes('datamatrix') || t.includes('aztec')) return 'QR';
  return 'CODE128';
}

function linearBits(code, format) {
  let value = code;
  if (format === 'codabar' && !/^[A-D].*[A-D]$/i.test(value)) value = `A${value}A`;
  const Enc = Encoders[format];
  if (!Enc) return null;
  const enc = new Enc(value, {});
  if (!enc.valid()) return null;
  const out = enc.encode();
  const parts = Array.isArray(out) ? out : [out];
  return parts.map((p) => p.data).join('');
}

// { kind: 'linear', bits: '1010…' } | { kind: 'qr', size, isDark(r,c) } | null
export function encode(code, format) {
  if (!code) return null;
  if (format === 'QR') {
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      }
      const qr = qrcode(0, 'M');
      qr.addData(code);
      qr.make();
      const size = qr.getModuleCount();
      return { kind: 'qr', size, isDark: (r, c) => qr.isDark(r, c) };
    } catch {
      return null;
    }
  }
  try {
    const bits = linearBits(code, format || 'CODE128') || linearBits(code, 'CODE128');
    return bits ? { kind: 'linear', bits } : null;
  } catch {
    try {
      const bits = linearBits(code, 'CODE128');
      return bits ? { kind: 'linear', bits } : null;
    } catch {
      return null;
    }
  }
}
