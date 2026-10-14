// The frosted "glass" look of current iOS. On iOS 26+ it is the system's Liquid Glass;
// on older iOS a blur with a thin bright edge stands in for it.
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

let LIQUID = false;
try { LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable(); } catch { LIQUID = false; }

export default function Glass({ t, style, children, interactive = false, tint, pointerEvents }) {
  if (LIQUID) {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme={t.dark ? 'dark' : 'light'} pointerEvents={pointerEvents}>
        {children}
      </GlassView>
    );
  }
  const flat = StyleSheet.flatten(style) || {};
  return (
    <View style={[style, s.wrap, { borderColor: t.glassEdge }]} pointerEvents={pointerEvents}>
      <BlurView intensity={t.dark ? 40 : 55} tint={t.dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={[StyleSheet.absoluteFill, { borderRadius: flat.borderRadius }]} />
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.18 }]} /> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
