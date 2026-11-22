/// <reference types="node" />
/**
 * Property test: drive the engine with random valid actions (seeded) for 10,000 ticks of random
 * length and check the invariants after every tick: nothing negative, nothing NaN, ore conserved,
 * caps respected, drones counted, cash never above MAX_CASH.
 */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import { rngFloat } from './rng';
import { conservationError, freshHaulGame, haulTestConfig } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };

function checkNumbers(x: unknown, path: string, out: string[]): void {
  if (typeof x === 'number') {
    if (Number.isNaN(x)) out.push(`${path} is NaN`);
    else if (x < 0 && !/rockN$|guests|\.slot$/.test(path) && !path.endsWith('respawnAt')) out.push(`${path} = ${x}`);
  } else if (Array.isArray(x)) x.forEach((v, i) => checkNumbers(v, `${path}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) checkNumbers(v, `${path}.${k}`, out);
}

function invariants(cfg: H.HaulConfig, g: Run): string[] {
  const out: string[] = [];
  checkNumbers(g.haul, 'haul', out);
  checkNumbers({ cash: g.cash, life: g.lifetimeEarnings, run: g.runEarnings, stats: g.stats }, 'game', out);
  const h = g.haul;
  const p = H.haulParams(cfg, g);
  if (H.holdTotal(h) > p.F + 1e-6) out.push(`hold ${H.holdTotal(h)} > F ${p.F}`);
  if (conservationError(g) > 1e-9) out.push(`conservation ${conservationError(g)}`);
  const onRoutes = h.slots.reduce((a, s) => a + s.haulers, 0);
  if (onRoutes + h.idle !== h.fleet.drones) out.push(`drones ${onRoutes} + ${h.idle} != ${h.fleet.drones}`);
  if (h.fleet.drones > p.droneCap) out.push('drone cap exceeded');
  h.slots.forEach((s, i) => {
    if (!s.claimed && s.haulers > 0) out.push(`unclaimed slot ${i} has drones`);
    if (s.claimed && s.pile > Math.max(p.slots[i].cap, p.slots[i].cap * cfg.haul.seam.pileCap) + 1e-6) out.push(`slot ${i} pile ${s.pile} over cap`);
  });
  for (const seam of [h.vein, h.flare]) {
    if (seam.slot !== null && seam.guests.length > h.slots[seam.slot].haulers) out.push('more guests than drones on the seam');
  }
  if (h.contracts.active !== null && !h.contracts.board[h.contracts.active]) out.push('active contract out of range');
  if (g.cash > Number.MAX_VALUE) out.push('cash over MAX_CASH');
  if (h.freighter.phase !== 'docked' && !(h.freighter.t >= -1e-6)) out.push(`freighter t ${h.freighter.t}`);
  return out;
}

describe('random valid actions for 10,000 ticks', () => {
  for (const seed of [1, 2]) {
    it(`seed ${seed}: invariants hold after every tick`, () => {
      const cfg = haulTestConfig();
      let g: Run = { ...freshHaulGame(cfg, seed), cards: { chute: { level: 3, copies: 0 }, sorter: { level: 2, copies: 0 }, keeper: { level: 2, copies: 0 }, quickclamp: { level: 9, copies: 0 }, thrusters: { level: 1, copies: 0 } } };
      let r = seed * 7777;
      const rand = () => {
        const x = rngFloat(r);
        r = x.seed;
        return x.value;
      };
      const pickInt = (n: number) => Math.floor(rand() * n);
      const n = g.haul.slots.length;
      for (let tick = 0; tick < 10_000; tick++) {
        // A few random actions, valid or not (refused ones must change nothing).
        const k = pickInt(4);
        for (let a = 0; a < k; a++) {
          const before = g;
          const roll = pickInt(18);
          // Money now and then so purchases happen.
          if (roll === 0) g = { ...g, cash: g.cash + rand() * 10 ** pickInt(6) };
          else if (roll === 1) g = H.assignDrone(cfg, g, pickInt(n)) as Run;
          else if (roll === 2) g = H.moveDrone(cfg, g, pickInt(n), pickInt(n)) as Run;
          else if (roll === 3) g = H.recallDrone(cfg, g, pickInt(n)) as Run;
          else if (roll === 4) g = H.launch(cfg, g) as Run;
          else if (roll === 5) g = H.upgradeRig(cfg, g, pickInt(n)) as Run;
          else if (roll === 6) g = H.claimSlot(cfg, g, pickInt(n)) as Run;
          else if (roll === 7) g = H.buyDrone(cfg, g) as Run;
          else if (roll === 8) g = H.buyCapacity(cfg, g) as Run;
          else if (roll === 9) g = H.buyEngine(cfg, g) as Run;
          else if (roll === 10) g = H.buyFreighter(cfg, g) as Run;
          else if (roll === 11) g = H.buyAutopilot(cfg, g) as Run;
          else if (roll === 12) g = H.setPolicy(cfg, g, rand() < 0.5 ? 'full' : 'contract') as Run;
          else if (roll === 13) g = H.pickContract(cfg, g, rand() < 0.2 ? null : pickInt(4)) as Run;
          else if (roll === 14) g = H.useFlare(cfg, { ...g, haul: { ...g.haul, flare: { ...g.haul.flare, charges: g.haul.flare.charges + (rand() < 0.1 ? 1 : 0) } } }, pickInt(n)) as Run;
          else if (roll === 15) g = H.fitModule(cfg, g, pickInt(3), [null, 'chute', 'sorter', 'keeper', 'quickclamp', 'thrusters', 'diamondbit'][pickInt(7)]) as Run;
          else if (roll === 16 && g.haul.vein.slot !== null) g = H.moveDrone(cfg, g, pickInt(n), g.haul.vein.slot) as Run;
          else if (roll === 17) {
            const ff = H.fastForward(cfg, g, rand() * 3600, 0.45);
            g = { ...(ff.game as Run), cash: Math.min(Number.MAX_VALUE, ff.game.cash + ff.report.credits) };
          }
          const bad = invariants(cfg, g);
          if (bad.length) throw new Error(`tick ${tick}, action ${roll}: ${bad.join('; ')} (state before: ${JSON.stringify(before.haul).length} bytes)`);
          void before;
        }
        const dt = [0.1, 0.1, 0.1, 1, 0.37, 2.5, 7][pickInt(7)];
        g = H.advanceHaul(cfg, g, dt, 0) as Run;
        const bad = invariants(cfg, g);
        if (bad.length) throw new Error(`tick ${tick} (dt ${dt}): ${bad.join('; ')}`);
      }
      expect(g.haul.counters.launches).toBeGreaterThan(50);
      expect(g.haul.slots.filter((s) => s.claimed).length).toBeGreaterThan(3);
    }, 300_000);
  }
});
