/**
 * The second update for the owner's phone, the world's side (label owner2-world, 26 November):
 * 1. THE ONE BUTTON GETS IN (ruling 18.4): ./motion.ts pressGetIn, the frame loop's reading of `enter`, on the
 *    slots of the loop's state the frame callback uses (st[0..3] the boss and the truck, st[5] the cab, st[35]
 *    the Step out waiting for the rules), with the rules' answer to the entering sample it sends.
 * 2. FEWER STATES WHILE HE STANDS: ./stick.ts presenceStep's pacing (ten a second steering, about three while
 *    still, at once on a change and when an act could start), counted over ten seconds standing, ten walking
 *    and a stop-go pattern; and on the rules: nothing a player does starts later than with the old ten a
 *    second by more than a tenth of a second (the work ring after standing still, the weigh, the hook at the
 *    farm), and how many new game states a second a standing boss makes before and after.
 * Frozen test content for the hand; the shipped content (read, never pinned) for the cab and the farm's site.
 */
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../../config/schema.salvage';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const F = await import('../../../engine/fixtures/salvage');
const R = await import('../../../engine/salvage');
const { setPresence, stepOut } = await import('../../../engine/salvage/actions');
const { startGame } = await import('../../../engine/salvage/bot');
const { begin, finish } = await import('../../../engine/salvage/clock');
const { pointOf, siteRect, thingPos } = await import('../../../engine/salvage/positions');
const { hand, standUntil, walkTo } = await import('../../../engine/salvage/play');
const { SAMPLE_MS, STAND_MS, presenceStep } = await import('./stick');
const { GET_IN_SLACK_M, pressGetIn } = await import('./motion');
const { rulesTable } = await import('./useRulesTable');
const { yardLayout } = await import('./yard');
type Game = import('../../../engine/salvage').SalvageGame;
type Cfg = import('../../../engine/salvage').SalvageConfig;

const TEST = F.SALVAGE_TEST;
const tcfg = { mode: 'salvage', salvage: TEST } as unknown as Cfg;
const RAW = JSON.parse(fs.readFileSync(new URL('../../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const gcfg = { mode: 'salvage', salvage: C } as unknown as Cfg;
const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const FRAME_MS = 1000 / 60;

/** The frame loop's standing period on a content (frameLoop.ts: min(STAND_MS, staleS / 2)). */
const standMsOf = (c: SalvageContent) => Math.min(STAND_MS, (c.feel.staleS * 1000) / 2);
/** The pacing before this update (stick.ts until 26 November): a sample every SAMPLE_MS, whatever he does. */
function oldStep(p: number[], dt: number, steering: boolean, nowMs: number): boolean {
  if (steering) p[0] = 0;
  else p[0] += dt;
  if (nowMs - p[1] >= SAMPLE_MS) {
    p[1] = nowMs;
    return true;
  }
  return false;
}
type Pace = (p: number[], dt: number, steering: boolean, nowMs: number) => boolean;
const newPace = (c: SalvageContent): Pace => (p, dt, steering, ms) => presenceStep(p, dt, steering, ms, standMsOf(c), c.feel.workDelay);

// ---------------------------------------------------------------------------------------------- 1. Get in
describe('item 1: the one button gets in (ruling 18.4)', () => {
  const park = pointOf(C, 'park');
  const T = C.truck;
  /** The loop's state after its own Step out at the park, as the frame callback leaves it: on foot beside the truck. */
  function afterStepOut(): Float64Array {
    const st = new Float64Array(40);
    st[2] = park.x;
    st[3] = park.y;
    // frameLoop.ts Step out: on the first free side at truckR + workerR + 0.25 from the truck.
    st[0] = park.x;
    st[1] = park.y + T.radius + C.worker.radius + 0.25;
    st[5] = 0;
    st[6] = 0;
    st[35] = 0;
    return st;
  }
  /** The rules' table for a yard whose truck stands free at the park (the boss on foot beside it, as the Step out leaves him). */
  function freeYard(): Game {
    const g = startGame(gcfg, NOW);
    const x = begin(gcfg, g, [], true);
    x.s.truck.owned = true;
    x.s.owned.push('truck');
    x.s.truck.x = park.x;
    x.s.truck.y = park.y;
    x.s.counts!['truck:out'] = 1;
    x.s.presence = { x: park.x, y: park.y + T.radius + C.worker.radius + 0.25, driving: false, moving: false, standingFor: 1, heading: 0 };
    x.s.presenceAt = x.s.t;
    return finish(g, x);
  }
  const yard = yardLayout(C);
  const tableOf = (g: Game) => rulesTable(yard, R.frame(gcfg, g), C, () => 1, 1).truck;

  it('the frame after Step out: beside the truck (door disarmed, inside enter) a press seats him; the rules seat him by the entering sample at the door', () => {
    const st = afterStepOut();
    const g = freeYard();
    const TR = tableOf(g);
    expect(TR[0]).toBe(1);
    expect(TR[5]).toBe(0);
    // The walk-in cannot: the door is disarmed (st[6] 0) and he does not steer.
    expect(st[6]).toBe(0);
    expect(pressGetIn(st, TR, true, T.enter)).toBe(true);
    expect(st[5]).toBe(1);
    // What the loop then sends (enterRules): one exact sample AT THE TRUCK'S PLACE with the cab flag.
    const ev: import('../../../engine/salvage').SalvageEvent[] = [];
    const g2 = setPresence(gcfg, g, { x: st[2], y: st[3], driving: true, moving: false, standingFor: 0, heading: 0 }, g.salvage.t, ev);
    expect(g2.salvage.truck.by).toBe('boss');
    expect(ev.some((e) => e.type === 'enterTruck')).toBe(true);
    expect(tableOf(g2)[5]).toBe(1);
  });

  it('works within enter + the slack of the drawn truck, and not a step beyond', () => {
    const TR = tableOf(freeYard());
    const at = (d: number) => {
      const st = afterStepOut();
      st[0] = st[2] + d;
      st[1] = st[3];
      return pressGetIn(st, TR, true, T.enter);
    };
    expect(at(T.enter)).toBe(true);
    expect(at(T.enter + GET_IN_SLACK_M - 0.01)).toBe(true);
    expect(at(T.enter + GET_IN_SLACK_M + 0.05)).toBe(false);
  });

  it('does nothing under an overlay, while a Step out waits for the rules, when he is in already, or when the truck is not free', () => {
    const TR = tableOf(freeYard());
    const tryWith = (change: (st: Float64Array, tr: number[]) => void, steer = true) => {
      const st = afterStepOut();
      const tr = [...TR];
      change(st, tr);
      const before = Array.from(st);
      const ok = pressGetIn(st, tr, steer, T.enter);
      return { ok, same: before.every((v, i) => Object.is(v, st[i])) };
    };
    // An overlay (the stick's switch off): no entering.
    expect(tryWith(() => {}, false)).toEqual({ ok: false, same: true });
    // The world's Step out still waiting for the rules' answer (1) or for a table that says so (2).
    expect(tryWith((st) => (st[35] = 1))).toEqual({ ok: false, same: true });
    expect(tryWith((st) => (st[35] = 2))).toEqual({ ok: false, same: true });
    // Already at the wheel in the world.
    expect(tryWith((st) => (st[5] = 1))).toEqual({ ok: false, same: true });
    // The rules have him seated already (the loop's "who sits in the cab" puts him in itself).
    expect(tryWith((_st, tr) => (tr[5] = 1))).toEqual({ ok: false, same: true });
    // The driver's, on a trip, not owned (on its way in).
    expect(tryWith((_st, tr) => (tr[5] = 2))).toEqual({ ok: false, same: true });
    expect(tryWith((_st, tr) => (tr[6] = 0))).toEqual({ ok: false, same: true });
    expect(tryWith((_st, tr) => (tr[0] = 0))).toEqual({ ok: false, same: true });
  });

  it('a whole round: in, Step out (the rules agree), the press at once, the rules seat him again; Step out again works', () => {
    let g = freeYard();
    const st = afterStepOut();
    expect(pressGetIn(st, tableOf(g), true, T.enter)).toBe(true);
    g = setPresence(gcfg, g, { x: st[2], y: st[3], driving: true, moving: false, standingFor: 0, heading: 0 }, g.salvage.t + 0.02);
    expect(g.salvage.truck.by).toBe('boss');
    // The world's Step out (stepOutRules): the exact at-the-wheel still sample, then stepOut at the truck's place.
    g = setPresence(gcfg, g, { x: st[2], y: st[3], driving: true, moving: false, standingFor: 0, heading: 0 }, g.salvage.t + 0.5);
    g = stepOut(gcfg, g, { x: st[2], y: st[3], heading: 0 }, g.salvage.t);
    expect(g.salvage.truck.by).toBe(null);
    // The frame of the Step out also sends the on-foot sample where the world set him down (st[5] changed: forced),
    // and enterRules sends any such waiting sample before the entering one.
    const st2 = afterStepOut();
    g = setPresence(gcfg, g, { x: st2[0], y: st2[1], driving: false, moving: false, standingFor: 0, heading: -1 as never }, g.salvage.t + 0.02);
    expect(pressGetIn(st2, tableOf(g), true, T.enter)).toBe(true);
    g = setPresence(gcfg, g, { x: st2[2], y: st2[3], driving: true, moving: false, standingFor: 0, heading: 0 }, g.salvage.t + 0.02);
    expect(g.salvage.truck.by).toBe('boss');
  });
});

// ---------------------------------------------------------------------------------------------- 2. pacing
/** Frames at 60 a second; `steer(f)` says whether the stick is held on frame f. Returns the frames that sent a sample. */
function frames(n: number, steer: (f: number) => boolean, pace: Pace, p = [0, 0, 0, 0]): { f: number; steering: boolean; standingFor: number }[] {
  const out: { f: number; steering: boolean; standingFor: number }[] = [];
  for (let f = 0; f < n; f++) {
    const s = steer(f);
    if (pace(p, FRAME_MS / 1000, s, f * FRAME_MS)) out.push({ f, steering: s, standingFor: p[0] });
  }
  return out;
}

describe('item 2: samples as the rules need them', () => {
  const pace = newPace(C);
  const maxGap = standMsOf(C);
  const stale = C.feel.staleS * 1000;

  it('ten seconds standing: about three a second, never a gap the rules would call stale (staleS / 2 at most)', () => {
    const S = frames(600, () => false, pace);
    const old = frames(600, () => false, (p, dt, s, ms) => oldStep(p, dt, s, ms));
    expect(old.length).toBeGreaterThanOrEqual(99);
    expect(S.length).toBeLessThanOrEqual(Math.ceil(10000 / maxGap) + 2);
    expect(S.length).toBeLessThan(old.length / 2.5);
    for (let i = 1; i < S.length; i++) expect((S[i].f - S[i - 1].f) * FRAME_MS).toBeLessThanOrEqual(maxGap + FRAME_MS + 1e-6);
    expect(maxGap).toBeLessThanOrEqual(stale / 2);
    // The frame his standing reaches workDelay sends one (an act that waits for it can start then).
    expect(S.some((s) => s.standingFor >= C.feel.workDelay && s.standingFor < C.feel.workDelay + FRAME_MS / 1000 + 1e-9)).toBe(true);
  });

  it('ten seconds walking: ten a second, as before', () => {
    const S = frames(600, () => true, pace);
    expect(S.length).toBeGreaterThanOrEqual(99);
    expect(S.length).toBeLessThanOrEqual(101);
  });

  it('stop and go (0.4 s steering, 0.6 s still, ten times): every start and every stop is sent on its own frame, no stand goes stale', () => {
    const steer = (f: number) => f % 60 < 24;
    const S = frames(600, steer, pace);
    for (let f = 1; f < 600; f++) if (steer(f) !== steer(f - 1)) expect(S.some((s) => s.f === f), `frame ${f}`).toBe(true);
    for (let i = 1; i < S.length; i++) expect((S[i].f - S[i - 1].f) * FRAME_MS).toBeLessThanOrEqual(maxGap + FRAME_MS + 1e-6);
    // Fewer than the old ten a second over the whole pattern (the stands are still), more than the steering alone.
    expect(S.length).toBeLessThan(100);
    expect(S.length).toBeGreaterThan(40);
  });
});

// ------------------------------------------------------------------------------------ 2. on the rules
interface Leg {
  to: { x: number; y: number };
  v: number;
}
/**
 * The screen and the rules together, frame by frame (60 a second): the body moves along the legs at their
 * speed, then stands; a sample goes whenever `pace` says (applied at once: the shell's sampleJS), a tick of
 * 0.1 s every sixth frame (App.tsx's 100 ms). Returns the yard second he stopped and the one `started` first
 * held (NaN: never), and the new game states the samples and the ticks made.
 */
function play(cfg: Cfg, g0: Game, now0: number, legs: Leg[], driving: boolean, started: (g: Game) => boolean, pace: Pace, offsetF = 0, maxS = 40) {
  let g = g0;
  const p = [0, 0, 0, 0];
  let x = g.salvage.presence.x;
  let y = g.salvage.presence.y;
  let li = 0;
  let stopT = NaN;
  let states = 0;
  let samples = 0;
  const heading = g.salvage.presence.heading ?? 0;
  for (let f = 0; f < maxS * 60; f++) {
    const ms = (f + offsetF) * FRAME_MS;
    let steering = false;
    if (li < legs.length) {
      const L = legs[li];
      const d = Math.hypot(L.to.x - x, L.to.y - y);
      const stepM = (L.v * FRAME_MS) / 1000;
      if (d <= stepM) {
        x = L.to.x;
        y = L.to.y;
        li++;
      } else {
        x += ((L.to.x - x) * stepM) / d;
        y += ((L.to.y - y) * stepM) / d;
      }
      steering = li < legs.length || d > stepM;
    }
    if (!steering && stopT !== stopT) stopT = g.salvage.t;
    if (pace(p, FRAME_MS / 1000, steering, ms)) {
      const n = setPresence(cfg, g, { x, y, driving, moving: steering, standingFor: steering ? 0 : p[0], heading }, g.salvage.t);
      if (n !== g) states++;
      samples++;
      g = n;
    }
    if ((f + offsetF) % 6 === 5) {
      const n = R.advanceSalvage(cfg, g, 0.1, now0 + ms);
      if (n !== g) states++;
      g = n;
    }
    if (stopT === stopT && started(g)) return { stopT, startT: g.salvage.act.since ?? g.salvage.t, g, states, samples };
  }
  return { stopT, startT: NaN, g, states, samples };
}

describe('item 2 on the rules: nothing starts later than with ten samples a second by more than a tenth of a second', () => {
  const fresh = (): Game => R.createSalvage(tcfg, { cash: 0, lifetimeEarnings: 0, lastSavedAt: F.FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: F.FIXTURE_NOW } } as never, F.FIXTURE_NOW);
  const besideThing = (g: Game, uid: string) => {
    const th = g.salvage.things.find((t) => t.uid === uid)!;
    const q = thingPos(TEST, th.at);
    return { x: q.x, y: q.y + TEST.objects[th.obj].size.d / 2 + 0.4 };
  };
  /** Both pacings at six phases of the sample grid against the stop; the new start never more than 0.1 s after the old one. */
  function compare(name: string, cfg: Cfg, g0: Game, now0: number, legs: Leg[], driving: boolean, started: (g: Game) => boolean) {
    const c = (cfg as unknown as { salvage: SalvageContent }).salvage;
    const rows: string[] = [];
    for (let off = 0; off < 6; off++) {
      const a = play(cfg, g0, now0, legs, driving, started, (p, dt, s, ms) => oldStep(p, dt, s, ms), off);
      const b = play(cfg, g0, now0, legs, driving, started, newPace(c), off);
      expect(a.startT, `${name}: the old pacing starts it (phase ${off})`).toBe(a.startT);
      expect(b.startT, `${name}: the new pacing starts it (phase ${off})`).toBe(b.startT);
      const da = a.startT - a.stopT;
      const db = b.startT - b.stopT;
      rows.push(`${da.toFixed(2)}->${db.toFixed(2)}`);
      expect(db, `${name} phase ${off}: old ${da.toFixed(3)} s, new ${db.toFixed(3)} s`).toBeLessThanOrEqual(da + 0.1 + 1e-9);
    }
    console.log(`[owner2-world] ${name}: yard seconds from the stop to the start, old->new at six phases: ${rows.join(' ')}`);
  }

  it('the work ring after standing still beside a thing', () => {
    const g = fresh();
    const w = besideThing(g, 'd0');
    compare('work', tcfg, g, F.FIXTURE_NOW, [{ to: w, v: TEST.walk }], false, (q) => q.salvage.act.kind === 'work');
  });

  it('the weigh at the scale with a load', () => {
    const h = hand(tcfg, fresh(), F.FIXTURE_NOW);
    const w = besideThing(h.g, 'd0');
    walkTo(h, w.x, w.y);
    standUntil(h, (q) => !q.salvage.things.some((t) => t.uid === 'd0'), 120);
    expect(h.g.salvage.load.length).toBeGreaterThan(0);
    const sc = pointOf(TEST, 'scale');
    compare('weigh', tcfg, h.g, h.now, [{ to: { x: sc.x, y: sc.y }, v: TEST.walk }], false, (q) => q.salvage.act.kind === 'weigh');
  });

  it("the hook at the farm's site, driven out from the gate", () => {
    const g = startGame(gcfg, NOW);
    const x = begin(gcfg, g, [], true);
    const gate = pointOf(C, 'gate');
    x.s.truck.owned = true;
    x.s.owned.push('truck');
    for (const p of Object.values(x.s.partners)) p.open = true;
    x.s.truck.by = 'boss';
    x.s.truck.x = gate.x + 2;
    x.s.truck.y = gate.y;
    x.s.presence = { x: gate.x + 2, y: gate.y, driving: true, moving: false, standingFor: 0, heading: 2 };
    x.s.presenceAt = x.s.t;
    x.s.act = { ...x.s.act, kind: 'drive', target: null, endsAt: null };
    const g0 = finish(g, x);
    const r = siteRect(C, 'partnerFarm', 1)!;
    const stop = { x: (r.x0 + r.x1) / 2, y: gate.y };
    compare('hook', gcfg, g0, NOW, [{ to: stop, v: C.truck.bossV ?? C.truck.v }], true, (q) => q.salvage.act.kind === 'hook');
  });
});

describe('item 2, measured: new game states a second while the boss stands still (samples and ticks)', () => {
  it('at the played m30 (test content): before and after', () => {
    const p = F.playedOn(tcfg);
    const g0 = structuredClone(p.games.m30) as Game;
    const here = g0.salvage.presence;
    const legs = [{ to: { x: here.x, y: here.y }, v: TEST.walk }];
    const never = () => false;
    const a = play(tcfg, g0, p.now.m30, legs, false, never, (q, dt, s, ms) => oldStep(q, dt, s, ms), 0, 10);
    const b = play(tcfg, g0, p.now.m30, legs, false, never, newPace(TEST), 0, 10);
    console.log(`[owner2-world] standing 10 s at m30: samples ${a.samples} -> ${b.samples}, new states ${a.states} -> ${b.states} (${(a.states / 10).toFixed(1)}/s -> ${(b.states / 10).toFixed(1)}/s)`);
    expect(b.samples).toBeLessThan(a.samples / 2.5);
    expect(b.states).toBeLessThan(a.states);
  });
});
