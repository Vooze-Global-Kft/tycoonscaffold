/**
 * Everything the play layer draws, in its one Skia canvas (each canvas is a WebGL context on web,
 * so the layer keeps to one): the rush vignette and speed lines, the skill button's ring, the
 * glow behind the flying bonus, coin bursts and grand-opening confetti. Taps never reach it.
 */
import { Canvas, Circle, Group, Line, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Easing, cancelAnimation, runOnJS, useDerivedValue, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useGame } from '../../../../state/store';
import { alpha, useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import { useSceneClock } from '../../art';
import { useMatrix, putTR, putTS } from '../matrix';
import { SLOWMO } from './dev';
import { type BonusShared, type BurstSpec, type RushPhase } from './shared';

/** Geometry of the skill button, shared with RushButton so ring and face line up. */
export const RUSH_FACE = 46;
export const RUSH_RING_R = 26.5;
export const RUSH_RING_W = 5;

export function Effects({
  layout,
  rushPhase,
  rushVis,
  ringP,
  bonus,
  bursts,
  onBurstDone,
  confettiSeq,
}: {
  layout: SceneLayout;
  rushPhase: RushPhase;
  rushVis: SharedValue<number>;
  ringP: SharedValue<number>;
  bonus: BonusShared;
  bursts: BurstSpec[];
  onBurstDone: (id: number) => void;
  confettiSeq: number;
}) {
  // Nothing invisible animates: the rush atmosphere and the bonus glow are mounted only while they
  // show (plus their fade-out), and their one shared clock runs only while one of them is mounted.
  const bonusFlying = useGame((s) => s.bonus.activeId !== null);
  const atmo = useLinger(rushPhase === 'active', 700);
  const glow = useLinger(bonusFlying, 250);
  const clock = useSceneClock(atmo || glow);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: layout.width, height: layout.height }}>
      <Canvas style={{ width: layout.width, height: layout.height }}>
        {atmo ? <RushAtmosphere layout={layout} vis={rushVis} clock={clock} /> : null}
        {rushPhase !== 'hidden' ? <RushRing layout={layout} phase={rushPhase} p={ringP} /> : null}
        {glow ? <BonusGlow bonus={bonus} unit={layout.unit} clock={clock} /> : null}
        {bursts.map((b) => (
          <CoinBurst key={b.id} spec={b} unit={layout.unit} onDone={onBurstDone} />
        ))}
        {confettiSeq > 0 ? <Confetti key={confettiSeq} layout={layout} /> : null}
      </Canvas>
    </View>
  );
}

/** True while `on`, and for `ms` after it turns false (so a fade-out can finish before unmounting). */
function useLinger(on: boolean, ms: number): boolean {
  const [held, setHeld] = useState(on);
  useEffect(() => {
    if (on) {
      setHeld(true);
      return;
    }
    const id = setTimeout(() => setHeld(false), ms);
    return () => clearTimeout(id);
  }, [on, ms]);
  return on || held;
}

/** Warm edges and streaks while the rush runs: clearly "faster", but the middle of the room stays clear. */
function RushAtmosphere({ layout, vis, clock }: { layout: SceneLayout; vis: SharedValue<number>; clock: SharedValue<number> }) {
  const t = useTheme();
  const warm = t.c.stages.production;
  const { width: w, height: h } = layout;
  // A fixed set of streaks; their phases differ so a frozen frame still shows several.
  const lines = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        y: h * (0.12 + ((i * 0.37) % 1) * 0.8),
        len: (46 + ((i * 29) % 50)) * layout.unit,
        speed: (0.5 + ((i * 0.53) % 1) * 0.6) * w,
        offset: (i * 0.29) % 1,
      })),
    [h, w, layout.unit],
  );
  return (
    <Group opacity={vis}>
      <Rect x={0} y={0} width={w} height={h}>
        <RadialGradient c={vec(w / 2, h * 0.55)} r={Math.hypot(w, h) * 0.52} colors={[alpha(warm, 0), alpha(warm, 0), alpha(warm, 0.38), alpha(warm, 0.8)]} positions={[0, 0.5, 0.82, 1]} />
      </Rect>
      <Rect x={2} y={2} width={w - 4} height={h - 4} color={alpha(warm, 0.85)} style="stroke" strokeWidth={4} />
      {lines.map((l, i) => (
        <SpeedLine key={i} {...l} w={w} clock={clock} unit={layout.unit} warm={warm} />
      ))}
    </Group>
  );
}

function SpeedLine({ y, len, speed, offset, w, clock, unit, warm }: { y: number; len: number; speed: number; offset: number; w: number; clock: SharedValue<number>; unit: number; warm: string }) {
  // Streaks run right to left, as if the room were rushing forward; they fade towards the middle.
  // One static line, moved by a matrix filled in place (no allocation per frame).
  const x = useDerivedValue(() => {
    const span = w + len * 2;
    return w + len - (((clock.value / 1000) * speed + offset * span) % span);
  });
  const matrix = useMatrix(
    (o) => {
      'worklet';
      putTS(o, x.value, 0, 1, 1);
    },
    [x],
  );
  const op = useDerivedValue(() => {
    const mid = Math.abs(x.value + len / 2 - w / 2) / (w / 2);
    return Math.min(1, mid * mid * 1.6) * 0.95;
  });
  const p1 = useMemo(() => vec(0, y), [y]);
  const p2 = useMemo(() => vec(len, y), [len, y]);
  return (
    <Group matrix={matrix} opacity={op}>
      <Line p1={p1} p2={p2} color={alpha(warm, 0.55)} strokeWidth={5 * unit} strokeCap="round" />
      <Line p1={p1} p2={p2} color="#FFFFFF" strokeWidth={2.4 * unit} strokeCap="round" />
    </Group>
  );
}

const PULSE_MS = 1400;
const PULSES = 3;
const PULSE_REST_MS = 6000;

/** The ring around the skill button: recharge while cooling, time left while active, a soft pulse when ready. */
function RushRing({ layout, phase, p }: { layout: SceneLayout; phase: RushPhase; p: SharedValue<number> }) {
  const t = useTheme();
  const { x, y } = layout.rush;
  const circle = useMemo(() => {
    // Starts at the top and runs clockwise, like a clock hand.
    return Skia.PathBuilder.Make()
      .addArc(Skia.XYWHRect(x - RUSH_RING_R, y - RUSH_RING_R, RUSH_RING_R * 2, RUSH_RING_R * 2), -90, 359.9)
      .build();
  }, [x, y]);
  const color = phase === 'active' ? t.c.stages.production : phase === 'ready' ? t.c.accent : t.c.textMuted;
  return (
    <Group>
      {phase === 'ready' ? <ReadyPulse x={x} y={y} color={t.c.accent} /> : null}
      <Circle cx={x} cy={y} r={RUSH_RING_R} color={alpha('#000000', 0.28)} style="stroke" strokeWidth={RUSH_RING_W} />
      <Path path={circle} color={color} style="stroke" strokeWidth={RUSH_RING_W} strokeCap="round" start={0} end={p} />
    </Group>
  );
}

/** While the skill is ready: a few soft pulses, then a rest on a JS timer (nothing loops while it waits). */
function ReadyPulse({ x, y, color }: { x: number; y: number; color: string }) {
  const u = useSharedValue(1);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | null = null;
    const play = () => {
      u.value = 0;
      u.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.linear }), PULSES, false);
      id = setTimeout(play, PULSE_MS * PULSES + PULSE_REST_MS);
    };
    play();
    return () => {
      if (id) clearTimeout(id);
      cancelAnimation(u);
    };
  }, [u]);
  const r = useDerivedValue(() => RUSH_RING_R + 3 + u.value * 9);
  const op = useDerivedValue(() => (u.value >= 1 ? 0 : (1 - u.value) * 0.55));
  return <Circle cx={x} cy={y} r={r} color={color} style="stroke" strokeWidth={3} opacity={op} />;
}

/** A warm glow, slowly turning rays and a short sparkle trail behind the flying bonus. */
function BonusGlow({ bonus, unit, clock }: { bonus: BonusShared; unit: number; clock: SharedValue<number> }) {
  const t = useTheme();
  const rays = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const n = 10;
    const R = 58 * unit;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + (Math.PI / n) * 0.7;
      b.moveTo(0, 0).lineTo(Math.cos(a0) * R, Math.sin(a0) * R).lineTo(Math.cos(a1) * R, Math.sin(a1) * R).close();
    }
    return b.build();
  }, [unit]);
  // The glow is drawn once around (0, 0) and moved / breathed by matrices filled in place.
  const R0 = 46 * unit;
  const rayM = useMatrix(
    (o) => {
      'worklet';
      const path = bonus.path.value;
      const u = bonus.p.value;
      putTR(o, path.x0 + (path.x1 - path.x0) * u, path.y + Math.sin(u * Math.PI * 2 * path.waves) * path.amp, clock.value / 900);
    },
    [bonus.path, bonus.p, clock],
  );
  const glowM = useMatrix(
    (o) => {
      'worklet';
      const path = bonus.path.value;
      const u = bonus.p.value;
      const k = 1 + (Math.sin(clock.value / 180) * 5) / 46;
      putTS(o, path.x0 + (path.x1 - path.x0) * u, path.y + Math.sin(u * Math.PI * 2 * path.waves) * path.amp, k, k);
    },
    [bonus.path, bonus.p, clock],
  );
  const origin = useMemo(() => vec(0, 0), []);
  return (
    <Group opacity={bonus.on}>
      <Path path={rays} matrix={rayM} color={alpha(t.c.accent, 0.42)} />
      <Group matrix={glowM}>
        <Circle cx={0} cy={0} r={R0}>
          <RadialGradient c={origin} r={R0} colors={[alpha('#FFFFFF', 0.9), alpha(t.c.accent, 0.7), alpha(t.c.accent, 0)]} positions={[0, 0.4, 1]} />
        </Circle>
      </Group>
      {[0.025, 0.05, 0.075, 0.1].map((lag, i) => (
        <TrailSpark key={i} bonus={bonus} lag={lag} size={(5 - i) * unit} clock={clock} />
      ))}
    </Group>
  );
}

function TrailSpark({ bonus, lag, size, clock }: { bonus: BonusShared; lag: number; size: number; clock: SharedValue<number> }) {
  const m = useMatrix(
    (o) => {
      'worklet';
      const path = bonus.path.value;
      const u = Math.max(0, bonus.p.value - lag);
      const px = path.x0 + (path.x1 - path.x0) * u;
      const py = path.y + Math.sin(u * Math.PI * 2 * path.waves) * path.amp + Math.sin(clock.value / 90 + lag * 100) * 4;
      putTS(o, px, py, 1, 1);
    },
    [bonus.path, bonus.p, clock],
  );
  return (
    <Group matrix={m}>
      <Circle cx={0} cy={0} r={size} color="#FFE36B" opacity={0.95} />
    </Group>
  );
}

const BURST_COINS = 12;

/** Coins spraying out of the caught bonus, falling a little as they go. */
function CoinBurst({ spec, unit, onDone }: { spec: BurstSpec; unit: number; onDone: (id: number) => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 750 * SLOWMO, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(onDone)(spec.id);
    });
  }, [onDone, p, spec.id]);
  const coins = useMemo(() => Array.from({ length: BURST_COINS }, (_, i) => ({ a: (i / BURST_COINS) * Math.PI * 2 + (i % 3) * 0.17, d: (48 + (i % 4) * 14) * unit })), [unit]);
  const ringR = useDerivedValue(() => (10 + p.value * 56) * unit);
  const ringOp = useDerivedValue(() => (1 - p.value) * 0.8);
  return (
    <Group>
      <Circle cx={spec.x} cy={spec.y} r={ringR} color="#FFE07A" style="stroke" strokeWidth={4 * unit} opacity={ringOp} />
      {coins.map((c, i) => (
        <BurstCoin key={i} x={spec.x} y={spec.y} a={c.a} d={c.d} p={p} unit={unit} />
      ))}
    </Group>
  );
}

function BurstCoin({ x, y, a, d, p, unit }: { x: number; y: number; a: number; d: number; p: SharedValue<number>; unit: number }) {
  const cx = useDerivedValue(() => x + Math.cos(a) * d * p.value);
  const cy = useDerivedValue(() => y + Math.sin(a) * d * p.value + 40 * unit * p.value * p.value);
  const op = useDerivedValue(() => (p.value < 0.7 ? 1 : (1 - p.value) / 0.3));
  const r = 6.5 * unit;
  return (
    <Group opacity={op}>
      <Circle cx={cx} cy={cy} r={r} color="#C98A12" />
      <Circle cx={cx} cy={cy} r={r * 0.74} color="#FFD34D" />
    </Group>
  );
}

const CONFETTI = 42;
const CONFETTI_COLORS = ['#FFD34D', '#FF6B6B', '#4ECDC4', '#7B5EA7', '#FFFFFF', '#FF9F1C'];

/** Confetti for a grand opening: thrown up from the bottom corners, then fluttering down and away. */
function Confetti({ layout }: { layout: SceneLayout }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 2300 * SLOWMO, easing: Easing.linear });
  }, [p]);
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI }, (_, i) => {
        const left = i % 2 === 0;
        return {
          x0: left ? -6 : layout.width + 6,
          vx: (left ? 1 : -1) * layout.width * (0.25 + ((i * 0.41) % 1) * 0.45),
          vy: -layout.height * (0.9 + ((i * 0.67) % 1) * 0.6),
          spin: 4 + ((i * 0.31) % 1) * 10,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: (5 + (i % 3) * 2) * layout.unit,
        };
      }),
    [layout.width, layout.height, layout.unit],
  );
  return (
    <Group>
      {pieces.map((c, i) => (
        <ConfettiPiece key={i} {...c} y0={layout.height * 0.95} g={layout.height * 2.1} p={p} />
      ))}
    </Group>
  );
}

function ConfettiPiece({ x0, y0, vx, vy, g, spin, color, w, p }: { x0: number; y0: number; vx: number; vy: number; g: number; spin: number; color: string; w: number; p: SharedValue<number> }) {
  const transform = useDerivedValue(() => {
    const s = p.value * 1.6;
    // Air drag: sideways speed fades, so pieces arc and then drift down.
    const x = x0 + vx * (1 - Math.exp(-s * 2.2)) / 1.2 + Math.sin(s * spin) * 6;
    const y = y0 + vy * s + 0.5 * g * s * s;
    return [{ translateX: x }, { translateY: y }, { rotate: s * spin }, { scaleX: Math.cos(s * spin * 1.3) }];
  });
  const op = useDerivedValue(() => (p.value < 0.8 ? 1 : (1 - p.value) / 0.2));
  return (
    <Group transform={transform} opacity={op}>
      <RoundedRect x={-w / 2} y={-w * 0.3} width={w} height={w * 0.6} r={1} color={color} />
    </Group>
  );
}
