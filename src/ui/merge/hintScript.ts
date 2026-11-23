/**
 * The firefly's script (spec 3.1 with decisions M3, M18, M42 and M44), pure: no React, no store.
 * What the firefly shows at a given moment is `fireflyHint(cfg, g, ui)`; where it sits is `hintPath(...)`.
 *
 * - The guided steps, in the first season of a new game: the first merge, then the two scripted
 *   tickets (the fox's and the hedgehog's, 2.7 and M42: their deliveries and the merges that make
 *   their goods), then the first three purchases, for each of which the firefly points at the goal
 *   line whenever it names an affordable purchase (M44: it follows the rules' advice, so it never
 *   disagrees with the goal line; 3.1's fixed order of gear, shutter and Tea is dropped). Each step
 *   ends when the state says it is done, whatever the path, and a later step done ends the earlier
 *   ones (a player who went ahead is never sent back). They never block input: the firefly is a
 *   drawing under no finger.
 * - While a step's own action is possible, the firefly shows it after the hand rests (`QUIET_MS`);
 *   while it is not (too few coins, no pair yet), the rules' best hint shows only after
 *   `GUIDED_FALLBACK_MS` without a touch, so a player busy merging is left alone.
 * - After the guided steps: a firefly only after `IDLE_MS` (20 s) without a touch (3.1 "3:00").
 * - Never while a sheet or spoke is open, a good is armed, a chip shows or a finger is down.
 * Which hints apply is the rules' `hintsFor` (src/engine/merge/hints.ts); prices come from
 * `advice` only (no number of our own).
 *
 * Owned by the screens lead since the join (written by the hints and platform package).
 */
import * as R from '../../engine/merge';
import { cellRect, rectFromPlay, type MergeLayout, type Rect } from './layout';

/** The guided steps (3.1 with M44), in order: the first merge, the scripted tickets, the first three purchases. */
export const GUIDED_STEPS = ['merge', 'deliver', 'buy1', 'buy2', 'buy3'] as const;
export type GuidedStep = (typeof GUIDED_STEPS)[number];

/** After a touch the firefly waits this long before showing a guided step (as the shared hand's quiet, src/ui/hints/HintOverlay.tsx). */
export const QUIET_MS = 600;
/** During the guided steps, the rules' own hint (not the step's) waits this long without a touch. */
export const GUIDED_FALLBACK_MS = 8000;
/** After the guided steps, a firefly only after this long without a touch (3.1, "3:00"). */
export const IDLE_MS = 20000;

/** The advice kinds that are purchases (the goal line opens the sheet that buys them). */
const PURCHASES: ReadonlySet<R.AdviceKind> = new Set(['gear', 'stall', 'minderHire', 'minderLevel', 'openStall', 'shutter']);

/**
 * Purchases made this season, read from the state (season 1 of a new game: every level above 1,
 * every minder, every stall opened after the Grill, every shutter).
 */
export function purchasesMade(g: R.MergeGame): number {
  const m = g.merge;
  let n = 0;
  m.chains.forEach((ch, c) => {
    if (!ch.open) return;
    if (c > 0) n += 1;
    n += Math.max(0, ch.gear - 1) + Math.max(0, ch.stall - 1) + Math.max(0, ch.minder);
  });
  for (const k of m.shuttersOpened) n += k;
  return n;
}

/** Step `step` is done by the state, whoever did it (3.1: by any path). */
export function stepDone(g: R.MergeGame, step: GuidedStep): boolean {
  const m = g.merge;
  switch (step) {
    case 'merge':
      return m.feats.merges > 0;
    case 'deliver':
      // Both scripted tickets paid (M42: the script is 'done'), or two tickets paid by any path.
      return m.script === 'done' || m.feats.tickets >= 2;
    case 'buy1':
      return purchasesMade(g) >= 1;
    case 'buy2':
      return purchasesMade(g) >= 2;
    case 'buy3':
      return purchasesMade(g) >= 3;
  }
}

/** Guided steps exist only in the first season of a new game (2.7's scripted start is the same window). */
export function guidedSeason(g: R.MergeGame): boolean {
  return g.merge.season === 0 && g.merge.feats.seasonsClosed === 0;
}

/** The step the firefly guides now, or null once the guided steps are over (each done, or a later one done, or not the first season). */
export function currentStep(g: R.MergeGame): GuidedStep | null {
  if (!guidedSeason(g)) return null;
  let last = -1;
  GUIDED_STEPS.forEach((s, i) => {
    if (stepDone(g, s)) last = i;
  });
  for (let i = last + 1; i < GUIDED_STEPS.length; i++) if (!stepDone(g, GUIDED_STEPS[i])) return GUIDED_STEPS[i];
  return null;
}

/** What the firefly shows: a drag (a glowing trail from `from` to `to`) or a point at `to`; target keys of src/ui/hints/targets.ts. */
export interface FireflyHint {
  id: string;
  kind: 'drag' | 'point';
  from?: string;
  to: string;
  /** Part of the guided steps (3.1), not the idle firefly. */
  guided: boolean;
}

/** What the screen says about the hand: the firefly keeps away while any is true; `idleMs` since the last touch. */
export interface FireflyUi {
  sheetOpen: boolean;
  armed: boolean;
  fingerDown: boolean;
  idleMs: number;
}

/** The rules' hints, never throwing (a rules body may be mid-integration). */
export function rulesHints(cfg: R.MergeConfig, g: R.MergeGame): R.MergeHint[] {
  try {
    return R.hintsFor(cfg, g, {});
  } catch {
    return [];
  }
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const asHint = (h: R.MergeHint, guided: boolean): FireflyHint => ({ id: h.id, kind: h.kind, from: h.from, to: h.to, guided });

/**
 * The step's own pointer, or null while its action is not possible now. A purchase step points at
 * the goal line while it names a purchase the purse can pay (M44: the firefly follows the goal line,
 * the rules' `advice`, and so never names another purchase than the line does).
 */
export function stepPointer(cfg: R.MergeConfig, g: R.MergeGame, step: GuidedStep, hints: R.MergeHint[]): FireflyHint | null {
  const byId = (prefix: string) => hints.find((h) => h.id.startsWith(prefix)) ?? null;
  if (step === 'merge') {
    const h = byId('merge:');
    return h ? asHint(h, true) : null;
  }
  if (step === 'deliver') {
    // The delivery when the good exists; else the merge that makes it (3.1 0:08 traces the Twin Skewer to the fox).
    const h = byId('deliver:') ?? byId('merge:');
    return h ? asHint(h, true) : null;
  }
  const goal = safe(() => R.advice(cfg, g), null);
  if (!goal || !PURCHASES.has(goal.kind) || goal.cost > g.cash) return null;
  return { id: `step:goal:${goal.kind}:${goal.target ?? ''}`, kind: 'point', to: 'goal', guided: true };
}

/**
 * During the guided steps, after a stall opens and until its first good of tier 2 is made: the rules'
 * hint for that stall's goods (a merge of its drops, or a delivery of one to a ticket), or null.
 */
export function newStallPointer(g: R.MergeGame, hints: R.MergeHint[]): FireflyHint | null {
  const m = g.merge;
  let c = -1;
  m.chains.forEach((ch, i) => {
    if (ch.open && i > 0) c = i;
  });
  if (c < 0 || m.book[c]?.[1]) return null;
  const chainOf = (key: string | undefined) => {
    const n = key?.startsWith('cell:') ? Number(key.slice(5)) : -1;
    const cell = n >= 0 ? m.board[n] : null;
    return R.isGood(cell) ? cell.c : -1;
  };
  const h = hints.find((x) => x.id.startsWith(`merge:${c}:`)) ?? hints.find((x) => x.id.startsWith('deliver:') && chainOf(x.from) === c);
  return h ? asHint(h, true) : null;
}

/**
 * What the firefly shows now (3.1), or null. Never while the hand is busy or a dialog is open;
 * a guided step's own pointer after `QUIET_MS`; otherwise the rules' first hint after
 * `GUIDED_FALLBACK_MS` (guided season) or `IDLE_MS` (after it).
 */
export function fireflyHint(cfg: R.MergeConfig, g: R.MergeGame, ui: FireflyUi): FireflyHint | null {
  if (ui.sheetOpen || ui.armed || ui.fingerDown) return null;
  if (!g.merge) return null;
  const hints = rulesHints(cfg, g);
  const step = currentStep(g);
  if (step) {
    // A stall just opened (the review: the Tea stall's opening was hidden behind its sheet; the sheet
    // now closes): the firefly shows its first goods' merge or delivery before the next purchase.
    const fresh = newStallPointer(g, hints);
    if (fresh) return ui.idleMs >= QUIET_MS ? fresh : null;
    const own = stepPointer(cfg, g, step, hints);
    if (own) return ui.idleMs >= QUIET_MS ? own : null;
    return ui.idleMs >= GUIDED_FALLBACK_MS && hints[0] ? asHint(hints[0], false) : null;
  }
  return ui.idleMs >= IDLE_MS && hints[0] ? asHint(hints[0], false) : null;
}

// ----------------------------------------------------------------------------- where it sits

/** A rectangle of a target key from mergeLayout (the drawn targets of the play canvas and the bars' fixed zones), or null. */
export function layoutRect(layout: MergeLayout, key: string, ctx: { counters: number; shutterCells: (number | null)[] }): Rect | null {
  const r = playRect(layout, key, ctx);
  if (r) return rectFromPlay(layout, r);
  const [kind, arg] = key.split(':');
  switch (kind) {
    case 'goal':
      // Before the text row has measured itself: the middle half of the line, where its words sit.
      return { x: layout.goalLine.x + layout.goalLine.w / 4, y: layout.goalLine.y, w: layout.goalLine.w / 2, h: layout.goalLine.h };
    case 'basket':
      return layout.basket;
    case 'button': {
      const i = ['book', 'lanterns', 'season', 'shop'].indexOf(arg ?? '');
      return i >= 0 ? (layout.buttons[i] ?? null) : null;
    }
    default:
      return null;
  }
}

/** A drawn target of the play canvas, in its own (unscaled) points; layoutRect maps it to the screen. */
function playRect(layout: MergeLayout, key: string, ctx: { counters: number; shutterCells: (number | null)[] }): Rect | null {
  const [kind, arg] = key.split(':');
  const n = Number(arg);
  switch (kind) {
    case 'cell':
      return Number.isInteger(n) && n >= 0 && n < R.BOARD_CELLS ? cellRect(layout, n) : null;
    case 'counter': {
      const cols = layout.counters[Math.min(4, Math.max(2, ctx.counters)) as 2 | 3 | 4];
      return cols[n] ?? null;
    }
    case 'front':
      return layout.fronts[n] ?? null;
    case 'banner':
      return layout.banner;
    case 'shutter': {
      const cell = ctx.shutterCells[n];
      return cell === null || cell === undefined ? null : cellRect(layout, cell);
    }
    default:
      return null;
  }
}

export interface Point {
  x: number;
  y: number;
}

/** Firefly body radius with its glow, in points: what must stay clear of a price, the purse and a ticket's lines (4.5). */
export const FIREFLY_REACH = 14;

/**
 * Where the firefly sits on a target (4.5: never over a price, the purse or a ticket's lines):
 * - a cell: its centre (a good, no price); a next shutter: its top-left corner (its tag carries the price);
 * - a ticket column or the Festival banner as a drag's end: just below its bottom edge (3.1: "a
 *   trail may end at a ticket's edge"), never on its lines or price;
 * - the goal line: its left end, before the words (the price follows them);
 * - a sheet's buy button: its right end (the label and price sit in the middle);
 * - a stall front, a bottom-row button, the Basket, the gift bag: the middle.
 */
export function anchorOf(key: string, r: Rect): Point {
  const kind = key.split(':')[0];
  if (kind === 'counter' || kind === 'banner') return { x: r.x + r.w / 2, y: r.y + r.h + FIREFLY_REACH * 0.6 };
  if (kind === 'shutter') return { x: r.x + FIREFLY_REACH * 0.5, y: r.y + FIREFLY_REACH * 0.5 };
  // The goal line's words (its registered rectangle is the centred text row): just after their end,
  // past the price and the chevron, so the glow sits over the middle of the screen, never the purse
  // in the top bar's left corner (the review saw it there when it pointed at the line's left end).
  if (kind === 'goal') return { x: r.x + r.w + FIREFLY_REACH * 0.5, y: r.y + r.h / 2 };
  // A sheet's buy button (label and price centred): its right end, clear of the words and the price.
  if (kind === 'sheet' || kind === 'confirm' || kind === 'ticket') return { x: r.x + r.w - FIREFLY_REACH * 1.6, y: r.y + r.h / 2 };
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** A drag hint's path: a gentle arc from A to B through C (a quadratic curve that lifts over the board), or a point. */
export interface HintPath {
  kind: 'drag' | 'point';
  a: Point;
  c: Point;
  b: Point;
}

/** The firefly's path for a hint, from the targets' rectangles (`rectOf` resolves a key), or null when a target is not on screen. */
export function hintPath(h: FireflyHint, rectOf: (key: string) => Rect | null): HintPath | null {
  const to = rectOf(h.to);
  if (!to) return null;
  const b = anchorOf(h.to, to);
  if (h.kind === 'point' || !h.from) return { kind: 'point', a: b, c: b, b };
  const from = rectOf(h.from);
  if (!from) return null;
  const a = anchorOf(h.from, from);
  const lift = Math.min(60, 18 + Math.hypot(b.x - a.x, b.y - a.y) * 0.18);
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift };
  return { kind: 'drag', a, c, b };
}

/** A point on the quadratic curve at t in [0, 1]. A worklet: the firefly's flight is computed on the UI thread. */
export function curveAt(t: number, ax: number, ay: number, cx: number, cy: number, bx: number, by: number): Point {
  'worklet';
  const u = 1 - t;
  return { x: u * u * ax + 2 * u * t * cx + t * t * bx, y: u * u * ay + 2 * u * t * cy + t * t * by };
}
