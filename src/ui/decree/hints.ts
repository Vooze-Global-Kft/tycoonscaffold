/**
 * The pen's script (spec 3.1, 4.5 "Hints never cover a number"), pure: no React, no store. What the
 * drawn pen shows now is `penHint(cfg, g, ui)`; whether it plays a stroke now is `shouldPlay`; where it
 * moves is `penPath(...)`. ./PenPointer.tsx draws it (the shared hint layer's `parts.HintPointer` and
 * the desk's own pen layer); ./platform.tsx mounts the layer.
 *
 * The guided steps come from the rules' `hintsFor` (src/engine/decree/hints.ts, through the index):
 * - 0:02 paper 1 teaches refusal: the pen pulls it down toward the drawer (`pull`), once;
 * - 0:10 paper 2 teaches signing: the pen pushes it up toward the out-tray (`push`), once;
 * - 0:16 the first budget slip: the pen points at it (`point`), once.
 * Each ends when the state says it is done, by ANY path (the flick, the tap-tap path, the buttons of
 * "Buttons instead of flicks", a screen reader's action): the rules count refusals, signatures and
 * slips taken, not the gesture. A step the player ignores plays again only after `IDLE_MS` without a
 * touch; it never blocks input (the pen is a drawing under no finger), so a player who ignores it is
 * never stuck: every paper can still be decided, and the visitors keep coming.
 * After the guided steps a hint only after `IDLE_MS` (20 s) without a touch: the slip on the desk
 * (point), else the paper on the desk (a short rock up and down over its header, "either way").
 * Never while a sheet, a view or the in-tray peek is open, a strip is armed or a finger is down.
 * Never over a number: on a paper the nib and the pen's body stay inside the header and proposal rows
 * (paperMetrics), between the two strips that print the numbers; on a slip the nib touches its lower
 * edge from below, the body on the baize.
 *
 * Owned by the hints and platform package (PLATFORM).
 */
import * as R from '../../engine/decree';
import type { DeskLayout, Rect } from './layout';
import { paperMetrics } from './paperMetrics';

/** After a touch the pen waits this long before a guided stroke (as the shared hand's quiet). */
export const QUIET_MS = 600;
/** After the guided steps (and before a guided step plays again), a pen only after this long without a touch (3.1). */
export const IDLE_MS = 20000;

/** What the pen does: pull a paper down, push it up, point at a slip, rock over the paper. */
export type PenKind = 'pull' | 'push' | 'point' | 'rock';

export interface PenHint {
  /** Stable for one teaching moment: the step and the desk item it is about. */
  id: string;
  kind: PenKind;
  /** The target key (src/ui/hints/targets.ts): 'paper' or 'slip'. */
  target: 'paper' | 'slip';
  /** Part of the guided steps of 3.1 (not the idle pen). */
  guided: boolean;
}

/** What the screen says about the hand. */
export interface PenUi {
  sheetOpen: boolean;
  viewOpen: boolean;
  peek: boolean;
  armed: boolean;
  fingerDown: boolean;
  /** Ms since the last touch. */
  idleMs: number;
}

/** What the layer remembers of the pen's last stroke. */
export interface PenMemory {
  lastId: string | null;
  /** Ms since that stroke played. */
  msSinceLast: number;
}

/** The rules' hint keys, never throwing (a rules body may be mid-integration). */
export function rulesHints(cfg: R.DecreeConfig, g: R.DecreeGame): string[] {
  try {
    return R.hintsFor(cfg, g);
  } catch {
    return [];
  }
}

/** The desk item's identity, for the hint's id: a paper's id, a slip's purchase, or 'none'. */
function deskId(g: R.DecreeGame): string {
  const desk = g.decree.desk;
  if (!desk) return 'none';
  if (desk.type === 'paper') return `paper:${desk.paper.id}`;
  return `slip:${desk.slip.purchase.type}:${'ministry' in desk.slip.purchase ? desk.slip.purchase.ministry : desk.slip.purchase.monument}:${desk.landedAt}`;
}

/** The guided step the rules name now, as a pen hint, or null once the steps are over. */
export function guidedHint(cfg: R.DecreeConfig, g: R.DecreeGame): PenHint | null {
  if (!g.decree) return null;
  const keys = rulesHints(cfg, g);
  const id = deskId(g);
  if (keys[0] === 'paper' && keys[1] === 'drawer') return { id: `refuse:${id}`, kind: 'pull', target: 'paper', guided: true };
  if (keys[0] === 'paper' && keys[1] === 'outTray') return { id: `sign:${id}`, kind: 'push', target: 'paper', guided: true };
  if (keys[0] === 'slip') return { id: `slip:${id}`, kind: 'point', target: 'slip', guided: true };
  return null;
}

/** The idle pen (after the guided steps): the slip on the desk, else the paper; null on an empty desk or outside governing and the run-up. */
export function idleHint(g: R.DecreeGame): PenHint | null {
  const d = g.decree;
  if (!d || (d.phase !== 'governing' && d.phase !== 'campaign') || d.pending) return null;
  const desk = d.desk;
  if (!desk) return null;
  const id = deskId(g);
  if (desk.type === 'slip') return { id: `idle:${id}`, kind: 'point', target: 'slip', guided: false };
  return { id: `idle:${id}`, kind: 'rock', target: 'paper', guided: false };
}

/**
 * What the pen shows now (3.1), or null: never while a dialog, a view or the peek is open, a strip is
 * armed or a finger is down; a guided step after `QUIET_MS`, the idle pen after `IDLE_MS`.
 */
export function penHint(cfg: R.DecreeConfig, g: R.DecreeGame, ui: PenUi): PenHint | null {
  if (ui.sheetOpen || ui.viewOpen || ui.peek || ui.armed || ui.fingerDown) return null;
  if (!g.decree || g.decree.pending) return null;
  const guided = guidedHint(cfg, g);
  if (guided) return ui.idleMs >= QUIET_MS ? guided : null;
  return ui.idleMs >= IDLE_MS ? idleHint(g) : null;
}

/**
 * Whether the pen plays a stroke for `hint` now: each teaching moment once (3.1 "once"), and again
 * only after `IDLE_MS` without a touch and `IDLE_MS` since it last played (a player who looked away).
 */
export function shouldPlay(hint: PenHint | null, ui: Pick<PenUi, 'idleMs'>, mem: PenMemory): boolean {
  if (!hint) return false;
  if (mem.lastId !== hint.id) return hint.guided ? ui.idleMs >= QUIET_MS : ui.idleMs >= IDLE_MS;
  return ui.idleMs >= IDLE_MS && mem.msSinceLast >= IDLE_MS;
}

// ----------------------------------------------------------------------------- where it moves

export interface Point {
  x: number;
  y: number;
}

/** A stroke: the nib from `a` to `b` (and back to `a` for a rock), the pen at `angle` degrees (HintPointerProps: 0 = body straight below the nib, positive from the lower right). */
export interface PenPath {
  a: Point;
  b: Point;
  angle: number;
  /** The pen's length in points. */
  len: number;
  /** Go there and back (rock) or one way. */
  back: boolean;
}

/** The pen's length on the desk: short, so its body stays inside the rows that print no number. */
export const PEN_LEN = 46;
/** The pen lies this far from upright (its body to the right of the nib, nearly level). */
export const PEN_ANGLE = 64;
/** Where the body of the pen ends, relative to the nib, for a pen at `angle` and `len` (rotation by −angle: positive leans to the lower right). */
export function penTail(angle: number, len: number): Point {
  const r = (angle * Math.PI) / 180;
  return { x: Math.sin(r) * len, y: Math.cos(r) * len };
}

/** The middle of the paper (header and proposal rows), in window points: the only place on a paper with no number. */
export function paperMiddle(layout: DeskLayout, paper: Rect = layout.paper): Rect {
  const m = paperMetrics(paper.h, layout.s);
  const top = paper.y + m.header.y;
  const bottom = paper.y + m.proposal.y + m.proposal.h;
  return { x: paper.x, y: top, w: paper.w, h: bottom - top };
}

/** Where the slip lies when the desk does not register it (the art kit's slip, about 240 × 110, centred on the paper's rectangle). */
export function slipFallback(layout: DeskLayout): Rect {
  const w = Math.min(240, layout.paper.w);
  const h = 110;
  return {
    x: layout.paper.x + (layout.paper.w - w) / 2,
    y: layout.paper.y + (layout.paper.h - h) / 2,
    w,
    h,
  };
}

/**
 * The stroke for a hint on this layout (`rectOf` gives a registered target's rectangle, else null:
 * the layout's own rectangles stand in). Every point of the pen (nib to tail) stays inside the
 * paper's middle rows for a paper, and below the slip for a slip.
 */
export function penPath(hint: PenHint, layout: DeskLayout, rectOf: (key: string) => Rect | null = () => null): PenPath {
  const tail = penTail(PEN_ANGLE, PEN_LEN);
  if (hint.target === 'slip') {
    const slip = rectOf('slip') ?? slipFallback(layout);
    // The nib touches the slip's lower edge from below, right of its middle (the price is printed inside the slip, never under the nib).
    const x = slip.x + slip.w * 0.62;
    const y = slip.y + slip.h + 3;
    return {
      a: { x, y: y + 16 },
      b: { x, y },
      angle: PEN_ANGLE,
      len: PEN_LEN,
      back: true,
    };
  }
  const paper = rectOf('paper') ?? layout.paper;
  const mid = paperMiddle(layout, paper);
  // The nib's column: left of the middle, so the body (to its right) ends inside the paper.
  const x = mid.x + Math.min(mid.w * 0.38, mid.w - tail.x - 12);
  const top = mid.y + 6;
  const bottom = mid.y + mid.h - tail.y - 6;
  const span = Math.max(0, bottom - top);
  if (hint.kind === 'pull')
    return {
      a: { x, y: top },
      b: { x, y: top + span },
      angle: PEN_ANGLE,
      len: PEN_LEN,
      back: false,
    };
  if (hint.kind === 'push')
    return {
      a: { x, y: top + span },
      b: { x, y: top },
      angle: PEN_ANGLE,
      len: PEN_LEN,
      back: false,
    };
  // rock: a short way up and down over the header, never into the proposal's lines' middle.
  const c = top + Math.min(span, 28);
  return {
    a: { x, y: c },
    b: { x, y: top },
    angle: PEN_ANGLE,
    len: PEN_LEN,
    back: true,
  };
}

/** The bounding box of everything the pen covers along a path (nib, body and the ink trail), for tests and for sizing its canvas. */
export function penReach(p: PenPath, pad = 4): Rect {
  const t = penTail(p.angle, p.len);
  const xs = [p.a.x, p.b.x, p.a.x + t.x, p.b.x + t.x];
  const ys = [p.a.y, p.b.y, p.a.y + t.y, p.b.y + t.y];
  const x0 = Math.min(...xs) - pad;
  const y0 = Math.min(...ys) - pad;
  return {
    x: x0,
    y: y0,
    w: Math.max(...xs) + pad - x0,
    h: Math.max(...ys) + pad - y0,
  };
}

/** How long one stroke lasts, in ms (fade in, move, hold, fade out). */
export const STROKE_MS = {
  fadeIn: 180,
  move: 1100,
  hold: 500,
  fadeOut: 260,
} as const;
export const STROKE_TOTAL = STROKE_MS.fadeIn + STROKE_MS.move + STROKE_MS.hold + STROKE_MS.fadeOut;

/**
 * The nib's position and the pen's opacity `t` ms into a stroke. A worklet: the pen moves on the UI
 * thread (the layer's clock); it calls nothing but arithmetic.
 */
export function strokeAt(t: number, ax: number, ay: number, bx: number, by: number, back: boolean): { x: number; y: number; o: number } {
  'worklet';
  const fi = STROKE_MS.fadeIn;
  const mv = STROKE_MS.move;
  const hd = STROKE_MS.hold;
  const fo = STROKE_MS.fadeOut;
  const o = t < fi ? t / fi : t < fi + mv + hd ? 1 : Math.max(0, 1 - (t - fi - mv - hd) / fo);
  let u = Math.min(1, Math.max(0, (t - fi) / mv));
  if (back) u = u < 0.5 ? u * 2 : (1 - u) * 2;
  // Ease in and out.
  const e = u * u * (3 - 2 * u);
  return { x: ax + (bx - ax) * e, y: ay + (by - ay) * e, o };
}
