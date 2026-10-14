// A slider that snaps to steps (no slider library is installed). Drag the knob or tap the track.
// onChange fires once, on release; onMove (optional) follows the finger. compact: no big number or end labels.
// colors: draw the track as a gradient (e.g. dark to light) instead of a filled bar.
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const KNOB = 28;

export default function StepSlider({ value, min, max, step, onChange, onMove, onDragging, t, unit = '', compact = false, colors }) {
  const [w, setW] = useState(0);
  const [live, setLive] = useState(value);
  const st = useRef({ w: 0, startX: 0, v: value });
  const gid = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;
  const move = useRef(onMove);
  move.current = onMove;
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
      if (move.current) move.current(v);
    },
    onPanResponderMove: (_, g) => {
      const v = snap(st.current.startX + g.dx);
      if (v !== st.current.v) { st.current.v = v; setLive(v); if (move.current) move.current(v); }
    },
    onPanResponderRelease: () => { if (onDragging) onDragging(false); onChange(st.current.v); },
    onPanResponderTerminate: () => { if (onDragging) onDragging(false); onChange(st.current.v); },
  })).current;

  const x = xOf(live);
  return (
    <View style={{ gap: compact ? 0 : 10, paddingVertical: compact ? 0 : 14 }}>
      {!compact && <Text style={{ color: t.ink, fontSize: 28, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] }}>{live}<Text style={{ fontSize: 15, color: t.muted }}>{unit}</Text></Text>}
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: compact ? 34 : 40, justifyContent: 'center' }}
        accessible
        accessibilityRole="adjustable"
        accessibilityValue={{ text: `${live}${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? step : -step))))}
        {...pan.panHandlers}
      >
        {colors ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: KNOB / 2, right: KNOB / 2, height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                  {colors.map((c, i) => <Stop key={i} offset={colors.length > 1 ? i / (colors.length - 1) : 0} stopColor={c} />)}
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
            </Svg>
          </View>
        ) : (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', left: KNOB / 2, right: KNOB / 2, height: 6, borderRadius: 3, backgroundColor: t.track }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: KNOB / 2, width: x, height: 6, borderRadius: 3, backgroundColor: t.accent }} />
          </>
        )}
        <View pointerEvents="none" style={{ position: 'absolute', left: x, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' }} />
      </View>
      {!compact && <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.muted, fontSize: 12 }}>{min}{unit}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{max}{unit}</Text>
      </View>}
    </View>
  );
}
