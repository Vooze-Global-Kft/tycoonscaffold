/**
 * The hints' rules without a screen (yard-stage1.md 1.2, 2.10, 4.4 item 5, 5.3): goals.json is well
 * formed and agrees with the contract (keys, targets, the done grammar, purchases, the stand-ins in code);
 * the chevron rests while the boss is on the way; one gentle escalation per stalled goal; the ghost
 * thumb goes when the thumb lands; the first Open at a place rings once; a held-back purchase goal waits
 * visibly; lessons in the first minutes only on value jumps. Frozen test content only: no tuned number.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GoalSchema } from '../../../config/schema.salvage';
import { FIXTURE_NOW, SALVAGE_TEST, fixtureGame } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { TEXT_KEYS } from '../../../engine/salvage/types';
import type { GameState } from '../../../engine/types';
import { isValueJump, lessonFor, lessonPaced } from './lessons';
import { GOAL_HINTS_FALLBACK, HintTracker, STALL_KINDS, chevronShows, dragDir, ghostHome, goalHint, promptWait, stallForm, type HintSample } from './rules';
import { TEACH_FALLBACK, teachOf } from './teach';

const FILE = join(__dirname, '../../../../scripts/content/yard/goals.json');
const json = JSON.parse(readFileSync(FILE, 'utf8')) as {
  goals: Record<string, unknown>[];
  dayOne: Record<string, unknown>[];
  teach: Record<string, number>;
};
const cfg = { salvage: SALVAGE_TEST } as unknown as R.SalvageConfig;
const base = { cash: 0, stats: { playSeconds: 0 } } as unknown as GameState;
const T = TEACH_FALLBACK;

const DONE = [
  /^cut:[a-z]+:\d+$/,
  /^weighIns:\d+$/,
  /^weighed:[a-z0-9]+$/,
  /^made:[a-z0-9]+$/,
  /^worked:(hand_stripper|stripper|bench|crucible):\d+$/,
  /^owned:[a-z0-9]+$/,
  /^hired:(hand|cutter|driver):\d+$/,
  /^crewWeighIns:(hand|cutter|driver):\d+$/,
  /^fetched:(partnerFarm|partnerDemolition):\d+$/,
  /^rung:\d+$/,
  /^deal:signed$/,
  /^deal:done:\d+$/,
  /^charged:crucible$/,
  /^poured:\d+$/,
  /^passed:\d+$/,
  /^visited:[A-Za-z0-9_]+$/,
  /^away:\d+$/,
  /^repeat$/,
];
const goalKeys = new Set<string>(TEXT_KEYS.goal as readonly string[]);
const points = new Set(Object.keys(SALVAGE_TEST.map.points));
const shopKeys = new Set([...SALVAGE_TEST.shop, ...(((SALVAGE_TEST as unknown as { dayOneList?: { key: string }[] }).dayOneList) ?? [])].map((s) => s.key));

describe('goals.json (5.3, 1.3, 1.4): data the rules read, no words', () => {
  const all = [...json.goals, ...json.dayOne];
  it('every goal parses with the contract schema and has a unique id', () => {
    for (const d of all) expect(() => GoalSchema.parse(d)).not.toThrow();
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
  });
  it('text keys are goal.* keys of the contract; targets are map points, truck, advice or none', () => {
    for (const d of all) {
      expect(goalKeys.has(d.text as string), `${d.id}: ${d.text}`).toBe(true);
      for (const t of [d.target, d.via]) if (t !== null) expect(points.has(t as string) || t === 'truck' || t === 'advice', `${d.id}: ${t}`).toBe(true);
    }
  });
  it('every done condition (and dayOne `after`) is in the grammar; purchases are shop keys and done once owned', () => {
    for (const d of all) {
      expect(DONE.some((re) => re.test(d.done as string)), `${d.id}: ${d.done}`).toBe(true);
      if (d.after) expect(DONE.some((re) => re.test(d.after as string)), `${d.id}: ${d.after}`).toBe(true);
      if (d.buy) {
        expect(shopKeys.has(d.buy as string), `${d.id}: ${d.buy}`).toBe(true);
        // a purchase goal's done is the purchase (owned/hired), never something that could come by itself
        expect(/^(owned|hired):/.test(d.done as string), `${d.id}: ${d.done}`).toBe(true);
      }
      if (d.stall !== null) expect((STALL_KINDS as readonly string[]).includes(d.stall as string)).toBe(true);
    }
  });
  it('no words: every string field is an id, a key, a condition or null', () => {
    for (const d of all) for (const v of Object.values(d)) if (typeof v === 'string') expect(v).not.toMatch(/\s/);
  });
  it('the storyboard opening and the lead\'s order (E28, R20) hold, as data', () => {
    const ids = json.goals.map((d) => d.id as string);
    expect(ids.slice(0, 8)).toEqual(['takeWasher', 'weighIt', 'stripCable', 'weighCopper', 'buySack', 'takeAWasher', 'hireHand', 'workDropoff']);
    const at = (id: string) => ids.indexOf(id);
    expect(json.goals.find((d) => d.buy)?.id).toBe('buySack'); // the first prompt (S8)
    expect(at('buyTorch')).toBeGreaterThan(at('buyTruck'));
    for (const later of ['buyStripper', 'buyBench', 'buyCrucible']) expect(at(later)).toBeGreaterThan(at('buyTorch'));
    expect(at('pourFirst')).toBeLessThan(at('widen'));
    expect(ids[ids.length - 1]).toBe('supplyRung3');
    const day = json.dayOne.map((d) => d.id);
    for (const id of ['hireHand2', 'buyAlu', 'buyNight', 'hireCutter2']) expect(day).toContain(id);
    expect(json.dayOne.find((d) => d.id === 'buyNight')?.after).toBe('away:1');
  });
  it('the stand-ins in code are copies of the file (teach, via and stall)', () => {
    expect(json.teach).toEqual(TEACH_FALLBACK);
    for (const d of [...json.goals, ...json.dayOne]) {
      const h = goalHint({ id: d.id as string, target: d.target as string | null });
      expect({ id: d.id, via: h.via, stall: h.stall }).toEqual({ id: d.id, via: d.via ?? null, stall: d.stall ?? null });
    }
    for (const id of Object.keys(GOAL_HINTS_FALLBACK)) expect(all.some((d) => d.id === id)).toBe(true);
  });
  it('teachOf takes the content\'s numbers when it has them', () => {
    const c2 = { salvage: { ...SALVAGE_TEST, teach: { stallS: 12 } } } as unknown as R.SalvageConfig;
    expect(teachOf(c2).stallS).toBe(12);
    expect(teachOf(c2).nudgeS).toBe(T.nudgeS);
    expect(teachOf(cfg)).toEqual(TEACH_FALLBACK);
  });
});

describe('the chevron rests while the boss is on the way (4.2)', () => {
  const base0 = { sinceGoal: 30, dist: 12, moving: false, standingFor: 0, approaching: false, wanderingFor: 0 };
  it('a new goal shows it for a moment', () => {
    expect(chevronShows(T, { ...base0, sinceGoal: 0.5, moving: true, approaching: true })).toBe(true);
  });
  it('walking towards the target, or standing at it, rests it', () => {
    expect(chevronShows(T, { ...base0, moving: true, approaching: true })).toBe(false);
    expect(chevronShows(T, { ...base0, dist: 1, standingFor: 60 })).toBe(false);
  });
  it('standing away from it a while, or wandering, shows it', () => {
    expect(chevronShows(T, { ...base0, standingFor: T.chevronIdleS - 0.1 })).toBe(false);
    expect(chevronShows(T, { ...base0, standingFor: T.chevronIdleS })).toBe(true);
    expect(chevronShows(T, { ...base0, moving: true, wanderingFor: T.approachS })).toBe(true);
  });
  it('no target, no chevron', () => {
    expect(chevronShows(T, { ...base0, dist: null, sinceGoal: 0 })).toBe(false);
  });
});

function sample(over: Partial<HintSample>): HintSample {
  return { now: 0, gateOpen: true, goalId: 'takeWasher', target: 'dropoff', stall: 'stand', buy: null, dist: 3, moving: false, standingFor: 0, driving: false, overlay: false, stickUsed: true, place: null, ...over };
}

describe('the tracker: ghost thumb, one gentle escalation, the first Open', () => {
  it('the ghost thumb shows from just after the gate until the thumb lands', () => {
    const tr = new HintTracker(T);
    expect(tr.update(sample({ now: 0, gateOpen: false, stickUsed: false })).ghost).toBe('off');
    expect(tr.update(sample({ now: T.ghostDelayS, stickUsed: false })).ghost).toBe('intro');
    expect(tr.update(sample({ now: T.ghostDelayS + 1, stickUsed: true })).ghost).toBe('off');
  });
  it('twenty seconds without progress play the goal\'s escalation once, for nudgeS, never under a card', () => {
    const tr = new HintTracker(T);
    tr.update(sample({ now: 0, dist: 8 }));
    expect(tr.update(sample({ now: T.stallS - 0.5, dist: 8 })).nudge).toBe(null);
    const v = tr.update(sample({ now: T.stallS, dist: 8 }));
    expect(v.nudge).toBe('ghost'); // 'stand' far from the washer becomes a drag towards it
    expect(v.ghost).toBe('drag');
    expect(v.chevron).toBe(true);
    expect(tr.update(sample({ now: T.stallS + T.nudgeS - 0.1, dist: 8 })).nudge).toBe('ghost');
    expect(tr.update(sample({ now: T.stallS + T.nudgeS, dist: 8 })).nudge).toBe(null);
    // once per goal
    expect(tr.update(sample({ now: 3 * T.stallS, dist: 8 })).nudge).toBe(null);
    // a new goal re-arms it
    tr.update(sample({ now: 100, goalId: 'weighIt', stall: 'ghost', dist: 6 }));
    expect(tr.update(sample({ now: 100 + T.stallS, goalId: 'weighIt', stall: 'ghost', dist: 6 })).nudge).toBe('ghost');
  });
  it('progress (an event, or coming nearer) puts the stall off; a card open is reading, not stalling', () => {
    const tr = new HintTracker(T);
    tr.update(sample({ now: 0, dist: 8 }));
    tr.progress(15);
    expect(tr.update(sample({ now: T.stallS + 1, dist: 8 })).nudge).toBe(null);
    tr.update(sample({ now: 30, dist: 4 })); // nearer by more than approachM
    expect(tr.update(sample({ now: 30 + T.stallS - 1, dist: 4 })).nudge).toBe(null);
    const t2 = new HintTracker(T);
    t2.update(sample({ now: 0 }));
    for (let s = 1; s <= 40; s++) expect(t2.update(sample({ now: s, overlay: true })).nudge).toBe(null);
  });
  it('the first Open at each place rings the one button once', () => {
    const tr = new HintTracker(T);
    tr.update(sample({ now: 0 }));
    expect(tr.update(sample({ now: 1, place: 'rack' })).openRing).toBe(true);
    expect(tr.update(sample({ now: 1 + T.openPulseS, place: 'rack' })).openRing).toBe(false);
    tr.update(sample({ now: 9, place: null }));
    expect(tr.update(sample({ now: 10, place: 'rack' })).openRing).toBe(false);
    expect(tr.update(sample({ now: 11, place: 'office' })).openRing).toBe(true);
    expect(tr.update(sample({ now: 12, place: 'office', overlay: true })).openRing).toBe(false);
  });
  it('the escalation\'s form follows where the boss is', () => {
    expect(stallForm(T, 'stand', { dist: 10, place: null, target: 'dropoff', driving: false })).toBe('ghost');
    expect(stallForm(T, 'stand', { dist: 1, place: null, target: 'dropoff', driving: false })).toBe('stand');
    expect(stallForm(T, 'ghost', { dist: 1, place: null, target: 'scale', driving: false })).toBe('stand');
    expect(stallForm(T, 'open', { dist: 0.5, place: 'rack', target: 'rack', driving: false })).toBe('open');
    expect(stallForm(T, 'open', { dist: 9, place: null, target: 'rack', driving: false })).toBe('ghost');
    expect(stallForm(T, 'ghost', { dist: null, place: null, target: null, driving: false })).toBe('goal');
  });
});

describe('the ghost thumb drags inside the stick zone, towards the target', () => {
  it('home inside the knob\'s reach; direction a unit vector', () => {
    const z = { minX: 123, maxX: 300, minY: 200, maxY: 320 };
    const h = ghostHome(z);
    expect(h.x).toBeGreaterThanOrEqual(z.minX);
    expect(h.x).toBeLessThanOrEqual(z.maxX);
    expect(h.y).toBeGreaterThanOrEqual(z.minY);
    expect(h.y).toBeLessThanOrEqual(z.maxY);
    const d = dragDir({ x: 0, y: 0 }, { x: -3, y: 4 });
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(1);
    expect(d.dx).toBeLessThan(0);
  });
});

describe('a purchase goal the rules hold back waits visibly (2.10)', () => {
  const g0 = fixtureGame('fresh', base, FIXTURE_NOW) as R.SalvageGame;
  const i = SALVAGE_TEST.goals.findIndex((d) => d.buy);
  const def = SALVAGE_TEST.goals[i];
  const gap = SALVAGE_TEST.advice.promptGapS;
  const done = SALVAGE_TEST.goals.slice(0, i).map((d) => d.id);
  const held = { ...g0, salvage: { ...g0.salvage, t: 100, goals: { ...g0.salvage.goals, done, at: i, lastPromptAt: 100 - gap / 4 } } } as unknown as R.SalvageGame;
  it('shown with the time left when the card shows something else', () => {
    const w = promptWait(cfg, held, null);
    expect(w?.id).toBe(def.id);
    expect(w?.left).toBeCloseTo((3 * gap) / 4);
    expect(w?.share).toBeCloseTo(0.25);
  });
  it('nothing waits once the rules show it, after the gap, or when it is owned', () => {
    expect(promptWait(cfg, held, { n: i, id: def.id, text: { key: def.text as R.TextKey }, target: def.target, progress: null, buy: def.buy as R.ShopKey } as unknown as R.Goal)).toBe(null);
    const late = { ...held, salvage: { ...held.salvage, goals: { ...held.salvage.goals, lastPromptAt: 100 - gap } } } as R.SalvageGame;
    expect(promptWait(cfg, late, null)).toBe(null);
    const owned = { ...held, salvage: { ...held.salvage, owned: [...held.salvage.owned, def.buy as R.ShopKey] } } as R.SalvageGame;
    expect(promptWait(cfg, owned, null)).toBe(null);
  });
});

describe('lessons in the first minutes only on value jumps (4.4 item 5)', () => {
  const lessons = SALVAGE_TEST.lessons as Record<string, string>;
  const grades = Object.keys(lessons).filter((k) => (SALVAGE_TEST.grades[k]?.pbar ?? 0) > 0).sort((a, b) => SALVAGE_TEST.grades[a].pbar - SALVAGE_TEST.grades[b].pbar);
  const cheap = grades[0];
  const dear = grades[grades.length - 1];
  const w = (no: number, at: number, grade: string, lesson: string | null = null): R.Ticket =>
    ({ no, at, day: 0, kind: 'weighIn', by: 'boss', lines: [{ grade, g: 1000, price: 1, amount: 1 }], todaysValue: 1, lesson }) as unknown as R.Ticket;
  it('the test content has a value jump to test with', () => {
    expect(SALVAGE_TEST.grades[dear].pbar).toBeGreaterThanOrEqual(T.jumpRatio * SALVAGE_TEST.grades[cheap].pbar);
  });
  it('first ticket of a cheap grade in the quiet minutes: no lesson; the dear grade after it: its lesson', () => {
    const t1 = w(1, 10, cheap);
    const t2 = w(2, 40, dear);
    expect(lessonPaced(cfg, t1, [])).toBe(null);
    expect(isValueJump(cfg, dear, [t1])).toBe(true);
    expect(lessonPaced(cfg, t2, [t1])?.key).toBe(lessons[dear]);
  });
  it('the held-back lesson prints on the grade\'s first weigh-in after the quiet minutes, then never again', () => {
    const t1 = w(1, 10, cheap);
    const t2 = w(2, 40, dear);
    const t3 = w(3, T.lessonQuietS + 5, cheap);
    const t4 = w(4, T.lessonQuietS + 50, cheap);
    expect(lessonPaced(cfg, t3, [t1, t2])?.key).toBe(lessons[cheap]);
    expect(lessonPaced(cfg, t4, [t1, t2, t3])).toBe(null);
    expect(lessonPaced(cfg, w(5, T.lessonQuietS + 60, dear), [t1, t2, t3, t4])).toBe(null);
  });
  it('lessonFor prints the rules\' lesson, and holds one back in the quiet minutes if it is no jump', () => {
    const g0 = fixtureGame('fresh', base, FIXTURE_NOW) as R.SalvageGame;
    const t1 = w(1, 10, cheap, lessons[cheap]);
    const g1 = { ...g0, salvage: { ...g0.salvage, tickets: [t1] } } as R.SalvageGame;
    expect(lessonFor(cfg, g1, t1)).toBe(null);
    const t2 = w(2, 40, dear, lessons[dear]);
    const g2 = { ...g0, salvage: { ...g0.salvage, tickets: [t1, t2] } } as R.SalvageGame;
    expect(lessonFor(cfg, g2, t2)).toBe(lessons[dear]);
    expect(lessonFor(cfg, g2, w(3, 50, dear, null))).toBe(null);
  });
});
