/**
 * THE EMPTY STAGE-2 PART OF A STATE (contract version 3; yard-stage2.md 2.18 and 2.20; label contract2).
 * `freshStage2` is the one function that makes the stage's new fields fresh: create.ts spreads it into a
 * new yard and save.ts gives it to a layout-2 save (the owner's first yard) on load. `repairStage2` repairs
 * a layout-3 save's fields against what can be read (bounded, finite, nothing invented), and leaves the
 * first yard's fields alone.
 *
 * What is fresh, and why (2.20; the lead's notes for contract2):
 * - `works` {} and `routes` {}: nothing bought, every grade follows I's own allocation.
 * - `lots.nextAt` null: it is first set at `backFieldOpen` (never at creation or migration), so a save
 *   that reaches rung 3 later has no backlog of lots (E6).
 * - `reuse` null dates: no visitor before the first thing is ever racked, no van before a batch.
 * - `bank`: no agreement, the letter not seen.
 * - `iap.createdMs` = the creation's or the migration's device time (information only, RULING2 15.1);
 *   `iap.sessions2At` null: "the second session" begins when the next away card from an absence of at
 *   least 30 minutes is closed (2.15.2). [The lead's answer N3 in yard-stage2.md 11.3 said a migrated save at
 *   rung 2 or more gets it SET; the step's notes say null: null is built, the point is in requests.md.]
 * - `ads`: no count used on the creation's market day, no offer.
 * - `forklift` null: not owned.
 * Nothing here reads a tuned number, the clock beyond `now`, or randomness.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { LookSlot, SalvageState } from './types';
import { repairMoney } from './state2Money';
import { repairWorks } from './state2Works';

/** The stage-2 fields of SalvageState (2.18). */
export type Stage2Fields = Pick<SalvageState, 'works' | 'routes' | 'lots' | 'reuse' | 'bank' | 'iap' | 'ads' | 'forklift'>;
/** Their keys, in the state's order (the migration's test walks them). */
export const STAGE2_KEYS = ['works', 'routes', 'lots', 'reuse', 'bank', 'iap', 'ads', 'forklift'] as const satisfies readonly (keyof Stage2Fields)[];

const LOOKS: readonly LookSlot[] = ['colour', 'dressing', 'plaque', 'sign'];

/** The fresh stage-2 part at device time `now` (epoch ms) on market day `day`. */
export function freshStage2(c: SalvageContent, now: number, day: number): Stage2Fields {
  void c;
  return {
    works: {},
    routes: {},
    lots: { nextAt: null, n: 0 },
    reuse: { nextAt: null, vanAt: null, level: 0, sold: { day, n: 0, money: 0 } },
    bank: { agreement: null, letterSeen: false, done: [] },
    iap: { looks: { colour: null, dressing: null, plaque: null, sign: null }, ledger: [], pending: [], hidden: null, ageBand: null, createdMs: now, sessions2At: null },
    ads: { day, awayUsed: 0, spotUsed: 0, awayOffer: null },
    forklift: null,
  };
}

/** The id of the next pending quote (`q<n>`, from `counts['quote#']`), and the count to store with it. */
export function quoteId(counts: Record<string, number> | undefined): { id: string; n: number } {
  const n = Math.max(0, Math.floor(counts?.['quote#'] ?? 0)) + 1;
  return { id: `q${n}`, n };
}

// ============================================================================================ repair (layout 3)

/**
 * A layout-3 save's stage-2 fields repaired (bounded, finite; what cannot be read is fresh). `t` is the
 * save's yard clock (dated ends are never before it). The ledger is NEVER cut short (a granted id must
 * stay known, or it could be granted again).
 */
export function repairStage2(raw: Partial<SalvageState>, fresh: Stage2Fields, t: number): Stage2Fields {
  // THE DISPATCHER (s2a-fix, the lead's ruling of 26 Nov 09:50): the works' fields are state2Works.ts's, the money's state2Money.ts's.
  const w = repairWorks(raw, fresh, t);
  const m = repairMoney(raw, fresh, t);
  return { works: w.works, routes: w.routes, lots: w.lots, reuse: w.reuse, bank: m.bank, iap: m.iap, ads: m.ads, forklift: w.forklift };
}
