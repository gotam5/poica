import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { scanFromURLAsync } from 'expo-camera';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BarcodeView from './BarcodeView';
import ScannerScreen from './ScannerScreen';
import { FORMATS } from './barcode';
import { KIND_LABEL, PALETTES, useTheme } from './theme';
import CardFace from './CardFace';
import ShortcutGuide from './ShortcutGuide';
import { photoUri } from './storage';
import { CATALOG, TYPE_LABEL, appMode, cardPalette, catalogApp, launchCandidates, schemeUrl, guessCatalogApp, installedCatalogIds, isStoreUrl, normalizeAppUrl, openCardApp } from './appLink';
import { base64ToBytes, decodeBarcodeImage } from './decodeImage';
import { lookupKnownApp } from './knownApps';

// draft.photo is either a saved file name, or { temp: uri } for a newly taken photo not yet saved.
export default function EditScreen({ initial, allCards = [], onCancel, onSave, onDelete }) {
  const t = useTheme();
  const s = styles(t);
  const { width } = useWindowDimensions();
  const [d, setD] = useState(initial.kind === 'photo' ? { ...initial, kind: 'barcode' } : initial);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(null); // { text, error }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reading, setReading] = useState(false);
  const [shotCode, setShotCode] = useState(null); // code read from the first screenshot, for the "changes over time?" check
  const isNew = !!initial.isNew;
  const custom = !!initial.custom; // came from 「自分でカードを作る」: listed apps are picked in the guided flow instead
  const set = (patch) => setD((prev) => ({ ...prev, ...patch }));
  const [installed, setInstalled] = useState([]);
  const [appQuery, setAppQuery] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    installedCatalogIds().then(setInstalled).catch(() => {});
  }, []);

  // Switch to "公式アプリ", guessing the app from the card name.
  const toApp = (patch = {}) => setD((prev) => {
    const guess = prev.catalogId ? null : guessCatalogApp(prev.name);
    return { ...prev, kind: 'app', ...(guess ? { appMode: 'catalog', catalogId: guess.id } : {}), ...patch };
  });

  const pickCatalog = (app) => {
    setTestResult(null);
    setD((prev) => ({ ...prev, appMode: 'catalog', catalogId: app.id, launch: null, name: isNew || !(prev.name || '').trim() ? app.name : prev.name }));
  };

  const testOpen = async () => {
    setTestResult(null);
    const ok = await openCardApp({ ...d, appUrl: normalizeAppUrl(d.appUrl) });
    setTestResult(ok ? 'ok' : 'fail');
  };

  const pickPhoto = async (fromCamera) => {
    try {
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setStatus({ text: '写真を撮るにはカメラの許可が必要です。設定アプリの「Poica」からオンにできます。', error: true });
          return;
        }
      }
      const opts = { mediaTypes: 'images', quality: 0.7 };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      set({ photo: { temp: res.assets[0].uri } });
      setStatus(null);
    } catch {
      setStatus({ text: '写真を取り込めませんでした。もう一度試してください。', error: true });
    }
  };

  // Pick a screenshot of the official app's member screen and read its barcode.
  const readScreenshot = async (verify) => {
    let res;
    try {
      res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
    } catch {
      return setStatus({ text: '写真を開けませんでした。もう一度試してください。', error: true });
    }
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setReading(true);
    setStatus(null);
    let found = null;
    try {
      try {
        const q = await scanFromURLAsync(asset.uri, ['qr']);
        if (q && q[0]?.data) found = { code: q[0].data, format: 'QR' };
      } catch {}
      if (!found) {
        const ctx = ImageManipulator.manipulate(asset.uri);
        if ((asset.width || 0) > 1000) ctx.resize({ width: 1000 });
        const ref = await ctx.renderAsync();
        const out = await ref.saveAsync({ format: SaveFormat.PNG, base64: true });
        await new Promise((r) => setTimeout(r, 30)); // let the spinner draw before the busy decode
        found = decodeBarcodeImage(base64ToBytes(out.base64 || ''));
      }
    } catch {
      found = null;
    }
    setReading(false);
    if (!found) {
      return setStatus({ text: 'このスクショからバーコードを読み取れませんでした。会員証の画面を、バーコード全体が写るように撮り直してください。', error: true });
    }
    if (verify) {
      if (found.code === shotCode) {
        setShotCode(null);
        return setStatus({ text: '2枚とも同じ番号でした。時間で変わらないバーコードなので、Poicaから出せます。' });
      }
      setShotCode(null);
      return setStatus({ text: '2枚で番号が違いました。時間で変わるバーコードなので、Poicaからは出せません。「公式アプリ」として登録してください。', error: true, toApp: true });
    }
    set({ code: found.code, format: found.format, source: 'screenshot' });
    setShotCode(found.code);
    setStatus({ text: '読み取れました。番号が合っているか確かめてください。' });
  };

  const save = () => {
    const name = (d.name || '').trim() || (d.kind === 'app' && appMode(d) === 'catalog' ? catalogApp(d.catalogId)?.name || '' : '');
    if (!name && !(d.kind === 'app' && appMode(d) === 'catalog')) return setStatus({ text: '名前を入れてください。', error: true });
    if (d.kind === 'barcode' && !(d.code || '').trim() && !d.photo) return setStatus({ text: 'バーコードを読み取るか、番号を入れるか、写真を撮ってください。', error: true });
    const mode = appMode(d);
    const appUrl = normalizeAppUrl(d.appUrl);
    const shortcutName = (d.shortcutName || '').trim();
    if (d.kind === 'app' && mode === 'catalog' && !catalogApp(d.catalogId)) return setStatus({ text: '一覧からアプリを選んでください。', error: true });
    if (d.kind === 'app' && mode === 'shortcut' && !shortcutName) return setStatus({ text: 'ショートカットの名前を入れてください。', error: true });
    if (d.kind === 'app' && mode === 'url' && !appUrl) return setStatus({ text: 'アプリを開くURLを入れてください。', error: true });
    onSave({ ...d, name, code: (d.code || '').trim(), appMode: mode, appUrl, shortcutName });
  };

  const known = lookupKnownApp(d.name);
  // Official apps from the list are named after the app; the name can be changed later by long-pressing the card on Home.
  const showName = d.kind !== 'app' || !isNew || appMode(d) !== 'catalog';
  const photoSource = d.photo ? { uri: typeof d.photo === 'object' ? d.photo.temp : photoUri(d.photo) } : null;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.head}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button"><Text style={s.headText}>{custom ? '戻る' : 'キャンセル'}</Text></Pressable>
        <Text style={s.title}>{custom ? '自分でカードを作る' : isNew ? 'カードを追加' : 'カードを編集'}</Text>
        <Pressable onPress={save} hitSlop={10} style={s.saveBtn} accessibilityRole="button"><Text style={s.saveText}>保存</Text></Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          {known && d.kind === 'barcode' && (
            <View style={s.warn}>
              <Text style={s.warnTitle}>{known.label}は{known.kind === 'dynamic' ? 'バーコードが時間で変わります' : 'スクショでの利用が禁止されています'}</Text>
              <Text style={s.warnText}>{known.note}</Text>
              <Pressable onPress={() => { toApp(); setStatus(null); }} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
                <Text style={s.secondaryText}>公式アプリとして登録する</Text>
              </Pressable>
            </View>
          )}

          <View style={s.field}>
            <Text style={s.label}>登録のしかた</Text>
            <View style={s.seg}>
              {(custom ? ['barcode', 'app'] : ['app', 'barcode']).map((k) => (
                <Pressable key={k} onPress={() => (k === 'app' ? (custom ? set({ kind: 'app', appMode: 'shortcut' }) : toApp()) : set({ kind: k }))} style={[s.segBtn, d.kind === k && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: d.kind === k }}>
                  <Text style={[s.segText, d.kind === k && s.segTextOn]}>{custom && k === 'app' ? '他のアプリ' : KIND_LABEL[k]}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {showName && (
            <View style={s.field}>
              <Text style={s.label}>店・カードの名前</Text>
              <TextInput style={s.input} value={d.name} onChangeText={(v) => set({ name: v })} placeholder="例: 駅前のドラッグストア" placeholderTextColor={t.muted} />
              <Text style={s.hint}>地図で近くの店を探すときにもこの名前を使います。</Text>
            </View>
          )}

          {status && <Text style={[s.status, status.error && s.statusErr]}>{status.text}</Text>}
          {status?.toApp && (
            <Pressable onPress={() => { toApp({ code: '' }); setStatus(null); }} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
              <Text style={s.secondaryText}>公式アプリとして登録する</Text>
            </Pressable>
          )}
          {reading && (
            <View style={[s.row, { alignItems: 'center' }]}><ActivityIndicator color={t.accent} /><Text style={s.hint}>スクショを読み取っています…</Text></View>
          )}

          {d.kind === 'barcode' && (
            <>
              <View style={s.row}>
                <Pressable onPress={() => readScreenshot(false)} disabled={reading} style={[s.primary, { flex: 1 }]} accessibilityRole="button">
                  <Text style={s.primaryText}>スクショから読む</Text>
                </Pressable>
                <Pressable onPress={() => setScanning(true)} disabled={reading} style={[s.secondary, { flex: 1 }]} accessibilityRole="button">
                  <Text style={s.secondaryText}>カメラで読む</Text>
                </Pressable>
              </View>
              <Text style={s.hint}>公式アプリの会員証画面をスクショして選ぶと、バーコードを読み取ります。プラスチックのカードはカメラで読めます。</Text>
              {shotCode && (
                <View style={s.warn}>
                  <Text style={s.warnText}>時間で変わるバーコードだと、レジで使えません。少し時間をおいてから公式アプリでもう一度スクショを撮り、同じ番号か確かめられます。</Text>
                  <Pressable onPress={() => readScreenshot(true)} disabled={reading} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
                    <Text style={s.secondaryText}>2枚目のスクショで確かめる</Text>
                  </Pressable>
                </View>
              )}
              <View style={s.field}>
                <Text style={s.label}>番号(任意)</Text>
                <TextInput style={[s.input, s.mono]} value={d.code} onChangeText={(v) => set({ code: v })} placeholder="読めないときは手で入力" placeholderTextColor={t.muted} autoCapitalize="characters" autoCorrect={false} />
              </View>
              <View style={s.field}>
                <Text style={s.label}>種類</Text>
                <View style={s.chips}>
                  {FORMATS.map((f) => (
                    <Pressable key={f.key} onPress={() => set({ format: f.key })} style={[s.chip, d.format === f.key && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: d.format === f.key }}>
                      <Text style={[s.chipText, d.format === f.key && s.chipTextOn]}>{f.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.hint}>カメラで読むと自動で決まります。分からなければ「自動」のままで大丈夫です。</Text>
              </View>
              {(d.code || '').trim() ? (
                <View style={s.preview}><BarcodeView code={d.code.trim()} format={d.format} width={width - 56} height={90} /></View>
              ) : null}
              <View style={s.field}>
                <Text style={s.label}>カードの写真(任意)</Text>
                <View style={s.row}>
                  <Pressable onPress={() => pickPhoto(true)} style={[s.secondary, { flex: 1 }]} accessibilityRole="button"><Text style={s.secondaryText}>カメラで撮る</Text></Pressable>
                  <Pressable onPress={() => pickPhoto(false)} style={[s.secondary, { flex: 1 }]} accessibilityRole="button"><Text style={s.secondaryText}>写真を選ぶ</Text></Pressable>
                </View>
                <Text style={s.hint}>バーコードが読めないカードやスタンプカードは、写真だけでも登録できます。</Text>
                {photoSource && (
                  <>
                    <View style={s.preview}><Image source={photoSource} style={{ width: '100%', height: 220 }} resizeMode="contain" /></View>
                    <Pressable onPress={() => set({ photo: null })} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button"><Text style={s.secondaryText}>写真を外す</Text></Pressable>
                  </>
                )}
              </View>
            </>
          )}

          {d.kind === 'app' && (
            <>
              {!custom && <View style={s.field}>
                <Text style={s.label}>アプリの開き方</Text>
                <View style={s.seg}>
                  {[['catalog', '一覧から選ぶ'], ['shortcut', '一覧にないアプリ']].map(([k, l]) => (
                    <Pressable key={k} onPress={() => { setTestResult(null); set({ appMode: k }); }} style={[s.segBtn, appMode(d) === k && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: appMode(d) === k }}>
                      <Text style={[s.segText, appMode(d) === k && s.segTextOn]}>{l}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>}
              {appMode(d) === 'catalog' && (() => {
                const chosen = catalogApp(d.catalogId);
                const q = appQuery.trim().toLowerCase();
                const list = CATALOG.filter((a) => !q || a.name.toLowerCase().includes(q) || a.keys.some((k) => k.toLowerCase().includes(q)));
                const sorted = [...list].sort((a, b) => installed.includes(b.id) - installed.includes(a.id));
                const chip = (a) => (
                  <Pressable key={a.id} onPress={() => pickCatalog(a)} style={[s.chip, d.catalogId === a.id && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: d.catalogId === a.id }}>
                    <Text style={[s.chipText, d.catalogId === a.id && s.chipTextOn]}>{installed.includes(a.id) ? '● ' : ''}{a.name}</Text>
                  </Pressable>
                );
                return (
                  <View style={s.field}>
                    <Text style={s.hint}>選ぶだけで、App Storeを通らずにアプリを直接開きます。準備は要りません。</Text>
                    {chosen && <Text style={s.label}>選択中: {chosen.name}</Text>}
                    <TextInput style={s.input} value={appQuery} onChangeText={setAppQuery} placeholder="アプリ名で探す" placeholderTextColor={t.muted} autoCorrect={false} clearButtonMode="while-editing" />
                    {['point', 'pay'].map((ty) => {
                      const group = sorted.filter((a) => (a.types || ['point']).includes(ty));
                      return group.length ? (
                        <View key={ty} style={{ gap: 6 }}>
                          <Text style={s.subLabel}>{TYPE_LABEL[ty]}</Text>
                          <View style={s.chips}>{group.map(chip)}</View>
                        </View>
                      ) : null;
                    })}
                    {installed.length > 0 && <Text style={s.hint}>● はこのiPhoneに入っているアプリです。</Text>}
                    {list.length === 0 && <Text style={s.hint}>一覧にありません。上の「一覧にないアプリ」から登録できます。</Text>}
                  </View>
                );
              })()}
              {appMode(d) === 'shortcut' && (
                <View style={s.field}>
                  <Text style={s.label}>ショートカットの名前</Text>
                  <TextInput style={s.input} value={d.shortcutName} onChangeText={(v) => set({ shortcutName: v })} placeholder="例: 楽天を開く" placeholderTextColor={t.muted} autoCorrect={false} />
                  <Text style={s.hint}>{catalogApp(d.catalogId) ? `${catalogApp(d.catalogId).name}を直接開けないときの方法です。` : '一覧にないアプリ向けの方法です。'}iPhoneの「ショートカット」アプリで、次のように1回だけ作ってください。</Text>
                  <ShortcutGuide appName={catalogApp(d.catalogId)?.name} shortcutName={(d.shortcutName || '').trim()} t={t} />
                  <Pressable onPress={() => Linking.openURL('shortcuts://').catch(() => {})} style={[s.secondary, { alignSelf: 'stretch', paddingVertical: 13 }]} accessibilityRole="button">
                    <Text style={[s.secondaryText, { textAlign: 'center' }]}>ショートカットアプリを開く</Text>
                  </Pressable>
                </View>
              )}
              {appMode(d) === 'url' && (
                <View style={s.field}>
                  <Text style={s.label}>アプリを開くURL</Text>
                  <TextInput style={s.input} value={d.appUrl} onChangeText={(v) => set({ appUrl: v })} placeholder="例: アプリ名://" placeholderTextColor={t.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                  <Text style={s.hint}>アプリ専用のURL(「〇〇://」の形)が分かっている場合に使います。</Text>
                  {isStoreUrl(d.appUrl) && <Text style={[s.status, s.statusErr]}>これはApp Storeのページのリンクなので、アプリではなくストアが開きます。</Text>}
                </View>
              )}
              <Pressable onPress={testOpen} style={({ pressed }) => [s.tryBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                <Text style={s.tryText}>↗ 試しに開く</Text>
                <Text style={s.tryHint}>ちゃんと開けるか、ここで確かめられます</Text>
              </Pressable>
              {appMode(d) === 'shortcut' && (
                <View style={s.field}>
                  <Text style={s.subLabel}>このアプリでできること(両方選べます)</Text>
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
                </View>
              )}
              {appMode(d) === 'catalog' && catalogApp(d.catalogId)?.openWith !== 'shortcut' && (catalogApp(d.catalogId)?.schemes.length || 0) > 1 && (() => {
                const urls = catalogApp(d.catalogId).schemes.map(schemeUrl);
                const current = launchCandidates(d)[0];
                return (
                  <View style={s.field}>
                    <Text style={s.subLabel}>開き方を選ぶ</Text>
                    <View style={s.chips}>
                      {urls.map((u, i) => (
                        <Pressable key={u} onPress={async () => { set({ launch: u }); setTestResult(null); try { await Linking.openURL(u); } catch { setTestResult('fail'); } }} style={[s.chip, current === u && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: current === u }}>
                          <Text style={[s.chipText, current === u && s.chipTextOn]}>開き方{i + 1}{current === u ? '(使用中)' : ''}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={s.hint}>開いたあとSafariなどに移ってしまうときは、そのアプリを起動したままの状態で、別の開き方を押して試してください。押した開き方が保存されます。</Text>
                  </View>
                );
              })()}
              {testResult === 'fail' && (
                <Text style={[s.status, s.statusErr]}>
                  {appMode(d) === 'catalog'
                    ? '開けませんでした。アプリが入っていないか、アプリ側の仕様が変わった可能性があります。うまくいかないときは「ショートカット」で登録してください。'
                    : '開けませんでした。アプリが入っているか、設定が正しいか確かめてください。'}
                </Text>
              )}
            </>
          )}

          <View style={s.field}>
            <Text style={s.label}>カードの配色</Text>
            <CardFace card={{ ...d, name: d.name || catalogApp(d.catalogId)?.name || '' }} palette={cardPalette(d, allCards)} />
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              {(() => {
                const app = d.kind === 'app' && appMode(d) === 'catalog' ? catalogApp(d.catalogId) : null;
                const options = [...(app && app.colors ? [{ key: 'app', colors: app.colors, label: 'アプリの色' }] : []), ...PALETTES.map((p, i) => ({ key: String(i), colors: p }))];
                const current = cardPalette(d, allCards).join();
                return options.map((o) => {
                  const on = o.colors.join() === current;
                  return (
                    <Pressable key={o.key} onPress={() => set(o.key === 'app' ? { palette: null, color: o.colors[0] } : { palette: o.colors, color: o.colors[0] })} style={[s.pal, on && { borderColor: t.ink }]} accessibilityRole="button" accessibilityLabel={o.label || `配色 ${Number(o.key) + 1}`} accessibilityState={{ selected: on }}>
                      {o.colors.map((c, i) => <View key={i} style={{ flex: i === 0 ? 2 : 1, backgroundColor: c }} />)}
                    </Pressable>
                  );
                });
              })()}
            </View>
            <Text style={s.hint}>公式アプリは、そのお店のイメージ色を最初から使います。ロゴは各社の許可が必要なため使っていません。</Text>
          </View>

          {!isNew && (confirmDelete ? (
            <View style={s.confirm}>
              <Text style={{ color: t.ink }}>「{initial.name}」を削除します。覚えた場所も消えます。</Text>
              <View style={s.row}>
                <Pressable onPress={() => onDelete(initial)} style={[s.secondary, s.wideBtn, { flex: 1 }]} accessibilityRole="button"><Text style={[s.secondaryText, { color: t.near }]}>削除する</Text></Pressable>
                <Pressable onPress={() => setConfirmDelete(false)} style={[s.secondary, s.wideBtn, { flex: 1 }]} accessibilityRole="button"><Text style={s.secondaryText}>やめる</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={[s.secondary, s.wideBtn]} accessibilityRole="button">
              <Text style={[s.secondaryText, { color: t.near, fontSize: 16 }]}>このカードを削除</Text>
            </Pressable>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={scanning} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setScanning(false)}>
        <SafeAreaProvider>
        <ScannerScreen
          onCancel={() => setScanning(false)}
          onScanned={({ code, format }) => {
            set({ code, format });
            setScanning(false);
            setStatus({ text: '読み取れました。番号が合っているか確かめてください。' });
          }}
        />
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (t) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 26, paddingBottom: 12 },
  headText: { color: t.ink, fontSize: 16, paddingVertical: 8 },
  title: { color: t.ink, fontSize: 17, fontWeight: '800' },
  saveBtn: { backgroundColor: t.accent, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999 },
  saveText: { color: t.accentInk, fontWeight: '700', fontSize: 15 },
  body: { paddingHorizontal: 16, paddingBottom: 48, gap: 18 },
  field: { gap: 6 },
  label: { color: t.ink, fontWeight: '700', fontSize: 13 },
  hint: { color: t.muted, fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: t.ink },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  seg: { flexDirection: 'row', backgroundColor: t.chip, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: t.surface },
  segText: { color: t.muted, fontWeight: '700', fontSize: 13 },
  segTextOn: { color: t.ink },
  status: { backgroundColor: t.chip, color: t.ink, padding: 10, borderRadius: 10, fontSize: 13, overflow: 'hidden' },
  statusErr: { backgroundColor: t.nearBg, color: t.near },
  primary: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: t.accentInk, fontWeight: '700', fontSize: 15 },
  tryBtn: { borderWidth: 2, borderColor: t.accent, backgroundColor: t.accent + '1A', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  tryText: { color: t.accent, fontWeight: '800', fontSize: 17 },
  tryHint: { color: t.muted, fontSize: 12, marginTop: 2 },
  secondary: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  secondaryText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  wideBtn: { alignSelf: 'stretch', justifyContent: 'center', paddingVertical: 15, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: t.accent, borderColor: t.accent },
  chipText: { color: t.ink, fontSize: 13 },
  chipTextOn: { color: t.accentInk, fontWeight: '700' },
  preview: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: t.line, alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pal: { width: 54, height: 34, borderRadius: 9, borderWidth: 3, borderColor: 'transparent', flexDirection: 'row', overflow: 'hidden' },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  confirm: { backgroundColor: t.nearBg, borderRadius: 10, padding: 12, gap: 10 },
  warn: { backgroundColor: t.nearBg, borderRadius: 10, padding: 12, gap: 8 },
  warnTitle: { color: t.near, fontWeight: '700', fontSize: 14 },
  warnText: { color: t.ink, fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  stepNum: { color: t.muted, fontWeight: '800', width: 18, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepDot: { width: 14, height: 14, borderRadius: 7 },
  stepName: { flex: 1, color: t.ink, fontSize: 15, fontWeight: '700' },
  iconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: t.ink, fontSize: 15, fontWeight: '700' },
  subLabel: { color: t.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
});
