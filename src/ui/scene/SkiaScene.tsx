/**
 * Default 2D hero scene. Everything here is juice: a living backdrop (rotating
 * rays, drifting clouds or the game's own background image), a hero that
 * breathes and squashes when tapped, coin bursts, floating numbers, a combo
 * meter and the flying bonus.
 */
import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { gameAssets } from '../../config/game';
import * as E from '../../engine/economy';
import { formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { GameIcon } from '../components/GameIcon';
import { canSpawnBonus } from '../sim/scene/play/gate';
import { alpha, useTheme } from '../theme';

const PARTICLES = 10;
export const SCENE_HEIGHT = 230;

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

function Particle({ x, y, angle, p, color }: { x: number; y: number; angle: number; p: SharedValue<number>; color: string }) {
  const dist = useMemo(() => 50 + Math.random() * 40, []);
  const cx = useDerivedValue(() => x + Math.cos(angle) * dist * p.value);
  // Gravity: particles arc downwards as they fly out.
  const cy = useDerivedValue(() => y + Math.sin(angle) * dist * p.value + 60 * p.value * p.value);
  const r = useDerivedValue(() => 6 * (1 - p.value * 0.6));
  return <Circle cx={cx} cy={cy} r={r} color={color} />;
}

export function FloatingNumber({
  id,
  amount,
  x,
  y,
  big,
  symbol,
  color,
}: {
  id: number;
  amount: number;
  x: number;
  y: number;
  big?: boolean;
  symbol: string;
  color: string;
}) {
  const t = useTheme();
  const consume = useGame((s) => s.consumeTapEvent);
  const p = useSharedValue(0);
  // A little sideways drift so stacked numbers fan out.
  const drift = useMemo(() => (Math.random() - 0.5) * 50, []);
  useEffect(() => {
    p.value = withTiming(1, { duration: big ? 1200 : 900 }, (done) => {
      if (done) runOnJS(consume)(id);
    });
  }, [big, consume, id, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value * p.value,
    transform: [
      { translateX: x - 80 + drift * p.value },
      { translateY: y - 30 - p.value * (big ? 100 : 70) },
      { scale: (big ? 1.25 : 1) * (0.6 + Math.min(1, p.value * 6) * 0.4 + p.value * 0.15) },
    ],
  }));
  return (
    <Animated.Text pointerEvents="none" style={[styles.float, t.display, { color: big ? t.c.primary : color }, style]}>
      +{formatMoney(amount, symbol)}
    </Animated.Text>
  );
}

/** Soft clouds drifting across the backdrop. */
function Clouds({ width, height, clock, color }: { width: number; height: number; clock: SharedValue<number>; color: string }) {
  const clouds = useMemo(
    () => [
      { y: 0.18, r: 22, speed: 9, offset: 0.1 },
      { y: 0.36, r: 16, speed: 14, offset: 0.55 },
      { y: 0.1, r: 13, speed: 20, offset: 0.8 },
    ],
    [],
  );
  return (
    <>
      {clouds.map((c, i) => (
        <Cloud key={i} {...c} width={width} height={height} clock={clock} color={color} />
      ))}
    </>
  );
}

function Cloud({ y, r, speed, offset, width, height, clock, color }: { y: number; r: number; speed: number; offset: number; width: number; height: number; clock: SharedValue<number>; color: string }) {
  const transform = useDerivedValue(() => {
    const span = width + r * 8;
    const x = ((clock.value / 1000) * speed + offset * span) % span;
    return [{ translateX: x - r * 4 }, { translateY: height * y }];
  });
  return (
    <Group transform={transform} opacity={0.75}>
      <Circle cx={0} cy={0} r={r} color={color} />
      <Circle cx={r * 1.1} cy={-r * 0.45} r={r * 1.15} color={color} />
      <Circle cx={r * 2.3} cy={0} r={r * 0.95} color={color} />
      <Circle cx={r * 1.15} cy={r * 0.35} r={r} color={color} />
    </Group>
  );
}

/** Combo label plus a bar that drains until the combo expires. */
function ComboMeter() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const combo = useGame((s) => s.combo);
  const mult = E.comboMultiplier(cfg, combo.taps);
  const [alive, setAlive] = useState(false);
  const drain = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (combo.taps === 0) return;
    setAlive(true);
    drain.value = 1;
    drain.value = withTiming(0, { duration: cfg.economy.combo.decayMs, easing: Easing.linear });
    const timer = setTimeout(() => setAlive(false), cfg.economy.combo.decayMs);
    return () => clearTimeout(timer);
  }, [combo.lastTapAt, combo.taps, cfg.economy.combo.decayMs, drain]);

  useEffect(() => {
    if (mult > 1) pop.value = withSequence(withTiming(1.5, { duration: 90 }), withSpring(1, { damping: 5, stiffness: 260 }));
  }, [mult, pop]);

  const barStyle = useAnimatedStyle(() => ({ width: `${drain.value * 100}%` }));
  const labelStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }, { rotate: '-4deg' }] }));
  if (!alive) return null;
  const toNext = cfg.economy.combo.tapsPerLevel - (combo.taps % cfg.economy.combo.tapsPerLevel);
  const maxed = mult >= cfg.economy.combo.maxMultiplier;
  return (
    <View style={styles.combo} pointerEvents="none">
      {mult > 1 ? (
        <Animated.Text style={[styles.comboLabel, t.display, { color: t.c.primary }, labelStyle]}>
          {cfg.economy.combo.name} ×{mult}
        </Animated.Text>
      ) : (
        <Text style={[styles.comboHint, { color: t.c.textMuted }]}>{toNext} more for ×2!</Text>
      )}
      <View style={[styles.comboTrack, { backgroundColor: alpha(t.c.text, 0.12) }]}>
        <Animated.View style={[styles.comboFill, { backgroundColor: maxed ? t.c.success : t.c.primary }, barStyle]} />
      </View>
    </View>
  );
}

/** The bonus item: wobbles across the scene; tap it before it leaves. */
function BonusFlyer({ width }: { width: number }) {
  const t = useTheme();
  const activeId = useGame((s) => s.bonus.activeId);
  const collect = useGame((s) => s.collectBonus);
  const miss = useGame((s) => s.missBonus);
  const x = useSharedValue(-80);
  const wobble = useSharedValue(0);
  const fromLeft = useMemo(() => Math.random() > 0.5, [activeId]);
  const top = useMemo(() => 12 + Math.random() * 70, [activeId]);

  // Spawn check. Kept here so the bonus only appears while the scene is on screen.
  useEffect(() => {
    const timer = setInterval(() => {
      // Same rule as the sim scene: never under a dialog, a chest, an offer or a story beat.
      if (canSpawnBonus()) useGame.getState().spawnBonus();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeId === null || width === 0) {
      // Gone (caught or missed): stop the wobble, nothing may animate while it is off screen.
      cancelAnimation(wobble);
      cancelAnimation(x);
      return;
    }
    x.value = fromLeft ? -80 : width + 10;
    x.value = withTiming(fromLeft ? width + 10 : -80, { duration: 7500, easing: Easing.linear }, (done) => {
      if (done) runOnJS(miss)();
    });
    wobble.value = 0;
    wobble.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(wobble);
    };
  }, [activeId, fromLeft, miss, width, wobble, x]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: (wobble.value - 0.5) * 34 },
      { rotate: `${(wobble.value - 0.5) * 24}deg` },
      { scale: 1 + wobble.value * 0.12 },
    ],
  }));
  if (activeId === null) return null;
  return (
    <Animated.View style={[styles.flyer, { top }, style]}>
      <Pressable onPress={(e) => collect(x.value + e.nativeEvent.locationX, top + 30)} hitSlop={14}>
        <View style={[styles.flyerGlow, { backgroundColor: alpha(t.c.accent, 0.45) }]} />
        <GameIcon icon={t.icons.bonus} size={58} />
      </Pressable>
    </Animated.View>
  );
}

export function SkiaScene() {
  const t = useTheme();
  const tapHero = useGame((s) => s.tapHero);
  const taps = useGame((s) => s.tapEvents);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const clock = useClock();
  const squash = useSharedValue(1);
  const breathe = useSharedValue(0);
  const background = t.sceneBackground ? gameAssets[t.sceneBackground] : undefined;

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

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
  const glowR = useDerivedValue(() => Math.min(size.w, size.h) * (0.34 + breathe.value * 0.03));

  // Squash and stretch: wide and short on impact, then springs back; a gentle bob when idle.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -breathe.value * 7 },
      { rotate: `${(breathe.value - 0.5) * 3}deg` },
      { scaleX: 1 + (1 - squash.value) * 0.9 },
      { scaleY: squash.value * (1 + breathe.value * 0.03) },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.16 - breathe.value * 0.05,
    transform: [{ scaleX: 1 - breathe.value * 0.12 }],
  }));

  const onTap = (e: GestureResponderEvent) => {
    squash.value = withSequence(withTiming(0.82, { duration: 55 }), withSpring(1, { damping: 5, stiffness: 320 }));
    tapHero(e.nativeEvent.locationX, e.nativeEvent.locationY);
  };

  const heroSize = Math.min(size.w, size.h) * 0.62 || 120;
  return (
    <Pressable style={styles.wrap} onPress={onTap} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {background ? <Image source={background} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {background ? null : (
          <Circle cx={cx} cy={cy} r={Math.max(size.w, size.h)}>
            <RadialGradient c={vec(cx, cy)} r={Math.max(1, size.h * 0.9)} colors={[t.c.backgroundAlt, t.c.background]} />
          </Circle>
        )}
        <Group transform={rayTransform} opacity={background ? 0.12 : 0.2}>
          <Path path={rays} color={t.c.accent} />
        </Group>
        {background ? null : <Clouds width={size.w} height={size.h} clock={clock} color={t.c.surface} />}
        <Circle cx={cx} cy={cy} r={glowR} color={alpha(t.c.accent, 0.28)} />
        {taps.map((e) => (
          <Burst key={e.id} x={e.x} y={e.y} color={e.big ? t.c.primary : t.c.accent} />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.center} pointerEvents="none">
          <Animated.View style={[styles.shadow, { width: heroSize * 0.7, top: cy + heroSize * 0.44 }, shadowStyle]} />
          <Animated.View style={heroStyle}>
            <GameIcon icon={t.heroIcon} size={heroSize} />
          </Animated.View>
          <Text style={[styles.hint, { color: t.c.textMuted }]}>{t.strings.tapHint}</Text>
        </View>
        <ComboMeter />
        <BonusFlyer width={size.w} />
        {taps.map((e) => (
          <FloatingNumber key={e.id} {...e} symbol={t.strings.currencySymbol} color={t.c.text} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: SCENE_HEIGHT, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shadow: { position: 'absolute', height: 14, borderRadius: 100, backgroundColor: '#000' },
  hint: { position: 'absolute', bottom: 6, fontWeight: '700', fontSize: 12 },
  float: { position: 'absolute', left: 0, top: 0, width: 160, textAlign: 'center', fontSize: 22 },
  combo: { position: 'absolute', top: 10, left: 14, alignItems: 'flex-start' },
  comboLabel: { fontSize: 22 },
  comboHint: { fontSize: 12, fontWeight: '800' },
  comboTrack: { width: 110, height: 7, borderRadius: 4, marginTop: 4, overflow: 'hidden' },
  comboFill: { height: '100%', borderRadius: 4 },
  flyer: { position: 'absolute', left: 0 },
  flyerGlow: { position: 'absolute', left: -6, top: -6, width: 70, height: 70, borderRadius: 35 },
});
