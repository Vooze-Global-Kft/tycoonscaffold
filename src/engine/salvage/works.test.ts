/**
 * THE WORKS, FIRST HALF (yard-stage2.md 2.5 to 2.8; 8.1 rows 2.5 and 2.6 to 2.8): plates as data, the analyser,
 * buying, delivery, commissioning, the rate plates' cumulative rule, trays, the bay-fed line, routes and reserves,
 * the halls, the magnet crane, and a tick equal to a jump on r4 with every plate working. On the works' frozen test
 * content (fixtures/salvage2works.ts: round numbers; no tuned number of the game). Owner: rules-works.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { newBot, playTo, seededCfg, startGame } from './bot';
import { r3Works, r4Game, TEST_PLATES, worksCfg } from '../fixtures/salvage2works';
import { buy, setPresence } from './actions';
import { plateBuyCheck, setPlateRecipe, setRoute } from './actionsWorks';
import { collectable, freeOf } from './bays';
import { cardOfWorks } from './cardsWorks';
import { begin, finish, type Ctx } from './clock';
import { pieceCount, pieceSpec } from './content';
import { pointOf } from './positions';
import { reconcileSalvage } from './save';
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
function act(g: SalvageGame, body: (x: Ctx) => void, live = true, on: SalvageConfig = cfg): SalvageGame {
  const x = begin(on, g, [], live);
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
    // 5 s worked at 1 kg/s since t0 + 110: 5 kg of baled light iron on its belt (RULING2 24.1: weighed at the plate into
    // its bay when the piece is done; nothing in a tray).
    expect(L.salvage.works.baler.work!.credited.lib).toBe(5000);
    expect(L.salvage.works.baler.tray_g).toEqual({});
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
    expect(Math.abs(b.salvage.works.baler.work!.credited.lib - 20_000)).toBeLessThanOrEqual(1);
    expect(jump(cfg, g, t0 + 20).salvage.works.baler.work!.credited.lib).toBe(20_000);
    // RULING2 24.1: the bale is weighed at the plate: the bay gets the whole piece at its end, the tray nothing.
    expect(bayG(b.salvage, 'lib')).toBe(bayG(g.salvage, 'lib'));
    const c = jump(cfg, g, t0 + 60);
    expect(bayG(c.salvage, 'lib') - bayG(g.salvage, 'lib')).toBe(50_500);
    expect(c.salvage.works.baler.tray_g).toEqual({});
    expect(c.salvage.works.baler.work).toBeNull();
  });

  // RULING2 24.1: no plate fills a tray any more; a tray's grams kept by an older save still stop it and are carried off.
  it('a full tray (an older save\'s) stops a south-yard plate before its next piece and loses nothing', () => {
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
      // (wave 2) the yard's other light iron off, so that the one pile a trip is this one whatever the played yard holds.
      x.s.pieces = x.s.pieces.filter((p) => p.grade !== 'li');
      x.s.pieces.push({ uid: 'q.p3', grade: 'li', g: 30_000, from: null, spec: -1, pile: 'floor', k: 900, claim: null });
      worksDepart(x, x.s.t);
      expect(m.dest).toBe('baler');
      expect(m.claims).toContain('q.p3');
    });
    const h = jump(cfg, g, g.salvage.t + 120);
    expect(h.salvage.pieces.some((p) => p.uid === 'q.p3')).toBe(false);
    const w = h.salvage.works.baler;
    const got = (w.work ? w.work.piece.g : 0) + w.hopper.reduce((a, p) => a + p.g, 0);
    // RULING2 24.1: once worked it is weighed at the plate into the lib bay (no tray trip).
    expect(w.tray_g).toEqual({});
    expect(got >= 30_000 || bayG(h.salvage, 'lib') - bayG(g.salvage, 'lib') >= 30_000).toBe(true);
  });

  // s2-fix-works2 (RULING2 24.1): the plate weighs what it makes, so the crane's move costs no yard hand's walk; it lifts
  // a key only when the plate's out is worth at least the key as the yard would sell it (works.ts craneWorth: out >= in).
  const floorOnly = (x: Ctx, add: Array<[string, string, number]>): void => {
    x.s.works.crane.move = null;
    x.s.things = x.s.things.filter((th) => th.at.at !== 'floor');
    x.s.pieces = x.s.pieces.filter((p) => p.pile !== 'floor' && !p.pile.startsWith('beside.'));
    let k = 900;
    for (const [uid, grade, gr] of add) x.s.pieces.push({ uid, grade, g: gr, from: null, spec: -1, pile: 'floor', k: k++, claim: null });
  };
  it('E5 / R1: baling pays (lib §0.62 against li §0.50): the crane lifts the floor\'s iron into the baler and the bale is weighed at the plate into its bay; mass exact', () => {
    let g = setRoute(cfg, quiet(r4Game()), 'li', 'baler', r4Game().salvage.t);
    g = act(g, (x) => {
      floorOnly(x, [['q.li', 'li', 20_000]]);
      worksDepart(x, x.s.t);
      expect(x.s.works.crane.move).toMatchObject({ items: ['q.li'], to: 'baler' });
    });
    const h = jump(cfg, g, g.salvage.t + 120);
    expect(h.salvage.pieces.some((p) => p.uid === 'q.li')).toBe(false);
    expect(h.salvage.works.baler.tray_g).toEqual({});
    const w = h.salvage.works.baler;
    const inPlate = (w.work ? w.work.piece.g - (w.work.credited.lib ?? 0) : 0) + w.hopper.reduce((a, p) => a + p.g, 0) + (w.work?.credited.lib ?? 0);
    // Every gram of the 20 kg is in the baler or in the lib bay (the bale is 1:1, no waste).
    expect(bayG(h.salvage, 'lib') - bayG(g.salvage, 'lib') + inPlate).toBeGreaterThanOrEqual(20_000);
  });
  it('E5 / R1: where the plate\'s out is worth less than its input as the yard sells it, the crane lifts nothing (craneWorth)', () => {
    // A content where loose light iron is dearer than its bale: the baler would make the yard poorer.
    const cheap = { ...cfg, salvage: { ...cfg.salvage, worksLayer: { ...cfg.salvage.worksLayer!, grades: { ...cfg.salvage.worksLayer!.grades, lib: { ...cfg.salvage.worksLayer!.grades.lib, pbar: pbar('li') * 0.9 } } } } } as SalvageConfig;
    let g = setRoute(cheap, quiet(r4Game()), 'li', 'baler', r4Game().salvage.t);
    g = act(g, (x) => {
      floorOnly(x, [['q.li', 'li', 20_000]]);
      worksDepart(x, x.s.t);
      expect(x.s.works.crane.move).toBeNull();
      expect(x.s.pieces.find((p) => p.uid === 'q.li')?.claim).toBeNull();
    }, true, cheap);
  });
  it('R1: the magnet lifts only ferrous grades: thin cable on the floor is never carried into the granulator, even within reach', () => {
    let g = quiet(r4Game());
    g = act(g, (x) => {
      floorOnly(x, [['q.cab', 'tcab', 5_000]]);
      worksDepart(x, x.s.t);
      expect(x.s.works.crane.move).toBeNull();
      expect(x.s.pieces.find((p) => p.uid === 'q.cab')?.claim).not.toBe('crane.crane');
    });
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
    }, true, cfg);
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
    // (wave 2) the merged content's objects (a works-layer thing may stand in the yard), an oversize piece by its fixed
    // mass, and what the Yard sale sold (supplied grams leave the yard).
    const M = begin(cfg, g0, [], true).c;
    const mass = (s: SalvageState) => {
      let m = s.waste_g + s.ladder.supplied_g;
      for (const p of s.pieces) m += p.g;
      for (const th of s.things) {
        if (th.g !== undefined && th.cut === 0) {
          m += th.g;
          continue;
        }
        m += M.objects[th.obj].waste_g;
        for (let k = th.cut; k < pieceCount(M, th.obj); k++) m += pieceSpec(M, th.obj, k)!.g;
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

describe('4.3 the works card and 17.1 (a plate nobody can feed harms nothing)', () => {
  it('locked shows its gate only; buyable shows the price its Buy applies; the gain a kilogram; then arriving and installed', () => {
    const g0 = { ...r3Works(), cash: 5000 };
    const lockedCfg = { ...cfg, salvage: { ...cfg.salvage, works: { ...cfg.salvage.works!, plates: { ...cfg.salvage.works!.plates, baler: { ...cfg.salvage.works!.plates.baler, needs: 'shredder' } } } } } as SalvageConfig;
    const L = cardOfWorks(lockedCfg, g0, { kind: 'works', plate: 'baler' }, 0, { country: null }).works!;
    expect(L).toMatchObject({ state: 'locked', in: [], out: [], gain: null, foot: { buy: null, loan: null } });
    const c = cardOfWorks(cfg, g0, { kind: 'works', plate: 'baler' }, 0, { country: null });
    const w = c.works!;
    expect(w).toMatchObject({ state: 'buyable', in: ['li'], out: ['lib'] });
    expect(w.gain!.pct).toBeCloseTo(0.62 / 0.5 - 1, 9);
    expect(w.foot.buy!.action).toEqual({ act: 'buy', item: 'baler', price: 1000 });
    const g1 = buy(cfg, g0, 'baler', (w.foot.buy!.action as { price: number }).price, g0.salvage.t);
    expect(g1.cash).toBe(g0.cash - 1000);
    expect(cardOfWorks(cfg, g1, { kind: 'works', plate: 'baler' }, 0, { country: null }).works).toMatchObject({ state: 'arriving', arrivesAt: g0.salvage.t + 10, foot: { buy: null } });
    const g2 = adv(quiet(g1), g0.salvage.t + 20, false);
    expect(cardOfWorks(cfg, g2, { kind: 'works', plate: 'baler' }, 0, { country: null }).works).toMatchObject({ state: 'installed', commission_s: 5, selfStartAt: g0.salvage.t + 110 });
  });

  it('a running plate that no input reaches (the breaker: no battery comes to r3) leaves the rest of the yard exactly as without it', () => {
    let g: SalvageGame = { ...r3Works(), cash: 5000 };
    g = buy(cfg, g, 'breaker', 1000, g.salvage.t);
    g = jump(cfg, g, g.salvage.t + 111);
    expect(g.salvage.works.breaker.phase).toBe('running');
    const without: SalvageGame = { ...g, salvage: { ...structuredClone(g.salvage), works: {} } };
    const a = jump(cfg, g, g.salvage.t + 600);
    const b = jump(cfg, without, g.salvage.t + 600);
    const rest = (h: SalvageGame) => {
      const w = whole(h) as { s: Record<string, unknown> };
      delete w.s.works;
      return w;
    };
    expect(rest(a)).toEqual(rest(b));
  }, 120_000);
});

describe('2.20 the save (the works part)', () => {
  it('r4 with every plate working round-trips through the save and goes on as the unsaved yard', () => {
    const g0 = r4Game();
    const loaded = reconcileSalvage(cfg, { ...g0, salvage: undefined } as never, JSON.parse(JSON.stringify({ salvage: g0.salvage })), g0.salvage.clock.highMs);
    expect(loaded.salvage.works).toEqual(g0.salvage.works);
    expect(loaded.salvage.routes).toEqual(g0.salvage.routes);
    // (save.ts clamps a bay's reserve to its grams; the works rebuild every reserve at the next instant: refreshReserves)
    const a = jump(cfg, { ...loaded, cash: g0.cash, lifetimeEarnings: g0.lifetimeEarnings }, g0.salvage.t + 300);
    const b = jump(cfg, { ...g0, salvage: { ...g0.salvage, presence: loaded.salvage.presence, presenceAt: loaded.salvage.presenceAt } }, g0.salvage.t + 300);
    expect(a.salvage.works).toEqual(b.salvage.works);
  }, 120_000);
});

/**
 * RULING2 24.1 (s2-fix-works2): only the WORKS' yard plates weigh what they make at the plate. The first yard's own machines
 * (the strippers, the motor bench, the crucible) keep their trays, which yard hands carry to the platform scale: PINNED on
 * the shipped content at release.stage 1 (the game on the owner's phone) and at stage 2 below the works' opening.
 */
describe('RULING2 24.1: the first yard\'s trays still go to the platform scale by hand (shipped content)', () => {
  const NOW = Date.UTC(2026, 10, 25, 12);
  const raw = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8'));
  const stage1 = (): SalvageConfig => ({ mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage), monetization: raw.monetization }) as unknown as SalvageConfig;
  for (const [name, base] of [['release.stage 1', stage1], ['stage 2 below the works\' opening', () => shipped2Config(SalvageSchema.parse)]] as const) {
    it(`${name}: the motor bench's tray is carried off by a yard hand and weighed in on a hand's ticket`, () => {
      const c0 = base();
      if (name === 'release.stage 1') expect(c0.salvage.release?.stage ?? 1).toBe(1);
      const c = seededCfg(c0, 101);
      const b = newBot(c, startGame(c, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 101 } as never);
      playTo(b, 40 * 60);
      const s = structuredClone(b.g.salvage) as SalvageState;
      expect(s.ladder.rung).toBeLessThan(3);
      expect(s.counts?.bathSet).toBeUndefined();
      expect(s.machines.bench.owned).toBe(true);
      s.machines.bench.tray_g = { ...s.machines.bench.tray_g, li: (s.machines.bench.tray_g.li ?? 0) + 30_000 };
      const before = s.tickets.length ? s.tickets[s.tickets.length - 1].no ?? 0 : 0;
      let g = { ...b.g, salvage: s } as SalvageGame;
      let sawTray = false;
      for (let k = 0; k < 120 && !sawTray; k++) {
        g = jump(c, g, g.salvage.t + 5);
        sawTray = g.salvage.crew.some((m) => m.role === 'hand' && m.job === 'tray');
      }
      expect(sawTray).toBe(true);
      g = jump(c, g, g.salvage.t + 300);
      const handLi = g.salvage.tickets.filter((tk) => tk.kind === 'weighIn' && tk.by !== 'boss' && (tk.no ?? 0) > before).flatMap((tk) => tk.lines).filter((l) => l.grade === 'li').reduce((a, l) => a + l.g, 0);
      expect(handLi).toBeGreaterThanOrEqual(30_000);
      expect(g.salvage.works).toEqual({});
    }, 120_000);
  }
});
