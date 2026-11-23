/**
 * A new merge game and a loaded save (spec 2.3, the scripted start of 2.7).
 *
 * Package MECHANICS (docs/design/market-build-plan.md). Seam: reads ORDERS's `openingBoard`
 * (./season.ts), `festivalFor` (./festival.ts), `scriptedTicket` (./draw.ts) and `currentMods`
 * (./lanterns.ts).
 *
 * Seam: `startSeason` is what ORDERS's `closeSeason` calls to build the next season.
 *
 * A fresh state by 2.3 with the scripted start (30 open cells, the opening board of META's
 * `openingBoard`: 6 Pepper Skewers by the drop-cell rule, Decision M18; the fox's Twin Skewer
 * ticket at counter 1, counter 2 waiting for the first merge). `reconcileMerge` repairs a save
 * field by field and never throws.
 */
import type { GameState } from '../types';
import { rngMix } from '../rng';
import { placeGood } from './board';
import { scriptedTicket } from './draw';
import { festivalFor } from './festival';
import { currentMods } from './lanterns';
import { baseTier, maxPopAt, RECENT_BUCKET, RECENT_BUCKETS } from './params';
import { openingBoard, seasonedStartLevel } from './season';
import { BOARD_CELLS, CHAINS, TIERS, type Cell, type ChainState, type Counter, type MergeConfig, type MergeGame, type MergeState, type MergeStats, type TicketLine } from './types';

const zeroStats = (): MergeStats => ({
  coins: { ticket: 0, gift: 0, till: 0, basket: 0, away: 0, undo: 0, spend: 0 },
  drops: 0,
  luckies: 0,
  basketSales: 0,
  ticketsDrawn: 0,
  setups: 0,
  notTonights: 0,
  giftBoxesOpened: 0,
  ticketsThisSeason: 0,
});

/**
 * The start of season `season` at game clock `clock` (spec 2.11), on top of a state whose kept
 * parts are already right: resets exactly 2.11's "Resets" list (goods on the board, gear, stall
 * and minder levels, stalls, best tiers, shelves, tickets, the till) and the season's own clocks
 * and counters; keeps its "Stays" list (board space and opened shutters, lanterns, the Ladder Book,
 * unopened gift boxes, goods waiting for room, Lucky Sparks, seasoned gear; purchases and coins are
 * on the shared state, not here). The new season's shape (`openingBoard`'s blocks), opening goods,
 * Festival and the modifiers of its character and the lit lanterns (`currentMods`) apply.
 * `basketUndo` is cleared. `script` becomes 'done' (the scripted start is the first game's only:
 * createMerge sets it). Coins are the caller's: ORDERS's `closeSeason` resets `cash` with
 * the shared state, counts `seasonsClosed` and the seasoned steps first, then calls this.
 * MECHANICS. Built (create() uses it for season 0).
 */
export function startSeason(cfg: MergeConfig, prev: MergeState, season: number, clock: number): MergeState {
  const m = cfg.merge;
  let state: MergeState = { ...prev, season, seasonStartedAt: clock };
  const mods = currentMods(cfg, state);
  const open = (c: number) => c === 0 || (mods.startOpen.includes(c) && season >= m.chains[c].fromSeason);
  const chains: ChainState[] = prev.chains.map((ch, c) => {
    const gear = seasonedStartLevel(cfg, Math.min(ch.seasoned, mods.seasonedMax));
    const isOpen = open(c);
    return {
      open: isOpen,
      gear,
      stall: 1,
      minder: isOpen && mods.mindersStartHired ? 1 : 0,
      shelf: [],
      waiting: false,
      nextPopAt: clock + m.gear.interval,
      releaseAt: null,
      blockedAt: null,
      nextSaleAt: clock + m.minders.interval * mods.minderIntervalMult,
      // best_c of an open chain is its maxPop (its own drops count as made, 2.3).
      best: isOpen ? maxPopAt(cfg, mods, gear) : 0,
      seasoned: ch.seasoned,
    };
  });
  // The shape's blocks of the season before go; shutters stay as they are (opened ones are cells).
  const board = prev.board.map((cell) => (cell === 'shutter' ? cell : null));
  const counters: Counter[] = Array.from({ length: mods.counters }, () => ({ ticket: null, refillAt: clock + m.tickets.refillDelay, blockedAt: null, notTonightAt: clock }));
  state = {
    ...state,
    till: 0,
    tillAt: clock + m.minders.tillRoll,
    board,
    chains,
    counters,
    script: 'done',
    festival: { lines: festivalFor(cfg, season).map((g) => ({ c: g.c, k: g.k, filled: false })), filledAt: null },
    paradeAt: m.parade.first,
    gift: { ...prev.gift, nextAt: prev.gift.pendingGoods.length ? clock + m.gear.release : null, blockedAt: null },
    basketUndo: null,
    feats: { ...prev.feats, tier8sThisSeason: 0 },
    recent: { at: Math.floor(clock / RECENT_BUCKET), coins: Array.from({ length: CHAINS }, () => Array.from({ length: RECENT_BUCKETS }, () => 0)) },
    freedAt: clock,
    changedAt: clock,
    mstats: { ...prev.mstats, ticketsThisSeason: 0 },
  };
  // An open chain's own drops count as made (2.3): the tiers b to maxPop are stamped in the Ladder Book.
  const book = state.book.map((row) => row.slice());
  chains.forEach((ch, c) => {
    if (ch.open) for (let k = baseTier(cfg, ch.gear); k <= ch.best; k++) book[c][k - 1] = true;
  });
  state = { ...state, book };
  const opening = openingBoard(cfg, state, season);
  if (opening.blocks.length) {
    const b = state.board.slice();
    for (const i of opening.blocks) if (b[i] === null) b[i] = 'block';
    state = { ...state, board: b };
  }
  for (const good of opening.goods) {
    const placed = placeGood(state, good, clock);
    if (placed) state = placed.m;
  }
  return state;
}

/**
 * A fresh merge state for a game whose clock reads `clock` (stats.playSeconds) and whose shared
 * seed is `seed`: the kept parts empty, then `startSeason(…, 0, clock)`, then the scripted start
 * of 2.7 (the fox's Twin Skewer ticket at counter 1; counter 2 waits for the first merge, when the
 * hedgehog steps up). Built.
 */
export function createMerge(cfg: MergeConfig, clock: number, seed: number): MergeState {
  const m = cfg.merge;
  const shutterCells = new Set(m.board.shutterGroups.flatMap((g) => g.cells));
  const empty: MergeState = {
    seed: rngMix(seed >>> 0, 0x6d657267),
    draws: { drop: Array.from({ length: CHAINS }, () => 0), ticket: 0, gift: 0, shutter: 0, parade: 0 },
    season: 0,
    seasonStartedAt: clock,
    till: 0,
    tillAt: clock,
    board: Array.from({ length: BOARD_CELLS }, (_, i) => (shutterCells.has(i) ? ('shutter' as const) : null)),
    shuttersOpened: m.board.shutterGroups.map(() => 0),
    chains: Array.from({ length: CHAINS }, () => ({ open: false, gear: 1, stall: 1, minder: 0, shelf: [], waiting: false, nextPopAt: clock, releaseAt: null, blockedAt: null, nextSaleAt: clock, best: 0, seasoned: 0 })),
    counters: [],
    nextTicketId: 1,
    script: 'fox',
    festival: { lines: [], filledAt: null },
    paradeAt: m.parade.first,
    gift: { boxes: [], ticketsToBox: m.gift.every, pendingGoods: [], nextAt: null, blockedAt: null },
    luckySparks: 0,
    basketUndo: null,
    book: Array.from({ length: CHAINS }, () => Array.from({ length: TIERS }, () => false)),
    lanterns: [],
    feats: { tickets: 0, threeLineTickets: 0, parades: 0, merges: 0, seasonsClosed: 0, tier8sThisSeason: 0 },
    ads: { fillLine: clock, gearRush: clock, callDragon: clock },
    recent: { at: Math.floor(clock / RECENT_BUCKET), coins: [] },
    freedAt: clock,
    changedAt: clock,
    mstats: zeroStats(),
  };
  let state = startSeason(cfg, empty, 0, clock);
  state = { ...state, gift: { ...state.gift, ticketsToBox: currentMods(cfg, state).giftEvery } };
  // 2.7: the fox at counter 1 holds a Twin Skewer ticket; counter 2's hedgehog steps up at the first merge.
  const counters = state.counters.map((ct) => ({ ...ct, refillAt: null }));
  counters[0] = { ...counters[0], ticket: scriptedTicket(cfg, 'fox', 0) };
  return { ...state, counters, script: 'fox' };
}

/** EngineMode.create: the shared fresh state (economy.createInitialState) with `merge` added. Built. */
export function withMergeFields(cfg: MergeConfig, base: GameState): MergeGame {
  return { ...base, merge: createMerge(cfg, base.stats.playSeconds ?? 0, base.rng ?? 0) };
}

// ----------------------------------------------------------------------------- reconcile (repair a save)

type Raw = Record<string, unknown>;
const obj = (x: unknown): Raw | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Raw) : null);
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
/** A finite number in [lo, hi], else `def`. */
const num = (x: unknown, def: number, lo = -Infinity, hi = Infinity) => (fin(x) ? Math.min(hi, Math.max(lo, x)) : def);
/** A whole number in [lo, hi], else `def`. */
const whole = (x: unknown, def: number, lo = 0, hi = Number.MAX_SAFE_INTEGER) => (fin(x) ? Math.min(hi, Math.max(lo, Math.floor(x))) : def);
const timeOrNull = (x: unknown) => (fin(x) ? x : null);
const isGoodRaw = (x: unknown): x is { c: number; k: number } => !!obj(x) && Number.isInteger((x as Raw).c) && Number.isInteger((x as Raw).k) && ((x as Raw).c as number) >= 0 && ((x as Raw).c as number) < CHAINS && ((x as Raw).k as number) >= 1 && ((x as Raw).k as number) <= TIERS;

/**
 * A saved `merge` repaired field by field on top of a fresh state of the same clock (never throws
 * for any input; null when the save has no usable board or chains, which starts afresh). Every
 * number is clamped to its range, every list to its shape; cells follow `shuttersOpened`; goods
 * of closed chains go; a good above its chain's best raises the best (and the Ladder Book holds
 * every tier up to each best); counters follow the lit lanterns; a ticket whose lines are not
 * possible now (bound (a)) or that a base drop would fill (bound (d1)) goes, and its counter draws
 * again; the Basket's undo chip is cleared (2.5).
 */
function repairMerge(cfg: MergeConfig, raw: unknown, clock: number, seed: number): MergeState | null {
  const s = obj(raw);
  if (!s || !Array.isArray(s.board) || s.board.length !== BOARD_CELLS || !Array.isArray(s.chains) || s.chains.length !== CHAINS) return null;
  const k = cfg.merge;
  const fresh = createMerge(cfg, clock, seed);
  const T = k.gear.interval;
  const groups = k.board.shutterGroups;
  const shuttersOpened = groups.map((grp, i) => whole((s.shuttersOpened as unknown[] | undefined)?.[i], 0, 0, grp.cells.length));
  const lanterns = Array.isArray(s.lanterns) ? [...new Set((s.lanterns as unknown[]).filter((n): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 20))] : [];
  const rawChains = s.chains as unknown[];
  const chains: ChainState[] = fresh.chains.map((def, c) => {
    const ch = obj(rawChains[c]);
    if (!ch) return c === 0 ? def : { ...def, open: false, best: 0 };
    const open = c === 0 ? true : ch.open === true;
    const gear = whole(ch.gear, 1, 1, k.costs.gearMaxLevel);
    const shelf = open && Array.isArray(ch.shelf) ? (ch.shelf as unknown[]).filter((x): x is number => Number.isInteger(x) && (x as number) >= 1 && (x as number) <= TIERS).slice(0, 8) : [];
    return {
      open,
      gear,
      stall: whole(ch.stall, 1, 1, k.costs.stallMaxLevel),
      minder: open ? whole(ch.minder, 0, 0, k.costs.minderMaxLevel) : 0,
      shelf,
      waiting: open && ch.waiting === true,
      nextPopAt: num(ch.nextPopAt, clock + T),
      releaseAt: shelf.length ? timeOrNull(ch.releaseAt) : null,
      blockedAt: shelf.length ? timeOrNull(ch.blockedAt) : null,
      nextSaleAt: num(ch.nextSaleAt, clock + k.minders.interval),
      best: open ? Math.max(whole(ch.best, 0, 0, TIERS), maxPopAt(cfg, currentMods(cfg, fresh), gear)) : 0,
      seasoned: whole(ch.seasoned, 0, 0, 10),
    };
  });
  // A shelf with no release time and no block would never release: due now.
  chains.forEach((ch) => {
    if (ch.shelf.length && ch.releaseAt === null && ch.blockedAt === null) ch.releaseAt = clock;
  });
  const shutterOf = new Map<number, [number, number]>();
  groups.forEach((grp, gi) => grp.cells.forEach((cell, n) => shutterOf.set(cell, [gi, n])));
  const board: Cell[] = (s.board as unknown[]).map((cell, i) => {
    const sh = shutterOf.get(i);
    if (sh && sh[1] >= shuttersOpened[sh[0]]) return 'shutter';
    if (cell === 'block' && !sh) return 'block';
    if (isGoodRaw(cell) && chains[cell.c].open) {
      chains[cell.c].best = Math.max(chains[cell.c].best, cell.k);
      return { c: cell.c, k: cell.k };
    }
    return null;
  });
  const rawBook = Array.isArray(s.book) ? (s.book as unknown[]) : [];
  const book = fresh.book.map((row, c) => row.map((_, i) => (Array.isArray(rawBook[c]) && (rawBook[c] as unknown[])[i] === true) || i + 1 <= chains[c].best));
  const feats0 = obj(s.feats) ?? {};
  const feats = Object.fromEntries(Object.entries(fresh.feats).map(([key, v]) => [key, whole(feats0[key], v)])) as unknown as MergeState['feats'];
  const draws0 = obj(s.draws) ?? {};
  const draws = {
    drop: fresh.draws.drop.map((v, c) => whole((draws0.drop as unknown[] | undefined)?.[c], v)),
    ticket: whole(draws0.ticket, 0),
    gift: whole(draws0.gift, 0),
    shutter: whole(draws0.shutter, 0),
    parade: whole(draws0.parade, 0),
  };
  const season = whole(s.season, 0, 0, 10_000);
  const script = s.script === 'fox' || s.script === 'hedgehog' || s.script === 'done' ? s.script : 'done';
  let state: MergeState = {
    ...fresh,
    seed: fin(s.seed) ? s.seed >>> 0 : fresh.seed,
    draws,
    season,
    seasonStartedAt: num(s.seasonStartedAt, clock, -Infinity, clock),
    till: num(s.till, 0, 0),
    board,
    shuttersOpened,
    chains,
    script,
    lanterns,
    feats,
    book,
    luckySparks: whole(s.luckySparks, 0),
    basketUndo: null,
    freedAt: num(s.freedAt, clock, -Infinity, clock),
    changedAt: num(s.changedAt, clock, -Infinity, clock),
  };
  state.tillAt = num(s.tillAt, clock + k.minders.tillRoll);
  if (state.tillAt < clock - k.minders.tillRoll) state.tillAt = state.seasonStartedAt + k.minders.tillRoll * (Math.floor((clock - state.seasonStartedAt) / k.minders.tillRoll) + 1);
  const mods = currentMods(cfg, state);
  // Counters: as many as the lit lanterns allow; a ticket only if its lines are possible now and no base drop fills them.
  const rawCounters = Array.isArray(s.counters) ? (s.counters as unknown[]) : [];
  let maxId = 0;
  let gold = false;
  const counters: Counter[] = Array.from({ length: mods.counters }, (_, j) => {
    const ct = obj(rawCounters[j]);
    const t = obj(ct?.ticket);
    let ticket: Counter['ticket'] = null;
    if (t && Array.isArray(t.lines) && t.lines.length >= 1 && t.lines.length <= 3) {
      const lines = (t.lines as unknown[]).map((l) => (isGoodRaw(l) ? { c: l.c, k: l.k, filled: (l as Raw).filled === true, ...((l as Raw).stretch === true ? { stretch: true } : {}) } : null));
      const scripted = t.scripted === true;
      // Bound (a) holds for the rest of a season (best never falls); (d1) is a draw-time bound that a later gear level may lift, so it is not re-checked here.
      const ok = lines.every((l) => l && chains[l.c].open && (l.filled || l.k <= Math.min(TIERS, chains[l.c].best + 1)));
      const isGold = t.gold === true && !gold;
      if (ok && lines.some((l) => !l!.filled)) {
        const id = whole(t.id, 0);
        maxId = Math.max(maxId, id);
        ticket = { id, lines: lines as TicketLine[], gold: isGold, customer: whole(t.customer, 0, 0, k.tickets.customers.length - 1), coat: whole(t.coat, 0, 0, k.tickets.coats - 1), ...(scripted ? { scripted: true } : {}) };
        if (isGold) gold = true;
      }
    }
    const refill = ticket ? null : timeOrNull(ct?.refillAt);
    const blocked = ticket ? null : timeOrNull(ct?.blockedAt);
    const held = !ticket && refill === null && blocked === null && script !== 'done' && j === 1;
    return { ticket, refillAt: ticket || blocked !== null || held ? refill : refill ?? clock + k.tickets.refillDelay, blockedAt: blocked, notTonightAt: num(ct?.notTonightAt, clock) };
  });
  const fest = obj(s.festival);
  const festLines = fest && Array.isArray(fest.lines) && fest.lines.length >= 1 && (fest.lines as unknown[]).every(isGoodRaw) ? (fest.lines as Raw[]).map((l) => ({ c: l.c as number, k: l.k as number, filled: l.filled === true })) : festivalFor(cfg, season).map((gd) => ({ c: gd.c, k: gd.k, filled: false }));
  const filledAt = fest && fin(fest.filledAt) && festLines.every((l) => l.filled) ? fest.filledAt : null;
  const gift0 = obj(s.gift) ?? {};
  const boxes = Array.isArray(gift0.boxes)
    ? (gift0.boxes as unknown[]).flatMap((b) => {
        const box = obj(b);
        if (!box || !Array.isArray(box.slots)) return [];
        const slots = (box.slots as unknown[]).flatMap((sl): MergeState['gift']['boxes'][number]['slots'] => {
          const o = obj(sl);
          if (o?.kind === 'coins' || o?.kind === 'spark') return [{ kind: o.kind }];
          if (o?.kind === 'good' && isGoodRaw(o.good)) return [{ kind: 'good', good: { c: o.good.c, k: o.good.k } }];
          return [];
        });
        return slots.length ? [{ coins: num(box.coins, 0, 0), slots }] : [];
      })
    : [];
  const pendingGoods = Array.isArray(gift0.pendingGoods) ? (gift0.pendingGoods as unknown[]).filter(isGoodRaw).map((gd) => ({ c: gd.c, k: gd.k })) : [];
  const recent0 = obj(s.recent);
  const recentOk = recent0 && fin(recent0.at) && Array.isArray(recent0.coins) && recent0.coins.length === CHAINS && (recent0.coins as unknown[]).every((row) => Array.isArray(row) && row.length === RECENT_BUCKETS && row.every((v) => fin(v) && v >= 0));
  const ads0 = obj(s.ads) ?? {};
  const mstats0 = obj(s.mstats) ?? {};
  const coins0 = obj(mstats0.coins) ?? {};
  state = {
    ...state,
    counters,
    nextTicketId: Math.max(whole(s.nextTicketId, 1, 1), maxId + 1),
    festival: { lines: festLines, filledAt },
    paradeAt: num(s.paradeAt, k.parade.first, 0),
    gift: {
      boxes,
      ticketsToBox: whole(gift0.ticketsToBox, mods.giftEvery, 1, Math.max(1, mods.giftEvery)),
      pendingGoods,
      nextAt: pendingGoods.length ? (timeOrNull(gift0.nextAt) ?? (fin(gift0.blockedAt) ? null : clock)) : null,
      blockedAt: pendingGoods.length ? timeOrNull(gift0.blockedAt) : null,
    },
    ads: { fillLine: num(ads0.fillLine, clock), gearRush: num(ads0.gearRush, clock), callDragon: num(ads0.callDragon, clock) },
    recent: recentOk ? { at: recent0.at as number, coins: (recent0.coins as number[][]).map((row) => row.slice()) } : { at: Math.floor(clock / RECENT_BUCKET), coins: Array.from({ length: CHAINS }, () => Array.from({ length: RECENT_BUCKETS }, () => 0)) },
    mstats: {
      ...(Object.fromEntries(Object.entries(fresh.mstats).filter(([key]) => key !== 'coins').map(([key, v]) => [key, whole(mstats0[key], v as number)])) as Omit<MergeStats, 'coins'>),
      coins: Object.fromEntries(Object.entries(fresh.mstats.coins).map(([key, v]) => [key, num(coins0[key], v)])) as MergeStats['coins'],
    },
  };
  return state;
}

/**
 * EngineMode.reconcile: a loaded save on top of the reconciled shared fields (`base`). Never
 * throws: a save the repair cannot use (no board or chains of this shape, or anything that throws)
 * starts afresh; otherwise it is repaired field by field (`repairMerge`), the Basket's undo chip
 * cleared (2.5).
 */
export function reconcileMerge(cfg: MergeConfig, base: GameState, raw: unknown): MergeGame {
  try {
    const saved = (raw as { merge?: unknown } | null)?.merge;
    const clock = fin(base.stats?.playSeconds) ? base.stats.playSeconds : 0;
    const merge = repairMerge(cfg, saved, clock, base.rng ?? 0);
    if (merge) return { ...base, merge };
  } catch {
    // fall through to a fresh state
  }
  return withMergeFields(cfg, base);
}
