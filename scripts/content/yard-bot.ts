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
 * --only income   stage 2 2.3.3's gate (engine2-income): rated income I against the away income an hour G at
 *                 usual prices (board.a 0), at rung 2's and rung 3's entry, the hour's end, day 1 and day 3 (normal hand),
 *                 on yards the bots played with prices flat; and (RULING2.md 14.5, engine2-fixB) on yards
 *                 played with the NORMAL price board, G still measured at usual prices, at the hour's end
 *                 and day 1 (the gate: 17 of 20 within 0.9 to 1.1 on ten seeds, none outside 0.85 to 1.15).
 *                 With --only income alone, only these runs are made and only section 8 is printed.
 * Every run checks the hard promises of 8.3 (shown equals applied, cash never below zero, supplied never
 * falling, no stock negative; tick equals jump minute by minute on the normal hand's runs); a broken
 * promise prints in the report's first section and makes the exit code 2.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SalvageSchema } from '../../src/config/schema.salvage';
import * as R from '../../src/engine/salvage';
import { away, newBot, playTo, ratedCapacity, seededCfg, startGame, tickJumpGate, type Bot, type BotOptions } from '../../src/engine/salvage/bot';

const HERE = path.dirname(fileURLToPath(import.meta.url));
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
  return { mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage) } as unknown as R.SalvageConfig;
}

// ============================================================================================ one run

interface Spec extends BotOptions {
  kind: 'hour' | 'manager' | 'days' | 'nohand' | 'holder' | 'income';
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
  const v0 = R.stockValue(cfg, g);
  away(ab, 24 * 3600);
  const card = ab.g.salvage.away!;
  const h = card.seconds / 3600;
  const G = (ab.g.cash - g.cash + R.stockValue(cfg, ab.g) - v0) / Math.max(1e-9, h);
  const T = R.ratedTerms(cfg, g);
  return { at, t: g.salvage.t, rung: g.salvage.ladder.rung, ran_h: h, G, I: T.I, bind: T.bind, Isales: T.sales, Ispent: T.spent, sales: card.money / h, spent: (card.spent ?? 0) / h, stock: (R.stockValue(cfg, ab.g) - v0) / h };
}

function runOne(base: R.SalvageConfig, spec: Spec): Summary {
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
  if (spec.kind === 'income' && spec.board === 'normal') {
    // RULING2.md 14.5: the yard as players play it (the shipped board), I against G at the hour's end and day 1
    // (the gate's 20 moments); REPORT7 adds rung 2's and rung 3's entry and day 3 (printed, not gated).
    let r2: R.SalvageGame | null = null;
    let r3: R.SalvageGame | null = null;
    playTo(b, 3600, (bb, m) => {
      onMinute(bb, m);
      if (!r2 && bb.g.salvage.ladder.rung >= 2) r2 = bb.g;
      if (!r3 && bb.g.salvage.ladder.rung >= 3) r3 = bb.g;
    });
    const rows = [];
    if (r2) rows.push(incomeRow(cfg, r2, spec, 'rung2'));
    if (r3) rows.push(incomeRow(cfg, r3, spec, 'rung3'));
    rows.push(incomeRow(cfg, b.g, spec, 'hour'));
    for (let k = 0; k < 6; k++) {
      away(b, 11.75 * 3600);
      playTo(b, b.g.salvage.t + 15 * 60);
      if (k === 1) rows.push(incomeRow(cfg, b.g, spec, 'day1'));
    }
    rows.push(incomeRow(cfg, b.g, spec, 'day3'));
    extra.income = rows;
    return summary(b, spec, Rs, gate, extra, t0);
  }
  if (spec.kind === 'income') {
    let r2: R.SalvageGame | null = null;
    let r3: R.SalvageGame | null = null;
    playTo(b, 3600, (bb, m) => {
      onMinute(bb, m);
      if (!r2 && bb.g.salvage.ladder.rung >= 2) r2 = bb.g;
      if (!r3 && bb.g.salvage.ladder.rung >= 3) r3 = bb.g;
    });
    const rows = [];
    if (r2) rows.push(incomeRow(cfg, r2, spec, 'rung2'));
    if (r3) rows.push(incomeRow(cfg, r3, spec, 'rung3'));
    rows.push(incomeRow(cfg, b.g, spec, 'hour'));
    for (let k = 0; k < 6; k++) {
      away(b, 11.75 * 3600);
      playTo(b, b.g.salvage.t + 15 * 60);
      if (k === 1) rows.push(incomeRow(cfg, b.g, spec, 'day1'));
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
    const mark = (k: string) => (marks[k] = { earned: Math.round(b.g.lifetimeEarnings), t: +(b.g.salvage.ladder.supplied_g / 1e6).toFixed(3), stock: Math.round(R.stockValue(b.cfg, b.g)) });
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
        const p = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--game', gameFile, '--one', JSON.stringify(specs[i])], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env } });
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

/** Section 8: rated income I against G, on yards played with flat prices and with the normal board (RULING2.md 14.5). */
function incomeSection(L: string[], all: Summary[]): void {
  type Row = { at: string; t: number; rung: number; ran_h: number; G: number; I: number; bind: string; Isales: number; Ispent: number; sales: number; spent: number; stock: number };
  for (const board of ['flat', 'normal'] as const) {
    const inc = all.filter((r) => r.spec.kind === 'income' && (r.spec.board ?? 'flat') === board);
    if (!inc.length) continue;
    L.push('');
    L.push(
      board === 'flat'
        ? '8. RATED INCOME I AGAINST THE AWAY INCOME G (stage 2 2.3.3, I5; PLAYED WITH PRICES FLAT, board.a 0; normal hand, goal habit, route A; G = (net cash + stock left at p̄ − at the start) / hours the yard ran, a capped absence at usual prices)'
        : '8b. THE SAME ON YARDS PLAYED WITH THE NORMAL PRICE BOARD (RULING2.md 14.5; G still at usual prices, board.a 0; gate: 17 of 20 moments within 0.9-1.1, none outside 0.85-1.15)',
    );
    const all20: number[] = [];
    for (const at of ['rung2', 'rung3', 'hour', 'day1', 'day3']) {
      const rows = inc.map((r) => ({ r, x: (r.extra.income as Row[]).find((x) => x.at === at) })).filter((q): q is { r: Summary; x: Row } => !!q.x);
      if (!rows.length) continue;
      const q = rows.map(({ x }) => x.I / x.G);
      if (board === 'flat' || at === 'hour' || at === 'day1') all20.push(...q);
      L.push(`   ${at.padEnd(5)} I/G in 0.9-1.1 on ${q.filter((x) => x >= 0.9 && x <= 1.1).length}/${rows.length} seeds${board === 'flat' ? ' (aim 13 of 15 at rung3 and day3)' : at === 'hour' || at === 'day1' ? ' (gated)' : ' (printed, not gated)'}; I/G med ${med(q).toFixed(3)}, min ${Math.min(...q).toFixed(3)}, max ${Math.max(...q).toFixed(3)}`);
      for (const { r, x } of rows) {
        L.push(`      s${pad(r.spec.seed, 3)} t ${mmss(x.t)} rung ${x.rung} ran ${x.ran_h.toFixed(1)} h: G §${pad(Math.round(x.G), 6)} (sales ${Math.round(x.sales)} − loads ${Math.round(x.spent)} + stock ${Math.round(x.stock)})  I §${pad(Math.round(x.I), 6)} (sales ${Math.round(x.Isales)} − loads ${Math.round(x.Ispent)}, binds ${x.bind})  I/G ${(x.I / x.G).toFixed(3)}`);
      }
    }
    if (board === 'normal') {
      const inBand = all20.filter((x) => x >= 0.9 && x <= 1.1).length;
      const out = all20.filter((x) => x < 0.85 || x > 1.15).length;
      L.push(`   GATE (14.5): ${inBand}/${all20.length} moments within 0.9-1.1 (aim at least 17 of 20), ${out} outside 0.85-1.15 (aim none): ${inBand >= Math.ceil(0.85 * all20.length) && out === 0 ? 'PASSED' : 'NOT MET'}`);
    }
  }
}

// ============================================================================================ main

async function main(): Promise<void> {
  const gameFile = path.resolve(ROOT, arg('game', 'games/scrap-yard/game.json')!);
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
  const only = (arg('only', 'beats,hand,away,days,nohand,gate,income') ?? '').split(',');
  const jobs = Number(arg('jobs', '2'));
  const specs: Spec[] = [];
  // REPORT7: the hour runs are played to minute 90 (E31c: the first half hour after rung 3 shows what the runs do).
  const base = { kind: 'hour' as const, minutes: Number(arg('minutes', '90')) };
  // --only income alone: only the income runs (flat board on every seed, the normal board on ten seeds:
  // seeds 1..10 or the --seeds given when fewer), and only section 8 in the report.
  const incomeOnly = only.length === 1 && only[0] === 'income';
  for (const seed of seeds) {
    if (!incomeOnly) specs.push({ ...base, hand: 'normal', habit: 'goal', route: 'A', seed, gate: only.includes('gate') });
    if (only.includes('beats')) {
      specs.push({ ...base, hand: 'normal', habit: 'all', route: 'A', seed });
      if (routes.includes('B')) specs.push({ ...base, hand: 'normal', habit: 'goal', route: 'B', seed });
      specs.push({ ...base, hand: 'brisk', habit: 'goal', route: 'A', seed });
      specs.push({ ...base, hand: 'slow', habit: 'goal', route: 'A', seed, minutes: Math.max(100, base.minutes) });
    }
    if (only.includes('hand')) specs.push({ ...base, kind: 'manager', hand: 'normal', habit: 'goal', route: 'A', seed, manager: true });
    if (only.includes('income')) specs.push({ kind: 'income', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed, board: 'flat' });
  }
  if (only.includes('income')) for (const seed of seeds.slice(0, 10)) specs.push({ kind: 'income', minutes: 60, hand: 'normal', habit: 'goal', route: 'A', seed, board: 'normal' });
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
  } else text = report(all, seeds);
  process.stdout.write(`${text}\n`);
  const broken = all.some((r) => r.broken.length || r.gate.length);
  process.exit(broken ? 2 : 0);
}

main().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? e}\n`);
  process.exit(4);
});
