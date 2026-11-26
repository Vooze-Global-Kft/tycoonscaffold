/**
 * The one pass of fixes after the review of the owner's points (label owner1-fix-rules, 26 November; the player's
 * findings with the lead's rulings, owner1/player1.json): finding 3 (the whole site is the stop), finding 5 (the
 * helper carries unless the boss is about to), finding 10 (a free load says free). On the shipped content; every
 * number read from it. Owner: owner1-fix-rules.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { startGame } from './bot';
import { begin, finish, type Ctx } from './clock';
import { skipLabelOf } from './cards';
import { idleWhyOf, newCrew, waitPlaceOf } from './crew';
import { loadStep } from './goals';
import { piecePos, pointOf, siteRect, skipZone, stopOf, thingPos } from './positions';
import { truckBossActEnd, truckBossStep } from './truck';
import type { CrewMember, GroundPiece, SalvageConfig, SalvageGame, ThingState } from './types';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;

function truckYard(cash = 5000): SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  for (const p of Object.values(x.s.partners)) p.open = true;
  x.cash = cash;
  return finish(g, x);
}

/** The boss's truck standing still at (px, py) for a second: one presence step of the rules. */
function standAt(g: SalvageGame, px: number, py: number): Ctx {
  const x = begin(cfg, g, [], true);
  x.s.truck.by = 'boss';
  x.s.truck.x = px;
  x.s.truck.y = py;
  x.s.presence = { x: px, y: py, driving: true, moving: false, standingFor: 1, heading: 0 };
  x.s.presenceAt = x.s.t;
  truckBossStep(x, x.s.t);
  return x;
}

describe('finding 3: the whole site is the stop', () => {
  it('the content derives the site from its own points: sign before the skip, the stop from siteStop_m before the sign to past the last skip', () => {
    const r = siteRect(C, 'partnerFarm', 1)!;
    const z = skipZone(C, 'partnerFarm', 0);
    const gate = pointOf(C, 'gate');
    expect(r).not.toBeNull();
    expect(r.x0).toBeCloseTo(z.x + C.map.sites.partnerFarm.sign! - C.map.siteStop_m!, 9);
    expect(r.x1).toBeCloseTo(z.x + z.w / 2 + C.map.siteStop_m!, 9);
    expect(r.y1).toBeCloseTo(gate.y + C.map.laneWidth! / 2, 9);
    // The two partners' sites never overlap, and both lie beyond the fence.
    const d = siteRect(C, 'partnerDemolition', 3)!;
    expect(r.x1).toBeLessThan(d.x0);
    expect(r.x0).toBeGreaterThan(C.yard.width);
  });

  it("the reviewer's stop beside the farm's sign (lane x 236.0, y 23.9) hooks the trial skip with the boss's 4 s ring", () => {
    const x = standAt(truckYard(), 236.0, 23.9);
    expect(x.s.act.kind).toBe('hook');
    expect(x.s.act.target).toBe('partnerFarm');
    expect(x.s.act.endsAt! - x.s.act.since).toBeCloseTo(C.truck.bossHandle_s!, 9);
    expect(x.ev.some((e) => e.type === 'hookRing')).toBe(true);
    // The ring ends: the skip is on the truck.
    truckBossActEnd(x, 'hook', x.s.act.endsAt!);
    expect(x.s.truck.skip?.partner).toBe('partnerFarm');
    expect(x.s.truck.skip?.trial).toBe(true);
  });

  it('anywhere on the site hooks: its four corners and the far lane edge', () => {
    const r = siteRect(C, 'partnerFarm', 1)!;
    for (const [px, py] of [[r.x0 + 0.01, r.y0 + 0.01], [r.x1 - 0.01, r.y0 + 0.01], [r.x0 + 0.01, r.y1 - 0.01], [r.x1 - 0.01, r.y1 - 0.01]]) {
      const x = standAt(truckYard(), px, py);
      expect(x.s.act.kind, `${px}, ${py}`).toBe('hook');
    }
  });

  it('a stop 10 m short of the site does not hook and shows "Pull up to the skip" with the chevron on the skip', () => {
    const r = siteRect(C, 'partnerFarm', 1)!;
    const gate = pointOf(C, 'gate');
    const px = r.x0 - 10;
    const x = standAt(truckYard(), px, gate.y);
    expect(x.s.act.kind).not.toBe('hook');
    expect(x.s.truck.skip).toBeNull();
    const g = finish(truckYard(), x);
    const step = loadStep(cfg, g, 'fetched:partnerFarm:1');
    expect(step?.text.key).toBe('goal.step.pullUp');
    expect(step?.target?.id).toBe('skip.partnerFarm');
    // Moving there: still "Drive out to the load"; beyond siteNear_m: "Drive out to the load".
    const moving = { ...g, salvage: { ...g.salvage, presence: { ...g.salvage.presence, moving: true } } };
    expect(loadStep(cfg, moving, 'fetched:partnerFarm:1')?.text.key).toBe('goal.step.drive');
    const far = standAt(truckYard(), r.x0 - C.map.siteNear_m! - 1, gate.y);
    expect(loadStep(cfg, finish(truckYard(), far), 'fetched:partnerFarm:1')?.text.key).toBe('goal.step.drive');
  });
});

describe('finding 10: a free load says free', () => {
  it("the farm's trial skip label carries free; its weighbridge ticket too", () => {
    const g = truckYard();
    const lab = skipLabelOf(C, g, 'partnerFarm', 0)!;
    expect(lab.state).toBe('trial');
    expect(lab.price).toBe(0);
    expect(lab.free).toBe(true);
    // A bought (non-trial) skip is not free.
    const x0 = begin(cfg, g, [], true);
    x0.s.partners.partnerFarm.skips = [{ ...x0.s.partners.partnerFarm.skips[0], trial: false, price: 500 }];
    expect(skipLabelOf(C, finish(g, x0), 'partnerFarm', 0)!.free).toBeUndefined();
    // Hook, weigh: the ticket says free.
    const z = skipZone(C, 'partnerFarm', 0);
    const x = standAt(g, z.x, z.y);
    truckBossActEnd(x, 'hook', x.s.act.endsAt!);
    const wb = stopOf(C, 'weighbridge');
    x.s.presence = { x: wb.x, y: wb.y, driving: true, moving: false, standingFor: 1, heading: 0 };
    x.s.presenceAt = x.s.t;
    truckBossStep(x, x.s.t);
    expect(x.s.act.kind).toBe('weigh');
    truckBossActEnd(x, 'weigh', x.s.act.endsAt!);
    const tk = x.s.tickets.find((t) => t.kind === 'skipWeighIn') as Extract<SalvageGame['salvage']['tickets'][number], { kind: 'skipWeighIn' }>;
    expect(tk.trial).toBe(true);
    expect(tk.paid).toBe(0);
    expect(tk.free).toBe(true);
  });
});

/** A fresh yard with nothing lying about, the boss fresh at (px, py), live, his load empty. */
function quiet(px: number, py: number, stood = 0): Ctx {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.things = x.s.things.filter((th) => th.at.at === 'zone');
  x.s.pieces = [];
  x.s.load = [];
  x.s.dropoff.nextAt = 1e9;
  x.s.act = { kind: 'none', target: null, since: x.s.t - 100, endsAt: null };
  x.s.foreman = { ...x.s.foreman, lastWorkAt: x.s.t - 100 };
  x.s.presence = { x: px, y: py, driving: false, moving: false, standingFor: stood, heading: 0 };
  x.s.presenceAt = x.s.t;
  return x;
}
const hand = (x: Ctx): CrewMember => newCrew(x, 'hand', x.s.t);
const piece = (uid: string, pile: string, grade = 'li', g = 8000, k = 0): GroundPiece => ({ uid, grade, g, from: null, spec: 0, pile, k, claim: null }) as GroundPiece;

describe('finding 5: the helper carries unless the boss is about to', () => {
  const leaveS = (C.crew.hand as { leaveS?: number }).leaveS!;
  const leaveM = (C.crew.hand as { leaveM?: number }).leaveM!;
  const g0 = startGame(cfg, NOW);
  const washer = g0.salvage.things.find((th) => th.at.at === 'dropoff')!;
  const at = thingPos(C, washer.at);

  it('the content says how long: crew.hand.leaveS', () => {
    expect(leaveS).toBeGreaterThan(0);
    expect(leaveM).toBeGreaterThan(0);
  });

  it('a whole thing at the drop-off beside a boss who is active and has room stays his ("yours")', () => {
    const x = quiet(at.x - 1, at.y + 1, 0);
    x.s.things.push({ ...washer } as ThingState);
    const m = hand(x);
    expect(m.claims).not.toContain(washer.uid);
    expect(idleWhyOf(x.c, x.s, m)?.why).toBe('yours');
  });

  it('the boss standing still longer than leaveS beside it: the yard hand takes it', () => {
    const x = quiet(at.x - 1, at.y + 1, leaveS + 1);
    x.s.things.push({ ...washer } as ThingState);
    const m = hand(x);
    expect(m.claims).toEqual([washer.uid]);
    expect(m.job).toBe('wholeThing');
  });

  it('...unless he works (an act running or a cut within leaveS)', () => {
    const x = quiet(at.x - 1, at.y + 1, leaveS + 1);
    x.s.foreman = { ...x.s.foreman, lastWorkAt: x.s.t - leaveS / 2 };
    x.s.things.push({ ...washer } as ThingState);
    expect(hand(x).claims).not.toContain(washer.uid);
  });

  it('the boss beside it with a full load (the m5 picture): the yard hand takes it', () => {
    const x = quiet(at.x - 1, at.y + 1, 0);
    const cap = C.carriers[x.s.carrier] * 1000;
    x.s.load = [{ ...piece('l.full', 'load', 'li', cap) }] as never;
    x.s.things.push({ ...washer } as ThingState);
    const m = hand(x);
    expect(m.claims).toEqual([washer.uid]);
  });

  it('a cut piece in a heap within leaveM of a boss who has stood still for longer than leaveS: the yard hand takes it', () => {
    const z0 = piecePos(C, 'zone.Z2', 0);
    let x = quiet(z0.x, z0.y + 1, 0);
    x.s.pieces.push(piece('p.near', 'zone.Z2'));
    expect(hand(x).claims).not.toContain('p.near');
    x = quiet(z0.x, z0.y + 1, leaveS + 1);
    x.s.pieces.push(piece('p.near', 'zone.Z2'));
    const m = hand(x);
    expect(m.claims).toEqual(['p.near']);
    expect(idleWhyOf(x.c, x.s, m)).toBeNull();
  });

  it('the waiting places stand at the scale house\'s south wall, off the scale plate, the drive line and the weighbridge', () => {
    const fp = C.map.footprints;
    const sh = fp.scalehouse;
    const sc = fp.scale;
    const wb = fp.weighbridge;
    const rects = C.map.driveLine!.rects ?? [];
    for (let n = 1; C.map.points[`wait${n}`]; n++) {
      const w = pointOf(C, `wait${n}`);
      expect(Math.abs(w.y - (sh.y + sh.d / 2))).toBeLessThan(0.8);
      expect(w.x).toBeGreaterThanOrEqual(sh.x - sh.w / 2);
      expect(w.x).toBeLessThanOrEqual(sh.x + sh.w / 2);
      const inR = (r: { x0: number; y0: number; w: number; d: number }, m = 0.4) => w.x + m > r.x0 && w.x - m < r.x0 + r.w && w.y + m > r.y0 && w.y - m < r.y0 + r.d;
      expect(inR({ x0: sc.x - sc.w / 2, y0: sc.y - sc.d / 2, w: sc.w, d: sc.d })).toBe(false);
      expect(inR({ x0: wb.x - wb.w / 2, y0: wb.y - wb.d / 2, w: wb.w, d: wb.d })).toBe(false);
      for (const r of rects) expect(inR(r)).toBe(false);
    }
    expect(waitPlaceOf(C, { role: 'hand', slot: 0 })).toEqual(pointOf(C, 'wait1'));
  });
});
