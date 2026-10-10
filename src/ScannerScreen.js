import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatFromScan } from './barcode';

const TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'codabar', 'itf14', 'qr', 'pdf417', 'datamatrix', 'aztec'];

export default function ScannerScreen({ onScanned, onCancel }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[s.root, s.center]}>
        <Text style={s.msg}>バーコードを読むにはカメラの許可が必要です。</Text>
        {permission.canAskAgain ? (
          <Pressable style={s.btn} onPress={requestPermission} accessibilityRole="button">
            <Text style={s.btnText}>カメラを許可する</Text>
          </Pressable>
        ) : (
          <Text style={s.msg}>設定アプリの「Poica」からカメラをオンにしてください。</Text>
        )}
        <Pressable style={[s.btn, s.ghost]} onPress={onCancel} accessibilityRole="button">
          <Text style={s.btnText}>戻る</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: TYPES }}
        onBarcodeScanned={(r) => {
          if (done.current || !r?.data) return;
          done.current = true;
          onScanned({ code: r.data, format: formatFromScan(r.type) });
        }}
      />
      <SafeAreaView style={s.overlay} pointerEvents="box-none">
        <Text style={s.hint}>カードのバーコードを枠に入れてください</Text>
        <View style={s.frame} pointerEvents="none" />
        <Pressable style={[s.btn, s.ghost]} onPress={onCancel} accessibilityRole="button">
          <Text style={s.btnText}>キャンセル</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  hint: { color: '#FFF', fontSize: 15, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  frame: { width: '84%', height: 180, borderWidth: 3, borderColor: '#3FC597', borderRadius: 16 },
  msg: { color: '#FFF', fontSize: 15, textAlign: 'center' },
  btn: { backgroundColor: '#0A7552', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 },
  ghost: { backgroundColor: 'rgba(255,255,255,0.18)' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
