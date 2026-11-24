import { describe, expect, it } from 'vitest';
import * as H from '../../../engine/haul';
import { haulFixtures, haulTestConfig } from '../../../engine/fixtures/haul';
import { money, rockName, units } from './format';
import { hintLine, sheetHintTarget, sheetOf, shiftLogRows, speaker } from './shellLogic';
import { HAUL_SPOKE_STRINGS, HAUL_STRINGS } from '../strings';
import { say } from './shellText';

const cfg = haulTestConfig();
const run = haulFixtures(cfg).midGame;
const point = (key: string, step = 0, route: string[] = []): H.HaulHint => ({ kind: 'point', key, route, row: null, step });

describe('comms slot lines (section 3, errata 56, 57)', () => {
  it('tutorial steps 1 to 6 have their line (step 1: the AI, no story beat repeats it)', () => {
    expect(hintLine(run, point('rock:0', 1))).toEqual({ key: 'hintStep1', role: 'ai' });
    expect(hintLine(run, { kind: 'swipe', key: 'bay:launch', route: [], row: null, zone: 'bay:launch', step: 2 })).toEqual({ key: 'hintStep2', role: 'dock' });
    expect(hintLine(run, point('station:buyDrone', 3, ['station']))?.key).toBe('hintStep3');
    expect(hintLine(run, point('slot:1', 3))).toEqual({ key: 'hintStep3', role: 'dock' });
    expect(hintLine(run, point('rock:1', 5))).toEqual({ key: 'hintStep5', role: 'ai' });
    expect(say('hintStep2')).toBe('Hold full. Clear the pad.');
  });
  it('the autopilot hint and the long hold line after the tutorial (errata 57)', () => {
    expect(hintLine(run, point('station:autopilot', 0, ['station']))?.key).toBe('hintAutopilot');
    const noPilot = { ...run, haul: { ...run.haul, autopilot: { ...run.haul.autopilot, online: false } } };
    expect(hintLine(noPilot, { kind: 'swipe', key: 'bay:launch', route: [], row: null, step: 0 })?.key).toBe('holdCapacity');
    const pilot = { ...run, haul: { ...run.haul, autopilot: { ...run.haul.autopilot, online: true } } };
    expect(hintLine(pilot, { kind: 'swipe', key: 'bay:launch', route: [], row: null, step: 0 })).toBeNull();
  });
  it('a limit hint names its purchase (Decision 57)', () => {
    expect(hintLine(run, point('station:freighter', 0, ['station']))?.key).toBe('hintLimitFreighter');
    expect(hintLine(run, point('station:capacity', 0, ['station']))?.key).toBe('hintLimitCapacity');
    expect(hintLine(run, point('rig:upgrade', 0, ['rock:2']))?.key).toBe('hintLimitRig');
    expect(hintLine(run, point('slot:4', 0))?.key).toBe('hintLimitClaim');
    expect(hintLine(run, point('bay:flare', 0))).toBeNull();
  });
  it('speakers come from the story data, with a fallback', () => {
    const story = [
      { id: 'a', characterId: 'ai1', trigger: { type: 'start' }, lines: ['x'], rewardGems: 0 },
      { id: 'b', characterId: 'dock1', trigger: { type: 'launches', count: 1 }, lines: ['y'], rewardGems: 0 },
    ];
    const c = { ...cfg, story, characters: cfg.characters.filter((x) => x.name !== cfg.haul.names.ai) } as unknown as H.HaulConfig;
    expect(speaker(c, 'ai')).toBe('ai1');
    // The AI is found by the name the data gives it, when a character carries that name.
    const named = { ...cfg, story, characters: [...cfg.characters, { ...cfg.characters[0], id: 'brain', name: cfg.haul.names.ai }] } as unknown as H.HaulConfig;
    expect(speaker(named, 'ai')).toBe(named.characters.find((x) => x.name === cfg.haul.names.ai)?.id);
    expect(speaker(c, 'dock')).toBe('dock1');
    expect(typeof speaker(c, 'dispatch')).toBe('string');
  });
  it('no interface line uses an exclamation mark (voice, 7.5)', () => {
    const all = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : all(v as object)));
    for (const text of [...all(HAUL_STRINGS), ...all(HAUL_SPOKE_STRINGS)]) expect(text).not.toContain('!');
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
  it('the rig upgrade is marked only in the Rig sheet of the hinted rock (Decision 58)', () => {
    const up = { ...point('rig:upgrade', 6), route: ['rock:2'] };
    expect(sheetHintTarget(up, { type: 'rig', slot: 2 }, false, all, () => 0)).toBe('rig:upgrade');
    expect(sheetHintTarget(up, { type: 'rig', slot: 0 }, false, all, () => 0)).toBeNull();
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
    expect(rows[1].value).toBe('3.4K u');
    expect(rows.at(-1)).toMatchObject({ value: money(cfg, 18400), strong: true });
    expect(note).toBeNull();
  });
  it('without a report (merged popups) it still prints away and credits', () => {
    const { rows } = shiftLogRows(cfg, { seconds: 600, earnings: 50 });
    expect(rows.map((r) => r.label)).toEqual(['AWAY', 'CREDITS']);
    expect(rows[0].value).toBe('10 m');
  });
  it('a report back from a save prints as it did (the app was closed on the log), and a damaged one never breaks the printout', () => {
    const ores = cfg.haul.ores.map((o) => o.id);
    const report: H.OfflineReport = { seconds: 3 * 3600, effective: 4104, unitsByOre: { [ores[0]]: 18025435.3, [ores[1]]: 8073794.2 }, rocksDry: 32, pods: 4, inFlight: 0, credits: 64705072.4, noAutopilot: false, shipped: 26099229.5, launches: 211 };
    // The store saves the report with the game while it waits and reads it back at the next start (src/state/store.ts).
    const saved = JSON.parse(JSON.stringify(report)) as unknown;
    expect(saved).toEqual(report);
    expect(shiftLogRows(cfg, { seconds: report.seconds, earnings: report.credits, report: saved })).toEqual(shiftLogRows(cfg, { seconds: report.seconds, earnings: report.credits, report }));
    // A save is untrusted: every field in turn missing or of the wrong kind, and things that are no report at all.
    const junk: unknown[] = [null, 'x', 5, -1, true, {}, [], [null], [5], [{}], { [ores[0]]: 'x' }, { [ores[0]]: null }];
    const damaged: unknown[] = [...junk];
    for (const key of Object.keys(report)) {
      for (const j of junk) damaged.push({ ...report, [key]: j });
      damaged.push(Object.fromEntries(Object.entries(report).filter(([k]) => k !== key)));
    }
    for (const bad of damaged) {
      const { rows } = shiftLogRows(cfg, { seconds: 600, earnings: 50, report: bad });
      // Whatever the report says, the credits row is the record's own amount: what Collect pays.
      expect(rows.at(-1), JSON.stringify(bad)).toMatchObject({ label: 'CREDITS', value: money(cfg, 50), strong: true });
      for (const row of rows) expect(typeof row.value, JSON.stringify(bad)).toBe('string');
    }
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
