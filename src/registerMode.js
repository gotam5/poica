import { useEffect } from 'react';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';

// While a code is on screen: keep the screen on and turn brightness up, then put it back.
export function useRegisterMode() {
  useKeepAwake();
  useEffect(() => {
    let previous = null;
    let cancelled = false;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (previous != null) Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);
}
