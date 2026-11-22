/**
 * The combo meter: appears while quick floor taps keep a combo going, shows the multiplier and
 * how close the next level is, and drains visibly so the player knows to keep tapping.
 * Re-renders once per tap only; the drain runs on the UI thread.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import { useGame } from '../../../../state/store';
import { alpha, useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import { SLOWMO } from './dev';

/** A single stray tap is not a combo; the meter shows from this many taps in a row. */
const SHOW_FROM = 2;

/**
 * `left` / `right` bound the free stretch of wall between the venue chip and the round buttons;
 * when it is too narrow the meter drops just below that row instead.
 */
export function ComboMeter({ layout, top, left, right, below }: { layout: SceneLayout; top: number; left: number; right: number; below: number }) {
  const t = useTheme();
  const taps = useGame((s) => s.combo.taps);
  const lastTapAt = useGame((s) => s.combo.lastTapAt);
  const comboCfg = useGame((s) => s.cfg.economy.combo);
  const mult = useGame((s) => E.comboMultiplier(s.cfg, s.combo.taps));
  const [alive, setAlive] = useState(false);
  const drain = useSharedValue(0);
  const shown = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (taps < SHOW_FROM || lastTapAt === 0) return;
    const left = (comboCfg.decayMs - (Date.now() - lastTapAt)) * SLOWMO;
    if (left <= 0) return;
    setAlive(true);
    shown.value = withTiming(1, { duration: 120 });
    drain.value = 1;
    drain.value = withTiming(0, { duration: left, easing: Easing.linear });
    const timer = setTimeout(() => {
      shown.value = withTiming(0, { duration: 180 });
      setTimeout(() => setAlive(false), 200);
    }, left);
    return () => clearTimeout(timer);
  }, [taps, lastTapAt, comboCfg.decayMs, drain, shown]);

  useEffect(() => {
    if (mult > 1) pop.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 280 }));
  }, [mult, pop]);

  const box = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: 0.85 + shown.value * 0.15 }] }));
  const bar = useAnimatedStyle(() => ({ width: `${drain.value * 100}%` }));
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  if (!alive) return null;

  const maxed = mult >= comboCfg.maxMultiplier;
  const levelProgress = maxed ? 1 : (taps % comboCfg.tapsPerLevel) / comboCfg.tapsPerLevel;
  const fill = maxed ? t.c.success : t.c.accent;
  const room = right - left;
  const fits = room >= 120;
  const width = fits ? Math.min(170, room) : Math.min(170, layout.width - 16);
  const x = fits ? left + (room - width) / 2 : (layout.width - width) / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top: fits ? top : below, left: x, width, backgroundColor: alpha('#1E1208', 0.72), borderColor: alpha(fill, 0.9) }, box]}>
      <Animated.View style={[styles.badge, { backgroundColor: fill }, badge]}>
        <Text style={[t.display, styles.badgeText]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
          ×{mult}
        </Text>
      </Animated.View>
      <View style={styles.body}>
        <Text style={[t.display, styles.name]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>
          {comboCfg.name}
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: '#FFFFFF' }, bar]} />
        </View>
        <View style={[styles.level, { width: `${levelProgress * 100}%`, backgroundColor: fill }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    paddingRight: 10,
  },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#2A1600', fontSize: 14 },
  body: { flex: 1, marginLeft: 7, justifyContent: 'center' },
  name: { color: '#FFFFFF', fontSize: 11, letterSpacing: 0.5 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 3 },
  fill: { height: 5, borderRadius: 3 },
  level: { height: 2, borderRadius: 1, marginTop: 2 },
});
