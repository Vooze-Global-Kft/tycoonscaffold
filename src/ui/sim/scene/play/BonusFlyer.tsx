/**
 * The flying bonus: now and then it crosses the room on a wavy path for about seven seconds.
 * Catching it pays out with a coin burst and coins flying to the cash counter; letting it go
 * costs nothing. It only appears while nothing else asks for the player's attention (gate.ts).
 */
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';
import { useGame } from '../../../../state/store';
import { GameIcon } from '../../../components/GameIcon';
import { fly } from '../../../juice/fly';
import { useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import { canSpawnBonus } from './gate';
import { noop } from './Hotspots';
import { bonusPoint, type BonusShared } from './shared';

const CROSS_MS = 7000;
const ICON = 54;
/** Generous hit area: it moves, and catching it should feel fair. */
const HIT = 76;

export function BonusFlyer({
  layout,
  bonus,
  toWindow,
  onCaught,
}: {
  layout: SceneLayout;
  bonus: BonusShared;
  /** Scene point to window point (for the coins flying to the header). */
  toWindow: (x: number, y: number) => { x: number; y: number };
  onCaught: (x: number, y: number) => void;
}) {
  const t = useTheme();
  const activeId = useGame((s) => s.bonus.activeId);
  const bonusName = useGame((s) => s.cfg.economy.bonus.name);
  const collect = useGame((s) => s.collectBonus);
  const spin = useSharedValue(0);
  const caught = useRef<number | null>(null);

  // The spawn check: once a second, while this scene is on screen.
  useEffect(() => {
    const id = setInterval(() => {
      if (canSpawnBonus()) useGame.getState().spawnBonus();
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Leaving the screen with a bonus in the air counts as a miss; otherwise no new one could spawn.
  useEffect(
    () => () => {
      if (useGame.getState().bonus.activeId !== null) useGame.getState().missBonus();
    },
    [],
  );

  const missIf = useCallback((id: number) => {
    const s = useGame.getState();
    if (s.bonus.activeId === id) s.missBonus();
  }, []);

  useEffect(() => {
    if (activeId === null) {
      bonus.on.value = withTiming(0, { duration: 150 });
      return;
    }
    // A fresh path each time: either direction, at a height over the room's open middle.
    const fromLeft = activeId % 2 === 0;
    const margin = HIT / 2;
    bonus.path.value = {
      x0: fromLeft ? -margin : layout.width + margin,
      x1: fromLeft ? layout.width + margin : -margin,
      y: layout.height * (0.3 + ((activeId * 0.37) % 1) * 0.25),
      amp: layout.height * 0.1,
      waves: 1.5,
    };
    bonus.p.value = 0;
    bonus.on.value = withTiming(1, { duration: 200 });
    bonus.p.value = withTiming(1, { duration: CROSS_MS, easing: Easing.linear }, (done) => {
      if (done) runOnJS(missIf)(activeId);
    });
    spin.value = 0;
    spin.value = withRepeat(withSequence(withTiming(1, { duration: 450, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 450, easing: Easing.inOut(Easing.sin) })), -1, true);
    return () => {
      cancelAnimation(bonus.p);
      cancelAnimation(spin);
    };
  }, [activeId, bonus, layout.height, layout.width, missIf, spin]);

  const style = useAnimatedStyle(() => {
    const pt = bonusPoint(bonus.path.value, bonus.p.value);
    return {
      opacity: bonus.on.value,
      transform: [{ translateX: pt.x - HIT / 2 }, { translateY: pt.y - HIT / 2 }, { rotate: `${spin.value * 14}deg` }, { scale: 1 + Math.abs(spin.value) * 0.08 }],
    };
  });

  if (activeId === null) return null;

  const onPress = () => {
    if (caught.current === activeId) return;
    caught.current = activeId;
    const pt = bonusPoint(bonus.path.value, bonus.p.value);
    cancelAnimation(bonus.p);
    collect(pt.x, pt.y);
    onCaught(pt.x, pt.y);
    fly.emit({ kind: 'cash', from: toWindow(pt.x, pt.y), to: 'header:cash', count: 10 });
  };

  return (
    <Animated.View style={[styles.flyer, style]}>
      <Pressable onPressIn={onPress} onPress={noop} unstable_pressDelay={0} style={styles.hit} accessibilityRole="button" accessibilityLabel={`Catch the ${bonusName}`}>
        <GameIcon icon={t.icons.bonus} size={ICON} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flyer: { position: 'absolute', left: 0, top: 0, width: HIT, height: HIT },
  hit: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
});
