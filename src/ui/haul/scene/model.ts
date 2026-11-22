/**
 * What the field draws, computed on the JavaScript thread (spec 4.3): the fixed geometry of each
 * slot from the layout, the per-tick frame table the frame worklet animates from (pushed into a
 * shared value at each 10 Hz store change: no React render), and the small view models of the
 * pieces React draws (rigs, piles, labels, chips, ghost slots, station parts), which change only
 * when what they show changes. Pure (no React); every name, number and colour comes from the
 * config, the engine and the art kit.
 */
import * as H from '../../../engine/haul';
import { formatShort } from '../../../engine/format';
import { GHOST_STEPS } from '../art/pictures';
import { ATLAS_HEAD_R, ATLAS_ROCK_R, ORE_IDS, RACK_CRADLES, STAR_NODES, hullFor, pileSpot, rigHeads, rigLookFor, rigStripesFor, rockShapeIndex, segmentsFor, type HaulAtlas, type LampState, type RigLook, type StarNode } from '../art';
import type { FieldLayout, Pt } from '../layout';
import { runParams } from '../useRun';

export type Run = H.HaulGame & { haul: H.HaulState };

/** Drones drawn per route and on the rack (errata 41): the chip and the rack's "+n" show the true count. */
export const MAX_DRAWN_PER_ROUTE = 4;
export const MAX_DRAWN_ON_RACK = 6;
/** Atlas capacities: A = rocks and their overlays (under the rigs); B = drill heads, chunks, debris, drones (over them). */
export const ATLAS_A = 36;
export const ATLAS_B = 176;

/** Fixed, per-layout geometry of one slot. */
export interface SlotGeo {
  slot: number;
  x: number;
  y: number;
  r: number;
  /** Unit vector from the station to the rock. */
  ux: number;
  uy: number;
  /** Where drones unload (at the station ring) and load (at the rock's edge). */
  a: Pt;
  b: Pt;
  /** The pile and its label (outward side of the rock). */
  pile: Pt;
  label: Pt;
  /** Where a new rock drifts in from (the field edge along the slot's bearing). */
  e: Pt;
}

/** The point routes meet at: the station hub (the station is drawn over the ends). */
export function hubPoint(layout: FieldLayout): Pt {
  return { x: layout.station.x, y: layout.station.y - layout.station.r * 0.3 };
}

export function slotGeometry(layout: FieldLayout): SlotGeo[] {
  const st = layout.station;
  const hub = hubPoint(layout);
  return layout.rocks.map((rk) => {
    const dx = rk.x - hub.x;
    const dy = rk.y - hub.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const avoid = layout.rocks.filter((o) => o.slot !== rk.slot).map((o) => [o.x, o.y, o.r + 8] as [number, number, number]);
    const spot = pileSpot(rk.x, rk.y, st.x, st.y, rk.r, avoid);
    // The drift starts beyond the top or side edge along the bearing from the station.
    const reach = Math.max(layout.width, layout.height);
    return {
      slot: rk.slot,
      x: rk.x,
      y: rk.y,
      r: rk.r,
      ux,
      uy,
      a: { x: hub.x + ux * st.r * 0.85, y: hub.y + uy * st.r * 0.85 },
      b: { x: rk.x - ux * (rk.r + 3), y: rk.y - uy * (rk.r + 3) },
      pile: spot.pile,
      label: spot.label,
      e: { x: rk.x + ux * reach * 0.6, y: rk.y + uy * reach * 0.6 },
    };
  });
}

/** Times (run clock) of the field's one-off effects, written from the engine's events. */
export interface FieldFx {
  arrive: number[];
  crumble: number[];
  flareAt: number;
  flareSlot: number;
  warpAt: number;
}

export const emptyFx = (n: number): FieldFx => ({ arrive: new Array(n).fill(-1e9), crumble: new Array(n).fill(-1e9), flareAt: -1e9, flareSlot: -1, warpAt: -1e9 });

/** One claimed slot in the frame table (plain numbers and strings: it is copied to the UI thread). */
export interface FrameSlot {
  slot: number;
  x: number;
  y: number;
  /** Atlas scale of the rock (r / ATLAS_ROCK_R). */
  size: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ex: number;
  ey: number;
  px: number;
  py: number;
  /** Heading of an outbound drone (radians). */
  out: number;
  /** Rock sprite ('' while the slot waits for its next rock), overlay sprite ('' none), dry glow sprite ('' unless dry). */
  rock: string;
  over: string;
  glow: string;
  /** Seconds per spin turn (seeded 60 to 90). */
  spin: number;
  /** Drill heads in screen points: x, y, size, ... */
  heads: number[];
  drilling: number;
  n: number;
  trip: number;
  routeFrom: number;
  /** The ore's index in ORE_IDS (the frame loop's per-ore sprite lists: drones, chunks, shards). */
  oi: number;
  arrive: number;
  crumble: number;
}

export interface FrameTable {
  version: number;
  clock: number;
  slots: FrameSlot[];
  holdFull: number;
  /** 1 when the hold has cargo (the landing freighter ends at its loaded scale). */
  cargo: number;
  /** Idle drones drawn on the rack, at most 6: x, y, ... */
  rack: number[];
  /** Freighter: 0 docked, 1 climb, 2 away, 3 land; seconds left in the phase. */
  phase: number;
  phaseT: number;
  flareAt: number;
  warpAt: number;
  fx0: number;
  fy0: number;
  fx1: number;
  fy1: number;
}

export const EMPTY_TABLE: FrameTable = { version: 0, clock: 0, slots: [], holdFull: 0, cargo: 0, rack: [], phase: 0, phaseT: 0, flareAt: -1e9, warpAt: -1e9, fx0: 0, fy0: 0, fx1: 0, fy1: 0 };

const PHASES: Record<string, number> = { docked: 0, climb: 1, away: 2, land: 3 };

/** Life the current rock started with (for the crack overlays at 50 % and 15 %). */
function startLife(cfg: H.HaulConfig, h: H.HaulState, slot: number, s: H.HaulState['slots'][number], starMap: H.HaulGame['starMap']): number {
  const rock = H.rockAt(cfg, h.seed, slot, s.rockN, h.trait, starMap);
  const life = rock.bonanza && !s.bonanza ? rock.life / cfg.haul.bonanza.life : rock.life;
  return Math.max(s.life, life * H.rigTier(cfg, s.rigLevel).life);
}

/** The art kit's sprite for an ore id (unknown ores fall back to iron's sprites). */
const oreKey = (ore: string) => ((ORE_IDS as readonly string[]).includes(ore) ? ore : ORE_IDS[0]);

export function spinSeconds(slot: number, rockN: number): number {
  return 60 + ((slot * 37 + Math.max(0, rockN) * 11) % 31);
}

/**
 * The frame table of a tick. `stress` (development only, `?fieldStress=1`): every slot drawn as a
 * claimed, drilling rock with 4 drones and 6 on the rack, the worst case of errata 41's budget.
 */
export function buildFrame(cfg: H.HaulConfig, g: Run, geo: SlotGeo[], layout: FieldLayout, fx: FieldFx, version: number, stress = false): FrameTable {
  const h = g.haul;
  const p = runParams(cfg, g);
  const slots: FrameSlot[] = [];
  h.slots.forEach((s0, i) => {
    const gg = geo[i];
    const s = stress ? { ...s0, claimed: true, haulers: 4, respawnAt: null, rockN: Math.max(0, s0.rockN), life: Math.max(1, s0.life), full: false, rigLevel: Math.max(35, s0.rigLevel), routeFrom: -i } : s0;
    if (!s.claimed || !gg) return;
    const ore = oreKey(s.ore);
    const present = s.respawnAt === null && s.rockN >= 0;
    const shape = rockShapeIndex(i, s.rockN);
    const life0 = present ? startLife(cfg, h, i, s, g.starMap) : 1;
    const f = life0 > 0 ? s.life / life0 : 0;
    const dry = present && s.life <= 0;
    const look = rigLookFor(s.rigLevel);
    const k = gg.r / 26;
    const heads: number[] = [];
    if (present && !dry) for (const hd of rigHeads(look)) heads.push(gg.x + hd.x * k, gg.y + hd.y * k, (hd.r / ATLAS_HEAD_R) * k);
    const sp = p.slots[i];
    slots.push({
      slot: i,
      x: gg.x,
      y: gg.y,
      size: gg.r / ATLAS_ROCK_R,
      ax: gg.a.x,
      ay: gg.a.y,
      bx: gg.b.x,
      by: gg.b.y,
      ex: gg.e.x,
      ey: gg.e.y,
      px: gg.pile.x,
      py: gg.pile.y,
      out: Math.atan2(gg.uy, gg.ux),
      rock: !present ? '' : dry ? `dry-${shape}` : `rock-${shape}-${ore}`,
      over: !present || dry ? '' : s.bonanza ? `bonanza-${shape}` : f < 0.15 ? `crack2-${shape}` : f < 0.5 ? `crack1-${shape}` : '',
      glow: dry ? `dryglow-${shape}` : '',
      spin: spinSeconds(i, s.rockN),
      heads,
      drilling: present && s.life > 0 && !s.full ? 1 : 0,
      n: s.haulers,
      trip: sp && Number.isFinite(sp.trip) && sp.trip > 0 && !stress ? sp.trip : 6 + i,
      routeFrom: s.routeFrom,
      oi: Math.max(0, (ORE_IDS as readonly string[]).indexOf(ore)),
      arrive: fx.arrive[i] ?? -1e9,
      crumble: fx.crumble[i] ?? -1e9,
    });
  });
  const rack: number[] = [];
  const st = layout.station;
  const sc = st.r / 40;
  for (let i = 0; i < Math.min(MAX_DRAWN_ON_RACK, stress ? 6 : h.idle); i++) {
    // Fill the inner cradles first, alternating sides: 0, 3, 1, 4, 2, 5.
    const c = RACK_CRADLES[[0, 3, 1, 4, 2, 5][i]];
    rack.push(st.x + c.x * sc, st.y + c.y * sc);
  }
  const fs = fx.flareSlot >= 0 ? geo[fx.flareSlot] : null;
  const fl = layout.zones.flare;
  return {
    version,
    clock: h.clock,
    slots,
    holdFull: H.fillsFreighter(H.holdTotal(h), p.F) ? 1 : 0,
    cargo: H.holdTotal(h) > 0 ? 1 : 0,
    rack,
    phase: PHASES[h.freighter.phase] ?? 0,
    phaseT: h.freighter.t,
    flareAt: fx.flareAt,
    warpAt: fx.warpAt,
    fx0: fl.x + fl.width / 2,
    fy0: fl.y + fl.height / 2,
    fx1: fs ? fs.x : 0,
    fy1: fs ? fs.y : 0,
  };
}

// ---------------------------------------------------------------------------
// View models of what React draws
// ---------------------------------------------------------------------------

export interface SlotVM {
  slot: number;
  claimed: boolean;
  /** Claim price label of a ghost slot (null: not a ghost). */
  ghost: string | null;
  /** How close the credits are to the ghost's price, in steps 0..GHOST_STEPS (GHOST_STEPS: affordable; play-18). */
  ghostStep: number;
  look: RigLook;
  stripes: number;
  lamp: LampState;
  /** The rock is there and has finished drifting in (rigs, piles and labels show). */
  settled: boolean;
  pileStep: -1 | 0 | 1 | 2 | 3;
  full: boolean;
  haulers: number;
  ore: string;
  seam: boolean;
}

export function slotVMs(cfg: H.HaulConfig, g: Run, fx: FieldFx): SlotVM[] {
  const h = g.haul;
  const p = runParams(cfg, g);
  const ghosts = new Set(H.ghostSlots(cfg, g));
  const sym = cfg.strings.currencySymbol;
  return h.slots.map((s, i) => {
    const cap = p.slots[i]?.cap ?? 0;
    const present = s.claimed && s.respawnAt === null && s.rockN >= 0;
    const settled = present && h.clock >= (fx.arrive[i] ?? -1e9) + 1.5;
    const frac = cap > 0 ? s.pile / cap : 0;
    const pileStep = !s.claimed || s.pile < 0.5 ? -1 : frac < 0.25 ? 0 : frac < 0.5 ? 1 : frac < 0.85 ? 2 : 3;
    const cost = !s.claimed && ghosts.has(i) ? H.claimCost(cfg, g, i) : Infinity;
    return {
      slot: i,
      claimed: s.claimed,
      ghost: Number.isFinite(cost) ? sym + formatShort(cost) : null,
      ghostStep: Number.isFinite(cost) && cost > 0 ? (g.cash >= cost ? GHOST_STEPS : Math.min(GHOST_STEPS - 1, Math.floor((Math.max(0, g.cash) / cost) * GHOST_STEPS))) : 0,
      look: rigLookFor(s.rigLevel),
      stripes: rigStripesFor(s.rigLevel),
      lamp: !present ? 'off' : s.life <= 0 ? 'dry' : s.full ? 'full' : 'run',
      settled,
      pileStep,
      full: s.full,
      haulers: s.haulers,
      ore: oreKey(s.ore),
      seam: present && H.seamOn(h, i),
    };
  });
}

/**
 * Pile labels ("iron 62/80": the ore, then the figure; a trailing '!' when full), '' where none
 * shows: their own selector, so a changing count re-renders only the labels. A label shows only
 * when it matters (play-16): ore is waiting at the rig, the pile is full, or drones wait at an
 * empty pile because the rig cannot feed them (haul rate above the drill rate). An empty pile on a
 * rig running normally shows nothing.
 */
export function pileLabels(cfg: H.HaulConfig, g: Run, fx: FieldFx): string[] {
  const h = g.haul;
  const p = runParams(cfg, g);
  return h.slots.map((s, i) => {
    const present = s.claimed && s.respawnAt === null && s.rockN >= 0;
    if (!present || h.clock < (fx.arrive[i] ?? -1e9) + 1.5) return '';
    const sp = p.slots[i];
    const waiting = s.haulers > 0 && s.life > 0 && !!sp && sp.h > sp.r * 1.05;
    if (!s.full && s.pile < 1 && !waiting) return '';
    // Decision 59 (play:new:9): the label never shows more than the pile holds; a pile over its
    // capacity (a capacity that fell under it) reads as full.
    const cap = Math.floor(sp?.cap ?? 0);
    const shown = cap > 0 ? Math.min(Math.floor(s.pile), cap) : Math.floor(s.pile);
    const full = s.full || (cap > 0 && s.pile >= cap);
    return `${oreKey(s.ore)} ${formatShort(shown)}/${formatShort(cap)}${full ? '!' : ''}`;
  });
}

export interface StationVM {
  parts: [StarNode, number][];
  beacon: boolean;
  idle: number;
  galaxy: number;
  hull: number;
  segments: number;
  docked: boolean;
  cargo: boolean;
  seamSlot: number;
  busiest: number;
}

export function stationVM(cfg: H.HaulConfig, g: Run): StationVM {
  const h = g.haul;
  const levels = g.starMap?.levels ?? {};
  const parts: [StarNode, number][] = [];
  for (const node of cfg.haul.starMap.nodes) {
    const lv = levels[node.id] ?? 0;
    if (lv >= 1 && (STAR_NODES as readonly string[]).includes(node.id)) parts.push([node.id as StarNode, lv]);
  }
  const seamSlot = h.vein.slot !== null && H.seamOn(h, h.vein.slot) ? h.vein.slot : h.flare.slot !== null && H.seamOn(h, h.flare.slot) ? h.flare.slot : -1;
  const busiest = seamSlot >= 0 ? H.busiestRoute(h, seamSlot) : null;
  return {
    parts,
    beacon: h.autopilot.online,
    idle: h.idle,
    galaxy: h.galaxy,
    hull: hullFor(h.freighter.level),
    segments: segmentsFor(h.freighter.level),
    docked: h.freighter.phase === 'docked',
    cargo: H.holdTotal(h) > 0,
    seamSlot,
    busiest: busiest ?? -1,
  };
}

/** The atlas's sprites as plain numbers (x, y, w, h, anchor x, anchor y) for the worklet. */
export function spriteTable(atlas: HaulAtlas): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [k, s] of Object.entries(atlas.sprites)) out[k] = [s.rect.x, s.rect.y, s.rect.width, s.rect.height, s.ax, s.ay];
  return out;
}
