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
import { begin, finish } from '../../src/engine/salvage/clock';
import { buyCheck, hireCheck, levelCheck } from '../../src/engine/salvage/ladder';
import { own } from '../../src/engine/salvage/rate';

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
  // real content's key stays 1 (ruling 18.1 S1). The shared product list rides along (the shop reads cfg.monetization).
  const stage = Number(arg('stage', '0'));
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
  const steps: [string, () => R.SalvageGame][] = [];
  for (const role of ['hand', 'cutter', 'driver'] as const) {
    const ck = hireCheck(cfg, g, role);
    if (ck.price !== null && !ck.refusal) steps.push([`hire ${role}`, () => R.hire(cfg, g, role, ck.price!, t)]);
  }
  const roles = new Set<string>();
  for (const m of g.salvage.crew) {
    if (roles.has(m.role)) continue; // one of each role (the cheapest step is the first of its kind)
    const ck = levelCheck(cfg, g, { kind: 'crew', id: m.id });
    if (ck.price !== null && !ck.refusal) { roles.add(m.role); steps.push([`level ${m.role}`, () => R.level(cfg, g, { kind: 'crew', id: m.id }, ck.price!, t)]); }
  }
  for (const id of ['stripper', 'bench', 'crucible'] as const) {
    const ck = levelCheck(cfg, g, { kind: 'machine', machine: id });
    if (ck.price !== null && !ck.refusal) steps.push([`level ${id}`, () => R.level(cfg, g, { kind: 'machine', machine: id }, ck.price!, t)]);
  }
  for (const pid of Object.keys(g.salvage.partners)) {
    const ck = levelCheck(cfg, g, { kind: 'partner', partner: pid });
    if (ck.price !== null && !ck.refusal) steps.push([`level ${pid}`, () => R.level(cfg, g, { kind: 'partner', partner: pid }, ck.price!, t)]);
  }
  for (const pid of Object.keys(g.salvage.works)) {
    const ck = levelCheck(cfg, g, { kind: 'plate', plate: pid } as never);
    if (ck.price !== null && !ck.refusal) steps.push([`level plate ${pid}`, () => R.level(cfg, g, { kind: 'plate', plate: pid } as never, ck.price!, t)]);
  }
  const seen = new Set<string>();
  for (const it of [...contentAt(cfg.salvage, g.salvage).shop, ...cfg.salvage.dayOneList]) {
    if (it.kind === 'crew' || seen.has(it.key)) continue;
    seen.add(it.key);
    const ck = buyCheck(cfg, g, it.key as never);
    if (ck.price !== null && !ck.refusal) steps.push([`buy ${it.key}`, () => R.buy(cfg, g, it.key as never, ck.price!, t)]);
  }
  const rows: { step: string; d: number }[] = [];
  for (const [name, f] of steps) {
    try {
      const h = landed(cfg, { ...f(), cash: 1e12 } as R.SalvageGame);
      rows.push({ step: name, d: (walkG(cfg, h, b0.h).G - b0.G) / b0.G });
    } catch (e) {
      rows.push({ step: `${name} (threw: ${String((e as Error).message).slice(0, 60)})`, d: NaN });
    }
  }
  return { at, rung: g.salvage.ladder.rung, G: Math.round(b0.G), noise: (walkG(noise, g, b0.h).G - b0.G) / b0.G, rows };
}

/** 9. THE PURCHASE WALK (RULING2.md 17.1): per moment and step, the mean change of G over the seeds (a seed's several crew of one role averaged), the worst seed, and the noise floor. */
function walkSection(L: string[], all: Summary[]): void {
  type W = { at: string; rung: number; G: number; noise: number; rows: { step: string; d: number }[] };
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
      L.push(`   ${step.padEnd(26)} n ${pad(per.length, 2)}  mean ${pc(mean).padStart(9)}  worst ${pc(worst.d).padStart(9)} (s${worst.seed})${bad ? '  FAILS' : ''}`);
    }
  }
  L.push(` GATE (17.1): ${fails ? `${fails} of ${n} steps FAIL` : `met on all ${n} steps`}`);
}

// ============================================================================================ stage 2 (yard-stage2.md 8.2; content2-bots)

/** The bots of 8.2's table, each a habit on the first yard's normal hand unless it names another hand. */
type Bot2 = 'normal' | 'brisk' | 'slow' | 'manager' | 'always' | 'packs' | 'ads' | 'racker' | 'cutter' | 'holder' | 'steelMax' | 'leadCut' | 'flat' | 'behind' | 'noise';
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
};
/** The bots a plain --stage 2 call runs (the variants are asked for by name). */
const DEFAULT2: Bot2[] = ['normal', 'brisk', 'slow', 'manager', 'always', 'packs', 'ads', 'racker', 'cutter', 'holder', 'steelMax', 'leadCut'];
/** The bots whose sittings measure G (a capped absence at usual prices from each return) beside I (REPORT8). */
const MEASURES_G = new Set<Bot2>(['normal', 'flat']);
/** The bots whose first part (to the works' opening) is the normal hand's own: they share one snapshot per seed. */
const SHARES_NORMAL = new Set<Bot2>(['normal', 'always', 'packs', 'ads', 'racker', 'cutter', 'steelMax', 'leadCut', 'behind', 'noise']);
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

/** The content variants of the measurement (BOTS2's comment): flat board, ahead false, the noise floor. */
function variant(cfg: R.SalvageConfig, which: Bot2): R.SalvageConfig {
  const c = cfg.salvage as R.SalvageConfig['salvage'] & { group: Record<string, unknown> };
  if (which === 'leadCut') return leadCut(cfg);
  if (which === 'flat') return { ...cfg, salvage: { ...c, board: { ...c.board, a: 0 } } } as R.SalvageConfig;
  if (which === 'behind') return { ...cfg, salvage: { ...c, group: { ...c.group, ahead: false } } } as R.SalvageConfig;
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
  G?: number;
  Iback?: number;
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
  for (let k = 1; k <= S2_SITTINGS && b.g.salvage.ladder.rung < 5; k++) {
    newSitting(b);
    const cash0 = b.g.cash;
    const a = performance.now();
    away(b, S2_AWAY_S);
    const awayMs = performance.now() - a;
    const card = b.g.salvage.away;
    const cashBack = b.g.cash;
    const gBack = b.g;
    playTo(b, b.g.salvage.t + S2_PLAY_S);
    const ps = b.rec.purchases.slice(n0);
    if (which === 'normal' && worksOpened(gBack.salvage)) returns.push({ g: gBack, bought: ps.filter((p) => p.kind === 'buy').map((p) => p.key) });
    n0 = b.rec.purchases.length;
    const s = b.g.salvage;
    const gm = MEASURES_G.has(which) ? gAt(cfg, gBack) : null;
    if (arg('walk2') && which === 'normal' && (k === 1 || k === 6 || (gBack.salvage.ladder.rung >= 4 && !walk2.some((w) => w.rung >= 4)))) walk2.push(walk2Row(base, spec.seed, gBack, k === 1 ? 'r3s1' : k === 6 ? 'day3' : 'r4entry'));
    sittings.push({ n: k, h: +(s.t / 3600).toFixed(2), rung: s.ladder.rung, t: +(s.ladder.supplied_g / 1e6).toFixed(1), cash: Math.round(b.g.cash), cashBack: Math.round(cashBack), awayNet: Math.round(cashBack - cash0), awayBank: Math.round(card?.bank ?? 0), awayMs: Math.round(awayMs), I: Math.round(incomeAt(cfg, b.g)), bought: ps.length, spent: Math.round(ps.reduce((x, p) => x + p.price, 0)), goal: R.nextGoal(cfg, b.g)?.id ?? null, works: Object.entries(s.works).map(([id, w]) => `${id}:${w.phase[0]}${w.level}`).join(','), Lback: Math.round(gBack.lifetimeEarnings), Lend: Math.round(b.g.lifetimeEarnings), ranH: +((card?.seconds ?? 0) / 3600).toFixed(3), mats: R.rungProgress(cfg, b.g).materials ?? 0, rack: Math.round(card?.rack?.money ?? 0), van: Math.round(card?.van?.money ?? 0), ...(gm ? { G: Math.round(gm.G), Iback: Math.round(incomeAt(cfg, gBack)) } : {}) });
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
  const plates: Record<string, { at_h: number; rung: number; I: number; dI: number; bought: boolean; price?: number; G?: number; dG?: number }> = {};
  if (arg('plates') && which === 'normal') {
    const W = contentAt(cfg.salvage, returns[0]?.g.salvage ?? b.g.salvage).works;
    for (const pid of Object.keys(W?.plates ?? {})) {
      let at = returns.find((x) => x.bought.includes(pid));
      const bought = !!at;
      if (!at) at = [...returns].reverse().find((x) => !x.g.salvage.works[pid] && buyCheck(cfg, { ...x.g, cash: 1e12 }, pid as never).price !== null);
      if (!at) continue;
      // RULING2.md 19.1: from the state at the plate's planned moment WITH EVERY EARLIER PLATE OF THE GOAL ORDER OWNED: the
      // plates the bot bought before it in the same sitting are bought first (both branches), so a plate that a chain
      // completes (the eddy behind the shredder) is measured with its feed.
      let g = { ...at.g, cash: 1e12 } as R.SalvageGame;
      for (const q of at.bought.slice(0, Math.max(0, at.bought.indexOf(pid)))) {
        if (!(q in (W?.plates ?? {})) || g.salvage.works[q]) continue;
        const cq = buyCheck(cfg, g, q as never);
        if (cq.price !== null && !cq.refusal) g = { ...R.buy(cfg, g, q as never, cq.price, g.salvage.t), cash: 1e12 } as R.SalvageGame;
      }
      const ck = buyCheck(cfg, g, pid as never);
      if (ck.price === null || ck.refusal) continue;
      const it = contentAt(cfg.salvage, g.salvage).shop.find((i) => i.key === pid) as { deliver_s?: number } | undefined;
      // A hall counts in I only once poured, and its first heat pours by itself selfCommission_s after it is ready: the
      // jump runs past that (delivery, self start-up, a heat, the self pour) for every plate alike.
      const span = (it?.deliver_s ?? 600) + 2 * (W!.selfCommission_s ?? 1200) + 3600;
      const after = R.jump(cfg, R.buy(cfg, g, pid as never, ck.price, g.salvage.t), g.salvage.t + span);
      const before = R.jump(cfg, g, g.salvage.t + span);
      const I0 = incomeAt(cfg, before);
      // REPORT8: the payback measured on what the yard KEEPS (G at usual prices, a capped absence from both states), since I
      // does not carry most plates yet (requests.md 26 Nov ~20:40): payback = price / dG hours, against 0.8 to 1.5 tau_r.
      const G0 = gAt(cfg, before).G;
      plates[pid] = { at_h: +(g.salvage.t / 3600).toFixed(1), rung: g.salvage.ladder.rung, I: Math.round(I0), dI: Math.round(incomeAt(cfg, after) - I0), bought, price: ck.price, G: Math.round(G0), dG: Math.round(gAt(cfg, after).G - G0) };
    }
  }
  // REPORT8: G and I where the run ended (rung 5's entry when it was reached), for I's gate at rung 5.
  const fin = MEASURES_G.has(which) ? { ...gAt(cfg, b.g), I: incomeAt(cfg, b.g), rung: b.g.salvage.ladder.rung, h: b.g.salvage.t / 3600 } : null;
  const sum = summary(b, spec, [], [], {}, t0);
  sum.extra = { fin, walk: walk2, s2: b.rec.s2, sittings, nohand, plates, snapMs: Math.round(snapMs), lastGoal: R.nextGoal(cfg, b.g)?.id ?? null, materials: R.rungProgress(cfg, b.g).materials, worth: Object.fromEntries(Object.entries(b.g.salvage.ladder.worth ?? {}).map(([m, v]) => [m, Math.round(Number(v))])), rung: b.g.salvage.ladder.rung, supplied_t: +(b.g.salvage.ladder.supplied_g / 1e6).toFixed(1), cash: Math.round(b.g.cash), counts: { rackSold: b.g.salvage.counts?.rackSold ?? 0, ...Object.fromEntries(Object.entries(b.g.salvage.counts ?? {}).filter(([k]) => k.startsWith('poured:'))) }, plateCount: Object.keys(contentAt(cfg.salvage, b.g.salvage).works?.plates ?? {}).length };
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
    }
  }
  L.push('');
  L.push("2. THE SITTINGS (normal bot): hour, rung, supplied t, cash on return -> after, the away pass's cash moved (bank's share), I, purchases (§), the goal after, the away pass's CPU");
  for (const r of runs.filter((q) => q.spec.bot === 'normal')) {
    L.push(`   seed ${r.spec.seed}:`);
    for (const x of r.extra.sittings as Sitting2[]) L.push(`     ${pad(x.n, 2)} h${pad(x.h.toFixed(1), 6)} r${x.rung} ${pad(x.t, 8)} t  §${pad(x.cashBack, 9)} -> §${pad(x.cash, 9)}  away +${pad(x.awayNet, 8)} (bank ${x.awayBank})  I ${pad(x.I, 7)}  +${pad(x.bought, 2)} (§${x.spent})  ${String(x.goal).padEnd(15)} ${x.awayMs} ms  ${x.works}`);
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
  L.push(`REPORT8 TABLE (yard-stage2.md 9.2; ${runs.length} stage-2 runs; bots ${[...new Set(runs.map((r) => r.spec.bot))].join(', ')})`);
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
  for (const bot of ['normal', 'flat'] as Bot2[]) {
    const rs = by(bot).filter((r) => SS(r).some((x) => x.G !== undefined));
    if (!rs.length) continue;
    L.push(`   ${bot === 'flat' ? 'PLAYED WITH PRICES FLAT (board.a 0)' : 'PLAYED WITH THE NORMAL BOARD'}, ${rs.length} seeds`);
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
  // T8. plates
  const pl = runs.filter((r) => Object.keys((r.extra.plates as Record<string, unknown>) ?? {}).length);
  if (pl.length) {
    L.push('');
    L.push('T8. THE PLATES\' PAYBACK (2.6.4; aim 0.8 to 1.5 tau_r): at each plate\'s planned moment, price / dG in hours (G at usual prices with the plate bought, set down, started and a heat poured, against without), in tau of its rung; dI beside');
    const ids = [...new Set(pl.flatMap((r) => Object.keys(r.extra.plates as Record<string, unknown>)))];
    for (const id of ids) {
      const xs = pl.map((r) => (r.extra.plates as Record<string, { rung: number; dI: number; dG?: number; price?: number; G?: number }>)[id]).filter(Boolean);
      const pay = xs.map((x) => (x.dG && x.dG > 0 && x.price ? x.price / x.dG / ((tauH[Math.max(2, x.rung - 1)] as number) || 1) : Infinity));
      L.push(`   ${id.padEnd(12)} n ${xs.length}  price §${xs[0]?.price}  dG ${xs.map((x) => x.dG).join(' ')}  (of G ${xs.map((x) => x.G).join(' ')})  dI ${xs.map((x) => x.dI).join(' ')}  payback ${pay.map((v) => (Number.isFinite(v) ? v.toFixed(2) : 'never')).join(' ')} tau`);
    }
  }
  // T9. tick against jump
  const tj = runs.filter((r) => r.spec.gate);
  L.push('');
  L.push(`T9. A TICK AGAINST A JUMP (a minute of 0.1 s ticks against one jump, at sittings 1 to 5, 8 and 12 of the normal bot): ${tj.length} runs, ${tj.reduce((a, r) => a + SS(r).filter((x) => x.n <= 5 || [8, 12].includes(x.n)).length, 0)} checks, ${tj.reduce((a, r) => a + ((r.extra.s2 as Bot['rec']['s2']).gate ?? []).length, 0)} differ`);
  return L.join('\n');
}

let gameHash = '';
/** The first parts' key: the game file and bot.ts only (the rules' files are not hashed: empty the cache when they change). */
let snapHash = '';

/**
 * bots/plates.json (2.6.4, the payback rule): per plate the median over the normal runs of ΔI at its planned moment, its
 * rung, and the price the rule gives: max(works.floor, τ_r × ΔI), τ_r = tau_h[rung − 1] of its gate's rung. build-yard.py's
 * check (3) compares works.plates.<id>.price with it.
 */
function writePlates(all: Summary[], gameFile: string, write: boolean): void {
  const cfg = loadCfg(gameFile);
  const c = contentAt(cfg.salvage, { counts: { bathSet: 1 } } as never);
  const W = c.works!;
  const rows: Record<string, unknown> = {};
  for (const pid of Object.keys(W.plates)) {
    type P = { at_h: number; rung: number; dI: number; I: number; bought: boolean; dG?: number; G?: number };
    const xs = all.map((r) => (r.extra.plates as Record<string, P> | undefined)?.[pid]).filter((x): x is P => !!x);
    if (!xs.length) continue;
    const gateR = Number(String(W.plates[pid].gate).replace('rung', '')) || 3;
    const tau = c.tau_h?.[gateR - 1] ?? 0;
    const dI = med(xs.map((x) => x.dI));
    // RULING2.md 19.1: the price reads what the yard earns, measured: dE = the MEAN over seeds of dG (G at usual prices, a
    // capped absence, with the plate bought against without), price = max(works.floor, tau_r x dE) to three figures.
    const dEs = xs.map((x) => x.dG ?? 0);
    const dE = Math.round(dEs.reduce((a, v) => a + v, 0) / dEs.length);
    const raw = Math.max(W.floor, tau * dE);
    const p10 = 10 ** Math.max(0, Math.floor(Math.log10(raw)) - 2);
    rows[pid] = { dE, dI, I: med(xs.map((x) => x.I)), G: med(xs.map((x) => x.G ?? 0)), at_h: med(xs.map((x) => x.at_h)), gate: gateR, tau_h: tau, price: Math.round(raw / p10) * p10, seeds: xs.length, bought: xs.filter((x) => x.bought).length, perSeed: dEs, perSeedI: xs.map((x) => x.dI) };
  }
  // --plates write: the table build-yard.py's check (3) reads (it then refuses a price off the rule); --plates: printed only.
  const out = write ? path.join(ROOT, 'scripts/content/bots/plates.json') : path.resolve(arg('json') ? `${arg('json')}.plates.json` : path.join(os.tmpdir(), `yard-plates-${process.pid}.json`));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ $comment: 'yard-stage2.md 2.6.4: the payback rule\'s table, written by scripts/content/yard-bot.ts --stage 2 --plates (content2-bots). dE (RULING2.md 19.1): § an hour the yard earns more at usual prices with the plate (bought, set down, started up, a heat poured) than without, at its planned moment on the normal bots\' yards, mean of seeds; price: max(works.floor, tau_r x dE) to three figures; dI beside (rated income, not read).', seeds: [...new Set(all.map((r) => r.spec.seed))], plates: rows }, null, 1)}\n`);
  process.stderr.write(`wrote ${out}\n`);
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
        // The stage-2 switches reach the child too (content2-bots): --stage, --cache (the shared first parts), --plates, --sittings, --nohand.
        const pass = ['stage', 'cache', 'plates', 'sittings', 'nohand', 'walk2'].flatMap((k) => (arg(k) !== null ? [`--${k}`, arg(k)!] : []));
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
    const names = (arg('bots', DEFAULT2.join(',')) ?? '').split(',') as Bot2[];
    let specs2: Spec[] = [];
    for (const seed of seeds) for (const bot of names) specs2.push({ kind: 'stage2', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed, bot, gate: bot === 'normal', tag: `${gameHash.slice(0, 12)}${arg('plates') ? 'p' : ''}${arg('walk2') ? 'w' : ''}${S2_SITTINGS}` });
    const sh = arg('shard');
    if (sh) {
      const [i, n] = sh.split('/').map(Number);
      specs2 = specs2.filter((_, k) => k % n === i);
    }
    // --from a.json,b.json: print the report again from runs already made (no play).
    const from = arg('from');
    const all2 = from ? from.split(',').flatMap((f) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')) as Summary[]) : await runAll(gameFile, specs2, Number(arg('jobs', '2')));
    if (arg('plates')) writePlates(all2, gameFile, arg('plates') === 'write');
    const json2 = arg('json');
    if (json2) fs.writeFileSync(path.resolve(json2), JSON.stringify(all2));
    const seeds2 = from ? [...new Set(all2.map((r) => r.spec.seed))].sort((a, b) => a - b) : seeds;
    const W2: string[] = [];
    walkSection(W2, all2);
    process.stdout.write(`${report2(all2, seeds2)}\n\n${report8(all2, (loadCfg(gameFile).salvage as unknown as { tau_h: (number | null)[] }).tau_h)}\n${W2.join('\n')}\n`);
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
