// Reading a card into Poica: barcode from a screenshot or the camera, and an optional photo of the card.
// Shared by the step-by-step 「自分でカードを作る」 flow and the card editor.
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { scanFromURLAsync } from 'expo-camera';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BarcodeView from './BarcodeView';
import ScannerScreen from './ScannerScreen';
import { photoUri } from './storage';
import { base64ToBytes, decodeBarcodeImage } from './decodeImage';

// draft.photo is either a saved file name, or { temp: uri } for a newly taken photo not yet saved.
export function useCapture(set) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(null); // { text, error, toApp }
  const [reading, setReading] = useState(false);
  const [shotCode, setShotCode] = useState(null); // code read from the first screenshot, for the "changes over time?" check

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
      setShotCode(null);
      if (found.code === shotCode) return setStatus({ text: '2枚とも同じ番号でした。時間で変わらないバーコードなので、Poicaから出せます。' });
      return setStatus({ text: '2枚で番号が違いました。時間で変わるバーコードなので、Poicaからは出せません。「公式アプリ」として登録してください。', error: true, toApp: true });
    }
    set({ code: found.code, format: found.format, source: 'screenshot' });
    setShotCode(found.code);
    setStatus({ text: '読み取れました。番号が合っているか確かめてください。' });
  };

  const onScanned = ({ code, format }) => {
    set({ code, format });
    setScanning(false);
    setStatus({ text: '読み取れました。番号が合っているか確かめてください。' });
  };

  return { scanning, setScanning, status, setStatus, reading, shotCode, pickPhoto, readScreenshot, onScanned };
}

// What the barcode step shows: read buttons, the read code, and an optional photo.
// onToApp: offered when the barcode turns out to change over time.
export function CaptureSection({ d, set, cap, t, width, onToApp, showPhoto = true }) {
  const s = styles(t);
  const photoSource = d.photo ? { uri: typeof d.photo === 'object' ? d.photo.temp : photoUri(d.photo) } : null;
  const code = (d.code || '').trim();
  return (
    <View style={{ gap: 14 }}>
      <View style={s.row}>
        <Pressable onPress={() => cap.readScreenshot(false)} disabled={cap.reading} style={({ pressed }) => [s.primary, { flex: 1 }, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.primaryText}>スクショから読む</Text>
        </Pressable>
        <Pressable onPress={() => cap.setScanning(true)} disabled={cap.reading} style={({ pressed }) => [s.secondary, { flex: 1 }, pressed && s.pressed]} accessibilityRole="button">
          <Text style={s.secondaryText}>カメラで読む</Text>
        </Pressable>
      </View>
      <Text style={s.hint}>公式アプリの会員証画面をスクショして選ぶと、バーコードを読み取ります。プラスチックのカードはカメラで読めます。</Text>

      {cap.reading && (
        <View style={[s.row, { alignItems: 'center' }]}><ActivityIndicator color={t.accent} /><Text style={s.hint}>スクショを読み取っています…</Text></View>
      )}
      {cap.status && <Text style={[s.status, cap.status.error && s.statusErr]}>{cap.status.text}</Text>}
      {cap.status?.toApp && onToApp && (
        <Pressable onPress={() => { onToApp(); cap.setStatus(null); }} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
          <Text style={s.secondaryText}>公式アプリとして登録する</Text>
        </Pressable>
      )}

      {code ? (
        <View style={s.preview}>
          <BarcodeView code={code} format={d.format} width={width - 56} height={90} />
          <Text style={s.num} selectable>{code}</Text>
        </View>
      ) : null}
      {code && cap.shotCode ? (
        <View style={s.warn}>
          <Text style={s.warnText}>時間で変わるバーコードだと、レジで使えません。少し時間をおいてから公式アプリでもう一度スクショを撮り、同じ番号か確かめられます。</Text>
          <Pressable onPress={() => cap.readScreenshot(true)} disabled={cap.reading} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
            <Text style={s.secondaryText}>2枚目のスクショで確かめる</Text>
          </Pressable>
        </View>
      ) : null}
      {code ? (
        <Pressable onPress={() => { set({ code: '' }); cap.setStatus(null); }} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button">
          <Text style={s.secondaryText}>バーコードを外す</Text>
        </Pressable>
      ) : null}

      {showPhoto && (
        <View style={{ gap: 6 }}>
          <Text style={s.label}>カードの写真(任意)</Text>
          <View style={s.row}>
            <Pressable onPress={() => cap.pickPhoto(true)} style={[s.secondary, { flex: 1 }]} accessibilityRole="button"><Text style={s.secondaryText}>カメラで撮る</Text></Pressable>
            <Pressable onPress={() => cap.pickPhoto(false)} style={[s.secondary, { flex: 1 }]} accessibilityRole="button"><Text style={s.secondaryText}>写真を選ぶ</Text></Pressable>
          </View>
          <Text style={s.hint}>バーコードが読めないカードやスタンプカードは、写真だけでも登録できます。</Text>
          {photoSource && (
            <>
              <View style={s.preview}><Image source={photoSource} style={{ width: '100%', height: 220 }} resizeMode="contain" /></View>
              <Pressable onPress={() => set({ photo: null })} style={[s.secondary, { alignSelf: 'flex-start' }]} accessibilityRole="button"><Text style={s.secondaryText}>写真を外す</Text></Pressable>
            </>
          )}
        </View>
      )}

      <Modal visible={cap.scanning} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => cap.setScanning(false)}>
        <SafeAreaProvider>
          <ScannerScreen onCancel={() => cap.setScanning(false)} onScanned={cap.onScanned} />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { color: t.ink, fontWeight: '700', fontSize: 13 },
  hint: { color: t.muted, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.6 },
  primary: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: t.accentInk, fontWeight: '700', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  secondaryText: { color: t.ink, fontWeight: '700', fontSize: 14 },
  status: { backgroundColor: t.chip, color: t.ink, padding: 10, borderRadius: 10, fontSize: 13, overflow: 'hidden' },
  statusErr: { backgroundColor: t.nearBg, color: t.near },
  preview: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: t.line, alignItems: 'center', gap: 6 },
  num: { color: '#15211C', fontSize: 15, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  warn: { backgroundColor: t.nearBg, borderRadius: 10, padding: 12, gap: 8 },
  warnText: { color: t.ink, fontSize: 13, lineHeight: 19 },
});
