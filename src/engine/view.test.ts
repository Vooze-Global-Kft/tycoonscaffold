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

describe('the stage that limits income (play-test D1)', () => {
  function bottlenecked(cash: number): GameState {
    let s = started(1e12);
    s = E.buyBusiness(sim, s, s.activeVenue, first, 120);
    s = E.hireManager(sim, s, s.activeVenue, first);
    s = E.hireTransportManager(sim, s, s.activeVenue);
    return { ...s, cash, stats: { ...s.stats, playSeconds: M.HINT_VETERAN_SECONDS + 600, rushes: 1 } };
  }

  it('points at the limiting stage when a level of it is affordable, even for a veteran', () => {
    const s = bottlenecked(1e6);
    const r = stageReadout(sim, s, s.activeVenue, T0);
    expect(r.limiting).not.toBe('production');
    expect(guideHint(sim, s, T0)?.kind).toBe(r.limiting === 'transport' ? 'buyTransport' : 'buySales');
  });

  it('says nothing about it when no level is affordable, and stops once the stages keep up', () => {
    expect(guideHint(sim, bottlenecked(0), T0)).toBeNull();
    let s = bottlenecked(1e15);
    for (let i = 0; i < 400; i++) {
      const h = guideHint(sim, s, T0);
      if (h?.kind === 'buyTransport') s = E.buyTransport(sim, s, s.activeVenue, 1);
      else if (h?.kind === 'buySales') s = E.buySales(sim, s, s.activeVenue, 1);
      else break;
    }
    const r = stageReadout(sim, s, s.activeVenue, T0);
    expect(['buyTransport', 'buySales']).not.toContain(guideHint(sim, s, T0)?.kind);
    expect(r.rate).toBeGreaterThanOrEqual(r.production * 0.8 - 1e-9);
  });

  it('never points at it while the player still rings the bell', () => {
    let s = started(1e6);
    s = E.buyBusiness(sim, s, s.activeVenue, first, 100);
    const h = guideHint(sim, s, T0);
    expect(['buyTransport', 'buySales']).not.toContain(h?.kind);
  });
});

describe('after a reset (play-test N5)', () => {
  it('starts again with the basics: tap the station, then hire', () => {
    const s = { ...E.createInitialState(sim, T0), prestigeCount: 1, prestigePoints: 50, stats: { ...E.createInitialState(sim, T0).stats, playSeconds: 99999, chestsOpened: 5, rushes: 3 } };
    expect(guideHint(sim, s, T0)).toEqual({ kind: 'tapStation', businessId: first });
    const hire = { ...s, cash: E.managerCost(sim, s.activeVenue, first) };
    expect(guideHint(sim, hire, T0)).toEqual({ kind: 'hireBusiness', businessId: first });
  });
});

describe('missions after a reset (play-test M1)', () => {
  it('re-rolls income-scaled missions from the post-reset income', () => {
    let s = started(0);
    s = { ...s, lifetimeEarnings: sim.economy.prestige.threshold * 30, runEarnings: 1e18 };
    s = E.buyBusiness(sim, { ...s, cash: 1e40 }, s.activeVenue, first, 300);
    s = E.hireManager(sim, s, s.activeVenue, first);
    s = E.hireTransportManager(sim, s, s.activeVenue);
    s = M.refreshMissions(sim, { ...s, missions: { ...s.missions, slots: [] } }, T0);
    const earnTemplate = sim.meta.missions.templates.find((t) => t.type === 'earn')!;
    const before = M.missionViews(sim, s).find((m) => m.templateId === earnTemplate.id);
    expect(before).toBeDefined();
    const reset = M.missionsAfterReset(sim, E.prestige(sim, s, T0), T0);
    const maxSeconds = Math.max(...earnTemplate.targets);
    const perSecond = Math.max(E.incomePerSecond(sim, reset, T0), E.tapValue(sim, reset, T0));
    for (const m of M.missionViews(sim, reset)) {
      const t = sim.meta.missions.templates.find((x) => x.id === m.templateId)!;
      if (t.type === 'earn') {
        expect(m.target).toBeLessThanOrEqual(perSecond * maxSeconds * 1.1 + 1);
        expect(m.progress).toBe(0);
      }
    }
    expect(M.missionViews(sim, reset).length).toBe(sim.meta.missions.slots);
    expect(reset.missions.doneToday).toBe(s.missions.doneToday);
  });
});

describe('prestige exponent', () => {
  const at = (exponent: number): GameConfig => ({ ...sim, economy: { ...sim.economy, prestige: { ...sim.economy.prestige, exponent } } });

  it('defaults to the square root', () => {
    expect(GameConfigSchema.parse({ ...JSON.parse(fs.readFileSync(path.join(gamesDir, 'space-miner', 'game.json'), 'utf8')) }).economy.prestige.exponent).toBe(0.5);
    const { threshold, scale } = sim.economy.prestige;
    expect(E.totalPrestigePoints(at(0.5), threshold * 9)).toBe(Math.floor(scale * 3));
  });

  it.each([0.3, 0.4, 0.5, 0.75, 1])('points and "to next point" agree at exponent %s', (exponent) => {
    const c = at(exponent);
    const { threshold, scale } = c.economy.prestige;
    for (const k of [1, 2, 7, 50, 600]) {
      const life = E.lifetimeForPrestigePoints(c, k);
      expect(E.totalPrestigePoints(c, life)).toBe(k);
      expect(E.totalPrestigePoints(c, life * (1 - 1e-6))).toBe(k - 1);
      expect(E.totalPrestigePoints(c, threshold * Math.pow(k / scale, 1 / exponent))).toBe(k);
      const s = { ...E.createInitialState(c, T0), lifetimeEarnings: life * (1 - 1e-6) };
      const p = prestigePreview(c, s);
      expect(p.points).toBe(k - 1);
      expect(E.prestigePointsAvailable(c, { ...s, lifetimeEarnings: s.lifetimeEarnings + p.toNextPoint * (1 + 1e-9) })).toBe(k);
    }
  });
});

describe('a chest never shows the same card twice', () => {
  it('merges slots that picked the same card, copies added, in every pizza chest', () => {
    let merged = 0;
    for (const chest of sim.meta.chests) {
      let s = M.grantChest(sim, E.createInitialState(sim, T0), chest.id, 300);
      for (let i = 0; i < 300; i++) {
        const r = M.openChest(sim, s, chest.id, T0)!;
        s = r.state;
        const ids = r.rewards.flatMap((g) => (g.type === 'card' ? [g.cardId] : []));
        expect(new Set(ids).size).toBe(ids.length);
        const copies = (list: M.GrantedReward[]) => list.reduce((a, g) => a + (g.type === 'card' ? g.copies : 0), 0);
        expect(copies(r.rewards)).toBe(copies(r.slots));
        if (r.rewards.length < r.slots.length) merged++;
      }
    }
    expect(merged).toBeGreaterThan(0);
  });
});
