/**
 * The hint pointer of Orbit Haulers (sections 1.3 R2 and 3): a survey frame of four corner
 * brackets round a dot, a white dotted guide with an arrowhead for drag and swipe hints, and a pulse ring for point hints. Animated with
 * plain Reanimated shared values (withRepeat / withTiming); no rig.
 *
 * Two ways to use it:
 * - `<ReticleLayer hint={...} width height />`: its own full-size Skia canvas, pointer events off.
 * - `<Reticle hint={...} />`: Skia elements only, to put inside an existing <Canvas> (the shared
 *   HintOverlay's pointer slot).
 *
 * Hints (screen points): point {kind: 'point', from}; drag {kind: 'drag', from, to}: the reticle
 * travels the dashed guide in 1.2 s, pauses 0.6 s, repeats; swipe {kind: 'swipe', from, to?}:
 * an upward stroke, `to` defaults to 80 pt above `from`. Unmounting stops every animation.
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

export type ReticleHint = { kind: 'point'; from: Point } | { kind: 'drag'; from: Point; to: Point } | { kind: 'swipe'; from: Point; to?: Point };

/** Durations from section 3. */
export const RETICLE_TRAVEL_MS = 1200;
export const RETICLE_PAUSE_MS = 600;
export const RETICLE_PULSE_MS = 1200;

let reticlePic: ReturnType<typeof picture> | null = null;
function reticlePicture() {
  // Recorded once and kept for the life of the app (never freed while a canvas may draw it).
  if (!reticlePic) reticlePic = picture(around(RETICLE_R + 10), (c) => drawReticle(c));
  return reticlePic;
}

export function Reticle({ hint, color = SPACE.line }: { hint: ReticleHint; color?: string }) {
  const from = hint.from;
  const to = hint.kind === 'point' ? hint.from : hint.kind === 'drag' ? hint.to : (hint.to ?? { x: hint.from.x, y: hint.from.y - 80 });
  const moving = hint.kind !== 'point';
  const cycle = moving ? RETICLE_TRAVEL_MS + RETICLE_PAUSE_MS : RETICLE_PULSE_MS;
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: cycle, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [t, cycle, from.x, from.y, to.x, to.y]);

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

/** The reticle on its own canvas, covering `width` x `height` from the top left, touches pass through. */
export function ReticleLayer({ hint, width, height, color }: { hint: ReticleHint; width: number; height: number; color?: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Canvas style={{ width, height }}>
        <Reticle hint={hint} color={color} />
      </Canvas>
    </View>
  );
}
