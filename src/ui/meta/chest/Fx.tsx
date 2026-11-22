/**
 * Light and particle effects for the chest opening, drawn inside the overlay's one Skia canvas:
 * rays, soft glows, a particle burst, confetti and landing dust. Each is driven by one shared
 * value (a progress or an opacity), and particles are built into one path per colour on the UI
 * thread, so 60 pieces of confetti cost a handful of draw calls and no React renders.
 * At progress 0 (and 1) every effect draws nothing, so a still frame never shows a half state
 * that the animation would not.
 */
import { Circle, Group, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A fan of light wedges turning slowly behind something. */
export function Rays({ cx, cy, radius, color, opacity, clock, count = 14, speed = 0.12, scale }: {
  cx: number | SharedValue<number>;
  cy: number | SharedValue<number>;
  radius: number;
  color: string;
  opacity: SharedValue<number>;
  clock: SharedValue<number>;
  count?: number;
  /** Turns per second. */
  speed?: number;
  scale?: SharedValue<number>;
}) {
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const half = Math.PI / count / 2.2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      b.moveTo(0, 0);
      b.lineTo(Math.cos(a - half) * radius, Math.sin(a - half) * radius);
      b.lineTo(Math.cos(a + half) * radius, Math.sin(a + half) * radius);
      b.close();
    }
    return b.build();
  }, [count, radius]);
  const transform = useDerivedValue(() => {
    const x = typeof cx === 'number' ? cx : cx.value;
    const y = typeof cy === 'number' ? cy : cy.value;
    const k = scale ? scale.value : 1;
    return [{ translateX: x }, { translateY: y }, { rotate: (clock.value / 1000) * speed * Math.PI * 2 }, { scale: Math.max(0.001, k) }];
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={path}>
        <RadialGradient c={vec(0, 0)} r={radius} colors={[color, `${color.slice(0, 7)}00`]} />
      </Path>
    </Group>
  );
}

/** A round soft light. */
export function Glow({ cx, cy, r, color, opacity, scale }: {
  cx: number | SharedValue<number>;
  cy: number | SharedValue<number>;
  r: number;
  color: string;
  opacity: SharedValue<number> | number;
  scale?: SharedValue<number>;
}) {
  const transform = useDerivedValue(() => {
    const x = typeof cx === 'number' ? cx : cx.value;
    const y = typeof cy === 'number' ? cy : cy.value;
    return [{ translateX: x }, { translateY: y }, { scale: Math.max(0.001, scale ? scale.value : 1) }];
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={r}>
        <RadialGradient c={vec(0, 0)} r={r} colors={[color, `${color.slice(0, 7)}88`, `${color.slice(0, 7)}00`]} positions={[0, 0.35, 1]} />
      </Circle>
    </Group>
  );
}

/** A full-canvas colour wash (the dim, the white flash). */
export function Wash({ width, height, color, opacity }: { width: number; height: number; color: string; opacity: SharedValue<number> }) {
  return <Rect x={0} y={0} width={width} height={height} color={color} opacity={opacity} />;
}

/** Sparks flying out from a point; `progress` 0 -> 1 runs one burst. */
export function Burst({ cx, cy, progress, colors, radius = 120, count = 22, seed = 7 }: {
  cx: number | SharedValue<number>;
  cy: number | SharedValue<number>;
  progress: SharedValue<number>;
  colors: string[];
  radius?: number;
  count?: number;
  seed?: number;
}) {
  const parts = useMemo(() => {
    const r = rand(seed);
    return Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2 + r() * 0.5, d: 0.45 + r() * 0.55, s: 2.5 + r() * 3.5, c: i % colors.length }));
  }, [count, seed, colors.length]);
  return (
    <>
      {colors.map((color, ci) => (
        <BurstLayer key={ci} ci={ci} parts={parts} cx={cx} cy={cy} progress={progress} color={color} radius={radius} />
      ))}
    </>
  );
}

function BurstLayer({ ci, parts, cx, cy, progress, color, radius }: {
  ci: number;
  parts: { a: number; d: number; s: number; c: number }[];
  cx: number | SharedValue<number>;
  cy: number | SharedValue<number>;
  progress: SharedValue<number>;
  color: string;
  radius: number;
}) {
  const path = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const p = progress.value;
    if (p > 0 && p < 1) {
      const x0 = typeof cx === 'number' ? cx : cx.value;
      const y0 = typeof cy === 'number' ? cy : cy.value;
      const e = 1 - Math.pow(1 - p, 3);
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        if (q.c !== ci) continue;
        const d = e * radius * q.d;
        const size = q.s * (1 - p * 0.7);
        b.addCircle(x0 + Math.cos(q.a) * d, y0 + Math.sin(q.a) * d + p * p * 30, size);
      }
    }
    return b.build();
  });
  const opacity = useDerivedValue(() => (progress.value <= 0 || progress.value >= 1 ? 0 : 1 - Math.pow(progress.value, 2)));
  return <Path path={path} color={color} opacity={opacity} />;
}

const CONFETTI_COLORS = ['#FFC93C', '#FF6B6B', '#4ECDC4', '#C77DFF', '#FFFFFF'];

/** Confetti thrown up from the middle of the screen and falling; `progress` 0 -> 1 over about 2.4 s. */
export function Confetti({ width, height, progress, count = 64 }: { width: number; height: number; progress: SharedValue<number>; count?: number }) {
  const parts = useMemo(() => {
    const r = rand(42);
    return Array.from({ length: count }, (_, i) => ({
      x: width * (0.3 + r() * 0.4),
      vx: (r() - 0.5) * width * 1.3,
      vy: -(height * (0.55 + r() * 0.5)),
      rot: r() * Math.PI * 2,
      spin: (r() - 0.5) * 14,
      flut: 4 + r() * 8,
      w: 6 + r() * 5,
      c: i % CONFETTI_COLORS.length,
    }));
  }, [count, width, height]);
  return (
    <>
      {CONFETTI_COLORS.map((color, ci) => (
        <ConfettiLayer key={color} ci={ci} parts={parts} progress={progress} color={color} y0={height * 0.45} g={height * 1.6} />
      ))}
    </>
  );
}

function ConfettiLayer({ ci, parts, progress, color, y0, g }: {
  ci: number;
  parts: { x: number; vx: number; vy: number; rot: number; spin: number; flut: number; w: number; c: number }[];
  progress: SharedValue<number>;
  color: string;
  y0: number;
  g: number;
}) {
  const path = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const p = progress.value;
    if (p > 0 && p < 1) {
      const t = p * 2.4;
      // Air drag: horizontal travel slows down, the fall settles to a gentle drift.
      const drag = 1 - Math.exp(-t * 1.8);
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        if (q.c !== ci) continue;
        const x = q.x + (q.vx * drag) / 1.8;
        const y = y0 + (q.vy * drag) / 1.8 + 0.5 * g * t * t * 0.55;
        const a = q.rot + q.spin * t;
        const hw = (q.w / 2) * Math.abs(Math.cos(q.flut * t));
        const hh = q.w / 4;
        const c = Math.cos(a);
        const s = Math.sin(a);
        b.moveTo(x + c * -hw - s * -hh, y + s * -hw + c * -hh);
        b.lineTo(x + c * hw - s * -hh, y + s * hw + c * -hh);
        b.lineTo(x + c * hw - s * hh, y + s * hw + c * hh);
        b.lineTo(x + c * -hw - s * hh, y + s * -hw + c * hh);
        b.close();
      }
    }
    return b.build();
  });
  const opacity = useDerivedValue(() => (progress.value <= 0 || progress.value >= 1 ? 0 : progress.value > 0.8 ? (1 - progress.value) / 0.2 : 1));
  return <Path path={path} color={color} opacity={opacity} />;
}

/** Dust puffing out sideways where the chest lands; `progress` 0 -> 1 over about 500 ms. */
export function Dust({ cx, cy, progress, spread = 90, color = '#F3E3C8' }: { cx: number; cy: number; progress: SharedValue<number>; spread?: number; color?: string }) {
  const parts = useMemo(() => {
    const r = rand(3);
    return Array.from({ length: 10 }, (_, i) => ({ side: i % 2 === 0 ? -1 : 1, d: 0.4 + r() * 0.6, up: r() * 18, s: 7 + r() * 9 }));
  }, []);
  const path = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const p = progress.value;
    if (p > 0 && p < 1) {
      const e = 1 - Math.pow(1 - p, 2.5);
      for (let i = 0; i < parts.length; i++) {
        const q = parts[i];
        b.addCircle(cx + q.side * (spread * 0.45 + e * spread * q.d), cy - 6 - e * q.up, q.s * (0.6 + e * 0.9));
      }
    }
    return b.build();
  });
  const opacity = useDerivedValue(() => (progress.value <= 0 || progress.value >= 1 ? 0 : 0.85 * (1 - progress.value)));
  return <Path path={path} color={color} opacity={opacity} />;
}
