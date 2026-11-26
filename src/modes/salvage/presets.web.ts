/**
 * The web preview's `?preset=` states of a salvage game:
 *   ?preset=fresh   second 0, the full yard: the REAL fresh state of the game's own content (the rules'
 *                   createSalvage: every zone's old stock, the drop-off's first arrival, the hand stripper)
 *   ?preset=m5      minute 5 (also ?preset=early): the sack truck, a yard hand, a lot in the bays, the flatbed away
 *   ?preset=m15     minute 15: rung 2 just reached, the deal offered, the boss driving the weighed trial skip
 *   ?preset=m30     minute 30 (also ?preset=mid): everything of the hour owned, a heat ready to pour, a held bay, a deal, the truck out
 *   ?preset=back    after time away (also ?preset=late): the away card waiting
 *   ?preset=m30&pour=1 (and ?preset=pour once the shared list has the alias) the FIRST POUR (finding L2:
 *                   the store's first screenshot and the confirmation): m5 PLAYED on by the same person
 *                   on the real rules to the first brass heat, the boss walked to the crucible's apron
 *                   (within first_wait_m) and frozen ONE SECOND before the heat ends. The rules have no
 *                   pour leg to hold still (crucible.ts: heating -> ready -> cooling in one step), so the
 *                   view lets it run: the heat ends under the curtain, the first pour waits for a fresh
 *                   boss (presence, staleS), and pours by the boss as soon as the curtain parts and the
 *                   world sends presence again. Its one event (after the curtain): the play's last copper
 *                   weigh-in ticket. It is played from m5 (no time away), since on the game's own content
 *                   the first pour is already behind m15.
 * m5, m15, m30 and back are the frozen states PLAYED through the real engine on the game's own content
 * (src/engine/fixtures/salvage.ts playedGame, src/engine/salvage/director.ts; about 2 s once). m5, m30 and back reach this function as early, mid and late (src/dev/presets.web.ts
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
import { playedEvents, playedGame, playedOn, stage2Game, STAGE2_EVENTS, STAGE2_NAMES, type FixtureName, type Stage2Name } from '../../engine/fixtures/salvage';
import * as R from '../../engine/salvage';
import { person } from '../../engine/salvage/director';
import { hand, standUntil, walkTo } from '../../engine/salvage/play';
import { pointOf } from '../../engine/salvage/positions';
import type { SalvageEvent, SalvageGame } from '../../engine/salvage/types';
import type { GameState } from '../../engine/types';
import { modeEvents } from '../../state/modeEvents';

const BY_PRESET: Record<PresetName, FixtureName> = { fresh: 'fresh', early: 'm5', mid: 'm30', late: 'back' };

/** The preset the address asked for by the fixture's own name (m15 shares `mid` with m30 in the shared list). */
function askedFixture(name: PresetName): FixtureName {
  const asked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preset') : null;
  return asked === 'm15' ? 'm15' : BY_PRESET[name];
}

let pending: ReturnType<typeof setInterval> | null = null;

/** Emits a frozen state's events once, after the loading curtain has parted (the pump is listening by then). */
function emitWhenShown(cfg: R.SalvageConfig, name: FixtureName): void {
  emitEventsWhenShown(playedEvents(cfg, name));
}

/** How long the pour preset's heat is held under the curtain at most, yard seconds (released when shown). */
const HOLD_S = 3600;
let heldHeat: ReturnType<typeof setInterval> | null = null;

/** Once the curtain has parted (and 0.9 s on), the held first heat ends `left` yard seconds later. */
function releaseHeatWhenShown(left: number): void {
  if (typeof location === 'undefined') return;
  if (heldHeat) clearInterval(heldHeat);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { loadingClock } = require('../../ui/salvage/loading/clock') as typeof import('../../ui/salvage/loading/clock');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useGame } = require('../../state/store') as typeof import('../../state/store');
  let after = -1;
  heldHeat = setInterval(() => {
    if (!loadingClock.done.value) return;
    if (after < 0) after = Date.now() + 900;
    if (Date.now() < after) return;
    if (heldHeat) clearInterval(heldHeat);
    heldHeat = null;
    useGame.setState((st) => {
      const g = st.game as unknown as SalvageGame;
      const cr = g.salvage?.machines.crucible;
      if (!cr || cr.firstPoured || cr.phase !== 'heating') return {};
      const crucible = { ...cr, endsAt: g.salvage.t + left };
      return { game: { ...g, salvage: { ...g.salvage, machines: { ...g.salvage.machines, crucible } } } as unknown as typeof st.game };
    });
  }, 250);
}

function emitEventsWhenShown(events: readonly SalvageEvent[]): void {
  if (!events.length || typeof location === 'undefined' || new URLSearchParams(location.search).get('events') === '0') return;
  if (pending) clearInterval(pending);
  // Required here, not at the top: the clock holds Reanimated values, which the entry's node tests cannot load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { loadingClock } = require('../../ui/salvage/loading/clock') as typeof import('../../ui/salvage/loading/clock');
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

/** The address asks for the first pour: `?preset=pour` (once aliased in the shared list) or `?preset=m30&pour=1`. */
function askedPour(): boolean {
  if (typeof location === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  return q.get('preset') === 'pour' || q.get('pour') === '1';
}

export interface PouredState {
  game: SalvageGame;
  /** The events it re-emits once after the curtain: the play's last copper weigh-in (when one was weighed). */
  events: SalvageEvent[];
  /** Always true: the content's first pour is still to come (the boss pours it). */
  first: boolean;
  /** Seconds left of the heat at the frozen moment. */
  heatLeft_s: number;
}

const pourCache = new WeakMap<object, PouredState | null>();
const isCopper = (cfg: R.SalvageConfig, grade: string) => cfg.salvage.grades[grade]?.material === 'copper';

/** The first brass heat is under way (filling, heating or ready) and not yet poured. */
function firstBrassHeat(g: SalvageGame): boolean {
  const c = g.salvage.machines.crucible;
  return c.owned && c.recipe !== 'alu' && !c.firstPoured && c.charge_g > 0 && (c.phase === 'filling' || c.phase === 'heating' || c.phase === 'ready');
}

/**
 * The first pour, PLAYED on a content (memoised per content object; null when the play reaches no first
 * brass heat within an hour more). From m5 the director's person plays on (no time away) until the first
 * brass charge is in the crucible, walks to the apron (within first_wait_m), and stands there until one
 * second of the heat is left. Pure (tests run it).
 */
export function playPour(cfg: R.SalvageConfig, dt = 0.25): PouredState | null {
  if (pourCache.has(cfg.salvage)) return pourCache.get(cfg.salvage) ?? null;
  const p = playedOn(cfg);
  const h = hand(cfg, structuredClone(p.games.m5) as SalvageGame, p.now.m5, dt);
  h.events = [...p.events.m5];
  const cr = () => h.g.salvage.machines.crucible;
  person(h, h.g.salvage.t + 3600, firstBrassHeat);
  let out: PouredState | null = null;
  if (firstBrassHeat(h.g) && cr().phase !== 'ready') {
    const c = cfg.salvage;
    const pad = c.map.places.crucible;
    const at = pointOf(c, 'crucible');
    // The apron: south of the pad, by the lever, well within first_wait_m.
    walkTo(h, at.x, at.y + (pad?.d ?? 2) / 2 + c.worker.radius + 0.3);
    standUntil(h, (g) => {
      const k = g.salvage.machines.crucible;
      return k.firstPoured || (k.phase === 'heating' && (k.endsAt ?? 0) - g.salvage.t <= 1);
    }, 900);
    const left = (cr().endsAt ?? 0) - h.g.salvage.t;
    if (!cr().firstPoured && cr().phase === 'heating' && left > 0) {
      const copper = [...h.events].reverse().find((e) => e.type === 'weighIn' && e.ticket.kind === 'weighIn' && e.ticket.lines.some((l) => isCopper(cfg, l.grade)));
      out = { game: h.g, events: copper ? [copper] : [], first: true, heatLeft_s: left };
    }
  }
  pourCache.set(cfg.salvage, out);
  return out;
}

export function salvagePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isSalvage(cfg)) throw new Error('salvagePreset needs a salvage config');
  const base = E.createInitialState(cfg, now);
  if (askedPour()) {
    const poured = playPour(cfg);
    if (poured) {
      const g = poured.game;
      const salvage = structuredClone(g.salvage);
      salvage.epoch += 1;
      salvage.clock = { ...salvage.clock, highMs: Math.max(now, salvage.clock.highMs) };
      // desk1: the heat is HELD under the curtain (its end far off) and let go a moment after the curtain
      // has parted, so the pour (and the pourer's shield and apron, frame.ts POUR_LOOK_S) happens in view:
      // the yard's clock runs on under the curtain and the boss's presence reaches the rules before it parts.
      const left = Math.max(0.5, poured.heatLeft_s) + 1.5;
      salvage.machines.crucible.endsAt = salvage.t + HOLD_S;
      releaseHeatWhenShown(left);
      emitEventsWhenShown(structuredClone(poured.events));
      return { ...base, cash: g.cash, lifetimeEarnings: g.lifetimeEarnings, runEarnings: g.lifetimeEarnings, stats: { ...base.stats, playSeconds: g.stats.playSeconds }, salvage, lastSavedAt: now } as GameState;
    }
    console.warn('[preset] pour: the play reached no brass heat; showing m30');
  }
  // The stage-2 frozen states by their own names (?preset=r3 | r3plain | held14): rung 3 with the crew in runs,
  // looked at before the stage's own prepared yards exist (the lead, 26 Nov; wiring2 replaces this with its rows).
  const asked2 = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('preset') : null;
  if (asked2 && (STAGE2_NAMES as readonly string[]).includes(asked2)) {
    const n = asked2 as Stage2Name;
    emitEventsWhenShown(structuredClone(STAGE2_EVENTS[n]) as SalvageEvent[]);
    return { ...stage2Game(n, base, now), lastSavedAt: now } as GameState;
  }
  const fixture = askedFixture(name);
  if (fixture === 'fresh') {
    const g = R.createSalvage(cfg, base, now);
    return { ...g, salvage: { ...g.salvage, epoch: g.salvage.epoch + 1 }, lastSavedAt: now } as GameState;
  }
  // The frozen states PLAYED on the game's own content through the real engine (rules-sim 17:40, director.ts).
  emitWhenShown(cfg, fixture);
  return { ...playedGame(cfg, fixture, base, now), lastSavedAt: now } as GameState;
}

/** The preview's probe for the integrator's play scripts: `__yard()` returns the store's state (read only). */
(globalThis as { __yard?: () => unknown }).__yard = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('../../state/store') as typeof import('../../state/store')).useGame.getState();
