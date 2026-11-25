/**
 * The hud's rules that can be checked without a screen (yard-stage1.md 4.1, 4.4, 4.6, 7): rows and slots
 * add up at both reference phones; bar text never goes under 11 pt and fits its slot at font scale 1.3;
 * tickets stay within 150 pt and three rows; the event pump hands typed events to subscribers and plays
 * their sounds and segments; toasts by key. Runs on the frozen test content and states.
 */
import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import type { GameState } from '../../../engine/types';
import { createPump, type PumpEffects } from './pump';
import { avoidRect, cashCoinPoint, fitText, hudLayout, MIN_PT, pickForm, placeTicket, textW, ticketHeight } from './metrics';
import { crewWeighInChip, lotSoldChip, MAX_ROWS, planTicket, ticketView } from './ticketView';
import { toastText } from './words';
import { barValues, carryText, goalValues, ladderForms } from './words';

const cfg = { salvage: SALVAGE_TEST } as unknown as R.SalvageConfig;
const c = SALVAGE_TEST;
const base = { cash: 0, stats: { playSeconds: 0 } } as unknown as GameState;
const game = (n: 'fresh' | 'm5' | 'm30' | 'back') => fixtureGame(n, base, FIXTURE_NOW);

const PHONES = [
  { w: 844, h: 390, i: { top: 0, left: 47, right: 47, bottom: 21 }, rows: { bar: 36, goal: 28, free: 237, bottom: 89 }, slots: { cash: 136, ladder: 408, carry: 90, clip: 44, gap: 24 }, safeW: 750 },
  { w: 667, h: 375, i: { top: 0, left: 0, right: 0, bottom: 0 }, rows: { bar: 34, goal: 26, free: 239, bottom: 76 }, slots: { cash: 116, ladder: 340, carry: 90, clip: 44, gap: 15 }, safeW: 635 },
];

describe('4.1: the rows and the top bar add up', () => {
  for (const p of PHONES) {
    it(`${p.w} x ${p.h}`, () => {
      for (const fs of [1, 1.3, 2]) {
        const L = hudLayout(p.w, p.h, p.i, fs);
        expect(L.rows).toEqual(p.rows);
        expect(L.rows.bar + L.rows.goal + L.rows.free + L.rows.bottom + L.top).toBe(p.h);
        expect(L.safeW).toBe(p.safeW);
        expect(L.slots).toEqual(p.slots);
        const s = L.slots;
        expect(s.cash + s.ladder + s.carry + s.clip + 3 * s.gap).toBe(L.safeW);
        // the one button sits in the bottom row, inside the safe area
        expect(L.button.y).toBeGreaterThanOrEqual(L.bottomY);
        expect(L.button.y + L.button.size).toBeLessThanOrEqual(p.h - p.i.bottom);
        expect(L.button.x + L.button.size).toBeLessThanOrEqual(p.w - Math.max(16, p.i.right));
        expect(L.s).toBeLessThanOrEqual(1.3);
      }
    });
  }
  it('both landscape directions: the insets swap and the bar stays inside them', () => {
    const a = hudLayout(844, 390, { top: 0, left: 59, right: 0, bottom: 21 });
    const b = hudLayout(844, 390, { top: 0, left: 0, right: 59, bottom: 21 });
    expect(a.left).toBe(59);
    expect(b.right).toBe(844 - 59);
    expect(a.safeW).toBe(b.safeW);
    expect(cashCoinPoint(a).x).toBeGreaterThan(59);
  });
});

describe('bar text fits at font scale 1.3, never under 11 pt', () => {
  for (const p of PHONES) {
    for (const name of ['fresh', 'm5', 'm30', 'back'] as const) {
      it(`${p.w}: ${name}`, () => {
        const L = hudLayout(p.w, p.h, p.i, 1.3);
        const v = barValues(cfg, game(name));
        expect(v.ok).toBe(true);
        const forms = ladderForms(v, c);
        const pick = pickForm(forms, L.slots.ladder - 40, L.rows.bar - 6, L.s);
        expect(pick.fit.cut).toBe(false);
        expect(pick.fit.pt).toBeGreaterThanOrEqual(MIN_PT);
        expect(textW(forms[pick.index], pick.fit.pt)).toBeLessThanOrEqual(L.slots.ladder - 40);
        const carry = fitText(carryText(v, c), L.slots.carry - 12, L.rows.bar - 4 - 3, 12, L.s, true);
        expect(carry.cut).toBe(false);
        expect(carry.pt).toBeGreaterThanOrEqual(MIN_PT);
      });
    }
  }
  it('"Trial load 400 kg" fits the 90 pt carry chip on two lines at 1.3', () => {
    const t = carryText({ ...barValues(cfg, game('m30')), driving: true, trial: true, net_g: 400_000 }, c);
    expect(t).toContain('400');
    const f = fitText(t, 90 - 12, 34 - 4 - 3, 12, 1.3, true);
    expect(f.cut).toBe(false);
  });
  it('the long form is chosen at scale 1 on the wide phone when it fits', () => {
    const L = hudLayout(844, 390, PHONES[0].i, 1);
    const v = barValues(cfg, game('fresh'));
    const forms = ladderForms(v, c);
    if (forms.length === 3 && textW(forms[0], 12) <= L.slots.ladder - 40) expect(pickForm(forms, L.slots.ladder - 40, 28, 1).index).toBe(0);
  });
});

describe('the goal card', () => {
  it('shows the first goal in words, with a next line from the goal list', () => {
    const v = goalValues(cfg, game('fresh'), FIXTURE_NOW);
    expect(v.goal).toBeTruthy();
    expect(v.goal!.length).toBeLessThanOrEqual(30);
    expect(v.goal).not.toMatch(/\{/);
  });
});

/** A weigh-in of every grade of the content, longest names first, at today's prices. */
function bigTickets(n: number, lesson: boolean) {
  const grades = Object.keys(c.grades)
    .sort((a, b) => c.grades[b].name.length - c.grades[a].name.length)
    .slice(0, n);
  const lines = grades.map((grade) => ({ grade, g: 288_600, price: 1234.5, amount: 356_000 }));
  const key = lesson ? (Object.values(c.lessons)[0] as R.TextKey) : null;
  const w: R.Ticket = { kind: 'weighIn', no: 12, at: 0, day: 0, by: 'boss', lines, todaysValue: 1_234_567, lessonText: key ? { key } : null, lesson: key };
  const col: R.Ticket = { kind: 'collection', no: 13, at: 0, day: 0, buyer: 'merchant', lines, paid: 1_234_567, withBoss: true, firstGrades: [] };
  return { w, col };
}

describe('4.4: tickets', () => {
  for (const p of PHONES) {
    it(`${p.w}: at most three rows and at most 150 pt at 1.3, whatever the grades`, () => {
      const L = hudLayout(p.w, p.h, p.i, 1.3);
      for (const n of [1, 3, 6]) {
        for (const lesson of [false, true]) {
          const { w, col } = bigTickets(n, lesson);
          for (const t of [w, col]) {
            const v = ticketView(t, c)!;
            const plan = planTicket(v, L.ticketW, L.s, c);
            expect(plan.rows.length).toBeLessThanOrEqual(MAX_ROWS);
            expect(plan.height).toBeLessThanOrEqual(150);
            const hidden = v.rows.length - plan.rows.length;
            if (hidden > 0) expect(plan.more).toContain(String(hidden));
            else expect(plan.more).toBeNull();
          }
        }
      }
    });
  }
  it('a weigh-in carries no payment: today\'s value, the price a kilo, the legal line', () => {
    const { w } = bigTickets(2, true);
    const v = ticketView(w, c)!;
    expect(v.kind).toBe('weighIn');
    expect(v.total).toContain(R.fmtMoney(1_234_567));
    expect(v.rows[0].right).toContain(R.fmtPrice(1234.5));
    expect(v.legal).toHaveLength(1);
    expect(v.lesson).toBeTruthy();
    expect(v.lesson!.length).toBeLessThanOrEqual(48);
  });
  it('a collection names its buyer and prints Paid', () => {
    const { col } = bigTickets(2, false);
    const v = ticketView(col, c)!;
    expect(v.total).toContain(R.fmtMoney(1_234_567));
    expect(v.legal[0]).toContain(c.names.merchant ?? 'merchant');
    expect(v.legal).toHaveLength(2);
    expect(lotSoldChip(col, c)).toContain(R.fmtMoney(1_234_567));
  });
  it('a crew weigh-in is one chip naming the role', () => {
    const { w } = bigTickets(2, false);
    const chip = crewWeighInChip({ ...(w as Extract<R.Ticket, { kind: 'weighIn' }>), by: 'hand.0' }, c)!;
    expect(chip).toMatch(/kg/);
    expect(chip).not.toMatch(/\{/);
  });
  it('a ticket is placed inside the free world and the safe area', () => {
    const L = hudLayout(667, 375, PHONES[1].i, 1.3);
    for (const [ax, ay] of [
      [-500, -500],
      [2000, 2000],
      [300, 200],
    ]) {
      const q = placeTicket(ax, ay, L.ticketW, 140, L);
      expect(q.x).toBeGreaterThanOrEqual(L.left);
      expect(q.x + L.ticketW).toBeLessThanOrEqual(L.right);
      expect(q.y).toBeGreaterThanOrEqual(L.freeY);
      expect(q.y + 140).toBeLessThanOrEqual(L.bottomY);
    }
  });
  it('the cab\'s ticket moves off the scale\'s when both clamp to one edge', () => {
    for (const p of PHONES) {
      const L = hudLayout(p.w, p.h, p.i, 1.3);
      const a = placeTicket(5000, 200, L.ticketW, 120, L);
      const b0 = placeTicket(5000, 210, L.ticketW, 130, L);
      const b = avoidRect(b0.x, b0.y, L.ticketW, 130, { x: a.x, y: a.y, w: L.ticketW, h: 120 }, L);
      const apart = b.x + L.ticketW <= a.x || b.x >= a.x + L.ticketW || b.y + 130 <= a.y || b.y >= a.y + 120;
      expect(apart).toBe(true);
      expect(b.x).toBeGreaterThanOrEqual(L.left);
      expect(b.x + L.ticketW).toBeLessThanOrEqual(L.right);
    }
  });
  it('ticket heights grow with rows', () => {
    expect(ticketHeight('weighIn', 3, true, 1.3)).toBeGreaterThan(ticketHeight('weighIn', 1, false, 1.3));
  });
});

describe('toasts by key', () => {
  it('"Load full" and a refusal (none while a card is open)', () => {
    expect(toastText({ type: 'loadFull' }, c, false)?.text).toBe('Load full');
    const r = toastText({ type: 'refused', key: 'cash', args: { x: { money: 12 } }, retry: null }, c, false);
    expect(r?.text).toContain(R.fmtMoney(12));
    expect(r?.refusal).toBe(true);
    expect(toastText({ type: 'refused', key: 'cash', args: { x: { money: 12 } }, retry: null }, c, true)).toBeNull();
  });
});

function fakeFx() {
  let t = 0;
  const timers: { at: number; fn: () => void; id: number }[] = [];
  let id = 0;
  const played: { key: string; at: number; opts: unknown }[] = [];
  const volumes: number[] = [];
  const fx: PumpEffects = {
    play: (key, opts) => played.push({ key, at: t, opts }),
    musicVolume: (v) => volumes.push(v),
    now: () => t,
    setTimeout: (fn, ms) => {
      const x = { at: t + ms, fn, id: ++id };
      timers.push(x);
      return x.id;
    },
    clearTimeout: (h) => {
      const i = timers.findIndex((x) => x.id === h);
      if (i >= 0) timers.splice(i, 1);
    },
    report: vi.fn(),
  };
  const advance = (ms: number) => {
    const end = t + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers.shift();
      t = next.at;
      next.fn();
    }
    t = end;
  };
  return { fx, played, volumes, advance };
}

describe('the event pump', () => {
  it('hands typed events to their subscribers in order, and batches to batch listeners', () => {
    const { fx } = fakeFx();
    const p = createPump(fx);
    const got: string[] = [];
    const off = p.on(['weighIn', 'collected'], (e) => got.push(e.type));
    const batches: number[] = [];
    p.onBatch((b) => batches.push(b.length));
    p.dispatch([{ type: 'loadFull' }, { type: 'weighIn', ticket: bigTickets(1, false).w, pieces: [], by: 'boss' }, { type: 'collected', ticket: bigTickets(1, false).col, first: false }]);
    expect(got).toEqual(['weighIn', 'collected']);
    expect(batches).toEqual([3]);
    off();
    p.dispatch([{ type: 'weighIn', ticket: bigTickets(1, false).w, pieces: [], by: 'boss' }]);
    expect(got).toHaveLength(2);
  });
  it('a listener that throws is reported and the others still run', () => {
    const { fx } = fakeFx();
    const p = createPump(fx);
    let ran = false;
    p.on('loadFull', () => {
      throw new Error('x');
    });
    p.on('loadFull', () => (ran = true));
    p.dispatch([{ type: 'loadFull' }, 'junk', null]);
    expect(ran).toBe(true);
    expect(fx.report).toHaveBeenCalled();
  });
  it('plays the sound table\'s cues while live, delayed ones later, and ducks the music', () => {
    const { fx, played, volumes, advance } = fakeFx();
    const p = createPump(fx);
    p.setLive(true);
    played.length = 0;
    p.dispatch([{ type: 'weighIn', ticket: bigTickets(1, false).w, pieces: [], by: 'boss' }]);
    expect(played.map((x) => x.key)).toContain('scale_beeps');
    expect(played.map((x) => x.key)).not.toContain('scale_print');
    advance(500);
    expect(played.map((x) => x.key)).toContain('scale_print');
    expect(volumes[0]).toBeLessThan(1);
    advance(3000);
    expect(volumes[volumes.length - 1]).toBe(1);
  });
  it('is silent while not live, and the ambience runs while live', () => {
    const { fx, played, advance } = fakeFx();
    const p = createPump(fx);
    p.dispatch([{ type: 'loadFull' }]);
    expect(played).toHaveLength(0);
    p.setLive(true);
    expect(p.segments()).toContain('amb_yard');
    advance(15000);
    expect(played.filter((x) => x.key === 'amb_yard').length).toBeGreaterThanOrEqual(3);
    p.setLive(false);
    const n = played.length;
    advance(20000);
    expect(played.length).toBe(n);
  });
  it('runs the work segment from workStart to workStop, a machine while it works, the diesel from the world', () => {
    const { fx, played, advance } = fakeFx();
    const p = createPump(fx);
    p.setLive(true);
    p.dispatch([{ type: 'workStart', thing: 't1', obj: 'washer', tool: 'spanners', by: 'boss' }]);
    expect(p.segments()).toContain('cut_spanner');
    advance(1600);
    expect(played.filter((x) => x.key === 'cut_spanner').length).toBeGreaterThanOrEqual(3);
    p.dispatch([{ type: 'workStop', thing: 't1', by: 'boss' }]);
    expect(p.segments()).not.toContain('cut_spanner');
    p.dispatch([{ type: 'machineState', machine: 'stripper', status: 'working' }]);
    expect(p.segments()).toContain('stripper_power');
    p.dispatch([{ type: 'machineState', machine: 'stripper', status: 'trayFull' }]);
    expect(p.segments()).not.toContain('stripper_power');
    p.dispatch([{ type: 'heatStart', recipe: 'brass', g: 10_000 }]);
    expect(p.segments()).toContain('furnace_roar');
    p.dispatch([{ type: 'readyToPour' }]);
    expect(p.segments()).not.toContain('furnace_roar');
    p.truck(0.9);
    expect(p.segments()).toContain('truck_diesel');
    expect(played[played.length - 1]).toMatchObject({ key: 'truck_diesel', opts: { step: 2 } });
    p.truck(null);
    expect(p.segments()).not.toContain('truck_diesel');
    played.length = 0;
    p.step('gravel');
    expect(played[0].key).toBe('step_gravel');
  });
});
