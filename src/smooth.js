// One shared motion for layout changes: things fade in/out and the rest glides into place.
import { LayoutAnimation } from 'react-native';

export default function smooth(duration = 320) {
  LayoutAnimation.configureNext({
    duration,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.86 },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: Math.round(duration * 0.6) },
  });
}
