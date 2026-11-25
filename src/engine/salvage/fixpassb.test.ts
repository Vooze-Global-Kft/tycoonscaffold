/**
 * The fix pass's rules (rules-sim-b, review/all-findings.json): P1 the drop-off's opening list, P2 the
 * value lessons always shown, P11 the yard hand while the boss is in the yard, L5 a zone's things inside
 * its bed, M the back wall and the drive line, R8 a claimed piece, W9 the car's shell, W16 the two
 * ticket books. On the frozen test content (changed per test where a field is new), never tuned numbers.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema, lintSalvage, type SalvageContent } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { FIXTURE_NOW, SALVAGE_TEST, SALVAGE_TEST_RAW } from '../fixtures/salvage';
import * as R from '../salvage';
import { begin, type Ctx } from './clock';
import { pieceCount, tierOf } from './content';
import { bossActEnd } from './hand';
import { bedLayout, driveToGate, lanePath, pointOf, spotPos, thingNear, thingPos } from './positions';
import { weighIn } from './scales';
import { seriesKey, stampSeries } from './series';
import { cutOff, dropOnPile, dropoffArrive, shellsLeave } from './things';
import type { SalvageConfig, SalvageGame, Ticket } from './types';

type Raw = typeof SALVAGE_TEST_RAW & Record<string, unknown>;
const contentWith = (f: (raw: Raw) => void): SalvageContent => {
  const raw = structuredClone(SALVAGE_TEST_RAW) as Raw;
  f(raw);
  return SalvageSchema.parse(raw);
};
const cfgOf = (c: SalvageContent) => ({ mode: 'salvage', salvage: c }) as unknown as SalvageConfig;
const fresh = (cfg: SalvageConfig, cash = 0): SalvageGame => R.createSalvage(cfg, { cash, lifetimeEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as never, FIXTURE_NOW);
const ctx = (c: SalvageContent, g?: SalvageGame): Ctx => {
  const cfg = cfgOf(c);
  return begin(cfg, g ?? fresh(cfg), [], true);
};
/** The boss is in the yard (a fresh presence sample) at yard second t. */
const bossIn = (x: Ctx, t: number) => {
  x.s.t = t;
  x.s.presenceAt = t;
};

describe('P2: the value lessons always show on their first weigh-in', () => {
  it('brass weighed first does not silence the copper lesson (and brass gets its own)', () => {
    const x = ctx(SALVAGE_TEST);
    weighIn(x, [{ uid: 'a', grade: 'brs', g: 5000, from: null, spec: 0 }], 'boss', 10);
    const brs = x.s.tickets.at(-1) as Extract<Ticket, { kind: 'weighIn' }>;
    expect(brs.lessonText?.key).toBe('lesson.brs');
    weighIn(x, [{ uid: 'b', grade: 'bb', g: 7000, from: null, spec: 0 }], 'boss', 20);
    const bb = x.s.tickets.at(-1) as Extract<Ticket, { kind: 'weighIn' }>;
    expect(bb.lessonText?.key).toBe('lesson.bb');
    expect(x.s.lessonsSeen).toEqual(['brs', 'bb']);
    // Never twice; a grade that is no value grade still waits in the quiet minutes.
    weighIn(x, [{ uid: 'c', grade: 'bb', g: 7000, from: null, spec: 0 }, { uid: 'd', grade: 'li', g: 9000, from: null, spec: 0 }], 'boss', 30);
    expect((x.s.tickets.at(-1) as Extract<Ticket, { kind: 'weighIn' }>).lessonText).toBeNull();
  });
  it('the first weigh-in of the game can carry the copper lesson (nothing weighed before)', () => {
    const x = ctx(SALVAGE_TEST);
    weighIn(x, [{ uid: 'b', grade: 'bb', g: 7000, from: null, spec: 0 }], 'boss', 5);
    expect((x.s.tickets.at(-1) as Extract<Ticket, { kind: 'weighIn' }>).lessonText?.key).toBe('lesson.bb');
  });
});

describe('P1: the drop-off opening', () => {
  it('after the fixed first arrivals, the opening list in order (again from its start) until openingUntil_s, then the mix', () => {
    const c = contentWith((r) => {
      (r.dropoff as Record<string, unknown>).opening = ['washer', 'radiator'];
      (r.dropoff as Record<string, unknown>).openingUntil_s = 300;
      (r.dropoff as Record<string, unknown>).mix = [['cable', 1]];
    });
    expect(lintSalvage(c)).toEqual([]);
    const x = ctx(c);
    const got: string[] = [];
    for (const t of [20, 120, 220, 299, 300, 400]) {
      dropoffArrive(x, t);
      const th = x.s.things.at(-1)!;
      got.push(th.obj);
      x.s.things.pop(); // free the place
    }
    expect(got).toEqual(['washer', 'radiator', 'washer', 'radiator', 'cable', 'cable']);
  });
  it('without an opening the drop-off is as before (defaults)', () => {
    expect(SALVAGE_TEST.dropoff.opening).toEqual([]);
    expect(SALVAGE_TEST.dropoff.openingUntil_s).toBe(0);
  });
});

describe('R8: a claimed piece is not taken by the boss', () => {
  it("the boss's pickup ends empty when a yard hand claimed the piece meanwhile", () => {
    const x = ctx(SALVAGE_TEST);
    bossIn(x, 30);
    const gp = dropOnPile(x, { uid: 'pc1', grade: 'li', g: 5000, from: null, spec: 0 }, 'dropoff');
    gp.claim = 'hand.0';
    x.s.act = { kind: 'pickup', target: 'pc1', since: 29.85, endsAt: 30 };
    bossActEnd(x, 30);
    expect(x.s.load.some((p) => p.uid === 'pc1')).toBe(false);
    expect(x.s.pieces.find((p) => p.uid === 'pc1')?.claim).toBe('hand.0');
  });
});

describe('W16: two ticket books, each from 1', () => {
  it('weigh-ins (platform and skip) and sales (collections, deliveries) number apart; a slip has none', () => {
    const x = ctx(SALVAGE_TEST);
    const kinds = ['dropOffSlip', 'weighIn', 'collection', 'weighIn', 'skipWeighIn', 'dealDelivery'] as const;
    const out = kinds.map((kind) => {
      const t = { no: 0, at: 0, day: 0, kind } as unknown as Ticket;
      stampSeries(x.s, t);
      return t.series;
    });
    expect(out).toEqual([undefined, 1, 1, 2, 3, 2]);
  });
  it('an old save (no books) goes on from its shared counter: no number printed twice', () => {
    const x = ctx(SALVAGE_TEST);
    delete x.s.counts![seriesKey('weigh')];
    delete x.s.counts![seriesKey('sale')];
    x.s.ticketNo = 17;
    const t = { no: 17, at: 0, day: 0, kind: 'weighIn' } as unknown as Ticket;
    stampSeries(x.s, t);
    expect(t.series).toBe(17);
  });
});

describe('L5 and M: beds, the back wall, the drive line', () => {
  const bedC = contentWith((r) => {
    (r.zones as Record<string, Record<string, unknown>>).Z1.bed = { x0: 30, y0: 28, w: 3.2, d: 2.4 };
    (r.zones as Record<string, Record<string, unknown>>).Z1.things = { washer: 5, cable: 1, taps: 1 };
  });
  const overlaps = (c: SalvageContent, zone: string) => {
    const z = c.zones[zone];
    const objs = Object.entries(z.things).flatMap(([o, n]) => Array.from({ length: n }, () => o));
    const box = objs.map((o, k) => {
      const p = thingPos(c, { at: 'zone', zone, k });
      const s = c.objects[o].size;
      return { x0: p.x - s.w / 2, x1: p.x + s.w / 2, y0: p.y - s.d / 2, y1: p.y + s.d / 2 };
    });
    let n = 0;
    for (let i = 0; i < box.length; i++) for (let j = i + 1; j < box.length; j++) if (box[i].x0 < box[j].x1 - 1e-9 && box[j].x0 < box[i].x1 - 1e-9 && box[i].y0 < box[j].y1 - 1e-9 && box[j].y0 < box[i].y1 - 1e-9) n++;
    const outside = box.filter((b) => b.x0 < z.bed!.x0 - 1e-9 || b.x1 > z.bed!.x0 + z.bed!.w + 1e-9 || b.y0 < z.bed!.y0 - 1e-9 || b.y1 > z.bed!.y0 + z.bed!.d + 1e-9).length;
    return { n, outside, count: box.length };
  };
  it('a bed holds its things inside it, no two footprints overlapping, the same heap for the same seed', () => {
    expect(overlaps(bedC, 'Z1')).toEqual({ n: 0, outside: 0, count: 7 });
    const again = contentWith((r) => {
      (r.zones as Record<string, Record<string, unknown>>).Z1.bed = { x0: 30, y0: 28, w: 3.2, d: 2.4 };
      (r.zones as Record<string, Record<string, unknown>>).Z1.things = { washer: 5, cable: 1, taps: 1 };
    });
    expect(bedLayout(again, 'Z1')).toEqual(bedLayout(bedC, 'Z1'));
    const other = contentWith((r) => {
      (r.zones as Record<string, Record<string, unknown>>).Z1.bed = { x0: 30, y0: 28, w: 3.2, d: 2.4 };
      (r.zones as Record<string, Record<string, unknown>>).Z1.things = { washer: 5, cable: 1, taps: 1 };
      r.worldSeed = 99;
    });
    expect(bedLayout(other, 'Z1')).not.toEqual(bedLayout(bedC, 'Z1'));
  });
  it('from the bed\'s open (south) side the boss reaches a thing without entering it', () => {
    const z = bedC.zones.Z1.bed!;
    const things = R.stockThings(bedC);
    let reached = 0;
    for (let x = z.x0; x <= z.x0 + z.w + 1e-9; x += 0.5) if (thingNear(bedC, things, x, z.y0 + z.d + 0.35, bedC.reach.work)) reached++;
    expect(reached).toBeGreaterThan(0);
  });
  it('the real content: every bed it has holds its stock with no overlap', () => {
    const c = GameConfigSchema.parse(gameJson).salvage as SalvageContent;
    for (const [id, z] of Object.entries(c.zones)) if (z.bed) expect({ id, ...overlaps(c, id) }).toMatchObject({ id, n: 0, outside: 0 });
  });
  it('nobody of the rules walks north of the back wall; the truck drives along the drive line', () => {
    const c = contentWith((r) => {
      const m = r.map as Record<string, unknown>;
      m.north = 26;
      m.driveLine = { points: [[62, 25], [50, 25], [40, 30]], w: 4 };
    });
    const g = fresh(cfgOf(c));
    const north = spotPos(c, { xy: [44, 20] }, g.salvage.things, g.salvage.truck);
    expect(north.y).toBeGreaterThanOrEqual(26);
    const path = lanePath(c, { x: 41, y: 33 }, 'partnerFarm', 0);
    const line = driveToGate(c, { x: 41, y: 33 })!;
    expect(path.slice(1, 1 + line.length)).toEqual(line);
    expect(line.at(-1)).toEqual({ x: 62, y: 25 });
    expect(line).toContainEqual({ x: 50, y: 25 });
    expect(driveToGate(SALVAGE_TEST, { x: 0, y: 0 })).toBeNull();
  });
});

describe('P11: the yard hand while the boss is in the yard', () => {
  const cfg = cfgOf(SALVAGE_TEST);
  const price = SALVAGE_TEST.shop.find((i) => i.key === 'hand1')!.price;
  const withPiece = (grade: string, g0: SalvageGame, present: boolean): SalvageGame => {
    const x = begin(cfg, g0, [], true);
    dropOnPile(x, { uid: 'p1', grade, g: 5000, from: null, spec: 0 }, 'dropoff');
    if (present) x.s.presenceAt = x.s.t;
    return { ...g0, salvage: x.s };
  };
  it('sets out on the tick he is hired, from the office door, to a waiting piece', () => {
    const g = R.hire(cfg, withPiece('li', fresh(cfg, 10_000), true), 'hand', price, 0);
    const m = g.salvage.crew.find((c) => c.role === 'hand')!;
    expect(m.job).toBe('dropoff');
    expect(m.t0).toBe(0);
    const office = pointOf(SALVAGE_TEST, 'office');
    expect(m.from).toEqual({ xy: [office.x, office.y + (SALVAGE_TEST.map.places.office?.d ?? 0) / 2 + 0.3] });
  });
  it('in the yard he leaves cable for the boss and the drop-off washer whole; away he takes them (E4)', () => {
    const inYard = R.hire(cfg, withPiece('cab', fresh(cfg, 10_000), true), 'hand', price, 0);
    expect(inYard.salvage.crew.find((c) => c.role === 'hand')!.job).toBe('idle');
    const away = R.hire(cfg, withPiece('cab', fresh(cfg, 10_000), false), 'hand', price, 0);
    expect(away.salvage.crew.find((c) => c.role === 'hand')!.job).not.toBe('idle');
  });
});

describe('W9: the car is stripped, not torch-cut', () => {
  const c = contentWith((r) => {
    const car = (r.objects as Record<string, Record<string, unknown>>).car;
    car.pieces = [['alw', 10000, 4, 'piece.alu.wheel'], ['tcab', 5000, 1, 'piece.cable'], ['conv', 1000, 1, 'piece.converter']];
    car.pieceTiers = [1, 1, 3];
    car.shell = { grade: 'cbody', g: 500000 };
  });
  it('wheels and loom by hand, the converter with the torch, then the shell is weighed whole where it stands; mass kept', () => {
    expect(lintSalvage(c)).toEqual([]);
    const x = ctx(c);
    bossIn(x, 10);
    const th = x.s.things.find((t) => t.obj === 'car')!;
    const where = thingPos(c, th.at);
    expect(tierOf(c, th)).toBe(1);
    let cutG = 0;
    const tiers: number[] = [];
    for (let k = 0; k < pieceCount(c, 'car'); k++) {
      tiers.push(tierOf(c, th));
      cutG += cutOff(x, th, 'boss', 10 + k)!.piece.g;
    }
    expect(tiers).toEqual([1, 1, 1, 1, 1, 3]);
    expect(th.shell).toBe(true);
    expect(tierOf(c, th)).toBe(Infinity);
    expect(x.s.things.includes(th)).toBe(true);
    expect(thingPos(c, th.at)).toEqual(where);
    const tk = x.s.tickets.at(-1) as Extract<Ticket, { kind: 'weighIn' }>;
    expect(tk.kind).toBe('weighIn');
    expect(tk.lines.map((l) => l.grade)).toEqual(['cbody']);
    const bay = x.s.bays.cbody.g;
    expect(cutG + bay - x.s.scaleRound_g + x.s.waste_g).toBe(c.objects.car.gross_g);
    shellsLeave(x, 'cbody');
    expect(x.s.things.includes(th)).toBe(false);
  });
});
