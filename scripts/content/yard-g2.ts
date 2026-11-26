/**
 * THE GATE OF RULING2.md 14.2 (stage 2, 2.1: runs from rung group.fromRung). Planning a run ahead out of
 * the boss's sight is a shortcut; this driver measures how little it moves, against the same yard with
 * every run made trip by trip (`group.ahead` false), and reports what the rule itself does (`fromRung` 99,
 * no runs at all: the first yard's rules).
 *
 *   npx tsx scripts/content/yard-g2.ts iso  [--seeds 31,47,63,77,101] [--jobs 3]
 *       (i) one capped absence from ten played states (each seed at minute 60 and at day 1), ahead true
 *       against false: net (money - loads bought + the stock's value at usual prices, end - start).
 *   npx tsx scripts/content/yard-g2.ts days [--seeds 1-15] [--jobs 3]
 *       (ii) and (iii): the bots' three days at the twice-a-day habit (an hour, then six times 11.75 h away
 *       and 15 minutes played), ahead true, ahead false and fromRung 99: supplied tonnes and lifetime
 *       earnings at day 1 and day 3.
 *   --group '{"handRun_s":0}' overrides the shipped group block for every column (finding which run
 *   kind moves the comparison: hands alone, cutters alone).
 *
 * The bots and the content are the repository's (src/engine/salvage/bot.ts, games/scrap-yard/game.json);
 * nothing here is a rule. Owner: engine2-fixA. Prints one table per part; `--json` prints the rows.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SalvageSchema } from '../../src/config/schema.salvage';
import * as R from '../../src/engine/salvage';
import { awayPass } from '../../src/engine/salvage/away';
import { away, newBot, playTo, seededCfg, startGame, type Bot, type BotOptions } from '../../src/engine/salvage/bot';
import type { SalvageConfig, SalvageGame } from '../../src/engine/salvage/types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);

type Group = Record<string, number | boolean>;
let CONTENT: Record<string, unknown> | null = null;
function content(): Record<string, unknown> {
  if (!CONTENT) CONTENT = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'games/scrap-yard/game.json'), 'utf8')).salvage) as Record<string, unknown>;
  return CONTENT;
}
/** The real content with its group block changed by `g` (a new object each call: group.ts caches by content). */
function cfgOf(seed: number, g: Group): SalvageConfig {
  const c = content();
  const group = { ...(c.group as Group), ...g };
  return seededCfg({ mode: 'salvage', salvage: { ...c, group } } as unknown as SalvageConfig, seed);
}
function bot(cfg: SalvageConfig, seed: number, g: SalvageGame = startGame(cfg, NOW), now = NOW): Bot {
  return newBot(cfg, g, now, { hand: 'normal', habit: 'goal', route: 'A', seed } as BotOptions);
}

const COLS: Record<string, Group> = { ahead: { ahead: true }, tripByTrip: { ahead: false }, noRuns: { fromRung: 99 } };

// ------------------------------------------------------------------------------------------ (i)
function iso(seed: number, extra: Group): unknown[] {
  // The played states: the shipped rule (ahead true), minute 60 and day 1 (two sittings after it).
  const b = bot(cfgOf(seed, { ...extra, ahead: true }), seed);
  playTo(b, 3600);
  const states: [string, SalvageGame][] = [['m60', b.g]];
  for (let k = 0; k < 2; k++) {
    away(b, 11.75 * 3600);
    playTo(b, b.g.salvage.t + 15 * 60);
  }
  states.push(['day1', b.g]);
  const out: unknown[] = [];
  for (const [at, g0] of states) {
    const g = { ...g0, lastSavedAt: g0.salvage.clock.highMs } as SalvageGame;
    const row: Record<string, unknown> = { seed, at, rung: g.salvage.ladder.rung };
    for (const col of ['ahead', 'tripByTrip'] as const) {
      const cfg = cfgOf(seed, { ...extra, ...COLS[col] });
      const t0 = process.cpuUsage();
      const o = awayPass(cfg, g, g.salvage.clock.highMs + 24 * 3600_000);
      const d = process.cpuUsage(t0);
      const a = o.salvage.away!;
      const net = a.money - ((a as { spent?: number }).spent ?? 0) + R.stockValue(cfg, o) - R.stockValue(cfg, g);
      row[col] = { net: Math.round(net), money: Math.round(a.money), loads: a.loads, t: +(a.supplied_g / 1e6).toFixed(3), ms: Math.round((d.user + d.system) / 1000) };
    }
    out.push(row);
  }
  return out;
}

// ------------------------------------------------------------------------------------------ (ii), (iii)
function days(seed: number, g: Group): unknown {
  const b = bot(cfgOf(seed, g), seed);
  playTo(b, 3600);
  const rows: Record<string, number> = {};
  const row = (tag: string) => {
    rows[`${tag}_t`] = +(b.g.salvage.ladder.supplied_g / 1e6).toFixed(3);
    rows[`${tag}_earned`] = Math.round(b.g.lifetimeEarnings);
  };
  row('hour');
  for (let k = 0; k < 6; k++) {
    away(b, 11.75 * 3600);
    playTo(b, b.g.salvage.t + 15 * 60);
    if (k === 1) row('day1');
  }
  row('day3');
  return { ...rows, rung: b.g.salvage.ladder.rung, broken: b.rec.broken.length };
}

// ------------------------------------------------------------------------------------------ the runner
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : d;
};
function seedsOf(s: string): number[] {
  const out: number[] = [];
  for (const part of s.split(',')) {
    const [a, b] = part.split('-').map(Number);
    if (b === undefined) out.push(a);
    else for (let k = a; k <= b; k++) out.push(k);
  }
  return out;
}
const pct = (a: number, b: number) => (b ? (100 * (a - b)) / b : 0);
const f = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + ' %';

async function main(): Promise<void> {
  const part = process.argv[2];
  const extra = JSON.parse(arg('--group', '{}')) as Group;
  if (part === '--worker') {
    const kind = process.argv[3];
    const seed = Number(process.argv[4]);
    if (kind === 'iso') console.log(JSON.stringify(iso(seed, extra)));
    else {
      const out: Record<string, unknown> = { seed };
      for (const [col, g] of Object.entries(COLS)) out[col] = days(seed, { ...extra, ...g });
      console.log(JSON.stringify(out));
    }
    return;
  }
  if (part !== 'iso' && part !== 'days') {
    console.error('usage: yard-g2.ts iso|days [--seeds a-b,c] [--jobs n] [--group json] [--json]');
    process.exit(2);
  }
  const seeds = seedsOf(arg('--seeds', part === 'iso' ? '31,47,63,77,101' : '1-15'));
  const jobs = Math.max(1, Number(arg('--jobs', '3')));
  const results: unknown[] = [];
  let next = 0;
  const run = (): Promise<void> =>
    new Promise((done) => {
      if (next >= seeds.length) return done();
      const seed = seeds[next++];
      const p = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), '--worker', part, String(seed), '--group', JSON.stringify(extra)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
      let buf = '';
      p.stdout.on('data', (d) => (buf += d));
      p.on('close', () => {
        try {
          const r = JSON.parse(buf.trim().split('\n').pop()!);
          if (Array.isArray(r)) results.push(...r);
          else results.push(r);
        } catch {
          console.error(`seed ${seed}: no result`);
        }
        run().then(done);
      });
    });
  await Promise.all(Array.from({ length: Math.min(jobs, seeds.length) }, run));
  if (process.argv.includes('--json')) {
    for (const r of results) console.log(JSON.stringify(r));
    return;
  }
  if (part === 'iso') {
    type Row = { seed: number; at: string; rung: number; ahead: { net: number; loads: number; ms: number }; tripByTrip: { net: number; loads: number; ms: number } };
    const rows = (results as Row[]).sort((a, b) => a.seed - b.seed || (a.at < b.at ? 1 : -1));
    console.log('(i) one capped absence from a played state: net, ahead true against false');
    console.log('| seed | state | rung | net, ahead | net, trip by trip | difference | loads | CPU ms (ahead / trip by trip) |');
    console.log('|---|---|---|---|---|---|---|---|');
    let ok = 0;
    for (const r of rows) {
      const d = pct(r.ahead.net, r.tripByTrip.net);
      if (Math.abs(d) <= 2) ok++;
      console.log(`| ${r.seed} | ${r.at} | ${r.rung} | ${r.ahead.net} | ${r.tripByTrip.net} | ${f(d)} | ${r.ahead.loads} / ${r.tripByTrip.loads} | ${r.ahead.ms} / ${r.tripByTrip.ms} |`);
    }
    console.log(`within 2 %: ${ok} of ${rows.length} (the gate: at least 8 of 10)`);
    return;
  }
  type D = Record<string, number>;
  type Row = { seed: number; ahead: D; tripByTrip: D; noRuns: D };
  const rows = (results as Row[]).sort((a, b) => a.seed - b.seed);
  console.log('(ii) and (iii) the bots three days at the twice-a-day habit: ahead true against trip by trip (gated), and against no runs (reported)');
  console.log('| seed | day 1 t (ahead / trip / none) | day 1 earned | day 3 t | day 3 earned | ahead vs trip: d1 t, d1 earned, d3 t, d3 earned | ahead vs none: d1 t, d3 t, d3 earned |');
  console.log('|---|---|---|---|---|---|---|');
  const ok = { d1t: 0, d1e: 0, d3t: 0, d3e: 0 };
  for (const r of rows) {
    const A = r.ahead;
    const T = r.tripByTrip;
    const N = r.noRuns;
    const d = [pct(A.day1_t, T.day1_t), pct(A.day1_earned, T.day1_earned), pct(A.day3_t, T.day3_t), pct(A.day3_earned, T.day3_earned)];
    if (Math.abs(d[0]) <= 2) ok.d1t++;
    if (Math.abs(d[1]) <= 2) ok.d1e++;
    if (Math.abs(d[2]) <= 2) ok.d3t++;
    if (Math.abs(d[3]) <= 2) ok.d3e++;
    const n = [pct(A.day1_t, N.day1_t), pct(A.day3_t, N.day3_t), pct(A.day3_earned, N.day3_earned)];
    console.log(`| ${r.seed} | ${A.day1_t.toFixed(1)} / ${T.day1_t.toFixed(1)} / ${N.day1_t.toFixed(1)} | ${A.day1_earned} / ${T.day1_earned} / ${N.day1_earned} | ${A.day3_t.toFixed(1)} / ${T.day3_t.toFixed(1)} / ${N.day3_t.toFixed(1)} | ${A.day3_earned} / ${T.day3_earned} / ${N.day3_earned} | ${d.map(f).join(', ')} | ${n.map(f).join(', ')} |`);
  }
  const broken = rows.reduce((a, r) => a + (r.ahead.broken ?? 0) + (r.tripByTrip.broken ?? 0) + (r.noRuns.broken ?? 0), 0);
  console.log(`within 2 % (the gate: at least 13 of ${rows.length} each): day 1 tonnes ${ok.d1t}, day 1 earnings ${ok.d1e}, day 3 tonnes ${ok.d3t}, day 3 earnings ${ok.d3e}; broken promises in the bots' records: ${broken}`);
}

void main();
