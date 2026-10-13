// 設定 tab. The top page is a plain list; each item opens its own page, where the explanation lives.
import { useRef, useState } from 'react';
import { Alert, Animated, Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PaywallModal } from './Paywall';
import Toggle from './Toggle';
import CardFace from './CardFace';
import ReorderGrid from './ReorderGrid';
import { cardPalette } from './appLink';
import { useTheme } from './theme';
import appJson from '../app.json';

const VERSION = appJson.expo.version;
const POSITIONS = [['top', '一番上'], ['afterRecent', '「前回使った」の下'], ['off', '表示しない']];

function SettingsPages({ page, go, ...props }) {
  const {
    unlimited, iapAvailable, limits, cards, ordered, manualOrder, onEditCard, onSaveOrder, onAutoOrder,
    suggestPos, suggestCount, onSuggestPos, onSuggestCount,
    placeCount, storeLookup, onToggleStoreLookup, onForgetPlaces, shareUsage, onToggleShareUsage,
    onUnlocked, privacyUrl, supportUrl,
  } = props;
  const t = useTheme();
  const s = styles(t);
  const [paywall, setPaywall] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const free = iapAvailable && !unlimited;
  const maxCount = free ? limits.freeNearbyLimit : limits.paidNearbyLimit;
  const count = Math.min(suggestCount || maxCount, maxCount);

  const forget = () => {
    Alert.alert('覚えた場所をすべて消しますか？', undefined, [
      { text: 'やめる', style: 'cancel' },
      { text: 'すべて消す', style: 'destructive', onPress: onForgetPlaces },
    ]);
  };

  const paywallModal = <PaywallModal reason={paywall} limits={limits} onClose={() => setPaywall(null)} onUnlocked={() => { setPaywall(null); onUnlocked(); }} />;

  if (page === 'edit') {
    return (
      <Sub s={s} go={go} title="カードの編集">
        <Text style={s.lead}>編集するカードを選んでください。</Text>
        <View style={s.grid}>
          {ordered.map((c) => (
            <View key={c.id} style={s.cell}>
              <Pressable onPress={() => onEditCard(c)} style={({ pressed }) => [pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={`${c.name}を編集`}>
                <CardFace card={c} palette={cardPalette(c, cards)} />
              </Pressable>
            </View>
          ))}
        </View>
        {!ordered.length && <Text style={s.lead}>まだカードがありません。</Text>}
      </Sub>
    );
  }

  if (page === 'order') {
    return (
      <Sub s={s} go={go} title="並び替え" scroll={!dragging}>
        <View style={s.box}>
          {[[false, '自動', 'よく使うカードが上に来ます'], [true, '固定', '自分で決めた順のままです']].map(([fixed, label, sub], i) => (
            <Pressable
              key={label}
              onPress={() => {
                if (fixed === manualOrder) return;
                if (fixed) onSaveOrder(ordered.map((c) => c.id)); else onAutoOrder();
                setGridKey((k) => k + 1);
              }}
              style={[s.row, i === 0 && s.rowLine]}
              accessibilityRole="radio"
              accessibilityState={{ checked: manualOrder === fixed }}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{label}</Text>
                <Text style={s.rowSub}>{sub}</Text>
              </View>
              {manualOrder === fixed ? <Text style={s.check}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
        <Text style={[s.lead, { marginTop: 10 }]}>{manualOrder ? '≡ を押したまま動かして並べ替えます。' : '≡ を押したまま動かすと、その順で固定になります。'}</Text>
        <ReorderGrid key={gridKey} cards={ordered} allCards={cards} t={t} onChange={onSaveOrder} onDragging={setDragging} />
      </Sub>
    );
  }

  if (page === 'suggest') {
    return (
      <Sub s={s} go={go} title="おすすめの表示">
        <Text style={s.sec}>表示する場所</Text>
        <View style={s.box}>
          {POSITIONS.map(([k, l], i) => (
            <Pressable key={k} onPress={() => onSuggestPos(k)} style={[s.row, i < POSITIONS.length - 1 && s.rowLine]} accessibilityRole="radio" accessibilityState={{ checked: suggestPos === k }}>
              <Text style={s.rowLabel}>{l}</Text>
              {suggestPos === k ? <Text style={s.check}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={s.sec}>表示する数</Text>
        <View style={s.box}>
          {Array.from({ length: limits.paidNearbyLimit }, (_, i) => i + 1).map((n, i, arr) => {
            const lockedN = free && n > limits.freeNearbyLimit;
            return (
              <Pressable key={n} onPress={() => (lockedN ? setPaywall('suggest') : onSuggestCount(n))} style={[s.row, i < arr.length - 1 && s.rowLine]} accessibilityRole="radio" accessibilityState={{ checked: !lockedN && count === n }}>
                <Text style={[s.rowLabel, lockedN && { color: t.muted }]}>{n}件</Text>
                {lockedN ? <Text style={s.proTag}>PRO</Text> : count === n ? <Text style={s.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {free && <Text style={s.lead}>PROなら{limits.paidNearbyLimit}件まで表示できます。</Text>}
        {paywallModal}
      </Sub>
    );
  }

  if (page === 'lookup') {
    return (
      <Sub s={s} go={go} title="近くのお店を調べる">
        <View style={s.box}>
          <Pressable onPress={onToggleStoreLookup} style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: storeLookup }}>
            <Text style={[s.rowLabel, { flex: 1 }]}>地図データで近くのお店を調べる</Text>
            <Toggle value={storeLookup} t={t} />
          </Pressable>
        </View>
        <Text style={s.lead}>近くのお店を地図データ(OpenStreetMap)で調べ、そのお店のアプリのカードをおすすめに出します。調べるときは、おおまかな現在地を送ります。</Text>
      </Sub>
    );
  }

  if (page === 'places') {
    return (
      <Sub s={s} go={go} title="覚えた場所">
        <View style={s.box}>
          <Text style={s.big}>{placeCount}<Text style={s.bigUnit}> か所</Text></Text>
        </View>
        <Text style={s.lead}>カードを使った場所です。その近くに来ると、そのカードをおすすめに出します。</Text>
        <Pressable onPress={forget} disabled={!placeCount} style={({ pressed }) => [s.danger, pressed && s.pressed, !placeCount && { opacity: 0.4 }]} accessibilityRole="button">
          <Text style={s.dangerText}>覚えた場所をすべて消す</Text>
        </Pressable>
      </Sub>
    );
  }

  if (page === 'share') {
    return (
      <Sub s={s} go={go} title="利用データの送信">
        <View style={s.box}>
          <Pressable onPress={onToggleShareUsage} style={s.switchRow} accessibilityRole="switch" accessibilityState={{ checked: shareUsage }}>
            <Text style={[s.rowLabel, { flex: 1 }]}>利用データを送る</Text>
            <Toggle value={shareUsage} t={t} />
          </Pressable>
        </View>
        <Text style={s.lead}>アプリ改善のため、カードの種類ごとの利用回数の集計を週1回まで送ります。</Text>
      </Sub>
    );
  }

  if (page === 'about') {
    return (
      <Sub s={s} go={go} title="アプリ情報">
        <View style={s.box}>
          <View style={[s.row, s.rowLine]}><Text style={s.rowLabel}>バージョン</Text><Text style={s.rowValue}>{VERSION}</Text></View>
          <Row s={s} go={go} label="プライバシーポリシー" onPress={() => Linking.openURL(privacyUrl).catch(() => {})} />
          <Row s={s} go={go} label="お問い合わせ" onPress={() => Linking.openURL(supportUrl).catch(() => {})} last />
        </View>
        <Text style={s.sec}>データについて</Text>
        <Text style={s.lead}>カードのデータは、このiPhoneに保存されます。</Text>
        <Text style={s.sec}>地図データ</Text>
        <Text style={s.lead}>お店の地図データ © OpenStreetMap contributors(ODbL ライセンス)</Text>
        <Text style={s.sec}>商標について</Text>
        <Text style={s.lead}>Apple、iPhone、App Store は、米国およびその他の国で登録された Apple Inc. の商標です。</Text>
        <Text style={s.lead}>お店・サービス・アプリの名前は各社の商標または登録商標です。Poica は各社と提携・公認の関係にありません。</Text>
        <Text style={s.foot}>© 2026 Poica</Text>
      </Sub>
    );
  }

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.body}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <Text style={s.title}>設定</Text>

        <Text style={s.sec}>Poica</Text>
        <View style={s.box}>
          {free ? (
            <>
              <View style={[s.row, s.rowLine]}><Text style={s.rowLabel}>無料版</Text></View>
              <Pressable onPress={() => setPaywall('info')} style={({ pressed }) => [s.pro, pressed && s.pressed]} accessibilityRole="button">
                <Text style={s.proText}>PROを購入</Text>
                <Text style={s.proSub}>カード枚数無制限・おすすめ表示数増加・カードデザイン編集</Text>
              </Pressable>
            </>
          ) : (
            <View style={s.row}><Text style={s.rowLabel}>{unlimited ? 'PRO' : 'すべての機能が使えます'}</Text>{unlimited ? <Text style={s.check}>✓</Text> : null}</View>
          )}
        </View>

        <Text style={s.sec}>カード</Text>
        <View style={s.box}>
          <Row s={s} go={go} label="カードの編集" to="edit" />
          <Row s={s} go={go} label="並び替え" value={manualOrder ? '固定' : '自動'} to="order" last />
        </View>

        <Text style={s.sec}>近くのおすすめ</Text>
        <View style={s.box}>
          <Row s={s} go={go} label="おすすめの表示" value={suggestPos === 'off' ? '表示しない' : `${count}件`} to="suggest" />
          <Row s={s} go={go} label="近くのお店を調べる" value={storeLookup ? 'オン' : 'オフ'} to="lookup" />
          <Row s={s} go={go} label="覚えた場所" value={`${placeCount}か所`} to="places" last />
        </View>

        <Text style={s.sec}>データ</Text>
        <View style={s.box}>
          <Row s={s} go={go} label="利用データの送信" value={shareUsage ? 'オン' : 'オフ'} to="share" last />
        </View>

        <View style={[s.box, { marginTop: 22 }]}>
          <Row s={s} go={go} label="アプリ情報" to="about" last />
        </View>
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[s.bar, { opacity: scrollY.interpolate({ inputRange: [22, 38], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
        <Text style={s.subTitle}>設定</Text>
      </Animated.View>
      {paywallModal}
    </View>
  );
}

// iOS-style push: the page slides in over the list, which drifts left by a third and dims.
// Swipe from the left edge to go back. Spring values match UINavigationController's feel.
const SPRING = { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01, useNativeDriver: true };

export default function SettingsScreen(props) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(null); // the sub page on screen, kept while it slides away
  const p = useRef(new Animated.Value(0)).current; // 0 = list, 1 = sub page
  const st = useRef({});
  st.current.width = width;

  const back = (velocity = 0) => {
    Animated.spring(p, { ...SPRING, toValue: 0, velocity }).start(({ finished }) => { if (finished) setPage(null); });
  };
  const go = (to) => {
    if (to === 'main') return back();
    p.setValue(0);
    setPage(to);
    Animated.spring(p, { ...SPRING, toValue: 1 }).start();
  };
  st.current.back = back;

  const edge = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => p.setValue(1 - Math.max(0, Math.min(1, g.dx / st.current.width))),
    onPanResponderRelease: (_, g) => {
      const w = st.current.width;
      if (g.dx > w / 2 || g.vx > 0.4) st.current.back(Math.max(0, g.vx) * 1000 / w * -1);
      else Animated.spring(p, { ...SPRING, toValue: 1 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(p, { ...SPRING, toValue: 1 }).start(),
  })).current;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, overflow: 'hidden' }}>
      <Animated.View
        style={{ flex: 1, transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.3] }) }] }}
        pointerEvents={page ? 'none' : 'auto'}
      >
        <SettingsPages {...props} page="main" go={go} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />
      </Animated.View>
      {page ? (
        <Animated.View
          style={[StyleSheet.absoluteFill, {
            backgroundColor: t.bg, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: -3, height: 0 },
            transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) }],
          }]}
        >
          <SettingsPages {...props} page={page} go={go} />
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20 }} {...edge.panHandlers} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Row({ s, go, label, value, to, onPress, last }) {
  return (
    <Pressable onPress={onPress || (() => go(to))} style={({ pressed }) => [s.row, !last && s.rowLine, pressed && s.pressed]} accessibilityRole="button">
      <Text style={s.rowLabel}>{label}</Text>
      {value != null ? <Text style={s.rowValue}>{value}</Text> : null}
      <Text style={s.chev}>›</Text>
    </Pressable>
  );
}

function Sub({ s, go, title, children, scroll = true }) {
  return (
    <View style={s.root}>
      <View style={s.subHead}>
        <Pressable onPress={() => go('main')} hitSlop={10} accessibilityRole="button"><Text style={s.back}>‹ 設定</Text></Pressable>
        <Text style={s.subTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={s.body} scrollEnabled={scroll}>{children}</ScrollView>
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  title: { color: t.ink, fontSize: 26, fontWeight: '900' },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 8 },
  sec: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: t.muted, marginTop: 14 },
  box: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingVertical: 10 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: t.line },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: t.ink },
  rowSub: { fontSize: 12, color: t.muted, marginTop: 2 },
  rowValue: { fontSize: 15, color: t.muted },
  chev: { fontSize: 22, color: t.muted, marginLeft: 2, marginTop: -2 },
  check: { fontSize: 17, fontWeight: '900', color: t.accent },
  proTag: { fontSize: 12, fontWeight: '900', color: t.accentInk, backgroundColor: t.accent, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  pressed: { opacity: 0.6 },
  pro: { backgroundColor: t.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', gap: 3, marginVertical: 12 },
  proText: { color: t.accentInk, fontWeight: '900', fontSize: 17 },
  proSub: { color: t.accentInk, fontSize: 11, opacity: 0.72, textAlign: 'center' },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, justifyContent: 'center', backgroundColor: t.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
  subHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  back: { color: t.accent, fontSize: 16, fontWeight: '700', width: 56 },
  subTitle: { flex: 1, textAlign: 'center', color: t.ink, fontSize: 17, fontWeight: '800' },
  lead: { fontSize: 13, color: t.muted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  secondary: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  secondaryText: { color: t.accent, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  big: { fontSize: 34, fontWeight: '900', color: t.ink, paddingVertical: 12, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 15, color: t.muted, fontWeight: '700' },
  danger: { borderWidth: 1, borderColor: t.near, borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  dangerText: { color: t.near, fontWeight: '800', fontSize: 15 },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center', marginTop: 16 },
});
