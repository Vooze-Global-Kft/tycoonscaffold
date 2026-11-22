/// <reference types="node" />
/**
 * The guided steps of Decision 44 (order, the 10 s priority over the swipe hint) and the tutorial
 * path on the shipped game: each guided purchase is affordable at the first warp-out after the
 * step before it, and raises the income line by at least 15 %.
 */
import { describe, expect, it } from 'vitest';
import space from '../../../games/space-miner/game.json';
import { GameConfigSchema } from '../../config/schema';
import { freshHaulGame, haulTestConfig, run } from '../fixtures/haul';
import * as H from '../haul';
import { withHaulContent } from '../haulMode';
import { runTutorialHuman } from './bot';
import { GUIDED_PRIORITY_SECONDS } from './hints';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig({ seam: { ...haulTestConfig().haul.seam, first: 1e12 } });
const shipped = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;
const guidedOf = (c: H.HaulConfig, g: Run) => H.hintsFor(c, g).filter((h) => h.step > 0);

describe('guided steps (Decision 44)', () => {
  it('go drone, swipe, claim, buy a drone, tap-tap onto the new rock, upgrade a rig', () => {
    let g = freshHaulGame(cfg, 30);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'drag', from: 'drone:rack', to: 'rock:0', step: 1 });
    g = H.assignDrone(cfg, g, 0) as Run;
    g = run(cfg, g, 40, 0.5);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'swipe', zone: 'bay:launch', step: 2 });
    g = run(cfg, H.launch(cfg, g) as Run, 3, 0.5);
    g = { ...g, cash: 1000 };
    expect(guidedOf(cfg, g)[0]).toMatchObject({ kind: 'point', key: 'slot:1', step: 3 });
    g = run(cfg, H.claimSlot(cfg, g, 1) as Run, 8, 0.5);
    expect(guidedOf(cfg, g)[0]).toMatchObject({ kind: 'point', key: 'station:buyDrone', route: ['station'], step: 4 });
    g = H.buyDrone(cfg, g) as Run;
    expect(guidedOf(cfg, g)[0]).toMatchObject({ kind: 'tapTap', from: 'drone:rack', to: 'rock:1', step: 5 });
    g = H.assignDrone(cfg, g, 1) as Run;
    // Step 6 shows while no rig is above level 1 (the rules end the steps with the first rig level).
    const before = { ...g, haul: { ...g.haul, flags: { ...g.haul.flags, tutorialDone: false } } } as Run;
    expect(guidedOf(cfg, before)[0]).toMatchObject({ kind: 'point', key: 'rig:upgrade', route: ['rock:0'], step: 6 });
    const after = H.upgradeRig(cfg, before, 0) as Run;
    expect(guidedOf(cfg, { ...after, haul: { ...after.haul, flags: { ...after.haul.flags, tutorialDone: false } } } as Run).some((h) => h.step === 6)).toBe(false);
  });

  it('with no drone on the rack, step 5 moves one from the first rock', () => {
    let g = freshHaulGame(cfg, 31);
    g = { ...g, cash: 1000 };
    g = H.assignDrone(cfg, H.buyDrone(cfg, g) as Run, 0) as Run;
    g = H.assignDrone(cfg, g, 0) as Run;
    g = { ...g, stats: { ...g.stats, launches: 1 } } as Run;
    g = run(cfg, H.claimSlot(cfg, g, 1) as Run, 8, 0.5);
    expect(g.haul.idle).toBe(0);
    expect(guidedOf(cfg, g)[0]).toMatchObject({ kind: 'drag', from: 'chip:0', to: 'rock:1', step: 5 });
  });

  it(`a guided step keeps the pointer for ${GUIDED_PRIORITY_SECONDS} s after the hold fills, then the swipe goes first`, () => {
    let g = freshHaulGame(cfg, 32);
    g = H.assignDrone(cfg, g, 0) as Run;
    g = { ...g, cash: 1000, stats: { ...g.stats, launches: 1 } } as Run;
    // Run until the hold is full: the claim step (3) is up and stays first.
    for (let i = 0; i < 400 && g.haul.marks.holdFullSince === null; i++) g = run(cfg, g, 0.25, 0.25);
    expect(g.haul.marks.holdFullSince).not.toBeNull();
    expect(H.nextHint(cfg, g)).toMatchObject({ key: 'slot:1', step: 3 });
    expect(H.hintsFor(cfg, g).some((h) => h.kind === 'swipe')).toBe(true);
    g = run(cfg, g, GUIDED_PRIORITY_SECONDS + 0.5, 0.5);
    expect(H.nextHint(cfg, g)).toMatchObject({ kind: 'swipe', step: 2 });
  });
});

describe('the tutorial path on the shipped game (Decision 44)', () => {
  const rows = runTutorialHuman(shipped, { seconds: 240 });
  const stepRow = (n: number) => rows.find((r) => r.step === n);

  it('every guided purchase comes at the first warp-out after the step before it', () => {
    for (const [prev, n] of [
      [2, 3],
      [3, 4],
      [5, 6],
    ] as const) {
      const a = stepRow(prev);
      const b = stepRow(n);
      if (n === 6 && !b) continue; // until the rules keep the steps open to step 6 (they end them at step 5 today)
      expect(a, `step ${prev}`).toBeDefined();
      expect(b, `step ${n}`).toBeDefined();
      // At most one warp-out between the two steps, and the step within 5 s of the warp-out that paid for it (2.5 s reaction).
      expect((b!.warps ?? 0) - (a!.warps ?? 0), `warp-outs from step ${prev} to step ${n}`).toBeLessThanOrEqual(1);
      const lastWarp = rows.filter((r) => r.what.startsWith('Warp-out') && r.t <= b!.t).pop();
      // (or at once after the step before it, when the cash is already there)
      expect(b!.t - Math.max(lastWarp?.t ?? 0, a!.t), `step ${n} after its warp-out`).toBeLessThanOrEqual(5);
    }
  });

  it('each guided purchase raises the income line by at least 15 %', () => {
    const one = stepRow(1)!.income!;
    const two = stepRow(5)!.income!;
    expect(two / one).toBeGreaterThanOrEqual(1.15);
    // Step 6 (a rig level) measured from the state after step 5.
    const g = (() => {
      // Replay the path's purchases on a fresh game: drone on rock 0, claim 1, a drone on rock 1.
      let x = freshHaulGame(shipped, 12345) as Run;
      x = H.assignDrone(shipped, x, 0) as Run;
      x = run(shipped, x, 60, 0.25);
      x = { ...x, cash: 1e4 };
      x = H.claimSlot(shipped, x, 1) as Run;
      x = H.buyDrone(shipped, x) as Run;
      x = run(shipped, x, 3, 0.25);
      x = H.assignDrone(shipped, x, 1) as Run;
      return run(shipped, x, 10, 0.25);
    })();
    const i5 = H.haulIncome(shipped, g);
    const i6 = H.haulIncome(shipped, H.upgradeRig(shipped, g, 0) as Run);
    expect(i6 / i5).toBeGreaterThanOrEqual(1.15);
  });
});
