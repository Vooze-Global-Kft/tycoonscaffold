/**
 * When a player who has left is reminded (src/engine/reminders.ts): the moment the game stops
 * earning while away, once more three days on, never at night, and nothing at all for a game that
 * was barely played or earns nothing on its own.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { buildPreset } from '../dev/presets.web';
import * as E from './economy';
import { haulFixtures, haulTestConfig } from './fixtures/haul';
import { mergeFixtures, mergeTestConfig } from './fixtures/merge';
import { haulEngineMode } from './haulMode';
import * as R from './merge';
import { mergeEngineMode } from './mergeMode';
import { installEngineMode } from './mode';
import { REMINDER_RULES, awayCapSeconds, daytime, remindersFor } from './reminders';

const cfg = GameConfigSchema.parse(pizza);
const HOUR = 3600_000;
/** A local time on a fixed day (the rules read the device's own clock, so the tests build local times). */
const at = (hour: number, minute = 0, day = 23) => new Date(2026, 10, day, hour, minute, 0, 0).getTime();
const hourOf = (t: number) => new Date(t).getHours();

describe('quiet hours', () => {
  it('leaves a daytime moment alone', () => {
    for (const h of [9, 12, 20]) expect(daytime(at(h, 30))).toBe(at(h, 30));
    expect(daytime(at(9))).toBe(at(9));
  });

  it('moves a late evening to 9:00 the next morning', () => {
    expect(daytime(at(21))).toBe(at(9, 0, 24));
    expect(daytime(at(23, 59))).toBe(at(9, 0, 24));
  });

  it('moves the small hours to 9:00 the same morning', () => {
    expect(daytime(at(0, 5))).toBe(at(9));
    expect(daytime(at(8, 59))).toBe(at(9));
  });

  it('crosses a month end', () => {
    const lastNight = new Date(2026, 10, 30, 22, 0, 0, 0).getTime();
    expect(daytime(lastNight)).toBe(new Date(2026, 11, 1, 9, 0, 0, 0).getTime());
  });
});

describe('reminders of a sim game (Pizza Empire)', () => {
  const leave = at(10);
  const mid = buildPreset(cfg, 'mid', leave);

  it('reminds when the offline cap is reached, and once three days on', () => {
    expect(E.incomePerSecond(cfg, mid, leave)).toBeGreaterThan(0);
    const list = remindersFor(cfg, mid, leave);
    expect(list.map((r) => r.kind)).toEqual(['awayFull', 'later']);
    expect(list[0].at).toBe(daytime(leave + cfg.economy.offline.maxHours * HOUR));
    expect(list[1].at).toBe(leave + REMINDER_RULES.laterHours * HOUR);
  });

  it('never delivers at night: a cap reached at 1:00 waits for 9:00', () => {
    const late = at(21 - cfg.economy.offline.maxHours + 4);
    const list = remindersFor(cfg, mid, late);
    expect(hourOf(late + cfg.economy.offline.maxHours * HOUR)).toBeLessThan(9);
    expect(hourOf(list[0].at)).toBe(9);
    for (const r of list) {
      expect(r.at).toBeGreaterThan(late);
      expect(hourOf(r.at)).toBeGreaterThanOrEqual(REMINDER_RULES.quietToHour);
      expect(hourOf(r.at)).toBeLessThan(REMINDER_RULES.quietFromHour);
    }
  });

  it('leaves a game that was barely played alone', () => {
    const fresh = E.createInitialState(cfg, leave);
    expect(remindersFor(cfg, fresh, leave)).toEqual([]);
    expect(remindersFor(cfg, { ...mid, stats: { ...mid.stats, playSeconds: REMINDER_RULES.minPlaySeconds - 1 } }, leave)).toEqual([]);
  });

  it('does not announce a full register when nothing earns while away', () => {
    const idle = { ...E.createInitialState(cfg, leave), stats: { ...mid.stats } };
    expect(E.incomePerSecond(cfg, idle, leave)).toBe(0);
    expect(remindersFor(cfg, idle, leave).map((r) => r.kind)).toEqual(['later']);
  });

  it('does not announce a cap shorter than half an hour', () => {
    const short = { ...cfg, economy: { ...cfg.economy, offline: { ...cfg.economy.offline, maxHours: 0.25 } } };
    expect(remindersFor(short, mid, leave).map((r) => r.kind)).toEqual(['later']);
  });

  it('never sends two on one morning: a cap of almost three days drops the second reminder', () => {
    const long = { ...cfg, economy: { ...cfg.economy, offline: { ...cfg.economy.offline, maxHours: 70 } } };
    expect(remindersFor(long, mid, leave).map((r) => r.kind)).toEqual(['awayFull']);
  });

  it('is the same list for the same moment (pure)', () => {
    expect(remindersFor(cfg, mid, leave)).toEqual(remindersFor(cfg, mid, leave));
  });
});

describe('reminders of a merge game', () => {
  const mcfg = mergeTestConfig();
  beforeAll(() => installEngineMode(mergeEngineMode));
  afterAll(() => installEngineMode(null));

  it('takes the away cap from the rules: lantern 6 and Late Hours lengthen it', () => {
    const g = mergeFixtures(mcfg).minute10;
    const cap = awayCapSeconds(mcfg, g);
    expect(cap).toBe(R.mergeParams(mcfg, g).awayCap);
    expect(cap).toBe(mcfg.merge.away.capHours * 3600);
    const lit = { ...g, merge: { ...g.merge, lanterns: [...g.merge.lanterns, 6] } };
    expect(awayCapSeconds(mcfg, lit)).toBeGreaterThan(cap);
  });

  it('announces the full till only once a minder earns while away', () => {
    const leave = at(10);
    const { minute10 } = mergeFixtures(mcfg);
    const earning = E.incomePerSecond(mcfg, minute10, leave) > 0;
    const kinds = remindersFor(mcfg, minute10, leave).map((r) => r.kind);
    expect(kinds).toEqual(earning ? ['awayFull', 'later'] : ['later']);
    if (earning) expect(remindersFor(mcfg, minute10, leave)[0].at).toBe(daytime(leave + awayCapSeconds(mcfg, minute10) * 1000));
  });
});

describe('reminders of a haul game', () => {
  const hcfg = haulTestConfig();
  beforeAll(() => {
    installEngineMode(haulEngineMode);
    haulFixtures(hcfg);
  }, 120_000);
  afterAll(() => installEngineMode(null));

  it('announces the end of the shift only with the dock autopilot online (nothing ships without it)', () => {
    const leave = at(10);
    const f = haulFixtures(hcfg);
    for (const g of Object.values(f)) {
      const state = g as never;
      const online = E.incomePerSecond(hcfg, state, leave) > 0;
      const kinds = remindersFor(hcfg, state, leave).map((r) => r.kind);
      if ((g as { stats: { playSeconds: number } }).stats.playSeconds < REMINDER_RULES.minPlaySeconds) expect(kinds).toEqual([]);
      else expect(kinds).toEqual(online ? ['awayFull', 'later'] : ['later']);
    }
  });
});
