/**
 * The first minutes' teaching on screen (yard-stage1.md 1.2; the rules are ./rules.ts). Mounted once by
 * the shell over the yard, under the HUD's buttons; it never takes a touch (pointerEvents none) and
 * nothing in it asks for a tap:
 * - the GHOST THUMB of the first second: a faint thumb lands where the stick will appear and drags towards
 *   the first goal's target, again and again, until the player's own thumb lands; later the same thumb is
 *   one of the stall escalations (`drag` towards the target, or `lift`: press, hold, let go = stand still);
 * - the chevron's rest (./gate.ts `chevronGate`, read by the world's canvas);
 * - a soft ring round the one button the first time "Open" appears at a place, and round the goal line
 *   for a `goal` escalation (rectangles through src/ui/hints/targets.ts, else the hud's own layout);
 * - a purchase goal the rules hold back (one prompt a minute) waits visibly under the goal line: its own
 *   words dimmed and a bar filling until it shows.
 * The JS side samples the game four times a second (the store changes ten times a second); motion runs
 * on the UI thread, and stops whenever its part is hidden.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { targets, type TargetRect } from '../../hints/targets';
import { yardEvents } from '../hud/pump';
import { hudLayout } from '../hud/metrics';
import { BarText, Paper } from '../hud/Paper';
import { loadingClock } from '../loading/clock';
import type { Insets } from '../overlays/OverlayHost';
import { PAL } from '../palette';
import { say } from '../strings';
import { overlaysOpen, useSalvageUi } from '../uiState';
import { STICK_R, type StickZone } from '../world/stick';
import { hintDemo } from './autoplay';
import { chevronGate } from './gate';
import { HintTracker, PROGRESS_EVENTS, dragDir, ghostHome, goalDefOf, goalHint, hintTarget, promptWait, type HintView } from './rules';
import { teachOf } from './teach';

/** How far the ghost thumb drags, points (a little past the knob's full travel). */
export const GHOST_DRAG_PT = STICK_R * 0.9;
/** The ghost thumb's disc, points. */
const THUMB = 46;
/** Samples a second. */
const SAMPLE_MS = 250;

export interface HintLayerProps {
  cfg: R.SalvageConfig;
  width: number;
  height: number;
  insets: Insets;
  zone: StickZone;
  /** The player's thumb has landed (the shell's `used`). */
  used: boolean;
  /** The yard is live (landscape, no overlay, foreground). */
  active: boolean;
}

const OFF: HintView = { chevron: true, ghost: 'off', nudge: null, openRing: false, goalRing: false };

function sameView(a: HintView, b: HintView) {
  return a.chevron === b.chevron && a.ghost === b.ghost && a.nudge === b.nudge && a.openRing === b.openRing && a.goalRing === b.goalRing;
}

export function HintLayer({ cfg, width, height, insets, zone, used, active }: HintLayerProps) {
  const teach = teachOf(cfg);
  const { fontScale } = useWindowDimensions();
  const L = useMemo(() => hudLayout(width, height, insets, Math.min(1.3, fontScale)), [width, height, insets.top, insets.left, insets.right, insets.bottom, fontScale]); // eslint-disable-line react-hooks/exhaustive-deps
  const tracker = useRef<HintTracker | null>(null);
  if (!tracker.current) tracker.current = new HintTracker(teach);
  const [view, setView] = useState<HintView>(OFF);
  const [dir, setDir] = useState({ dx: -0.6, dy: 0.8 });
  const [wait, setWait] = useState<{ words: string; share: number } | null>(null);
  const gateAt = useRef<number | null>(null);
  const usedRef = useRef(used);
  usedRef.current = used;
  const activeRef = useRef(active);
  activeRef.current = active;

  // The stick zone is a hint target too (the autoplay and the integrator's checks find it).
  useEffect(() => {
    targets.set('salvage:stick', { x: zone.x, y: zone.y, width: zone.width, height: zone.height });
    return () => targets.set('salvage:stick', null);
  }, [zone.x, zone.y, zone.width, zone.height]);

  // Progress from the rules' events.
  useEffect(
    () =>
      yardEvents.onBatch((events) => {
        if (gateAt.current === null) return;
        if (events.some((e) => PROGRESS_EVENTS.includes(e.type))) tracker.current?.progress((Date.now() - gateAt.current) / 1000);
      }),
    [],
  );

  useEffect(() => {
    const step = () => {
      const g = useGame.getState().game as R.SalvageGame;
      if (!g?.salvage) return;
      if (gateAt.current === null && (loadingClock.done.value || loadingClock.gateAt.value < 1e8)) gateAt.current = Date.now();
      const gateOpen = gateAt.current !== null;
      const now = gateOpen ? (Date.now() - (gateAt.current as number)) / 1000 : 0;
      const goal = R.nextGoal(cfg, g);
      const def = goalDefOf(cfg, goal);
      const h = goalHint(def);
      const f = R.frame(cfg, g);
      const p = g.salvage.presence;
      const spot = hintTarget(cfg, g, f, Date.now());
      const dist = spot && p ? Math.hypot(spot.x - p.x, spot.y - p.y) : null;
      const ui = useSalvageUi.getState();
      const demo = hintDemo?.force(now) ?? null;
      let v = tracker.current!.update({
        now,
        gateOpen,
        goalId: goal?.id ?? null,
        target: def?.target ?? null,
        stall: h.stall,
        buy: def?.buy ?? null,
        dist,
        moving: !!p?.moving,
        standingFor: p?.standingFor ?? 0,
        driving: !!p?.driving,
        overlay: overlaysOpen(ui) > 0,
        stickUsed: usedRef.current,
        place: ui.place,
      });
      if (demo) v = { ...v, ...demo };
      if (!activeRef.current) v = { ...v, ghost: 'off', openRing: false, goalRing: false };
      chevronGate.value = v.chevron ? 1 : 0;
      setView((old) => (sameView(old, v) ? old : v));
      const d = dragDir(p ? { x: p.x, y: p.y } : null, spot);
      setDir((old) => (Math.abs(old.dx - d.dx) < 0.05 && Math.abs(old.dy - d.dy) < 0.05 ? old : d));
      const w = promptWait(cfg, g, goal);
      setWait((old) => {
        if (!w) return null;
        const words = say(w.text, cfg.salvage);
        const share = Math.round(w.share * 20) / 20;
        return old && old.words === words && old.share === share ? old : { words, share };
      });
    };
    step();
    const id = setInterval(step, SAMPLE_MS);
    return () => {
      clearInterval(id);
      chevronGate.value = 1;
    };
  }, [cfg]);

  const home = ghostHome(zone);
  const openRect = useTargetRect('salvage:oneButton') ?? { x: L.button.x, y: L.button.y, width: L.button.size, height: L.button.size };
  const goalRect = useTargetRect('salvage:goal') ?? { x: L.left, y: L.goalY + 2, width: L.goalW, height: L.rows.goal - 4 };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {view.ghost !== 'off' ? <GhostThumb key={view.ghost} mode={view.ghost} x={home.x} y={home.y} dx={dir.dx} dy={dir.dy} loopS={teach.ghostLoopS} pauseS={teach.ghostPauseS} /> : null}
      {view.openRing ? <Ring rect={openRect} round /> : null}
      {view.goalRing ? <Ring rect={goalRect} /> : null}
      {wait && active ? <WaitTag words={wait.words} share={wait.share} x={goalRect.x} y={goalRect.y + goalRect.height + 3} w={Math.min(goalRect.width, 260)} s={L.s} /> : null}
    </View>
  );
}

/** A target's rectangle, kept in step with src/ui/hints/targets.ts. */
function useTargetRect(key: string): TargetRect | null {
  const [r, setR] = useState<TargetRect | null>(() => targets.get(key));
  useEffect(() => {
    const read = () => setR((old) => {
      const n = targets.get(key);
      return old && n && old.x === n.x && old.y === n.y && old.width === n.width && old.height === n.height ? old : n;
    });
    read();
    return targets.subscribe(read);
  }, [key]);
  return r;
}

/**
 * The ghost thumb: a faint stick base where the thumb lands and the thumb itself. `intro` and `drag`:
 * press, drag GHOST_DRAG_PT towards (dx, dy), hold, lift, pause, again. `lift`: press, hold, and rise off
 * the glass (let go: the boss stands and works).
 */
function GhostThumb({ mode, x, y, dx, dy, loopS, pauseS }: { mode: 'intro' | 'drag' | 'lift'; x: number; y: number; dx: number; dy: number; loopS: number; pauseS: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: (loopS + pauseS) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p, loopS, pauseS]);
  const lift = mode === 'lift';
  const k = loopS / (loopS + pauseS);
  return (
    <>
      <GhostBase p={p} x={x} y={y} k={k} />
      <GhostDisc p={p} x={x} y={y} dx={lift ? 0 : dx * GHOST_DRAG_PT} dy={lift ? 0 : dy * GHOST_DRAG_PT} k={k} lift={lift} />
    </>
  );
}

function GhostBase({ p, x, y, k }: { p: SharedValue<number>; x: number; y: number; k: number }) {
  const st = useAnimatedStyle(() => {
    const u = p.value / k;
    const o = u > 1 ? 0 : interpolate(u, [0, 0.15, 0.85, 1], [0, 0.55, 0.55, 0], 'clamp');
    return { opacity: o };
  });
  return <Animated.View style={[styles.base, { left: x - STICK_R, top: y - STICK_R }, st]} />;
}

function GhostDisc({ p, x, y, dx, dy, k, lift }: { p: SharedValue<number>; x: number; y: number; dx: number; dy: number; k: number; lift: boolean }) {
  const st = useAnimatedStyle(() => {
    const u = p.value / k;
    if (u > 1) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    // press 0..0.15 · drag 0.15..0.6 · hold 0.6..0.8 · lift 0.8..1
    const press = interpolate(u, [0, 0.15], [1.25, 1], 'clamp');
    const m = lift ? 0 : interpolate(u, [0.15, 0.6], [0, 1], 'clamp');
    const ease = m * m * (3 - 2 * m);
    const up = interpolate(u, [0.8, 1], [0, lift ? -26 : -10], 'clamp');
    const grow = interpolate(u, [0.8, 1], [1, lift ? 1.2 : 1.08], 'clamp');
    const o = interpolate(u, [0, 0.1, 0.8, 1], [0, 0.9, 0.9, 0], 'clamp');
    return { opacity: o, transform: [{ translateX: dx * ease }, { translateY: dy * ease + up }, { scale: press * grow }] };
  });
  return (
    <Animated.View style={[styles.thumb, { left: x - THUMB / 2, top: y - THUMB / 2 }, st]}>
      <View style={styles.nail} />
    </Animated.View>
  );
}

/** A soft hi-vis ring that swells and fades round a rectangle, three times, then rests faint. */
function Ring({ rect, round = false }: { rect: TargetRect; round?: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), 3, false);
    return () => cancelAnimation(p);
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.95, 0.25]), transform: [{ scale: interpolate(p.value, [0, 1], [1, 1.22]) }] }));
  const pad = 5;
  const r = round ? (Math.max(rect.width, rect.height) + pad * 2) / 2 : 9;
  return <Animated.View style={[styles.ring, { left: rect.x - pad, top: rect.y - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, borderRadius: r }, st]} />;
}

/** The purchase goal that waits: its own words, dimmed, over a bar that fills until it shows. */
function WaitTag({ words, share, x, y, w, s }: { words: string; share: number; x: number; y: number; w: number; s: number }) {
  const pt = 11;
  return (
    <Paper style={[styles.wait, { left: x + 10, top: y, width: w }]} radius={5} drop={1} face={styles.waitFace}>
      <BarText pt={pt * s} weight="600" color={PAL.muted}>
        {words}
      </BarText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
      </View>
    </Paper>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', width: STICK_R * 2, height: STICK_R * 2, borderRadius: STICK_R, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(0,0,0,0.12)' },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: 'rgba(255, 246, 224, 0.82)', borderWidth: 2, borderColor: 'rgba(43, 46, 51, 0.7)', alignItems: 'center' },
  nail: { marginTop: 5, width: 20, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(43, 46, 51, 0.35)' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: PAL.hivis },
  wait: { position: 'absolute' },
  waitFace: { paddingHorizontal: 7, paddingVertical: 3 },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(43, 46, 51, 0.12)', marginTop: 2, overflow: 'hidden' },
  fill: { height: 3, backgroundColor: PAL.hivisDark },
});
