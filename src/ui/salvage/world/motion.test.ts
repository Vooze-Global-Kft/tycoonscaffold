/**
 * Smooth motion from dated data (the owner's review of 26 November: point 1 "truck animation, and helper
 * laggy", point 3 "the flat cart flashes while stripping", point 7's drawing side "trucks are sometimes
 * speeding through the yard"). Frozen test content; the frame loop's own worklets (./motion.ts,
 * ./actors.ts) called as the UI thread calls them, frame by frame.
 */
import { describe, expect, it, vi } from 'vitest';

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
  it('a whole trip (out, hook, back, weigh, tip, park) drawn at 60 frames a second: no frame moves it more than a vehicle can', () => {
    const fx = F.FIXTURE_STATES.m30 as unknown as { salvage: import('../../../engine/salvage').SalvageState };
    let g = { cash: 1e7, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(fx.salvage) } as unknown as import('../../../engine/salvage').SalvageGame;
    expect(g.salvage.crew.some((m) => m.role === 'driver')).toBe(true);
    const C = M.makeClock();
    const t4 = [0, 0, 0, 0];
    const tmp = [0, 0, 0, 0];
    const F8 = [NaN, 0];
    const K = [NaN, NaN];
    let table = rulesTable(yard, R.frame(cfg, g), content, () => 1, 0);
    let last: unknown = null;
    let prev: [number, number] | null = null;
    let worst = 0;
    const phases = new Set<number>();
    const headings: number[] = [];
    let nextTick = 0;
    for (let f = 0; f < 60 * 120; f++) {
      const now = f * FRAME_MS;
      if (now >= nextTick) {
        g = R.setPresence(cfg, g, { x: 10, y: 10, driving: false, moving: false, standingFor: 0, heading: 0 } as never, g.salvage.t);
        g = R.tick(cfg, g, 0.1, F.FIXTURE_NOW + nextTick).game;
        table = rulesTable(yard, R.frame(cfg, g), content, () => 1, f);
        nextTick += 100;
      }
      const fresh = table !== last;
      last = table;
      const tNow = M.rulesClock(C, fresh, table.t, table.epoch, now, FRAME_MS / 1000);
      const TR = table.truck;
      let x = TR[1];
      let y = TR[2];
      let h = TR[3];
      if (M.truckAt(t4, tmp, TR, table.truckPath, tNow, TR[6] >= 0 ? M.legStart(K, 0, TR[7], TR[12] === TR[12] ? TR[12] : TR[8], tNow, false) : NaN)) {
        x = t4[0];
        y = t4[1];
        h = t4[2];
        phases.add(TR[6]);
      }
      headings.push(M.turnFacing(F8, h, f / 60, false));
      if (prev) worst = Math.max(worst, Math.hypot(x - prev[0], y - prev[1]));
      prev = [x, y];
    }
    // Every phase of the trip was drawn.
    for (const p of [0, 1, 2, 3, 4, 6]) expect(phases.has(p), `leg ${p}`).toBe(true);
    // The fastest leg (the lane at the content's truck.v) is under 20 m/s: a third of a metre a frame. The
    // old drawing jumped 11 m (gate to bridge), 7 m (bridge to floor) and 120 m (the park phase from the site).
    expect(worst).toBeLessThan(20 / 60);
    // The facing never jumps more than one of the eight headings from one frame to the next.
    for (let i = 1; i < headings.length; i++) {
      const d = (((headings[i] - headings[i - 1]) % 8) + 8) % 8;
      expect(Math.min(d, 8 - d)).toBeLessThanOrEqual(1);
    }
  });

  it('each phase\'s path runs between the places the rules set the truck at', () => {
    const gate = content.map.points.gate;
    const wb = content.map.points.weighbridge;
    const floor = content.map.points.floor;
    const park = content.map.points.park;
    const z = { x: gate[0] + 50, y: gate[1] - 3 };
    const leg = (phase: string, at: number[], t0 = 0, t1 = 10) => ({ owned: true, x: at[0], y: at[1], heading: 2, by: 'driver', load: null, skip: 'none', hookSpan: null, hook: null, leg: { phase, partner: 'p', t0, t1, from: phase === 'out' ? { x: park[0], y: park[1] } : z, to: phase === 'out' ? z : { x: park[0], y: park[1] }, path: [] } }) as unknown as import('../../../engine/salvage').FrameTruck;
    const line = A.mapDriveLine(content);
    const ends = (p: number[]) => [p[0], p[1], p[p.length - 2], p[p.length - 1]].map((v) => Math.round(v * 10) / 10);
    expect(ends(A.tripLeg(content, leg('back', gate), line).path)).toEqual(ends([z.x, z.y, wb[0], wb[1]]));
    expect(ends(A.tripLeg(content, leg('tip', floor), line).path)).toEqual(ends([wb[0], wb[1], floor[0], floor[1]]));
    expect(ends(A.tripLeg(content, leg('park', floor), line).path)).toEqual(ends([floor[0], floor[1], park[0], park[1]]));
    expect(A.tripLeg(content, leg('weigh', wb), line).path).toEqual([wb[0], wb[1]]);
    const tip = A.tripLeg(content, leg('tip', floor, 100, 112), line);
    expect(tip.driveEnd).toBeGreaterThan(100);
    expect(tip.driveEnd).toBeLessThanOrEqual(106);
    // A frame that names the phase's own path wins (requests.md [owner1-world] frame.ts leg.drive).
    const given = leg('back', gate);
    (given.leg as unknown as { drive: { x: number; y: number }[]; driveT1: number }).drive = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    (given.leg as unknown as { driveT1: number }).driveT1 = 5;
    expect(A.tripLeg(content, given, line)).toEqual({ path: [1, 2, 3, 4], driveEnd: 5, face: -1 });
  });

  it('a leg first seen late is drawn from its start, its end date kept (no jump forward at a leg change)', () => {
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
