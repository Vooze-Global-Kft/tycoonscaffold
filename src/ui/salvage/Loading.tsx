/**
 * PLACEHOLDER loading screen of the salvage mode, shown while the save and fonts load (the real
 * loading animation, a crane lowering the logo, is designed later: docs/design/yard-design.md). A bar
 * that slides, the words of ./strings.ts, the game's background colour. It also covers the atlas bake
 * (../salvage/world/useYard.ts queues it at load). Landscape or portrait alike.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useGame } from '../../state/store';
import { PAL } from './palette';
import { S } from './strings';

export function SalvageLoading() {
  const bg = useGame((s) => s.cfg.theme.colors.background);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: -60 + t.value * 120 }] }));
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <Text style={styles.title}>{S.loading}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, bar]} />
      </View>
      <Text style={styles.note}>{S.loadingNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: PAL.paper, marginBottom: 16 },
  track: { width: 180, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', alignItems: 'center' },
  bar: { width: 60, height: 10, borderRadius: 5, backgroundColor: PAL.accent },
  note: { marginTop: 14, fontSize: 12, color: 'rgba(244,238,220,0.6)' },
});
