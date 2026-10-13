// Reorder from Home's long-press menu: drag cards by their grip, then 保存.
// Without a saved order the list is sorted by how often each card is used; 「よく使う順に戻す」 goes back to that.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReorderGrid from './ReorderGrid';

export default function ReorderScreen({ cards, t, onCancel, onSave, onAuto }) {
  const s = styles(t);
  const [ids, setIds] = useState(cards.map((c) => c.id));
  const [dragging, setDragging] = useState(false);
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button"><Text style={s.headText}>キャンセル</Text></Pressable>
        <Text style={s.title}>並び替え</Text>
        <Pressable onPress={() => onSave(ids)} hitSlop={10} style={s.saveBtn} accessibilityRole="button"><Text style={s.saveText}>保存</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body} scrollEnabled={!dragging}>
        <Text style={s.hint}>右上の ≡ を押したまま動かして並べ替えます。</Text>
        <ReorderGrid cards={cards} t={t} onChange={setIds} onDragging={setDragging} />
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
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19 },
  auto: { marginTop: 6, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  autoText: { color: t.accent, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
