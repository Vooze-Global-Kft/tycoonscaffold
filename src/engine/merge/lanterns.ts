/**
 * The Lantern Gate (spec 5.3 with Decisions M5 and M24): feats, lighting lanterns, the Ladder
 * Book's counts (5.2), and THE modifier object `Mods` with the precedence of 2.3.
 *
 * Package META (docs/design/market-build-plan.md names ORDERS for these seam functions; the lead
 * split ORDERS and gave this file to META). Seam:
 * - `neutralMods`, `lanternMods` and `currentMods` produce THE modifier object `Mods` (one object:
 *   every number a lantern or a season character can change) that params.ts consumes. Precedence
 *   (2.3): when a season character and a lantern change the same number the better one applies,
 *   never both; two lanterns on one number (7 and 16) likewise give the better one.
 * - MECHANICS calls `onMerged` after every merge (it already counted `feats.merges` and
 *   `tier8sThisSeason`; the scripted hedgehog of 2.7 steps up here at the first merge),
 *   `onTierMade` when a merge, a drop or a gift good makes a (c, k) first this season or ever
 *   (MECHANICS already stamped `book`), `onTicketPaid` after a ticket paid (after gift.ts
 *   `countGiftTicket`), and `checkLanterns` after every purchase.
 * - `checkLanterns` calls MECHANICS's `applyLantern` (./actions.ts) for the state MECHANICS owns
 *   (counters, the shelf) after it recorded a lantern.
 *
 * A lantern is lit once by its feat, never unlit, never bought, never random. Pure: time comes in
 * as `clock` (game clock) or from `stats.playSeconds`.
 */
import type { Lantern, LanternFeat } from '../../config/schema.merge';
import { applyLantern } from './actions';
import { scriptedTicket } from './draw';
import { restartParade } from './params';
import { seasonMods } from './season';
import { CHAINS, TIERS, type Good, type MergeConfig, type MergeEvent, type MergeGame, type MergeState, type Mods, type Ticket } from './types';

// ----------------------------------------------------------------------------- the modifiers

/** The modifiers with no lantern lit and no season character: every field from the config. */
export function neutralMods(cfg: MergeConfig): Mods {
  const m = cfg.merge;
  return {
    counters: m.tickets.counters,
    basketShare: m.basket.share,
    shelfCap: m.gear.shelf,
    paradeEvery: m.parade.every,
    awayHours: 0,
    luckyOdds: m.merges.luckyOdds,
    startOpen: [],
    seasonedMax: m.seasons.maxSteps,
    paradeMultiplier: m.parade.multiplier,
    mindersStartHired: false,
    ripeAdd: 0,
    betaAdd: 0,
    threeLineShare: null,
    giftSlots: m.gift.slots,
    minderIntervalMult: 1,
    sparkTiers: 1,
    festivalPurseMult: 1,
    giftEvery: m.gift.every,
    ticketPay: 1,
  };
}

type NumericMod = { [K in keyof Mods]: Mods[K] extends number ? K : never }[keyof Mods];

/** The numbers where a smaller value is the better one (an interval, odds "1 in n", a ticket count). Every other number: larger is better. */
const SMALLER_IS_BETTER: ReadonlySet<NumericMod> = new Set<NumericMod>(['paradeEvery', 'luckyOdds', 'minderIntervalMult', 'giftEvery']);

/** The better of two values of one modifier (2.3 precedence). */
export function betterMod(field: NumericMod, a: number, b: number): number {
  return SMALLER_IS_BETTER.has(field) ? Math.min(a, b) : Math.max(a, b);
}

/** Lantern 19 (M24): gift boxes come a fifth sooner: N' = ceil(N × (1 − share)), at least 1. */
export function giftEverySooner(cfg: MergeConfig, every: number): number {
  return Math.max(1, Math.ceil(every * (1 - cfg.merge.meta.giftSooner) - 1e-9));
}

/** Merges one partial into another with the better-one rule (never both). */
function combine(a: Partial<Mods>, b: Partial<Mods>): Partial<Mods> {
  const out: Partial<Mods> = { ...a };
  for (const key of Object.keys(b) as (keyof Mods)[]) {
    const vb = b[key];
    const va = out[key];
    if (vb === undefined) continue;
    if (va === undefined) {
      (out as Record<string, unknown>)[key] = key === 'startOpen' ? [...(vb as number[])] : vb;
      continue;
    }
    if (key === 'startOpen') out.startOpen = [...new Set([...(va as number[]), ...(vb as number[])])].sort((x, y) => x - y);
    else if (key === 'mindersStartHired') out.mindersStartHired = !!va || !!vb;
    else if (key === 'threeLineShare') out.threeLineShare = va === null ? (vb as number | null) : vb === null ? (va as number) : Math.max(va as number, vb as number);
    else (out as Record<string, number>)[key] = betterMod(key as NumericMod, va as number, vb as number);
  }
  return out;
}

/** What one lantern's effect changes (5.3, M5, M24), as a partial. */
function effectMods(cfg: MergeConfig, l: Lantern): Partial<Mods> {
  const e = l.effect;
  switch (e.type) {
    case 'startOpen':
      return { startOpen: [e.chain] };
    case 'mindersStartHired':
      return { mindersStartHired: true };
    case 'seasonedSteps':
      return { seasonedMax: cfg.merge.seasons.maxSteps + e.value };
    case 'giftEvery':
      // M24: "a fifth sooner", from the configured N (the effect's own value is not read).
      return { giftEvery: giftEverySooner(cfg, cfg.merge.gift.every) };
    default:
      return { [e.type]: e.value } as Partial<Mods>;
  }
}

/** What the lit lanterns change (5.3 with M5 and M24), only the fields they change; two lanterns on one number give the better one. */
export function lanternMods(cfg: MergeConfig, lit: readonly number[]): Partial<Mods> {
  let out: Partial<Mods> = {};
  for (const l of cfg.merge.lanterns) if (lit.includes(l.n)) out = combine(out, effectMods(cfg, l));
  return out;
}

/**
 * The modifiers in force: neutral, then the lit lanterns and the season's character with the
 * precedence of 2.3 (when both change a number, the better one applies; they never stack). The one
 * `Mods` object params.ts reads.
 */
export function currentMods(cfg: MergeConfig, m: Pick<MergeState, 'season' | 'lanterns'>): Mods {
  const changed = combine(lanternMods(cfg, m.lanterns ?? []), seasonMods(cfg, m.season ?? 0));
  return { ...neutralMods(cfg), ...changed };
}

// ----------------------------------------------------------------------------- the Ladder Book (5.2)

/** Goods discovered of all time (the Ladder Book's stamps): counts toward lanterns 5 and 17. */
export function discoveredCount(m: Pick<MergeState, 'book'>): number {
  let n = 0;
  for (const row of m.book) for (const s of row) if (s) n++;
  return n;
}

/** Stamps of chain c's ladder (0 to 8). */
export function ladderCount(m: Pick<MergeState, 'book'>, c: number): number {
  return (m.book[c] ?? []).filter(Boolean).length;
}

/** The chains whose ladder is complete (all 8 tiers stamped): one lights lantern 9. */
export function laddersComplete(m: Pick<MergeState, 'book'>): number[] {
  const out: number[] = [];
  for (let c = 0; c < CHAINS; c++) if (ladderCount(m, c) >= TIERS) out.push(c);
  return out;
}

/** The highest tier ever made of any chain (0 with none). */
function highestEver(m: Pick<MergeState, 'book'>): number {
  let best = 0;
  for (const row of m.book) row.forEach((s, i) => s && i + 1 > best && (best = i + 1));
  return best;
}

// ----------------------------------------------------------------------------- feats (5.3)

/** The chains that can have a stall this season (Puffs from season 2 on): lantern 11's "every minder". */
export function chainsThisSeason(cfg: MergeConfig, m: Pick<MergeState, 'season'>): number[] {
  return cfg.merge.chains.map((ch, c) => (ch.fromSeason <= m.season ? c : -1)).filter((c) => c >= 0);
}

/** A feat's progress now: `have` (capped at `need`) of `need`; met when have ≥ need. */
export function featState(cfg: MergeConfig, g: MergeGame, feat: LanternFeat): { have: number; need: number } {
  const m = g.merge;
  const f = m.feats;
  const of = (have: number, need: number) => ({ have: Math.min(need, Math.max(0, have)), need });
  switch (feat.type) {
    case 'tickets':
      return of(f.tickets, feat.count);
    case 'tierMade':
      return of(highestEver(m), feat.tier);
    case 'discover':
      return of(discoveredCount(m), feat.count);
    case 'merges':
      return of(f.merges, feat.count);
    case 'seasonsClosed':
      return of(f.seasonsClosed, feat.count);
    case 'ladderComplete': {
      let best = 0;
      for (let c = 0; c < CHAINS; c++) best = Math.max(best, ladderCount(m, c));
      return of(best, TIERS);
    }
    case 'parades':
      return of(f.parades, feat.count);
    case 'allMinders': {
      const avail = chainsThisSeason(cfg, m);
      return of(avail.filter((c) => (m.chains[c]?.minder ?? 0) > 0).length, avail.length);
    }
    case 'threeLineTickets':
      return of(f.threeLineTickets, feat.count);
    case 'allShutters': {
      const need = cfg.merge.board.shutterGroups.reduce((a, grp) => a + grp.cells.length, 0);
      return of(m.shuttersOpened.reduce((a, n) => a + n, 0), need);
    }
    case 'tier8sInSeason':
      return of(f.tier8sThisSeason, feat.count);
  }
}

/** Whether lantern `n`'s feat is met now (lit or not). */
export function featMet(cfg: MergeConfig, g: MergeGame, n: number): boolean {
  const l = cfg.merge.lanterns.find((x) => x.n === n);
  if (!l) return false;
  const s = featState(cfg, g, l.feat);
  return s.have >= s.need;
}

/** The next three unlit lanterns (lowest numbers first) with their progress: the Lantern Gate's bars, and `advice`. */
export function featProgress(cfg: MergeConfig, g: MergeGame): { n: number; have: number; need: number }[] {
  return [...cfg.merge.lanterns]
    .sort((a, b) => a.n - b.n)
    .filter((l) => !g.merge.lanterns.includes(l.n))
    .slice(0, 3)
    .map((l) => ({ n: l.n, ...featState(cfg, g, l.feat) }));
}

/**
 * Lights every unlit lantern whose feat is met now (5.3), in number order: records it in
 * `lanterns`, appends `lanternLit`, applies what META owns (lantern 19 brings the next gift box
 * nearer by the lowered N; gift slots need no state: boxes earned from now hold four), then calls
 * MECHANICS's `applyLantern` for the state MECHANICS owns. Returns the same object when nothing
 * lights. `clock` is the game clock.
 */
export function checkLanterns(cfg: MergeConfig, g: MergeGame, clock: number, events?: MergeEvent[]): MergeGame {
  let out = g;
  for (const l of [...cfg.merge.lanterns].sort((a, b) => a.n - b.n)) {
    if (out.merge.lanterns.includes(l.n) || !featMet(cfg, out, l.n)) continue;
    const before = currentMods(cfg, out.merge);
    let merge: MergeState = { ...out.merge, lanterns: [...out.merge.lanterns, l.n] };
    const after = currentMods(cfg, merge);
    if (after.giftEvery < before.giftEvery) {
      merge = { ...merge, gift: { ...merge.gift, ticketsToBox: Math.max(1, merge.gift.ticketsToBox - (before.giftEvery - after.giftEvery)) } };
    }
    out = { ...out, merge };
    events?.push({ type: 'lanternLit', n: l.n });
    out = applyLantern(cfg, out, l.n, clock, events);
  }
  return out;
}

// ----------------------------------------------------------------------------- the hooks MECHANICS calls

/**
 * After a merge made `made` at `cell` (2.5; MECHANICS already counted `feats.merges` and
 * `tier8sThisSeason`): the scripted hedgehog of 2.7 steps up at counter 2 at the first merge of a
 * new game, then `checkLanterns` (lanterns 7 and 20).
 */
export function onMerged(cfg: MergeConfig, g: MergeGame, made: Good, cell: number, events?: MergeEvent[]): MergeGame {
  void made;
  void cell;
  let out = g;
  const m = g.merge;
  if (m.script === 'fox' && m.counters[1] && !m.counters[1].ticket) {
    const ticket = scriptedTicket(cfg, 'hedgehog', m.nextTicketId);
    const counters = m.counters.map((ct, j) => (j === 1 ? { ...ct, ticket, refillAt: null, blockedAt: null } : ct));
    out = { ...out, merge: { ...m, counters, nextTicketId: m.nextTicketId + 1, script: 'hedgehog' } };
    events?.push({ type: 'ticketDrawn', counter: 1, ticket });
  }
  return checkLanterns(cfg, out, out.stats.playSeconds, events);
}

/** A tier was made: the first of this (c, k) this season (best rose) or ever (`firstEver`; the book is stamped). Lanterns 3, 5, 6, 9 and 17 read the book. */
export function onTierMade(cfg: MergeConfig, g: MergeGame, good: Good, firstEver: boolean, events?: MergeEvent[]): MergeGame {
  void good;
  void firstEver;
  return checkLanterns(cfg, g, g.stats.playSeconds, events);
}

/**
 * A ticket was just paid `coins` at `counter` (after the gift counter): counts `feats.tickets`,
 * `threeLineTickets` and `parades` (MECHANICS's payTicket counts `mstats.ticketsThisSeason`); after a gold ticket the Parade clock
 * restarts (the next is due one interval of season clock from now, 2.7); once both scripted tickets
 * are paid the opening script is done; then `checkLanterns` (lanterns 1, 2, 4, 10, 12, 13, 16, 19).
 */
export function onTicketPaid(cfg: MergeConfig, g: MergeGame, counter: number, ticket: Ticket, coins: number, events?: MergeEvent[]): MergeGame {
  void coins;
  const m = g.merge;
  const clock = g.stats.playSeconds;
  const feats = {
    ...m.feats,
    tickets: m.feats.tickets + 1,
    threeLineTickets: m.feats.threeLineTickets + (ticket.lines.length >= 3 ? 1 : 0),
    parades: m.feats.parades + (ticket.gold ? 1 : 0),
  };
  let merge: MergeState = { ...m, feats };
  if (ticket.gold) merge = restartParade(cfg, merge, clock);
  if (m.script === 'hedgehog') {
    const otherScripted = m.counters.some((ct, j) => j !== counter && ct.ticket?.scripted && ct.ticket.id !== ticket.id);
    if (!otherScripted) merge = { ...merge, script: 'done' };
  }
  return checkLanterns(cfg, { ...g, merge }, clock, events);
}
