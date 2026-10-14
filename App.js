import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, AppState, LayoutAnimation, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import ReorderScreen from './src/ReorderScreen';
import Paywall from './src/Paywall';
import { checkOwned, iapAvailable } from './src/purchase';
import { DEFAULT_LIMITS, loadLimits, refreshLimits } from './src/limits';
import { arrange, learnPlace } from './src/geo';
import { deleteCard, getSetting, keepPhoto, loadCards, removePhoto, saveCard, setSetting } from './src/storage';
import { cardPalette, openCardApp } from './src/appLink';
import CardFace from './src/CardFace';
import { fetchNearbyStores, storeHasCard } from './src/nearbyStores';
import { recordUse, usageSummary } from './src/usage';
import Svg, { Circle, Path } from 'react-native-svg';
import smooth from './src/smooth';
import Toast from './src/Toast';
import { CARD_COLORS, KIND_LABEL, useTheme } from './src/theme';

const HOME_ORDER = ['suggest', 'list'];

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
  const [searching, setSearching] = useState(false);
  const [showing, setShowing] = useState(null); // card id
  const [editing, setEditing] = useState(null); // draft
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [stores, setStores] = useState([]);
  const [openFailed, setOpenFailed] = useState(false);
  const [storeLookup, setStoreLookup] = useState(true);
  const [owned, setUnlimited] = useState(false); // PRO bought
  const [previewFree, setPreviewFree] = useState(false); // test switch: behave as the free version even when PRO is owned
  const unlimited = owned && !previewFree;
  const [paywall, setPaywall] = useState(null); // null | 'cards' | 'suggest'
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [tab, setTab] = useState('home'); // home | map | stats | settings
  const [cardOrder, setCardOrder] = useState(null); // ids in the order the user chose; null = most used first
  const [reordering, setReordering] = useState(null); // focused card id while the reorder screen is open
  const [homeOrder, setHomeOrder] = useState(HOME_ORDER); // order of the blocks on ホーム
  const [homeHidden, setHomeHidden] = useState([]); // blocks switched off on ホーム
  const [suggestCount, setSuggestCount] = useState(null); // null = as many as allowed
  const [nearRange, setNearRange] = useState('auto'); // metres that count as 近く, or 'auto'
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
    getSetting('homeHidden', null).then(async (v) => {
      if (Array.isArray(v)) {
        // 前回使った was removed; keep at least one block visible.
        const h = v.filter((k) => HOME_ORDER.includes(k));
        return setHomeHidden(h.length < HOME_ORDER.length ? h : []);
      }
      // Older versions had a separate 「おすすめを表示しない」.
      if ((await getSetting('suggestPos', 'afterRecent')) === 'off') setHomeHidden(['suggest']);
    }).catch(() => {});
    getSetting('homeOrder', null).then(async (v) => {
      const o = Array.isArray(v) ? v.filter((k) => HOME_ORDER.includes(k)) : [];
      if (o.length === HOME_ORDER.length && HOME_ORDER.every((k) => o.includes(k))) return setHomeOrder(o);
      // Older versions only had 「おすすめを一番上」.
      if ((await getSetting('suggestPos', 'afterRecent')) === 'top') setHomeOrder(['suggest', 'list']);
    }).catch(() => {});
    getSetting('suggestCount', null).then(setSuggestCount).catch(() => {});
    getSetting('nearRange', 'auto').then(setNearRange).catch(() => {});
    getSetting('cardOrder', null).then((v) => Array.isArray(v) && setCardOrder(v)).catch(() => {});
    // The purchase is remembered on the phone so the limit stays off offline; StoreKit is the source of truth when reachable.
    loadLimits().then(setLimits).then(() => refreshLimits()).then((l) => l && setLimits(l)).catch(() => {});
    getSetting('unlimited', false).then((v) => v && setUnlimited(true)).catch(() => {});
    getSetting('previewFree', false).then((v) => v && setPreviewFree(true)).catch(() => {});
    if (iapAvailable) {
      checkOwned().then((owned) => { if (owned) { setUnlimited(true); setSetting('unlimited', true).catch(() => {}); } }).catch(() => {});
    }
  }, []);

  // Look up shops near here and which of them have a catalog app; only when a card comes from the catalog.
  const hasCatalogCard = !!cards && cards.some((c) => c.kind === 'app' && c.catalogId);
  const posKey = pos ? `${Math.round(pos.lat * 1000)},${Math.round(pos.lng * 1000)}` : '';
  useEffect(() => {
    if (!storeLookup || !posKey || !hasCatalogCard) { setStores([]); return; }
    let alive = true;
    fetchNearbyStores(pos, typeof nearRange === 'number' ? Math.min(500, Math.max(100, nearRange)) : undefined)
      .then((list) => { if (alive) setStores(list); })
      .catch(() => { if (alive) setStores([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLookup, posKey, hasCatalogCard, nearRange]);

  const toggleStoreLookup = () => {
    const next = !storeLookup;
    setStoreLookup(next);
    setSetting('storeLookup', next).catch(() => {});
  };

  // "While using the app" location: ask once, then re-read every time the app comes to the front.
  // A re-check (tap, or back to the front) keeps the current position on screen until the new fix arrives, so nothing flickers.
  const locating = useRef(false);
  const hasPos = useRef(false);
  const locate = useCallback(async () => {
    if (locating.current) return;
    locating.current = true;
    if (!hasPos.current) setLoc({ state: 'wait' });
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return setLoc({ state: 'denied' });
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 200 });
      if (last && !hasPos.current) setPos({ lat: last.coords.latitude, lng: last.coords.longitude, acc: last.coords.accuracy ?? 999, t: last.timestamp });
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy ?? 999, t: Date.now() });
      hasPos.current = true;
      setLoc({ state: 'ok' });
    } catch {
      if (!hasPos.current) setLoc({ state: 'fail' });
    } finally {
      locating.current = false;
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
      smooth();
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
    smooth();
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setEditing(null);
    say('削除しました');
  }, [cards, say]);

  const markUnlocked = () => {
    setUnlimited(true);
    setSetting('unlimited', true).catch(() => {});
    setPreviewFree(false);
    setSetting('previewFree', false).catch(() => {});
    say('購入ありがとうございます。PROになりました');
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

  // The search bar hides again (and clears) whenever the user leaves the list: another tab, a card, an edit.
  const away = tab !== 'home' || !!showing || !!editing || !!reordering;
  useEffect(() => { if (away) { setSearching(false); setQuery(''); } }, [away]);

  if (cards === null) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={t.accent} /></View>;
  }

  const { suggest: allSuggest, all } = arrange(cards, pos, query, stores, storeHasCard, limits.paidNearbyLimit, nearRange);
  // Free: only the top freeNearbyLimit recommendations (after the usage/distance sort); PRO shows paidNearbyLimit. The user can also choose fewer, or hide them.
  const free = iapAvailable && !unlimited;
  const canDesign = !free;
  const suggestCap = free ? limits.freeNearbyLimit : limits.paidNearbyLimit;
  const suggest = allSuggest.slice(0, Math.min(suggestCount || suggestCap, suggestCap));
  const hiddenSuggest = free ? Math.max(0, allSuggest.length - limits.freeNearbyLimit) : 0;
  const shownCard = showing ? cards.find((c) => c.id === showing) : null;
  const anyPlaces = cards.some((c) => c.places && c.places.length);
  const placeCount = cards.reduce((n, c) => n + (c.places ? c.places.length : 0), 0);

  const toggleSearch = () => {
    smooth(340); // the bar fades in while the cards below glide down (and back up on close)
    if (searching) setQuery('');
    setSearching(!searching);
  };

  // Tapping ホーム again while on Home scrolls back to the top.
  const goTab = (next) => {
    if (next === 'home' && tab === 'home') scrollRef.current?.scrollTo({ y: 0, animated: true });
    setTab(next);
  };

  // Long-press on a card: edit it, or reorder the list.
  const cardMenu = (c) => {
    const edit = () => setEditing({ ...c });
    const reorder = () => setReordering(c.id);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: c.name, options: ['カードを編集', '並び替え', 'キャンセル'], cancelButtonIndex: 2 },
        (i) => { if (i === 0) edit(); else if (i === 1) reorder(); },
      );
    } else {
      Alert.alert(c.name, undefined, [{ text: 'カードを編集', onPress: edit }, { text: '並び替え', onPress: reorder }, { text: 'キャンセル', style: 'cancel' }]);
    }
  };

  // The card list: the user's own order if they set one, otherwise the most used first.
  const rank = new Map((cardOrder || []).map((id, i) => [id, i]));
  const byUse = (a, b) => (b.uses || 0) - (a.uses || 0) || (b.lastUsed || 0) - (a.lastUsed || 0) || (b.created || 0) - (a.created || 0);
  const ordered = (list) => [...list].sort((a, b) => {
    if (cardOrder) {
      const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
      if (ra !== rb) return ra - rb;
    }
    return byUse(a, b);
  });
  const listed = ordered(all);
  const saveOrder = (ids) => {
    smooth();
    setCardOrder(ids);
    setSetting('cardOrder', ids).catch(() => {});
    setReordering(null);
  };
  const changeHomeOrder = (v) => { smooth(); setHomeOrder(v); setSetting('homeOrder', v).catch(() => {}); };
  const changeHomeHidden = (v) => { smooth(); setHomeHidden(v); setSetting('homeHidden', v).catch(() => {}); };
  const changeNearRange = (v) => { smooth(); setNearRange(v); setSetting('nearRange', v).catch(() => {}); };
  const changeSuggestCount = (v) => { smooth(); setSuggestCount(v); setSetting('suggestCount', v).catch(() => {}); };
  const autoOrder = () => {
    smooth();
    setCardOrder(null);
    setSetting('cardOrder', null).catch(() => {});
    setReordering(null);
    say('自動で並べるようにしました');
  };
  // From the map: drop one card's learned places at a spot.
  const forgetPlacesOf = (cardId, places) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const gone = new Set(places.map((p) => `${p.lat},${p.lng}`));
    smooth();
    updateCard({ ...card, places: (card.places || []).filter((p) => !gone.has(`${p.lat},${p.lng}`)) });
    say('この場所の履歴を消しました');
  };
  const forgetAllPlaces = async () => {
    smooth();
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
  if (loc.state === 'ok') suggestEmpty = 'カードを使った場所を記憶し、次回からその近くで優先的に表示します。近くにお店がある公式アプリのカードも優先的に表示します。';
  else if (loc.state === 'wait') suggestEmpty = '現在地を確認しています。';
  else suggestEmpty = '現在地が分からないため、おすすめを出せません。';

  const suggestBlock = (
        <View>
          <Text style={[s.sec, s.secHot]}>近くのおすすめ</Text>
          {suggest.length ? (
            <View style={{ gap: 10 }}>
              {suggest.map((x) => (
                <Tile
                  key={x.card.id}
                  card={x.card}
                  allCards={cards}
                  wide
                  chip={x.reason === 'store' ? '近くにお店があります' : x.here >= 3 ? 'ここでよく使う' : 'ここで使ったことがある'}
                  onPress={() => open(x.card)} onLongPress={() => cardMenu(x.card)}
                  s={s}
                />
              ))}
              {free && (hiddenSuggest > 0 || suggest.length >= limits.freeNearbyLimit) && (
                <Pressable onPress={() => setPaywall('suggest')} style={({ pressed }) => [s.moreBtn, pressed && { opacity: 0.6 }]} accessibilityRole="button">
                  <Text style={s.moreBtnText}>さらに多く表示{hiddenSuggest > 0 ? `(あと${hiddenSuggest}件)` : ''}</Text>
                </Pressable>
              )}
            </View>
          ) : hiddenSuggest > 0 ? (
            <Pressable onPress={() => setPaywall('suggest')} style={({ pressed }) => [s.moreBtn, pressed && { opacity: 0.6 }]} accessibilityRole="button">
              <Text style={s.moreBtnText}>さらに多く表示(あと{hiddenSuggest}件)</Text>
            </Pressable>
          ) : (
            <View style={s.empty}><Text style={s.emptyText}>{suggestEmpty}</Text></View>
          )}
        </View>
  );
  const listBlock = (
        <View>
          <View style={s.listHead}>
            <Text style={[s.sec, { marginBottom: 0 }]}>カード一覧 {cards.length ? <Text style={s.count}>{cards.length}</Text> : null}</Text>
            <View style={s.headBtns}>
            {cards.length >= 4 && (
              <Pressable onPress={toggleSearch} style={({ pressed }) => [s.searchBtn, searching && s.searchBtnOn, pressed && { opacity: 0.6 }]} hitSlop={6} accessibilityRole="button" accessibilityLabel={searching ? '検索を閉じる' : 'カードを検索'}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Circle cx={10.5} cy={10.5} r={6.5} stroke={searching ? t.accentInk : t.accent} strokeWidth={2.6} fill="none" />
                  <Path d="M15.5 15.5L21 21" stroke={searching ? t.accentInk : t.accent} strokeWidth={2.6} strokeLinecap="round" />
                </Svg>
              </Pressable>
            )}
            <Pressable onPress={startNew} style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]} hitSlop={6} accessibilityRole="button" accessibilityLabel="カードを追加">
              <Text style={s.addBtnText}>＋ 追加</Text>
            </Pressable>
            </View>
          </View>
          {searching && (
            <TextInput style={s.search} autoFocus value={query} onChangeText={setQuery} placeholder="カード名で探す" placeholderTextColor={t.muted} clearButtonMode="while-editing" returnKeyType="search" />
          )}
          {listed.length ? (
            <View style={{ gap: 14 }}>
              <View style={s.grid}>
                {listed.map((c) => (
                  <View key={c.id} style={s.cell}><Tile card={c} allCards={cards} onPress={() => open(c)} onLongPress={() => cardMenu(c)} s={s} /></View>
                ))}
              </View>
              <Text style={s.foot}>カードを長押しすると、編集や並び替えができます。</Text>
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
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="auto" />
      {tab === 'map' && <MapScreen cards={cards} pos={pos} t={t} onForgetPlaces={forgetPlacesOf} />}
      {tab === 'stats' && <StatsScreen cards={cards} t={t} onEdit={(c) => setEditing({ ...c })} />}
      {tab === 'settings' && (
        <SettingsScreen
          unlimited={unlimited} owned={owned} previewFree={previewFree}
          onPreviewFree={(v) => { smooth(); setPreviewFree(v); setSetting('previewFree', v).catch(() => {}); say(v ? '無料版として表示しています' : 'PROに戻しました'); }}
          iapAvailable={iapAvailable} limits={limits} placeCount={placeCount}
          cards={cards} ordered={ordered(cards)} manualOrder={!!cardOrder} onEditCard={(c) => setEditing({ ...c })}
          onSaveOrder={(ids) => { setCardOrder(ids); setSetting('cardOrder', ids).catch(() => {}); }} onAutoOrder={autoOrder}
          homeOrder={homeOrder} onHomeOrder={changeHomeOrder} homeHidden={homeHidden} onHomeHidden={changeHomeHidden} suggestCount={suggestCount} onSuggestCount={changeSuggestCount} nearRange={nearRange} onNearRange={changeNearRange}
          storeLookup={storeLookup} onToggleStoreLookup={toggleStoreLookup} onForgetPlaces={forgetAllPlaces}
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

        {homeOrder.filter((k) => !homeHidden.includes(k)).map((k) => (
          <Fragment key={k}>{k === 'suggest' ? suggestBlock : listBlock}</Fragment>
        ))}

      </ScrollView>}

      <Toolbar t={t} active={tab} onChange={goTab} />

      <Toast text={toast} style={s.toast} textStyle={s.toastText} />

      <Modal visible={!!shownCard} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowing(null)}>
        <SafeAreaProvider>
        {shownCard && (() => {
          const common = {
            onClose: () => setShowing(null),
            palette: cardPalette(shownCard, cards),
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

      {/* Full screen, not a sheet: a sheet would slide down with the drag instead of the card moving. */}
      <Modal visible={!!reordering} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setReordering(null)}>
        <SafeAreaProvider>
          {reordering && <ReorderScreen cards={ordered(cards)} t={t} onCancel={() => setReordering(null)} onSave={saveOrder} onAuto={autoOrder} />}
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
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400} style={({ pressed }) => [pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${KIND_LABEL[card.kind]} ${card.name}を表示`} accessibilityHint="長押しで編集・並び替え">
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
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: { width: 32, height: 30, borderRadius: 999, borderWidth: 1, borderColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  searchBtnOn: { backgroundColor: t.accent },
  addBtn: { borderWidth: 1, borderColor: t.accent, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  addBtnText: { color: t.accent, fontSize: 13, fontWeight: '800' },
  firstAdd: { backgroundColor: t.accent, borderRadius: 18, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', gap: 8, shadowColor: '#0A7552', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  firstPlus: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  firstPlusText: { color: t.accentInk, fontSize: 32, fontWeight: '800', lineHeight: 38 },
  firstTitle: { color: t.accentInk, fontSize: 20, fontWeight: '900' },
  firstText: { color: t.accentInk, fontSize: 13, lineHeight: 19, textAlign: 'center', opacity: 0.9 },
  moreBtn: { alignSelf: 'center', borderWidth: 1, borderColor: t.accent, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  moreBtnText: { color: t.accent, fontWeight: '800', fontSize: 14 },
  more: { color: t.accent, fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  foot: { fontSize: 12, color: t.muted, textAlign: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 110, backgroundColor: '#15211C', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, maxWidth: '90%' },
  toastText: { color: '#FFF', fontSize: 13, textAlign: 'center' },
});
