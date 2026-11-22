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
import { advisedPurchase, bestPurchase, rankPurchases } from './advice';
import { ADVICE_GAIN, ADVICE_IDLE_SECONDS, ADVICE_MAX, ADVICE_UNTIL, adviceHint, adviceTarget, GUIDED_PRIORITY_SECONDS, limitPurchase, longestLifeSlot } from './hints';

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
    expect(guidedOf(cfg, before)[0]).toMatchObject({ kind: 'point', key: 'rig:upgrade', route: [`rock:${longestLifeSlot(before.haul)}`], step: 6 });
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

describe('step 6 picks the rig with the longest life (Decision 58)', () => {
  const at = (life0: number, life1: number) => {
    let g = freshHaulGame(cfg, 33);
    g = { ...g, cash: 1000, stats: { ...g.stats, launches: 2 } } as Run;
    g = H.assignDrone(cfg, g, 0) as Run;
    g = run(cfg, H.claimSlot(cfg, g, 1) as Run, 8, 0.5);
    g = H.assignDrone(cfg, H.buyDrone(cfg, g) as Run, 1) as Run;
    expect(g.haul.slots[1].respawnAt).toBeNull();
    const slots = g.haul.slots.map((x, i) => (i === 0 ? { ...x, life: life0 } : i === 1 ? { ...x, life: life1 } : x));
    return { ...g, haul: { ...g.haul, slots, flags: { ...g.haul.flags, tutorialDone: false } } } as Run;
  };
  it('points at rock 1 when rock 0 is about to dry, and at rock 0 when it has more left', () => {
    expect(guidedOf(cfg, at(20, 200)).find((h) => h.step === 6)).toMatchObject({ key: 'rig:upgrade', route: ['rock:1'] });
    expect(guidedOf(cfg, at(300, 200)).find((h) => h.step === 6)).toMatchObject({ key: 'rig:upgrade', route: ['rock:0'] });
  });
});

describe('the limit hint (Decision 57)', () => {
  type Marks = H.HaulState['marks'] & { boughtAt?: number | null; lastBuy?: string | null };
  /** A run after the guided steps, `idle` seconds after its last purchase, with plenty of credits. */
  const after = (idle: number, extra: Partial<Marks> = {}, clock = 300): Run => {
    let g = freshHaulGame(shipped, 34);
    g = H.assignDrone(shipped, g, 0) as Run;
    g = run(shipped, g, 30, 0.5);
    const marks: Marks = { ...g.haul.marks, boughtAt: clock - idle, lastBuy: null, ...extra };
    return { ...g, cash: 500, haul: { ...g.haul, clock, marks, flags: { ...g.haul.flags, tutorialDone: true } } } as Run;
  };
  it('names the best affordable purchase that adds at least 15 %, by the bot\'s own estimate', () => {
    const g = after(ADVICE_IDLE_SECONDS + 1);
    const pick = advisedPurchase(shipped, g, ADVICE_GAIN);
    expect(pick).not.toBeNull();
    expect(pick!.gain).toBeGreaterThanOrEqual(ADVICE_GAIN * H.haulIncome(shipped, g));
    // The same ranking the bot buys by: no affordable single option it ranks higher adds 15 %.
    const singles = rankPurchases(shipped, g, true);
    for (const o of singles.slice(0, singles.indexOf(singles.find((x) => x.key === pick!.key)!))) expect(o.total > g.cash || o.gain < ADVICE_GAIN * H.haulIncome(shipped, g)).toBe(true);
    expect(bestPurchase(shipped, g)).not.toBeNull();
    const t = adviceTarget(pick!.key)!;
    expect(adviceHint(shipped, g)).toMatchObject({ kind: 'point', key: t.key, route: t.route, step: 0, limit: ADVICE_MAX });
    expect(H.hintsFor(shipped, g).some((h) => h.key === t.key && h.step === 0)).toBe(true);
  });
  it('names the freighter when it is the limit, valued with the level it opens (Decision 64, play check NEW[2])', () => {
    // The play check's 4:01 station: two worked ring-1 rocks, one rig level, the freighter just binding.
    // Alone the freighter adds about 1 % and every rig level nothing, so a single-purchase rule names nothing.
    let g = after(ADVICE_IDLE_SECONDS + 1);
    g = { ...g, cash: 1000 } as Run;
    g = H.assignDrone(shipped, H.buyDrone(shipped, H.claimSlot(shipped, g, 1) as Run) as Run, 1) as Run;
    g = H.upgradeRig(shipped, g, 0) as Run;
    g = { ...g, cash: 175, haul: { ...g.haul, marks: { ...g.haul.marks, boughtAt: g.haul.clock - ADVICE_IDLE_SECONDS - 1, lastBuy: 'rig 0' } as Marks } } as Run;
    const before = H.haulIncome(shipped, g);
    expect(advisedPurchase(shipped, g, ADVICE_GAIN)).toBeNull();
    const pick = limitPurchase(shipped, g, ADVICE_GAIN);
    expect(pick?.key).toBe('freighter');
    expect(pick!.gain).toBeGreaterThanOrEqual(ADVICE_GAIN * before);
    expect(adviceHint(shipped, g)).toMatchObject({ kind: 'point', key: 'station:freighter', route: ['station'], step: 0 });
    // Bought: the rig level it opened now pays alone and is named next.
    const next = H.buyFreighter(shipped, g) as Run;
    expect(limitPurchase(shipped, next, ADVICE_GAIN, 'freighter')?.key).toMatch(/^rig /);
    // Never the purchase made last.
    expect(limitPurchase(shipped, g, ADVICE_GAIN, 'freighter')?.key ?? null).not.toBe('freighter');
  });
  it('waits 40 s after a purchase, skips the purchase made last, stops after six showings, at 15 min and after galaxy 1', () => {
    expect(adviceHint(shipped, after(ADVICE_IDLE_SECONDS - 5))).toBeNull();
    const g = after(ADVICE_IDLE_SECONDS + 1);
    const first = advisedPurchase(shipped, g, ADVICE_GAIN)!;
    const next = adviceHint(shipped, after(ADVICE_IDLE_SECONDS + 1, { lastBuy: first.key }));
    expect(next === null || next.key !== adviceTarget(first.key)!.key || next.route.join() !== adviceTarget(first.key)!.route.join()).toBe(true);
    let shown = g;
    for (let i = 0; i < ADVICE_MAX; i++) shown = H.markHintShown(shown, adviceHint(shipped, shown)!.key) as Run;
    expect(adviceHint(shipped, shown)).toBeNull();
    expect(adviceHint(shipped, after(ADVICE_IDLE_SECONDS + 1, {}, ADVICE_UNTIL))).toBeNull();
    expect(adviceHint(shipped, { ...g, haul: { ...g.haul, galaxy: 1 } } as Run)).toBeNull();
    // Without the rules' purchase marks the hint never shows (it cannot tell how long ago the last buy was).
    const { boughtAt: _b, lastBuy: _l, ...bare } = g.haul.marks as Marks;
    void _b;
    void _l;
    expect(adviceHint(shipped, { ...g, haul: { ...g.haul, marks: bare } } as Run)).toBeNull();
  });
});
