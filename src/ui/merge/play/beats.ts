/**
 * The beats of the play canvas (spec 4.2, 3.1), each short and never blocking input, composed from
 * tweens (./effects.ts) for one batch of the rules' events (src/state/modeEvents.ts: the tick's and
 * every action's MergeEvents, the same ones src/modes/merge/fx.ts turns into sounds). Nothing here
 * guesses from a change of state: a beat plays because the rules said it happened.
 *
 * `beatsFor` is pure: it returns the tweens to queue, the cells to keep out of the still goods
 * picture while a good flies into them, and the paid tickets that need their snapshot.
 */
import * as R from '../../../engine/merge';
import { goodSprite, minderHeadSprite } from '../art/atlas';
import { GOOD_BOX } from '../art/goods.draw';
import { bannerGrid, ticketLayout } from '../art/street.draw';
import type { MergeLayout } from '../layout';
import { E_BACK, E_INOUT, E_LINEAR, E_OUT, K_ARRIVE, K_PAID, K_SHAKE, marker, sprite, type Tween } from './effects';
import { cellCentre, centreOf, counterCount, counterParts, FLOAT_SCALE } from './geometry';

type T = Omit<Tween, 'id'>;
type Pt = { x: number; y: number };

export interface BeatContext {
  L: MergeLayout;
  /** Counters at the street now. */
  counters: number;
  /** Where the purse and the Ladder Book button are (coins and stamps fly there). */
  purse: Pt;
  book: Pt;
  /** The floating good's centre when the finger let go (a drag), or null (tap-tap: the good leaves its cell). */
  from: Pt | null;
  /** The cell the dropped good came from (drag or tap-tap), or null for events of the tick. */
  fromCell: number | null;
  /** Festival lines shown as icons (the Steamer is open), and how many. */
  bannerLines: boolean;
  /** A free paid-ticket slot (0 or 1). */
  paidSlot: number;
}

export interface Beats {
  tweens: T[];
  /** Cells to leave out of the goods picture for `ms` (a good is on its way into them). */
  hide: { cell: number; ms: number }[];
  /** Paid tickets: counter, the ticket as paid, the coins paid, the slot its snapshot uses. */
  paid: { counter: number; ticket: R.Ticket; coins: number; slot: number }[];
}

const ms = (s: number) => Math.round(s * 1000);

export function beatsFor(events: readonly R.MergeEvent[], x: BeatContext): Beats {
  const out: Beats = { tweens: [], hide: [], paid: [] };
  const L = x.L;
  const cell = L.board.cell;
  const cs = cell / (GOOD_BOX * 2);
  const fxs = cell / 52;
  const cols = L.counters[counterCount(x.counters)];
  const tw = out.tweens;
  // The dropped good's source: the floating good, or its cell (tap-tap).
  const src = (): Pt | null => x.from ?? (x.fromCell !== null ? cellCentre(L, x.fromCell) : null);
  const srcScale = x.from ? cs * FLOAT_SCALE : cs;
  /** The held good lands in a cell: a quick drop from where it floats. Returns the landing time. */
  const land = (good: R.Good, to: number): number => {
    const s = src();
    if (!s) return 0;
    const d = 0.09;
    tw.push(sprite(0, goodSprite(good.c, good.k), s, cellCentre(L, to), d, { a0: srcScale, a1: cs, ease: E_LINEAR }));
    return d;
  };
  let paidSlot = x.paidSlot;
  let lastMerge: number | null = null;

  for (const e of events) {
    switch (e.type) {
      case 'merge': {
        const c = cellCentre(L, e.cell);
        lastMerge = e.cell;
        // The held good drops onto its twin (same good one tier down), then the new one settles with a puff.
        const t0 = land({ c: e.made.c, k: Math.max(1, e.made.k - (e.lucky ? 2 : 1) - (e.spark ? 1 : 0)) }, e.cell);
        if (t0 > 0) out.hide.push({ cell: e.cell, ms: ms(t0) });
        tw.push(sprite(1, 'fx-puff', c, { x: c.x, y: c.y - 4 }, 0.45, { a0: fxs * 0.6, a1: fxs * 1.55, o0: 0.95, o1: 0, delay: t0 }));
        tw.push(sprite(0, goodSprite(e.made.c, e.made.k), c, c, 0.26, { a0: cs * 1.3, a1: cs, ease: E_BACK, delay: t0 }));
        if (e.lucky || e.spark) {
          tw.push(sprite(1, 'fx-flash', c, c, 0.5, { a0: fxs * 0.5, a1: fxs * 1.7, o0: 1, o1: 0, delay: t0 + 0.04, spin: 0.6 }));
          tw.push(sprite(1, 'fx-flash', c, c, 0.4, { a0: fxs * 0.3, a1: fxs * 1.1, o0: 0.9, o1: 0, delay: t0 + 0.16, spin: -0.5 }));
        }
        if (e.made.k >= R.TIERS) {
          // The tier-8 burst: small lanterns flung out on a warm ring, bounded to about two cells and under a second.
          tw.push(sprite(1, 'fx-burst', c, c, 0.85, { a0: fxs * 0.8, a1: fxs * 2.3, o0: 1, o1: 0, delay: t0 + 0.05, spin: 0.4 }));
          tw.push(sprite(1, 'fx-flash', c, c, 0.6, { a0: fxs * 1, a1: fxs * 2, o0: 0.8, o1: 0, delay: t0 + 0.1 }));
        }
        break;
      }
      case 'discovery': {
        // The first-ever good's stamp flies to the Book button (3.1: "Twin Skewer stamps into the Ladder Book corner").
        const at = lastMerge !== null ? cellCentre(L, lastMerge) : null;
        if (!at) break;
        tw.push(sprite(1, 'stamp', at, at, 0.22, { a0: 1.5, a1: 0.95, o0: 0, o1: 0.95, delay: 0.25 }));
        tw.push(sprite(1, 'stamp', at, x.book, 0.7, { a0: 0.95, a1: 0.5, o0: 0.95, o1: 0.4, arc: 46, ease: E_INOUT, delay: 0.55 }));
        tw.push(sprite(0, goodSprite(e.good.c, e.good.k), at, x.book, 0.7, { a0: cs * 0.6, a1: cs * 0.35, o0: 1, o1: 0.5, arc: 46, ease: E_INOUT, delay: 0.55 }));
        break;
      }
      case 'drop':
      case 'released':
      case 'giftGoodPlaced': {
        const good = e.type === 'giftGoodPlaced' ? e.good : { c: e.c, k: e.k };
        const to = cellCentre(L, e.cell);
        const rail = { x: to.x, y: L.board.y + 2 };
        const d = Math.min(0.42, 0.16 + Math.floor(e.cell / R.BOARD_COLS) * 0.05);
        tw.push(sprite(1, 'fx-rise', { x: to.x, y: L.board.y + cell * 0.35 }, { x: to.x, y: L.board.y + cell * 0.3 }, d + 0.15, { a0: fxs * 0.7, a1: fxs * 0.9, o0: 0.75, o1: 0 }));
        tw.push(sprite(0, goodSprite(good.c, good.k), rail, to, d, { a0: cs * 0.35, a1: cs, o0: 0.6, o1: 1 }));
        out.hide.push({ cell: e.cell, ms: ms(d) });
        break;
      }
      case 'move': {
        const t = land(x.fromCell !== null ? goodAt(events, e.to) : { c: 0, k: 1 }, e.to);
        if (t > 0) out.hide.push({ cell: e.to, ms: ms(t) });
        break;
      }
      case 'swap': {
        // The held good lands; the one it met slides back to where the held one came from.
        const held = goodAt(events, e.to);
        const t = land(held, e.to);
        if (t > 0) out.hide.push({ cell: e.to, ms: ms(t) });
        const other = goodAt(events, e.from);
        tw.push(sprite(0, goodSprite(other.c, other.k), cellCentre(L, e.to), cellCentre(L, e.from), 0.18, { a0: cs, a1: cs }));
        out.hide.push({ cell: e.from, ms: ms(0.18) });
        break;
      }
      case 'return': {
        // Nothing changed: the held good goes home.
        const s = src();
        if (!s || !x.from) break;
        const g = goodAt(events, e.from);
        tw.push(sprite(0, goodSprite(g.c, g.k), s, cellCentre(L, e.from), 0.2, { a0: srcScale, a1: cs }));
        out.hide.push({ cell: e.from, ms: ms(0.2) });
        break;
      }
      case 'ticketShake': {
        tw.push(marker(K_SHAKE, e.counter, 0.75));
        const s = src();
        const g = x.fromCell !== null ? goodAt(events, x.fromCell) : null;
        if (s && g && x.from && x.fromCell !== null) {
          tw.push(sprite(0, goodSprite(g.c, g.k), s, cellCentre(L, x.fromCell), 0.22, { a0: srcScale, a1: cs }));
          out.hide.push({ cell: x.fromCell, ms: ms(0.22) });
        }
        break;
      }
      case 'lineFill': {
        const r = cols[e.counter];
        const good = lineGood(events, e.counter, e.line);
        const s = src();
        if (!r || !good || !s) break;
        const t = counterParts(r).ticket;
        const row = ticketLayout(t.w, t.h).rows[Math.min(2, e.line)];
        const to = { x: t.x + row.x + 13, y: t.y + row.y + row.h / 2 };
        tw.push(sprite(0, goodSprite(good.c, good.k), s, to, 0.22, { a0: srcScale, a1: 0.5, ease: E_INOUT }));
        tw.push(sprite(1, 'fx-flash', to, to, 0.3, { a0: 0.3, a1: 0.75, o0: 0.9, o1: 0, delay: 0.2 }));
        break;
      }
      case 'ticketPaid': {
        const r = cols[e.counter];
        if (!r) break;
        const t = counterParts(r).ticket;
        const c = centreOf(t);
        const slot = paidSlot;
        paidSlot = (paidSlot + 1) % 2;
        out.paid.push({ counter: e.counter, ticket: e.ticket, coins: e.coins, slot });
        // The FILLED stamp falls on the ticket (0.22 s), it rests, then folds into a paper lantern that floats to the purse with the coins.
        const fold = 0.72;
        tw.push({ ...marker(K_PAID, slot, fold, 0.18), x1: c.x, y1: c.y + 6 });
        for (let f = 0; f < 6; f++) tw.push(sprite(1, `fold-${f}`, c, { x: c.x, y: c.y - f * 3 }, 0.075, { delay: 0.18 + fold + f * 0.075, hold: f === 5 ? 0.05 : 0, ease: E_LINEAR }));
        const lift = 0.18 + fold + 6 * 0.075;
        const top = { x: c.x, y: c.y - 15 };
        tw.push(sprite(1, 'lantern-fly', top, x.purse, 0.7, { delay: lift, a0: 1.25, a1: 0.7, o0: 1, o1: 0.85, arc: 34, ease: E_INOUT }));
        for (let i = 0; i < 4; i++) {
          const o = { x: top.x + (i - 1.5) * 7, y: top.y + 10 + (i % 2) * 6 };
          tw.push(sprite(1, 'coin', o, x.purse, 0.6, { delay: lift + 0.08 + i * 0.07, a0: 1, a1: 0.8, o0: 1, o1: 0.8, arc: 22 + i * 6, ease: E_INOUT, spin: 3 }));
        }
        break;
      }
      case 'ticketDrawn':
        tw.push(marker(K_ARRIVE, e.counter, 0.4));
        break;
      case 'festivalLine': {
        const good = festivalGood(events, e.line);
        const s = src();
        if (!good || !s) break;
        const bn = L.banner;
        let to = centreOf(bn);
        if (x.bannerLines) {
          const g = bannerGrid(bn.w, bn.h)[Math.min(5, e.line)];
          to = { x: bn.x + g.x + g.size / 2, y: bn.y + g.y + g.size / 2 };
        }
        tw.push(sprite(0, goodSprite(good.c, good.k), s, to, 0.25, { a0: srcScale, a1: 22 / (GOOD_BOX * 2), ease: E_INOUT }));
        tw.push(sprite(1, 'fx-flash', to, to, 0.45, { a0: 0.4, a1: 1, o0: 0.95, o1: 0, delay: 0.22 }));
        break;
      }
      case 'festivalDone': {
        const c = centreOf(L.banner);
        tw.push(sprite(1, 'fx-burst', c, c, 0.9, { a0: 0.8, a1: 2, o0: 1, o1: 0, delay: 0.3 }));
        break;
      }
      case 'basketSell': {
        const s = src() ?? cellCentre(L, e.cell);
        const bk = centreOf(L.basket);
        tw.push(sprite(0, goodSprite(e.good.c, e.good.k), s, bk, 0.24, { a0: srcScale, a1: cs * 0.45, o0: 1, o1: 0.3, ease: E_INOUT }));
        for (let i = 0; i < 3; i++) tw.push(sprite(1, 'coin', { x: bk.x + (i - 1) * 8, y: bk.y - 6 }, x.purse, 0.6, { delay: 0.26 + i * 0.08, arc: 26 + i * 8, o0: 1, o1: 0.8, ease: E_INOUT, spin: 3 }));
        break;
      }
      case 'undo': {
        const g = goodAt(events, e.cell);
        const bk = centreOf(L.basket);
        tw.push(sprite(0, goodSprite(g.c, g.k), bk, cellCentre(L, e.cell), 0.3, { a0: cs * 0.5, a1: cs, arc: 20, ease: E_OUT }));
        out.hide.push({ cell: e.cell, ms: ms(0.3) });
        break;
      }
      case 'shutterOpen': {
        const c = cellCentre(L, e.cell);
        // The blind rolls up into the top of its cell and is gone; a little dust; a held good drops in.
        tw.push(sprite(0, 'shutter-next', c, { x: c.x, y: c.y - cell * 0.55 }, 0.36, { a0: cs, a1: cs * 0.92, o0: 1, o1: 0, ease: E_INOUT }));
        tw.push(sprite(1, 'fx-puff', c, c, 0.45, { a0: fxs * 0.5, a1: fxs * 1.2, o0: 0.7, o1: 0, delay: 0.18 }));
        if (e.good) tw.push(sprite(0, goodSprite(e.good.c, e.good.k), c, c, 0.28, { a0: cs * 1.3, a1: cs, ease: E_BACK, delay: 0.3 }));
        break;
      }
      case 'stallOpen': {
        const f = L.fronts[e.c];
        if (!f) break;
        const c = centreOf(f);
        tw.push(sprite(1, 'fx-flash', c, c, 0.55, { a0: 0.6, a1: 1.5, o0: 1, o1: 0 }));
        tw.push(sprite(1, 'fx-rise', { x: c.x, y: c.y + 4 }, { x: c.x, y: c.y - 8 }, 0.7, { a0: 0.8, a1: 1, o0: 0.8, o1: 0, delay: 0.1 }));
        break;
      }
      case 'minderHire': {
        const f = L.fronts[e.c];
        if (!f) break;
        const c = centreOf(f);
        tw.push(sprite(1, minderHeadSprite(e.c), { x: c.x, y: c.y + 12 }, { x: c.x, y: c.y }, 0.4, { a0: 0.6, a1: 1.3, o0: 1, o1: 0, ease: E_OUT }));
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** The good that is now at `cell` per the batch's own events is not known to the events; the caller passes it through `lookup`. */
let lookup: (cell: number) => R.Good | null = () => null;
let lineLookup: (counter: number, line: number) => R.Good | null = () => null;
let festLookup: (line: number) => R.Good | null = () => null;

/** The state after the batch, for the goods the events name only by cell or line (set by the canvas before `beatsFor`). */
export function setBeatLookups(cell: (cell: number) => R.Good | null, line: (counter: number, line: number) => R.Good | null, fest: (line: number) => R.Good | null): void {
  lookup = cell;
  lineLookup = line;
  festLookup = fest;
}

function goodAt(_events: readonly R.MergeEvent[], cell: number): R.Good {
  return lookup(cell) ?? { c: 0, k: 1 };
}
function lineGood(events: readonly R.MergeEvent[], counter: number, line: number): R.Good | null {
  // The last line's ticket is paid in the same batch and gone from the counter: its own lines say what landed.
  for (const e of events) if (e.type === 'ticketPaid' && e.counter === counter) return e.ticket.lines[line] ?? null;
  return lineLookup(counter, line);
}
function festivalGood(_events: readonly R.MergeEvent[], line: number): R.Good | null {
  return festLookup(line);
}
