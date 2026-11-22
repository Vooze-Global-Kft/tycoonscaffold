/**
 * The tutorial hand. Once a second it asks the engine what the player should do next
 * (guideHint), finds that control on screen (hintRoute: the control itself, else the chip, button
 * or tab that leads to it) and taps at it with a soft ring.
 *
 * It keeps out of the way: hidden while any dialog is up and for 600 ms after any touch, never
 * catches a touch itself, and plays its "psst" only when a NEW hint appears. When a hint's control
 * lives in another stage list it switches the list once per new hint, never again, so a player who
 * switched away is not fought.
 */
import { Canvas, Circle, Group, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { Stage } from '../../engine/chain';
import { guideHint, hintKey, type GuideHint } from '../../engine/view';
import { fx } from '../../services/fx';
import { useGame } from '../../state/store';
import { useHomeUi } from '../home/uiState';
import { useOverlaysOpen } from '../kit/overlay';
import { HandPointer } from '../sim/art';
import { useTheme } from '../theme';
import { hintRoute, targets, useFirstTarget } from './targets';

/** The canvas around the fingertip. */
const BOX = 120;
/** Targets that are drawings in the scene (no label to keep clear of). */
const SCENE_KEYS = ['tapStation', 'bell', 'startRush', 'openChest', 'missionsButton'];
/** After a touch the hand stays hidden this long. */
const QUIET_AFTER_TOUCH_MS = 600;

/** Which stage list holds a hint's own control (null = not in a stage list). */
function hintStage(h: GuideHint): Stage | null {
  switch (h.kind) {
    case 'buyBusiness':
    case 'hireBusiness':
      return 'production';
    case 'buyTransport':
    case 'hireTransport':
      return 'transport';
    case 'buySales':
      return 'sales';
    default:
      return null;
  }
}

/** Touches anywhere in the app: the shell's root view reports them here (see App.tsx). */
const touchListeners = new Set<() => void>();
export function reportTouch(): void {
  touchListeners.forEach((l) => l());
}

/** The engine's hint, asked once a second, with its route of target keys. */
function useHint(): { key: string; route: string[]; stage: Stage | null } | null {
  const [hint, setHint] = useState<{ key: string; route: string[]; stage: Stage | null } | null>(null);
  useEffect(() => {
    const ask = () => {
      const { cfg, game } = useGame.getState();
      let h: GuideHint | null = null;
      try {
        h = guideHint(cfg, game, Date.now());
        // TEMPORARY integration testing hook (web dev only, see src/ui/devHook.ts). REMOVE.
        if (__DEV__ && (globalThis as { __itfForceHint?: GuideHint }).__itfForceHint) h = (globalThis as { __itfForceHint?: GuideHint }).__itfForceHint ?? h;
      } catch {
        h = null;
      }
      const key = h ? hintKey(h) : null;
      setHint((prev) => (prev?.key === key ? prev : h && key ? { key, route: hintRoute(h), stage: hintStage(h) } : null));
    };
    ask();
    const timer = setInterval(ask, 1000);
    return () => clearInterval(timer);
  }, []);
  return hint;
}

/**
 * `inDialog`: the copy that the kit's Sheet renders inside its own window (a dialog covers the
 * shell's copy on phones). It points only at a control inside that dialog (the Claim button of a
 * mission, the Level up button of a card), and leaves the "psst" and the stage switch to the shell's copy.
 */
export function HintOverlay({ inDialog = false }: { inDialog?: boolean }) {
  const t = useTheme();
  const hint = useHint();
  const dialog = useGame((s) => s.modal !== null || s.chestOpening !== null || s.offline !== null || s.dealPopup !== null);
  const story = useHomeUi((s) => s.storyOpen);
  // Any dialog or full-screen overlay, including the ones screens open themselves.
  const overlaysOpen = useOverlaysOpen() > 0;
  const tab = useGame((s) => s.tab);
  const stage = useHomeUi((s) => s.stage);
  // Pointing at the tab or the stage chip the player is already on would say nothing.
  const route = useMemo(() => (hint ? hint.route.filter((k) => k !== `tab:${tab}` && !(tab === 'home' && k === `stage:${stage}`)) : []), [hint, tab, stage]);
  const anyFound = useFirstTarget(route);
  // In a dialog: only the control itself. In the shell: anything on the route.
  const found = inDialog ? (anyFound && hint && anyFound.key === hint.key ? anyFound : null) : anyFound;
  const lastKey = useRef<string | null>(null);

  // Rows inside scrolling lists move without a layout event: measure the route again each second.
  useEffect(() => {
    if (!hint) return;
    const refresh = () => hint.route.forEach((k) => targets.refresh(k));
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [hint]);

  // A new hint: switch the stage list once if its control is in another one, and say "psst" once.
  useEffect(() => {
    if (inDialog) return;
    if (!hint || hint.key === lastKey.current) {
      if (!hint) lastKey.current = null;
      return;
    }
    lastKey.current = hint.key;
    if (hint.stage && useGame.getState().tab === 'home') useHomeUi.getState().setStage(hint.stage);
    fx.play('hint');
  }, [hint, inDialog]);

  // Fade out on any touch, come back after a quiet moment.
  const shown = useSharedValue(0);
  const visible = inDialog ? !!found && !story : !!hint && !!found && !dialog && !story && !overlaysOpen;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    shown.value = visible ? withDelay(150, withTiming(1, { duration: 220 })) : withTiming(0, { duration: 120 });
  }, [visible, shown]);
  useEffect(() => {
    const onTouch = () => {
      shown.value = withTiming(0, { duration: 80 });
      if (visibleRef.current) shown.value = withDelay(QUIET_AFTER_TOUCH_MS, withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }));
    };
    touchListeners.add(onTouch);
    return () => {
      touchListeners.delete(onTouch);
    };
  }, [shown]);

  // Glide to a new target rather than jumping.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const placed = useRef(false);
  const rect = found?.rect;
  // Things drawn in the scene and tabs: their middle. Buttons and chips carry a label (often a
  // price): point at the right end, beside the words, so the hand, which hangs down and to the right of
  // its fingertip, never hides the words.
  const centred = !found || SCENE_KEYS.some((k) => found.key === k || found.key.startsWith(`${k}:`)) || found.key.startsWith('tab:');
  const tx = rect ? rect.x + rect.width * (centred ? 0.5 : 0.9) : 0;
  const ty = rect ? rect.y + rect.height * (centred ? 0.55 : 0.68) : 0;
  useEffect(() => {
    if (!rect) return;
    if (!placed.current) {
      x.value = tx;
      y.value = ty;
      placed.current = true;
    } else {
      x.value = withTiming(tx, { duration: 280, easing: Easing.out(Easing.cubic) });
      y.value = withTiming(ty, { duration: 280, easing: Easing.out(Easing.cubic) });
    }
  }, [rect, tx, ty, x, y]);

  const clock = useClock();
  // A smaller ring at a button's corner, so it does not wash over the price.
  const ringBase = centred ? 18 : 11;
  const ring = useDerivedValue(() => ringBase + (centred ? 10 : 7) * ((clock.value % 1100) / 1100));
  const ringOpacity = useDerivedValue(() => 0.55 * (1 - (clock.value % 1100) / 1100));
  const boxStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value - BOX / 2 }, { translateY: y.value - BOX / 2 }] }));

  // On the tab bar the hand comes from above so it never leaves the screen; on the skill button
  // too, so it does not hide the button's name under it.
  const fromAbove = !!found && (found.key.startsWith('tab:') || found.key === 'startRush');
  if (!hint) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">
      <Animated.View style={[styles.box, boxStyle]} pointerEvents="none">
        <Canvas style={styles.canvas} pointerEvents="none">
          <Group>
            <Circle cx={BOX / 2} cy={BOX / 2} r={ring} color={t.c.accent} opacity={ringOpacity} style="stroke" strokeWidth={6} />
            <Circle cx={BOX / 2} cy={BOX / 2} r={ring} color="#FFFFFF" opacity={ringOpacity} style="stroke" strokeWidth={2.5} />
            <Circle cx={BOX / 2} cy={BOX / 2} r={centred ? 16 : 10} color={t.c.accent} opacity={0.25} />
          </Group>
          <HandPointer x={BOX / 2} y={BOX / 2} clock={clock} scale={1.15} angle={fromAbove ? 160 : 25} />
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The top of everything in the shell (dialogs are separate windows and hide the hand anyway).
  layer: { zIndex: 1200, elevation: 32 },
  box: { position: 'absolute', left: 0, top: 0, width: BOX, height: BOX },
  canvas: { width: BOX, height: BOX },
});
