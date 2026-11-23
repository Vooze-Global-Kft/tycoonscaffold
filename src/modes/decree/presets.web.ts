/**
 * The web preview's `?preset=fresh|early|mid|late` for a decree game (src/dev/presets.ts asks the
 * entry for these; spec 9.1: "presets from bot states"). Until the bot exists (src/engine/decree/bot.ts,
 * the bot engineer) they are the rules' hand-made fixtures (src/engine/fixtures/decree.ts), re-dated
 * to the moment of loading on the app's own shared fields:
 * - fresh: a new game (the app's own createInitialState);
 * - early: `mayorMidTerm` (day 30 of the first term, a paper on the desk);
 * - mid: `governorAtCall` (the run-up of the first governor term, a boycott running);
 * - late: `presidentTerm3`.
 * Web only: Metro takes ./presets.ts (none) for iOS and Android. Owned by the bot engineer after the
 * skeleton (it replaces the fixtures with bot states, keeping them as the fallback).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as R from '../../engine/decree';
import * as E from '../../engine/economy';
import { decreeFixtures } from '../../engine/fixtures/decree';
import type { GameState } from '../../engine/types';

export function decreePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isDecree(cfg)) throw new Error('decreePreset needs a decree config');
  const base = E.createInitialState(cfg, now) as R.DecreeGame;
  if (name === 'fresh') return base;
  const f = decreeFixtures(cfg);
  const pick = name === 'early' ? f.mayorMidTerm : name === 'mid' ? f.governorAtCall : f.presidentTerm3;
  // The app's own shared fields (seeds, timers) with the fixture's cash, play time and decree state, dated now (no time away is paid on load).
  return {
    ...base,
    cash: pick.cash,
    entitlements: pick.entitlements,
    decree: pick.decree,
    lastSavedAt: now,
    stats: { ...base.stats, playSeconds: pick.stats.playSeconds, clockHigh: now },
  } as GameState;
}
