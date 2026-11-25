/**
 * The loading animation on screen (S22, yard-stage1.md 6.4): one Skia canvas drawn on the UI thread
 * from one shared clock (./clock.ts). The parts are recorded once per screen size and title
 * (./layers.ts); every frame a worklet poses them (./timeline.ts) and composes them (./compose.ts),
 * so the animation keeps its 60 frames while the JavaScript thread bakes the yard's atlases.
 *
 * - `ready`: the yard beneath is baked; the gate parts as soon as the timeline allows (from 3.2 s with
 *   three words), else the calm loop holds (the magnet sways, the display ticks, the furnace breathes).
 * - A tap skips to the end from the second launch on (the first launch plays it whole).
 * - OPAQUE from its first frame (reviews P9, L11): the stage stands on a plain view of the splash's
 *   colour, and the picture comes up out of that colour in 0.3 s under a cover of the same colour, so
 *   nothing beneath ever shows through; it turns see-through only when the gate begins to part.
 * - The first frame draws from recorded pictures (15 ms); at its third frame the stage starts the yard's
 *   bake (world/useYard.ts startYardBake, H6) and its own images' bake in slices (./bake.ts, H5), and
 *   swaps the images in when they are done.
 * - Reduced motion: the final frame, with only the furnace breathing; the gate fades instead of parting.
 * - Sounds by id through the fx service (a missing id is silent): crane, plate, pour, cooled, gate.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet } from 'react-native';
import { Canvas, Picture, Skia } from '@shopify/react-native-skia';
import Animated, { runOnJS, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { fx } from '../../../services/fx';
import { S } from '../strings';
import { startYardBake } from '../world/useYard';
import { bakeLoading, withBaked } from './bake';
import { canSkip, curtainParting, loadingClock, markSeen, NOT_YET } from './clock';
import { composeFrame } from './compose';
import { loadingDev, noteFrame } from './dev';
import { recordLayers, type LoadingLayers } from './layers';
import { loadingLayout, titleWords, type Insets, type LoadingLayout } from './layout';
import { GATE_S, LOADING_SOUNDS, loadingCues, loadingPose, loadingTimeline, type LoadingTimeline } from './timeline';

interface Prepared {
  key: string;
  words: string[];
  tl: LoadingTimeline;
  L: LoadingLayout;
  Y: LoadingLayers;
  cues: number[];
  cueIds: string[];
}

/** The last prepared picture set: the shell's loading screen and the curtain over the yard share it. */
let cache: Prepared | null = null;

/** Pixels a point the parts are baked at after the first frames (as the yard's atlas: at most 3). */
const DENSITY = Math.max(1, Math.min(3, PixelRatio.get()));

/** Pictures only (review H5: the first frame never waits for a bake; the images come after it). */
function prepare(title: string, w: number, h: number, insets: Insets): Prepared {
  const words = titleWords(title);
  const key = `${words.join(' ')}|${w}x${h}|${insets.left},${insets.right},${insets.top},${insets.bottom}`;
  if (cache && cache.key === key) return cache;
  const tl = loadingTimeline(words);
  const L = loadingLayout(w, h, insets, words);
  const cueList = loadingCues(tl);
  cache = { key, words, tl, L, Y: recordLayers(L, words, tl, 0), cues: cueList.map((c) => c.t), cueIds: cueList.map((c) => c.id) };
  return cache;
}

/** The stage's third frame: the yard's bake and the stage's own images begin (H5, H6). */
const KICK_FRAME = 3;

/** Plays a loading sound by id; ids the sound engineer has not delivered yet are silent. */
function play(id: string): void {
  (fx.play as (name: string) => void)(id);
}

export interface LoadingStageProps {
  title: string;
  /** The splash's colour (game.json theme background): the stage stands on it until the gate parts. */
  splash: string;
  width: number;
  height: number;
  insets: Insets;
  /** The yard beneath is ready: the gate may part. */
  ready: boolean;
  /** The gate has parted (the stage can go). */
  onDone?: () => void;
}

export function LoadingStage({ title, splash, width, height, insets, ready, onDone }: LoadingStageProps) {
  const deviceStill = useReducedMotion();
  const still = loadingDev.still ?? deviceStill;
  const frozen = loadingDev.t;
  const P = useMemo(() => prepare(loadingDev.title ?? title, width, height, insets), [title, width, height, insets]);
  const readySV = useSharedValue(ready || loadingDev.ready);
  useEffect(() => {
    readySV.value = ready || loadingDev.ready;
  }, [ready, readySV]);

  // the parts as pictures first, with their images once baked (swapped in once, when all are done)
  const [Y, setY] = useState(() => withBaked(P.Y));
  const alive = useRef(true);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => {
    alive.current = true;
    setY(withBaked(P.Y));
    return () => {
      alive.current = false;
      cancel.current?.();
      cancel.current = null;
    };
  }, [P]);
  const kick = useCallback(() => {
    if (__DEV__) console.info(`[loading] third frame at ${typeof performance !== 'undefined' ? Math.round(performance.now()) : 0} ms after the page began: the yard's bake and the stage's images are asked for`);
    startYardBake();
    cancel.current?.();
    cancel.current = bakeLoading(P.Y, DENSITY, () => {
      if (alive.current) setY(withBaked(P.Y));
    });
  }, [P]);
  const frames = useSharedValue(0);

  const { tl, L, cues, cueIds } = P;
  const C = loadingClock;
  const gateFrom = still ? 0.6 : tl.gate[0];
  const ids = cueIds;
  const sound = (i: number) => play(ids[i]);
  const gateSound = () => play(LOADING_SOUNDS.gate);
  const finish = () => onDone?.();

  useFrameCallback((info) => {
    'worklet';
    if (frames.value < KICK_FRAME) {
      frames.value += 1;
      if (frames.value === KICK_FRAME) runOnJS(kick)();
    }
    if (frozen !== null) {
      C.t.value = frozen;
    } else {
      if (info.timestamp === C.last.value) return;
      C.last.value = info.timestamp;
      const ms = info.timeSincePreviousFrame ?? 16.7;
      noteFrame(ms);
      // a long frame (the bake holding the thread on the web) never jumps the picture
      C.t.value += Math.min(0.05, ms / 1000);
    }
    const t = C.t.value;
    if (!still && frozen === null) {
      while (C.cue.value < cues.length && t >= cues[C.cue.value]) {
        runOnJS(sound)(C.cue.value);
        C.cue.value += 1;
      }
    }
    if (!C.ended.value && t >= tl.end) {
      C.ended.value = true;
      runOnJS(markSeen)();
    }
    if (readySV.value && C.gateAt.value >= NOT_YET && t >= gateFrom) {
      C.gateAt.value = frozen !== null ? Math.max(0, t - GATE_S / 2) : t;
      if (frozen === null) runOnJS(gateSound)();
      runOnJS(curtainParting)();
    }
    if (C.gateAt.value < NOT_YET) {
      const g = Math.max(0, Math.min(1, (t - C.gateAt.value) / GATE_S));
      if (g !== C.gateP.value) C.gateP.value = g;
    }
    if (!C.done.value && C.gateAt.value < NOT_YET && t >= C.gateAt.value + GATE_S && frozen === null) {
      C.done.value = true;
      runOnJS(finish)();
    }
  });

  // the still background: redrawn only while the gate moves
  const back = useDerivedValue(() => {
    const r = Skia.PictureRecorder();
    const c = r.beginRecording(Skia.XYWHRect(0, 0, L.w, L.h));
    composeFrame(c, Y, L, null, C.gateP.value, still, 'bg');
    return r.finishRecordingAsPicture();
  });
  // the moving scene, every frame
  const front = useDerivedValue(() => {
    const pose = loadingPose(C.t.value, tl, C.gateAt.value, still);
    const r = Skia.PictureRecorder();
    const c = r.beginRecording(Skia.XYWHRect(0, 0, L.w, L.h));
    composeFrame(c, Y, L, pose, pose.gate, still, 'fg');
    return r.finishRecordingAsPicture();
  });

  // Opaque from the first frame (P9, L11): the stage stands on the splash's colour until the gate begins
  // to part; over the picture a cover of the same colour fades out over the clock's first 0.3 s (not
  // with reduced motion), so the picture comes up out of the splash and nothing beneath ever shows.
  const base = useAnimatedStyle(() => ({ backgroundColor: C.gateAt.value < NOT_YET ? 'transparent' : splash }));
  const cover = useAnimatedStyle(() => ({ opacity: still || C.gateAt.value < NOT_YET ? 0 : 1 - Math.min(1, C.t.value / 0.3) }));

  const skip = () => {
    if (!canSkip() || C.done.value) return;
    // to the end of the timeline: cooled bars, the ticket out; the gate parts as soon as the yard is ready
    if (C.t.value < tl.end) C.t.value = tl.end;
    C.cue.value = cues.length;
  };

  // one plain style object (the web canvas takes no style array)
  const canvasStyle = useMemo(() => ({ position: 'absolute' as const, left: 0, top: 0, width, height }), [width, height]);
  return (
    <Pressable style={[styles.fill, { width, height }]} onPress={skip} accessibilityRole="progressbar" accessibilityLabel={S.loading}>
      <Animated.View style={[styles.fill, { width, height }, base]} pointerEvents="none">
        <Canvas style={canvasStyle} pointerEvents="none">
          <Picture picture={back} />
        </Canvas>
        <Canvas style={canvasStyle} pointerEvents="none">
          <Picture picture={front} />
        </Canvas>
        <Animated.View style={[styles.fill, { width, height, backgroundColor: splash }, cover]} pointerEvents="none" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0 },
});
