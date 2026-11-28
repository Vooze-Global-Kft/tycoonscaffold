/**
 * frame.ts (the FrameTable): the frame of each frozen state names only sprites and places that exist in
 * content, every position is a finite point, every span runs forward, the boss is placed, crew legs and
 * arrivals carry their ends, and the chevron points at the goal's target.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, SALVAGE_TEST, fixtureGame, withTestContent } from '../fixtures/salvage';
import { sellAmount, sellOn } from './board';
import { frameCfg, frameOf, nearestStop, toolFor } from './frame';
import { lots4, r3Works, r4Game, rackFull, worksCfg } from '../fixtures/salvage2works';
import { lotCardOf } from './cardsWorks';
import { hallCap_g } from './halls';
import { contentAt, mergedContent } from './layer';
import { tagFigures, tagged } from './reuse';
import { goalOf } from './goals';
import { bayPos, bayStocked, isStillage, mapAt, pointOf } from './positions';
import type { SalvageGame } from './types';
import { TEXT_KEYS } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const C = SALVAGE_TEST;
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat());

const SPRITES = new Set<string>([
  ...Object.values(C.objects).map((o) => o.sprite ?? ''),
  ...Object.values(C.objects).flatMap((o) => o.pieces.map((p) => (p.length > 3 ? (p[3] as string) : ''))),
  ...Object.values(C.grades).map((gr) => gr.sprite ?? ''),
  ...Object.values(C.grades).map((gr) => gr.bay?.sprite ?? ''),
  ...Object.values(C.map.places).map((p) => p.sprite),
  'plant.portal',
  'plant.desk.id',
  'plant.sign.rung',
]);
const finite = (p: { x: number; y: number }) => Number.isFinite(p.x) && Number.isFinite(p.y);

describe('the frame of each frozen state', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: sprites and places of content, finite points, forward spans`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const f = frameOf(C, g);
      expect(f.t).toBe(g.salvage.t);
      expect(f.epoch).toBe(g.salvage.epoch);
      expect(finite(f.boss)).toBe(true);
      for (const th of f.things) {
        expect(SPRITES.has(th.sprite), th.sprite).toBe(true);
        expect(finite(th)).toBe(true);
        if (th.ring) expect(th.ring.t1).toBeGreaterThanOrEqual(th.ring.t0);
      }
      for (const p of f.pieces) {
        expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
        expect(finite(p)).toBe(true);
      }
      for (const p of f.load.pieces) expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
      for (const b of f.bays) {
        expect(SPRITES.has(b.look), b.look).toBe(true);
        expect(finite(b)).toBe(true);
        expect(b.share).toBeGreaterThanOrEqual(0);
      }
      for (const m of f.machines) {
        expect(C.map.places[m.place], m.place).toBeDefined();
        expect(finite(m)).toBe(true);
      }
      for (const m of f.crew) {
        expect(finite(m.from) && finite(m.to)).toBe(true);
        expect(m.t1).toBeGreaterThanOrEqual(m.t0);
        for (const p of m.load) expect(SPRITES.has(p.sprite), p.sprite).toBe(true);
      }
      for (const a of f.arrivals) {
        expect(C.map.points[a.place], a.place).toBeDefined();
        expect(a.span.t1).toBeGreaterThanOrEqual(a.span.t0);
      }
      if (f.truck.leg) expect(f.truck.leg.t1).toBeGreaterThanOrEqual(f.truck.leg.t0);
      for (const fx of f.fixtures) expect(SPRITES.has(fx.sprite), fx.sprite).toBe(true);
      for (const l of f.labels) {
        expect(KEYS.has(l.text.key), l.text.key).toBe(true);
        expect(finite(l)).toBe(true);
      }
      for (const sk of f.skips) expect(C.partners[sk.partner]).toBeDefined();
      const goal = goalOf(cfg, g);
      if (f.chevron) {
        expect(finite(f.chevron)).toBe(true);
        expect([goal?.target, 'truck']).toContain(f.chevron.id);
      }
    });
  }
});

describe('the frame bays (the lead stillage ruling of 17:10; the integrator 17:57)', () => {
  it('lists no stillage before its grade had stock, each stocked one where bayPos(c, grade, s) puts it, and an empty heap at fill 0', () => {
    const g0 = fixtureGame('fresh', base(), FIXTURE_NOW);
    const f0 = frameOf(C, g0);
    expect(f0.bays.filter((b) => isStillage(C, b.grade))).toEqual([]);
    for (const b of f0.bays) if (b.g <= 0) expect(b.fill, b.grade).toBe(0);
    for (const n of FIXTURE_NAMES) {
      const g = fixtureGame(n, base(), FIXTURE_NOW);
      const f = frameOf(C, g);
      for (const b of f.bays) {
        if (!isStillage(C, b.grade)) continue;
        expect(bayStocked(g.salvage, b.grade), `${n} ${b.grade}`).toBe(true);
        expect({ x: b.x, y: b.y }, `${n} ${b.grade}`).toEqual(bayPos(C, b.grade, g.salvage));
      }
      // Every stillage grade with stock is drawn.
      for (const [gr, bay] of Object.entries(g.salvage.bays)) if (isStillage(C, gr) && bay.g > 0) expect(f.bays.some((b) => b.grade === gr), `${n} ${gr}`).toBe(true);
    }
  });
});

describe('the bay chips (L10, S4, W4) and the memo (H13)', () => {
  const day = (g: SalvageGame) => g.salvage.clock.day;
  for (const name of FIXTURE_NAMES) {
    it(`${name}: at most two lines a bay; line 1 prints what Sell would pay now; never §0 for a stocked bay`, () => {
      const g0 = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      // Every bay held and not held: the chip's value is the board's Sell (sellOn on the frame's day).
      for (const held of [false, true]) {
        const bays = Object.fromEntries(Object.entries(g0.salvage.bays).map(([k, b]) => [k, { ...b, held }]));
        const g = { ...g0, salvage: { ...g0.salvage, bays } } as SalvageGame;
        const f = frameOf(C, g);
        for (const b of f.bays) {
          const ls = f.labels.filter((l) => l.kind === 'bay' && l.id.split('.')[1] === b.grade);
          if (b.g <= 0) {
            expect(ls.length).toBe(0);
            continue;
          }
          expect(ls.length, b.grade).toBeGreaterThanOrEqual(1);
          expect(ls.length, b.grade).toBeLessThanOrEqual(2);
          expect(ls[0].id).toBe(`bay.${b.grade}`);
          const want = sellAmount(sellOn(C, g, b.grade, day(g)));
          expect(b.value).toBe(want);
          const x = ls[0].text.args?.x as { money: number } | undefined;
          if (want > 0) {
            expect(x?.money).toBe(want);
            expect(ls[0].text.key).toBe(held ? 'chip.bayHeld' : 'chip.bay');
          } else expect(ls[0].text.key).toBe(held ? 'chip.bayKgHeld' : 'chip.bayKg');
          // No day word and no separate "held" line on the chip.
          for (const l of ls) expect(['chip.held', 'chip.lowDay', 'chip.highDay']).not.toContain(l.text.key);
        }
      }
    });
  }
  it('a held bay with stock and no reserve shows its value, not §0 (the review: "today §0.00 held")', () => {
    const g0 = fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
    const grade = Object.keys(g0.salvage.bays)[0];
    const g = { ...g0, salvage: { ...g0.salvage, bays: { ...g0.salvage.bays, [grade]: { g: 4_500_000, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 } } } } as SalvageGame;
    const l = frameOf(C, g).labels.find((x) => x.id === `bay.${grade}`)!;
    expect(l.text.key).toBe('chip.bayHeld');
    expect((l.text.args?.x as { money: number }).money).toBeGreaterThan(0);
  });
  it('the facade frame is memoised on the state (and on cash)', () => {
    const g = fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
    const a = frameCfg(cfg, g);
    expect(frameCfg(cfg, { ...g })).toBe(a);
    expect(frameCfg(cfg, { ...g, cash: g.cash + 1 })).not.toBe(a);
    expect(frameCfg(cfg, { ...g, salvage: { ...g.salvage } })).not.toBe(a);
    // owner1 L2: the facade adds the scene stamp (frameCfg); everything else is frameOf's.
    const { scene, ...f } = frameCfg(cfg, { ...g, salvage: { ...g.salvage } });
    expect(typeof scene).toBe('number');
    expect(f).toEqual(frameOf(cfg.salvage, g));
  });
});

// ============================================================================ C-FRAME (PLAN2 2.2, batch 0b): the works' parts
// Frozen test contents only (lesson 4): the works' test content (fixtures/salvage2works.ts) and its states made from r3.

const W = worksCfg();
const wc = (g: SalvageGame) => contentAt(W.salvage, g.salvage);
const clone = (g: SalvageGame): SalvageGame => ({ ...g, salvage: structuredClone(g.salvage) as SalvageGame['salvage'] });
const withAct = (g0: SalvageGame, kind: SalvageGame['salvage']['act']['kind'], target: string | null): SalvageGame => {
  const g = clone(g0);
  const s = g.salvage;
  s.truck = { ...s.truck, by: s.truck.by === 'boss' ? null : s.truck.by };
  s.act = { kind, target, since: s.t, endsAt: s.t + 5 };
  return g;
};

describe('C-FRAME: the first yard is untouched', () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name}: no works field (tag, lot, model, forPlate, dropoffCar) below the works' opening`, () => {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      const f = frameCfg(cfg, g);
      expect(f.truck.model).toBeUndefined();
      expect(f.dropoffCar).toBeNull();
      for (const th of f.things) expect(th.tag === undefined && th.lot === undefined, th.uid).toBe(true);
      for (const b of f.bays) expect(b.forPlate, b.grade).toBeUndefined();
      for (const m of f.crew) if (m.idleText) expect(m.idleText.key, m.id).not.toBe('tag.driver.bridge');
    });
  }
  it("toolFor without the plasma (the first yard's content, or not owned) is the first yard's tool", () => {
    const deep = Object.keys(C.objects).find((o) => (C.objects[o].tier ?? 1) >= 3)!;
    expect(toolFor(C, deep, null)).toBe('torch');
    expect(toolFor(C, deep, null, ['plasma'])).toBe('torch');
  });
});

describe('C-FRAME: tools and poses of the works (plasma, commission, analyse, rack, lot, crate)', () => {
  const c0 = wc(r3Works());
  const plasmaTier = c0.tools.plasma?.tier ?? 4;
  const lotObj = lots4().salvage.things.find((t) => t.at.at === 'lot')!.obj;
  // A content where the lot kind is of the plasma's tier (the frozen content's casing is not).
  const c4 = { ...c0, objects: { ...c0.objects, [lotObj]: { ...c0.objects[lotObj], tier: plasmaTier } } } as typeof c0;
  it('toolFor gives the plasma for a piece of its tier only once the plasma is owned', () => {
    expect(toolFor(c4, lotObj, null, ['plasma'])).toBe('plasma');
    expect(toolFor(c4, lotObj, null, ['torch'])).toBe('torch');
    expect(toolFor(c4, lotObj, null)).toBe('torch');
    const t3 = Object.keys(c0.objects).find((o) => c0.objects[o].tier === 3)!;
    expect(toolFor(c4, t3, null, ['plasma'])).toBe('torch');
  });
  it('commission: stand at a plate, analyse at the analyser (a plate of kind assay)', () => {
    const plates = Object.entries(c0.works!.plates);
    const assay = plates.find(([, d]) => d.kind === 'assay')![0];
    const other = plates.find(([, d]) => d.kind !== 'assay')![0];
    expect(frameCfg(W, withAct(r3Works(), 'commission', assay)).boss.pose).toBe('analyse');
    expect(frameCfg(W, withAct(r3Works(), 'commission', other)).boss.pose).toBe('stand');
  });
  it('rack: push; crate: feed', () => {
    const g = r3Works();
    const thing = g.salvage.things[0].uid;
    expect(frameCfg(W, withAct(g, 'rack', thing)).boss.pose).toBe('push');
    expect(frameCfg(W, withAct(g, 'crate', thing)).boss.pose).toBe('feed');
  });
  it('lot: the plasma for a piece of its tier with the plasma owned, else the torch; the ring is the act', () => {
    const g0 = lots4();
    const uid = g0.salvage.things.find((t) => t.at.at === 'lot')!.uid;
    const g = withAct(g0, 'lot', uid);
    const torch = frameOf(c4, g).boss;
    expect([torch.pose, torch.tool]).toEqual(['torch', 'torch']);
    g.salvage.owned = [...g.salvage.owned, 'plasma'];
    const b = frameOf(c4, g).boss;
    expect([b.pose, b.tool]).toEqual(['plasma', 'plasma']);
    expect(b.ring).toEqual({ t0: g.salvage.t, t1: g.salvage.t + 5, p0: 0 });
  });
});

describe('C-FRAME: the truck body, the bays, the oversize pieces', () => {
  it("truck.model from the owned shop key: 'truck', then 'truckBridge' once the hook-lift is here (not while it comes)", () => {
    const g = clone(r3Works());
    expect(frameCfg(W, g).truck.model).toBe('truck');
    const h = { ...g, salvage: { ...g.salvage, owned: [...g.salvage.owned, 'truckBridge'] } };
    expect(frameCfg(W, h).truck.model).toBe('truckBridge');
  });
  it("a works bay of kind bunker, bags or box without a sprite of its own takes its kind's look, never the stillage's", () => {
    const g = r3Works();
    const c = wc(g);
    const f = frameCfg(W, g);
    const want: Record<string, string> = { bunker: 'works.bunker', bags: 'works.bigbags', box: 'works.batteryBox' };
    let n = 0;
    for (const b of f.bays) {
      if (!want[b.kind]) continue;
      n++;
      expect(b.look, b.grade).toBe(c.grades[b.grade]?.bay?.sprite ?? want[b.kind]);
    }
    expect(n).toBeGreaterThan(0);
  });
  it('forPlate: "For the {hall} a / b kg" is the hall keeping the most of the bay, its grams and its charge (r4)', () => {
    const g = r4Game();
    const c = wc(g);
    const f = frameCfg(W, g);
    const x = { c } as unknown as Parameters<typeof hallCap_g>[0];
    let n = 0;
    for (const b of f.bays) {
      const res = g.salvage.bays[b.grade]?.reserved ?? {};
      const halls = Object.entries(res).filter(([id, a]) => a > 0 && c.works!.plates[id]?.batch);
      if (!halls.length) {
        expect(b.forPlate, b.grade).toBeUndefined();
        continue;
      }
      n++;
      const [id, a] = halls.sort((p, q) => q[1] - p[1])[0];
      expect(b.forPlate).toEqual({ plate: id, a_g: a, b_g: hallCap_g(x, id, g.salvage.works[id]) });
    }
    expect(n).toBeGreaterThan(0);
  });
  it("an oversize piece's plate: its sender, its fixed mass and the card's 'about § once cut'", () => {
    const g = lots4();
    const f = frameCfg(W, g);
    const lots = g.salvage.things.filter((t) => t.at.at === 'lot');
    expect(lots.length).toBe(4);
    for (const th of lots) {
      const ft = f.things.find((q) => q.uid === th.uid)!;
      const card = lotCardOf(W, g, (th.at as { k: number }).k)!;
      expect(ft.lot).toEqual({ sender: card.sender, g: card.g, value: card.valueOnceCut });
    }
    for (const ft of f.things) if (!lots.some((q) => q.uid === ft.uid)) expect(ft.lot).toBeUndefined();
  });
});

describe("C-FRAME: the Yard sale's tags (4.6)", () => {
  const ctxOf = (g: SalvageGame) => ({ c: wc(g), s: g.salvage, cash: g.cash, live: true, prices: new Map(), ms0: g.salvage.clock.highMs, t0: g.salvage.t }) as unknown as Parameters<typeof tagFigures>[0];
  it('every tagged thing and only those carries a tag with the rules\' own two figures; the list keeps its identity', () => {
    const g = r3Works();
    const f = frameCfg(W, g);
    const x = ctxOf(g);
    let n = 0;
    for (const th of g.salvage.things) {
      const ft = f.things.find((q) => q.uid === th.uid)!;
      if (!tagged(x, th)) {
        expect(ft.tag, th.uid).toBeUndefined();
        continue;
      }
      n++;
      const fig = tagFigures(x, th, g.salvage.t)!;
      expect(ft.tag).toMatchObject({ q: fig.gate, v: fig.scrap, g: wc(g).objects[th.obj].gross_g });
    }
    expect(n).toBeGreaterThan(0);
    // With nobody working a thing the first yard's list is reused (owner1 L1), and so is the tagged list.
    const still = clone(g);
    for (const th of still.salvage.things) th.by = null;
    expect(frameOf(wc(still), still).things).toBe(frameOf(wc(still), still).things);
  });
  it("whose: 'hands' (a yard hand lifts it), 'full' (no place free), 'boss' (within his sight), 'heavy' (heavier than a hand lifts)", () => {
    const g = r3Works();
    const one = (f: ReturnType<typeof frameOf>) => f.things.find((q) => q.tag && q.uid !== 'reuse.first')!;
    const ft = one(frameCfg(W, g));
    expect(ft.tag!.who).toBe('hands');
    expect(one(frameCfg(W, rackFull())).tag!.who).toBe('full');
    const near = clone(g);
    near.salvage.presence = { ...near.salvage.presence, x: ft.x, y: ft.y, moving: false };
    near.salvage.presenceAt = near.salvage.t;
    expect(frameCfg(W, near).things.find((q) => q.uid === ft.uid)!.tag!.who).toBe('boss');
    const c = wc(g);
    const weak = { ...c, crew: { ...c.crew, hand: { ...c.crew.hand, load: (ft.tag!.g - 1) / 1000 } } } as typeof c;
    expect(frameOf(weak, g).things.find((q) => q.uid === ft.uid)!.tag!.who).toBe('heavy');
  });
});

describe("C-FRAME: the drop-off's car from the works' opening (one arrival a works.dropoffPeriod_s)", () => {
  const g0 = r3Works();
  const c0 = wc(g0);
  const yardV = c0.truck.yardV ?? 4;
  const c = { ...c0, truck: { ...c0.truck, yardV }, works: { ...c0.works!, dropoffPeriod_s: 50 } } as typeof c0;
  const at = (lastAt: number | undefined, nextAt: number) => {
    const g = clone(g0);
    g.salvage.dropoff = { ...g.salvage.dropoff, nextAt, ...(lastAt === undefined ? {} : { lastAt }) };
    return frameOf(c, g).dropoffCar;
  };
  it('the car of the next arrival from when it sets off; the last one until it is gone; none between; at the yard speed', () => {
    const t = g0.salvage.t;
    const car = at(t - 40, t + 2)!;
    expect(car).not.toBeNull();
    expect(car.t0).toBeLessThanOrEqual(t);
    expect((car.t0 + car.t1) / 2).toBeCloseTo(t + 2, 9);
    expect({ x: car.x, y: car.y }).toEqual(car.to);
    const gate = { x: c.map.points.gate[0], y: c.map.points.gate[1] };
    const len = Math.hypot(car.from.x - gate.x, car.from.y - gate.y) + Math.hypot(gate.x - car.to.x, gate.y - car.to.y);
    expect(len / ((car.t1 - car.t0) / 2)).toBeLessThanOrEqual(yardV + 1e-9);
    const last = at(t - 1, t + 49)!;
    expect((last.t0 + last.t1) / 2).toBeCloseTo(t - 1, 9);
    expect(at(t - 40, t + 40)).toBeNull();
    expect(at(t - 40, -1)).toBeNull();
    expect(frameOf(c0.works?.dropoffPeriod_s === undefined ? c0 : { ...c0, works: { ...c0.works!, dropoffPeriod_s: undefined } } as typeof c0, g0).dropoffCar).toBeNull();
  });
});

describe("C-FRAME: the driver's standing reason while the bridge partners' skips fill", () => {
  const g0 = r3Works();
  const c0 = wc(g0);
  const bridgeId = Object.keys(c0.partners).find((p) => c0.partners[p].opens === 'truckBridge') ?? Object.keys(c0.partners)[0];
  const c = { ...c0, partners: { ...c0.partners, [bridgeId]: { ...c0.partners[bridgeId], opens: 'truckBridge' } } } as typeof c0;
  const skip = (slot: number, fullAt: number, phase: 'filling' | 'full' = 'filling') => ({ slot, phase, setAt: fullAt - 100, fullAt, contents: {}, mass_g: 0, price: 0, priceDay: 0, trial: false, n: 0 }) as SalvageGame['salvage']['partners'][string]['skips'][number];
  const state = (bridgeIn: number, otherIn: number, otherPhase: 'filling' | 'full' = 'filling') => {
    const g = clone(g0);
    const s = g.salvage;
    const t = s.t;
    s.truck = { ...s.truck, owned: true, by: null, trip: null, skip: null };
    const d = s.crew.find((m) => m.role === 'driver')!;
    Object.assign(d, { job: 'idle', phase: 'wait' });
    for (const [pid, ps] of Object.entries(s.partners)) if (ps.open && pid !== bridgeId) ps.skips = [skip(0, t + otherIn, otherPhase)];
    s.partners[bridgeId] = { ...(s.partners[bridgeId] ?? { trialUsed: true, level: 1 }), open: true, skips: [skip(0, t + bridgeIn) as never] } as never;
    return frameOf(c, g).crew.find((m) => m.role === 'driver')!;
  };
  it('says "Bridge skips fill in {t}" while no skip is full and a bridge skip fills first; nothing otherwise', () => {
    expect(g0.salvage.crew.some((m) => m.role === 'driver')).toBe(true);
    const d = state(30, 500);
    expect(d.idleText).toEqual({ key: 'tag.driver.bridge', args: { t: { secs: 30 } } });
    expect(d.idleWhy).toBe('nothing');
    expect(state(600, 500).idleText).toBeUndefined();
    expect(state(30, -1, 'full').idleText).toBeUndefined();
  });
});

describe('C-FRAME: the scene stamp covers the works fields (W9)', () => {
  it('a presence-only change keeps the stamp while every works field reads the same, and moves it when a tag turns', () => {
    const g = clone(r3Works());
    const ft = frameCfg(W, g).things.find((q) => q.tag && q.tag.who === 'hands')!;
    const s1 = frameCfg(W, g).scene;
    const far = { ...g, salvage: { ...g.salvage, presence: { ...g.salvage.presence, x: g.salvage.presence.x + 0.01 } } };
    expect(frameCfg(W, far).scene).toBe(s1);
    const near = { ...g, salvage: { ...g.salvage, presence: { ...g.salvage.presence, x: ft.x, y: ft.y, moving: false }, presenceAt: g.salvage.t } };
    const f3 = frameCfg(W, near);
    expect(f3.things.find((q) => q.uid === ft.uid)!.tag!.who).toBe('boss');
    expect(f3.scene).toBe((s1 ?? 0) + 1);
  });
  it("the first yard's presence-only change keeps its stamp as before", () => {
    const g = fixtureGame('m30', base(), FIXTURE_NOW) as SalvageGame;
    const s1 = frameCfg(cfg, g).scene;
    const moved = { ...g, salvage: { ...g.salvage, presence: { ...g.salvage.presence, x: g.salvage.presence.x + 0.01 } } };
    expect(frameCfg(cfg, moved).scene).toBe(s1);
  });
});

describe('C-FRAME: nearestStop at the works (s2c-plan-world 2.3 item 6; the breaker is dark: not tested)', () => {
  const c = mergedContent(W.salvage);
  const works = mapAt(c, true).stops;
  const own = (c.map.works?.driveLine.stops ?? {}) as Record<string, [number, number]>;
  it("a hall's plot resolves to a stop of the works road (the rotary hall's: the works stop), never the gate or the first yard's", () => {
    expect(own.works).toBeDefined();
    const rotary = c.works!.plates.rotary;
    const at = nearestStop(c, pointOf(c, rotary.plot), true);
    expect(at).toEqual({ x: works.works[0], y: works.works[1] });
    for (const [id, d] of Object.entries(c.works!.plates)) {
      if (!d.batch) continue;
      const p = nearestStop(c, pointOf(c, d.plot), true);
      expect(Object.values(own).some(([x, y]) => x === p.x && y === p.y), id).toBe(true);
    }
  });
  it("below the works' opening the first layer's stops, as before", () => {
    const first = (c.map.driveLine?.stops ?? {}) as Record<string, [number, number]>;
    const p = nearestStop(c, pointOf(c, c.works!.plates.rotary.plot));
    expect(Object.values(first).some(([x, y]) => x === p.x && y === p.y) || (p.x === c.map.points.gate[0] && p.y === c.map.points.gate[1])).toBe(true);
  });
});
