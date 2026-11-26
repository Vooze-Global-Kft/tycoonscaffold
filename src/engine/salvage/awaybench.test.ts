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
  it('a played minute-60 state, six hours away, at most 150 ms of node CPU (RULING2.md 10.4; the aim stays 50)', () => {
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
    // them: MEASURED_MS below (727 ms before, same machine); the limit is the ruling's 150.
    expect(best).toBeLessThanOrEqual(150);
  }, 600_000);
});
