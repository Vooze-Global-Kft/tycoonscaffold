/**
 * Celebration banners: a card drops in under the scene's top buttons whenever something good
 * happens (a new station, a milestone, a hire, a reward). Rules from the design sheet:
 * - at most one banner every 1.5 s;
 * - a burst of the same kind becomes ONE banner ("3 milestones", "4 rewards");
 * - banners never block touches and sit below the scene's top buttons, so nothing the player
 *   needs is covered.
 *
 * The store keeps only the last few celebrations, so this layer counts arrivals itself (ids grow
 * one by one) and tidies the store's queue as banners finish.
 */
import { Canvas, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame, type Celebration } from '../../state/store';
import { useHomeMetrics } from '../home/layout';
import { useHomeUi } from '../home/uiState';
import { useTheme } from '../theme';
import { GameIcon } from './GameIcon';

const CONFETTI = 22;
/** Time a banner is fully visible. */
const HOLD_MS = 1500;
/** At least this long between the starts of two banners. */
const MIN_GAP_MS = 1500;
/** The scene's top buttons are 44 pt tall at 8 pt from the scene's top: banners go below them. */
const BELOW_SCENE_BUTTONS = 60;

/** One banner on screen: one celebration, or several of the same kind merged. */
interface Shown {
  id: number;
  kind: Celebration['kind'];
  title: string;
  subtitle: string;
  icon: string;
  /** Highest store id this banner covers. */
  lastId: number;
}

const NOUN: Record<Celebration['kind'], string> = {
  unlock: 'new unlocks',
  milestone: 'milestones',
  hire: 'new hires',
  bonus: 'bonuses',
  venue: 'grand openings',
  reward: 'rewards',
};

/** Several celebrations of one kind as one banner. */
export function mergeCelebrations(items: Celebration[]): Shown {
  const last = items[items.length - 1];
  if (items.length === 1) return { id: last.id, kind: last.kind, title: last.title, subtitle: last.subtitle, icon: last.icon, lastId: last.id };
  return {
    id: last.id,
    kind: last.kind,
    title: `${items.length} ${NOUN[last.kind]}`,
    subtitle: items.map((c) => c.title).join(' · '),
    icon: last.icon,
    lastId: last.id,
  };
}

function ConfettiPiece({ p, width, color, seed }: { p: SharedValue<number>; width: number; color: string; seed: number }) {
  const c = useMemo(() => {
    const r = (n: number) => {
      const v = Math.sin(seed * 99.7 + n * 13.3) * 43758.5453;
      return v - Math.floor(v);
    };
    return { x0: width / 2 + (r(1) - 0.5) * 80, vx: (r(2) - 0.5) * width * 1.2, vy: -(140 + r(3) * 220), spin: (r(4) - 0.5) * 14, w: 6 + r(5) * 5, h: 9 + r(6) * 7 };
  }, [seed, width]);
  const transform = useDerivedValue(() => {
    const t = p.value;
    return [{ translateX: c.x0 + c.vx * t }, { translateY: c.vy * t + 560 * t * t }, { rotate: c.spin * t }];
  });
  const opacity = useDerivedValue(() => (p.value <= 0 ? 0 : Math.min(1, (1 - p.value) * 3)));
  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} r={2} color={color} />
    </Group>
  );
}

function Banner({ item, top, onDone }: { item: Shown; top: number; onDone: () => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const drop = useSharedValue(-40);
  const show = useSharedValue(0);
  const confetti = useSharedValue(0);
  const spin = useSharedValue(0);
  const iconPop = useSharedValue(0);
  const big = item.kind === 'venue' || item.kind === 'unlock' || item.kind === 'hire';

  useEffect(() => {
    show.value = withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => {
          if (done) runOnJS(onDone)();
        }),
      ),
    );
    drop.value = withSpring(0, { damping: 12, stiffness: 190 });
    if (big) confetti.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1);
    iconPop.value = withDelay(100, withSpring(1, { damping: 6, stiffness: 220 }));
    // Runs once per banner; the banner is keyed by id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rays = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = a0 + Math.PI / 14;
      b.moveTo(0, 0);
      b.lineTo(Math.cos(a0) * 40, Math.sin(a0) * 40);
      b.lineTo(Math.cos(a1) * 40, Math.sin(a1) * 40);
      b.close();
    }
    return b.build();
  }, []);
  const rayTransform = useDerivedValue(() => [{ translateX: 30 }, { translateY: 30 }, { rotate: spin.value * Math.PI * 2 }]);
  const cardStyle = useAnimatedStyle(() => ({ opacity: show.value, transform: [{ translateY: drop.value }, { scale: 0.92 + 0.08 * show.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconPop.value }, { rotate: `${(1 - iconPop.value) * -25}deg` }] }));
  const colors = [t.c.primary, t.c.accent, t.c.success, t.c.gradient[t.c.gradient.length - 1]];
  const accent = item.kind === 'venue' ? t.c.primary : t.c.accent;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {big ? (
        <Canvas style={[StyleSheet.absoluteFill, { top: top + 30 }]} pointerEvents="none">
          {Array.from({ length: CONFETTI }, (_, i) => (
            <ConfettiPiece key={i} p={confetti} width={width} color={colors[i % colors.length]} seed={item.id * 31 + i} />
          ))}
        </Canvas>
      ) : null}
      <Animated.View style={[styles.card, { top, backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: accent }, cardStyle]}>
        <View style={styles.iconBox}>
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Group transform={rayTransform} opacity={0.45}>
              <Path path={rays} color={accent} />
            </Group>
          </Canvas>
          <Animated.View style={iconStyle}>
            <GameIcon icon={item.icon} size={40} />
          </Animated.View>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.sub, { color: t.c.primary }]} numberOfLines={1}>
            {item.subtitle.toUpperCase()}
          </Text>
          <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {item.title}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function Celebrations() {
  const m = useHomeMetrics();
  const insets = useSafeAreaInsets();
  const dismiss = useGame((s) => s.dismissCelebration);
  const setBanner = useHomeUi((s) => s.setBannerOpen);
  const [current, setCurrent] = useState<Shown | null>(null);
  const queue = useRef<Celebration[]>([]);
  const lastSeen = useRef(0);
  const lastStart = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    const take = (list: Celebration[]) => {
      for (const c of list) {
        if (c.id > lastSeen.current) {
          queue.current.push(c);
          lastSeen.current = c.id;
        }
      }
    };
    const next = () => {
      if (busy.current || queue.current.length === 0 || timer.current) return;
      const wait = lastStart.current + MIN_GAP_MS - Date.now();
      if (wait > 0) {
        timer.current = setTimeout(() => {
          timer.current = null;
          next();
        }, wait);
        return;
      }
      // Everything of the first item's kind that is waiting goes into this one banner.
      const kind = queue.current[0].kind;
      const group = queue.current.filter((c) => c.kind === kind);
      queue.current = queue.current.filter((c) => c.kind !== kind);
      busy.current = true;
      lastStart.current = Date.now();
      setBanner(true);
      setCurrent(mergeCelebrations(group));
    };
    take(useGame.getState().celebrations);
    next();
    const unsub = useGame.subscribe((s, prev) => {
      if (s.celebrations === prev.celebrations) return;
      if (s.celebrations.length === 0) {
        // A reset or a dev preset cleared the queue.
        queue.current = [];
      }
      take(s.celebrations);
      next();
    });
    nextRef.current = next;
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [setBanner]);

  const onDone = () => {
    const shown = current;
    busy.current = false;
    setCurrent(null);
    setBanner(false);
    if (shown) {
      // Drop what this banner covered from the store's own queue.
      let guard = 8;
      while (guard-- > 0 && (useGame.getState().celebrations[0]?.id ?? Infinity) <= shown.lastId) dismiss();
    }
    nextRef.current();
  };

  if (!current) return null;
  return <Banner key={current.id} item={current} top={insets.top + m.header + BELOW_SCENE_BUTTONS} onDone={onDone} />;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  iconBox: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 6 },
  sub: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { fontSize: 21, marginTop: 1 },
});
