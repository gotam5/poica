import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

const IMAGES = [
  require('../assets/shortcut-guide/1.jpg'),
  require('../assets/shortcut-guide/2.jpg'),
  require('../assets/shortcut-guide/3.jpg'),
  require('../assets/shortcut-guide/4.jpg'),
  require('../assets/shortcut-guide/5.jpg'),
  require('../assets/shortcut-guide/6.jpg'),
  require('../assets/shortcut-guide/7.jpg'),
];

// Swipeable step-by-step screenshots of making an "open app" shortcut in the Shortcuts app (Vポイント as the example).
export default function ShortcutGuide({ appName, shortcutName, t }) {
  const [boxW, setBoxW] = useState(0);
  const side = boxW > W ? (boxW - W) / 2 : 0; // pad so the current step sits in the middle
  const app = appName || '開きたいアプリ';
  const name = shortcutName || `${app}を開く`;
  const captions = [
    '「ショートカット」アプリを開き、下の「＋」を押す',
    '「アプリを開く」を押す',
    '青い「アプリ」の部分を押す',
    `一覧から「${app}」を選ぶ`,
    '上のショートカット名の「⌄」を押し、「名称変更」を選ぶ',
    `名前を「${name}」にして「完了」`,
    'Poicaから初めて開くときに聞かれたら「常に許可」',
  ];
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.swipe, t && { color: t.muted }]}>横にスワイプして手順を見られます(画面はVポイントの例です)</Text>
      <ScrollView horizontal onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} showsHorizontalScrollIndicator={false} snapToInterval={W + GAP} decelerationRate="fast" disableIntervalMomentum contentContainerStyle={{ gap: GAP, paddingHorizontal: side }}>
        {IMAGES.map((src, i) => (
          <View key={i} style={s.step}>
            <View style={s.head}>
              <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
              <Text style={[s.caption, t && { color: t.ink }]}>{captions[i]}</Text>
            </View>
            <Image source={src} style={s.img} resizeMode="cover" accessibilityLabel={`手順${i + 1}: ${captions[i]}`} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const W = 210;
const GAP = 12;
const s = StyleSheet.create({
  swipe: { fontSize: 12, color: '#666', textAlign: 'center' },
  step: { width: W, gap: 8 },
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', minHeight: 54 },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF9500', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  caption: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111', lineHeight: 19 },
  img: { width: W, height: W * (1041 / 480), borderRadius: 16, backgroundColor: '#000' },
});
