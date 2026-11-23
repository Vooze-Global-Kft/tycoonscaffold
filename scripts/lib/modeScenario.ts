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
    buyTimeWarpWithGems(cfg: never, s: never, now: number): unknown;
    claimDaily(cfg: never, s: never, now: number): unknown;
    pendingStoryBeat(cfg: never, s: never): { id: string } | null;
  };
  M: {
    refreshMissions(cfg: never, s: never, now: number): { missions: unknown };
    cashForSeconds(cfg: never, s: never, seconds: number, now: number): number;
    applyProduct(cfg: never, s: never, product: never, now: number): unknown;
    missionsAfterReset(cfg: never, s: never, now: number): { missions: unknown };
  };
  buildPreset(cfg: never, name: 'early' | 'mid', now: number): unknown;
}

export const SCENARIO_NOW = Date.UTC(2026, 10, 1, 9, 0, 0);

/**
 * Outputs of this tree that differ from the main branch ON PURPOSE (the lead's decisions), each
 * with what the main branch gave and why it changed. The guard checks that the recorded output is
 * still what the note says, and that this tree gives exactly the stated replacement.
 *
 * buyWarpZero (guard:new:3, rules-7): a gem Time Warp bought with zero income. The main branch
 * charged the gems for a warp worth 0; this tree refuses it and charges nothing (the state comes
 * back unchanged). A player cannot reach it: the Boosts button is disabled at zero income.
 */
export const INTENDED_DIFFERENCES = ['buyWarpZero'] as const;

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
  // The shared functions this round touched (guard:new:2): a gem Time Warp with zero income (the
  // early preset: Pizza Empire earns nothing yet) and with income (the mid preset), ...
  const gemmed = (x0: unknown) => ({ ...(x0 as object), gems: 1000 });
  out.buyWarpZero = { income: out.income, state: E.buyTimeWarpWithGems(cfg, gemmed(early) as never, NOW) };
  const mid = x.buildPreset(cfg, 'mid', NOW);
  out.buyWarp = { income: E.incomePerSecond(cfg, mid as never, NOW), state: E.buyTimeWarpWithGems(cfg, gemmed(mid) as never, NOW) };
  out.buyWarpPoor = E.buyTimeWarpWithGems(cfg, { ...(s as object), gems: 0 } as never, NOW);
  // ... the daily gift over several days (a second claim on the same day, a skipped day, a clock
  // set back), at noon UTC so the local day is the same in every time zone from -11 to +11 ...
  const DAY = 86_400_000;
  const noon = Date.UTC(2026, 10, 1, 12, 0, 0);
  let d = { ...(s as object), daily: { lastClaimDay: null, streak: 0 } } as unknown;
  const daily: unknown[] = [];
  for (const day of [0, 0, 1, 2, 4, 3, 5, 6, 7, 8]) {
    d = E.claimDaily(cfg, d as never, noon + day * DAY);
    const g = d as { gems: number; daily: unknown };
    daily.push({ day, gems: g.gems, daily: g.daily });
  }
  out.daily = daily;
  // ... every product of the game's store, bought once and then again ...
  const products = ((cfg as { monetization?: { iap?: { products?: { id: string }[] } } }).monetization?.iap?.products ?? []) as never[];
  out.products = products.map((p) => {
    const once = M.applyProduct(cfg, s as never, p, NOW) as { state: unknown; granted: unknown };
    const twice = M.applyProduct(cfg, once.state as never, p, NOW) as { state: unknown; granted: unknown };
    return { id: (p as { id: string }).id, once, twice };
  });
  // ... and the missions handed out after a prestige.
  out.missionsAfterReset = M.missionsAfterReset(cfg, out.prestige as never, NOW).missions;
  out.story = E.pendingStoryBeat(cfg, { ...(s as object), storySeen: [] } as never)?.id ?? null;
  return JSON.parse(JSON.stringify(out));
}

/**
 * The parts of the first game's parsed config the guard pins: everything but what is not gameplay
 * and what the owner edits before a release (the lead's note on pizza-1): the `store` block
 * (listing texts, privacy URL) and, of the `app` block, only the release identifiers (bundle ids,
 * version, build number, EAS project and owner) and the tracking text. `app.displayName` (the name
 * under the home-screen icon) and `app.slug` stay pinned (guard:new:2). The `soundPack` key came
 * with the bundle separation (the main branch has none; the test pins it to "warm" separately).
 * A dotted entry removes one key of a block.
 */
export const CONFIG_UNPINNED = [
  'store',
  'soundPack',
  'app.iosBundleId',
  'app.androidPackage',
  'app.version',
  'app.buildNumber',
  'app.easProjectId',
  'app.owner',
  'app.trackingText',
] as const;

/**
 * Top-level blocks of game.json that came after the main branch and that no rule reads: the words
 * of the reminders (`reminders`) and the platforms' leaderboard ids (`leaderboards`; the figures a
 * board ranks are computed from the state, src/engine/scores.ts). The recording has none of them,
 * and is never re-recorded: the guard takes them out of THIS tree's config before it compares, and
 * proves they are not gameplay by playing the whole scenario with and without them
 * (src/engine/modeRegression.test.ts). A block a rule reads must never be listed here.
 */
export const CONFIG_ADDED_NOT_RULES = ['reminders', 'leaderboards'] as const;

/** `parsed` without the blocks of CONFIG_ADDED_NOT_RULES. */
export function withoutAddedBlocks<T>(parsed: T): T {
  const c = { ...(parsed as Record<string, unknown>) };
  for (const k of CONFIG_ADDED_NOT_RULES) delete c[k];
  return c as T;
}

export function pinnedConfig(parsed: unknown): Record<string, unknown> {
  const c = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  for (const k of CONFIG_UNPINNED) {
    const [block, key] = k.split('.');
    if (key === undefined) delete c[block];
    else if (c[block] && typeof c[block] === 'object') delete (c[block] as Record<string, unknown>)[key];
  }
  return c;
}
