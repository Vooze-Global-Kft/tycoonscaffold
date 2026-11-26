/**
 * THE BRIDGE PARTNERS AND THE STAGE'S VEHICLES (yard-stage2.md 2.9; 8.1 row 2.9; T1, ruling 13.4, B4): the bridge
 * partners open only with the three-axle hook-lift; no car before the depollution bay; a car comes on the flatrack to
 * the car pad, never tipped, never lifted by the magnet, and reaches the apron only by the forklift; batteries come in
 * the closed box, weighed in whole, never on the floor, a tip or the picking table; the plasma cutter is tier 4. On the
 * works' frozen test content (fixtures/salvage2works.ts). Owner: rules-works (wave 2).
 */
import { describe, expect, it } from 'vitest';
import { r3Works, worksCfg } from '../fixtures/salvage2works';
import { setPresence } from './actions';
import { own } from './rate';
import { stepOutForklift } from './actionsWorks';
import { begin, finish, type Ctx } from './clock';
import { toolP } from './content';
import { fillSkip, grownContents } from './partners';
import { pointOf } from './positions';
import { advance, jump } from './tick';
import { landBody, orderPlate, worksOwn } from './works';
import type { SalvageEvent, SalvageGame, SalvageState, SkipState } from './types';

const cfg = worksCfg();
function act(g: SalvageGame, body: (x: Ctx) => void, live = true): SalvageGame {
  const x = begin(cfg, g, [], live);
  body(x);
  return finish(g, x);
}
/** Grams in the bays, on the merchant's flatbed and supplied (a new bay is the round's at once). */
const totalG = (s: SalvageState): number => Object.values(s.bays).reduce((a, b) => a + b.g, 0) + s.merchant.lot.reduce((a, l) => a + l.g, 0) + s.ladder.supplied_g;

describe('2.9 the bridge partners', () => {
  it('their states come with the works\' opening, closed; they open only with the three-axle hook-lift', () => {
    const g = r3Works();
    expect(g.salvage.partners['partner.garage']).toMatchObject({ open: false });
    expect(g.salvage.partners['partner.plumbing']).toMatchObject({ open: false });
    // Owned (rate.ts own, as its arrival owns it; actions.buy waits on ladder.ts buyCheck reading the merged content: requests.md 11:35).
    const h = act(g, (x) => own(x, 'truckBridge', x.s.t));
    expect(h.salvage.owned).toContain('truckBridge');
    expect(h.salvage.partners['partner.garage'].open).toBe(true);
    expect(h.salvage.partners['partner.plumbing'].open).toBe(true);
  });

  it('no car before the depollution bay; with it a car is a load of its own in the rotation, and only while no other car waits; the label prices it k × as found', () => {
    const g = r3Works();
    const x = begin(cfg, g, [], true);
    for (let k = 0; k < 12; k++) expect(grownContents(x, 'partner.garage').elv).toBeUndefined();
    orderPlate(x, 'depollution', x.s.t);
    const loads = [...Array(6).keys()].map(() => grownContents(x, 'partner.garage'));
    expect(loads.filter((c) => c.elv === 1 && Object.keys(c).length === 1).length).toBe(3);
    // A car waiting on the pad: no flatrack load until it has gone.
    x.s.things.push({ uid: 'carX', obj: 'elv', at: { at: 'elvPad', k: 0 }, cut: 0, progress: 0, by: null });
    for (let k = 0; k < 6; k++) expect(grownContents(x, 'partner.garage').elv).toBeUndefined();
    x.s.things.pop();
    // The label: the car's price is k × its whole-thing as-found share of its prepared value at the day's prices.
    const sk: SkipState = { slot: 0, phase: 'filling', setAt: 0, fullAt: 0, contents: {}, mass_g: 0, price: 0, priceDay: 0, trial: false, n: 0 };
    x.s.counts!['fills:partner.garage'] = 1;
    fillSkip(x, 'partner.garage', sk, x.s.t);
    expect(sk.contents).toEqual({ elv: 1 });
    expect(sk.price).toBeGreaterThan(0);
    expect(sk.mass_g).toBe(x.c.objects.elv.gross_g);
  });

  it('the flatrack sets its car on the car pad (never the floor); the closed battery box is one weigh-in, the batteries whole in their bay', () => {
    const g = r3Works();
    const x = begin(cfg, g, [], true);
    const floor0 = x.s.things.filter((t) => t.at.at === 'floor').length;
    expect(landBody(x, { partner: 'partner.garage', slot: 0, contents: { elv: 1 }, mass_g: 1, price: 1, trial: false, weighed: true }, x.s.t)).toBe(true);
    expect(x.s.things.filter((t) => t.obj === 'elv').map((t) => t.at)).toEqual([{ at: 'elvPad', k: 0 }]);
    expect(x.s.things.filter((t) => t.at.at === 'floor').length).toBe(floor0);
    const pbb0 = x.s.bays.pbb?.g ?? 0;
    expect(landBody(x, { partner: 'partner.garage', slot: 0, contents: { pbb: 40 }, mass_g: 1, price: 1, trial: false, weighed: true }, x.s.t)).toBe(true);
    expect((x.s.bays.pbb?.g ?? 0) - pbb0).toBe(40 * x.c.objects.pbb.gross_g);
    expect(x.s.things.some((t) => t.obj === 'pbb')).toBe(false);
    expect(x.s.pieces.some((p) => p.grade === 'pbb')).toBe(false);
    expect(x.s.tickets.at(-1)).toMatchObject({ kind: 'weighIn' });
    // An ordinary skip is the floor's (tipNow tips it).
    expect(landBody(x, { partner: 'partner.garage', slot: 0, contents: { wheels: 2 }, mass_g: 1, price: 1, trial: false, weighed: true }, x.s.t)).toBe(false);
    // The magnet never lifts a car or a battery (content: crane.neverObjects).
    expect(x.c.crane!.neverObjects).toEqual(expect.arrayContaining(['elv', 'pbb']));
  });

  it.todo('the stage\'s vehicles and tools are bought through actions.buy at the card\'s price (waits on ladder.ts buyCheck reading contentAt: requests.md 11:35)');
});

describe('2.9 the forklift and the depollution bay', () => {
  it('the boss walks into the forklift, lifts the car on the pad, sets it on the running bay\'s apron; drained, the car\'s mass lands in its bays and the waste carrier\'s; Step out', () => {
    const base = r3Works();
    let g = act(base, (x) => {
      x.s.crew = [];
      x.s.dropoff.nextAt = -1;
      x.s.truck.trip = null;
      for (const p of Object.values(x.s.partners)) p.open = false;
      for (const b of Object.values(x.s.bays)) b.held = true;
      x.s.merchant = { ...x.s.merchant, phase: 'waiting', endsAt: null, lot: [] };
      x.s.load = [];
      x.s.presenceAt = -1;
      x.s.reuse = { ...x.s.reuse, nextAt: null };
      x.s.lots = { ...x.s.lots, nextAt: null };
      orderPlate(x, 'depollution', x.s.t);
      x.s.works.depollution = { ...x.s.works.depollution, phase: 'running', status: 'idle', commissionAt: null, commissionedBy: 'self' };
      if (!x.s.owned.includes('forklift')) x.s.owned.push('forklift');
      worksOwn(x, 'forklift', x.s.t);
      x.s.things.push({ uid: 'car1', obj: 'elv', at: { at: 'elvPad', k: 0 }, cut: 0, progress: 0, by: null });
    });
    expect(g.salvage.forklift).toMatchObject({ by: null, load: [] });
    const c = begin(cfg, g, [], true).c;
    const sample = (h: SalvageGame, p: { x: number; y: number }, moving = false) => setPresence(cfg, h, { x: p.x, y: p.y, moving, standingFor: moving ? 0 : 1, driving: false, heading: 0 } as never, h.salvage.t);
    const f = g.salvage.forklift!;
    const ev: SalvageEvent[] = [];
    g = setPresence(cfg, g, { x: f.x, y: f.y, moving: false, standingFor: 1, driving: false, heading: 0 } as never, g.salvage.t, ev);
    expect(g.salvage.forklift!.by).toBe('boss');
    expect(ev).toContainEqual({ type: 'forklift', on: true });
    const pad = pointOf(c, 'elvPad');
    g = sample(g, pad);
    expect(g.salvage.forklift!.load.map((p) => p.uid)).toEqual(['car1']);
    expect(g.salvage.things.some((t) => t.uid === 'car1')).toBe(false);
    const apron = pointOf(c, 'depollution.apron');
    g = sample(sample(g, apron, true), apron);
    expect(g.salvage.things.find((t) => t.uid === 'car1')?.at).toEqual({ at: 'apron', plate: 'depollution' });
    // The bay drains it (depollution.s at level 1): every gram accounted for.
    const bays0 = totalG(g.salvage);
    const waste0 = g.salvage.waste_g;
    const x = begin(cfg, g, [], true);
    advance(x, g.salvage.t + 0.01);
    g = finish(g, x);
    expect(g.salvage.works.depollution.car).toMatchObject({ thing: 'car1' });
    const done = jump(cfg, { ...g, salvage: { ...g.salvage, presenceAt: -1 } }, g.salvage.works.depollution.car!.end + 0.01);
    expect(done.salvage.things.some((t) => t.uid === 'car1')).toBe(false);
    expect(totalG(done.salvage) - bays0 + (done.salvage.waste_g - waste0)).toBe(c.objects.elv.gross_g);
    expect(done.salvage.counts!.depolluted).toBe(1);
    // Step out: refused while moving; then parked with nobody in it.
    const s1 = stepOutForklift(cfg, sample(g, apron, true), g.salvage.t, ev);
    expect(s1.salvage.forklift!.by).toBe('boss');
    const s2 = stepOutForklift(cfg, sample(g, apron), g.salvage.t, ev);
    expect(s2.salvage.forklift!.by).toBeNull();
    expect(ev).toContainEqual({ type: 'forklift', on: false });
  });

  it('the plasma cutter is tier 4 (P 60): bought, the yard\'s tool tier is 4; the torch\'s tier keeps P 30', () => {
    const g = r3Works();
    const x = begin(cfg, g, [], true);
    expect(x.c.tools.plasma).toMatchObject({ tier: 4, P: 60 });
    expect(toolP(x.c, 3)).toBe(x.c.tools.torch.P);
    const h = act(g, (y) => own(y, 'plasma', y.s.t));
    expect(h.salvage.tier).toBe(4);
    expect(toolP(begin(cfg, h, [], true).c, h.salvage.tier)).toBe(60);
  });
});
