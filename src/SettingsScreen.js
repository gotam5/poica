import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaywallModal } from './Paywall';
import { useTheme } from './theme';
import appJson from '../app.json';

const VERSION = appJson.expo.version;

export default function SettingsScreen({ unlimited, iapAvailable, limits, cardCount, placeCount, storeLookup, onToggleStoreLookup, onForgetPlaces, onUnlocked, onClose, privacyUrl, supportUrl }) {
  const t = useTheme();
  const s = styles(t);
  const [paywall, setPaywall] = useState(null);

  const forget = () => {
    Alert.alert('覚えた場所をすべて消しますか？', 'どのカードも、近くのおすすめに出るまでまた使って覚え直します。', [
      { text: 'やめる', style: 'cancel' },
      { text: 'すべて消す', style: 'destructive', onPress: onForgetPlaces },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Text style={s.title}>設定</Text>
        <Pressable onPress={onClose} hitSlop={10} style={s.done} accessibilityRole="button"><Text style={s.doneText}>閉じる</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.sec}>Poica 無制限</Text>
        <View style={s.box}>
          {unlimited || !iapAvailable ? (
            <Text style={s.rowTitle}>✓ {unlimited ? '購入済みです。すべての機能が使えます' : 'すべての機能が使えます'}</Text>
          ) : (
            <>
              <Text style={s.rowTitle}>無料版を使っています</Text>
              <Text style={s.rowText}>カード{limits.freeCardLimit}枚まで(いま{cardCount}枚)・近くのおすすめ{limits.freeNearbyLimit}件・デザインは固定です。</Text>
              <Pressable onPress={() => setPaywall('info')} style={({ pressed }) => [s.primary, pressed && s.pressed]} accessibilityRole="button">
                <Text style={s.primaryText}>Poica 無制限を見る</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text style={s.sec}>近くのおすすめ</Text>
        <View style={s.box}>
          <Pressable onPress={onToggleStoreLookup} style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: storeLookup }}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>近くのお店を地図データで調べる</Text>
              <Text style={s.rowText}>オンにすると、おおまかな現在地(約100m単位)をOpenStreetMapに送り、登録したお店が近くにあるか調べます。</Text>
            </View>
            <View style={[s.switch, storeLookup && s.switchOn]}><View style={[s.knob, storeLookup && s.knobOn]} /></View>
          </Pressable>
          <View style={s.line} />
          <Pressable onPress={forget} disabled={!placeCount} style={({ pressed }) => [s.linkRow, pressed && s.pressed, !placeCount && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={[s.rowTitle, { color: t.near }]}>覚えた場所をすべて消す</Text>
            <Text style={s.rowText}>{placeCount ? `いま${placeCount}か所を覚えています。` : 'まだ覚えた場所はありません。'}</Text>
          </Pressable>
        </View>

        <Text style={s.sec}>使い方</Text>
        <View style={s.box}>
          <Text style={s.tip}>・お店でカードを使うと、その場所を覚えて次から「近くのおすすめ」に出ます。</Text>
          <Text style={s.tip}>・カードを長押しすると、名前やデザインの変更、削除ができます。</Text>
          <Text style={s.tip}>・下の「探す」でカード名から探せます。「現在地」で位置を取り直します。</Text>
          <Text style={s.tip}>・公式アプリが開かないときは、カードの編集で「ショートカット」に切り替えると確実に開けます。</Text>
        </View>

        <Text style={s.sec}>このアプリについて</Text>
        <View style={s.box}>
          <Text style={s.rowText}>カードのデータはこのスマホの中だけに保存されます。通知は送りません。</Text>
          <View style={s.links}>
            <Pressable onPress={() => Linking.openURL(privacyUrl).catch(() => {})} hitSlop={8} accessibilityRole="link"><Text style={s.link}>プライバシーポリシー</Text></Pressable>
            <Pressable onPress={() => Linking.openURL(supportUrl).catch(() => {})} hitSlop={8} accessibilityRole="link"><Text style={s.link}>お問い合わせ</Text></Pressable>
          </View>
          <Text style={s.foot}>お店の地図データ © OpenStreetMap contributors</Text>
          <Text style={s.foot}>Poica {VERSION}</Text>
        </View>
      </ScrollView>
      <PaywallModal reason={paywall} limits={limits} onClose={() => setPaywall(null)} onUnlocked={() => { setPaywall(null); onUnlocked(); }} />
    </SafeAreaView>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 26, paddingBottom: 12 },
  title: { color: t.ink, fontSize: 22, fontWeight: '900' },
  done: { backgroundColor: t.accent, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999 },
  doneText: { color: t.accentInk, fontWeight: '700', fontSize: 15 },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  sec: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: t.muted, marginTop: 14 },
  box: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 14, gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: t.ink },
  rowText: { fontSize: 12, color: t.muted, lineHeight: 18 },
  tip: { fontSize: 13, color: t.ink, lineHeight: 20 },
  line: { height: 1, backgroundColor: t.line, marginVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkRow: { gap: 2, paddingVertical: 2 },
  switch: { width: 46, height: 28, borderRadius: 14, backgroundColor: t.line, padding: 3 },
  switchOn: { backgroundColor: t.accent },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' },
  knobOn: { transform: [{ translateX: 18 }] },
  primary: { backgroundColor: t.accent, borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryText: { color: t.accentInk, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.6 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 6 },
  link: { color: t.accent, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
});
