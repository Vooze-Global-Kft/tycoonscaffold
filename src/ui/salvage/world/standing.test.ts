/**
 * owner2-fix P2 (the lead's ruling: NOBODY IS DRAWN STANDING ON A VEHICLE). The player saw hands and the boss
 * drawn over a parked truck's bed and cab (gi-rack, gi-weighbridge, g667). Their feet were not inside the
 * truck's footprint: they stood just NORTH of it, where the truck's picture (it rises up the screen as far as
 * its cab is tall) covers the ground, and the picture there is the low bed: drawn first and not covered by the
 * bed, they read as standing on it.
 *
 * So a standing vehicle's outline as drawn is the ground its picture covers (./actors.ts vehicleBoxes), and:
 * (a) the boss slides along every standing vehicle's turned rectangle (./collide.ts moveBody), gets in from its
 *     sides, is let out of one he stands in, and a vehicle drawn over him turns see-through (./motion.ts
 *     vehicleCovers, as roofs do);
 * (b) a crew member whose rules place lies inside a standing vehicle's outline is drawn stepped out to its
 *     nearest edge (./motion.ts asideTarget), and where no edge is near enough, drawn behind it
 *     (./motion.ts behindStanding).
 * The played minute 30 is run with the boss's truck parked on the drive line, on the weighbridge and at the
 * gate, every vehicle placed as ./frameLoop.ts places it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const F = await import('../../../engine/fixtures/salvage');
const R = await import('../../../engine/salvage');
const A = await import('./actors');
const M = await import('./motion');
const Co = await import('./collide');
const { rulesTable } = await import('./useRulesTable');
const { yardLayout } = await import('./yard');

const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
const gcfg = { mode: 'salvage', salvage: GAME } as unknown as import('../../../engine/salvage').SalvageConfig;
const gyard = yardLayout(GAME);
const FPS = 30;
const half = (id: string) => {
  const f = A.entryOf(id)!.footprint;
  return [f.w / 2, f.d / 2];
};
const VD = [...half('vehicle.truck'), ...half('vehicle.flatbed'), ...half('vehicle.van'), ...half('vehicle.trailer')];
const VX = A.vehicleBoxes(gyard.tilt);
const gate = GAME.map.points.gate ?? [GAME.yard.width - 1, GAME.yard.depth / 2];
const band = (k: number) => Math.floor(k / A.DEPTH_BAND);
const R_W = GAME.worker.radius;

describe('owner2-fix P2: nobody is drawn standing on a vehicle', () => {
  it('the drawn boxes: the truck facing east covers about 3.5 m of ground north of its centre (its cab rises), little south; a mirrored heading mirrors the box; the strides agree', () => {
    const o = (A.VBOX_TRUCK * 8 + 2) * 4;
    expect(VX[o + 2]).toBeLessThan(-3);
    expect(VX[o + 3]).toBeGreaterThan(1);
    expect(VX[o + 3]).toBeLessThan(1.6);
    const w = (A.VBOX_TRUCK * 8 + 6) * 4;
    expect(VX[w]).toBeCloseTo(-VX[o + 1], 9);
    expect(VX[w + 1]).toBeCloseTo(-VX[o], 9);
    expect(VX[w + 2]).toBeCloseTo(VX[o + 2], 9);
    expect(Co.BODY_STRIDE).toBe(M.VB_STRIDE);
  });

  it('the step aside from a standing truck: out of its drawn box to the nearest edge, kept on the side he is drawn on; beyond STAND_MAX_M drawn behind instead', () => {
    const VB = new Float64Array(M.VB_STRIDE);
    // The truck at (10, 20) facing east, standing, with its picture's box.
    VB.set([10, 20, 1, 0, VD[0], VD[1], 0, 0, VX[8 + 0], VX[8 + 1], VX[8 + 2], VX[8 + 3], 21]);
    const box = VX.slice(8, 12);
    const out = [0, 0];
    // 1.5 m north of its centre (inside the picture, outside the footprint): out to the north edge.
    M.asideTarget(out, 10, 18.5, VB, 1);
    expect(out[0]).toBe(0);
    expect(out[1]).toBeCloseTo(20 + box[2] - M.STAND_PAD_M - 18.5, 9);
    // Half a metre south of its centre: out to the south edge.
    M.asideTarget(out, 10, 20.5, VB, 1);
    expect(out[1]).toBeCloseTo(20 + box[3] + M.STAND_PAD_M - 20.5, 9);
    // Near its east end: out to the east.
    M.asideTarget(out, 10 + box[1] - 0.2, 19.6, VB, 1);
    expect(out[1]).toBe(0);
    expect(out[0]).toBeCloseTo(M.STAND_PAD_M + 0.2, 9);
    // Drawn north already while his rules place has moved south of the middle: still north.
    M.asideTarget(out, 10, 19.4, VB, 1, 0, -2.5);
    expect(out[1]).toBeLessThan(0);
    // Outside the padded box: nothing.
    M.asideTarget(out, 10, 20 + box[3] + M.STAND_PAD_M + 0.01, VB, 1);
    expect(out).toEqual([0, 0]);
    // Drawn behind: inside the box and in front of it by key -> moved below its band; outside -> unchanged.
    expect(band(M.behindStanding(VB, 1, 10, 20.5, 20.75))).toBeLessThan(band(21));
    expect(M.behindStanding(VB, 1, 10, 25, 25.25)).toBe(25.25);
    // A moving truck has no standing box.
    VB[6] = 4;
    expect(M.inStandingBox(VB, 0, 10, 20.5)).toBe(false);
  });

  it('the boss slides along a standing truck (never into its footprint), gets in from either side, cannot walk in at its ends, and is let out of one he stands in', () => {
    const VB = new Float64Array(M.VB_STRIDE);
    VB.set([20, 25, 1, 0, VD[0], VD[1], 0, 0, VX[8 + 0], VX[8 + 1], VX[8 + 2], VX[8 + 3], 26]);
    const out = [0, 0];
    const walk = (x: number, y: number, dx: number, dy: number, secs: number) => {
      let px = x;
      let py = y;
      let minD = Infinity;
      for (let f = 0; f < secs * FPS; f++) {
        Co.moveBody(out, px, py, (dx * GAME.walk) / FPS, (dy * GAME.walk) / FPS, R_W, [], 1000, 1000, 0, 0, 0, undefined, undefined, VB, 1);
        px = out[0];
        py = out[1];
        expect(M.insideBody(VB, 0, px, py)).toBe(false);
        minD = Math.min(minD, Math.hypot(px - 20, py - 25));
      }
      return { px, py, minD };
    };
    // From the north and from the south, straight at it: stops at its side, within the walk-in's reach.
    expect(walk(20, 20, 0, 1, 3).minD).toBeLessThan(GAME.truck.enter);
    expect(walk(20, 30, 0, -1, 3).minD).toBeLessThan(GAME.truck.enter);
    // From the east end: not within the walk-in's reach, within the button's (enter + 0.8).
    const e = walk(26, 25, -1, 0, 3);
    expect(e.minD).toBeGreaterThan(GAME.truck.enter);
    expect(e.minD).toBeLessThan(GAME.truck.enter + M.GET_IN_SLACK_M);
    // Slanting into its side: he slides along it (keeps moving east) instead of stopping dead.
    const s = walk(15, 23.5, 0.7, 0.7, 2);
    expect(s.px).toBeGreaterThan(17);
    // Standing inside it at the start (it stopped on him): he walks out.
    let px = 20.5;
    let py = 25.2;
    for (let f = 0; f < 2 * FPS; f++) {
      Co.moveBody(out, px, py, 0, GAME.walk / FPS, R_W, [], 1000, 1000, 0, 0, 0, undefined, undefined, VB, 1);
      px = out[0];
      py = out[1];
    }
    expect(py).toBeGreaterThan(25 + VD[1] + R_W - 0.01);
    // A moving truck does not stop him (dated legs: nobody gives way by rule, V5; people step aside on the screen).
    VB[6] = 5;
    Co.moveBody(out, 20, 23, 0, 0.5, R_W, [], 1000, 1000, 0, 0, 0, undefined, undefined, VB, 1);
    expect(out[1]).toBeCloseTo(23.5, 9);
  });

  it('the boss behind a parked truck (the player\'s rack picture) sees it turn see-through; in front of it, not', () => {
    const VB = new Float64Array(M.VB_STRIDE);
    VB.set([52, 30, 1, 0, VD[0], VD[1], 0, 0, VX[8 + 0], VX[8 + 1], VX[8 + 2], VX[8 + 3], 31]);
    const PB = A.personBox();
    // gi-rack: the boss 2 m north of the truck's centre.
    expect(M.vehicleCovers(VB, 0, 52, 28, 28.25, gyard.tilt, PB)).toBe(true);
    // In front (south of it).
    expect(M.vehicleCovers(VB, 0, 52, 31.4, 31.65, gyard.tilt, PB)).toBe(false);
    // Far behind it.
    expect(M.vehicleCovers(VB, 0, 52, 24, 24.25, gyard.tilt, PB)).toBe(false);
  });

  const wp = GAME.map.points.weighbridge;
  const rack = GAME.map.points.rack;
  const spots: [string, number, number, number][] = [
    // On the drive line between the weighbridge and the turn, beside the tool rack and the office (the player's gi-rack).
    ['the drive line', (wp[0] + gate[0]) / 2, wp[1], 2],
    ['the tool rack (the player\'s picture)', rack[0], rack[1] + 2.8, 2],
    ['the weighbridge', wp[0], wp[1], 2],
    ['the gate', gate[0] - 0.6, gate[1], 2],
  ];
  for (const [name, sx, sy, sh] of spots) {
    it(`the played minute 30 with the boss's truck parked at ${name}, five minutes of frames: no person's feet inside a standing vehicle's drawn outline while he is drawn in front of it`, () => {
      const played = F.playedOn(gcfg);
      const s0 = structuredClone(played.games.m30.salvage) as unknown as { truck: Record<string, unknown>; owned: string[]; epoch: number };
      s0.truck = { ...s0.truck, owned: true, by: null, trip: null, x: sx, y: sy, heading: sh };
      if (!s0.owned.includes('truck')) s0.owned.push('truck');
      let g = { cash: 1e7, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: s0 } as unknown as import('../../../engine/salvage').SalvageGame;
      const C = M.makeClock();
      const t4 = [0, 0, 0, 0];
      const tmp = [0, 0, 0, 0];
      const o4 = [0, 0, 0, 0];
      const P = new Array(A.PATH_MAX * 2).fill(0);
      const TA = new Array(A.PATH_MAX).fill(0);
      const F8 = [NaN, 0];
      const K = [NaN, NaN, NaN];
      const legK = new Float64Array(128);
      const f2 = [0, 0];
      const VB = new Float64Array(12 * M.VB_STRIDE);
      const PV = new Float64Array(M.VB_SLOTS * 2).fill(NaN);
      const OFF = new Float64Array(128);
      let table = rulesTable(gyard, R.frame(gcfg, g), GAME, () => 1, 0);
      let last: unknown = null;
      let nextTick = 0;
      const dt = 1 / FPS;
      let standingTruckFrames = 0;
      let before = 0;
      let after = 0;
      let behind = 0;
      let stepped = 0;
      let worst = 0;
      const bySlot: number[] = [];
      const sumBy: number[] = [];
      for (let f = 0; f < FPS * 300; f++) {
        const nowMs = (f * 1000) / FPS;
        if (nowMs >= nextTick) {
          g = R.setPresence(gcfg, g, { x: 10, y: 10, driving: false, moving: false, standingFor: 0, heading: 0 } as never, g.salvage.t);
          g = R.tick(gcfg, g, 0.1, F.FIXTURE_NOW + nextTick).game;
          // The boss's truck stays parked where he left it (the played yard's driver would take it out or home).
          const tk = g.salvage.truck as unknown as Record<string, unknown>;
          if (tk.x !== sx || tk.y !== sy || tk.trip !== null || tk.by !== null) g = { ...g, salvage: { ...g.salvage, truck: { ...g.salvage.truck, by: null, trip: null, x: sx, y: sy, heading: sh } } } as typeof g;
          table = rulesTable(gyard, R.frame(gcfg, g), GAME, () => 1, f);
          nextTick += 100;
        }
        const fresh = table !== last;
        last = table;
        const tNow = M.rulesClock(C, fresh, table.t, table.epoch, nowMs, dt);
        let n = 0;
        let seen = 0;
        const FB = table.flatbed;
        if (FB[3] !== 0 || FB[4] !== 0) {
          let show = true;
          let x = FB[3];
          let y = FB[4];
          let h4 = 1;
          if (FB[0] === 2) {
            show = M.flatbedAway(o4, tmp, P, FB, table.flatbedPath, table.flatbedAt, tNow, 6);
            x = o4[0];
            y = o4[1];
            h4 = A.heading4(o4[2], o4[3]);
          }
          if (show) {
            M.facing8(f2, h4 * 2);
            n = M.bodyInto(VB, n, PV, 1, x, y, f2[0], f2[1], VD[2], VD[3], dt, 0, VX, FB[0] === 1 ? A.VBOX_FLATBED_WORKING * 32 : (A.VBOX_FLATBED * 8 + h4) * 4, y + 1);
            seen |= 2;
          }
        }
        if (M.carAt(o4, P, table.car, gate[0], gate[1], tNow, 6)) {
          const h4 = A.heading4(o4[2], o4[3]);
          const north = h4 === 2;
          M.facing8(f2, h4 * 2);
          n = M.bodyInto(VB, n, PV, 2, o4[0], o4[1], f2[0], f2[1], VD[4], VD[5], dt, 0, VX, (A.VBOX_VAN * 8 + h4) * 4, o4[1] + (north ? 0.89 : 0.9));
          n = M.bodyInto(VB, n, PV, 3, o4[0], o4[1], f2[0], f2[1], VD[6], VD[7], dt, 2.75, VX, (A.VBOX_TRAILER * 8 + h4) * 4, o4[1] + (north ? 0.9 : 0.89));
          seen |= 12;
        }
        const AR = table.arrivals;
        for (let o = 0; o + A.ARRIVAL - 1 < AR.length; o += A.ARRIVAL) {
          if (AR[o] !== 0 && AR[o] !== 1) continue;
          const h4 = M.arrivalAt(o4, tmp, P, TA, AR, o, table.arrivalPath, table.arrivalAt, tNow);
          const slot = 4 + Math.min(3, o / A.ARRIVAL);
          M.facing8(f2, (AR[o + 1] === 1 ? 1 : h4) * 2);
          const box = AR[o] === 0 ? (A.VBOX_VAN * 8 + h4) * 4 : AR[o + 1] === 1 ? A.VBOX_FLATBED_WORKING * 32 : (A.VBOX_FLATBED * 8 + h4) * 4;
          n = M.bodyInto(VB, n, PV, slot, o4[0], o4[1], f2[0], f2[1], AR[o] === 0 ? VD[4] : VD[2], AR[o] === 0 ? VD[5] : VD[3], dt, 0, VX, box, AR[o] === 0 ? o4[1] + 0.9 : o4[1] + 1);
          seen |= 1 << slot;
        }
        const TR = table.truck;
        if (TR[0] === 1) {
          let x = TR[1];
          let y = TR[2];
          let h = TR[3];
          let hook = -1;
          if (M.truckAt(t4, tmp, TR, table.truckPath, tNow, M.truckFrom(K, TR, table.truckAt, tNow, false), table.truckAt)) {
            x = t4[0];
            y = t4[1];
            h = t4[2] === t4[2] ? t4[2] : F8[0] === F8[0] ? F8[0] : TR[3];
            hook = t4[3];
          }
          const h8 = M.turnFacing(F8, h, f / FPS, hook >= 0);
          M.facing8(f2, h8);
          const box = hook >= 0 ? A.VBOX_TRUCK_HOOK * 32 : TR[4] === 0 ? (A.VBOX_TRUCK_BARE * 8 + h8) * 4 : (A.VBOX_TRUCK * 8 + h8) * 4;
          n = M.bodyInto(VB, n, PV, 0, x, y, f2[0], f2[1], VD[0], VD[1], dt, 0, VX, box, y + 1);
          seen |= 1;
          if (Math.hypot(VB[(n - 1) * M.VB_STRIDE + 6], VB[(n - 1) * M.VB_STRIDE + 7]) < M.MOVING_V) standingTruckFrames++;
        }
        for (let q = 0; q < M.VB_SLOTS; q++) if ((seen & (1 << q)) === 0) PV[q * 2] = PV[q * 2 + 1] = NaN;
        const CR = table.crew;
        for (let o = 0; o + 13 < CR.length; o += 14) {
          if (CR[o + 11] === 1) continue;
          const ci = Math.min(63, o / 14);
          const walking = CR[o + 10] === 1 || CR[o + 10] === 3;
          M.crewAt(o4, P, CR, o, tNow, walking ? M.legStart(legK, ci, CR[o + 6], CR[o + 7], tNow, false) : NaN);
          const rx = o4[0];
          const ry = o4[1];
          M.stepAside(f2, OFF, ci, rx, ry, VB, n, dt, f === 0);
          const key = M.behindStanding(VB, n, f2[0], f2[1], f2[1] + 0.25);
          if (key !== f2[1] + 0.25) behind++;
          for (let q = 0; q < n; q++) {
            const vo = q * M.VB_STRIDE;
            if (M.inStandingBox(VB, vo, rx, ry) && band(ry + 0.25) >= band(VB[vo + 12])) before++;
            if (M.inStandingBox(VB, vo, rx, ry) && !M.inStandingBox(VB, vo, f2[0], f2[1])) {
              stepped++;
              bySlot[q] = (bySlot[q] ?? 0) + 1;
              sumBy[q] = (sumBy[q] ?? 0) + Math.hypot(f2[0] - rx, f2[1] - ry);
            }
            if (M.inStandingBox(VB, vo, f2[0], f2[1]) && band(key) >= band(VB[vo + 12])) after++;
          }
          worst = Math.max(worst, Math.hypot(f2[0] - rx, f2[1] - ry));
        }
      }
      console.log(`P2 ${name}: truck standing ${standingTruckFrames} of ${FPS * 300} frames; person-frames on a standing vehicle: before ${before}, after ${after}; stepped out ${stepped} (by vehicle slot ${JSON.stringify(bySlot)}, mean step ${JSON.stringify(sumBy.map((v, i) => +(v / bySlot[i]).toFixed(2)))} m), drawn behind ${behind}; widest step ${worst.toFixed(2)} m`);
      expect(standingTruckFrames).toBeGreaterThan(FPS * 30);
      expect(after).toBe(0);
    }, 600_000);
  }
});
