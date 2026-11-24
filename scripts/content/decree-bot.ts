/**
 * The command line of the decree balance bot (High Office; docs/design/office-design.md section 8,
 * decisions D17, D19, D22, D24, D26, D27). The bots and every measurement are pure and live in the
 * rules: src/engine/decree/bot.ts.
 *
 *   npx tsx scripts/content/decree-bot.ts --seed 12345 [--hours 3] [--bot reader] [--hand 6]
 *       [--set key=value ...] [--config file.json] [--json] [--table] [--game high-office]
 *       [--days 3] [--stepping event|fixed] [--handover alwaysRefuse@2]
 *   npx tsx scripts/content/decree-bot.ts --seed 12345 --bot all [--json]      every run one seed needs
 *   npx tsx scripts/content/decree-bot.ts --across out1.json out2.json ...       the targets across seeds
 *   npx tsx scripts/content/decree-bot.ts --print-ranges                          RANGES as JSON (for build-office.py)
 *
 * --bot     one bot of bot.ts BOTS (reader, misreader, casual, alwaysSign, alwaysRefuse, random,
 *           moneyOnly, moodOnly, happier, noBuy, goalFollower, passive, checkIn, idle, adEverything,
 *           the auditor's cheap habits signFree, noLobby, noTrap, lowestClub, sadder, happier30,
 *           happier70, or an adversary), a comma list, "all" (every run one seed needs: `gatePlan`) or
 *           "validate" (what npm run validate runs on each named seed: `validatePlan`).
 * --hand    seconds per decision (default 6; also 4 and 9, 8.2)
 * --set     a field of the decree block at a RANGES path (`offices[0].rivalPull=5`,
 *           `archetypes[1].sign[1].delta=-5`, `money.M=60`); the value is JSON. A value outside its
 *           range is refused (a range is never widened silently); a path that is not in RANGES is
 *           a rule: allowed, with a warning on stderr.
 * --config  a game.json (with "mode"), or {"decree": {...}}, or a partial decree block, laid over the
 *           shipped games/<game>/game.json (objects merged, arrays replaced)
 * --handover habit@hours: play `habit` until the first term start after `hours`, then `--bot` (H6, H12)
 * --json    one line for scripts: { seed, runs: [{bot, hand, rows, summary, hash, notBuilt}], rows,
 *           hardMissed, aimsMissed, summaries, notBuilt, ms }
 * --across  reads the --json outputs of several seeds (files, or one directory of *.json) and prints
 *           the targets that need many seeds (bot.ts `acrossSeeds`: H6's handover, H9, H10, H12, D27)
 * --table   the worked tables of 2.13 (the first ten minutes) and of section 3 (the goals to hour
 *           three) from the reader's run
 *
 * Exit code 0 after a run (the gates are validate's and build-office.py's), 3 when the run stopped at
 * a rule that is not built yet (NotBuiltError: the message names it), 1 on a bad argument, 4 on a crash.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema } from '../../src/config/schema';
import { RANGES, archetypeRanges } from '../../src/config/schema.decree';
import * as R from '../../src/engine/decree';
import * as B from '../../src/engine/decree/bot';
import { withDecreeContent } from '../../src/engine/decreeMode';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('../lib/games.js') as { ROOT: string; readGameJson: (id: string) => unknown };

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** argv → flags; `--set` may repeat; `--across` takes every following non-flag argument. */
export function parseArgs(argv: string[]): { flags: Record<string, string>; sets: string[]; files: string[] } {
  const flags: Record<string, string> = {};
  const sets: string[] = [];
  const files: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      if (flags.across !== undefined) {
        files.push(a);
        continue;
      }
      throw new Error(`unexpected argument "${a}"`);
    }
    const key = a.slice(2);
    if (key === 'across') {
      flags.across = 'true';
      continue;
    }
    const next = argv[i + 1];
    const value = next !== undefined && !next.startsWith('--') ? (i++, next) : 'true';
    if (key === 'set') sets.push(value);
    else flags[key] = value;
  }
  return { flags, sets, files };
}

/** Sets `value` at a RANGES-style path (`a.b[1].c`) inside `obj`, creating objects on the way. */
export function setAt(obj: Record<string, Json>, p: string, value: Json): void {
  const parts = p.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let o: Record<string, Json> | Json[] = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const cur = (o as Record<string, Json>)[k];
    if (cur === null || typeof cur !== 'object') (o as Record<string, Json>)[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    o = (o as Record<string, Json>)[k] as Record<string, Json>;
  }
  (o as Record<string, Json>)[parts[parts.length - 1]] = value;
}

function deepMerge(a: Json, b: Json): Json {
  if (b === null || typeof b !== 'object' || Array.isArray(b) || a === null || typeof a !== 'object' || Array.isArray(a)) return b;
  const out: { [k: string]: Json } = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? deepMerge(out[k], v) : v;
  return out;
}

/** Every tunable range: RANGES and the ±1 of every archetype base effect. */
export function allRanges() {
  return [...RANGES, ...archetypeRanges()];
}

/** A --set refused outside its range (no silent widening); returns a warning for a path that is a rule. */
export function checkSet(p: string, value: Json): string | null {
  const r = allRanges().find((x) => x.path === p);
  if (!r) return `--set ${p}: not a (tune) path of RANGES; set as a rule`;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`--set ${p}: a (tune) value is a number, got ${JSON.stringify(value)}`);
  if (value < r.low - 1e-9 || value > r.high + 1e-9) throw new Error(`--set ${p}=${value} is outside its range ${r.low} to ${r.high} (${r.spec})`);
  return null;
}

/** The config the bot plays: the shipped game.json, `--config` laid over it, then every `--set`. */
export function loadConfig(flags: Record<string, string>, sets: string[], warn: (s: string) => void = () => {}): R.DecreeConfig {
  let raw = JSON.parse(JSON.stringify(games.readGameJson(flags.game ?? 'high-office'))) as { [k: string]: Json };
  if (flags.config) {
    const extra = JSON.parse(fs.readFileSync(path.resolve(flags.config), 'utf8')) as { [k: string]: Json };
    if ('mode' in extra) raw = extra;
    else if ('decree' in extra) raw = deepMerge(raw, extra) as { [k: string]: Json };
    else raw = { ...raw, decree: deepMerge(raw.decree ?? {}, extra) };
  }
  const decree = (raw.decree ?? {}) as Record<string, Json>;
  for (const s of sets) {
    const i = s.indexOf('=');
    if (i <= 0) throw new Error(`--set needs key=value, got "${s}"`);
    const v = s.slice(i + 1);
    let value: Json;
    try {
      value = JSON.parse(v) as Json;
    } catch {
      value = v;
    }
    const w = checkSet(s.slice(0, i), value);
    if (w) warn(w);
    setAt(decree, s.slice(0, i), value);
  }
  raw.decree = decree;
  const cfg = withDecreeContent(GameConfigSchema.parse(raw));
  if (!R.isDecree(cfg)) throw new Error('not a decree game');
  return cfg;
}

/** One run of the plan: a bot, its hand, its length, and what else it needs. */
export interface PlanRun {
  bot: B.BotId;
  hand?: number;
  hours: number;
  days?: number;
  stepping?: 'event' | 'fixed';
  handover?: { habit: B.BotId; hours: number };
  /** The run's hash must equal this run's (H3), by index in the plan. */
  sameAs?: number;
  label?: string;
}

/**
 * Every run one seed needs for the gates of 8.3 and the aims of 8.4: the reference reader at 6, 4 and
 * 9 s (3 h); D27's readers; the habits (3 h; H9 needs them on 30 seeds, build-office.py runs those);
 * buying bots; sessions (passive and ad-everything 3 days, H10; check-in 1 day; idle 1 h); the
 * adversaries (1 h each; the reload ones must equal the reader's hash, H3); the reader at 10 Hz for
 * 10 minutes against event stepping (H3); and the reader from each habit's state after 2 h (H6, H12).
 */
export function gatePlan(hours = 3): PlanRun[] {
  const plan: PlanRun[] = [
    { bot: 'reader', hours },
    { bot: 'reader', hand: B.HAND.fast, hours },
    { bot: 'reader', hand: B.HAND.slow, hours },
    { bot: 'misreader', hours },
    { bot: 'casual', hours },
    ...(['alwaysSign', 'alwaysRefuse', 'random', 'moneyOnly', 'moodOnly', 'happier', 'noBuy', 'goalFollower', ...B.BOTS.cheap] as B.BotId[]).map((bot) => ({ bot, hours })),
    { bot: 'passive', hours: 0, days: 3 },
    { bot: 'adEverything', hours: 0, days: 3 },
    { bot: 'checkIn', hours: 0, days: 1 },
    { bot: 'idle', hours: 1 },
  ];
  const r10 = plan.push({ bot: 'reader', hours: 1 / 6, label: 'reader 10 min (event)' }) - 1;
  plan.push({ bot: 'reader', hours: 1 / 6, stepping: 'fixed', sameAs: r10, label: 'reader 10 min (10 Hz)' });
  plan.push({ bot: 'reader', hours: 1 / 6, sameAs: r10, label: 'reader 10 min (again)' });
  const r1 = plan.push({ bot: 'reader', hours: 1, label: 'reader 1 h' }) - 1;
  for (const a of B.BOTS.adversaries) plan.push({ bot: a, hours: 1, sameAs: a.startsWith('reload') ? r1 : undefined });
  for (const habit of ['alwaysSign', 'alwaysRefuse', 'random'] as B.BotId[]) plan.push({ bot: 'reader', hours: 2, handover: { habit, hours: 2 }, label: `reader from ${habit} at 2 h` });
  return plan;
}

/**
 * What `npm run validate` runs on each named seed (scripts/validate.ts, about four minutes on four
 * cores): every hard target one seed shows. The reader (3 h; H1, H2, H5, H7, H8, H10, H11) and the
 * hour-one text gate of always-refuse, random and ad-everything (H7, D19), the sessions for H4 (one day),
 * the determinism trio and the adversaries (H3, H4, H5). The targets across seeds (H6's handover, H9,
 * H10's pairs, H12) are build-office.py's.
 */
export function validatePlan(hours = 3): PlanRun[] {
  const all = gatePlan(hours);
  const skip: string[] = ['misreader', 'casual', 'moneyOnly', 'moodOnly', 'happier', 'noBuy', 'goalFollower', 'alwaysSign', ...B.BOTS.cheap];
  const keep = all.map((p) => !p.handover && !skip.includes(p.bot) && !(p.bot === 'reader' && p.hand !== undefined));
  const index = new Map<number, number>();
  all.forEach((_, i) => keep[i] && index.set(i, index.size));
  return all.flatMap((p, i) => {
    if (!keep[i]) return [];
    const q: PlanRun = p.bot === 'alwaysRefuse' || p.bot === 'random' ? { ...p, hours: Math.min(p.hours, 1) } : p.days ? { ...p, days: 1 } : { ...p };
    if (p.sameAs !== undefined) q.sameAs = index.get(p.sameAs);
    return [q];
  });
}

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
function printRows(rows: B.BotRow[]) {
  const w = Math.min(70, Math.max(10, ...rows.map((r) => r.name.length)));
  for (const r of rows) {
    const mark = r.kind === 'report' ? ' ' : r.ok ? '✔' : r.kind === 'hard' ? '✖' : '!';
    console.log(`${mark} ${pad(r.kind, 6)} ${pad(r.name, w)}  ${r.value}${r.aim ? `  (aim ${r.aim})` : ''}`);
  }
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** The worked tables of 2.13 and section 3 from a run (`--table`). */
export function workedTables(cfg: R.DecreeConfig, tr: B.Trace): string {
  const out: string[] = [];
  const t0 = tr.started;
  out.push('2.13 the first ten minutes (from the bot):', '| Time | What happens | Spent | Income /s |', '|---|---|---|---|');
  for (let m = 0; m < 10; m++) {
    const a = t0 + m * 60;
    const b = a + 60;
    const things = [
      ...tr.decisions.filter((d) => d.t >= a && d.t < b).map((d) => `${d.kind}${d.archetype ? ` (${d.archetype})` : ''} ${d.choice === 'sign' ? 'signed' : 'studied'}`),
      ...tr.events.filter((e) => e.t >= a && e.t < b && (e.type === 'ministryOpened' || e.type === 'appointed' || e.type === 'storey' || e.type === 'callElection')).map((e) => e.type),
    ];
    const spent = tr.cash.filter((c) => c.t >= a && c.t < b && c.amount < 0).reduce((s, c) => s - c.amount, 0);
    const inc = [...tr.samples].filter((s) => s.t <= b).pop();
    out.push(`| ${mmss(m * 60)}–${mmss(m * 60 + 60)} | ${things.slice(0, 8).join('; ')}${things.length > 8 ? ` (+${things.length - 8})` : ''} | ${R.roundDibs(cfg, spent)} | ${inc ? inc.I.toPrecision(3) : '-'} |`);
  }
  out.push('', 'Section 3 the goals to hour three (from the bot):', '| Time | Office | Term | NR | Record | Ministries | Income /s |', '|---|---|---|---|---|---|---|');
  for (const s of tr.samples.filter((x) => [3, 6, 12, 18, 24, 30, 45, 60, 75, 90, 120, 150, 180].includes(Math.round((x.t - t0) / 60)))) out.push(`| ${mmss(s.t - t0)} | ${['Mayor', 'Governor', 'President'][s.office]} | ${s.term} | ${s.nr} | ${s.record} | ${s.ministries} | ${s.I.toPrecision(3)} |`);
  const p = B.pace(tr, cfg);
  out.push('', `first election ${p.firstElection?.toFixed(1) ?? '-'} min · governor ${p.governor?.toFixed(1) ?? '-'} min · president ${p.president?.toFixed(1) ?? '-'} min · papers decided ${tr.decisions.length} · ministers ${tr.events.filter((e) => e.type === 'appointed').length} · monuments ${tr.events.filter((e) => e.type === 'monument').length} · clippings ${tr.events.filter((e) => e.type === 'clipping').length}`);
  return out.join('\n');
}

interface RunOut {
  bot: B.BotId;
  hand: number;
  label: string;
  rows: B.BotRow[];
  summary: B.SeedSummary | null;
  hash: string;
  notBuilt: string | null;
  seconds: number;
}

function runOne(cfg: R.DecreeConfig, seed: number, p: PlanRun, wall0: number): { out: RunOut; run: B.BotRun } {
  const run = B.runDecreeBot(cfg, { bot: p.bot, seed, hours: p.hours, hand: p.hand, wall0, days: p.days, stepping: p.stepping, handover: p.handover });
  const hand = p.bot === 'flickBlind' ? 1 : p.hand ?? B.HAND.decision;
  return { run, out: { bot: p.bot, hand, label: p.label ?? `${p.bot}${p.hand ? ` @${p.hand} s` : ''}`, rows: run.rows, summary: run.notBuilt ? null : B.summarize(run.trace, run.handedOver, p.handover?.habit ?? null, cfg), hash: run.trace.hash, notBuilt: run.notBuilt, seconds: run.trace.ended - run.trace.started } };
}

function readAcross(files: string[]): B.SeedSummary[] {
  const list = files.length === 1 && fs.existsSync(files[0]) && fs.statSync(files[0]).isDirectory() ? fs.readdirSync(files[0]).filter((f) => f.endsWith('.json')).map((f) => path.join(files[0], f)) : files;
  const out: B.SeedSummary[] = [];
  for (const f of list) {
    const text = fs.readFileSync(f, 'utf8').trim().split('\n').pop() ?? '';
    const j = JSON.parse(text) as { summaries?: B.SeedSummary[] };
    out.push(...(j.summaries ?? []));
  }
  return out;
}

export function main(argv = process.argv.slice(2)): number {
  let parsed: ReturnType<typeof parseArgs>;
  let cfg: R.DecreeConfig;
  try {
    parsed = parseArgs(argv);
    if (parsed.flags.help === 'true') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
      return 0;
    }
    if (parsed.flags['print-ranges'] === 'true') {
      console.log(JSON.stringify(allRanges()));
      return 0;
    }
    if (parsed.flags.across === 'true') {
      const sums = readAcross(parsed.files);
      const rows = B.acrossSeeds(sums);
      if (parsed.flags.json === 'true') console.log(JSON.stringify({ seeds: [...new Set(sums.map((s) => s.seed))], rows, hardMissed: rows.filter((r) => r.kind === 'hard' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`), aimsMissed: rows.filter((r) => r.kind === 'aim' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`) }));
      else printRows(rows);
      return 0;
    }
    cfg = loadConfig(parsed.flags, parsed.sets, (w) => console.error(`warn: ${w}`));
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 1;
  }
  const f = parsed.flags;
  const seed = Number(f.seed ?? 12345);
  const json = f.json === 'true';
  const hours = Number(f.hours ?? 3);
  const started = Date.now();
  let plan: PlanRun[];
  try {
    const hand = f.hand !== undefined ? Number(f.hand) : undefined;
    const bots = (f.bot ?? 'reader').split(',');
    if (bots.length === 1 && bots[0] === 'all') plan = gatePlan(hours);
    else if (bots.length === 1 && bots[0] === 'validate') plan = validatePlan(hours);
    else {
      plan = bots.map((b) => {
        if (!B.isBotId(b)) throw new Error(`unknown bot "${b}" (one of ${B.ALL_BOTS.join(', ')}, or all)`);
        let handover: PlanRun['handover'];
        if (f.handover) {
          const [habit, h] = f.handover.split('@');
          if (!B.isBotId(habit)) throw new Error(`--handover: unknown bot "${habit}"`);
          handover = { habit, hours: Number(h ?? 2) };
        }
        return { bot: b, hand, hours, days: f.days !== undefined ? Number(f.days) : undefined, stepping: f.stepping === 'fixed' ? 'fixed' : 'event', handover };
      });
    }
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 1;
  }
  const outs: RunOut[] = [];
  let reader: B.Trace | null = null;
  let notBuilt: string | null = null;
  try {
    for (const p of plan) {
      const { out, run } = runOne(cfg, seed, p, B.BOT_EPOCH);
      outs.push(out);
      if (p.bot === 'reader' && !p.handover && !reader && !run.notBuilt) reader = run.trace;
      if (run.notBuilt) {
        notBuilt = run.notBuilt;
        break;
      }
    }
  } catch (e) {
    const msg = (e as Error)?.stack ?? String(e);
    if (json) console.log(JSON.stringify({ seed, crashed: true, error: msg }));
    else console.error(`✖ the decree bot crashed: ${msg}`);
    return 4;
  }
  // H3 across runs of the plan: the same seed and bot give the same trace, at 10 Hz and event to event; reloads equal the reader.
  const det: B.BotRow[] = [];
  plan.forEach((p, i) => {
    if (p.sameAs === undefined || !outs[i] || !outs[p.sameAs]) return;
    const a = outs[i];
    const b = outs[p.sameAs];
    det.push({ name: `H3 determinism: ${a.label} equals ${b.label}`, kind: 'hard', aim: 'byte-identical traces', value: `${a.hash} vs ${b.hash}`, ok: a.hash === b.hash, num: null });
  });
  const rows = [...outs.flatMap((o) => o.rows.map((r) => ({ ...r, name: plan.length > 1 ? `[${o.label}] ${r.name}` : r.name }))), ...det];
  const hardMissed = rows.filter((r) => r.kind === 'hard' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`);
  const aimsMissed = rows.filter((r) => r.kind === 'aim' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`);
  const ms = Date.now() - started;
  const notBuiltMsg = notBuilt ? `the decree bot stopped at the first rule that is not built yet: ${notBuilt}() (docs/design/office-build-plan.md names its package); ${outs.length - 1} of ${plan.length} runs finished before it` : null;
  if (json) {
    console.log(JSON.stringify({ seed, runs: outs.map((o) => ({ bot: o.bot, hand: o.hand, label: o.label, hash: o.hash, notBuilt: o.notBuilt, seconds: o.seconds })), rows, hardMissed, aimsMissed, summaries: outs.map((o) => o.summary).filter(Boolean), notBuilt, error: notBuiltMsg, ms }));
    return notBuilt ? 3 : 0;
  }
  if (notBuiltMsg) {
    console.error(`✖ ${notBuiltMsg}`);
    const played = outs[outs.length - 1];
    if (played) console.error(`  (${played.label} played ${(played.seconds / 60).toFixed(1)} min before it stopped; the rows below measure only that part)`);
    printRows(rows);
    return 3;
  }
  console.log(`decree bot · seed ${seed} · ${plan.length === 1 ? plan[0].bot : `${plan.length} runs`} · ${(ms / 1000).toFixed(1)} s`);
  printRows(rows);
  if (f.table === 'true' && reader) console.log(`\n${workedTables(cfg, reader)}`);
  console.log(`\n${hardMissed.length} hard target(s) missed, ${aimsMissed.length} aim(s) missed`);
  return 0;
}

// exitCode, not exit(): a piped stdout (build-office.py, validate) is written asynchronously and exit() would cut the JSON line.
if (require.main === module) process.exitCode = main();
