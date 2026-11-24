/**
 * The pen (spec 3.1, 4.5; the art kit's `drawPen`, recorded once into a picture, never freed): the
 * decree mode's hint pointer. Pizza has a glove, Orbit a reticle, Lantern Row a firefly; here a
 * violet fountain pen that shows the flick itself.
 *
 * - `PenPointer`: `parts.HintPointer` for the shared HintOverlay (a pointing hint inside a kit Sheet):
 *   the pen at the spot, its nib there, still.
 * - `PenLayer`: the desk's own pen (mounted by ./platform.tsx in the overlays' PLATFORM block). Twice a
 *   second it asks the script (./hints.ts `penHint`, `shouldPlay`); when a stroke is due it mounts one
 *   small canvas over the paper and plays ONE stroke (a pull down toward the drawer, a push up toward
 *   the out-tray, a point at a slip, a rock "either way"), a dotted violet guide under it, then
 *   unmounts (nothing invisible animates; no clock between strokes). It never catches a touch and
 *   hides at once when a finger lands, a strip is armed or anything opens (uiState, the overlay count).
 *   30 frames a second (4.5: 60 only while a finger is down or a paper moves; the pen is neither).
 * Never over a number: the stroke stays in the paper's header and proposal rows (hints.ts `penPath`).
 * Targets: the registry (src/ui/hints/targets.ts 'paper', 'slip') first, else deskLayout's rectangles.
 *
 * Owned by the hints and platform package (PLATFORM).
 */
import { Canvas, DashPathEffect, Group, Path, Picture, Skia, useClock, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import * as R from '../../engine/decree';
import { useGame } from '../../state/store';
import { useOverlaysOpen } from '../kit';
import type { HintPointerProps } from '../modeParts';
import type { Hint, HintSource } from '../hints/source';
import { targets } from '../hints/targets';
import { DESK } from './art/palette';
import { drawPen } from './art/desk.draw';
import { guidedHint, penHint, penPath, penReach, shouldPlay, strokeAt, STROKE_TOTAL, type PenHint, type PenPath } from './hints';
import type { DeskLayout, Rect } from './layout';
import { useDecreeUi, wall } from './uiState';

// ----------------------------------------------------------------------------- the picture (recorded once)

/** The pen's length in its picture; drawn scaled to the path's `len`. */
const PIC_LEN = 64;
let penPic: SkPicture | null | undefined;

/** The pen, nib tip at the origin, body along +y; recorded on first use and kept for the app's life. Null when Skia cannot record (the pen then does not show). */
function penPicture(): SkPicture | null {
  if (penPic !== undefined) return penPic;
  try {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(-12, -4, 24, PIC_LEN + 12));
    drawPen(c, PIC_LEN);
    penPic = rec.finishRecordingAsPicture();
  } catch {
    penPic = null;
  }
  return penPic;
}

// ----------------------------------------------------------------------------- the shared overlay's pointer

/** parts.HintPointer: the pen with its nib at (x, y) of HintOverlay's canvas, leaning as `angle` says (0 = upright, body below). */
export function PenPointer({ x, y, scale, angle }: HintPointerProps) {
  const pic = penPicture();
  const transform = useMemo(() => [{ translateX: x }, { translateY: y }, { rotate: (-angle * Math.PI) / 180 }, { scale: 0.8 * scale }], [x, y, angle, scale]);
  if (!pic) return null;
  return (
    <Group transform={transform}>
      <Picture picture={pic} />
    </Group>
  );
}

// ----------------------------------------------------------------------------- the shared hint source

/**
 * The mode entry's `hints` (the shared HintOverlay's source): the guided step's target as a hint
 * (route: the target itself). The desk's own PenLayer draws the pen; the shared overlay only draws
 * inside a kit Sheet, and only its own dialog keys, so this source never doubles the pen. Never throws.
 */
export const decreeHints: HintSource = {
  ask: (): Hint[] => {
    try {
      const st = useGame.getState();
      const cfg = st.cfg as R.DecreeConfig;
      const g = st.game as R.DecreeGame;
      if (!R.isDecree(cfg) || !g.decree) return [];
      const h = guidedHint(cfg, g);
      return h ? [{ key: h.target, route: [h.target], row: null }] : [];
    } catch {
      return [];
    }
  },
  sceneKeys: ['paper', 'slip'],
};

// ----------------------------------------------------------------------------- the desk's layer

/** Ask the script this often. */
const ASK_MS = 500;

/** A target's rectangle from the registry, as a layout Rect, or null. */
function registered(key: string): Rect | null {
  const r = targets.get(key);
  return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
}

/** Activity the rules can see (a decision, a slip taken, a new item on the desk), in case a control did not report its touch. */
function activitySignature(g: R.DecreeGame): string {
  const d = g.decree;
  const desk = d.desk ? (d.desk.type === 'paper' ? d.desk.paper.id : `slip@${d.desk.landedAt}`) : '-';
  return `${d.stats.signed}|${d.stats.refused}|${d.stats.slipsTaken}|${desk}|${d.pending ? 1 : 0}|${d.phase}`;
}

/** The desk's pen: asks the script twice a second, plays one stroke when one is due. */
export function PenLayer({ layout }: { layout: DeskLayout }) {
  const overlaysOpen = useOverlaysOpen() > 0;
  const [stroke, setStroke] = useState<{
    hint: PenHint;
    path: PenPath;
    n: number;
  } | null>(null);
  const memory = useRef<{ lastId: string | null; playedAt: number }>({
    lastId: null,
    playedAt: 0,
  });
  const activity = useRef<{ sig: string; at: number }>({ sig: '', at: 0 });
  const open = useRef(overlaysOpen);
  open.current = overlaysOpen;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const ask = () => {
      const st = useGame.getState();
      const cfg = st.cfg as R.DecreeConfig;
      const g = st.game as R.DecreeGame;
      if (!R.isDecree(cfg) || !g.decree) return;
      const now = wall();
      const sig = activitySignature(g);
      if (sig !== activity.current.sig) activity.current = { sig, at: now };
      const ui = useDecreeUi.getState();
      const idleMs = now - Math.max(ui.touchedAt, activity.current.at);
      const pen = {
        sheetOpen: ui.sheet !== null || open.current || st.offline !== null,
        viewOpen: ui.view !== null,
        peek: ui.peek,
        armed: ui.armed !== null,
        fingerDown: ui.fingerDown,
        idleMs,
      };
      let hint: PenHint | null = null;
      try {
        hint = penHint(cfg, g, pen);
      } catch {
        hint = null;
      }
      const mem = memory.current;
      if (
        !shouldPlay(hint, pen, {
          lastId: mem.lastId,
          msSinceLast: now - mem.playedAt,
        })
      )
        return;
      if (!hint) return;
      const path = penPath(hint, layoutRef.current, registered);
      memory.current = { lastId: hint.id, playedAt: now };
      setStroke((s) => ({ hint: hint!, path, n: (s?.n ?? 0) + 1 }));
    };
    const timer = setInterval(ask, ASK_MS);
    return () => clearInterval(timer);
  }, []);

  // A touch, an armed strip or anything opening hides the pen at once.
  const busy = useDecreeUi((s) => s.fingerDown || s.armed !== null || s.sheet !== null || s.view !== null || s.peek);
  useEffect(() => {
    if (busy || overlaysOpen) setStroke(null);
  }, [busy, overlaysOpen]);
  const touchedAt = useDecreeUi((s) => s.touchedAt);
  useEffect(() => {
    setStroke((s) => (s && touchedAt > memory.current.playedAt ? null : s));
  }, [touchedAt]);

  // One stroke, then gone.
  useEffect(() => {
    if (!stroke) return;
    const t = setTimeout(() => setStroke(null), STROKE_TOTAL + 60);
    return () => clearTimeout(t);
  }, [stroke]);

  if (!stroke) return null;
  return <Stroke key={stroke.n} path={stroke.path} />;
}

/** Room round the path for the pen's shadow and the guide. */
const MARGIN = 14;

/** One stroke: the dotted guide from start to end and the pen moving along it, on its own small canvas (mounted only while it plays). */
function Stroke({ path }: { path: PenPath }) {
  const pic = penPicture();
  const box = useMemo(() => {
    const r = penReach(path, MARGIN);
    return {
      x: Math.floor(r.x),
      y: Math.floor(r.y),
      w: Math.ceil(r.w),
      h: Math.ceil(r.h),
    };
  }, [path]);
  const clock = useClock();
  const ax = path.a.x - box.x;
  const ay = path.a.y - box.y;
  const bx = path.b.x - box.x;
  const by = path.b.y - box.y;
  const back = path.back;
  const k = path.len / PIC_LEN;
  const rot = (-path.angle * Math.PI) / 180;
  // 30 frames a second: the clock held between frames.
  const at = useDerivedValue(() => strokeAt(Math.floor(clock.value / 33) * 33, ax, ay, bx, by, back));
  const transform = useDerivedValue(() => [{ translateX: at.value.x }, { translateY: at.value.y }, { rotate: rot }, { scale: k }]);
  const opacity = useDerivedValue(() => at.value.o);
  const guideOpacity = useDerivedValue(() => at.value.o * 0.55);
  const guide = useMemo(() => {
    try {
      const p = Skia.PathBuilder.Make();
      p.moveTo(ax, ay);
      p.lineTo(bx, by);
      if (!back) {
        // A small chevron at the end: the way the paper goes.
        const dir = by > ay ? 1 : -1;
        p.moveTo(bx - 5, by - 5 * dir);
        p.lineTo(bx, by);
        p.lineTo(bx + 5, by - 5 * dir);
      }
      return p.build();
    } catch {
      return null;
    }
  }, [ax, ay, bx, by, back]);
  if (!pic) return null;
  return (
    <View style={[styles.layer, { left: box.x, top: box.y, width: box.w, height: box.h }]} pointerEvents="none">
      <Canvas style={{ width: box.w, height: box.h }} pointerEvents="none">
        {guide ? (
          <Path path={guide} style="stroke" strokeWidth={1.6} strokeCap="round" color={DESK.violet} opacity={guideOpacity}>
            {back ? null : <DashPathEffect intervals={[2, 5]} />}
          </Path>
        ) : null}
        <Group transform={transform} opacity={opacity}>
          <Picture picture={pic} />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', zIndex: 50 },
});
