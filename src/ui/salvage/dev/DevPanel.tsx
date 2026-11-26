/**
 * Phones: the development panel of a development run (on with EXPO_PUBLIC_YARD_DEV=1 or
 * EXPO_PUBLIC_YARD_STRESS, ./switches.ts; never in a release build, where the switches are off and
 * SalvageShell does not mount it). Twice a second it shows the frame loop's numbers (frames a second
 * and the worst frame time of the last five seconds, actors, sprites, the frame's atlas draws `runs`) and the atlas, so the yard's
 * real frame time can be read on the owner's phone. The web preview takes ./DevPanel.web.tsx.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { FrameStats } from '../world/frameLoop';

export function DevPanel({ stats, top, left, atlas }: { stats: SharedValue<FrameStats>; top: number; left: number; atlas: string }) {
  const [s, setS] = useState<FrameStats>({ fps: 0, worstMs: 0, actors: 0, sprites: 0 });
  useEffect(() => {
    if (!__DEV__) return;
    const t = setInterval(() => setS(stats.value), 500);
    return () => clearInterval(t);
  }, [stats]);
  if (!__DEV__) return null;
  const runs = s.runs === undefined ? '' : `  runs ${s.runs}`;
  const line = `${s.fps.toFixed(1)} fps  worst ${s.worstMs.toFixed(1)} ms (5 s)  actors ${s.actors}  sprites ${s.sprites}${runs}  ${atlas}`;
  return (
    <View pointerEvents="none" style={[styles.box, { top, left }]}>
      <Text style={styles.text} allowFontScaling={false}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { color: '#9EF59E', fontSize: 11, fontVariant: ['tabular-nums'] },
});
