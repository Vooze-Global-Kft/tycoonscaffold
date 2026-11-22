/**
 * Celebration banners: a card drops in from the top with spinning rays and a
 * shower of confetti whenever something good happens (new business, milestone,
 * manager hired, bonus caught). Queued, so quick successes play one by one.
 */
import { Canvas, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useGame, type Celebration } from '../../state/store';
import { useTheme } from '../theme';
import { GameIcon } from './GameIcon';

const CONFETTI = 26;
const SHOW_MS = 2100;

function ConfettiPiece({ p, width, color, seed }: { p: SharedValue<number>; width: number; color: string; seed: number }) {
  const c = useMemo(() => {
    const r = (n: number) => {
      const v = Math.sin(seed * 99.7 + n * 13.3) * 43758.5453;
      return v - Math.floor(v);
    };
    return { x0: width / 2 + (r(1) - 0.5) * 80, vx: (r(2) - 0.5) * width * 1.3, vy: -(160 + r(3) * 260), spin: (r(4) - 0.5) * 14, w: 7 + r(5) * 6, h: 10 + r(6) * 8 };
  }, [seed, width]);
  const transform = useDerivedValue(() => {
    const t = p.value;
    return [
      { translateX: c.x0 + c.vx * t },
      // Shoots up, then gravity wins.
      { translateY: 90 + c.vy * t + 620 * t * t },
      { rotate: c.spin * t },
    ];
  });
  const opacity = useDerivedValue(() => Math.min(1, (1 - p.value) * 3));
  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} r={2} color={color} />
    </Group>
  );
}

function Banner({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const drop = useSharedValue(-160);
  const confetti = useSharedValue(0);
  const spin = useSharedValue(0);
  const iconPop = useSharedValue(0);

  useEffect(() => {
    drop.value = withSequence(
      withSpring(0, { damping: 11, stiffness: 170 }),
      withDelay(SHOW_MS - 700, withTiming(-180, { duration: 260, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onDone)();
      })),
    );
    confetti.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) });
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1);
    iconPop.value = withDelay(120, withSpring(1, { damping: 6, stiffness: 220 }));
    // Runs once per banner; the banner is keyed by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rays = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = a0 + Math.PI / 10 / 1.4;
      b.moveTo(0, 0);
      b.lineTo(Math.cos(a0) * 70, Math.sin(a0) * 70);
      b.lineTo(Math.cos(a1) * 70, Math.sin(a1) * 70);
      b.close();
    }
    return b.build();
  }, []);
  const rayTransform = useDerivedValue(() => [{ translateX: 46 }, { translateY: 46 }, { rotate: spin.value * Math.PI * 2 }]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconPop.value }, { rotate: `${(1 - iconPop.value) * -25}deg` }] }));
  const colors = [t.c.primary, t.c.accent, t.c.success, t.c.gradient[t.c.gradient.length - 1]];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {Array.from({ length: CONFETTI }, (_, i) => (
          <ConfettiPiece key={i} p={confetti} width={width} color={colors[i % colors.length]} seed={item.id * 31 + i} />
        ))}
      </Canvas>
      <Animated.View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: t.c.accent }, cardStyle]}>
        <View style={styles.iconBox}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={rayTransform} opacity={0.5}>
              <Path path={rays} color={t.c.accent} />
            </Group>
          </Canvas>
          <Animated.View style={iconStyle}>
            <GameIcon icon={item.icon} size={64} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sub, { color: t.c.primary }]} numberOfLines={1}>{item.subtitle.toUpperCase()}</Text>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>{item.title}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function Celebrations() {
  const current = useGame((s) => s.celebrations[0]);
  const dismiss = useGame((s) => s.dismissCelebration);
  if (!current) return null;
  return <Banner key={current.id} item={current} onDone={dismiss} />;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconBox: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 10 },
  sub: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 26, marginTop: 2 },
});
