import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import EditScreen from './src/EditScreen';
import SetShowScreen from './src/SetShowScreen';
import ShowScreen from './src/ShowScreen';
import { arrange, formatDistance, learnPlace } from './src/geo';
import { deleteCard, keepPhoto, loadCards, removePhoto, saveCard } from './src/storage';
import { CARD_COLORS, KIND_LABEL, useTheme } from './src/theme';

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const t = useTheme();
  const s = useMemo(() => styles(t), [t]);
  const [cards, setCards] = useState(null);
  const [pos, setPos] = useState(null);
  const [loc, setLoc] = useState({ state: 'wait' }); // wait | ok | denied | fail
  const [query, setQuery] = useState('');
  const [showing, setShowing] = useState(null); // card id
  const [editing, setEditing] = useState(null); // draft
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const say = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    loadCards().then(setCards).catch(() => setCards([]));
  }, []);

  // "While using the app" location: ask once, then re-read every time the app comes to the front.
  const locate = useCallback(async () => {
    setLoc({ state: 'wait' });
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setLoc({ state: 'denied' });
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 });
      if (last) setPos({ lat: last.coords.latitude, lng: last.coords.longitude, acc: last.coords.accuracy ?? 999, t: last.timestamp });
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? 999, t: Date.now() });
      setLoc({ state: 'ok' });
    } catch {
      setLoc({ state: 'fail' });
    }
  }, []);

  useEffect(() => {
    locate();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') locate(); });
    return () => sub.remove();
  }, [locate]);

  const updateCard = useCallback(async (card) => {
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
    try { await saveCard(card); } catch { say('保存できませんでした'); }
  }, [say]);

  const open = useCallback((card) => {
    const { places, added } = learnPlace(card, pos);
    const next = { ...card, places, uses: (card.uses || 0) + 1, lastUsed: Date.now() };
    updateCard(next);
    setShowing(card.id);
    if (added) say('この場所を覚えました。次からここで一番上に出します');
  }, [pos, updateCard, say]);

  const saveDraft = useCallback(async (draft) => {
    const { isNew, ...card } = draft;
    try {
      if (card.photo && typeof card.photo === 'object') {
        const old = cards.find((c) => c.id === card.id)?.photo;
        card.photo = await keepPhoto(card.photo.temp, card.id);
        if (old && typeof old === 'string') removePhoto(old);
      }
      await saveCard(card);
      setCards((prev) => (prev.some((c) => c.id === card.id) ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card]));
      setEditing(null);
      say('保存しました');
    } catch {
      say('保存できませんでした。もう一度試してください');
    }
  }, [cards, say]);

  const removeCard = useCallback(async (card) => {
    try { await deleteCard(card); } catch {}
    // drop it from any shop set that used it
    const touched = cards.filter((c) => c.kind === 'set' && (c.steps || []).includes(card.id)).map((c) => ({ ...c, steps: c.steps.filter((id) => id !== card.id) }));
    for (const c of touched) saveCard(c).catch(() => {});
    setCards((prev) => prev.filter((c) => c.id !== card.id).map((c) => touched.find((x) => x.id === c.id) || c));
    setEditing(null);
    say('削除しました');
  }, [cards, say]);

  const startNew = () => setEditing({
    id: newId(), isNew: true, name: '', kind: 'barcode', code: '', format: 'CODE128', photo: null, appMode: 'catalog', catalogId: null, appUrl: '', shortcutName: '', steps: [],
    color: CARD_COLORS[(cards?.length || 0) % CARD_COLORS.length], places: [], uses: 0, created: Date.now(),
  });

  if (cards === null) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={t.accent} /></View>;
  }

  const { near, rest } = arrange(cards, pos, query);
  const shownCard = showing ? cards.find((c) => c.id === showing) : null;
  const anyPlaces = cards.some((c) => c.places && c.places.length);

  const locLabel = {
    wait: '現在地を確認中',
    ok: pos ? `現在地 ±${Math.round(pos.acc)}m` : '現在地を確認中',
    denied: '位置情報オフ',
    fail: '現在地を取れません',
  }[loc.state];

  let nearEmpty;
  if (loc.state === 'ok') nearEmpty = (anyPlaces ? 'この近くで使ったカードはありません。' : 'まだ場所を覚えたカードがありません。') + 'カードを店で出すと、その場所を覚えて次から一番上に出します。';
  else if (loc.state === 'wait') nearEmpty = '現在地を確認しています。';
  else nearEmpty = '現在地が分からないため、最近使った順に並べています。';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={s.wrap}>
        <View style={s.header}>
          <Text style={s.logo}>Poi<Text style={{ color: t.accent }}>ca</Text></Text>
          <Pressable onPress={locate} style={s.loc} accessibilityRole="button" accessibilityLabel={`${locLabel}。タップで取り直す`}>
            <View style={[s.dot, loc.state === 'ok' && { backgroundColor: t.accent }, (loc.state === 'denied' || loc.state === 'fail') && { backgroundColor: t.near }]} />
            <Text style={s.locText}>{locLabel}</Text>
          </Pressable>
        </View>

        {loc.state === 'denied' && (
          <View style={s.notice}>
            <Text style={s.noticeText}>
              <Text style={{ fontWeight: '700', color: t.ink }}>近い順の並べ替えは止まっています。</Text>
              位置情報を「使用中のみ」で許可すると、開いたときに近くの店のカードが一番上に出ます。
            </Text>
            <Pressable onPress={() => Linking.openSettings()} style={s.smallBtn} accessibilityRole="button">
              <Text style={s.smallBtnText}>設定を開く</Text>
            </Pressable>
          </View>
        )}

        <View>
          <Text style={s.sec}>この近くで使ったカード</Text>
          {near.length ? (
            <View style={{ gap: 10 }}>
              {near.map((x, i) => (
                <Tile key={x.card.id} card={x.card} allCards={cards} big={i === 0} dist={x.dist} onPress={() => open(x.card)} s={s} />
              ))}
            </View>
          ) : (
            <View style={s.empty}><Text style={s.emptyText}>{nearEmpty}</Text></View>
          )}
        </View>

        <View>
          <Text style={s.sec}>すべてのカード {cards.length ? <Text style={s.count}>{cards.length}</Text> : null}</Text>
          {cards.length >= 8 && (
            <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="カード名で探す" placeholderTextColor={t.muted} clearButtonMode="while-editing" />
          )}
          {rest.length ? (
            <View style={s.grid}>
              {rest.map((c) => (
                <View key={c.id} style={s.cell}><Tile card={c} allCards={cards} onPress={() => open(c)} s={s} /></View>
              ))}
            </View>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>
                {query ? '見つかりません。' : cards.length ? '' : '下の「カードを追加」から、手持ちのポイントカードを登録してください。バーコードはカメラで読み取れます。'}
              </Text>
            </View>
          )}
        </View>

        <Text style={s.foot}>データはこのスマホの中だけに保存されます。通知は送りません。</Text>
      </ScrollView>

      <Pressable onPress={startNew} style={s.fab} accessibilityRole="button">
        <Text style={s.fabText}>＋ カードを追加</Text>
      </Pressable>

      {toast && <View style={s.toast} pointerEvents="none"><Text style={s.toastText}>{toast}</Text></View>}

      <Modal visible={!!shownCard} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowing(null)}>
        <SafeAreaProvider>
        {shownCard && (() => {
          const common = {
            hasPosition: !!pos,
            onClose: () => setShowing(null),
            onEdit: () => { setShowing(null); setEditing({ ...shownCard }); },
            onRememberHere: () => {
              const { places, added } = learnPlace(shownCard, pos, true);
              updateCard({ ...shownCard, places });
              say(added ? 'この場所を覚えました' : 'この場所はもう覚えています');
            },
            onForget: () => { updateCard({ ...shownCard, places: [] }); say('覚えた場所を消しました'); },
          };
          if (shownCard.kind === 'set') {
            const members = (shownCard.steps || []).map((id) => cards.find((c) => c.id === id)).filter(Boolean);
            return (
              <SetShowScreen
                {...common}
                set={shownCard}
                members={members}
                onUse={(c) => updateCard({ ...c, uses: (c.uses || 0) + 1, lastUsed: Date.now() })}
              />
            );
          }
          return <ShowScreen {...common} card={shownCard} />;
        })()}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaProvider>
        {editing && <EditScreen initial={editing} allCards={cards} onCancel={() => setEditing(null)} onSave={saveDraft} onDelete={removeCard} />}
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

function Tile({ card, allCards, big, dist, onPress, s }) {
  const meta = card.kind === 'set'
    ? (card.steps || []).map((id) => allCards.find((c) => c.id === id)?.name).filter(Boolean).join(' → ') || 'カードが入っていません'
    : card.lastUsed
    ? `最後に使った日 ${new Date(card.lastUsed).getMonth() + 1}/${new Date(card.lastUsed).getDate()}`
    : 'まだ使っていません';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, { backgroundColor: card.color }, dist != null && s.tileNear, big && s.tileBig, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${card.name}を表示`}>
      <View style={s.tileDeco} />
      <Text style={s.kind}>{KIND_LABEL[card.kind]}</Text>
      <Text style={[s.tileName, big && s.tileNameBig]} numberOfLines={2}>{card.name}</Text>
      {dist != null ? (
        <View style={s.dist}><Text style={s.distText}>ここから {formatDistance(dist)}</Text></View>
      ) : (
        <Text style={s.meta} numberOfLines={1}>{meta}</Text>
      )}
    </Pressable>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  logo: { fontSize: 30, fontWeight: '900', color: t.ink, letterSpacing: 0.3 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingVertical: 5, paddingLeft: 10, paddingRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.muted },
  locText: { fontSize: 13, color: t.muted, fontVariant: ['tabular-nums'] },
  notice: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 14, padding: 12, gap: 10 },
  noticeText: { fontSize: 13, color: t.muted, lineHeight: 20 },
  smallBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: t.line, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  smallBtnText: { fontSize: 13, fontWeight: '700', color: t.ink },
  sec: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: t.muted, marginBottom: 10 },
  count: { fontVariant: ['tabular-nums'], letterSpacing: 0 },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: 14, padding: 14 },
  emptyText: { fontSize: 13, color: t.muted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  tile: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, minHeight: 92, justifyContent: 'space-between', gap: 6, overflow: 'hidden' },
  tileNear: { minHeight: 96, paddingVertical: 14, paddingHorizontal: 16 },
  tileBig: { minHeight: 128 },
  tileDeco: { position: 'absolute', right: -30, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  kind: { position: 'absolute', right: 10, top: 10, fontSize: 10, color: '#FFF', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  tileName: { color: '#FFF', fontSize: 15, fontWeight: '800', paddingRight: 52, lineHeight: 20 },
  tileNameBig: { fontSize: 22, lineHeight: 28 },
  meta: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontVariant: ['tabular-nums'] },
  dist: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  distText: { color: t.near === '#FF8A73' ? '#D9452B' : t.near, fontSize: 12, fontWeight: '700' },
  search: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, color: t.ink, fontSize: 15 },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
  fab: { position: 'absolute', alignSelf: 'center', bottom: 34, backgroundColor: t.accent, borderRadius: 999, paddingVertical: 15, paddingHorizontal: 28, shadowColor: '#0A7552', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { color: t.accentInk, fontSize: 16, fontWeight: '800' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 100, backgroundColor: '#15211C', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, maxWidth: '90%' },
  toastText: { color: '#FFF', fontSize: 13, textAlign: 'center' },
});
