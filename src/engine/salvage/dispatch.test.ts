/**
 * RULING2.md 16 and 17 (engine2-dispatch): the hired driver fetches what pays best (truck.ts bestLoad, partners.ts
 * ratedLoadNet) and the yard hands clear a tipping floor over half full before they feed a machine or empty its tray
 * (crew.ts orderPlan). Each from its own rung (content truck.pickFromRung, crew.orderFromRung); below it the first
 * yard plays bit for bit. The engine's promises with both rules on from rung 1: a tick equals a jump, an absence cut
 * into passes equals one pass, mass balances, no dead end. Frozen test content, plus the real content where a test
 * says so. Owner: engine2-dispatch.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { FIXTURE_NOW, fixtureGame, SALVAGE_TEST } from '../fixtures/salvage';
import * as R from '../salvage';
import { awayPass } from './away';
import { newBot, playTo, seededCfg, startGame } from './bot';
import { machineWorth, orderFromRung } from './crew';
import { pickFromRung, ratedLoadNet } from './partners';
import type { GroundPiece, SalvageConfig, SalvageGame } from './types';

const base = { cash: 0, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never;
const cfgOf = (c: SalvageContent): SalvageConfig => ({ mode: 'salvage', salvage: c }) as unknown as SalvageConfig;
/** The test content with the two rules from `pick` and `order` (undefined: the key absent, the first yard's rules). */
function keyed(c: SalvageContent, pick?: number, order?: number): SalvageContent {
  const truck = { ...c.truck, ...(pick === undefined ? {} : { pickFromRung: pick }) };
  const crew = { ...c.crew, ...(order === undefined ? {} : { orderFromRung: order }) };
  return { ...c, truck, crew } as SalvageContent;
}
const real = (): SalvageContent => SalvageSchema.parse(JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage);

/** Floor pieces of `kg` kilograms (one pile of 10 kg pieces of `grade`). */
function floorPieces(kg: number, grade: string, tag: string): GroundPiece[] {
  const out: GroundPiece[] = [];
  for (let k = 0; k * 10 < kg; k++) out.push({ uid: `${tag}.${k}`, grade, g: 10_000, from: null, spec: -1, pile: 'floor', k, claim: null } as unknown as GroundPiece);
  return out;
}

/**
 * The m15 played state (driver idle, both partners open, rung 2) with both skips full: the farm's full FIRST, the
 * demolition's `demoKg` heavy (its rated net is the better), and `floorKg` of pieces on the tipping floor; cash `cash`.
 */
function twoFull(demoKg: number, floorKg: number, cash = 1e6): SalvageGame {
  const g = fixtureGame('m15', base, FIXTURE_NOW);
  const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
  const fill = (id: string, fullAt: number, kg: number, price: number) => {
    const sk = s.partners[id].skips[0];
    sk.phase = 'full';
    sk.fullAt = fullAt;
    sk.contents = { ...SALVAGE_TEST.partners[id].skip };
    sk.mass_g = kg * 1000;
    sk.price = price;
  };
  fill('partnerFarm', s.t - 200, 250, 100);
  fill('partnerDemolition', s.t - 10, demoKg, 300);
  s.pieces = [...s.pieces.filter((p) => p.pile !== 'floor'), ...floorPieces(floorKg, 'hms', 'test.floor')];
  // Nobody may clear the floor during the instant looked at: the yard hand and the cutter are busy for an hour.
  for (const m of s.crew) if (m.role !== 'driver') Object.assign(m, { job: 'circle', phase: 'walkTo', t0: s.t, t1: s.t + 3600, claims: [], load: [] });
  return { ...g, cash, salvage: s } as SalvageGame;
}
const departed = (c: SalvageContent, g: SalvageGame): string | null => R.jump(cfgOf(c), g, g.salvage.t + 0.01).salvage.truck.trip?.partner ?? null;

describe("the driver's ranking (RULING2.md 16.1)", () => {
  it('(a) a rated net a load from the content alone: memoised, and a new partner needs no code', () => {
    const c = SALVAGE_TEST;
    expect(ratedLoadNet(c, 'partnerDemolition')).toBeGreaterThan(ratedLoadNet(c, 'partnerFarm'));
    expect(ratedLoadNet(c, 'partnerFarm')).toBe(ratedLoadNet(c, 'partnerFarm'));
    expect(ratedLoadNet(c, 'nobody')).toBe(-Infinity);
    const more = { ...c, partners: { ...c.partners, partnerNew: { ...c.partners.partnerFarm, skip: { ...c.partners.partnerFarm.skip }, k: 0.5 } } } as SalvageContent;
    expect(ratedLoadNet(more, 'partnerNew')).toBeGreaterThan(ratedLoadNet(more, 'partnerFarm'));
    expect(pickFromRung(c)).toBe(Infinity);
    expect(pickFromRung(keyed(c, 3))).toBe(3);
  });

  it('below truck.pickFromRung: the skip full longest that fits, as the first yard (the farm here)', () => {
    expect(departed(SALVAGE_TEST, twoFull(220, 0))).toBe('partnerFarm');
    expect(departed(keyed(SALVAGE_TEST, 3), twoFull(220, 0))).toBe('partnerFarm');
  });

  it('(b) from the rung: the best-ranked full skip that fits, though another was full first', () => {
    expect(departed(keyed(SALVAGE_TEST, 1), twoFull(220, 0))).toBe('partnerDemolition');
  });

  it('(c) the better load does not fit: he waits and keeps the room (the first yard took the lesser)', () => {
    const g = twoFull(1200, 1000);
    expect(departed(SALVAGE_TEST, g)).toBe('partnerFarm');
    expect(departed(keyed(SALVAGE_TEST, 1), g)).toBeNull();
  });

  it('(e) a skip the yard cannot pay for blocks nobody; one heavier than the whole floor neither', () => {
    expect(departed(keyed(SALVAGE_TEST, 1), twoFull(220, 0, 150))).toBe('partnerFarm');
    expect(departed(keyed(SALVAGE_TEST, 1), twoFull(2500, 0))).toBe('partnerFarm');
  });

  it('no dead end: the waiting driver departs for the better load once the yard (boss away) has cleared room', () => {
    const c = keyed(SALVAGE_TEST, 1);
    const g = twoFull(1200, 1000);
    const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    for (const m of s.crew) if (m.role !== 'driver') Object.assign(m, { job: 'idle', phase: 'wait', t0: s.t, t1: s.t });
    const free = { ...g, salvage: s } as SalvageGame;
    const out = awayPass(cfgOf(c), { ...free, lastSavedAt: s.clock.highMs }, s.clock.highMs + 1800_000);
    expect(out.salvage.counts?.['fetched:partnerDemolition'] ?? 0).toBeGreaterThan(g.salvage.counts?.['fetched:partnerDemolition'] ?? 0);
  });
});

describe("the yard hands' order (RULING2.md 17.2)", () => {
  /** m15 with the hand free, the bench's tray holding 30 kg of light iron and `floorKg` of pieces on the floor. */
  function trayAndFloor(floorKg: number): SalvageGame {
    const g = fixtureGame('m15', base, FIXTURE_NOW);
    const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    s.machines.bench.tray_g = { li: 30_000 };
    s.machines.bench.trayClaim_g = {};
    s.machines.bench.status = 'working';
    s.pieces = [...s.pieces.filter((p) => p.pile !== 'floor'), ...floorPieces(floorKg, 'hms', 'test.floor')];
    for (const m of s.crew) if (m.role === 'hand') Object.assign(m, { job: 'idle', phase: 'wait', t0: s.t, t1: s.t, claims: [], load: [] });
    return { ...g, salvage: s } as SalvageGame;
  }
  const firstJob = (c: SalvageContent, g: SalvageGame) => R.jump(cfgOf(c), g, g.salvage.t + 0.01).salvage.crew.find((m) => m.role === 'hand')!.job;

  it('the exception is read from the content: no first-yard machine doubles the worth of what it takes', () => {
    for (const id of ['stripper', 'bench', 'crucible'] as const) expect(machineWorth(real(), id)).toBeLessThan(2);
    expect(orderFromRung(SALVAGE_TEST)).toBe(Infinity);
  });

  it('a floor over half full: the floor before the tray from the rung; the tray first below it (S12)', () => {
    const g = trayAndFloor(1200);
    expect(firstJob(SALVAGE_TEST, g)).toBe('tray');
    expect(firstJob(keyed(SALVAGE_TEST, undefined, 3), g)).toBe('tray');
    expect(firstJob(keyed(SALVAGE_TEST, undefined, 1), g)).toBe('floor');
  });

  it('a floor at most half full: the first yard\'s order from the rung too', () => {
    expect(firstJob(keyed(SALVAGE_TEST, undefined, 1), trayAndFloor(600))).toBe('tray');
  });
});

/** A bot's yard on `c` (seed, route A, normal hand, the goal habit) to minute `m`. */
function played(c: SalvageContent, seed: number, m: number): { cfg: SalvageConfig; g: SalvageGame; now: number } {
  const cfg = seededCfg(cfgOf(c), seed);
  const b = newBot(cfg, startGame(cfg, FIXTURE_NOW), FIXTURE_NOW, { hand: 'normal', habit: 'goal', route: 'A', seed });
  playTo(b, m * 60);
  return { cfg, g: b.g, now: b.now };
}

describe('below each rule\'s rung the first yard plays bit for bit (real content)', () => {
  it('a bot\'s first hour with the keys absent and with both at 3 (the first rung-3 instant excluded): the same state minute by minute', () => {
    const c0 = real();
    const strip = (c: SalvageContent) => keyed({ ...c, truck: { ...c.truck }, crew: { ...c.crew } } as SalvageContent);
    const plain = strip(c0);
    delete (plain.truck as { pickFromRung?: number }).pickFromRung;
    delete (plain.crew as { orderFromRung?: number }).orderFromRung;
    const at3 = keyed(plain, 3, 3);
    for (const seed of [2, 7]) {
      const runs = [plain, at3].map((c) => {
        const cfg = seededCfg(cfgOf(c), seed);
        const b = newBot(cfg, startGame(cfg, FIXTURE_NOW), FIXTURE_NOW, { hand: 'normal', habit: 'goal', route: 'A', seed });
        const seen: string[] = [];
        playTo(b, 3600, (bb) => {
          if (bb.g.salvage.ladder.rung < 3) seen.push(JSON.stringify([bb.g.cash, bb.g.salvage]));
        });
        return seen;
      });
      expect(runs[1].length).toBeGreaterThan(30);
      expect(runs[1]).toEqual(runs[0]);
    }
  }, 300_000);
});

describe('the engine\'s promises with both rules from rung 1 (real content)', () => {
  const stale = (g: SalvageGame): SalvageGame => ({ ...g, salvage: { ...g.salvage, presenceAt: g.salvage.t - 100, act: { kind: 'none', target: null, since: g.salvage.t, endsAt: null } } }) as SalvageGame;
  it('a tick equals a jump on a bot\'s yard every five minutes to minute 60 (30 s each)', () => {
    const c = keyed(real(), 1, 1);
    const cfg = seededCfg(cfgOf(c), 11);
    const b = newBot(cfg, startGame(cfg, FIXTURE_NOW), FIXTURE_NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 11 });
    for (let m = 5; m <= 60; m += 5) {
      playTo(b, m * 60);
      const g = stale(b.g);
      let a = g;
      let ms = b.now;
      for (let i = 0; i < 300; i++) {
        ms += 100;
        a = R.advanceSalvage(cfg, a, 0.1, ms);
      }
      const j = R.jump(cfg, g, g.salvage.t + 30);
      expect(Math.round(a.cash * 100), `minute ${m}`).toBe(Math.round(j.cash * 100));
      expect(JSON.stringify([a.salvage.bays, a.salvage.pieces, a.salvage.things, a.salvage.crew, a.salvage.truck.trip, a.salvage.machines]), `minute ${m}`).toBe(JSON.stringify([j.salvage.bays, j.salvage.pieces, j.salvage.things, j.salvage.crew, j.salvage.truck.trip, j.salvage.machines]));
    }
  }, 300_000);

  it('an absence cut into passes equals one pass, and mass balances (minute 60, two hours)', () => {
    const c = keyed(real(), 1, 1);
    const { cfg, g } = played(c, 4, 60);
    const g0 = { ...g, lastSavedAt: g.salvage.clock.highMs } as SalvageGame;
    const t0 = g0.salvage.clock.highMs;
    const one = awayPass(cfg, g0, t0 + 2 * 3600_000);
    let cut = g0;
    for (let k = 1; k <= 4; k++) cut = awayPass(cfg, { ...cut, lastSavedAt: cut.salvage.clock.highMs } as SalvageGame, t0 + k * 1800_000);
    expect(Math.round(cut.cash * 100)).toBe(Math.round(one.cash * 100));
    expect(cut.salvage.ladder.supplied_g).toBe(one.salvage.ladder.supplied_g);
    expect(JSON.stringify(cut.salvage.bays)).toBe(JSON.stringify(one.salvage.bays));
    // Mass: what came in (loads tipped, the drop-off) is what is in the yard or supplied.
    const inYard = (x: SalvageGame) => {
      const s = x.salvage;
      let m = s.ladder.supplied_g + s.waste_g;
      for (const b of Object.values(s.bays)) m += b.g;
      for (const p of s.pieces) m += p.g;
      return m;
    };
    expect(inYard(one)).toBeGreaterThan(inYard(g0) - 1);
  }, 300_000);
});
