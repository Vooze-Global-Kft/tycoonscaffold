/**
 * THE WORKS, FIRST HALF (yard-stage2.md 2.5 to 2.8; 8.1 rows 2.5 and 2.6 to 2.8): plates as data, the analyser,
 * buying, delivery, commissioning, the rate plates' cumulative rule, trays, the bay-fed line, routes and reserves,
 * the halls, the magnet crane, and a tick equal to a jump on r4 with every plate working. On the works' frozen test
 * content (fixtures/salvage2works.ts: round numbers; no tuned number of the game). Owner: rules-works.
 */
import { describe, expect, it } from 'vitest';
import type { SalvageContent } from '../../config/schema.salvage';
import { r3Works, r4Game, TEST_PLATES, worksCfg, worksContent } from '../fixtures/salvage2works';
import { buy, setPresence } from './actions';
import { plateBuyCheck, setPlateRecipe, setRoute } from './actionsWorks';
import { collectable, freeOf } from './bays';
import { begin, finish, type Ctx } from './clock';
import { pieceCount, pieceSpec } from './content';
import { pointOf } from './positions';
import { weighIn } from './scales';
import { advance, advanceSalvage, jump } from './tick';
import type { Piece, SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';
import { feedPlate, routeOf, startPlate, worksDepart } from './works';

const cfg = worksCfg();
const C = (): SalvageContent => cfg.salvage;
const merged = (): SalvageContent => (cfg.salvage.worksLayer ? ({ ...cfg.salvage, grades: { ...cfg.salvage.grades, ...cfg.salvage.worksLayer.grades } } as SalvageContent) : cfg.salvage);
const pbar = (g: string): number => merged().grades[g]?.pbar ?? 0;

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};

/** A copy of a game whose yard is quiet: no crew, no trip, no drop-off arrivals, no partner open, every bay held (the round takes nothing), the boss stale. */
function quiet(g: SalvageGame): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageState;
  s.crew = [];
  s.dropoff.nextAt = -1;
  // No trip under way (a planned one would tip a load into the closed yard) and nothing earmarked.
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.earmark = null;
  // Every grade's bay held (also those a plate will fill first: a new bay would be the round's).
  for (const grade of Object.keys(merged().grades)) s.bays[grade] ??= { g: 0, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 };
  for (const b of Object.values(s.bays)) b.held = true;
  for (const p of Object.values(s.partners)) p.open = false;
  s.presenceAt = -1;
  return { ...g, salvage: s };
}

/** Run a body on a live Ctx of g and finish it. */
function act(g: SalvageGame, body: (x: Ctx) => void, live = true): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}

/** Advance g to yard second T (live or with no boss). */
function adv(g: SalvageGame, T: number, live = true, ev: SalvageEvent[] = []): SalvageGame {
  const x = begin(cfg, g, ev, live);
  advance(x, T);
  return finish(g, x);
}

const bayG = (s: SalvageState, grade: string): number => s.bays[grade]?.g ?? 0;

describe('2.5 plates as data (the test content)', () => {
  it('every plate and recipe keeps mass per input: Σ out + Σ waste = 1 + Σ reagents', () => {
    for (const [id, d] of Object.entries(TEST_PLATES)) {
      const rg = d.reagents.reduce((a, r) => a + r[1], 0);
      for (const input of Object.keys(d.out)) {
        const sum = [...(d.out[input] ?? []), ...(d.waste[input] ?? [])].reduce((a, [, sh]) => a + sh, 0);
        expect(sum, `${id} ${input}`).toBeCloseTo(1 + rg, 9);
      }
      for (const [rid, r] of Object.entries(d.recipes ?? {})) {
        const sum = [...r.out, ...r.waste].reduce((a, [, sh]) => a + sh, 0);
        expect(sum, `${id}.${rid}`).toBeCloseTo(1 + r.reagents.reduce((a, q) => a + q[1], 0), 9);
      }
    }
  });

  it('every plate and recipe nets at least 1.05 × its input at p̄ after reagents (13.5)', () => {
    const inVal = (k: string) => (C().objects[k]?.whole ? pbar(C().objects[k].whole!) : pbar(k));
    for (const [id, d] of Object.entries(TEST_PLATES)) {
      for (const input of Object.keys(d.out)) {
        if (input === 'stream') continue;
        const out = (d.out[input] ?? []).filter(([to]) => to !== 'stream').reduce((a, [to, sh]) => a + sh * pbar(to), 0);
        const reag = d.reagents.reduce((a, r) => a + r[1] * r[2], 0);
        expect(out - reag, `${id} ${input}`).toBeGreaterThanOrEqual(1.05 * inVal(input) - 1e-9);
      }
      for (const [rid, r] of Object.entries(d.recipes ?? {})) {
        const out = r.out.reduce((a, [to, sh]) => a + sh * pbar(to), 0) - r.reagents.reduce((a, q) => a + q[1] * q[2], 0);
        for (const input of r.in) expect(out, `${id}.${rid} ${input}`).toBeGreaterThanOrEqual(1.05 * pbar(input) - 1e-9);
      }
    }
  });
});

describe('2.5.2 the analyser', () => {
  it('a piece with an assay grade weighs in at it only while the analyser runs, whatever its age, the line "Analysed"', () => {
    const c = r3Works();
    const washer = c.salvage.bays; // r3's yard
    void washer;
    // The washer's drum: [li, 8000 g, ..., assay ss] at spec index 2 on the frozen content.
    const spec = (C().objects.washer?.pieces as readonly (readonly unknown[])[] | undefined)?.findIndex((sp) => sp[4] === 'ss') ?? -1;
    expect(spec).toBeGreaterThanOrEqual(0);
    const sp = C().objects.washer.pieces[spec];
    const piece: Piece = { uid: 'old.p2', grade: sp[0] as string, g: sp[1] as number, from: 'old', spec };
    // Without the analyser: its own grade.
    const ev0: SalvageEvent[] = [];
    const a = act(c, (x) => {
      x.ev = ev0;
      weighIn(x, [piece], 'boss', x.s.t);
    });
    expect(bayG(a.salvage, 'li') - bayG(c.salvage, 'li')).toBe(sp[1]);
    expect(ev0.some((e) => e.type === 'analysed')).toBe(false);
    // With it bought and running (self-commissioned): ss, "Analysed", counted.
    let g: SalvageGame = { ...c, cash: 10_000 };
    g = buy(cfg, g, 'analyser', 1000, g.salvage.t);
    g = adv(quiet(g), g.salvage.t + 10 + 100 + 0.01, false);
    expect(g.salvage.works.analyser.phase).toBe('running');
    const ev: SalvageEvent[] = [];
    const b = act(g, (x) => {
      x.ev = ev;
      weighIn(x, [piece], 'boss', x.s.t);
    });
    expect(bayG(b.salvage, 'ss') - bayG(g.salvage, 'ss')).toBe(sp[1]);
    const tk = b.salvage.tickets[b.salvage.tickets.length - 1];
    expect(tk.kind).toBe('weighIn');
    expect((tk as { lines: { grade: string; note?: { kind: string } }[] }).lines.find((l) => l.grade === 'ss')?.note?.kind).toBe('analysed');
    expect(ev.find((e) => e.type === 'analysed')).toEqual({ type: 'analysed', grade: 'ss', from: 'li' });
    expect(b.salvage.counts!['analysed:ss']).toBe(1);
  });
});

describe('2.6 buying, delivery, commissioning', () => {
  it('a plate is bought at its shown price, cash only; refusals: priceUpdated, owned, needsItem, cash', () => {
    const g0 = { ...r3Works(), cash: 1500 };
    expect(plateBuyCheck(cfg, g0, 'baler')).toMatchObject({ price: 1000, refusal: null, state: 'buy' });
    const ev: SalvageEvent[] = [];
    expect(buy(cfg, g0, 'baler', 999, g0.salvage.t, ev)).toBe(g0);
    expect(ev[0]).toMatchObject({ type: 'refused', key: 'priceUpdated' });
    const g1 = buy(cfg, g0, 'baler', 1000, g0.salvage.t);
    expect(g1.cash).toBe(500);
    expect(g1.salvage.works.baler).toMatchObject({ phase: 'arriving', commissionAt: g0.salvage.t + 10, work: null });
    expect(g1.salvage.arriving.some((a) => a.item === 'baler')).toBe(false);
    expect(plateBuyCheck(cfg, g1, 'baler').refusal?.key).toBe('owned');
    expect(plateBuyCheck(cfg, g1, 'eddy').refusal?.key).toBe('needsItem');
    expect(plateBuyCheck(cfg, g1, 'shear').refusal?.key).toBe('cash');
  });

  it('it works nothing until commissioned; set down at its date; started up by itself at arrival + selfCommission_s, present or away the same', () => {
    let g: SalvageGame = { ...r3Works(), cash: 10_000 };
    const t0 = g.salvage.t;
    g = buy(cfg, g, 'baler', 1000, t0);
    g = act(quiet(g), (x) => {
      // A piece put straight in while it is on the flatbed is never worked.
      x.s.works.baler.hopper.push({ uid: 'q.p0', grade: 'li', g: 10_000, from: null, spec: -1 });
    });
    const live = adv(g, t0 + 50, true);
    const away = adv(g, t0 + 50, false);
    for (const h of [live, away]) {
      expect(h.salvage.works.baler.phase).toBe('installed');
      expect(h.salvage.works.baler.commissionAt).toBeCloseTo(t0 + 10 + 100, 9);
      expect(h.salvage.works.baler.work).toBeNull();
      expect(h.salvage.works.baler.hopper.length).toBe(1);
    }
    const L = adv(g, t0 + 115, true);
    const A = adv(g, t0 + 115, false);
    expect(L.salvage.works.baler).toMatchObject({ phase: 'running', commissionedBy: 'self' });
    // The works the same present or away (the rest of the yard differs by the first yard's own rules: goalsAt, 2.1.10).
    expect(A.salvage.works).toEqual(L.salvage.works);
    expect(L.salvage.counts!['commissioned:baler']).toBe(1);
    // 5 s worked at 1 kg/s since t0 + 110: 5 kg of baled light iron in its tray.
    expect(L.salvage.works.baler.tray_g.lib).toBe(5000);
  });

  it('the boss standing still at its plot for commission_s starts it up; walking off cancels', () => {
    let g: SalvageGame = { ...r3Works(), cash: 10_000 };
    const t0 = g.salvage.t;
    g = buy(cfg, g, 'shear', 1000, t0);
    g = adv(quiet(g), t0 + 20);
    expect(g.salvage.works.shear.phase).toBe('installed');
    const at = pointOf(C(), 'shear');
    const sample = (h: SalvageGame, moving: boolean) => setPresence(cfg, h, { x: at.x, y: at.y + (moving ? 0.1 : 0), moving, standingFor: moving ? 0 : 1, driving: false, heading: 0 } as never, h.salvage.t);
    // Samples twice a second (a presence is fresh for feel.staleS).
    let a = sample(g, false);
    expect(a.salvage.act).toMatchObject({ kind: 'commission', target: 'shear' });
    const t1 = a.salvage.t;
    for (let k = 0; k < 12; k++) a = adv(sample(a, false), a.salvage.t + 0.5);
    expect(a.salvage.works.shear).toMatchObject({ phase: 'running', commissionedBy: 'boss' });
    expect(a.salvage.works.shear.since).toBeCloseTo(t1 + 5, 9);
    // Walking off at 2 s: still installed.
    let b = sample(g, false);
    for (let k = 0; k < 4; k++) b = adv(sample(b, false), b.salvage.t + 0.5);
    for (let k = 0; k < 8; k++) b = adv(sample(b, true), b.salvage.t + 0.5);
    expect(b.salvage.works.shear.phase).toBe('installed');
  });
});

describe('2.7 the rate plates: the cumulative rule, trays, routes, the crane', () => {
  const r4q = () => quiet(r4Game());

  it('a piece is worked by the cumulative rule: ticking and jumping credit the same grams; its end gives the exact remainder', () => {
    const g = act(r4q(), (x) => feedPlate(x, 'baler', { uid: 'q.p1', grade: 'li', g: 50_500, from: null, spec: -1 }, x.s.t));
    const t0 = g.salvage.t;
    let a = g;
    let ms = a.salvage.clock.highMs;
    for (let i = 0; i < 200; i++) {
      ms += 100;
      a = advanceSalvage(cfg, a, 0.1, ms);
    }
    const b = jump(cfg, g, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    expect(Math.abs(b.salvage.works.baler.tray_g.lib - 20_000)).toBeLessThanOrEqual(1);
    expect(jump(cfg, g, t0 + 20).salvage.works.baler.tray_g.lib).toBe(20_000);
    const c = jump(cfg, g, t0 + 60);
    expect(c.salvage.works.baler.tray_g.lib).toBe(50_500);
    expect(c.salvage.works.baler.work).toBeNull();
  });

  it('a full tray stops a south-yard plate before its next piece and loses nothing', () => {
    const g = act(r4q(), (x) => {
      x.s.works.baler.tray_g = { lib: 200_000 };
      feedPlate(x, 'baler', { uid: 'q.p2', grade: 'li', g: 40_000, from: null, spec: -1 }, x.s.t);
    });
    expect(g.salvage.works.baler.status).toBe('trayFull');
    const h = jump(cfg, g, g.salvage.t + 100);
    expect(h.salvage.works.baler.hopper.map((p) => p.g)).toEqual([40_000]);
    expect(h.salvage.works.baler.tray_g.lib).toBe(200_000);
    // A yard hand takes the tray: the plate starts again.
    const k = act(h, (x) => {
      x.s.works.baler.tray_g = {};
      startPlate(x, 'baler', x.s.works.baler, x.s.t);
    });
    expect(k.salvage.works.baler.status).toBe('working');
  });

  it('routes: the default is the running plate that gains most a kilogram; a set route wins; refusals notOwned, noRoute', () => {
    const g = r4q();
    const x = begin(cfg, g, [], true);
    // li: shredder 0.9 × §1.26 − §0.50 against baler §0.62 − §0.50.
    expect(routeOf(x, 'li')).toBe('shredder');
    const ev: SalvageEvent[] = [];
    const h = setRoute(cfg, g, 'li', 'baler', g.salvage.t, ev);
    expect(ev).toEqual([{ type: 'routeSet', grade: 'li', to: 'baler' }]);
    expect(routeOf(begin(cfg, h, [], true), 'li')).toBe('baler');
    const ev2: SalvageEvent[] = [];
    setRoute(cfg, g, 'li', 'granulator', g.salvage.t, ev2);
    expect(ev2[0]).toMatchObject({ key: 'noRoute' });
    const ev3: SalvageEvent[] = [];
    setRoute(cfg, r3Works(), 'li', 'baler', g.salvage.t, ev3);
    expect(ev3[0]).toMatchObject({ key: 'notOwned' });
  });

  it('a yard hand the first yard left idle feeds a hands-fed plate by its route (worksDepart), and the hopper takes it', () => {
    const base = r4Game();
    let g = setRoute(cfg, quiet(base), 'li', 'baler', base.salvage.t);
    g = act(g, (x) => {
      x.s.crew = structuredClone(base.salvage.crew.filter((m) => m.role === 'hand').slice(0, 1));
      const m = x.s.crew[0];
      Object.assign(m, { job: 'idle', phase: 'wait', t0: x.s.t, t1: x.s.t, claims: [], load: [], run: undefined, course: undefined });
      delete m.run;
      delete m.course;
      x.s.pieces.push({ uid: 'q.p3', grade: 'li', g: 30_000, from: null, spec: -1, pile: 'floor', k: 900, claim: null });
      worksDepart(x, x.s.t);
      expect(m.dest).toBe('baler');
      expect(m.claims).toContain('q.p3');
    });
    const h = jump(cfg, g, g.salvage.t + 120);
    expect(h.salvage.pieces.some((p) => p.uid === 'q.p3')).toBe(false);
    const w = h.salvage.works.baler;
    const got = (w.tray_g.lib ?? 0) + (w.work ? w.work.piece.g : 0) + w.hopper.reduce((a, p) => a + p.g, 0);
    expect(got).toBeGreaterThanOrEqual(30_000);
  });

  it('the magnet crane moves ferrous pieces from the floor into a hopper its reach holds, never a grade of crane.never', () => {
    let g = setRoute(cfg, quiet(r4Game()), 'li', 'baler', r4Game().salvage.t);
    g = act(g, (x) => {
      // Only these two on the floor (r4's crane move set aside: its things go too).
      x.s.works.crane.move = null;
      x.s.things = x.s.things.filter((th) => th.at.at !== 'floor');
      x.s.pieces = x.s.pieces.filter((p) => p.pile !== 'floor' && !p.pile.startsWith('beside.'));
      x.s.pieces.push({ uid: 'q.li', grade: 'li', g: 20_000, from: null, spec: -1, pile: 'floor', k: 901, claim: null });
      x.s.pieces.push({ uid: 'q.cu', grade: 'no2', g: 5_000, from: null, spec: -1, pile: 'floor', k: 902, claim: null });
      worksDepart(x, x.s.t);
      expect(x.s.works.crane.move).toMatchObject({ items: ['q.li'], g: 20_000, to: 'baler' });
      // 20 kg at 50 kg/s: 0.4 s.
      expect(x.s.works.crane.move!.end - x.s.t).toBeCloseTo(0.4, 9);
    });
    const h = jump(cfg, g, g.salvage.t + 1);
    expect(h.salvage.pieces.some((p) => p.uid === 'q.li')).toBe(false);
    expect(h.salvage.pieces.find((p) => p.uid === 'q.cu')?.claim).toBeNull();
    // Out of reach: with a reach of 1 m it serves nothing.
    const near = { ...cfg, salvage: { ...cfg.salvage, crane: { ...cfg.salvage.crane!, reach_m: 1 } } } as SalvageConfig;
    const x2 = begin(near, g, [], true);
    x2.s.works.crane.move = null;
    worksDepart(x2, x2.s.t);
    expect(x2.s.works.crane.move).toBeNull();
  });
});

describe('2.8 the back field: bays, the line, the halls', () => {
  it('the shredder draws one piece from its routed bay (debited once), its outputs land in their bays, the stream through the eddy current; mass exact', () => {
    const g0 = quiet(r4Game());
    const w0 = g0.salvage.works.shredder;
    expect(w0.work?.piece).toMatchObject({ grade: 'cbody', g: 100_000 });
    const t0 = w0.work!.startAt;
    const mid = jump(cfg, g0, t0 + 25);
    // 50 kg done at 2 kg/s: shred 0.7 × 50, the stream 0.3 × 50 → zorba 0.5 of it, on the belt; the bays unchanged.
    expect(mid.salvage.works.shredder.work!.credited).toMatchObject({ shred: 35_000, stream: 15_000, '>zorba': 7_500 });
    expect(bayG(mid.salvage, 'shred')).toBe(bayG(g0.salvage, 'shred'));
    const end = jump(cfg, g0, t0 + 50 + 1e-6);
    // Done: 70 kg of shred and 15 kg of zorba land; 15 kg to a licensed waste carrier.
    expect(bayG(end.salvage, 'shred') - bayG(g0.salvage, 'shred')).toBe(70_000);
    // (the sorter, zorba's route, draws it at once)
    const sorter = end.salvage.works.sorter;
    const inSorter = (sorter.work?.piece.grade === 'zorba' ? sorter.work.piece.g : 0) + sorter.hopper.reduce((a, p) => a + p.g, 0);
    expect(bayG(end.salvage, 'zorba') + inSorter - bayG(g0.salvage, 'zorba') - (g0.salvage.works.sorter.work?.piece.g ?? 0)).toBe(15_000);
    // The next piece was drawn at once from the same bay (cbody first in `in`): the bay was debited 100 kg.
    expect(bayG(end.salvage, 'cbody')).toBe(bayG(g0.salvage, 'cbody') - 100_000);
  });

  it('a whole closed yard keeps every gram through ten minutes of the works (bays, hoppers, work, heats, waste)', () => {
    const g0 = quiet(r4Game());
    const mass = (s: SalvageState) => {
      let m = s.waste_g;
      for (const p of s.pieces) m += p.g;
      for (const th of s.things) {
        m += C().objects[th.obj].waste_g;
        for (let k = th.cut; k < pieceCount(C(), th.obj); k++) m += pieceSpec(C(), th.obj, k)!.g;
      }
      for (const b of Object.values(s.bays)) m += b.g;
      for (const w of Object.values(s.works)) {
        for (const p of w.hopper) m += p.g;
        // A hands-fed plate's credited grams are in its tray; a bay-fed plate's stay on its belt until the piece is done.
        if (w.work) m += TEST_PLATES[w.plate].feedBy === 'hands' ? w.work.piece.g - Object.values(w.work.credited).reduce((a, v) => a + v, 0) : w.work.piece.g;
        m += Object.values(w.tray_g).reduce((a, v) => a + v, 0);
        if (w.heat) m += w.heat.charge_g;
      }
      return m;
    };
    // The first yard's machines (hoppers, work, trays) and the crucible's pot.
    const ingot = (s: SalvageState) => {
      let m = s.machines.crucible.charge_g + s.machines.crucible.heel_g;
      for (const k of Object.values(s.machines)) {
        for (const p of k.hopper) m += p.g;
        if (k.work) m += k.work.piece.g - Object.values(k.work.credited).reduce((a, v) => a + v, 0);
        m += Object.values(k.tray_g).reduce((a, v) => a + v, 0);
      }
      return m;
    };
    const h = jump(cfg, g0, g0.salvage.t + 600);
    expect(mass(h.salvage) + ingot(h.salvage)).toBe(mass(g0.salvage) + ingot(g0.salvage));
    expect(h.salvage.counts!['poured:rotary']).toBeGreaterThanOrEqual(1);
  });

  it('a routed bay keeps the plate\'s reserve from the round and from Sell; a route away releases it', () => {
    const g = quiet(r4Game());
    const b = g.salvage.bays.cbody;
    expect(b.reserved).toEqual({ shredder: 100_000 });
    expect(freeOf(b)).toBe(b.g - 100_000);
    const x = begin(cfg, { ...g, salvage: { ...g.salvage, bays: { ...g.salvage.bays, cbody: { ...b, held: false } } } }, [], true);
    expect(collectable(x, 'cbody').free).toBe(Math.floor((b.g - 100_000) / 100) * 100);
    const h = act(setRoute(cfg, g, 'cbody', 'bay', g.salvage.t), (y) => worksDepart(y, y.s.t));
    expect(h.salvage.bays.cbody.reserved).toBeUndefined();
  });

  it('a hall: reagents paid at the heat\'s start only; the first pour waits for the boss and pours by itself selfCommission_s after ready', () => {
    let g: SalvageGame = { ...quiet(r3Works()), cash: 10_000 };
    g = buy(cfg, g, 'rotary', 1000, g.salvage.t);
    g = adv(g, g.salvage.t + 110.5, false);
    expect(g.salvage.works.rotary.phase).toBe('running');
    g = act(g, (x) => {
      const b = (x.s.bays.alcast ??= { g: 0, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 });
      b.g += 100_000;
      worksDepart(x, x.s.t);
    });
    const h = g.salvage.works.rotary.heat!;
    expect(h.phase).toBe('heating');
    expect(h.charge_g).toBe(100_000);
    const cash0 = g.cash;
    const t0 = h.phaseSince;
    const mid = adv(g, t0 + 99, false);
    expect(mid.cash).toBe(cash0);
    const ready = adv(g, t0 + 150, false);
    expect(ready.salvage.works.rotary.heat!.phase).toBe('ready');
    expect(bayG(ready.salvage, 'ali')).toBe(bayG(g.salvage, 'ali'));
    const poured = adv(g, t0 + 200 + 0.01, false);
    expect(poured.salvage.works.rotary.heat!.phase).not.toBe('ready');
    expect(bayG(poured.salvage, 'ali') - bayG(g.salvage, 'ali')).toBe(90_000);
    expect(bayG(poured.salvage, 'ald') - bayG(g.salvage, 'ald')).toBe(5_000);
    expect(poured.salvage.counts!['poured:rotary']).toBe(1);
    // The reagents of that heat (§5) were paid before g was taken (at its start), none since.
    expect(poured.cash).toBe(cash0);
  });

  it('a heat the cash cannot pay waits and leaves no date; a recipe change hands the charge back to its bays', () => {
    let g: SalvageGame = { ...quiet(r3Works()), cash: 10_000 };
    g = buy(cfg, g, 'induction', 1000, g.salvage.t);
    g = adv(g, g.salvage.t + 110.5, false);
    g = { ...g, cash: 0 };
    g = act(g, (x) => {
      const b = (x.s.bays.brs ??= { g: 0, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 });
      b.g += 30_000;
      worksDepart(x, x.s.t);
    });
    // brass has no reagents: 30 kg ≥ half of 50 kg: dated at the last feed + 10 s.
    expect(g.salvage.works.induction.heat).toMatchObject({ phase: 'filling', charge_g: 30_000 });
    const ev: SalvageEvent[] = [];
    const h = setPlateRecipe(cfg, g, 'induction', 'bronze', false, g.salvage.t, ev);
    expect(ev[0]).toMatchObject({ key: 'confirmHeel' });
    const k = setPlateRecipe(cfg, h, 'induction', 'bronze', true, g.salvage.t);
    expect(k.salvage.works.induction.heat).toMatchObject({ recipe: 'bronze', charge_g: 0 });
    expect(bayG(k.salvage, 'brs')).toBe(bayG(g.salvage, 'brs') + 30_000);
  });
});

describe('the engine promises on r4 (every plate working)', () => {
  it('a tick equals a jump: 60 s stale, then 3 minutes with the boss walking past the plates', () => {
    const g0 = r4Game();
    {
      let a = g0;
      let ms = a.salvage.clock.highMs;
      for (let i = 0; i < 600; i++) {
        ms += 100;
        a = advanceSalvage(cfg, a, 0.1, ms);
      }
      const b = jump(cfg, g0, a.salvage.t);
      expect(whole(b)).toEqual(whole(a));
    }
    {
      const pts = ['baler', 'shear', 'crane', 'floor', 'scale'].map((id) => pointOf(C(), id));
      let a = g0;
      let b = g0;
      let ms = a.salvage.clock.highMs;
      for (let k = 0; k < 180; k++) {
        const i = Math.floor(k / 20) % pts.length;
        const moving = k % 20 >= 12;
        const p = { x: pts[i].x, y: pts[i].y + 1, moving, standingFor: moving ? 0 : 2, driving: false, heading: 0 } as never;
        a = setPresence(cfg, a, p, a.salvage.t);
        b = setPresence(cfg, b, p, b.salvage.t);
        for (let j = 0; j < 10; j++) {
          ms += 100;
          a = advanceSalvage(cfg, a, 0.1, ms);
        }
        b = jump(cfg, b, a.salvage.t);
        if (k % 60 === 59) expect(whole(b), `walking at ${k} s`).toEqual(whole(a));
      }
    }
  }, 300_000);

  it('the works opened at a rung-3 state\'s first live instant: backFieldOpen, bathSet, the merged content read from then', () => {
    const g = r3Works();
    expect(g.salvage.counts!.bathSet).toBe(1);
    expect(g.salvage.lots.nextAt).not.toBeNull();
  });
});
