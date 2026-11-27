/**
 * The people-like bots on the real rules of the first yard (docs/design/yard-stage1.md 8.2 to 8.4; the
 * bots are src/engine/salvage/bot.ts). Owner: content.
 *
 *   npx tsx scripts/content/yard-bot.ts --seeds 15 --routes 2 --report     the whole table (8.2, 8.4)
 *   npx tsx scripts/content/yard-bot.ts --seeds 3 --only beats             a quick look while tuning
 *   npx tsx scripts/content/yard-bot.ts --unseen                           seeds 101 to 105 (8.4's 5 unseen)
 *   npx tsx scripts/content/yard-bot.ts --one '{"hand":"normal","habit":"goal","route":"A","seed":1}'
 *
 * --seeds N       seeds 1..N (default 15); --first F: seeds F..F+N-1; --unseen: seeds 101..105 instead
 * --routes 1|2    route A only, or A and B (S10)
 * --jobs N        child processes (default 2: the machine is shared)
 * --game path     a game.json (default games/scrap-yard/game.json)
 * --only list     beats,hand,away,days,nohand,gate (default all with --report)
 * --json file     write every run's summary there too
 * --handFirst     a what-if: after the fixed goals the bots level the yard hands when pieces wait (bot.ts)
 * --minutes M     how long the hour runs play (default 90 since REPORT7: E31c's windows to minute 90; the
 *                 tick-equals-jump gate checks the first 60 minutes); the slow hand plays max(100, M)
 * --cache dir     keep each run's summary there and read it back on a later call with the same spec
 * --daysSeeds N   the three-day runs (days and the day-word holder) on the first N seeds (default 3)
 * --only income   stage 2 2.3.3's gate (RULING2.md 14.10; engine2-income2): rated income I against the away income
 *                 an hour G at usual prices (board.a 0) at rung 3's entry, minute 90, day 1, day 2 and day 3
 *                 (rung 2's entry and minute 60 printed), normal hand, on every seed on yards the bots played
 *                 with prices flat AND with the normal price board (G still at usual prices); per moment the
 *                 median of I/G, the seeds within 0.88 to 1.12, min and max, and the gate line. With --only
 *                 income alone, only these runs are made and only section 8 is printed. Five seeds not used
 *                 in the calibration: --seeds 5 --first 16.
 * --only walk     RULING2.md 17.1 (engine2-dispatch): the purchase walk. From each seed's normal-hand states at minute
 *                 30, 60, 90, day 1 and day 3, every purchase, hire and level one step up by hand (arrivals landed),
 *                 the change in G (a capped absence at usual prices, cash enough for every load, over the state's own
 *                 absence hours) and the noise floor beside it; section 9: per moment and step the mean, the worst
 *                 seed and the gate (mean not below -1 %, no seed below -4 %). With --only walk alone only section 9.
 * Every run checks the hard promises of 8.3 (shown equals applied, cash never below zero, supplied never
 * falling, no stock negative; tick equals jump minute by minute on the normal hand's runs); a broken
 * promise prints in the report's first section and makes the exit code 2.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SalvageSchema } from '../../src/config/schema.salvage';
import * as R from '../../src/engine/salvage';
import { away, newBot, newSitting, playTo, playUntil, ratedCapacity, resumeBot, seededCfg, snapBot, startGame, tickJumpGate, type Bot, type BotOptions, type BotSnap } from '../../src/engine/salvage/bot';
import { contentAt, worksOpened } from '../../src/engine/salvage/layer';
import { awayPass } from '../../src/engine/salvage/away';
import { idleWhyOf } from '../../src/engine/salvage/crew';
import { begin, finish } from '../../src/engine/salvage/clock';
import { buyCheck, hireCheck, levelCheck, levelQuote } from '../../src/engine/salvage/ladder';
import { levelGainCfg, own } from '../../src/engine/salvage/rate';
import type { LevelTarget } from '../../src/engine/salvage/types';
import { packProducts } from '../../src/engine/salvage/shop';
import { shipped2Config } from '../../src/engine/fixtures/shipped2';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The facade's ratedIncome, ratedTerms and stockValue read cfg.salvage, the BASE content (rate.ts ratedIncomeCfg): at stage 2
// they leave out every plate, the works layer's grades and their stock. The rules themselves (shop.ts ratedI, bank.ts, lots)
// read the content at the state (layer.ts contentAt), and so do the bots' measures (content2-bots). Before the works open
// contentAt is the base content itself: every stage-1 figure is unchanged.
const at = (cfg: R.SalvageConfig, g: R.SalvageGame): R.SalvageConfig => {
  const c = contentAt(cfg.salvage, g.salvage);
  return c === cfg.salvage ? cfg : ({ ...cfg, salvage: c } as R.SalvageConfig);
};
const stockAt = (cfg: R.SalvageConfig, g: R.SalvageGame) => R.stockValue(at(cfg, g), g);
const termsAt = (cfg: R.SalvageConfig, g: R.SalvageGame) => R.ratedTerms(at(cfg, g), g);
const incomeAt = (cfg: R.SalvageConfig, g: R.SalvageGame) => R.ratedIncome(at(cfg, g), g);
const ROOT = path.resolve(HERE, '../..');
const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);

function arg(name: string, dflt: string | null = null): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? 'true' : v;
}

function loadCfg(file: string): R.SalvageConfig {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  // --stage 2 (content2-bots): the real content read with release.stage 2, as a stage-2 copy of game.json would be; the
  // real content's key stays 1 (ruling 18.1 S1). The shared product list rides along (the shop reads cfg.monetization):
  // since M1 (s2-fix-content) it is empty at release.stage 1, so a stage-2 run reads the game through the one helper
  // (src/engine/fixtures/shipped2.ts: release.stage 2 and the shared list mirrored from salvage.iap.products).
  const stage = Number(arg('stage', '0'));
  if (stage >= 2) return shipped2Config((x) => SalvageSchema.parse(x), raw);
  const salvage = SalvageSchema.parse(stage ? { ...raw.salvage, release: { ...(raw.salvage.release ?? {}), stage } } : raw.salvage);
  return { mode: 'salvage', salvage, ...(stage ? { monetization: raw.monetization } : {}) } as unknown as R.SalvageConfig;
}

// ============================================================================================ one run

interface Spec extends BotOptions {
  kind: 'hour' | 'manager' | 'days' | 'nohand' | 'holder' | 'income' | 'walk' | 'stage2';
  /** stage2 only: which bot of yard-stage2.md 8.2 (its habit on the first yard's bot). */
  bot?: Bot2;
  /** stage2 only: the game file's and bot.ts's hash, so that --cache never reads back a run of other content or rules. */
  tag?: string;
  minutes: number;
  gate?: boolean;
  /** income only: the board the yard is PLAYED with ('flat': board.a 0 throughout; 'normal': the shipped board, G at usual prices). */
  board?: 'flat' | 'normal';
}

interface Summary {
  spec: Spec;
  first: Record<string, number>;
  purchases: Bot['rec']['purchases'];
  minutes: (Bot['rec']['minutes'][number] & { R: number })[];
  rungs: Record<number, number>;
  passed: number[];
  prompts: number[];
  broken: Bot['rec']['broken'];
  refused: Bot['rec']['refused'];
  loads: number;
  hooks: Bot['rec']['hooks'];
  gate: string[];
  ceiling: { t: number; key: string }[];
  bossIns: Bot['rec']['bossIns'];
  walks: Bot['rec']['walks'];
  extra: Record<string, unknown>;
  ms: number;
}

function summary(b: Bot, spec: Spec, R_: number[], gate: string[], extra: Record<string, unknown>, t0: number): Summary {
  return {
    spec,
    first: b.rec.first,
    purchases: b.rec.purchases,
    minutes: b.rec.minutes.map((m, i) => ({ ...m, R: R_[i] ?? 0 })),
    rungs: b.rec.rungs,
    passed: b.rec.passed,
    prompts: b.rec.prompts.map((x) => x ?? 0),
    broken: b.rec.broken,
    refused: b.rec.refused,
    loads: b.rec.loads,
    hooks: b.rec.hooks,
    gate,
    ceiling: b.rec.ceiling,
    bossIns: b.rec.bossIns.filter((q) => q.t <= 900),
    walks: b.rec.walks.filter((q) => q.t <= 900),
    extra,
    ms: Math.round(performance.now() - t0),
  };
}

/**
 * Stage 2 2.3.3 (I5; engine2-income): the gate's G from a state: a capped absence with usual prices, (net
 * cash gained + the value at usual prices of the stock it left − at its start) ÷ the hours the yard ran.
 * Stage 2's bank does not exist yet: nothing a bank took to add.
 */
function incomeRow(cfg: R.SalvageConfig, g: R.SalvageGame, spec: Spec, at: string) {
  // G is measured at usual prices (board.a 0) whatever board the yard was played with (RULING2.md 14.5).
  if (cfg.salvage.board.a !== 0) cfg = { ...cfg, salvage: { ...cfg.salvage, board: { ...cfg.salvage.board, a: 0 } } };
  const ab = newBot(cfg, g, NOW + g.salvage.t * 1000, spec);
  ab.now = NOW + Math.round(g.salvage.clock.highMs - NOW);
  const v0 = stockAt(cfg, g);
  away(ab, 24 * 3600);
  const card = ab.g.salvage.away!;
  const h = card.seconds / 3600;
  const G = (ab.g.cash - g.cash + stockAt(cfg, ab.g) - v0) / Math.max(1e-9, h);
  const T = termsAt(cfg, g);
  return { at, t: g.salvage.t, rung: g.salvage.ladder.rung, ran_h: h, G, I: T.I, bind: T.bind, Isales: T.sales, Ispent: T.spent, sales: card.money / h, spent: (card.spent ?? 0) / h, stock: (stockAt(cfg, ab.g) - v0) / h };
}

/** A purchase landed at once (its arrival): the walk measures the asset, not its delivery. */
function landed(cfg: R.SalvageConfig, g: R.SalvageGame): R.SalvageGame {
  if (!g.salvage.arriving.length) return g;
  const x = begin(cfg, g, [], false);
  for (const a of [...x.s.arriving]) own(x, a.item, x.s.t);
  x.s.arriving = [];
  return finish(g, x);
}

/** G (2.3.3) from g: one capped absence at usual prices, cash enough for every load (1e7), over `hours` at most. */
function walkG(cfg: R.SalvageConfig, g0: R.SalvageGame, hours = 24): { G: number; h: number } {
  const g = { ...g0, cash: 1e7, lastSavedAt: g0.salvage.clock.highMs } as R.SalvageGame;
  const o = awayPass(cfg, g, g.salvage.clock.highMs + Math.round(hours * 3600_000));
  const h = (o.salvage.away?.seconds ?? 0) / 3600;
  return { G: (o.cash - g.cash + stockAt(cfg, o) - stockAt(cfg, g)) / Math.max(1e-9, h), h };
}

/**
 * RULING2.md 17.1's walk on one state: G (at usual prices: board.a 0) before, the noise floor (the cutters' power x
 * (1 + 1e-9)), and after every purchase, hire and level one step up (arrivals landed), each over the same hours as
 * the state's own absence (so that the Night watch's longer cap is not counted as a change an hour).
 */
function walkRow(base: R.SalvageConfig, seed: number, g0: R.SalvageGame, at: string) {
  const flat = { ...base.salvage, board: { ...base.salvage.board, a: 0 } };
  const cfg = seededCfg({ ...base, salvage: flat } as R.SalvageConfig, seed);
  const noise = seededCfg({ ...base, salvage: { ...flat, crew: { ...flat.crew, cutter: { ...flat.crew.cutter, share: flat.crew.cutter.share * (1 + 1e-9) } } } } as R.SalvageConfig, seed);
  const g = landed(cfg, { ...g0, cash: 1e12 } as R.SalvageGame);
  const b0 = walkG(cfg, g);
  const t = g.salvage.t;
  const steps: [string, () => R.SalvageGame][] = [];
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ck = hireCheck(cfg, g, role);
    if (ck.price !== null && !ck.refusal) steps.push([`hire ${role}`, () => R.hire(cfg, g, role, ck.price!, t)]);
  }
  for (const m of g.salvage.crew) {
    const ck = levelCheck(cfg, g, { kind: 'crew', id: m.id });
    if (ck.price !== null && !ck.refusal) steps.push([`level ${m.role}`, () => R.level(cfg, g, { kind: 'crew', id: m.id }, ck.price!, t)]);
  }
  for (const id of ['stripper', 'bench', 'crucible'] as const) {
    const ck = levelCheck(cfg, g, { kind: 'machine', machine: id });
    if (ck.price !== null && !ck.refusal) steps.push([`level ${id}`, () => R.level(cfg, g, { kind: 'machine', machine: id }, ck.price!, t)]);
  }
  for (const pid of Object.keys(g.salvage.partners)) {
    const ck = levelCheck(cfg, g, { kind: 'partner', partner: pid });
    if (ck.price !== null && !ck.refusal) steps.push([`level ${pid}`, () => R.level(cfg, g, { kind: 'partner', partner: pid }, ck.price!, t)]);
  }
  const seen = new Set<string>();
  for (const it of [...cfg.salvage.shop, ...cfg.salvage.dayOneList]) {
    if (it.kind === 'crew' || seen.has(it.key)) continue;
    seen.add(it.key);
    const ck = buyCheck(cfg, g, it.key as never);
    if (ck.price !== null && !ck.refusal) steps.push([`buy ${it.key}`, () => R.buy(cfg, g, it.key as never, ck.price!, t)]);
  }
  const rows: { step: string; d: number }[] = [];
  for (const [name, f] of steps) {
    const h = landed(cfg, { ...f(), cash: 1e12 } as R.SalvageGame);
    rows.push({ step: name, d: (walkG(cfg, h, b0.h).G - b0.G) / b0.G });
  }
  return { at, rung: g.salvage.ladder.rung, G: Math.round(b0.G), noise: (walkG(noise, g, b0.h).G - b0.G) / b0.G, rows };
}

/**
 * E8 (RULING2.md 22; s2-fix-content): A HIDDEN BEST BUY is a step of the walk whose gain is over `HIDDEN_GAIN` (5 %) of G
 * at a payback (price over the gain an hour) under tau_r, which neither the advice line nor the goal card names at the
 * state (the report then says so instead of "nothing useful is left"). tau_r: content tau_h at the state's rung, else
 * the first yard's level cap (levels.tau.cap minutes). Measured, never a rule.
 */
const HIDDEN_GAIN = 0.05;
function tauAt(cfg: R.SalvageConfig, g: R.SalvageGame): number {
  const tau = (cfg.salvage as { tau_h?: (number | null)[] }).tau_h?.[Math.max(1, g.salvage.ladder.rung) - 1];
  return typeof tau === 'number' ? tau : cfg.salvage.levels.tau.cap / 60;
}
function hiddenBest(d: number, payback_h: number, tau: number, step: string, named: Set<string>): boolean {
  return d > HIDDEN_GAIN && payback_h < tau && !named.has(step);
}
/** The walk's step names of what the advice line and the goal card name at the state (its own cash). */
function namedSteps(cfg: R.SalvageConfig, g: R.SalvageGame): Set<string> {
  const out = new Set<string>();
  const role = (id: string) => g.salvage.crew.find((m) => m.id === id)?.role;
  const a = R.advice(cfg, g, g.salvage.clock.highMs);
  if (a) {
    const x = a.action as { act: string; item?: string; role?: string; target?: { kind: string; id?: string; machine?: string; partner?: string; plate?: string } };
    if (x.act === 'buy' && x.item) out.add(`buy ${x.item}`);
    if (x.act === 'hire' && x.role) out.add(`hire ${x.role}`);
    const tg = x.target;
    if (x.act === 'level' && tg) out.add(tg.kind === 'crew' ? `level ${role(tg.id ?? '')}` : tg.kind === 'machine' ? `level ${tg.machine}` : tg.kind === 'partner' ? `level ${tg.partner}` : `level plate ${tg.plate}`);
  }
  // s2e-bots: the advice line's second line "For now: {item}" names a purchase too (advice.ts works.meanwhile)
  const m = (a as { works?: { meanwhile?: { action: unknown } | null } } | null)?.works?.meanwhile;
  if (m) {
    const x = m.action as { act: string; item?: string; role?: string; target?: { kind: string; id?: string; machine?: string; partner?: string; plate?: string } };
    if (x.act === 'buy' && x.item) out.add(`buy ${x.item}`);
    if (x.act === 'hire' && x.role) out.add(`hire ${x.role}`);
    const tg = x.target;
    if (x.act === 'level' && tg) out.add(tg.kind === 'crew' ? `level ${role(tg.id ?? '')}` : tg.kind === 'machine' ? `level ${tg.machine}` : tg.kind === 'partner' ? `level ${tg.partner}` : `level plate ${tg.plate}`);
  }
  const goal = R.nextGoal(cfg, g);
  if (goal?.buy) {
    const it = [...contentAt(cfg.salvage, g.salvage).shop, ...cfg.salvage.dayOneList].find((i) => i.key === goal.buy);
    const r = it && it.kind === 'crew' ? (['hand', 'cutter', 'driver'] as const).find((q) => goal.buy!.startsWith(q)) : undefined;
    out.add(r ? `hire ${r}` : `buy ${goal.buy}`);
  }
  return out;
}

/**
 * REPORT8, ruling 17.1 at stage 2 (--walk2): walkRow's walk on a stage-2 state, with the shop read at the state (the works
 * layer's items, the plates) and every owned plate's level one step up; the return's unread card put aside first.
 */
function walk2Row(base: R.SalvageConfig, seed: number, g0: R.SalvageGame, at: string) {
  const flat = { ...base.salvage, board: { ...base.salvage.board, a: 0 } };
  const cfg = seededCfg({ ...base, salvage: flat } as R.SalvageConfig, seed);
  const noise = seededCfg({ ...base, salvage: { ...flat, crew: { ...flat.crew, cutter: { ...flat.crew.cutter, share: flat.crew.cutter.share * (1 + 1e-9) } } } } as R.SalvageConfig, seed);
  const g = landed(cfg, { ...g0, cash: 1e12, salvage: { ...g0.salvage, away: null } } as R.SalvageGame);
  const b0 = walkG(cfg, g);
  const t = g.salvage.t;
  // E8 (RULING2.md 22; s2-fix-content): what the advice line and the goal card name AT THE RETURN (the player's own cash), as step names
  const named = namedSteps(cfg, g0);
  const steps: [string, () => R.SalvageGame][] = [];
  const priceOf = new Map<string, number>();
  const push = (name: string, price: number, f: () => R.SalvageGame) => (priceOf.set(name, price), steps.push([name, f]));
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ck = hireCheck(cfg, g, role);
    if (ck.price !== null && !ck.refusal) push(`hire ${role}`, ck.price, () => R.hire(cfg, g, role, ck.price!, t));
  }
  const roles = new Set<string>();
  for (const m of g.salvage.crew) {
    if (roles.has(m.role)) continue; // one of each role (the cheapest step is the first of its kind)
    const ck = levelCheck(cfg, g, { kind: 'crew', id: m.id });
    if (ck.price !== null && !ck.refusal) { roles.add(m.role); push(`level ${m.role}`, ck.price, () => R.level(cfg, g, { kind: 'crew', id: m.id }, ck.price!, t)); }
  }
  for (const id of ['stripper', 'bench', 'crucible'] as const) {
    const ck = levelCheck(cfg, g, { kind: 'machine', machine: id });
    if (ck.price !== null && !ck.refusal) push(`level ${id}`, ck.price, () => R.level(cfg, g, { kind: 'machine', machine: id }, ck.price!, t));
  }
  for (const pid of Object.keys(g.salvage.partners)) {
    const ck = levelCheck(cfg, g, { kind: 'partner', partner: pid });
    if (ck.price !== null && !ck.refusal) push(`level ${pid}`, ck.price, () => R.level(cfg, g, { kind: 'partner', partner: pid }, ck.price!, t));
  }
  for (const pid of Object.keys(g.salvage.works)) {
    const ck = levelCheck(cfg, g, { kind: 'plate', plate: pid } as never);
    if (ck.price !== null && !ck.refusal) push(`level plate ${pid}`, ck.price, () => R.level(cfg, g, { kind: 'plate', plate: pid } as never, ck.price!, t));
  }
  const seen = new Set<string>();
  for (const it of [...contentAt(cfg.salvage, g.salvage).shop, ...cfg.salvage.dayOneList]) {
    // an owned plate is not for sale (its card levels it): buyCheck reads the shop's owned list only
    if (it.kind === 'crew' || seen.has(it.key) || it.key in g.salvage.works) continue;
    seen.add(it.key);
    const ck = buyCheck(cfg, g, it.key as never);
    if (ck.price !== null && !ck.refusal) push(`buy ${it.key}`, ck.price, () => R.buy(cfg, g, it.key as never, ck.price!, t));
  }
  const rows: { step: string; d: number; price?: number; payback_h?: number; hidden?: boolean; dI?: number }[] = [];
  const tau = tauAt(cfg, g);
  // REPORT9 (the calibration's table): the rated gain of each step beside its measured one (I after less I before, same state)
  const I0 = incomeAt(cfg, g);
  for (const [name, f] of steps) {
    try {
      const h = landed(cfg, { ...f(), cash: 1e12 } as R.SalvageGame);
      const d = (walkG(cfg, h, b0.h).G - b0.G) / b0.G;
      const price = priceOf.get(name) ?? 0;
      // payback: the price over the gain an hour of yard time (G is a rate an hour)
      const payback_h = d > 0 ? price / (d * b0.G) : Infinity;
      rows.push({ step: name, d, price, payback_h, hidden: hiddenBest(d, payback_h, tau, name, named), dI: Math.round(incomeAt(cfg, h) - I0) });
    } catch (e) {
      rows.push({ step: `${name} (threw: ${String((e as Error).message).slice(0, 60)})`, d: NaN });
    }
  }
  return { at, rung: g.salvage.ladder.rung, G: Math.round(b0.G), I: Math.round(I0), noise: (walkG(noise, g, b0.h).G - b0.G) / b0.G, rows, tau, named: [...named] };
}

/** 9. THE PURCHASE WALK (RULING2.md 17.1): per moment and step, the mean change of G over the seeds (a seed's several crew of one role averaged), the worst seed, and the noise floor. */
function walkSection(L: string[], all: Summary[]): void {
  type W = { at: string; rung: number; G: number; noise: number; rows: { step: string; d: number; payback_h?: number; hidden?: boolean }[]; named?: string[]; tau?: number };
  const runs = all.filter((r) => r.spec.kind === 'walk' || (r.spec.kind === 'stage2' && ((r.extra.walk as unknown[] | undefined) ?? []).length > 0));
  if (!runs.length) return;
  L.push('');
  L.push(`9. THE PURCHASE WALK (RULING2.md 17.1; ${runs.length} seeds): every purchase, hire and level one step up by hand; the change in G (a capped absence at usual prices, stock counted); gate: mean not below -1 %, no seed below -4 %`);
  const pc = (v: number) => `${v >= 0 ? '+' : ''}${(100 * v).toFixed(2)} %`;
  let fails = 0;
  let n = 0;
  for (const at of ['m30', 'm60', 'm90', 'day1', 'day3', 'r3s1', 'r4entry']) {
    const ws = runs.map((r) => ({ seed: r.spec.seed, w: ((r.extra.walk as W[]) ?? []).find((q) => q.at === at) })).filter((q) => q.w);
    if (!ws.length) continue;
    const nz = ws.map((q) => q.w!.noise);
    L.push(` ${at} (${ws.length} states; rungs ${[...new Set(ws.map((q) => q.w!.rung))].join(',')}; median G §${Math.round(med(ws.map((q) => q.w!.G)))} an hour): noise mean ${pc(nz.reduce((a, v) => a + v, 0) / nz.length)}, mean |noise| ${pc(nz.reduce((a, v) => a + Math.abs(v), 0) / nz.length)}, worst ${pc(Math.min(...nz))}`);
    // E8 (s2-fix-content): the hidden best buys of the moment, per seed (gain over 5 % at a payback under tau_r that neither the advice line nor the goal names)
    const hid = ws.flatMap(({ seed, w }) => w!.rows.filter((q) => q.hidden).map((q) => `${q.step} s${seed} ${pc(q.d)} payback ${(q.payback_h ?? NaN).toFixed(1)} h`));
    if (ws.some((q) => q.w!.named)) L.push(`   advice / goal name: ${[...new Set(ws.flatMap((q) => q.w!.named ?? []))].join(', ') || 'nothing'}; HIDDEN BEST BUYS (gain > 5 %, payback < tau ${ws[0].w!.tau ?? '-'} h, named by neither): ${hid.length ? hid.join('; ') : 'none'}`);
    const by = new Map<string, Map<number, number[]>>();
    for (const { seed, w } of ws) for (const q of w!.rows) {
      const m = by.get(q.step) ?? new Map<number, number[]>();
      by.set(q.step, m);
      (m.get(seed) ?? m.set(seed, []).get(seed)!).push(q.d);
    }
    for (const [step, m] of [...by.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const per = [...m.entries()].map(([seed, v]) => ({ seed, d: v.reduce((a, x) => a + x, 0) / v.length }));
      const mean = per.reduce((a, q) => a + q.d, 0) / per.length;
      const worst = per.reduce((a, q) => (q.d < a.d ? q : a));
      const bad = mean < -0.01 || worst.d < -0.04;
      n++;
      if (bad) fails++;
      const hidden = ws.filter(({ w }) => w!.rows.some((q) => q.step === step && q.hidden)).length;
      L.push(`   ${step.padEnd(26)} n ${pad(per.length, 2)}  mean ${pc(mean).padStart(9)}  worst ${pc(worst.d).padStart(9)} (s${worst.seed})${bad ? '  FAILS' : ''}${hidden ? `  HIDDEN BEST BUY (${hidden} seed${hidden > 1 ? 's' : ''})` : ''}`);
    }
  }
  L.push(` GATE (17.1): ${fails ? `${fails} of ${n} steps FAIL` : `met on all ${n} steps`}`);
}

// ============================================================================================ stage 2 (yard-stage2.md 8.2; content2-bots)

/** The bots of 8.2's table, each a habit on the first yard's normal hand unless it names another hand. */
type Bot2 = 'normal' | 'brisk' | 'slow' | 'manager' | 'always' | 'packs' | 'ads' | 'racker' | 'cutter' | 'holder' | 'steelMax' | 'leadCut' | 'flat' | 'behind' | 'noise' | 'old' | 'noCrane' | 'bridgeLevels' | 'routeB' | 'cut60' | 'hand15' | 'packsAlways' | 'planned' | 'freeDrop';
const BOTS2: Record<Bot2, Partial<BotOptions>> = {
  normal: {},
  brisk: { hand: 'brisk' },
  slow: { hand: 'slow' },
  manager: { manager: true },
  always: { finance: 'always' },
  packs: { packs: true },
  ads: { ads: true },
  racker: { rack: 'rack' },
  cutter: { rack: 'cut' },
  holder: { holder: true },
  steelMax: { steelMax: true },
  leadCut: {},
  // content2-bots, the measurement (REPORT8): the normal hand on content variants. flat: the yard PLAYED with prices flat
  // (board.a 0: I's gate on both boards, 14.10); behind: group.ahead false (every run trip by trip: the gate of planning
  // ahead, 14.9); noise: the cutters' power x (1 + 1e-9) (that gate's noise floor). Not in the default list (--bots).
  flat: {},
  behind: {},
  noise: {},
  // old: the yard hands' order of work before RULING2.md 17 (crew.orderFromRung beyond the ladder), from the first minute (16.7)
  old: {},
  // REPORT9 (content2-bots, after the fixes): the crane pair of rulings 22 E5 and 24 R1 (the normal hand in a shop without
  // the magnet crane and its goal), the bridge-partner play of E4 (the normal hand that also levels the garage and the
  // plumber whenever the cash covers the price shown, before and after each sitting's play), and the opening's route B
  // (S10) on the normal hand, for "fifteen seeds and two routes".
  noCrane: {},
  bridgeLevels: {},
  routeB: { route: 'B' },
  // REPORT9's probe of planning ahead (14.9, T3): the planned runs shorter (group.cutRun_s 120 -> 60; group.handRun_s 30 -> 15)
  cut60: {},
  hand15: {},
  // s2e-bots (the new economy, RULING2.md 27 and 28): packsAlways: the packs bot that also takes every Bank loan (28.2 (g), gate
  // G6: its lead at rung 5 at most one sitting); planned: the normal hand with planning ahead kept at the works
  // (group.aheadWorks true: the pair of 28.1 and gate G9's measure beside trip by trip); freeDrop: the normal hand on the old
  // drop-off rule (works.dropoffPeriod_s absent: a thing taken from a full drop-off replaced at once; the pair of 28.3 (d)).
  packsAlways: { packs: true, finance: 'always' },
  planned: {},
  freeDrop: {},
};
/**
 * s2e-bots: habits that no longer mean anything on the stage as built, dropped with their reason (asked for by name, the call
 * prints the line and runs nothing). The crane is not sold (27.2 b), the lead line waits for stage 3 (27.3 D2), planning ahead
 * is off at the works by content (group.aheadWorks false; 'behind' switched it off everywhere, and the run-length probes
 * measured planning that is no longer done; its pair is now 'planned').
 */
const DROPPED2: Partial<Record<Bot2, string>> = {
  noCrane: 'the magnet crane is not sold at stage 2 (RULING2.md 27.2 b): the normal hand already never buys it',
  leadCut: 'the battery breaker and the lead smelter wait for stage 3 (27.3 D2): the shipped content is the lead cut',
  behind: 'trip by trip is the works\' rule (group.aheadWorks false, 28.1): its pair is now `planned` (planning kept at the works)',
  cut60: 'a probe of planned runs\' lengths; planning is off at the works (28.1)',
  hand15: 'a probe of planned runs\' lengths; planning is off at the works (28.1)',
};
/** s2e-bots: the slow hand plays ONCE A DAY (yard-stage2-economy.md risk 4, gate G3: 15 minutes every 23.75 h). Its sittings are days. */
const DAILY2 = new Set<Bot2>(['slow']);
/** The bots a plain --stage 2 call runs (the variants are asked for by name). */
const DEFAULT2: Bot2[] = ['normal', 'brisk', 'slow', 'manager', 'always', 'packs', 'packsAlways', 'ads', 'racker', 'cutter', 'holder', 'steelMax'];
/**
 * The bots whose sittings measure G (a capped absence at usual prices from each return) beside I (REPORT8). s2e-bots: EVERY
 * bot (ruling 27.4: rated income is calibrated on the normal board and GATED on route B, the flat board, the unseen seeds and
 * the other habits), and the headroom U, the purse and the bill at every return.
 */
const MEASURES_G = { has: (_b: Bot2) => true };
/** The bots whose first part (to the works' opening) is the normal hand's own: they share one snapshot per seed. */
const SHARES_NORMAL = new Set<Bot2>(['normal', 'always', 'packs', 'packsAlways', 'ads', 'racker', 'cutter', 'steelMax', 'leadCut', 'behind', 'noise', 'noCrane', 'bridgeLevels', 'cut60', 'hand15', 'planned', 'freeDrop']);
const S2_SITTINGS = Number(arg('sittings', '16')); // 8 days twice a day (8.2)
const S2_AWAY_S = 11.75 * 3600;
const S2_PLAY_S = 15 * 60;

/** The lead cut (8.2, ruling 10.3): the lead line moved to stage 3: no breaker, no smelter, no lead goals. */
function leadCut(cfg: R.SalvageConfig): R.SalvageConfig {
  const c = JSON.parse(JSON.stringify(cfg.salvage)) as R.SalvageConfig['salvage'] & { stage2?: { id: string }[] };
  const drop = new Set(['breaker', 'smelter']);
  if (c.works) for (const k of drop) delete (c.works.plates as Record<string, unknown>)[k];
  if (c.worksLayer) c.worksLayer.shop = c.worksLayer.shop.filter((i) => !drop.has(i.key));
  if (c.stage2) c.stage2 = c.stage2.filter((g) => !['buyBreaker', 'buySmelter', 'pourLead'].includes(g.id));
  return { ...cfg, salvage: c };
}

/** A shop without these works items and goals (a player who never buys them is the normal bot in such a shop; the economy attacker's pairs). */
function dropItems(cfg: R.SalvageConfig, keys: string[], goals: string[]): R.SalvageConfig {
  const c = JSON.parse(JSON.stringify(cfg.salvage)) as R.SalvageConfig['salvage'] & { stage2?: { id: string }[] };
  const drop = new Set(keys);
  if (c.works) for (const k of drop) delete (c.works.plates as Record<string, unknown>)[k];
  if (c.worksLayer) c.worksLayer.shop = c.worksLayer.shop.filter((i) => !drop.has(i.key));
  if (c.stage2) c.stage2 = c.stage2.filter((g) => !goals.includes(g.id));
  return { ...cfg, salvage: c };
}

/** E4's play (bridgeLevels): level the two bridge partners while the cash covers the price shown (levelCheck), as a person pressing the card. */
function levelBridge(b: Bot): void {
  for (let guard = 0; guard < 60; guard++) {
    let did = false;
    for (const id of ['partner.garage', 'partner.plumbing']) {
      if (!b.g.salvage.partners[id]?.open) continue;
      const ck = levelCheck(b.cfg, b.g, { kind: 'partner', partner: id });
      if (ck.price === null || ck.refusal || b.g.cash < ck.price) continue;
      const cash0 = b.g.cash;
      b.g = R.level(b.cfg, b.g, { kind: 'partner', partner: id }, ck.price, b.g.salvage.t);
      if (Math.abs(cash0 - b.g.cash - ck.price) > 0.005) b.rec.broken.push({ t: b.g.salvage.t, what: `bridge level paid ${cash0 - b.g.cash} for shown ${ck.price}` });
      b.rec.purchases.push({ t: b.g.salvage.t, key: `lev:${id}`, price: ck.price, kind: 'level', goal: false, cashAfter: b.g.cash });
      did = true;
    }
    if (!did) break;
  }
}

/** The content variants of the measurement (BOTS2's comment): flat board, ahead false, the noise floor. */
function variant(cfg: R.SalvageConfig, which: Bot2): R.SalvageConfig {
  const c = cfg.salvage as R.SalvageConfig['salvage'] & { group: Record<string, unknown> };
  if (which === 'leadCut') return leadCut(cfg);
  if (which === 'noCrane') return dropItems(cfg, ['crane'], ['buyCrane']);
  if (which === 'flat') return { ...cfg, salvage: { ...c, board: { ...c.board, a: 0 } } } as R.SalvageConfig;
  if (which === 'cut60') return { ...cfg, salvage: { ...c, group: { ...c.group, cutRun_s: 60 } } } as R.SalvageConfig;
  if (which === 'hand15') return { ...cfg, salvage: { ...c, group: { ...c.group, handRun_s: 15 } } } as R.SalvageConfig;
  if (which === 'behind') return { ...cfg, salvage: { ...c, group: { ...c.group, ahead: false } } } as R.SalvageConfig;
  if (which === 'old') return { ...cfg, salvage: { ...c, crew: { ...c.crew, orderFromRung: 99 } } } as R.SalvageConfig;
  if (which === 'planned') return { ...cfg, salvage: { ...c, group: { ...c.group, aheadWorks: true } } } as R.SalvageConfig;
  if (which === 'freeDrop') {
    const w = { ...(c as unknown as { works: Record<string, unknown> }).works };
    delete w.dropoffPeriod_s;
    return { ...cfg, salvage: { ...c, works: w } } as unknown as R.SalvageConfig;
  }
  if (which === 'noise') return { ...cfg, salvage: { ...c, crew: { ...c.crew, cutter: { ...c.crew.cutter, share: c.crew.cutter.share * (1 + 1e-9) } } } } as R.SalvageConfig;
  return cfg;
}

/** G at usual prices from a return state (2.3.3): one capped absence (cash ample for every load), the bank's share added back. */
function gAt(cfg: R.SalvageConfig, g0: R.SalvageGame): { G: number; h: number } {
  const flat = cfg.salvage.board.a === 0 ? cfg : ({ ...cfg, salvage: { ...cfg.salvage, board: { ...cfg.salvage.board, a: 0 } } } as R.SalvageConfig);
  // The return's own card is put aside (a second pass adds to an unread card: its hours would count twice).
  const g = { ...g0, cash: Math.max(1e7, g0.cash), lastSavedAt: g0.salvage.clock.highMs, salvage: { ...g0.salvage, away: null } } as R.SalvageGame;
  const o = awayPass(flat, g, g.salvage.clock.highMs + 24 * 3600_000);
  const h = (o.salvage.away?.seconds ?? 0) / 3600;
  return { G: (o.cash - g.cash + (o.salvage.away?.bank ?? 0) + stockAt(flat, o) - stockAt(flat, g)) / Math.max(1e-9, h), h };
}

/** The stage's vehicles and tools measured with the plates (yard-stage2.md 2.9: payback-priced; RULING2.md 21.1). */
// s2e-bots: superseded by soldItems (the stage as built); kept for the record of REPORT9's measure.
const MEASURED_ITEMS = ['truckBridge', 'pallet', 'forklift', 'plasma'];
void MEASURED_ITEMS;
type PlateRow = { at_h: number; rung: number; I: number; dI: number; bought: boolean; price?: number; G?: number; dG?: number; dE?: number; E0?: number; hE?: number; pre?: string[]; tL?: number; tT?: number; T0?: number; dT?: number; dP?: number; E0T?: number; tW_h?: number; worked?: boolean };
/** s2e-measure (28.4 b): the plasma's lasting gain at one of its three moments. */
type Plasma3 = { at: string; at_h: number; tL: number; dL: number; dT: number; dP: number; E0: number; tW_h: number; lot4: number; lot3: number; lotA: { cut4: number; cut3: number }; lotB: { cut4: number; cut3: number } };

/**
 * RULING2.md 21.1: what the yard earns from g over AN HOUR OF PLAY by the reference bot (the normal hand, the goal habit,
 * buying nothing: the two branches differ by the one purchase) and then ONE ABSENCE AT THE CAP: the cash moved and the
 * stock's change at usual prices (prices flat, board.a 0, as G), the bank's share added back; and the yard hours it covered.
 */
function playedE(cfg0: R.SalvageConfig, g0: R.SalvageGame, opts: BotOptions): { E: number; h: number; hold: number } {
  const cfg = cfg0.salvage.board.a === 0 ? cfg0 : ({ ...cfg0, salvage: { ...cfg0.salvage, board: { ...cfg0.salvage.board, a: 0 } } } as R.SalvageConfig);
  const g = { ...g0, cash: 1e7 } as R.SalvageGame;
  const b = newBot(cfg, g, g.salvage.clock.highMs, { ...opts, noBuy: true, gate2: false });
  const v0 = stockAt(cfg, g);
  const t0 = g.salvage.t;
  playTo(b, t0 + 3600);
  away(b, S2_AWAY_S);
  const bank = b.g.salvage.away?.bank ?? 0;
  return { E: b.g.cash - g.cash + bank + stockAt(cfg, b.g) - v0, h: (b.g.salvage.t - t0) / 3600, hold: b.g.salvage.away?.seconds ?? 0 };
}

/**
 * s2e-measure (RULING2.md 28.4 (a)): THE LASTING GAIN's branch. From g (the item already bought, or not), the reference bot
 * (the normal hand, buying nothing) plays at least an hour and, where `key` names the item measured, on until the item WORKS
 * (worksNow: set down and started; a hall after its first heat; the line after its first car; the hook-lift after both
 * bridge partners' first loads; at most 3 h); `playS` instead plays exactly that long (the branch without the item plays as
 * long as the branch with it did). Then ONE CAPPED ABSENCE, nobody at the yard. Ep / hp: what the yard kept over the play
 * (cash moved and stock at usual prices, prices flat); Ea / ha: the same over the absence alone (the bank's share added
 * back); tW: the seconds played; worked: the item worked before the absence began; cut4 / cut3: the worth (prepared value)
 * of the tier-4 and the tier-3 oversize pieces cut in the play.
 */
type LastE = { Ep: number; hp: number; Ea: number; ha: number; tW: number; worked: boolean; cut4: number; cut3: number; Tp: number; Ta: number };
function worksNow(cfg: R.SalvageConfig, g: R.SalvageGame, key: string, c0: Record<string, number>): boolean {
  const s = g.salvage;
  const W = contentAt(cfg.salvage, s).works;
  if (W?.plates[key]) {
    const w = s.works[key];
    if (!w || w.phase !== 'running') return false;
    if (w.heat && !w.heat.firstPoured) return false;
    // the line: its `with` plates running too, and its first car drained
    const withs = ((W.plates[key] as { with?: string[] }).with ?? []);
    if (withs.some((q) => s.works[q]?.phase !== 'running')) return false;
    if (key === 'shredder' && (s.counts?.depolluted ?? 0) <= (c0.depolluted ?? 0)) return false;
    return true;
  }
  if (s.arriving.some((a) => a.item === key)) return false;
  if (!s.owned.includes(key as never)) return false;
  if (key === 'truckBridge') {
    const ps = Object.entries(contentAt(cfg.salvage, s).partners).filter(([, p]) => (p as { opens?: string }).opens === 'truckBridge').map(([id]) => id);
    return ps.every((id) => s.partners[id]?.trialUsed) && !s.truck.skip?.trial;
  }
  return true;
}
function lotWorth(cfg: R.SalvageConfig, g: R.SalvageGame, c0: Record<string, number>): { cut4: number; cut3: number } {
  const c = contentAt(cfg.salvage, g.salvage);
  const kinds = new Set(((c.lots?.kinds ?? []) as { obj: string }[]).map((k) => k.obj));
  let cut4 = 0;
  let cut3 = 0;
  for (const obj of kinds) {
    const n = (g.salvage.counts?.[`cut:${obj}`] ?? 0) - (c0[`cut:${obj}`] ?? 0);
    const o = c.objects[obj] as { tier?: number; preparedValue?: number } | undefined;
    if (!n || !o) continue;
    if ((o.tier ?? 0) >= 4) cut4 += n * (o.preparedValue ?? 0);
    else cut3 += n * (o.preparedValue ?? 0);
  }
  return { cut4, cut3 };
}
function lastingE(cfg0: R.SalvageConfig, g0: R.SalvageGame, opts: BotOptions, key: string | null, playS?: number): LastE {
  const cfg = cfg0.salvage.board.a === 0 ? cfg0 : ({ ...cfg0, salvage: { ...cfg0.salvage, board: { ...cfg0.salvage.board, a: 0 } } } as R.SalvageConfig);
  const g = { ...g0, cash: 1e7, salvage: { ...g0.salvage, away: null } } as R.SalvageGame;
  const b = newBot(cfg, g, g.salvage.clock.highMs, { ...opts, noBuy: true, gate2: false });
  const c0 = { ...(g.salvage.counts ?? {}) } as Record<string, number>;
  const v0 = stockAt(cfg, g);
  const t0 = g.salvage.t;
  const s0 = g.salvage.ladder.supplied_g;
  if (playS !== undefined) playTo(b, t0 + playS);
  else {
    playTo(b, t0 + 3600);
    while (key && !worksNow(cfg, b.g, key, c0) && b.g.salvage.t < t0 + 3 * 3600) playTo(b, b.g.salvage.t + 60);
  }
  const worked = key ? worksNow(cfg, b.g, key, c0) : true;
  const tW = b.g.salvage.t - t0;
  const cash1 = b.g.cash;
  const v1 = stockAt(cfg, b.g);
  const lw = lotWorth(cfg, b.g, c0);
  const s1 = b.g.salvage.ladder.supplied_g;
  away(b, S2_AWAY_S);
  const bank = b.g.salvage.away?.bank ?? 0;
  const ha = (b.g.salvage.away?.seconds ?? 0) / 3600;
  return { Ep: cash1 - g.cash + v1 - v0, hp: tW / 3600, Ea: b.g.cash - cash1 + bank + stockAt(cfg, b.g) - v1, ha, tW, worked, ...lw, Tp: (s1 - s0) / 1e6, Ta: (b.g.salvage.ladder.supplied_g - s1) / 1e6 };
}
/** The lasting gain and its two companions from a branch with the item (A) and one without (B). */
function lastingGain(A: LastE, B: LastE) {
  const ha = (A.ha + B.ha) / 2;
  const hT = (A.hp + A.ha + B.hp + B.ha) / 2;
  return {
    // the price's measure (28.4 a): the capped absence that begins once the item works
    dL: (A.Ea - B.Ea) / Math.max(1e-9, ha),
    // the played run-up and the absence together (ruling 21.1's measure where the run-up is the hour)
    dT: (A.Ep + A.Ea - B.Ep - B.Ea) / Math.max(1e-9, hT),
    // the played run-up alone
    dP: (A.Ep - B.Ep) / Math.max(1e-9, (A.hp + B.hp) / 2),
    // the same in TONNES supplied an hour (28.7 d): over the absence (the lasting gain's measure) and over both
    tL: (A.Ta - B.Ta) / Math.max(1e-9, ha),
    tT: (A.Tp + A.Ta - B.Tp - B.Ta) / Math.max(1e-9, hT),
    T0: B.Ta / Math.max(1e-9, B.ha),
    E0: B.Ea / Math.max(1e-9, B.ha),
    E0T: (B.Ep + B.Ea) / Math.max(1e-9, B.hp + B.ha),
    tW_h: A.tW / 3600,
    worked: A.worked,
    lot4: (A.cut4 - B.cut4) / Math.max(1e-9, A.hp),
    lot3: (A.cut3 - B.cut3) / Math.max(1e-9, A.hp),
    lotA: { cut4: A.cut4 / Math.max(1e-9, A.hp), cut3: A.cut3 / Math.max(1e-9, A.hp) },
    lotB: { cut4: B.cut4 / Math.max(1e-9, B.hp), cut3: B.cut3 / Math.max(1e-9, B.hp) },
  };
}

/** s2e-measure (28.4 f): what the advice line names at a state: "buy key §p (payback h)", "save key §p", "wait <line key>", or "none". */
function advSummary(cfg: R.SalvageConfig, g: R.SalvageGame): string {
  if (!worksOpened(g.salvage)) return '-';
  const a = R.advice(cfg, g, g.salvage.clock.highMs) as (R.Advice & { works?: { saveUp_s: number | null; payback_h: number; meanwhile: { price: number } | null } }) | null;
  if (!a) return 'none';
  const x = a.action as { act: string; item?: string; role?: string; target?: { kind: string; id?: string; partner?: string; machine?: string } };
  const what = x.act === 'buy' ? x.item : x.act === 'hire' ? `hire ${x.role}` : x.target ? `lev ${x.target.id ?? x.target.partner ?? x.target.machine}` : x.act;
  const key = (a.line as { key?: string })?.key ?? '';
  return `${a.works?.saveUp_s ? 'save' : 'buy'} ${what} §${Math.round(a.price)}${a.works ? ` pb ${a.works.payback_h.toFixed(1)}h` : ''} (${key})${a.works?.meanwhile ? ` +forNow §${Math.round(a.works.meanwhile.price)}` : ''}`;
}
/** s2e-measure (28.4 f): every level the yard holds, by levelQuote: how many are sold (worth having), not the limit (under minShareI x I), floor-bound; the best payback. */
function levelsSummary(cfg: R.SalvageConfig, g: R.SalvageGame) {
  const out = { sold: 0, notLimit: 0, floor: 0, best: '-' };
  if (!worksOpened(g.salvage)) return out;
  let best = Infinity;
  const ts: LevelTarget[] = [...g.salvage.crew.map((m) => ({ kind: 'crew', id: m.id }) as LevelTarget), ...Object.keys(g.salvage.partners).filter((p) => g.salvage.partners[p]?.open).map((p) => ({ kind: 'partner', partner: p }) as LevelTarget), ...(['stripper', 'bench', 'crucible'] as const).map((m) => ({ kind: 'machine', machine: m }) as LevelTarget)];
  for (const t of ts) {
    const q = levelQuote(cfg, g, t);
    if (!q) continue;
    if (!q.sold) out.notLimit++;
    else { out.sold++; if (q.floorBound) out.floor++; if (q.paybackH < best) { best = q.paybackH; out.best = `${t.kind === 'crew' ? t.id : t.kind === 'partner' ? t.partner : t.kind === 'machine' ? t.machine : t.kind} ${q.paybackH.toFixed(0)}h`; } }
  }
  return out;
}

interface Sitting2 {
  n: number;
  h: number;
  rung: number;
  t: number;
  cash: number;
  cashBack: number;
  awayNet: number;
  awayBank: number;
  awayMs: number;
  I: number;
  bought: number;
  spent: number;
  goal: string | null;
  works: string;
  /** REPORT8: lifetime earnings at the return and after the sitting, the yard's running hours of the absence (the cap), materials counted for the next rung, the Yard sale's and the van's money on the card, G and I at the return (MEASURES_G only). */
  Lback: number;
  Lend: number;
  ranH: number;
  mats: number;
  rack: number;
  van: number;
  /** E8 (s2-fix-content): oversize lots cut in the sitting (its away pass and its play: counts.lotOpened) and lots arrived (lots.n), deltas. */
  lotsCut: number;
  lotsCame: number;
  G?: number;
  Iback?: number;
  /** REPORT9 (ruling 23.5, packs against headroom): the headroom U (shop.ts headroomU) at the return and at the sitting's end (MEASURES_G only). */
  Uback?: number;
  Uend?: number;
  /** REPORT9 (E4's play): the bridge partners' levels at the sitting's end (garage, plumbing). */
  bridge?: [number, number];
  /** s2e-bots: what the sitting bought (key, price, why, the payback it was shown with), the bank's offers and loans in it, what of a loan is left at its end, the sold machines' bill at the return (the gated, unowned sold items' prices), the packs that would fit (H hours: cash + H x I <= U, no loan open) at the return and at the end, and the oversize pieces waiting at the return with their masses inside their kind's range or not. */
  keys?: { k: string; p: number; via?: string; pb?: number }[];
  offers?: number;
  loans?: string[];
  loanLeft?: number;
  loanBack?: boolean;
  billM?: number;
  fitBack?: number[];
  fitEnd?: number[];
  lotsWait?: number;
  lotMassBad?: string[];
  tier?: number;
  /** s2e-measure: the drop-off's arrivals so far (dropoff.n) at the sitting's end (28.3 d's pair). */
  drop?: number;
  /** s2e-measure (28.4 f): the advice line at the sitting's end, and its levels: sold (worth having), not the limit, floor-bound. */
  adv?: string;
  lv?: { sold: number; notLimit: number; floor: number; best: string };
}

// ============================================================================================ s2e-bots: the new economy's measures

/** A content gate's rung ('rung4' -> 4; a gate past the ladder, salvage.content.ts DARK 'rung99', is past every rung). */
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-');
const gateN = (gate: unknown): number => Number(/^rung(\d+)$/.exec(String(gate ?? ''))?.[1] ?? 0);

/**
 * THE SOLD ITEMS of the stage (yard-stage2-economy.md 2.7 to 2.9; ruling 27.2 b): every works-layer shop item (a works plate,
 * a vehicle, a tool, a carrier) whose gate is a rung within the ladder's top; what is gated past the ladder is dark. A plate
 * that comes `with` another (the depollution bay with the shredder) has no item on sale of its own: the line is `shredder`.
 */
function soldItems(cfg: R.SalvageConfig): { key: string; kind: string; gate: number; price: number }[] {
  const c = contentAt(cfg.salvage, { counts: { bathSet: 1 } } as never);
  const top = c.ladder.topRung ?? 3;
  const layer = new Set(((cfg.salvage as unknown as { worksLayer?: { shop: { key: string }[] } }).worksLayer?.shop ?? []).map((i) => i.key));
  return c.shop.filter((i) => layer.has(i.key) && i.kind !== 'crew' && gateN(i.gate) >= 1 && gateN(i.gate) <= top).map((i) => ({ key: i.key, kind: i.kind, gate: gateN(i.gate), price: i.price }));
}

/** What a loan has left to repay (T - taken), or null with no agreement open. */
function agreementLeft(g: R.SalvageGame): number | null {
  const a = g.salvage.bank?.agreement as { T: number; taken: number } | null | undefined;
  return a ? a.T - a.taken : null;
}

/** The packs that fit with the cash in hand now (T11's arithmetic: cash + H x I <= U), from rung 4, none while a loan is open (D7). */
function packsFit(cfg: R.SalvageConfig, g: R.SalvageGame): number[] {
  // packs come from rung 4 (2.15, as built) and never while a loan is open (D7 as amended by 28.2 c)
  if (agreementLeft(g) !== null || g.salvage.ladder.rung < 4) return [];
  const U = R.headroomU(cfg, g);
  const I = incomeAt(cfg, g);
  return ((cfgPacks ?? packProducts(cfg)) as { H: number }[]).map((p) => p.H).filter((H) => g.cash + H * I <= U + 1e-9);
}

/** s2e-bots: what the first look reads at a return: the sold machines' bill, the packs that fit, a loan open, the oversize pieces waiting and their masses against their kind's range (G8), the boss's tool tier. */
function returnLook(cfg: R.SalvageConfig, g: R.SalvageGame) {
  let billM = 0;
  for (const it of soldItems(cfg)) {
    if (it.gate > g.salvage.ladder.rung) continue;
    const ck = buyCheck(cfg, g, it.key as never);
    if (ck.price !== null && !['locked', 'top', 'owned', 'arriving', 'info'].includes(String(ck.state))) billM += ck.price;
  }
  const kinds = (contentAt(cfg.salvage, g.salvage).lots?.kinds ?? []) as { obj: string; mass_kg?: [number, number] }[];
  const lots = g.salvage.things.filter((th) => th.at.at === 'lot');
  const bad = lots.filter((th) => { const k = kinds.find((q) => q.obj === th.obj); const m = (th as { g?: number }).g ?? 0; return !k?.mass_kg || m < k.mass_kg[0] * 1000 - 1 || m > k.mass_kg[1] * 1000 + 1; }).map((th) => `${th.obj} ${Math.round(((th as { g?: number }).g ?? 0) / 1000)} kg`);
  return { billM: Math.round(billM), fitBack: packsFit(cfg, g), loanBack: agreementLeft(g) !== null, lotsWait: lots.length, lotMassBad: bad, tier: g.salvage.tier };
}
function endLook(cfg: R.SalvageConfig, g: R.SalvageGame) {
  return { fitEnd: packsFit(cfg, g) };
}

/**
 * THE LEVEL LADDERS' THREE STEPS (yard-stage2-economy.md 2.3's fallback; ruling 27.4; the gain book g(L) = g1 x d^(L-1)): at
 * the ladder's planned moment (the return of that sitting, the sitting's goal purchases owned in every branch), the
 * ladder's level bought one, two and three steps up, each branch measured by ruling 21.1's measure (an hour of play by the
 * reference bot buying nothing, then one capped absence; prices flat). g_k = (E_k - E_{k-1}) / the hours. The steps are
 * bought through the rules' own level action on a copy of the content where the ladder is SOLD whatever its calculated gain
 * (minShareI 0 and a book entry for it: only the price differs, and the branches hold cash 1e12); the play reads the shipped
 * content. Beside g1: the calculated gain (rate.ts levelGain on the shipped content, the one measure) for G2 R.
 */
const LADDERS: { ladder: string; at: 'r3s1' | 'r4entry'; role?: 'driver' | 'cutter' | 'hand'; partner?: string }[] = [
  { ladder: 'driver', at: 'r4entry', role: 'driver' },
  { ladder: 'cutter', at: 'r3s1', role: 'cutter' },
  { ladder: 'partner.plumbing', at: 'r4entry', partner: 'partner.plumbing' },
  // s2e-measure (28.4 c: EVERY ladder that fails its check): the yard hand's and the garage's ladders too
  { ladder: 'hand', at: 'r3s1', role: 'hand' },
  { ladder: 'partner.garage', at: 'r4entry', partner: 'partner.garage' },
];
/** The ladders rated income's engineer reported FAILING the driver-level check (notes/s2e-rate.md, G2 R): only these are written into the content's levels.book by --book write. */
const BOOK_FAILING = ['driver'];
/** RULING2.md 28.7 (the lead's line of 15:55): the items whose prices this price round writes. */
const WRITE_ITEMS = ['truckBridge', 'analyser', 'induction', 'rotary'];
const f2s = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '-');
type BookRow = { ladder: string; at: string; at_h: number; rung: number; L0: number; gains: number[]; gainsT?: number[]; E0: number; calc: number; I: number; price: number | null };

function ladderTarget(g: R.SalvageGame, L: (typeof LADDERS)[number]): LevelTarget | null {
  if (L.partner) return g.salvage.partners[L.partner]?.open ? ({ kind: 'partner', partner: L.partner } as LevelTarget) : null;
  const m = g.salvage.crew.find((q) => q.role === L.role);
  return m ? ({ kind: 'crew', id: m.id } as LevelTarget) : null;
}
function levelOf(g: R.SalvageGame, t: LevelTarget): number {
  return t.kind === 'partner' ? g.salvage.partners[t.partner]?.level ?? 0 : t.kind === 'crew' ? g.salvage.crew.find((m) => m.id === t.id)?.level ?? 0 : 0;
}
function stepUp(cfg: R.SalvageConfig, g: R.SalvageGame, t: LevelTarget, ladder: string): R.SalvageGame | null {
  const lv = cfg.salvage.levels as unknown as { book?: Record<string, unknown> };
  const sell = { ...cfg, salvage: { ...cfg.salvage, levels: { ...cfg.salvage.levels, minShareI: 0, book: { ...(lv.book ?? {}), [ladder]: { g1: 1e6, d: 1 } } } } } as R.SalvageConfig;
  const ck = levelCheck(sell, g, t);
  if (ck.price === null || ck.refusal) return null;
  const after = R.level(sell, g, t, ck.price, g.salvage.t);
  return levelOf(after, t) > levelOf(g, t) ? ({ ...after, cash: 1e12 } as R.SalvageGame) : null;
}

/** G15 (yard-stage2-economy.md G15; the specification's 8.4): what a person-paced rung-4 entry sitting does in 15 minutes. */
type PersonRow = { seed: number; hand: string; t0_h: number; cash: number; done: Record<string, number>; lotsWaiting: number; lotsCut: number; cards: { t: number; card: string; by: string }[]; twoCards: number; fits: boolean; missing: string[] };
function personSitting(cfg: R.SalvageConfig, snap: BotSnap, opts: BotOptions, seed: number): PersonRow {
  const p = resumeBot(cfg, snap, { ...opts, hand: 'slow', gate2: false });
  const t0 = p.g.salvage.t;
  // what the rung-4 entry sitting still has to do: the rung's sold items not yet owned or ordered at the return
  const own0 = (k: string) => !!p.g.salvage.works[k] || p.g.salvage.owned.includes(k as never) || p.g.salvage.arriving.some((q) => q.item === k);
  const want = soldItems(cfg).filter((i) => i.gate === 4 && !own0(i.key)).map((i) => i.key);
  const lots0 = p.g.salvage.things.filter((th) => th.at.at === 'lot' && (contentAt(cfg.salvage, p.g.salvage).objects[th.obj]?.tier ?? 9) <= p.g.salvage.tier).length;
  const cut0 = p.g.salvage.counts?.lotOpened ?? 0;
  const n0 = p.rec.purchases.length;
  const c0 = p.rec.s2.commissioned.length;
  const po0 = p.rec.s2.pours.length;
  // The centred cards the screen would open, in order, each with what opened it: the away card on return (no action);
  // the lender's letter when a works or park card is opened (an action); the finance card only when Bank loan is pressed.
  const cards: PersonRow['cards'] = [];
  if (p.g.salvage.away) cards.push({ t: 0, card: 'away', by: 'the return' });
  let letter = p.g.salvage.bank.letterSeen;
  let loans = p.rec.s2.loans.length;
  const done: Record<string, number> = {};
  for (let guard = 0; guard < 20000 && p.g.salvage.t < t0 + 1800; guard++) {
    const t1 = p.g.salvage.t;
    const k = p.rec.purchases.length;
    playTo(p, t1 + 1);
    const dt = Math.round(p.g.salvage.t - t0);
    if (!letter && p.g.salvage.bank.letterSeen) { letter = true; cards.push({ t: dt, card: 'letter', by: 'opening a works or park card' }); }
    if (p.rec.s2.loans.length > loans) { loans = p.rec.s2.loans.length; cards.push({ t: dt, card: 'finance', by: 'pressing Bank loan' }); }
    for (const q of p.rec.purchases.slice(k)) if (want.includes(q.key) && done[`buy ${q.key}`] === undefined) done[`buy ${q.key}`] = Math.round(q.t - t0);
    for (const q of p.rec.s2.commissioned.slice(c0)) if (done[`start ${q.plate}`] === undefined) done[`start ${q.plate}`] = Math.round(q.t - t0);
    for (const q of p.rec.s2.pours.slice(po0)) if (done[`pour ${q.plate}`] === undefined) done[`pour ${q.plate}`] = Math.round(q.t - t0);
    const cut = (p.g.salvage.counts?.lotOpened ?? 0) - cut0;
    for (let j = 1; j <= cut; j++) if (done[`cut ${j}`] === undefined) done[`cut ${j}`] = dt;
  }
  const lotsCut = (p.g.salvage.counts?.lotOpened ?? 0) - cut0;
  const halls = want.filter((k) => contentAt(cfg.salvage, p.g.salvage).works?.plates[k]?.recipes);
  // a hall bought before the return but not yet poured still owes its first heat
  const unpoured = soldItems(cfg).filter((i) => i.gate === 4 && contentAt(cfg.salvage, p.g.salvage).works?.plates[i.key]?.recipes && !want.includes(i.key) && !snap.g.salvage.works[i.key]?.heat?.firstPoured).map((i) => i.key);
  const need = [...want.map((k) => `buy ${k}`), ...want.filter((k) => contentAt(cfg.salvage, p.g.salvage).works?.plates[k]).map((k) => `start ${k}`), ...[...halls, ...unpoured].map((k) => `pour ${k}`), ...Array.from({ length: Math.min(2, lots0) }, (_, j) => `cut ${j + 1}`)];
  const missing = need.filter((x) => done[x] === undefined || done[x] > 900);
  // Two centred cards without a player's action between them: only the away card opens without one; another card opened
  // in the same instant as it (before the away card was put aside) would be the fault.
  const twoCards = cards.filter((q, i) => i > 0 && q.by === 'the return').length;
  void n0;
  return { seed, hand: 'slow', t0_h: +(t0 / 3600).toFixed(2), cash: Math.round(snap.g.cash), done, lotsWaiting: lots0, lotsCut, cards, twoCards, fits: missing.length === 0, missing };
}

/**
 * One stage-2 run (8.2's twice-a-day habit to rung 5): a first hour, then 15 minutes every 11.75 h, up to 8 days (16
 * sittings), stopping at rung 5. The first part (to the works' opening) is cached per seed and hand under --cache and
 * shared by every bot whose habit differs only from there (SHARES_NORMAL). Hard promises are the bot's own checks
 * (bot.ts: shown = applied, cash only from earnings, the away card's sum, nothing of money before the second session)
 * plus, for the normal bot, a tick against a jump at four sittings.
 */
function run2(base0: R.SalvageConfig, spec: Spec): Summary {
  const t0 = performance.now();
  const which = spec.bot ?? 'normal';
  const base = variant(base0, which);
  const cfg = seededCfg(base, spec.seed);
  const opts: BotOptions = { hand: 'normal', habit: 'goal', route: 'A', seed: spec.seed, ...BOTS2[which] };
  // s2e-bots: the slow hand once a day (DAILY2), every other hand twice a day.
  const awayS = DAILY2.has(which) ? 23.75 * 3600 : S2_AWAY_S;
  const cacheDir = arg('cache');
  const share = SHARES_NORMAL.has(which) ? 'normal' : which;
  const snapFile = cacheDir ? path.join(cacheDir, `snap-${createHash('sha1').update(JSON.stringify({ share, seed: spec.seed, game: snapHash })).digest('hex').slice(0, 16)}.json`) : null;
  let b: Bot;
  let snapMs = 0;
  if (snapFile && fs.existsSync(snapFile)) {
    b = resumeBot(cfg, JSON.parse(fs.readFileSync(snapFile, 'utf8')) as BotSnap, opts);
  } else {
    const a = performance.now();
    b = newBot(cfg, startGame(cfg, NOW), NOW, share === 'normal' ? { hand: 'normal', habit: 'goal', route: 'A', seed: spec.seed } : opts);
    playUntil(b, (bb) => worksOpened(bb.g.salvage), 3600);
    snapMs = performance.now() - a;
    if (snapFile) {
      fs.mkdirSync(path.dirname(snapFile), { recursive: true });
      fs.writeFileSync(snapFile, JSON.stringify(snapBot(b)));
    }
    if (share === 'normal') b = resumeBot(cfg, snapBot(b), opts);
  }
  playTo(b, 3600);
  const sittings: Sitting2[] = [];
  const nohandStates: R.SalvageGame[] = [];
  let n0 = b.rec.purchases.length;
  const returns: { g: R.SalvageGame; bought: string[] }[] = [];
  const walk2: ReturnType<typeof walk2Row>[] = [];
  let personSnap: BotSnap | null = null;
  let bench8: { h: number; tripMs: number; plannedMs: number; ratio: number } | null = null;
  // s2e-measure (RULING2.md 28.5 (e)): each crew role's idle share by rung, away (5-minute samples of a probe absence from each
  // return, over the absence's own running hours) and played (a sample a minute of the sitting), with the reasons the rules
  // give (crew.ts idleWhyOf); the old stock standing in the first yard's zones at each return; the drop-off's arrivals.
  const idle: Record<string, Record<string, { n: number; idle: number; why: Record<string, number> }>> = {};
  const oldStock: { n: number; rung: number; things: number; byZone: Record<string, number>; objs: Record<string, number> }[] = [];
  // (not in the prices' runs: --plates measures from the returns and needs no probe)
  const idleOn = which === 'normal' || which === 'freeDrop';
  const zones1 = new Set(Object.keys(base0.salvage.zones ?? {}));
  const sampleCrew = (g: R.SalvageGame, mode: 'away' | 'play') => {
    const c = contentAt(cfg.salvage, g.salvage);
    for (const m of g.salvage.crew) {
      const k = `r${g.salvage.ladder.rung} ${mode}`;
      const row = ((idle[k] ??= {})[m.role] ??= { n: 0, idle: 0, why: {} });
      row.n += 1;
      if (m.job === 'idle') {
        row.idle += 1;
        let w = 'none';
        try { w = idleWhyOf(c as never, g.salvage as never, m, mode === 'play')?.why ?? 'none'; } catch { w = 'err'; }
        row.why[w] = (row.why[w] ?? 0) + 1;
      }
    }
  };
  const awayProbe = (g0: R.SalvageGame, hours: number) => {
    let g = { ...g0, cash: Math.max(1e7, g0.cash), lastSavedAt: g0.salvage.clock.highMs, salvage: { ...g0.salvage, away: null } } as R.SalvageGame;
    for (let k = 0; k < Math.ceil(hours * 12); k++) {
      g = awayPass(cfg, g, g.salvage.clock.highMs + 300_000);
      g = { ...g, lastSavedAt: g.salvage.clock.highMs, salvage: { ...g.salvage, away: null } } as R.SalvageGame;
      sampleCrew(g, 'away');
    }
  };
  for (let k = 1; k <= S2_SITTINGS && b.g.salvage.ladder.rung < 5; k++) {
    newSitting(b);
    const cash0 = b.g.cash;
    const cut0 = b.g.salvage.counts?.lotOpened ?? 0;
    const came0 = b.g.salvage.lots?.n ?? 0;
    const off0 = b.rec.s2.offers.length;
    const ln0 = b.rec.s2.loans.length;
    const a = performance.now();
    away(b, awayS);
    const awayMs = performance.now() - a;
    const card = b.g.salvage.away;
    const cashBack = b.g.cash;
    const gBack = b.g;
    // G15 (--person): the person-paced sitting is played from the normal hand's FIRST return at rung 4, as it stood.
    if (arg('person') && which === 'normal' && !personSnap && gBack.salvage.ladder.rung >= 4) personSnap = snapBot(b);
    // s2e-measure (RULING2.md 28.1 b, gate G9): THE BENCH'S RATIO on a rung-4 state PLAYED ON THE NEW CONTENT: one 8-hour away
    // pass from the normal hand's first rung-4 return, trip by trip (as shipped) against planned (group.aheadWorks true), the
    // best of three each, the same state; the absolute figure is engine step 5's, not this tool's (28.1 c).
    if (arg('bench') && which === 'normal' && !bench8 && gBack.salvage.ladder.rung >= 4) {
      const g8 = { ...gBack, cash: Math.max(1e7, gBack.cash), lastSavedAt: gBack.salvage.clock.highMs, salvage: { ...gBack.salvage, away: null } } as R.SalvageGame;
      const planned = variant(cfg, 'planned');
      const time = (c: R.SalvageConfig) => Math.min(...[0, 1, 2].map(() => { const a = performance.now(); awayPass(c, g8, g8.salvage.clock.highMs + 8 * 3600_000); return performance.now() - a; }));
      const tb = time(cfg);
      const tp = time(planned);
      bench8 = { h: +(gBack.salvage.t / 3600).toFixed(1), tripMs: Math.round(tb), plannedMs: Math.round(tp), ratio: +(tb / tp).toFixed(2) };
    }
    const back = MEASURES_G.has(which) && worksOpened(gBack.salvage) ? returnLook(cfg, gBack) : null;
    if (idleOn && worksOpened(gBack.salvage)) {
      awayProbe(gBack, Math.min(card ? card.seconds / 3600 : 0, 12));
      const byZone: Record<string, number> = {};
      const objs: Record<string, number> = {};
      for (const th of gBack.salvage.things) if (th.at.at === 'zone' && zones1.has(th.at.zone)) { byZone[th.at.zone] = (byZone[th.at.zone] ?? 0) + 1; objs[th.obj] = (objs[th.obj] ?? 0) + 1; }
      oldStock.push({ n: k, rung: gBack.salvage.ladder.rung, things: Object.values(byZone).reduce((a, v) => a + v, 0), byZone, objs });
    }
    if (which === 'bridgeLevels') levelBridge(b);
    playTo(b, b.g.salvage.t + S2_PLAY_S, idleOn && worksOpened(gBack.salvage) ? (bb) => sampleCrew(bb.g, 'play') : undefined);
    if (which === 'bridgeLevels') levelBridge(b);
    const ps = b.rec.purchases.slice(n0);
    if (which === 'normal' && worksOpened(gBack.salvage)) returns.push({ g: gBack, bought: ps.filter((p) => p.kind === 'buy').map((p) => p.key) });
    n0 = b.rec.purchases.length;
    const s = b.g.salvage;
    const gm = MEASURES_G.has(which) ? gAt(cfg, gBack) : null;
    if (arg('walk2') && (which === 'normal' || which === 'freeDrop') && (k === 1 || k === 6 || (gBack.salvage.ladder.rung >= 4 && !walk2.some((w) => w.rung >= 4)))) walk2.push(walk2Row(base, spec.seed, gBack, k === 1 ? 'r3s1' : k === 6 ? 'day3' : 'r4entry'));
    const end = back ? endLook(cfg, b.g) : null;
    sittings.push({ ...(back ?? {}), ...(end ?? {}), keys: ps.map((p) => ({ k: p.key, p: Math.round(p.price), ...(p.via ? { via: p.via } : {}), ...(p.payback_h !== undefined ? { pb: p.payback_h } : {}) })), offers: b.rec.s2.offers.length - off0, loans: b.rec.s2.loans.slice(ln0).map((l) => `${l.plate} P${l.P} F${l.F} T${l.T}`), loanLeft: Math.round(agreementLeft(b.g) ?? 0), n: k, h: +(s.t / 3600).toFixed(2), rung: s.ladder.rung, t: +(s.ladder.supplied_g / 1e6).toFixed(1), cash: Math.round(b.g.cash), cashBack: Math.round(cashBack), awayNet: Math.round(cashBack - cash0), awayBank: Math.round(card?.bank ?? 0), awayMs: Math.round(awayMs), I: Math.round(incomeAt(cfg, b.g)), bought: ps.length, spent: Math.round(ps.reduce((x, p) => x + p.price, 0)), goal: R.nextGoal(cfg, b.g)?.id ?? null, works: Object.entries(s.works).map(([id, w]) => `${id}:${w.phase[0]}${w.level}`).join(','), Lback: Math.round(gBack.lifetimeEarnings), Lend: Math.round(b.g.lifetimeEarnings), ranH: +((card?.seconds ?? 0) / 3600).toFixed(3), mats: R.rungProgress(cfg, b.g).materials ?? 0, rack: Math.round(card?.rack?.money ?? 0), van: Math.round(card?.van?.money ?? 0), lotsCut: (s.counts?.lotOpened ?? 0) - cut0, lotsCame: (s.lots?.n ?? 0) - came0, drop: s.dropoff.n, adv: advSummary(cfg, b.g), lv: levelsSummary(cfg, b.g), ...(gm ? { G: Math.round(gm.G), Iback: Math.round(incomeAt(cfg, gBack)), Uback: Math.round(R.headroomU(cfg, gBack)), Uend: Math.round(R.headroomU(cfg, b.g)) } : {}), bridge: [s.partners['partner.garage']?.level ?? 0, s.partners['partner.plumbing']?.level ?? 0] });
    // REPORT8: a minute of ticks against one jump at every sitting to rung 4 (and one past it), then at 8 and 12.
    if (spec.gate && (k <= 5 || [8, 12].includes(k))) {
      const d = tickJumpGate(cfg, b.g, b.now, 60);
      if (d) b.rec.s2.gate.push(`sitting ${k}: ${d}`);
    }
    if (which === 'normal' && worksOpened(s)) nohandStates.push(b.g);
  }
  // No hand (8.2): stage-2 states of the normal run, the stick untouched: is the next purchase (the goal's, else the advice
  // line's) affordable after the next absence, or after how many (at most 4)?
  const nohand: { h: number; next: string | null; price: number | null; absences: number | null }[] = [];
  for (const g of arg('nohand') === 'false' ? [] : nohandStates.slice(0, 20)) {
    const goal = R.nextGoal(cfg, g);
    const adv = goal?.buy ? null : R.advice(cfg, g, g.salvage.clock.highMs);
    const item = goal?.buy ?? (adv?.action.act === 'buy' ? adv.action.item : adv ? JSON.stringify(adv.action).slice(0, 50) : null);
    const price = goal?.buy ? buyCheck(cfg, g, goal.buy as never).price : adv?.price ?? null;
    let reached: number | null = null;
    if (price !== null) {
      const nb = newBot(cfg, g, g.salvage.clock.highMs, opts);
      for (let a = 1; a <= 4; a++) {
        away(nb, S2_AWAY_S);
        if (nb.g.cash >= price) {
          reached = a;
          break;
        }
      }
    }
    nohand.push({ h: +(g.salvage.t / 3600).toFixed(1), next: item, price, absences: reached });
  }
  // The payback table (2.6.4; --plates): each plate's ΔI at its planned moment, the return of the sitting in which the
  // normal bot bought it (else the last return at which its gate was met): I a jump of deliver + selfCommission later
  // with the plate bought and started by itself, against the same jump without it (cash enough for both).
  const plates: Record<string, PlateRow> = {};
  const plasma3: Plasma3[] = [];
  if (arg('plates') && which === 'normal') {
    const W = contentAt(cfg.salvage, returns[0]?.g.salvage ?? b.g.salvage).works;
    // RULING2.md 21.1 (and 19.1): every plate AND the stage's vehicles and tools (2.9, payback-priced) at its planned moment.
    // s2e-bots (27.2 b, 27.6): every SOLD machine, vehicle and tool of the stage as built (the line as `shredder`), at its
    // planned moment in the new goal order; what is dark is not measured again (its REPORT9 row stays in plates.json).
    const items = soldItems(cfg).map((i) => i.key);
    // one played branch per (return, purchases made first, the item measured, the play's length): s2e-measure (28.4 a)
    const memo = new Map<string, LastE | null>();
    const stateWith = (g0: R.SalvageGame, keys: string[]): R.SalvageGame | null => {
      let g = { ...g0, cash: 1e12 } as R.SalvageGame;
      for (const q of keys) {
        if (q.startsWith('hire:')) {
          const role = q.slice(5) as 'hand' | 'cutter' | 'driver';
          const ch = hireCheck(cfg, g, role);
          if (ch.price === null || ch.refusal) return null;
          g = { ...R.hire(cfg, g, role, ch.price, g.salvage.t), cash: 1e12 } as R.SalvageGame;
          continue;
        }
        const cq = buyCheck(cfg, g, q as never);
        if (cq.price === null || cq.refusal) return null;
        g = { ...R.buy(cfg, g, q as never, cq.price, g.salvage.t), cash: 1e12 } as R.SalvageGame;
      }
      return g;
    };
    const branchAt = (tag: string, g0: R.SalvageGame, keys: string[], key: string | null, playS?: number) => {
      const mk = `${tag}|${keys.join(',')}|${key ?? '-'}|${playS ?? '-'}`;
      if (memo.has(mk)) return memo.get(mk)!;
      const g = stateWith(g0, keys);
      const r = g ? lastingE(cfg, g, opts, key, playS) : null;
      memo.set(mk, r);
      return r;
    };
    const branch = (ri: number, keys: string[], key: string | null, playS?: number) => branchAt(`r${ri}`, returns[ri].g, keys, key, playS);
    // with the item (played until it works) and without it (played as long)
    const pair = (tag: string, g0: R.SalvageGame, pre: string[], pid: string) => {
      const A = branchAt(tag, g0, [...pre, pid], pid);
      const B = A ? branchAt(tag, g0, pre, null, A.tW) : null;
      return A && B ? lastingGain(A, B) : null;
    };
    for (const pid of items) {
      let ri = returns.findIndex((x) => x.bought.includes(pid));
      const bought = ri >= 0;
      // an item the hand never buys (no goal names it, the advice line never did): its planned moment is the FIRST return at
      // which it is offered, measured after everything the hand bought in that sitting (the forklift after the depollution bay)
      if (ri < 0) for (let k = 0; k < returns.length; k++) {
        const x = { ...returns[k].g, cash: 1e12 } as R.SalvageGame;
        const ck0 = buyCheck(cfg, x, pid as never);
        if (!x.salvage.works[pid] && !x.salvage.owned.includes(pid as never) && ck0.price !== null && !ck0.refusal) { ri = k; break; }
      }
      if (ri < 0) continue;
      const at = returns[ri];
      // RULING2.md 19.1: from the state at the planned moment WITH EVERY EARLIER PURCHASE OF THE SITTING owned (both branches)
      const pre = (bought ? at.bought.slice(0, Math.max(0, at.bought.indexOf(pid))) : at.bought).filter((q) => q !== pid && !at.g.salvage.works[q] && !at.g.salvage.owned.includes(q as never));
      let g = { ...at.g, cash: 1e12 } as R.SalvageGame;
      for (const q of pre) {
        const cq = buyCheck(cfg, g, q as never);
        if (cq.price !== null && !cq.refusal) g = { ...R.buy(cfg, g, q as never, cq.price, g.salvage.t), cash: 1e12 } as R.SalvageGame;
      }
      const ck = buyCheck(cfg, g, pid as never);
      if (ck.price === null || ck.refusal) continue;
      const it = contentAt(cfg.salvage, g.salvage).shop.find((i) => i.key === pid) as { deliver_s?: number } | undefined;
      // the rated gain dI and the gain over one capped absence dG (REPORT8's measure), from a jump past delivery, a self
      // start-up and a heat (cash enough for both)
      const span = (it?.deliver_s ?? 600) + 2 * (W!.selfCommission_s ?? 1200) + 3600;
      const after = R.jump(cfg, R.buy(cfg, g, pid as never, ck.price, g.salvage.t), g.salvage.t + span);
      const before = R.jump(cfg, g, g.salvage.t + span);
      const I0 = incomeAt(cfg, before);
      const G0 = gAt(cfg, before).G;
      // s2e-measure (RULING2.md 28.4 (a), amending 21.1): THE LASTING GAIN prices: what the yard keeps an hour over one capped
      // absence that begins once the item works, with and without it (the run-up played by the reference bot, buying
      // nothing, at least an hour and until the item works; the branch without plays as long). dT (the run-up and the
      // absence together: 21.1's measure where the run-up is the hour) and dP (the run-up alone) are printed beside it.
      void branch;
      const q = pair(`r${ri}`, returns[ri].g, pre, pid);
      plates[pid] = { at_h: +(g.salvage.t / 3600).toFixed(1), rung: g.salvage.ladder.rung, I: Math.round(I0), dI: Math.round(incomeAt(cfg, after) - I0), bought, price: ck.price, G: Math.round(G0), dG: Math.round(gAt(cfg, after).G - G0), ...(q ? { dE: Math.round(q.dL), tL: +q.tL.toFixed(3), tT: +q.tT.toFixed(3), T0: +q.T0.toFixed(2), dT: Math.round(q.dT), dP: Math.round(q.dP), E0: Math.round(q.E0), E0T: Math.round(q.E0T), tW_h: +q.tW_h.toFixed(2), worked: q.worked } : {}), pre };
    }
    // s2e-measure (RULING2.md 28.4 (b)): THE PLASMA AT THREE MOMENTS (the first works return before anything is bought; after
    // the second cutter; after the hook-lift, both from the first works return), its lasting gain and what the oversize
    // pieces it opens are worth an hour over those that come without it (tier-4 and tier-3 pieces cut in the run-up).
    if (returns[0] && items.includes('plasma') && !returns[0].g.salvage.owned.includes('plasma' as never)) {
      const g0 = returns[0].g;
      const moments: [string, string[]][] = [['m1 first works return', []], ['m2 after the second cutter', ['hire:cutter']], ['m3 after the hook-lift', ['hire:cutter', 'truckBridge']]];
      for (const [name, pre] of moments) {
        const q = pair('p0', g0, pre, 'plasma');
        if (q) plasma3.push({ at: name, at_h: +(g0.salvage.t / 3600).toFixed(1), tL: +q.tL.toFixed(3), dL: Math.round(q.dL), dT: Math.round(q.dT), dP: Math.round(q.dP), E0: Math.round(q.E0), tW_h: +q.tW_h.toFixed(2), lot4: Math.round(q.lot4), lot3: Math.round(q.lot3), lotA: q.lotA, lotB: q.lotB });
      }
    }
  }
  // s2e-bots: the level ladders' three steps (--book), normal hand only.
  const book: BookRow[] = [];
  if (arg('book') && which === 'normal') {
    const memoB = new Map<string, LastE | null>();
    for (const L of LADDERS) {
      const ri = L.at === 'r3s1' ? 0 : returns.findIndex((x) => x.g.salvage.ladder.rung >= 4);
      if (ri < 0 || !returns[ri]) continue;
      // the sitting's goal purchases owned in every branch (as the plates' measure)
      let g = { ...returns[ri].g, cash: 1e12 } as R.SalvageGame;
      for (const q of returns[ri].bought) {
        const cq = buyCheck(cfg, g, q as never);
        if (cq.price !== null && !cq.refusal) g = { ...R.buy(cfg, g, q as never, cq.price, g.salvage.t), cash: 1e12 } as R.SalvageGame;
      }
      g = landed(cfg, g);
      const t = ladderTarget(g, L);
      if (!t) continue;
      const states = [g];
      for (let k = 0; k < 3; k++) {
        const nx = stepUp(cfg, states[k], t, L.ladder);
        if (!nx) break;
        states.push(nx);
      }
      // s2e-measure: the steps measured as the machines are (28.4 a): an hour played, then the capped absence alone (the
      // calculated gain beside it is rated income's, the yard with nobody in it); the hour and the absence together beside.
      const E = states.map((st, k) => {
        const key = `${ri}|${k === 0 ? 'base' : `${L.ladder}${k}`}`;
        if (!memoB.has(key)) memoB.set(key, lastingE(cfg, st, opts, null, 3600));
        return memoB.get(key)!;
      });
      const gains = E.slice(1).map((e, k) => (e && E[k] ? (e.Ea - E[k]!.Ea) / ((e.ha + E[k]!.ha) / 2) : NaN)).map((v) => Math.round(v));
      const gainsT = E.slice(1).map((e, k) => (e && E[k] ? (e.Ep + e.Ea - E[k]!.Ep - E[k]!.Ea) / ((e.hp + e.ha + E[k]!.hp + E[k]!.ha) / 2) : NaN)).map((v) => Math.round(v));
      const calc = levelGainCfg(cfg, g, t);
      const q = levelCheck(cfg, g, t);
      book.push({ ladder: L.ladder, at: L.at, at_h: +(g.salvage.t / 3600).toFixed(1), rung: g.salvage.ladder.rung, L0: levelOf(g, t), gains, gainsT, E0: Math.round(E[0] ? E[0].Ea / E[0].ha : NaN), calc: Math.round(calc), I: Math.round(incomeAt(cfg, g)), price: q.refusal ? null : q.price });
    }
  }
  // G15 (--person): the person-paced rung-4 entry sitting (yard-stage2-economy.md G15).
  const person = personSnap ? personSitting(cfg, personSnap, opts, spec.seed) : null;
  // REPORT8: G and I where the run ended (rung 5's entry when it was reached), for I's gate at rung 5.
  const fin = MEASURES_G.has(which) ? { ...gAt(cfg, b.g), I: incomeAt(cfg, b.g), rung: b.g.salvage.ladder.rung, h: b.g.salvage.t / 3600 } : null;
  const sum = summary(b, spec, [], [], {}, t0);
  sum.extra = { fin, walk: walk2, s2: b.rec.s2, sittings, nohand, plates, plasma3, idle, oldStock, bench8, book, person, daily: DAILY2.has(which), rungsAt: Object.fromEntries(Object.entries(b.rec.rungs).map(([k, v]) => [k, Math.round(v)])), snapMs: Math.round(snapMs), lastGoal: R.nextGoal(cfg, b.g)?.id ?? null, materials: R.rungProgress(cfg, b.g).materials, worth: Object.fromEntries(Object.entries(b.g.salvage.ladder.worth ?? {}).map(([m, v]) => [m, Math.round(Number(v))])), rung: b.g.salvage.ladder.rung, supplied_t: +(b.g.salvage.ladder.supplied_g / 1e6).toFixed(1), cash: Math.round(b.g.cash), counts: { rackSold: b.g.salvage.counts?.rackSold ?? 0, ...Object.fromEntries(Object.entries(b.g.salvage.counts ?? {}).filter(([k]) => k.startsWith('poured:'))) }, plateCount: Object.keys(contentAt(cfg.salvage, b.g.salvage).works?.plates ?? {}).length };
  // The record's per-minute marks are the first hour's: dropped here to keep the cache small.
  sum.minutes = [];
  return sum;
}

const hours = (t: number | undefined) => (t === undefined ? '   -  ' : `${(t / 3600).toFixed(1).padStart(5)}h`);

/** S2. THE STAGE-2 BOTS (8.2): per bot and seed the rungs' hours, the sittings, what stalled; then the money's habits. */
function report2(all: Summary[], seeds: number[]): string {
  const L: string[] = [];
  const runs = all.filter((r) => r.spec.kind === 'stage2');
  L.push(`STAGE-2 BOTS (yard-stage2.md 8.2; the real content read with release.stage 2; ${seeds.length} seeds ${seeds[0]}..${seeds.at(-1)}; twice a day to rung 5, at most ${S2_SITTINGS} sittings), generated by scripts/content/yard-bot.ts --stage 2`);
  const broken = runs.flatMap((r) => [...r.broken.map((b) => `${r.spec.bot}/s${r.spec.seed} t=${Math.round(b.t)} (${hours(b.t)}): ${b.what}`), ...((r.extra.s2 as Bot['rec']['s2']).gate ?? []).map((g) => `${r.spec.bot}/s${r.spec.seed} TICK != JUMP ${g}`)]);
  L.push(`0. HARD PROMISES (8.3) on ${runs.length} runs: ${broken.length ? `${broken.length} BROKEN` : 'none broken'}`);
  for (const x of broken.slice(0, 20)) L.push(`   ${x}`);
  const refusedKeys: Record<string, number> = {};
  for (const r of runs) for (const f of r.refused) refusedKeys[f.key] = (refusedKeys[f.key] ?? 0) + 1;
  L.push(`   presses refused (and the bot's own notes, commission/commissionSide): ${JSON.stringify(refusedKeys)}`);
  for (const r of runs) for (const f of r.refused.filter((q) => q.key === 'commission')) L.push(`   ${r.spec.bot}/s${r.spec.seed} ${hours(f.t)} ${f.what.slice(0, 160)}`);
  L.push('');
  L.push("1. RUNGS (hours of the yard's clock: rung 3 / 4 / 5; aims rung 4 day 2 to 3 = 48-72 h, rung 5 day 4 to 6 = 96-144 h), where a run stopped, CPU");
  const bots = [...new Set(runs.map((r) => r.spec.bot!))];
  for (const bot of bots) {
    for (const r of runs.filter((q) => q.spec.bot === bot)) {
      const ss = r.extra.sittings as Sitting2[];
      const dry = ss.filter((x) => x.bought === 0).length;
      let streak = 0;
      let worst = 0;
      for (const x of ss) {
        streak = x.bought === 0 ? streak + 1 : 0;
        worst = Math.max(worst, streak);
      }
      L.push(`   ${String(bot).padEnd(9)} s${pad(r.spec.seed, 2)}  r3 ${hours(r.rungs[3])} r4 ${hours(r.rungs[4])} r5 ${hours(r.rungs[5])}  ${ss.length} sittings, ${dry} without a purchase (longest run ${worst}); end ${r.extra.supplied_t} t ${r.extra.materials} materials, cash §${r.extra.cash}, goal ${r.extra.lastGoal}; rung 4 at sitting ${ss.find((x) => x.rung >= 4)?.n ?? '-'} (day ${((ss.find((x) => x.rung >= 4)?.n ?? NaN) / 2).toFixed(1)}), rung 5 at sitting ${ss.find((x) => x.rung >= 5)?.n ?? '-'}  cpu ${Math.round(r.ms / 1000)} s`);
      // E8 (RULING2.md 22; s2-fix-content): the oversize lots cut a sitting (the lot loop of X1/E1 shows here), and those that came
      L.push(`               lots cut a sitting: ${ss.map((x) => x.lotsCut ?? 0).join(' ')} (came: ${ss.map((x) => x.lotsCame ?? 0).join(' ')})`);
    }
  }
  L.push('');
  L.push("2. THE SITTINGS (normal bot): hour, rung, supplied t, cash on return -> after, the away pass's cash moved (bank's share), I, purchases (§), the goal after, the away pass's CPU");
  for (const r of runs.filter((q) => q.spec.bot === 'normal')) {
    L.push(`   seed ${r.spec.seed}:`);
    for (const x of r.extra.sittings as Sitting2[]) L.push(`     ${pad(x.n, 2)} h${pad(x.h.toFixed(1), 6)} r${x.rung} ${pad(x.t, 8)} t  §${pad(x.cashBack, 9)} -> §${pad(x.cash, 9)}  away +${pad(x.awayNet, 8)} (bank ${x.awayBank})  I ${pad(x.I, 7)}  +${pad(x.bought, 2)} (§${x.spent})  lots cut ${pad(x.lotsCut ?? 0, 3)} came ${pad(x.lotsCame ?? 0, 2)}  ${String(x.goal).padEnd(15)} ${x.awayMs} ms  ${x.works}`);
  }
  L.push('');
  L.push("3. THE MONEY'S HABITS AND THE WORKS' OWN LEGS");
  for (const r of runs) {
    const s2 = r.extra.s2 as Bot['rec']['s2'];
    const ss = r.extra.sittings as Sitting2[];
    const r3 = r.rungs[3];
    const sitOf = (t: number) => ss.findIndex((x) => x.h * 3600 >= t) + 1;
    const parts: string[] = [];
    if (s2.letter !== undefined) parts.push(`letter ${hours(s2.letter)} (sitting ${sitOf(s2.letter)})`);
    if (s2.offers.length) parts.push(`offers ${s2.offers.length}: first ${s2.offers[0].plate} §${s2.offers[0].P} at ${hours(s2.offers[0].t)} (sitting ${sitOf(s2.offers[0].t)}${r3 !== undefined ? `, ${((s2.offers[0].t - r3) / 3600).toFixed(1)} h after rung 3` : ''})`);
    if (s2.loans.length) parts.push(`loans ${s2.loans.map((l) => `${l.plate} P${l.P} F${l.F} at ${hours(l.t)}`).join(', ')}; repaid ${s2.repaid.map((q) => `${q.plate} at ${hours(q.t)}`).join(', ') || 'none'}${r.rungs[4] !== undefined && s2.repaid[0] && s2.repaid[0].t < r.rungs[4] ? ' (before rung 4)' : ' (NOT before rung 4)'}`);
    if (s2.packs.length) parts.push(`packs ${s2.packs.length} (§${Math.round(s2.packs.reduce((a, p) => a + p.S, 0))}): ${s2.packs.map((p) => p.product).join(',')}`);
    if (s2.ads.length) parts.push(`ads ${s2.ads.length} (§${Math.round(s2.ads.reduce((a, p) => a + p.amount, 0))})`);
    parts.push(`racked ${s2.racked}, gate sales seen live ${s2.rackSold.length} (§${Math.round(s2.rackSold.reduce((a, p) => a + p.money, 0))}), rackSold count ${(r.extra.counts as { rackSold: number }).rackSold}; lots ${s2.lots}; crate ${s2.crates}; first pours seen live ${s2.pours.map((p) => `${p.plate} ${hours(p.t)}`).join(', ') || '-'}, heats poured ${Object.entries(r.extra.counts as Record<string, number>).filter(([k]) => k.startsWith('poured:')).map(([k, v]) => `${k.slice(7)} ${v}`).join(', ') || '-'}; started up ${s2.commissioned.map((q) => `${q.plate}${q.by === 'self' ? '(self)' : ''}`).join(',') || '-'}; put aside ${s2.skipped.map((q) => q.id).join(',') || '-'}`);
    L.push(`   ${String(r.spec.bot).padEnd(9)} s${pad(r.spec.seed, 2)}: ${parts.join('; ')}`);
  }
  const nh = runs.filter((r) => (r.extra.nohand as unknown[] | undefined)?.length);
  if (nh.length) {
    L.push('');
    L.push("4. NO HAND (8.2): the normal run's stage-2 states, the stick untouched: absences of 11.75 h until the next purchase (goal or advice) is affordable");
    for (const r of nh) L.push(`   seed ${r.spec.seed}: ${(r.extra.nohand as { h: number; next: string | null; price: number | null; absences: number | null }[]).map((x) => `h${x.h} ${x.next ?? '-'} ${x.absences === null ? (x.price === null ? 'n/a' : 'NO (4)') : x.absences}`).join('; ')}`);
  }
  L.push('');
  L.push(`run time: ${Math.round(runs.reduce((a, r) => a + r.ms, 0) / 1000)} s of CPU over ${runs.length} runs (first parts played in this call: ${runs.filter((r) => (r.extra.snapMs as number) > 0).length})`);
  return L.join('\n');
}

/**
 * REPORT8 (content2-bots, the measurement): the table of yard-stage2.md 9.2 from the stage-2 runs: rungs in their bands, I
 * against G at the named moments on both boards, planning ahead on means, the bank, ads, the Yard sale and the van, the
 * plates' payback, a purchase every sitting, cash against 2 tau, the hand's worth, E19, packs, steel-max, the lead cut, and
 * a tick against a jump. Every figure is read from the runs' summaries (so `--from` prints it again without playing).
 */
function report8(all: Summary[], tauH: (number | null)[]): string {
  const L: string[] = [];
  const runs = all.filter((r) => r.spec.kind === 'stage2');
  const by = (bot: Bot2) => runs.filter((r) => r.spec.bot === bot).sort((a, b) => a.spec.seed - b.spec.seed);
  const SS = (r: Summary) => r.extra.sittings as Sitting2[];
  const pc = (v: number) => `${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)} %`;
  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '-');
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, v) => a + v, 0) / xs.length : NaN);
  const sitAt = (r: Summary, rung: number) => SS(r).find((x) => x.rung >= rung)?.n ?? null;
  L.push(`REPORT9 TABLE (yard-stage2.md 9.2; ${runs.length} stage-2 runs; bots ${[...new Set(runs.map((r) => r.spec.bot))].join(', ')})`);
  // T1. rungs
  L.push('');
  L.push('T1. RUNG 4 AT DAY 2 TO 3 (sittings 4 to 6), RUNG 5 AT DAY 4 TO 6 (sittings 8 to 12): per bot, the sitting of each per seed and the count in band');
  for (const bot of [...new Set(runs.map((r) => r.spec.bot!))]) {
    const rs = by(bot);
    const s4 = rs.map((r) => sitAt(r, 4));
    const s5 = rs.map((r) => sitAt(r, 5));
    const in4 = s4.filter((x) => x !== null && x >= 4 && x <= 6).length;
    const in5 = s5.filter((x) => x !== null && x >= 8 && x <= 12).length;
    L.push(`   ${String(bot).padEnd(9)} n ${pad(rs.length, 2)}  rung 4 at ${s4.map((x) => x ?? '-').join(' ')}  (${in4}/${rs.length} in band, median day ${f2(med(s4.filter((x): x is number => x !== null)) / 2)})   rung 5 at ${s5.map((x) => x ?? '-').join(' ')}  (${in5}/${rs.length} in band${s5.some((x) => x === null) ? `; not reached on ${s5.filter((x) => x === null).length}, end ${rs.filter((_, i) => s5[i] === null).map((r) => `${r.extra.supplied_t} t ${r.extra.materials} mat`).join(', ')}` : ''})`);
  }
  // T2. I against G
  L.push('');
  L.push('T2. RATED INCOME I AGAINST G (14.10; G a capped absence at usual prices from the sitting\'s return, I at the same state; gate per moment: median 0.95-1.05, 13 of 15 in 0.88-1.12, none outside 0.80-1.25)');
  // s2e-bots (ruling 27.4): the band is FITTED on the normal hand's normal board (seeds 1 to 15, route A) and GATED off it:
  // the unseen seeds (101 to 105), route B, the flat board and every other habit, each printed on its own.
  const groups = new Map<string, Summary[]>();
  for (const r of runs) {
    const key = r.spec.bot === 'normal' && r.spec.seed > 100 ? 'unseen' : String(r.spec.bot);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  for (const [gname, grp] of groups) {
    const rs = grp.filter((r) => SS(r).some((x) => x.G !== undefined)).sort((a, b) => a.spec.seed - b.spec.seed);
    if (!rs.length) continue;
    L.push(`   ${gname === 'normal' ? 'FITTED: the normal hand, the normal board' : gname === 'flat' ? 'GATED: PLAYED WITH PRICES FLAT (board.a 0)' : `GATED: ${gname}`}, ${rs.length} seeds`);
    const moments: [string, (r: Summary) => { I?: number; Iback?: number; G?: number } | null][] = [
      ['r3 entry (sitting 1)', (r) => SS(r)[0] ?? null],
      ['r3 last purchase', (r) => [...SS(r)].reverse().find((x) => x.rung === 3 && x.bought > 0) ?? null],
      ['r4 entry', (r) => SS(r).find((x) => x.rung >= 4) ?? null],
      ['day 3 (sitting 6)', (r) => SS(r)[5] ?? null],
      ['r4 last purchase', (r) => [...SS(r)].reverse().find((x) => x.rung === 4 && x.bought > 0) ?? null],
      ['r5 entry (run end)', (r) => { const f = r.extra.fin as { G: number; I: number; rung: number } | null; return f && f.rung >= 5 ? f : null; }],
    ];
    for (const [name, get] of moments) {
      const q = rs.map((r) => { const x = get(r) as { I?: number; Iback?: number; G?: number } | null; return x && x.G ? (x.Iback ?? x.I ?? 0) / x.G : null; }).filter((v): v is number => v !== null);
      if (!q.length) { L.push(`     ${name.padEnd(20)} no state`); continue; }
      const m = med(q);
      const within = q.filter((v) => v >= 0.88 && v <= 1.12).length;
      const out = q.filter((v) => v < 0.8 || v > 1.25).length;
      const ok = m >= 0.95 && m <= 1.05 && within >= Math.ceil((13 / 15) * q.length) && out === 0;
      L.push(`     ${name.padEnd(20)} n ${pad(q.length, 2)}  I/G median ${f2(m)}  ${within}/${q.length} in 0.88-1.12  min ${f2(Math.min(...q))} max ${f2(Math.max(...q))}  ${out} outside: ${ok ? 'met' : 'MISSED'}   [${q.map((v) => v.toFixed(2)).join(' ')}]`);
    }
  }
  // T3. planning ahead
  const nb = by('normal');
  const cmp = (bot: Bot2, n: number, f: (x: Sitting2) => number) => {
    const xs: number[] = [];
    for (const r of by(bot)) {
      const o = nb.find((q) => q.spec.seed === r.spec.seed);
      const a = SS(r)[n - 1];
      const b0 = o && SS(o)[n - 1];
      if (a && b0 && f(b0)) xs.push(f(a) / f(b0) - 1);
    }
    return xs;
  };
  if (by('old').length) {
    L.push('');
    L.push("T3b. THE YARD HANDS' ORDER OF WORK, NEW AGAINST OLD (RULING2.md 16.7, 16.3 (ii)): crew.orderFromRung beyond the ladder (old) against the shipped rule (normal), the mean over seeds of old / new - 1; aim: new keeps at least what old kept");
    for (const [day, n] of [['day 1', 2], ['day 3', 6]] as const) {
      for (const [what, f] of [['lifetime earnings', (x: Sitting2) => x.Lend], ['supplied t', (x: Sitting2) => x.t]] as const) {
        const d = cmp('old', n, f);
        L.push(`   ${day} ${what.padEnd(18)} n ${pad(d.length, 2)}  old vs new mean ${pc(mean(d))} (worst ${pc(Math.min(...d))}, best ${pc(Math.max(...d))}): ${mean(d) <= 0.01 ? 'met' : 'MISSED'}`);
      }
    }
  }
  if (by('behind').length) {
    L.push('');
    L.push('T3. PLANNING AHEAD (14.9): ahead true (normal) against false (behind), the MEAN over seeds of (true / false - 1) ... printed as false against true; the noise floor (cutters x (1 + 1e-9)) beside; gate: within 2 % for lifetime earnings and 5 % for supplied');
    for (const [day, n] of [['day 1', 2], ['day 3', 6]] as const) {
      for (const [what, f] of [['lifetime earnings', (x: Sitting2) => x.Lend], ['supplied t', (x: Sitting2) => x.t]] as const) {
        const d = cmp('behind', n, f);
        const z = cmp('noise', n, f);
        const sd = Math.sqrt(mean(d.map((v) => (v - mean(d)) ** 2)) / Math.max(1, d.length - 1));
        const lim = what === 'supplied t' ? 0.05 : 0.02;
        L.push(`   ${day} ${what.padEnd(18)} n ${pad(d.length, 2)}  false vs true mean ${pc(mean(d))} (s.e. ${(100 * sd).toFixed(1)} %; worst ${pc(Math.min(...d))}, best ${pc(Math.max(...d))})  noise mean ${pc(mean(z))} (n ${z.length}): ${Math.abs(mean(d)) <= lim ? 'met' : 'MISSED'}`);
      }
    }
  }
  // T4. bank
  const al = by('always');
  if (al.length) {
    L.push('');
    L.push('T4. THE BANK (2.14; LEAD L1, L5): first offer within the first two sittings of rung 3 (12 of 15); every loan; the first repaid before rung 4 on every seed, with the hours PLAYED (aim about 4) and of the yard RUNNING (about 7); rung 5 at most a tenth sooner than never-financing');
    const firstOk: number[] = [];
    for (const bot of ['normal', 'always'] as Bot2[]) {
      for (const r of by(bot)) {
        const s2 = r.extra.s2 as Bot['rec']['s2'];
        const ss = SS(r);
        const sitOf = (t: number) => Math.max(1, ss.findIndex((x) => x.h * 3600 >= t) + 1 || ss.length);
        // hours played to yard second t: the first hour, then 0.25 h a sitting whose play began before t (partly)
        const played = (t: number) => { let h = 1; for (const x of ss) { const end = x.h * 3600; const st = end - 900; if (t >= end) h += 0.25; else if (t > st) h += (t - st) / 3600; } return h; };
        const o = s2.offers[0];
        if (bot === 'always' && o) firstOk.push(sitOf(o.t) <= 2 ? 1 : 0);
        if (bot === 'always' && !o) firstOk.push(0);
        const loans = s2.loans.map((l) => { const rp = s2.repaid.find((q) => q.plate === l.plate && q.t >= l.t); return `${l.plate} §${l.P} (F ${l.F}) s${sitOf(l.t)}${rp ? ` repaid s${sitOf(rp.t)}: ${(played(rp.t) - played(l.t)).toFixed(1)} h played, ${((rp.t - l.t) / 3600).toFixed(1)} h running${r.rungs[4] !== undefined ? (rp.t < r.rungs[4] ? ', before rung 4' : ', AFTER rung 4') : ''}` : ' NOT repaid'}`; });
        const share = Math.max(0, ...ss.map((x, i) => { const dl = x.Lback - (i ? ss[i - 1].Lend : x.Lback); return x.awayBank > 0 ? x.awayBank / (dl + x.awayBank) : 0; }));
        L.push(`   ${String(bot).padEnd(7)} s${pad(r.spec.seed, 3)}: letter s${s2.letter !== undefined ? sitOf(s2.letter) : '-'}; offers ${s2.offers.length}${o ? ` (first ${o.plate} §${o.P} at sitting ${sitOf(o.t)})` : ''}; ${loans.length ? `loans ${loans.join('; ')}` : 'no loan'}; bank's largest share of an absence's earnings ${(100 * share).toFixed(1)} %; rung 5 at ${r.rungs[5] !== undefined ? `${(r.rungs[5] / 3600).toFixed(1)} h` : '-'}`);
      }
    }
    L.push(`   first offer within two sittings of rung 3 (always bot): ${firstOk.reduce((a, v) => a + v, 0)}/${firstOk.length} (aim 12 of 15)`);
    const sooner = al.map((r) => { const o = nb.find((q) => q.spec.seed === r.spec.seed); return o?.rungs[5] && r.rungs[5] ? 1 - r.rungs[5] / o.rungs[5] : NaN; }).filter(Number.isFinite);
    if (sooner.length) L.push(`   rung 5 sooner with every loan than never: median ${pc(med(sooner))}, max ${pc(Math.max(...sooner))} (aim at most +10 %)`);
    const rep4 = al.filter((r) => { const s2 = r.extra.s2 as Bot['rec']['s2']; return s2.loans.length && (!s2.repaid[0] || r.rungs[4] === undefined || s2.repaid[0].t >= r.rungs[4]); }).length;
    L.push(`   first loan NOT repaid before rung 4: ${rep4} of ${al.filter((r) => (r.extra.s2 as Bot['rec']['s2']).loans.length).length} runs with a loan (gate: none)`);
  }
  // T5. ads, Yard sale and van shares of a day; E19
  L.push('');
  L.push("T5. SHARES OF A DAY'S EARNINGS (lifetime earnings over two sittings): ad rewards (aim at most 4 %, ads bot); the Yard sale and the van (2 to 5 %, never over 8 %, normal bot): per day 1..7, median over seeds [max]");
  const perDay = (r: Summary, part: (x: Sitting2, s2: Bot['rec']['s2'], t0: number, t1: number) => number) => {
    const ss = SS(r);
    const s2 = r.extra.s2 as Bot['rec']['s2'];
    const out: number[] = [];
    for (let d = 0; 2 * d + 1 < ss.length; d++) {
      const a = d ? ss[2 * d - 1] : null;
      const b2 = ss[2 * d + 1];
      const L0 = a ? a.Lend : 0;
      const t0 = a ? a.h * 3600 : 0;
      let num = 0;
      for (const x of [ss[2 * d], b2]) num += part(x, s2, t0, b2.h * 3600);
      out.push(num / Math.max(1, b2.Lend - L0));
    }
    return out;
  };
  const dayRow = (name: string, rs: Summary[], part: Parameters<typeof perDay>[1], hi: number) => {
    if (!rs.length) return;
    const rows = rs.map((r) => perDay(r, part));
    const days = Math.max(...rows.map((x) => x.length));
    const cells: string[] = [];
    let over = 0;
    for (let d = 0; d < days; d++) {
      const v = rows.map((x) => x[d]).filter((y) => y !== undefined);
      over += v.filter((y) => y > hi).length;
      cells.push(`d${d + 1} ${(100 * med(v)).toFixed(1)} [${(100 * Math.max(...v)).toFixed(1)}]`);
    }
    L.push(`   ${name.padEnd(22)} ${cells.join('  ')}   (${over} seed-days over ${(100 * hi).toFixed(0)} %)`);
  };
  const live = (s2: Bot['rec']['s2'], key: 'ads' | 'rackSold', x: Sitting2) => (s2[key] as { t: number; amount?: number; money?: number }[]).filter((q) => q.t > x.h * 3600 - 900 && q.t <= x.h * 3600 + 1).reduce((a, q) => a + (q.amount ?? q.money ?? 0), 0);
  dayRow('ads (ads bot)', by('ads'), (x, s2) => live(s2, 'ads', x), 0.04);
  dayRow('Yard sale + van (normal)', nb, (x, s2) => x.rack + x.van + live(s2, 'rackSold', x), 0.08);
  dayRow('  of it the van', nb, (x) => x.van, 0.08);
  dayRow('Yard sale + van (racker)', by('racker'), (x, s2) => x.rack + x.van + live(s2, 'rackSold', x), 0.08);
  // E19
  const e19 = nb.flatMap((r) => SS(r).map((x, i) => ({ rung: x.rung, awayH: (x.Lback - (i ? SS(r)[i - 1].Lend : x.Lback)) / Math.max(1e-9, x.ranH), playH: (x.Lend - x.Lback) / 0.25 })).filter((q, i) => i > 0));
  for (const rung of [3, 4]) {
    const q = e19.filter((x) => x.rung === rung && x.playH > 0).map((x) => x.awayH / x.playH);
    if (q.length) L.push(`   E19 rung ${rung}: an hour away / an hour played (earnings), median ${f2(med(q))} over ${q.length} sittings, min ${f2(Math.min(...q))} max ${f2(Math.max(...q))} (aim 0.3 to 0.8)`);
  }
  // T6. purchases and cash
  L.push('');
  L.push('T6. A USEFUL PURCHASE EVERY SITTING; CASH AT A SITTING\'S END AT MOST 2 TAU_r OF INCOME (tau_h by rung; income = G at that return)');
  for (const bot of [...new Set(runs.map((r) => r.spec.bot!))]) {
    const rs = by(bot);
    const dry = rs.map((r) => SS(r).filter((x) => x.bought === 0).length);
    const tot = rs.map((r) => SS(r).length);
    L.push(`   ${String(bot).padEnd(9)} sittings without a purchase: ${dry.reduce((a, v) => a + v, 0)} of ${tot.reduce((a, v) => a + v, 0)} (per seed ${dry.join(' ')})`);
  }
  for (const r of [...nb, ...by('flat')]) {
    const bad = SS(r).filter((x) => x.G && tauH[x.rung - 1] && x.cash > 2 * (tauH[x.rung - 1] as number) * x.G).map((x) => `s${x.n} ${(x.cash / ((tauH[x.rung - 1] as number) * x.G!)).toFixed(1)} tau`);
    if (bad.length) L.push(`   ${r.spec.bot}/s${r.spec.seed}: cash over 2 tau at ${bad.join(', ')}`);
  }
  // T7. the hand's worth; packs; steel-max; the lead cut; no hand
  L.push('');
  L.push("T7. THE HAND'S WORTH (normal against the card manager, lifetime earnings at sittings 4 and 8: aim at least 1.2); PACKS (rung times against off, the buyer's lead); STEEL-MAX; THE LEAD CUT");
  for (const n of [4, 8]) {
    const q = by('manager').map((r) => { const o = nb.find((x) => x.spec.seed === r.spec.seed); const a = o && SS(o)[n - 1]; const m = SS(r)[n - 1]; return a && m ? a.Lend / m.Lend : NaN; }).filter(Number.isFinite);
    if (q.length) L.push(`   normal / manager at sitting ${n}: median ${f2(med(q))}, min ${f2(Math.min(...q))} (${q.length} seeds)`);
  }
  for (const r of by('packs')) {
    const o = nb.find((x) => x.spec.seed === r.spec.seed);
    const s2 = r.extra.s2 as Bot['rec']['s2'];
    const lead = (k: number) => (o?.rungs[k] !== undefined && r.rungs[k] !== undefined ? `${((o!.rungs[k] - r.rungs[k]) / 3600).toFixed(1)} h of the yard's clock (${(sitAt(o!, k)! - sitAt(r, k)!) / 2} days)` : '-');
    L.push(`   packs s${r.spec.seed}: ${s2.packs.length} packs §${Math.round(s2.packs.reduce((a, p) => a + p.S, 0))}; lead at rung 5 ${lead(5)}`);
  }
  for (const bot of ['steelMax', 'leadCut', 'slow', 'brisk'] as Bot2[]) for (const r of by(bot)) L.push(`   ${bot} s${r.spec.seed}: ends rung ${r.extra.rung} at ${r.extra.supplied_t} t, ${r.extra.materials} materials, goal ${r.extra.lastGoal}, ${SS(r).length} sittings`);
  // T8. plates, vehicles and tools (RULING2.md 21.1)
  const pl = runs.filter((r) => Object.keys((r.extra.plates as Record<string, unknown>) ?? {}).length);
  if (pl.length) {
    L.push('');
    L.push("T8. THE PAYBACK OF PLATES, VEHICLES AND TOOLS (2.6.4, 2.9; RULING2.md 21.1; aim 0.8 to 1.5 tau_r) AND THEIR MEASURED GAIN BESIDE THE RATED GAIN (for the calibration of rated income, 23.4): at each item's planned moment (the return of the sitting the normal hand bought it, the sitting's earlier purchases owned in both branches) dE = what the yard earns more an hour of yard time over AN HOUR OF PLAY (the reference bot, buying nothing) and one capped absence; dGaway = the gain over the capped absence alone (REPORT8's measure); dI = the rated gain (I after a jump past delivery, start-up and a heat, less without); payback = price / dE in tau of its rung");
    const ids = [...new Set(pl.flatMap((r) => Object.keys(r.extra.plates as Record<string, unknown>)))];
    for (const id of ids) {
      const xs = pl.map((r) => (r.extra.plates as Record<string, PlateRow>)[id]).filter(Boolean);
      const dE = xs.map((x) => x.dE ?? NaN);
      const m = mean(dE.filter(Number.isFinite));
      const se = Math.sqrt(mean(dE.filter(Number.isFinite).map((v) => (v - m) ** 2)) / Math.max(1, dE.filter(Number.isFinite).length - 1));
      const tau = (tauH[Math.max(2, xs[0].rung - 1)] as number) || 1;
      const pay = xs.map((x) => (x.dE && x.dE > 0 && x.price ? x.price / x.dE / tau : Infinity));
      L.push(`   ${id.padEnd(12)} n ${pad(xs.length, 2)}  price §${xs[0]?.price}  at h ${f2(med(xs.map((x) => x.at_h)))} r${xs[0].rung} (bought by the hand on ${xs.filter((x) => x.bought).length})  dE mean §${Math.round(m)} (s.e. ${Math.round(se)}) median §${Math.round(med(dE.filter(Number.isFinite)))} of E0 §${Math.round(med(xs.map((x) => x.E0 ?? NaN).filter(Number.isFinite)))}  dGaway mean §${Math.round(mean(xs.map((x) => x.dG ?? 0)))}  dI median §${Math.round(med(xs.map((x) => x.dI)))}  rated/measured ${f2(med(xs.map((x) => x.dI)) / m)}  payback median ${f2(med(pay))} tau (${pay.filter((v) => v >= 0.8 && v <= 1.5).length} of ${pay.length} in 0.8-1.5)`);
      L.push(`                per seed dE ${dE.map((v) => (Number.isFinite(v) ? Math.round(v) : '-')).join(' ')} | dI ${xs.map((x) => x.dI).join(' ')}`);
    }
  }
  // T10. the crane pair and the bridge-partner play (RULING2.md 22 E4, E5; 24 R1 (a))
  const pair = (bot: Bot2, label: string) => {
    const rs = by(bot);
    if (!rs.length) return;
    for (const n of [2, 6, 12]) {
      const d = cmp(bot, n, (x) => x.Lend);
      if (d.length) L.push(`   ${label} sitting ${pad(n, 2)} (day ${n / 2}): lifetime earnings ${bot} against normal, mean ${pc(mean(d))} (worst ${pc(Math.min(...d))}, best ${pc(Math.max(...d))}; n ${d.length})`);
    }
    const s5 = rs.map((r) => sitAt(r, 5));
    L.push(`   ${label} rung 5 at sitting ${s5.map((x) => x ?? '-').join(' ')} (${s5.filter((x) => x !== null && x >= 8 && x <= 12).length}/${rs.length} in band 8 to 12)${s5.some((x) => x === null) ? `; not reached: ${rs.filter((_, i) => s5[i] === null).map((r) => `s${r.spec.seed} ${r.extra.supplied_t} t ${r.extra.materials} mat`).join(', ')}` : ''}`);
  };
  if (by('noCrane').length || by('bridgeLevels').length) {
    L.push('');
    L.push("T10. THE CRANE PAIR (never buys the magnet crane, against the normal hand; gate 24 R1 (a): the crane loses at most 2 % at day 3 and the pair's mean is above zero for the crane) AND THE BRIDGE-PARTNER PLAY (E4: the garage and the plumber levelled whenever the cash covers it; gate: rung 5 in its band)");
    pair('noCrane', 'noCrane     ');
    const nc = cmp('noCrane', 6, (x) => x.Lend);
    if (nc.length) L.push(`   the crane at day 3 (normal against noCrane, mean of normal / noCrane - 1): ${pc(mean(nc.map((v) => 1 / (1 + v) - 1)))}: ${mean(nc.map((v) => 1 / (1 + v) - 1)) > 0 && Math.min(...nc.map((v) => 1 / (1 + v) - 1)) >= -0.02 ? 'met' : 'MISSED'}`);
    pair('bridgeLevels', 'bridgeLevels');
    for (const r of by('bridgeLevels')) {
      const ss = SS(r);
      const k20 = ss.find((x) => (x.bridge?.[0] ?? 0) >= 20 && (x.bridge?.[1] ?? 0) >= 20)?.n;
      L.push(`     bridgeLevels s${pad(r.spec.seed, 3)}: levels (garage/plumbing) by sitting ${ss.map((x) => `${x.bridge?.[0] ?? 0}/${x.bridge?.[1] ?? 0}`).join(' ')}; both at 20 by sitting ${k20 ?? '-'}; materials at the end ${r.extra.materials}, worth ${JSON.stringify(r.extra.worth)}`);
    }
  }
  // T11. packs against headroom (ruling 23.5)
  const pk = nb.flatMap((r) => SS(r).flatMap((x) => [{ r, x, at: 'return', U: x.Uback, cash: x.cashBack, I: x.Iback }, { r, x, at: 'end', U: x.Uend, cash: x.cash, I: x.I }])).filter((q) => q.x.rung >= 4 && q.U !== undefined && q.I !== undefined);
  if (pk.length) {
    L.push('');
    L.push('T11. PACKS AGAINST HEADROOM (RULING2.md 23.5, M5): at the ordinary moments of rungs 4 and 5 on the normal hand (every return and every sitting\'s end), does a pack of H hours fit: cash + H x I <= U (shop.ts quoteCheck), with the cash in hand and with an empty purse; U and cash in hours of I');
    const Hs = ((cfgPacks ?? []) as { H: number }[]).map((p) => p.H);
    for (const rung of [4, 5]) {
      const qs = pk.filter((q) => q.x.rung === rung);
      if (!qs.length) continue;
      L.push(`   rung ${rung}: ${qs.length} moments on ${new Set(qs.map((q) => q.r.spec.seed)).size} seeds; U median ${f2(med(qs.map((q) => q.U! / Math.max(1, q.I!))))} h of I (min ${f2(Math.min(...qs.map((q) => q.U! / Math.max(1, q.I!))))}, max ${f2(Math.max(...qs.map((q) => q.U! / Math.max(1, q.I!))))}), cash median ${f2(med(qs.map((q) => q.cash / Math.max(1, q.I!))))} h of I`);
      for (const H of Hs) {
        const own = qs.filter((q) => q.cash + H * q.I! <= q.U! + 1e-9);
        const empty = qs.filter((q) => H * q.I! <= q.U! + 1e-9);
        const where = (zs: typeof qs) => [...new Set(zs.map((q) => `s${q.x.n}${q.at === 'return' ? 'r' : 'e'}`))].slice(0, 8).join(' ');
        L.push(`     ${pad(H, 2)} h pack: fits with own cash at ${own.length}/${qs.length} (${where(own) || 'never'}); with an empty purse at ${empty.length}/${qs.length} (${where(empty) || 'never'})`);
      }
    }
  }
  // T12. levels and hires: measured gain beside the rated gain (the walk's states; for the calibration, 23.4)
  const wk = nb.filter((r) => ((r.extra.walk as unknown[]) ?? []).length);
  if (wk.length) {
    L.push('');
    L.push("T12. EVERY STEP OF THE WALK: MEASURED GAIN (dG: one capped absence at usual prices, § an hour) BESIDE THE RATED GAIN (dI, I after less I before on the same state), medians over the seeds, per moment (the calibration's table; plates' and vehicles' played gains are T8)");
    type WR = { at: string; G: number; I?: number; rows: { step: string; d: number; dI?: number; price?: number }[] };
    for (const at of ['r3s1', 'r4entry', 'day3']) {
      const ws = wk.map((r) => ((r.extra.walk as WR[]) ?? []).find((w) => w.at === at)).filter((w): w is WR => !!w);
      if (!ws.length) continue;
      L.push(`   ${at} (${ws.length} states; G median §${Math.round(med(ws.map((w) => w.G)))}, I median §${Math.round(med(ws.map((w) => w.I ?? NaN).filter(Number.isFinite)))})`);
      const steps = [...new Set(ws.flatMap((w) => w.rows.map((q) => q.step)))].sort();
      for (const st of steps) {
        const q = ws.flatMap((w) => w.rows.filter((x) => x.step === st).map((x) => ({ dG: x.d * w.G, dI: x.dI ?? NaN, price: x.price ?? NaN })));
        const mG = med(q.map((x) => x.dG));
        const mI = med(q.map((x) => x.dI).filter(Number.isFinite));
        L.push(`     ${st.padEnd(26)} n ${pad(q.length, 2)}  price §${Math.round(med(q.map((x) => x.price)))}  dG §${pad(Math.round(mG), 7)}  dI §${pad(Math.round(mI), 7)}  rated/measured ${mG > 0 ? f2(mI / mG) : '-'}`);
      }
    }
  }
  // T9. tick against jump
  const tj = runs.filter((r) => r.spec.gate);
  L.push('');
  L.push(`T9. A TICK AGAINST A JUMP (a minute of 0.1 s ticks against one jump, at sittings 1 to 5, 8 and 12 of the normal bot): ${tj.length} runs, ${tj.reduce((a, r) => a + SS(r).filter((x) => x.n <= 5 || [8, 12].includes(x.n)).length, 0)} checks, ${tj.reduce((a, r) => a + ((r.extra.s2 as Bot['rec']['s2']).gate ?? []).length, 0)} differ`);
  return L.join('\n');
}

/**
 * s2e-bots: THE NEW STAGE'S TABLE (yard-stage2-economy.md "THE GATES"; ruling 27.8): the first look per sitting, the
 * measures the design added (the level ladders' three steps, the rung's bill against the purse, felt cash, E19 by rung,
 * sittings without a purchase that pays back within 1.25 tau_r, the last goal purchase to rung 5, the person-paced rung-4
 * sitting) and the gates G1 to G16 one by one, each with REPORT9's number beside it and met or MISSED. A gate measured on
 * fewer seeds than it names says so ("on n seeds"); a gate this tool does not measure says who does.
 */
function reportS2e(all: Summary[], tauH: (number | null)[], platesLines: string[] | null): string {
  const L: string[] = [];
  const runs = all.filter((r) => r.spec.kind === 'stage2').sort((a, b) => String(a.spec.bot).localeCompare(String(b.spec.bot)) || a.spec.seed - b.spec.seed);
  const SS = (r: Summary) => r.extra.sittings as Sitting2[];
  const by = (bot: string) => runs.filter((r) => r.spec.bot === bot);
  const tauOf = (rung: number) => (tauH[rung - 1] as number) || 0;
  const pc = (v: number) => (Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)} %` : '-');
  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '-');
  const k$ = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '-' : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}k`);
  const sitAt = (r: Summary, rung: number) => SS(r).find((x) => x.rung >= rung)?.n ?? null;
  const useful = (x: Sitting2) => (x.keys ?? []).some((q) => q.via === 'goal' || q.via === 'loan' || (q.pb !== undefined && q.pb <= 1.25 * tauOf(x.rung) + 1e-9));
  L.push(`S2E. THE NEW STAGE (yard-stage2-economy.md; RULING2.md 27, 28): ${runs.length} runs, seeds ${[...new Set(runs.map((r) => r.spec.seed))].join(',')}`);
  // F. the first look, sitting by sitting
  L.push('');
  L.push('F. THE FIRST LOOK, SITTING BY SITTING: n (h, rung, supplied t) | purse on return -> at the end | G (a capped absence at usual prices) and I at the return, I/G | U (headroom) and the sold machines\' bill at the return | the bank: offers, loans signed, left at the end | oversize pieces cut / came (waiting at the return) | packs that would fit with own cash (H hours) at the return / end | bought (k price [via, payback h]) | the goal after');
  for (const r of runs) {
    L.push(`   ${r.spec.bot} seed ${r.spec.seed}${r.extra.daily ? ' (ONCE A DAY: a sitting is a day)' : ''}: rung 3 at ${hours((r.extra.rungsAt as Record<string, number>)?.[3])}, rung 4 at sitting ${sitAt(r, 4) ?? '-'}, rung 5 at sitting ${sitAt(r, 5) ?? '-'}`);
    for (const x of SS(r)) {
      const bought = (x.keys ?? []).map((q) => `${q.k} ${k$(q.p)}${q.via ? ` [${q.via}${q.pb !== undefined ? ` ${q.pb.toFixed(1)}h` : ''}]` : ''}`).join(', ') || 'nothing';
      L.push(`     ${pad(x.n, 2)} h${pad(x.h.toFixed(1), 5)} r${x.rung} ${pad(Math.round(x.t), 5)} t | §${k$(x.cashBack)} -> §${k$(x.cash)} | G ${k$(x.G)} I ${k$(x.Iback)} ${x.G ? f2((x.Iback ?? 0) / x.G) : '-'} | U ${k$(x.Uback)} bill ${k$(x.billM)} | bank offers ${x.offers ?? 0}${x.loans?.length ? ` SIGNED ${x.loans.join('; ')}` : ''}${x.loanLeft ? ` left ${k$(x.loanLeft)}` : ''} | lots ${x.lotsCut}/${x.lotsCame} (${x.lotsWait ?? 0} waiting, tier ${x.tier ?? '-'}) | packs ${(x.fitBack ?? []).join('+') || '-'} / ${(x.fitEnd ?? []).join('+') || '-'} | ${bought} | -> ${x.goal}${x.adv ? ` | advice at the end: ${x.adv}; levels sold ${x.lv?.sold ?? '-'} (floor-bound ${x.lv?.floor ?? '-'}, best ${x.lv?.best ?? '-'}), not the limit ${x.lv?.notLimit ?? '-'}` : ''}`);
    }
  }
  // the measures
  L.push('');
  L.push('M. THE MEASURES');
  if (platesLines?.length) {
    L.push('   M1. every SOLD machine, vehicle and tool at its planned moment in the new goal order (ruling 21.1\'s measure: an hour of play and a capped absence, with and without; plates.json): dE, its standard error, E0 (the yard\'s income there), the entry rule (at least 2 % of E0, no seed under -1 %), the price tau_r x dE against the content\'s, and ruling 27.6\'s second-round test');
    L.push(...platesLines);
  }
  const bt = bookTable(all);
  if (Object.keys(bt).length) {
    L.push('   M2. THE LEVEL LADDERS\' THREE STEPS (the gain book g(L) = g1 x d^(L-1); ruling 27.4): the measured gain of each step (§ an hour, mean of seeds), g1, d, and the calculated gain (rate.ts levelGain) beside g1 (G2 R: within 0.7 to 1.4)');
    for (const [k, v] of Object.entries(bt)) L.push(`     ${k.padEnd(17)} at ${v.at.padEnd(8)} n ${v.seeds}  steps §${v.gains.join(' / §')}  g1 §${v.g1}  d ${v.d}  calculated §${v.calc}  calc/measured first step ${f2(v.ratio)}  per seed ${v.perSeed.map((q) => q.join('/')).join(' | ')}  s.e. §${v.se}  L0 ${v.L0}  over the hour and the absence together §${v.gainsT.join(' / §')}${v.fails ? '  FAILS ITS CHECK: written to levels.book by --book write' : '  passes its check'}`);
  }
  L.push('   M3. THE RUNG\'S BILL AGAINST THE PURSE at each rung\'s entry return (yard-stage2-economy.md section 0; ruling 27.8; it refuses nothing): the purse on return, U (every sold step with payback within 1.5 tau_r: the bill of section 0) and the sold machines\' bill alone');
  for (const r of runs) {
    const cells = [3, 4, 5].map((rung) => { const x = SS(r).find((q) => q.rung >= rung); return x ? `r${rung} (s${x.n}): purse §${k$(x.cashBack)} U §${k$(x.Uback)} (${x.Uback ? f2(x.Uback / Math.max(1, x.cashBack)) : '-'} x) machines §${k$(x.billM)}` : `r${rung}: -`; });
    L.push(`     ${String(r.spec.bot).padEnd(11)} s${pad(r.spec.seed, 3)}  ${cells.join('  |  ')}`);
  }
  const al = runs.filter((r) => r.spec.bot === 'always' || r.spec.bot === 'packsAlways');
  if (al.length) {
    L.push('   M4. FELT CASH (2.14 aims): the sittings at which the always-finance bot\'s purse after buying is LOWER than the never-finance (normal) bot\'s, per seed');
    for (const r of al) {
      const o = by(r.spec.bot === 'packsAlways' ? 'packs' : 'normal').find((q) => q.spec.seed === r.spec.seed);
      if (!o) { L.push(`     ${r.spec.bot} s${r.spec.seed}: no ${r.spec.bot === 'packsAlways' ? 'packs' : 'normal'} run on this seed`); continue; }
      const n = Math.min(SS(r).length, SS(o).length);
      const lower = Array.from({ length: n }, (_, i) => i).filter((i) => SS(r)[i].cash < SS(o)[i].cash).map((i) => i + 1);
      L.push(`     ${r.spec.bot} s${r.spec.seed}: ${lower.length} of ${n} sittings lower (${lower.map((i) => `s${i} §${k$(SS(r)[i - 1].cash)} vs §${k$(SS(o)[i - 1].cash)}`).join(', ') || 'none'})`);
    }
  }
  L.push('   M5. E19 BY RUNG (an hour away / an hour played, lifetime earnings; aim 0.3 to 0.8), M6. SITTINGS WITHOUT A PURCHASE THAT PAYS BACK WITHIN 1.25 tau_r before rung 5 (a goal purchase counts: a goal machine is priced at tau_r x its measured gain) and the LAST GOAL PURCHASE TO RUNG 5 in sittings, M7. LOTS CUT A SITTING');
  for (const r of runs) {
    const ss = SS(r);
    const daily = !!r.extra.daily;
    const e19 = [3, 4, 5].map((rung) => { const q = ss.map((x, i) => ({ rung: x.rung, a: (x.Lback - (i ? ss[i - 1].Lend : x.Lback)) / Math.max(1e-9, x.ranH), p: (x.Lend - x.Lback) / 0.25 })).filter((q, i) => i > 0 && q.rung === rung && q.p > 0).map((q) => q.a / q.p); return q.length ? `r${rung} ${f2(med(q))} (${q.length})` : `r${rung} -`; });
    const s5 = sitAt(r, 5);
    const before = ss.filter((x) => s5 === null || x.n < s5);
    const dry = before.filter((x) => !useful(x)).map((x) => x.n);
    // the last goal purchase of the STAGE (a sold machine, vehicle or tool; not a first-yard item a later goal names)
    const lastGoal = Math.max(0, ...ss.filter((x) => (x.keys ?? []).some((q) => (q.via === 'goal' || q.via === 'loan') && soldKeys.has(q.k))).map((x) => x.n));
    L.push(`     ${String(r.spec.bot).padEnd(11)} s${pad(r.spec.seed, 3)}  E19 ${e19.join(' ')}  |  without a useful purchase: ${dry.length} of ${before.length} (${dry.map((n) => `s${n}`).join(' ') || '-'})  |  last goal purchase s${lastGoal || '-'}, rung 5 s${s5 ?? '-'}${s5 && lastGoal ? ` (${s5 - lastGoal} ${daily ? 'days' : 'sittings'} apart)` : ''}  |  lots cut ${ss.map((x) => x.lotsCut).join(' ')} (came ${ss.map((x) => x.lotsCame).join(' ')})${ss.some((x) => x.lotMassBad?.length) ? `  MASS OUTSIDE ITS RANGE: ${ss.flatMap((x) => x.lotMassBad ?? []).join(', ')}` : ''}`);
  }
  const persons = runs.map((r) => r.extra.person as PersonRow | null).filter((q): q is PersonRow => !!q);
  if (persons.length) {
    L.push('   M8. A PERSON\'S RUNG-4 ENTRY SITTING (G15; the slow hand\'s pace from the normal hand\'s first rung-4 return): the second each step was done (within 900 s fits), the centred cards and what opened each');
    for (const q of persons) L.push(`     s${q.seed} h${q.t0_h} purse §${k$(q.cash)}: ${Object.entries(q.done).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k} ${v}s`).join(', ') || 'nothing'}; pieces waiting ${q.lotsWaiting}, cut ${q.lotsCut}; cards ${q.cards.map((c) => `${c.card}@${c.t}s (${c.by})`).join(', ')}; two cards without an action between: ${q.twoCards}; FITS 15 MIN: ${q.fits ? 'yes' : `NO (missing or late: ${q.missing.join(', ')})`}`);
  }
  // s2e-measure: the lead's three things beyond the gates
  type Idle = Record<string, Record<string, { n: number; idle: number; why: Record<string, number> }>>;
  const idleRuns = runs.filter((r) => r.extra.idle && Object.keys(r.extra.idle as Idle).length);
  for (const bot of [...new Set(idleRuns.map((r) => String(r.spec.bot)))]) {
    const rs = idleRuns.filter((r) => r.spec.bot === bot);
    L.push(`   M9. EACH CREW ROLE'S IDLE SHARE BY RUNG (RULING2.md 28.5 e; ${bot}, ${rs.length} seeds): away (a sample every 5 minutes of a probe absence from each return, over its running hours) and played (a sample a minute), pooled over seeds; the rules' reason for the idle samples (crew.ts idleWhyOf)`);
    const keys = [...new Set(rs.flatMap((r) => Object.keys(r.extra.idle as Idle)))].sort();
    for (const k of keys) {
      const roles: Record<string, { n: number; idle: number; why: Record<string, number> }> = {};
      for (const r of rs) for (const [role, v] of Object.entries((r.extra.idle as Idle)[k] ?? {})) { const o = (roles[role] ??= { n: 0, idle: 0, why: {} }); o.n += v.n; o.idle += v.idle; for (const [w, c] of Object.entries(v.why)) o.why[w] = (o.why[w] ?? 0) + c; }
      L.push(`     ${k.padEnd(9)} ${Object.entries(roles).sort().map(([role, v]) => `${role} ${(100 * v.idle / Math.max(1, v.n)).toFixed(0)} % idle of ${v.n} (${Object.entries(v.why).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => `${w} ${(100 * c / Math.max(1, v.idle)).toFixed(0)} %`).join(', ') || '-'})`).join('  |  ')}`);
    }
    const old = rs.map((r) => ({ s: r.spec.seed, o: (r.extra.oldStock as { n: number; rung: number; things: number; byZone: Record<string, number>; objs: Record<string, number> }[]) ?? [] }));
    L.push(`     the old stock in the first yard's zones at each return (things): ${old.map((q) => `s${q.s} ${q.o.map((x) => x.things).join(' ')}`).join('; ')}`);
    const first = old[0]?.o[0];
    const last = old[0]?.o.at(-1);
    if (first) L.push(`     seed ${old[0].s} at its first works return: ${JSON.stringify(first.byZone)} ${JSON.stringify(first.objs)}; at its last return (rung ${last?.rung}): ${JSON.stringify(last?.byZone)} ${JSON.stringify(last?.objs)}`);
  }
  // M10: rung 3's purchases by sitting (the lead's second thing: where the plasma and the hook-lift fall)
  const r3 = runs.filter((r) => r.spec.bot === 'normal' || r.spec.bot === 'routeB' || r.spec.bot === 'always' || r.spec.bot === 'manager');
  if (r3.length) {
    L.push('   M10. RUNG 3\'S PURCHASES BY SITTING (machines, vehicles and tools; how many levels and hires beside them), and the sittings of rung 4 and rung 5');
    for (const r of r3) {
      const cells = SS(r).filter((x) => x.rung <= 3 || SS(r).find((q) => q.rung >= 4)?.n === x.n).map((x) => { const ks = x.keys ?? []; const big = ks.filter((q) => soldKeys.has(q.k)).map((q) => `${q.k}${q.via ? `[${q.via}]` : ''}`); const lv = ks.filter((q) => q.k.startsWith('lev:') || q.k.includes('level') || !soldKeys.has(q.k)).length; return `s${x.n} ${big.join('+') || '-'}${lv ? ` +${lv}` : ''}`; });
      L.push(`     ${String(r.spec.bot).padEnd(8)} s${pad(r.spec.seed, 3)}: ${cells.join(' | ')}  -> rung 4 s${sitAt(r, 4) ?? '-'}, rung 5 s${sitAt(r, 5) ?? '-'}`);
    }
  }
  // M11: the drop-off's pair (28.3 d): freeDrop (the old rule) beside the normal hand on the same seeds
  const fd = by('freeDrop');
  if (fd.length) {
    L.push('   M11. THE DROP-OFF\'S PAIR (RULING2.md 28.3 d): the old rule (freeDrop: works.dropoffPeriod_s absent) against the rule as built (normal), same seeds');
    for (const r of fd) {
      const o = by('normal').find((q) => q.spec.seed === r.spec.seed);
      if (!o) { L.push(`     s${r.spec.seed}: no normal run on this seed`); continue; }
      const arr = (x: Summary) => SS(x).map((q, i) => { const p = i ? SS(x)[i - 1] : null; const dh = q.h - (p ? p.h : q.h - 12); return p && q.drop !== undefined && p.drop !== undefined ? ((q.drop - p.drop) / Math.max(1e-9, dh)).toFixed(0) : '-'; }).join(' ');
      L.push(`     s${r.spec.seed}: lifetime at sitting 6 §${k$(SS(r)[5]?.Lend)} (old) vs §${k$(SS(o)[5]?.Lend)} (built); end tonnes ${r.extra.supplied_t} vs ${o.extra.supplied_t}; rung 4 at s${sitAt(r, 4) ?? '-'} vs s${sitAt(o, 4) ?? '-'}, rung 5 at s${sitAt(r, 5) ?? '-'} vs s${sitAt(o, 5) ?? '-'}`);
      L.push(`         drop-off arrivals an hour by sitting: old ${arr(r)} | built ${arr(o)}`);
      type W = { at: string; rows: { step: string; d: number }[] };
      for (const at of ['r3s1', 'r4entry', 'day3']) {
        const wr = ((r.extra.walk as W[]) ?? []).find((w) => w.at === at);
        const wo = ((o.extra.walk as W[]) ?? []).find((w) => w.at === at);
        const cell = (w: W | undefined) => (w ? ['level hand', 'level cutter', 'level driver'].map((st) => { const q = w.rows.find((z) => z.step === st); return `${st.slice(6)} ${q ? pc(q.d) : '-'}`; }).join(', ') : '-');
        const failing = (w: W | undefined) => (w ? w.rows.filter((q) => q.d < -0.01).map((q) => q.step).join(', ') || 'none' : '-');
        L.push(`         ${at.padEnd(7)} levels old: ${cell(wr)}; built: ${cell(wo)}; steps under -1 %: old ${failing(wr)}; built ${failing(wo)}`);
      }
    }
  }
  L.push('');
  L.push(...gatesTable(runs, tauH, platesLines));
  return L.join('\n');
}

/** The design's gates G1 to G16 (ruling 27.8's additions with them): number, REPORT9's figure, this table's figure, met or MISSED. */
function gatesTable(runs: Summary[], tauH: (number | null)[], platesLines: string[] | null): string[] {
  const L: string[] = [];
  const SS = (r: Summary) => r.extra.sittings as Sitting2[];
  const by = (bot: string) => runs.filter((r) => r.spec.bot === bot);
  const nrm = by('normal').filter((r) => r.spec.seed < 100);
  const ns = nrm.length;
  const sitAt = (r: Summary, rung: number) => SS(r).find((x) => x.rung >= rung)?.n ?? null;
  const tauOf = (rung: number) => (tauH[rung - 1] as number) || 0;
  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '-');
  const few = (n: number, want: number) => (n < want ? ` (on ${n} seed${n === 1 ? '' : 's'}; the gate names ${want})` : '');
  const row = (g: string, name: string, r9: string, now: string, ok: boolean | null) => L.push(`   ${g.padEnd(4)} ${name.padEnd(22)} REPORT9: ${r9}\n        now: ${now}  => ${ok === null ? 'NOT MEASURED HERE' : ok ? 'met' : 'MISSED'}`);
  L.push('THE GATES (yard-stage2-economy.md G1 to G16; RULING2.md 27.8): each with REPORT9\'s figure beside it; a gate measured on fewer seeds than it names says so and is NOT a pass of the gate');
  // G1
  const entry = (platesLines ?? []).map((l) => /^\s+(\S+).* entry (met|MISSED)/.exec(l)).filter((m): m is RegExpExecArray => !!m);
  type W = { at: string; rows: { step: string; d: number; hidden?: boolean }[] };
  const walks = nrm.flatMap((r) => ((r.extra.walk as W[]) ?? []).map((w) => ({ seed: r.spec.seed, w })));
  const steps = new Map<string, number[]>();
  for (const { w } of walks) for (const q of w.rows) if (Number.isFinite(q.d)) (steps.get(`${w.at} ${q.step}`) ?? steps.set(`${w.at} ${q.step}`, []).get(`${w.at} ${q.step}`)!).push(q.d);
  const failing = [...steps.entries()].filter(([, v]) => v.reduce((a, x) => a + x, 0) / v.length < -0.01 || Math.min(...v) < -0.04).map(([k]) => k);
  const hidden = walks.flatMap(({ seed, w }) => w.rows.filter((q) => q.hidden).map((q) => `${w.at} ${q.step} s${seed}`));
  row('G1', 'Entry', 'walk 5 of 74 steps failing (partner levels); hidden best buys: the driver level 15/15, the plasma 15/15', `${entry.length ? `items ${entry.map((m) => `${m[1]} ${m[2]}`).join(', ')}` : 'items not measured (--plates)'}; walk ${walks.length ? `${failing.length} of ${steps.size} steps failing${failing.length ? ` (${failing.join('; ')})` : ''}; hidden best buys ${hidden.length ? hidden.join(', ') : 'none'}` : 'not run (--walk2)'}${few(ns, 15)}`, entry.length && walks.length ? entry.every((m) => m[2] === 'met') && !failing.length && !hidden.length : null);
  // G2
  const moments: [string, (r: Summary) => Sitting2 | undefined][] = [
    ['r3 entry', (r) => SS(r)[0]], ['r3 last', (r) => [...SS(r)].reverse().find((x) => x.rung === 3 && x.bought > 0)], ['r4 entry', (r) => SS(r).find((x) => x.rung >= 4)],
    ['day 3', (r) => SS(r)[5]], ['r4 last', (r) => [...SS(r)].reverse().find((x) => x.rung === 4 && x.bought > 0)], ['r5 entry', (r) => SS(r).find((x) => x.rung >= 5)],
  ];
  const ig = moments.map(([n, get]) => { const q = nrm.map(get).filter((x): x is Sitting2 => !!x && !!x.G).map((x) => (x.Iback ?? 0) / x.G!); return { n, m: q.length ? med(q) : NaN, q }; });
  const igOk = ig.every((x) => x.q.length && x.m >= 0.95 && x.m <= 1.05 && x.q.every((v) => v >= 0.8 && v <= 1.25));
  const bt = bookTable(runs);
  const drv = bt.driver;
  const kappa = (contentAtRunsKappa ?? []).map((v) => (v === null ? '-' : String(v))).join('/');
  row('G2', 'Rated income', 'medians 0.91 1.31 1.46 1.44 1.38 1.44; driver level dI 0', `normal board medians ${ig.map((x) => `${x.n} ${f2(x.m)}`).join(', ')}; kappa ${kappa}; G2 R (driver, r4 entry) ${drv ? `calculated §${drv.calc} / measured first step §${drv.gains[0]} = ${f2(drv.ratio)}` : 'not measured (--book)'}; every ladder: ${Object.entries(bt).map(([k, v]) => `${k} ${f2(v.ratio)}${v.fails ? ' FAILS (book)' : ''}`).join(', ') || '-'}${few(ns, 15)}; off the fitted board: see T2's GATED rows`, ns ? igOk && !!drv && drv.ratio >= 0.7 && drv.ratio <= 1.4 : null);
  // G3
  const pace = (rs: Summary[], daily: boolean) => rs.map((r) => ({ s: r.spec.seed, r4: sitAt(r, 4), r5: sitAt(r, 5) })).map((q) => ({ ...q, ok: daily ? q.r4 !== null && q.r4 >= 2 && q.r4 <= 3 && q.r5 !== null && q.r5 >= 4 && q.r5 <= 6 : q.r4 !== null && q.r4 >= 4 && q.r4 <= 6 && q.r5 !== null && q.r5 >= 8 && q.r5 <= 12 }));
  const pN = pace(nrm, false);
  const pB = pace(by('routeB'), false);
  const pU = pace(by('normal').filter((r) => r.spec.seed > 100), false);
  const pS = pace(by('slow'), true);
  const fmt = (p: ReturnType<typeof pace>) => `${p.filter((q) => q.ok).length}/${p.length} [${p.map((q) => `s${q.s} ${q.r4 ?? '-'}/${q.r5 ?? '-'}`).join(' ')}]`;
  row('G3', 'Pace', 'rung 4 day 2.0-2.5, rung 5 sittings 9-10 (15/15 both routes, 5/5 unseen); slow rung 5 at sitting 12 (twice a day)', `normal ${fmt(pN)}; routeB ${pB.length ? fmt(pB) : '-'}; unseen ${pU.length ? fmt(pU) : '-'}; slow once a day (rung 4 day 2-3, rung 5 day 4-6) ${pS.length ? fmt(pS) : '-'}${few(ns, 15)}`, ns ? pN.every((q) => q.ok) && pB.every((q) => q.ok) && pU.every((q) => q.ok) && pS.every((q) => q.ok) : null);
  // G4
  const g4 = nrm.map((r) => {
    const ss = SS(r);
    const s5 = sitAt(r, 5);
    const lastM = Math.max(0, ...ss.filter((x) => x.rung === 4 && (x.keys ?? []).some((q) => (q.via === 'goal' || q.via === 'loan') && soldKeys.has(q.k))).map((x) => x.n));
    const dry = ss.filter((x) => (s5 === null || x.n < s5) && !(x.keys ?? []).some((q) => q.via === 'goal' || q.via === 'loan' || (q.pb !== undefined && q.pb <= 1.25 * tauOf(x.rung) + 1e-9)));
    const lastGoal = Math.max(0, ...ss.filter((x) => (x.keys ?? []).some((q) => (q.via === 'goal' || q.via === 'loan') && soldKeys.has(q.k))).map((x) => x.n));
    return { s: r.spec.seed, dry: dry.length, early: dry.filter((x) => x.n < lastM).length, gap: s5 && lastGoal ? s5 - lastGoal : null };
  });
  row('G4', 'Sittings', '63 of 139 without a purchase; last goal purchase to rung 5: 4 to 5 sittings', `${g4.map((q) => `s${q.s}: ${q.dry} dry (${q.early} before rung 4's last machine), gap ${q.gap ?? '-'}`).join('; ')}${few(ns, 15)}`, ns ? g4.every((q) => q.dry <= 2 && q.early === 0 && q.gap !== null && q.gap <= 3) : null);
  // G5
  const alw = by('always');
  const g5 = alw.map((r) => {
    const s2 = r.extra.s2 as Bot['rec']['s2'];
    const ss = SS(r);
    const sitOf = (t: number) => Math.max(1, ss.findIndex((x) => x.h * 3600 >= t) + 1 || ss.length);
    const o = s2.offers[0];
    const rp = s2.repaid[0];
    const r4 = (r.extra.rungsAt as Record<string, number>)?.[4];
    const nv = nrm.find((q) => q.spec.seed === r.spec.seed);
    const sooner = nv && nv.rungs[5] && r.rungs[5] ? 1 - r.rungs[5] / nv.rungs[5] : NaN;
    return { s: r.spec.seed, first: o ? sitOf(o.t) : null, loans: s2.loans.length, repaid4: s2.loans.length ? !!rp && r4 !== undefined && rp.t < r4 : null, sooner };
  });
  row('G5', 'Bank', 'first offer at sitting 1-2 of rung 3: 0 of 15; no loan on any run', alw.length ? `${g5.map((q) => `s${q.s}: first offer sitting ${q.first ?? '-'}, loans ${q.loans}, first repaid before rung 4 ${q.repaid4 === null ? '-' : q.repaid4 ? 'yes' : 'NO'}, rung 5 sooner than never ${Number.isFinite(q.sooner) ? `${(100 * q.sooner).toFixed(1)} %` : '-'}`).join('; ')}; felt cash: M4${few(alw.length, 15)}` : 'no always-finance run', alw.length ? g5.every((q) => q.first !== null && q.first <= 2 && q.repaid4 !== false && (!Number.isFinite(q.sooner) || q.sooner <= 0.1)) : null);
  // G6
  const r4m = nrm.map((r) => ({ s: r.spec.seed, hs: [...new Set(SS(r).filter((x) => x.rung === 4).flatMap((x) => [...(x.fitBack ?? []), ...(x.fitEnd ?? [])]))] }));
  const Hs = ((cfgPacks ?? []) as { H: number }[]).map((p) => p.H);
  const leads = ['packs', 'packsAlways'].flatMap((bt2) => by(bt2).map((r) => { const o = nrm.find((q) => q.spec.seed === r.spec.seed); const a = sitAt(r, 5); const b0 = o ? sitAt(o, 5) : null; return { bt2, s: r.spec.seed, lead: a !== null && b0 !== null ? b0 - a : null, packs: ((r.extra.s2 as Bot['rec']['s2']).packs ?? []).length }; }));
  row('G6', 'Packs', 'T11: 0 of 150 rung-4 moments fit with own cash; the packs bot bought none', `${Hs.map((H) => `${H} h pack fits at a rung-4 moment on ${r4m.filter((q) => q.hs.includes(H)).length}/${r4m.length} seeds`).join('; ')}; ${leads.map((q) => `${q.bt2} s${q.s}: ${q.packs} packs, lead at rung 5 ${q.lead ?? '-'} sitting(s)`).join('; ') || 'no packs run'}${few(ns, 15)}`, ns ? Hs.every((H) => r4m.filter((q) => q.hs.includes(H)).length >= Math.ceil((10 / 15) * r4m.length)) && leads.every((q) => q.lead === null || q.lead <= 1) : null);
  // G7
  const mg = by('manager').map((r) => { const o = nrm.find((q) => q.spec.seed === r.spec.seed); const at = (n: number) => { const a = o && SS(o)[n - 1]; const m = SS(r)[n - 1]; return a && m ? a.Lend / m.Lend : NaN; }; return { s: r.spec.seed, r4: sitAt(r, 4), r5: sitAt(r, 5), w4: at(4), w8: at(8) }; });
  row('G7', 'The hand', 'the manager never reaches rung 4; hand/manager 3.67 (s4), 5.34 (s8)', mg.length ? mg.map((q) => `s${q.s}: rung 4 at sitting ${q.r4 ?? '-'} (aim <= 7), rung 5 at ${q.r5 ?? '-'} (aim <= 14); hand/manager ${f2(q.w4)} at s4, ${f2(q.w8)} at s8 (aim >= 1.2); no mechanism over three fifths: not measured`).join('; ') + few(mg.length, 3) : 'no manager run', mg.length ? mg.every((q) => q.r4 !== null && q.r4 <= 7 && q.r5 !== null && q.r5 <= 14 && !(q.w4 < 1.2) && !(q.w8 < 1.2)) : null);
  // G8
  const g8 = nrm.map((r) => { const ss = SS(r); const from = ss.filter((x) => x.n >= 2); return { s: r.spec.seed, ok: from.filter((x) => x.lotsCut >= 1).length, n: from.length, bad: ss.flatMap((x) => x.lotMassBad ?? []) }; });
  row('G8', 'Oversize pieces', '0 cut in every sitting of every run', `${g8.map((q) => `s${q.s}: a piece cut in ${q.ok} of ${q.n} sittings from sitting 2${q.bad.length ? `, MASS OUT OF RANGE ${q.bad.join(', ')}` : ', every mass in its range'}`).join('; ')}${few(ns, 15)}`, ns ? g8.every((q) => q.ok === q.n && !q.bad.length) : null);
  // G9
  const pl = by('planned').map((r) => { const o = nrm.find((q) => q.spec.seed === r.spec.seed); const a = SS(r)[5]; const b0 = o && SS(o)[5]; return a && b0 ? b0.Lend / a.Lend - 1 : NaN; }).filter(Number.isFinite);
  const benches = nrm.map((r) => ({ s: r.spec.seed, ...((r.extra.bench8 as { h: number; tripMs: number; plannedMs: number; ratio: number } | null) ?? { h: 0, tripMs: 0, plannedMs: 0, ratio: NaN }) })).filter((q) => Number.isFinite(q.ratio));
  const tj = runs.filter((r) => r.spec.gate);
  const tjd = tj.reduce((a, r) => a + ((r.extra.s2 as Bot['rec']['s2']).gate ?? []).length, 0);
  row('G9', 'Planning', 'trip by trip +9.9 % lifetime at day 3; a minute of ticks = a jump at 120 checks', `trip by trip against planned (day 3 lifetime): ${pl.length ? pl.map((v) => `${(100 * v).toFixed(1)} %`).join(' ') : 'no planned pair run'}; tick = jump: ${tjd} of ${tj.reduce((a, r) => a + SS(r).filter((x) => x.n <= 5 || [8, 12].includes(x.n)).length, 0)} checks differ; the bench's ratio on a rung-4 state of the new content (28.1 b; at most 1.5): ${benches.length ? benches.map((q) => `s${q.s} h${q.h} trip by trip ${q.tripMs} ms / planned ${q.plannedMs} ms = ${q.ratio}`).join('; ') : 'not run (--bench)'}; the absolute figure (under 1,000 ms) is engine step 5's (28.1 c)`, tjd !== 0 ? false : benches.length ? benches.every((q) => q.ratio <= 1.5) : null);
  // G10
  const e19 = [3, 4].map((rung) => { const q = nrm.flatMap((r) => { const ss = SS(r); return ss.map((x, i) => ({ rung: x.rung, a: (x.Lback - (i ? ss[i - 1].Lend : x.Lback)) / Math.max(1e-9, x.ranH), p: (x.Lend - x.Lback) / 0.25 })).filter((q2, i) => i > 0 && q2.rung === rung && q2.p > 0).map((q2) => q2.a / q2.p); }); return { rung, m: q.length ? med(q) : NaN }; });
  row('G10', 'Time away', 'E19 0.70 (rung 3), 0.89 (rung 4)', `${e19.map((q) => `rung ${q.rung} ${f2(q.m)}`).join(', ')}${few(ns, 15)}`, ns ? e19.every((q) => q.m >= 0.3 && q.m <= 0.8) : null);
  // G11
  const day = nrm.map((r) => { const ss = SS(r); const s2 = r.extra.s2 as Bot['rec']['s2']; const out: number[] = []; for (let d = 0; 2 * d + 1 < ss.length && d < 5; d++) { const a = d ? ss[2 * d - 1] : null; const b2 = ss[2 * d + 1]; const L0 = a ? a.Lend : 0; let num = 0; for (const x of [ss[2 * d], b2]) num += x.rack + x.van + s2.rackSold.filter((q) => q.t > x.h * 3600 - 900 && q.t <= x.h * 3600 + 1).reduce((s0, q) => s0 + q.money, 0); out.push(num / Math.max(1, b2.Lend - L0)); } return out; });
  const dmed = [0, 1, 2, 3, 4].map((d) => { const v = day.map((x) => x[d]).filter((y) => y !== undefined); return v.length ? med(v) : NaN; });
  const over = day.flat().filter((v) => v > 0.08).length;
  row('G11', 'Yard sale and van', '6.9, 1.9, 1.8, 1.9, 1.8 % (days 1 to 5)', `${dmed.map((v) => (Number.isFinite(v) ? `${(100 * v).toFixed(1)} %` : '-')).join(', ')}; ${over} seed-days over 8 %${few(ns, 15)}`, ns ? dmed.every((v) => !Number.isFinite(v) || (v >= 0.02 && v <= 0.05)) && over === 0 : null);
  // G12
  const broken = runs.reduce((a, r) => a + r.broken.length, 0);
  row('G12', 'Hard promises', 'none broken on 198 runs; ads 1.8 % of day 1', `${broken} broken on ${runs.length} runs (section 0 lists them); ads: the ads bot's T5 row`, broken === 0);
  row('G13', 'The first yard', '75 of 75 runs to the millisecond; same.ts 4 of 4', 'not this table: s2e/first-yard.sh --full (same.ts on 4 hands, the 75-run comparison)', null);
  row('G14', 'Candidates', '-', 'the copper hall is built and measured after the core in its own working copy; the trailer is not built (RULING2.md 27.3 D3)', null);
  const ps = runs.map((r) => r.extra.person as PersonRow | null).filter((q): q is PersonRow => !!q);
  row('G15', 'A person\'s sitting', 'not measured', ps.length ? `${ps.map((q) => `s${q.seed}: ${q.fits ? 'fits 15 min' : `does NOT fit (${q.missing.join(', ')})`}, two cards without an action ${q.twoCards}`).join('; ')} (a script at the slow hand's pace; the three people of 8.4 are the lead's)` : 'not run (--person)', ps.length ? ps.every((q) => q.fits && q.twoCards === 0) : null);
  row('G16', 'Store-review pass', '-', 'done: notes/s2e-policy.md, ruled in RULING2.md 28.2', true);
  return L;
}
/** The content's rate.kappa (printed by G2) and the sold keys (G4: rung 4's machines), set in main. */
let contentAtRunsKappa: (number | null)[] | null = null;
let soldKeys = new Set<string>();

let gameHash = '';
/** The shop's packs (H hours each), read from the game for T11. */
let cfgPacks: { H: number }[] | null = null;
/** The first parts' key: the game file and bot.ts only (the rules' files are not hashed: empty the cache when they change). */
let snapHash = '';

/**
 * bots/plates.json (2.6.4, the payback rule): per plate the median over the normal runs of ΔI at its planned moment, its
 * rung, and the price the rule gives: max(works.floor, τ_r × ΔI), τ_r = tau_h[rung − 1] of its gate's rung. build-yard.py's
 * check (3) compares works.plates.<id>.price with it.
 */
function writePlates(all: Summary[], gameFile: string, write: boolean): string[] {
  const cfg = loadCfg(gameFile);
  const c = contentAt(cfg.salvage, { counts: { bathSet: 1 } } as never);
  const W = c.works!;
  const rows: Record<string, unknown> = {};
  const items: Record<string, unknown> = {};
  // s2e-bots: the sold items only (soldItems); a dark item's REPORT9 row is kept as it stands in the table read below.
  const sold = soldItems(cfg);
  const lines: string[] = [];
  for (const pid of sold.map((i) => i.key)) {
    const xs = all.map((r) => (r.extra.plates as Record<string, PlateRow> | undefined)?.[pid]).filter((x): x is PlateRow => !!x);
    if (!xs.length) continue;
    const isPlate = pid in W.plates;
    const gate = isPlate ? W.plates[pid].gate : (c.shop.find((i) => i.key === pid)?.gate ?? 'rung3');
    const gateR = Number(String(gate).replace('rung', '')) || 3;
    const tau = c.tau_h?.[gateR - 1] ?? 0;
    const dI = med(xs.map((x) => x.dI));
    // RULING2.md 21.1 (19.1 as it was meant): dE = the MEAN over seeds of the gain over an hour of play by the reference
    // bot and then one capped absence (a rate an hour of yard time); price = max(works.floor, tau_r x dE) to three figures.
    // dGaway: REPORT8's measure (one capped absence alone), kept beside it.
    const dEs = xs.map((x) => x.dE ?? x.dG ?? 0);
    const dE = Math.round(dEs.reduce((a, v) => a + v, 0) / dEs.length);
    const raw = Math.max(W.floor, tau * dE);
    const p10 = 10 ** Math.max(0, Math.floor(Math.log10(raw)) - 2);
    const dGs = xs.map((x) => x.dG ?? 0);
    // s2e-bots (ruling 27.8): the standard error of the mean gain beside it, and E0 (the yard's income at the moment: the
    // branch without the item, § an hour, mean of seeds), which build-yard.py's entry rule reads (at least 2 % of E0).
    const se = dEs.length > 1 ? Math.sqrt(dEs.reduce((a, v) => a + (v - dE) ** 2, 0) / (dEs.length - 1) / dEs.length) : null;
    const E0s = xs.map((x) => x.E0 ?? NaN).filter(Number.isFinite);
    const E0 = E0s.length ? Math.round(E0s.reduce((a, v) => a + v, 0) / E0s.length) : null;
    const price = Math.round(raw / p10) * p10;
    const row: Record<string, unknown> = { dE, se: se === null ? null : Math.round(se), E0, sold: true, dGaway: Math.round(dGs.reduce((a, v) => a + v, 0) / dGs.length), dI, I: med(xs.map((x) => x.I)), G: med(xs.map((x) => x.G ?? 0)), at_h: med(xs.map((x) => x.at_h)), gate: gateR, tau_h: tau, price, seeds: xs.length, bought: xs.filter((x) => x.bought).length, perSeed: dEs, perSeedAway: dGs, perSeedI: xs.map((x) => x.dI), perSeedE0: xs.map((x) => x.E0 ?? null) };
    // s2e-measure (28.4 a): the hour and the absence together (dT) and the run-up alone (dP) beside the lasting gain, each
    // with its standard error; the run-up's hours; a third's difference between dT and the lasting gain is flagged
    const stat = (v: number[]) => { const f = v.filter(Number.isFinite); const m0 = f.reduce((a, x) => a + x, 0) / Math.max(1, f.length); return { m: Math.round(m0), se: f.length > 1 ? Math.round(Math.sqrt(f.reduce((a, x) => a + (x - m0) ** 2, 0) / (f.length - 1) / f.length)) : null }; };
    const T = stat(xs.map((x) => x.dT ?? NaN));
    const P = stat(xs.map((x) => x.dP ?? NaN));
    const E0T = stat(xs.map((x) => x.E0T ?? NaN)).m;
    Object.assign(row, { measure: '28.4a', dT: T.m, seT: T.se, dP: P.m, seP: P.se, E0T, tW_h: +(xs.reduce((a, x) => a + (x.tW_h ?? 1), 0) / xs.length).toFixed(2), worked: xs.filter((x) => x.worked).length, perSeedT: xs.map((x) => x.dT ?? null) });
    const third = dE !== 0 && Math.abs(T.m - dE) > Math.abs(dE) / 3;
    // the plasma's price stands until the lead rules (28.4 b): its table row is not written, its figures are printed
    // the entry rule (27.2 b, the step's text): an item under 2 % of the yard's income (mean) or with a seed below -1 % is
    // REPORTED and stays as it is (row and price) until the lead rules; so does the plasma (28.4 b)
    const lowE = Math.min(...dEs);
    const entryOk = !!E0 && dE >= 0.02 * E0 && lowE >= -0.01 * E0;
    // RULING2.md 28.7: prices written ONLY for the hook-lift, the analyser, the induction hall and the rotary hall (the plasma's
    // and the line's stand until they are measured in their new form); the entry rule's verdict is printed for every item
    const keep = !WRITE_ITEMS.includes(pid);
    if (!keep) (isPlate ? rows : items)[pid] = row;
    // Ruling 27.6: a second round only for a price that moved by more than its standard error (in price, tau x s.e.) AND by more than a tenth.
    const old = sold.find((i) => i.key === pid)!.price;
    const moved = Math.abs(price - old);
    const second = se !== null && moved > tau * se && moved > 0.1 * old;
    const low = Math.min(...dEs);
    lines.push(`   ${pid.padEnd(12)} n ${pad(xs.length, 2)}  at h ${f1(med(xs.map((x) => x.at_h)))}  dE §${dE} (s.e. ${se === null ? '-' : Math.round(se)}) of E0 §${E0 ?? '-'} = ${E0 ? ((100 * dE) / E0).toFixed(2) : '-'} %  worst seed ${E0 ? ((100 * low) / E0).toFixed(2) : '-'} %  entry ${E0 && dE >= 0.02 * E0 && low >= -0.01 * E0 ? 'met' : 'MISSED'}  price §${old} -> §${price}${second ? '  SECOND ROUND (moved over its s.e. and over a tenth)' : se === null ? '  (one seed: no s.e.)' : '  stands'}${se !== null && dE > 0 && se > 0.25 * dE ? '  s.e. over a quarter of the mean: more seeds' : ''}`);
    lines.push(`                the hour and the absence together dT §${T.m} (s.e. ${T.se ?? '-'}) of §${E0T}; the run-up alone dP §${P.m} (s.e. ${P.se ?? '-'}); run-up ${f1(xs.reduce((a, x) => a + (x.tW_h ?? 1), 0) / xs.length)} h, worked before the absence on ${xs.filter((x) => x.worked).length}/${xs.length}${third ? '  dT AND THE LASTING GAIN DIFFER BY MORE THAN A THIRD: find why' : ''}${keep ? '  (NOT WRITTEN: its price and its row stand until it is measured in its new form, RULING2.md 28.7)' : !entryOk ? '  (written by the lead\'s line of 15:55, RULING2.md 28.7; THE ENTRY RULE IS MISSED: for the lead)' : ''}`);
    lines.push(`                per seed lasting ${dEs.map((v) => Math.round(v)).join(' ')} | together ${xs.map((x) => x.dT ?? '-').join(' ')}`);
    { const tl = xs.map((x) => x.tL ?? NaN).filter(Number.isFinite); const m = tl.reduce((q, v) => q + v, 0) / Math.max(1, tl.length); const se2 = tl.length > 1 ? Math.sqrt(tl.reduce((q, v) => q + (v - m) ** 2, 0) / (tl.length - 1) / tl.length) : NaN; const t0m = xs.reduce((q, x) => q + (x.T0 ?? 0), 0) / xs.length; Object.assign(row, { tL: +m.toFixed(3), seTL: +se2.toFixed(3), T0: +t0m.toFixed(2) }); lines.push(`                IN TONNES: the lasting gain ${m.toFixed(2)} t an hour (s.e. ${f2s(se2)}) of the yard's ${t0m.toFixed(1)} t an hour supplied over the absence (${(100 * m / Math.max(1e-9, t0m)).toFixed(1)} %); together ${(xs.reduce((q, x) => q + (x.tT ?? 0), 0) / xs.length).toFixed(2)} t an hour`); }
  }
  // --plates write: the table build-yard.py's check (3) reads (it then refuses a price off the rule); --plates: printed only.
  // s2e-bots: --platesOut file writes there instead of the repository's table (a try on one or two seeds must not move the
  // shipped prices: build-yard.py --check would refuse the content). The table written MERGES: the rows of what is not sold
  // (REPORT9's, as measured), the purse and the comments of the table it starts from are kept; `book` (the level ladders'
  // three steps, --book) is written beside the plates.
  const target = arg('platesOut');
  const out = target && target !== 'true' ? path.resolve(target) : write ? path.join(ROOT, 'scripts/content/bots/plates.json') : path.resolve(arg('json') ? `${arg('json')}.plates.json` : path.join(os.tmpdir(), `yard-plates-${process.pid}.json`));
  const base = JSON.parse(fs.readFileSync(fs.existsSync(out) && write ? out : path.join(ROOT, 'scripts/content/bots/plates.json'), 'utf8')) as Record<string, unknown> & { plates: Record<string, unknown>; items: Record<string, unknown> };
  const bookRows = bookTable(all);
  // s2e-measure (28.4 b): the plasma's three moments, for the lead (its price stands)
  const p3 = all.flatMap((r) => ((r.extra.plasma3 as Plasma3[] | undefined) ?? []).map((q) => ({ ...q, seed: r.spec.seed })));
  const plasmaB: Record<string, unknown> = {};
  for (const at of [...new Set(p3.map((q) => q.at))]) {
    const xs = p3.filter((q) => q.at === at);
    const mn = (f: (q: (typeof xs)[number]) => number) => Math.round(xs.reduce((a, q) => a + f(q), 0) / xs.length);
    const dl = xs.map((q) => q.dL);
    const m0 = dl.reduce((a, v) => a + v, 0) / dl.length;
    const se = dl.length > 1 ? Math.round(Math.sqrt(dl.reduce((a, v) => a + (v - m0) ** 2, 0) / (dl.length - 1) / dl.length)) : null;
    plasmaB[at] = { dL: Math.round(m0), tL: +(xs.reduce((q, z) => q + (z.tL ?? 0), 0) / xs.length).toFixed(3), se, dT: mn((q) => q.dT), dP: mn((q) => q.dP), E0: mn((q) => q.E0), lot4_h: mn((q) => q.lot4), lot3_h: mn((q) => q.lot3), lot4With_h: mn((q) => q.lotA.cut4), lot3With_h: mn((q) => q.lotA.cut3), lot3Without_h: mn((q) => q.lotB.cut3), seeds: xs.length, perSeed: dl };
    lines.push(`   PLASMA ${at.padEnd(28)} n ${pad(xs.length, 2)}  lasting ${(xs.reduce((q, z) => q + (z.tL ?? 0), 0) / xs.length).toFixed(2)} t an hour, §${Math.round(m0)} (s.e. ${se ?? '-'}) of E0 §${mn((q) => q.E0)} = ${(100 * m0 / Math.max(1, mn((q) => q.E0))).toFixed(1)} %  together §${mn((q) => q.dT)}  run-up §${mn((q) => q.dP)}  |  oversize pieces cut an hour of play: with it tier 4 §${mn((q) => q.lotA.cut4)} + tier 3 §${mn((q) => q.lotA.cut3)}; without it tier 3 §${mn((q) => q.lotB.cut3)}: what it opens §${mn((q) => q.lot4)} an hour (tier 3 moves §${mn((q) => q.lot3)})`);
  }
  const merged = { ...base, ...(p3.length ? { plasma284b: { $comment: 's2e-measure (RULING2.md 28.4 b): the plasma cutter\'s lasting gain at three moments from the first works return (m1 bare, m2 with the second cutter, m3 with the second cutter and the hook-lift), and the worth an hour of play of the oversize pieces cut (prepared value): for the lead; the plasma\'s price and its items row stand until he rules', ...plasmaB } } : {}), $s2eMeasure: 's2e-measure (27 Nov): the sold items measured at their planned moments in the NEW goal order by RULING2.md 28.4 (a): dE = THE LASTING GAIN, what the yard keeps an hour over one capped absence that begins once the item works (the run-up played by the reference bot buying nothing, at least an hour and until the item works; the branch without plays as long), nobody at the yard, with and without, the sitting\'s earlier purchases owned in both; dT (the run-up and the absence together, ruling 21.1\'s measure where the run-up is the hour) and dP (the run-up alone) beside it, pricing nothing; E0 the absence\'s income without the item; book: the steps measured the same way (an hour played, then the absence alone).', $s2eBots: 's2e-bots (27 Nov): the sold items measured at their planned moments in the NEW goal order (ruling 21.1\'s measure), with `se` (the standard error of the mean over seeds) and `E0` (the yard\'s income at that moment, the branch without the item); `book`: the level ladders\' three steps g1 and d (g(L) = g1 x d^(L-1)) at each ladder\'s planned moment.', seeds: [...new Set(all.map((r) => r.spec.seed))], plates: { ...base.plates, ...rows }, items: { ...base.items, ...items }, ...(Object.keys(bookRows).length ? { book: bookRows } : {}) };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(merged, null, 1)}\n`);
  process.stderr.write(`wrote ${out}\n`);
  return lines;
}

/** The level ladders' three steps over the runs (--book): per ladder g1 (mean of the first step's gain), g2, g3 and d = sqrt(g3 / g1) within (0, 1]. */
type BookT = { g1: number; d: number; at: string; gains: number[]; gainsT: number[]; se: number; L0: number; seeds: number; calc: number; ratio: number; fails: boolean; I: number; perSeed: number[][] };
function bookTable(all: Summary[]): Record<string, BookT> {
  const out: Record<string, BookT> = {};
  const rows = all.flatMap((r) => ((r.extra.book as BookRow[] | undefined) ?? []));
  for (const L of LADDERS) {
    const xs = rows.filter((q) => q.ladder === L.ladder && q.gains.length);
    if (!xs.length) continue;
    const m = (k: number, f: (q: BookRow) => number[] | undefined = (q) => q.gains) => { const v = xs.map((q) => f(q)?.[k] ?? NaN).filter(Number.isFinite); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN; };
    const gains = [m(0), m(1), m(2)].map((v) => Math.round(v));
    const gainsT = [m(0, (q) => q.gainsT), m(1, (q) => q.gainsT), m(2, (q) => q.gainsT)].map((v) => Math.round(v));
    const s0 = xs.map((q) => q.gains[0]).filter(Number.isFinite);
    const se = s0.length > 1 ? Math.sqrt(s0.reduce((a, v) => a + (v - gains[0]) ** 2, 0) / (s0.length - 1) / s0.length) : NaN;
    const gL0 = Math.max(0, gains[0]);
    const d = gL0 > 0 && gains[2] > 0 ? Math.min(1, Math.max(0.01, Math.sqrt(gains[2] / gL0))) : gL0 > 0 && gains[1] > 0 ? Math.min(1, Math.max(0.01, gains[1] / gL0)) : 1;
    // s2e-measure: the book reads g1 x d^(L-1) at the ABSOLUTE level L (rate.ts levelGain): the measured first step is the
    // step from L0 (the level held at the moment), so g1 = that step / d^(L0-1), per seed, then the mean.
    const g1s = xs.map((q) => (Number.isFinite(q.gains[0]) ? Math.max(0, q.gains[0]) / d ** (Math.max(1, q.L0) - 1) : NaN)).filter(Number.isFinite);
    const g1 = Math.round(g1s.reduce((a, v) => a + v, 0) / Math.max(1, g1s.length));
    const calc = Math.round(xs.reduce((a, q) => a + q.calc, 0) / xs.length);
    const ratio = gL0 > 0 ? calc / gL0 : NaN;
    out[L.ladder] = { g1, d: +d.toFixed(3), at: L.at, gains, gainsT, se: Math.round(se), L0: +(xs.reduce((a, q) => a + q.L0, 0) / xs.length).toFixed(1), seeds: xs.length, calc, ratio, fails: !(ratio >= 0.7 && ratio <= 1.4), I: Math.round(xs.reduce((a, q) => a + q.I, 0) / xs.length), perSeed: xs.map((q) => q.gains) };
  }
  return out;
}

/**
 * --book write: the content's levels.book (src/config/salvage.content.ts) gets the measured ladder ONLY for the ladders rated
 * income's engineer reported failing the driver-level check (BOOK_FAILING; ruling 27.4: the book is read for a ladder where
 * the check fails); one exact replacement of the `book:` line, then `python3 scripts/content/build-yard.py` writes game.json.
 */
function writeBook(all: Summary[]): string[] {
  const t = bookTable(all);
  // s2e-measure (28.4 c): EVERY ladder whose calculated gain is outside 0.7 to 1.4 of its measured first step (and a book
  // entry kept where the measurement has no row)
  void BOOK_FAILING;
  const want = Object.fromEntries(Object.entries(t).filter(([, v]) => v.fails && v.g1 > 0 && v.gains[0] >= 0.01 * v.I).map(([k, v]) => [k, { g1: v.g1, d: v.d, at: v.at }]));
  const file = path.join(ROOT, 'src/config/salvage.content.ts');
  const src = fs.readFileSync(file, 'utf8');
  const re = /\n    book: \{[^\n]*\},\n/;
  if (!re.test(src)) return ['levels.book: the `book:` line of salvage.content.ts was not found; nothing written'];
  const body = Object.entries(want).map(([k, v]) => `${JSON.stringify(k)}: { g1: ${v.g1}, d: ${v.d}, at: ${JSON.stringify(v.at)} }`).join(', ');
  fs.writeFileSync(file, src.replace(re, `\n    book: {${body ? ` ${body} ` : ''}},\n`));
  return [`levels.book written (${Object.keys(want).join(', ') || 'nothing'}): run python3 scripts/content/build-yard.py`];
}

function runOne(base: R.SalvageConfig, spec: Spec): Summary {
  if (spec.kind === 'stage2') return run2(base, spec);
  const t0 = performance.now();
  if (spec.kind === 'income' && spec.board !== 'normal') base = { ...base, salvage: { ...base.salvage, board: { ...base.salvage.board, a: 0 } } };
  const cfg = seededCfg(base, spec.seed);
  const b = newBot(cfg, startGame(cfg, NOW), NOW, spec);
  const Rs: number[] = [];
  const gate: string[] = [];
  const extra: Record<string, unknown> = {};
  const onMinute = (bb: Bot, m: number) => {
    Rs[m] = ratedCapacity(bb.cfg, bb.g);
    // The tick-equals-jump gate runs on the first hour only (REPORT7 plays the hour runs to minute 90).
    if (spec.gate && m <= Math.min(spec.minutes, 60)) {
      const d = tickJumpGate(bb.cfg, bb.g, bb.now);
      if (d) gate.push(`min ${m}: ${d}`);
    }
  };
  if (spec.kind === 'hour' || spec.kind === 'manager') {
    // Stop-and-return and the away share are read from the same run's states (normal hand, goal habit).
    const awayAt: Record<number, R.SalvageGame> = {};
    playTo(b, spec.minutes * 60, (bb, m) => {
      onMinute(bb, m);
      if ([5, 10, 15, 30, 60].includes(m)) awayAt[m] = bb.g;
    });
    if (spec.kind === 'hour' && spec.hand === 'normal' && spec.habit === 'goal') {
      const back: Record<string, number> = {};
      const burst: Record<string, { earned: number; ran_s: number; cash: number; left: number; leftSum: number; buys: number; buysSum: number; delivered: number }> = {};
      for (const [m, g] of Object.entries(awayAt)) {
        for (const h of Number(m) === 60 ? [1] : [1, 4, 12]) {
          const ab = newBot(cfg, g, NOW + g.salvage.t * 1000, spec);
          ab.now = NOW + Math.round(g.salvage.clock.highMs - NOW);
          away(ab, h * 3600);
          const k = `${m}m+${h}h`;
          back[k] = Math.round(ab.rec.away[0]?.earned ?? 0);
          // E33's burst: how much of the goal list the cash after the away card buys at once (goal order,
          // each item for sale now; a gated item is counted as left but not bought).
          const card = ab.g.salvage.away as unknown as { seconds?: number; deliveryList?: { g: number }[] } | null;
          let cash = ab.g.cash;
          let left = 0;
          let leftSum = 0;
          let buys = 0;
          let buysSum = 0;
          let blocked = false;
          for (const key of cfg.salvage.goalOrder) {
            const it = [...cfg.salvage.shop, ...cfg.salvage.dayOneList].find((i) => i.key === key);
            if (!it) continue;
            const price = R.shopPrice(cfg, ab.g, key);
            if (price === null) {
              const rungGate = typeof it.gate === 'string' && /^rung\d+$/.test(it.gate) ? Number(it.gate.slice(4)) : 0;
              if (rungGate > ab.g.salvage.ladder.rung) {
                left++;
                leftSum += it.price;
                blocked = true;
              }
              continue;
            }
            left++;
            leftSum += price;
            if (!blocked && cash >= price) {
              cash -= price;
              buys++;
              buysSum += price;
            } else blocked = true;
          }
          burst[k] = { earned: back[k], ran_s: Math.round(card?.seconds ?? 0), cash: Math.round(ab.g.cash), left, leftSum: Math.round(leftSum), buys, buysSum: Math.round(buysSum), delivered: card?.deliveryList?.length ?? 0 };
        }
      }
      // The Night watch's worth (E33, E13): what it adds to one twelve-hour absence from a state of the hour.
      const night: Record<string, number> = {};
      for (const m of [15, 30, 60]) {
        const g = awayAt[m];
        if (!g || g.salvage.owned.includes('night')) continue;
        const pair = [g, { ...g, salvage: { ...g.salvage, owned: [...g.salvage.owned, 'night'] } }].map((gg) => {
          const ab = newBot(cfg, gg, NOW + gg.salvage.t * 1000, spec);
          ab.now = NOW + Math.round(gg.salvage.clock.highMs - NOW);
          away(ab, 12 * 3600);
          return ab.rec.away[0]?.earned ?? 0;
        });
        night[`${m}m+12h`] = Math.round(pair[1] - pair[0]);
      }
      extra.away = back;
      extra.burst = burst;
      extra.night = night;
    }
    return summary(b, spec, Rs, gate, extra, t0);
  }
  if (spec.kind === 'walk') {
    // RULING2.md 17.1 (engine2-dispatch): the purchase walk from the states of minute 30, 60, 90, day 1 and day 3.
    const st: [string, R.SalvageGame][] = [];
    playTo(b, 5400, (bb, m) => {
      if (m === 30 || m === 60) st.push([`m${m}`, bb.g]);
    });
    st.push(['m90', b.g]);
    for (let k = 0; k < 6; k++) {
      away(b, 11.75 * 3600);
      playTo(b, b.g.salvage.t + 15 * 60);
      if (k === 1) st.push(['day1', b.g]);
    }
    st.push(['day3', b.g]);
    extra.walk = st.map(([at, g]) => walkRow(base, spec.seed, g, at));
    return summary(b, spec, Rs, gate, extra, t0);
  }
  if (spec.kind === 'income') {
    // RULING2.md 14.10 (engine2-income2): I against G at each named moment, on yards played with the flat board
    // and with the normal board alike (G always at usual prices): rung 3's entry, minute 90, day 1, day 2 and
    // day 3; rung 2's entry and minute 60 are printed, not gated. The first sitting runs to minute 90, then
    // the twice-a-day habit (11.75 h away, 15 minutes played) to the end of day 3.
    let r2: R.SalvageGame | null = null;
    let r3: R.SalvageGame | null = null;
    let m60: R.SalvageGame | null = null;
    playTo(b, 5400, (bb, m) => {
      onMinute(bb, m);
      if (!r2 && bb.g.salvage.ladder.rung >= 2) r2 = bb.g;
      if (!r3 && bb.g.salvage.ladder.rung >= 3) r3 = bb.g;
      if (m === 60) m60 = bb.g;
    });
    const rows = [];
    if (r2) rows.push(incomeRow(cfg, r2, spec, 'rung2'));
    if (r3) rows.push(incomeRow(cfg, r3, spec, 'rung3'));
    if (m60) rows.push(incomeRow(cfg, m60, spec, 'hour'));
    rows.push(incomeRow(cfg, b.g, spec, 'm90'));
    for (let k = 0; k < 6; k++) {
      away(b, 11.75 * 3600);
      playTo(b, b.g.salvage.t + 15 * 60);
      if (k === 1) rows.push(incomeRow(cfg, b.g, spec, 'day1'));
      if (k === 3) rows.push(incomeRow(cfg, b.g, spec, 'day2'));
    }
    rows.push(incomeRow(cfg, b.g, spec, 'day3'));
    extra.income = rows;
    return summary(b, spec, Rs, gate, extra, t0);
  }
  if (spec.kind === 'days' || spec.kind === 'holder') {
    // The twice-a-day habit: a first hour, then fifteen minutes every 11.75 hours to the end of day 3.
    playTo(b, 3600, onMinute);
    const sittings: { at_h: number; awayEarned: number; bought: number; cashBefore: number; cashAfter: number; useful: boolean; rank: number }[] = [];
    const marks: Record<string, { earned: number; t: number; stock: number }> = {};
    const mark = (k: string) => (marks[k] = { earned: Math.round(b.g.lifetimeEarnings), t: +(b.g.salvage.ladder.supplied_g / 1e6).toFixed(3), stock: Math.round(stockAt(b.cfg, b.g)) });
    mark('hour');
    let n0 = b.rec.purchases.length;
    for (let k = 0; k < 6; k++) {
      const rank0 = b.rec.minutes.at(-1)?.rank ?? 0;
      away(b, 11.75 * 3600);
      const ae = b.rec.away.at(-1)?.earned ?? 0;
      const cashBefore = b.g.cash;
      const rankBack = 26 - (b.g.salvage.ladder.passed ?? 0);
      if (rankBack > rank0 && rank0 > 0) b.rec.broken.push({ t: b.g.salvage.t, what: `rank fell while away ${rank0} -> ${rankBack}` });
      playTo(b, b.g.salvage.t + 15 * 60);
      const bought = b.rec.purchases.length - n0;
      n0 = b.rec.purchases.length;
      sittings.push({ at_h: Math.round((b.g.salvage.t / 3600) * 10) / 10, awayEarned: Math.round(ae), bought, cashBefore: Math.round(cashBefore), cashAfter: Math.round(b.g.cash), useful: bought > 0, rank: rankBack });
      if (k === 1) mark('day1');
    }
    mark('day3');
    extra.marks = marks;
    extra.sittings = sittings;
    extra.hold = b.rec.hold;
    extra.earned = Math.round(b.g.lifetimeEarnings);
    return summary(b, spec, Rs, gate, extra, t0);
  }
  // No hand (E4, E24): states of a normal run, the stick never touched again: does the yard reach the next goal purchase?
  const marks = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41];
  const states: { m: number; g: R.SalvageGame }[] = [];
  playTo(b, 42 * 60, (bb, m) => {
    if (marks.includes(m)) states.push({ m, g: bb.g });
  });
  const rows: { m: number; cash: number; next: string | null; price: number | null; reachedAfter_s: number | null; hired: number }[] = [];
  for (const { m, g } of states) {
    const goal = R.nextGoal(cfg, g);
    const nextKey = goal?.buy ?? null;
    const price = nextKey ? (R.shopPrice(cfg, g, nextKey) ?? null) : null;
    let x = g;
    let reached: number | null = null;
    let ms = g.salvage.clock.highMs;
    for (let s = 0; s < 30 * 60 && price !== null; s += 10) {
      ms += 10_000;
      x = R.advanceSalvage(cfg, x, 10, ms);
      if (x.cash >= price) {
        reached = s + 10;
        break;
      }
    }
    rows.push({ m, cash: Math.round(g.cash), next: nextKey, price, reachedAfter_s: reached, hired: g.salvage.crew.length });
  }
  extra.nohand = rows;
  return summary(b, spec, Rs, gate, extra, t0);
}

// ============================================================================================ fan out

async function runAll(gameFile: string, specs: Spec[], jobs: number): Promise<Summary[]> {
  const out: Summary[] = new Array(specs.length);
  let next = 0;
  const worker = async () => {
    while (next < specs.length) {
      const i = next++;
      // --cache dir: a run already made with the same spec is read back (a long report survives a restart;
      // empty the folder whenever the content or the rules change).
      const cacheDir = arg('cache');
      const cacheFile = cacheDir ? path.join(cacheDir, `${createHash('sha1').update(JSON.stringify(specs[i])).digest('hex')}.json`) : null;
      if (cacheFile && fs.existsSync(cacheFile)) {
        out[i] = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as Summary;
        process.stderr.write(':');
        continue;
      }
      out[i] = await new Promise<Summary>((resolve, reject) => {
        // The stage-2 switches reach the child too (content2-bots): --stage, --cache (the shared first parts), --plates, --sittings, --nohand; s2e-bots: --book, --person.
        const pass = ['stage', 'cache', 'plates', 'sittings', 'nohand', 'walk2', 'book', 'person', 'bench'].flatMap((k) => (arg(k) !== null ? [`--${k}`, arg(k)!] : []));
        const p = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--game', gameFile, ...pass, '--one', JSON.stringify(specs[i])], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env } });
        let buf = '';
        p.stdout.on('data', (d) => (buf += d));
        p.on('close', (code) => {
          if (code !== 0) return reject(new Error(`run ${JSON.stringify(specs[i])} exit ${code}`));
          resolve(JSON.parse(buf.trim().split('\n').pop()!));
        });
      });
      if (cacheFile) {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(out[i]));
      }
      process.stderr.write('.');
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  process.stderr.write('\n');
  return out;
}

// ============================================================================================ the report

const mmss = (t: number | undefined) => (t === undefined || !Number.isFinite(t) ? '  -  ' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
const med = (xs: number[]) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : NaN;
};
const pad = (s: string | number, n: number) => String(s).padStart(n);

const BEATS: { key: string; name: string; lo: number; hi: number; slowAfter?: boolean }[] = [
  { key: 'washerDone', name: 'beat 2 the washer apart (aim about 0:12; band shown 0:15)', lo: 0, hi: 15 },
  { key: 'ticket', name: 'beat 3 first collection ticket', lo: 0, hi: 25 },
  { key: 'stripping', name: 'beat 4 at the stripper (aim about 0:30; band shown 0:35)', lo: 0, hi: 35 },
  { key: 'copper', name: 'beat 5 copper jump', lo: 0, hi: 90 },
  { key: 'purchase', name: 'beat 6 first purchase arriving', lo: 0, hi: 120 },
  { key: 'helperCarrying', name: 'beat 7 yard hand carrying', lo: 0, hi: 300, slowAfter: true },
  { key: 'pass1', name: 'beat 8 first rival passed', lo: 0, hi: 300, slowAfter: true },
  { key: 'drive', name: 'first drive out (hook)', lo: 480, hi: 600, slowAfter: true },
  { key: 'owned:torch', name: 'torch', lo: 660, hi: 900, slowAfter: true },
  { key: 'rung2', name: 'rung 2', lo: 720, hi: 1080, slowAfter: true },
  { key: 'pour', name: 'first pour', lo: 1080, hi: 1500, slowAfter: true },
  { key: 'rung3', name: 'rung 3', lo: 3300, hi: 3900, slowAfter: true },
];

function beatRow(runs: Summary[], key: string, lo: number, hi: number): string {
  const ts = runs.map((r) => r.first[key] ?? Infinity);
  const fin = ts.filter(Number.isFinite);
  const inBand = ts.filter((t) => t >= lo && t <= hi).length;
  return `${mmss(Math.min(...fin))} to ${mmss(Math.max(...fin))}, med ${mmss(med(fin))}, ${inBand}/${runs.length} in band${fin.length < runs.length ? ` (${runs.length - fin.length} never)` : ''}`;
}

function windows(r: Summary, field: 'sales' | 'net'): number[] {
  const out: number[] = [];
  const at = (m: number) => r.minutes.find((x) => Math.round(x.t / 60) >= m) ?? r.minutes.at(-1)!;
  const n = Math.min(18, Math.floor((r.minutes.at(-1)?.t ?? 0) / 300 + 1e-9));
  for (let w = 0; w < n; w++) {
    const a = w === 0 ? { earned: 0, loads: 0 } : at(w * 5);
    const b = at((w + 1) * 5);
    const sales = (b.earned - a.earned) / 5;
    out.push(field === 'sales' ? sales : sales - (b.loads - a.loads) / 5);
  }
  return out;
}

function report(all: Summary[], seeds: number[]): string {
  const L: string[] = [];
  const pick = (f: (s: Spec) => boolean) => all.filter((r) => f(r.spec));
  const hour = (hand: string, habit: string, route = 'A') => pick((s) => s.kind === 'hour' && s.hand === hand && s.habit === habit && s.route === route);
  const N = hour('normal', 'goal');
  L.push(`REPORT7 tables (the real rules, ${seeds.length} seeds: ${seeds[0]}..${seeds.at(-1)}), generated by scripts/content/yard-bot.ts`);
  L.push('');
  // 0. hard promises
  const broken = all.flatMap((r) => r.broken.map((b) => `${r.spec.kind}/${r.spec.hand}/${r.spec.habit}/${r.spec.route}/s${r.spec.seed} t=${Math.round(b.t)}: ${b.what}`));
  const gates = all.flatMap((r) => r.gate.map((g) => `s${r.spec.seed} ${r.spec.hand}/${r.spec.habit}/${r.spec.route}: ${g}`));
  L.push(`0. HARD PROMISES (8.3) on ${all.length} runs: ${broken.length ? `${broken.length} BROKEN` : 'none broken'}; tick = jump minute by minute on ${all.filter((r) => r.spec.gate).length} runs: ${gates.length ? `${gates.length} minutes DIFFER` : 'equal'}`);
  for (const x of [...broken, ...gates].slice(0, 12)) L.push(`   ${x}`);
  const refusedKeys: Record<string, number> = {};
  for (const r of all) for (const f of r.refused) refusedKeys[f.key] = (refusedKeys[f.key] ?? 0) + 1;
  L.push(`   presses refused (all runs): ${JSON.stringify(refusedKeys)}`);
  const ceil = (rs: Summary[]) => rs.map((r) => r.ceiling.filter((q) => q.t <= 3600).length);
  const hourRuns = pick((s) => s.kind === 'hour');
  L.push(`   cards locked by the capacity ceiling in the hour (8.4: at most once): max ${Math.max(0, ...ceil(hourRuns))} items on a run; runs with more than one: ${ceil(hourRuns).filter((x) => x > 1).length}/${hourRuns.length}; in three days: ${pick((s) => s.kind === 'days').map((r) => r.ceiling.map((q) => `${q.key}@${(q.t / 3600).toFixed(1)}h`).join(',') || '-').join('  ')}`);
  L.push('');
  // 1. beats
  L.push('1. BEATS (1.2, 1.3): range, median, share in band');
  const cols: [string, Summary[]][] = [
    ['normal goal A', N],
    ['normal all A', hour('normal', 'all')],
    ['normal goal B', hour('normal', 'goal', 'B')],
    ['brisk goal A', hour('brisk', 'goal')],
    ['slow goal A', hour('slow', 'goal')],
  ];
  for (const bt of BEATS) {
    L.push(` ${bt.name} [${mmss(bt.lo)}-${mmss(bt.hi)}]`);
    // E14: on route B the first paid ticket is the copper ticket and its band is 35 s.
    for (const [name, rs] of cols) if (rs.length) L.push(`   ${name.padEnd(14)} ${beatRow(rs, bt.key, bt.lo, bt.key === 'ticket' && name.endsWith(' B') ? 35 : bt.hi)}`);
  }
  const slow = hour('slow', 'goal');
  if (slow.length) {
    const within: string[] = [];
    for (const bt of BEATS.filter((x) => x.slowAfter)) {
      let ok = 0;
      let n = 0;
      for (const s of slow) {
        const nn = N.find((r) => r.spec.seed === s.spec.seed);
        const a = nn?.first[bt.key];
        const z = s.first[bt.key];
        if (a === undefined) continue;
        n++;
        if (z !== undefined && z <= 1.5 * a) ok++;
      }
      within.push(`${bt.key} ${ok}/${n}`);
    }
    L.push(` slow within 1.5 x normal on the same seed (after 2:00): ${within.join(', ')}`);
  }
  // rivals
  const riv = N.map((r) => r.passed.filter((t) => t <= 3600).length);
  L.push(` rivals passed in the hour (normal goal A): min ${Math.min(...riv)}, med ${med(riv)}, max ${Math.max(...riv)}; first pass med ${mmss(med(N.map((r) => r.passed[0] ?? Infinity)))}`);
  L.push('');
  // 2. income windows
  L.push('2. SALES AND NET A MINUTE BY FIVE-MINUTE WINDOW (median of seeds)');
  L.push(`   window          ${Array.from({ length: 18 }, (_, w) => pad(`${w * 5}-${w * 5 + 5}`, 6)).join('')}`);
  L.push(`   E28 aim         ${[120, 250, 450, 800, 1300, 1800, 1980, 2178, 2396, 2635, 2899, 3189].map((x) => pad(x, 6)).join('')}`);
  for (const [name, rs] of cols) {
    if (!rs.length) continue;
    for (const f of ['sales', 'net'] as const) {
      const W = rs.map((r) => windows(r, f));
      L.push(`   ${`${name} ${f}`.padEnd(16)}${Array.from({ length: 18 }, (_, w) => pad(W.some((x) => x[w] !== undefined) ? Math.round(med(W.map((x) => x[w]).filter((x) => x !== undefined))) : '-', 6)).join('')}`);
    }
  }
  const falls = N.map((r) => windows(r, 'sales').slice(1, 12).filter((x, i, a) => i > 0 && x < a[i - 1]).length);
  L.push(`   normal goal A: windows under the one before (after minute 5): med ${med(falls)}, max ${Math.max(...falls)}`);
  for (const [name, rs] of cols) {
    if (!rs.length) continue;
    const last = rs.map((r) => windows(r, 'sales')[11]);
    const late = rs.map((r) => windows(r, 'sales').slice(6, 12).filter((x, i, a) => i > 0 && x < a[i - 1]).length);
    L.push(`   E31c ${name.padEnd(14)}: sales 55-60 >= §2,000 a minute on ${last.filter((x) => x >= 2000).length}/${rs.length} (med §${Math.round(med(last))}); a window in minutes 30-60 under the one before: ${late.filter((x) => x === 0).length}/${rs.length} runs have none (med ${med(late)}, max ${Math.max(...late)})`);
    const w90 = rs.map((r) => windows(r, 'sales')).filter((w) => w.length >= 18);
    if (w90.length) {
      const late90 = w90.map((w) => w.slice(12, 18).filter((x, i, a) => i > 0 && x < a[i - 1]).length);
      L.push(`        ${''.padEnd(14)}  minutes 60-90 (runs played to 90): sales 85-90 med §${Math.round(med(w90.map((w) => w[17])))}, >= §2,000 on ${w90.filter((w) => w[17] >= 2000).length}/${w90.length}; windows 60-90 mean §${Math.round(med(w90.map((w) => w.slice(12, 18).reduce((a, x) => a + x, 0) / 6)))} against 55-60 §${Math.round(med(w90.map((w) => w[11])))}; a window in 60-90 under the one before: med ${med(late90)}, max ${Math.max(...late90)}`);
    }
  }
  L.push('');
  // 3. tonnes, rank, cash, R through the hour
  L.push('3. THROUGH THE HOUR (normal goal A, median): supplied t, rank, cash §, rated capacity t/h, reserve §');
  for (const m of [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90]) {
    const row = N.map((r) => r.minutes.find((x) => Math.round(x.t / 60) >= m) ?? r.minutes.at(-1)!);
    L.push(`   min ${pad(m, 2)}  ${pad((med(row.map((x) => x.supplied_g)) / 1e6).toFixed(2), 6)} t  rank ${pad(med(row.map((x) => x.rank)), 2)}  cash ${pad(Math.round(med(row.map((x) => x.cash))), 7)}  R ${pad(med(row.map((x) => x.R)).toFixed(1), 6)}  reserve ${pad(Math.round(med(row.map((x) => x.reserve))), 6)}`);
  }
  const allRun = hour('normal', 'all');
  for (const [name, rs] of [['normal goal A', N], ['normal all A', allRun]] as const) {
    if (!rs.length) continue;
    const byRung = [1, 2, 3].map((k) => Math.max(...rs.flatMap((r) => r.minutes.filter((x) => (r.rungs[k + 1] === undefined || x.t < r.rungs[k + 1]) && (k === 1 || (r.rungs[k] !== undefined && x.t >= r.rungs[k]))).map((x) => x.R))));
    L.push(`   ${name}: highest rated capacity reached on rung 1 / 2 / 3: ${byRung.map((x) => (Number.isFinite(x) ? x.toFixed(1) : '-')).join(' / ')} t/h`);
  }
  L.push('');
  // 4. goal list
  L.push('4. THE GOAL PURCHASES (normal goal A): price, median minute bought, held at its card (cash after the purchase before / price), wait over 3 min');
  const keys = [...new Set(N.flatMap((r) => r.purchases.filter((p) => p.goal).map((p) => p.key)))];
  for (const k of keys) {
    const rows = N.map((r) => {
      const ps = r.purchases.filter((p) => p.goal);
      const i = ps.findIndex((p) => p.key === k);
      if (i < 0) return null;
      const prev = i > 0 ? ps[i - 1] : { t: 0, cashAfter: 0 };
      return { t: ps[i].t, price: ps[i].price, held: prev.cashAfter / ps[i].price, wait: ps[i].t - prev.t, atCard: (ps[i].cashAtCard ?? NaN) / ps[i].price, walk: ps[i].walkToBuy_s ?? NaN };
    }).filter((x): x is { t: number; price: number; held: number; wait: number; atCard: number; walk: number } => !!x);
    if (!rows.length) continue;
    L.push(`   ${k.padEnd(9)} §${pad(Math.round(med(rows.map((r) => r.price))), 6)}  ${mmss(med(rows.map((r) => r.t)))}  held ${med(rows.map((r) => r.held)).toFixed(2)}  cash at card ${med(rows.map((r) => r.atCard)).toFixed(2)} x  walk-to-buy med ${Math.round(med(rows.map((r) => r.walk)))} s max ${Math.round(Math.max(...rows.map((r) => r.walk).filter(Number.isFinite)))} s  waits>3min ${rows.filter((r) => r.wait > 180).length}/${rows.length} (max ${Math.round(Math.max(...rows.map((r) => r.wait)))} s)  bought ${rows.length}/${N.length}`);
  }
  for (const [name, rs] of cols) {
    if (!rs.length) continue;
    const w = rs.flatMap((r) => r.purchases.filter((p) => p.t <= 3600 && p.walkToBuy_s !== undefined).map((p) => p.walkToBuy_s!));
    L.push(`   walk-to-buy at ${name.padEnd(14)} (every purchase of the hour): med ${Math.round(med(w))} s, max ${Math.round(Math.max(...w))} s over ${w.length} purchases`);
  }
  const gaps = N.map((r) => {
    const ts = [0, ...r.purchases.filter((p) => p.t <= 3600).map((p) => p.t)];
    return ts.slice(1).map((t, i) => ({ gap: t - ts[i], at: ts[i] })).filter((g) => g.gap > 180);
  });
  L.push(`   purchase gaps over three minutes (any purchase): ${gaps.map((g, i) => `s${N[i].spec.seed}:${g.map((x) => `${mmss(x.at)}+${Math.round(x.gap / 60)}m`).join(',') || '-'}`).join('  ')}`);
  const prompts = N.map((r) => Math.max(0, ...r.prompts.slice(0, 60)));
  L.push(`   purchase prompts a minute (most in any minute): med ${med(prompts)}, max ${Math.max(...prompts)}`);
  if (allRun.length) {
    const ahead = allRun.map((r) => {
      const nn = N.find((x) => x.spec.seed === r.spec.seed);
      if (!nn) return [0, 0];
      const worst = [10, 30].map((upto) => {
        let w = 0;
        for (let m = 1; m <= upto; m++) {
          const a = r.purchases.filter((p) => p.goal && p.t <= m * 60).length;
          const g = nn.purchases.filter((p) => p.goal && p.t <= m * 60).length;
          w = Math.max(w, a - g);
        }
        return w;
      });
      return worst;
    });
    L.push(`   burst (8.4: at most two ahead by minute 10): habit all ahead of habit goal in goal purchases owned, minutes 1-10: max ${Math.max(...ahead.map((a) => a[0]))} (seeds over 2: ${ahead.filter((a) => a[0] > 2).length}/${ahead.length}); minutes 1-30: max ${Math.max(...ahead.map((a) => a[1]))}`);
  }
  L.push('');
  // 5. the hand against the card manager; away
  const mgr = pick((s) => s.kind === 'manager');
  if (mgr.length) {
    const ratio = mgr.map((m) => {
      const n = N.find((r) => r.spec.seed === m.spec.seed);
      const e = (r: Summary) => r.minutes.find((x) => Math.round(x.t / 60) >= 60)?.earned ?? r.minutes.at(-1)!.earned;
      return n ? e(n) / Math.max(1, e(m)) : NaN;
    });
    L.push(`5. THE HAND AGAINST THE CARD MANAGER (earned by minute 60, normal / manager): med ${med(ratio).toFixed(2)}, min ${Math.min(...ratio).toFixed(2)} (E4 aim >= 1.20)`);
  }
  const aw = N.map((r) => r.extra.away as Record<string, number> | undefined).filter(Boolean) as Record<string, number>[];
  if (aw.length) {
    const share = N.map((r) => {
      const a = (r.extra.away as Record<string, number> | undefined)?.['60m+1h'];
      const m60 = r.minutes.find((x) => Math.round(x.t / 60) >= 60) ?? r.minutes.at(-1)!;
      const m50 = r.minutes.find((x) => Math.round(x.t / 60) >= 50) ?? r.minutes.at(-1)!;
      return a === undefined ? NaN : a / Math.max(1, (m60.earned - m50.earned) * 6);
    });
    L.push(`   an hour away from minute 60 against an hour played at minute 60's pace (minutes 50-60 x 6): med ${med(share).toFixed(2)}, min ${Math.min(...share).toFixed(2)} (S13 aim >= 0.3; E19 asks played >= 1.25 x away, i.e. this <= 0.8)`);
    const ks = Object.keys(aw[0]).filter((k) => k !== '60m+1h');
    L.push(`   stop and return (earned on the away card, median; S13: above zero): ${ks.map((k) => `${k} §${Math.round(med(aw.map((a) => a[k])))} (zero on ${aw.filter((a) => !(a[k] > 0)).length})`).join(', ')}`);
  }
  L.push('');
  const bs = N.map((r) => r.extra.burst as Record<string, { earned: number; ran_s: number; cash: number; left: number; leftSum: number; buys: number; buysSum: number; delivered: number }> | undefined).filter(Boolean) as Record<string, { earned: number; ran_s: number; cash: number; left: number; leftSum: number; buys: number; buysSum: number; delivered: number }>[];
  if (bs.length) {
    L.push('   E33 THE BURST (normal goal A, median): the away card, how long the yard ran, cash after it, and how much of the goal list that buys at once');
    for (const k of ['5m+1h', '5m+4h', '5m+12h', '10m+4h', '15m+1h', '15m+4h', '15m+12h', '30m+4h', '30m+12h']) {
      const xs = bs.map((b) => b[k]).filter(Boolean);
      if (!xs.length) continue;
      L.push(`   ${k.padEnd(8)} away §${pad(Math.round(med(xs.map((x) => x.earned))), 6)}  ran ${pad(Math.round(med(xs.map((x) => x.ran_s)) / 60), 4)} min  cash §${pad(Math.round(med(xs.map((x) => x.cash))), 6)}  buys ${med(xs.map((x) => x.buys))} of ${med(xs.map((x) => x.left))} goal purchases left (§${Math.round(med(xs.map((x) => x.buysSum)))} of §${Math.round(med(xs.map((x) => x.leftSum)))}; max ${Math.max(...xs.map((x) => x.buys))})  deal deliveries ${med(xs.map((x) => x.delivered))}`);
    }
  }
  const nw = N.map((r) => r.extra.night as Record<string, number> | undefined).filter(Boolean) as Record<string, number>[];
  if (nw.length) {
    L.push(`   the Night watch's worth: what it adds to one 12 h absence (median, min-max): ${['15m+12h', '30m+12h', '60m+12h'].map((k) => `${k} §${Math.round(med(nw.map((x) => x[k])))} (${Math.round(Math.min(...nw.map((x) => x[k] ?? NaN)))}-${Math.round(Math.max(...nw.map((x) => x[k] ?? NaN)))})`).join(', ')}`);
  }
  L.push('');
  // P20: minutes 5 to 10 at a person's hand
  L.push("P20. MINUTES 5 TO 10 AT A PERSON'S HAND: what a minute of the boss's own work pays (today's value weighed by him / 5), the walks on foot");
  for (const [name, rs] of cols) {
    if (!rs.length) continue;
    const pay = rs.map((r) => r.bossIns.filter((q) => q.t >= 300 && q.t < 600).reduce((a, q) => a + q.v, 0) / 5);
    const longest = rs.map((r) => Math.max(0, ...r.walks.filter((q) => q.t >= 300 && q.t < 600).map((q) => q.m)));
    const longestS = rs.map((r) => Math.max(0, ...r.walks.filter((q) => q.t >= 300 && q.t < 600).map((q) => q.s)));
    const walkShare = rs.map((r) => r.walks.filter((q) => q.t >= 300 && q.t < 600).reduce((a, q) => a + q.s, 0) / 300);
    L.push(`   ${name.padEnd(14)} § a minute of his work: med ${Math.round(med(pay))} (range ${Math.round(Math.min(...pay))}-${Math.round(Math.max(...pay))}); longest walk med ${med(longest).toFixed(1)} m / ${Math.round(med(longestS))} s (max ${Math.max(...longest).toFixed(1)} m); share of the five minutes on foot med ${(med(walkShare) * 100).toFixed(0)} %`);
  }
  L.push('');
  // 6. days
  const days = pick((s) => s.kind === 'days');
  if (days.length) {
    L.push('6. THREE DAYS, TWICE A DAY (a first hour, then 15 minutes every 11.75 h): per sitting, purchases, cash before / after, the away pass');
    for (const d of days) {
      const ss = d.extra.sittings as { at_h: number; awayEarned: number; bought: number; cashBefore: number; cashAfter: number; useful: boolean; rank: number }[];
      L.push(`   seed ${d.spec.seed}: ${ss.map((s) => `h${s.at_h}: +${s.bought} (§${Math.round(s.cashBefore / 1000)}k -> §${Math.round(s.cashAfter / 1000)}k, away §${Math.round(s.awayEarned / 1000)}k, rank ${s.rank})`).join('; ')}`);
      const dayIncome = ss.slice(-2).reduce((a, s) => a + s.awayEarned, 0);
      L.push(`      a sitting without a purchase: ${ss.filter((s) => !s.useful).length}/${ss.length}; cash at the end §${Math.round(ss.at(-1)!.cashAfter / 1000)}k against a day's income §${Math.round(dayIncome / 1000)}k`);
    }
  }
  const hold = pick((s) => s.kind === 'holder');
  if (hold.length && days.length) {
    const g = hold.map((h) => {
      const d = days.find((x) => x.spec.seed === h.spec.seed);
      return d ? (h.extra.earned as number) / (d.extra.earned as number) - 1 : NaN;
    });
    L.push(`   the day-word holder against the same days without Hold, lifetime earnings at day 3: ${g.map((x) => `${(x * 100).toFixed(1)} %`).join(', ')} (E40 after RULING2.md 14.6: lose at most a tenth)`);
    type Mk = Record<string, { earned: number; t: number; stock: number }>;
    for (const at of ['day1', 'day3']) {
      const q = hold.map((h) => {
        const d = days.find((x) => x.spec.seed === h.spec.seed);
        const a = (h.extra.marks as Mk | undefined)?.[at];
        const z = (d?.extra.marks as Mk | undefined)?.[at];
        if (!a || !z) return null;
        return { seed: h.spec.seed, e: a.earned / z.earned - 1, es: (a.earned + a.stock) / (z.earned + z.stock) - 1, t: a.t / z.t - 1, hs: a.stock, ns: z.stock };
      }).filter((x): x is { seed: number; e: number; es: number; t: number; hs: number; ns: number } => !!x);
      if (!q.length) continue;
      const pc = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} %`;
      L.push(`   ${at}: holder / without Hold, earnings ${q.map((x) => pc(x.e)).join(' ')} (med ${pc(med(q.map((x) => x.e)))}; within a tenth on ${q.filter((x) => x.e >= -0.1).length}/${q.length}); earnings + stock at usual prices ${q.map((x) => pc(x.es)).join(' ')} (med ${pc(med(q.map((x) => x.es)))}); supplied t ${q.map((x) => pc(x.t)).join(' ')}; stock held §${q.map((x) => `${Math.round(x.hs / 1000)}k/${Math.round(x.ns / 1000)}k`).join(' ')}`);
    }
  }
  const nh = pick((s) => s.kind === 'nohand');
  if (nh.length) {
    L.push('7. NO HAND (E4, E24): states of a normal run, the stick never touched; the next goal purchase reached within 30 min');
    for (const r of nh) {
      const rows = r.extra.nohand as { m: number; cash: number; next: string | null; price: number | null; reachedAfter_s: number | null; hired: number }[];
      const withHire = rows.filter((x) => x.hired > 0 && x.price !== null);
      L.push(`   seed ${r.spec.seed}: reached on ${withHire.filter((x) => x.reachedAfter_s !== null).length}/${withHire.length} states from the first hire; ${rows.map((x) => `m${x.m} ${x.next ?? '-'}:${x.reachedAfter_s === null ? (x.price === null ? 'n/a' : 'NO') : mmss(x.reachedAfter_s)}`).join(' ')}`);
    }
  }
  incomeSection(L, all);
  L.push('');
  L.push(`run time: ${Math.round(all.reduce((a, r) => a + r.ms, 0) / 1000)} s of CPU over ${all.length} runs`);
  return L.join('\n');
}

/**
 * Section 8: rated income I against G, on yards played with flat prices and with the normal board, and the gate
 * of RULING2.md 14.10 (it replaces 14.5's count and I5's band): at each named moment (rung 3's entry, minute
 * 90, day 1, day 2, day 3), on each board, the MEDIAN of I/G within 0.95 to 1.05, at least 13 of 15 seeds (the
 * same share of the seeds run) within 0.88 to 1.12, none outside 0.80 to 1.25. Rung 2's entry and minute 60
 * are printed, not gated. A miss names the moment; the account (notes/s2a-engine2-income2.md) names the term.
 */
const INCOME_GATED = ['rung3', 'm90', 'day1', 'day2', 'day3'];
function incomeSection(L: string[], all: Summary[]): void {
  type Row = { at: string; t: number; rung: number; ran_h: number; G: number; I: number; bind: string; Isales: number; Ispent: number; sales: number; spent: number; stock: number };
  const misses: string[] = [];
  let moments = 0;
  for (const board of ['flat', 'normal'] as const) {
    const inc = all.filter((r) => r.spec.kind === 'income' && (r.spec.board ?? 'flat') === board);
    if (!inc.length) continue;
    L.push('');
    L.push(
      board === 'flat'
        ? '8. RATED INCOME I AGAINST THE AWAY INCOME G (stage 2 2.3.3, RULING2.md 14.10; PLAYED WITH PRICES FLAT, board.a 0; normal hand, goal habit, route A; G = (net cash + stock left at p̄ − at the start) / hours the yard ran, a capped absence at usual prices)'
        : '8b. THE SAME ON YARDS PLAYED WITH THE NORMAL PRICE BOARD (RULING2.md 14.5, 14.10; G still at usual prices, board.a 0)',
    );
    L.push('   gate (14.10) at each moment: median of I/G in 0.95-1.05; at least 13 of 15 seeds in 0.88-1.12; none outside 0.80-1.25');
    for (const at of ['rung2', 'rung3', 'hour', ...INCOME_GATED.slice(1)]) {
      const rows = inc.map((r) => ({ r, x: (r.extra.income as Row[]).find((x) => x.at === at) })).filter((q): q is { r: Summary; x: Row } => !!q.x);
      if (!rows.length) continue;
      const q = rows.map(({ x }) => x.I / x.G);
      const m = med(q);
      const within = q.filter((x) => x >= 0.88 && x <= 1.12).length;
      const out = q.filter((x) => x < 0.8 || x > 1.25).length;
      const gated = INCOME_GATED.includes(at);
      const ok = m >= 0.95 && m <= 1.05 && within >= Math.ceil((13 / 15) * rows.length) && out === 0;
      if (gated) {
        moments++;
        if (!ok) misses.push(`${board} ${at}`);
      }
      L.push(`   ${(at === 'hour' ? 'm60' : at).padEnd(5)} I/G med ${m.toFixed(3)}, ${within}/${rows.length} seeds in 0.88-1.12, min ${Math.min(...q).toFixed(3)}, max ${Math.max(...q).toFixed(3)}, ${out} outside 0.80-1.25: ${gated ? (ok ? 'met' : 'MISSED') : 'printed, not gated'}`);
      for (const { r, x } of rows) {
        L.push(`      s${pad(r.spec.seed, 3)} t ${mmss(x.t)} rung ${x.rung} ran ${x.ran_h.toFixed(1)} h: G §${pad(Math.round(x.G), 6)} (sales ${Math.round(x.sales)} − loads ${Math.round(x.spent)} + stock ${Math.round(x.stock)})  I §${pad(Math.round(x.I), 6)} (sales ${Math.round(x.Isales)} − loads ${Math.round(x.Ispent)}, binds ${x.bind})  I/G ${(x.I / x.G).toFixed(3)}`);
      }
    }
  }
  if (moments) L.push('', `   GATE (14.10, the band): ${moments - misses.length}/${moments} moments met${misses.length ? `; MISSED: ${misses.join(', ')}` : ''}: ${misses.length ? 'NOT MET' : 'MET'} (I's monotonicity is tested apart: rateIncome2.test.ts on the test content; the account's walk on the real content)`);
}

// ============================================================================================ main

async function main(): Promise<void> {
  const gameFile = path.resolve(ROOT, arg('game', 'games/scrap-yard/game.json')!);
  snapHash = createHash('sha1').update(fs.readFileSync(gameFile)).update(fs.readFileSync(path.join(ROOT, 'src/engine/salvage/bot.ts'))).update(String(arg('stage', '0'))).digest('hex');
  gameHash = createHash('sha1').update(snapHash).update(fs.readFileSync(fileURLToPath(import.meta.url))).update(String(arg('stage', '0'))).digest('hex');
  const one = arg('one');
  if (one) {
    const cfg = loadCfg(gameFile);
    const s = runOne(cfg, JSON.parse(one) as Spec);
    process.stdout.write(`${JSON.stringify(s)}\n`);
    return;
  }
  const unseen = arg('unseen') === 'true';
  const nSeeds = Number(arg('seeds', '15'));
  const first = Number(arg('first', '1'));
  const seeds = unseen ? [101, 102, 103, 104, 105] : Array.from({ length: nSeeds }, (_, i) => i + first);
  const routes = Number(arg('routes', '2')) >= 2 ? ['A', 'B'] : ['A'];
  // --stage 2 (content2-bots): the bots of yard-stage2.md 8.2 on the real content read at release.stage 2. --bots a,b,c picks
  // them (default every one); --shard i/n runs every n-th spec from i (a background command here is stopped after 30 min:
  // run the shards one after another with the same --cache, then once more without --shard to print the table).
  if (Number(arg('stage', '0')) === 2) {
    const asked = (arg('bots', DEFAULT2.join(',')) ?? '').split(',') as Bot2[];
    // s2e-bots: a habit that no longer means anything on the stage as built is dropped with its line.
    for (const n of asked) if (DROPPED2[n]) process.stderr.write(`dropped ${n}: ${DROPPED2[n]}\n`);
    const names = asked.filter((n) => !DROPPED2[n]);
    let specs2: Spec[] = [];
    for (const seed of seeds) for (const bot of names) specs2.push({ kind: 'stage2', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed, bot, gate: bot === 'normal', tag: `${gameHash.slice(0, 12)}${arg('plates') ? 'p' : ''}${arg('walk2') ? 'w' : ''}${arg('book') ? 'b' : ''}${arg('person') ? 'q' : ''}${arg('bench') ? 'x' : ''}${S2_SITTINGS}` });
    const sh = arg('shard');
    if (sh) {
      const [i, n] = sh.split('/').map(Number);
      specs2 = specs2.filter((_, k) => k % n === i);
    }
    // --from a.json,b.json: print the report again from runs already made (no play).
    const from = arg('from');
    const all2 = from ? from.split(',').flatMap((f) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')) as Summary[]) : await runAll(gameFile, specs2, Number(arg('jobs', '2')));
    cfgPacks = packProducts(loadCfg(gameFile));
    const cfgG = loadCfg(gameFile);
    soldKeys = new Set(soldItems(cfgG).map((i) => i.key));
    contentAtRunsKappa = ((cfgG.salvage as unknown as { rate?: { kappa?: (number | null)[] } }).rate?.kappa ?? null);
    const platesLines = arg('plates') ? writePlates(all2, gameFile, arg('plates') === 'write') : null;
    const bookLines = arg('book') === 'write' ? writeBook(all2) : [];
    const json2 = arg('json');
    if (json2) fs.writeFileSync(path.resolve(json2), JSON.stringify(all2));
    const seeds2 = from ? [...new Set(all2.map((r) => r.spec.seed))].sort((a, b) => a - b) : seeds;
    const W2: string[] = [];
    walkSection(W2, all2);
    const tauH2 = (cfgG.salvage as unknown as { tau_h: (number | null)[] }).tau_h;
    process.stdout.write(`${report2(all2, seeds2)}\n\n${report8(all2, tauH2)}\n${W2.join('\n')}\n\n${reportS2e(all2, tauH2, platesLines)}\n${bookLines.join('\n')}\n`);
    process.exit(all2.some((r) => r.broken.length || ((r.extra.s2 as Bot['rec']['s2'])?.gate ?? []).length) ? 2 : 0);
  }
  const only = (arg('only', 'beats,hand,away,days,nohand,gate,income,walk') ?? '').split(',');
  const jobs = Number(arg('jobs', '2'));
  const specs: Spec[] = [];
  // REPORT7: the hour runs are played to minute 90 (E31c: the first half hour after rung 3 shows what the runs do).
  const base = { kind: 'hour' as const, minutes: Number(arg('minutes', '90')) };
  // --only income alone: only the income runs (the flat and the normal board on every seed), and only
  // section 8 in the report.
  const incomeOnly = only.length === 1 && only[0] === 'income';
  const walkOnly = only.length === 1 && only[0] === 'walk';
  for (const seed of seeds) {
    if (!incomeOnly && !walkOnly) specs.push({ ...base, hand: 'normal', habit: 'goal', route: 'A', seed, gate: only.includes('gate') });
    if (only.includes('beats')) {
      specs.push({ ...base, hand: 'normal', habit: 'all', route: 'A', seed });
      if (routes.includes('B')) specs.push({ ...base, hand: 'normal', habit: 'goal', route: 'B', seed });
      specs.push({ ...base, hand: 'brisk', habit: 'goal', route: 'A', seed });
      specs.push({ ...base, hand: 'slow', habit: 'goal', route: 'A', seed, minutes: Math.max(100, base.minutes) });
    }
    if (only.includes('hand')) specs.push({ ...base, kind: 'manager', hand: 'normal', habit: 'goal', route: 'A', seed, manager: true });
    if (only.includes('income')) specs.push({ kind: 'income', minutes: 90, hand: 'normal', habit: 'goal', route: 'A', seed, board: 'flat' });
    if (only.includes('walk')) specs.push({ kind: 'walk', minutes: 90, hand: 'normal', habit: 'goal', route: 'A', seed });
  }
  // RULING2.md 14.10: the normal board on every seed too (engine2-income2).
  if (only.includes('income')) for (const seed of seeds) specs.push({ kind: 'income', minutes: 90, hand: 'normal', habit: 'goal', route: 'A', seed, board: 'normal' });
  const few = seeds.slice(0, Math.min(Number(arg('daysSeeds', '3')), seeds.length));
  for (const seed of few) {
    if (only.includes('days')) {
      specs.push({ kind: 'days', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed });
      specs.push({ kind: 'holder', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed, holder: true });
    }
    if (only.includes('nohand')) specs.push({ kind: 'nohand', minutes: 42, hand: 'normal', habit: 'goal', route: 'A', seed });
  }
  // --handFirst: the what-if of REPORT6 (bot.ts BotOptions.handFirst), every run.
  if (arg('handFirst') === 'true') for (const sp of specs) sp.handFirst = true;
  const all = await runAll(gameFile, specs, jobs);
  const json = arg('json');
  if (json) fs.writeFileSync(path.resolve(json), JSON.stringify(all));
  let text: string;
  if (incomeOnly) {
    const L: string[] = [`Rated income tables (the real rules, ${seeds.length} seeds: ${seeds[0]}..${seeds.at(-1)}), generated by scripts/content/yard-bot.ts --only income`];
    const broken = all.flatMap((r) => r.broken.map((b) => `${r.spec.kind}/${r.spec.board}/s${r.spec.seed} t=${Math.round(b.t)}: ${b.what}`));
    L.push(`0. HARD PROMISES (8.3) on ${all.length} runs: ${broken.length ? `${broken.length} BROKEN` : 'none broken'}`);
    for (const x of broken.slice(0, 12)) L.push(`   ${x}`);
    incomeSection(L, all);
    text = L.join('\n');
  } else if (walkOnly) {
    const L: string[] = [`The purchase walk (the real rules, ${seeds.length} seeds: ${seeds[0]}..${seeds.at(-1)}), generated by scripts/content/yard-bot.ts --only walk`];
    walkSection(L, all);
    text = L.join('\n');
  } else {
    const L = [report(all, seeds)];
    walkSection(L, all);
    text = L.join('\n');
  }
  process.stdout.write(`${text}\n`);
  const broken = all.some((r) => r.broken.length || r.gate.length);
  process.exit(broken ? 2 : 0);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? e}\n`);
  process.exit(4);
});
