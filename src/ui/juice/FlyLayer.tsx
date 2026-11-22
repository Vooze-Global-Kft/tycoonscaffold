/**
 * Draws the flights announced through `fly` (./fly.ts): a few coins or gems arc from where they
 * were earned to the header counter in about 600 ms, and each one that lands gives the counter a
 * small pulse. A fixed pool of animated views (no canvas, no React render per frame); flights that
 * arrive while the pool is busy reuse the oldest pieces, so the screen never fills up.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { counterPulse } from '../components/counterPulse';
import { GameIcon } from '../components/GameIcon';
import { targets } from '../hints/targets';
import { useTheme } from '../theme';
import { fly, type Flight } from './fly';

/** Pieces on screen at most. */
const POOL = 24;
/** Pieces per flight at most. */
const PER_FLIGHT = 8;
const SIZE = 26;

interface Launch {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  delay: number;
  duration: number;
  gem: boolean;
  to: string;
}

interface PieceHandle {
  launch(l: Launch): void;
}

const Piece = forwardRef<PieceHandle, { cashIcon: string; gemIcon: string }>(function Piece({ cashIcon, gemIcon }, ref) {
  const p = useSharedValue(0);
  const on = useSharedValue(0);
  const gem = useSharedValue(0);
  const pts = useSharedValue({ x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0 });
  useImperativeHandle(ref, () => ({
    launch(l: Launch) {
      pts.value = { x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1, cx: l.cx, cy: l.cy };
      gem.value = l.gem ? 1 : 0;
      p.value = 0;
      on.value = 1;
      p.value = withDelay(
        l.delay,
        withTiming(1, { duration: l.duration, easing: Easing.in(Easing.quad) }, (done) => {
          if (!done) return;
          on.value = 0;
          runOnJS(counterPulse.emit)(l.to);
        }),
      );
    },
  }));
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const { x0, y0, x1, y1, cx, cy } = pts.value;
    // A quadratic curve: up and over to the counter.
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const s = t < 0.15 ? 0.5 + (t / 0.15) * 0.6 : 1.1 - (t - 0.15) * 0.5;
    return {
      opacity: on.value * (t > 0.92 ? (1 - t) / 0.08 : 1),
      transform: [{ translateX: x - SIZE / 2 }, { translateY: y - SIZE / 2 }, { scale: s }, { rotate: `${t * 240}deg` }],
    };
  });
  const cashStyle = useAnimatedStyle(() => ({ opacity: 1 - gem.value }));
  const gemStyle = useAnimatedStyle(() => ({ opacity: gem.value }));
  return (
    <Animated.View style={[styles.piece, style]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, cashStyle]}>
        <GameIcon icon={cashIcon} size={SIZE} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, gemStyle]}>
        <GameIcon icon={gemIcon} size={SIZE} />
      </Animated.View>
    </Animated.View>
  );
});

export function FlyLayer() {
  const t = useTheme();
  const pieces = useRef<(PieceHandle | null)[]>([]);
  const cursor = useRef(0);
  useEffect(
    () =>
      fly.subscribe((f: Flight) => {
        const rect = targets.get(f.to);
        if (!rect) return;
        const x1 = rect.x + rect.width / 2;
        const y1 = rect.y + rect.height / 2;
        const n = Math.max(1, Math.min(PER_FLIGHT, Math.round(f.count)));
        for (let i = 0; i < n; i++) {
          const piece = pieces.current[cursor.current % POOL];
          cursor.current++;
          if (!piece) continue;
          const sx = f.from.x + (Math.random() - 0.5) * 36;
          const sy = f.from.y + (Math.random() - 0.5) * 24;
          piece.launch({
            x0: sx,
            y0: sy,
            x1,
            y1,
            cx: (sx + x1) / 2 + (Math.random() - 0.5) * 120,
            cy: Math.min(sy, y1) - 40 - Math.random() * 70,
            delay: i * 45,
            duration: 520 + Math.random() * 160,
            gem: f.kind === 'gems',
            to: f.to,
          });
        }
      }),
    [],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: POOL }, (_, i) => (
        <Piece
          key={i}
          ref={(h) => {
            pieces.current[i] = h;
          }}
          cashIcon={t.strings.currencyIcon}
          gemIcon={t.strings.gemIcon}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
  center: { alignItems: 'center', justifyContent: 'center' },
});
