/**
 * The round missions button on the scene (44 pt), with a dot counting missions ready to claim.
 * When something can be claimed it gives a small wiggle every few seconds: a nudge toward a
 * reward the player already earned, never toward spending. Hidden in a game without missions,
 * and in a sim game until the first transport hire (the design sheet keeps the scene quiet for
 * the first minute and a half), unless missions were already claimed or a reset happened.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAttentionBurst } from '../attention';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Dot } from '../../kit';
import { useTarget } from '../../hints/targets';
import { alpha, useTheme } from '../../theme';

export function MissionsButton({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const open = useGame((s) => s.openModal);
  const hasMissions = useGame((s) => s.cfg.meta.missions.templates.length > 0);
  const visible = useGame((s) => {
    if (s.cfg.mode !== 'sim') return true;
    if (s.game.prestigeCount > 0 || s.game.missions.total > 0) return true;
    return Object.values(s.game.venues).some((v) => v.chain?.transportManaged === true);
  });
  const ready = useGame((s) => M.missionViews(s.cfg, s.game).filter((m) => m.done).length);
  const target = useTarget(hasMissions && visible ? 'missionsButton' : null);

  const wiggle = useSharedValue(0);
  // Two wiggles, then a rest on a JS timer (no frames run while it rests).
  useAttentionBurst(ready > 0 && visible, () => {
    const one = () => withSequence(...[1, -1, 0.7, -0.7, 0].map((v) => withTiming(v, { duration: 90, easing: Easing.inOut(Easing.quad) })));
    wiggle.value = withSequence(one(), withTiming(0, { duration: 250 }), one());
  }, 2 * 450 + 250, 7000, 1500);
  useEffect(() => {
    if (ready > 0) return;
    cancelAnimation(wiggle);
    wiggle.value = withTiming(0, { duration: 120 });
  }, [ready, wiggle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 12}deg` }, { scale: 1 + Math.abs(wiggle.value) * 0.06 }] }));

  if (!hasMissions || !visible) return null;
  return (
    <Pressable
      {...target}
      onPress={() => open({ type: 'missions' })}
      accessibilityRole="button"
      accessibilityLabel={ready > 0 ? `Missions, ${ready} ready to claim` : 'Missions'}
      hitSlop={4}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: t.c.surface, borderColor: ready > 0 ? t.c.success : alpha(t.c.text, 0.12) },
          style,
        ]}
      >
        <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }} allowFontScaling={false}>
          📋
        </Text>
      </Animated.View>
      {ready > 0 ? (
        <View style={styles.dot} pointerEvents="none">
          <Dot count={ready} style={{ minWidth: 20, height: 20, borderRadius: 10 }} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: { position: 'absolute', top: -4, right: -4 },
});
