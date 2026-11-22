/// <reference types="node" />
/**
 * Decision 44: the tutorial's purchases each raise income, in this order, with the shipped numbers
 * (games/space-miner/game.json): 1 drag the drone, 2 swipe, 3 claim the second rock, 4 buy a drone,
 * 5 put it on the new rock, 6 upgrade a rig. Each purchase is affordable within 5 s of a warp-out on
 * the tutorial path, and each guided purchase raises the income line by at least 15 % once its step
 * is done (the claim and the drone count as done when the new rock is worked).
 */
import { describe, expect, it } from 'vitest';
import space from '../../games/space-miner/game.json';
import { GameConfigSchema } from '../config/schema';
import { freshHaulGame } from './fixtures/haul';
import * as H from './haul';
import { withHaulContent } from './haulMode';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;

/** Plays the tutorial path: launches each full hold by hand; returns when `ready` holds, with the seconds since the last warp-out. */
let lastWarp = 0;
function until(g: Run, ready: (s: Run) => boolean, limit = 600): { g: Run; sinceWarp: number } {
  let s = g;
  for (let i = 0; i < limit * 10; i++) {
    if (ready(s)) return { g: s, sinceWarp: s.haul.clock - lastWarp };
    if (H.canLaunch(s) && H.holdTotal(s.haul) >= H.haulParams(cfg, s).F - H.EPS) s = H.launch(cfg, s) as Run;
    const ev: H.HaulEvent[] = [];
    s = H.advanceHaul(cfg, s, 0.1, 0, ev) as Run;
    if (ev.some((e) => e.type === 'warp')) lastWarp = s.haul.clock;
  }
  throw new Error('the tutorial path did not reach the step');
}

describe('Decision 44: the tutorial path with the shipped numbers', () => {
  it('each guided purchase is affordable within 5 s of a warp-out and raises the income line by at least 15 %', () => {
    let g = freshHaulGame(cfg, 12345);
    g = H.assignDrone(cfg, g, 0) as Run;
    const steps: { step: string; sinceWarp: number; before: number; after: number }[] = [];
    // The first warp-out.
    g = until(g, (s) => s.stats.launches >= 1).g;
    // 3 + 4 + 5: claim, buy a drone, put it on the new rock.
    let r = until(g, (s) => H.affordable(s.cash, H.claimCost(cfg, s, 1)));
    const before3 = H.haulIncome(cfg, r.g);
    steps.push({ step: 'claim', sinceWarp: r.sinceWarp, before: before3, after: NaN });
    g = H.claimSlot(cfg, r.g, 1) as Run;
    r = until(g, (s) => H.affordable(s.cash, H.droneCost(cfg, s)) && s.haul.slots[1].respawnAt === null);
    steps.push({ step: 'drone', sinceWarp: r.sinceWarp, before: before3, after: NaN });
    g = H.buyDrone(cfg, r.g) as Run;
    g = H.assignDrone(cfg, g, 1) as Run;
    const after5 = H.haulIncome(cfg, g);
    steps[0].after = after5;
    steps[1].after = after5;
    // 6: upgrade the first rock's rig.
    r = until(g, (s) => H.affordable(s.cash, H.rigCost(cfg, s, 0)));
    const before6 = H.haulIncome(cfg, r.g);
    g = H.upgradeRig(cfg, r.g, 0) as Run;
    steps.push({ step: 'rig', sinceWarp: r.sinceWarp, before: before6, after: H.haulIncome(cfg, g) });
    expect(g.haul.flags.tutorialDone).toBe(true);
    const report = steps.map((x) => `${x.step}: ${x.sinceWarp.toFixed(1)} s after a warp-out, income x${(x.after / x.before).toFixed(2)}`).join('; ');
    for (const x of steps) {
      expect(x.sinceWarp, report).toBeLessThanOrEqual(5 + 1e-9);
      expect(x.after / x.before, report).toBeGreaterThanOrEqual(1.15);
    }
  }, 60_000);
});
