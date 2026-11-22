/**
 * The tutorial hand. Once a second it asks the mode's hint source (src/ui/hints/source.ts; the list
 * homes use the engine's guideHint, src/ui/home/hints.ts) what the player should do next, finds that
 * control on screen (its route: the control itself, else the chip, button or tab that leads to it)
 * and taps at it with a soft ring.
 *
 * It only points at what the player can see: a control scrolled out of its list or hidden under
 * the tab bar counts as not there. A row below the fold is scrolled into view once per new hint;
 * until then the hand points at the next control on the route. When nothing on a hint's route is
 * on screen, the hand moves on to the next hint the engine offers (if it offers more than one)
 * rather than showing nothing.
 *
 * It keeps out of the way: hidden while any dialog is up and for 600 ms after any touch, never
 * catches a touch itself, and plays its "psst" only when a NEW hint appears. It taps for a few
 * seconds, then rests half-faded and still (no animation while it waits), and taps again a little
 * later. When a hint's control lives in another list the source may switch the list once per new
 * hint, never again, so a player who switched away is not fought.
 */
import { Canvas, Circle, Group, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { useShellFlags } from '../../state/overlays';
import { fx } from '../../services/fx';
import { useGame } from '../../state/store';
import { useOverlaysOpen } from '../kit/overlay';
import { modeParts } from '../modeParts';
import { useTheme } from '../theme';
import { hintSource, type Hint } from './source';
import { targets, type TargetRect } from './targets';

/** The canvas around the fingertip. */
const BOX = 120;
/** After a touch the hand stays hidden this long. */
const QUIET_AFTER_TOUCH_MS = 600;
/** The hand taps this long, then rests still and half-faded for REST_MS, then taps again. */
const TAP_MS = 6000;
const REST_MS = 9000;
/** The shell's content area (between the header and the banner or tab bar), registered by App.tsx. */
export const CONTENT_KEY = 'shell:content';

const NOWHERE = () => false;

/** The source's "already there" test (a hook of the source, or none). The source never changes while the app runs. */
function useIsHere(): (key: string) => boolean {
  const use = hintSource()?.useIsHere;
  return use ? use() : NOWHERE;
}

/** Touches anywhere in the app: the shell's root view reports them here (see App.tsx). */
const touchListeners = new Set<() => void>();
export function reportTouch(): void {
  touchListeners.forEach((l) => l());
}

/** The mode's hints, asked once a second, each with its route of target keys. */
function useHints(): Hint[] {
  const [hints, setHints] = useState<Hint[]>([]);
  useEffect(() => {
    const ask = () => {
      let next: Hint[] = [];
      try {
        next = hintSource()?.ask() ?? [];
      } catch {
        next = [];
      }
      setHints((prev) => (prev.length === next.length && prev.every((p, i) => p.key === next[i].key) ? prev : next));
    };
    ask();
    const timer = setInterval(ask, 1000);
    return () => clearInterval(timer);
  }, []);
  return hints;
}

/** Tabs and header counters are always on screen; everything else must lie inside the content area. */
function onScreen(key: string, rect: TargetRect, content: TargetRect | null, winW: number): boolean {
  if (key.startsWith('tab:') || key.startsWith('header:')) return true;
  if (rect.x + rect.width * 0.5 < 0 || rect.x + rect.width * 0.5 > winW) return false;
  if (!content) return true;
  return rect.y >= content.y - 2 && rect.y + rect.height <= content.y + content.height + 2;
}

/**
 * The controls that live inside a dialog. The dialog's copy of the hand points only at these: any
 * other target belongs to the shell behind the dialog (a Hire button on home, say), and the
 * dialog's copy is drawn above everything.
 */
const DIALOG_KEYS = ['claimMission', 'levelUpCard'];

/**
 * `inDialog`: the copy that the kit's Sheet renders inside its own window (a dialog covers the
 * shell's copy on phones). It points only at a control inside that dialog (the Claim button of a
 * mission, the Level up button of a card), and leaves the "psst" and the stage switch to the shell's copy.
 */
export function HintOverlay({ inDialog = false }: { inDialog?: boolean }) {
  const hints = useHints();
  const dialog = useGame((s) => s.modal !== null || s.chestOpening !== null || s.offline !== null || s.dealPopup !== null);
  const story = useShellFlags((s) => s.storyOpen);
  // Any dialog or full-screen overlay, including the ones screens open themselves.
  const overlaysOpen = useOverlaysOpen() > 0;
  const tab = useGame((s) => s.tab);
  const isHere = useIsHere();
  const { width: winW } = useWindowDimensions();
  useSyncExternalStore(targets.subscribe, targets.version, targets.version);
  const primary = hints[0] ?? null;

  // The first hint with something on screen to point at, and that thing.
  const content = inDialog ? null : targets.get(CONTENT_KEY);
  let hint: Hint | null = null;
  let found: { key: string; rect: TargetRect } | null = null;
  // The first hint before the one shown whose own row exists but is scrolled out of view.
  let hidden: Hint | null = null;
  for (const h of hints) {
    // Pointing at the tab or the stage chip the player is already on would say nothing.
    const route = inDialog ? (DIALOG_KEYS.some((k) => h.key.startsWith(`${k}:`)) ? [h.key] : []) : h.route.filter((k) => k !== `tab:${tab}` && !isHere(k));
    for (const key of route) {
      const rect = targets.get(key);
      // Not measured yet: the refresh below asks every second.
      if (!rect) continue;
      if (inDialog || onScreen(key, rect, content, winW)) {
        found = { key, rect };
        break;
      }
    }
    if (found && found.key === h.key) {
      hint = h;
      break;
    }
    // Only a stand-in (the chip or tab leading to it) is on screen: the control may be a row scrolled out of view.
    const own = inDialog ? null : targets.get(h.key);
    if (!hidden && h.row && own && !onScreen(h.key, own, content, winW)) hidden = h;
    if (found) {
      hint = h;
      break;
    }
  }
  const lastKey = useRef<string | null>(null);
  const scrolledFor = useRef<string | null>(null);

  // Rows inside scrolling lists move without a layout event: measure the routes again each second.
  const routeKeys = useMemo(() => [...new Set(hints.flatMap((h) => h.route))], [hints]);
  useEffect(() => {
    if (routeKeys.length === 0) return;
    const refresh = () => routeKeys.forEach((k) => targets.refresh(k));
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [routeKeys]);

  // A new hint: the source may switch a list to the one holding its control; say "psst" once.
  useEffect(() => {
    if (inDialog) return;
    if (!primary || primary.key === lastKey.current) {
      if (!primary) lastKey.current = null;
      return;
    }
    lastKey.current = primary.key;
    hintSource()?.onNewHint?.(primary);
    fx.play('hint');
  }, [primary, inDialog]);

  // A hint's row exists but is scrolled out of view (or under the tab bar): scroll it in, once per hint.
  useEffect(() => {
    if (inDialog || !hidden?.row || scrolledFor.current === hidden.key) return;
    if (!hintSource()?.reveal?.(hidden)) return;
    scrolledFor.current = hidden.key;
    const key = hidden.key;
    // The list scrolls without a layout event: measure again once it has arrived (harmless if it went away).
    setTimeout(() => targets.refresh(key), 450);
  }, [inDialog, hidden]);

  const visible = inDialog ? !!found && !story : !!found && !dialog && !story && !overlaysOpen;
  if (!hint || !found) return null;
  return <Hand target={found} visible={visible} />;
}

/** The hand itself, mounted only while there is something to point at (it costs nothing otherwise). */
function Hand({ target, visible }: { target: { key: string; rect: TargetRect }; visible: boolean }) {
  const { width: winW } = useWindowDimensions();
  const rect = target.rect;
  // Things drawn in the scene and tabs: their middle. Buttons and chips carry a label (often a
  // price): point at the right end, beside the words, so the hand, which hangs down and to the right of
  // its fingertip, never hides the words.
  const tabKey = target.key.startsWith('tab:');
  const hints = hintSource();
  const centred = (hints?.sceneKeys ?? []).some((k) => target.key === k || target.key.startsWith(`${k}:`)) || tabKey;
  // A control in the top right corner (the missions and chest buttons): the hand lies to its left,
  // over the wall, not over the station row under it.
  const corner = !tabKey && rect.x + rect.width * 0.5 > winW * 0.72 && rect.y + rect.height < 170;
  // On the tab bar the hand comes from above so it never leaves the screen; on the skill button
  // too, so it does not hide the button's name under it.
  const fromAbove = tabKey || (hints?.fromAboveKeys ?? []).includes(target.key);
  const angle = fromAbove ? 160 : corner ? 55 : 25;
  const scale = tabKey ? 0.7 : 1.15;
  const tx = rect.x + rect.width * (centred ? 0.5 : 0.9);
  const ty = rect.y + rect.height * (centred ? 0.55 : 0.68);

  // Taps for a while, then rests (still, half-faded), then taps again. A new target or a touch restarts the taps.
  const [tapping, setTapping] = useState(true);
  const [poke, setPoke] = useState(0);
  useEffect(() => {
    setTapping(true);
    let rest: ReturnType<typeof setTimeout>;
    const tap = setTimeout(() => {
      setTapping(false);
      rest = setTimeout(() => setPoke((n) => n + 1), REST_MS);
    }, TAP_MS);
    return () => {
      clearTimeout(tap);
      clearTimeout(rest);
    };
  }, [target.key, poke]);

  // Fade out on any touch, come back after a quiet moment.
  const shown = useSharedValue(0);
  const level = visible ? (tapping ? 1 : 0.4) : 0;
  const levelRef = useRef(level);
  levelRef.current = level;
  useEffect(() => {
    shown.value = level > 0 ? withDelay(150, withTiming(level, { duration: 220 })) : withTiming(0, { duration: 120 });
  }, [level, shown]);
  useEffect(() => {
    const onTouch = () => {
      shown.value = withTiming(0, { duration: 80 });
      if (levelRef.current > 0) shown.value = withDelay(QUIET_AFTER_TOUCH_MS, withTiming(levelRef.current, { duration: 220, easing: Easing.out(Easing.quad) }));
    };
    touchListeners.add(onTouch);
    return () => {
      touchListeners.delete(onTouch);
    };
  }, [shown]);

  // Glide to a new target rather than jumping.
  const x = useSharedValue(tx);
  const y = useSharedValue(ty);
  useEffect(() => {
    x.value = withTiming(tx, { duration: 280, easing: Easing.out(Easing.cubic) });
    y.value = withTiming(ty, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [tx, ty, x, y]);
  const boxStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: x.value - BOX / 2 }, { translateY: y.value - BOX / 2 }] }));

  return (
    // Clipped to the window: a hand near the edge must never widen the page (web) or draw off screen.
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="none">
      <Animated.View style={[styles.box, boxStyle]} pointerEvents="none">
        {tapping && visible ? <TappingHand centred={centred} angle={angle} scale={scale} /> : <RestingHand centred={centred} angle={angle} scale={scale} />}
      </Animated.View>
    </View>
  );
}

interface HandArt {
  centred: boolean;
  angle: number;
  scale: number;
}

/** The animated hand: a frame clock only while this is mounted. */
function TappingHand(p: HandArt) {
  const clock = useClock();
  return <HandCanvas {...p} clock={clock} />;
}

/** The same hand, still. */
function RestingHand(p: HandArt) {
  // The hand's pose at rest: lifted a little, no ring.
  const clock = useSharedValue(0);
  return <HandCanvas {...p} clock={clock} still />;
}

function HandCanvas({ centred, angle, scale, clock, still = false }: HandArt & { clock: SharedValue<number>; still?: boolean }) {
  const t = useTheme();
  // The mode's pointer (sim and classic: the glove, src/ui/art/props.tsx), from its entry.
  const Pointer = modeParts().HintPointer;
  // A smaller ring at a button's corner, so it does not wash over the price.
  const ringBase = centred ? 18 : 11;
  const ringGrow = centred ? 10 : 7;
  const ring = useDerivedValue(() => ringBase + ringGrow * ((clock.value % 1100) / 1100));
  const ringOpacity = useDerivedValue(() => (still ? 0 : 0.55 * (1 - (clock.value % 1100) / 1100)));
  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group>
        <Circle cx={BOX / 2} cy={BOX / 2} r={ring} color={t.c.accent} opacity={ringOpacity} style="stroke" strokeWidth={6} />
        <Circle cx={BOX / 2} cy={BOX / 2} r={ring} color="#FFFFFF" opacity={ringOpacity} style="stroke" strokeWidth={2.5} />
        <Circle cx={BOX / 2} cy={BOX / 2} r={centred ? 16 : 10} color={t.c.accent} opacity={0.25} />
      </Group>
      {Pointer ? <Pointer x={BOX / 2} y={BOX / 2} clock={clock} scale={scale} angle={angle} /> : null}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  // The top of everything in the shell (dialogs are separate windows and hide the hand anyway).
  layer: { zIndex: 1200, elevation: 32, overflow: 'hidden' },
  box: { position: 'absolute', left: 0, top: 0, width: BOX, height: BOX },
  canvas: { width: BOX, height: BOX },
});
