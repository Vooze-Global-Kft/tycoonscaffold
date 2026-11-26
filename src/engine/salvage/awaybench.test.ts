/**
 * THE AWAY BENCH ON THE REAL CONTENT (findings R3 and H3): games/scrap-yard/game.json, a state the bot
 * PLAYED to minute 60 (seed 257, the normal hand), six hours away; prints the node CPU time
 * (process.cpuUsage) of the pass. The aim is 50 ms (2.16). The limit is 1000 ms of node CPU (600 until the final tuning made the minute-60 yard busier): the lead's
 * ruling on R3/H3 (20:30, requests.md) accepts the halved pass for stage 1, and the aggregation of crew legs
 * (crew.ts handDepart/cutterDepart per instant) is the NEXT STAGE'S FIRST ENGINEERING ITEM, which brings it
 * back under the 150 ms gate (join2: measured 357 ms at load 4.5). The caps are lifted to six hours for the measure, so the pass is six hours long on any
 * tuning of E33's caps. Owner: rules-sim-a.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { awayPass } from './away';
import { newBot, playTo, seededCfg, startGame } from './bot';
import type { SalvageConfig } from './types';

const NOW = Date.UTC(2026, 10, 25, 9);

function realCfg(): SalvageConfig {
  const raw = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
  const salvage = SalvageSchema.parse(raw.salvage) as Record<string, unknown>;
  // Six hours on every rung (whatever E33's caps are tuned to): the bench measures six hours.
  const lifted = { ...salvage, awayCapByRung_h: [6, 6, 6], nightWatch_h: 0 };
  return { mode: 'salvage', salvage: lifted } as unknown as SalvageConfig;
}

function cpuMs(f: () => void): number {
  const a = process.cpuUsage();
  f();
  const d = process.cpuUsage(a);
  return (d.user + d.system) / 1000;
}

describe('the away bench on the real content', () => {
  it('a played minute-60 state, six hours away, at most 250 ms of node CPU (the lead, 26 Nov 03:45; the aim stays 50)', () => {
    const cfg = seededCfg(realCfg(), 257);
    const b = newBot(cfg, startGame(cfg, NOW), NOW, { seed: 257, hand: 'normal', habit: 'all', route: 'A' } as Parameters<typeof newBot>[3]);
    playTo(b, 3600);
    const g = { ...b.g, lastSavedAt: b.g.salvage.clock.highMs };
    const to = g.salvage.clock.highMs + 6 * 3600_000;
    let out = awayPass(cfg, g, to);
    let best = Infinity;
    for (let k = 0; k < 4; k++) best = Math.min(best, cpuMs(() => (out = awayPass(cfg, g, to))));
    const a = out.salvage.away;
    process.stderr.write(`away bench (real content, minute 60, seed 257): six hours away ${best.toFixed(1)} ms node CPU (ran ${a?.seconds} s; sales ${a?.money}; loads ${a?.loads}; things ${g.salvage.things.length}, crew ${g.salvage.crew.length})\n`);
    expect(a?.seconds).toBe(6 * 3600);
    // 22:40, the lead: after the final tuning (REPORT6) and E35 the minute-60 yard is busier and the six hours
    // measured 670 to 715 ms (stage 1's limit was 1000). engine2-group (26 November, 03:20, load average 0.6
    // to 0.8): crew trips grouped out of sight (2.1: hands' runs of 30 s, the cutter's of 120 s, the driver's
    // trip planned, the merchant's round 120 s) and the leg-by-leg decisions made cheaper without changing
    // them. Measured (best of 4 here): 173 to 183 ms at load 0.6 to 1.0, 195 to 199 ms at load 1.8 to 2.8
    // (727 ms before on the same machine; with grouping off the decisions alone give 290 to 350 ms). The limit
    // is the ruling's 150: NOT MET by this step (notes/engine2-group.md section 4 names what remains).
    // The lead, 26 Nov 03:45: grouping brought the six hours from about 727 ms to about 175 ms on a quiet machine
    // (195 in the full suite). What remains is work per whole item (pick-ups, pieces, weigh-ins), which grouping
    // does not remove. The gate is 250 ms; 150 and the aim of 50 wait for whole-cycle aggregation of that work.
    // engine2-fixA, 26 Nov 06:01 (RULING2.md 14.1 to 14.3: the run is the rule in sight and out of it, no long
    // round, no grouped machine segment): 213.8 ms best of 5 at load average 9.0 (other engineers' runs; the
    // same state with every run made trip by trip, group.ahead false: 278.8 ms; with no runs at all: 292.5 ms);
    // 254 ms in the full suite at load 12. Not measured on a quiet machine: the lead measures it alone.
    expect(best).toBeLessThanOrEqual(250);
  }, 600_000);
});
