import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { buy, fetchPrice, isCancel, restore } from './purchase';
import { DEFAULT_LIMITS } from './limits';

// Shown when adding a card past the free limit.
// reason: 'cards' when adding past the free card limit, 'suggest' when asking for more nearby recommendations,
// 'design' when changing a card's design, 'info' when opened from the settings.
export default function Paywall({ reason = 'cards', limits = DEFAULT_LIMITS, onClose, onUnlocked }) {
  const FREE_LIMIT = limits.freeCardLimit;
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
        <Text style={s.title}>{TITLE[reason] ?? `${FREE_LIMIT + 1}枚目からは\n`}Poica 無制限{reason === 'info' ? '' : 'で'}</Text>
        <Text style={s.text}>{price || '一度'}払うと、ずっと使えます。サブスクではありません。</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]}>
            <Text style={[s.th, s.colLabel]} />
            <Text style={[s.th, s.colFree]}>無料版</Text>
            <Text style={[s.th, s.colPaid, { color: t.accent }]}>Poica 無制限</Text>
          </View>
          {[
            ['カード', `${FREE_LIMIT}枚まで`, '何枚でも'],
            ['近くのおすすめ', `${limits.freeNearbyLimit}件`, `${limits.paidNearbyLimit}件`],
            ['デザイン', '固定', '自由に\n(ロゴ画像も)'],
          ].map(([label, free, paid]) => (
            <View key={label} style={s.tr}>
              <Text style={[s.td, s.colLabel]}>{label}</Text>
              <Text style={[s.td, s.colFree, { color: t.muted }]}>{free}</Text>
              <Text style={[s.td, s.colPaid, s.tdPaid]}>{paid}</Text>
            </View>
          ))}
        </View>
        <Text style={s.note}>{{
          suggest: `購入しなくても、近くのおすすめは${limits.freeNearbyLimit}件表示されます。`,
          design: 'いまのデザインは、購入しなくてもそのまま使えます。',
          info: '購入前のカードや設定は、そのまま引き継がれます。',
        }[reason] ?? `いまある${FREE_LIMIT}枚は、購入しなくてもこれまでどおり使えます。`}</Text>
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

const TITLE = { suggest: '近くのおすすめを\n', design: 'カードのデザインを\n', info: '' };

// For screens that are themselves in a modal: a sibling modal can't be shown on top of them on iOS.
export function PaywallModal({ reason, ...props }) {
  return (
    <Modal visible={!!reason} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        {reason ? <Paywall reason={reason} {...props} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '900', color: t.ink, textAlign: 'center', lineHeight: 38 },
  text: { fontSize: 16, color: t.ink, textAlign: 'center', lineHeight: 24 },
  table: { backgroundColor: t.surface, borderRadius: 14, borderWidth: 1, borderColor: t.line, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: t.line },
  trHead: { borderTopWidth: 0, paddingVertical: 10 },
  th: { fontSize: 13, fontWeight: '800', color: t.muted, textAlign: 'center' },
  td: { fontSize: 15, fontWeight: '700', color: t.ink, textAlign: 'center' },
  tdPaid: { color: t.accent, fontWeight: '900' },
  colLabel: { flex: 1.1, textAlign: 'left' },
  colFree: { flex: 1 },
  colPaid: { flex: 1.2 },
  note: { fontSize: 13, color: t.muted, textAlign: 'center' },
  msg: { fontSize: 14, color: '#C2412D', textAlign: 'center' },
  foot: { paddingHorizontal: 20, paddingBottom: 12, gap: 6 },
  buy: { backgroundColor: t.accent, borderRadius: 999, height: 58, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  sub: { height: 50, alignItems: 'center', justifyContent: 'center' },
  subText: { color: t.ink, fontSize: 15, fontWeight: '700' },
});
