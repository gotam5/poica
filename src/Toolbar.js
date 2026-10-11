import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

// Bottom tabs: ホーム / マップ / 記録 / 設定.
export default function Toolbar({ t, active, onChange }) {
  const insets = useSafeAreaInsets();
  const s = styles(t);
  const item = (key, label, Icon) => {
    const on = active === key;
    const color = on ? t.accent : t.muted;
    return (
      <Pressable key={key} onPress={() => onChange(key)} style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} hitSlop={4}>
        <Icon c={color} />
        <Text style={[s.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {item('home', 'ホーム', HomeIcon)}
      {item('map', 'マップ', MapIcon)}
      {item('stats', '記録', ChartIcon)}
      {item('settings', '設定', GearIcon)}
    </View>
  );
}

const icon = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const HomeIcon = ({ c }) => <Svg {...icon} stroke={c}><Path d="M3 11l9-7 9 7" /><Path d="M5 10v10h14V10" /><Path d="M10 20v-6h4v6" /></Svg>;
const MapIcon = ({ c }) => <Svg {...icon} stroke={c}><Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><Path d="M9 4v14" /><Path d="M15 6v14" /></Svg>;
const ChartIcon = ({ c }) => <Svg {...icon} stroke={c}><Path d="M4 20h16" /><Path d="M7 16v-5" /><Path d="M12 16V7" /><Path d="M17 16v-8" /></Svg>;
const GearIcon = ({ c }) => (
  <Svg {...icon} stroke={c}>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);

const styles = (t) => StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 6, paddingHorizontal: 4, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  label: { fontSize: 11, fontWeight: '700' },
});
