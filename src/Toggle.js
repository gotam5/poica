// An iOS-style switch whose knob springs across and whose track color fades, instead of jumping.
import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

const W = 51;
const H = 31;
const KNOB = 27;

export default function Toggle({ value, t }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
  }, [value, anim]);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [t.line, t.accent] });
  const x = anim.interpolate({ inputRange: [0, 1], outputRange: [2, W - KNOB - 2] });
  const grow = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  return (
    <View pointerEvents="none">
      <Animated.View style={{ width: W, height: H, borderRadius: H / 2, backgroundColor: bg, justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#FFF',
            transform: [{ translateX: x }, { scaleX: grow }],
            shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          }}
        />
      </Animated.View>
    </View>
  );
}
