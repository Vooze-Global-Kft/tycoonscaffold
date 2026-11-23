/**
 * A new decree game and a loaded save (2.3, the scripted start of 3.1). Package P1a
 * (docs/design/office-build-plan.md).
 *
 * A fresh state by 2.3: the mayor's office, term 1, day 0, governing; the treasury (30); ministry 0
 * (the Town Clock Office) open at level 1, the others closed; every club at 50, armed; gossip 0;
 * empty tray; scripted paper 1 of 7.5 ("Practise on this one...") landed on the desk; the arrival
 * clock started τ from now. `reconcileDecree` repairs a save and never throws.
 */
import { rngMix } from '../rng';
import type { GameState } from '../types';
import { landPaper, scriptedPaper } from './draw';
import { officeOf } from './params';
import type { DecreeConfig, DecreeGame, DecreeState, DecreeStats, OfficeIx, Site } from './types';
import { SITE } from './types';

const zeroStats = (): DecreeStats => ({ decisions: 0, daysEver: 0, signed: 0, refused: 0, slipsTaken: 0, boycotts: 0, scandals: 0, elections: 0, wins: 0, clamps: 0 });
const zeroDraws = (): Record<Site, number> => Object.fromEntries(Object.keys(SITE).map((k) => [k, 0])) as Record<Site, number>;

/** The decree fields of a new game in `office` with seed `seed`, before the first paper lands. Built. */
export function freshDecree(cfg: DecreeConfig, seed: number, office: OfficeIx = 0): DecreeState {
  const c = cfg.decree;
  const row = officeOf(cfg, office);
  const n = row.clubs.length;
  return {
    seed,
    draws: zeroDraws(),
    office,
    term: 1,
    presTerms: office === 2 ? 1 : 0,
    day: 0,
    phase: 'governing',
    losses: 0,
    ministries: row.ministries.map((_, i) => ({ open: i === 0, level: i === 0 ? 1 : 0 })),
    moods: new Array<number>(n).fill(c.mood.start),
    gossip: 0,
    quiet: 0,
    strikes: new Array(n).fill(null),
    armed: new Array<boolean>(n).fill(true),
    scandal: null,
    tray: [],
    desk: null,
    pending: null,
    asideTray: [],
    nextArrivalAt: null,
    awayCarry: 0,
    emptySince: null,
    followUps: [],
    seen: {},
    frameBag: [],
    notesSeen: [],
    picketsThisTerm: [],
    campaign: null,
    count: null,
    nr: 0,
    cabinet: {},
    applicationsDelivered: [],
    applicationReturns: [],
    vanity: [],
    monumentOffer: null,
    twistIndex: 0,
    twists: [],
    rivalIndex: [0, 0, 0],
    formerOpponents: [],
    clippings: [],
    wall: [],
    drawerCount: 0,
    adsUsed: {},
    cooldowns: {},
    standingOrder: false,
    face: null,
    scriptedDone: [],
    stats: zeroStats(),
  };
}

/**
 * A new decree game on top of the shared fresh state `base` (economy.createInitialState's result):
 * cash = the treasury, scripted paper 1 on the desk (when the deck has it), the next arrival τ after
 * the clock. Built.
 */
export function createDecree(cfg: DecreeConfig, base: GameState): DecreeGame {
  const seed = rngMix(base.rng >>> 0, 0x4445_4352) >>> 0;
  const clock = base.stats.playSeconds;
  let g: DecreeGame = { ...base, cash: cfg.decree.desk.treasury, decree: freshDecree(cfg, seed) };
  const first = scriptedPaper(cfg, g, 'game:1');
  if (first) g = landPaper(cfg, first.g, first.paper, clock);
  return { ...g, decree: { ...g.decree, nextArrivalAt: clock + officeOf(cfg, 0).tau } };
}

/** The decree fields for a shared state that has none (a test's bare state). Built. */
export function withDecreeFields(cfg: DecreeConfig, base: GameState): DecreeGame {
  const g = base as Partial<DecreeGame>;
  return g.decree ? (g as DecreeGame) : createDecree(cfg, base);
}

/**
 * A loaded save on top of the reconciled shared fields: keeps its `decree` when it has the shape
 * of 2.3 (an object with a numeric seed and an office of 0 to 2), else starts afresh. Never throws.
 * Built for the skeleton; P1a repairs field by field (missing fields from `freshDecree`, moods
 * clamped to 0..100, unknown deck ids dropped) and tests it.
 */
export function reconcileDecree(cfg: DecreeConfig, base: GameState, raw: unknown): DecreeGame {
  const d = (raw as { decree?: Partial<DecreeState> } | null)?.decree;
  if (d && typeof d === 'object' && typeof d.seed === 'number' && (d.office === 0 || d.office === 1 || d.office === 2)) {
    const fresh = freshDecree(cfg, d.seed, d.office);
    return { ...base, decree: { ...fresh, ...d, draws: { ...fresh.draws, ...(d.draws ?? {}) }, stats: { ...fresh.stats, ...(d.stats ?? {}) } } as DecreeState };
  }
  return createDecree(cfg, base);
}
