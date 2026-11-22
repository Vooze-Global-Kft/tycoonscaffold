/// <reference types="node" />
/**
 * Third rules audit (the fix round after 19c2791: Decision 40's contract over several launches, the
 * day shift, the re-tune). Every test here states a rule the game should follow and FAILS on the
 * checkout it was written against: each one is a finding of the verification, and passes once that
 * finding is fixed. Scratch evidence: the verifier's scratch folder, space-verify-rules.
 */
import { describe, expect, it } from 'vitest';
import space from '../../games/space-miner/game.json';
import { GameConfigSchema } from '../config/schema';
import { shaped } from './fixtures/haul';
import * as H from './haul';
import { runHaulBot } from './haul/bot';
import { withHaulContent } from './haulMode';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = withHaulContent(GameConfigSchema.parse(space)) as unknown as H.HaulConfig;
const L = cfg.haul.contracts.launches;

/** The station of audit 2 (about 10 minutes of the bot): iron and copper, 13 drones, autopilot on `contract`. */
function tenMinutes(): Run {
  return shaped(cfg, 4242, { slots: [0, 1, 2, 3], haulers: [4, 3, 4, 2], rig: [10, 10, 4, 4], capLevel: 3, freighter: 8, autopilot: true, policy: 'contract', idle: 0 });
}

/** Runs the autopilot until the taken contract is met (true) or lapses (false); no drone is moved. */
function untouched(g0: Run): boolean | null {
  let g = g0;
  let met: boolean | null = null;
  for (let i = 0; i < 20000 && met === null; i++) {
    const ev: H.HaulEvent[] = [];
    g = H.advanceHaul(cfg, g, 0.5, 0, ev) as Run;
    for (const e of ev) {
      if (e.type === 'contractMet') met = true;
      if (e.type === 'contractLapsed') met = false;
    }
  }
  return met;
}

function draw(g: Run, k: number): H.Contract {
  const p = H.haulParams(cfg, g);
  return H.contractAt(cfg, g.haul.seed, k, H.claimedRings(cfg, g.haul), p.F, g.haul.trait, H.contractStation(cfg, p, g.haul));
}

function taking(g: Run, c: H.Contract): Run {
  return { ...g, haul: { ...g.haul, contracts: { unlocked: true, board: [{ ...c, taken: true, launchesLeft: L, wants: c.wants.map((w) => ({ ...w, got: 0 })) }], next: c.k + 1, active: 0 } } };
}

describe('audit 3: a contract is not met by doing nothing (Decision 40, "never free")', () => {
  it('buying one freighter level after taking it, and nothing else, does not meet it', () => {
    // The never-free bound is L × now × (1 + margin) with `now` a share of F, so it scales with the
    // freighter: one level (F × growth 1.45) is more than the 20 % margin. Every player buys freighter
    // levels during a contract; on this station all 10 contracts are then met with no drone moved.
    const g0 = tenMinutes();
    const met: number[] = [];
    for (let k = 1; k <= 10; k++) {
      const g = taking(g0, draw(g0, k));
      const bigger: Run = { ...g, haul: { ...g.haul, freighter: { ...g.haul.freighter, level: g.haul.freighter.level + 1 } } };
      if (untouched(bigger)) met.push(k);
    }
    expect(met, 'contracts met by a bigger freighter alone').toEqual([]);
  });

  it('a contract drawn while an ore\'s drones are on the rack is not met once they go back, untouched', () => {
    // The units are drawn from the routes as they are at the draw. Recall the drones of one ore, drop
    // the taken contract (its replacement is drawn now, on the emptied routes), put the drones back and
    // take the new one: it asks for a fraction of what the routes always delivered.
    for (const ore of ['iron', 'copper']) {
      let g = tenMinutes();
      const p = H.haulParams(cfg, g);
      g = { ...g, haul: { ...g.haul, contracts: H.openBoard(cfg, g.haul, p.F, p) } };
      const where: number[] = [];
      g.haul.slots.forEach((s, i) => {
        if (s.claimed && s.ore === ore) for (let n = 0; n < s.haulers; n++) where.push(i);
      });
      for (const i of where) g = H.recallDrone(cfg, g, i) as Run;
      g = H.pickContract(cfg, g, 1) as Run; // drops contract 0: its slot gets a fresh draw
      const fresh = g.haul.contracts.board[0];
      for (const i of where) g = H.assignDrone(cfg, g, i) as Run;
      g = H.pickContract(cfg, g, 0) as Run;
      expect(H.activeContract(g.haul)?.k).toBe(fresh.k);
      expect(untouched(g), `${ore}: ${JSON.stringify(fresh.wants)} met with every drone back where it was`).toBe(false);
    }
  });
});

describe('audit 3: saves', () => {
  it('a save whose board is longer than haul.contracts.board is cut back to it (the other half of rules-8)', () => {
    // The top-up handles a short board; a longer one (a board size that shrank, a damaged save) keeps
    // every extra offer for the rest of the run, so the board shows 5 cards where the screens lay out 3.
    const g = tenMinutes();
    const p = H.haulParams(cfg, g);
    const b = H.openBoard(cfg, g.haul, p.F, p);
    const raw = JSON.parse(JSON.stringify({ ...g, haul: { ...g.haul, contracts: { ...b, board: [...b.board, { ...b.board[1], k: 40 }, { ...b.board[2], k: 41 }], next: 42 } } }));
    let s = H.reconcileHaul(cfg, raw, raw) as Run;
    for (let i = 0; i < 600; i++) s = H.advanceHaul(cfg, s, 0.5, 0) as Run;
    expect(s.haul.contracts.board.length).toBe(cfg.haul.contracts.board);
  });
});

describe('audit 3: the board offers a choice (Decision 40, play-7)', () => {
  it('the draws at the 10-minute station are not all the same ore and the same units', () => {
    // When no ore can be routed for (copper drill-bound, iron already over the share), every draw
    // takes the fallback at the never-free bound: one ore, one figure, contract after contract.
    const g = tenMinutes();
    const kinds = new Set<string>();
    for (let k = 1; k <= 30; k++) kinds.add(draw(g, k).wants.map((w) => `${w.ore}:${w.units}`).join('+'));
    expect(kinds.size, [...kinds].join(', ')).toBeGreaterThanOrEqual(3);
  });

  it('two-ore contracts are still drawn on the bot\'s own station at 25 minutes (twoOreChance 0.4)', () => {
    // Three ores are present (iron, copper, ice); not one of 300 draws wants two of them.
    const r = runHaulBot(cfg, { hours: 1510 / 3600, prestige: false, seed: 12345, keepAt: [1500], noOffline: true });
    const g = r.states[1500] as Run;
    let two = 0;
    for (let k = 1; k <= 300; k++) if (draw(g, k).wants.length > 1) two++;
    expect(two).toBeGreaterThanOrEqual(15);
  }, 60_000);
});
