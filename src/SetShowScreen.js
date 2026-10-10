import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarcodeView from './BarcodeView';
import { launchUrl } from './appLink';
import { useRegisterMode } from './registerMode';
import { photoUri } from './storage';
import { KIND_LABEL } from './theme';

// A shop's set: the cards and apps used there, in order. The current step is expanded;
// after jumping to an app and coming back, the next step lights up.
export default function SetShowScreen({ set, members, hasPosition, onClose, onEdit, onUse, onRememberHere, onForget }) {
  useRegisterMode();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const leftForApp = useRef(false);
  const stepRef = useRef(0);
  stepRef.current = step;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && leftForApp.current) {
        leftForApp.current = false;
        setStep((i) => Math.min(i + 1, members.length));
      }
    });
    return () => sub.remove();
  }, [members.length]);

  const openApp = async (card) => {
    setError(null);
    const url = launchUrl(card);
    if (!url) return setError(`「${card.name}」の開き方が未登録です。カードの編集から登録してください。`);
    onUse(card);
    leftForApp.current = true;
    try {
      await Linking.openURL(url);
    } catch {
      leftForApp.current = false;
      setError(`「${card.name}」を開けませんでした。アプリが入っているか、開き方の設定を確かめてください。`);
    }
  };

  const next = (card) => {
    onUse(card);
    setStep((i) => Math.min(i + 1, members.length));
  };

  const done = step >= members.length;
  const places = (set.places || []).length;
  const codeWidth = Math.min(width - 72, 420);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={onClose} hitSlop={10} style={s.headBtn} accessibilityRole="button"><Text style={s.headText}>← 戻る</Text></Pressable>
        <Pressable onPress={onEdit} hitSlop={10} style={[s.headBtn, s.outline]} accessibilityRole="button"><Text style={s.headText}>編集</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.name}>{set.name}</Text>
        <Text style={s.sub}>{done ? '全部使いました' : `${members.length}つのうち ${step + 1}つ目`}</Text>

        {members.map((c, i) => {
          const active = i === step;
          const used = i < step;
          return (
            <View key={c.id} style={[s.step, active && s.stepActive, used && s.stepUsed]}>
              <Pressable onPress={() => setStep(i)} style={s.stepHead} accessibilityRole="button" accessibilityLabel={`${i + 1}つ目 ${c.name}`} accessibilityState={{ selected: active }}>
                <View style={[s.num, { backgroundColor: used ? '#BBB' : c.color }]}><Text style={s.numText}>{used ? '✓' : i + 1}</Text></View>
                <Text style={[s.stepName, used && { color: '#888' }]} numberOfLines={1}>{c.name}</Text>
                <Text style={s.kind}>{KIND_LABEL[c.kind]}</Text>
              </Pressable>

              {active && c.kind === 'app' && (
                <Pressable onPress={() => openApp(c)} style={s.bigBtn} accessibilityRole="button">
                  <Text style={s.bigBtnText}>{c.name}を開く</Text>
                </Pressable>
              )}
              {active && c.kind === 'barcode' && (
                <View style={s.code}>
                  <BarcodeView code={c.code} format={c.format} width={codeWidth} height={110} />
                  <Text style={s.codeNum} selectable>{c.code}</Text>
                </View>
              )}
              {active && c.kind === 'photo' && c.photo ? (
                <Image source={{ uri: photoUri(c.photo) }} style={{ width: codeWidth, height: codeWidth * 0.7, alignSelf: 'center' }} resizeMode="contain" accessibilityLabel={`${c.name}のカードの写真`} />
              ) : null}
              {active && c.kind !== 'app' && (
                <Pressable onPress={() => next(c)} style={s.nextBtn} accessibilityRole="button">
                  <Text style={s.nextText}>{i === members.length - 1 ? '使い終わった' : '次へ'}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {members.length === 0 && <Text style={s.muted}>このセットのカードがありません。「編集」から追加してください。</Text>}
        {error && <Text style={s.err}>{error}</Text>}
        {done && members.length > 0 && (
          <Pressable onPress={onClose} style={s.bigBtn} accessibilityRole="button"><Text style={s.bigBtnText}>閉じる</Text></Pressable>
        )}

        <View style={s.meta}>
          <Text style={s.muted}>{places ? `覚えた場所 ${places}か所` : 'まだ場所を覚えていません'}</Text>
          <View style={s.row}>
            {hasPosition && (
              <Pressable onPress={onRememberHere} style={s.small} accessibilityRole="button"><Text style={s.smallText}>ここをこの店として覚える</Text></Pressable>
            )}
            {places > 0 && (
              <Pressable onPress={onForget} style={s.small} accessibilityRole="button"><Text style={s.smallText}>覚えた場所を消す</Text></Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  outline: { borderWidth: 1, borderColor: '#D9D9D9' },
  headText: { fontSize: 15, fontWeight: '700', color: '#111' },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  name: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#111' },
  sub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 6, fontVariant: ['tabular-nums'] },
  step: { borderWidth: 1, borderColor: '#E3E3E3', borderRadius: 14, padding: 12, gap: 12 },
  stepActive: { borderColor: '#0A7552', borderWidth: 2, backgroundColor: '#F3FAF6' },
  stepUsed: { backgroundColor: '#FAFAFA' },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#FFF', fontWeight: '800' },
  stepName: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111' },
  kind: { fontSize: 11, color: '#666' },
  bigBtn: { backgroundColor: '#0A7552', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  bigBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  code: { alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingVertical: 8, borderRadius: 8 },
  codeNum: { fontSize: 18, letterSpacing: 2, color: '#111', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  nextBtn: { alignSelf: 'center', borderWidth: 1, borderColor: '#0A7552', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 28 },
  nextText: { color: '#0A7552', fontWeight: '800', fontSize: 15 },
  err: { color: '#C2412D', fontSize: 13 },
  muted: { color: '#666', fontSize: 13 },
  meta: { borderTopWidth: 1, borderTopColor: '#E6E6E6', paddingTop: 14, marginTop: 8, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  smallText: { fontSize: 13, fontWeight: '700', color: '#111' },
});
