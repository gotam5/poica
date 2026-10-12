// Card design. Free: fixed to the shop's colors (or the card color).
// Poica 無制限: pattern, background / pattern colors, text color, and the user's own picture,
// shown one section at a time (模様 / 色 / 文字 / 画像) so the screen stays calm.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CardFace, { PATTERNS, SHADES } from './CardFace';
import { cardPalette, catalogApp } from './appLink';

const SWATCHES = [
  '#0A7552', '#1E9E6A', '#0F7F93', '#2F5BD3', '#1B2A6B', '#7A3FC4', '#C23C7A', '#FF9FD2',
  '#C2412D', '#F25C54', '#E76F51', '#B8740A', '#F2C14E', '#FFD166', '#3D2B1F', '#3D4A55',
  '#15211C', '#FFFFFF',
];

const TABS = [['pattern', '模様'], ['color', '色'], ['text', '文字'], ['image', '画像']];

export default function DesignPicker({ d, set, allCards = [], canDesign, onLocked, t, big = true }) {
  const s = styles(t);
  const [tab, setTab] = useState('pattern');
  const [slot, setSlot] = useState(0);
  const app = d.kind === 'app' && d.catalogId ? catalogApp(d.catalogId) : null;
  const preview = { ...d, name: d.name || app?.name || '' };
  const palette = cardPalette(d, allCards);

  if (!canDesign) {
    // A design chosen while unlimited stays as it was; free users just can't change it.
    return (
      <View style={{ gap: 12 }}>
        <CardFace card={preview} palette={palette} big={big} />
        <Pressable onPress={onLocked} style={({ pressed }) => [s.lock, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.lockTitle}>🔒 デザインを変えるには Poica 無制限</Text>
          <Text style={s.lockText}>無料版は{app ? 'お店のイメージ色' : 'このデザイン'}で固定です。Poica 無制限なら、模様・配色・文字の色を選んだり、好きな画像をカードにできます。</Text>
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

  // Changing one color keeps the rest of the current palette.
  const setColor = (i, c) => {
    const next = [...palette];
    while (next.length <= i) next.push('#FFFFFF');
    next[i] = c;
    set({ palette: next, color: next[0], bgImage: null });
  };

  const pattern = d.pattern || 'bands';
  // Color slots that the current pattern actually uses.
  const slots = [['背景', 0], ...(pattern !== 'plain' ? [['模様', 1]] : []), ...((pattern === 'bands' || pattern === 'circles') ? [['模様2', 2]] : [])];
  const slotNow = slots.some(([, i]) => i === slot) ? slot : 0;

  return (
    <View style={{ gap: 14 }}>
      <CardFace card={preview} palette={palette} big={big} />

      <View style={s.tabs}>
        {TABS.map(([k, l]) => {
          const on = tab === k;
          return (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.tab, on && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{l}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'pattern' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PATTERNS.map((p) => {
            const on = !d.bgImage && pattern === p.key;
            return (
              <Pressable key={p.key} onPress={() => set({ pattern: p.key, bgImage: null })} style={s.patWrap} accessibilityRole="button" accessibilityLabel={p.label} accessibilityState={{ selected: on }}>
                <View style={[s.patFrame, on && { borderColor: t.ink }]}>
                  <CardFace card={{ pattern: p.key }} palette={palette} mini style={{ width: 76 }} />
                </View>
                <Text style={[s.small, on && { color: t.ink }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {tab === 'color' && (
        <View style={{ gap: 12 }}>
          <View style={s.row}>
            {slots.map(([l, i]) => {
              const on = slotNow === i;
              return (
                <Pressable key={i} onPress={() => setSlot(i)} style={[s.slot, on && { borderColor: t.ink }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={[s.slotDot, { backgroundColor: palette[i] || '#FFFFFF' }]} />
                  <Text style={[s.slotText, on && { color: t.ink }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.swatches}>
            {SWATCHES.map((c) => {
              const on = (palette[slotNow] || '').toUpperCase() === c;
              return (
                <Pressable key={c} onPress={() => setColor(slotNow, c)} style={[s.swatch, { backgroundColor: c }, c === '#FFFFFF' && { borderColor: t.line }, on && { borderColor: t.ink, borderWidth: 3 }]} accessibilityRole="button" accessibilityLabel={c} accessibilityState={{ selected: on }} hitSlop={2} />
              );
            })}
          </View>
          {app && app.colors ? (
            <Pressable onPress={() => set({ palette: null, color: app.colors[0], bgImage: null })} hitSlop={6} accessibilityRole="button">
              <Text style={s.reset}>{app.name}の色に戻す</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {tab === 'text' && (
        <View style={s.row}>
          {[['light', '白'], ['dark', '黒']].map(([k, l]) => {
            const on = (d.textColor || 'light') === k;
            return (
              <Pressable key={k} onPress={() => set({ textColor: k })} style={[s.opt, on && s.optOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[s.optText, on && s.optTextOn]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {tab === 'image' && (
        <View style={{ gap: 10 }}>
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
          {d.bgImage ? (
            <>
              <Text style={s.small}>文字を読みやすくする暗さ</Text>
              <View style={s.row}>
                {SHADES.map((x) => {
                  const on = (d.shade || 'soft') === x.key;
                  return (
                    <Pressable key={x.key} onPress={() => set({ shade: x.key })} style={[s.opt, on && s.optOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[s.optText, on && s.optTextOn]}>{x.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={s.hint}>写真アプリから選んだ画像を、カードの背景にします。画像はこのiPhoneの中だけに保存されます。</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  label: { color: t.ink, fontWeight: '700', fontSize: 13 },
  small: { color: t.muted, fontSize: 12, fontWeight: '700' },
  hint: { color: t.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  pressed: { opacity: 0.6 },
  patWrap: { alignItems: 'center', gap: 4 },
  patFrame: { borderWidth: 3, borderColor: 'transparent', borderRadius: 12 },
  tabs: { flexDirection: 'row', backgroundColor: t.line, borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabOn: { backgroundColor: t.surface },
  tabText: { color: t.muted, fontWeight: '700', fontSize: 14 },
  tabTextOn: { color: t.ink },
  slot: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 8 },
  slotDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  slotText: { color: t.muted, fontWeight: '700', fontSize: 13 },
  reset: { color: t.accent, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  opt: { flex: 1, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  optOn: { backgroundColor: t.accent, borderColor: t.accent },
  optText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  optTextOn: { color: t.accentInk },
  btn: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  lock: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent, borderRadius: 14, padding: 14, gap: 4 },
  lockTitle: { color: t.accent, fontSize: 15, fontWeight: '800' },
  lockText: { color: t.muted, fontSize: 13, lineHeight: 19 },
});
