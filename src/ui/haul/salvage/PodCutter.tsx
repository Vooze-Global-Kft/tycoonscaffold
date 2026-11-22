/**
 * The Salvage Bay's opening, one step (spec 4.6): a laser traces the pod's seam (0.8 s), the shell
 * splits (0.4 s) and the light of the best rarity inside rises. Everything moves on the UI thread
 * from one shared clock: the pod is two static pictures (closed, and open with its halves clipped
 * and pushed apart), the laser a line and a spark, the rarity light a picture whose opacity and
 * height follow the clock. Nothing is re-recorded per frame and nothing animates after the reveal
 * except the slow breathing of the light, which stops when the cutter unmounts.
 *
 * `onRevealed` fires once, on the JS thread, when the halves are apart (the reveal sound and the
 * contents list hang on it).
 */
import { Canvas, Circle, ClipOp, Group, Line, Picture, rect, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { cancelAnimation, Easing, runOnJS, useDerivedValue, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { picture } from '../art/pen';
import { drawPod, drawRarityLight, type PodTier } from '../art/pods.draw';
import { SPACE } from '../art/palette';

const CUT_MS = 800;
const SPLIT_MS = 400;
export const REVEAL_MS = CUT_MS + SPLIT_MS;

const pics = new Map<string, SkPicture>();
/** Memoised pod pictures (never freed: a mounted canvas may still draw one). */
function pic(key: string, draw: Parameters<typeof picture>[1]): SkPicture {
  let p = pics.get(key);
  if (!p) {
    p = picture({ x: -60, y: -110, w: 120, h: 170 }, draw);
    pics.set(key, p);
  }
  return p;
}

export function PodCutter({ tier, light, size, runKey, onRevealed }: { tier: PodTier; light: string; size: number; runKey: number; onRevealed: () => void }) {
  const scale = size / 70;
  const closed = useMemo(() => pic(`closed:${tier}`, (c) => drawPod(c, tier)), [tier]);
  // "Open" at a hair's split: the seam is gone and the halves are drawn at the seam; the clock pushes them apart.
  // Each half is recorded with its own clip, so the halves move apart without a clip at draw time.
  const half = (top: boolean) => (c: SkCanvas) => {
    c.save();
    c.clipRect(top ? rect(-60, -110, 120, 110) : rect(-60, 0, 120, 60), ClipOp.Intersect, true);
    drawPod(c, tier, { split: 0.0001, inner: light });
    c.restore();
  };
  const openTop = useMemo(() => pic(`top:${tier}:${light}`, half(true)), [tier, light]);
  const openBot = useMemo(() => pic(`bot:${tier}:${light}`, half(false)), [tier, light]);
  const glowPic = useMemo(() => pic(`light:${light}`, (c) => drawRarityLight(c, light, 1)), [light]);

  const t = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    breathe.value = 0;
    t.value = withTiming(REVEAL_MS, { duration: REVEAL_MS, easing: Easing.linear }, (done) => {
      if (done) runOnJS(onRevealed)();
    });
    breathe.value = withDelay(REVEAL_MS + 400, withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(t);
      cancelAnimation(breathe);
    };
    // A new opening (runKey) restarts the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const cut = useDerivedValue(() => Math.min(1, t.value / CUT_MS));
  const split = useDerivedValue(() => Math.max(0, Math.min(1, (t.value - CUT_MS) / SPLIT_MS)));
  // Shown or hidden by scale (a picture inside a group ignores a 0 opacity on some back ends).
  const closedShow = useDerivedValue(() => [{ scale: split.value > 0 ? 0 : 1 }]);
  const openShow = useDerivedValue(() => [{ scale: split.value > 0 ? 1 : 0 }]);
  const topT = useDerivedValue(() => [{ translateY: -14 * split.value }]);
  const botT = useDerivedValue(() => [{ translateY: 14 * split.value }]);
  const laserEnd = useDerivedValue(() => ({ x: -30 + 60 * cut.value, y: 0 }));
  const laserX = useDerivedValue(() => -30 + 60 * cut.value);
  const laserShow = useDerivedValue(() => [{ scale: cut.value > 0 && split.value === 0 ? 1 : 0 }]);
  const lightOpacity = useDerivedValue(() => {
    const k = Math.max(0, Math.min(1, (t.value - CUT_MS - SPLIT_MS * 0.5) / 500));
    return k * (0.85 + 0.15 * breathe.value);
  });
  const lightT = useDerivedValue(() => {
    const k = Math.max(0, Math.min(1, (t.value - CUT_MS - SPLIT_MS * 0.5) / 500));
    return [{ translateY: -4 }, { scaleY: 0.3 + 0.7 * k }];
  });

  const w = size * 1.7;
  const h = size * 2.1;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Group transform={[{ translateX: w / 2 }, { translateY: h * 0.62 }, { scale }]}>
        <Group transform={closedShow}>
          <Picture picture={closed} />
        </Group>
        <Group transform={openShow}>
          <Group transform={topT}>
            <Picture picture={openTop} />
          </Group>
          <Group transform={botT}>
            <Picture picture={openBot} />
          </Group>
          <Group opacity={lightOpacity} transform={lightT} layer>
            <Picture picture={glowPic} />
          </Group>
        </Group>
        <Group transform={laserShow}>
          <Line p1={{ x: -30, y: 0 }} p2={laserEnd} color="rgba(255,79,94,0.35)" strokeWidth={4} />
          <Line p1={{ x: -30, y: 0 }} p2={laserEnd} color="#FFD0D0" strokeWidth={1.2} />
          <Circle cx={laserX} cy={0} r={4} color={SPACE.red} opacity={0.6} />
          <Circle cx={laserX} cy={0} r={1.4} color="#FFFFFF" />
        </Group>
      </Group>
    </Canvas>
  );
}
