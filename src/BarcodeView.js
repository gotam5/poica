import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { encode } from './barcode';

// Draws the code black-on-white with a quiet zone, scaled to the given width.
export default function BarcodeView({ code, format, width, height = 130 }) {
  const enc = useMemo(() => encode(code, format), [code, format]);
  if (!enc) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>このバーコードは描けませんでした。番号を店員さんに伝えてください。</Text>
      </View>
    );
  }
  if (enc.kind === 'qr') {
    const quiet = 4;
    const n = enc.size + quiet * 2;
    let d = '';
    for (let r = 0; r < enc.size; r++) {
      for (let c = 0; c < enc.size; c++) {
        if (enc.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      }
    }
    const side = Math.min(width, 280);
    return (
      <Svg width={side} height={side} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill="#FFFFFF" />
        <Path d={d} fill="#000000" />
      </Svg>
    );
  }
  const quiet = 10;
  const n = enc.bits.length + quiet * 2;
  let d = '';
  let i = 0;
  while (i < enc.bits.length) {
    if (enc.bits[i] === '1') {
      let j = i;
      while (j < enc.bits.length && enc.bits[j] === '1') j++;
      d += `M${i + quiet} 0h${j - i}v100h-${j - i}z`;
      i = j;
    } else i++;
  }
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${n} 100`} preserveAspectRatio="none">
      <Rect x={0} y={0} width={n} height={100} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}
