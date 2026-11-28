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
 *
 * THE WORKS (stage 2; C-MODE, PLAN2 2.4 and 2.6), with `&stage=2` on the address (./stage.web.ts):
 *   ?preset=w3open | w3 | w3save | w3letter | w3sale | w3van | w3lot | w4entry | w4arrive | w4pour | w4hall | w4line |
 *           w4loan | w4packs | w4all | w4back | w5 | w5wait | w3plain | w4plain   (WORKS_PRESETS; PLAN2 2.6 says each moment)
 *     the recorded states of the works (C-FIXTURE records them into src/engine/fixtures/salvage-works.json and
 *     src/engine/fixtures/salvage.ts hands them over by name: `worksPresetState`). Until a name is recorded the
 *     preview loads the frozen rung-3 state r3 with a loud warning in the console (and so does a stale recording).
 * Switches on top of any preset (C-MODE, critic-build F10):
 *   &cam=gate|works|sale|lane  the boss on foot at the yard's gate, the works road's stop, the Yard sale's rack zone or the
 *                              lane outside the gate (the dealer's van stop); the camera follows him (no camera code)
 *   &age=due                   the second session begun and no age band: the age question is due
 *   &band=u13                  the second session begun and the band u13 kept
 *   &country=XX                the store country the shop reads (region.ts setStorefrontForDev): a code, auto or none
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
import * as Fixtures from '../../engine/fixtures/salvage';
import { stageOn } from './stage';

/** The works' recorded moments by name (PLAN2 2.6); src/dev/presets.web.ts PRESET_ALIASES maps each to `late`. */
export const WORKS_PRESETS = ['w3open', 'w3', 'w3save', 'w3letter', 'w3sale', 'w3van', 'w3lot', 'w4entry', 'w4arrive', 'w4pour', 'w4hall', 'w4line', 'w4loan', 'w4packs', 'w4all', 'w4back', 'w5', 'w5wait', 'w3plain', 'w4plain'] as const;
export type WorksPreset = (typeof WORKS_PRESETS)[number];

/**
 * THE SEAM to C-FIXTURE (requests.md, 28 Nov): src/engine/fixtures/salvage.ts exports
 * `worksPresetState(name, base, now)`: the recorded state at device time `now` (as stage2Game does), the events to
 * emit once after the curtain, and `stale` (null, or why the recording's content hash no longer matches the content).
 * Until it exists (or for a name it does not hold: null) the preview shows r3 with a warning (worksPresetOf).
 */
export interface WorksPresetState {
  game: SalvageGame;
  events: readonly SalvageEvent[];
  stale: string | null;
}
type WorksLoader = (name: WorksPreset, base: GameState, now: number) => WorksPresetState | null;
const worksLoader = (): WorksLoader | null => (Fixtures as unknown as { worksPresetState?: WorksLoader }).worksPresetState ?? null;

/** A works preset: the recorded state when there is one, else the frozen rung-3 state r3 (both with their events once after the curtain). */
export function worksPresetOf(name: WorksPreset, base: GameState, now: number): { game: GameState; events: readonly SalvageEvent[]; note: string | null } {
  const rec = worksLoader()?.(name, base, now) ?? null;
  if (rec) return { game: rec.game as unknown as GameState, events: rec.events, note: rec.stale ? `STALE RECORDING ${name}: ${rec.stale} (re-record: scripts/content/yard/record-works.ts)` : null };
  return { game: stage2Game('r3', base, now) as unknown as GameState, events: STAGE2_EVENTS.r3, note: `${name} is not recorded yet (C-FIXTURE): showing r3, the frozen rung-3 state` };
}

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

/**
 * owner2-hud (the one button gets in, ruling 18.4): `&getin=gate | weighbridge | park | rack` on any preset puts the
 * truck (owned, free) and the boss on foot beside it, as just after Step out: at the gate, on the weighbridge, at its
 * park (the boss on the park's card side), or two metres off the tool rack with the boss at the rack.
 */
function withGetIn(cfg: R.SalvageConfig, g: GameState): GameState {
  const at = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('getin') : null;
  const sg = g as unknown as SalvageGame;
  if (!at || !sg.salvage) return g;
  const c = cfg.salvage;
  const p = (id: string) => pointOf(c, id);
  const spots: Record<string, { tr: { x: number; y: number }; boss: { x: number; y: number }; heading: number }> = {
    gate: { tr: { x: p('gate').x - 0.6, y: p('gate').y }, boss: { x: p('gate').x - 0.6, y: p('gate').y + 1.9 }, heading: 2 },
    weighbridge: { tr: p('weighbridge'), boss: { x: p('weighbridge').x, y: p('weighbridge').y + 1.9 }, heading: 2 },
    park: { tr: p('park'), boss: { x: p('park').x - 1.6, y: p('park').y }, heading: 4 },
    rack: { tr: { x: p('rack').x, y: p('rack').y + 2.8 }, boss: { x: p('rack').x, y: p('rack').y + 0.8 }, heading: 2 },
  };
  const sp = spots[at];
  if (!sp) return g;
  const s = sg.salvage;
  const salvage = {
    ...s,
    epoch: s.epoch + 1,
    owned: s.owned.includes('truck') ? s.owned : [...s.owned, 'truck'],
    truck: { ...s.truck, owned: true, by: null, trip: null, x: sp.tr.x, y: sp.tr.y, heading: sp.heading },
    arriving: s.arriving.filter((r) => r.item !== 'truck'),
    presence: { ...s.presence, x: sp.boss.x, y: sp.boss.y, driving: false, moving: false, standingFor: 1 },
    counts: { ...(s.counts ?? {}), 'truck:out': 1 },
    act: { kind: 'none', target: null, since: s.t, endsAt: null },
  };
  return { ...g, salvage } as unknown as GameState;
}

export function salvagePreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (!R.isSalvage(cfg)) throw new Error('salvagePreset needs a salvage config');
  return withSwitches(cfg, withGetIn(cfg, presetOf(cfg, name, now)), addressSwitches());
}

/** The works' address switches (C-MODE, F10): cam, age, band, country; each null when absent or unknown. */
export interface PresetSwitches {
  cam: 'gate' | 'works' | 'sale' | 'lane' | null;
  age: 'due' | null;
  band: 'u13' | null;
  /** A store country code, 'auto', or 'none' (unknown). */
  country: string | null;
}

function addressSwitches(): PresetSwitches {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const pick = <T extends string>(k: string, ok: readonly T[]): T | null => {
    const v = q?.get(k);
    return v && (ok as readonly string[]).includes(v) ? (v as T) : null;
  };
  const country = q?.get('country') ?? null;
  return { cam: pick('cam', ['gate', 'works', 'sale', 'lane'] as const), age: pick('age', ['due'] as const), band: pick('band', ['u13'] as const), country: country && /^([A-Za-z]{2}|auto|none)$/.test(country) ? country : null };
}

/**
 * Where `cam` puts the boss, from the content (map keys, never a number here): the yard's gate (map.points.gate), the
 * works road's stop (map.works.driveLine.stops.works), the Yard sale's rack zone (map.works.points['reuseRack.zone']), the
 * lane outside the gate (map.works.laneStops.van). Null when the content has no such key (a first-yard-only content).
 */
export function camPoint(c: R.SalvageConfig['salvage'], cam: NonNullable<PresetSwitches['cam']>): { x: number; y: number } | null {
  const m = c.map as unknown as { points: Record<string, [number, number]>; works?: { points?: Record<string, [number, number]>; driveLine?: { stops?: Record<string, [number, number]> }; laneStops?: Record<string, [number, number]> } };
  const p = cam === 'gate' ? m.points.gate : cam === 'works' ? m.works?.driveLine?.stops?.works : cam === 'sale' ? m.works?.points?.['reuseRack.zone'] : m.works?.laneStops?.van;
  return p ? { x: p[0], y: p[1] } : null;
}

/** The switches applied to a preset's state (pure, but `country`, which sets region.ts's development country). */
export function withSwitches(cfg: R.SalvageConfig, g: GameState, sw: PresetSwitches): GameState {
  const sg = g as unknown as SalvageGame;
  if (!sg.salvage) return g;
  let s = sg.salvage;
  if (sw.cam) {
    const at = camPoint(cfg.salvage, sw.cam);
    if (!at) console.warn(`[preset] cam=${sw.cam}: this content has no such place`);
    else {
      // On foot at the point (out of the truck or the forklift, which stay where they are), as withGetIn does.
      s = {
        ...s,
        epoch: s.epoch + 1,
        truck: s.truck.by === 'boss' ? { ...s.truck, by: null } : s.truck,
        forklift: s.forklift && s.forklift.by === 'boss' ? { ...s.forklift, by: null } : s.forklift,
        presence: { ...s.presence, x: at.x, y: at.y, driving: false, moving: false, standingFor: 1, vehicle: null },
        act: { kind: 'none', target: null, since: s.t, endsAt: null },
      };
    }
  }
  if (sw.age === 'due' || sw.band === 'u13') {
    const iap = s.iap;
    s = { ...s, iap: { ...iap, sessions2At: iap.sessions2At ?? s.t, ageBand: sw.band === 'u13' ? 'u13' : null } };
  }
  if (sw.country) {
    // Required here: region.ts imports react-native (the presets' node tests load this file).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setStorefrontForDev } = require('../../services/region') as typeof import('../../services/region');
    setStorefrontForDev(sw.country === 'auto' ? 'auto' : sw.country === 'none' ? null : sw.country.toUpperCase());
  }
  return s === sg.salvage ? g : ({ ...g, salvage: s } as unknown as GameState);
}

function presetOf(cfg: R.SalvageConfig, name: PresetName, now: number): GameState {
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
  // The works' recorded moments (C-MODE; PLAN2 2.6): played on the stage-2 content, so `&stage=2` belongs with them.
  if (asked2 && (WORKS_PRESETS as readonly string[]).includes(asked2)) {
    if (!stageOn()) console.warn(`[preset] ${asked2} is a works moment: add &stage=2 to the address (without it the yard runs as the first yard)`);
    const w = worksPresetOf(asked2 as WorksPreset, base, now);
    if (w.note) console.warn(`[preset] ${w.note}`);
    emitEventsWhenShown(structuredClone(w.events) as SalvageEvent[]);
    return { ...w.game, lastSavedAt: now } as GameState;
  }
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
