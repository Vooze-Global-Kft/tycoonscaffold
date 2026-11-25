/**
 * Machines, vehicles and structures of the first yard (yard-style.md "Proportions"): machines at true
 * size against the 1.65 m worker; vehicles at about two thirds of true length and four fifths of true
 * height so a truck fits a phone's view with room round it. Machines are painted machine blue-grey
 * with yellow guards and hazard stripes; heat is the only orange.
 */
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, YARD, coolingColour, mix, shade } from './palette';
import { sevenSeg, stencil } from './letters';
import {
  box,
  boxShadow,
  builder,
  discPath,
  faceFill,
  facing,
  fill,
  freckles,
  groundShadow,
  hash01,
  hazard,
  linear,
  oval,
  poly,
  proj,
  radial,
  rect,
  rgba,
  rrect,
  segment,
  stroke,
  subQuad,
  type V3,
  type View3q,
} from './pen';
import { drawBrightCopper, drawIngot } from './scrap.draw';
import { drawHookTruck } from './vehicles.draw';
import { pieceGlyph, pieceHeap } from './pieces.draw';
import { SHADOW_ALPHA } from './palette';

const INK = YARD.ink;

// ---------------------------------------------------------------------------
// The cable stripper
// ---------------------------------------------------------------------------

/** A bench cable stripper on its stand: feed guide (west), rollers, bare copper out east into a tub, PVC strip into a bin. */
export function drawStripper(c: SkCanvas, v: View3q, o: { running?: boolean; tubFull?: boolean } = {}): void {
  // Drawn 1.3 times its bench size: a hand machine must read at a glance beside the worker.
  c.save();
  c.scale(1.3, 1.3);
  stripperBody(c, v, o);
  c.restore();
}

function stripperBody(c: SkCanvas, v: View3q, o: { running?: boolean; tubFull?: boolean }): void {
  boxShadow(c, v, 1.9, 0.9, 0.1, 0);
  // the PVC bin behind (north-east)
  box(c, v, { len: 0.5, wid: 0.4, h: 0.45, ox: 0.55, oy: -0.18, color: YARD.pvc });
  const [px, py] = proj(v, 0.55, -0.18, 0.45);
  for (let i = 0; i < 4; i++) c.drawPath(builder().moveTo(px - 8 + i * 5, py - 1).quadTo(px - 6 + i * 5, py - 7, px - 3 + i * 4, py - 2).build(), stroke(YARD.pvcGrey, 1.6));
  // stand legs and the bed
  for (const [x, y] of [[-0.42, -0.2], [0.18, -0.2], [-0.42, 0.2], [0.18, 0.2]]) box(c, v, { len: 0.06, wid: 0.06, h: 0.72, ox: x, oy: y, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.8, wid: 0.5, h: 0.06, ox: -0.12, z: 0.72, color: YARD.machineDark });
  // the machine body with its yellow guard
  box(c, v, {
    len: 0.62,
    wid: 0.42,
    h: 0.36,
    ox: -0.1,
    z: 0.78,
    color: YARD.machine,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      const p = subQuad(q, 0.08, 0.92, 0.14, 0.34);
      const pts = p.map((pt) => proj(v, ...pt));
      hazard(c, poly(pts.flat()), 3.2, 0.9);
      faceFill(c, v, subQuad(q, 0.62, 0.86, 0.48, 0.86), YARD.hivis, 0.9);
    },
  });
  // the roller housing on top: a half cylinder
  const [rx, ry] = proj(v, -0.1, 0, 1.14);
  c.drawPath(builder().addArc({ x: rx - 11, y: ry - 7, width: 22, height: 14 }, 180, 180).close().build(), fill(YARD.machineLight));
  c.drawPath(builder().addArc({ x: rx - 11, y: ry - 7, width: 22, height: 14 }, 180, 180).close().build(), stroke(INK, LINE_W));
  // the stop button: yellow with an ink ring (no red in the palette)
  const [bx, by] = proj(v, 0.12, 0.21, 1.0);
  c.drawCircle(bx, by, 3, fill(INK));
  c.drawCircle(bx, by, 2, fill(YARD.hivis));
  // the feed guide (west) with cable going in
  const [fx, fy] = proj(v, -0.48, 0.05, 0.98);
  c.drawPath(oval(fx, fy, 4, 5), fill(YARD.hivis));
  c.drawPath(oval(fx, fy, 4, 5), stroke(INK, 1));
  const [cx0, cy0] = proj(v, -0.95, 0.25, 0.05);
  const cable = builder().moveTo(cx0, cy0).cubicTo(cx0 + 8, cy0 - 20, fx - 14, fy, fx, fy).build();
  c.drawPath(cable, stroke(INK, 5.6));
  c.drawPath(cable, stroke(YARD.pvcGrey, 3.6));
  // the copper chute (east) into a galvanised tub with bright copper in it
  box(c, v, { len: 0.42, wid: 0.42, h: 0.38, ox: 0.5, oy: 0.18, color: YARD.galvanised, bevel: true, onTop: (q) => faceFill(c, v, subQuad(q, 0.1, 0.9, 0.1, 0.9), shade(YARD.galvanised, -0.4)) });
  if (o.tubFull !== false) {
    c.save();
    c.translate(...proj(v, 0.5, 0.18, 0.3));
    c.scale(0.8, 0.8);
    drawBrightCopper(c, { ...v });
    c.restore();
  }
  const [sx, sy] = proj(v, 0.22, 0.06, 1.0);
  const [ex, ey] = proj(v, 0.45, 0.16, 0.5);
  const wire = builder().moveTo(sx, sy).quadTo(ex + 4, sy, ex, ey).build();
  c.drawPath(wire, stroke(INK, 4.2));
  c.drawPath(wire, stroke(YARD.copperLight, 2.4));
  if (o.running) {
    const [mx, my] = proj(v, -0.1, 0, 1.3);
    for (let i = 0; i < 3; i++) c.drawPath(builder().addArc({ x: mx - 6 - i * 4, y: my - 4 - i * 3, width: 12 + i * 8, height: 8 + i * 6 }, 200, 140).build(), stroke(INK, 1, 0.5));
  }
}

// ---------------------------------------------------------------------------
// The weighbridge
// ---------------------------------------------------------------------------

export const WEIGHBRIDGE = { len: 3.6, wid: 2.4 };

/** The weighbridge plate (flush steel deck with checker plate, hazard ends), anchored at its centre. */
export function drawWeighbridgeDeck(c: SkCanvas, v: View3q): void {
  const { len, wid } = WEIGHBRIDGE;
  // the pit frame and the deck, a little proud of the ground
  box(c, v, { len: len + 0.3, wid: wid + 0.3, h: 0.09, color: YARD.concreteLight, front: YARD.concreteDark, line: 1 });
  box(c, v, {
    len,
    wid,
    h: 0.12,
    front: YARD.steelDark,
    z: 0.0,
    color: YARD.galvanised,
    bevel: true,
    onTop: (q) => {
      // checker plate: rows of small raised dashes alternating direction
      const nx = 22;
      const ny = 12;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const [x, y] = proj(v, ...subQuad(q, (i + 0.5 + (j % 2) * 0.5) / (nx + 0.5), 0, (j + 0.5) / ny, 0)[0]);
          const d = (i + j) % 2 ? 1.6 : -1.6;
          c.drawPath(segment(x - 1.6, y + d * 0.5, x + 1.6, y - d * 0.5), stroke(YARD.galvanisedLight, 1.1));
        }
      // hazard bands at both ends
      for (const [s0, s1] of [[0, 0.07], [0.93, 1]]) {
        const p = subQuad(q, s0, s1, 0, 1).map((pt) => proj(v, ...pt));
        hazard(c, poly(p.flat()), 4, 0.9);
      }
    },
  });
}

/**
 * The display post at the weighbridge's end: a pole and a hi-vis box of LED digits with the ticket
 * printer's slot under them. `text` is the digits shown (the caller's, e.g. "52.4"). Returns the slot's
 * centre and width in points relative to the anchor, so a ticket can feed out of it.
 */
export function drawWeighDisplay(c: SkCanvas, v: View3q, text: string): { slot: [number, number]; slotW: number } {
  groundShadow(c, v, 0.25, 0.2, 0, 0, 2.2);
  box(c, v, { len: 0.12, wid: 0.12, h: 2.0, color: YARD.galvanised, line: 1 });
  const [x, y] = proj(v, 0, 0, 2.0);
  const w = 80;
  const h = 28;
  const top = y - h - 18;
  c.drawPath(rrect(x - w / 2 - 4 + 2, top + 2, w + 8, h + 24, 5), fill(INK, 0.25));
  c.drawPath(rrect(x - w / 2 - 4, top, w + 8, h + 24, 5), fill(YARD.hivis));
  c.drawPath(rrect(x - w / 2 - 4, top, w + 8, h + 24, 5), stroke(INK, LINE_W));
  c.drawPath(rrect(x - w / 2, top + 4, w, h, 2.5), fill(YARD.ledCase));
  sevenSeg(c, text, x + w / 2 - 22, top + 8, 19, YARD.led, YARD.ledOff);
  // "kg" in LED strokes: a k and a g
  const kx = x + w / 2 - 15;
  const ky = top + h - 4;
  const s = stroke(YARD.led, 1.2);
  c.drawPath(segment(kx, ky - 7, kx, ky), s);
  c.drawPath(builder().moveTo(kx + 3.4, ky - 4.6).lineTo(kx, ky - 2.2).lineTo(kx + 3.4, ky).build(), s);
  c.drawPath(oval(kx + 7, ky - 2.4, 1.7, 1.8), s);
  c.drawPath(builder().moveTo(kx + 8.7, ky - 4).lineTo(kx + 8.7, ky + 1.6).quadTo(kx + 8.7, ky + 3.4, kx + 5.8, ky + 2.8).build(), s);
  // the printer slot under the digits
  const sy = top + h + 13;
  c.drawPath(rrect(x - 22, sy - 2.5, 44, 5, 2.5), fill(INK));
  c.drawPath(segment(x - 19, sy + 0.5, x + 19, sy + 0.5), stroke(shade(INK, 0.3), 1));
  return { slot: [x, sy], slotW: 40 };
}

// ---------------------------------------------------------------------------
// The small crucible furnace under its hood, cold and pouring; its mould on dry sand
// ---------------------------------------------------------------------------

/** A cavity's colour: empty (dark), glowing, cooling or cooled metal, from seconds since it was poured. */
function cavityColour(metal: string, t: number | undefined): string | undefined {
  if (t === undefined) return undefined;
  return coolingColour(metal, t);
}

/**
 * An open ingot mould of `n` cavities lying east-west on a bed of dry sand. `poured[i]` is how many
 * seconds ago cavity i was filled (undefined: empty); a filled, cooled cavity shows a notched ingot.
 */
export function drawMould(c: SkCanvas, v: View3q, o: { n?: number; poured?: (number | undefined)[]; metal?: string; ox?: number; oy?: number } = {}): void {
  const n = o.n ?? 4;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const metal = o.metal ?? 'brass';
  const L = MOULD_CAV * n + 0.08;
  // the sand bed (moulds stand on dry sand: yard-design.md 6)
  const [sx, sy] = proj(v, ox, oy, 0);
  c.drawPath(oval(sx, sy, (L / 2 + 0.3) * v.ppm, 0.42 * v.ppm * v.tilt), fill(YARD.sand));
  for (let i = 0; i < 14; i++) c.drawCircle(sx + (hash01(i, 3) - 0.5) * L * v.ppm, sy + (hash01(i, 4) - 0.5) * 0.5 * v.ppm * v.tilt, 0.7, fill(shade(YARD.sand, -0.2)));
  boxShadow(c, v, L + 0.06, 0.4, ox, oy, 0.12);
  box(c, v, {
    len: L,
    wid: 0.34,
    h: 0.12,
    ox,
    oy,
    color: YARD.castIron,
    bevel: true,
    onTop: (q) => {
      for (let i = 0; i < n; i++) {
        // cavity 0 is the west end (next to the furnace); the top quad runs east to west
        const s0 = 1 - (0.04 + (i + 1) * MOULD_CAV - 0.06) / L;
        const s1 = 1 - (0.04 + i * MOULD_CAV) / L;
        const cav = subQuad(q, s0, s1, 0.2, 0.8);
        faceFill(c, v, cav, shade(YARD.castIron, -0.45), 0.9);
        const col = cavityColour(metal, o.poured?.[i]);
        if (!col) continue;
        const t = o.poured?.[i] ?? 99;
        const inner = subQuad(q, s0 + 0.01, s1 - 0.01, 0.26, 0.74);
        faceFill(c, v, inner, col);
        if (t >= 3) {
          // the cooled ingot's break notches
          for (const k of [0.36, 0.66]) {
            const a = proj(v, ...subQuad(q, s0 + (s1 - s0) * k, 0, 0.27, 0)[0]);
            const b2 = proj(v, ...subQuad(q, s0 + (s1 - s0) * k, 0, 0.73, 0)[0]);
            c.drawPath(segment(a[0], a[1], b2[0], b2[1]), stroke(shade(col, -0.35), 1.1));
          }
        } else if (t < 1.5) {
          const [gx, gy] = proj(v, ...subQuad(q, (s0 + s1) / 2, 0, 0.5, 0)[0]);
          c.drawPath(oval(gx, gy, 9, 4), radial(gx, gy, 10, [YARD.glowWhite, rgba(YARD.glowHot, 0)]));
        }
      }
    },
  });
}

/** One cavity's length along the mould, metres (a 5 kg ingot). */
const MOULD_CAV = 0.3;

/**
 * The tilting crucible furnace: a round steel shell lined with refractory, on trunnions between two
 * posts, its lid swung open on an arm. tilt 0 upright (lid on when cold), 1 tipped east 46 degrees to
 * pour. Returns the pour lip in points (relative to the anchor), so the mould can stand under it.
 */
export function drawCrucible(c: SkCanvas, v: View3q, o: { tilt?: number; hot?: boolean; lidOpen?: boolean } = {}): [number, number] {
  const tilt = o.tilt ?? 0;
  const hot = o.hot ?? tilt > 0;
  const lidOpen = o.lidOpen ?? hot;
  const P = v.ppm;
  const R = 0.4 * P;
  const H = 0.86 * P * v.lift;
  const ry = R * v.tilt;
  const [px, py] = proj(v, 0, 0, PIVOT_Z);
  // the frame's north post (behind) and the burner box
  box(c, v, { len: 0.12, wid: 0.1, h: PIVOT_Z + 0.08, oy: -0.44, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.34, wid: 0.3, h: 0.36, ox: -0.5, oy: -0.32, color: YARD.machine, line: LINE_W, bevel: true });
  const [bx, by] = proj(v, -0.5, -0.17, 0.2);
  c.drawPath(oval(bx, by, 3.6, 3.6), fill(INK));
  if (hot) c.drawPath(oval(bx, by, 2.6, 2.6), fill(YARD.glow));
  // the lid: closed on the mouth when cold; swung aside on its post to the west when open
  if (lidOpen) {
    box(c, v, { len: 0.08, wid: 0.08, h: PIVOT_Z + 0.42, ox: -0.62, oy: 0.05, color: YARD.machineDark, line: 1 });
    const [lx, ly] = proj(v, -0.72, 0.05, PIVOT_Z + 0.5);
    c.drawPath(oval(lx, ly + 3, R * 0.95, ry * 0.95), fill(shade(YARD.machineDark, -0.2)));
    c.drawPath(oval(lx, ly, R * 0.95, ry * 0.95), fill(YARD.machineDark));
    c.drawPath(oval(lx, ly, R * 0.95, ry * 0.95), stroke(INK, LINE_W));
    c.drawPath(rrect(lx - 7, ly - 3, 14, 5, 2.5), fill(YARD.hivis));
    c.drawPath(rrect(lx - 7, ly - 3, 14, 5, 2.5), stroke(INK, 1));
  }
  const ang = tilt * 46;
  const a = (ang * Math.PI) / 180;
  c.save();
  c.translate(px, py);
  c.rotate(ang, 0, 0);
  const top = -H * 0.5;
  const bot = H * 0.5;
  const body = builder()
    .moveTo(-R, top)
    .lineTo(-R, bot)
    .addArc({ x: -R, y: bot - ry, width: R * 2, height: ry * 2 }, 180, -180)
    .lineTo(R, top)
    .close()
    .build();
  c.drawPath(body, linear(-R, 0, R, 0, [shade(YARD.machine, 0.25), YARD.machine, YARD.machineDark, shade(YARD.machineDark, -0.25)], [0, 0.35, 0.75, 1]));
  // two hi-vis bands and the trunnion
  for (const yy of [top + (bot - top) * 0.22, top + (bot - top) * 0.78]) c.drawRect({ x: -R, y: yy, width: R * 2, height: 3 }, fill(YARD.hivisDark));
  c.drawPath(body, stroke(INK, LINE_W));
  c.drawPath(oval(0, 0, 5, 5), fill(YARD.galvanisedLight));
  c.drawPath(oval(0, 0, 5, 5), stroke(INK, 1));
  // the mouth: steel rim, refractory lining, the melt (hot) or the lid (cold, closed)
  c.drawPath(oval(0, top, R, ry), fill(YARD.steelDark));
  c.drawPath(oval(0, top, R * 0.86, ry * 0.84), fill(YARD.refractory));
  if (hot) c.drawPath(oval(R * 0.08, top + 0.5, R * 0.66, ry * 0.62), radial(R * 0.08, top, R * 0.7, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.45, 1]));
  else c.drawPath(oval(0, top + 0.5, R * 0.66, ry * 0.62), fill(shade(YARD.refractory, -0.35)));
  c.drawPath(oval(0, top, R, ry), stroke(INK, LINE_W));
  if (!lidOpen) {
    c.drawPath(oval(0, top - 3, R * 0.98, ry * 0.95), fill(YARD.machineDark));
    c.drawPath(oval(0, top - 3, R * 0.98, ry * 0.95), stroke(INK, LINE_W));
    c.drawPath(rrect(-7, top - 9, 14, 5, 2.5), fill(YARD.hivis));
    c.drawPath(rrect(-7, top - 9, 14, 5, 2.5), stroke(INK, 1));
  }
  // the pouring spout on the east rim
  const spout = poly([R - 4, top - 3.5, R + 8, top - 2, R + 8, top + 2.5, R - 4, top + 4]);
  c.drawPath(spout, fill(YARD.steelDark));
  c.drawPath(spout, stroke(INK, 1));
  if (hot && tilt > 0.5) c.drawPath(rrect(R - 2, top - 1.6, 9, 3, 1.5), fill(YARD.glowHot));
  c.restore();
  // the lip in anchor points (rotation by ang about the pivot)
  const lx0 = R + 8;
  const ly0 = top;
  const lip: [number, number] = [px + lx0 * Math.cos(a) - ly0 * Math.sin(a), py + lx0 * Math.sin(a) + ly0 * Math.cos(a)];
  // the south post (in front) with the tilt wheel
  box(c, v, { len: 0.12, wid: 0.1, h: PIVOT_Z + 0.08, oy: 0.44, color: YARD.machineDark, line: 1 });
  const [wx, wy] = proj(v, 0, 0.5, PIVOT_Z);
  // the tilt wheel: a yellow rim on three spokes, its handle knob
  for (let i = 0; i < 3; i++) {
    const sa = (i / 3) * Math.PI * 2 + 0.5;
    c.drawPath(segment(wx, wy, wx + Math.cos(sa) * 5, wy + Math.sin(sa) * 5), stroke(INK, 1.4));
  }
  c.drawPath(oval(wx, wy, 5.5, 5.5), stroke(INK, 3));
  c.drawPath(oval(wx, wy, 5.5, 5.5), stroke(YARD.hivis, 1.7));
  c.drawPath(oval(wx + 5.5, wy - 1, 1.8, 1.8), fill(INK));
  return lip;
}

/** The trunnions' height, metres. */
const PIVOT_Z = 1.0;

/** The furnace corner's scale against its true size: the pour is the yard's moment and must read. */
export const FURNACE_SCALE = 1.2;

/**
 * The furnace corner as the yard shows it: hood and its posts, the tilting crucible furnace, the mould on
 * dry sand under its lip, a warm light pool and (cold) the closed lid. `t` seconds since the pour began
 * (cooling). Anchor: the furnace's footprint centre; the hood reaches 1.7 m east and 3.2 m up.
 */
export function drawFurnaceSet(c: SkCanvas, v: View3q, state: 'cold' | 'pouring' | 'cooling', t = 0): void {
  c.save();
  c.scale(FURNACE_SCALE, FURNACE_SCALE);
  furnaceSet(c, v, state, t);
  c.restore();
}

/** Where the stream lands, metres east of the furnace anchor. */
export const MOULD_X = 0.64; // the lip at full tilt: (0.4 m + 8 pt) and half the shell turned 46 degrees about the trunnions

function hood(c: SkCanvas, v: View3q, hot: boolean, part: 'back' | 'front'): void {
  const x0 = -0.85;
  const x1 = 1.75;
  if (part === 'back') {
    for (const x of [x0 + 0.05, x1 - 0.05]) box(c, v, { len: 0.1, wid: 0.1, h: 2.05, ox: x, oy: -0.55, color: YARD.galvanised, line: 1 });
    return;
  }
  // the canopy: a sloped galvanised hood with its front face toward the eye and a duct out of the top
  const zb = 2.0;
  const zt = 2.36;
  const P = (x: number, y: number, z: number) => proj(v, x, y, z);
  const fb0 = P(x0, 0.55, zb);
  const fb1 = P(x1, 0.55, zb);
  const ft1 = P(x1 - 0.5, 0.1, zt);
  const ft0 = P(x0 + 0.5, 0.1, zt);
  const under0 = P(x0, -0.55, zb);
  const under1 = P(x1, -0.55, zb);
  // the warm underside seen below the front lip
  if (hot) {
    const u = poly([fb0[0], fb0[1], fb1[0], fb1[1], under1[0], under1[1] + 6, under0[0], under0[1] + 6]);
    void u;
  }
  const face = poly([fb0[0], fb0[1], fb1[0], fb1[1], ft1[0], ft1[1], ft0[0], ft0[1]]);
  c.drawPath(face, linear(0, ft0[1], 0, fb0[1], [YARD.galvanisedLight, YARD.galvanised]));
  c.drawPath(face, stroke(INK, LINE_W));
  // the lip band, lit warm from below when the melt is out
  const lip = poly([fb0[0], fb0[1], fb1[0], fb1[1], fb1[0], fb1[1] + 4, fb0[0], fb0[1] + 4]);
  c.drawPath(lip, fill(hot ? mix(YARD.galvanised, YARD.glowHot, 0.55) : shade(YARD.galvanised, -0.2)));
  c.drawPath(lip, stroke(INK, 1));
  // the duct
  const [dx, dy] = P((x0 + x1) / 2, 0.1, zt);
  const dw = 0.26 * v.ppm;
  c.drawPath(rect(dx - dw, dy - 26, dw * 2, 27), fill(YARD.galvanised));
  c.drawRect({ x: dx - dw + 2, y: dy - 26, width: 3, height: 27 }, fill(YARD.galvanisedLight));
  c.drawPath(rect(dx - dw, dy - 26, dw * 2, 27), stroke(INK, LINE_W));
  c.drawPath(rrect(dx - dw - 2, dy - 18, dw * 2 + 4, 4, 1), fill(YARD.galvanisedLight));
  c.drawPath(rrect(dx - dw - 2, dy - 18, dw * 2 + 4, 4, 1), stroke(INK, 1));
  // its ribs
  for (const k of [0.25, 0.5, 0.75]) {
    const a = [fb0[0] + (fb1[0] - fb0[0]) * k, fb0[1]];
    const b = [ft0[0] + (ft1[0] - ft0[0]) * k, ft0[1]];
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.15), 1));
  }
}

function furnaceSet(c: SkCanvas, v: View3q, state: 'cold' | 'pouring' | 'cooling', t: number): void {
  const hot = state !== 'cold';
  boxShadow(c, v, 2.6, 1.3, 0.5, 0, 0.6);
  if (hot) {
    // the warm light the melt throws on the pad and the sand
    const [gx, gy] = proj(v, MOULD_X, 0.25, 0);
    c.drawPath(oval(gx, gy, 2.4 * v.ppm, 1.3 * v.ppm * v.tilt), radial(gx, gy, 2.4 * v.ppm, ['rgba(255,176,80,0.55)', 'rgba(255,190,90,0)']));
  }
  hood(c, v, hot, 'back');
  const poured: (number | undefined)[] =
    state === 'cold' ? [] : state === 'pouring' ? [0, 1.2, 4, 9] : [t, t + 1.2, t + 4, t + 9];
  const tilt = state === 'pouring' ? 1 : state === 'cooling' ? 0.25 : 0;
  // the furnace (its lip returned in points), then the mould in front of it, its first cavity under the
  // lip at full tilt
  const lip = drawCrucible(c, v, { tilt, hot, lidOpen: hot });
  const L = MOULD_CAV * 4 + 0.08;
  const mouldX = MOULD_X + L / 2 - 0.04 - (MOULD_CAV - 0.06) / 2;
  drawMould(c, v, { ox: mouldX, oy: 0.3, poured });
  if (state === 'pouring') {
    // the stream falls straight from the lip into the first cavity: thick at the lip, thinner below
    const [, my] = proj(v, MOULD_X, 0.3, 0.12);
    const x = lip[0];
    const y0 = lip[1] + 1;
    const s = (w0: number, w1: number, col: string) => c.drawPath(poly([x - w0 / 2, y0, x + w0 / 2, y0, x + w1 / 2, my, x - w1 / 2, my]), fill(col));
    s(9, 6, YARD.glow);
    s(6.4, 3.8, YARD.glowHot);
    s(2.6, 1.4, YARD.glowWhite);
    c.drawPath(oval(x, my, 9, 3.6), radial(x, my, 11, [YARD.glowWhite, rgba(YARD.glowHot, 0)]));
    // light droplets and a few sparks thrown off the splash (light, never flame)
    for (let i = 0; i < 7; i++) {
      const dx = (hash01(i, 4) - 0.5) * 22;
      const dy = -2 - hash01(i, 5) * 10;
      c.drawPath(segment(x + dx * 0.4, my - 1, x + dx, my + dy), stroke(i % 2 ? YARD.spark : YARD.glowWhite, 1.1));
    }
  }
  hood(c, v, hot, 'front');
}

// ---------------------------------------------------------------------------
// The hook-lift truck with a skip
// ---------------------------------------------------------------------------

/**
 * The hook-lift truck at a heading (radians, 0 east, pi/2 south): now drawn by the people artist's
 * vehicles.draw.ts (drawHookTruck); kept as a one-line call for the older sheets and tests. `load` (any
 * list) shows a full farm load; `skip: false` drives with no skip.
 */
export function drawTruck(c: SkCanvas, v: View3q, heading: number, o: { skip?: boolean; load?: string[] } = {}): void {
  drawHookTruck(c, v, heading, { skip: o.skip === false ? 'none' : 'on', load: o.load?.length ? 'farm-full' : undefined, shadow: true });
}

// ---------------------------------------------------------------------------
// A container wall section; the furnace pad
// ---------------------------------------------------------------------------

export const CONTAINER_COLOURS = [YARD.containerTeal, YARD.containerOxide, YARD.containerSage] as const;

/** A shipping container lying east-west (6.1 x 2.44 x 2.6 m), ribbed, with corner castings. */
export function drawContainer(c: SkCanvas, v: View3q, color: string = YARD.containerTeal, o: { len?: number; ox?: number; oy?: number; z?: number; seed?: number } = {}): void {
  const len = o.len ?? 6.1;
  const ox = o.ox ?? 0;
  const oy = o.oy ?? 0;
  const z = o.z ?? 0;
  if (z === 0) boxShadow(c, v, len, 2.44, ox, oy);
  box(c, v, {
    len,
    wid: 2.44,
    h: 2.6,
    ox,
    oy,
    z,
    color,
    onFace: (q, n) => {
      const ribs = n[1] > 0.9 ? Math.round(len * 4) : 8;
      for (let i = 1; i < ribs; i++) {
        const s = i / ribs;
        faceFill(c, v, subQuad(q, s - 0.18 / ribs, s + 0.18 / ribs, 0.04, 0.94), shade(color, -0.22));
        faceFill(c, v, subQuad(q, s + 0.18 / ribs, s + 0.32 / ribs, 0.04, 0.94), shade(color, 0.1), 0, 0.6);
      }
      faceFill(c, v, subQuad(q, 0, 1, 0.94, 1), shade(color, -0.3));
      faceFill(c, v, subQuad(q, 0, 1, 0, 0.05), shade(color, -0.35));
      for (const s0 of [0, 1 - 0.3 / len]) {
        faceFill(c, v, subQuad(q, s0, s0 + 0.3 / len, 0, 0.08), shade(color, -0.45), 0.8);
        faceFill(c, v, subQuad(q, s0, s0 + 0.3 / len, 0.92, 1), shade(color, -0.45), 0.8);
      }
      const [x, y] = proj(v, ...subQuad(q, 0.2 + 0.5 * hash01(o.seed ?? 1, 2), 0, 0.3, 0)[0]);
      freckles(c, x, y - 18, 40, 22, o.seed ?? 1, YARD.rust, 5);
    },
    onTop: (q) => {
      for (let i = 1; i < 10; i++) faceFill(c, v, subQuad(q, i / 10 - 0.008, i / 10 + 0.008, 0.05, 0.95), shade(color, -0.12));
    },
  });
}

/** A wall of containers along x, `n` long and `tiers` high, alternating colours. */
export function drawContainerWall(c: SkCanvas, v: View3q, n: number, tiers = 1, seed = 1): void {
  for (let t = 0; t < tiers; t++)
    for (let i = 0; i < n; i++) {
      const col = CONTAINER_COLOURS[Math.floor(hash01(seed, i, t) * 3)];
      drawContainer(c, v, col, { ox: (i - (n - 1) / 2) * 6.15 + (t ? 1.2 : 0), z: t * 2.6, seed: seed * 10 + i + t * 5 });
    }
}

/** The furnace pad: a raised clean concrete slab with a painted yellow edge and hazard corners. */
export function drawPad(c: SkCanvas, v: View3q, w: number, d: number, locked = false): void {
  box(c, v, {
    len: w,
    wid: d,
    h: 0.1,
    color: YARD.concreteLight,
    front: YARD.concreteDark,
    line: 1,
    onTop: (q) => {
      const edge = 0.12 / Math.min(w, d);
      const inner = subQuad(q, edge, 1 - edge, edge * (w / d), 1 - edge * (w / d));
      const ip = inner.map((p) => proj(v, ...p));
      c.drawPath(poly(ip.flat()), stroke(locked ? YARD.linePaintWorn : YARD.linePaint, 2.4));
      for (const [s, t] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const k = 0.5 / w;
        const kd = 0.5 / d;
        const corner = subQuad(q, s ? 1 - k : 0, s ? 1 : k, t ? 1 - kd : 0, t ? 1 : kd).map((p) => proj(v, ...p));
        hazard(c, poly(corner.flat()), 3, 0.8);
      }
      if (locked) {
        // dashed outlines where the machines will stand
        const spot = subQuad(q, 0.2, 0.55, 0.25, 0.75).map((p) => proj(v, ...p));
        const dash = stroke(YARD.inkSoft, 1.2, 0.6);
        dash.setPathEffect(Skia.PathEffect.MakeDash([4, 3], 0));
        c.drawPath(poly(spot.flat()), dash);
      }
    },
  });
}


/**
 * A storage bay: three walls of interlocking concrete blocks (0.8 m cubes) open to the south, its
 * material heaped inside, a stencil code painted on the back wall, and a hi-vis Hold flag when held.
 * w x d metres; anchor the bay's footprint centre.
 */
export function drawBay(c: SkCanvas, v: View3q, w: number, d: number, o: { heap: string[]; code: string; hold?: boolean; seed?: number }): void {
  const b = 0.8;
  const seed = o.seed ?? 1;
  const block = (x: number, y: number, z = 0) =>
    box(c, v, {
      len: b,
      wid: b,
      h: b * 0.75,
      ox: x,
      oy: y,
      z,
      color: '#BDB8AC',
      line: 1,
      onTop: (q) => {
        for (const [s0, t0] of [[0.3, 0.5], [0.7, 0.5]]) {
          const [kx, ky] = proj(v, ...subQuad(q, s0, s0, t0, t0)[0]);
          c.drawPath(oval(kx, ky, 3.2, 2.2), fill(shade('#BDB8AC', -0.1)));
          c.drawPath(oval(kx, ky, 3.2, 2.2), stroke(INK, 0.7));
        }
      },
    });
  const nx = Math.round(w / b);
  // the back wall, two blocks high, with the code painted on its face
  for (let i = 0; i < nx; i++) {
    block(-w / 2 + b / 2 + i * b, -d / 2 + b / 2);
    block(-w / 2 + b / 2 + i * b, -d / 2 + b / 2, b * 0.75);
  }
  const [cx, cy] = proj(v, 0, -d / 2 + b, b * 1.3);
  stencil(c, o.code, cx, cy - 7, 13, YARD.ink, { align: 'center', alpha: 0.85 });
  // the heap: the grade's own pieces piled against the back wall (pieces.draw.ts), so a bay says its
  // metal by shape as well as colour
  {
    const [hx, hy] = proj(v, 0, -d / 2 + b + (d - b) * 0.55, 0);
    c.save();
    c.translate(hx, hy);
    pieceHeap(c, o.heap, (w - 0.2) * v.ppm, 30, 18, seed, 15);
    c.restore();
  }
  // short side walls at the back corners
  for (const side of [-1, 1]) block(side * (w / 2 + b / 2), -d / 2 + b / 2);
  if (o.hold) {
    const [fx, fy] = proj(v, w / 2 + b / 2, -d / 2 + b / 2, b * 0.75);
    c.drawPath(segment(fx, fy, fx, fy - 30), stroke(INK, 1.6));
    const flag = poly([fx, fy - 30, fx + 20, fy - 25, fx, fy - 19]);
    c.drawPath(flag, fill(YARD.hivis));
    c.drawPath(flag, stroke(INK, 1.1));
  }
}
