import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { cardPalette } from './appLink';
import { MERGE_DIST, distance } from './geo';
import { TAB_SPACE } from './Toolbar';
import Glass from './Glass';

// Where cards were used, from the places learned in geo.js (each place counts its uses in n).
// Places of different cards that are close together become one spot; bigger pins for spots used more.
// Tapping a spot shows, from the bottom, which cards were used there and how many times.
function spotsOf(cards) {
  const spots = [];
  for (const c of cards) {
    for (const p of c.places || []) {
      let spot = spots.find((x) => distance(x, p) < MERGE_DIST);
      if (!spot) { spot = { lat: p.lat, lng: p.lng, total: 0, last: 0, byCard: new Map() }; spots.push(spot); }
      const n = p.n || 1;
      spot.total += n;
      spot.last = Math.max(spot.last, p.t || 0);
      const e = spot.byCard.get(c.id) || { card: c, n: 0, last: 0, places: [] };
      e.places.push(p);
      e.n += n;
      e.last = Math.max(e.last, p.t || 0);
      spot.byCard.set(c.id, e);
    }
  }
  return spots.map((x) => ({ ...x, key: `${x.lat.toFixed(5)},${x.lng.toFixed(5)}`, list: [...x.byCard.values()].sort((a, b) => b.n - a.n) }));
}

export default function MapScreen({ cards, pos, t, onForgetPlaces }) {
  const s = styles(t);
  const mapRef = useRef(null);
  const [picked, setPicked] = useState(null); // spot key
  const spots = useMemo(() => spotsOf(cards), [cards]);
  const spot = spots.find((x) => x.key === picked) || null;

  // The bottom sheet: drag the handle down to close it, up to make it taller.
  const { height } = useWindowDimensions();
  const [tall, setTall] = useState(false);
  const drag = useRef(new Animated.Value(0)).current;
  const sheet = useRef({ tall: false });
  sheet.current.tall = tall;
  const close = () => { setPicked(null); setTall(false); drag.setValue(0); };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => drag.setValue(g.dy),
    onPanResponderRelease: (_, g) => {
      const down = g.dy > 60 || g.vy > 0.8;
      const up = g.dy < -40 || g.vy < -0.8;
      if (down && !sheet.current.tall) {
        Animated.timing(drag, { toValue: 600, duration: 180, useNativeDriver: true }).start(close);
        return;
      }
      if (down) setTall(false);
      else if (up) setTall(true);
      Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
  })).current;

  // Delete one card's history at this spot (the learned places there), after asking.
  const forget = (e) => {
    Alert.alert(`「${e.card.name}」のこの場所の履歴を消しますか？`, undefined, [
      { text: 'やめる', style: 'cancel' },
      { text: '消す', style: 'destructive', onPress: () => onForgetPlaces(e.card.id, e.places) },
    ]);
  };

  const fit = () => {
    const coords = spots.map((x) => ({ latitude: x.lat, longitude: x.lng }));
    if (pos) coords.push({ latitude: pos.lat, longitude: pos.lng });
    if (!coords.length || !mapRef.current) return;
    if (coords.length === 1) {
      mapRef.current.animateToRegion({ ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 }, 300);
      return;
    }
    mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, right: 50, bottom: 60, left: 50 }, animated: true });
  };
  useEffect(() => { const id = setTimeout(fit, 300); return () => clearTimeout(id); }, [spots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const initial = pos
    ? { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : spots[0]
      ? { latitude: spots[0].lat, longitude: spots[0].lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { latitude: 35.681, longitude: 139.767, latitudeDelta: 0.3, longitudeDelta: 0.3 };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.head}>
        <Text style={s.title}>マップ</Text>
      </View>
      <View style={{ flex: 1 }}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initial} showsUserLocation onMapReady={fit} onPress={close}>
          {spots.map((x) => {
            const size = Math.min(56, 26 + x.total * 3);
            const on = x.key === picked;
            return (
              <Marker key={x.key} coordinate={{ latitude: x.lat, longitude: x.lng }} onPress={(e) => { e.stopPropagation(); drag.setValue(0); setPicked(x.key); }} tracksViewChanges={on}>
                <View style={[s.pin, { width: size, height: size, borderRadius: size / 2 }, on && s.pinOn]}>
                  <Text style={s.pinText}>{x.total}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
        {!spots.length && (
          <View style={s.emptyWrap} pointerEvents="none">
            <Text style={s.empty}>まだ場所の記録がありません。お店でカードを使うと、その場所がここに出ます。</Text>
          </View>
        )}
        {spot && (
          <Animated.View style={[s.sheetWrap, { transform: [{ translateY: drag.interpolate({ inputRange: [-200, 0, 600], outputRange: [-40, 0, 600], extrapolate: 'clamp' }) }] }]}>
            <Glass t={t} style={s.sheet}>
            <View {...pan.panHandlers} style={s.handleArea}>
              <View style={s.grip} />
              <Text style={s.sheetTitle}>この場所で使ったカード</Text>
              <Text style={s.sheetSub}>合計{spot.total}回 ・ 最後は{dateLabel(spot.last)}</Text>
            </View>
            <ScrollView style={{ maxHeight: tall ? height * 0.55 : 200 }} contentContainerStyle={{ gap: 2 }}>
              {spot.list.map((e) => (
                <View key={e.card.id} style={s.row}>
                  <View style={[s.dot, { backgroundColor: cardPalette(e.card, cards)[0] }]} />
                  <Text style={s.rowName} numberOfLines={1}>{e.card.name}</Text>
                  <Text style={s.rowCount}>{e.n}<Text style={s.unit}> 回</Text></Text>
                  <Pressable onPress={() => forget(e)} hitSlop={8} style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${e.card.name}のこの場所の履歴を消す`}>
                    <Text style={s.delText}>消す</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            </Glass>
          </Animated.View>
        )}
      </View>
    </View>
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
  pin: { alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  pinOn: { backgroundColor: '#D9452B' },
  pinText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  emptyWrap: { position: 'absolute', left: 16, right: 16, top: 16, backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.line },
  empty: { color: t.muted, fontSize: 13, lineHeight: 19 },
  sheetWrap: { position: 'absolute', left: 10, right: 10, bottom: TAB_SPACE, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  sheet: { borderRadius: 26, paddingHorizontal: 18, paddingTop: 0, paddingBottom: 14, gap: 4 },
  handleArea: { paddingTop: 8, paddingBottom: 6, gap: 4 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: t.track, marginBottom: 6 },
  del: { borderWidth: 1, borderColor: t.near, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 6 },
  delText: { color: t.near, fontSize: 12, fontWeight: '800' },
  sheetTitle: { color: t.ink, fontSize: 17, fontWeight: '900' },
  sheetSub: { color: t.muted, fontSize: 13, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.line },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowName: { flex: 1, color: t.ink, fontSize: 15, fontWeight: '800' },
  rowCount: { color: t.ink, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12, fontWeight: '700', color: t.muted },
});
