/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import * as E from './economy';
import * as M from './meta';
import type { GameState } from './types';
import { guideHint, hintKey, prestigePreview, stageReadout } from './view';

const gamesDir = path.resolve(__dirname, '../../games');
const load = (id: string): GameConfig => GameConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(gamesDir, id, 'game.json'), 'utf8')));
const T0 = new Date(2026, 0, 10, 12, 0, 0).getTime();

const sim = load('pizza-empire');
const classic = load('space-miner');
const first = sim.businesses[0].id;

/** A sim game a few steps in: one station with some levels, and plenty of cash. */
function started(cash = 1e6): GameState {
  let s = E.createInitialState(sim, T0);
  s = { ...s, cash };
  s = E.buyBusiness(sim, s, s.activeVenue, first, 5);
  return s;
}

describe('stageReadout', () => {
  it('shows what transport could carry while the player still rings the bell', () => {
    const s = started();
    const r = stageReadout(sim, s, s.activeVenue, T0);
    expect(r.manualTransport).toBe(true);
    expect(E.venueRates(sim, s, s.activeVenue).transport).toBe(0);
    expect(r.transport).toBeGreaterThan(0);
    expect(r.rate).toBe(Math.min(r.production, r.transport, r.sales));
    expect(r[r.limiting]).toBe(r.rate);
  });

  it('matches the engine once transport is automated, global multipliers included', () => {
    let s = started();
    s = E.hireTransportManager(sim, s, s.activeVenue);
    const r = stageReadout(sim, s, s.activeVenue, T0);
    const raw = E.venueRates(sim, s, s.activeVenue);
    const mult = E.globalMultiplier(sim, s, T0);
    expect(r.manualTransport).toBe(false);
    expect(r.production).toBeCloseTo(raw.production * mult, 9);
    expect(r.transport).toBeCloseTo(raw.transport * mult, 9);
    expect(r.sales).toBeCloseTo(raw.sales * mult, 9);
    expect(r.limiting).toBe(raw.bottleneck);
    expect(r.rate).toBeCloseTo(E.venueIncomePerSecond(sim, s, s.activeVenue, T0), 6);
  });

  it('has only a production stage in a classic game', () => {
    const s = E.createInitialState(classic, T0);
    const r = stageReadout(classic, s, s.activeVenue, T0);
    expect(r.transport).toBe(Infinity);
    expect(r.sales).toBe(Infinity);
    expect(r.limiting).toBe('production');
    expect(r.manualTransport).toBe(false);
  });
});

describe('prestigePreview', () => {
  it('reports no points and the distance to the first one at the start', () => {
    const s = E.createInitialState(sim, T0);
    const p = prestigePreview(sim, s);
    expect(p.points).toBe(0);
    expect(p.multNow).toBe(1);
    expect(p.multAfter).toBe(1);
    expect(p.toNextPoint).toBeGreaterThan(0);
    // Earning exactly that much makes the first point available.
    const after = { ...s, lifetimeEarnings: s.lifetimeEarnings + p.toNextPoint * (1 + 1e-9) };
    expect(E.prestigePointsAvailable(sim, after)).toBe(1);
  });

  it('agrees with what a reset really gives', () => {
    const { threshold, scale } = sim.economy.prestige;
    const s = { ...E.createInitialState(sim, T0), lifetimeEarnings: threshold * Math.pow(7.5 / scale, 2) };
    const p = prestigePreview(sim, s);
    expect(p.points).toBe(7);
    const reset = E.prestige(sim, s, T0);
    expect(reset.prestigePoints).toBe(p.points);
    expect(E.prestigeMultiplier(sim, reset)).toBeCloseTo(p.multAfter, 12);
    expect(p.multAfter).toBeGreaterThan(p.multNow);
  });
});

describe('guideHint', () => {
  it('starts with the loop nextHint teaches', () => {
    const s = E.createInitialState(sim, T0);
    expect(guideHint(sim, s, T0)).toEqual(M.nextHint(sim, s, T0));
  });

  /** A player who automated the first venue and has played long enough to be left alone by nextHint. */
  function veteran(cash: number): GameState {
    let s = started(1e9);
    for (const b of sim.businesses) s = E.hireManager(sim, s, s.activeVenue, b.id);
    s = E.hireTransportManager(sim, s, s.activeVenue);
    return { ...s, cash, stats: { ...s.stats, playSeconds: M.HINT_VETERAN_SECONDS + 60 } };
  }

  it('teaches the rush skill once, then never again', () => {
    const s = veteran(0);
    expect(M.nextHint(sim, s, T0)).toBeNull();
    expect(guideHint(sim, s, T0)).toEqual({ kind: 'startRush' });
    const used = E.startRush(sim, s, T0);
    expect(used.stats.rushes).toBe(1);
    expect(guideHint(sim, used, T0 + 3_600_000)).toBeNull();
  });

  it('points at the cheapest useful upgrade until the first one is bought', () => {
    const cheapest = sim.upgrades.filter((u) => !u.premium && (u.target === 'all' || u.target === first)).sort((a, b) => a.cost - b.cost)[0];
    let s = veteran(cheapest.cost);
    s = { ...s, stats: { ...s.stats, rushes: 1 } };
    const h = guideHint(sim, s, T0);
    expect(h).toEqual({ kind: 'buyUpgrade', upgradeId: cheapest.id });
    const bought = E.buyUpgrade(sim, s, cheapest.id);
    expect(bought.upgrades).toContain(cheapest.id);
    expect(guideHint(sim, { ...bought, cash: 1e12 }, T0)?.kind).not.toBe('buyUpgrade');
  });

  it('points at the next venue the first time it is affordable', () => {
    const next = E.nextVenueToUnlock(sim, veteran(0))!;
    let s = veteran(E.venueUnlockCost(sim, next));
    s = { ...s, stats: { ...s.stats, rushes: 1 }, upgrades: sim.upgrades.filter((u) => !u.premium).map((u) => u.id) };
    expect(guideHint(sim, s, T0)).toEqual({ kind: 'unlockVenue', venueId: next });
  });

  it('says nothing after the first prestige except a first chest or mission', () => {
    const s = { ...veteran(1e30), prestigeCount: 1, stats: { ...veteran(0).stats, chestsOpened: 3, rushes: 0 }, missions: { ...veteran(0).missions, total: 4 } };
    expect(guideHint(sim, s, T0)).toBeNull();
  });
});

describe('hintKey', () => {
  it('gives every hint its own stable key', () => {
    expect(hintKey({ kind: 'bell' })).toBe('bell');
    expect(hintKey({ kind: 'tapStation', businessId: 'a' })).toBe('tapStation:a');
    expect(hintKey({ kind: 'buyBusiness', businessId: 'a' })).toBe('buyBusiness:a');
    expect(hintKey({ kind: 'hireBusiness', businessId: 'a' })).toBe('hireBusiness:a');
    expect(hintKey({ kind: 'claimMission', index: 2 })).toBe('claimMission:2');
    expect(hintKey({ kind: 'buyUpgrade', upgradeId: 'u' })).toBe('buyUpgrade:u');
    expect(hintKey({ kind: 'unlockVenue', venueId: 'v' })).toBe('unlockVenue:v');
    expect(hintKey({ kind: 'levelUpCard', cardId: 'c' })).toBe('levelUpCard:c');
    expect(hintKey({ kind: 'startRush' })).toBe('startRush');
  });
});
