// Drag-to-reorder for a short one-column list (the ホーム sections).
// Hold the ≡ grip on the left of a row and slide it up or down. PanResponder with fixed-height rows.
import { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponder, StyleSheet, Text, View } from 'react-native';

export const ROW_H = 56;

export default function ReorderList({ items, renderRow, onChange, onDragging, t, labelOf }) {
  const s = styles(t);
  const [list, setList] = useState(items);
  const [dragKey, setDragKey] = useState(null);
  const pan = useRef(new Animated.Value(0)).current;
  const st = useRef({ list: items, start: 0 });
  st.current.list = list;
  st.current.onChange = onChange;
  st.current.onDragging = onDragging;

  const responders = useRef(new Map()).current;
  const responderFor = (key) => {
    if (responders.has(key)) return responders.get(key);
    const r = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        st.current.start = st.current.list.indexOf(key) * ROW_H;
        st.current.dragKey = key;
        pan.setValue(0);
        setDragKey(key);
        st.current.onDragging && st.current.onDragging(true);
      },
      onPanResponderMove: (_, g) => {
        pan.setValue(g.dy);
        const cur = st.current.list;
        const target = Math.max(0, Math.min(cur.length - 1, Math.round((st.current.start + g.dy) / ROW_H)));
        const from = cur.indexOf(key);
        if (target !== from) {
          LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
          const next = [...cur];
          next.splice(from, 1);
          next.splice(target, 0, key);
          st.current.list = next;
          setList(next);
        }
      },
      onPanResponderRelease: () => drop(),
      onPanResponderTerminate: () => drop(),
    });
    responders.set(key, r);
    return r;
  };

  const drop = () => {
    const key = dragKeyRef();
    const to = st.current.list.indexOf(key) * ROW_H;
    Animated.spring(pan, { toValue: to - st.current.start, useNativeDriver: false, speed: 24, bounciness: 4 }).start(() => {
      setDragKey(null);
      pan.setValue(0);
      st.current.onDragging && st.current.onDragging(false);
      st.current.onChange && st.current.onChange(st.current.list);
    });
  };
  const dragKeyRef = () => st.current.dragKey;
  st.current.dragKey = dragKey;

  return (
    <View style={{ height: list.length * ROW_H }}>
      {list.map((key, i) => {
        const dragging = key === dragKey;
        return (
          <Animated.View
            key={key}
            style={[
              s.row,
              { top: dragging ? st.current.start : i * ROW_H },
              i < list.length - 1 && !dragging && s.line,
              dragging && { zIndex: 10, transform: [{ translateY: pan }, { scale: 1.02 }], ...s.lift },
            ]}
          >
            <View {...responderFor(key).panHandlers} style={s.grip} hitSlop={8} accessibilityLabel={`${labelOf ? labelOf(key) : key}を動かす`}>
              <Text style={s.gripText}>≡</Text>
            </View>
            {renderRow(key)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface },
  line: { borderBottomWidth: 1, borderBottomColor: t.line },
  lift: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, borderRadius: 10 },
  grip: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  gripText: { color: t.muted, fontSize: 22, fontWeight: '900' },
});
