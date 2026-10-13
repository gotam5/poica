// The small message near the bottom fades and lifts in, then fades out (keeping its text while it goes).
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';

export default function Toast({ text, style, textStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (text) {
      setShown(text);
      Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => finished && setShown(null));
    }
  }, [text, v]);
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="none" style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <Text style={textStyle}>{shown}</Text>
    </Animated.View>
  );
}
