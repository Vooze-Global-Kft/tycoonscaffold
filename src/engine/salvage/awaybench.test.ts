/**
 * THE AWAY BENCH ON THE REAL CONTENT (findings R3 and H3): games/scrap-yard/game.json, a state the bot
 * PLAYED to minute 60 (seed 257, the normal hand), six hours away; prints the node CPU time
 * (process.cpuUsage) of the pass. The aim is 50 ms (2.16). The limit is 600 ms of node CPU: the lead's
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
  const lifted = { ...salvage, awayCap_h: [6, 6], ...('awayCapByRung_h' in salvage ? { awayCapByRung_h: [6, 6, 6], nightWatch_h: 0 } : {}) };
  return { mode: 'salvage', salvage: lifted } as unknown as SalvageConfig;
}

function cpuMs(f: () => void): number {
  const a = process.cpuUsage();
  f();
  const d = process.cpuUsage(a);
  return (d.user + d.system) / 1000;
}

describe('the away bench on the real content', () => {
  it('a played minute-60 state, six hours away, at most 600 ms of node CPU (stage-1 ruling; 150 ms after the next stage\'s crew-leg aggregation)', () => {
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
    expect(best).toBeLessThanOrEqual(600);
  }, 600_000);
});
