import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CardFace from './CardFace';
import { CATALOG, TYPE_LABEL, cardPalette, installedCatalogIds, openCardApp } from './appLink';
import { PALETTES, useTheme } from './theme';

// Guided add: 1. pick the card (and try opening it) → 2. pick a design → 3. done.
// 「自分でカードを作る」 hands over to the full editor (barcode, photo, set, other apps).
export default function AddFlow({ initial, allCards = [], onCancel, onSave, onCustom }) {
  const t = useTheme();
  const s = styles(t);
  const [step, setStep] = useState('pick'); // pick | try | design | done
  const [d, setD] = useState(initial);
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState([]);
  const [result, setResult] = useState(null); // null | 'ok' | 'fail'
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    installedCatalogIds().then(setInstalled).catch(() => {});
  }, []);

  const app = CATALOG.find((a) => a.id === d.catalogId) || null;
  const viaShortcut = d.appMode === 'shortcut';

  const pick = (a) => {
    setResult(null);
    const shortcut = a.openWith === 'shortcut';
    setD((prev) => ({
      ...prev, kind: 'app', catalogId: a.id, name: a.name, palette: null, color: a.colors[0], launch: null,
      appMode: shortcut ? 'shortcut' : 'catalog', shortcutName: shortcut ? `${a.name}を開く` : '',
    }));
    setStep('try');
  };

  const tryOpen = async () => {
    setResult(null);
    const ok = await openCardApp(d);
    setResult(ok ? 'ok' : 'fail');
  };

  const useShortcut = () => {
    setResult(null);
    set({ appMode: 'shortcut', shortcutName: d.shortcutName || `${app.name}を開く` });
  };

  const back = () => {
    if (step === 'try') setStep('pick');
    else if (step === 'design') setStep('try');
    else onCancel();
  };

  const finish = async () => {
    const ok = await onSave({ ...d, shortcutName: (d.shortcutName || '').trim() });
    if (ok !== false) setStep('done');
  };

  const stepNo = { pick: 1, try: 1, design: 2, done: 3 }[step];

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={step === 'done' ? onCancel : back} hitSlop={10} accessibilityRole="button">
          <Text style={s.headText}>{step === 'pick' ? 'キャンセル' : step === 'done' ? '' : '戻る'}</Text>
        </Pressable>
        <Text style={s.title}>カードを追加</Text>
        <Text style={s.stepText}>{stepNo} / 3</Text>
      </View>
      <View style={s.progress}>{[1, 2, 3].map((n) => <View key={n} style={[s.bar, n <= stepNo && s.barOn]} />)}</View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'pick' && (
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.lead}>登録するカードを選んでください</Text>
            <Pressable onPress={onCustom} style={({ pressed }) => [s.custom, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.customIcon}>＋</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.customTitle}>自分でカードを作る</Text>
                <Text style={s.customText}>バーコード・写真で登録する、一覧にないアプリ、セット</Text>
              </View>
              <Text style={s.chev}>›</Text>
            </Pressable>
            <TextInput style={s.input} value={query} onChangeText={setQuery} placeholder="お店・アプリの名前で探す" placeholderTextColor={t.muted} autoCorrect={false} clearButtonMode="while-editing" />
            {(() => {
              const q = query.trim().toLowerCase();
              const list = CATALOG
                .filter((a) => !q || a.name.toLowerCase().includes(q) || a.keys.some((k) => k.toLowerCase().includes(q)))
                .sort((a, b) => installed.includes(b.id) - installed.includes(a.id));
              if (!list.length) return <Text style={s.hint}>見つかりません。上の「自分でカードを作る」から登録できます。</Text>;
              return (
                <View style={s.list}>
                  {list.map((a, i) => (
                    <Pressable key={a.id} onPress={() => pick(a)} style={({ pressed }) => [s.item, i > 0 && s.itemLine, pressed && s.pressed]} accessibilityRole="button" accessibilityLabel={`${a.name} ${(a.types || ['point']).map((x) => TYPE_LABEL[x]).join('と')}`}>
                      <View style={s.swatch}>{a.colors.slice(0, 3).map((c, k) => <View key={k} style={{ flex: k === 0 ? 2 : 1, backgroundColor: c }} />)}</View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.itemName} numberOfLines={1}>{a.name}</Text>
                        <View style={s.tags}>
                          {(a.types || ['point']).map((ty) => (
                            <View key={ty} style={[s.tag, ty === 'pay' ? s.tagPay : s.tagPoint]}>
                              <Text style={[s.tagText, ty === 'pay' ? s.tagPayText : s.tagPointText]}>{TYPE_LABEL[ty]}</Text>
                            </View>
                          ))}
                          {installed.includes(a.id) && <Text style={s.installed}>このiPhoneに入っています</Text>}
                        </View>
                      </View>
                      <Text style={s.chev}>›</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })()}
          </ScrollView>
        )}

        {step === 'try' && app && (
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.lead}>{app.name}が開けるか試してください</Text>
            {viaShortcut ? (
              <View style={s.box}>
                <Text style={s.boxTitle}>{app.openWith === 'shortcut' ? `${app.name}は、iPhoneの「ショートカット」から開きます` : 'ショートカットで開く'}</Text>
                {app.openWith === 'shortcut' && <Text style={s.hint}>{app.name}のアプリは、起動中に直接開くとSafariに移ってしまうためです。最初に1回だけ準備が要ります。</Text>}
                <Text style={s.stepLine}>1. 「ショートカット」アプリを開き、右上の「＋」を押す</Text>
                <Text style={s.stepLine}>2. 「Appを開く」を追加して、{app.name}を選ぶ</Text>
                <Text style={s.stepLine}>3. 下の名前を付けて保存する</Text>
                <TextInput style={s.input} value={d.shortcutName} onChangeText={(v) => { setResult(null); set({ shortcutName: v }); }} autoCorrect={false} />
              </View>
            ) : (
              <Text style={s.hint}>下のボタンを押すと{app.name}のアプリが開きます。開いたらPoicaに戻ってきてください。</Text>
            )}

            <Pressable onPress={tryOpen} style={({ pressed }) => [s.tryBtn, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.tryText}>↗ 試しに開く</Text>
            </Pressable>

            {result === 'fail' && (
              <View style={s.err}>
                <Text style={s.errText}>
                  {viaShortcut ? 'ショートカットを開けませんでした。名前が合っているか確かめてください。' : `開けませんでした。${app.name}のアプリが入っているか確かめてください。`}
                </Text>
              </View>
            )}
            {result === 'ok' && <Text style={s.hint}>ちゃんと開けたら「次へ」を押してください。</Text>}

            {!viaShortcut && (
              <Pressable onPress={useShortcut} accessibilityRole="button" hitSlop={6}>
                <Text style={s.link}>うまく開かないときは、ショートカットで開く</Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        {step === 'design' && (
          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.lead}>カードのデザインを選んでください</Text>
            <CardFace card={d} palette={cardPalette(d, allCards)} big meta="ホームでの見え方" />
            <View style={s.palettes}>
              {[...(app ? [{ key: 'app', colors: app.colors, label: `${app.name}の色` }] : []), ...PALETTES.map((p, i) => ({ key: String(i), colors: p, label: `配色${i + 1}` }))].map((o) => {
                const on = o.colors.join() === cardPalette(d, allCards).join();
                return (
                  <Pressable key={o.key} onPress={() => set(o.key === 'app' ? { palette: null, color: o.colors[0] } : { palette: o.colors, color: o.colors[0] })} style={[s.pal, on && { borderColor: t.ink }]} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: on }}>
                    {o.colors.map((c, k) => <View key={k} style={{ flex: k === 0 ? 2 : 1, backgroundColor: c }} />)}
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.hint}>最初はお店のイメージ色になっています。あとからカードを長押しして変えることもできます。</Text>
          </ScrollView>
        )}

        {step === 'done' && (
          <View style={[s.body, { flex: 1, justifyContent: 'center' }]}>
            <Text style={s.doneMark}>✓</Text>
            <Text style={[s.lead, { textAlign: 'center' }]}>登録しました</Text>
            <CardFace card={d} palette={cardPalette(d, allCards)} big />
            <Text style={[s.hint, { textAlign: 'center' }]}>ホームでこのカードを押すと、すぐに{app ? app.name : 'アプリ'}が開きます。</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {step !== 'pick' && (
        <View style={s.foot}>
          {step === 'try' && (
            <Pressable onPress={() => setStep('design')} disabled={viaShortcut && !(d.shortcutName || '').trim()} style={({ pressed }) => [s.next, viaShortcut && !(d.shortcutName || '').trim() && s.nextOff, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.nextText}>次へ</Text>
            </Pressable>
          )}
          {step === 'design' && (
            <Pressable onPress={finish} style={({ pressed }) => [s.next, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.nextText}>このデザインで登録する</Text>
            </Pressable>
          )}
          {step === 'done' && (
            <Pressable onPress={onCancel} style={({ pressed }) => [s.next, pressed && s.pressed]} accessibilityRole="button">
              <Text style={s.nextText}>完了</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headText: { color: t.ink, fontSize: 15, minWidth: 70 },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  stepText: { color: t.muted, fontSize: 13, fontWeight: '700', minWidth: 70, textAlign: 'right', fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.line },
  barOn: { backgroundColor: t.accent },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  lead: { color: t.ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: t.ink },
  custom: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: t.accent, borderStyle: 'dashed', borderRadius: 14, padding: 14, backgroundColor: t.surface },
  customIcon: { fontSize: 26, color: t.accent, fontWeight: '800', width: 30, textAlign: 'center' },
  customTitle: { color: t.ink, fontSize: 16, fontWeight: '800' },
  customText: { color: t.muted, fontSize: 12, marginTop: 2 },
  list: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.line, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  itemLine: { borderTopWidth: 1, borderTopColor: t.line },
  swatch: { width: 44, height: 30, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  itemName: { color: t.ink, fontSize: 16, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagPoint: { backgroundColor: '#E3F1EA' },
  tagPay: { backgroundColor: '#E4EBFB' },
  tagText: { fontSize: 11, fontWeight: '800' },
  tagPointText: { color: '#0A7552' },
  tagPayText: { color: '#2F5BD3' },
  installed: { color: t.muted, fontSize: 11 },
  chev: { color: t.muted, fontSize: 24, fontWeight: '300' },
  pressed: { opacity: 0.6 },
  box: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 14, gap: 8 },
  boxTitle: { color: t.ink, fontSize: 15, fontWeight: '800' },
  stepLine: { color: t.ink, fontSize: 14, lineHeight: 21 },
  tryBtn: { borderWidth: 2, borderColor: t.accent, backgroundColor: t.accent + '1A', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  tryText: { color: t.accent, fontWeight: '800', fontSize: 18 },
  err: { backgroundColor: t.nearBg, borderRadius: 10, padding: 12 },
  errText: { color: t.near, fontSize: 13, lineHeight: 19 },
  link: { color: t.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  palettes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pal: { width: 64, height: 40, borderRadius: 10, borderWidth: 3, borderColor: 'transparent', flexDirection: 'row', overflow: 'hidden' },
  doneMark: { fontSize: 56, color: t.accent, textAlign: 'center', fontWeight: '800' },
  foot: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg },
  next: { backgroundColor: t.accent, borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center' },
  nextOff: { opacity: 0.4 },
  nextText: { color: t.accentInk, fontSize: 17, fontWeight: '800' },
});
