/**
 * The loading animation drawn in one call, for Node (the art sheets, the tests, the frame renders):
 * the same layout, layers and composition the app uses (./LoadingStage.tsx), so a picture made here is
 * the app's frame. The app records the layers once and composes per frame; this records them per call.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { composeFrame } from './compose';
import { recordLayers } from './layers';
import { loadingLayout, type Insets } from './layout';
import { DEFAULT_WORDS, loadingPose, loadingTimeline, type LoadingPose } from './timeline';

const NO_INSETS: Insets = { top: 0, left: 0, right: 0, bottom: 0 };

/**
 * One frame at w x h points. `title` is the plates' words (default: the working title's three);
 * `insets` the safe area (default none); `still` reduced motion.
 */
export function drawLoading(c: SkCanvas, w: number, h: number, pose: LoadingPose, title: readonly string[] = DEFAULT_WORDS, insets: Insets = NO_INSETS, still = false): void {
  const words = title.map((s) => s.toUpperCase());
  const tl = loadingTimeline(words);
  const L = loadingLayout(w, h, insets, words);
  const Y = recordLayers(L, words, tl);
  const p = pose.plates.length === tl.n ? pose : loadingPose(pose.t, tl);
  composeFrame(c, Y, L, p, p.gate, still);
}
