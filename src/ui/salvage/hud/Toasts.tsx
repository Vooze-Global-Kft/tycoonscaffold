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
import { barValues, heldRefusal, say, toastText } from './words';
import { useGame } from '../../../state/store';

export const TOAST_MS = 1800;
/** Passing a rival stays two seconds (finding P16). */
export const PASSED_MS = 2000;

export function Toasts({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const [toast, setToast] = useState<{ id: number; text: string; refusal: boolean } | null>(null);
  const n = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (t: { text: string; refusal: boolean }, ms: number) => {
      clearTimeout(timer);
      setToast({ id: ++n.current, ...t });
      timer = setTimeout(() => setToast(null), ms);
    };
    // owner1 T4 (screens1 n7): a refusal the boss's act now HOLDS (a skip he cannot hook, a load not weighed at
    // the floor) is shown by the tag beside the one button for as long as it holds, not as a passing toast too:
    // the toast waits a moment (the state that holds it may land just after the event) and is dropped when the
    // tag carries the same words.
    let held: ReturnType<typeof setTimeout> | undefined;
    const off = yardEvents.on(['loadFull', 'refused'], (e) => {
      const t = toastText(e, cfg.salvage, useSalvageUi.getState().stack.length > 0);
      if (!t) return;
      if (!t.refusal) return show(t, TOAST_MS);
      clearTimeout(held);
      held = setTimeout(() => {
        if (heldRefusal(cfg, useGame.getState().game as R.SalvageGame) !== t.text) show(t, TOAST_MS);
      }, 80);
    });
    // Passing a rival (P16): "You passed {rival} · 25th of 26" for two seconds, after any open card.
    let waiting: string | null = null;
    const flush = () => {
      if (!waiting || useSalvageUi.getState().stack.length > 0) return;
      const text = waiting;
      waiting = null;
      show({ text, refusal: false }, PASSED_MS);
    };
    const offPassed = yardEvents.on('passed', (e) => {
      const g = useGame.getState().game as R.SalvageGame;
      const of = barValues(cfg, g).of;
      waiting = passedText(e, of, cfg.salvage);
      flush();
    });
    const offUi = useSalvageUi.subscribe(flush);
    return () => {
      off();
      offPassed();
      offUi();
      clearTimeout(timer);
      clearTimeout(held);
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

/** The words of the passed line (P16; the key is the words fixer's). */
export function passedText(e: { rival: string; rank: number }, of: number, c: R.SalvageContent): string {
  return say({ key: 'passedToast', args: { rival: { name: `${e.rival}.chip` }, rank: { rank: e.rank }, n: { n: of } } }, c);
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  toast: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5, maxWidth: 420 },
  refusal: { borderLeftWidth: 6, borderLeftColor: PAL.hivis },
});
