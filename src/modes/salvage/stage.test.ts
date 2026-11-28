/**
 * C-MODE (PLAN2 2.4, 7 D1): the works' development switch, and the first-yard guard's parts 1c and 1d.
 * - stageOn() is true only with __DEV__ AND EXPO_PUBLIC_YARD_STAGE=2 (node: off unless a test sets both).
 * - 1c: switch OFF, the wrapped engine's `config` IS the mode's own function (the same object), so the first yard's
 *   config is parsed exactly as before (release.stage 1, the empty shared product list).
 * - 1d: switch ON, the config deep-equals the content the bots measured: withSalvageContent(GameConfigSchema.parse(
 *   shipped2Raw(game.json))) (release.stage 2, the shared list mirrored from the mode's block).
 * - the save tag's getter (MOD-SLOTS' dev slots): salvage1 unless a development run names a slot.
 * - the presets' contract: every w* name in the shared alias list as `late`; the address switches from content keys.
 * - DEV_ONLY's import rule in scripts/check-bundle.ts.
 * No tuned number is pinned. Owner: C-MODE.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import gameJson from '../../../games/scrap-yard/game.json';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import { PRESET_ALIASES } from '../../dev/presets.web';
import { shipped2Raw } from '../../engine/fixtures/shipped2';
import type * as R from '../../engine/salvage';
import { pointOf } from '../../engine/salvage/positions';
import { salvageEngineMode, withSalvageContent } from '../../engine/salvageMode';
import type { GameState } from '../../engine/types';
import { camPoint, withSwitches, WORKS_PRESETS } from './presets.web';
import { deferAway, resetPendingForTests, salvageReturningEngine, setSaveSlot, stage2Config } from './returning';
import { STAGE_VAR, stageOn } from './stage';
import { stage2RawOf } from './stage2Raw';

// The store (returning.ts imports it) in node, as returning.test.ts stands it up.
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }));
vi.mock('../../generated/activeGame', async () => ({ ACTIVE_GAME_ID: 'scrap-yard', rawGame: (await import('../../../games/scrap-yard/game.json')).default, fxTable: {}, gameAssets: {}, gameSounds: {}, displayFontMetrics: null }));
vi.mock('../../services/fx', () => ({ fx: { play: () => {} } }));
vi.mock('../../services/ads', () => ({ ads: { showRewarded: async () => true, maybeShowInterstitial: () => {}, init: () => {}, interstitials: true } }));
vi.mock('../../services/firebase', () => ({ analytics: { log: () => {} }, crash: { record: () => {} }, fetchRemoteOverrides: async () => ({}) }));
vi.mock('../../services/iap', () => ({ iap: { init: async () => {}, owned: async () => [], purchase: async () => true, restore: async () => [], listing: async () => null, onTransactions: () => () => {} } }));
vi.mock('../../services/region', () => ({ detectRegion: async () => null, setStorefrontForDev: () => {} }));

const G = globalThis as { __DEV__?: boolean };
const was = { dev: G.__DEV__, v: process.env.EXPO_PUBLIC_YARD_STAGE };
function setSwitch(dev: boolean | undefined, v: string | undefined) {
  if (dev === undefined) delete G.__DEV__;
  else G.__DEV__ = dev;
  if (v === undefined) delete process.env.EXPO_PUBLIC_YARD_STAGE;
  else process.env.EXPO_PUBLIC_YARD_STAGE = v;
}
afterEach(() => {
  setSwitch(was.dev, was.v);
  resetPendingForTests();
});

const base = () => GameConfigSchema.parse(gameJson);
const stageOf = (cfg: { salvage?: unknown }) => (cfg.salvage as { release?: { stage?: number } }).release?.stage;
const sharedProducts = (cfg: { monetization: unknown }) => ((cfg.monetization as { iap?: { products?: unknown[] } }).iap?.products ?? []).length;

describe('stageOn', () => {
  it('is off in node, off with only one half, on with __DEV__ and EXPO_PUBLIC_YARD_STAGE=2', () => {
    expect(STAGE_VAR).toBe('EXPO_PUBLIC_YARD_STAGE');
    setSwitch(undefined, undefined);
    expect(stageOn()).toBe(false);
    setSwitch(undefined, '2');
    expect(stageOn()).toBe(false);
    setSwitch(false, '2');
    expect(stageOn()).toBe(false);
    setSwitch(true, undefined);
    expect(stageOn()).toBe(false);
    setSwitch(true, '1');
    expect(stageOn()).toBe(false);
    setSwitch(true, '2');
    expect(stageOn()).toBe(true);
  });
});

describe('guard 1c: the switch OFF, the first yard parses as before', () => {
  it('the wrapped config IS the mode\'s own function, and its result equals the mode\'s at release.stage 1', () => {
    setSwitch(undefined, undefined);
    expect(salvageReturningEngine.config).toBe(salvageEngineMode.config);
    expect(deferAway(salvageEngineMode).config).toBe(salvageEngineMode.config);
    // __DEV__ alone (a phone without STAGE) is off too.
    setSwitch(true, undefined);
    expect(deferAway(salvageEngineMode).config).toBe(salvageEngineMode.config);
    const a = salvageReturningEngine.config!(base());
    const b = withSalvageContent(base());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(stageOf(a)).toBe(1);
    expect(sharedProducts(a)).toBe(0);
  });
});

describe('guard 1d: the switch ON, the config is the content the bots measured at stage 2', () => {
  it('deep-equals withSalvageContent(GameConfigSchema.parse(shipped2Raw(game.json)))', () => {
    setSwitch(true, '2');
    const on = deferAway(salvageEngineMode);
    expect(on.config).not.toBe(salvageEngineMode.config);
    const cfg = on.config!(base());
    const want = withSalvageContent(GameConfigSchema.parse(shipped2Raw(gameJson)));
    expect(cfg).toEqual(want);
    expect(stageOf(cfg)).toBe(2);
    const modeProducts = ((gameJson as { salvage: { iap?: { products?: unknown[] } } }).salvage.iap?.products ?? []).length;
    expect(modeProducts).toBeGreaterThan(0);
    expect(sharedProducts(cfg)).toBe(modeProducts);
    // The same as the rules' own parse of the stage-2 block (what scripts/content/yard-bot.ts --stage 2 reads).
    expect(cfg.salvage).toEqual(SalvageSchema.parse(shipped2Raw<{ salvage: unknown }>(gameJson).salvage));
    // A config of another mode passes through the mode's own function untouched.
    const other = { ...base(), mode: 'sim' } as ReturnType<typeof base>;
    expect(on.config!(other)).toBe(other);
  });
  it('stage2RawOf never changes its input and is what shipped2Raw returns', () => {
    const before = JSON.stringify(gameJson);
    const a = stage2RawOf<unknown>(gameJson);
    expect(JSON.stringify(gameJson)).toBe(before);
    expect(a).toEqual(shipped2Raw(gameJson));
    expect(stage2Config(base())).toEqual(GameConfigSchema.parse(shipped2Raw(gameJson)));
  });
});

describe('the save tag (MOD-SLOTS)', () => {
  it('reads salvage1; a slot only in a development run; null goes back', () => {
    const e = deferAway(salvageEngineMode);
    expect(e.saveTag).toBe(salvageEngineMode.saveTag);
    expect(salvageReturningEngine.saveTag).toBe('salvage1');
    setSwitch(undefined, undefined);
    setSaveSlot('w4pour');
    expect(e.saveTag).toBe('salvage1');
    setSwitch(true, undefined);
    setSaveSlot('w4pour');
    expect(e.saveTag).toBe('salvage1.dev-w4pour');
    expect(salvageReturningEngine.saveTag).toBe('salvage1.dev-w4pour');
    setSaveSlot('../x');
    expect(e.saveTag).toBe('salvage1.dev-w4pour');
    setSaveSlot(null);
    expect(e.saveTag).toBe('salvage1');
  });
});

describe('the preview\'s works presets and switches', () => {
  it('every w* name arrives through the shared list as late (critic-build F8)', () => {
    for (const n of WORKS_PRESETS) expect(PRESET_ALIASES[n]).toBe('late');
    const shared = Object.keys(PRESET_ALIASES).filter((k) => /^w\d/.test(k)).sort();
    expect(shared).toEqual([...WORKS_PRESETS].sort());
  });
  it('cam puts the boss on foot at content points; age and band set the second session and the band', () => {
    setSwitch(true, '2');
    const cfg = deferAway(salvageEngineMode).config!(base()) as unknown as R.SalvageConfig;
    const c = cfg.salvage;
    const m = c.map as unknown as { works: { points: Record<string, number[]>; driveLine: { stops: Record<string, number[]> }; laneStops: Record<string, number[]> } };
    expect(camPoint(c, 'gate')).toEqual(pointOf(c, 'gate'));
    expect(camPoint(c, 'works')).toEqual({ x: m.works.driveLine.stops.works[0], y: m.works.driveLine.stops.works[1] });
    expect(camPoint(c, 'sale')).toEqual({ x: m.works.points['reuseRack.zone'][0], y: m.works.points['reuseRack.zone'][1] });
    expect(camPoint(c, 'lane')).toEqual({ x: m.works.laneStops.van[0], y: m.works.laneStops.van[1] });
    const g0 = {
      salvage: {
        t: 100,
        epoch: 3,
        truck: { by: 'boss' },
        forklift: null,
        presence: { x: 0, y: 0, driving: true, moving: true, standingFor: 0 },
        act: { kind: 'cut', target: 'x', since: 0, endsAt: 5 },
        iap: { sessions2At: null, ageBand: null },
      },
    } as unknown as GameState;
    const g1 = withSwitches(cfg, g0, { cam: 'sale', age: null, band: null, country: null }) as unknown as R.SalvageGame;
    expect(g1.salvage.presence).toMatchObject({ ...camPoint(c, 'sale'), driving: false, moving: false });
    expect(g1.salvage.truck.by).toBeNull();
    expect(g1.salvage.epoch).toBe(4);
    expect(g1.salvage.act.kind).toBe('none');
    const due = withSwitches(cfg, g0, { cam: null, age: 'due', band: null, country: null }) as unknown as R.SalvageGame;
    expect(due.salvage.iap).toMatchObject({ sessions2At: 100, ageBand: null });
    const u13 = withSwitches(cfg, g0, { cam: null, age: null, band: 'u13', country: null }) as unknown as R.SalvageGame;
    expect(u13.salvage.iap).toMatchObject({ sessions2At: 100, ageBand: 'u13' });
    expect(withSwitches(cfg, g0, { cam: null, age: null, band: null, country: null })).toBe(g0);
  });
});

describe('DEV_ONLY (scripts/lib/modes.js, scripts/check-bundle.ts)', () => {
  it('the classes: the .web switch is WEB_ONLY, the works\' recordings and dev rows DEV_ONLY, with their strings', async () => {
    const modes = (await import('../../../scripts/lib/modes.js')) as unknown as { WEB_ONLY: string[]; DEV_ONLY: string[]; DEV_ONLY_STRINGS: { text: string }[]; DEV_ONLY_MARKER: string; MODE_FOLDERS: Record<string, string[]> };
    expect(modes.WEB_ONLY).toContain('src/modes/salvage/stage.web.ts');
    for (const f of ['src/engine/fixtures/salvage-works.json', 'src/ui/salvage/dev/phoneStates.ts', 'src/ui/salvage/dev/timeAway.ts', 'src/ui/salvage/dev/devSlots.ts']) expect(modes.DEV_ONLY).toContain(f);
    expect(modes.DEV_ONLY_STRINGS.map((w) => w.text)).toEqual(expect.arrayContaining([modes.DEV_ONLY_MARKER, 'EXPO_PUBLIC_YARD_STAGE']));
    expect(modes.MODE_FOLDERS.salvage).toEqual(expect.arrayContaining(['src/engine/fixtures/shipped2.ts', 'src/engine/fixtures/salvage-works.json']));
  });
  it('an import of a DEV_ONLY file counts only behind __DEV__; the export refuses the files and the strings', async () => {
    const cb = await import('../../../scripts/check-bundle');
    const src = [
      "import a from './a';",
      "if (__DEV__) { require('./b'); }",
      "const c = __DEV__ ? require('./c') : null;",
      "const d = typeof __DEV__ !== 'undefined' && __DEV__ && require('./d');",
      "if (!__DEV__) require('./e');",
      "require('./f');",
      "if (__DEV__) {} else { require('./g'); }",
      "export { h } from './h';",
    ].join('\n');
    expect([...cb.unguardedImports('x.ts', src)].sort()).toEqual(['./a', './e', './f', './g', './h']);
    const fast = cb.devOnlyViolations({ stage: 'fast', platform: 'ios', mode: 'salvage', modules: [], edges: [{ from: 'src/x.ts', to: 'src/ui/salvage/dev/devSlots.ts', spec: './dev/devSlots' }, { from: 'src/x.ts', to: 'src/y.ts', spec: './y' }] });
    expect(fast.map((v) => v.file)).toEqual(['src/x.ts']);
    const exp = cb.devOnlyViolations({ stage: 'export', platform: 'ios', mode: 'salvage', modules: ['src/engine/fixtures/salvage-works.json', 'src/a.ts'], texts: [['src/a.ts', 'x = "yard-dev-only:works"'], ['src/b.ts', 'process.env.EXPO_PUBLIC_YARD_STAGE'], ['node_modules/q/i.js', 'EXPO_PUBLIC_YARD_STAGE'], ['src/c.ts', 'clean']] });
    expect(exp.map((v) => v.file).sort()).toEqual(['src/a.ts', 'src/b.ts', 'src/engine/fixtures/salvage-works.json']);
    expect(cb.devOnlyViolations({ stage: 'export', platform: 'web', mode: 'salvage', modules: ['src/engine/fixtures/salvage-works.json'], texts: [] })).toEqual([]);
    expect(cb.devOnlyViolations({ stage: 'export', platform: 'ios', mode: 'haul', modules: [], texts: [['src/b.ts', 'EXPO_PUBLIC_YARD_STAGE']] })).toEqual([]);
  });
});
