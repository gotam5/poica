// Drag-to-reorder in the same two-column layout as Home's card list.
// Each card has a grip at its top right; hold it and slide the card to its new place.
// No gesture library is installed, so this uses PanResponder with fixed-size slots.
import { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponder, StyleSheet, Text, View } from 'react-native';
import CardFace from './CardFace';
import { cardPalette } from './appLink';

const GAP = 10;
const H = 112;

export default function ReorderGrid({ cards, allCards, t, onChange, onDragging }) {
  const s = styles(t);
  const [list, setList] = useState(cards);
  const [width, setWidth] = useState(0);
  const [dragId, setDragId] = useState(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const st = useRef({ list: cards, start: { x: 0, y: 0 }, W: 0 });
  st.current.list = list;
  st.current.W = (width - GAP) / 2;
  st.current.onChange = onChange;
  st.current.onDragging = onDragging;

  const slot = (i) => ({ x: (i % 2) * (st.current.W + GAP), y: Math.floor(i / 2) * (H + GAP) });

  const responders = useRef(new Map()).current;
  const responderFor = (id) => {
    if (responders.has(id)) return responders.get(id);
    const r = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        const i = st.current.list.findIndex((c) => c.id === id);
        st.current.start = slot(i);
        pan.setValue({ x: 0, y: 0 });
        setDragId(id);
        st.current.onDragging && st.current.onDragging(true);
      },
      onPanResponderMove: (_, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        const { W, start } = st.current;
        const cur = st.current.list;
        const x = start.x + g.dx;
        const y = start.y + g.dy;
        const col = x > (W + GAP) / 2 ? 1 : 0;
        const row = Math.max(0, Math.round(y / (H + GAP)));
        const target = Math.min(cur.length - 1, row * 2 + col);
        const from = cur.findIndex((c) => c.id === id);
        if (target !== from) {
          LayoutAnimation.configureNext(LayoutAnimation.create(160, 'easeInEaseOut', 'opacity'));
          const next = [...cur];
          const [m] = next.splice(from, 1);
          next.splice(target, 0, m);
          st.current.list = next;
          setList(next);
        }
      },
      onPanResponderRelease: () => drop(id),
      onPanResponderTerminate: () => drop(id),
    });
    responders.set(id, r);
    return r;
  };

  const drop = (id) => {
    const i = st.current.list.findIndex((c) => c.id === id);
    const to = slot(i);
    const { start } = st.current;
    Animated.spring(pan, { toValue: { x: to.x - start.x, y: to.y - start.y }, useNativeDriver: false, speed: 24, bounciness: 4 }).start(() => {
      setDragId(null);
      pan.setValue({ x: 0, y: 0 });
      st.current.onDragging && st.current.onDragging(false);
      st.current.onChange && st.current.onChange(st.current.list.map((c) => c.id));
    });
  };

  const rows = Math.ceil(list.length / 2);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: rows * (H + GAP) - GAP }}>
      {width > 0 && list.map((c, i) => {
        const dragging = c.id === dragId;
        const pos = dragging ? st.current.start : slot(i);
        return (
          <Animated.View
            key={c.id}
            style={[
              s.cell,
              { width: st.current.W, left: pos.x, top: pos.y },
              dragging && { zIndex: 10, transform: [...pan.getTranslateTransform(), { scale: 1.04 }], ...s.lift },
            ]}
          >
            <CardFace card={c} palette={cardPalette(c, allCards || cards)} style={{ height: H, minHeight: H }} />
            <View {...responderFor(c.id).panHandlers} style={s.grip} hitSlop={8} accessibilityLabel={`${c.name}を動かす`}>
              <Text style={s.gripText}>≡</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = (t) => StyleSheet.create({
  cell: { position: 'absolute' },
  lift: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  grip: { position: 'absolute', top: 6, right: 6, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  gripText: { color: '#15211C', fontSize: 22, fontWeight: '900', lineHeight: 24 },
});
