import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Pattern, Polygon, Rect, Stop } from 'react-native-svg';
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
  { key: 'dots', label: 'ドット' },
  { key: 'circles', label: 'サークル' },
  { key: 'stripes', label: 'ストライプ' },
  { key: 'check', label: 'チェック' },
  { key: 'grid', label: '方眼' },
  { key: 'waves', label: 'ウェーブ' },
  { key: 'split', label: 'ななめ' },
  { key: 'rings', label: 'リング' },
];
// Patterns drawn with two pattern colors (the rest use one).
export const TWO_COLOR_PATTERNS = ['bands', 'circles', 'waves'];

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
            <Text style={[s.name, big && s.nameBig, dark && s.nameDark, { color: ink, paddingRight: children ? 0 : img || logoSlot ? logo + 12 : 44 }]} numberOfLines={2}>{card.name || 'カード名'}</Text>
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

function PatternLayer({ pattern, bg, c1, c2, c3 }) {
  if (pattern === 'plain') return null;
  if (pattern === 'bands') {
    return (
      <>
        {c1 && <View style={[s.band, { backgroundColor: c1 }]} />}
        {c2 && <View style={[s.thin, { backgroundColor: c2 }]} />}
        {c3 && <View style={[s.stripe, { backgroundColor: c3 }]} />}
      </>
    );
  }
  const a = c1 || '#FFFFFF';
  const b = c2 || a;
  if (pattern === 'split') {
    // The lower-right half in the pattern color, stretched to the card's shape.
    return (
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        <Polygon points="100,18 100,100 30,100" fill={a} fillOpacity="0.85" />
      </Svg>
    );
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      {pattern === 'gradient' && (
        <>
          <Defs>
            <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={bg} />
              <Stop offset="1" stopColor={a} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
        </>
      )}
      {pattern === 'dots' && (
        <>
          <Defs>
            <Pattern id="d" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <Circle cx="8" cy="8" r="2.6" fill={a} fillOpacity="0.45" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#d)" />
        </>
      )}
      {pattern === 'circles' && (
        <>
          <Circle cx="92%" cy="10%" r="70" fill={a} fillOpacity="0.85" />
          <Circle cx="78%" cy="105%" r="46" fill={b} fillOpacity="0.7" />
        </>
      )}
      {pattern === 'stripes' && (
        <>
          <Defs>
            <Pattern id="st" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Rect x="0" y="0" width="5" height="14" fill={a} fillOpacity="0.5" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#st)" />
        </>
      )}
      {pattern === 'check' && (
        <>
          <Defs>
            <Pattern id="ck" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <Rect x="0" y="0" width="12" height="12" fill={a} fillOpacity="0.35" />
              <Rect x="12" y="12" width="12" height="12" fill={a} fillOpacity="0.35" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#ck)" />
        </>
      )}
      {pattern === 'grid' && (
        <>
          <Defs>
            <Pattern id="gr" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <Line x1="0" y1="0" x2="16" y2="0" stroke={a} strokeOpacity="0.45" strokeWidth="1.5" />
              <Line x1="0" y1="0" x2="0" y2="16" stroke={a} strokeOpacity="0.45" strokeWidth="1.5" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#gr)" />
        </>
      )}
      {pattern === 'waves' && (
        <>
          <Defs>
            <Pattern id="wv" x="0" y="0" width="40" height="22" patternUnits="userSpaceOnUse">
              <Path d="M0 11 Q10 3 20 11 T40 11" stroke={a} strokeOpacity="0.6" strokeWidth="3" fill="none" />
              <Path d="M0 21 Q10 13 20 21 T40 21" stroke={b} strokeOpacity="0.45" strokeWidth="2" fill="none" />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#wv)" />
        </>
      )}
      {pattern === 'rings' && (
        <>
          <Circle cx="100%" cy="100%" r="40" stroke={a} strokeOpacity="0.6" strokeWidth="6" fill="none" />
          <Circle cx="100%" cy="100%" r="70" stroke={a} strokeOpacity="0.45" strokeWidth="6" fill="none" />
          <Circle cx="100%" cy="100%" r="100" stroke={a} strokeOpacity="0.3" strokeWidth="6" fill="none" />
          <Circle cx="100%" cy="100%" r="130" stroke={a} strokeOpacity="0.18" strokeWidth="6" fill="none" />
        </>
      )}
    </Svg>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };
const s = StyleSheet.create({
  face: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, minHeight: 112, justifyContent: 'space-between', gap: 6, overflow: 'hidden' },
  big: { minHeight: 140, paddingHorizontal: 16, paddingVertical: 14 },
  mini: { minHeight: 0, height: 44, padding: 0, borderRadius: 9 },
  logoCol: { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' },
  logoBox: { borderRadius: 12, overflow: 'hidden' },
  slot: { borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.45, alignItems: 'center', justifyContent: 'center' },
  slotRing: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14 },
  slotText: { fontSize: 12, fontWeight: '800' },
  logoTile: { backgroundColor: '#FFF', padding: 6 },
  logo: { width: '100%', height: '100%' },
  band: { position: 'absolute', right: 6, top: -60, width: 30, height: 260, transform: [{ rotate: '22deg' }] },
  thin: { position: 'absolute', right: 44, top: -60, width: 9, height: 260, transform: [{ rotate: '22deg' }] },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6 },
  nameRowLow: { paddingTop: 8 }, // small tiles in the card list: name a little lower
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, paddingRight: 8, color: '#FFF', fontSize: 22, fontWeight: '900', lineHeight: 27, ...shadow },
  nameDark: { color: '#15211C', textShadowColor: 'rgba(255,255,255,0.4)' },
  nameBig: { fontSize: 28, lineHeight: 34 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingRight: 40 },
  type: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipText: { color: '#D9452B', fontSize: 12, fontWeight: '700' },
});
