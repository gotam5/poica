// Card design. Free: fixed to the shop's colors (or the card color). Poica 無制限: any preset, or the user's own picture.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CardFace from './CardFace';
import { PALETTES } from './theme';
import { cardPalette, catalogApp } from './appLink';

export default function DesignPicker({ d, set, allCards = [], canDesign, onLocked, t, big = true }) {
  const s = styles(t);
  const app = d.kind === 'app' && d.catalogId ? catalogApp(d.catalogId) : null;
  const preview = { ...d, name: d.name || app?.name || '' };

  if (!canDesign) {
    // A palette or picture chosen while unlimited stays as it was; free users just can't change it.
    return (
      <View style={{ gap: 12 }}>
        <CardFace card={preview} palette={cardPalette(d, allCards)} big={big} />
        <Pressable onPress={onLocked} style={({ pressed }) => [s.lock, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.lockTitle}>🔒 デザインを変えるには Poica 無制限</Text>
          <Text style={s.lockText}>無料版は{app ? 'お店のイメージ色' : 'このデザイン'}で固定です。Poica 無制限なら、配色を選んだり、好きな画像をカードにできます。</Text>
        </Pressable>
      </View>
    );
  }

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [16, 10] });
      if (res.canceled || !res.assets?.length) return;
      set({ bgImage: { temp: res.assets[0].uri } });
    } catch {}
  };

  const current = cardPalette(d, allCards).join();
  const options = [
    ...(app && app.colors ? [{ key: 'app', colors: app.colors, label: `${app.name}の色` }] : []),
    ...PALETTES.map((p, i) => ({ key: String(i), colors: p, label: `配色${i + 1}` })),
  ];
  return (
    <View style={{ gap: 12 }}>
      <CardFace card={preview} palette={cardPalette(d, allCards)} big={big} />
      <Text style={s.label}>配色</Text>
      <View style={s.palettes}>
        {options.map((o) => {
          const on = !d.bgImage && o.colors.join() === current;
          return (
            <Pressable key={o.key} onPress={() => set(o.key === 'app' ? { palette: null, color: o.colors[0], bgImage: null } : { palette: o.colors, color: o.colors[0], bgImage: null })} style={[s.pal, on && { borderColor: t.ink }]} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: on }}>
              {o.colors.map((c, k) => <View key={k} style={{ flex: k === 0 ? 2 : 1, backgroundColor: c }} />)}
            </Pressable>
          );
        })}
      </View>
      <Text style={s.label}>好きな画像</Text>
      <View style={s.row}>
        <Pressable onPress={pickImage} style={({ pressed }) => [s.btn, { flex: 1 }, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.btnText}>{d.bgImage ? '画像を選び直す' : '画像を選ぶ'}</Text>
        </Pressable>
        {d.bgImage ? (
          <Pressable onPress={() => set({ bgImage: null })} style={({ pressed }) => [s.btn, { flex: 1 }, pressed && s.pressed]} accessibilityRole="button">
            <Text style={s.btnText}>画像を外す</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={s.hint}>写真アプリから選んだ画像を、カードの背景にします。画像はこのiPhoneの中だけに保存されます。</Text>
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  label: { color: t.ink, fontWeight: '700', fontSize: 13 },
  hint: { color: t.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  pressed: { opacity: 0.6 },
  palettes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pal: { width: 60, height: 38, borderRadius: 10, borderWidth: 3, borderColor: 'transparent', flexDirection: 'row', overflow: 'hidden' },
  btn: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  lock: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent, borderRadius: 14, padding: 14, gap: 4 },
  lockTitle: { color: t.accent, fontSize: 15, fontWeight: '800' },
  lockText: { color: t.muted, fontSize: 13, lineHeight: 19 },
});
