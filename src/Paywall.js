import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { FREE_LIMIT, buy, fetchPrice, isCancel, restore } from './purchase';

// Shown when adding a card past the free limit.
// reason: 'cards' when adding past the free card limit, 'suggest' when asking for more nearby recommendations.
export default function Paywall({ reason = 'cards', onClose, onUnlocked }) {
  const t = useTheme();
  const s = styles(t);
  const [price, setPrice] = useState(null);
  const [priceFailed, setPriceFailed] = useState(false);
  const [busy, setBusy] = useState(null); // 'buy' | 'restore'
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetchPrice().then((p) => (p ? setPrice(p) : setPriceFailed(true))).catch(() => setPriceFailed(true));
  }, []);

  const run = async (kind) => {
    setBusy(kind);
    setMsg(null);
    try {
      const ok = kind === 'buy' ? await buy() : await restore();
      if (ok) return onUnlocked();
      setMsg(kind === 'buy' ? '購入の承認待ちです。承認されると使えるようになります。' : 'このApple IDでの購入が見つかりませんでした。');
    } catch (e) {
      if (!isCancel(e)) setMsg(kind === 'buy' ? '購入できませんでした。通信状態を確かめて、もう一度試してください。' : '復元できませんでした。もう一度試してください。');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.body}>
        <Text style={s.title}>{reason === 'suggest' ? '近くのおすすめを' : `${FREE_LIMIT + 1}枚目からは`}{'\n'}Poica 無制限で</Text>
        <Text style={s.text}>{price || '一度'}払うと、ずっと使えます。サブスクではありません。</Text>
        <View style={s.perks}>
          <Text style={s.perk}>✓ カードを何枚でも登録できます</Text>
          <Text style={s.perk}>✓ 近くのおすすめを3件まで表示</Text>
        </View>
        <Text style={s.note}>{reason === 'suggest' ? '購入しなくても、近くのおすすめは1件表示されます。' : `いまある${FREE_LIMIT}枚は、購入しなくてもこれまでどおり使えます。`}</Text>
        {msg && <Text style={s.msg}>{msg}</Text>}
      </View>
      <View style={s.foot}>
        <Pressable onPress={() => run('buy')} disabled={!!busy || !price} style={[s.buy, (!price || busy) && { opacity: 0.6 }]} accessibilityRole="button">
          {busy === 'buy' ? <ActivityIndicator color="#FFF" /> : <Text style={s.buyText}>{price ? `${price}で購入` : priceFailed ? '価格を読み込めませんでした' : '価格を読み込んでいます…'}</Text>}
        </Pressable>
        <Pressable onPress={() => run('restore')} disabled={!!busy} style={s.sub} accessibilityRole="button">
          {busy === 'restore' ? <ActivityIndicator color={t.ink} /> : <Text style={s.subText}>購入を復元</Text>}
        </Pressable>
        <Pressable onPress={onClose} disabled={!!busy} style={s.sub} accessibilityRole="button">
          <Text style={[s.subText, { color: t.muted }]}>閉じる</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '900', color: t.ink, textAlign: 'center', lineHeight: 38 },
  text: { fontSize: 16, color: t.ink, textAlign: 'center', lineHeight: 24 },
  perks: { alignSelf: 'center', gap: 6, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  perk: { fontSize: 15, fontWeight: '700', color: t.ink },
  note: { fontSize: 13, color: t.muted, textAlign: 'center' },
  msg: { fontSize: 14, color: '#C2412D', textAlign: 'center' },
  foot: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  buy: { backgroundColor: t.accent, borderRadius: 999, height: 58, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  sub: { height: 50, alignItems: 'center', justifyContent: 'center' },
  subText: { color: t.ink, fontSize: 15, fontWeight: '700' },
});
