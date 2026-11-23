/**
 * What the three spokes show (spec 4.4, 5.2, 5.3, 5.6, 2.8, 2.11), as plain data built from the
 * rules' own functions: no React, no Skia, no number of its own. Every figure comes from the rules
 * (value, roundCoins, currentMods, neutralMods, lanternMods, featProgress, featState, giftOdds,
 * saleInterval, canCloseSeason, seasonRow, SEASON_RESETS, SEASON_STAYS) and every word from
 * ../strings.ts; names of things come from game.json through the config. Tested in views.test.ts.
 *
 * Package SPOKES (7b).
 */
import { formatShort } from '../../../engine/format';
import * as R from '../../../engine/merge';
import type { LanternFeat } from '../../../config/schema.merge';
import { CHAIN_IDS } from '../art/palette';
import { S } from '../strings';

const W = S.spokes;

/** A count as a figure with thousands commas ("1,000"); above 99,999 the project's short form. */
export function count(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return v >= 100000 ? formatShort(v) : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** An amount of coins: rounded by the rules' one rule (M19), shown in the project's number format. */
export function coins(cfg: R.MergeConfig, x: number): string {
  return formatShort(R.roundCoins(cfg, x));
}

/** A share as a whole percent figure (0.35 → 35). */
const pct = (p: number) => Math.round(p * 100);
/** A plain figure with at most two decimals and no trailing zeros (2.5, 1.05, 12). */
const fig = (x: number) => String(Math.round(x * 100) / 100);

export const goodIcon = (c: number, k: number) => `art:good-${CHAIN_IDS[c] ?? CHAIN_IDS[0]}-${k}`;
export const gearIcon = (c: number) => `art:gear-${CHAIN_IDS[c] ?? CHAIN_IDS[0]}`;

const tierName = (cfg: R.MergeConfig, c: number, k: number) => cfg.merge.chains[c]?.tiers[k - 1] ?? '';

// ----------------------------------------------------------------------------- the Ladder Book

export type RungKind = 'found' | 'next' | 'unknown';

export interface RungView {
  k: number;
  kind: RungKind;
  /** The good's name ('' for an unknown rung: it shows "?"). */
  name: string;
  /** "Worth 12 on a ticket" for a found good, "Not made yet" for the next; '' for an unknown one. */
  detail: string;
  /** This season's best tier of the chain (5.2: marked). */
  best: boolean;
}

export interface LadderView {
  c: number;
  name: string;
  found: number;
  /** Tier 1 first. */
  rungs: RungView[];
  complete: boolean;
}

/** One ladder of the Book: found goods with name and worth, the next with its name, the rest "?". */
export function ladderView(cfg: R.MergeConfig, g: R.MergeGame, c: number): LadderView {
  const m = g.merge;
  const row = m.book[c] ?? [];
  const chain = m.chains[c];
  const best = chain?.open ? chain.best : 0;
  const next = Array.from({ length: R.TIERS }, (_, i) => !row[i]).indexOf(true);
  const rungs: RungView[] = [];
  for (let k = 1; k <= R.TIERS; k++) {
    const kind: RungKind = row[k - 1] ? 'found' : k - 1 === next ? 'next' : 'unknown';
    rungs.push({
      k,
      kind,
      name: kind === 'unknown' ? '' : tierName(cfg, c, k),
      detail: kind === 'found' ? W.worth(coins(cfg, R.value(cfg, g, c, k))) : kind === 'next' ? W.notYet : '',
      best: best === k,
    });
  }
  const found = R.ladderCount(m, c);
  return { c, name: cfg.merge.chains[c]?.name ?? '', found, rungs, complete: found >= R.TIERS };
}

/** The lantern a complete ladder lights (the feat `ladderComplete`), or null when the config has none. */
export function ladderLantern(cfg: R.MergeConfig): number | null {
  return cfg.merge.lanterns.find((l) => l.feat.type === 'ladderComplete')?.n ?? null;
}

/** The Book's help page (5.2): the Lucky odds as the rules give them now, the Spark, the gift box odds. */
export interface OddsView {
  lucky: string;
  /** Why the odds differ from the usual ones (a season's character or a lantern), or null when they are the usual. */
  luckyWhy: string | null;
  luckyBase: string | null;
  sparks: string;
  giftEvery: string;
  giftSlots: string;
  giftRows: { icon: string; text: string }[];
}

export function oddsView(cfg: R.MergeConfig, g: R.MergeGame): OddsView {
  const m = g.merge;
  const mods = R.currentMods(cfg, m);
  const base = R.neutralMods(cfg).luckyOdds;
  let why: string | null = null;
  if (mods.luckyOdds !== base) {
    const fromSeason = R.seasonMods(cfg, m.season).luckyOdds;
    if (fromSeason === mods.luckyOdds) why = W.luckyFromSeason(R.seasonRow(cfg, m.season).name);
    else {
      const lit = cfg.merge.lanterns.find((l) => m.lanterns.includes(l.n) && R.lanternMods(cfg, [l.n]).luckyOdds === mods.luckyOdds);
      if (lit) why = W.luckyFromLantern(lit.n);
    }
  }
  const odds = R.giftOdds(cfg, g);
  return {
    lucky: W.lucky(mods.luckyOdds),
    luckyWhy: why,
    luckyBase: mods.luckyOdds !== base ? W.luckyBase(base) : null,
    sparks: W.sparks(mods.sparkTiers, m.luckySparks),
    giftEvery: W.giftEvery(mods.giftEvery),
    giftSlots: W.giftSlots(mods.giftSlots),
    giftRows: [
      { icon: 'art:coin', text: W.giftCoins(pct(odds.coins), coins(cfg, odds.coinAmount)) },
      { icon: goodIcon(0, 3), text: W.giftGood(pct(odds.good)) },
      { icon: 'art:spark', text: W.giftSpark(pct(odds.spark)) },
    ],
  };
}

// ----------------------------------------------------------------------------- the Lantern Gate

/** The words of a lantern's feat (5.3), its figures from the config. */
export function featText(cfg: R.MergeConfig, f: LanternFeat): string {
  switch (f.type) {
    case 'tickets':
      return W.featTickets(count(f.count));
    case 'tierMade':
      return W.featTier(f.tier);
    case 'discover':
      return W.featDiscover(count(f.count));
    case 'merges':
      return W.featMerges(count(f.count));
    case 'seasonsClosed':
      return W.featSeasons(f.count);
    case 'ladderComplete':
      return W.featLadder;
    case 'parades':
      return W.featParades(count(f.count));
    case 'allMinders':
      return W.featMinders;
    case 'threeLineTickets':
      return W.featThreeLine(count(f.count));
    case 'allShutters':
      return W.featShutters(cfg.merge.board.shutterGroups.reduce((a, grp) => a + grp.cells.length, 0));
    case 'tier8sInSeason':
      return W.featTier8s(f.count);
  }
}

/**
 * What lantern n changes (5.3), read from the rules' own `lanternMods` for that lantern alone (so
 * the words follow whatever the effect is in game.json, M5, M24, M37 included).
 */
export function effectText(cfg: R.MergeConfig, n: number): string {
  const d = R.lanternMods(cfg, [n]);
  const out: string[] = [];
  if (d.counters !== undefined) out.push(W.effCounters(d.counters));
  if (d.basketShare !== undefined) out.push(W.effBasket(pct(d.basketShare)));
  if (d.shelfCap !== undefined) out.push(W.effShelf(d.shelfCap));
  if (d.paradeEvery !== undefined) out.push(W.effParade(fig(d.paradeEvery / 60)));
  if (d.awayHours !== undefined) out.push(W.effAway(fig(d.awayHours)));
  if (d.luckyOdds !== undefined) out.push(W.effLucky(d.luckyOdds));
  if (d.startOpen !== undefined) for (const c of d.startOpen) out.push(W.effStartOpen(cfg.merge.chains[c]?.name ?? ''));
  if (d.seasonedMax !== undefined) out.push(W.effSeasoned(d.seasonedMax));
  if (d.paradeMultiplier !== undefined) out.push(W.effParadePay(fig(d.paradeMultiplier)));
  if (d.mindersStartHired) out.push(W.effMinders);
  if (d.ripeAdd !== undefined) out.push(W.effRipe(pct(d.ripeAdd)));
  if (d.betaAdd !== undefined) out.push(W.effBeta(pct(d.betaAdd)));
  if (d.giftSlots !== undefined) out.push(W.effGiftSlots(d.giftSlots));
  if (d.minderIntervalMult !== undefined) out.push(W.effMinderPace(fig(R.saleInterval(cfg, { minderIntervalMult: d.minderIntervalMult }))));
  if (d.sparkTiers !== undefined) out.push(W.effSparkTiers(d.sparkTiers));
  if (d.festivalSparks !== undefined) out.push(W.effFestival(d.festivalSparks));
  if (d.giftEvery !== undefined) out.push(W.effGiftEvery(d.giftEvery));
  if (d.ticketPay !== undefined) out.push(W.effTicketPay(fig((d.ticketPay - 1) * 100)));
  return out.join(' · ');
}

export interface LanternRow {
  n: number;
  lit: boolean;
  feat: string;
  effect: string;
  /** The progress bar of the next three unlit feats (from featProgress), else null. */
  bar: { have: number; need: number; text: string } | null;
}

export interface GateView {
  lit: number[];
  next: LanternRow[];
  litRows: LanternRow[];
  dark: LanternRow[];
  total: number;
}

/** The Lantern Gate (5.3): lit lanterns with what they changed, the next three with bars, the rest with their feat. */
export function gateView(cfg: R.MergeConfig, g: R.MergeGame): GateView {
  const lit = g.merge.lanterns;
  const prog = R.featProgress(cfg, g);
  const sorted = [...cfg.merge.lanterns].sort((a, b) => a.n - b.n);
  const row = (l: (typeof sorted)[number]): LanternRow => {
    const p = prog.find((x) => x.n === l.n);
    return {
      n: l.n,
      lit: lit.includes(l.n),
      feat: featText(cfg, l.feat),
      effect: effectText(cfg, l.n),
      bar: p ? { have: p.have, need: p.need, text: W.progress(count(p.have), count(p.need)) } : null,
    };
  };
  const rows = sorted.map(row);
  const nextNs = prog.map((p) => p.n);
  return {
    lit: [...lit],
    next: nextNs.map((n) => rows.find((r) => r.n === n)).filter((r): r is LanternRow => !!r),
    litRows: rows.filter((r) => r.lit),
    dark: rows.filter((r) => !r.lit && !nextNs.includes(r.n)),
    total: sorted.length,
  };
}

// ----------------------------------------------------------------------------- the Season scroll

export type FestivalLineState = 'filled' | 'ready' | 'closed' | 'waits';

export interface FestivalLineView {
  c: number;
  k: number;
  name: string;
  state: FestivalLineState;
  note: string;
}

export type BoardShape = 'rectangle' | 'moongate' | 'hearth';

export interface ScrollView {
  season: string;
  lines: FestivalLineView[];
  filled: number;
  done: boolean;
  gives: string;
  resets: string[];
  stays: string[];
  next: { season: string; shape: BoardShape; decoration: number; sentence: string; newStall: string | null; newStallChain: number | null };
  /** Street pieces of past seasons (0-based season, its name), and this season's once its Festival is filled. */
  pieces: { season: number; name: string; now: boolean }[];
  canClose: boolean;
  boxes: number;
}

/** The art kit's id of a season shape. */
export function shapeId(shape: string): BoardShape {
  return shape === 'moonGate' ? 'moongate' : shape === 'hearth' ? 'hearth' : 'rectangle';
}

/** The decoration of a 0-based season: they cycle petals, fireflies, moon motes, embers (2.11). */
export const decorationOf = (season: number) => ((season % 4) + 4) % 4;

/** Whether a good (c, k) lies on the board now. */
function onBoard(g: R.MergeGame, c: number, k: number): boolean {
  return g.merge.board.some((x) => R.isGood(x) && x.c === c && x.k === k);
}

/** The words of the rules' list items, in the rules' order; an id with no words is left out (views.test.ts checks there is none). */
export function listWords(items: readonly R.SeasonListItem[], words: Record<string, string>): string[] {
  const out: string[] = [];
  for (const it of items) {
    const w = words[it.id];
    if (w && !out.includes(w)) out.push(w);
  }
  return out;
}

export function scrollView(cfg: R.MergeConfig, g: R.MergeGame): ScrollView {
  const m = g.merge;
  const row = R.seasonRow(cfg, m.season);
  const lines: FestivalLineView[] = m.festival.lines.map((l) => {
    const open = !!m.chains[l.c]?.open;
    const state: FestivalLineState = l.filled ? 'filled' : onBoard(g, l.c, l.k) ? 'ready' : open ? 'waits' : 'closed';
    const note = state === 'filled' ? W.lineFilled : state === 'ready' ? W.lineReady : state === 'closed' ? W.lineLater(cfg.merge.chains[l.c]?.name ?? '') : W.lineWaits;
    return { c: l.c, k: l.k, name: tierName(cfg, l.c, l.k), state, note };
  });
  const nextSeason = m.season + 1;
  const nextRow = R.seasonRow(cfg, nextSeason);
  const opening = cfg.merge.chains.findIndex((ch) => ch.fromSeason === nextSeason);
  const done = m.festival.filledAt !== null;
  const pieces = Array.from({ length: m.season }, (_, s) => ({ season: s, name: R.seasonRow(cfg, s).name, now: false }));
  if (done) pieces.push({ season: m.season, name: row.name, now: true });
  return {
    season: row.name,
    lines,
    filled: lines.filter((l) => l.state === 'filled').length,
    done,
    gives: W.festivalGives(R.currentMods(cfg, m).festivalSparks),
    resets: listWords(R.SEASON_RESETS, W.resetItems),
    stays: listWords(R.SEASON_STAYS, W.stayItems),
    next: {
      season: nextRow.name,
      shape: shapeId(nextRow.shape),
      decoration: decorationOf(nextSeason),
      sentence: W.place[nextRow.character] ?? W.place.none,
      newStall: opening >= 0 ? W.newStall(cfg.merge.chains[opening].gear) : null,
      newStallChain: opening >= 0 ? opening : null,
    },
    pieces,
    canClose: R.canCloseSeason(cfg, g),
    boxes: m.gift.boxes.length,
  };
}

/** A short key of everything the spokes show, so a screen re-reads the game only when it changes (the game changes ten times a second). */
export function spokeKey(cfg: R.MergeConfig, g: R.MergeGame): string {
  const m = g.merge;
  const f = m.feats;
  const book = m.book.map((r) => r.map((x) => (x ? 1 : 0)).join('')).join('.');
  const chains = m.chains.map((ch) => `${ch.open ? 1 : 0}${ch.best}:${ch.stall}:${ch.minder}`).join(',');
  const fest = m.festival.lines.map((l) => (l.filled ? 1 : 0)).join('') + (m.festival.filledAt === null ? '' : 'f');
  const goods = m.festival.lines.map((l) => (onBoard(g, l.c, l.k) ? 1 : 0)).join('');
  void cfg;
  return [m.season, book, chains, fest, goods, m.lanterns.join('-'), f.tickets, f.merges, f.parades, f.threeLineTickets, f.seasonsClosed, f.tier8sThisSeason, m.shuttersOpened.join(''), m.luckySparks, m.gift.boxes.length, m.gift.ticketsToBox].join('|');
}
