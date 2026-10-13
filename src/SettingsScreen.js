import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PaywallModal } from './Paywall';
import Toggle from './Toggle';
import { useTheme } from './theme';
import appJson from '../app.json';

const VERSION = appJson.expo.version;

export default function SettingsScreen({ unlimited, iapAvailable, limits, cardCount, placeCount, storeLookup, onToggleStoreLookup, onForgetPlaces, shareUsage, onToggleShareUsage, onUnlocked, privacyUrl, supportUrl }) {
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
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>設定</Text>
        <Text style={s.sec}>Poica</Text>
        <View style={s.box}>
          {unlimited ? (
            <Text style={s.rowTitle}>✓ Poica 無制限</Text>
          ) : !iapAvailable ? (
            <Text style={s.rowTitle}>✓ すべての機能が使えます</Text>
          ) : (
            <>
              <Text style={s.rowTitle}>現在無料版</Text>
              <Text style={s.rowText}>カード{limits.freeCardLimit}枚まで(いま{cardCount}枚)・近くのおすすめ{limits.freeNearbyLimit}件・デザインは固定です。</Text>
              <Pressable onPress={() => setPaywall('info')} style={({ pressed }) => [s.primary, pressed && s.pressed]} accessibilityRole="button">
                <Text style={s.primaryText}>Poica無制限ver.を購入する</Text>
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
            <Toggle value={storeLookup} t={t} />
          </Pressable>
          <View style={s.line} />
          <Pressable onPress={forget} disabled={!placeCount} style={({ pressed }) => [s.linkRow, pressed && s.pressed, !placeCount && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={[s.rowTitle, { color: t.near }]}>覚えた場所をすべて消す</Text>
            <Text style={s.rowText}>Poicaは、カードを使った場所を覚えておき、次にその近くに来たときに「近くのおすすめ」にそのカードを出しています。消すと、また使いながら覚え直します。{placeCount ? `いま${placeCount}か所を覚えています。` : 'まだ覚えた場所はありません。'}</Text>
          </Pressable>
        </View>

        <Text style={s.sec}>データの送信</Text>
        <View style={s.box}>
          <Pressable onPress={onToggleShareUsage} style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: shareUsage }}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>利用データを送る</Text>
              <Text style={s.rowText}>オンにすると、アプリの改善のために、どの種類のカードを何回開いたか・開けなかったかの集計を週に1回まで送ります。カードの名前・番号・写真・場所や、あなたを特定できる情報は送りません。オフの間は何も送りません。</Text>
            </View>
            <Toggle value={shareUsage} t={t} />
          </Pressable>
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
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  title: { color: t.ink, fontSize: 26, fontWeight: '900' },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 8 },
  sec: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: t.muted, marginTop: 14 },
  box: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 14, gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: t.ink },
  rowText: { fontSize: 12, color: t.muted, lineHeight: 18 },
  line: { height: 1, backgroundColor: t.line, marginVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkRow: { gap: 2, paddingVertical: 2 },
  primary: { backgroundColor: t.accent, borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryText: { color: t.accentInk, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.6 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 6 },
  link: { color: t.accent, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
});
