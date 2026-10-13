import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cardPalette } from './appLink';
import { dateLabel } from './MapScreen';

// card.useMonths: { 'YYYY-MM': count }, kept from 2026-10 on. card.uses: every use since the card was added.
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function StatsScreen({ cards, t, onEdit }) {
  const s = styles(t);
  const [range, setRange] = useState('all'); // all | month
  const month = monthKey();
  const countOf = (c) => (range === 'month' ? (c.useMonths && c.useMonths[month]) || 0 : c.uses || 0);
  const rows = [...cards].sort((a, b) => countOf(b) - countOf(a) || (b.lastUsed || 0) - (a.lastUsed || 0));
  const max = Math.max(1, ...rows.map(countOf));
  const thisMonth = cards.reduce((n, c) => n + ((c.useMonths && c.useMonths[month]) || 0), 0);
  const allTime = cards.reduce((n, c) => n + (c.uses || 0), 0);
  const places = cards.reduce((n, c) => n + (c.places ? c.places.length : 0), 0);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.title}>記録</Text>
      <View style={s.tiles}>
        <Tile s={s} value={thisMonth} label="今月使った回数" />
        <Tile s={s} value={allTime} label="これまでの合計" />
        <Tile s={s} value={places} label="覚えた場所" />
      </View>

      <View style={s.seg}>
        {[['all', 'これまで'], ['month', '今月']].map(([k, l]) => (
          <Pressable key={k} onPress={() => setRange(k)} style={[s.segBtn, range === k && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: range === k }}>
            <Text style={[s.segText, range === k && s.segTextOn]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      {rows.length ? (
        <View style={s.list}>
          {rows.map((c, i) => {
            const n = countOf(c);
            const color = cardPalette(c, cards)[0];
            return (
              <Pressable key={c.id} onLongPress={() => onEdit(c)} delayLongPress={400} style={[s.row, i > 0 && s.rowLine]} accessibilityLabel={`${i + 1}位 ${c.name} ${n}回`}>
                <Text style={s.rank}>{i + 1}</Text>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={s.nameRow}>
                    <View style={[s.dot, { backgroundColor: color }]} />
                    <Text style={s.name} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.count}>{n}<Text style={s.unit}> 回</Text></Text>
                  </View>
                  <View style={s.track}><View style={[s.fill, { width: `${(n / max) * 100}%`, backgroundColor: color }]} /></View>
                  <Text style={s.meta}>最後に使った日: {dateLabel(c.lastUsed)} ・ 場所 {c.places ? c.places.length : 0}か所</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={s.empty}><Text style={s.emptyText}>カードを登録すると、ここに使った回数が出ます。</Text></View>
      )}
    </ScrollView>
  );
}

function Tile({ s, value, label }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 14 },
  title: { fontSize: 26, fontWeight: '900', color: t.ink },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, gap: 2 },
  tileValue: { color: t.ink, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tileLabel: { color: t.muted, fontSize: 11, fontWeight: '700' },
  seg: { flexDirection: 'row', backgroundColor: t.chip, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: t.surface },
  segText: { color: t.muted, fontWeight: '700', fontSize: 13 },
  segTextOn: { color: t.ink },
  list: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  rowLine: { borderTopWidth: 1, borderTopColor: t.line },
  rank: { width: 22, textAlign: 'center', color: t.muted, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, color: t.ink, fontSize: 15, fontWeight: '800' },
  count: { color: t.ink, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12, fontWeight: '700', color: t.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: t.chip, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  meta: { color: t.muted, fontSize: 12 },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: 14, padding: 14 },
  emptyText: { fontSize: 13, color: t.muted, lineHeight: 20 },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
});
