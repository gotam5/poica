// Reorder the card list. Without a saved order the list is sorted by how often each card is used;
// saving here keeps the order the user chose, and 「よく使う順に戻す」 goes back to automatic.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CardFace from './CardFace';
import { cardPalette } from './appLink';

export default function ReorderScreen({ cards, focusId, t, onCancel, onSave, onAuto }) {
  const s = styles(t);
  const [list, setList] = useState(cards);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button"><Text style={s.headText}>キャンセル</Text></Pressable>
        <Text style={s.title}>並び替え</Text>
        <Pressable onPress={() => onSave(list.map((c) => c.id))} hitSlop={10} style={s.saveBtn} accessibilityRole="button"><Text style={s.saveText}>保存</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.hint}>矢印で上下に動かします。保存すると、この順番でカード一覧に並びます。</Text>
        {list.map((c, i) => (
          <View key={c.id} style={[s.row, c.id === focusId && s.rowOn]}>
            <View style={{ width: 92 }}>
              <CardFace card={c} palette={cardPalette(c, cards)} mini style={{ height: 52 }} />
            </View>
            <Text style={s.name} numberOfLines={2}>{c.name}</Text>
            <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={[s.arrow, i === 0 && s.off]} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${c.name}を上へ`}>
              <Text style={s.arrowText}>↑</Text>
            </Pressable>
            <Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[s.arrow, i === list.length - 1 && s.off]} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${c.name}を下へ`}>
              <Text style={s.arrowText}>↓</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={onAuto} style={({ pressed }) => [s.auto, pressed && { opacity: 0.6 }]} accessibilityRole="button">
          <Text style={s.autoText}>よく使う順に戻す</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headText: { color: t.accent, fontSize: 16, fontWeight: '600' },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  saveBtn: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  saveText: { color: t.accentInk, fontWeight: '800', fontSize: 15 },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 8 },
  rowOn: { borderColor: t.accent, borderWidth: 2 },
  name: { flex: 1, color: t.ink, fontSize: 15, fontWeight: '800' },
  arrow: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg },
  off: { opacity: 0.3 },
  arrowText: { color: t.ink, fontSize: 18, fontWeight: '900' },
  auto: { marginTop: 10, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  autoText: { color: t.accent, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
