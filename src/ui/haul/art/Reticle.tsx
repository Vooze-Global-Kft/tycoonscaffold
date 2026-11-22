/**
 * The hint pointer of Orbit Haulers (sections 1.3 R2 and 3): a survey frame of four corner
 * brackets round a dot, a white dotted guide with an arrowhead for drag and swipe hints, and a pulse ring for point hints. Animated with
 * plain Reanimated shared values (withRepeat / withTiming); no rig.
 *
 * Two ways to use it:
 * - `<ReticleLayer hint={...} width height />`: its own Skia canvas, only as large as the hint
 *   needs (its points plus the pulse and glow), pointer events off (perf-6: never a second
 *   full-screen surface for a 40 pt reticle).
 * - `<Reticle hint={...} />`: Skia elements only, to put inside an existing <Canvas> (the shared
 *   HintOverlay's pointer slot).
 *
 * Hints (screen points): point {kind: 'point', from}; drag {kind: 'drag', from, to}: the reticle
 * travels the dashed guide in 1.2 s, pauses 0.6 s, repeats; swipe {kind: 'swipe', from, to?}:
 * an upward stroke, `to` defaults to 80 pt above `from`; frame {kind: 'frame', rect}: four corner
 * brackets breathing round a control, nothing over its middle (Decision 48: a hint never sits on a
 * number the player reads). It moves for 6 s, then rests still for 9 s (the last frame of a cycle:
 * a moving reticle faded out, a pulse at rest), and moves again. Unmounting stops every animation.
 */
import { Canvas, Circle, DashPathEffect, Group, Path, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, cancelAnimation, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SPACE } from './palette';
import { around, picture } from './pen';
import { GUIDE_COLOR, GUIDE_DOTS, RETICLE_R, drawReticle, guideArrowPath } from './reticle.draw';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ReticleHint = { kind: 'point'; from: Point } | { kind: 'drag'; from: Point; to: Point } | { kind: 'swipe'; from: Point; to?: Point } | { kind: 'frame'; rect: Box };

/** Durations from section 3. */
export const RETICLE_TRAVEL_MS = 1200;
export const RETICLE_PAUSE_MS = 600;
export const RETICLE_PULSE_MS = 1200;
/** It moves this long, then rests still this long (nothing animates for ever; Decision 50). */
export const RETICLE_ACTIVE_MS = 6000;
export const RETICLE_REST_MS = 9000;
/** Room round a hint's points for the pulse ring and the glow. */
const MARGIN = RETICLE_R + 30;

/** Runs `t` from 0 to 1 every `cycle` ms for RETICLE_ACTIVE_MS, rests at 1 for RETICLE_REST_MS, repeats. */
function useCycles(cycle: number, key: string) {
  const t = useSharedValue(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const n = Math.max(1, Math.round(RETICLE_ACTIVE_MS / cycle));
    const run = () => {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: cycle, easing: Easing.linear }), n, false);
      timer = setTimeout(run, n * cycle + RETICLE_REST_MS);
    };
    run();
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(t);
    };
  }, [t, cycle, key]);
  return t;
}

/** Corner brackets round `r` (inflated by 5), the frame hint's art. */
function framePath(r: Box) {
  const x0 = r.x - 5;
  const y0 = r.y - 5;
  const x1 = r.x + r.width + 5;
  const y1 = r.y + r.height + 5;
  const l = Math.min(14, r.width / 3, r.height / 2);
  const b = Skia.PathBuilder.Make();
  b.moveTo(x0, y0 + l).lineTo(x0, y0).lineTo(x0 + l, y0);
  b.moveTo(x1 - l, y0).lineTo(x1, y0).lineTo(x1, y0 + l);
  b.moveTo(x1, y1 - l).lineTo(x1, y1).lineTo(x1 - l, y1);
  b.moveTo(x0 + l, y1).lineTo(x0, y1).lineTo(x0, y1 - l);
  return b.build();
}

/** A frame hint: brackets that breathe outward a little round a control (Decision 48). */
function FrameReticle({ rect, color }: { rect: Box; color: string }) {
  const t = useCycles(RETICLE_PULSE_MS, `${rect.x}:${rect.y}:${rect.width}:${rect.height}`);
  const path = useMemo(() => framePath(rect), [rect.x, rect.y, rect.width, rect.height]);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const transform = useDerivedValue(() => {
    const s = 1 + 0.035 * Math.sin(t.value * Math.PI);
    return [{ translateX: cx }, { translateY: cy }, { scale: s }, { translateX: -cx }, { translateY: -cy }];
  });
  const glowOpacity = useDerivedValue(() => 0.15 + 0.25 * Math.sin(t.value * Math.PI));
  return (
    <Group transform={transform}>
      <Path path={path} style="stroke" strokeWidth={6} color={color} opacity={glowOpacity} strokeCap="round" strokeJoin="round" />
      <Path path={path} style="stroke" strokeWidth={2.2} color={color} strokeCap="round" strokeJoin="round" />
    </Group>
  );
}

/** The screen area a hint draws in (its points, or its frame, plus room for the pulse and glow). */
export function hintBounds(hint: ReticleHint): Box {
  if (hint.kind === 'frame') return { x: hint.rect.x - 16, y: hint.rect.y - 16, width: hint.rect.width + 32, height: hint.rect.height + 32 };
  const to = hint.kind === 'point' ? hint.from : hint.kind === 'drag' ? hint.to : (hint.to ?? { x: hint.from.x, y: hint.from.y - 80 });
  const x = Math.min(hint.from.x, to.x) - MARGIN;
  const y = Math.min(hint.from.y, to.y) - MARGIN;
  return { x, y, width: Math.abs(to.x - hint.from.x) + 2 * MARGIN, height: Math.abs(to.y - hint.from.y) + 2 * MARGIN };
}

let reticlePic: ReturnType<typeof picture> | null = null;
function reticlePicture() {
  // Recorded once and kept for the life of the app (never freed while a canvas may draw it).
  if (!reticlePic) reticlePic = picture(around(RETICLE_R + 10), (c) => drawReticle(c));
  return reticlePic;
}

export function Reticle({ hint, color = SPACE.line }: { hint: ReticleHint; color?: string }) {
  if (hint.kind === 'frame') return <FrameReticle rect={hint.rect} color={color} />;
  return <MovingReticle hint={hint} color={color} />;
}

function MovingReticle({ hint, color }: { hint: Exclude<ReticleHint, { kind: 'frame' }>; color: string }) {
  const from = hint.from;
  const to = hint.kind === 'point' ? hint.from : hint.kind === 'drag' ? hint.to : (hint.to ?? { x: hint.from.x, y: hint.from.y - 80 });
  const moving = hint.kind !== 'point';
  const cycle = moving ? RETICLE_TRAVEL_MS + RETICLE_PAUSE_MS : RETICLE_PULSE_MS;
  const t = useCycles(cycle, `${from.x}:${from.y}:${to.x}:${to.y}`);

  const pic = reticlePicture();
  const guide = useMemo(() => {
    // The dotted line stops short of the target, where the arrowhead sits.
    const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const k = Math.max(0, (d - RETICLE_R - 6) / d);
    const p = Skia.PathBuilder.Make();
    p.moveTo(from.x, from.y);
    p.lineTo(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    return p.build();
  }, [from.x, from.y, to.x, to.y]);
  const arrow = useMemo(() => guideArrowPath(from.x, from.y, to.x, to.y), [from.x, from.y, to.x, to.y]);

  const travel = RETICLE_TRAVEL_MS / cycle;
  const fx = from.x;
  const fy = from.y;
  const tx = to.x;
  const ty = to.y;

  // Fades in at the start and out during the pause, so the jump back is never seen.
  const fadeAt = (u: number) => {
    'worklet';
    if (!moving) return 1;
    if (u < 0.06) return u / 0.06;
    if (u > travel + (1 - travel) * 0.5) return Math.max(0, 1 - (u - travel - (1 - travel) * 0.5) / ((1 - travel) * 0.5));
    return 1;
  };
  const transform = useDerivedValue(() => {
    const u = t.value;
    let x = fx;
    let y = fy;
    let s = 1;
    if (moving) {
      const k = Math.min(1, u / travel);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      x = fx + (tx - fx) * e;
      y = fy + (ty - fy) * e;
      // A small press at the start of the travel, a settle at the end.
      s = u < 0.08 ? 1 - u * 1.5 : u > travel ? 1 - 0.06 * Math.sin(((u - travel) / (1 - travel)) * Math.PI) : 1;
    } else {
      s = 1 - 0.08 * Math.sin(u * Math.PI * 2);
    }
    // A Group's opacity does not hide a Picture on the web unless the group is a layer: the fade
    // also shrinks the frame a little, and a faded-out frame is scaled to nothing.
    const o = fadeAt(u);
    s *= o < 0.02 ? 0 : 0.7 + 0.3 * o;
    return [{ translateX: x }, { translateY: y }, { scale: s }];
  });
  const reticleOpacity = useDerivedValue(() => fadeAt(t.value));
  const pulseR = useDerivedValue(() => 14 + 24 * t.value);
  const pulseOpacity = useDerivedValue(() => (moving ? 0 : 0.8 * (1 - t.value)));
  const dashPhase = useDerivedValue(() => -t.value * 42);

  return (
    <Group>
      {moving ? (
        <Group>
          <Path path={guide} style="stroke" strokeWidth={2.4} color={GUIDE_COLOR} opacity={0.9} strokeCap="round">
            <DashPathEffect intervals={GUIDE_DOTS} phase={dashPhase} />
          </Path>
          <Path path={arrow} color={GUIDE_COLOR} opacity={0.95} />
          <Circle cx={tx} cy={ty} r={RETICLE_R * 0.75} style="stroke" strokeWidth={1.5} color={color} opacity={0.5} />
        </Group>
      ) : (
        <Circle cx={fx} cy={fy} r={pulseR} style="stroke" strokeWidth={2} color={color} opacity={pulseOpacity} />
      )}
      <Group transform={transform} opacity={reticleOpacity}>
        <Picture picture={pic} />
      </Group>
    </Group>
  );
}

/**
 * The reticle on its own canvas, touches pass through. The canvas covers only the hint's bounds
 * (clipped to `width` x `height`, the screen), placed where they are (perf-6).
 */
export function ReticleLayer({ hint, width, height, color }: { hint: ReticleHint; width: number; height: number; color?: string }) {
  const b = hintBounds(hint);
  const x = Math.max(0, Math.floor(b.x));
  const y = Math.max(0, Math.floor(b.y));
  const w = Math.max(1, Math.min(width, Math.ceil(b.x + b.width)) - x);
  const h = Math.max(1, Math.min(height, Math.ceil(b.y + b.height)) - y);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Canvas style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
        <Group transform={[{ translateX: -x }, { translateY: -y }]}>
          <Reticle hint={hint} color={color} />
        </Group>
      </Canvas>
    </View>
  );
}
