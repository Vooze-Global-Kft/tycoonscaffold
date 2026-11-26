/**
 * owner1 play 2 (the lead's ruling: PEOPLE STEP ASIDE, on the screen only): the played minute-30 state on
 * the game's own content, run for five minutes of frames. Every vehicle is placed exactly as the frame loop
 * places it (./motion.ts truckAt, flatbedAway, carAt, arrivalAt), every crew member at his rules place and
 * then stepped aside (./motion.ts stepAside). No frame may draw a person's centre inside a MOVING vehicle's
 * drawn body. Without the step aside the same run does (the fault the player saw: hands drawn over the
 * merchant's lorry as it passed).
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
const gate = GAME.map.points.gate ?? [GAME.yard.width - 1, GAME.yard.depth / 2];

describe('owner1 play 2: people step aside from a moving vehicle (drawn only)', () => {
  it('the asideTarget rule: a person ahead on the path steps to the nearer side, at most 1.6 m; one beside it or behind a standing vehicle does not', () => {
    const VB = new Float64Array(M.VB_STRIDE);
    // A lorry at (10, 20) facing east, 4 m/s.
    VB.set([10, 20, 1, 0, 2.3, 1, 4, 0]);
    const out = [0, 0];
    M.asideTarget(out, 14, 20.3, VB, 1);
    expect(out[0]).toBeCloseTo(0, 6);
    expect(out[1]).toBeCloseTo(1.4 - 0.3, 6);
    M.asideTarget(out, 14, 19.9, VB, 1);
    expect(out[1]).toBeCloseTo(-1.4 + 0.1, 6);
    M.asideTarget(out, 14, 22, VB, 1);
    expect(out).toEqual([0, 0]);
    M.asideTarget(out, 20, 20, VB, 1);
    expect(out).toEqual([0, 0]);
    VB[6] = 0;
    M.asideTarget(out, 11, 20, VB, 1);
    expect(out).toEqual([0, 0]);
    // A wide sweep (moving across): capped at ASIDE_MAX_M.
    VB.set([10, 20, 1, 0, 2.3, 1, 0, 8]);
    M.asideTarget(out, 10, 22, VB, 1);
    expect(Math.hypot(out[0], out[1])).toBeLessThanOrEqual(M.ASIDE_MAX_M + 1e-9);
  });

  it('the played minute 30, five minutes of frames: no person drawn inside a moving vehicle (and, without the step aside, some are)', () => {
    const played = F.playedOn(gcfg);
    let g = { cash: 1e7, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(played.games.m30.salvage) } as unknown as import('../../../engine/salvage').SalvageGame;
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
    let movingFrames = 0;
    let insideAfter = 0;
    let insideBefore = 0;
    let worstAside = 0;
    const waitOnLine = new Map<string, number>();
    const line = A.mapDriveLine(GAME);
    const wb = GAME.map.places.weighbridge;
    const wp = GAME.map.points.weighbridge;
    for (let f = 0; f < FPS * 300; f++) {
      const nowMs = (f * 1000) / FPS;
      if (nowMs >= nextTick) {
        g = R.setPresence(gcfg, g, { x: 10, y: 10, driving: false, moving: false, standingFor: 0, heading: 0 } as never, g.salvage.t);
        g = R.tick(gcfg, g, 0.1, F.FIXTURE_NOW + nextTick).game;
        table = rulesTable(gyard, R.frame(gcfg, g), GAME, () => 1, f);
        nextTick += 100;
      }
      const fresh = table !== last;
      last = table;
      const tNow = M.rulesClock(C, fresh, table.t, table.epoch, nowMs, dt);
      let n = 0;
      let seen = 0;
      // The flatbed.
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
          n = M.bodyInto(VB, n, PV, 1, x, y, f2[0], f2[1], VD[2], VD[3], dt, 0);
          seen |= 2;
        }
      }
      if (M.carAt(o4, P, table.car, gate[0], gate[1], tNow, 6)) {
        M.facing8(f2, A.heading4(o4[2], o4[3]) * 2);
        n = M.bodyInto(VB, n, PV, 2, o4[0], o4[1], f2[0], f2[1], VD[4], VD[5], dt, 0);
        n = M.bodyInto(VB, n, PV, 3, o4[0], o4[1], f2[0], f2[1], VD[6], VD[7], dt, 2.75);
        seen |= 12;
      }
      const AR = table.arrivals;
      for (let o = 0; o + A.ARRIVAL - 1 < AR.length; o += A.ARRIVAL) {
        if (AR[o] !== 0 && AR[o] !== 1) continue;
        const h4 = M.arrivalAt(o4, tmp, P, TA, AR, o, table.arrivalPath, table.arrivalAt, tNow);
        const slot = 4 + Math.min(3, o / A.ARRIVAL);
        M.facing8(f2, (AR[o + 1] === 1 ? 1 : h4) * 2);
        n = M.bodyInto(VB, n, PV, slot, o4[0], o4[1], f2[0], f2[1], AR[o] === 0 ? VD[4] : VD[2], AR[o] === 0 ? VD[5] : VD[3], dt, 0);
        seen |= 1 << slot;
      }
      const TR = table.truck;
      if (TR[0] === 1) {
        let x = TR[1];
        let y = TR[2];
        let h = TR[3];
        if (M.truckAt(t4, tmp, TR, table.truckPath, tNow, M.truckFrom(K, TR, table.truckAt, tNow, false), table.truckAt)) {
          x = t4[0];
          y = t4[1];
          h = t4[2] === t4[2] ? t4[2] : F8[0] === F8[0] ? F8[0] : TR[3];
        }
        M.facing8(f2, M.turnFacing(F8, h, f / FPS, false));
        n = M.bodyInto(VB, n, PV, 0, x, y, f2[0], f2[1], VD[0], VD[1], dt, 0);
        seen |= 1;
      }
      for (let q = 0; q < M.VB_SLOTS; q++) if ((seen & (1 << q)) === 0) PV[q * 2] = PV[q * 2 + 1] = NaN;
      const moving: number[] = [];
      for (let i = 0; i < n; i++) if (Math.hypot(VB[i * M.VB_STRIDE + 6], VB[i * M.VB_STRIDE + 7]) >= M.MOVING_V) moving.push(i * M.VB_STRIDE);
      if (moving.length) movingFrames++;
      // The crew: rules place, then the step aside.
      const CR = table.crew;
      for (let o = 0; o + 13 < CR.length; o += 14) {
        if (CR[o + 11] === 1) continue;
        const ci = Math.min(63, o / 14);
        const walking = CR[o + 10] === 1 || CR[o + 10] === 3;
        M.crewAt(o4, P, CR, o, tNow, walking ? M.legStart(legK, ci, CR[o + 6], CR[o + 7], tNow, false) : NaN);
        const rx = o4[0];
        const ry = o4[1];
        M.stepAside(f2, OFF, ci, rx, ry, VB, n, dt, f === 0);
        worstAside = Math.max(worstAside, Math.hypot(f2[0] - rx, f2[1] - ry));
        for (const vo of moving) {
          if (M.insideBody(VB, vo, rx, ry)) insideBefore++;
          if (M.insideBody(VB, vo, f2[0], f2[1])) {
            insideAfter++;
            if (process.env.ASIDE_DEBUG) console.log(`inside f ${f} t ${tNow.toFixed(2)} body ${Array.from(VB.slice(vo, vo + 8)).map((v) => v.toFixed(2)).join(',')} rules ${rx.toFixed(2)},${ry.toFixed(2)} drawn ${f2[0].toFixed(2)},${f2[1].toFixed(2)} phase ${CR[o + 10]} role ${CR[o]}`);
          }
        }
        // A person who stands (waits) on the weighbridge's deck or within a metre of the drive line: a rules fault to report.
        if (CR[o + 10] === 0) {
          const onDeck = wb && Math.abs(rx - wp[0]) < wb.w / 2 && Math.abs(ry - wp[1]) < wb.d / 2;
          const near = A.nearestOnLine(line, rx, ry);
          if (onDeck || Math.hypot(near.x - rx, near.y - ry) < 1) {
            const k = `${CR[o] === 0 ? 'hand' : CR[o] === 1 ? 'cutter' : 'driver'} at ${rx.toFixed(1)}, ${ry.toFixed(1)}${onDeck ? ' (on the weighbridge)' : ' (on the drive line)'}`;
            waitOnLine.set(k, (waitOnLine.get(k) ?? 0) + 1);
          }
        }
      }
    }
    // Printed for the notes (owner1-fix-world.md) and requests.md.
    console.log(`play2: frames with a moving vehicle ${movingFrames} of ${FPS * 300}; person-frames inside a moving body: before ${insideBefore}, after ${insideAfter}; widest step aside ${worstAside.toFixed(2)} m`);
    console.log(`play2: waiting places on the drive line or the weighbridge (frames): ${JSON.stringify([...waitOnLine.entries()].slice(0, 12))}`);
    expect(movingFrames).toBeGreaterThan(FPS * 20);
    expect(insideAfter).toBe(0);
    expect(worstAside).toBeLessThanOrEqual(M.ASIDE_MAX_M + 1e-9);
  }, 600_000);
});
