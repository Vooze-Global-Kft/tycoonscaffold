/**
 * THE SHREDDER LINE (s2e-line; yard-stage2-economy.md 2.6.4, 2.7 to 2.9, 3.1; RULING2.md 27.2 b, 27.3 D1, D2, D6): the
 * depollution bay and the shredder are ONE purchase (one shop item, one price, one card, two plots, set down and started
 * up as one; nothing of it bought alone); cars come only once the line is owned, and the hook-lift (the driver, and the
 * boss at the wheel) sets each car down on the bay's OWN APRON after a loop round the turning place (no forklift, no car
 * pad, no reversing); the bay drains it before anything comes off it; a tick equals a jump on the car's trip. On the
 * works' frozen test content (fixtures/salvage2works.ts) made into a line here (`lineCfg`: no tuned number is read).
 * The last block reads the SHIPPED stage-2 content for its shape only (the swept path on its map; every thing and grade
 * of the stage has a route to a sale), never a tuned number. Owner: s2e-line (works, truck, positions).
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema, withWorksLayer, type SalvageContent } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { r3Works, worksCfg } from '../fixtures/salvage2works';
import * as R from '../salvage';
import { buy, setPresence } from './actions';
import { plateBuyCheck } from './actionsWorks';
import { worksCardOf } from './cardsWorks';
import { begin, finish, type Ctx } from './clock';
import { mergedContent } from './layer';
import { fillSkip, grownContents } from './partners';
import { carLanding, drivePath, tripPhasePath } from './positions';
import { own } from './rate';
import { jump } from './tick';
import { commission, landBody, lineOf, orderPlate } from './works';
import type { SalvageConfig, SalvageGame, SalvageState } from './types';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------------------------------------------------------------------------------- the test content: a line
const LANDING: [number, number] = [-10.75, 25.6];
const LOOP: [number, number][] = [[-50, 24.9], [-54.5, 24.9], [-54.5, 30.2], [-49.4, 30.2], [-49.4, 26.3]];
let LINE: SalvageConfig | null = null;
/** The works' test content with the shipped stage's line: the shredder's `with`, the bay fed by the truck, its plot and apron in the back field, the landing's stop and the turning loop. */
function lineCfg(): SalvageConfig {
  if (LINE) return LINE;
  const base = worksCfg();
  const c = structuredClone(base.salvage) as Any;
  c.works.plates.shredder = { ...c.works.plates.shredder, with: ['depollution'] };
  c.works.plates.depollution = { ...c.works.plates.depollution, row: 'shredder', feedBy: 'truck', gate: 'rung99' };
  c.worksLayer.shop = c.worksLayer.shop.map((it: Any) => (it.key === 'depollution' ? { ...it, gate: 'rung99' } : it));
  c.worksLayer.partners['partner.garage'].grows = c.worksLayer.partners['partner.garage'].grows.map((g: Any) => (g.body === 'flatrack' ? { ...g, needs: 'shredder' } : g));
  const W = c.map.works;
  W.points.depollution = [-10.75, 17.85];
  W.points['depollution.apron'] = [-10.75, 21.85];
  W.places.depollution = { ...(W.places.depollution ?? { h: 3, solid: true, card: 'works' }), w: 5.5, d: 4.5 };
  W.places['depollution.apron'] = { ...(W.places['depollution.apron'] ?? { h: 0.05, solid: false, card: false }), w: 5.5, d: 3.5 };
  W.footprints.depollution = { x: -10.75, y: 17.85, w: 5.5, d: 4.5 };
  W.footprints['depollution.apron'] = { x: -10.75, y: 21.85, w: 5.5, d: 3.5 };
  W.driveLine.stops['depollution.apron'] = LANDING;
  W.turnLoop = LOOP;
  LINE = { ...base, salvage: c } as SalvageConfig;
  return LINE;
}

/** r3 on the line's content, the works open; `cash` given. */
function r3Line(cash = 100_000): SalvageGame {
  const g = r3Works();
  return { ...g, cash };
}
function act(cfg: SalvageConfig, g: SalvageGame, body: (x: Ctx) => void, live = true): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}
/** A quiet yard with the line running, the hook-lift owned (the bridge open), the garage's skip full with one car; only the garage open. */
function carReady(cfg: SalvageConfig): SalvageGame {
  let g = r3Line();
  g = act(cfg, g, (x) => {
    own(x, 'truckBridge', x.s.t);
    orderPlate(x, 'shredder', x.s.t);
    for (const id of lineOf(x.c, 'shredder')) x.s.works[id] = { ...x.s.works[id], phase: 'running', status: 'idle', commissionAt: null, commissionedBy: 'self' };
    for (const [id, p] of Object.entries(x.s.partners)) if (id !== 'partner.garage') p.open = false;
    x.s.things = x.s.things.filter((t) => t.at.at !== 'floor');
    x.s.pieces = x.s.pieces.filter((p) => p.pile !== 'floor');
    x.s.dropoff.nextAt = -1;
    // a quiet yard: the driver only, nothing sold or taken off the bays, so every gram of the car can be followed
    x.s.crew = x.s.crew.filter((m) => m.role === 'driver');
    for (const b of Object.values(x.s.bays)) b.held = true;
    x.s.merchant = { ...x.s.merchant, phase: 'waiting', endsAt: null, lot: [] };
    x.s.lots = { ...x.s.lots, nextAt: null };
    x.s.reuse = { ...x.s.reuse, nextAt: null };
    const ps = x.s.partners['partner.garage'];
    for (const sk of ps.skips) {
      x.s.counts!['fills:partner.garage'] = 1;
      fillSkip(x, 'partner.garage', sk, x.s.t);
      sk.fullAt = x.s.t - 1;
    }
  });
  return g;
}
const carIn = (s: SalvageState, at: string) => s.things.filter((t) => t.obj === 'elv' && t.at.at === at);
/** Grams in the bays, on the merchant's flatbed, supplied, and in the plates' hoppers and pieces in work (less what a piece already made). */
const totalG = (s: SalvageState): number =>
  Object.values(s.bays).reduce((a, b) => a + b.g, 0) + s.merchant.lot.reduce((a, l) => a + l.g, 0) + s.ladder.supplied_g +
  Object.values(s.works).reduce((a, w) => a + w.hopper.reduce((q, p) => q + p.g, 0) + (w.work ? w.work.piece.g : 0), 0);

describe('s2e-line: the shredder line is one purchase', () => {
  it('one shop item and one price order both plates; the bay alone is never on sale; they are set down and start up together', () => {
    const cfg = lineCfg();
    const g = r3Line();
    expect(plateBuyCheck(cfg, g, 'depollution').state).toBe('locked');
    const ch = plateBuyCheck(cfg, g, 'shredder');
    expect(ch.refusal).toBeNull();
    const h = buy(cfg, g, 'shredder', ch.price!, g.salvage.t);
    expect(g.cash - h.cash).toBeCloseTo(ch.price!, 6);
    const [a, b] = [h.salvage.works.shredder, h.salvage.works.depollution];
    expect(a?.phase).toBe('arriving');
    expect(b?.phase).toBe('arriving');
    expect(b.commissionAt).toBe(a.commissionAt);
    // Bought, the bay's own item is owned with the line: no second purchase of it.
    expect(plateBuyCheck(cfg, h, 'depollution').refusal?.key).toBe('owned');
    // Set down at one instant; the boss starting up either plot starts both.
    const set = jump(cfg, h, a.commissionAt! + 0.01);
    expect(set.salvage.works.shredder.phase).toBe('installed');
    expect(set.salvage.works.depollution.phase).toBe('installed');
    const up = act(cfg, set, (x) => commission(x, 'depollution', 'boss', x.s.t));
    expect(up.salvage.works.shredder.phase).toBe('running');
    expect(up.salvage.works.depollution.phase).toBe('running');
    // ... or both by themselves at one date.
    const self = jump(cfg, { ...set, salvage: { ...set.salvage, presenceAt: -1 } }, set.salvage.works.shredder.commissionAt! + 0.01);
    expect(self.salvage.works.shredder.phase).toBe('running');
    expect(self.salvage.works.depollution.phase).toBe('running');
  });

  it('the bay\'s plot opens the line\'s card until the line is ordered', () => {
    const cfg = lineCfg();
    const g = r3Line();
    expect(worksCardOf(cfg, g, 'depollution')?.plate).toBe('shredder');
    const h = buy(cfg, g, 'shredder', plateBuyCheck(cfg, g, 'shredder').price!, g.salvage.t);
    expect(worksCardOf(cfg, h, 'depollution')?.plate).toBe('depollution');
  });
});

describe('s2e-line: cars come only once the line is owned, and land on the bay\'s own apron', () => {
  it('no car in the garage\'s rotation before the line; with it a car takes its turn, one at a time', () => {
    const cfg = lineCfg();
    const x = begin(cfg, r3Line(), [], true);
    for (let k = 0; k < 12; k++) expect(grownContents(x, 'partner.garage').elv).toBeUndefined();
    orderPlate(x, 'shredder', x.s.t);
    const loads = [...Array(6).keys()].map(() => grownContents(x, 'partner.garage'));
    expect(loads.filter((c) => c.elv === 1 && Object.keys(c).length === 1).length).toBe(3);
    // The flatrack sets the car on the bay's apron: never the car pad, never the floor.
    expect(carLanding(x.c)?.plate).toBe('depollution');
    expect(landBody(x, { partner: 'partner.garage', slot: 0, contents: { elv: 1 }, mass_g: 1, price: 1, trial: false, weighed: true }, x.s.t)).toBe(true);
    expect(x.s.things.filter((t) => t.obj === 'elv').map((t) => t.at)).toEqual([{ at: 'apron', plate: 'depollution' }]);
    // A car waits: no flatrack load until it has gone.
    for (let k = 0; k < 6; k++) expect(grownContents(x, 'partner.garage').elv).toBeUndefined();
  });

  it('the driver fetches the car, drives round the turning loop and sets it on the apron; the bay drains it before anything comes off it; mass kept', () => {
    const cfg = lineCfg();
    let g = carReady(cfg);
    const sk = g.salvage.partners['partner.garage'].skips[0];
    expect(sk.contents).toEqual({ elv: 1 });
    const g0 = totalG(g.salvage);
    const w0 = g.salvage.waste_g;
    let landedAt: number | null = null;
    for (let t = g.salvage.t + 5; t < g.salvage.t + 3600 && landedAt === null; t += 5) {
      const h = jump(cfg, { ...g, salvage: { ...g.salvage, presenceAt: -1 } }, t);
      expect(carIn(h.salvage, 'elvPad')).toEqual([]);
      expect(carIn(h.salvage, 'floor')).toEqual([]);
      if (carIn(h.salvage, 'apron').length) landedAt = t;
      g = h;
    }
    expect(landedAt).not.toBeNull();
    // On the apron, being drained: nothing of the car is in a bay yet.
    const w = g.salvage.works.depollution;
    expect(w.car).toBeTruthy();
    expect(totalG(g.salvage)).toBe(g0);
    const done = jump(cfg, { ...g, salvage: { ...g.salvage, presenceAt: -1 } }, w.car!.end + 0.01);
    expect(carIn(done.salvage, 'apron')).toEqual([]);
    expect(done.salvage.counts!.depolluted).toBe(1);
    // Everything the shredder took of the shell came from its bay: the car's mass is in the bays, the round, the supplied
    // tonnes and the waste carrier's (the shredder's residue, while no eddy current runs, is waste).
    expect(totalG(done.salvage) - g0 + (done.salvage.waste_g - w0)).toBe(cfg.salvage.worksLayer!.objects!.elv!.gross_g);
  });

  it('a tick equals a jump on the car\'s trip (stale boss; 0.25 s ticks against one jump)', () => {
    const cfg = lineCfg();
    const g = { ...carReady(cfg), salvage: { ...carReady(cfg).salvage, presenceAt: -1 } } as SalvageGame;
    const span = 420;
    let a = g;
    let ms = g.lastSavedAt ?? 0;
    for (let i = 0; i < span * 4; i++) {
      ms += 250;
      a = R.advanceSalvage(cfg, a, 0.25, ms);
    }
    const j = jump(cfg, g, g.salvage.t + span);
    expect(a.salvage.t).toBeCloseTo(j.salvage.t, 6);
    expect(a.cash).toBeCloseTo(j.cash, 2);
    expect(JSON.stringify(a.salvage.things)).toBe(JSON.stringify(j.salvage.things));
    expect(JSON.stringify(a.salvage.truck)).toBe(JSON.stringify(j.salvage.truck));
    expect(JSON.stringify(a.salvage.works)).toBe(JSON.stringify(j.salvage.works));
    for (const k of Object.keys(j.salvage.bays)) expect(a.salvage.bays[k]?.g, k).toBe(j.salvage.bays[k].g);
    expect(a.salvage.waste_g).toBe(j.salvage.waste_g);
    // ... and the car went through: on the apron or drained within the span.
    expect(carIn(j.salvage, 'apron').length + (j.salvage.counts!.depolluted ?? 0)).toBeGreaterThan(0);
  });

  it('the boss at the wheel sets the car down at the apron (weighed first); at the floor nothing is tipped', () => {
    const cfg = lineCfg();
    const c = mergedContent(cfg.salvage);
    const L = carLanding(c)!;
    const at = (g: SalvageGame, p: { x: number; y: number }) =>
      act(cfg, g, (x) => {
        x.s.truck = { ...x.s.truck, owned: true, by: 'boss', trip: null, x: p.x, y: p.y, skip: { partner: 'partner.garage', slot: 0, contents: { elv: 1 }, mass_g: c.objects.elv.gross_g, price: 1, trial: false, weighed: true } };
        x.s.presence = { ...x.s.presence, x: p.x, y: p.y, driving: true, moving: false, standingFor: 5 };
        x.s.act = { kind: 'drive', target: null, since: x.s.t, endsAt: null };
      });
    // A fresh sample where he stands, then half a second of live play, as the screen sends them.
    const stand = (g: SalvageGame, p: { x: number; y: number }, dt: number) => jump(cfg, setPresence(cfg, g, { x: p.x, y: p.y, moving: false, standingFor: 5 + dt, driving: true, heading: 0 } as never, g.salvage.t), g.salvage.t + 0.5);
    let g = at(carReady(cfg), L.stop);
    g = stand(g, L.stop, 0.5);
    expect(g.salvage.act).toMatchObject({ kind: 'tip', target: 'depollution.apron' });
    for (let k = 1; k <= 40 && g.salvage.truck.skip; k++) g = stand(g, L.stop, 0.5 + k * 0.5);
    expect(g.salvage.truck.skip).toBeNull();
    expect(carIn(g.salvage, 'apron')).toHaveLength(1);
    // At the tipping floor the car stays on the flatrack.
    const fl = { x: 48, y: 27.2 };
    let f = at(carReady(cfg), fl);
    for (let k = 1; k <= 30; k++) f = stand(f, fl, k * 0.5);
    expect(f.salvage.truck.skip?.contents).toEqual({ elv: 1 });
    expect(carIn(f.salvage, 'floor')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------- the shipped stage 2
const RAW = (gameJson as Any).salvage;
const shipped = (): SalvageContent => SalvageSchema.parse({ ...structuredClone(RAW), release: { stage: 2 } });

describe('s2e-line: the shipped stage 2 (its shape, no tuned number)', () => {
  it('the hook-lift\'s path with a car (positions.ts, as the rules drive it) lies on the drive line at its half-width, touches no solid or place but its apron, never turns back, stays inside the fence', () => {
    const c = mergedContent(shipped());
    const L = carLanding(c)!;
    expect(L).not.toBeNull();
    const W = c.map.works!;
    const rects = [...(c.map.driveLine?.rects ?? []), ...W.driveLine.rects];
    const on = (x: number, y: number) => rects.some((r) => x >= r.x0 - 1e-6 && x <= r.x0 + r.w + 1e-6 && y >= r.y0 - 1e-6 && y <= r.y0 + r.d + 1e-6);
    const wb = { x: c.map.driveLine!.stops!.weighbridge[0], y: c.map.driveLine!.stops!.weighbridge[1] };
    const park = { x: c.map.driveLine!.stops!.park[0], y: c.map.driveLine!.stops!.park[1] };
    const tip = tripPhasePath(c, 'tip', 'partner.garage', 0, wb, L);
    const away = drivePath(c, L.stop, park);
    expect(tip.at(-1)).toEqual(L.stop);
    const r = c.truck.radius;
    const boxes: [string, { x: number; y: number; w: number; d: number }][] = [];
    for (const [k, f] of Object.entries({ ...c.map.footprints, ...W.footprints })) if (!['gate', 'weighbridge', 'merchant', 'park', `${L.plate}.apron`].includes(k)) boxes.push([k, f as Any]);
    const moves: [number, number][] = [];
    for (const path of [tip, away])
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1];
        const b = path[i];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d > 1e-6) moves.push([(b.x - a.x) / d, (b.y - a.y) / d]);
        const n = Math.max(1, Math.ceil(d / 0.25));
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n;
          const y = a.y + ((b.y - a.y) * k) / n;
          expect(x, 'inside the fence (truck.yardV)').toBeLessThanOrEqual(c.yard.width);
          for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) expect(on(cx, cy), `(${x.toFixed(2)}, ${y.toFixed(2)}) on the drive line`).toBe(true);
          for (const [k2, f] of boxes) {
            const hit = Math.abs(x - f.x) < f.w / 2 + r - 1e-6 && Math.abs(y - f.y) < f.d / 2 + r - 1e-6;
            expect(hit, `touches ${k2} at (${x.toFixed(2)}, ${y.toFixed(2)})`).toBe(false);
          }
        }
      }
    for (let i = 1; i < moves.length; i++) expect(moves[i][0] * moves[i - 1][0] + moves[i][1] * moves[i - 1][1], 'no reversing').toBeGreaterThan(-1e-6);
    expect(c.truck.yardV).toBeGreaterThan(0);
  });

  it('D2: every thing a sold partner, an oversize piece or the drop-off brings at stage 2 and every grade a sold machine makes can be sold, or a SOLD machine takes it', () => {
    const s0 = shipped();
    const m = withWorksLayer(s0);
    const top = m.ladder.topRung ?? 5;
    const rung = (gate: string | null | undefined) => Number(/^rung(\d+)$/.exec(gate ?? '')?.[1] ?? 1);
    const plates = m.works!.plates;
    const soldPlate = (id: string) => {
      if (rung(plates[id]?.gate) <= top) return true;
      return Object.entries(plates).some(([q, d]) => d.with?.includes(id) && rung(d.gate) <= top);
    };
    const soldItem = (k: string) => m.shop.some((i) => i.key === k && rung(i.gate) <= top) || [...m.dayOneList].some((i) => i.key === k) || k in m.machines;
    // The things that can arrive.
    const things = new Set<string>();
    for (const p of Object.values(m.partners)) {
      if (!soldItem(p.opens) && !(p.opens in m.machines) && rung((m.shop.find((i) => i.key === p.opens) ?? m.dayOneList.find((i) => i.key === p.opens))?.gate) > top) continue;
      for (const ld of [p.trial, p.skip, ...(p.grows ?? []).filter((x) => soldPlate(x.needs) || soldItem(x.needs)).map((x) => x.contents)]) for (const o of Object.keys(ld ?? {})) things.add(o);
      if (p.reuseBatch) things.add(p.reuseBatch.obj);
      // s2f-plasma-cars (RULING2.md 28.7 b): the car the partner's own recovery truck sets on the line's apron
      if (p.recovery && (soldPlate(p.recovery.needs) || soldItem(p.recovery.needs))) things.add(p.recovery.obj);
    }
    for (const k of m.lots!.kinds) if (k.line.every((l) => soldPlate(l) || soldItem(l))) things.add(k.obj);
    for (const z of Object.values(m.zones)) for (const o of Object.keys(z.things)) things.add(o);
    for (const o of [...m.dropoff.mix.map(([k]) => k), ...m.dropoff.initial, ...m.dropoff.opening]) things.add(o);
    // A thing is cut (or drained by a sold station) into grades; each grade must be sellable (a grade with a bay), or a sold machine must take it.
    const grades = new Set<string>();
    const why: string[] = [];
    for (const o of things) {
      const d = m.objects[o];
      if (!d) {
        why.push(`${o}: not an object`);
        continue;
      }
      const station = Object.entries(plates).find(([, p]) => p.kind === 'station' && p.in.includes(o));
      if (d.arrives === 'pad' && !(station && soldPlate(station[0]))) why.push(`${o} waits for a station that is not sold`);
      if (d.arrives === 'batteryBox') grades.add(d.whole ?? d.pieces[0][0]);
      for (const p of d.pieces) grades.add(p[0]);
      if (d.shell) grades.add(d.shell.grade);
      if (d.whole) grades.add(d.whole);
    }
    // Every grade a sold plate or hall makes (and so on, to a fixed point).
    for (let pass = 0; pass < 4; pass++)
      for (const [id, p] of Object.entries(plates)) {
        if (!soldPlate(id)) continue;
        for (const sh of Object.values(p.out ?? {})) for (const [g] of sh) if (g !== 'stream' && m.grades[g]) grades.add(g);
        for (const r of Object.values(p.recipes ?? {})) for (const [g] of r.out) if (m.grades[g]) grades.add(g);
        for (const [s, q] of Object.entries(p.feeds ?? {})) if (s === 'stream' && !soldPlate(q)) expect((p.waste[p.in[0]] ?? []).length + 1).toBeGreaterThan(0); // the stream leaves as residue while its plate is not sold (as built)
      }
    for (const g of grades) {
      const gr = m.grades[g];
      if (!gr) {
        why.push(`${g}: not a grade`);
        continue;
      }
      // a grade with a bay and a price (a precious-metal unit is priced by its assay: family pm) is sold by the round
      const sellable = (gr.pbar > 0 || gr.family === 'pm') && !!m.bays[g] && (gr as Any).bay !== undefined;
      const taken = Object.entries(plates).some(([id, p]) => soldPlate(id) && (p.in.includes(g) || Object.values(p.recipes ?? {}).some((r) => r.in.includes(g))));
      if (!sellable && !taken) why.push(`${g} can be neither sold nor taken by a sold machine`);
    }
    expect(why).toEqual([]);
    // The drained car's battery is sold whole and closed as it is: its grade has a bay (the battery box) and a price.
    expect(things.has('elv')).toBe(true);
    expect(grades.has('pbb')).toBe(true);
    expect(m.grades.pbb.pbar).toBeGreaterThan(0);
  });
});
