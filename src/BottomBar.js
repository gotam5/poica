import { Pressable, StyleSheet, Text, View } from 'react-native';

// The close button sits at the bottom, full width, where the thumb reaches.
export default function BottomBar({ onClose }) {
  return (
    <View style={s.bar}>
      <Pressable onPress={onClose} style={({ pressed }) => [s.close, pressed && s.pressed]} accessibilityRole="button" hitSlop={8}>
        <Text style={s.closeText}>閉じる</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#ECECEC', backgroundColor: '#FFFFFF' },
  close: { height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15211C' },
  pressed: { opacity: 0.7 },
  closeText: { fontSize: 19, fontWeight: '800', color: '#FFF' },
});
