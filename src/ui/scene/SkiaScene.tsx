/**
 * Default 2D hero scene: glowing backdrop with rotating light rays (Skia),
 * a bouncing hero icon, coin bursts and floating "+$" numbers on every tap.
 */
import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { GameIcon } from '../components/GameIcon';
import { alpha, useTheme } from '../theme';

const PARTICLES = 10;

export function Burst({ x, y, color }: { x: number; y: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const angles = useMemo(() => Array.from({ length: PARTICLES }, (_, i) => (i / PARTICLES) * Math.PI * 2 + Math.random() * 0.4), []);
  const opacity = useDerivedValue(() => 1 - p.value);
  return (
    <Group opacity={opacity}>
      {angles.map((a, i) => (
        <Particle key={i} x={x} y={y} angle={a} p={p} color={color} />
      ))}
    </Group>
  );
}

function Particle({ x, y, angle, p, color }: { x: number; y: number; angle: number; p: { value: number }; color: string }) {
  const dist = useMemo(() => 50 + Math.random() * 40, []);
  const cx = useDerivedValue(() => x + Math.cos(angle) * dist * p.value);
  // Gravity: particles arc downwards as they fly out.
  const cy = useDerivedValue(() => y + Math.sin(angle) * dist * p.value + 60 * p.value * p.value);
  const r = useDerivedValue(() => 6 * (1 - p.value * 0.6));
  return <Circle cx={cx} cy={cy} r={r} color={color} />;
}

export function FloatingNumber({ id, amount, x, y, symbol, color }: { id: number; amount: number; x: number; y: number; symbol: string; color: string }) {
  const consume = useGame((s) => s.consumeTapEvent);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 900 }, (done) => {
      if (done) runOnJS(consume)(id);
    });
  }, [consume, id, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: x - 60 }, { translateY: y - 30 - p.value * 70 }, { scale: 1 + p.value * 0.2 }],
  }));
  return (
    <Animated.Text pointerEvents="none" style={[styles.float, { color }, style]}>
      +{formatMoney(amount, symbol)}
    </Animated.Text>
  );
}

export function SkiaScene() {
  const t = useTheme();
  const tapHero = useGame((s) => s.tapHero);
  const taps = useGame((s) => s.tapEvents);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const clock = useClock();
  const scale = useSharedValue(1);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const rays = useMemo(() => {
    const path = Skia.PathBuilder.Make();
    const R = Math.max(size.w, size.h);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = a0 + Math.PI / n / 1.5;
      path.moveTo(0, 0);
      path.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
      path.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
      path.close();
    }
    return path.build();
  }, [size.w, size.h]);
  const rayTransform = useDerivedValue(() => [{ translateX: cx }, { translateY: cy }, { rotate: (clock.value / 12000) * Math.PI * 2 }]);

  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onTap = (e: GestureResponderEvent) => {
    scale.value = withSequence(withTiming(0.85, { duration: 60 }), withSpring(1, { damping: 6, stiffness: 300 }));
    tapHero(e.nativeEvent.locationX, e.nativeEvent.locationY);
  };

  return (
    <Pressable style={styles.wrap} onPress={onTap} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={cx} cy={cy} r={Math.max(size.w, size.h)}>
          <RadialGradient c={vec(cx, cy)} r={Math.max(1, size.h * 0.8)} colors={[t.c.backgroundAlt, t.c.background]} />
        </Circle>
        <Group transform={rayTransform} opacity={0.18}>
          <Path path={rays} color={t.c.accent} />
        </Group>
        <Circle cx={cx} cy={cy} r={Math.min(size.w, size.h) * 0.32} color={alpha(t.c.accent, 0.25)} />
        {taps.map((e) => (
          <Burst key={e.id} x={e.x} y={e.y} color={t.c.accent} />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Animated.View style={heroStyle}>
            <GameIcon icon={t.heroIcon} size={Math.min(size.w, size.h) * 0.5 || 96} />
          </Animated.View>
          <Text style={[styles.hint, { color: t.c.textMuted }]}>{t.strings.tapHint}</Text>
        </View>
        {taps.map((e) => (
          <FloatingNumber key={e.id} {...e} symbol={t.strings.currencySymbol} color={t.c.text} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 200, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: 8, fontWeight: '700', fontSize: 12 },
  float: { position: 'absolute', left: 0, top: 0, width: 120, textAlign: 'center', fontWeight: '900', fontSize: 18 },
});
