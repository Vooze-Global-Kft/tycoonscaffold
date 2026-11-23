/**
 * The web preview's `?preset=fresh|early|mid|late` for a merge game (src/dev/presets.ts asks the
 * entry for these), from bot states (spec 9.1: "presets from bot states"): the active balance bot
 * (src/engine/merge/bot.ts, 2.0 s an action, seed 12345) plays the game's own config from the app's
 * own fresh state, and the preset is its state at a moment, re-dated to the moment of loading:
 * - fresh: a new game (the app's own createInitialState);
 * - early: the bot's game at 3:00;
 * - mid: at 30:00;
 * - late: just before the first Festival is filled: one line left, a gift box waiting and a Parade out (the
 *   bot keeps its boxes for the last 10 to 30 minutes before that); else the first moment with one line left.
 * If the rules cannot play yet (a rule still throws NotBuiltError, or anything else fails), the
 * preset falls back to the rules' hand-made fixtures (src/engine/fixtures/merge.ts: minute3,
 * minute10, festivalNear), as the skeleton had it. A played state is kept for the page's life.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android.
 * Owned by the numbers and bot package (docs/design/market-build-plan.md).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { mergeFixtures } from '../../engine/fixtures/merge';
import * as R from '../../engine/merge';
import { runMergeBot } from '../../engine/merge/bot';
import type { GameState } from '../../engine/types';

const played = new Map<string, R.MergeGame | null>();

/** The bot's state for a preset, or null when the rules cannot play it yet. */
function botState(cfg: R.MergeConfig, name: Exclude<PresetName, 'fresh'>, base: R.MergeGame, now: number): R.MergeGame | null {
  const key = `${cfg.id}:${name}`;
  if (played.has(key)) return played.get(key) ?? null;
  let state: R.MergeGame | null = null;
  try {
    if (name === 'late') {
      // Just before the first Festival is filled: one line left, a gift box waiting and a Parade out.
      const left = (g: R.MergeGame) => g.merge.festival.lines.filter((l) => !l.filled).length;
      const oneLeft = (g: R.MergeGame) => g.merge.season === 0 && g.merge.festival.lines.length > 1 && left(g) === 1;
      const done = (g: R.MergeGame) => g.merge.season > 0 || g.merge.festival.filledAt !== null;
      const ready = (g: R.MergeGame) => oneLeft(g) && g.merge.gift.boxes.length > 0 && g.merge.counters.some((ct) => ct.ticket?.gold);
      // The bot plays to the first moment with one line left (time t1). Then, from its state some minutes before
      // t1, it plays on keeping its boxes (the hoarding habit) until a box waits beside a Parade with one line
      // left; 10, 20 and 30 minutes of hoarding are tried in turn. If the Festival fills first every time, the
      // first one-line-left moment is the preset.
      const first = runMergeBot(cfg, { seed: 12345, hours: 4, seasons: 1, wall0: now, base: () => base, stop: (g) => oneLeft(g) || done(g) }).game;
      if (oneLeft(first)) {
        const t1 = first.stats.playSeconds;
        for (const lead of [600, 1200, 1800]) {
          const at = Math.max(180, Math.round(t1 - lead));
          const from = runMergeBot(cfg, { seed: 12345, hours: at / 3600, wall0: now, base: () => base, keepAt: [at] }).states[at];
          if (!from) continue;
          const on = runMergeBot(cfg, { seed: 12345, hours: 2, seasons: 1, start: from, wall0: now, habits: { hoardBoxes: true }, stop: (g) => ready(g) || done(g) }).game;
          if (ready(on)) {
            state = on;
            break;
          }
        }
        state = state ?? first;
      }
    } else {
      const at = name === 'early' ? 180 : 1800;
      const run = runMergeBot(cfg, { seed: 12345, hours: at / 3600, wall0: now, base: () => base, keepAt: [at] });
      state = run.states[at] ?? run.game;
    }
  } catch {
    state = null;
  }
  played.set(key, state);
  return state;
}

export function mergePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isMerge(cfg)) throw new Error('mergePreset needs a merge config');
  const base = E.createInitialState(cfg, now) as R.MergeGame;
  if (name === 'fresh') return base;
  const f = mergeFixtures(cfg);
  const pick = botState(cfg, name, base, now) ?? (name === 'early' ? f.minute3 : name === 'mid' ? f.minute10 : f.festivalNear);
  // The app's own shared fields (seeds, missions, timers) with the played state's cash, purchases, play time and merge state, dated now (no time away is paid on load).
  return {
    ...base,
    cash: pick.cash,
    runEarnings: pick.runEarnings,
    lifetimeEarnings: pick.lifetimeEarnings,
    entitlements: pick.entitlements,
    merge: pick.merge,
    lastSavedAt: now,
    stats: { ...base.stats, playSeconds: pick.stats.playSeconds, clockHigh: now },
  } as GameState;
}
