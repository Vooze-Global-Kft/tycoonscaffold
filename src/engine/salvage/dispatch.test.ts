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
import { machineWorth, orderFromRung, waitsForFloor } from './crew';
import { keptForBetter } from './truck';
import { loadRanks } from './rate';
import { machineCard, skipLabelOf } from './cards';
import { pickFromRung, ratedLoadNet } from './partners';
import { hireCheck, levelCheck } from './ladder';
import { pieceCount, pieceSpec } from './content';
import type { GroundPiece, SalvageConfig, SalvageEvent, SalvageGame } from './types';

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

/** The test content with the demolition partner's skip `times` as big (its rated net still the better a load). */
function bigDemo(c: SalvageContent, times: number): SalvageContent {
  const d = c.partners.partnerDemolition;
  const skip = Object.fromEntries(Object.entries(d.skip).map(([o, n]) => [o, n * times]));
  return { ...c, partners: { ...c.partners, partnerDemolition: { ...d, skip } } } as SalvageContent;
}

/**
 * The m15 played state (driver idle, both partners open, rung 2): the farm's skip full for 200 s (250 kg, §100), the
 * demolition's filling to full 1 ms later (its contents as the content fills them), `floorKg` of pieces on the
 * tipping floor, cash `cash`; the yard hand and the cutter busy, so that nobody clears the floor meanwhile.
 */
function twoFull(floorKg: number, cash = 1e6): SalvageGame {
  const g = fixtureGame('m15', base, FIXTURE_NOW);
  const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
  const farm = s.partners.partnerFarm.skips[0];
  Object.assign(farm, { phase: 'full', fullAt: s.t - 200, contents: { ...SALVAGE_TEST.partners.partnerFarm.skip }, mass_g: 250_000, price: 100 });
  Object.assign(s.partners.partnerDemolition.skips[0], { phase: 'filling', fullAt: s.t + 0.001 });
  s.pieces = [...s.pieces.filter((p) => p.pile !== 'floor'), ...floorPieces(floorKg, 'hms', 'test.floor')];
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
    expect(departed(SALVAGE_TEST, twoFull(0))).toBe('partnerFarm');
    expect(departed(keyed(SALVAGE_TEST, 3), twoFull(0))).toBe('partnerFarm');
  });

  it('(b) from the rung: the best-ranked full skip that fits, though another was full first', () => {
    expect(departed(keyed(SALVAGE_TEST, 1), twoFull(0))).toBe('partnerDemolition');
  });

  it('(c) the better load does not fit: he waits and keeps the room (the first yard took the lesser)', () => {
    const g = twoFull(1000);
    expect(departed(bigDemo(SALVAGE_TEST, 6), g)).toBe('partnerFarm');
    expect(departed(keyed(bigDemo(SALVAGE_TEST, 6), 1), g)).toBeNull();
  });

  it('16.6: the ready skip the driver leaves standing for the better load carries the reason (kept); not below the rung', () => {
    const g = twoFull(1000);
    const c = keyed(bigDemo(SALVAGE_TEST, 6), 1);
    // The demolition skip full (the jump fills it) and not fitting, the farm's ready: the farm's label says he keeps the room.
    const h = R.jump(cfgOf(c), g, g.salvage.t + 0.01);
    expect(h.salvage.truck.trip).toBeNull();
    expect(keptForBetter(c, h, 'partnerFarm')).toBe(true);
    expect(keptForBetter(c, h, 'partnerDemolition')).toBe(false);
    expect(keptForBetter(bigDemo(SALVAGE_TEST, 6), h, 'partnerFarm')).toBe(false);
    expect(skipLabelOf(c, h, 'partnerFarm', 0)?.kept).toBe(true);
    expect(skipLabelOf(bigDemo(SALVAGE_TEST, 6), h, 'partnerFarm', 0)?.kept).toBeUndefined();
  });

  it('16.5: the rank is the net over the slowest step\'s seconds for the load, from the assets (a cutter more raises a cut-bound load)', () => {
    const c = keyed(bigDemo(SALVAGE_TEST, 6), 1);
    const g = twoFull(0);
    const r1 = loadRanks(c, g.salvage)!;
    expect(r1).toBeTruthy();
    const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    const cut = s.crew.find((m) => m.role === 'cutter')!;
    s.crew.push({ ...cut, id: 'cutter.9' });
    const r2 = loadRanks(c, s)!;
    const s3 = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    const hand = s3.crew.find((m) => m.role === 'hand')!;
    s3.crew.push({ ...hand, id: 'hand.9' });
    const r3 = loadRanks(c, s3)!;
    // A crew member more never lowers a rank, and the step that binds the big load raises it.
    for (const r of [r2, r3]) for (const id of Object.keys(r1)) expect(r[id]).toBeGreaterThanOrEqual(r1[id] - 1e-12);
    expect(Math.max(r2.partnerDemolition, r3.partnerDemolition)).toBeGreaterThan(r1.partnerDemolition);
    // The same assets, the same rank (cached on rated income's asset key; never the yard's stock or cash).
    expect(loadRanks(c, { ...g.salvage, pieces: [] })).toEqual(r1);
    expect(R.ratedTerms(cfgOf(c), g).rank).toEqual(r1);
  });

  it('(e) a skip the yard cannot pay for blocks nobody; one heavier than the whole floor neither', () => {
    expect(departed(keyed(bigDemo(SALVAGE_TEST, 6), 1), twoFull(0, 101))).toBe('partnerFarm');
    expect(departed(keyed(bigDemo(SALVAGE_TEST, 12), 1), twoFull(0))).toBe('partnerFarm');
  });

  it('no dead end: the waiting driver departs for the better load once the yard (boss away) has cleared room', () => {
    const c = keyed(bigDemo(SALVAGE_TEST, 6), 1);
    const g = twoFull(1000);
    const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    for (const m of s.crew) if (m.role !== 'driver') Object.assign(m, { job: 'idle', phase: 'wait', t0: s.t, t1: s.t });
    const free = { ...g, salvage: s } as SalvageGame;
    const out = awayPass(cfgOf(c), { ...free, lastSavedAt: s.clock.highMs }, s.clock.highMs + 1800_000);
    expect(out.salvage.counts?.['fetched:partnerDemolition'] ?? 0).toBeGreaterThan(g.salvage.counts?.['fetched:partnerDemolition'] ?? 0);
  });
});

describe("the yard hands' order (RULING2.md 17.2)", () => {
  /** m15 with the hand free, the bench's tray holding 30 kg of light iron and `floorKg` of pieces on the floor. */
  function trayAndFloor(floorKg: number, trayKg = 30): SalvageGame {
    const g = fixtureGame('m15', base, FIXTURE_NOW);
    const s = JSON.parse(JSON.stringify(g.salvage)) as SalvageGame['salvage'];
    s.machines.bench.tray_g = { li: trayKg * 1000 };
    s.machines.bench.trayClaim_g = {};
    s.machines.bench.status = 'working';
    s.pieces = [...s.pieces.filter((p) => p.pile !== 'floor'), ...floorPieces(floorKg, 'hms', 'test.floor')];
    // The hand's leg ends 1 ms later with nothing claimed: he chooses his next trip at that instant.
    for (const m of s.crew) if (m.role === 'hand') Object.assign(m, { job: 'circle', phase: 'walkTo', t0: s.t, t1: s.t + 0.001, claims: [], load: [] });
    for (const m of s.crew) if (m.role === 'cutter') Object.assign(m, { job: 'circle', phase: 'walkTo', t0: s.t, t1: s.t + 3600, claims: [], load: [] });
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

  it('a full tray keeps its first-yard place over a full floor (nothing piles up behind the floor)', () => {
    expect(firstJob(keyed(SALVAGE_TEST, undefined, 1), trayAndFloor(1200, SALVAGE_TEST.machines.bench.tray))).toBe('tray');
  });

  it('a floor at most half full: the first yard\'s order from the rung too', () => {
    expect(firstJob(keyed(SALVAGE_TEST, undefined, 1), trayAndFloor(600))).toBe('tray');
  });

  it('16.6: a machine waiting for the hands on the floor carries the reason (floorFirst); not below the rung, not on a half-empty floor', () => {
    const c = keyed(SALVAGE_TEST, undefined, 1);
    const idle = (g: SalvageGame) => ({ ...g, salvage: { ...g.salvage, machines: { ...g.salvage.machines, bench: { ...g.salvage.machines.bench, status: 'idle' } } } }) as SalvageGame;
    expect(waitsForFloor(c, trayAndFloor(1200).salvage, 'bench')).toBe(true);
    expect(waitsForFloor(c, trayAndFloor(600).salvage, 'bench')).toBe(false);
    expect(waitsForFloor(SALVAGE_TEST, trayAndFloor(1200).salvage, 'bench')).toBe(false);
    expect(machineCard(c, idle(trayAndFloor(1200)), 'bench').floorFirst).toBe(true);
    expect(machineCard(SALVAGE_TEST, idle(trayAndFloor(1200)), 'bench').floorFirst).toBeUndefined();
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

  it('an absence cut into passes equals one pass (minute 60, two hours in four passes)', () => {
    const c = keyed(real(), 1, 1);
    const { cfg, g } = played(c, 4, 60);
    const g0 = { ...g, lastSavedAt: g.salvage.clock.highMs } as SalvageGame;
    const t0 = g0.salvage.clock.highMs;
    const one = awayPass(cfg, g0, t0 + 2 * 3600_000);
    let cut = g0;
    for (let k = 1; k <= 4; k++) cut = awayPass(cfg, { ...cut, lastSavedAt: cut.salvage.clock.highMs } as SalvageGame, t0 + k * 1800_000);
    expect(Math.round(cut.cash * 100)).toBe(Math.round(one.cash * 100));
    expect(cut.salvage.ladder.supplied_g).toBe(one.salvage.ladder.supplied_g);
    expect(JSON.stringify([cut.salvage.bays, cut.salvage.pieces, cut.salvage.things, cut.salvage.partners])).toBe(JSON.stringify([one.salvage.bays, one.salvage.pieces, one.salvage.things, one.salvage.partners]));
  }, 300_000);
});

describe('mass balances with both rules from rung 1 (test content, a busy yard, an hour away)', () => {
  it('what is in the yard plus what was sold equals what came in', () => {
    const C = SALVAGE_TEST;
    const cfg = cfgOf(keyed(C, 1, 1));
    let g = R.createSalvage(cfg, { ...(base as object), cash: 100_000 } as never, FIXTURE_NOW);
    for (const item of ['sack', 'sledge', 'trolley', 'truck', 'torch', 'stripper', 'bench']) g = R.buy(cfg, g, item, R.shopPrice(cfg, g, item) ?? 0, g.salvage.t);
    for (const role of ['hand', 'hand', 'cutter', 'driver'] as const) g = R.hire(cfg, g, role, hireCheck(cfg, g, role).price ?? 0, g.salvage.t);
    g = R.jump(cfg, g, g.salvage.t + 120);
    g = { ...g, cash: 1e6, salvage: { ...g.salvage, presenceAt: -1000 } } as SalvageGame;
    const inYard = (s: SalvageGame['salvage']) => {
      let m = 0;
      for (const th of s.things) {
        m += C.objects[th.obj].waste_g;
        for (let k = th.cut; k < pieceCount(C, th.obj); k++) m += pieceSpec(C, th.obj, k)!.g;
      }
      for (const p of s.pieces) m += p.g;
      for (const p of s.load) m += p.g;
      for (const q of s.crew) for (const p of q.load) m += p.g;
      for (const q of Object.values(s.machines)) {
        for (const p of q.hopper) m += p.g;
        if (q.work) m += q.work.piece.g - Object.values(q.work.credited).reduce((a, v) => a + v, 0);
        m += Object.values(q.tray_g).reduce((a, v) => a + v, 0);
      }
      for (const b of Object.values(s.bays)) m += b.g;
      m += s.machines.crucible.charge_g + s.machines.crucible.heel_g;
      for (const l of s.merchant.lot) m += l.g;
      if (s.truck.skip) m += s.truck.skip.mass_g;
      return m + s.waste_g + s.ladder.supplied_g - s.scaleRound_g;
    };
    let came = inYard(g.salvage);
    const ev: SalvageEvent[] = [];
    const seen = new Set<string>(Object.entries(g.salvage.partners).filter(([, p]) => p.trialUsed).map(([id]) => id));
    const out = R.jump(cfg, g, g.salvage.t + 3600, ev);
    let hooks = 0;
    for (const e of ev) {
      if (e.type === 'arrival' && e.kind === 'dropoff' && e.what) came += C.objects[e.what].gross_g;
      if (e.type === 'hook') {
        hooks++;
        const pt = C.partners[e.partner];
        for (const [o, n] of Object.entries(seen.has(e.partner) ? pt.skip : pt.trial)) came += C.objects[o].gross_g * n;
        seen.add(e.partner);
      }
    }
    expect(hooks).toBeGreaterThan(3);
    expect(inYard(out.salvage)).toBe(came);
  }, 120_000);
});

/**
 * The check's findings (dispatch-check, attack/dispatch/findings.test.ts; engine2-dispatch's fix pass): on bots' yards of
 * the real content, flat board (usual prices), one capped absence with cash enough for every load. F1: the driver's rule
 * keeps what the hands' rule alone keeps (16.5's rank; 16.1 (a)'s net a load lost 15 % on a one-cutter yard). F4: a
 * demolition level does not make the yard poorer (it lost 10.5 %). F3: rated income follows the hands' rule at rung 2
 * (the floor's pieces go to the scale while the floor is over half full; I/G was 0.83).
 */
describe("the check's findings on bots' yards (real content, flat board)", () => {
  const flat = (c: SalvageContent) => ({ ...c, board: { ...c.board, a: 0 } }) as SalvageContent;
  const G = (cfg: SalvageConfig, g0: SalvageGame, hours?: number): { G: number; h: number } => {
    const g = { ...g0, cash: 1e7, lastSavedAt: g0.salvage.clock.highMs } as SalvageGame;
    const v0 = R.stockValue(cfg, g);
    const ms = hours === undefined ? 24 * 3600_000 : Math.round(hours * 3600_000);
    const o = awayPass(cfg, g, g.salvage.clock.highMs + ms);
    const h = o.salvage.away!.seconds / 3600;
    return { G: (o.cash - g.cash + R.stockValue(cfg, o) - v0) / h, h };
  };
  it('F1 and F4: with 16.5\'s rank both rules keep at least 99 % of the hands\' rule alone; a demolition level loses at most 4 % (seeds 101 and 108, minute 60)', () => {
    // The content ships the hands' rule alone (truck.pickFromRung 99, RULING2.md 16.8); the rank is measured switched on.
    const c = keyed(flat(real()), 1, 1);
    const handsOnly = keyed(c, 99, 1);
    for (const seed of [101, 108]) {
      const { cfg, g } = played(c, seed, 60);
      const a = G(cfg, g);
      const b = G(seededCfg(cfgOf(handsOnly), seed), g, a.h);
      expect(a.G, `seed ${seed}: both rules against the hands' rule alone`).toBeGreaterThanOrEqual(0.99 * b.G);
      const ck = levelCheck(cfg, { ...g, cash: 1e12 } as SalvageGame, { kind: 'partner', partner: 'partnerDemolition' });
      if (ck.price === null || ck.refusal) continue;
      const h = R.level(cfg, { ...g, cash: 1e12 } as SalvageGame, { kind: 'partner', partner: 'partnerDemolition' }, ck.price, g.salvage.t);
      expect(G(cfg, h, a.h).G, `seed ${seed}: a demolition level`).toBeGreaterThanOrEqual(0.96 * a.G);
    }
  }, 300_000);
  it('F3: I/G within 0.88 to 1.12 at minute 30 (rung 2, the hands\' rule as shipped; seeds 104 and 106)', () => {
    const c = flat(real());
    expect(orderFromRung(c)).toBeLessThanOrEqual(2);
    for (const seed of [104, 106]) {
      const { cfg, g } = played(c, seed, 30);
      const r = R.ratedIncome(cfg, g) / G(cfg, g).G;
      expect(r, `seed ${seed}`).toBeGreaterThanOrEqual(0.88);
      expect(r, `seed ${seed}`).toBeLessThanOrEqual(1.12);
    }
  }, 300_000);
});
