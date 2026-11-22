import { describe, expect, it } from 'vitest';
import * as H from '../../../engine/haul';
import { haulFixtures, haulTestConfig } from '../../../engine/fixtures/haul';
import { money, rockName, units } from './format';
import { hintLine, sheetHintTarget, sheetOf, shiftLogRows, speaker } from './shellLogic';
import { SHELL_TEXT_DEFAULTS, say } from './shellText';

const cfg = haulTestConfig();
const run = haulFixtures(cfg).midGame;
const point = (key: string, step = 0, route: string[] = []): H.HaulHint => ({ kind: 'point', key, route, row: null, step });

describe('comms slot lines (section 3, errata 56, 57)', () => {
  it('tutorial steps 2 to 6 have their line; step 1 is the start story beat', () => {
    expect(hintLine(run, point('rock:0', 1))).toBeNull();
    expect(hintLine(run, { kind: 'swipe', key: 'bay:launch', route: [], row: null, zone: 'bay:launch', step: 2 })).toEqual({ key: 'hintStep2', role: 'dock' });
    expect(hintLine(run, point('station:buyDrone', 3, ['station']))?.key).toBe('hintStep3');
    expect(hintLine(run, point('slot:1', 5))).toEqual({ key: 'hintStep5', role: 'ai' });
    expect(say('hintStep2')).toBe('Hold full. Clear the pad.');
  });
  it('the autopilot hint and the long hold line after the tutorial (errata 57)', () => {
    expect(hintLine(run, point('station:autopilot', 0, ['station']))?.key).toBe('hintAutopilot');
    const noPilot = { ...run, haul: { ...run.haul, autopilot: { ...run.haul.autopilot, online: false } } };
    expect(hintLine(noPilot, { kind: 'swipe', key: 'bay:launch', route: [], row: null, step: 0 })?.key).toBe('holdCapacity');
    const pilot = { ...run, haul: { ...run.haul, autopilot: { ...run.haul.autopilot, online: true } } };
    expect(hintLine(pilot, { kind: 'swipe', key: 'bay:launch', route: [], row: null, step: 0 })).toBeNull();
  });
  it('speakers come from the story data, with a fallback', () => {
    const story = [
      { id: 'a', characterId: 'ai1', trigger: { type: 'start' }, lines: ['x'], rewardGems: 0 },
      { id: 'b', characterId: 'dock1', trigger: { type: 'launches', count: 1 }, lines: ['y'], rewardGems: 0 },
    ];
    const c = { ...cfg, story } as unknown as H.HaulConfig;
    expect(speaker(c, 'ai')).toBe('ai1');
    expect(speaker(c, 'dock')).toBe('dock1');
    expect(typeof speaker(c, 'dispatch')).toBe('string');
  });
  it('no default line uses an exclamation mark (voice, 7.5)', () => {
    for (const text of Object.values(SHELL_TEXT_DEFAULTS)) expect(text).not.toContain('!');
  });
});

describe('sheet hints, second stage (errata 53)', () => {
  const all = () => true;
  const buy = point('station:buyDrone', 3, ['station']);
  it('points at the control only while its sheet is open and nothing covers it', () => {
    expect(sheetHintTarget(buy, null, false, all, () => 0)).toBeNull();
    expect(sheetHintTarget(buy, { type: 'station' }, false, all, () => 0)).toBe('station:buyDrone');
    expect(sheetHintTarget(buy, { type: 'station' }, true, all, () => 0)).toBeNull();
    expect(sheetHintTarget(buy, { type: 'contracts' }, false, all, () => 0)).toBeNull();
    expect(sheetHintTarget(buy, { type: 'station' }, false, () => false, () => 0)).toBeNull();
  });
  it('the board hint points at the best manifest once the board is open', () => {
    const board = point('bay:counter');
    expect(sheetHintTarget(board, { type: 'contracts' }, false, all, () => 2)).toBe('contract:card2');
    expect(sheetHintTarget(board, null, false, all, () => 2)).toBeNull();
  });
  it('a map hint never points inside a sheet', () => {
    expect(sheetHintTarget(point('slot:1', 5), { type: 'station' }, false, all, () => 0)).toBeNull();
    expect(sheetOf('station:autopilot')).toBe('station');
    expect(sheetOf('rock:3')).toBeNull();
  });
});

describe('Shift Log rows (2.11, 4.6)', () => {
  it('prints away, ores in config order, rocks, pods, in flight and credits', () => {
    const ores = cfg.haul.ores.map((o) => o.id);
    const report: H.OfflineReport = { seconds: 5 * 3600 + 12 * 60, effective: 1, unitsByOre: { [ores[1]]: 610, [ores[0]]: 3420 }, rocksDry: 4, pods: 1, inFlight: 220, credits: 18400, noAutopilot: false, shipped: 4030, launches: 3 };
    const { rows, note } = shiftLogRows(cfg, { seconds: report.seconds, earnings: 18400, report });
    expect(rows.map((r) => r.label)).toEqual(['AWAY', cfg.haul.ores[0].name.toUpperCase(), cfg.haul.ores[1].name.toUpperCase(), 'ROCKS DRY', 'PODS', 'IN FLIGHT', 'CREDITS']);
    expect(rows[0].value).toBe('5 h 12 m');
    expect(rows[1].value).toBe('3,420 u');
    expect(rows.at(-1)).toMatchObject({ value: money(cfg, 18400), strong: true });
    expect(note).toBeNull();
  });
  it('without a report (merged popups) it still prints away and credits', () => {
    const { rows } = shiftLogRows(cfg, { seconds: 600, earnings: 50 });
    expect(rows.map((r) => r.label)).toEqual(['AWAY', 'CREDITS']);
    expect(rows[0].value).toBe('10 m');
  });
});

describe('formatting', () => {
  it('rock names follow errata 63 and prices round up below a thousand', () => {
    expect(rockName(cfg, 0)).toBe(`${cfg.haul.names.rockPrefix}1`);
    expect(money(cfg, 20.8)).toBe(`${cfg.strings.currencySymbol}21`);
    expect(money(cfg, 44.2)).toBe(`${cfg.strings.currencySymbol}45`);
    expect(money(cfg, Infinity)).toBe('—');
    expect(units(3420.4)).toBe('3,420');
  });
});
