/**
 * The meta screens' grounds (office-design.md 1.2 row 13, 4.4, 5): the clothbound Ledger with
 * inked rows, the framed cabinet photograph with dotted silhouettes for places to come, the pinned
 * district maps (five wards, seven counties, nine provinces: invented shapes, held districts in
 * violet hatching, the others slate, never a club colour), election night's chalk tally board with
 * envelopes, rosettes, chalk marks, the majority line and bunting; the bottom row's button icons.
 *
 * Pieces draw from their top-left at the origin (w x h in points) unless they say "centred".
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawRosette } from './effects.draw';
import { drawBunting } from './paper.draw';
import { drawClubGlyph } from './clubs.draw';
import {
  LINE,
  at,
  builder,
  circle,
  clip,
  dashed,
  dropShadow,
  fill,
  hatch,
  line,
  oval,
  poly,
  rect,
  rrect,
  seeded,
  shape,
  stroke,
  washed,
  wobble,
  type Box,
} from './pen';

// ---------------------------------------------------------------------------
// Button icons (bottom row: Ledger, Cabinet, Poll, Office; plus Shop and Settings)
// ---------------------------------------------------------------------------

export const BUTTON_ICONS = ['ledger', 'cabinet', 'poll', 'office', 'shop', 'settings', 'scrapbook', 'shelf', 'call'] as const;
export type ButtonIcon = (typeof BUTTON_ICONS)[number];

/** A bottom-row icon, centred in ±12. */
export function drawButtonIcon(c: SkCanvas, id: ButtonIcon): void {
  switch (id) {
    case 'ledger':
      washed(c, rrect(-9, -11, 18, 22, 1.6), DESK.violetDeep, DESK.violetDeep, 0, 0, 1);
      c.drawPath(rect(-9, -11, 3.6, 22), fill(mix(DESK.violetDeep, DESK.line, 0.4)));
      c.drawPath(rect(-3, -6, 9, 5), fill(DESK.paperLight));
      c.drawPath(rect(-3, -6, 9, 5), stroke(LINE, 0.6));
      c.drawPath(rect(-9, 9, 18, 2), fill(DESK.paperShade));
      c.drawPath(poly([5, -11, 9, -11, 9, -7]), fill(DESK.brass));
      return;
    case 'cabinet':
      washed(c, rrect(-11, -9, 22, 18, 1.2), DESK.giltDeep, DESK.giltDeep, 0, 0, 1);
      c.drawPath(rect(-8.4, -6.4, 16.8, 12.8), fill(DESK.slatePale));
      for (const [x, s] of [
        [-4.4, 1],
        [0, 1.2],
        [4.4, 1],
      ] as const) {
        c.drawPath(oval(x, -1.6 - (s - 1) * 2, 1.8 * s, 2.2 * s), fill(DESK.slate));
        c.drawPath(builder().moveTo(x - 3 * s, 6.4).quadTo(x, 0.4, x + 3 * s, 6.4).close().build(), fill(DESK.slate));
      }
      return;
    case 'poll':
      drawPinnedMapIcon(c);
      return;
    case 'office':
      washed(c, rrect(-8, -11, 16, 20, 1.2), DESK.gilt, DESK.giltDeep, 1, 1, 1);
      c.drawPath(rect(-5.4, -8.4, 10.8, 14.6), fill(DESK.slatePale));
      c.drawPath(oval(0, -3.6, 2.6, 3.4), fill(DESK.slate));
      c.drawPath(builder().moveTo(-4.4, 6.2).quadTo(0, -1, 4.4, 6.2).close().build(), fill(DESK.slate));
      c.drawPath(line(0, -11, 0, -13), stroke(LINE, 0.8));
      c.drawPath(poly([-4, -11, 0, -13.4, 4, -11], false), stroke(LINE, 0.8));
      c.drawPath(rect(-10, 10, 20, 2), fill(DESK.walnut));
      return;
    case 'shop':
      washed(c, builder().moveTo(-10, -2).lineTo(10, -2).lineTo(8, 11).lineTo(-8, 11).close().build(), DESK.walnutLight, DESK.walnut, 1, 1, 1);
      c.drawPath(builder().moveTo(-5, -2).quadTo(-5, -10, 0, -10).quadTo(5, -10, 5, -2).build(), stroke(DESK.brassDeep, 1.8));
      c.drawPath(rect(-3, 3, 6, 4), fill(DESK.brass));
      return;
    case 'settings':
      // a brass desk bell
      washed(c, builder().moveTo(-9, 6).quadTo(-9, -6, 0, -6).quadTo(9, -6, 9, 6).close().build(), DESK.brass, DESK.brassDeep, 1, 1, 1);
      c.drawPath(rect(-11, 6, 22, 3), fill(DESK.walnut));
      c.drawPath(rect(-11, 6, 22, 3), stroke(LINE, 0.7));
      c.drawPath(line(0, -6, 0, -10), stroke(LINE, 1.4));
      c.drawPath(circle(0, -10.6, 1.6), fill(DESK.brassDeep));
      return;
    case 'scrapbook':
      washed(c, rrect(-10, -10, 20, 20, 1.4), DESK.slate, DESK.slateDeep, 1, 1, 1);
      at(c, -1, -1, 1, -8, (q) => shape(q, rect(-6, -5, 12, 9), DESK.paperLight, 0.7));
      at(c, 3, 3, 1, 10, (q) => shape(q, rect(-5, -4, 10, 8), DESK.paper, 0.7));
      return;
    case 'shelf':
      c.drawPath(rect(-11, 6, 22, 3), fill(DESK.walnut));
      c.drawPath(rect(-11, 6, 22, 3), stroke(LINE, 0.7));
      washed(c, builder().addOval({ x: -8, y: -8, width: 7, height: 9 }).addRect({ x: -9, y: 0, width: 9, height: 6 }).build(), DESK.bronzeLight, DESK.bronze, 0.8, 0.8, 0.8);
      washed(c, rrect(2, -4, 7, 10, 1), DESK.bronzeLight, DESK.bronze, 0.8, 0.8, 0.8);
      return;
    case 'call':
      // a gavel
      at(c, 0, 0, 1, -30, (q) => {
        washed(q, rrect(-9, -11, 12, 7, 2), DESK.walnutLight, DESK.walnut, 0.8, 0.8, 1);
        q.drawPath(rect(-4.4, -4.6, 2.6, 15), fill(DESK.walnut));
        q.drawPath(rect(-4.4, -4.6, 2.6, 15), stroke(LINE, 0.8));
      });
      c.drawPath(rect(-2, 8, 12, 3), fill(DESK.walnutDeep));
      return;
  }
}

function drawPinnedMapIcon(c: SkCanvas): void {
  const sheet = poly([-11, -9, 11, -10, 10, 10, -10, 11]);
  shape(c, sheet, DESK.paperLight, 1);
  const land = builder().moveTo(-7, -5).quadTo(-2, -8, 4, -5).quadTo(9, -2, 6, 4).quadTo(2, 9, -4, 7).quadTo(-9, 3, -7, -5).close().build();
  c.drawPath(land, fill(DESK.slatePale));
  c.save();
  clip(c, land);
  c.drawPath(rect(-12, -12, 12, 24), fill(alpha(DESK.violetPale, 0.9)));
  hatch(c, rect(-12, -12, 12, 24), DESK.violet, 1.8, 0.8);
  c.restore();
  c.drawPath(land, stroke(DESK.slateDeep, 1));
  c.drawPath(line(0, -7.4, 0, 8.4), stroke(DESK.slateDeep, 0.8));
  c.drawPath(circle(0, -9.6, 2), fill(DESK.violet));
  c.drawPath(circle(-0.6, -10.2, 0.6), fill(alpha(DESK.white, 0.8)));
}

// ---------------------------------------------------------------------------
// The Ledger
// ---------------------------------------------------------------------------

/**
 * The Ledger (4.4: a read-only book): a clothbound volume open flat, w x h, its two pages ruled in
 * pale blue with a violet margin and a mustard money column; the rows' boxes are ledgerRows(). The
 * cover shows round the pages; the spine in the middle; a ribbon bookmark.
 */
export function drawLedger(c: SkCanvas, w: number, h: number): void {
  dropShadow(c, rrect(0, 0, w, h, 6), 2, 3, 0.35);
  washed(c, rrect(0, 0, w, h, 6), DESK.violetDeep, mix(DESK.violetDeep, DESK.line, 0.4), 2, 2, 1.2);
  // cloth texture
  c.save();
  clip(c, rrect(0, 0, w, h, 6));
  hatch(c, rect(0, 0, w, h), alpha(DESK.violetLight, 0.18), 1.6, 0.5, 45);
  c.restore();
  const m = 7;
  const page = { x: m, y: m, w: w - m * 2, h: h - m * 2 };
  c.drawPath(rect(page.x, page.y + 2, page.w, page.h), fill(DESK.paperShade));
  c.drawPath(rect(page.x, page.y, page.w, page.h - 2), fill(DESK.paperLight));
  // rules
  c.save();
  c.clipRect({ x: page.x, y: page.y, width: page.w, height: page.h }, 1, true);
  for (let y = page.y + 30; y < page.y + page.h; y += 16) c.drawPath(line(page.x, y, page.x + page.w, y), stroke(alpha(DESK.slateLight, 0.55), 0.6));
  c.drawPath(line(page.x + 34, page.y, page.x + 34, page.y + page.h), stroke(alpha(DESK.violet, 0.6), 0.9));
  const mx = page.x + page.w - 76;
  c.drawPath(line(mx, page.y, mx, page.y + page.h), stroke(alpha(DESK.mustard, 0.7), 0.8));
  c.drawPath(line(mx + 2, page.y, mx + 2, page.y + page.h), stroke(alpha(DESK.mustard, 0.7), 0.5));
  c.drawPath(line(page.x, page.y + 26, page.x + page.w, page.y + 26), stroke(DESK.violet, 1.2));
  c.drawPath(line(page.x, page.y + 28.5, page.x + page.w, page.y + 28.5), stroke(DESK.violet, 0.6));
  c.restore();
  // a ribbon bookmark hanging out of the bottom
  c.drawPath(poly([w * 0.8, h - m, w * 0.8 + 6, h - m, w * 0.8 + 6, h + 8, w * 0.8 + 3, h + 5, w * 0.8, h + 8]), fill(DESK.mustardDeep));
}

/** The Ledger's row boxes: n rows from the first ruled line, each 2 rules (32 pt) tall, in the page's inner box. */
export function ledgerRows(w: number, h: number, n: number): Box[] {
  const m = 7;
  const out: Box[] = [];
  for (let i = 0; i < n; i++) out.push({ x: m + 36, y: m + 30 + i * 32, w: w - m * 2 - 36, h: 32 });
  return out.filter((b) => b.y + b.h <= h - m);
}

// ---------------------------------------------------------------------------
// The cabinet photograph
// ---------------------------------------------------------------------------

/** Where the faces stand in the cabinet photograph of `total` places (9: two rows, 4 sitting and 5 standing), from the frame's top left. */
export function cabinetSlots(w: number, h: number, total = 9): Box[] {
  const inner = cabinetInner(w, h);
  const back = Math.ceil(total / 2);
  const front = total - back;
  const out: Box[] = [];
  const fw = Math.min(inner.w / (back + 0.4), inner.h * 0.55);
  const fh = fw * 1.25;
  for (let i = 0; i < back; i++) out.push({ x: inner.x + (inner.w - back * fw) / 2 + i * fw, y: inner.y + inner.h * 0.12, w: fw, h: fh });
  for (let i = 0; i < front; i++) out.push({ x: inner.x + (inner.w - front * fw) / 2 + i * fw, y: inner.y + inner.h * 0.12 + fh * 0.62, w: fw, h: fh });
  return out;
}

function cabinetInner(w: number, h: number): Box {
  const f = Math.max(10, w * 0.05);
  return { x: f + 6, y: f + 6, w: w - 2 * (f + 6), h: h - 2 * (f + 6) };
}

/**
 * The framed cabinet photograph (4.4): a gilt frame with a mount, a sepia-slate print of a panelled
 * room, and a dotted silhouette at every place not yet filled (`filled` booleans, length 9, in
 * cabinetSlots order). The faces of filled places are the caller's (faces atlas), drawn into the slots.
 */
export function drawCabinetFrame(c: SkCanvas, w: number, h: number, filled: boolean[] = []): void {
  const f = Math.max(10, w * 0.05);
  dropShadow(c, rect(0, 0, w, h), 2, 3, 0.35);
  washed(c, rect(0, 0, w, h), DESK.gilt, DESK.giltDeep, 2, 2, 1.2);
  c.drawPath(rect(3, 3, w - 6, h - 6), stroke(alpha(DESK.white, 0.35), 1));
  c.drawPath(rect(f - 2, f - 2, w - 2 * f + 4, h - 2 * f + 4), stroke(DESK.giltDeep, 1.4));
  c.drawPath(rect(f, f, w - 2 * f, h - 2 * f), fill(DESK.paperLight));
  const inner = cabinetInner(w, h);
  c.drawPath(rect(inner.x, inner.y, inner.w, inner.h), fill(mix(DESK.slatePale, DESK.walnutLight, 0.18)));
  // panelled wall behind
  for (let i = 0; i < 4; i++) c.drawPath(rect(inner.x + 6 + (i * (inner.w - 12)) / 4, inner.y + 6, (inner.w - 12) / 4 - 6, inner.h * 0.45), stroke(alpha(DESK.slate, 0.35), 0.8));
  c.drawPath(rect(inner.x, inner.y + inner.h * 0.78, inner.w, inner.h * 0.22), fill(alpha(DESK.walnut, 0.3)));
  const slots = cabinetSlots(w, h, 9);
  slots.forEach((s, i) => {
    if (filled[i]) return;
    const cx = s.x + s.w / 2;
    const head = builder().addOval({ x: cx - s.w * 0.2, y: s.y + s.h * 0.08, width: s.w * 0.4, height: s.w * 0.56 }).build();
    const body = builder().moveTo(s.x + s.w * 0.08, s.y + s.h).quadTo(s.x + s.w * 0.1, s.y + s.h * 0.56, cx, s.y + s.h * 0.54).quadTo(s.x + s.w * 0.9, s.y + s.h * 0.56, s.x + s.w * 0.92, s.y + s.h).build();
    const dots = dashed(alpha(DESK.slateDeep, 0.7), 1.1, 0.1, 3);
    dots.setStrokeCap(1);
    c.drawPath(head, dots);
    c.drawPath(body, dots);
  });
  c.drawPath(rect(inner.x, inner.y, inner.w, inner.h), stroke(alpha(LINE, 0.5), 0.6));
}

// ---------------------------------------------------------------------------
// District maps (Skia paths)
// ---------------------------------------------------------------------------

interface District {
  path: SkPath;
  label: { x: number; y: number };
}

/** Seeds of the districts per office in a 100 x 100 box, in game.json's district order. */
const SEEDS: Record<0 | 1 | 2, [number, number][]> = {
  // Dithering-on-the-Dawdle: Market, Mill, Hilltop, Riverside, Old Town (the river runs north-south through Riverside)
  0: [
    [50, 46],
    [24, 30],
    [74, 22],
    [36, 74],
    [72, 68],
  ],
  // Upper Wobbling: seven counties
  1: [
    [30, 22],
    [62, 18],
    [84, 40],
    [52, 48],
    [20, 56],
    [42, 80],
    [74, 74],
  ],
  // The Republic: Middlingham, Fogmoor, Brassby, Teacup Downs, Gusting Heights, Muchpuddle, Saltpenny Bay, Kitewell, Upper Wobbling
  2: [
    [50, 50],
    [32, 24],
    [62, 26],
    [22, 50],
    [76, 30],
    [40, 76],
    [84, 74],
    [86, 46],
    [64, 60],
  ],
};

/** The outline of each office's land (a seeded irregular shape, never a real country's, state's or county's). */
function outline(office: 0 | 1 | 2): [number, number][] {
  const r = seeded(101 + office * 17);
  const pts: [number, number][] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let rad = 39 + (r() - 0.5) * 9 + Math.sin(a * 3 + office) * 4;
    if (office === 2 && i >= 3 && i <= 5) rad += 7; // Saltpenny Bay's long spit to the south-east
    if (office === 2 && i === 18) rad -= 12; // a bay on the west coast
    if (office === 1 && i >= 10 && i <= 12) rad += 6;
    pts.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad * (office === 0 ? 0.9 : 0.95)]);
  }
  return pts;
}

function clipHalf(poly0: [number, number][], ax: number, ay: number, bx: number, by: number): [number, number][] {
  // keep points closer to a than to b
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const nx = bx - ax;
  const ny = by - ay;
  const side = (p: [number, number]) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const out: [number, number][] = [];
  for (let i = 0; i < poly0.length; i++) {
    const p = poly0[i];
    const q = poly0[(i + 1) % poly0.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** A smooth, position-only displacement: shared borders stay shared after it. */
function warp(x: number, y: number, office: number): [number, number] {
  const k = 0.11;
  return [x + Math.sin(y * k + office) * 2.2 + Math.sin((x + y) * 0.21) * 0.9, y + Math.cos(x * k * 1.2 + office * 2) * 2.2 + Math.sin((x - y) * 0.19) * 0.9];
}

function densify(p: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

const mapCache = new Map<number, { land: SkPath; districts: District[] }>();

/** The office's districts as paths in a 100 x 100 box (in game.json's district order), and the whole land. */
export function districtPaths(office: 0 | 1 | 2): { land: SkPath; districts: District[] } {
  const hit = mapCache.get(office);
  if (hit) return hit;
  const seeds = SEEDS[office];
  const land = outline(office);
  const toPath = (pts: [number, number][]) => {
    const b = builder();
    pts.forEach(([x, y], i) => {
      const [wx, wy] = warp(x, y, office);
      if (i) b.lineTo(wx, wy);
      else b.moveTo(wx, wy);
    });
    b.close();
    return b.build();
  };
  const districts = seeds.map((s, i) => {
    let cell = land;
    seeds.forEach((o, j) => {
      if (j !== i) cell = clipHalf(cell, s[0], s[1], o[0], o[1]);
    });
    const cx = cell.reduce((a, p) => a + p[0], 0) / Math.max(1, cell.length);
    const cy = cell.reduce((a, p) => a + p[1], 0) / Math.max(1, cell.length);
    const [lx, ly] = warp(cx, cy, office);
    return { path: toPath(densify(cell, 2)), label: { x: lx, y: ly } };
  });
  const out = { land: toPath(densify(land, 2)), districts };
  mapCache.set(office, out);
  return out;
}

export interface MapOptions {
  /** Per district: held (violet hatching) or not (slate). */
  held?: boolean[];
  /** A district to outline thickly (the one a campaign paper names). */
  focus?: number;
  /** Draw the drawing pins at the labels. */
  pins?: boolean;
}

/**
 * The pinned district map (4.4 Poll): the land on a sheet of map paper, each district held (violet
 * hatching on a pale violet wash, violet border) or not (slate wash), the river for the mayor's
 * town, a pin per district. w x h from top left; the map keeps its aspect (fit in the box).
 * Names and shares are the caller's, at districtLabel().
 */
export function drawDistrictMap(c: SkCanvas, w: number, h: number, office: 0 | 1 | 2, o: MapOptions = {}): void {
  const { land, districts } = districtPaths(office);
  const s = Math.min(w, h) / 100;
  const ox = (w - 100 * s) / 2;
  const oy = (h - 100 * s) / 2;
  // the map paper
  dropShadow(c, rect(0, 0, w, h), 1.5, 2, 0.3);
  c.drawPath(rect(0, 0, w, h), fill(DESK.paperLight));
  c.drawPath(rect(0, 0, w, h), stroke(DESK.paperEdge, 0.8));
  at(c, ox, oy, s, 0, (q) => {
    // sea hatching round the land
    q.drawPath(rect(0, 0, 100, 100), fill(alpha(DESK.slatePale, 0.6)));
    const waves = builder();
    for (let y = 6; y < 100; y += 11)
      for (let x = ((y / 11) % 2) * 7 + 3; x < 100; x += 14) waves.moveTo(x, y).quadTo(x + 1.5, y - 1.2, x + 3, y).quadTo(x + 4.5, y + 1.2, x + 6, y);
    q.drawPath(waves.build(), stroke(alpha(DESK.slateLight, 0.8), 0.5));
    districts.forEach((d, i) => {
      const held = o.held?.[i] ?? false;
      q.drawPath(d.path, fill(held ? DESK.violetPale : mix(DESK.slatePale, DESK.white, 0.3)));
      if (held) hatch(q, d.path, DESK.violet, 2.2, 0.55, -45);
    });
    if (office === 0) {
      const river = builder().moveTo(30, 0).quadTo(26, 30, 38, 52).quadTo(48, 70, 40, 100).build();
      q.save();
      clip(q, land);
      q.drawPath(river, stroke(DESK.glassDeep, 3.2));
      q.drawPath(river, stroke(DESK.glass, 1.6));
      q.restore();
    }
    districts.forEach((d, i) => {
      const held = o.held?.[i] ?? false;
      q.drawPath(d.path, stroke(held ? DESK.violetDeep : DESK.slate, (o.focus === i ? 1.6 : 0.7) / Math.max(0.6, s * 0.7)));
    });
    q.drawPath(land, stroke(LINE, 1.4 / Math.max(0.6, s * 0.7)));
    if (o.pins !== false)
      districts.forEach((d) => {
        q.drawPath(circle(d.label.x + 0.5, d.label.y - 4.5, 1.9), fill(alpha(DESK.shadow, 0.3)));
        q.drawPath(line(d.label.x, d.label.y - 2, d.label.x - 0.5, d.label.y - 5), stroke(DESK.slateDeep, 0.5));
        q.drawPath(circle(d.label.x - 0.5, d.label.y - 5.4, 1.8), fill(DESK.brass));
        q.drawPath(circle(d.label.x - 0.5, d.label.y - 5.4, 1.8), stroke(LINE, 0.35));
      });
  });
  // the pins at the paper's corners
  for (const [x, y] of [
    [6, 6],
    [w - 6, 6],
  ])
    c.drawPath(circle(x, y, 2.4), fill(DESK.violet));
}

/** A district's label point in the map's box (w x h from top left). */
export function districtLabel(w: number, h: number, office: 0 | 1 | 2, i: number): { x: number; y: number } {
  const { districts } = districtPaths(office);
  const s = Math.min(w, h) / 100;
  const d = districts[i];
  return d ? { x: (w - 100 * s) / 2 + d.label.x * s, y: (h - 100 * s) / 2 + d.label.y * s } : { x: w / 2, y: h / 2 };
}

/** A district's own little map (the district chip's badge, the campaign paper's corner): centred, fit in ±r. */
export function drawDistrictBadge(c: SkCanvas, office: 0 | 1 | 2, i: number, r = 12, held = false): void {
  const { districts } = districtPaths(office);
  const d = districts[i];
  if (!d) return;
  const bb = d.path.computeTightBounds();
  const s = (r * 2) / Math.max(bb.width, bb.height);
  at(c, 0, 0, s, 0, (q) => {
    q.translate(-(bb.x + bb.width / 2), -(bb.y + bb.height / 2));
    q.drawPath(d.path, fill(held ? DESK.violetPale : DESK.slatePale));
    if (held) hatch(q, d.path, DESK.violet, 2.2 / s, 0.8 / s);
    q.drawPath(d.path, stroke(held ? DESK.violetDeep : DESK.slateDeep, 1.2 / s));
  });
}

// ---------------------------------------------------------------------------
// Election night (4.4): the chalk tally board
// ---------------------------------------------------------------------------

/** The tally board's row boxes for n districts (the name column, the marks column, the result cell), from the board's top left. */
export function tallyRows(w: number, h: number, n: number): { name: Box; marks: Box; result: Box }[] {
  const f = 12;
  const top = f + 26;
  const rh = (h - top - f - 8) / n;
  return Array.from({ length: n }, (_, i) => {
    const y = top + i * rh;
    return { name: { x: f + 8, y, w: w * 0.34, h: rh }, marks: { x: f + 8 + w * 0.36, y, w: w * 0.4, h: rh }, result: { x: w - f - 8 - rh, y, w: rh, h: rh } };
  });
}

/**
 * The chalk tally board (w x h from top left): a walnut-framed slate, ruled rows for n districts,
 * the dashed majority line after row `majority` (rows sorted by the count's order are the caller's),
 * chalk dust. Bunting along the top when `bunting` (at the majority).
 */
export function drawTallyBoard(c: SkCanvas, w: number, h: number, n: number, o: { majority?: number; bunting?: boolean } = {}): void {
  const f = 12;
  dropShadow(c, rrect(0, 0, w, h, 4), 2, 3, 0.4);
  washed(c, rrect(0, 0, w, h, 4), DESK.walnut, DESK.walnutDeep, 2, 2, 1.2);
  c.drawPath(rect(f, f, w - 2 * f, h - 2 * f), fill(DESK.chalk));
  // chalk smears
  const r = seeded(77);
  c.save();
  c.clipRect({ x: f, y: f, width: w - 2 * f, height: h - 2 * f }, 1, true);
  for (let i = 0; i < 9; i++) {
    const x = f + r() * (w - 2 * f);
    const y = f + r() * (h - 2 * f);
    c.drawPath(oval(x, y, 20 + r() * 40, 5 + r() * 8), fill(alpha(DESK.chalkDust, 0.05 + r() * 0.04)));
  }
  c.restore();
  const rows = tallyRows(w, h, n);
  rows.forEach((row, i) => {
    if (i > 0) c.drawPath(wobble([[f + 6, row.name.y], [w - f - 6, row.name.y]], 0.8, 30 + i), stroke(alpha(DESK.chalkLine, 0.35), 0.8));
  });
  c.drawPath(wobble([[f + 6, f + 22], [w - f - 6, f + 22]], 0.8, 9), stroke(alpha(DESK.chalkLine, 0.7), 1.2));
  if (o.majority !== undefined && o.majority > 0 && o.majority < n) {
    const y = rows[o.majority].name.y;
    c.drawPath(line(f + 4, y, w - f - 4, y), dashed(DESK.chalkLine, 1.6, 6, 4));
  }
  // chalk tray along the bottom with two sticks
  c.drawPath(rect(f - 2, h - f - 1, w - 2 * f + 4, 4), fill(DESK.walnutDeep));
  c.drawPath(rrect(w * 0.3, h - f - 3, 14, 3, 1.5), fill(DESK.chalkLine));
  c.drawPath(rrect(w * 0.36, h - f - 3, 9, 3, 1.5), fill(alpha(DESK.chalkLine, 0.85)));
  if (o.bunting) drawBunting(c, 4, w - 4, 4, Math.round(w / 26), 7, 11);
}

/** Chalk tally marks: `n` marks in gates of five, from (0, 0) as the top left, each `h` tall. */
export function drawChalkMarks(c: SkCanvas, n: number, h = 16, seed = 3): number {
  let x = 0;
  for (let i = 0; i < n; i++) {
    const g = i % 5;
    if (g < 4) {
      c.drawPath(wobble([[x + g * 4, 0], [x + g * 4 + 0.8, h]], 0.6, seed + i), stroke(DESK.chalkLine, 1.5));
    } else {
      c.drawPath(wobble([[x - 2, h * 0.8], [x + 15, h * 0.15]], 0.6, seed + i), stroke(DESK.chalkLine, 1.5));
      x += 24;
    }
  }
  return x + (n % 5) * 4;
}

/** An envelope (centred, about 40 x 26), `open` 0..1 lifts its flap and shows a paper inside. */
export function drawEnvelope(c: SkCanvas, open = 0, k = 1): void {
  at(c, 0, 0, k, 0, (q) => {
    const o = Math.max(0, Math.min(1, open));
    if (o > 0) washed(q, rect(-15, -13 - o * 8, 30, 18), DESK.paperLight, DESK.paperShade, 0.8, 0.8, 0.8);
    washed(q, rect(-20, -13, 40, 26), mix(DESK.paper, DESK.beige, 0.4), DESK.beigeDeep, 1, 1, 1);
    q.drawPath(poly([-20, 13, 0, -1, 20, 13], false), stroke(alpha(LINE, 0.5), 0.8));
    const flapY = -13 + (1 - o) * 14 - o * 10;
    shape(q, poly([-20, -13, 20, -13, 0, flapY]), mix(DESK.paper, DESK.beige, 0.55), 0.9);
    if (o < 0.5) {
      q.drawPath(circle(0, -1, 3.2), fill(DESK.violet));
      q.drawPath(circle(0, -1, 3.2), stroke(LINE, 0.5));
    }
  });
}

/** A held district's rosette on the tally board (violet), or a lost one's plain slate ring, centred, radius r. */
export function drawTallyResult(c: SkCanvas, held: boolean, r = 10): void {
  if (held) drawRosette(c, 0, -r * 0.15, r);
  else {
    c.drawPath(circle(0, 0, r * 0.62), stroke(DESK.chalkDust, 1.6));
    c.drawPath(line(-r * 0.4, 0, r * 0.4, 0), stroke(DESK.chalkDust, 1.6));
  }
}

/** The band in silhouette (at the majority): a row of instruments raised against the light, w wide, the baseline at y = 0. */
export function drawBandSilhouette(c: SkCanvas, w: number, color: string = DESK.chalkDeep): void {
  const k = w / 220;
  at(c, 0, 0, k, 0, (q) => {
    const ink = color;
    at(q, 24, -18, 1.6, -10, (z) => drawClubGlyph(z, 'brass', 1, ink));
    q.drawPath(rrect(52, -26, 26, 22, 4), fill(ink)); // a bass drum
    q.drawPath(line(54, -30, 76, -2), stroke(alpha(DESK.chalkLine, 0.25), 1));
    at(q, 104, -22, 1.4, 20, (z) => {
      z.drawPath(rect(-12, -1.4, 22, 2.8), fill(ink));
      z.drawPath(poly([10, -5, 18, -8, 18, 8, 10, 5]), fill(ink));
    }); // a trumpet
    q.drawPath(line(130, 0, 132, -40), stroke(ink, 2));
    q.drawPath(poly([132, -40, 152, -36, 132, -30]), fill(ink)); // a pennant
    at(q, 168, -20, 1.4, -24, (z) => {
      z.drawPath(rect(-14, -1.6, 24, 3.2), fill(ink));
      z.drawPath(builder().addOval({ x: 8, y: -7, width: 8, height: 14 }).build(), fill(ink));
    }); // a trombone's bell
    q.drawPath(rrect(190, -14, 24, 12, 2), fill(ink)); // a snare
    q.drawPath(rect(-2, -2, w / k + 4, 4), fill(ink));
  });
}
