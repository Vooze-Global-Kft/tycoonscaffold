/**
 * A still mock of the main screen built only from the kit and the layout numbers of section 4.1
 * (390 x 844 and 375 x 667), for review: station, rings, twelve slots with rigs and piles, routes,
 * a dozen drones (drawn through the baked atlas, as the frame loop will), the freighter on its
 * pad, and a sketch of the bay. Text here is the kit's stroke font; the real HUD uses RN text.
 */
import { BlendMode, Skia, type SkCanvas } from '@shopify/react-native-skia';
import { ATLAS_HEAD_R, ATLAS_ROCK_R, bakeAtlas, spriteXform, type HaulAtlas } from './atlas';
import { drawIdleBadge } from './drone.draw';
import { LOADED_FREIGHTER_SCALE, drawChevronStack, drawFreighter, drawPad, drawPolicyChip } from './freighter.draw';
import { drawChargePlate, drawFlare, drawGhostSlot, drawHoldTank, drawRingGuides, drawRoute, drawRouteChip, drawSeamGuide, drawSeamRim, drawStarfield } from './fx.draw';
import { drawText } from './glyphs';
import { drawRailButton, RAIL_GLYPHS } from './icons.draw';
import { SPACE, alpha, oreColor } from './palette';
import { builder, fill, linearPaint, litStroke, rrect, stroke } from './pen';
import { drawBuyer, drawTally } from './portraits.draw';
import { drawPile, drawPileLabel, pileSpot } from './rock.draw';
import { drawRigBase, drawRigLamp, rigHeads, rigLamp, type LampState, type RigLook } from './rig.draw';
import { FIRST_FOUR_PARTS, RACK_CRADLES, drawNodePart, drawStation } from './station.draw';

interface Layout {
  station: { x: number; y: number; r: number };
  rock: number;
  rocks: [number, number][];
  radii: number[];
  strip: { y: number; h: number };
  comms: { y: number };
  bay: number;
  counter: { x: number; y: number; w: number; h: number };
  tank: { x: number; y: number; w: number; h: number };
  flare: { x: number; y: number; s: number };
  track: { x: number; y: number; w: number; h: number };
  rail: { y: number; s: number; xs: number[] };
  bottom: number;
}

const L390: Layout = {
  station: { x: 195, y: 590, r: 40 },
  rock: 26,
  rocks: [
    [107, 524],
    [283, 524],
    [83, 436],
    [195, 400],
    [307, 436],
    [77, 348],
    [148, 325],
    [313, 348],
    [87, 258],
    [303, 258],
    [91, 174],
    [299, 174],
  ],
  radii: [110, 190, 269, 349, 429],
  strip: { y: 55, h: 52 },
  comms: { y: 111 },
  bay: 636,
  counter: { x: 104, y: 644, w: 182, h: 56 },
  tank: { x: 16, y: 644, w: 56, h: 88 },
  flare: { x: 298, y: 644, s: 72 },
  track: { x: 104, y: 704, w: 182, h: 58 },
  rail: { y: 766, s: 44, xs: [16, 78.8, 141.6, 204.4, 267.2, 330] },
  bottom: 810,
};

const L375: Layout = {
  station: { x: 187.5, y: 465, r: 36 },
  rock: 22,
  rocks: [
    [117, 412],
    [258, 412],
    [98, 342],
    [188, 313],
    [277, 342],
    [93, 271],
    [150, 253],
    [282, 271],
    [101, 199],
    [274, 199],
    [104, 131],
    [271, 131],
  ],
  radii: [88, 152, 216, 280, 344],
  strip: { y: 24, h: 46 },
  comms: { y: 73 },
  bay: 507,
  counter: { x: 92, y: 515, w: 191, h: 50 },
  tank: { x: 16, y: 515, w: 48, h: 69 },
  flare: { x: 295, y: 515, s: 64 },
  track: { x: 92, y: 569, w: 191, h: 50 },
  rail: { y: 623, s: 40, xs: [16, 76.6, 137.2, 197.8, 258.4, 319] },
  bottom: 667,
};

interface SlotMock {
  ore: string;
  look: RigLook;
  drones: number;
  pile: 0 | 1 | 2 | 3;
  count: string;
  lamp?: LampState;
  bonanza?: boolean;
  seam?: boolean;
  crack?: 0 | 1 | 2;
  dry?: boolean;
  ghost?: string;
}

const SLOTS: SlotMock[] = [
  { ore: 'iron', look: 2, drones: 3, pile: 1, count: '14/80' },
  { ore: 'iron', look: 1, drones: 2, pile: 3, count: '80/80', lamp: 'full', crack: 1 },
  { ore: 'copper', look: 1, drones: 2, pile: 2, count: '41/90' },
  { ore: 'copper', look: 3, drones: 3, pile: 1, count: '22/120', seam: true },
  { ore: 'iron', look: 0, drones: 1, pile: 0, count: '3/40', dry: true, lamp: 'dry' },
  { ore: 'ice', look: 0, drones: 1, pile: 1, count: '9/30', bonanza: true },
  { ore: 'copper', look: 0, drones: 1, pile: 2, count: '26/40', crack: 2 },
  { ore: 'ice', look: 4, drones: 2, pile: 1, count: '12/60' },
  { ore: 'titanium', look: 0, drones: 0, pile: 0, count: '0/20' },
  { ore: '', look: 0, drones: 0, pile: 0, count: '', ghost: '₵14.2K' },
  { ore: '', look: 0, drones: 0, pile: 0, count: '', ghost: '₵96K' },
  { ore: '', look: 0, drones: 0, pile: 0, count: '', ghost: '₵110K' },
];

let atlasCache: HaulAtlas | null = null;

function sprite(c: SkCanvas, atlas: HaulAtlas, name: string, x: number, y: number, angle: number, size = 1, opacity = 1): void {
  const s = atlas.sprites[name];
  if (!s) return;
  const [sc, ss, tx, ty] = spriteXform(s, atlas.density, x, y, angle, size);
  const p = Skia.Paint();
  if (opacity < 1) p.setAlphaf(opacity);
  c.drawAtlas(atlas.image, [s.rect], [Skia.RSXform(sc, ss, tx, ty)], p, BlendMode.SrcOver);
}

export function drawFieldMock(c: SkCanvas, w: number, h: number): void {
  const L = h >= 800 ? L390 : L375;
  const st = L.station;
  const k = st.r / 40;
  if (!atlasCache) atlasCache = bakeAtlas({ density: 3, freighter: { hull: 1, segments: 0 } });
  const atlas = atlasCache;
  if (!atlas) return;

  drawStarfield(c, w, h, 2);
  drawRingGuides(c, st.x, st.y, L.radii, 62, { rocks: L.rocks, rockR: L.rock });

  // Routes and chips, under the rocks.
  L.rocks.forEach(([x, y], i) => {
    const s = SLOTS[i];
    if (s.ghost || s.drones === 0) return;
    drawRoute(c, x, y, st.x, st.y - st.r * 0.3, s.ore, i * 2);
  });
  // Seam guide from the busiest route's chip.
  const chip0 = mid(L.rocks[0], [st.x, st.y], 0.5);
  drawSeamGuide(c, chip0[0], chip0[1], L.rocks[3][0], L.rocks[3][1]);

  // Rocks (atlas), rigs, piles.
  L.rocks.forEach(([x, y], i) => {
    const s = SLOTS[i];
    const r = L.rock;
    if (s.ghost) {
      c.save();
      c.translate(x, y);
      drawGhostSlot(c, r, s.ghost);
      c.restore();
      return;
    }
    if (s.seam) {
      c.save();
      c.translate(x, y);
      drawSeamRim(c, r);
      c.restore();
    }
    const shape = (i * 3) % 8;
    const spin = i * 0.7;
    const size = r / ATLAS_ROCK_R;
    if (s.dry) {
      sprite(c, atlas, `dry-${shape}`, x, y, spin, size);
      sprite(c, atlas, `dryglow-${shape}`, x, y, spin, size, 0.8);
    } else {
      sprite(c, atlas, `rock-${shape}-${s.ore}`, x, y, spin, size);
      if (s.bonanza) sprite(c, atlas, `bonanza-${shape}`, x, y, spin, size);
      if (s.crack) sprite(c, atlas, `crack${s.crack}-${shape}`, x, y, spin, size);
    }
    // Pile on the rock's outward side (its label is drawn later, above the drones).
    const spot = pileSpot(x, y, st.x, st.y, r, avoidFor(L, i));
    c.save();
    c.translate(spot.pile.x, spot.pile.y);
    drawPile(c, s.ore, s.pile);
    c.restore();
    // Rig.
    c.save();
    c.translate(x, y);
    c.scale(r / 26, r / 26);
    drawRigBase(c, { look: s.look });
    c.restore();
    for (const hd of rigHeads(s.look)) sprite(c, atlas, 'drill', x + (hd.x * r) / 26, y + (hd.y * r) / 26, i, ((hd.r / ATLAS_HEAD_R) * r) / 26);
    const lp = rigLamp(s.look);
    c.save();
    c.translate(x + (lp.x * r) / 26, y + (lp.y * r) / 26);
    drawRigLamp(c, s.lamp ?? 'run');
    c.restore();
  });

  // Station with three parts.
  c.save();
  c.translate(st.x, st.y);
  c.scale(k, k);
  drawNodePart(c, 'afterburner', 2);
  drawStation(c, 12);
  // The first four parts in the bot's buying order (errata 39).
  for (const n of FIRST_FOUR_PARTS) if (n !== 'afterburner') drawNodePart(c, n, 2);
  c.restore();

  // Drones along their routes (atlas): out empty, home loaded.
  L.rocks.forEach(([x, y], i) => {
    const s = SLOTS[i];
    for (let d = 0; d < s.drones; d++) {
      const t = ((d + 0.35 + i * 0.13) / s.drones) % 1;
      const home = d % 2 === 0;
      const from: [number, number] = [x, y];
      const to: [number, number] = [st.x, st.y - st.r * 0.3];
      const p = mid(from, to, 0.18 + t * 0.64);
      const ang = home ? Math.atan2(to[1] - from[1], to[0] - from[0]) : Math.atan2(from[1] - to[1], from[0] - to[0]);
      sprite(c, atlas, `flame-${(i + d) % 3}`, p[0], p[1], ang);
      sprite(c, atlas, home ? `drone-${s.ore}` : `drone-${s.ore}-empty`, p[0], p[1], ang);
    }
  });
  // Route chips, over the drones.
  L.rocks.forEach(([x, y], i) => {
    const s = SLOTS[i];
    if (s.ghost || s.drones === 0) return;
    const p = mid([x, y], [st.x, st.y], 0.52);
    c.save();
    c.translate(p[0] + 10, p[1]);
    drawRouteChip(c, s.drones, s.ore);
    c.restore();
  });
  // Pile labels on their plates, above drones and chips.
  L.rocks.forEach(([x, y], i) => {
    const s = SLOTS[i];
    if (s.ghost) return;
    const spot = pileSpot(x, y, st.x, st.y, L.rock, avoidFor(L, i));
    c.save();
    c.translate(spot.label.x, spot.label.y);
    drawPileLabel(c, s.count, s.lamp === 'full');
    c.restore();
  });
  // Two idle drones on the rack.
  for (const i of [0, 1]) {
    const cr = RACK_CRADLES[i];
    const x = st.x + cr.x * k;
    const y = st.y + cr.y * k;
    sprite(c, atlas, 'drone-idle', x, y, -Math.PI / 2);
    c.save();
    c.translate(x, y - 14);
    drawIdleBadge(c);
    c.restore();
  }

  drawTopBars(c, L, w);
  drawBay(c, L, w, h);
}

function drawTopBars(c: SkCanvas, L: Layout, w: number): void {
  // Contract strip.
  const s = L.strip;
  const card = rrect(16, s.y, w - 32, s.h, 12);
  c.drawPath(card, fill(alpha(SPACE.panel, 0.92)));
  litStroke(c, card, alpha(SPACE.green, 0.8), 1.2, 0.6);
  c.save();
  c.translate(16 + s.h / 2, s.y + s.h / 2);
  drawBuyer(c, s.h - 14, 'halden');
  c.restore();
  drawText(c, 'HALDEN YARDS', 16 + s.h, s.y + 9, { size: 6, color: '#FFFFFF', glow: 0, weight: 1.1 });
  // Ore chip with a fill bar.
  c.drawPath(rrect(16 + s.h, s.y + 22, 70, 9, 4.5), fill(SPACE.hull0));
  c.drawPath(rrect(16 + s.h, s.y + 22, 52, 9, 4.5), fill(oreColor('iron')));
  drawText(c, '8/10 IRON', 16 + s.h + 76, s.y + 23.5, { size: 5.5, color: SPACE.steel, glow: 0, weight: 1 });
  drawText(c, 'x1.5', w - 24, s.y + 9, { size: 8, color: SPACE.gold, align: 'right', weight: 1.4 });
  drawText(c, '+₵420', w - 24, s.y + 24, { size: 6, color: SPACE.green, align: 'right', weight: 1.1 });
  for (let i = 0; i < 6; i++) c.drawCircle(16 + s.h + 4 + i * 8, s.y + s.h - 9, 2.2, fill(i < 4 ? SPACE.line : SPACE.hull3));
  // Comms slot.
  const cy = L.comms.y;
  c.drawPath(rrect(16, cy, w - 32, 22, 11), fill(alpha(SPACE.panel, 0.8)));
  c.save();
  c.translate(28, cy + 11);
  drawTally(c, 18, 25);
  c.restore();
  drawText(c, 'TALLY: GOLD ON T-4. RICH SEAM, FORTY SECONDS.', 42, cy + 8, { size: 5.5, color: '#DDEBFF', glow: 0, weight: 1 });
}

function drawBay(c: SkCanvas, L: Layout, w: number, h: number): void {
  const top = L.bay;
  const b = builder();
  b.moveTo(0, top + 14);
  b.quadTo(w / 2, top - 14, w, top + 14);
  b.lineTo(w, h);
  b.lineTo(0, h);
  b.close();
  const panel = b.build();
  c.drawPath(panel, linearPaint(0, top, 0, h, [SPACE.panel, '#080D1C']));
  const edge = builder().moveTo(0, top + 14).quadTo(w / 2, top - 14, w, top + 14).build();
  litStroke(c, edge, SPACE.panelEdge, 1.5, 0.8);
  // Dock counter.
  const ct = L.counter;
  c.drawPath(rrect(ct.x, ct.y, ct.w, ct.h, 8), fill(SPACE.hull0));
  c.drawPath(rrect(ct.x, ct.y, ct.w, ct.h, 8), stroke(alpha(SPACE.line, 0.4), 1));
  drawText(c, '₵18,412', ct.x + ct.w / 2, ct.y + 8, { size: 18, color: SPACE.gold, align: 'center', weight: 2.4, glow: 0.7 });
  drawText(c, '₵36/S', ct.x + ct.w / 2, ct.y + ct.h - 13, { size: 6.5, color: SPACE.steel, align: 'center', glow: 0, weight: 1.1 });
  // Hold tank.
  const tk = L.tank;
  c.save();
  c.translate(tk.x + 4 + tk.w / 2 - 4, tk.y + tk.h / 2);
  drawHoldTank(c, tk.w, tk.h, [
    ['iron', 0.35],
    ['copper', 0.25],
    ['ice', 0.1],
  ]);
  c.restore();
  drawText(c, '34/50', tk.x + tk.w / 2 + 2, tk.y + tk.h + 6, { size: 6, color: SPACE.steel, align: 'center', glow: 0, weight: 1 });
  // Flare launcher.
  const fl = L.flare;
  c.drawPath(rrect(fl.x, fl.y, fl.s, fl.s, 14), fill(SPACE.hull0));
  c.drawPath(rrect(fl.x, fl.y, fl.s, fl.s, 14), stroke(alpha(SPACE.gold, 0.5), 1));
  c.save();
  c.translate(fl.x + fl.s / 2, fl.y + fl.s / 2 - 4);
  c.scale(1.6, 1.6);
  drawFlare(c);
  c.restore();
  c.save();
  c.translate(fl.x + fl.s - 16, fl.y + fl.s - 12);
  drawChargePlate(c, 2);
  c.restore();
  // Launch track: lit pad, the loaded freighter at 1.3x, one chevron stack above it, the policy chip.
  const tr = L.track;
  const cx = tr.x + tr.w / 2;
  const cy = tr.y + tr.h - 17;
  c.save();
  c.translate(cx, cy);
  c.scale(0.8, 0.8);
  drawPad(c, true);
  c.scale(LOADED_FREIGHTER_SCALE, LOADED_FREIGHTER_SCALE);
  drawFreighter(c, { hull: 1, cargo: ['iron', 'copper'] });
  c.restore();
  // One stack of chevrons straight above the freighter: "swipe up".
  c.save();
  c.translate(cx, cy - 20);
  c.scale(0.6, 0.6);
  drawChevronStack(c, 0.7);
  c.restore();
  c.save();
  c.translate(tr.x + tr.w - 30, tr.y + 10);
  c.scale(0.85, 0.85);
  drawPolicyChip(c, 'FULL');
  c.restore();
  // Rail.
  L.rail.xs.forEach((x, i) => {
    c.save();
    c.translate(x + L.rail.s / 2, L.rail.y + L.rail.s / 2);
    const badge: Record<number, [string, 'count' | 'dm']> = { 0: ['2', 'count'], 1: ['', 'count'], 4: ['240', 'dm'] };
    drawRailButton(c, L.rail.s, RAIL_GLYPHS[i], badge[i]?.[0], badge[i]?.[1]);
    c.restore();
  });
}

function mid(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function unit(a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

/** The other slots as circles to keep pile labels off (ghost slots include their price tag). */
function avoidFor(L: Layout, i: number): [number, number, number][] {
  return L.rocks.flatMap(([x, y], j) => (j === i ? [] : SLOTS[j].ghost ? [[x, y, L.rock + 8] as [number, number, number]] : [[x, y, L.rock] as [number, number, number]]));
}
