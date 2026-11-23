/**
 * The command line of the merge balance bot (Night Market; docs/design/market-design.md section 8).
 * The bots and every measurement are pure and live in the rules: src/engine/merge/bot.ts.
 *
 *   npx tsx scripts/content/merge-bot.ts --seed 12345 [--hours 12] [--bot active] [--act 1.5]
 *       [--sheet 2.5] [--seasons 10] [--set key=value ...] [--config file.json] [--json]
 *       [--days 21] [--table] [--quiet]
 *
 * --bot     active | lazy | deliver | passive | checkin | idle | all. "all" (also --gates) plays
 *           every bot one seed needs for every gate of 8.3 (the active run with its away probes,
 *           lazy, deliver-only from the active bot's minute 3, idle, check-in, passive, the four
 *           adversaries, the determinism check) and evaluates them. One bot alone evaluates what
 *           its own trace can show.
 * --hours   play hours of the active run (default 3; with --seasons it stops at that many closes)
 * --days    days of the passive bot (default 21; 0 skips it), --no-adversaries, --no-others,
 *           --determinism <minutes> (default 10; 0 skips it): parts of "all" to leave out
 * --set     a field of the merge block at a RANGES path (`gift.coinPace=0.5`,
 *           `tickets.lineOddsEarly[0]=0.55`, `festival[0]=[{"chain":0,"tier":8}]`); the value is JSON.
 * --config  a game.json (with "mode"), or {"merge": {...}}, or a partial merge block, laid over the
 *           shipped games/night-market/game.json (objects merged, arrays replaced)
 * --json    one line for scripts: { seed, rows, hardMissed, aimsMissed, summary, tables, traces }
 * --table   the worked tables of 2.12 and 3.3 and the season times of 8.5 (text)
 *
 * Exit code 0 after a run (the gate is validate's and build-night.py's), 3 when the run stopped at a
 * rule that is not built yet (NotBuiltError: the message names it), 1 on a bad argument.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema } from '../../src/config/schema';
import * as R from '../../src/engine/merge';
import * as B from '../../src/engine/merge/bot';
import { withMergeContent } from '../../src/engine/mergeMode';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('../lib/games.js') as { ROOT: string; readGameJson: (id: string) => unknown };

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** argv → flags; `--set` may repeat. */
export function parseArgs(argv: string[]): { flags: Record<string, string>; sets: string[] } {
  const flags: Record<string, string> = {};
  const sets: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument "${a}"`);
    const key = a.slice(2);
    const next = argv[i + 1];
    const value = next !== undefined && !next.startsWith('--') ? (i++, next) : 'true';
    if (key === 'set') sets.push(value);
    else flags[key] = value;
  }
  return { flags, sets };
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

/** The config the bot plays: the shipped game.json, `--config` laid over it, then every `--set`. */
export function loadConfig(flags: Record<string, string>, sets: string[]): R.MergeConfig {
  let raw = JSON.parse(JSON.stringify(games.readGameJson(flags.game ?? 'night-market'))) as { [k: string]: Json };
  if (flags.config) {
    const extra = JSON.parse(fs.readFileSync(path.resolve(flags.config), 'utf8')) as { [k: string]: Json };
    if ('mode' in extra) raw = extra;
    else if ('merge' in extra) raw = deepMerge(raw, extra) as { [k: string]: Json };
    else raw = { ...raw, merge: deepMerge(raw.merge ?? {}, extra) };
  }
  const merge = (raw.merge ?? {}) as Record<string, Json>;
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
    setAt(merge, s.slice(0, i), value);
  }
  raw.merge = merge;
  const cfg = withMergeContent(GameConfigSchema.parse(raw));
  if (!R.isMerge(cfg)) throw new Error('not a merge game');
  return cfg;
}

const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));

function printRows(rows: B.GateRow[]) {
  const w = Math.min(84, Math.max(...rows.map((r) => r.name.length)));
  for (const r of rows) {
    const mark = r.kind === 'report' ? ' ' : r.ok ? '✔' : r.kind === 'hard' ? '✖' : '!';
    console.log(`${mark} ${pad(r.kind, 6)} ${pad(r.name, w)}  ${pad(String(r.value), 28)}  aim ${r.aim}`);
  }
}

function printTables(all: B.AllRuns) {
  const A = all.active;
  const u = B.usefulPerMinute(A);
  console.log('\nM3: useful actions available per minute, minutes 0 to 9:', u.perMinute.join(' '), `· longest wait ${u.longestWait.toFixed(1)} s`);
  const cps = B.coinsPerSecond(A);
  console.log('c/s at minute:', Object.entries(cps).map(([m, v]) => `${m}: ${v.toFixed(2)}`).join('  '));
  const src = B.coinsBySource(A, A.t0, A.t0 + 10800);
  const tot = Object.values(src).reduce((a, b) => a + (b ?? 0), 0);
  console.log('coins by source, hours 0-3:', Object.entries(src).map(([k, v]) => `${k} ${(v ?? 0).toFixed(0)} (${(((v ?? 0) / Math.max(1, tot)) * 100).toFixed(1)} %)`).join(', '));
  console.log('\n8.5 season times (season clock, min): season | Tea Steamer Sweets Noodles Puffs | Festival | closed');
  for (const s of B.seasonTable(A)) console.log(`  ${String(s.season).padStart(2)} | ${s.stalls.slice(1).map((x) => (x === null ? '-' : x.toFixed(1))).join(' ')} | ${s.festival === null ? '-' : s.festival.toFixed(1)} | ${s.closed === null ? '-' : s.closed.toFixed(1)}`);
  if (all.passive) {
    const p = B.passiveDays(all.passive);
    console.log(`passive bot: Steamer day ${p.steamer}, Sweets day ${p.sweets}, Noodles day ${p.noodles}, Festival day ${p.festival}, seasons by day 7: ${p.seasons7}, by day 21: ${p.seasons21}`);
  }
}

function printWorked(A: B.Trace) {
  console.log('\n2.12 the first ten minutes (from the bot):');
  console.log('| Time | What happens | Spent | c/s |\n|---|---|---|---|');
  for (const w of B.firstTenMinutes(A)) console.log(`| ${Math.floor(w.from / 60)}:${String(w.from % 60).padStart(2, '0')} to ${Math.floor(w.to / 60)}:${String(w.to % 60).padStart(2, '0')} | ${w.events.join('; ') || '-'} | ${w.spent.toFixed(0)} | ${w.cps.toFixed(2)} |`);
  console.log('\n3.3 hours one to three (new things per window, from the bot):');
  console.log('| Window (min) | New things |\n|---|---|');
  for (const w of B.hoursOneToThree(A)) console.log(`| ${w.from} to ${w.to} | ${w.events.join(', ') || '-'} |`);
}

function traceFacts(tr: B.Trace | undefined) {
  if (!tr) return null;
  const src = B.coinsBySource(tr);
  return { kind: tr.kind, seconds: tr.t1 - tr.t0, unbooked: B.unbookedCoins(tr), sources: Object.keys(src), tickets: tr.tickets.filter((t) => t.filled !== null).length, income: B.income(tr, -Infinity, Infinity, true) };
}

export function main(argv = process.argv.slice(2)): number {
  let parsed: ReturnType<typeof parseArgs>;
  let cfg: R.MergeConfig;
  try {
    parsed = parseArgs(argv);
    if (parsed.flags.help === 'true') {
      console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
      return 0;
    }
    cfg = loadConfig(parsed.flags, parsed.sets);
  } catch (e) {
    console.error(`✖ ${(e as Error).message}`);
    return 1;
  }
  const f = parsed.flags;
  const seed = Number(f.seed ?? 12345);
  const act = Number(f.act ?? 1.5);
  const sheet = f.sheet ? Number(f.sheet) : undefined;
  const bot = (f.gates === 'true' ? 'all' : f.bot ?? 'active') as B.BotKind | 'all';
  const hours = Number(f.hours ?? (bot === 'all' ? 12 : 3));
  const seasons = f.seasons ? Number(f.seasons) : undefined;
  const json = f.json === 'true';
  const started = Date.now();
  try {
    let all: B.AllRuns;
    if (bot === 'all') {
      all = B.runAll(cfg, {
        seed,
        act,
        sheet,
        hours,
        seasons,
        passiveDays: f.days !== undefined ? Number(f.days) : 21,
        adversaries: f['no-adversaries'] !== 'true',
        others: f['no-others'] !== 'true',
        determinism: f.determinism !== undefined ? Number(f.determinism) : 10,
      });
    } else {
      const run = B.runMergeBot(cfg, { kind: bot, seed, act, sheet, hours, seasons, days: f.days !== undefined ? Number(f.days) : undefined, awayAt: bot === 'active' ? B.awayMarks(hours) : undefined });
      all = { seed, active: run.trace, states: run.states };
    }
    const rows = B.evaluate(cfg, all);
    const hardMissed = rows.filter((r) => r.kind === 'hard' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`);
    const aimsMissed = rows.filter((r) => r.kind === 'aim' && !r.ok).map((r) => `${r.name}: ${r.value} (aim ${r.aim})`);
    const ms = Date.now() - started;
    if (json) {
      console.log(
        JSON.stringify({
          seed,
          bot,
          act,
          ms,
          rows,
          hardMissed,
          aimsMissed,
          summary: B.seedSummary(all),
          tables: { first10: B.firstTenMinutes(all.active), hours13: B.hoursOneToThree(all.active), seasons: B.seasonTable(all.active) },
          traces: [all.active, all.lazy, all.deliver, all.idle, all.checkin, all.passive, ...Object.values(all.adversaries ?? {})].filter(Boolean).map((t) => traceFacts(t)),
        }),
      );
      return 0;
    }
    console.log(`merge bot · seed ${seed} · ${bot} · ${act} s an action · ${((all.active.t1 - all.active.t0) / 3600).toFixed(2)} h played · ${(ms / 1000).toFixed(1)} s`);
    printRows(rows);
    if (f.quiet !== 'true') printTables(all);
    if (f.table === 'true') printWorked(all.active);
    console.log(`\n${hardMissed.length} hard target(s) missed, ${aimsMissed.length} aim(s) missed`);
    return 0;
  } catch (e) {
    if (e instanceof R.NotBuiltError || (e as Error)?.name === 'NotBuiltError') {
      const rule = (e as R.NotBuiltError).rule ?? '?';
      const msg = `the merge bot stopped at the first rule that is not built yet: ${rule}() (${(e as Error).message})`;
      if (json) console.log(JSON.stringify({ seed, bot, notBuilt: rule, error: msg }));
      else console.error(`✖ ${msg}`);
      return 3;
    }
    const msg = (e as Error)?.stack ?? String(e);
    if (json) console.log(JSON.stringify({ seed, bot, crashed: true, error: msg }));
    else console.error(`✖ the merge bot crashed: ${msg}`);
    return 4;
  }
}

if (require.main === module) process.exit(main());
