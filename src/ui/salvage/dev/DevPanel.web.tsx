/**
 * Web preview only (Metro takes ./DevPanel.tsx on phones): the yard's development panel, on with
 * `?dev=1`, `?actors=N` or `?sprites=N` (./switches.web.ts). Twice a second it shows the frame loop's
 * numbers (../world/frameLoop.ts `stats`): frames a second and the worst frame time over the last five
 * seconds, actors moving, sprites drawn in the one atlas call, and the atlas's size. Load the yard with
 * `actors=` and `sprites=` until it stutters to measure the budget of docs/design/research/yard-tech.md B6.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { FrameStats } from '../world/frameLoop';

export function DevPanel({ stats, top, left, atlas }: { stats: SharedValue<FrameStats>; top: number; left: number; atlas: string }) {
  const [s, setS] = useState<FrameStats>({ fps: 0, worstMs: 0, actors: 0, sprites: 0 });
  useEffect(() => {
    const t = setInterval(() => setS(stats.value), 500);
    return () => clearInterval(t);
  }, [stats]);
  const line = `${s.fps.toFixed(1)} fps  worst ${s.worstMs.toFixed(1)} ms (5 s)  actors ${s.actors}  sprites ${s.sprites}  draws 4 (fill, ground, fence, atlas)  ${atlas}`;
  // Exposed for the preview's screenshot tool (scripts read it from the page).
  (globalThis as { __yardStats?: FrameStats }).__yardStats = s;
  return (
    <View pointerEvents="none" style={[styles.box, { top, left }]}>
      <Text style={styles.text}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { color: '#9EF59E', fontSize: 11, fontFamily: 'monospace' },
});
