/**
 * Field geometry of the main screen (spec 4.1, errata 44, 45, 49, 51): pure, from data and the
 * screen size. SKELETON: the interface below is the contract between the scene, the gestures, the
 * bay and the hints; the bodies are crude stand-ins (rings spread evenly, chips at mid-route, a
 * hit test by distance) that the "world" package replaces with the rules of 4.1 and their tests
 * (src/ui/haul/layout.test.ts, spec 10.2).
 */
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

/** The layout for a screen. Under Long Haul the drawn layout is the base layout (errata 49). */
export function fieldLayout(screen: Screen, cfg: HaulConfig, trait: string | null): FieldLayout {
  void trait;
  const { width: W, height: H, insets } = screen;
  const compact = H < 740;
  const top = insets.top + 8;
  const bayH = compact ? 160 : 208;
  const bayTop = H - bayH;
  const strip = { x: 16, y: top, width: W - 32, height: compact ? 46 : 52 };
  const comms = { x: 16, y: strip.y + strip.height + 4, width: W - 32, height: compact ? 22 : 24 };
  const station = { x: W / 2, y: bayTop - (compact ? 42 : 46), r: compact ? 36 : 40 };
  const maxD = Math.max(...cfg.haul.rings.map((r) => r.distance));
  const k = (station.y - (comms.y + comms.height) - 26) / maxD;
  const radii = cfg.haul.rings.map((r) => r.distance * k);
  const rocks: RockSpot[] = [];
  const chips: (Pt & { slot: number })[] = [];
  let slot = 0;
  cfg.haul.rings.forEach((ring, ri) => {
    for (const deg of ring.slots) {
      const a = (deg * Math.PI) / 180;
      const x = station.x + radii[ri] * Math.sin(a);
      const y = station.y - radii[ri] * Math.cos(a);
      rocks.push({ slot, ring: ri, x, y, r: compact ? 22 : 26 });
      chips.push({ slot, x: station.x + (x - station.x) * 0.55, y: station.y + (y - station.y) * 0.55 });
      slot++;
    }
  });
  const pad = 16;
  const inner = W - 2 * pad;
  const btn = compact ? 40 : 44;
  const railY = H - insets.bottom - btn - (compact ? 4 : 0) - 8;
  const rail = Array.from({ length: 6 }, (_, i) => ({ x: pad + (i * (inner - btn)) / 5, y: railY, width: btn, height: btn }));
  const colL = compact ? 64 : 76;
  return {
    width: W,
    height: H,
    compact,
    station,
    // The rack arms of the art kit's second pass (station.draw.ts, in points at r = 40): cradles at
    // x ±50..±94, y 7.9..19.6 with the drone standing nose up above each, the "+n" count at
    // RACK_OVERFLOW (113, 40); both arms' boxes cover them, scaled with the station.
    rack: {
      left: { x: station.x - 122 * (station.r / 40), y: station.y - 6 * (station.r / 40), width: 86 * (station.r / 40), height: 54 * (station.r / 40) },
      right: { x: station.x + 36 * (station.r / 40), y: station.y - 6 * (station.r / 40), width: 86 * (station.r / 40), height: 54 * (station.r / 40) },
    },
    radii,
    rocks,
    chips,
    zones: {
      strip,
      comms,
      field: { x: 0, y: top, width: W, height: bayTop - top },
      bay: { x: 0, y: bayTop, width: W, height: bayH },
      counter: { x: pad + colL + 12, y: bayTop + 8, width: inner - 2 * (colL + 12), height: compact ? 50 : 56 },
      hold: { x: pad, y: bayTop + 8, width: colL, height: railY - bayTop - 16 },
      flare: { x: W - pad - colL, y: bayTop + 8, width: colL, height: colL - 4 },
      launch: { x: pad + colL + 12, y: bayTop + (compact ? 62 : 68), width: inner - 2 * (colL + 12), height: Math.max(36, railY - bayTop - (compact ? 70 : 76)) },
      rail,
    },
  };
}

/** What a touch lands on (errata 45 priority: idle drone on the rack > flare > chip > rock > ghost slot > station > background). */
export type Hit =
  | { kind: 'rack' }
  | { kind: 'flare' }
  | { kind: 'chip'; slot: number }
  | { kind: 'rock'; slot: number }
  | { kind: 'ghost'; slot: number }
  | { kind: 'station' }
  | { kind: 'launch' }
  | { kind: 'background' };

const inRect = (p: Pt, r: Rect) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

/** The hit at `p`. `claimed[slot]` says which rocks are real; `idle` whether the rack has a drone. Stand-in: distance tests only. */
export function hitTest(p: Pt, layout: FieldLayout, claimed: readonly boolean[], idle: number): Hit {
  if (idle > 0 && (inRect(p, layout.rack.left) || inRect(p, layout.rack.right))) return { kind: 'rack' };
  if (inRect(p, layout.zones.flare)) return { kind: 'flare' };
  for (const c of layout.chips) if (claimed[c.slot] && Math.hypot(p.x - c.x, p.y - c.y) <= 20) return { kind: 'chip', slot: c.slot };
  for (const r of layout.rocks) if (Math.hypot(p.x - r.x, p.y - r.y) <= r.r * 1.2) return claimed[r.slot] ? { kind: 'rock', slot: r.slot } : { kind: 'ghost', slot: r.slot };
  if (Math.hypot(p.x - layout.station.x, p.y - layout.station.y) <= layout.station.r) return { kind: 'station' };
  if (inRect(p, layout.zones.launch)) return { kind: 'launch' };
  return { kind: 'background' };
}
