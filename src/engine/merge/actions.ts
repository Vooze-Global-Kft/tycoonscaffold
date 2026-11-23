/**
 * The player's purchases and buttons (spec 2.5, 2.7, 5.7 with Decisions M13, M14, M23) and the one
 * clamp through which cash changes (`commitCash`, spec 2.3 with Decision M37: coins enter only
 * through five sources).
 *
 * Seam (docs/design/market-build-plan.md): gift.ts calls `commitCash` for gift-box coins ('gift');
 * nothing else outside this file, drop.ts (tickets, the Basket) and events.ts (the till) changes
 * `cash`, except the shared store's grant of the away earnings (`E.grantCash`, see `commitCash`)
 * and the season close's reset (season.ts, 2.11: a reset is no source).
 * The store actions (src/modes/merge/actions.ts) call these through src/engine/merge.ts; each
 * returns the SAME object when refused (the store then plays `ui_denied`).
 *
 * Every purchase (openStall, levelGear, levelStall, hireMinder, levelMinder, openShutter): checked
 * against its price (mergeParams, rounded once by roundCoins, M19) and its conditions; paid with
 * `commitCash(−cost, 'spend')`; it ends the Basket's undo chip (2.5: undo is refused after any
 * purchase); it sets `freedAt` and `changedAt` when it changes the board or what counts as loose;
 * and it ends with META's `checkLanterns` (lanterns 11 and 14 are feats of purchases).
 */
import { freeCells, isGood, placeGood, roomFor } from './board';
import { noteMade } from './drop';
import { paradeOut, seatTicket } from './events';
import { checkLanterns, currentMods, settleScript } from './lanterns';
import { drawParade } from './draw';
import { baseTier, EPS, MAX_CASH, maxPopAt, mergeParams, minderLevelBlock, restartParade, saleInterval, streamValue, value } from './params';
import { CHAINS, TIERS, type CoinSource, type Good, type MergeAdKind, type MergeConfig, type MergeEvent, type MergeGame, type MergeState } from './types';

/**
 * The one way cash changes: adds `delta` (negative to spend), clamped to [0, MAX_CASH], booked
 * under `source` in `mstats.coins`; income also counts in `runEarnings` and `lifetimeEarnings`.
 * Returns the same object for a zero or non-finite delta, and for a spend the purse cannot cover.
 *
 * The five sources (2.3, M37: the Festival pays no coins) are 'ticket', 'gift', 'till', 'basket' and 'away'; 'undo'
 * (a Basket sale taken back) and 'spend' (purchases) are the two ways coins leave. The away
 * earnings are the exception: the shared store grants them (`E.grantCash`, × 1.5 with the ad), so
 * `mstats.coins.away` stays 0 in the app and a trace books them from `mergeOffline`'s result
 * (`bookAway` below does exactly that for the bot and the tests).
 */
export function commitCash(g: MergeGame, delta: number, source: CoinSource): MergeGame {
  if (!Number.isFinite(delta) || delta === 0) return g;
  if (delta < 0 && g.cash + delta < -1e-9) return g;
  const cash = Math.min(MAX_CASH, Math.max(0, g.cash + delta));
  const gain = delta > 0 ? Math.min(delta, MAX_CASH) : 0;
  const coins = { ...g.merge.mstats.coins, [source]: g.merge.mstats.coins[source] + delta };
  return {
    ...g,
    cash,
    runEarnings: gain > 0 ? Math.min(MAX_CASH, g.runEarnings + gain) : g.runEarnings,
    lifetimeEarnings: gain > 0 ? Math.min(MAX_CASH, g.lifetimeEarnings + gain) : g.lifetimeEarnings,
    merge: { ...g.merge, mstats: { ...g.merge.mstats, coins } },
  };
}

/** The away earnings granted outside the store (the bot, the tests): `commitCash(coins, 'away')`. */
export function bookAway(g: MergeGame, coins: number): MergeGame {
  return commitCash(g, coins, 'away');
}

const clockOf = (g: MergeGame) => g.stats.playSeconds ?? 0;
const withM = (g: MergeGame, m: MergeState): MergeGame => ({ ...g, merge: m });
const setChain = (m: MergeState, c: number, patch: Partial<MergeState['chains'][number]>): MergeState => ({ ...m, chains: m.chains.map((ch, i) => (i === c ? { ...ch, ...patch } : ch)) });
const touched = (m: MergeState, t: number): MergeState => ({ ...m, freedAt: t, changedAt: t });

/**
 * A purchase: refused (same object) without a price or the cash for it; else paid, the undo chip
 * ended, `apply` run, then META's `checkLanterns`.
 */
function purchase(cfg: MergeConfig, g: MergeGame, cost: number | null, apply: (x: MergeGame, t: number) => MergeGame, events?: MergeEvent[]): MergeGame {
  if (cost === null || !Number.isFinite(cost) || cost <= 0 || g.cash + EPS < cost) return g;
  let x = commitCash(g, -cost, 'spend');
  if (x === g) return g;
  const t = clockOf(x);
  if (x.merge.basketUndo) x = withM(x, touched({ ...x.merge, basketUndo: null }, t));
  x = apply(x, t);
  return checkLanterns(cfg, x, t, events);
}

/** A chain index the rules know. */
const chainOk = (c: number) => Number.isInteger(c) && c >= 0 && c < CHAINS;

/**
 * Opens stall c, only the next chain (2.5), at its table cost × F_s (2.2, Decision M23). The gear
 * keeps the season's starting level (seasoned gear); best_c = maxPop_c (its own drops count as
 * made, 2.3; the Ladder Book is stamped); a minder is hired at once when lantern 11 says minders
 * start hired.
 */
export function openStall(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  if (!chainOk(c)) return g;
  const cost = mergeParams(cfg, g).chains[c].openCost;
  return purchase(
    cfg,
    g,
    cost,
    (x, t) => {
      const m = x.merge;
      const mods = currentMods(cfg, m);
      const ch = m.chains[c];
      let y = withM(x, touched(setChain(m, c, { open: true, stall: 1, minder: mods.mindersStartHired ? 1 : 0, shelf: [], waiting: false, nextPopAt: t + cfg.merge.gear.interval, releaseAt: null, blockedAt: null, nextSaleAt: t + saleInterval(cfg, mods), best: 0 }), t));
      events?.push({ type: 'stallOpen', c });
      const top = maxPopAt(cfg, mods, ch.gear);
      for (let k = baseTier(cfg, ch.gear); k <= top; k++) y = noteMade(cfg, y, { c, k }, events);
      return y;
    },
    events,
  );
}

/** Gear level L → L + 1 of chain c (2.2): finer drops, never faster; level 40 is the top (M28). */
export function levelGear(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  if (!chainOk(c)) return g;
  const cost = mergeParams(cfg, g).chains[c].gearCost;
  return purchase(
    cfg,
    g,
    cost,
    (x, t) => {
      const ch = x.merge.chains[c];
      const level = ch.gear + 1;
      const baseStep = baseTier(cfg, level) !== baseTier(cfg, ch.gear);
      events?.push({ type: 'gearLevel', c, level, baseStep });
      // A base step changes which goods are loose (2.3), so blocked releases may retry.
      return withM(x, touched(setChain(x.merge, c, { gear: level }), t));
    },
    events,
  );
}

/** Stall level M → M + 1 of chain c (2.2): the stall bonus; every price on a ticket of this chain rises at once (M26). */
export function levelStall(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  if (!chainOk(c)) return g;
  const cost = mergeParams(cfg, g).chains[c].stallCost;
  return purchase(
    cfg,
    g,
    cost,
    (x) => {
      const level = x.merge.chains[c].stall + 1;
      events?.push({ type: 'stallLevel', c, level });
      return withM(x, setChain(x.merge, c, { stall: level }));
    },
    events,
  );
}

/** Hires chain c's minder (2.2): its first sale one interval Q from now. */
export function hireMinder(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  if (!chainOk(c) || g.merge.chains[c].minder !== 0) return g;
  const cost = mergeParams(cfg, g).chains[c].minderCost;
  return purchase(
    cfg,
    g,
    cost,
    (x, t) => {
      events?.push({ type: 'minderHire', c });
      return withM(x, setChain(x.merge, c, { minder: 1, nextSaleAt: t + saleInterval(cfg, currentMods(cfg, x.merge)) }));
    },
    events,
  );
}

/**
 * Minder level K → K + 1 of chain c (2.2), K from 1 to 3; the sale clock keeps its phase. Refused
 * (Decision M45) while the gear holds the house tier back: the level would change nothing
 * (`minderLevelBlock` gives the reason the sheet prints).
 */
export function levelMinder(cfg: MergeConfig, g: MergeGame, c: number, events?: MergeEvent[]): MergeGame {
  if (!chainOk(c) || minderLevelBlock(cfg, g, c) !== null) return g;
  const cost = mergeParams(cfg, g).chains[c].minderCost;
  return purchase(
    cfg,
    g,
    cost,
    (x) => {
      const level = x.merge.chains[c].minder + 1;
      events?.push({ type: 'minderLevel', c, level });
      return withM(x, setChain(x.merge, c, { minder: level }));
    },
    events,
  );
}

/**
 * The good a shutter n holds, if any (2.2): every third (n = goodFirst, goodFirst + goodEvery, ...)
 * holds tier b + 1 or b + 2 (goodNearShare / the rest, from the shutter stream) of the open chain
 * with the lowest best tier (ties: the lower chain), at most tier 8.
 */
export function shutterGood(cfg: MergeConfig, m: MergeState, n: number): Good | null {
  const { goodFirst, goodEvery, goodNearShare } = cfg.merge.board;
  if (n < goodFirst || (n - goodFirst) % goodEvery !== 0) return null;
  let c = -1;
  m.chains.forEach((ch, i) => ch.open && (c < 0 || ch.best < m.chains[c].best) && (c = i));
  if (c < 0) return null;
  const b = baseTier(cfg, m.chains[c].gear);
  const k = streamValue(m, 'shutter', m.draws.shutter) < goodNearShare ? b + 1 : b + 2;
  return { c, k: Math.min(TIERS, k) };
}

/** Opens the next shutter of `group` (index order within the group) when its printed condition holds (2.2); every third holds a good. */
export function openShutter(cfg: MergeConfig, g: MergeGame, group: number, events?: MergeEvent[]): MergeGame {
  const next = mergeParams(cfg, g).shutters[group];
  if (!next || !next.allowed || g.merge.board[next.cell] !== 'shutter') return g;
  return purchase(
    cfg,
    g,
    next.cost,
    (x, t) => {
      const m = x.merge;
      const good = shutterGood(cfg, m, next.n);
      const board = m.board.slice();
      board[next.cell] = good;
      let y = withM(x, touched({ ...m, board, shuttersOpened: m.shuttersOpened.map((v, i) => (i === group ? v + 1 : v)), draws: good ? { ...m.draws, shutter: m.draws.shutter + 1 } : m.draws }, t));
      events?.push({ type: 'shutterOpen', group, cell: next.cell, good });
      if (good) y = noteMade(cfg, y, good, events);
      return y;
    },
    events,
  );
}

/**
 * "Not tonight" at `counter` (2.7): free, one cooldown per counter; the filled lines return to the
 * board as goods (by the drop-cell rule), refused while `roomFor(filled lines)` is false (the
 * button then says "No room on the board for n goods": `notTonightRoom`); sending off the gold
 * ticket restarts the Parade clock. The counter draws again after `refillDelay`.
 */
export function notTonight(cfg: MergeConfig, g: MergeGame, counter: number, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const ct = m.counters[counter];
  const t = clockOf(g);
  if (!ct?.ticket || t + EPS < ct.notTonightAt) return g;
  const back = ct.ticket.lines.filter((l) => l.filled).map((l) => ({ c: l.c, k: l.k }));
  if (!roomFor(m, back.length)) return g;
  let mm: MergeState = m;
  for (const good of back) {
    const placed = placeGood(mm, good, t);
    if (!placed) return g;
    mm = placed.m;
  }
  if (ct.ticket.gold) mm = restartParade(cfg, mm, t);
  mm = {
    ...touched(mm, t),
    counters: mm.counters.map((x, i) => (i === counter ? { ...x, ticket: null, refillAt: t + cfg.merge.tickets.refillDelay, blockedAt: null, notTonightAt: t + cfg.merge.tickets.notTonightCooldown } : x)),
    mstats: { ...mm.mstats, notTonights: mm.mstats.notTonights + 1 },
  };
  // M42: while the opening script waits, the counter is held; a scripted ticket sent off may end the script.
  mm = settleScript(cfg, mm, t);
  events?.push({ type: 'notTonight', counter });
  // A returned good is placed, so it counts as made (M32): a line the "Fill one line" ad filled
  // comes back as a good that was never on the board, and best_c and the Ladder Book must hold it.
  let out = withM(g, mm);
  for (const good of back) out = noteMade(cfg, out, good, events);
  return out;
}

/** The goods "Not tonight" would return at `counter` and whether they fit (`roomFor`), for the button's text (2.7). */
export function notTonightRoom(g: MergeGame, counter: number): { goods: number; room: boolean; readyAt: number } {
  const ct = g.merge.counters[counter];
  const goods = ct?.ticket ? ct.ticket.lines.filter((l) => l.filled).length : 0;
  return { goods, room: roomFor(g.merge, goods), readyAt: ct?.notTonightAt ?? 0 };
}

/**
 * The Basket's undo (2.5): the good back to its reserved cell, the refund taken back ('undo').
 * Refused, and the chip gone, after any purchase (a purchase clears it) or when cash < refund, and
 * after the chip expired.
 */
export function undoBasket(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  void cfg;
  const m = g.merge;
  const u = m.basketUndo;
  const t = clockOf(g);
  if (!u || t >= u.until || g.cash + EPS < u.refund || m.board[u.cell] !== null) return g;
  let x = commitCash(g, -u.refund, 'undo');
  if (x === g && u.refund > 0) return g;
  const board = x.merge.board.slice();
  board[u.cell] = { c: u.good.c, k: u.good.k };
  x = withM(x, touched({ ...x.merge, board, basketUndo: null, mstats: { ...x.merge.mstats, basketSales: Math.max(0, x.merge.mstats.basketSales - 1) } }, t));
  events?.push({ type: 'undo', cell: u.cell });
  return x;
}

// ----------------------------------------------------------------------------- rewarded ads (5.7)

/** The cooldown of each rewarded ad, s of play (M10). */
function cooldown(cfg: MergeConfig, kind: MergeAdKind): number {
  const a = cfg.merge.ads;
  return kind === 'fillLine' ? a.fillLineCooldown : kind === 'gearRush' ? a.gearRushCooldown : a.callDragonCooldown;
}

/** The counter "Fill one line" would act on: `counter` when given, else the first with 2 or more unfilled lines; −1 when none. */
function fillLineCounter(g: MergeGame, counter?: number): number {
  const ok = (j: number) => (g.merge.counters[j]?.ticket?.lines.filter((l) => !l.filled).length ?? 0) >= 2;
  if (counter !== undefined) return ok(counter) ? counter : -1;
  return g.merge.counters.findIndex((_, j) => ok(j));
}

/** An empty counter that may seat the Parade now (not one the opening script holds): the lowest, or −1. */
function dragonCounter(g: MergeGame): number {
  return g.merge.counters.findIndex((ct) => !ct.ticket && (ct.refillAt !== null || ct.blockedAt !== null));
}

/** Whether the Parade can be drawn for counter j now (`drawParade` finds a line inside its bounds). */
function paradeDrawable(cfg: MergeConfig, g: MergeGame, j: number): boolean {
  return !!drawParade(cfg, g, j).ticket;
}

/**
 * Whether the rewarded ad `kind` can be offered now: its cooldown on the play clock (M10) is over,
 * and its reward would do what its button says: "Fill one line" needs a ticket with 2 or more
 * unfilled lines (at `counter` when given); "Gear rush" an open gear and a free cell; "Call the
 * dragon" no Parade out, an empty counter to seat it and a Parade that can be drawn (M14).
 */
export function canWatchAd(cfg: MergeConfig, g: MergeGame, kind: MergeAdKind, counter?: number): boolean {
  const m = g.merge;
  if (clockOf(g) + EPS < (m.ads[kind] ?? 0)) return false;
  switch (kind) {
    case 'fillLine':
      return fillLineCounter(g, counter) >= 0;
    case 'gearRush':
      return m.chains.some((ch) => ch.open) && freeCells(m).length > 0;
    case 'callDragon': {
      if (paradeOut(m)) return false;
      const j = dragonCounter(g);
      return j >= 0 && paradeDrawable(cfg, g, j);
    }
    default:
      return false;
  }
}

/**
 * The rewarded ad's reward, after the ad (5.7; with Quiet Evening, kind skipAds, the shared ads
 * service skips the video, Decision M13; the rules never read the product): "Fill one line" fills
 * the cheapest unfilled line of `counter`'s ticket (by value; ties the first), never the last, so
 * the ticket still ends with a drag; "Gear rush" drops up to `gearRushGoods` base-tier goods per
 * open gear into free cells now, highest chain first (the loose cap ignored, never beyond F);
 * "Call the dragon" (M14) seats the Parade now at the lowest empty counter (the Parade clock
 * restarts when it is filled or sent off, as after any Parade). Starts the cooldown (play clock,
 * M10). Refused (same object) whenever `canWatchAd` is false.
 */
export function grantAd(cfg: MergeConfig, g: MergeGame, kind: MergeAdKind, counter?: number, events?: MergeEvent[]): MergeGame {
  if (!canWatchAd(cfg, g, kind, counter)) return g;
  const t = clockOf(g);
  const ready = (x: MergeGame): MergeGame => withM(x, { ...x.merge, ads: { ...x.merge.ads, [kind]: t + cooldown(cfg, kind) } });
  let x = g;
  switch (kind) {
    case 'fillLine': {
      const j = fillLineCounter(g, counter);
      const ticket = g.merge.counters[j].ticket!;
      let line = -1;
      ticket.lines.forEach((l, i) => !l.filled && (line < 0 || value(cfg, g, l.c, l.k) < value(cfg, g, ticket.lines[line].c, ticket.lines[line].k)) && (line = i));
      const lines = ticket.lines.map((l, i) => (i === line ? { ...l, filled: true } : l));
      x = withM(g, { ...g.merge, counters: g.merge.counters.map((ct, i) => (i === j ? { ...ct, ticket: { ...ticket, lines } } : ct)) });
      events?.push({ type: 'lineFill', counter: j, line });
      break;
    }
    case 'gearRush': {
      const per = cfg.merge.ads.gearRushGoods;
      for (let c = CHAINS - 1; c >= 0; c--) {
        const ch = x.merge.chains[c];
        if (!ch.open) continue;
        const good = { c, k: baseTier(cfg, ch.gear) };
        for (let n = 0; n < per; n++) {
          const placed = placeGood(x.merge, good, t);
          if (!placed) break;
          x = noteMade(cfg, withM(x, { ...placed.m, mstats: { ...placed.m.mstats, drops: placed.m.mstats.drops + 1 } }), good, events);
          events?.push({ type: 'drop', c, k: good.k, cell: placed.cell });
        }
      }
      if (x === g) return g;
      break;
    }
    case 'callDragon': {
      const j = dragonCounter(g);
      x = seatTicket(cfg, g, j, t, events, true);
      if (x === g || !x.merge.counters[j].ticket?.gold) return g;
      break;
    }
    default:
      return g;
  }
  events?.push({ type: 'adGranted', kind });
  return ready(x);
}

/**
 * A lantern was just lit (META's `checkLanterns` lit it and recorded it in `lanterns`): the
 * effects on the state MECHANICS owns, at game clock `clock` (5.3 with M5), read from the lantern's
 * effect in the config (never its number): a `counters` effect appends empty counters up to the
 * new count (each draws after `refillDelay`); a `shelfCap` effect restarts every waiting gear
 * (`nextPopAt` = clock + T). Every other effect only changes a number read through `currentMods`,
 * or a part META owns, so it changes nothing here (and the same object comes back).
 */
export function applyLantern(cfg: MergeConfig, g: MergeGame, n: number, clock: number, events?: MergeEvent[]): MergeGame {
  void events;
  const lantern = cfg.merge.lanterns.find((l) => l.n === n);
  if (!lantern) return g;
  const m = g.merge;
  const mods = currentMods(cfg, m);
  switch (lantern.effect.type) {
    case 'counters': {
      if (m.counters.length >= mods.counters) return g;
      const counters = m.counters.slice();
      // M42: a counter added while the opening script waits is held until the script is done.
      while (counters.length < Math.min(4, mods.counters)) counters.push({ ticket: null, refillAt: m.script === 'done' ? clock + cfg.merge.tickets.refillDelay : null, blockedAt: null, notTonightAt: clock });
      return withM(g, { ...m, counters });
    }
    case 'shelfCap': {
      if (!m.chains.some((ch) => ch.open && ch.waiting && ch.shelf.length < mods.shelfCap)) return g;
      return withM(g, { ...m, chains: m.chains.map((ch) => (ch.open && ch.waiting && ch.shelf.length < mods.shelfCap ? { ...ch, waiting: false, nextPopAt: clock + cfg.merge.gear.interval } : ch)) });
    }
    default:
      return g;
  }
}

/**
 * EngineMode.entitle: a product just recorded (5.7, M13). Late Hours (unlock): the away cap grows
 * now, because `mergeParams().awayCap` reads the product, so nothing in the state changes.
 * Blue Silk Awnings (cosmetic): looks only. Quiet Evening (skipAds): the shared store and ads
 * service honour it. All three return the same object.
 */
export function entitleMerge(cfg: MergeConfig, g: MergeGame, productId: string): MergeGame {
  void cfg;
  void productId;
  return g;
}
