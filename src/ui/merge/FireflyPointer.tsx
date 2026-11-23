/**
 * The firefly (spec 3.1, 7.2): our own hint pointer (Pizza has a glove, Orbit a reticle), drawn by
 * the art kit (`drawFirefly`, `drawTrailPiece`), recorded once into pictures (never drawn per frame).
 *
 * - `FireflyPointer`: `parts.HintPointer` for the shared HintOverlay (a pointing hint inside a kit
 *   Sheet): the firefly hovering at the spot, its wings beating from the overlay's clock.
 * - `FireflyLayer`: the main screen's own hint layer (mounted by ./platform.tsx in the overlays):
 *   twice a second it asks the script (./hintScript.ts `fireflyHint`) and draws either a glowing
 *   trail from a good to its target with the firefly flying along it (a drag hint; the trail may end
 *   at a ticket's edge, never on its lines) or the firefly hovering beside a control (a point hint).
 *   It never catches a touch, hides at once when a finger lands, a good is armed, a spoke or any
 *   other dialog opens; while a sheet is open it shows only the button inside it that finishes the
 *   guided step (./hints.ts `sheetHints`: the gear level, the Tea stall, the shutter), at the
 *   button's right end, clear of its label and price. It flies for 6 s then rests still and half-faded for 9 s (no clock while it rests), and
 *   runs at 30 frames a second (4.5: 60 only while a finger is down or a flight runs on the board).
 * Targets: the registry (src/ui/hints/targets.ts) first, else mergeLayout's rectangles.
 * Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import { Canvas, Group, Picture, Skia, useClock, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as R from '../../engine/merge';
import { useGame } from '../../state/store';
import { useOverlaysOpen } from '../kit';
import type { HintPointerProps } from '../modeParts';
import { targets } from '../hints/targets';
import { drawFirefly, drawTrailPiece, FIREFLY_WINGS } from './art/animals.draw';
import { curveAt, fireflyHint, hintPath, layoutRect, QUIET_MS, type FireflyHint, type HintPath } from './hintScript';
import { sheetHints } from './hints';
import type { MergeLayout, Rect } from './layout';
import { useMergeUi } from './uiState';

// ----------------------------------------------------------------------------- pictures (recorded once)

interface FireflyArt {
  wings: SkPicture[];
  trail: SkPicture;
}

let art: FireflyArt | null | undefined;

function record(r: number, draw: (c: Parameters<typeof drawFirefly>[0]) => void): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(-r, -r, 2 * r, 2 * r));
  draw(c);
  return rec.finishRecordingAsPicture();
}

/** The firefly's wing poses and one trail piece, recorded on first use and kept for the app's life (never freed while a canvas may draw them). Null when Skia cannot record (the firefly then simply does not show). */
function fireflyArt(): FireflyArt | null {
  if (art !== undefined) return art;
  try {
    const wings = Array.from({ length: FIREFLY_WINGS }, (_, i) => record(24, (c) => drawFirefly(c, 1, i / Math.max(1, FIREFLY_WINGS - 1))));
    art = { wings, trail: record(10, (c) => drawTrailPiece(c, 1)) };
  } catch {
    art = null;
  }
  return art;
}

/** One frame every 33 ms (30 a second): the clock's value held between frames, so the canvas redraws at 30 fps. */
function useFrame(clock: SharedValue<number>): SharedValue<number> {
  return useDerivedValue(() => Math.floor(clock.value / 33) * 33);
}

/** Wing beat: one picture of the three shows at a time (a flip, README "Per frame"). */
function Wings({ t, pics }: { t: SharedValue<number>; pics: SkPicture[] }) {
  const o0 = useDerivedValue(() => (Math.floor(t.value / 90) % 3 === 0 ? 1 : 0));
  const o1 = useDerivedValue(() => (Math.floor(t.value / 90) % 3 === 1 ? 1 : 0));
  const o2 = useDerivedValue(() => (Math.floor(t.value / 90) % 3 === 2 ? 1 : 0));
  const ops = [o0, o1, o2];
  return (
    <>
      {pics.slice(0, 3).map((p, i) => (
        <Group key={i} opacity={ops[i]}>
          <Picture picture={p} />
        </Group>
      ))}
    </>
  );
}

// ----------------------------------------------------------------------------- the shared overlay's pointer

/** parts.HintPointer: the firefly hovering at (x, y) of HintOverlay's canvas, a little above and left of the spot. */
export function FireflyPointer({ x, y, clock, scale }: HintPointerProps) {
  const a = fireflyArt();
  const t = useFrame(clock);
  const transform = useDerivedValue(() => [{ translateX: x - 10 * scale }, { translateY: y - 12 * scale + Math.sin(t.value / 260) * 2 }, { scale: 1.3 * scale }]);
  if (!a) return null;
  return (
    <Group transform={transform}>
      <Wings t={t} pics={a.wings} />
    </Group>
  );
}

// ----------------------------------------------------------------------------- the main screen's layer

/** Fly for this long, then rest still and half-faded for REST_MS, then fly again (as the shared hand). */
const FLY_MS = 6000;
const REST_MS = 9000;
/** Ask the script this often. */
const ASK_MS = 500;
/** One flight from the good to its target, and the pause at the end (a drag hint). */
const TRAVEL_MS = 1400;
const LOOP_MS = 2300;
/** Room round the path for the firefly's glow. */
const MARGIN = 28;
/** Trail pieces: one every this many points along the arc, at most MAX_PIECES. */
const PIECE_GAP = 15;
const MAX_PIECES = 18;
/** The firefly's size on the board: a drag and a point. */
const DRAG_SCALE = 1.35;
const POINT_SCALE = 1.5;

/** A target's rectangle: registered by its owner, else from mergeLayout. */
function rectFor(layout: MergeLayout, key: string): Rect | null {
  const r = targets.get(key);
  if (r) return { x: r.x, y: r.y, w: r.width, h: r.height };
  const st = useGame.getState();
  const cfg = st.cfg as R.MergeConfig;
  const g = st.game as R.MergeGame;
  if (!R.isMerge(cfg) || !g.merge) return null;
  let shutterCells: (number | null)[] = [];
  try {
    shutterCells = R.mergeParams(cfg, g).shutters.map((s) => (s ? s.cell : null));
  } catch {
    shutterCells = [];
  }
  return layoutRect(layout, key, { counters: g.merge.counters.length, shutterCells });
}

/** Activity the rules can see (a merge, a delivery, a sale, a purchase), in case a control did not report its touch. */
function activitySignature(g: R.MergeGame): string {
  const m = g.merge;
  return `${m.freedAt}|${m.feats.merges}|${m.feats.tickets}|${m.chains.map((c) => `${c.open ? 1 : 0}${c.gear}.${c.stall}.${c.minder}`).join(',')}|${m.shuttersOpened.join(',')}`;
}

/** Which hint to show now (asked every ASK_MS and on every UI change), with its path on screen. */
function useFirefly(layout: MergeLayout): { hint: FireflyHint; path: HintPath } | null {
  const [shown, setShown] = useState<{ hint: FireflyHint; path: HintPath } | null>(null);
  const busy = useMergeUi((s) => s.fingerDown || s.armed !== null || s.chip !== null || s.spoke !== null);
  const sheet = useMergeUi((s) => s.sheet);
  const touchedAt = useMergeUi((s) => s.touchedAt);
  const dialogs = useOverlaysOpen() > 0;
  const activityAt = useRef(Date.now());
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // The rules' view of the hand: a change of the board by the player counts as a touch.
  useEffect(() => {
    const first = useGame.getState().game as R.MergeGame;
    let sig = first.merge ? activitySignature(first) : '';
    return useGame.subscribe((s) => {
      const g = s.game as R.MergeGame;
      if (!g.merge) return;
      const next = activitySignature(g);
      if (next !== sig) {
        sig = next;
        activityAt.current = Date.now();
      }
    });
  }, []);

  useEffect(() => {
    // A sheet open: only the control inside it that finishes the guided step (./hints.ts sheetHints); any other dialog: nothing.
    if (busy || (dialogs && !sheet)) {
      setShown(null);
      return;
    }
    const ask = () => {
      const st = useGame.getState();
      const cfg = st.cfg as R.MergeConfig;
      const g = st.game as R.MergeGame;
      if (!R.isMerge(cfg) || !g.merge || st.offline) {
        setShown(null);
        return;
      }
      const ui = useMergeUi.getState();
      const idleMs = Date.now() - Math.max(ui.touchedAt, activityAt.current);
      if (ui.sheet) {
        const inSheet = idleMs >= QUIET_MS ? sheetHints()[0] : undefined;
        const r = inSheet ? targets.get(inSheet.key) : null;
        const hint: FireflyHint | null = inSheet && r ? { id: `sheet:${inSheet.key}`, kind: 'point', to: inSheet.key, guided: true } : null;
        const path = hint ? hintPath(hint, () => (r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null)) : null;
        setShown((prev) => (!hint || !path ? null : prev && prev.hint.id === hint.id && samePath(prev.path, path) ? prev : { hint, path }));
        return;
      }
      const hint = fireflyHint(cfg, g, { sheetOpen: ui.sheet !== null || ui.spoke !== null, armed: ui.armed !== null || ui.chip !== null, fingerDown: ui.fingerDown, idleMs });
      const path = hint ? hintPath(hint, (k) => rectFor(layoutRef.current, k)) : null;
      setShown((prev) => {
        if (!hint || !path) return null;
        if (prev && prev.hint.id === hint.id && prev.hint.from === hint.from && prev.hint.to === hint.to && samePath(prev.path, path)) return prev;
        return { hint, path };
      });
    };
    ask();
    const timer = setInterval(ask, ASK_MS);
    return () => clearInterval(timer);
  }, [busy, dialogs, sheet, touchedAt]);
  return shown;
}

function samePath(a: HintPath, b: HintPath): boolean {
  const near = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
  return a.kind === b.kind && near(a.a, b.a) && near(a.b, b.b) && near(a.c, b.c);
}

/** The main screen's firefly: nothing at all while there is no hint (no canvas, no clock). */
export function FireflyLayer({ layout }: { layout: MergeLayout }) {
  const shown = useFirefly(layout);
  const a = fireflyArt();
  if (!shown || !a) return null;
  return <Flight key={`${shown.hint.id}|${shown.hint.from}|${shown.hint.to}`} path={shown.path} art={a} />;
}

/** The trail's pieces along the arc (static: recorded positions, no clock). */
function trailPoints(p: HintPath): { x: number; y: number }[] {
  if (p.kind !== 'drag') return [];
  const len = Math.hypot(p.c.x - p.a.x, p.c.y - p.a.y) + Math.hypot(p.b.x - p.c.x, p.b.y - p.c.y);
  const n = Math.max(3, Math.min(MAX_PIECES, Math.round(len / PIECE_GAP)));
  const out: { x: number; y: number }[] = [];
  // Not at the very start (the good itself) nor the end (where the firefly settles).
  for (let i = 1; i < n; i++) out.push(curveAt(i / n, p.a.x, p.a.y, p.c.x, p.c.y, p.b.x, p.b.y));
  return out;
}

function Flight({ path, art: a }: { path: HintPath; art: FireflyArt }) {
  const [flying, setFlying] = useState(true);
  const [round, setRound] = useState(0);
  useEffect(() => {
    setFlying(true);
    let rest: ReturnType<typeof setTimeout> | undefined;
    const fly = setTimeout(() => {
      setFlying(false);
      rest = setTimeout(() => setRound((n) => n + 1), REST_MS);
    }, FLY_MS);
    return () => {
      clearTimeout(fly);
      if (rest) clearTimeout(rest);
    };
  }, [round]);

  const box = useMemo(() => {
    const xs = [path.a.x, path.b.x, path.c.x];
    const ys = [path.a.y, path.b.y, path.c.y];
    const x = Math.floor(Math.min(...xs) - MARGIN);
    const y = Math.floor(Math.min(...ys) - MARGIN);
    return { x, y, w: Math.ceil(Math.max(...xs) + MARGIN) - x, h: Math.ceil(Math.max(...ys) + MARGIN) - y };
  }, [path]);
  const local = useMemo<HintPath>(
    () => ({ kind: path.kind, a: { x: path.a.x - box.x, y: path.a.y - box.y }, c: { x: path.c.x - box.x, y: path.c.y - box.y }, b: { x: path.b.x - box.x, y: path.b.y - box.y } }),
    [path, box],
  );
  const pieces = useMemo(() => trailPoints(local), [local]);

  return (
    <View pointerEvents="none" style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h, opacity: flying ? 1 : 0.4 }]}>
      <Canvas style={{ width: box.w, height: box.h }} pointerEvents="none">
        {pieces.map((q, i) => (
          <Group key={i} transform={[{ translateX: q.x }, { translateY: q.y }, { scale: 0.75 + (0.35 * i) / Math.max(1, pieces.length) }]} opacity={0.5 + (0.4 * i) / Math.max(1, pieces.length)}>
            <Picture picture={a.trail} />
          </Group>
        ))}
        {flying ? <FlyingFirefly path={local} art={a} /> : <RestingFirefly path={local} art={a} />}
      </Canvas>
    </View>
  );
}

/** The firefly in flight: the one clock of this hint, only while it flies. */
function FlyingFirefly({ path, art: a }: { path: HintPath; art: FireflyArt }) {
  const clock = useClock();
  const t = useFrame(clock);
  const drag = path.kind === 'drag';
  const { a: A, c: C, b: B } = path;
  const transform = useDerivedValue(() => {
    if (!drag) {
      return [{ translateX: B.x }, { translateY: B.y - 4 + Math.sin(t.value / 300) * 3 }, { scale: POINT_SCALE }];
    }
    const phase = t.value % LOOP_MS;
    const u = Math.min(1, phase / TRAVEL_MS);
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const q = curveAt(e, A.x, A.y, C.x, C.y, B.x, B.y);
    return [{ translateX: q.x }, { translateY: q.y }, { scale: DRAG_SCALE }];
  });
  const opacity = useDerivedValue(() => {
    if (!drag) return 1;
    const phase = t.value % LOOP_MS;
    if (phase < 150) return phase / 150;
    if (phase > LOOP_MS - 250) return Math.max(0, (LOOP_MS - phase) / 250);
    return 1;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Wings t={t} pics={a.wings} />
    </Group>
  );
}

/** At rest: still, at the target (no clock). */
function RestingFirefly({ path, art: a }: { path: HintPath; art: FireflyArt }) {
  const t = useSharedValue(0);
  const scale = path.kind === 'drag' ? DRAG_SCALE : POINT_SCALE;
  return (
    <Group transform={[{ translateX: path.b.x }, { translateY: path.b.y }, { scale }]}>
      <Wings t={t} pics={a.wings} />
    </Group>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute' },
});
