// Soft color glows behind the screens, so the glass surfaces have something to frost.
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

export default function Backdrop({ t }) {
  const glows = t.dark
    ? [['a', '15%', '8%', '#1E7A5A', 0.55], ['b', '95%', '38%', '#2C4F9E', 0.4], ['c', '20%', '92%', '#5A3A8C', 0.35]]
    : [['a', '12%', '6%', '#7FD8B4', 0.55], ['b', '96%', '36%', '#A9C4FF', 0.5], ['c', '18%', '94%', '#FFD3A8', 0.45]];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {glows.map(([id, , , color, op]) => (
            <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={op} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={t.bg} />
        {glows.map(([id, x, y]) => (
          <Ellipse key={id} cx={x} cy={y} rx="75%" ry="40%" fill={`url(#${id})`} />
        ))}
      </Svg>
    </View>
  );
}
