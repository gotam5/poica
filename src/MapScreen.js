import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { cardPalette } from './appLink';

// Where each card was used, from the places learned in geo.js (each place counts its uses in n).
// Bigger pins for places used more; tapping a pin names the card and the count.
export default function MapScreen({ cards, pos, t }) {
  const s = styles(t);
  const mapRef = useRef(null);
  const [only, setOnly] = useState(null); // card id, or null for all
  const [picked, setPicked] = useState(null); // { card, place }

  const used = useMemo(() => cards.filter((c) => c.places && c.places.length), [cards]);
  const points = useMemo(() => used
    .filter((c) => !only || c.id === only)
    .flatMap((c) => c.places.map((p, i) => ({ key: `${c.id}-${i}`, card: c, place: p, n: p.n || 1 }))), [used, only]);

  const fit = () => {
    const coords = points.map((x) => ({ latitude: x.place.lat, longitude: x.place.lng }));
    if (pos) coords.push({ latitude: pos.lat, longitude: pos.lng });
    if (!coords.length || !mapRef.current) return;
    if (coords.length === 1) {
      mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 }, 300);
      return;
    }
    mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 50, bottom: 80, left: 50 }, animated: true });
  };
  useEffect(() => { const id = setTimeout(fit, 300); return () => clearTimeout(id); }, [only, points.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const initial = pos
    ? { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : points[0]
      ? { latitude: points[0].place.lat, longitude: points[0].place.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { latitude: 35.681, longitude: 139.767, latitudeDelta: 0.3, longitudeDelta: 0.3 };
  const total = points.reduce((n, x) => n + x.n, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.head}>
        <Text style={s.title}>マップ</Text>
        <Text style={s.sub}>{used.length ? `${points.length}か所・${total}回` : ''}</Text>
      </View>
      {used.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip s={s} label="すべて" on={!only} onPress={() => { setOnly(null); setPicked(null); }} />
          {used.map((c) => (
            <Chip key={c.id} s={s} label={c.name} color={cardPalette(c, cards)[0]} on={only === c.id} onPress={() => { setOnly(only === c.id ? null : c.id); setPicked(null); }} />
          ))}
        </ScrollView>
      )}
      <View style={{ flex: 1 }}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initial} showsUserLocation onMapReady={fit} onPress={() => setPicked(null)}>
          {points.map((x) => {
            const size = Math.min(56, 26 + x.n * 3);
            return (
              <Marker key={x.key} coordinate={{ latitude: x.place.lat, longitude: x.place.lng }} onPress={(e) => { e.stopPropagation(); setPicked(x); }} tracksViewChanges={false}>
                <View style={[s.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: cardPalette(x.card, cards)[0] }]}>
                  <Text style={s.pinText}>{x.n}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
        {!used.length && (
          <View style={s.emptyWrap} pointerEvents="none">
            <Text style={s.empty}>まだ場所の記録がありません。お店でカードを使うと、その場所がここに出ます。</Text>
          </View>
        )}
        {picked && (
          <View style={s.card}>
            <View style={[s.dot, { backgroundColor: cardPalette(picked.card, cards)[0] }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardName} numberOfLines={1}>{picked.card.name}</Text>
              <Text style={s.cardText}>この場所で{picked.n}回 ・ 最後は{dateLabel(picked.place.t)}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({ s, label, color, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {color ? <View style={[s.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export function dateLabel(ms) {
  if (!ms) return '—';
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 30) return `${days}日前`;
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = (t) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: t.ink },
  sub: { fontSize: 13, color: t.muted, fontVariant: ['tabular-nums'] },
  chips: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 180 },
  chipOn: { backgroundColor: t.accent, borderColor: t.accent },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: t.ink, fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: t.accentInk },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  pinText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  emptyWrap: { position: 'absolute', left: 16, right: 16, top: 16, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line },
  empty: { color: t.muted, fontSize: 13, lineHeight: 19 },
  card: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  dot: { width: 18, height: 18, borderRadius: 9 },
  cardName: { color: t.ink, fontSize: 16, fontWeight: '800' },
  cardText: { color: t.muted, fontSize: 13, marginTop: 2 },
});
