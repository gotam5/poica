import { Pressable, StyleSheet, Text, View } from 'react-native';

// Actions for the full-screen card views sit at the bottom, where the thumb reaches.
export default function BottomBar({ onClose, onEdit }) {
  return (
    <View style={s.bar}>
      <Pressable onPress={onEdit} style={({ pressed }) => [s.btn, s.edit, pressed && s.pressed]} accessibilityRole="button">
        <Text style={s.editText}>編集</Text>
      </Pressable>
      <Pressable onPress={onClose} style={({ pressed }) => [s.btn, s.close, pressed && s.pressed]} accessibilityRole="button">
        <Text style={s.closeText}>閉じる</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#ECECEC', backgroundColor: '#FFFFFF' },
  btn: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  edit: { flex: 1, borderWidth: 1, borderColor: '#D9D9D9' },
  close: { flex: 2, backgroundColor: '#15211C' },
  pressed: { opacity: 0.7 },
  editText: { fontSize: 16, fontWeight: '700', color: '#111' },
  closeText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
});
