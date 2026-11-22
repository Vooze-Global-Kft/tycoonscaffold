/**
 * Field geometry of the main screen (spec 4.1, 4.2; errata 43 to 45, 49 to 51): pure, from data and
 * the screen size, no React. The contract between the scene (src/ui/haul/scene), the gestures, the
 * bay and the hints. Tests: src/ui/haul/layout.test.ts (spec 10.2).
 *
 * - Zones: the contract strip and comms slot at the top, the freighter bay at the bottom (its
 *   content height plus the home-indicator inset), the station centred above the bay.
 * - Rings: `R = k × distance × T(distance)`, k starts at `min(110, (stationY − commsBottom − 26) /
 *   maxDistance)` with `maxDistance = max(distance × T(distance))`, then shrinks by 0.96 while any
 *   rock's drawn circle meets the strip, the comms slot, the rack or the bay, or rises above the
 *   comms slot's bottom (errata 49). Under Long Haul the drawn layout is therefore the base layout.
 * - Rock drawn radius `clamp(22, 26, 26 × k × T / 110)` (errata 43); tap circle 1.2 × that (errata 51).
 *   On a field so short that neighbours come closer than 12 pt rim to rim, the radius gives way down
 *   to 18 pt to keep that gap (phone-7: 360 x 640 with three-button navigation).
 * - Chips: one per slot, claimed or not, so chips never move (errata 44): every slot's chip is
 *   placed at once by a backtracking search over t ∈ {0.25, 0.26, ..., 0.85} along the line from
 *   the station centre, keeping chips ≥ 40 pt apart and maximising the smallest clearance from the
 *   chip's centre to any rock's edge.
 * - `hitTest` priority (errata 45): idle drone on the rack > flare launcher > route chip > rock (a
 *   claimed slot) > ghost slot > station disc > launch track > background.
 */
import * as H from '../../engine/haul';
import type { HaulConfig } from '../../engine/haul';

export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface RockSpot extends Pt {
  slot: number;
  ring: number;
  /** Drawn radius (22 to 26 pt); the tap circle is 1.2 times it. */
  r: number;
}

export interface FieldLayout {
  width: number;
  height: number;
  /** The 375 x 667 layout (window height < 740). */
  compact: boolean;
  station: Pt & { r: number };
  /** The rack's two arms (hit areas of idle drones). */
  rack: { left: Rect; right: Rect };
  /** Ring radii, ring 1 first. */
  radii: number[];
  /** One per slot, claimed or not, in slot order. */
  rocks: RockSpot[];
  /** Route chip centres, one per slot (they never move). */
  chips: (Pt & { slot: number })[];
  zones: { strip: Rect; comms: Rect; field: Rect; bay: Rect; counter: Rect; hold: Rect; flare: Rect; launch: Rect; rail: Rect[] };
}

export interface Screen {
  width: number;
  height: number;
  insets: { top: number; bottom: number };
}

/** Tap radius of a rock: 1.2 × its drawn radius (errata 51). */
export const ROCK_TAP = 1.2;
/** Tap radius of a route chip (40 pt circle). */
export const CHIP_TAP_R = 20;
/** Drawn chip pill height: 24 pt (20 pt on the small screen). */
export const chipPillHeight = (compact: boolean) => (compact ? 20 : 24);
/** Tap radius of a ghost slot (64 pt circle). */
export const GHOST_TAP_R = 32;
/** Centre-to-centre spacing of chips. */
export const CHIP_SPACING = 40;
/** Points above the rack's arms that still pick up an idle drone: drones stand nose up over their cradles. */
export const RACK_REACH = 16;
/** Drop radius of a drag (spec 4.2). */
export const DROP_R = 40;
/** Flick cone, half angle in degrees (spec 4.2). */
export const FLICK_DEG = 15;
/** Smallest drawn rock radius on a short field, and the gap kept between neighbouring rocks' rims (phone-7). */
export const MIN_ROCK_R = 18;
export const ROCK_GAP = 12;

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v));
const inRect = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

/** Distance from a point to a rectangle (0 inside). */
export function rectDistance(p: Pt, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.width));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.height));
  return Math.hypot(dx, dy);
}

/** The condition's distance multiplier T(distance) (1 without a condition). */
function tDistance(cfg: HaulConfig, trait: string | null): number {
  const t = H.T(cfg, trait, 'distance');
  return Number.isFinite(t) && t > 0 ? t : 1;
}

/** The rack arms (spec 4.1 / errata 45: 390: x 90 to 160 and 230 to 300, y 584 to 628), scaled with the station. */
function rackFor(st: Pt & { r: number }): { left: Rect; right: Rect } {
  const s = st.r / 40;
  const y = st.y - 6 * s;
  const h = 44 * s;
  return {
    left: { x: st.x - 105 * s, y, width: 70 * s, height: h },
    right: { x: st.x + 35 * s, y, width: 70 * s, height: h },
  };
}

/** The layout for a screen. Under Long Haul the drawn layout is the base layout (errata 49). */
export function fieldLayout(screen: Screen, cfg: HaulConfig, trait: string | null): FieldLayout {
  const { width: W, height: Hh, insets } = screen;
  const compact = Hh < 740;
  const pad = 16;
  const inner = W - 2 * pad;
  const top = insets.top + (compact ? 4 : 8);
  const strip = { x: pad, y: top, width: inner, height: compact ? 46 : 52 };
  const comms = { x: pad, y: strip.y + strip.height + (compact ? 3 : 4), width: inner, height: compact ? 22 : 24 };
  const commsBottom = comms.y + comms.height;
  const bayH = (compact ? 160 : 174) + insets.bottom;
  const bayTop = Hh - bayH;
  const bay = { x: 0, y: bayTop, width: W, height: bayH };
  const station = { x: W / 2, y: bayTop - (compact ? 42 : 46), r: compact ? 36 : 40 };
  const rack = rackFor(station);

  const rings = cfg.haul.rings;
  const td = tDistance(cfg, trait);
  const maxD = Math.max(...rings.map((r) => r.distance * td));
  const angles: { ring: number; deg: number }[] = [];
  rings.forEach((r, ri) => r.slots.forEach((deg) => angles.push({ ring: ri, deg })));

  const place = (k: number) => {
    const rr = clamp(22, 26, (26 * k * td) / 110);
    const radii = rings.map((r) => k * r.distance * td);
    const rocks: RockSpot[] = angles.map((a, slot) => {
      const rad = (a.deg * Math.PI) / 180;
      return { slot, ring: a.ring, x: station.x + radii[a.ring] * Math.sin(rad), y: station.y - radii[a.ring] * Math.cos(rad), r: rr };
    });
    return { radii, rocks };
  };
  const meets = (rocks: RockSpot[]) =>
    rocks.some((p) => p.y - p.r < commsBottom || [strip, comms, rack.left, rack.right, bay].some((z) => rectDistance(p, z) < p.r));

  let k = Math.min(110, (station.y - commsBottom - 26) / maxD);
  let placed = place(k);
  for (let i = 0; i < 200 && meets(placed.rocks); i++) {
    k *= 0.96;
    placed = place(k);
  }
  const { radii } = placed;
  // phone-7: on a short field (a small Android phone with three-button navigation) the shrink loop
  // pulls rocks together while their radius stays at 22; then the drawn radius gives way, down to
  // MIN_ROCK_R, so neighbours keep ROCK_GAP between their rims (their tap circles do not meet).
  let dmin = Infinity;
  for (let i = 0; i < placed.rocks.length; i++)
    for (let j = i + 1; j < placed.rocks.length; j++) dmin = Math.min(dmin, Math.hypot(placed.rocks[i].x - placed.rocks[j].x, placed.rocks[i].y - placed.rocks[j].y));
  const r0 = placed.rocks[0]?.r ?? 22;
  const rFit = Number.isFinite(dmin) && dmin - 2 * r0 < ROCK_GAP ? Math.max(MIN_ROCK_R, (dmin - ROCK_GAP) / 2) : r0;
  const rocks = rFit < r0 ? placed.rocks.map((r) => ({ ...r, r: rFit })) : placed.rocks;
  const chips = chipPositions(station, rocks, rack);

  const btn = compact ? 40 : 44;
  const railY = Hh - insets.bottom - btn - (compact ? 4 : 0);
  const rail = Array.from({ length: 6 }, (_, i) => ({ x: pad + (i * (inner - btn)) / 5, y: railY, width: btn, height: btn }));
  const colL = compact ? 64 : 76;
  const counterH = compact ? 50 : 56;
  const midX = pad + colL + 12;
  const midW = inner - 2 * (colL + 12);
  const launchY = bayTop + 8 + counterH + 4;
  return {
    width: W,
    height: Hh,
    compact,
    station,
    rack,
    radii,
    rocks,
    chips,
    zones: {
      strip,
      comms,
      field: { x: 0, y: top, width: W, height: bayTop - top },
      bay,
      counter: { x: midX, y: bayTop + 8, width: midW, height: counterH },
      hold: { x: pad, y: bayTop + 8, width: colL, height: railY - 14 - (bayTop + 8) },
      flare: { x: W - pad - colL, y: bayTop + 8, width: colL, height: compact ? 64 : 72 },
      launch: { x: midX, y: launchY, width: midW, height: railY - 4 - launchY },
      rail,
    },
  };
}

/** The smallest clearance from a chip centre to any rock's edge. */
function clearanceOf(p: Pt, rocks: readonly RockSpot[]): number {
  let m = Infinity;
  for (const r of rocks) m = Math.min(m, Math.hypot(p.x - r.x, p.y - r.y) - r.r);
  return m;
}

/**
 * Chip centres for every slot (errata 44). Candidates t ∈ {0.25 ... 0.85} along station → rock,
 * minus those over the station disc or the rack (those taps belong to the station and the rack).
 * Finds the largest clearance c for which a backtracking search (fewest admissible candidates
 * first, forward checking) places all chips ≥ 40 pt apart with every clearance ≥ c; among the
 * candidates it tries the clearest first.
 */
export function chipPositions(station: Pt & { r: number }, rocks: readonly RockSpot[], rack?: { left: Rect; right: Rect }): (Pt & { slot: number })[] {
  type Cand = Pt & { c: number };
  const all: Cand[][] = rocks.map((rk) => {
    const out: Cand[] = [];
    for (let i = 25; i <= 85; i++) {
      const t = i / 100;
      const p = { x: station.x + (rk.x - station.x) * t, y: station.y + (rk.y - station.y) * t };
      if (Math.hypot(p.x - station.x, p.y - station.y) < station.r + 10) continue;
      if (rack && (rectDistance(p, rack.left) < 8 || rectDistance(p, rack.right) < 8)) continue;
      out.push({ ...p, c: clearanceOf(p, rocks) });
    }
    // Fallback: a slot with no candidate keeps its mid-route point.
    if (out.length === 0) {
      const p = { x: (station.x + rk.x) / 2, y: (station.y + rk.y) / 2 };
      out.push({ ...p, c: clearanceOf(p, rocks) });
    }
    return out.sort((a, b) => b.c - a.c);
  });
  const n = rocks.length;
  const apart = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) >= CHIP_SPACING;

  const solve = (minC: number): Cand[] | null => {
    const doms = all.map((d) => d.filter((x) => x.c >= minC));
    if (doms.some((d) => d.length === 0)) return null;
    const pick: (Cand | null)[] = new Array(n).fill(null);
    let budget = 20000;
    const rec = (domains: Cand[][], left: number): boolean => {
      if (left === 0) return true;
      if (--budget < 0) return false;
      let best = -1;
      for (let i = 0; i < n; i++) if (!pick[i] && (best < 0 || domains[i].length < domains[best].length)) best = i;
      for (const cand of domains[best]) {
        const next = domains.map((d, j) => (pick[j] || j === best ? d : d.filter((x) => apart(x, cand))));
        if (next.some((d, j) => !pick[j] && j !== best && d.length === 0)) continue;
        pick[best] = cand;
        if (rec(next, left - 1)) return true;
        pick[best] = null;
      }
      return false;
    };
    return rec(doms, n) ? (pick as Cand[]) : null;
  };

  // The candidate clearances, searched from the best down by bisection over their sorted list.
  const levels = Array.from(new Set(all.flat().map((x) => Math.floor(x.c * 10) / 10))).sort((a, b) => a - b);
  let lo = 0;
  let hi = levels.length - 1;
  let found: Cand[] | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = solve(levels[mid]);
    if (s) {
      found = s;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const res = found ?? all.map((d) => d[0]);
  return res.map((p, slot) => ({ slot, x: p.x, y: p.y }));
}

/** What a touch lands on (errata 45 priority: idle drone on the rack > flare > chip > rock > ghost slot > station > launch > background). */
export type Hit =
  | { kind: 'rack' }
  | { kind: 'flare' }
  | { kind: 'chip'; slot: number }
  | { kind: 'rock'; slot: number }
  | { kind: 'ghost'; slot: number }
  | { kind: 'station' }
  | { kind: 'launch' }
  | { kind: 'background' };

/**
 * The hit at `p`. `claimed[slot]` says which slots are real (a claimed slot is a rock also during
 * its respawn gap); `idle` whether the rack has a drone (without one the rack falls through to the
 * station). Chips answer only for claimed slots. Among overlapping rocks or ghosts the nearest wins.
 */
export function hitTest(p: Pt, layout: FieldLayout, claimed: readonly boolean[], idle: number): Hit {
  if (idle > 0 && (inRect(p, layout.rack.left) || inRect(p, layout.rack.right))) return { kind: 'rack' };
  if (inRect(p, layout.zones.flare)) return { kind: 'flare' };
  let chip = -1;
  let chipD = Infinity;
  for (const c of layout.chips) {
    if (!claimed[c.slot]) continue;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= CHIP_TAP_R && d < chipD) {
      chip = c.slot;
      chipD = d;
    }
  }
  if (chip >= 0) return { kind: 'chip', slot: chip };
  let rock = -1;
  let rockD = Infinity;
  let ghost = -1;
  let ghostD = Infinity;
  for (const r of layout.rocks) {
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    if (claimed[r.slot]) {
      if (d <= r.r * ROCK_TAP && d < rockD) {
        rock = r.slot;
        rockD = d;
      }
    } else if (d <= Math.max(GHOST_TAP_R * (r.r / 26), r.r * ROCK_TAP) && d < ghostD) {
      ghost = r.slot;
      ghostD = d;
    }
  }
  if (rock >= 0) return { kind: 'rock', slot: rock };
  if (ghost >= 0) return { kind: 'ghost', slot: ghost };
  // An idle drone's body stands up to RACK_REACH above the arm: a touch there is the rack, not the station.
  if (idle > 0 && (inRect({ x: p.x, y: p.y + RACK_REACH }, layout.rack.left) || inRect({ x: p.x, y: p.y + RACK_REACH }, layout.rack.right))) return { kind: 'rack' };
  if (Math.hypot(p.x - layout.station.x, p.y - layout.station.y) <= layout.station.r) return { kind: 'station' };
  if (inRect(p, layout.zones.launch)) return { kind: 'launch' };
  return { kind: 'background' };
}

/** The drop target of a drag released at `p`: the nearest claimed rock within 40 pt of the finger (or its tap circle), else null. */
export function dropTarget(p: Pt, layout: FieldLayout, claimed: readonly boolean[]): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const r of layout.rocks) {
    if (!claimed[r.slot]) continue;
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    if (d <= Math.max(DROP_R, r.r * ROCK_TAP) && d < bestD) {
      best = r.slot;
      bestD = d;
    }
  }
  return best;
}

/**
 * The flick target (spec 4.2, errata 46): the nearest claimed rock whose bearing from the release
 * point `p` is within 15° of the motion `v` (any units; only its direction counts), else null. The
 * speed threshold (0.5 pt/ms over the last 80 ms) is the gesture layer's.
 */
export function flickTarget(p: Pt, v: Pt, layout: FieldLayout, claimed: readonly boolean[], exclude: number | null = null): number | null {
  const speed = Math.hypot(v.x, v.y);
  if (!(speed > 0)) return null;
  const cosMax = Math.cos((FLICK_DEG * Math.PI) / 180);
  let best: number | null = null;
  let bestD = Infinity;
  for (const r of layout.rocks) {
    if (!claimed[r.slot] || r.slot === exclude) continue;
    const dx = r.x - p.x;
    const dy = r.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) continue;
    if ((dx * v.x + dy * v.y) / (d * speed) >= cosMax && d < bestD) {
      best = r.slot;
      bestD = d;
    }
  }
  return best;
}

/** The hint-target rectangle of a circle. */
export const circleRect = (c: Pt, r: number): Rect => ({ x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r });

/** The union of the two rack arms (the `drone:rack` hint target). */
export function rackRect(layout: FieldLayout): Rect {
  const { left, right } = layout.rack;
  return { x: left.x, y: Math.min(left.y, right.y), width: right.x + right.width - left.x, height: Math.max(left.height, right.height) };
}
