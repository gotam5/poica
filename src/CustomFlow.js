import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CardFace from './CardFace';
import DesignPicker, { DesignPreview } from './DesignPicker';
import ShortcutGuide from './ShortcutGuide';
import { PaywallModal } from './Paywall';
import { CaptureSection, useCapture } from './capture';
import { TYPE_LABEL, cardPalette, openCardApp } from './appLink';
import { lookupKnownApp } from './knownApps';
import { useTheme } from './theme';

// 「自分でカードを作る」, one step at a time:
// 1. how (barcode/photo, or an app not in the list) → 2. name → 3. read the card / set up the shortcut
// → 4. design (PRO only) → done.
export default function CustomFlow({ initial, allCards = [], canDesign, limits, onUnlocked, onCancel, onSave }) {
  const t = useTheme();
  const s = styles(t);
  const { width } = useWindowDimensions();
  const [step, setStep] = useState('kind'); // kind | name | content | design | done
  const [d, setD] = useState({ ...initial, kind: 'barcode', appMode: 'shortcut', catalogId: null, code: '', photo: null });
  const [result, setResult] = useState(null); // null | 'ok' | 'fail'
  const [paywall, setPaywall] = useState(null);
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const cap = useCapture(set);

  const isApp = d.kind === 'app';
  const order = ['kind', 'name', 'content', ...(canDesign ? ['design'] : []), 'done'];
  const stepNo = order.indexOf(step) + 1;
  const name = (d.name || '').trim();
  const known = !isApp ? lookupKnownApp(name) : null;

  const chooseKind = (kind) => {
    set(kind === 'app' ? { kind: 'app', appMode: 'shortcut', shortcutName: d.shortcutName || '' } : { kind: 'barcode' });
    setStep('name');
  };

  const back = () => {
    const i = order.indexOf(step);
    if (i <= 0) onCancel();
    else setStep(order[i - 1]);
  };

  const tryOpen = async () => {
    setResult(null);
    const ok = await openCardApp({ ...d, shortcutName: (d.shortcutName || '').trim() });
    setResult(ok ? 'ok' : 'fail');
  };

  const finish = async () => {
    const card = { ...d, name, code: (d.code || '').trim(), shortcutName: (d.shortcutName || '').trim() };
    if (!isApp) delete card.shortcutName;
    const ok = await onSave(card);
    if (ok !== false) setStep('done');
  };

  const goNext = () => {
    if (step === 'name') {
      if (isApp && !(d.shortcutName || '').trim()) set({ shortcutName: `${name}を開く` });
      return setStep('content');
    }
    if (step === 'content') return canDesign ? setStep('design') : finish();
    if (step === 'design') return finish();
    return onCancel();
  };

  let nextOk = true;
  if (step === 'name') nextOk = !!name;
  if (step === 'content') nextOk = isApp ? !!(d.shortcutName || '').trim() : !!((d.code || '').trim() || d.photo);
  const nextLabel = step === 'done' ? '完了' : step === 'design' || (step === 'content' && !canDesign) ? '登録する' : '次へ';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={step === 'done' ? onCancel : back} hitSlop={10} accessibilityRole="button">
          <Text style={s.headText}>{step === 'done' ? '' : '戻る'}</Text>
        </Pressable>
        <Text style={s.title}>自分でカードを作る</Text>
        <Text style={s.stepText}>{stepNo} / {order.length}</Text>
      </View>
      <View style={s.progress}>{order.map((k, i) => <View key={k} style={[s.bar, i < stepNo && s.barOn]} />)}</View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 'design' && <DesignPreview d={d} allCards={allCards} t={t} />}
        <ScrollView contentContainerStyle={[s.body, step === 'design' && { paddingTop: 12 }, step === 'done' && { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          {step === 'kind' && (
            <>
              <Text style={s.lead}>どうやって登録しますか？</Text>
              <Option s={s} title="バーコード・写真" text="プラスチックのカードや、時間で変わらない会員証のバーコードを読み取ります。スタンプカードは写真だけでも登録できます。" on={!isApp} onPress={() => chooseKind('barcode')} />
              <Option s={s} title="一覧にないアプリ" text="iPhoneの「ショートカット」を使って、好きなアプリを開くカードを作ります。" on={isApp} onPress={() => chooseKind('app')} />
            </>
          )}

          {step === 'name' && (
            <>
              <Text style={s.lead}>{isApp ? 'アプリ・お店の名前を入れてください' : 'お店・カードの名前を入れてください'}</Text>
              <TextInput style={s.input} value={d.name} onChangeText={(v) => set({ name: v })} placeholder={isApp ? '例: ○○ストア' : '例: 駅前のドラッグストア'} placeholderTextColor={t.muted} autoFocus returnKeyType="next" onSubmitEditing={() => nextOk && goNext()} />
              <Text style={s.hint}>ホームのカードに表示します。地図で近くの店を探すときにもこの名前を使います。</Text>
              {known && (
                <View style={s.warn}>
                  <Text style={s.warnTitle}>{known.label}は{known.kind === 'dynamic' ? 'バーコードが時間で変わります' : 'スクショでの利用が禁止されています'}</Text>
                  <Text style={s.warnText}>{known.note}</Text>
                  <Pressable onPress={onCancel} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
                    <Text style={s.secondaryText}>公式アプリの一覧から選ぶ</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {step === 'content' && !isApp && (
            <>
              <Text style={s.lead}>カードを読み取ってください</Text>
              <CaptureSection d={d} set={set} cap={cap} t={t} width={width} onToApp={onCancel} />
            </>
          )}

          {step === 'content' && isApp && (
            <>
              <Text style={s.lead}>ショートカットを用意してください</Text>
              <Text style={s.hint}>iPhoneの「ショートカット」アプリで、次のように1回だけ作ってください。</Text>
              <Text style={s.label}>ショートカットの名前</Text>
              <TextInput style={s.input} value={d.shortcutName} onChangeText={(v) => { setResult(null); set({ shortcutName: v }); }} autoCorrect={false} />
              <ShortcutGuide appName={name} shortcutName={(d.shortcutName || '').trim()} t={t} />
              <Pressable onPress={() => Linking.openURL('shortcuts://').catch(() => {})} style={({ pressed }) => [s.scBtn, pressed && s.pressed]} accessibilityRole="button">
                <Text style={s.scText}>「ショートカット」アプリを開く</Text>
              </Pressable>
              <Pressable onPress={tryOpen} style={({ pressed }) => [s.tryBtn, pressed && s.pressed]} accessibilityRole="button">
                <Text style={s.tryText}>↗ 試しに開く</Text>
              </Pressable>
              {result === 'fail' && <Text style={[s.status, s.statusErr]}>ショートカットを開けませんでした。名前が合っているか確かめてください。</Text>}
              {result === 'ok' && <Text style={s.hint}>ちゃんと開けたら、下のボタンで進んでください。</Text>}
              <Text style={s.label}>このアプリでできること(両方選べます)</Text>
              <View style={s.chips}>
                {['point', 'pay'].map((ty) => {
                  const types = d.types && d.types.length ? d.types : ['point'];
                  const on = types.includes(ty);
                  const next = on ? types.filter((x) => x !== ty) : [...types, ty];
                  return (
                    <Pressable key={ty} onPress={() => next.length && set({ types: next })} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{TYPE_LABEL[ty]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 'design' && (
            <>
              <Text style={s.lead}>カードのデザインを選んでください</Text>
              <DesignPicker d={d} set={set} allCards={allCards} canDesign t={t} noPreview />
            </>
          )}

          {step === 'done' && (
            <>
              <Text style={s.doneMark}>✓</Text>
              <Text style={[s.lead, { textAlign: 'center' }]}>登録しました</Text>
              <CardFace card={d} palette={cardPalette(d, allCards)} big />
              <Text style={[s.hint, { textAlign: 'center' }]}>ホームでこのカードを押すと、{isApp ? 'アプリが開きます' : 'レジで見せる画面が出ます'}。</Text>
              {!canDesign && (
                <Pressable onPress={() => setPaywall('design')} hitSlop={6} accessibilityRole="button">
                  <Text style={s.link}>カードのデザインを変えるには PRO</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {step !== 'kind' && (
        <View style={s.foot}>
          <Pressable onPress={goNext} disabled={!nextOk} style={({ pressed }) => [s.next, !nextOk && s.nextOff, pressed && s.pressed]} accessibilityRole="button" accessibilityState={{ disabled: !nextOk }}>
            <Text style={s.nextText}>{nextLabel}</Text>
          </Pressable>
          {step === 'content' && !nextOk && <Text style={s.footHint}>{isApp ? 'ショートカットの名前を入れてください' : 'バーコードを読み取るか、写真を撮ってください'}</Text>}
        </View>
      )}
      <PaywallModal reason={paywall} limits={limits} onClose={() => setPaywall(null)} onUnlocked={() => { setPaywall(null); onUnlocked && onUnlocked(); }} />
    </SafeAreaView>
  );
}

function Option({ s, title, text, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.option, on && s.optionOn, pressed && s.pressed]} accessibilityRole="button">
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.optionTitle}>{title}</Text>
        <Text style={s.optionText}>{text}</Text>
      </View>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 26, paddingBottom: 10 },
  headText: { color: t.ink, fontSize: 16, minWidth: 70, paddingVertical: 8 },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  stepText: { color: t.muted, fontSize: 13, fontWeight: '700', minWidth: 70, textAlign: 'right', fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.line },
  barOn: { backgroundColor: t.accent },
  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  lead: { color: t.ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  label: { color: t.ink, fontWeight: '700', fontSize: 13 },
  hint: { color: t.muted, fontSize: 13, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: t.ink },
  pressed: { opacity: 0.6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 16 },
  optionOn: { borderColor: t.accent },
  optionTitle: { color: t.ink, fontSize: 17, fontWeight: '800' },
  optionText: { color: t.muted, fontSize: 13, lineHeight: 19 },
  chev: { color: t.muted, fontSize: 24, fontWeight: '300' },
  warn: { backgroundColor: t.nearBg, borderRadius: 10, padding: 12, gap: 8 },
  warnTitle: { color: t.near, fontWeight: '700', fontSize: 14 },
  warnText: { color: t.ink, fontSize: 13, lineHeight: 19 },
  secondary: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  secondaryText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  status: { padding: 10, borderRadius: 10, fontSize: 13, overflow: 'hidden' },
  statusErr: { backgroundColor: t.nearBg, color: t.near },
  scBtn: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  scText: { color: t.ink, fontWeight: '700', fontSize: 15 },
  tryBtn: { borderWidth: 2, borderColor: t.accent, backgroundColor: t.accent + '1A', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  tryText: { color: t.accent, fontWeight: '800', fontSize: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: t.accent, borderColor: t.accent },
  chipText: { color: t.ink, fontSize: 13 },
  chipTextOn: { color: t.accentInk, fontWeight: '700' },
  link: { color: t.accent, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 6 },
  doneMark: { fontSize: 56, color: t.accent, textAlign: 'center', fontWeight: '800' },
  foot: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.bg, gap: 6 },
  footHint: { color: t.muted, fontSize: 12, textAlign: 'center' },
  next: { backgroundColor: t.accent, borderRadius: 14, height: 56, alignItems: 'center', justifyContent: 'center' },
  nextOff: { opacity: 0.4 },
  nextText: { color: t.accentInk, fontSize: 17, fontWeight: '800' },
});
