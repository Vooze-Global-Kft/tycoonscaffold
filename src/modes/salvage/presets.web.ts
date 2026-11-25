/**
 * The web preview's `?preset=` states of a salvage game:
 *   ?preset=fresh   second 0, the full yard: the REAL fresh state of the game's own content (the rules'
 *                   createSalvage: every zone's old stock, the drop-off's first arrival, the hand stripper)
 *   ?preset=m5      minute 5 (also ?preset=early): the sack truck, a yard hand, a lot in the bays, the flatbed away
 *   ?preset=m15     minute 15: rung 2 just reached, the deal offered, the boss driving the weighed trial skip
 *   ?preset=m30     minute 30 (also ?preset=mid): everything of the hour owned, a heat ready to pour, a held bay, a deal, the truck out
 *   ?preset=back    after time away (also ?preset=late): the away card waiting
 * m5, m15, m30 and back are the contract's FROZEN states (src/engine/fixtures/salvage.ts), made for the
 * frozen test content: on the game's real content they still load (things the content lacks are not
 * drawn). m5, m30 and back reach this function as early, mid and late (src/dev/presets.web.ts
 * PRESET_ALIASES); m15 has no shared name, so it reaches it as `mid` and is told apart by the address.
 *
 * After a frozen state loads, its FIXTURE_EVENTS are emitted ONCE through modeEvents, as the rules would
 * report them, once the loading curtain has parted (so every ticket, chip, card, effect and sound of the
 * state can be looked at without the rules running): m5 a crew weigh-in and a collection; m15 the rung
 * sign, the deal's offer, the skip ticket and a refusal; m30 a weigh-in with its lesson, a collection, a
 * refusal; back the away report and a deal delivery. `&events=0` keeps them back.
 * Web only (Metro takes ./presets.ts for iOS and Android).
 */
import type { GameConfig } from '../../config/schema';
import type { PresetName } from '../../dev/presets';
import * as E from '../../engine/economy';
import { FIXTURE_EVENTS, fixtureGame, type FixtureName } from '../../engine/fixtures/salvage';
import * as R from '../../engine/salvage';
import type { GameState } from '../../engine/types';
import { modeEvents } from '../../state/modeEvents';
import { loadingClock } from '../../ui/salvage/loading/clock';

const BY_PRESET: Record<PresetName, FixtureName> = { fresh: 'fresh', early: 'm5', mid: 'm30', late: 'back' };

/** The preset the address asked for by the fixture's own name (m15 shares `mid` with m30 in the shared list). */
function askedFixture(name: PresetName): FixtureName {
  const asked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preset') : null;
  return asked === 'm15' ? 'm15' : BY_PRESET[name];
}

let pending: ReturnType<typeof setInterval> | null = null;

/** Emits a frozen state's events once, after the loading curtain has parted (the pump is listening by then). */
function emitWhenShown(name: FixtureName): void {
  const events = FIXTURE_EVENTS[name];
  if (!events.length || typeof location === 'undefined' || new URLSearchParams(location.search).get('events') === '0') return;
  if (pending) clearInterval(pending);
  let after = -1;
  pending = setInterval(() => {
    if (!loadingClock.done.value) return;
    if (after < 0) after = Date.now() + 900;
    if (Date.now() < after) return;
    if (pending) clearInterval(pending);
    pending = null;
    modeEvents.emit(structuredClone(events) as unknown[]);
  }, 250);
}

export function salvagePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isSalvage(cfg)) throw new Error('salvagePreset needs a salvage config');
  const base = E.createInitialState(cfg, now);
  const fixture = askedFixture(name);
  if (fixture === 'fresh') {
    const g = R.createSalvage(cfg, base, now);
    return { ...g, salvage: { ...g.salvage, epoch: g.salvage.epoch + 1 }, lastSavedAt: now } as GameState;
  }
  emitWhenShown(fixture);
  return { ...fixtureGame(fixture, base, now), lastSavedAt: now } as GameState;
}
