/// <reference types="node" />
/** The Fitting Bay (section 5.1, test list of 10.2): only fitted modules apply, typed sockets, each rule module's rule. */
import { describe, expect, it } from 'vitest';
import * as H from './haul';
import * as L from './loadout';
import { haulTestConfig, run, shaped } from './fixtures/haul';

type Run = H.HaulGame & { haul: H.HaulState };
const cfg = haulTestConfig({ contracts: { ...haulTestConfig().haul.contracts, unlockLaunches: 1e9 } });
const owned = (ids: string[], level = 1) => Object.fromEntries(ids.map((id) => [id, { level, copies: 0 }]));
const ALL = ['diamondbit', 'bayracks', 'thrusters', 'clamps', 'chute', 'keeper', 'sorter', 'quickclamp'];

function withModules(g: Run, fits: [number, string][], level = 1): Run {
  let s: Run = { ...g, cards: owned(ALL, level) };
  for (const [i, id] of fits) s = L.equip(cfg, s, i, id);
  return s;
}

describe('sockets', () => {
  it('three typed sockets; a module fits only its socket type and only when owned', () => {
    expect([0, 1, 2].map(L.socketType)).toEqual(['rig', 'fleet', 'dock']);
    expect(L.socketType(3)).toBeNull();
    const g = shaped(cfg, 1, { slots: [0] });
    const s = { ...g, cards: owned(['diamondbit', 'clamps']) };
    expect(L.canFit(cfg, s, 0, 'diamondbit')).toBe(true);
    expect(L.canFit(cfg, s, 1, 'diamondbit')).toBe(false);
    expect(L.canFit(cfg, s, 2, 'clamps')).toBe(true);
    expect(L.canFit(cfg, s, 1, 'bayracks')).toBe(false); // not owned
    expect(L.canFit(cfg, s, 0, 'nope')).toBe(false);
    expect(L.equip(cfg, s, 1, 'diamondbit')).toBe(s);
    const fitted = L.equip(cfg, s, 0, 'diamondbit');
    expect(fitted.loadout.sockets).toEqual(['diamondbit', null, null]);
    expect(L.equip(cfg, fitted, 0, null).loadout.sockets).toEqual([null, null, null]);
    // Swapping in another module of the same type replaces it.
    const swap = L.equip(cfg, { ...fitted, cards: owned(['diamondbit', 'chute']) }, 0, 'chute');
    expect(swap.loadout.sockets[0]).toBe('chute');
  });

  it('only fitted modules apply; values come from meta.cardEffect by rarity and level', () => {
    const g = shaped(cfg, 1, { slots: [0], haulers: [1] });
    const s = { ...g, cards: owned(ALL, 3) };
    expect(L.fittedBonus(cfg, s, 'drillRate')).toBe(0);
    expect(L.moduleValue(cfg, s, 'diamondbit')).toBeCloseTo((5 + 3 * 2) / 100, 12);
    expect(L.moduleValue(cfg, s, 'chute')).toBeCloseTo((10 + 5 * 2) / 100, 12);
    expect(L.moduleValue(cfg, s, 'sorter')).toBeCloseTo((15 + 6 * 2) / 100, 12);
    const p0 = H.haulParams(cfg, s);
    const f = L.equip(cfg, s, 0, 'diamondbit');
    expect(L.fittedBonus(cfg, f, 'drillRate')).toBeCloseTo(0.11, 12);
    expect(H.haulParams(cfg, f).slots[0].rb).toBeCloseTo(p0.slots[0].rb * 1.11, 12);
    // A fitted module whose card was lost does nothing.
    expect(L.fittedBonus(cfg, { ...f, cards: {} }, 'drillRate')).toBe(0);
  });

  it('stat modules: capacity, speed, freighter capacity', () => {
    const g = shaped(cfg, 1, { slots: [0], haulers: [1], freighter: 10 });
    const p0 = H.haulParams(cfg, g);
    const a = withModules(g, [[1, 'bayracks']], 1);
    expect(H.haulParams(cfg, a).slots[0].c).toBeCloseTo(p0.slots[0].c * 1.05, 12);
    const b = withModules(g, [[1, 'thrusters']], 1);
    expect(H.haulParams(cfg, b).v).toBeCloseTo(p0.v * 1.05, 12);
    const c = withModules(g, [[2, 'clamps']], 1);
    expect(H.haulParams(cfg, c).F).toBe(Math.floor(12 * Math.pow(1.45, 9) * 1.05 + 1e-9));
  });
});

describe('rule modules change their rule by their value', () => {
  it('Overflow Chute: a full pile spills X % of its drill straight into the hold', () => {
    const g = shaped(cfg, 2, { slots: [0], haulers: [0], autopilot: true });
    const full = { ...g, haul: { ...g.haul, slots: g.haul.slots.map((s, i) => (i === 0 ? { ...s, pile: 15, life: 100 } : s)) } };
    const without = run(cfg, full, 10, 0.5);
    expect(H.holdTotal(without.haul)).toBe(0);
    const chute = withModules(full, [[0, 'chute']], 1); // rare L1: 10 %
    const after = run(cfg, chute, 10, 0.5);
    expect(H.holdTotal(after.haul) + after.haul.counters.shipped).toBeCloseTo(0.1 * 0.6 * 10, 9);
  });

  it('Contract Keeper: after a met contract, the next warp-out pays +X % on its whole cargo', () => {
    const g = shaped(cfg, 3, { slots: [0] });
    const board: H.Contract[] = [{ k: 1, buyer: 'kade', wants: [{ ore: 'iron', units: 2, got: 0 }], mult: 1.6, launchesLeft: 9, taken: true }];
    let s = withModules({ ...g, haul: { ...g.haul, hold: { iron: 3 }, contracts: { unlocked: true, board, next: 2, active: 0 } } }, [[2, 'keeper']], 1);
    s = H.launch(cfg, s) as Run;
    expect(s.haul.keeper).toBeCloseTo(0.1, 12);
    s = run(cfg, s, 13, 0.5);
    s = { ...s, haul: { ...s.haul, hold: { iron: 5 }, counters: { ...s.haul.counters, drilled: s.haul.counters.drilled + 5 } } };
    s = H.launch(cfg, s) as Run;
    expect(s.haul.freighter.payout).toBeCloseTo(5 * 1.1, 9);
    expect(s.haul.keeper).toBe(0);
  });

  it('Ore Sorter: drones on routes whose ore the active contract wants carry +X %', () => {
    const g = shaped(cfg, 4, { slots: [0, 2], haulers: [1, 1] });
    const copper = g.haul.slots[2].ore;
    const board: H.Contract[] = [{ k: 1, buyer: 'corvo', wants: [{ ore: copper, units: 5, got: 0 }], mult: 1.9, launchesLeft: 9, taken: true }];
    const s = withModules({ ...g, haul: { ...g.haul, contracts: { unlocked: true, board, next: 2, active: 0 } } }, [[1, 'sorter']], 1);
    const p = H.haulParams(cfg, s);
    expect(p.slots[2].c).toBeCloseTo(p.slots[2].cBase * 1.15, 12);
    expect(p.slots[0].c).toBeCloseTo(p.slots[0].cBase, 12);
    // Not counted by the steady rate.
    expect(H.haulIncome(cfg, s)).toBeCloseTo(H.haulIncome(cfg, { ...s, loadout: { sockets: [null, null, null] } }), 12);
  });

  it('Quick Clamp: a launch that meets its contract comes back X % sooner (at most 50 %)', () => {
    const g = shaped(cfg, 5, { slots: [0] });
    const board: H.Contract[] = [{ k: 1, buyer: 'kade', wants: [{ ore: 'iron', units: 2, got: 0 }], mult: 1.6, launchesLeft: 9, taken: true }];
    const base = { ...g, haul: { ...g.haul, hold: { iron: 3 }, contracts: { unlocked: true, board, next: 2, active: 0 } } };
    const s = H.launch(cfg, withModules(base, [[2, 'quickclamp']], 1)) as Run;
    expect(s.haul.freighter.away).toBeCloseTo(8 * 0.85, 12);
    const unmet = H.launch(cfg, withModules({ ...base, haul: { ...base.haul, hold: { iron: 1 } } }, [[2, 'quickclamp']], 1)) as Run;
    expect(unmet.haul.freighter.away).toBe(8);
    const capped = H.launch(cfg, withModules(base, [[2, 'quickclamp']], 50)) as Run;
    expect(capped.haul.freighter.away).toBeCloseTo(4, 12);
  });
});
