/**
 * One-line toasts by key (yard-stage1.md 5.2, 5.4): "Load full" when the load fills, and a refusal's line
 * ("Not enough cash: §12.00 more", "Needs a cutting torch") when an action is refused while no card is open
 * (an open card prints its own refusal on its button). One at a time, the newest replaces the old; it sits
 * at the foot of the free world, centred in the safe area, and never takes a touch.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { PAL } from '../palette';
import { useSalvageUi } from '../uiState';
import { lineH, type HudLayout } from './metrics';
import { BarText } from './Paper';
import { yardEvents } from './pump';
import { toastText } from './words';

export const TOAST_MS = 1800;

export function Toasts({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const [toast, setToast] = useState<{ id: number; text: string; refusal: boolean } | null>(null);
  const n = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = yardEvents.on(['loadFull', 'refused'], (e) => {
      const t = toastText(e, cfg.salvage, useSalvageUi.getState().stack.length > 0);
      if (!t) return;
      clearTimeout(timer);
      setToast({ id: ++n.current, ...t });
      timer = setTimeout(() => setToast(null), TOAST_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [cfg]);
  if (!toast) return null;
  const pt = 12 * L.s;
  const h = lineH(pt) + 12;
  return (
    <View pointerEvents="none" style={[styles.wrap, { left: L.left, width: L.right - L.left, top: L.bottomY - h - 10 }]}>
      <Animated.View key={toast.id} entering={FadeIn.duration(140)} exiting={FadeOut.duration(200)} style={[styles.toast, toast.refusal && styles.refusal]}>
        <BarText pt={pt} weight="800">
          {toast.text}
        </BarText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  toast: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5, maxWidth: 420 },
  refusal: { borderLeftWidth: 6, borderLeftColor: PAL.hivis },
});
