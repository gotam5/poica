// Card design. Free: fixed to the shop's colors (or the card color).
// PRO: pattern, background / pattern colors, text color, and the user's own picture,
// shown one section at a time (模様 / 色 / 画像) so the screen stays calm.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CardFace, { PATTERNS, textHex } from './CardFace';
import { cardPalette, catalogApp } from './appLink';

const SWATCHES = [
  '#0A7552', '#1E9E6A', '#0F7F93', '#2F5BD3', '#1B2A6B', '#7A3FC4', '#C23C7A', '#FF9FD2',
  '#C2412D', '#F25C54', '#E76F51', '#B8740A', '#F2C14E', '#FFD166', '#3D2B1F', '#3D4A55',
  '#15211C', '#FFFFFF',
];

const TABS = [['pattern', '模様'], ['color', '色'], ['image', 'ロゴ画像']];

// The card preview, kept above the scrolling settings so it stays in sight while the design changes.
export function DesignPreview({ d, allCards = [], t, big = true }) {
  const app = d.kind === 'app' && d.catalogId ? catalogApp(d.catalogId) : null;
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, backgroundColor: t.bg, borderBottomWidth: 1, borderBottomColor: t.line }}>
      <CardFace card={{ ...d, name: d.name || app?.name || '' }} palette={cardPalette(d, allCards)} big={big} />
    </View>
  );
}

export default function DesignPicker({ d, set, allCards = [], canDesign, onLocked, t, big = true, noPreview = false }) {
  const s = styles(t);
  const [tab, setTab] = useState('pattern');
  const [slot, setSlot] = useState(0);
  const app = d.kind === 'app' && d.catalogId ? catalogApp(d.catalogId) : null;
  const preview = { ...d, name: d.name || app?.name || '' };
  const palette = cardPalette(d, allCards);

  // Free: the PRO design tools are shown dimmed under a 「PROを購入する」 watermark; the current design stays as it is.
  const locked = !canDesign;

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (res.canceled || !res.assets?.length) return;
      set({ bgImage: { temp: res.assets[0].uri } });
    } catch {}
  };

  // Changing one color keeps the rest of the current palette.
  const setColor = (i, c) => {
    const next = [...palette];
    while (next.length <= i) next.push('#FFFFFF');
    next[i] = c;
    set({ palette: next, color: next[0] });
  };

  const pattern = d.pattern || 'bands';
  // Color slots that the current pattern actually uses.
  // 'text' is the text color; numbers are palette positions.
  const twoColors = pattern === 'bands' || pattern === 'circles';
  const slots = [
    ['背景色', 0],
    ...(pattern !== 'plain' ? [[twoColors ? '模様色1' : '模様色', 1]] : []),
    ...(twoColors ? [['模様色2', 2]] : []),
    ['文字色', 'text'],
  ];
  const slotNow = slots.some(([, i]) => i === slot) ? slot : 0;
  const valueOf = (i) => (i === 'text' ? textHex(d) : palette[i] || '#FFFFFF');
  const pick = (c) => (slotNow === 'text' ? set({ textColor: c }) : setColor(slotNow, c));

  return (
    <View style={{ gap: 14 }}>
      {noPreview ? null : <CardFace card={preview} palette={palette} big={big} />}

      <View>
      <View style={locked ? s.dim : null} pointerEvents={locked ? 'none' : 'auto'} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
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
            const on = pattern === p.key;
            return (
              <Pressable key={p.key} onPress={() => set({ pattern: p.key })} style={s.patWrap} accessibilityRole="button" accessibilityLabel={p.label} accessibilityState={{ selected: on }}>
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
          <View style={s.slots}>
            {slots.map(([l, i]) => {
              const on = slotNow === i;
              return (
                <Pressable key={i} onPress={() => setSlot(i)} style={[s.slot, on && { borderColor: t.ink }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={[s.slotDot, { backgroundColor: valueOf(i) }]} />
                  <Text style={[s.slotText, on && { color: t.ink }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.swatches}>
            {SWATCHES.map((c) => {
              const on = valueOf(slotNow).toUpperCase() === c;
              return (
                <Pressable key={c} onPress={() => pick(c)} style={[s.swatch, { backgroundColor: c }, c === '#FFFFFF' && { borderColor: t.line }, on && { borderColor: t.ink, borderWidth: 3 }]} accessibilityRole="button" accessibilityLabel={c} accessibilityState={{ selected: on }} hitSlop={2} />
              );
            })}
          </View>
          {app && app.colors ? (
            <Pressable onPress={() => set({ palette: null, color: app.colors[0], textColor: null })} hitSlop={6} accessibilityRole="button">
              <Text style={s.reset}>{app.name}の色に戻す</Text>
            </Pressable>
          ) : null}
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
              <Text style={s.small}>ロゴの後ろ</Text>
              <View style={s.row}>
                {[['none', 'なし'], ['white', '白い台']].map(([k, l]) => {
                  const on = (d.logoBg || 'none') === k;
                  return (
                    <Pressable key={k} onPress={() => set({ logoBg: k })} style={[s.opt, on && s.optOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[s.optText, on && s.optTextOn]}>{l}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={s.hint}>お店のロゴなどの画像を、カードの右側に正方形で載せます。選ぶときに正方形に切り取れます。画像はこのiPhoneの中だけに保存されます。</Text>
          )}
        </View>
      )}
      </View>
      {locked && (
        <Pressable onPress={onLocked} style={({ pressed }) => [s.watermark, pressed && s.pressed]} accessibilityRole="button" accessibilityLabel="PROを購入する">
          <View style={s.wmBadge}>
            <Text style={s.wmTitle}>PROを購入する</Text>
            <Text style={s.wmText}>模様・色・ロゴ画像を自由に変えられます</Text>
          </View>
        </Pressable>
      )}
      </View>
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
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 8 },
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
  dim: { opacity: 0.35 },
  watermark: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  wmBadge: { backgroundColor: t.accent, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', gap: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  wmTitle: { color: t.accentInk, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  wmText: { color: t.accentInk, fontSize: 12, fontWeight: '700', opacity: 0.9 },
});
