/**
 * A new decree game and a loaded save (2.3, the scripted start of 3.1). Package P1a
 * (docs/design/office-build-plan.md).
 *
 * A fresh state by 2.3: the mayor's office, term 1, day 0, governing; the treasury (30); ministry 0
 * (the Town Clock Office) open at level 1, the others closed; every club at 50, armed; gossip 0;
 * empty tray; scripted paper 1 of 7.5 ("Practise on this one...") landed on the desk; the arrival
 * clock started τ from now. The opening script (3.1): the scripted papers come in slot order, and no
 * ordinary paper is drawn until every scripted paper of the office is decided (draw.ts step 2).
 * `reconcileDecree` repairs a save and never throws. `buildDecree` makes any hand-made state the
 * tests, the other packages and the web presets need.
 */
import { rngMix } from '../rng';
import type { GameState } from '../types';
import { comicPaper, landPaper, scriptedPaper } from './draw';
import { officeOf } from './params';
import type { Campaign, ClubIx, CountResult, DecreeConfig, DecreeGame, DecreeState, DecreeStats, DeskItem, FollowUp, OfficeIx, Paper, Pending, Phase, Scandal, Shown, Site, Strike } from './types';
import { SITE } from './types';

const zeroStats = (): DecreeStats => ({ decisions: 0, daysEver: 0, signed: 0, refused: 0, slipsTaken: 0, boycotts: 0, scandals: 0, elections: 0, wins: 0, clamps: 0, drawn: 0, papers: 0, book: {} });
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
    slipOffered: false,
    followUps: [],
    seen: {},
    frameBag: [],
    notesSeen: [],
    picketsThisTerm: [],
    ribbonsDue: [],
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
    cashAnchor: null,
    result: null,
    appSlotsUsed: 0,
    signedThisTerm: 0,
    papersSinceSlip: 0,
    requisitionOwed: false,
    handLanded: 0,
    frameLast: false,
    visitorsSeen: {},
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
  const first = scriptedPaper(cfg, g, 0, 1);
  if (first) g = landPaper(cfg, first.g, first.paper, clock);
  return { ...g, decree: { ...g.decree, nextArrivalAt: clock + officeOf(cfg, 0).tau } };
}

/** The decree fields for a shared state that has none (a test's bare state). Built. */
export function withDecreeFields(cfg: DecreeConfig, base: GameState): DecreeGame {
  const g = base as Partial<DecreeGame>;
  return g.decree ? (g as DecreeGame) : createDecree(cfg, base);
}

/** Clamps a number to an integer in [lo, hi], or `fallback` when it is not a finite number. */
const intIn = (x: unknown, lo: number, hi: number, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : fallback);
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isPaper = (x: unknown): x is Paper => isObj(x) && typeof x.id === 'string' && typeof x.kind === 'string' && isObj(x.sign) && isObj(x.refuse) && Array.isArray((x.sign as { effects?: unknown }).effects) && Array.isArray((x.refuse as { effects?: unknown }).effects);
const isShown = (x: unknown): x is Shown => isObj(x) && Array.isArray(x.sign) && Array.isArray(x.refuse);

const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const PHASES: readonly Phase[] = ['governing', 'campaign', 'count', 'result'];
/** The fields of `freshDecree` that may be null, with what a saved value must be to be kept (else null). */
const NULLABLE: Record<string, (v: unknown) => boolean> = {
  nextArrivalAt: fin,
  emptySince: fin,
  monumentOffer: (v) => typeof v === 'string',
  face: (v) => typeof v === 'string',
};

/** A saved scandal ("Say nothing" running), or null when it is not one. */
function scandalOf(x: unknown): Scandal | null {
  if (!isObj(x) || !fin(x.papersLeft)) return null;
  const out: Scandal = { papersLeft: Math.max(0, Math.round(x.papersLeft)) };
  if (fin(x.factor) && x.factor > 0 && x.factor <= 1) out.factor = x.factor;
  if (typeof x.waiting === 'boolean') out.waiting = x.waiting;
  return out;
}

/** A saved run-up (campaign points per district), or null when it is not one. */
function campaignOf(x: unknown, districts: number): Campaign | null {
  if (!isObj(x) || !Array.isArray(x.C)) return null;
  const C = Array.from({ length: districts }, (_, k) => (fin((x.C as unknown[])[k]) ? Math.max(0, (x.C as number[])[k]) : 0));
  return { C, papersLeft: fin(x.papersLeft) ? Math.max(0, Math.round(x.papersLeft)) : 0, rallyDone: typeof x.rallyDone === 'boolean' ? x.rallyDone : true };
}

/** A saved count, or null when it is not one of this office. */
function countOf(x: unknown, districts: number): CountResult | null {
  if (!isObj(x) || !Array.isArray(x.districts) || !Array.isArray(x.order) || !fin(x.held) || !fin(x.majority) || typeof x.won !== 'boolean' || typeof x.sweep !== 'boolean' || typeof x.rival !== 'string') return null;
  const rows = x.districts as unknown[];
  if (rows.length !== districts || !rows.every((r) => isObj(r) && fin(r.district) && fin(r.share) && typeof r.held === 'boolean')) return null;
  if (!(x.order as unknown[]).every((k) => fin(k) && k >= 0 && k < districts)) return null;
  return x as unknown as CountResult;
}

/**
 * A loaded save on top of the reconciled shared fields (2.3), repaired field by field; never throws:
 * a `decree` without a numeric seed or an office of 0 to 2 starts afresh (`onProblem` names the field);
 * every other field missing or of the wrong shape takes `freshDecree`'s value (a missing key is never
 * copied as undefined; a field that may be null is kept only with its own type: a finite number for
 * `nextArrivalAt` / `emptySince`, the object shapes of `scandal`, `campaign`, `count`, a string for
 * `monumentOffer` / `face`; the rules-attack's finding 3); a number is kept only finite and at least 0
 * (`term` at least 1); the phase must be one of the four, a run-up without its campaign is over
 * (papersLeft 0, the rally done: the count can be held), and no campaign is kept while governing; moods
 * are whole numbers clamped to 0..100, one per club of the office; ministries one per ministry of the
 * office (Grand Projects kept), levels to the cap; strikes and armed one per club; papers that are not
 * papers dropped (a desk paper without its frozen `shown` is put back on top of the tray, to be sized
 * when it lands); follow-ups whose deck record is gone dropped; draws and stats merged with fresh
 * counters (a counter kept only as a finite number). D42 (e): a save without `handLanded` counts its
 * decisions ever. Built.
 */
export function reconcileDecree(cfg: DecreeConfig, base: GameState, raw: unknown, onProblem?: (field: string) => void): DecreeGame {
  try {
    const d = (raw as { decree?: Partial<DecreeState> } | null)?.decree;
    if (!d || typeof d !== 'object') return createDecree(cfg, base);
    if (typeof d.seed !== 'number' || !Number.isFinite(d.seed) || !(d.office === 0 || d.office === 1 || d.office === 2)) {
      onProblem?.(typeof d.seed !== 'number' || !Number.isFinite(d.seed) ? 'decree.seed' : 'decree.office');
      return createDecree(cfg, base);
    }
    const fresh = freshDecree(cfg, d.seed, d.office);
    const row = officeOf(cfg, d.office);
    const nClubs = row.clubs.length;
    const nDistricts = row.districts.length;
    const out: DecreeState = { ...fresh };
    const has = (k: string) => Object.prototype.hasOwnProperty.call(d, k);
    for (const k of Object.keys(fresh) as (keyof DecreeState)[]) {
      if (!has(k)) continue;
      const v = (d as Record<string, unknown>)[k];
      const f = fresh[k] as unknown;
      let ok: boolean;
      if (v === undefined) ok = false;
      else if (f === null) ok = v === null || (NULLABLE[k] ? NULLABLE[k](v) : false);
      else if (v === null) ok = false;
      else if (Array.isArray(f)) ok = Array.isArray(v);
      else if (typeof f === 'number') ok = fin(v) && v >= 0;
      else if (isObj(f)) ok = isObj(v);
      else ok = typeof f === typeof v;
      if (ok) (out as unknown as Record<string, unknown>)[k] = v;
    }
    out.term = Math.max(1, Math.round(out.term));
    out.losses = Math.round(out.losses);
    if (!PHASES.includes(out.phase)) out.phase = fresh.phase;
    out.scandal = scandalOf(d.scandal);
    out.campaign = campaignOf(d.campaign, nDistricts);
    if (out.phase === 'governing') out.campaign = null;
    else if (out.phase === 'campaign' && !out.campaign) out.campaign = { C: new Array<number>(nDistricts).fill(0), papersLeft: 0, rallyDone: true };
    out.count = countOf(d.count, nDistricts);
    if (out.monumentOffer !== null && !cfg.decree.deck.monuments.some((m) => m.id === out.monumentOffer)) out.monumentOffer = null;
    if (!has('handLanded') || !fin(d.handLanded)) out.handLanded = fin(d.stats?.decisions) ? Math.max(0, Math.round(d.stats.decisions)) : 0;
    const counters = <T extends Record<string, unknown>>(f: T, v: unknown): T => {
      const o = { ...f };
      if (isObj(v)) for (const [k, x] of Object.entries(v)) if (k in f ? typeof (f as Record<string, unknown>)[k] === 'number' ? fin(x) : isObj(x) : false) (o as Record<string, unknown>)[k] = x;
      return o;
    };
    out.draws = counters(fresh.draws, d.draws);
    out.stats = counters(fresh.stats as unknown as Record<string, unknown>, d.stats) as unknown as DecreeStats;
    out.visitorsSeen = Object.fromEntries(Object.entries(isObj(d.visitorsSeen) ? d.visitorsSeen : {}).filter(([, x]) => fin(x)));
    out.moods = Array.from({ length: nClubs }, (_, gi) => intIn(Array.isArray(d.moods) ? d.moods[gi] : undefined, 0, 100, cfg.decree.mood.start));
    const cap = cfg.decree.ministry.levelCap;
    const saved = Array.isArray(d.ministries) ? d.ministries : [];
    out.ministries = Array.from({ length: Math.max(row.ministries.length, saved.length) }, (_, i) => {
      const m = saved[i] as { open?: unknown; level?: unknown } | undefined;
      const open = i === 0 ? true : !!m?.open;
      return { open, level: open ? intIn(m?.level, 1, cap, 1) : 0 };
    });
    out.strikes = Array.from({ length: nClubs }, (_, gi) => {
      const x = Array.isArray(d.strikes) ? (d.strikes[gi] as Partial<Strike> | null) : null;
      return isObj(x) && typeof x.papersLeft === 'number' ? { papersLeft: intIn(x.papersLeft, 0, 1000, 0), picket: String(x.picket ?? ''), grievance: String(x.grievance ?? ''), ...(typeof x.waiting === 'boolean' ? { waiting: x.waiting } : x.waiting ? { waiting: true } : {}) } : null;
    });
    out.armed = Array.from({ length: nClubs }, (_, gi) => (Array.isArray(d.armed) && typeof d.armed[gi] === 'boolean' ? (d.armed[gi] as boolean) : !out.strikes[gi]));
    out.gossip = intIn(d.gossip, 0, 1000, 0);
    out.tray = (Array.isArray(d.tray) ? d.tray : []).filter(isPaper);
    out.asideTray = (Array.isArray(d.asideTray) ? d.asideTray : []).filter(isPaper);
    const desk = d.desk as DeskItem | null | undefined;
    out.desk = null;
    if (desk && isObj(desk) && desk.type === 'paper' && isPaper(desk.paper)) {
      if (isShown(desk.shown)) out.desk = { type: 'paper', paper: desk.paper, shown: desk.shown, landedAt: Number(desk.landedAt) || 0 };
      else out.tray = [desk.paper, ...out.tray];
    } else if (desk && isObj(desk) && desk.type === 'slip' && isObj(desk.slip) && isSlip(desk.slip)) {
      // D42 (a): a slip saved before bundles buys one level.
      out.desk = { type: 'slip', slip: { ...desk.slip, levels: fin(desk.slip.levels) && desk.slip.levels >= 1 ? Math.floor(desk.slip.levels) : 1 }, landedAt: fin(desk.landedAt) ? desk.landedAt : 0 };
    }
    const pend = d.pending as Pending | null | undefined;
    out.pending = pend && isObj(pend) && isObj(pend.item) && isPaper(pend.item.paper) && isShown(pend.item.shown) && fin(pend.until) ? pend : null;
    if (out.pending && out.desk) out.desk = null;
    const chains = new Set(cfg.decree.deck.chains.map((c) => c.id));
    const setUps = new Set([...cfg.decree.deck.papers.map((p) => p.id), ...cfg.decree.deck.frames.map((f) => f.id)]);
    out.followUps = (Array.isArray(d.followUps) ? d.followUps : []).filter((f): f is FollowUp => isObj(f) && typeof f.chainId === 'string' && fin(f.dueAt) && (f.choice === 'sign' || f.choice === 'refuse') && (f.kind === 'chain' ? chains.has(f.chainId) : (f.kind === 'study' || f.kind === 'favour') && setUps.has(f.chainId)));
    out.ribbonsDue = (Array.isArray(d.ribbonsDue) ? d.ribbonsDue : []).filter((r) => isObj(r) && fin(r.ministry) && r.ministry < out.ministries.length && fin(r.storey));
    out.rivalIndex = [0, 1, 2].map((o) => intIn(Array.isArray(d.rivalIndex) ? d.rivalIndex[o] : 0, 0, 10_000, 0));
    for (const k of ['applicationsDelivered', 'notesSeen', 'picketsThisTerm', 'vanity', 'twists', 'formerOpponents', 'clippings', 'scriptedDone', 'frameBag'] as const) out[k] = (out[k] as unknown[]).filter((x): x is string => typeof x === 'string');
    out.applicationReturns = out.applicationReturns.filter((r) => isObj(r) && typeof r.minister === 'string' && fin(r.dueAt));
    out.seen = Object.fromEntries(Object.entries(out.seen).filter(([, x]) => fin(x)));
    return { ...base, decree: out };
  } catch (e) {
    onProblem?.(`decree (${e instanceof Error ? e.message : String(e)})`);
    return createDecree(cfg, base);
  }
}

const isSlip = (x: Record<string, unknown>): boolean => isObj(x.purchase) && typeof x.purchase.type === 'string' && fin(x.price) && fin(x.drawnLevel) && fin(x.rateGain);

// ----------------------------------------------------------------------------- state builders

/**
 * What a hand-made state holds (`buildDecree`): any office, term, day, phase, moods, ministries (a
 * number is a level, 0 closed), cash and play clock, gossip, losses, Name Recognition, decisions ever,
 * the tray (deck ids of comic papers, or papers), a paper on the desk (a deck id or a paper; it lands
 * now, sized from this state), a boycott, a scandal ("Say nothing" running), a pending take-back (the
 * desk paper signed and resting), ministers in the cabinet, twists running. Everything else is a fresh
 * seat's; the opening script counts as done unless `scripted` says otherwise.
 */
export interface DecreeSetup {
  seed?: number;
  office?: OfficeIx;
  term?: number;
  day?: number;
  phase?: Phase;
  losses?: number;
  nr?: number;
  cash?: number;
  clock?: number;
  moods?: number[];
  ministries?: (number | { open: boolean; level: number })[];
  gossip?: number;
  decisions?: number;
  tray?: (string | Paper)[];
  desk?: string | Paper | null;
  boycott?: { club: ClubIx; papersLeft?: number; waiting?: boolean } | { club: ClubIx; papersLeft?: number; waiting?: boolean }[];
  scandal?: { papersLeft: number; factor?: number };
  pending?: boolean;
  cabinet?: string[];
  twists?: string[];
  /** D42 (e): papers with a written text landed so far (default: `decisions`, as reconcile estimates an old save). */
  handLanded?: number;
  /** 'done' (default): every scripted paper of every office counts as decided; 'fresh': none. */
  scripted?: 'done' | 'fresh';
}

/**
 * A valid hand-made decree state on top of the shared `base` (the fixtures' `baseGameState`), for the
 * tests, the other packages and the web presets. Papers are made as the draw makes them (`comicPaper`),
 * the desk paper lands with `landPaper` (so `shown` is frozen exactly as in play). Built.
 */
export function buildDecree(cfg: DecreeConfig, base: GameState, setup: DecreeSetup = {}): DecreeGame {
  const office = setup.office ?? 0;
  const seed = setup.seed ?? (rngMix(base.rng >>> 0, 0x4445_4352) >>> 0);
  const fresh = freshDecree(cfg, seed, office);
  const row = officeOf(cfg, office);
  const clock = setup.clock ?? base.stats.playSeconds;
  const scriptedDone = setup.scripted === 'fresh' ? [] : cfg.decree.deck.scripted.map((p) => `${p.office}:${p.slot}`);
  const ministries = setup.ministries
    ? Array.from({ length: Math.max(row.ministries.length, setup.ministries.length) }, (_, i) => {
        const m = setup.ministries![i];
        if (m === undefined) return { open: i === 0, level: i === 0 ? 1 : 0 };
        return typeof m === 'number' ? { open: m > 0, level: m } : m;
      })
    : fresh.ministries;
  const boycotts = setup.boycott === undefined ? [] : Array.isArray(setup.boycott) ? setup.boycott : [setup.boycott];
  const strikes = fresh.strikes.map((_, gi): Strike | null => {
    const b = boycotts.find((x) => x.club === gi);
    if (!b) return null;
    const def = cfg.decree.deck.grievances.find((x) => x.club === row.clubs[gi]);
    return { papersLeft: b.papersLeft ?? cfg.decree.boycott.papers, picket: def?.picket ?? '', grievance: def?.id ?? '', ...(b.waiting ? { waiting: true } : {}) };
  });
  const cabinet = Object.fromEntries((setup.cabinet ?? []).map((id) => [id, { club: cfg.decree.ministers.find((m) => m.id === id)!.club, termsServed: 0 }]));
  let g: DecreeGame = {
    ...base,
    cash: setup.cash ?? cfg.decree.desk.treasury,
    stats: { ...base.stats, playSeconds: clock },
    decree: {
      ...fresh,
      term: setup.term ?? 1,
      presTerms: office === 2 ? (setup.term ?? 1) : 0,
      day: setup.day ?? 0,
      phase: setup.phase ?? 'governing',
      losses: setup.losses ?? 0,
      nr: setup.nr ?? 0,
      moods: setup.moods ? setup.moods.slice() : fresh.moods,
      ministries,
      gossip: setup.gossip ?? 0,
      strikes,
      armed: strikes.map((x) => !x),
      scandal: setup.scandal ? { papersLeft: setup.scandal.papersLeft, ...(setup.scandal.factor !== undefined ? { factor: setup.scandal.factor } : {}) } : null,
      picketsThisTerm: strikes.filter((x): x is Strike => !!x).map((x) => x.picket),
      cabinet,
      applicationsDelivered: Object.keys(cabinet),
      twists: setup.twists ?? [],
      scriptedDone,
      nextArrivalAt: clock + row.tau,
      stats: { ...fresh.stats, decisions: setup.decisions ?? 0, daysEver: setup.decisions ?? 0 },
      handLanded: setup.handLanded ?? setup.decisions ?? 0,
    },
  };
  const paperOf = (x: string | Paper): Paper => {
    if (typeof x !== 'string') return x;
    const r = comicPaper(cfg, g, x);
    g = r.g;
    return r.paper;
  };
  const deskPaper = setup.desk === undefined || setup.desk === null ? null : paperOf(setup.desk);
  const tray = (setup.tray ?? []).map(paperOf);
  g = { ...g, decree: { ...g.decree, tray } };
  if (deskPaper) g = landPaper(cfg, g, deskPaper, clock);
  else if (!tray.length) g = { ...g, decree: { ...g.decree, emptySince: clock } };
  if (setup.pending && g.decree.desk?.type === 'paper') {
    const item = g.decree.desk;
    g = { ...g, decree: { ...g.decree, desk: null, pending: { item, until: clock + cfg.decree.desk.takeBackSeconds } } };
  }
  return g;
}
