/// <reference types="node" />
/**
 * Fourth rules audit (the last check of the contract rule, Decisions 56 and 64, after rules3 and
 * numbers3). Every test here states a rule of Decision 56 or 64 and FAILS on the checkout it was
 * written against (space-fix after 984b37e): each one is a finding of the check and passes once that
 * finding is fixed. Scratch evidence and scripts: the checker's folder space-check3-rules (s/*.ts).
 * All stations are the balance bot's own (runHaulBot, shipped game.json, no offline), as Decision
 * 56's conditions ask.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import space from '../../games/space-miner/game.json';
import { GameConfigSchema } from '../config/schema';
import * as H from './haul';
import { runHaulBot } from './haul/bot';
import { withHaulContent } from './haulMode';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;
const L = cfg.haul.contracts.launches;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const S: Record<string, Run> = {};
beforeAll(() => {
  const a = runHaulBot(cfg, { hours: 3610 / 3600, prestige: false, seed: 12345, keepAt: [240, 3600], noOffline: true } as never);
  const b = runHaulBot(cfg, { hours: 1510 / 3600, prestige: false, seed: 4, keepAt: [600, 1500], noOffline: true } as never);
  for (const [t, g] of Object.entries(a.states)) S[`12345@${t}`] = H.reconcileHaul(cfg, clone(g) as never, clone(g)) as Run;
  for (const [t, g] of Object.entries(b.states)) S[`4@${t}`] = H.reconcileHaul(cfg, clone(g) as never, clone(g)) as Run;
}, 240_000);

const st = (k: string): Run => clone(S[k]);
const basis = (g: Run) => H.contractBasis(cfg, H.haulParams(cfg, g), g.haul);
const offer = (g: Run, k: number) => H.offerAt(cfg, g.haul.seed, k, basis(g));
function viewOf(g: Run, c: H.Contract): H.ContractView {
  const s = clone(g);
  s.haul.contracts = { ...s.haul.contracts, board: [clone(c)], active: null };
  return H.contractViews(cfg, H.haulParams(cfg, s), s.haul)[0];
}
function step(g: Run, ev?: H.HaulEvent[]): Run {
  return H.advanceHaul(cfg, g, 0.5, 0, ev) as Run;
}
/** The autopilot runs until the taken contract is met (true) or lapses (false); no drone is moved. */
function untouched(g0: Run): boolean | null {
  let g = g0;
  g.haul.autopilot = { online: true, policy: 'contract' };
  for (let i = 0; i < 40000; i++) {
    const ev: H.HaulEvent[] = [];
    g = step(g, ev);
    for (const e of ev) {
      if (e.type === 'contractMet') return true;
      if (e.type === 'contractLapsed') return false;
    }
  }
  return null;
}
function taking(g: Run, c: H.Contract): Run {
  const s = clone(g);
  s.haul.contracts = { ...s.haul.contracts, unlocked: true, board: [{ ...clone(c), taken: true, launchesLeft: L, wants: c.wants.map((w) => ({ ...w, got: 0 })) }], next: c.k + 1, active: 0, sizedF: H.haulParams(cfg, s).F };
  return s;
}
/** Warp-outs of natural play (autopilot 'full', nothing taken), calling `each` after every warp-out. */
function warpOuts(g0: Run, n: number, each: (g: Run, w: number) => void): Run {
  let g = g0;
  g.haul.autopilot = { online: true, policy: 'full' };
  let w = 0;
  for (let i = 0; i < 400000 && w < n; i++) {
    const ev: H.HaulEvent[] = [];
    g = step(g, ev);
    if (ev.some((e) => e.type === 'warp')) each(g, ++w);
  }
  return g;
}
const oresKey = (v: H.ContractView) => v.wants.map((w) => w.ore).sort().join('+');
const raiseOf = (v: H.ContractView) => Math.max(...v.wants.map((w) => w.left / Math.max(1e-9, L * w.perLaunch) - 1));

describe('audit 4: the board never lies (Decisions 56 and 64)', () => {
  it('a fresh offer never reads ON PACE (seed 12345, the bot at 60 minutes)', () => {
    // Every one of 40 draws reads ON PACE (paceRatio 1.006, raise 0) and lapses untouched at about half:
    // the life-aware figure (`lasting`, routeSchedule) gives iron 1.04M a launch because copper slot 2
    // (life 0, pile left) is counted as drying and iron as filling the hold after it; the rock comes
    // back as copper and launches keep shipping 0.64M iron. The cap L × recent × (1 + raise.hi) sits
    // under the floor L × lasting × (1 + raise.lo / 2), and the cap wins.
    const g = st('12345@3600');
    const green: string[] = [];
    for (let k = 1; k <= 40; k++) {
      const c = offer(g, g.haul.contracts.next + 100 + k);
      if (c && viewOf(g, c).onPace) green.push(c.wants.map((w) => `${w.ore}:${w.units}`).join('+'));
    }
    expect(green, 'offers drawn ON PACE').toEqual([]);
  }, 120_000);

  it('an offer that reads ON PACE when taken is met with nothing done (or it does not read ON PACE)', () => {
    const g = st('12345@3600');
    const c = offer(g, g.haul.contracts.next + 101)!;
    const t = taking(g, c);
    const v = H.contractViews(cfg, H.haulParams(cfg, t), t.haul)[0];
    if (v.onPace) expect(untouched(t), `${JSON.stringify(c.wants)} read ON PACE at the pick`).toBe(true);
  }, 120_000);

  it('no drawn offer needs more than raise.hi plus a small margin (seed 12345, the bot at 4 minutes)', () => {
    // Decision 64: units at most L × (the steady per-launch figure of the routes) × (1 + raise.hi).
    // Every copper offer of this first board reads NEEDS +153 % (258 copper against 17 a launch).
    const g = st('12345@240');
    const over: string[] = [];
    for (let k = 1; k <= 40; k++) {
      const c = offer(g, g.haul.contracts.next + 100 + k);
      if (!c) continue;
      const v = viewOf(g, c);
      if (v.raise > cfg.haul.contracts.raise[1] + 0.05) over.push(`${c.wants.map((w) => `${w.ore}:${w.units}`).join('+')} +${Math.round(v.raise * 100)} %`);
    }
    expect(over).toEqual([]);
  }, 120_000);

  it('two offers on a board never want the same ores with raises closer than raiseGap (seed 4, natural play from 25 minutes)', () => {
    // 20 of 30 boards break it, e.g. iron:405773 x1.4 next to iron:459012 x1.4 and iron:459939 x1.4.
    const g = st('4@1500');
    const bad: string[] = [];
    warpOuts(H.pickContract(cfg, g, null) as Run, 12, (s, w) => {
      const V = H.contractViews(cfg, H.haulParams(cfg, s), s.haul);
      for (let a = 0; a < V.length; a++)
        for (let b = a + 1; b < V.length; b++)
          if (oresKey(V[a]) === oresKey(V[b]) && Math.abs(raiseOf(V[a]) - raiseOf(V[b])) < cfg.haul.contracts.raiseGap - 1e-6)
            bad.push(`warp ${w}: ${V[a].wants.map((x) => `${x.ore}:${x.units}`).join('+')} x${V[a].contract.mult} / ${V[b].wants.map((x) => `${x.ore}:${x.units}`).join('+')} x${V[b].contract.mult}`);
    });
    expect(bad).toEqual([]);
  }, 120_000);

  it('the quota offers of a one-ore board do not stay identical and green once a second ore ships (seed 4, 10 minutes)', () => {
    // The bot's board holds iron:49486 x1.3 twice, both ON PACE, on a station that ships iron and
    // copper; refloorOffers leaves them as they are at the next warp-outs.
    const g = st('4@600');
    const bad: string[] = [];
    warpOuts(H.pickContract(cfg, g, null) as Run, 3, (s, w) => {
      if (H.boardNote(cfg, s) === 'secondOre') return;
      for (const v of H.contractViews(cfg, H.haulParams(cfg, s), s.haul)) if (!v.contract.taken && v.onPace) bad.push(`warp ${w}: ${v.wants.map((x) => `${x.ore}:${x.units}`).join('+')} x${v.contract.mult}`);
    });
    expect(bad).toEqual([]);
  }, 120_000);
});

describe('audit 4: a contract is not met by doing nothing (Decision 56, conditions 2 and 3)', () => {
  it('with two freighter levels bought after taking, at most 10 % of 40 offers are met untouched (seed 4, 10 minutes)', () => {
    // 14 of 40 (one level: 6 of 40). The order is resized (contractResized), yet the piles carry it.
    const g = st('4@600');
    let met = 0;
    for (let k = 1; k <= 40; k++) {
      const c = offer(g, g.haul.contracts.next + 100 + k);
      if (!c) continue;
      let s = taking(g, c);
      for (let i = 0; i < 2; i++) s = H.buyFreighter(cfg, { ...s, cash: 1e30 }) as Run;
      if (untouched(s)) met++;
    }
    expect(met).toBeLessThanOrEqual(4);
  }, 240_000);

  it('recalling an ore\'s drones, dropping and restoring after the warp-out draws does not give a contract met untouched (seed 4, 10 minutes, iron)', () => {
    // The offer drawn into the empty place is iron:49483, under L × recent (6 × 8798 = 52.8K): the
    // floor reads the routes as they are at the draw (emptied), and it is met with every drone back.
    let g = st('4@600');
    g.haul.autopilot = { online: true, policy: 'full' };
    g = H.pickContract(cfg, g, null) as Run;
    const before = new Set(g.haul.contracts.board.map((c) => c.k));
    const where: number[] = [];
    g.haul.slots.forEach((s, i) => {
      if (s.claimed && s.ore === 'iron') for (let n = 0; n < s.haulers; n++) where.push(i);
    });
    for (const i of where) g = H.recallDrone(cfg, g, i) as Run;
    let idx = -1;
    for (let i = 0; i < 4000 && idx < 0; i++) {
      const ev: H.HaulEvent[] = [];
      g = step(g, ev);
      if (ev.some((e) => e.type === 'warp')) idx = g.haul.contracts.board.findIndex((c) => !before.has(c.k) && c.wants.some((w) => w.ore === 'iron'));
      if (ev.some((e) => e.type === 'warp') && idx < 0) break;
    }
    expect(idx, 'an iron offer is drawn on the emptied routes').toBeGreaterThanOrEqual(0);
    for (const i of where) g = H.assignDrone(cfg, g, i) as Run;
    g = H.pickContract(cfg, g, idx) as Run;
    expect(untouched(g), JSON.stringify(H.activeContract(g.haul)?.wants)).toBe(false);
  }, 120_000);
});
