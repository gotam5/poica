import { Image, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Pattern, Polygon, Rect, Stop } from 'react-native-svg';
import { TYPE_COLORS } from './theme';
import { TYPE_LABEL, cardTypes } from './appLink';
import { photoUri } from './storage';

// card.bgImage: the logo picture, a saved file name, or { temp: uri } while editing (PRO only).
// It sits as a square on the right of the card, over the pattern; card.logoBg 'white' puts a white tile behind it.
export function bgImageUri(card) {
  const b = card && card.bgImage;
  if (!b) return null;
  return typeof b === 'object' ? b.temp : photoUri(b);
}

// card.textColor: a hex color (PRO), or the older 'light' / 'dark'.
export function textHex(card) {
  const c = card && card.textColor;
  if (c === 'dark') return '#15211C';
  if (typeof c === 'string' && c.startsWith('#')) return c;
  return '#FFFFFF';
}
function isDarkText(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 140;
}

// Card patterns. 'bands' is the original look; the others are for PRO.
export const PATTERNS = [
  { key: 'bands', label: '斜めライン' },
  { key: 'plain', label: '無地' },
  { key: 'gradient', label: 'グラデーション' },
  { key: 'split', label: 'ななめ' },
  { key: 'circles', label: 'サークル' },
  { key: 'rings', label: '波紋' },
  { key: 'waves', label: 'ウェーブ' },
  { key: 'sunburst', label: 'サンバースト' },
  { key: 'dots', label: 'ハーフトーン' },
  { key: 'stripes', label: 'ストライプ' },
  { key: 'check', label: 'ギンガム' },
  { key: 'triangles', label: 'トライアングル' },
];
// Patterns drawn with two pattern colors (the rest use one).
export const TWO_COLOR_PATTERNS = ['bands', 'split', 'circles', 'waves', 'stripes'];

// Card face drawn from 2-4 colors: background, then the pattern's colors.
// No logos: brands' marks can't be used without each company's permission.
// mini: just the face, no text (design swatches).
// children: shown under the name instead of the type badges (the barcode on the show screen).
// logoSlot: faintly marks where the logo goes (while the ロゴ画像 tab is open).
export default function CardFace({ card, palette, big, wide, chip, style, mini, children, logoSlot }) {
  const [bg, c1, c2, c3] = palette;
  const img = bgImageUri(card);
  const pattern = card.pattern || 'bands';
  const ink = textHex(card);
  const dark = isDarkText(ink);
  const logo = mini ? 0 : children ? 52 : big ? 84 : 64;
  return (
    <View style={[s.face, { backgroundColor: bg }, big && s.big, mini && s.mini, style]}>
      <PatternLayer pattern={pattern} bg={bg} c1={c1} c2={c2} c3={c3} />
      {logo && (img || logoSlot) && !children ? (
        // A full-height column so the logo always sits in the vertical middle of the card.
        <View style={s.logoCol} pointerEvents="none">
          <View style={[{ width: logo + 8, height: logo + 8, alignItems: 'center', justifyContent: 'center' }, img && logoSlot && [s.slotRing, { borderColor: ink.length === 7 ? `${ink}73` : ink }]]}>
            {img ? (
              <View style={[s.logoBox, { width: logo, height: logo }, card.logoBg === 'white' && s.logoTile]}>
                <Image source={{ uri: img }} style={s.logo} resizeMode="contain" />
              </View>
            ) : (
              <View style={[s.logoBox, s.slot, { width: logo, height: logo, borderColor: ink }]}>
                <Text style={[s.slotText, { color: ink }]}>ロゴ</Text>
              </View>
            )}
          </View>
        </View>
      ) : null}
      {mini ? null : (
        <>
          {chip != null ? (
            <View style={s.chip}><Text style={s.chipText} numberOfLines={1}>{chip}</Text></View>
          ) : null}
          <View style={[s.nameRow, !big && !wide && !children && s.nameRowLow]}>
            <Text style={[s.name, big && s.nameBig, img && (big ? s.nameBigLogo : s.nameLogo), dark && s.nameDark, { color: ink, paddingRight: children ? 0 : img || logoSlot ? logo + 12 : 44 }]} numberOfLines={2}>{card.name || 'カード名'}</Text>
            {children && img ? (
              <View style={[s.logoBox, { width: logo, height: logo }, card.logoBg === 'white' && s.logoTile]}>
                <Image source={{ uri: img }} style={s.logo} resizeMode="contain" />
              </View>
            ) : null}
          </View>
          {children || <View>
            <View style={[s.types, (img || logoSlot) && { paddingRight: logo + 12 }]}>
              {cardTypes(card).map((ty) => (
                <View key={ty} style={[s.type, { backgroundColor: TYPE_COLORS[ty].bg }]}><Text style={[s.typeText, { color: TYPE_COLORS[ty].fg }]}>{TYPE_LABEL[ty]}</Text></View>
              ))}
            </View>
          </View>}
        </>
      )}
    </View>
  );
}

// Patterns are drawn on a card 320 units wide, scaled to the real card's width.
// Shapes are placed from the lower-right corner, so taller or shorter cards keep
// the same design at the same size. A small swatch shows the same whole design.
const W = 320;

// Sized from the card's measured layout, not a viewBox, so the drawing always
// reaches the card's right and bottom edges.
function PatternLayer({ pattern, bg, c1, c2, c3 }) {
  const [size, setSize] = useState(null);
  if (pattern === 'plain') return null;
  const a = c1 || '#FFFFFF';
  const b = c2 || a;
  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };
  let body = null;
  if (size && size.w > 0 && size.h > 0) {
    const k = size.w / W;
    body = (
      <Svg width={size.w} height={size.h}>
        <G transform={`scale(${k})`}>
          {drawPattern(pattern, { bg, a, b, c: c3, c1, c2, H: size.h / k })}
        </G>
      </Svg>
    );
  }
  return <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">{body}</View>;
}

// A slanted bar: centre x at the bottom, leaning right by 22° towards the top.
// A slanted bar: centre x halfway up, leaning right towards the top.
function slant(x, width, H) {
  const lean = 80;
  const x0 = x - lean / 2;
  return `${x0 - width / 2},${H} ${x0 + width / 2},${H} ${x0 + lean + width / 2},0 ${x0 + lean - width / 2},0`;
}

// Everything stays in the right part of the card, at most about half of it,
// so the card name on the left keeps a plain background.
// RIGHT is the region right of a diagonal: 62% across at the top, 46% at the bottom.
function rightClip(H) {
  return (
    <Defs>
      <ClipPath id="rc">
        <Polygon points={`${W * 0.62},0 ${W},0 ${W},${H} ${W * 0.46},${H}`} />
      </ClipPath>
    </Defs>
  );
}

function drawPattern(pattern, { bg, a, b, c, c1, c2, H }) {
  switch (pattern) {
    case 'bands':
      return (
        <>
          {c1 && <Polygon points={slant(W - 52, 46, H)} fill={c1} />}
          {c2 && <Polygon points={slant(W - 100, 13, H)} fill={c2} />}
          {c && <Rect x="0" y={H - 8} width={W} height="8" fill={c} />}
        </>
      );
    case 'gradient':
      // Fades in from the middle of the card to the right edge.
      return (
        <>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={a} stopOpacity="0" />
              <Stop offset="0.25" stopColor={a} stopOpacity="0.15" />
              <Stop offset="1" stopColor={a} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x={W * 0.45} y="0" width={W * 0.55} height={H} fill="url(#g)" />
        </>
      );
    case 'split':
      // Two facets cut along parallel diagonals.
      return (
        <>
          <Polygon points={`${W},${H - 150} ${W},${H} ${W * 0.52},${H}`} fill={a} />
          <Polygon points={`${W},${H - 84} ${W},${H} ${W * 0.73},${H}`} fill={b} />
        </>
      );
    case 'circles':
      return (
        <>
          <Circle cx={W * 0.97} cy={H - 92} r={W * 0.2} fill={a} fillOpacity="0.9" />
          <Circle cx={W * 0.77} cy={H + 6} r={W * 0.15} fill={b} fillOpacity="0.9" />
          <Circle cx={W * 0.77} cy={H + 6} r={W * 0.21} stroke={b} strokeOpacity="0.5" strokeWidth="2.5" fill="none" />
        </>
      );
    case 'rings':
      return (
        <>
          {[0.08, 0.16, 0.24, 0.32, 0.4, 0.48].map((r, i) => (
            <Circle key={r} cx={W} cy={H} r={W * r} stroke={a} strokeOpacity={0.85 - i * 0.12} strokeWidth="7" fill="none" />
          ))}
        </>
      );
    case 'waves': {
      // Layered waves rising from the lower right.
      const x0 = W * 0.5;
      return (
        <>
          <Path d={`M${x0} ${H} C${W * 0.62} ${H - 10} ${W * 0.7} ${H - 70} ${W * 0.82} ${H - 74} S${W} ${H - 104} ${W} ${H - 104} V${H} Z`} fill={a} fillOpacity="0.75" />
          <Path d={`M${W * 0.6} ${H} C${W * 0.7} ${H - 8} ${W * 0.76} ${H - 40} ${W * 0.86} ${H - 42} S${W} ${H - 62} ${W} ${H - 62} V${H} Z`} fill={b} fillOpacity="0.9" />
        </>
      );
    }
    case 'sunburst': {
      // Fine rays fanning out from the lower-right corner.
      const n = 22;
      const R = W * 0.5;
      const rays = [];
      for (let i = 0; i < n; i += 2) {
        const t0 = Math.PI + (i / n) * (Math.PI / 2);
        const t1 = Math.PI + ((i + 1) / n) * (Math.PI / 2);
        rays.push(<Polygon key={i} points={`${W},${H} ${W + R * Math.cos(t0)},${H + R * Math.sin(t0)} ${W + R * Math.cos(t1)},${H + R * Math.sin(t1)}`} fill={a} fillOpacity="0.45" />);
      }
      return <>{rays}</>;
    }
    case 'dots': {
      // Halftone: small dots growing towards the right edge.
      const step = 11;
      const x0 = W * 0.5;
      const dots = [];
      for (let y = step / 2; y < H; y += step) {
        for (let x = x0 + step / 2; x < W; x += step) {
          const t = (x - x0) / (W - x0);
          dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={t * 3.8 + 0.4} fill={a} fillOpacity="0.7" />);
        }
      }
      return <>{dots}</>;
    }
    case 'stripes':
      // Fine regimental stripes in the right part of the card.
      return (
        <>
          {rightClip(H)}
          <Defs>
            <Pattern id="st" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <Rect x="0" y="0" width="30" height="9" fill={a} fillOpacity="0.8" />
              <Rect x="0" y="15" width="30" height="2.5" fill={b} fillOpacity="0.85" />
            </Pattern>
          </Defs>
          <G clipPath="url(#rc)">
            <Rect x="0" y="0" width={W} height={H} fill="url(#st)" />
          </G>
        </>
      );
    case 'check':
      // Fine gingham in the right part of the card.
      return (
        <>
          {rightClip(H)}
          <Defs>
            <Pattern id="ck" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <Rect x="0" y="0" width="22" height="11" fill={a} fillOpacity="0.4" />
              <Rect x="0" y="0" width="11" height="22" fill={a} fillOpacity="0.4" />
            </Pattern>
          </Defs>
          <G clipPath="url(#rc)">
            <Rect x="0" y="0" width={W} height={H} fill="url(#ck)" />
          </G>
        </>
      );
    case 'triangles':
      return <>{lowPoly(a, H)}</>;
    default:
      return null;
  }
}

// Fine low-poly facets over the right part of the card, fading out to the left.
const JIT = [0.1, -0.3, 0.25, -0.15, 0.3, -0.25, 0.05, 0.2, -0.1, 0.15, -0.3, 0.25, 0.1, -0.2, 0.3, -0.05, 0.2, -0.25, 0.1, 0.05];
function lowPoly(a, H) {
  const cols = 6;
  const x0 = W * 0.52;
  const cw = (W - x0) / (cols - 1);
  const rows = Math.max(3, Math.round(H / cw) + 1);
  const rh = H / (rows - 1);
  const pt = (i, j) => {
    const edgeX = i === 0 || i === cols - 1;
    const edgeY = j === 0 || j === rows - 1;
    const jx = edgeX ? 0 : JIT[(i * 3 + j) % JIT.length] * cw * 0.6;
    const jy = edgeY ? 0 : JIT[(i * 7 + j * 2 + 5) % JIT.length] * rh * 0.6;
    return [x0 + i * cw + jx, j * rh + jy];
  };
  const q = (u) => u.map((v) => `${v[0]},${v[1]}`).join(' ');
  const tris = [];
  for (let i = 0; i < cols - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const p = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)];
      const base = 0.03 + (i / (cols - 2)) * 0.62;
      const flip = (i + j) % 2;
      const [t1, t2] = flip ? [[p[0], p[1], p[3]], [p[1], p[2], p[3]]] : [[p[0], p[1], p[2]], [p[0], p[2], p[3]]];
      tris.push(<Polygon key={`${i}-${j}-a`} points={q(t1)} fill={a} fillOpacity={base + (j % 2) * (i ? 0.12 : 0.05)} />);
      tris.push(<Polygon key={`${i}-${j}-b`} points={q(t2)} fill={a} fillOpacity={base + ((j + 1) % 2) * (i ? 0.12 : 0.05)} />);
    }
  }
  return tris;
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };
const s = StyleSheet.create({
  face: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, minHeight: 112, justifyContent: 'space-between', gap: 6, overflow: 'hidden' },
  big: { minHeight: 140, paddingHorizontal: 16, paddingVertical: 14 },
  mini: { minHeight: 0, aspectRatio: 1.6, padding: 0, borderRadius: 8 },
  logoCol: { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
  logoBox: { borderRadius: 12, overflow: 'hidden' },
  slot: { borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.45, alignItems: 'center', justifyContent: 'center' },
  slotRing: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14 },
  slotText: { fontSize: 12, fontWeight: '800' },
  logoTile: { backgroundColor: '#FFF', padding: 6 },
  logo: { width: '100%', height: '100%' },
  nameRowLow: { paddingTop: 8 }, // small tiles in the card list: name a little lower
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, paddingRight: 8, color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 27, ...shadow },
  nameDark: { color: '#15211C', textShadowColor: 'rgba(255,255,255,0.4)' },
  nameBig: { fontSize: 28, lineHeight: 34 },
  // A logo takes width from the name, so the name is a bit smaller to stay on fewer lines.
  nameLogo: { fontSize: 18, lineHeight: 23 },
  nameBigLogo: { fontSize: 23, lineHeight: 28 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingRight: 40 },
  type: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipText: { color: '#D9452B', fontSize: 12, fontWeight: '700' },
});
