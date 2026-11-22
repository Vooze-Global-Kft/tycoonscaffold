/**
 * Drawings the spokes need (errata 38): the Fitting Bay's station schematic with its three
 * sockets, the Comms 5-dish relay, the galaxy-condition map preview, the Star Map's core and node
 * rings, and the "CONTRACT MET" receipt stamp. Pure Skia, centred on the origin; Spokes.tsx wraps
 * each one as a small React component. Motion that exists only inside a spoke (laser cut, Jump
 * streaks, typing) stays in the spoke files.
 */
import { BlendMode, type SkCanvas } from '@shopify/react-native-skia';
import { drawText, textWidth } from './glyphs';
import { CARTRIDGE_H, drawModuleFace, drawSocketGlyph, type ModuleId, type SocketType } from './modules.draw';
import { RARITY, SPACE, alpha, mix, type Rarity } from './palette';
import { DEG, TAU, arc, circle, clip, dashed, fill, glow, lamp, line, litStroke, ngon, poly, rrect, stroke } from './pen';
import { drawNodePartShape, drawStation, type StarNode } from './station.draw';

// ---------------------------------------------------------------------------
// Station schematic (Fitting Bay)
// ---------------------------------------------------------------------------

/** The Fitting Bay schematic's two sizes (spec 4.6): 340 at 390 width, 320 at 375. */
export const SCHEMATIC_SIZES = [340, 320] as const;

/** The three sockets in the schematic's order: Rig upper left, Fleet upper right, Dock bottom. */
export const SCHEMATIC_SOCKETS: readonly SocketType[] = ['rig', 'fleet', 'dock'];

export interface SocketAnchor {
  /** Centre of the hexagonal socket, points from the schematic's centre. */
  x: number;
  y: number;
  /** Hex radius (corner to centre); the tap target is the hex. */
  r: number;
}

/**
 * The socket anchors of a schematic of side `size` (340 or 320; any size scales), relative to its
 * centre. Add size / 2 to each coordinate for top-left coordinates of a `size` x `size` view.
 */
export function schematicSockets(size: number): Record<SocketType, SocketAnchor> {
  const k = size / 340;
  return {
    rig: { x: -96 * k, y: -86 * k, r: 40 * k },
    fleet: { x: 96 * k, y: -86 * k, r: 40 * k },
    dock: { x: 0, y: 108 * k, r: 40 * k },
  };
}

/** A fitted module in a socket. */
export interface FittedModule {
  module: ModuleId | string;
  rarity: Rarity;
}

export type SocketState = 'normal' | 'glow' | 'dim';

export interface SchematicOptions {
  /** What is fitted, per socket (missing: empty). */
  fitted?: Partial<Record<SocketType, FittedModule>>;
  /** Per-socket state: 'glow' when the picked cartridge fits it (or it is selected), 'dim' when not. */
  state?: Partial<Record<SocketType, SocketState>>;
}

const SOCKET_LABEL: Record<SocketType, string> = { rig: 'RIG', fleet: 'FLEET', dock: 'DOCK' };
/** Where on the station each socket's leader line ends (station drawn at schematic scale). */
const LEADER_END: Record<SocketType, [number, number]> = { rig: [-38, -24], fleet: [38, -24], dock: [0, 44] };

/**
 * The Fitting Bay's top-down station schematic, `size` x `size` (spec 4.6): a blueprint grid, the
 * station drawn dim, and three hexagonal sockets joined to it by leader lines. Each socket shows
 * its type key and label, and when fitted the module's face with its rarity rim.
 */
export function drawStationSchematic(c: SkCanvas, size: number, o: SchematicOptions = {}): void {
  const k = size / 340;
  const half = size / 2;
  // Panel and blueprint grid.
  const panel = rrect(-half, -half, size, size, 18 * k);
  c.drawPath(panel, fill(SPACE.panel));
  c.save();
  clip(c, panel);
  for (let x = -half + 10 * k; x < half; x += 20 * k) c.drawPath(line(x, -half, x, half), stroke(alpha(SPACE.line, 0.05), 0.8));
  for (let y = -half + 10 * k; y < half; y += 20 * k) c.drawPath(line(-half, y, half, y), stroke(alpha(SPACE.line, 0.05), 0.8));
  c.drawPath(circle(0, 8 * k, 120 * k), dashed(alpha(SPACE.line, 0.12), 1, 3, 5));
  // The station, dimmed to a blueprint under the sockets.
  c.save();
  c.translate(0, 8 * k);
  c.scale(1.15 * k, 1.15 * k);
  drawStation(c, 0);
  c.restore();
  c.drawRect({ x: -half, y: -half, width: size, height: size }, fill(alpha(SPACE.panel, 0.5)));
  c.restore();
  litStroke(c, panel, alpha(SPACE.panelEdge, 1), 1.2, 0.3);
  const anchors = schematicSockets(size);
  for (const id of SCHEMATIC_SOCKETS) {
    const a = anchors[id];
    const st = o.state?.[id] ?? 'normal';
    const fit = o.fitted?.[id];
    const col = st === 'dim' ? SPACE.steelDim : fit ? RARITY[fit.rarity] : SPACE.line;
    // Leader line from the socket to its part of the station.
    const [ex, ey] = LEADER_END[id];
    const lx = ex * 1.15 * k;
    const ly = (ey + 8) * k * 1.15;
    const d = Math.hypot(lx - a.x, ly - a.y) || 1;
    const sx = a.x + ((lx - a.x) / d) * a.r * 0.9;
    const sy = a.y + ((ly - a.y) / d) * a.r * 0.9;
    c.drawPath(line(sx, sy, lx, ly), dashed(alpha(col, st === 'dim' ? 0.25 : 0.6), 1.2, 3, 3));
    c.drawCircle(lx, ly, 2 * k, fill(alpha(col, st === 'dim' ? 0.4 : 0.9)));
    drawSocket(c, a, id, st, fit, k);
  }
}

function drawSocket(c: SkCanvas, a: SocketAnchor, id: SocketType, st: SocketState, fit: FittedModule | undefined, k: number): void {
  const col = st === 'dim' ? SPACE.steelDim : fit ? RARITY[fit.rarity] : SPACE.line;
  c.save();
  c.translate(a.x, a.y);
  const hex = ngon(0, 0, a.r, 6, 0);
  if (st === 'glow') {
    glow(c, 0, 0, a.r * 1.7, SPACE.line, 0.5);
    c.drawPath(ngon(0, 0, a.r + 5 * k, 6, 0), stroke(alpha(SPACE.line, 0.5), 2));
  }
  c.drawPath(hex, fill(st === 'dim' ? SPACE.hull0 : SPACE.bg));
  if (fit) {
    c.save();
    clip(c, ngon(0, 0, a.r - 3 * k, 6, 0));
    glow(c, 0, 0, a.r, col, 0.2);
    const s = (a.r * 1.5) / (CARTRIDGE_H * 0.62);
    c.scale(s, s);
    drawModuleFace(c, fit.module);
    c.restore();
  } else {
    c.drawPath(ngon(0, 0, a.r * 0.62, 6, 0), dashed(alpha(col, 0.45), 1.2, 3, 3));
    c.save();
    c.scale(1.6 * k, 1.6 * k);
    drawSocketGlyph(c, id, 5, alpha(col, 0.8));
    c.restore();
  }
  litStroke(c, hex, col, st === 'glow' ? 2.2 : 1.6, st === 'dim' ? 0 : 0.8);
  // Type key at the top corner and the label under the socket.
  c.save();
  c.translate(0, -a.r);
  c.drawPath(circle(0, 0, 6.5 * k), fill(SPACE.panel));
  drawSocketGlyph(c, id, 4 * k, col);
  c.restore();
  drawText(c, SOCKET_LABEL[id], 0, a.r + 6 * k, { size: 7 * k, color: st === 'dim' ? SPACE.steelDim : alpha('#FFFFFF', 0.85), align: 'center', glow: 0, weight: 1.1 * k });
  c.restore();
}

// ---------------------------------------------------------------------------
// Dish relay (Comms daily allotment)
// ---------------------------------------------------------------------------

/** Number of dishes in the relay (the 5-day allotment). */
export const RELAY_DISHES = 5;

/** Dish centres of a relay `w` points wide (from its centre). */
export function relayDishes(w: number): { x: number; y: number }[] {
  const step = w / RELAY_DISHES;
  return Array.from({ length: RELAY_DISHES }, (_, i) => ({ x: (i - (RELAY_DISHES - 1) / 2) * step, y: 0 }));
}

/**
 * The Daily Allotment as a 5-dish relay (spec 4.6), `w` x about 0.24 w, centred: dish i lights
 * for each day of the streak (`lit` 0..5). `ready`: today's gift waits, the next dish pulses
 * (draw it twice with different `pulse` 0..1). Day numbers under each dish.
 */
export function drawDishRelay(c: SkCanvas, w: number, lit: number, ready = false, pulse = 1): void {
  const dishes = relayDishes(w);
  const s = (w / 300) * 1.6;
  // The relay beam between lit dishes.
  for (let i = 0; i < RELAY_DISHES - 1; i++) {
    const on = i + 1 < lit;
    const a = dishes[i];
    const b = dishes[i + 1];
    c.drawPath(line(a.x + 10 * s, a.y - 4 * s, b.x - 10 * s, b.y - 4 * s), on ? stroke(alpha(SPACE.line, 0.75), 1.4) : dashed(alpha(SPACE.steel, 0.3), 1, 2, 4));
  }
  dishes.forEach((d, i) => {
    const on = i < lit;
    const next = ready && i === lit;
    c.save();
    c.translate(d.x, d.y);
    c.save();
    c.scale(s, s);
    c.drawPath(line(-5, 9, 5, 9), stroke(SPACE.steelDim, 2));
    c.drawPath(line(0, 9, 0, 3), stroke(SPACE.steel, 1.4));
    const dish = poly([-9, -4, -5, 2.5, 5, 2.5, 9, -4]);
    c.drawPath(dish, fill(on ? SPACE.hull2 : SPACE.hull0));
    litStroke(c, dish, on ? SPACE.line : next ? mix(SPACE.steel, SPACE.line, pulse) : SPACE.steelDim, 1.2, on ? 0.8 : next ? pulse * 0.8 : 0);
    c.drawPath(line(0, 2, 0, -6), stroke(alpha(SPACE.steel, 0.8), 0.8));
    if (on) lamp(c, 0, -6.5, 1.2, SPACE.line, 4.5);
    else if (next) lamp(c, 0, -6.5, 1.2, alpha(SPACE.line, 0.4 + 0.6 * pulse), 4.5 * pulse);
    else c.drawCircle(0, -6.5, 1, fill(SPACE.hull3));
    if (on) c.drawPath(poly([0, -7, -6, -15, 6, -15]), fill(alpha(SPACE.line, 0.08)));
    c.restore();
    drawText(c, `${i + 1}`, 0, 13 * s, { size: 4 * s, color: on ? SPACE.line : SPACE.steelDim, align: 'center', glow: 0, weight: 1 });
    c.restore();
  });
}

// ---------------------------------------------------------------------------
// Galaxy conditions and their map preview
// ---------------------------------------------------------------------------

export type ConditionId = 'frost' | 'solar' | 'storms' | 'longhaul' | 'heavy' | 'hotcore';

/** The six galaxy conditions (spec 2.10), the rings each favours (errata 38) and their colour. */
export const CONDITIONS: { id: ConditionId; name: string; rings: number[]; color: string }[] = [
  { id: 'frost', name: 'Frost Surplus', rings: [3, 4], color: '#7FD4FF' },
  { id: 'solar', name: 'Solar Wind', rings: [1, 2, 3, 4, 5], color: '#FFD35C' },
  { id: 'storms', name: 'Seam Storms', rings: [], color: '#FFB23F' },
  { id: 'longhaul', name: 'Long Haul', rings: [4, 5], color: '#4FA8FF' },
  { id: 'heavy', name: 'Heavy Ore', rings: [1, 2, 3, 4, 5], color: '#E07A3F' },
  { id: 'hotcore', name: 'Hot Cores', rings: [1, 2], color: '#FF4F5E' },
];

/**
 * A condition card's small map preview, `w` x 0.62 w, centred: the station at the bottom, five
 * ring arcs fanning up, the favoured rings bright in the condition's colour, the others dim.
 * Seam Storms favours no ring: gold sparkles mark the seams instead.
 */
export function drawConditionPreview(c: SkCanvas, w: number, id: ConditionId | string): void {
  const cond = CONDITIONS.find((x) => x.id === id);
  const h = w * 0.62;
  const box = rrect(-w / 2, -h / 2, w, h, 6);
  c.drawPath(box, fill(SPACE.bg));
  c.save();
  clip(c, box);
  const sx = 0;
  const sy = h / 2 + 2;
  const step = (h - 6) / 5.2;
  const SW = 84;
  for (let ring = 1; ring <= 5; ring++) {
    const r = step * ring;
    const on = cond?.rings.includes(ring) ?? false;
    const a = arc(sx, sy, r, -90 - SW, SW * 2);
    if (on && cond) {
      // A favoured ring is a lit band across the field, like a zone on a chart.
      c.drawPath(a, stroke(alpha(cond.color, 0.22), step * 0.72));
      c.drawPath(a, stroke(alpha(cond.color, 0.9), 1.2));
    } else c.drawPath(a, dashed(alpha('#FFFFFF', 0.2), 0.8, 2, 3));
    // Rocks on every ring (two or three, staggered), bright on favoured rings.
    const n = ring % 2 ? 2 : 3;
    for (let j = 0; j < n; j++) {
      const t = n === 2 ? (j ? 1 : -1) * (24 + ring * 3) : (j - 1) * (30 + ring * 2);
      const rad = (-90 + t) * DEG;
      const x = sx + Math.cos(rad) * r;
      const y = sy + Math.sin(rad) * r;
      c.drawCircle(x, y, on ? 2.6 : 2, fill(on && cond ? mix(cond.color, '#FFFFFF', 0.25) : alpha(SPACE.steel, 0.55)));
    }
  }
  // The station: a hub with its two rack arms (so the preview reads as the field, not a signal icon).
  c.drawPath(line(sx - 14, sy - 3, sx + 14, sy - 3), stroke(SPACE.steelDim, 2));
  if (cond?.id === 'storms') {
    for (const [ring, t] of [
      [2, -30],
      [3, 25],
      [4, -10],
      [5, 40],
    ]) {
      const rad = (-90 + t) * DEG;
      const x = sx + Math.cos(rad) * step * ring;
      const y = sy + Math.sin(rad) * step * ring;
      glow(c, x, y, 5, SPACE.gold, 0.6);
      c.drawPath(poly([x, y - 3, x + 0.8, y - 0.8, x + 3, y, x + 0.8, y + 0.8, x, y + 3, x - 0.8, y + 0.8, x - 3, y, x - 0.8, y - 0.8]), fill('#FFF3C8'));
    }
  }
  c.drawCircle(sx, sy - 2, 5, fill(SPACE.hull2));
  c.drawPath(circle(sx, sy - 2, 5), stroke(SPACE.line, 1.1));
  c.restore();
  c.drawPath(box, stroke(alpha(cond?.color ?? SPACE.steel, 0.5), 1));
}

// ---------------------------------------------------------------------------
// Star Map: core and node rings
// ---------------------------------------------------------------------------

/**
 * The Star Map's central core glyph, in a square of `size`: a four-point star in two rings with
 * three arm sockets (Survey up, Trade lower right, Fleet lower left). `turn` (degrees) rotates
 * the outer ring slowly if the spoke wants it alive.
 */
export function drawStarCore(c: SkCanvas, size: number, turn = 0): void {
  const k = size / 80;
  c.save();
  c.scale(k, k);
  glow(c, 0, 0, 40, '#FFE9A8', 0.35);
  c.save();
  c.rotate(turn, 0, 0);
  c.drawPath(circle(0, 0, 33), dashed(alpha(SPACE.line, 0.55), 1.2, 4, 4));
  c.restore();
  c.drawPath(circle(0, 0, 26), fill(SPACE.hull1));
  litStroke(c, circle(0, 0, 26), SPACE.line, 1.6, 0.8);
  // Arm sockets: where the three arms leave the core.
  for (const a of [-90, 30, 150]) {
    const r = a * DEG;
    c.save();
    c.translate(Math.cos(r) * 26, Math.sin(r) * 26);
    c.drawPath(circle(0, 0, 3.6), fill(SPACE.hull2));
    c.drawPath(circle(0, 0, 3.6), stroke(SPACE.line, 1.1));
    c.restore();
  }
  // The star.
  const star = poly([0, -20, 4.5, -4.5, 20, 0, 4.5, 4.5, 0, 20, -4.5, 4.5, -20, 0, -4.5, -4.5]);
  c.drawPath(star, fill('#FFE9A8'));
  c.drawPath(poly([0, -20, 4.5, -4.5, 0, 0]), fill('#FFFFFF'));
  c.drawPath(poly([20, 0, 4.5, 4.5, 0, 0]), fill(alpha('#C98A1E', 0.6)));
  c.drawPath(star, stroke('#FFF6D8', 1));
  glow(c, 0, 0, 9, '#FFFFFF', 0.7);
  c.restore();
}

export type NodeState = 'normal' | 'buyable' | 'locked';

/**
 * A Star Map node, in a square of `size`: a ring of `cap` segments filled to `level` (uncapped
 * nodes: 5 segments per lap, the laps completed shown as a number under it), with the station
 * part the node adds drawn inside. 'buyable' glows gold (enough cores); 'locked' is dim.
 */
export function drawNodeRing(c: SkCanvas, size: number, level: number, cap: number | null, node?: StarNode, state: NodeState = 'normal'): void {
  const k = size / 64;
  c.save();
  c.scale(k, k);
  const segs = cap ?? 5;
  const filled = cap == null ? (level > 0 && level % 5 === 0 ? 5 : level % 5) : Math.min(level, cap);
  const maxed = cap != null && level >= cap;
  const col = state === 'locked' ? SPACE.steelDim : maxed ? SPACE.gold : SPACE.line;
  if (state === 'buyable') glow(c, 0, 0, 34, SPACE.gold, 0.35);
  c.drawPath(circle(0, 0, 22), fill(state === 'locked' ? SPACE.hull0 : SPACE.hull1));
  const gap = segs > 1 ? 9 : 0;
  for (let i = 0; i < segs; i++) {
    const a0 = -90 + (360 * i) / segs + gap / 2;
    const sweep = 360 / segs - gap;
    const p = arc(0, 0, 27, a0, sweep);
    if (i < filled) {
      c.drawPath(p, stroke(alpha(col, 0.25), 7));
      c.drawPath(p, stroke(col, 4));
    } else c.drawPath(p, stroke(alpha(SPACE.steel, 0.28), 4));
  }
  litStroke(c, circle(0, 0, 22), state === 'buyable' ? SPACE.gold : col, 1.2, state === 'locked' ? 0 : 0.6);
  if (node) {
    c.save();
    clip(c, circle(0, 0, 21));
    c.scale(1.25, 1.25);
    drawNodePartShape(c, node, Math.max(1, level));
    c.restore();
    if (state === 'locked') c.drawPath(circle(0, 0, 21), fill(alpha(SPACE.bg, 0.55)));
  }
  if (cap == null && level >= 5) {
    const text = `×${Math.floor(level / 5)}`;
    const w = textWidth(text, 6) + 8;
    c.drawPath(rrect(-w / 2, 25, w, 11, 5.5), fill(SPACE.panel));
    c.drawPath(rrect(-w / 2, 25, w, 11, 5.5), stroke(alpha(col, 0.8), 0.9));
    drawText(c, text, 0, 27.5, { size: 6, color: col, align: 'center', glow: 0, weight: 1.1 });
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Receipt stamp
// ---------------------------------------------------------------------------

/**
 * The "CONTRACT MET" stamp on a launch receipt (spec 4.6 errata 38): a tilted double-ruled stamp,
 * `w` points wide (about w x 0.36 w), green, with an optional amount line ("+₵420"). Its ink is
 * broken in places like a real stamp. `k` 0..1 scales it in (stamp it down from 1.4x over 0.2 s).
 */
export function drawReceiptStamp(c: SkCanvas, w: number, amount?: string, k = 1): void {
  const t = Math.max(0, Math.min(1, k));
  const s = 1.4 - 0.4 * t;
  const h = w * (amount ? 0.42 : 0.3);
  c.saveLayer();
  c.rotate(-8, 0, 0);
  c.scale(s, s);
  const col = SPACE.green;
  const ink = alpha(col, 0.92 * t);
  const outer = rrect(-w / 2, -h / 2, w, h, 5);
  c.drawPath(outer, fill(alpha(col, 0.08 * t)));
  c.drawPath(outer, stroke(ink, 2.4));
  c.drawPath(rrect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3), stroke(ink, 1));
  const size = Math.min(w * 0.075, (w - 20) / Math.max(1, textWidth('CONTRACT MET', 1)));
  drawText(c, 'CONTRACT MET', 0, amount ? -h / 2 + 8 : -size / 2, { size, color: ink, align: 'center', glow: 0, weight: Math.max(1.2, size * 0.2) });
  if (amount) drawText(c, amount, 0, h / 2 - 8 - size * 0.9, { size: size * 0.9, color: ink, align: 'center', glow: 0, weight: Math.max(1.1, size * 0.18) });
  // Broken ink: a few gaps scraped out of the stamp (erased, so it works on any background).
  const scrape = stroke('#000000', 1.3);
  scrape.setBlendMode(BlendMode.DstOut);
  for (let i = 0; i < 7; i++) {
    const x = -w / 2 + (((i * 37) % 100) / 100) * w;
    const y = -h / 2 + (((i * 53) % 100) / 100) * h;
    c.drawPath(line(x, y, x + 3 + (i % 3), y + 1), scrape);
  }
  c.restore();
  void TAU;
}
