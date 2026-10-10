import { StyleSheet, Text, View } from 'react-native';
import { KIND_LABEL } from './theme';
import { TYPE_LABEL, cardTypes } from './appLink';

const KIND_ICON = { app: '↗', set: '≡', barcode: '▮▯', photo: '▣' };

// Card face drawn from 2-4 colors: background, a wide band, a thin band and a bottom stripe.
// No logos: brands' marks can't be used without each company's permission.
export default function CardFace({ card, palette, big, chip, meta, style }) {
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
        <Text style={[s.name, big && s.nameBig]} numberOfLines={2}>{card.name || 'カード名'}</Text>
        {big && (
          // Only on large cards (the top suggestion); small cards in lists stay uncluttered.
          <View style={s.badge}>
            <Text style={[s.badgeText, { color: bg }]}>{KIND_ICON[card.kind]} {KIND_LABEL[card.kind]}</Text>
          </View>
        )}
      </View>
      <View>
        {card.kind === 'set' ? (
          meta ? <Text style={s.meta} numberOfLines={1}>{meta}</Text> : null
        ) : (
          <View style={s.types}>
            {cardTypes(card).map((ty) => (
              <View key={ty} style={s.type}><Text style={s.typeText}>{TYPE_LABEL[ty]}</Text></View>
            ))}
          </View>
        )}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingRight: 40 },
  badge: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  name: { flexShrink: 1, color: '#FFF', fontSize: 18, fontWeight: '900', lineHeight: 23, ...shadow },
  nameBig: { fontSize: 24, lineHeight: 30 },
  meta: { color: '#FFF', fontSize: 11, opacity: 0.92, paddingRight: 46, ...shadow },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingRight: 40 },
  type: { borderRadius: 999, borderWidth: 1.5, borderColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 7, paddingVertical: 1 },
  typeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  chipText: { color: '#D9452B', fontSize: 12, fontWeight: '700' },
});
