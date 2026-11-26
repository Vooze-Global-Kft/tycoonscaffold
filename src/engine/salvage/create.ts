/**
 * A new yard and a loaded save (yard-stage1.md 2.13; E1: the yard the player takes over is FULL of old
 * stock by zone). The state is built from content alone: every zone's things as instances, the
 * drop-off's fixed first arrivals at their places, the inherited hand stripper on its pad, each
 * partner's trial load waiting, the truck's park, the clock at `now`.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { GameState } from '../types';
import { marketDay } from './board';
import { pointOf } from './positions';
import { seriesKey } from './series';
import { freshStage2 } from './state2';
import type { CrucibleState, MachineState, PartnerState, SalvageConfig, SalvageGame, SalvageState, ThingState } from './types';

const machine = (owned: boolean): MachineState => ({ owned, level: owned ? 1 : 0, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: owned ? 'idle' : 'notOwned', since: 0 });

/** The old stock as things, zone by zone in content order (uids `${zone}.${obj}.${k}`, k counted per zone). */
export function stockThings(c: SalvageContent): ThingState[] {
  const out: ThingState[] = [];
  for (const [zone, z] of Object.entries(c.zones)) {
    let k = 0;
    for (const [obj, n] of Object.entries(z.things)) for (let i = 0; i < n; i++, k++) out.push({ uid: `${zone}.${obj}.${k}`, obj, at: { at: 'zone', zone, k }, cut: 0, progress: 0, by: null });
  }
  c.dropoff.initial.forEach((obj, slot) => out.push({ uid: `d${slot}`, obj, at: { at: 'dropoff', slot }, cut: 0, progress: 0, by: null }));
  return out;
}

/** A partner's fresh state (closed, its trial load full); also the works layer's partners at the works' opening (works.ts worksOpen). */
export function partnerOf(c: SalvageContent, id: string): PartnerState {
  const p = c.partners[id];
  const mass = Object.entries(p.trial).reduce((a, [o, n]) => a + (c.objects[o]?.gross_g ?? 0) * n, 0);
  return { open: false, trialUsed: false, level: 0, skips: [{ slot: 0, phase: 'full', setAt: 0, fullAt: 0, contents: { ...p.trial }, mass_g: mass, price: p.trialPrice, priceDay: 0, trial: true, n: 0 }] };
}

/** A fresh salvage state at device time `now` (epoch ms). */
export function freshSalvage(c: SalvageContent, now: number): SalvageState {
  const day = marketDay(c, now);
  const park = pointOf(c, 'park');
  const first = Object.keys(c.machines.crucible.recipes)[0] ?? 'brass';
  const crucible: CrucibleState = { ...machine(false), recipe: first, fromBays: true, charge_g: 0, heel_g: 0, phase: 'empty', phaseSince: 0, endsAt: null, lastFeedAt: 0, firstPoured: false, cooling: null };
  return {
    v: 3,
    t: 0,
    epoch: 0,
    clock: { highMs: now, day, startDay: day },
    owned: [],
    arriving: [],
    tier: 1,
    carrier: 'frame',
    load: [],
    presence: { ...pointOf(c, 'start'), driving: false, moving: false, standingFor: 0, heading: 0 },
    presenceAt: -1,
    act: { kind: 'none', target: null, since: 0, endsAt: null },
    things: stockThings(c),
    pieces: [],
    waste_g: 0,
    scaleRound_g: 0,
    bays: {},
    machines: { hand_stripper: machine(true), stripper: machine(false), bench: machine(false), crucible },
    crew: [],
    partners: Object.fromEntries(Object.keys(c.partners).map((id) => [id, partnerOf(c, id)])),
    truck: { owned: false, x: park.x, y: park.y, heading: 0, skip: null, by: null, trip: null, hookSince: null, earmark: null },
    merchant: { phase: 'waiting', since: 0, endsAt: null, lot: [] },
    dropoff: { nextAt: c.dropoff.first, n: c.dropoff.initial.length },
    deal: { step: null, phase: 'offered', q_g: 0, days: 0, price: 0, delivered: 0, trust: c.deal.trust.start, last: null },
    foreman: { day, used_s: 0, lastWorkAt: -1 },
    ladder: { supplied_g: 0, worth: {}, rung: 1, passed: 0 },
    goals: { done: [], skipped: [], lastPromptAt: -1e9, repeats: 0 },
    lessonsSeen: [],
    seen: { places: [], cards: [] },
    tickets: [],
    ticketNo: 1,
    away: null,
    draws: 0,
    beenAway: false,
    income: { minute: 0, buckets: [0, 0, 0, 0, 0] },
    // The two ticket books (W16, series.ts): the last number printed in each, from 0.
    counts: { [seriesKey('weigh')]: 0, [seriesKey('sale')]: 0 },
    // Stage 2 (contract v3, 2.18): the stage's fields, fresh (./state2.ts; the migration gives a layout-2 save the same).
    ...freshStage2(c, now, day),
  };
}

export function createSalvage(cfg: SalvageConfig, base: GameState, now: number): SalvageGame {
  return { ...base, salvage: freshSalvage(cfg.salvage, now) };
}

/**
 * A loaded save repaired against the content. STUB(hour 0): a save of this layout (`v: 2` with the
 * fields present) is taken as it is (its epoch bumped: the world snaps); anything else starts afresh.
 * The rules package writes the real reconcile (unknown things and grades dropped, new partners and
 * machines added, numbers clamped).
 */
export function reconcileSalvage(cfg: SalvageConfig, base: GameState, raw: unknown, now: number): SalvageGame {
  const r = (raw as { salvage?: Partial<SalvageState> } | null)?.salvage;
  const fresh = freshSalvage(cfg.salvage, now);
  if (!r || ((r.v as number) !== 2 && r.v !== 3) || !Array.isArray(r.things) || typeof r.clock !== 'object' || r.clock === null) return { ...base, salvage: fresh };
  return { ...base, salvage: { ...fresh, ...r, epoch: (Number(r.epoch) || 0) + 1, clock: { ...fresh.clock, ...r.clock, highMs: Math.max(fresh.clock.highMs, Number(r.clock.highMs) || 0) } } as SalvageState };
}

// ============================================================================ the facade's entries (the seam, 16:20)

/** True for a config of mode "salvage" whose block was parsed (src/engine/salvageMode.ts `config`). */
export function isSalvage(cfg: import('../../config/schema').GameConfig): cfg is SalvageConfig {
  const s = cfg.salvage as { grades?: unknown; map?: unknown } | undefined;
  return cfg.mode === 'salvage' && !!s && typeof s.grades === 'object' && typeof s.map === 'object';
}

/** Facade `freshSalvage(cfg, now)`: a fresh salvage state at device time `now` (epoch ms): the full yard of E1. */
export function freshSalvageCfg(cfg: SalvageConfig, now: number): SalvageState {
  return freshSalvage(cfg.salvage, now);
}

/** The state, with `salvage` made when a bare shared state (a test) has none. */
export function withSalvageFields(cfg: SalvageConfig, g: GameState, now = 0): SalvageGame {
  const s = g as SalvageGame;
  return s.salvage ? s : createSalvage(cfg, g, now);
}
