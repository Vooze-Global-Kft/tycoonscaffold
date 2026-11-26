/**
 * Smooth motion from dated data (the owner's review of 26 November: point 1 "truck animation, and helper
 * laggy", point 3 "the flat cart flashes while stripping", point 7's drawing side "trucks are sometimes
 * speeding through the yard"). Frozen test content; the frame loop's own worklets (./motion.ts,
 * ./actors.ts) called as the UI thread calls them, frame by frame.
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
const content = F.SALVAGE_TEST;
const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
const yard = yardLayout(content);
const FRAME_MS = 1000 / 60;

/** A scene with one yard hand walking 12 m east (clear of the container wall) from t 100 to t 112 (a leg as the rules date it). */
function walkingHand(t: number) {
  const base = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame;
  const hand = { id: 'hand.0', role: 'hand' as const, slot: 0, name: 0, level: 1, job: 'floor' as const, phase: 'walkTo' as const, from: { xy: [30, 30] as [number, number] }, to: { xy: [42, 30] as [number, number] }, t0: 100, t1: 112, carries: null, load: [], claims: [], cut: null };
  const g = { ...base, salvage: { ...base.salvage, t, crew: [hand] } } as unknown as typeof base;
  return rulesTable(yard, R.frame(cfg, g), content, () => 1, Math.round(t * 10));
}

/** The frame loop's old clock (before 26 November): the table's t plus the time since it came, at most 0.25 s. */
function oldClock(S: { t: number; at: number }, fresh: boolean, t: number, nowMs: number): number {
  if (fresh) {
    S.t = t;
    S.at = nowMs;
  }
  return S.t + Math.min(0.25, (nowMs - S.at) / 1000);
}

describe('point 1: an actor moves at the display\'s rate, from the leg\'s dates', () => {
  /**
   * Tables at the store's 10 a second for two seconds, then JavaScript busy for one whole second (no table):
   * the sixty frames from the last table on. Returns the hand's drawn x at each of those sixty frames.
   */
  function sixtyFrames(clock: 'new' | 'old'): number[] {
    const C = M.makeClock();
    const S = { t: 0, at: 0 };
    const o4 = [0, 0, 0, 0];
    const P = [0, 0, 0, 0, 0, 0];
    let tableT = 101;
    let table = walkingHand(tableT);
    let nextTableMs = 0;
    let now = 0;
    const xs: number[] = [];
    let lastTable: unknown = null;
    let lastAt = -1;
    for (let f = 0; xs.length < 60; f++) {
      now = f * FRAME_MS;
      if (now < 2000 && now >= nextTableMs) {
        table = walkingHand(tableT);
        tableT += 0.1;
        nextTableMs += 100;
        lastAt = f;
      }
      const fresh = table !== lastTable;
      lastTable = table;
      const tNow = clock === 'new' ? M.rulesClock(C, fresh, table.t, table.epoch, now, FRAME_MS / 1000) : oldClock(S, fresh, table.t, now);
      M.crewAt(o4, P, table.crew, 0, tNow);
      if (now >= 2000 && f >= lastAt) xs.push(o4[0]);
    }
    return xs;
  }

  it('samples the drawn position at 60 instants of one second between two tables: sixty distinct, evenly spaced positions', () => {
    const xs = sixtyFrames('new');
    expect(xs).toHaveLength(60);
    expect(new Set(xs.map((x) => x.toFixed(4))).size).toBe(60);
    const steps = xs.slice(1).map((x, i) => x - xs[i]);
    const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
    // 12 m in 12 s: 1 m a second, 1/60 m a frame.
    expect(mean).toBeCloseTo(1 / 60, 3);
    for (const s of steps) expect(Math.abs(s - mean)).toBeLessThan(mean * 0.05);
  });

  it('(the fault it fixes) the old clock froze every actor 0.25 s into a late tick', () => {
    const xs = sixtyFrames('old');
    expect(new Set(xs.map((x) => x.toFixed(4))).size).toBeLessThan(20);
  });

  it('tables arriving with the JavaScript thread\'s jitter move nobody backwards and keep the speed within 15 %', () => {
    const C = M.makeClock();
    const S = { t: 0, at: 0 };
    const o4 = [0, 0, 0, 0];
    const P = [0, 0, 0, 0, 0, 0];
    // A tick every 100 ms of play time, seen by the UI thread 0 to 60 ms late (a busy JavaScript thread).
    const late = (k: number) => ((k * 7919) % 61) / 1000;
    let k = 0;
    let table = walkingHand(100.5);
    let last: unknown = null;
    const out: Record<'new' | 'old', number[]> = { new: [], old: [] };
    for (let f = 0; f < 600; f++) {
      const now = f * FRAME_MS;
      while ((k + 1) * 100 + late(k + 1) * 1000 <= now) {
        k++;
        table = walkingHand(100.5 + k * 0.1);
      }
      const fresh = table !== last;
      last = table;
      M.crewAt(o4, P, table.crew, 0, M.rulesClock(C, fresh, table.t, table.epoch, now, FRAME_MS / 1000));
      out.new.push(o4[0]);
      M.crewAt(o4, P, table.crew, 0, oldClock(S, fresh, table.t, now));
      out.old.push(o4[0]);
    }
    const steps = (xs: number[]) => xs.slice(61).map((x, i) => x - xs[i + 60]);
    for (const s of steps(out.new)) {
      expect(s).toBeGreaterThan((1 / 60) * 0.85);
      expect(s).toBeLessThan((1 / 60) * 1.15);
    }
    // The old clock re-anchored at every table: frames that moved backwards or stood, others that jumped.
    const old = steps(out.old);
    expect(old.some((s) => s <= 0)).toBe(true);
    expect(Math.max(...old)).toBeGreaterThan((1 / 60) * 2);
  });

  it('snaps across an epoch (a preset, the away pass) and catches up after a long stall without running backwards', () => {
    const C = M.makeClock();
    expect(M.rulesClock(C, true, 50, 0, 0, 0)).toBe(50);
    expect(M.rulesClock(C, false, 50, 0, 100, 0.1)).toBeCloseTo(50.1, 2);
    // A new epoch: at once.
    expect(M.rulesClock(C, true, 900, 1, 116, 0.016)).toBe(900);
    // Three seconds without a table: the clock holds AHEAD_S past the newest table, then snaps to the next one.
    let t = 0;
    for (let f = 1; f <= 180; f++) t = M.rulesClock(C, false, 900, 1, 116 + f * FRAME_MS, FRAME_MS / 1000);
    expect(t).toBeCloseTo(900 + M.AHEAD_S, 6);
    expect(M.rulesClock(C, true, 903, 1, 116 + 181 * FRAME_MS, FRAME_MS / 1000)).toBeCloseTo(903, 6);
  });
});

describe('point 7, the drawing side: the driver\'s truck drives each phase of its trip, never jumping', () => {
  // The game's own content (the review's rules: every phase dated by the rules, frame.ts V1 / V3).
  const GAME = SalvageSchema.parse(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage);
  const gcfg = { mode: 'salvage', salvage: GAME } as unknown as import('../../../engine/salvage').SalvageConfig;
  const gyard = yardLayout(GAME);
  const W = GAME.yard.width;

  /** The m30 state played on the game's content, ticked at 10 a second for `seconds`, drawn at 60 frames a second. */
  function playTrips(seconds: number, each: (f: { x: number; y: number; h: number; leg: number; table: ReturnType<typeof rulesTable>; tNow: number }) => void) {
    const played = F.playedOn(gcfg);
    let g = { cash: 1e7, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(played.games.m30.salvage) } as unknown as import('../../../engine/salvage').SalvageGame;
    expect(g.salvage.crew.some((m) => m.role === 'driver')).toBe(true);
    const C = M.makeClock();
    const t4 = [0, 0, 0, 0];
    const tmp = [0, 0, 0, 0];
    const F8 = [NaN, 0];
    const K = [NaN, NaN, NaN];
    let table = rulesTable(gyard, R.frame(gcfg, g), GAME, () => 1, 0);
    let last: unknown = null;
    let nextTick = 0;
    for (let f = 0; f < 60 * seconds; f++) {
      const now = f * FRAME_MS;
      if (now >= nextTick) {
        g = R.setPresence(gcfg, g, { x: 10, y: 10, driving: false, moving: false, standingFor: 0, heading: 0 } as never, g.salvage.t);
        g = R.tick(gcfg, g, 0.1, F.FIXTURE_NOW + nextTick).game;
        table = rulesTable(gyard, R.frame(gcfg, g), GAME, () => 1, f);
        nextTick += 100;
      }
      const fresh = table !== last;
      last = table;
      const tNow = M.rulesClock(C, fresh, table.t, table.epoch, now, FRAME_MS / 1000);
      const TR = table.truck;
      let x = TR[1];
      let y = TR[2];
      let h = TR[3];
      let leg = -1;
      if (M.truckAt(t4, tmp, TR, table.truckPath, tNow, M.truckFrom(K, TR, table.truckAt, tNow, false), table.truckAt)) {
        x = t4[0];
        y = t4[1];
        h = t4[2] === t4[2] ? t4[2] : F8[0] === F8[0] ? F8[0] : TR[3];
        leg = TR[6];
      }
      each({ x, y, h: M.turnFacing(F8, h, f / 60, false), leg, table, tNow });
    }
  }

  it('two whole trips (out, hook, back, weigh, tip, park) drawn at 60 frames a second: continuous, never faster than the rules date it, at most truck.yardV inside the fence', () => {
    let prev: { x: number; y: number; h: number } | null = null;
    let worst = 0;
    let worstYard = 0;
    let worstSwitch = 0;
    let prevLeg = -2;
    const phases = new Set<number>();
    let tooFast = 0;
    playTrips(150, ({ x, y, h, leg, table }) => {
      if (leg >= 0) phases.add(leg);
      if (prev) {
        const d = Math.hypot(x - prev.x, y - prev.y);
        worst = Math.max(worst, d);
        if (x <= W && prev.x <= W) worstYard = Math.max(worstYard, d * 60);
        if (leg !== prevLeg) worstSwitch = Math.max(worstSwitch, d);
        // Never faster than the fastest stretch of this phase as the rules date it (+15 %: a leg seen late).
        const TA = table.truckAt;
        const TP = table.truckPath;
        let vmax = 0;
        for (let i = 1; i < TA.length; i++) if (TA[i] > TA[i - 1]) vmax = Math.max(vmax, Math.hypot(TP[i * 2] - TP[i * 2 - 2], TP[i * 2 + 1] - TP[i * 2 - 1]) / (TA[i] - TA[i - 1]));
        if (leg >= 0 && d * 60 > vmax * 1.15 + 0.05 && leg === prevLeg) tooFast++;
        const dh = (((h - prev.h) % 8) + 8) % 8;
        expect(Math.min(dh, 8 - dh)).toBeLessThanOrEqual(1);
      }
      prevLeg = leg;
      prev = { x, y, h };
    });
    for (const p of [0, 1, 2, 3, 4, 6]) expect(phases.has(p), `leg ${p}`).toBe(true);
    // The whole trip is dated: every frame of the review's table had the dates.
    expect(tooFast).toBe(0);
    // No drawn jump over half a metre at a phase switch (the old drawing: 11 m, 7 m, 120 m).
    expect(worstSwitch).toBeLessThan(0.5);
    // Inside the fence at most truck.yardV (4 m/s; +15 % for a leg first seen late).
    expect(worstYard).toBeLessThanOrEqual((GAME.truck.yardV ?? 4) * 1.15);
    // On the lane the rules' own lane speed (under 30 m/s: half a metre a frame).
    expect(worst).toBeLessThan(0.5);
  });

  it('each phase is drawn along the frame\'s own path at its dates (the stand-in is gone)', () => {
    const tk = (leg: Record<string, unknown>) => ({ owned: true, x: 1, y: 2, heading: 2, by: 'driver', load: null, skip: 'none', hookSpan: null, hook: null, leg }) as unknown as import('../../../engine/salvage').FrameTruck;
    const line = A.mapDriveLine(GAME);
    const back = A.tripLeg(GAME, tk({ phase: 'back', partner: 'p', t0: 10, t1: 30, from: { x: 1, y: 2 }, to: { x: 5, y: 2 }, path: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }], at: [12, 20, 30] }), line);
    expect(back).toEqual({ path: [1, 2, 3, 2, 5, 2], at: [12, 20, 30], driveEnd: 30, face: -1 });
    const hook = A.tripLeg(GAME, tk({ phase: 'hook', partner: 'p', t0: 10, t1: 14, from: { x: 1, y: 2 }, to: { x: 1, y: 2 }, path: [{ x: 1, y: 2 }], at: [10] }), line);
    expect(hook.face).toBe(2);
    // Piecewise: 2 m in 8 s, then 2 m in 10 s; standing at the first point before its date.
    const TR = [1, 1, 2, 0, 0, 2, 2, 10, 30, -1, -1, 3, 30, -1];
    const o = [0, 0, 0, 0];
    const tmp = [0, 0, 0, 0];
    M.truckAt(o, tmp, TR, back.path, 11, NaN, back.at);
    expect(o[0]).toBeCloseTo(1);
    M.truckAt(o, tmp, TR, back.path, 16, NaN, back.at);
    expect(o[0]).toBeCloseTo(2);
    M.truckAt(o, tmp, TR, back.path, 25, NaN, back.at);
    expect(o[0]).toBeCloseTo(4);
    M.truckAt(o, tmp, TR, back.path, 40, NaN, back.at);
    expect(o[0]).toBeCloseTo(5);
    // A one-point phase standing with no facing of its own keeps the shown one (NaN).
    const TRw = [1, 1, 2, 0, 0, 2, 3, 10, 11, -1, -1, 1, 11, -1];
    M.truckAt(o, tmp, TRw, [7, 8], 10.5, NaN, [11]);
    expect([o[0], o[1]]).toEqual([7, 8]);
    expect(Number.isNaN(o[2])).toBe(true);
  });

  it('the boss\'s own truck: at most truck.bossYardV inside the fence, truck.bossV on the lane, eased over about a second past the gate', async () => {
    const { bossDriveV, GATE_EASE_M } = M;
    const vy = GAME.truck.bossYardV!;
    const vl = GAME.truck.bossV!;
    expect(bossDriveV(W - 5, W, vy, vl)).toBe(vy);
    expect(bossDriveV(W, W, vy, vl)).toBe(vy);
    expect(bossDriveV(W + GATE_EASE_M, W, vy, vl)).toBe(vl);
    // Driving out at the top speed from the gate: the pace grows smoothly, no step over 0.2 m/s a frame, in about a second.
    let x = W;
    let v = bossDriveV(x, W, vy, vl);
    let t = 0;
    while (v < vl - 1e-6 && t < 5) {
      x += v / 60;
      const nv = bossDriveV(x, W, vy, vl);
      expect(nv - v).toBeLessThan(0.2);
      v = nv;
      t += 1 / 60;
    }
    expect(t).toBeGreaterThan(0.7);
    expect(t).toBeLessThan(1.8);
  });

  it('a purchase arrives along the frame\'s path to its stop and sets down there: no jump', () => {
    const a = { item: 'x', kind: 'van', place: 'rack', from: { x: 80, y: 20 }, to: { x: 30, y: 30 }, span: { t0: 0, t1: 20 }, phase: 'in', path: [{ x: 80, y: 20 }, { x: 60, y: 20 }, { x: 40, y: 25 }], at: [0, 5, 14], stop: { x: 40, y: 25 } };
    const f = R.frame(gcfg, { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(gcfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame);
    const sc = A.rulesScene(GAME, { ...f, arrivals: [a] } as never, () => 1);
    expect(sc.arrivals.slice(8, 10)).toEqual([3, 0]);
    expect(sc.arrivalPath).toEqual([80, 20, 60, 20, 40, 25]);
    expect(sc.arrivalAt).toEqual([0, 5, 14]);
    const sd = A.rulesScene(GAME, { ...f, arrivals: [{ ...a, phase: 'setDown' }] } as never, () => 1);
    // The set-down stands at the path's last point (the stop), where the drive ended.
    expect(sd.arrivalPath.slice(-2)).toEqual([40, 25]);
    expect(M.timedShare(sc.arrivalPath, 3, sc.arrivalAt, 0, 14)).toBe(1);
    expect(M.timedShare(sc.arrivalPath, 3, sc.arrivalAt, 0, 2.5)).toBeCloseTo(10 / (20 + Math.hypot(20, 5)));
  });

  it('a leg first seen late is drawn from its start, its end date kept (no jump forward at a leg change)', () => {
    // The truck's own: keyed by its start and phase (weigh's last date is tip's first).
    const KT = [NaN, NaN, NaN];
    expect(M.truckFrom(KT, [1, 0, 0, 0, 0, 2, 3, 10, 11, -1, -1, 1, 11, -1], [11], 10.05, false)).toBe(11);
    expect(M.truckFrom(KT, [1, 0, 0, 0, 0, 2, 4, 11, 20, -1, -1, 2, 11.7, -1], [11, 11.7], 11.08, false)).toBe(11.08);
    expect(M.warpTau(11.08, 11.08, 11, 11.7)).toBe(11);
    expect(M.warpTau(11.7, 11.08, 11, 11.7)).toBeCloseTo(11.7);
    const K = [NaN, NaN];
    // Seen 0.08 s late: drawn from the frame that saw it.
    expect(M.legStart(K, 0, 10, 20, 10.08, false)).toBe(10.08);
    expect(M.legStart(K, 0, 10, 20, 10.5, false)).toBe(10.08);
    // Seen a second late (a mount), or across a snap: at its dates.
    expect(M.legStart(K, 0, 30, 40, 31, false)).toBe(30);
    expect(M.legStart(K, 0, 50, 60, 50.1, true)).toBe(50);
    const o4 = [0, 0, 0, 0];
    const P = [0, 0, 0, 0, 0, 0];
    const CR = [0, 1, 0, 0, 10, 0, 100, 110, 0, 0, 1, 0, NaN, NaN];
    M.crewAt(o4, P, CR, 0, 100.1, 100.1);
    expect(o4[0]).toBe(0);
    M.crewAt(o4, P, CR, 0, 110, 100.1);
    expect(o4[0]).toBe(10);
  });

  it('a facing turns one heading per step, the shorter way', () => {
    const F8 = [NaN, 0];
    expect(M.turnFacing(F8, 2, 0, false)).toBe(2);
    const seen = [];
    for (let k = 0; k <= 6; k++) seen.push(M.turnFacing(F8, 6, k * M.STEP_S, false));
    expect(seen).toEqual([3, 4, 5, 6, 6, 6, 6]);
    expect(M.turnFacing(F8, 7, 10, false)).toBe(7);
    expect(M.turnFacing(F8, 1, 10 + M.STEP_S, false)).toBe(0);
    expect(M.turnFacing(F8, 4, 11, true)).toBe(4);
  });
});

describe('point 1: the frame\'s sort does no work a phone could not do sixty times a second', () => {
  function list(n: number, seed: number) {
    const L = A.makeListW(n, 0);
    let h = seed;
    const rnd = () => ((h = (Math.imul(h, 1103515245) + 12345) >>> 0) % 100000) / 100000;
    for (let i = 0; i < n; i++) {
      L.key[i] = Math.round(rnd() * 400) / 10;
      L.cell[i] = A.packCell(Math.floor(rnd() * 3), i, false);
    }
    L.n = n;
    return L;
  }
  it('sortRuns (two presorted runs and the actors) orders exactly as the whole insertion sort', () => {
    for (let seed = 1; seed < 30; seed++) {
      const n = 120;
      const L = list(n, seed);
      // Presort the two runs [0, 60) and [60, 100) the way presortItems does: through items.
      const items: number[][] = [[], []];
      for (let r = 0; r < 2; r++)
        for (let i = r * 60; i < (r ? 100 : 60); i++) items[r].push(2, L.key[i], L.cell[i], 0, 0, 0, 0, 1, -1, 1, -1, 0);
      const sorted = items.map((it) => A.presortItems(it));
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < sorted[r].length / A.ITEM; k++) {
          L.key[r * 60 + k] = sorted[r][k * A.ITEM + 1];
          L.cell[r * 60 + k] = sorted[r][k * A.ITEM + 2];
        }
      const W = A.makeListW(n, 0);
      W.key.set(L.key);
      W.cell.set(L.cell);
      W.n = n;
      A.sortList(W);
      A.sortRuns(L, 60, 100);
      expect(Array.from(L.order.slice(0, n))).toEqual(Array.from(W.order.slice(0, n)));
    }
  });
  it('a run that is not presorted after all falls back to the whole sort', () => {
    const L = list(50, 7);
    const W = list(50, 7);
    A.sortList(W);
    A.sortRuns(L, 20, 40);
    expect(Array.from(L.order.slice(0, 50))).toEqual(Array.from(W.order.slice(0, 50)));
  });
});

describe('point 3: a carrier never vanishes while its person works', () => {
  it('the boss at the stripper with the trolley: the trolley is drawn in every frame of feeding, picking up and standing', async () => {
    const { MANIFEST } = await import('../art/manifest');
    const names: string[] = [];
    const res = (id: string, frame = 0, heading = 0) => {
      if (!MANIFEST.some((m) => m.id === id)) return -1;
      names.push(`${id}#${frame}#${heading}`);
      return A.packCell(0, names.length - 1, false);
    };
    const T = A.actorTable(res, { hand: '#00FF00', cutter: '#0000FF', driver: '#00FFFF' });
    const V = new Float64Array([0, 0, 40, 0.7, Math.sqrt(1 - 0.49), 2000, 2000, 1]);
    // The rules' poses at the stripper, tick by tick (feed a piece, a tick between, pick up the tray, ...).
    for (const pose of [A.P_FEED, A.P_PUSH, A.P_FEED, A.P_STAND, A.P_FEED, A.P_SPANNER, A.P_PUSH]) {
      for (let h = 0; h < 4; h++) {
        const L = A.makeListW(16, 0);
        A.personInto(L, V, T, 0, pose, 0, h, -1, 1, 1, -1, 10, 10, 10.25);
        const ids = Array.from(L.cell.slice(0, L.n)).map((c) => names[A.unpackCell(c).cell].split('#')[0]);
        expect(ids, `pose ${pose} heading ${h}`).toContain('carrier.trolley');
      }
    }
    const at = (pose: number) => {
      const L = A.makeListW(16, 0);
      A.personInto(L, V, T, 0, pose, 0, 1, -1, 1, 1, -1, 10, 10, 10.25);
      const i = Array.from(L.cell.slice(0, L.n)).findIndex((c) => names[A.unpackCell(c).cell].startsWith('carrier.trolley'));
      return [L.sx[i], L.sy[i]];
    };
    expect(at(A.P_FEED)).toEqual(at(A.P_PUSH));
    expect(at(A.P_STAND)).toEqual(at(A.P_PUSH));
  });
});
