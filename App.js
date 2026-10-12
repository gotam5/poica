import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AddFlow from './src/AddFlow';
import CustomFlow from './src/CustomFlow';
import EditScreen from './src/EditScreen';
import SettingsScreen from './src/SettingsScreen';
import MapScreen from './src/MapScreen';
import StatsScreen, { monthKey } from './src/StatsScreen';
import Toolbar from './src/Toolbar';
import ShowScreen from './src/ShowScreen';
import Paywall from './src/Paywall';
import { checkOwned, iapAvailable } from './src/purchase';
import { DEFAULT_LIMITS, loadLimits, refreshLimits } from './src/limits';
import { arrange, learnPlace } from './src/geo';
import { deleteCard, getSetting, keepPhoto, loadCards, removePhoto, saveCard, setSetting } from './src/storage';
import { TYPE_LABEL, cardPalette, cardTypes, openCardApp } from './src/appLink';
import CardFace from './src/CardFace';
import { fetchNearbyStores, storePatternOf, storeRegex } from './src/nearbyStores';
import { recordUse, usageSummary } from './src/usage';
import { sendReportIfDue } from './src/report';
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
  const [stores, setStores] = useState([]);
  const [openFailed, setOpenFailed] = useState(false);
  const [storeLookup, setStoreLookup] = useState(true);
  const [unlimited, setUnlimited] = useState(false);
  const [paywall, setPaywall] = useState(null); // null | 'cards' | 'suggest'
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [tab, setTab] = useState('home'); // home | map | stats | settings
  const [shareUsage, setShareUsage] = useState(false);
  const scrollRef = useRef(null);

  const say = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    // セット was removed; old set cards stay hidden.
    loadCards().then((list) => setCards(list.filter((c) => c.kind !== 'set'))).catch(() => setCards([]));
    getSetting('storeLookup', true).then(setStoreLookup).catch(() => {});
    getSetting('shareUsage', false).then(setShareUsage).catch(() => {});
    // The purchase is remembered on the phone so the limit stays off offline; StoreKit is the source of truth when reachable.
    loadLimits().then(setLimits).then(() => refreshLimits()).then((l) => l && setLimits(l)).catch(() => {});
    getSetting('unlimited', false).then((v) => v && setUnlimited(true)).catch(() => {});
    if (iapAvailable) {
      checkOwned().then((owned) => { if (owned) { setUnlimited(true); setSetting('unlimited', true).catch(() => {}); } }).catch(() => {});
    }
  }, []);

  // Look up chain shops near here for cards tied to a shop (e.g. スギ薬局), so they can be suggested.
  const patternKey = useMemo(() => {
    if (!cards) return '';
    return [...new Set(cards.map((c) => storePatternOf(c, cards)).filter(Boolean))].sort().join('||');
  }, [cards]);
  const posKey = pos ? `${Math.round(pos.lat * 1000)},${Math.round(pos.lng * 1000)}` : '';
  useEffect(() => {
    if (!storeLookup || !posKey || !patternKey) { setStores([]); return; }
    let alive = true;
    fetchNearbyStores(pos, patternKey.split('||'))
      .then((list) => { if (alive) setStores(list); })
      .catch(() => { if (alive) setStores([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLookup, posKey, patternKey]);

  // The opt-in usage report goes out at most weekly, after config.json says where (see report.js).
  const reportTried = useRef(false);
  useEffect(() => {
    if (!cards || !shareUsage || reportTried.current) return;
    reportTried.current = true;
    const id = setTimeout(() => sendReportIfDue(cards), 15000);
    return () => clearTimeout(id);
  }, [cards, shareUsage]);

  const toggleShareUsage = () => {
    const next = !shareUsage;
    setShareUsage(next);
    setSetting('shareUsage', next).catch(() => {});
  };

  const toggleStoreLookup = () => {
    const next = !storeLookup;
    setStoreLookup(next);
    setSetting('storeLookup', next).catch(() => {});
  };

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

  // A use counts (and teaches the place) only when the card was actually shown or its app opened.
  const countUse = useCallback((card) => {
    const { places, added } = learnPlace(card, pos);
    const month = monthKey();
    const useMonths = { ...(card.useMonths || {}), [month]: ((card.useMonths || {})[month] || 0) + 1 };
    updateCard({ ...card, places, uses: (card.uses || 0) + 1, useMonths, lastUsed: Date.now() });
    if (added) say('この場所を覚えました。次からここで一番上に出します');
  }, [pos, updateCard, say]);

  const open = useCallback((card) => {
    const counted = (failed) => {
      recordUse(card, { failed })
        .then(() => __DEV__ && usageSummary(cards).then((u) => console.log('[usage 30d]', JSON.stringify(u))))
        .catch(() => {});
    };
    if (card.kind === 'app') {
      // Official apps open straight away; the card screen only shows up when the app could not be opened.
      openCardApp(card).then((ok) => {
        counted(!ok);
        if (ok) countUse(card);
        else { setOpenFailed(true); setShowing(card.id); }
      });
      return;
    }
    counted(false);
    countUse(card);
    setOpenFailed(false);
    setShowing(card.id);
  }, [cards, countUse]);

  const saveDraft = useCallback(async (draft, keepOpen = false) => {
    const { isNew, ...card } = draft;
    try {
      const prev = cards.find((c) => c.id === card.id);
      // Photos and card pictures are copied in on save; a replaced or removed one is deleted.
      for (const key of ['photo', 'bgImage']) {
        const old = prev?.[key];
        if (card[key] && typeof card[key] === 'object') card[key] = await keepPhoto(card[key].temp, card.id);
        if (old && typeof old === 'string' && old !== card[key]) removePhoto(old);
      }
      await saveCard(card);
      setCards((prev) => (prev.some((c) => c.id === card.id) ? prev.map((c) => (c.id === card.id ? card : c)) : [...prev, card]));
      if (!keepOpen) { setEditing(null); say('保存しました'); }
      return true;
    } catch {
      say('保存できませんでした。もう一度試してください');
      return false;
    }
  }, [cards, say]);

  const removeCard = useCallback(async (card) => {
    try { await deleteCard(card); } catch {}
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setEditing(null);
    say('削除しました');
  }, [cards, say]);

  const markUnlocked = () => {
    setUnlimited(true);
    setSetting('unlimited', true).catch(() => {});
    say('購入ありがとうございます。Poica 無制限になりました');
  };

  const unlock = () => {
    markUnlocked();
    const from = paywall;
    setPaywall(null);
    if (from === 'cards') setTimeout(() => newDraft(), 450); // carry on to the card they were adding
  };

  const startNew = () => {
    if (iapAvailable && !unlimited && (cards?.length || 0) >= limits.freeCardLimit) { setPaywall('cards'); return; }
    newDraft();
  };
  const newDraft = () => setEditing({
    id: newId(), isNew: true, name: '', kind: 'app', code: '', format: 'CODE128', photo: null, appMode: 'catalog', catalogId: null, appUrl: '', shortcutName: '',
    color: CARD_COLORS[(cards?.length || 0) % CARD_COLORS.length], places: [], uses: 0, created: Date.now(),
  });

  if (cards === null) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={t.accent} /></View>;
  }

  const { recent, suggest: allSuggest, all } = arrange(cards, pos, query, stores, (c) => storeRegex(storePatternOf(c, cards)), limits.paidNearbyLimit);
  // Free: only the top freeNearbyLimit recommendations (after the usage/distance sort); Poica 無制限 shows paidNearbyLimit.
  const free = iapAvailable && !unlimited;
  const canDesign = !free;
  const suggest = free ? allSuggest.slice(0, limits.freeNearbyLimit) : allSuggest;
  const hiddenSuggest = allSuggest.length - suggest.length;
  const shownCard = showing ? cards.find((c) => c.id === showing) : null;
  const anyPlaces = cards.some((c) => c.places && c.places.length);
  const placeCount = cards.reduce((n, c) => n + (c.places ? c.places.length : 0), 0);

  // Tapping ホーム again while on Home scrolls back to the top.
  const goTab = (next) => {
    if (next === 'home' && tab === 'home') scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTab(next);
  };
  const forgetAllPlaces = async () => {
    const next = cards.map((c) => (c.places && c.places.length ? { ...c, places: [] } : c));
    setCards(next);
    for (const c of next) { try { await saveCard(c); } catch {} }
    say('覚えた場所をすべて消しました');
  };

  const locLabel = {
    wait: '現在地を確認中',
    ok: pos ? `現在地 ±${Math.round(pos.acc)}m` : '現在地を確認中',
    denied: '位置情報オフ',
    fail: '現在地を取れません',
  }[loc.state];

  let suggestEmpty;
  if (loc.state === 'ok') suggestEmpty = anyPlaces || stores.length
    ? 'この近くでおすすめできるカードはありません。'
    : 'カードを店で使うと、その場所を覚えて次からここに出します。スギ薬局のような店のカードは、近くにその店があれば自動で出ます。';
  else if (loc.state === 'wait') suggestEmpty = '現在地を確認しています。';
  else suggestEmpty = '現在地が分からないため、おすすめを出せません。';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="auto" />
      {tab === 'map' && <MapScreen cards={cards} pos={pos} t={t} />}
      {tab === 'stats' && <StatsScreen cards={cards} t={t} onEdit={(c) => setEditing({ ...c })} />}
      {tab === 'settings' && (
        <SettingsScreen
          unlimited={unlimited} iapAvailable={iapAvailable} limits={limits} cardCount={cards.length} placeCount={placeCount}
          storeLookup={storeLookup} onToggleStoreLookup={toggleStoreLookup} onForgetPlaces={forgetAllPlaces}
          shareUsage={shareUsage} onToggleShareUsage={toggleShareUsage}
          onUnlocked={markUnlocked} privacyUrl={PRIVACY_URL} supportUrl={SUPPORT_URL}
        />
      )}
      {tab === 'home' && <ScrollView ref={scrollRef} contentContainerStyle={s.wrap}>
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

        {recent.length > 0 && (
          <View>
            <Text style={s.sec}>前回使った</Text>
            <View style={s.grid}>
              {recent.map((c) => (
                <View key={c.id} style={s.cell}><Tile card={c} allCards={cards} onPress={() => open(c)} onLongPress={() => setEditing({ ...c })} s={s} /></View>
              ))}
            </View>
          </View>
        )}

        <View>
          <Text style={[s.sec, s.secHot]}>近くのおすすめ</Text>
          {suggest.length ? (
            <View style={{ gap: 10 }}>
              {suggest.map((x, i) => (
                <Tile
                  key={x.card.id}
                  card={x.card}
                  allCards={cards}
                  big={i === 0}
                  wide
                  chip={x.reason === 'store' ? '近くにお店があります' : x.here >= 3 ? 'ここでよく使う' : 'ここで使ったことがある'}
                  onPress={() => open(x.card)} onLongPress={() => setEditing({ ...x.card })}
                  s={s}
                />
              ))}
              {hiddenSuggest > 0 && (
                <Pressable onPress={() => setPaywall('suggest')} hitSlop={6} accessibilityRole="button">
                  <Text style={s.more}>近くのおすすめをあと{hiddenSuggest}件見るには Poica 無制限</Text>
                </Pressable>
              )}
            </View>
          ) : hiddenSuggest > 0 ? (
            <Pressable onPress={() => setPaywall('suggest')} style={s.empty} accessibilityRole="button">
              <Text style={s.more}>近くのおすすめが{hiddenSuggest}件あります。見るには Poica 無制限</Text>
            </Pressable>
          ) : (
            <View style={s.empty}><Text style={s.emptyText}>{suggestEmpty}</Text></View>
          )}
        </View>

        <View>
          <View style={s.listHead}>
            <Text style={[s.sec, { marginBottom: 0 }]}>カード一覧 {cards.length ? <Text style={s.count}>{cards.length}</Text> : null}</Text>
            <Pressable onPress={startNew} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]} hitSlop={6} accessibilityRole="button" accessibilityLabel="カードを追加">
              <Text style={s.addBtnText}>＋ 追加</Text>
            </Pressable>
          </View>
          {cards.length >= 4 && (
            <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="カード名で探す" placeholderTextColor={t.muted} clearButtonMode="while-editing" returnKeyType="search" />
          )}
          {all.length ? (
            <View style={{ gap: 14 }}>
              {['point', 'pay'].map((ty) => {
                const group = all.filter((c) => cardTypes(c).includes(ty));
                if (!group.length) return null;
                return (
                  <View key={ty} style={{ gap: 8 }}>
                    <Text style={s.group}>{TYPE_LABEL[ty]}</Text>
                    <View style={s.grid}>
                      {group.map((c) => (
                        <View key={c.id} style={s.cell}><Tile card={c} allCards={cards} onPress={() => open(c)} onLongPress={() => setEditing({ ...c })} s={s} /></View>
                      ))}
                    </View>
                  </View>
                );
              })}
              <Pressable onPress={startNew} style={({ pressed }) => [s.addTile, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                <Text style={s.addTileText}>＋ カードを追加</Text>
              </Pressable>
              <Text style={s.foot}>カードを長押しすると、名前やデザインの変更、削除ができます。</Text>
            </View>
          ) : query ? (
            <View style={s.empty}><Text style={s.emptyText}>見つかりません。</Text></View>
          ) : (
            <Pressable onPress={startNew} style={({ pressed }) => [s.firstAdd, pressed && { opacity: 0.85 }]} accessibilityRole="button">
              <View style={s.firstPlus}><Text style={s.firstPlusText}>＋</Text></View>
              <Text style={s.firstTitle}>カードを追加する</Text>
              <Text style={s.firstText}>よく使うお店の公式アプリや、ポイントカードを登録しましょう。</Text>
            </Pressable>
          )}
        </View>

      </ScrollView>}

      <Toolbar t={t} active={tab} onChange={goTab} />

      {toast && <View style={s.toast} pointerEvents="none"><Text style={s.toastText}>{toast}</Text></View>}

      <Modal visible={!!shownCard} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowing(null)}>
        <SafeAreaProvider>
        {shownCard && (() => {
          const common = {
            hasPosition: !!pos,
            onClose: () => setShowing(null),
            onRememberHere: () => {
              const { places, added } = learnPlace(shownCard, pos, true);
              updateCard({ ...shownCard, places });
              say(added ? 'この場所を覚えました' : 'この場所はもう覚えています');
            },
            onForget: () => { updateCard({ ...shownCard, places: [] }); say('覚えた場所を消しました'); },
          };
          return <ShowScreen {...common} card={shownCard} openFailed={openFailed} onOpened={() => { recordUse(shownCard).catch(() => {}); countUse(shownCard); }} onSetupShortcut={(name) => {
            // Close the card, then open its editor on the shortcut settings (iOS can't swap two modals at once).
            const draft = { ...shownCard, appMode: 'shortcut', shortcutName: shownCard.shortcutName || name };
            setShowing(null);
            setTimeout(() => setEditing(draft), 450);
          }} />;
        })()}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!paywall} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPaywall(null)}>
        <SafeAreaProvider>
          {paywall && <Paywall reason={paywall} limits={limits} onClose={() => setPaywall(null)} onUnlocked={unlock} />}
        </SafeAreaProvider>
      </Modal>

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaProvider>
        {editing && (() => {
          const pay = { allCards: cards, canDesign, limits, onUnlocked: markUnlocked };
          if (editing.isNew && editing.custom) {
            return <CustomFlow {...pay} initial={editing} onCancel={() => setEditing({ ...editing, custom: false, kind: 'app', appMode: 'catalog' })} onSave={({ custom, ...d }) => saveDraft(d, true)} />;
          }
          if (editing.isNew) {
            return <AddFlow {...pay} initial={editing} onCancel={() => setEditing(null)} onSave={(d) => saveDraft(d, true)} onCustom={() => setEditing({ ...editing, custom: true, kind: 'barcode', appMode: 'shortcut', catalogId: null })} />;
          }
          return <EditScreen {...pay} initial={editing} onCancel={() => setEditing(null)} onSave={({ custom, ...d }) => saveDraft(d)} onDelete={removeCard} />;
        })()}
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

// Placeholders until the policy page is published.
const PRIVACY_URL = 'https://gotam5.github.io/poica-site/#privacy';
const SUPPORT_URL = 'https://gotam5.github.io/poica-site/#support';

function Tile({ card, allCards, big, wide, chip, onPress, onLongPress, s }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400} style={({ pressed }) => [pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${KIND_LABEL[card.kind]} ${card.name}を表示`} accessibilityHint="長押しで編集">
      <CardFace card={card} palette={cardPalette(card, allCards)} big={big} wide={wide} chip={chip} />
    </Pressable>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 22 },
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
  secHot: { fontSize: 15, fontWeight: '800', color: t.accent },
  count: { fontVariant: ['tabular-nums'], letterSpacing: 0 },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: 14, padding: 14 },
  emptyText: { fontSize: 13, color: t.muted, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  search: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10, color: t.ink, fontSize: 15 },
  group: { fontSize: 13, fontWeight: '700', color: t.muted },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: { borderWidth: 1, borderColor: t.accent, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  addBtnText: { color: t.accent, fontSize: 13, fontWeight: '800' },
  addTile: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.accent, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 14, alignItems: 'center', gap: 4 },
  addTileText: { color: t.accent, fontSize: 15, fontWeight: '800' },
  firstAdd: { backgroundColor: t.accent, borderRadius: 18, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', gap: 8, shadowColor: '#0A7552', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  firstPlus: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  firstPlusText: { color: t.accentInk, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  firstTitle: { color: t.accentInk, fontSize: 20, fontWeight: '900' },
  firstText: { color: t.accentInk, fontSize: 13, lineHeight: 19, textAlign: 'center', opacity: 0.9 },
  more: { color: t.accent, fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 110, backgroundColor: '#15211C', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, maxWidth: '90%' },
  toastText: { color: '#FFF', fontSize: 13, textAlign: 'center' },
});
