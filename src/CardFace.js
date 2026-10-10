import { StyleSheet, Text, View } from 'react-native';
import { TYPE_COLORS } from './theme';
import { TYPE_LABEL, cardTypes } from './appLink';

// Card face drawn from 2-4 colors: background, a wide band, a thin band and a bottom stripe.
// No logos: brands' marks can't be used without each company's permission.
export default function CardFace({ card, palette, big, wide, chip, style }) {
  const [bg, c1, c2, c3] = palette;
  return (
    <View style={[s.face, { backgroundColor: bg }, big && s.big, style]}>
      {c1 && <View style={[s.band, { backgroundColor: c1 }]} />}
      {c2 && <View style={[s.thin, { backgroundColor: c2 }]} />}
      {c3 && <View style={[s.stripe, { backgroundColor: c3 }]} />}
      {chip != null ? (
        <View style={s.chip}><Text style={s.chipText} numberOfLines={1}>{chip}</Text></View>
      ) : null}
      <View style={s.nameRow}>
        <Text style={[s.name, big && s.nameBig, { paddingRight: 44 }]} numberOfLines={2}>{card.name || 'カード名'}</Text>
      </View>
      <View>
        <View style={s.types}>
          {cardTypes(card).map((ty) => (
            <View key={ty} style={[s.type, { backgroundColor: TYPE_COLORS[ty].bg }]}><Text style={[s.typeText, { color: TYPE_COLORS[ty].fg }]}>{TYPE_LABEL[ty]}</Text></View>
          ))}
        </View>
      </View>
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };
const s = StyleSheet.create({
  face: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, minHeight: 112, justifyContent: 'space-between', gap: 6, overflow: 'hidden' },
  big: { minHeight: 140, paddingHorizontal: 16, paddingVertical: 14 },
  band: { position: 'absolute', right: 6, top: -60, width: 30, height: 260, transform: [{ rotate: '22deg' }] },
  thin: { position: 'absolute', right: 44, top: -60, width: 9, height: 260, transform: [{ rotate: '22deg' }] },
  stripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, paddingRight: 8, color: '#FFF', fontSize: 18, fontWeight: '900', lineHeight: 23, ...shadow },
  nameBig: { fontSize: 24, lineHeight: 30 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingRight: 40 },
  type: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipText: { color: '#D9452B', fontSize: 12, fontWeight: '700' },
});
