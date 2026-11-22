/**
 * The scenario the first game's regression guard replays (src/engine/modeRegression.test.ts) and
 * that scripts/lib/recordModes.ts records on a git archive of the main branch's commit (pizza-1).
 * It takes the engine modules as arguments, so the very same steps run on the old code (the
 * archive) and on this tree, and their outputs can be compared bit for bit.
 *
 * Pure: no file access, no clock (NOW is fixed), no randomness outside the engine's own seeds.
 */

/** The slice of the engine the scenario calls (old and new trees both have it). */
export interface ScenarioEngine {
  E: {
    createInitialState(cfg: never, now: number): unknown;
    incomePerSecond(cfg: never, s: never, now: number): number;
    computeOffline(cfg: never, s: never, now: number): unknown;
    tick(cfg: never, s: never, dt: number, now: number, events?: unknown[]): unknown;
    reconcileState(cfg: never, raw: unknown, now: number): unknown;
    lifetimeForPrestigePoints(cfg: never, points: number): number;
    prestige(cfg: never, s: never, now: number): unknown;
    timeWarp(cfg: never, s: never, hours: number, now: number): { cash: number };
    pendingStoryBeat(cfg: never, s: never): { id: string } | null;
  };
  M: {
    refreshMissions(cfg: never, s: never, now: number): { missions: unknown };
    cashForSeconds(cfg: never, s: never, seconds: number, now: number): number;
  };
  buildPreset(cfg: never, name: 'early', now: number): unknown;
}

export const SCENARIO_NOW = Date.UTC(2026, 10, 1, 9, 0, 0);

/** Every output of the scenario for one parsed config, as plain JSON (what the fixture stores). */
export function modeScenario(x: ScenarioEngine, cfgIn: unknown): Record<string, unknown> {
  const { E, M } = x;
  const cfg = cfgIn as never;
  const NOW = SCENARIO_NOW;
  const out: Record<string, unknown> = {};
  out.fresh = E.createInitialState(cfg, NOW);
  // A few minutes of the preset bot (ticks, buys, hires), then the meta systems.
  const early = x.buildPreset(cfg, 'early', NOW) as Record<string, unknown>;
  out.early = early;
  out.income = E.incomePerSecond(cfg, early as never, NOW);
  // Offline: two hours away.
  out.offline = E.computeOffline(cfg, { ...early, lastSavedAt: NOW - 2 * 3600_000 } as never, NOW);
  // A tick with events.
  const events: unknown[] = [];
  let s = early as unknown;
  for (let i = 0; i < 30; i++) s = E.tick(cfg, s as never, 0.1, NOW + i * 100, events);
  out.ticked = s;
  out.events = events;
  // Saves: the state itself, a v1-looking save, garbage.
  out.reconciled = E.reconcileState(cfg, JSON.parse(JSON.stringify(s)), NOW);
  out.reconciledV1 = E.reconcileState(cfg, { version: 1, cash: 12, businesses: { x: { owned: 3 } } }, NOW);
  out.reconciledJunk = E.reconcileState(cfg, { cash: 'lots', venues: 7, stats: null }, NOW);
  // Prestige with enough lifetime earnings for a few points.
  const rich = { ...(s as object), lifetimeEarnings: E.lifetimeForPrestigePoints(cfg, 5) * 1.01 };
  out.prestige = E.prestige(cfg, rich as never, NOW);
  out.timeWarp = E.timeWarp(cfg, s as never, 2, NOW).cash;
  out.missions = M.refreshMissions(cfg, s as never, NOW).missions;
  out.cashForSeconds = M.cashForSeconds(cfg, s as never, 120, NOW);
  out.story = E.pendingStoryBeat(cfg, { ...(s as object), storySeen: [] } as never)?.id ?? null;
  return JSON.parse(JSON.stringify(out));
}

/**
 * The parts of the first game's parsed config the guard pins: everything but what is not gameplay
 * and what the owner edits before a release (the lead's note on pizza-1): the `store` block
 * (listing texts, privacy URL) and the `app` identifiers (bundle ids, version, tracking text). The
 * `soundPack` key came with the bundle separation (the main branch has none; the test pins it to
 * "warm" separately).
 */
export const CONFIG_UNPINNED = ['store', 'app', 'soundPack'] as const;

export function pinnedConfig(parsed: unknown): Record<string, unknown> {
  const c = { ...(JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>) };
  for (const k of CONFIG_UNPINNED) delete c[k];
  return c;
}
