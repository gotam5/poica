import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

// Home's bottom toolbar: ホーム / 探す / 現在地 / 設定.
export default function Toolbar({ t, active, onHome, onSearch, onLocate, onSettings }) {
  const insets = useSafeAreaInsets();
  const s = styles(t);
  const item = (key, label, icon, onPress) => {
    const on = active === key;
    const color = on ? t.accent : t.muted;
    return (
      <Pressable key={key} onPress={onPress} style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} hitSlop={4}>
        {icon(color)}
        <Text style={[s.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {item('home', 'ホーム', (c) => <HomeIcon c={c} />, onHome)}
      {item('search', '探す', (c) => <SearchIcon c={c} />, onSearch)}
      {item('locate', '現在地', (c) => <PinIcon c={c} />, onLocate)}
      {item('settings', '設定', (c) => <GearIcon c={c} />, onSettings)}
    </View>
  );
}

const icon = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const HomeIcon = ({ c }) => <Svg {...icon} stroke={c}><Path d="M3 11l9-7 9 7" /><Path d="M5 10v10h14V10" /><Path d="M10 20v-6h4v6" /></Svg>;
const SearchIcon = ({ c }) => <Svg {...icon} stroke={c}><Circle cx="11" cy="11" r="7" /><Path d="M20 20l-4-4" /></Svg>;
const PinIcon = ({ c }) => <Svg {...icon} stroke={c}><Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><Circle cx="12" cy="9.5" r="2.5" /></Svg>;
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
