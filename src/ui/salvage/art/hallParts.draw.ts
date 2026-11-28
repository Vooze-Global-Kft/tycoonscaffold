/**
 * The furnace halls' parts (stage 2, the works; ART-HALLPARTS, PLAN2 2.7, s2c-plan-world 1.2), drawn with the first yard's
 * pen (pen.ts), palette families and light (yard-style.md 4: flat fills in three tones, ink outlines, a bevel on metal, the
 * low west sun's shadow swept east; gradients only for heat and round bodies; never a blur):
 *
 * - drawFilter: each hall's bag-house filter beside its west wall: a galvanised housing on four legs, its hopper and rotary
 *   valve over a closed dust bin, the duct east into the hall, a caged ladder and the roof rail, the fan and a slim clean-air
 *   stack. Frame 1 ("shimmer", while the hall heats or pours) is a faint heat haze over the stack's mouth and the fan
 *   panel's lamp lit: NEVER smoke (nothing grey rises; what leaves a bag-house is filtered air).
 * - drawMoulds: the cast-iron ingot moulds on the hall's pour apron, two rows on a bed of DRY sand (no water near molten
 *   metal: yard-design 6). Frame 0 is the mould (its own colours); frames 1 and 2 are the INGOTS ONLY, baked near white
 *   (MOULD_TINT) so the world modulates them per instance by palette coolingColour and lays them over frame 0 at the same
 *   anchor: frame 1 "full" is the cold ingot (flat top, break notches, the stamp), frame 2 "shimmer" the cooling one (a
 *   domed liquid top with a bright core, no notches yet, a heat haze over the row). Cooling is therefore told by SHAPE and
 *   FRAME as well as by the tint (PLAN2 6.4: a second channel).
 * - drawCharge: the steel charging box at the hall's door, standing dry on skids (no puddle is part of it): empty, part,
 *   full, filled with the charged grade's own pieces (the rotary hall's aluminium wheels and end caps, the induction hall's
 *   brass taps and fittings, the copper hall's No.2 and cylinders).
 * - drawSlagSkip: the covered waste vessel by each hall (no fill: no state carries one): the rotary hall's lidded salt-slag
 *   skip, the induction hall's covered dross pan, the copper hall's cast slag pot with its lid.
 * - drawDrums: two sealed, labelled drums on a bunded spill pallet (the depollution bay); the label is a blank paper face
 *   whose box drumsLabel() returns (the caller's words: no words in a sprite).
 *
 * Every drawing is round its anchor, the footprint's centre on the ground (pen.VIEW), at true size: the manifest part
 * (manifest/worksHallParts.ts) bakes it at its k and the world draws it at 1/k. Pure Skia (no React).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, mix, shade } from './palette';
import { box, boxShadow, builder, cylinder, faceFill, fill, groundShadow, hash01, linear, oval, poly, proj, rect, rrect, segment, stroke, subQuad, type V3, type View3q } from './pen';
import { pieceHeap } from './pieces.draw';

const INK = YARD.ink;

/** The three halls of the works (the content's plates rotary, induction, copper). */
export type HallKind = 'rotary' | 'induction' | 'copper';
export const HALL_KINDS: readonly HallKind[] = ['rotary', 'induction', 'copper'];

/** An ink line under a coloured one (a rail, a stile, a handle: the crucible's lever is drawn so). */
function rail(c: SkCanvas, a: [number, number], b: [number, number], color: string, w = 1.6): void {
  c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, w + 1.4));
  c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(color, w));
}

/** A rising heat haze: n wavy strokes from (x, y) points upwards, `len` points long, in `color` at `alpha`. */
function haze(c: SkCanvas, x: number, y: number, n: number, len: number, spread: number, color: string, alpha: number, w = 1.1, seed = 0): void {
  for (let i = 0; i < n; i++) {
    const dx = n > 1 ? (i / (n - 1) - 0.5) * spread : 0;
    const ph = hash01(seed, i) > 0.5 ? 1 : -1;
    const s = len / 4;
    const b = builder().moveTo(x + dx, y);
    for (let k = 0; k < 4; k++) b.quadTo(x + dx + ph * (k % 2 ? -2.6 : 2.6), y - s * (k + 0.5), x + dx, y - s * (k + 1));
    c.drawPath(b.build(), stroke(color, w, alpha * (0.75 + 0.25 * hash01(seed, i, 3))));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The bag-house filter
// ---------------------------------------------------------------------------------------------------------------------

/** Each hall's filter footprint (metres; the content's `<hall>.filter` places) and its height. */
export const FILTER: Readonly<Record<HallKind, { w: number; d: number; h: number }>> = {
  rotary: { w: 3.5, d: 4, h: 6 },
  induction: { w: 3, d: 3, h: 5 },
  copper: { w: 4, d: 4, h: 6 },
};

/**
 * A pulse-jet bag-house filter: housing on legs over its hopper, the duct east to the hall's west wall (the hall stands
 * east of its filter, touching it), the stack at the housing's north-west corner. frame 0 still, 1 shimmer (the hall heats
 * or pours: a faint heat haze over the stack, the fan panel's lamp lit).
 */
export function drawFilter(c: SkCanvas, v: View3q, hall: HallKind, frame = 0): void {
  const { w, d, h } = FILTER[hall];
  const small = hall === 'induction';
  const hx = w - 1.0;
  const hy = Math.min(d - 1.0, hx + 0.2);
  const cx = -w / 2 + 0.15 + hx / 2;
  const cy = -d / 2 + 0.35 + hy / 2;
  const zl = small ? 1.2 : 1.5; // the hopper's foot
  const z0 = zl + (small ? 0.6 : 0.8); // the housing's bottom
  const z1 = h - 1.6; // the housing's roof
  const running = frame === 1;
  const steel = YARD.steelDark;
  // the shadows: the housing on its legs (swept east by the low sun), the stack's
  boxShadow(c, v, hx, hy, cx, cy, z1);
  groundShadow(c, v, 0.25, 0.25, cx - hx / 2 + 0.45, cy - hy / 2 + 0.45, h);
  const lx = hx / 2 - 0.1;
  const ly = hy / 2 - 0.1;
  // the back legs
  for (const sx of [-1, 1]) box(c, v, { len: 0.14, wid: 0.14, h: z0, ox: cx + sx * lx, oy: cy - ly, color: steel, line: 1 });
  // the dust bin under the hopper (closed: the dust is a grade, collected in bags at the stillages), its downpipe and valve
  cylinder(c, v, { r: 0.3, h: 0.62, ox: cx, oy: cy + 0.15, color: YARD.machine, line: LINE_W });
  {
    const [bx, by] = proj(v, cx, cy + 0.15, 0.62);
    c.drawPath(rrect(bx - 5, by - 2, 10, 3, 1.5), fill(YARD.hivis));
    c.drawPath(rrect(bx - 5, by - 2, 10, 3, 1.5), stroke(INK, 0.8));
  }
  box(c, v, { len: 0.16, wid: 0.16, h: zl - 0.3 - 0.62, ox: cx, oy: cy + 0.1, z: 0.62, color: YARD.galvanised, line: 1 });
  box(c, v, { len: 0.34, wid: 0.3, h: 0.28, ox: cx, oy: cy + 0.05, z: zl - 0.3, color: YARD.machine, line: 1, bevel: true });
  // the hopper: its south face, from the housing's front edge down to the valve
  const hopper: V3[] = [
    [cx - 0.2, cy + 0.2, zl],
    [cx + 0.2, cy + 0.2, zl],
    [cx + hx / 2, cy + hy / 2, z0],
    [cx - hx / 2, cy + hy / 2, z0],
  ];
  faceFill(c, v, hopper, shade(YARD.galvanised, -0.16), LINE_W);
  for (const k of [0.33, 0.66]) {
    const a = proj(v, cx - 0.2 + 0.4 * k, cy + 0.2, zl);
    const b = proj(v, cx - hx / 2 + hx * k, cy + hy / 2, z0);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.3), 0.9));
  }
  // the front legs and their cross brace
  for (const sx of [-1, 1]) box(c, v, { len: 0.14, wid: 0.14, h: z0, ox: cx + sx * lx, oy: cy + ly, color: steel, line: 1 });
  {
    const a = proj(v, cx - lx, cy + ly + 0.07, 0.25);
    const b = proj(v, cx + lx, cy + ly + 0.07, zl - 0.1);
    const a2 = proj(v, cx - lx, cy + ly + 0.07, zl - 0.1);
    const b2 = proj(v, cx + lx, cy + ly + 0.07, 0.25);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(steel, 0.2), 1.3));
    c.drawPath(segment(a2[0], a2[1], b2[0], b2[1]), stroke(shade(steel, 0.2), 1.3));
  }
  // the fan's control panel on the west front leg: its lamp lit while the fan runs (a second channel beside the haze)
  box(c, v, { len: 0.3, wid: 0.12, h: 0.42, ox: cx - lx + 0.26, oy: cy + ly + 0.1, z: 0.95, color: YARD.machine, line: 1, bevel: true });
  {
    const [px, py] = proj(v, cx - lx + 0.26, cy + ly + 0.16, 1.22);
    c.drawCircle(px, py, 2.1, fill(INK));
    c.drawCircle(px, py, 1.5, fill(running ? YARD.led : YARD.ledOff));
  }
  // the duct: from the housing's east face to the hall's west wall (the footprint's east edge), drawn before the housing
  const dx0 = cx + hx / 2 - 0.1;
  const dx1 = w / 2;
  const dz = z1 - 1.05;
  box(c, v, {
    len: dx1 - dx0,
    wid: 0.56,
    h: 0.56,
    ox: (dx0 + dx1) / 2,
    oy: cy - 0.25,
    z: dz,
    color: YARD.galvanised,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // flanged joints
      for (const s of [0.35, 0.8]) faceFill(c, v, subQuad(q, s - 0.03, s + 0.03, 0, 1), shade(YARD.galvanised, -0.22));
    },
  });
  // the duct's support post down to the ground
  box(c, v, { len: 0.1, wid: 0.1, h: dz, ox: dx1 - 0.2, oy: cy - 0.25, color: steel, line: 1 });
  // the housing: seamed galvanised panels, an inspection door on the south face, the pulse-jet headers on the roof
  box(c, v, {
    len: hx,
    wid: hy,
    h: z1 - z0,
    ox: cx,
    oy: cy,
    z: z0,
    color: YARD.galvanised,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      const seams = small ? 3 : 4;
      for (let i = 1; i < seams; i++) {
        const a = proj(v, ...subQuad(q, i / seams, i / seams, 0.02, 0.02)[0]);
        const b = proj(v, ...subQuad(q, i / seams, i / seams, 0.98, 0.98)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.2), 1));
      }
      // a light streak down the west panel (the sun from the west)
      faceFill(c, v, subQuad(q, 0.04, 0.1, 0.06, 0.94), YARD.galvanisedLight, 0, 0.8);
      // the inspection door, its handle
      const door = subQuad(q, 0.14, 0.4, 0.18, 0.78);
      faceFill(c, v, door, shade(YARD.galvanised, -0.1), 1);
      const [hx1, hy1] = proj(v, ...subQuad(q, 0.36, 0.36, 0.48, 0.48)[0]);
      c.drawPath(rrect(hx1 - 1.5, hy1 - 3.5, 3, 7, 1.2), fill(YARD.hivis));
      c.drawPath(rrect(hx1 - 1.5, hy1 - 3.5, 3, 7, 1.2), stroke(INK, 0.8));
    },
    onTop: (q) => {
      for (const t of [0.25, 0.5, 0.75]) {
        const a = proj(v, ...subQuad(q, 0.08, 0.08, t, t)[0]);
        const b = proj(v, ...subQuad(q, 0.92, 0.92, t, t)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.steel, 1.6));
      }
    },
  });
  // the fan on the roof (blue machine enamel, a louvred face) and the stack at the north-west corner
  box(c, v, {
    len: small ? 0.5 : 0.64,
    wid: 0.5,
    h: 0.46,
    ox: cx + hx * 0.18,
    oy: cy - hy * 0.18,
    z: z1,
    color: YARD.machine,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      for (const t of [0.3, 0.55, 0.8]) {
        const a = proj(v, ...subQuad(q, 0.15, 0.15, t, t)[0]);
        const b = proj(v, ...subQuad(q, 0.85, 0.85, t, t)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.machineDark, 1));
      }
    },
  });
  const sx = cx - hx / 2 + 0.45;
  const sy = cy - hy / 2 + 0.45;
  const sr = small ? 0.17 : 0.2;
  const [mx, my] = cylinder(c, v, { r: sr, h: h - 0.15 - z1, ox: sx, oy: sy, z: z1, color: YARD.galvanised, line: LINE_W });
  {
    // a stiffening band near the top, the dark mouth
    const [, by] = proj(v, sx, sy, h - 0.6);
    c.drawPath(rect(mx - sr * v.ppm, by - 1.5, sr * v.ppm * 2, 3), fill(shade(YARD.galvanised, -0.25)));
    c.drawPath(rect(mx - sr * v.ppm, by - 1.5, sr * v.ppm * 2, 3), stroke(INK, 0.8));
    c.drawPath(oval(mx, my, sr * v.ppm * 0.7, sr * v.ppm * v.tilt * 0.7), fill(shade(YARD.steelDark, -0.4)));
  }
  // the roof rail along the front edge, posts and a top rail (hi-vis)
  {
    const yR = cy + hy / 2 - 0.06;
    const n = small ? 3 : 4;
    for (let i = 0; i <= n; i++) {
      const x = cx - hx / 2 + 0.06 + ((hx - 0.12) * i) / n;
      rail(c, proj(v, x, yR, z1), proj(v, x, yR, z1 + 0.9), YARD.hivis, 1.1);
    }
    rail(c, proj(v, cx - hx / 2 + 0.06, yR, z1 + 0.9), proj(v, cx + hx / 2 - 0.06, yR, z1 + 0.9), YARD.hivis, 1.3);
    rail(c, proj(v, cx - hx / 2 + 0.06, yR, z1 + 0.45), proj(v, cx + hx / 2 - 0.06, yR, z1 + 0.45), YARD.hivisDark, 0.9);
  }
  // the caged ladder up the south face's east side, from the ground to the roof rail
  {
    const x = cx + hx / 2 - 0.4;
    const y = cy + hy / 2 + 0.12;
    const top = z1 + 0.9;
    for (let z = 0.3; z < top - 0.05; z += 0.3) {
      const a = proj(v, x - 0.18, y, z);
      const b = proj(v, x + 0.18, y, z);
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 1));
    }
    rail(c, proj(v, x - 0.2, y, 0), proj(v, x - 0.2, y, top), YARD.hivis, 1.1);
    rail(c, proj(v, x + 0.2, y, 0), proj(v, x + 0.2, y, top), YARD.hivis, 1.1);
    for (let z = 2.3; z < top; z += 0.7) {
      const [ox1, oy1] = proj(v, x, y + 0.2, z);
      c.drawPath(builder().addArc({ x: ox1 - 0.32 * v.ppm, y: oy1 - 0.3 * v.ppm * v.tilt, width: 0.64 * v.ppm, height: 0.6 * v.ppm * v.tilt }, 0, 180).build(), stroke(YARD.hivisDark, 1.2));
    }
  }
  if (running) {
    // the heat shimmer over the stack's mouth: a few thin warm wavering lines, faint; never a cloud, never grey
    haze(c, mx, my - 3, 3, 30, sr * v.ppm * 1.1, YARD.glowHot, 0.5, 1.1, hall.length);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The ingot moulds on the pour apron
// ---------------------------------------------------------------------------------------------------------------------

/** Each hall's mould row: footprint w x d metres, `n` cavities a row in two rows, each cavity len x wid metres. */
export const MOULDS: Readonly<Record<HallKind, { w: number; d: number; n: number; wid: number }>> = {
  // the rotary hall's aluminium sows: fewer, heavier bars
  rotary: { w: 4, d: 1, n: 7, wid: 0.26 },
  // the induction hall's brass and bronze bars (the first yard's notched bar, larger)
  induction: { w: 3, d: 1, n: 6, wid: 0.2 },
  // the copper hall's fire-refined copper cakes: broad and few
  copper: { w: 3, d: 1, n: 5, wid: 0.28 },
};

/** The near-white the ingot frames are baked in (the manifest's tint): the world modulates it by coolingColour. */
export const MOULD_TINT = '#F4F4F0';
/** The ingots' neutral tones under the tint: top, front, west, east, notch. */
const N = { top: MOULD_TINT, front: '#CBCBC6', west: '#DCDCD7', east: '#B2B2AD', notch: '#8A8A85' } as const;

const ROWS = [-0.24, 0.24] as const;
const MOULD_TOP = 0.14;

/** The cavities of a hall's moulds: centre (x, y) and the bar's length and width, metres. */
export function mouldCavities(hall: HallKind): { x: number; y: number; len: number; wid: number }[] {
  const { w, n, wid } = MOULDS[hall];
  const pitch = (w - 0.3) / n;
  const out: { x: number; y: number; len: number; wid: number }[] = [];
  for (const y of ROWS) for (let i = 0; i < n; i++) out.push({ x: -w / 2 + 0.15 + pitch * (i + 0.5), y, len: pitch - 0.09, wid });
  return out;
}

/**
 * frame 0 'empty': the sand bed and the two cast-iron mould plates with their dark cavities (drawn in its own colours);
 * frame 1 'full': the cold ingots alone (near white, flat-topped, notched, stamped); frame 2 'shimmer': the cooling ingots
 * alone (near white, a domed liquid top with a bright core, no notches, a heat haze over the rows). Frames 1 and 2 lie
 * over frame 0 at the same anchor, modulated per instance by coolingColour.
 */
export function drawMoulds(c: SkCanvas, v: View3q, hall: HallKind, frame = 0): void {
  const { w, d } = MOULDS[hall];
  const cav = mouldCavities(hall);
  if (frame === 0) {
    // the bed of dry sand (moulds stand on dry sand: no water near molten metal)
    const bed = builder()
      .addRRect({ rect: { x: (-w / 2 - 0.2) * v.ppm, y: (-d / 2 - 0.05) * v.ppm * v.tilt, width: (w + 0.4) * v.ppm, height: (d + 0.1) * v.ppm * v.tilt }, rx: 8, ry: 6 })
      .build();
    c.drawPath(bed, fill(YARD.sand));
    c.drawPath(bed, stroke(shade(YARD.sand, -0.25), 0.9));
    for (let i = 0; i < 40; i++) c.drawCircle((hash01(i, 3, hall.length) - 0.5) * (w + 0.2) * v.ppm, (hash01(i, 4, hall.length) - 0.5) * d * v.ppm * v.tilt, 0.7, fill(shade(YARD.sand, -0.2)));
    for (const y of ROWS) {
      const wid = MOULDS[hall].wid + 0.14;
      boxShadow(c, v, w - 0.14, wid, 0, y, MOULD_TOP);
      box(c, v, {
        len: w - 0.2,
        wid,
        h: MOULD_TOP,
        oy: y,
        color: YARD.castIron,
        bevel: true,
        onTop: () => {
          for (const k of cav.filter((q) => q.y === y)) {
            const L = k.len / 2;
            const W = k.wid / 2;
            const z = MOULD_TOP;
            faceFill(c, v, [[k.x - L, k.y - W, z], [k.x + L, k.y - W, z], [k.x + L, k.y + W, z], [k.x - L, k.y + W, z]], shade(YARD.castIron, -0.45), 0.9);
            // the cavity's sloped south wall catching light
            faceFill(c, v, [[k.x - L, k.y + W, z], [k.x + L, k.y + W, z], [k.x + L - 0.03, k.y + W - 0.04, z - 0.1], [k.x - L + 0.03, k.y + W - 0.04, z - 0.1]], shade(YARD.castIron, -0.2));
          }
        },
      });
      // the plates' lifting lugs at each end
      for (const sx of [-1, 1]) {
        const [lx, ly] = proj(v, sx * (w / 2 - 0.06), y + wid / 2, MOULD_TOP * 0.5);
        c.drawPath(oval(lx, ly, 2.4, 2.4), stroke(INK, 2.2));
        c.drawPath(oval(lx, ly, 2.4, 2.4), stroke(YARD.steel, 1));
      }
    }
    return;
  }
  const cooling = frame === 2;
  for (const k of cav) {
    const L = k.len / 2 - 0.02;
    const W = k.wid / 2 - 0.02;
    const z0 = MOULD_TOP - 0.06;
    if (cooling) {
      // still liquid on top: the metal stands proud in a rounded meniscus, a bright core, no notches yet
      const [x0, y0] = proj(v, k.x, k.y, MOULD_TOP + 0.02);
      const rx = L * v.ppm;
      const ry = W * v.ppm * v.tilt;
      const front = builder()
        .moveTo(x0 - rx, y0)
        .lineTo(x0 - rx, y0 + 2.2)
        .cubicTo(x0 - rx, y0 + ry * 1.6 + 2.2, x0 + rx, y0 + ry * 1.6 + 2.2, x0 + rx, y0 + 2.2)
        .lineTo(x0 + rx, y0)
        .close()
        .build();
      c.drawPath(front, fill(N.front));
      c.drawPath(front, stroke(INK, 1));
      const top = builder().addRRect({ rect: { x: x0 - rx, y: y0 - ry - 1.6, width: rx * 2, height: ry * 2 + 1.6 }, rx: Math.min(rx, ry + 1), ry: ry + 1 }).build();
      c.drawPath(top, fill(N.top));
      c.drawPath(top, stroke(INK, 1));
      c.drawPath(oval(x0, y0 - 0.8, rx * 0.62, ry * 0.55), fill('#FFFFFF'));
      continue;
    }
    // cold: the notched bar (drawIngot's trapezoid), flat-topped, its break notches and the yard's stamp
    const inset = 0.04;
    const H = 0.1;
    const P = (x: number, y: number, z: number): V3 => [k.x + x, k.y + y, z0 + z];
    const front: V3[] = [P(L, W, 0), P(-L, W, 0), P(-L + inset, W - inset, H), P(L - inset, W - inset, H)];
    const west: V3[] = [P(-L, W, 0), P(-L, -W, 0), P(-L + inset, -W + inset, H), P(-L + inset, W - inset, H)];
    const east: V3[] = [P(L, -W, 0), P(L, W, 0), P(L - inset, W - inset, H), P(L - inset, -W + inset, H)];
    const top: V3[] = [P(-L + inset, -W + inset, H), P(L - inset, -W + inset, H), P(L - inset, W - inset, H), P(-L + inset, W - inset, H)];
    faceFill(c, v, west, N.west, LINE_W);
    faceFill(c, v, east, N.east, LINE_W);
    faceFill(c, v, front, N.front, LINE_W);
    faceFill(c, v, top, N.top, LINE_W);
    for (const f of [-0.33, 0.33]) {
      const a = proj(v, ...P(L * f, -W + inset + 0.005, H));
      const b = proj(v, ...P(L * f, W - inset - 0.005, H));
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(N.notch, 1.4));
      const [nx, ny] = proj(v, ...P(L * f, W - inset, H));
      c.drawPath(poly([nx - 2.2, ny, nx + 2.2, ny, nx, ny + 3]), fill(N.notch));
    }
    const [sx, sy] = proj(v, ...P(0, 0, H));
    c.drawPath(rrect(sx - 2.6, sy - 1.4, 5.2, 2.8, 0.8), stroke(N.notch, 0.8));
  }
  if (cooling)
    for (const y of ROWS) {
      // the heat haze over each row, thin and faint
      const [hx, hy] = proj(v, 0, y, MOULD_TOP + 0.1);
      haze(c, hx, hy - 2, Math.round(w * 2), 16, (w - 0.6) * v.ppm, '#FFFFFF', 0.6, 1, y > 0 ? 7 : 3);
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// The charge box at the hall's door
// ---------------------------------------------------------------------------------------------------------------------

/** The charging box (metres): footprint len x wid, its walls h high on skids. */
export const CHARGE = { len: 1.6, wid: 1.2, h: 0.72 } as const;

/** The pieces each hall is charged with (pieceGlyph kinds of the grades its recipes take: alw/alcast, brs, no2/cyl). */
export const CHARGE_PIECES: Readonly<Record<HallKind, readonly string[]>> = {
  rotary: ['wheel', 'endcap', 'alu', 'wheel'],
  induction: ['taps', 'fittings', 'brass'],
  copper: ['no2', 'shell', 'windings', 'no2'],
};

/** frame 0 empty, 1 part, 2 full: the box standing dry on its skids, filled with the hall's own pieces. */
export function drawCharge(c: SkCanvas, v: View3q, hall: HallKind, frame = 0): void {
  const L = CHARGE.len / 2;
  const W = CHARGE.wid / 2;
  const z0 = 0.1;
  const z1 = z0 + CHARGE.h - 0.1;
  const t = 0.05;
  const col = YARD.machine;
  boxShadow(c, v, CHARGE.len, CHARGE.wid, 0, 0, CHARGE.h);
  // the two skids
  for (const y of [-W + 0.14, W - 0.14]) box(c, v, { len: CHARGE.len - 0.1, wid: 0.12, h: z0, oy: y, color: YARD.steelDark, line: 1 });
  // inside: the north wall's inner face, the floor
  faceFill(c, v, [[-L + t, -W + t, z0], [L - t, -W + t, z0], [L - t, -W + t, z1], [-L + t, -W + t, z1]], shade(col, -0.12), 1);
  // the west half of the inner wall in the low sun, the east half in the box's own shade
  faceFill(c, v, [[-L + t, -W + t, z0], [-0.1, -W + t, z0], [-0.1, -W + t, z1], [-L + t, -W + t, z1]], shade(col, 0.08), 0, 0.7);
  faceFill(c, v, [[-L + t, -W + t, z0 + 0.02], [L - t, -W + t, z0 + 0.02], [L - t, W - t, z0 + 0.02], [-L + t, W - t, z0 + 0.02]], shade(col, -0.3), 1);
  // scuffs on the inner wall (metal has been tipped in)
  for (let i = 0; i < 4; i++) {
    const [px, py] = proj(v, -L + 0.2 + hash01(i, 9) * (CHARGE.len - 0.4), -W + t, z0 + 0.15 + hash01(i, 8) * 0.35);
    c.drawPath(segment(px, py, px + 5, py - 1), stroke(shade(col, -0.1), 0.9));
  }
  if (frame > 0) {
    // the charge: a mound of the hall's own pieces, low (part) or heaped over the rim (full)
    const full = frame === 2;
    const [hx, hy] = proj(v, 0, full ? 0.02 : -0.12, z0 + (full ? 0.34 : 0.1));
    c.save();
    c.translate(hx, hy);
    pieceHeap(c, [...CHARGE_PIECES[hall]], (CHARGE.len - 0.2) * v.ppm, (full ? 0.56 : 0.4) * v.ppm, full ? 15 : 10, 3 + hall.length, 15);
    c.restore();
  }
  // the rims of the side and back walls (hi-vis), then the front wall with its fork pockets and its rim
  const rim = (q: V3[]) => {
    faceFill(c, v, q, YARD.hivis);
    faceFill(c, v, q, YARD.hivis, 0.9);
  };
  rim([[-L, -W, z1], [L, -W, z1], [L, -W + t, z1], [-L, -W + t, z1]]);
  rim([[-L, -W, z1], [-L + t, -W, z1], [-L + t, W, z1], [-L, W, z1]]);
  rim([[L - t, -W, z1], [L, -W, z1], [L, W, z1], [L - t, W, z1]]);
  const front: V3[] = [[-L, W, z0], [L, W, z0], [L, W, z1], [-L, W, z1]];
  faceFill(c, v, front, col);
  // a stiffening rib and a lighter west end (the sun from the west)
  faceFill(c, v, subQuad(front, 0.02, 0.12, 0.08, 0.86), shade(col, 0.18), 0, 0.9);
  faceFill(c, v, subQuad(front, 0, 1, 0.62, 0.7), shade(col, -0.15));
  for (const s of [0.22, 0.62]) faceFill(c, v, subQuad(front, s, s + 0.16, 0.08, 0.36), INK);
  faceFill(c, v, front, col, LINE_W, 0);
  rim([[-L, W - t, z1], [L, W - t, z1], [L, W, z1], [-L, W, z1]]);
  if (frame === 2) {
    // the top pieces lie over the front rim
    const [hx, hy] = proj(v, 0, W - 0.1, z1);
    c.save();
    c.translate(hx, hy);
    pieceHeap(c, [...CHARGE_PIECES[hall]].reverse(), (CHARGE.len - 0.7) * v.ppm, 0.16 * v.ppm, 4, 11 + hall.length, 14);
    c.restore();
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The slag skips by each hall and the sealed drums
// ---------------------------------------------------------------------------------------------------------------------

/** The covered waste vessel by each hall (metres): the rotary's salt-slag skip, the induction's dross pan, the copper's slag pot. */
export const SLAG: Readonly<Record<HallKind, { w: number; d: number; h: number }>> = {
  rotary: { w: 1.6, d: 1, h: 1 },
  induction: { w: 1.2, d: 0.8, h: 0.6 },
  copper: { w: 1.2, d: 1.2, h: 1 },
};

export function drawSlagSkip(c: SkCanvas, v: View3q, hall: HallKind): void {
  const { w, d, h } = SLAG[hall];
  if (hall === 'copper') {
    slagPot(c, v, w, d, h);
    return;
  }
  const pan = hall === 'induction';
  const zt = pan ? h - 0.16 : h - 0.12; // the rim under the lid
  const col = pan ? YARD.steelDark : YARD.skip;
  const bl = w / 2 - (pan ? 0.08 : 0.16);
  const bw = d / 2 - (pan ? 0.06 : 0.1);
  boxShadow(c, v, w, d, 0, 0, h);
  // skids
  for (const y of [-d / 2 + 0.15, d / 2 - 0.15]) box(c, v, { len: w - 0.2, wid: 0.1, h: 0.08, oy: y, color: YARD.steelDark, line: 1 });
  // the tapered body: its south face, wider at the top
  const front: V3[] = [[-bl, bw, 0.08], [bl, bw, 0.08], [w / 2, d / 2, zt], [-w / 2, d / 2, zt]];
  faceFill(c, v, front, col, LINE_W);
  faceFill(c, v, subQuad(front, 0.03, 0.12, 0.1, 0.9), shade(col, 0.2), 0, 0.85);
  if (!pan) {
    // the rotary's skip: two stiffening ribs, the chain lugs at each end
    for (const s of [0.33, 0.67]) faceFill(c, v, subQuad(front, s - 0.025, s + 0.025, 0.04, 0.96), shade(col, -0.25));
    for (const sx of [-1, 1]) {
      const [lx, ly] = proj(v, sx * (w / 2 - 0.02), d / 2 - 0.05, zt - 0.22);
      c.drawPath(oval(lx, ly, 3, 3), stroke(INK, 2.6));
      c.drawPath(oval(lx, ly, 3, 3), stroke(YARD.steel, 1.2));
    }
  } else {
    // the pan's two carrying handles
    for (const sx of [-1, 1]) {
      const [lx, ly] = proj(v, sx * (w / 2 + 0.02), d / 2 - 0.1, zt - 0.06);
      c.drawPath(builder().addArc({ x: lx - 4, y: ly - 3, width: 8, height: 6 }, sx > 0 ? -90 : 90, 180).build(), stroke(INK, 2.4));
    }
  }
  // the lid: a galvanised cover over the whole mouth, its hinge line at the back and a hi-vis grip at the front
  box(c, v, { len: w + 0.04, wid: d + 0.04, h: 0.07, z: zt, color: YARD.galvanised, bevel: true, onTop: (q) => {
    const a = proj(v, ...subQuad(q, 0.05, 0.05, 0.12, 0.12)[0]);
    const b = proj(v, ...subQuad(q, 0.95, 0.95, 0.12, 0.12)[0]);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.3), 1.2));
    if (!pan) for (const s of [0.25, 0.5, 0.75]) {
      const p0 = proj(v, ...subQuad(q, s, s, 0.2, 0.2)[0]);
      const p1 = proj(v, ...subQuad(q, s, s, 0.92, 0.92)[0]);
      c.drawPath(segment(p0[0], p0[1], p1[0], p1[1]), stroke(shade(YARD.galvanised, -0.15), 0.9));
    }
  } });
  const [gx, gy] = proj(v, 0, d / 2 + 0.02, zt + 0.02);
  c.drawPath(rrect(gx - 6, gy - 1.5, 12, 3.5, 1.5), fill(YARD.hivis));
  c.drawPath(rrect(gx - 6, gy - 1.5, 12, 3.5, 1.5), stroke(INK, 0.9));
}

/** The copper hall's slag pot: a cast steel bowl wider at the top on a low stand, its trunnion lugs, a lid. */
function slagPot(c: SkCanvas, v: View3q, w: number, d: number, h: number): void {
  const P = v.ppm;
  groundShadow(c, v, w * 0.48, d * 0.45, 0, 0, h);
  box(c, v, { len: w - 0.1, wid: d - 0.1, h: 0.14, color: YARD.steelDark, line: 1 });
  const zb = 0.14;
  const zt = h - 0.08;
  const rb = 0.34;
  const rt = 0.52;
  const [cx, yb] = proj(v, 0, 0, zb);
  const [, yt] = proj(v, 0, 0, zt);
  const body = builder()
    .moveTo(cx - rt * P, yt)
    .lineTo(cx - rb * P, yb)
    .addArc({ x: cx - rb * P, y: yb - rb * P * v.tilt, width: rb * 2 * P, height: rb * 2 * P * v.tilt }, 180, -180)
    .lineTo(cx + rt * P, yt)
    .close()
    .build();
  c.drawPath(body, linear(cx - rt * P, 0, cx + rt * P, 0, [shade(YARD.castIron, 0.25), YARD.castIron, shade(YARD.castIron, -0.3)], [0, 0.45, 1]));
  // a cast band and the trunnion lugs
  c.drawPath(segment(cx - (rb + (rt - rb) * 0.7) * P, yb + (yt - yb) * 0.7, cx + (rb + (rt - rb) * 0.7) * P, yb + (yt - yb) * 0.7), stroke(shade(YARD.castIron, -0.35), 2));
  c.drawPath(body, stroke(INK, LINE_W));
  for (const sx of [-1, 1]) {
    const lx = cx + sx * (rt * P - 1);
    const ly = yb + (yt - yb) * 0.82;
    c.drawPath(rrect(lx - 4, ly - 3, 8, 6, 1.5), fill(YARD.steel));
    c.drawPath(rrect(lx - 4, ly - 3, 8, 6, 1.5), stroke(INK, 0.9));
  }
  // the lid, its lifting eye
  const lid = oval(cx, yt - 1.5, (rt + 0.03) * P, (rt + 0.03) * P * v.tilt);
  c.drawPath(lid, fill(YARD.galvanised));
  c.drawPath(oval(cx - 3, yt - 3, rt * P * 0.6, rt * P * v.tilt * 0.5), fill(YARD.galvanisedLight, 0.8));
  c.drawPath(lid, stroke(INK, LINE_W));
  c.drawPath(builder().addArc({ x: cx - 4, y: yt - 9, width: 8, height: 8 }, 180, 180).build(), stroke(INK, 2.6));
  c.drawPath(builder().addArc({ x: cx - 4, y: yt - 9, width: 8, height: 8 }, 180, 180).build(), stroke(YARD.hivis, 1.3));
}

/** The drums' spill pallet and drums (metres). */
const DRUM_R = 0.26;
const DRUM_H = 0.72;
const DRUM_X = [-0.29, 0.29] as const;
const TRAY_H = 0.14;

/** The label face on the west drum, in points round the anchor at true size: [x, y, w, h] (the caller's words). */
export function drumsLabel(v: View3q): [number, number, number, number] {
  const [x, y] = proj(v, DRUM_X[0], DRUM_R * 0.6, TRAY_H + DRUM_H * 0.52);
  const w = 0.3 * v.ppm;
  const h = 0.2 * v.ppm * v.lift;
  return [x - w / 2, y - h / 2, w, h];
}

/** Two sealed drums on a bunded spill pallet (hi-vis), their rolling hoops and bungs, a blank label on each. */
export function drawDrums(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 1.2, 0.6, 0, 0, 0.86);
  box(c, v, {
    len: 1.2,
    wid: 0.62,
    h: TRAY_H,
    color: YARD.hivis,
    bevel: true,
    onTop: (q) => {
      // the grating
      for (let i = 1; i < 8; i++) {
        const a = proj(v, ...subQuad(q, i / 8, i / 8, 0.05, 0.05)[0]);
        const b = proj(v, ...subQuad(q, i / 8, i / 8, 0.95, 0.95)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.hivisDark, 0.8));
      }
    },
  });
  const tones = [YARD.machine, mix(YARD.machine, YARD.containerSage, 0.6)];
  DRUM_X.forEach((x, i) => {
    const col = tones[i];
    const [tx, ty] = cylinder(c, v, { r: DRUM_R, h: DRUM_H, ox: x, oy: 0, z: TRAY_H, color: col, line: LINE_W });
    // two rolling hoops
    for (const k of [0.3, 0.7]) {
      const [, hy] = proj(v, x, 0, TRAY_H + DRUM_H * k);
      c.drawPath(builder().addArc({ x: tx - DRUM_R * v.ppm, y: hy - DRUM_R * v.ppm * v.tilt, width: DRUM_R * 2 * v.ppm, height: DRUM_R * 2 * v.ppm * v.tilt }, 0, 180).build(), stroke(shade(col, -0.35), 1.3));
    }
    // the closed bungs on the lid
    c.drawPath(oval(tx - 5, ty - 1, 2.2, 1.4), fill(YARD.steelDark));
    c.drawPath(oval(tx + 4, ty + 1, 1.6, 1), fill(YARD.steelDark));
    // the blank label (paper with a ruled head band; words are the caller's)
    const [lx, ly] = proj(v, x, DRUM_R * 0.6, TRAY_H + DRUM_H * 0.52);
    const lw = (i === 0 ? 0.3 : 0.24) * v.ppm;
    const lh = (i === 0 ? 0.2 : 0.16) * v.ppm * v.lift;
    c.drawPath(rect(lx - lw / 2, ly - lh / 2, lw, lh), fill(YARD.paper));
    c.drawPath(rect(lx - lw / 2, ly - lh / 2, lw, lh * 0.26), fill(YARD.hivis));
    c.drawPath(rect(lx - lw / 2, ly - lh / 2, lw, lh), stroke(INK, 0.8));
  });
}
