// A slider that snaps to steps (no slider library is installed). Drag the knob or tap the track.
// onChange fires once, on release; the value shown follows the finger while dragging.
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

const KNOB = 28;

export default function StepSlider({ value, min, max, step, onChange, onDragging, t, unit = '' }) {
  const [w, setW] = useState(0);
  const [live, setLive] = useState(value);
  const st = useRef({ w: 0, startX: 0, v: value });
  useEffect(() => { setLive(value); st.current.v = value; }, [value]);
  st.current.w = w;

  const snap = (x) => {
    const span = Math.max(1, st.current.w - KNOB);
    const ratio = Math.min(1, Math.max(0, (x - KNOB / 2) / span));
    return Math.round((min + ratio * (max - min)) / step) * step;
  };
  const xOf = (v) => ((v - min) / (max - min)) * Math.max(0, w - KNOB);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      if (onDragging) onDragging(true);
      st.current.startX = e.nativeEvent.locationX;
      const v = snap(st.current.startX);
      st.current.v = v;
      setLive(v);
    },
    onPanResponderMove: (_, g) => {
      const v = snap(st.current.startX + g.dx);
      if (v !== st.current.v) { st.current.v = v; setLive(v); }
    },
    onPanResponderRelease: () => { if (onDragging) onDragging(false); onChange(st.current.v); },
    onPanResponderTerminate: () => { if (onDragging) onDragging(false); onChange(st.current.v); },
  })).current;

  const x = xOf(live);
  return (
    <View style={{ gap: 10, paddingVertical: 14 }}>
      <Text style={{ color: t.ink, fontSize: 28, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] }}>{live}<Text style={{ fontSize: 15, color: t.muted }}>{unit}</Text></Text>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: 40, justifyContent: 'center' }}
        accessible
        accessibilityRole="adjustable"
        accessibilityValue={{ text: `${live}${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={{ position: 'absolute', left: KNOB / 2, right: KNOB / 2, height: 6, borderRadius: 3, backgroundColor: t.track }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: KNOB / 2, width: x, height: 6, borderRadius: 3, backgroundColor: t.accent }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: x, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />
      </View>
      <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.muted, fontSize: 12 }}>{min}{unit}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{max}{unit}</Text>
      </View>
    </View>
  );
}
