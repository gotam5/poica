import { useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRegisterMode } from './registerMode';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarcodeView from './BarcodeView';
import BottomBar from './BottomBar';
import { photoUri } from './storage';
import { appMode, catalogApp, isStoreUrl, launchUrl, openCardApp } from './appLink';

export function mapsUrl(name) {
  const q = encodeURIComponent(name);
  return Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// Full-screen, always white, brightness up: what you hold out at the register.
export default function ShowScreen({ card, openFailed, hasPosition, onClose, onRememberHere, onForget, onSetupShortcut, onOpened }) {
  useRegisterMode();
  const { width } = useWindowDimensions();
  const [appError, setAppError] = useState(!!openFailed);

  const places = (card.places || []).length;
  const codeWidth = Math.min(width - 32, 460);

  const appLink = card.kind === 'app' ? launchUrl(card) : null;
  const viaShortcut = card.kind === 'app' && appMode(card) === 'shortcut';
  const appName = catalogApp(card.catalogId)?.name || card.name;
  const shortcutName = viaShortcut && card.shortcutName ? card.shortcutName : `${appName}を開く`;
  const openApp = async () => {
    setAppError(false);
    const ok = await openCardApp(card);
    if (!ok) setAppError(true);
    else if (onOpened) onOpened();
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[s.body, { paddingTop: 20 }]}>
        <Text style={s.name}>{card.name}</Text>

        {(card.kind === 'barcode' || card.kind === 'photo') && (
          <View style={[s.codeBox, { gap: 14 }]}>
            {card.kind === 'barcode' && card.code ? <BarcodeView code={card.code} format={card.format} width={codeWidth} /> : null}
            {card.code ? <Text style={s.num} selectable>{card.code}</Text> : null}
            {card.photo ? (
              <Image source={{ uri: photoUri(card.photo) }} style={{ width: codeWidth, height: codeWidth * 0.75 }} resizeMode="contain" accessibilityLabel={`${card.name}のカードの写真`} />
            ) : null}
          </View>
        )}

        {card.kind === 'app' && appError && (
          <View style={s.fail}>
            <Text style={s.failTitle}>{card.name}を開けませんでした</Text>
            <Text style={s.failText}>{viaShortcut
              ? `ショートカット「${card.shortcutName}」が見つからないか、うまく動きませんでした。カードの編集で、ショートカットの名前と作り方を確かめてください。`
              : 'アプリが入っていないか、Poicaから直接は開けないアプリのようです。iPhoneの「ショートカット」アプリを使うと、確実に開けるようになります。'}</Text>
            {onSetupShortcut && (
              <Pressable onPress={() => onSetupShortcut(shortcutName)} style={[s.bigBtn, s.wide]} accessibilityRole="button">
                <Text style={s.bigBtnText}>ショートカットで開くように設定する</Text>
              </Pressable>
            )}
            <Pressable onPress={openApp} style={[s.outlineBtn, s.wide]} accessibilityRole="button">
              <Text style={s.outlineText}>もう一度開いてみる</Text>
            </Pressable>
          </View>
        )}

        {card.kind === 'app' && !appError && (
          <View style={[s.codeBox, { gap: 14 }]}>
            {appLink ? (
              <>
                <Pressable onPress={openApp} style={s.bigBtn} accessibilityRole="button">
                  <Text style={s.bigBtnText}>{card.name}のアプリを開く</Text>
                </Pressable>
                <Text style={s.muted}>{appMode(card) === 'catalog' ? `${catalogApp(card.catalogId)?.name || ''}のアプリを直接開きます` : viaShortcut ? `ショートカット「${card.shortcutName}」で開きます` : appLink}</Text>
                {isStoreUrl(appLink) && <Text style={s.err}>App Storeのリンクなので、ストアが開きます。ホームでカードを長押しし、開き方を変えると直接開けます。</Text>}
              </>
            ) : (
              <Text style={s.muted}>アプリの開き方が未登録です。ホームでカードを長押しして追加できます。</Text>
            )}
            {card.code ? <Text style={s.num} selectable>{card.code}</Text> : null}
          </View>
        )}

        {!(card.kind === 'app' && appError) && <View style={s.meta}>
          <Text style={s.muted}>{places ? `覚えた場所 ${places}か所` : 'まだ場所を覚えていません'}</Text>
          <View style={s.row}>
            {hasPosition && (
              <Pressable onPress={onRememberHere} style={s.small} accessibilityRole="button">
                <Text style={s.smallText}>ここをこの店として覚える</Text>
              </Pressable>
            )}
            {places > 0 && (
              <Pressable onPress={onForget} style={s.small} accessibilityRole="button">
                <Text style={s.smallText}>覚えた場所を消す</Text>
              </Pressable>
            )}
            {places === 0 && (
              <Pressable onPress={() => Linking.openURL(mapsUrl(card.name)).catch(() => {})} style={s.small} accessibilityRole="button">
                <Text style={s.smallText}>近くの「{card.name}」を地図で探す</Text>
              </Pressable>
            )}
          </View>
        </View>}
      </ScrollView>
      <BottomBar onClose={onClose} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  outline: { borderWidth: 1, borderColor: '#D9D9D9' },
  headBtnText: { fontSize: 15, fontWeight: '700', color: '#111' },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 18 },
  name: { fontSize: 26, fontWeight: '900', textAlign: 'center', color: '#111' },
  codeBox: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  num: { fontSize: 20, letterSpacing: 2, color: '#111', fontVariant: ['tabular-nums'], fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'center' },
  bigBtn: { backgroundColor: '#0A7552', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 14 },
  bigBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  url: { fontSize: 12, color: '#444', backgroundColor: '#F2F2F2', padding: 8, borderRadius: 6 },
  fail: { gap: 14, paddingVertical: 8 },
  failTitle: { fontSize: 20, fontWeight: '900', color: '#C2412D', textAlign: 'center' },
  failText: { fontSize: 15, color: '#333', lineHeight: 22 },
  wide: { alignSelf: 'stretch', alignItems: 'center' },
  outlineBtn: { borderWidth: 1, borderColor: '#D0D5D3', borderRadius: 14, paddingVertical: 15 },
  outlineText: { fontSize: 16, fontWeight: '700', color: '#111' },
  err: { color: '#C2412D', fontSize: 13, textAlign: 'center' },
  meta: { borderTopWidth: 1, borderTopColor: '#E6E6E6', paddingTop: 14, gap: 10 },
  muted: { color: '#666', fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  smallText: { fontSize: 13, fontWeight: '700', color: '#111' },
});
