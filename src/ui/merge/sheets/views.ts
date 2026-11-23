/**
 * What the bars and sheets show, read from the rules (spec 4.4, 2.10; "no number of our own"): each
 * builder takes the merge config and game and returns plain values (primitives only, so a zustand
 * selector compared with useShallow stays stable while nothing shown changes). Every price, rate,
 * time and odds comes from a rules function: mergeParams (also on a "what if" copy of the state, for
 * the next level's figures), ticketPrice, saleAmount, advice, festivalAdvice, waitEstimate,
 * featProgress, giftOdds, notTonightRoom, canWatchAd; every amount goes through roundCoins and the
 * project's short number format. Words are composed by the screens from strings.ts.
 *
 * Pure: no React. Owned by the bars package (BARS, 7a); src/ui/merge/useMerge.ts wraps them as hooks.
 */
import { formatShort } from '../../../engine/format';
import * as R from '../../../engine/merge';

/** An amount of coins as every merge screen prints it: roundCoins (M19), then the short format ("1.78K"). */
export function coins(cfg: R.MergeConfig, x: number): string {
  return formatShort(R.roundCoins(cfg, x));
}

/** A multiplier or a time in seconds as printed: at most two decimals, no trailing zeros ("1.1", "4", "10.05"). */
export function figure(x: number): string {
  return String(Number(x.toFixed(2)));
}

/** A cooldown left, s of play, as whole minutes from a minute up, else whole seconds (at least 1). */
export function cooldownParts(seconds: number): { n: number; unit: 's' | 'min' } {
  if (seconds >= 60) return { n: Math.ceil(seconds / 60), unit: 'min' };
  return { n: Math.max(1, Math.ceil(seconds)), unit: 's' };
}

/** The state with chain c changed (the "what if" the stall sheet prints the next level from). */
function withChain(g: R.MergeGame, c: number, patch: Partial<R.MergeState['chains'][number]>): R.MergeGame {
  return { ...g, merge: { ...g.merge, chains: g.merge.chains.map((ch, i) => (i === c ? { ...ch, ...patch } : ch)) } };
}

/** The first gear level above `level` whose base tier is higher (the next base step), or null. */
export function nextBaseLevel(cfg: R.MergeConfig, level: number): number | null {
  const b = R.baseTier(cfg, level);
  for (let L = level + 1; L <= cfg.merge.costs.gearMaxLevel; L++) if (R.baseTier(cfg, L) > b) return L;
  return null;
}

/** The denominator the ripe chance is printed over ("1 in 20"): one level's step of p. */
export function ripeOf(cfg: R.MergeConfig): number {
  return Math.max(1, Math.round(1 / cfg.merge.gear.ripePerLevel));
}

// ----------------------------------------------------------------------------- the season chip

export interface ChipView {
  season: string;
  filled: number;
  lines: number;
  done: boolean;
}

export function chipView(cfg: R.MergeConfig, g: R.MergeGame): ChipView {
  const f = g.merge.festival;
  return { season: R.seasonRow(cfg, g.merge.season).name, filled: f.lines.filter((l) => l.filled).length, lines: f.lines.length, done: f.filledAt !== null };
}

// ----------------------------------------------------------------------------- the goal line (2.10)

/** What the goal line names, as plain values; `words` are composed by GoalLine from strings.ts. */
export interface GoalView {
  kind: R.AdviceKind | 'none';
  target: number;
  /** The price shown (0: none). */
  cost: number;
  costText: string;
  /** The estimate: n and unit from the rules' waitEstimate; n < 0 when none is shown. */
  estN: number;
  estUnit: 's' | 'min' | 'h';
  /** The parts of the words: a chain's or minder's name, a level, a tier's name, a feat's progress. */
  name: string;
  level: number;
  tier: string;
  have: number;
  need: number;
  /** A gear goal that is the Festival's halving level (M31). */
  festivalGear: boolean;
}

const NO_GOAL: GoalView = { kind: 'none', target: -1, cost: 0, costText: '', estN: -1, estUnit: 's', name: '', level: 0, tier: '', have: 0, need: 0, festivalGear: false };

const goalCache = new WeakMap<object, GoalView>();

/** The goal line's view of `advice(cfg, g)` (cached per game object: every bar reading it in one tick computes it once). */
export function goalView(cfg: R.MergeConfig, g: R.MergeGame): GoalView {
  const hit = goalCache.get(g);
  if (hit) return hit;
  let out = NO_GOAL;
  try {
    out = buildGoal(cfg, g);
  } catch {
    // A rules function misbehaving while the rules are integrated: no goal rather than a red screen.
    out = NO_GOAL;
  }
  goalCache.set(g, out);
  return out;
}

/** The goal line holds a purchase it names this long (play seconds) before another one replaces it. */
export const GOAL_HOLD_S = 5;

/** What the goal line holds: the view shown, since when, and what may end the hold at once. */
export interface GoalHold {
  view: GoalView;
  since: number;
  bought: string;
  cash: number;
}

/** Every purchase of the season, as one string: it changes with each purchase (and each season). */
function boughtSig(g: R.MergeGame): string {
  const m = g.merge;
  return `${m.season}|${m.chains.map((ch) => `${ch.open ? 1 : 0}.${ch.gear}.${ch.stall}.${ch.minder}`).join(',')}|${m.shuttersOpened.join(',')}`;
}

const isBuy = (k: GoalView['kind']) => k === 'gear' || k === 'stall' || k === 'minderHire' || k === 'minderLevel' || k === 'openStall' || k === 'shutter';

/**
 * The goal line's hold (the player review: "Open the Tea stall · 120" turned into "Grill gear level
 * 3 · 29" and back within seconds with the same purse, as the rules' income estimate moved). The
 * rules' advice is still the only source of the goal; the line only keeps a purchase it names for
 * GOAL_HOLD_S of play before showing another purchase, unless something the player did or can do
 * changed: a purchase, or the purse crossing either goal's price. Any other kind of goal (the
 * Basket on a full board, a ticket, the Festival, a lantern) shows at once. Pure.
 */
export function holdGoal(prev: GoalHold | null, next: GoalView, g: R.MergeGame): GoalHold {
  const now = g.stats.playSeconds ?? 0;
  const bought = boughtSig(g);
  const fresh = { view: next, since: now, bought, cash: g.cash };
  if (!prev || now < prev.since) return fresh;
  const a = prev.view;
  const same = a.kind === next.kind && a.target === next.target;
  if (same) return { view: next, since: prev.since, bought, cash: g.cash };
  const canHold = isBuy(a.kind) && isBuy(next.kind) && bought === prev.bought && now - prev.since < GOAL_HOLD_S;
  const crossed = (cost: number) => (prev.cash >= cost) !== (g.cash >= cost);
  if (!canHold || crossed(a.cost) || crossed(next.cost)) return fresh;
  return { ...prev, cash: g.cash };
}

function buildGoal(cfg: R.MergeConfig, g: R.MergeGame): GoalView {
  const a = R.advice(cfg, g);
  if (!a) return NO_GOAL;
  const k = cfg.merge;
  const m = g.merge;
  const target = a.target ?? -1;
  const est = a.cost > 0 ? R.waitEstimate(a.wait) : null;
  const base: GoalView = { ...NO_GOAL, kind: a.kind, target, cost: a.cost, costText: a.cost > 0 ? coins(cfg, a.cost) : '', estN: est && est.n > 0 ? est.n : -1, estUnit: est?.unit ?? 's' };
  const ch = target >= 0 ? m.chains[target] : undefined;
  switch (a.kind) {
    case 'gear': {
      const name = k.chains[target]?.name ?? '';
      if (a.gain === 0) {
        const fest = R.festivalAdvice(cfg, g);
        if (fest?.gear) {
          const tier = k.chains[fest.gear.c].tiers[R.baseTier(cfg, fest.gear.level) - 1] ?? '';
          return { ...base, name: k.chains[fest.gear.c].name, level: fest.gear.level, tier, festivalGear: true };
        }
      }
      return { ...base, name, level: (ch?.gear ?? 0) + 1 };
    }
    case 'stall':
      return { ...base, name: k.chains[target]?.name ?? '', level: (ch?.stall ?? 0) + 1 };
    case 'minderHire':
      return { ...base, name: k.chains[target]?.minder.name ?? '' };
    case 'minderLevel':
      return { ...base, name: k.chains[target]?.minder.name ?? '', level: (ch?.minder ?? 0) + 1 };
    case 'openStall':
      return { ...base, name: k.chains[target]?.name ?? '' };
    case 'shutter':
      return base;
    case 'lantern': {
      const f = R.featProgress(cfg, g).find((x) => x.n === target);
      return { ...base, have: f?.have ?? 0, need: f?.need ?? 0 };
    }
    case 'festival': {
      const l = m.festival.lines[target];
      return { ...base, tier: l ? (k.chains[l.c]?.tiers[l.k - 1] ?? '') : '' };
    }
    case 'basket': {
      const cell = m.board[target];
      return { ...base, tier: cell && typeof cell === 'object' ? (k.chains[cell.c]?.tiers[cell.k - 1] ?? '') : '' };
    }
    case 'fillTicket': {
      const t = m.counters[target]?.ticket;
      return { ...base, name: t ? (t.gold ? '' : (k.tickets.customers[t.customer] ?? '')) : '', festivalGear: false, level: t?.gold ? 1 : 0 };
    }
    default:
      return base;
  }
}

// ----------------------------------------------------------------------------- the stall sheet (4.4)

export interface StallView {
  c: number;
  open: boolean;
  cash: number;
  // gear
  gearLevel: number;
  gearTop: boolean;
  gearCost: number;
  dropTier: string;
  interval: string;
  ripeN: number;
  ripeOf: number;
  ripeTier: string;
  /** The next level's ripe chance, in the same "n in d" (−1 when the next level is a base step or there is none). */
  nextRipeN: number;
  /** The next base step: its level (0 with none), what it drops, and the lowest tier orders then ask for. */
  stepLevel: number;
  stepDrops: string;
  stepAsks: string;
  // stall level
  stallLevel: number;
  stallNow: string;
  stallNext: string;
  stallCost: number;
  // minder
  minderLevel: number;
  minderCost: number;
  houseTier: string;
  sale: string;
  saleSecs: string;
  heldBy: 'gear' | 'minder' | '';
  /** M45: why the rules refuse a minder level now ('gear': the gear holds the house good back; 'top'), or '' when it can be bought. */
  minderBlock: 'gear' | 'top' | '';
  /** The next minder level's house good and sale (hire: the first), '' when it would not change. */
  nextHouse: string;
  nextSale: string;
  awayHours: string;
  // shelf
  waiting: boolean;
  shelf: number;
  // ads
  rushReady: boolean;
  rushAfter: number;
  rushGoods: number;
  // opening
  openCost: number;
  /** Why a closed stall cannot be opened now: '' (it can), 'after' (the stall before it first), 'season' (a later season). */
  openNote: '' | 'after' | 'season';
  prevChain: string;
  fromSeason: string;
}

/** M45, from the rules: a hired minder's level refused because the gear holds it back, or at its top. */
function blockOf(cfg: R.MergeConfig, g: R.MergeGame, c: number): StallView['minderBlock'] {
  try {
    const b = R.minderLevelBlock(cfg, g, c);
    return b === 'gear' || b === 'top' ? b : '';
  } catch {
    return '';
  }
}

export function stallView(cfg: R.MergeConfig, g: R.MergeGame, c: number): StallView {
  const k = cfg.merge;
  const m = g.merge;
  const st = m.chains[c];
  const p = R.mergeParams(cfg, g);
  const ch = p.chains[c];
  const tiers = k.chains[c]?.tiers ?? [];
  const name = (t: number) => tiers[Math.max(1, Math.min(8, t)) - 1] ?? '';
  const of = ripeOf(cfg);
  const clock = g.stats.playSeconds;
  const gearTop = st.gear >= k.costs.gearMaxLevel;
  // The next gear level, as the rules would have it.
  let nextRipeN = -1;
  const stepLevel = nextBaseLevel(cfg, st.gear) ?? 0;
  if (!gearTop && stepLevel !== st.gear + 1) nextRipeN = Math.round(R.mergeParams(cfg, withChain(g, c, { gear: st.gear + 1 })).chains[c].ripe * of);
  const stepBase = stepLevel ? R.baseTier(cfg, stepLevel) : 0;
  // The next stall level.
  const stallNext = ch.stallCost !== null ? R.mergeParams(cfg, withChain(g, c, { stall: st.stall + 1 })).chains[c].stallBonus : 0;
  // The minder: now, and after the next hire or level.
  let nextHouse = '';
  let nextSale = '';
  if (ch.minderCost !== null) {
    const after = withChain(g, c, { minder: st.minder + 1 });
    const h2 = R.mergeParams(cfg, after).chains[c].houseTier;
    if (h2 !== ch.houseTier) {
      nextHouse = name(h2);
      nextSale = coins(cfg, R.saleAmount(cfg, after, c));
    }
  }
    let openNote: StallView['openNote'] = '';
  if (!st.open && ch.openCost === null) openNote = m.season < (k.chains[c]?.fromSeason ?? 0) ? 'season' : 'after';
  let rushReady = false;
  try {
    rushReady = R.canWatchAd(cfg, g, 'gearRush');
  } catch {
    rushReady = false;
  }
  return {
    c,
    open: st.open,
    cash: g.cash,
    gearLevel: st.gear,
    gearTop,
    gearCost: ch.gearCost ?? 0,
    dropTier: name(ch.base),
    interval: figure(k.gear.interval),
    ripeN: Math.round(ch.ripe * of),
    ripeOf: of,
    ripeTier: name(ch.base + 1),
    nextRipeN,
    stepLevel,
    stepDrops: stepLevel ? name(stepBase) : '',
    stepAsks: stepLevel ? name(stepBase + 1) : '',
    stallLevel: st.stall,
    stallNow: figure(ch.stallBonus),
    stallNext: ch.stallCost !== null ? figure(stallNext) : '',
    stallCost: ch.stallCost ?? 0,
    minderLevel: st.minder,
    minderCost: ch.minderCost ?? 0,
    houseTier: ch.houseTier > 0 ? name(ch.houseTier) : '',
    sale: ch.houseTier > 0 ? coins(cfg, R.saleAmount(cfg, g, c)) : '',
    saleSecs: figure(ch.saleInterval),
    heldBy: ch.heldBy ?? '',
    minderBlock: blockOf(cfg, g, c),
    nextHouse,
    nextSale,
    awayHours: figure(p.awayCap / 3600),
    waiting: st.open && st.waiting,
    shelf: st.shelf.length,
    rushReady,
    rushAfter: Math.ceil(Math.max(0, (m.ads.gearRush ?? 0) - clock)),
    rushGoods: k.ads.gearRushGoods,
    openCost: ch.openCost ?? 0,
    openNote,
    prevChain: k.chains[c - 1]?.name ?? '',
    fromSeason: R.seasonRow(cfg, k.chains[c]?.fromSeason ?? 0).name,
  };
}

// ----------------------------------------------------------------------------- the shutter confirm (4.4)

export interface ShutterView {
  exists: boolean;
  allowed: boolean;
  cost: number;
  cash: number;
  holdsGood: boolean;
  /** The printed condition: a tier of a chain to have made, or a stall to be open. */
  condKind: 'tier' | 'open';
  condName: string;
}

export function shutterView(cfg: R.MergeConfig, g: R.MergeGame, group: number): ShutterView {
  const p = R.mergeParams(cfg, g);
  const s = p.shutters[group];
  const cond = cfg.merge.board.shutterGroups[group]?.condition;
  const condKind = cond?.type === 'tierMade' ? 'tier' : 'open';
  const condName = !cond ? '' : cond.type === 'tierMade' ? (cfg.merge.chains[cond.chain]?.tiers[cond.tier - 1] ?? '') : (cfg.merge.chains[cond.chain]?.name ?? '');
  let holdsGood = false;
  if (s) {
    try {
      holdsGood = R.shutterGood(cfg, g.merge, s.n) !== null;
    } catch {
      holdsGood = false;
    }
  }
  return { exists: !!s, allowed: !!s?.allowed, cost: s?.cost ?? 0, cash: g.cash, holdsGood, condKind, condName };
}

// ----------------------------------------------------------------------------- the ticket detail (4.4)

export interface TicketView {
  exists: boolean;
  id: number;
  gold: boolean;
  species: string;
  coat: number;
  /** Per line, joined by '|' so the view stays a flat object: chain, tier, filled (1/0), stretch (1/0), gone (1/0, M34), value text. */
  lines: string;
  price: string;
  bonusPct: number;
  parade: string;
  unfilled: number;
  /** Not tonight (2.7): the goods it returns, whether they fit (roomFor), and the cooldown left (s of play). */
  ntGoods: number;
  ntRoom: boolean;
  ntWait: number;
  /** "Watch ad: fill one line" (5.7): offered on 2 or more unfilled lines; ready now, or its cooldown left. */
  adOk: boolean;
  adWait: number;
}

/** M34's test of a line a gear upgrade left behind (the rules' `lineUnmakeable`: new drops can no longer make it). */
export function lineGone(cfg: R.MergeConfig, g: R.MergeGame, line: Pick<R.TicketLine, 'c' | 'k' | 'filled'>): boolean {
  return R.lineUnmakeable(cfg, g, line);
}

export function ticketView(cfg: R.MergeConfig, g: R.MergeGame, j: number): TicketView {
  const m = g.merge;
  const t = m.counters[j]?.ticket ?? null;
  const clock = g.stats.playSeconds;
  if (!t) return { exists: false, id: -1, gold: false, species: '', coat: 0, lines: '', price: '', bonusPct: 0, parade: '', unfilled: 0, ntGoods: 0, ntRoom: true, ntWait: 0, adOk: false, adWait: 0 };
  const p = R.mergeParams(cfg, g);
  const lines = t.lines.map((l) => [l.c, l.k, l.filled ? 1 : 0, l.stretch && !g.merge.book[l.c]?.[l.k - 1] ? 1 : 0, lineGone(cfg, g, l) ? 1 : 0, coins(cfg, R.value(cfg, g, l.c, l.k))].join(',')).join('|');
  const nt = R.notTonightRoom(g, j);
  const unfilled = t.lines.filter((l) => !l.filled).length;
  let adOk = false;
  try {
    adOk = R.canWatchAd(cfg, g, 'fillLine', j);
  } catch {
    adOk = false;
  }
  return {
    exists: true,
    id: t.id,
    gold: t.gold,
    species: cfg.merge.tickets.customers[t.customer] ?? '',
    coat: t.coat,
    lines,
    price: coins(cfg, R.ticketPrice(cfg, g, t)),
    bonusPct: Math.round(p.beta * (t.lines.length - 1) * 100),
    parade: t.gold ? figure(p.mods.paradeMultiplier) : '',
    unfilled,
    ntGoods: nt.goods,
    ntRoom: nt.room,
    ntWait: Math.ceil(Math.max(0, nt.readyAt - clock)),
    adOk,
    adWait: Math.ceil(Math.max(0, (m.ads.fillLine ?? 0) - clock)),
  };
}

/** One line of `TicketView.lines`. */
export interface TicketLineView {
  c: number;
  k: number;
  filled: boolean;
  stretch: boolean;
  gone: boolean;
  value: string;
}

export function parseLines(lines: string): TicketLineView[] {
  if (!lines) return [];
  return lines.split('|').map((s) => {
    const [c, k, f, st, gone, ...v] = s.split(',');
    return { c: Number(c), k: Number(k), filled: f === '1', stretch: st === '1', gone: gone === '1', value: v.join(',') };
  });
}

// ----------------------------------------------------------------------------- ads (5.7)

export interface AdsView {
  fillWait: number;
  /** Some ticket out has 2 or more unfilled lines (where "fill one line" is offered). */
  fillTicket: boolean;
  rushOk: boolean;
  rushWait: number;
  dragonOk: boolean;
  dragonWait: number;
  dragonOut: boolean;
}

export function adsView(cfg: R.MergeConfig, g: R.MergeGame): AdsView {
  const m = g.merge;
  const clock = g.stats.playSeconds;
  const can = (kind: R.MergeAdKind) => {
    try {
      return R.canWatchAd(cfg, g, kind);
    } catch {
      return false;
    }
  };
  return {
    fillWait: Math.ceil(Math.max(0, (m.ads.fillLine ?? 0) - clock)),
    fillTicket: m.counters.some((ct) => (ct.ticket?.lines.filter((l) => !l.filled).length ?? 0) >= 2),
    rushOk: can('gearRush'),
    rushWait: Math.ceil(Math.max(0, (m.ads.gearRush ?? 0) - clock)),
    dragonOk: can('callDragon'),
    dragonWait: Math.ceil(Math.max(0, (m.ads.callDragon ?? 0) - clock)),
    dragonOut: m.counters.some((ct) => !!ct.ticket?.gold),
  };
}
