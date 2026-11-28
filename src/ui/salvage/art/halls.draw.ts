/**
 * The works' three furnace halls (ART-HALLS, PLAN2 batch 0e; s2c-plan-world 1.2), drawn by the hand that drew the first
 * yard's furnace corner (plant.draw.ts drawCrucible / drawFurnaceSet, site.draw.ts drawCrucibleState / drawHood): the same
 * pen (flat three-tone fills, the 1.2 pt ink line, a light bevel on metal), the same low west sun (shadows swept east,
 * never mirrored), the same palette families (machine enamel, galvanised steel, refractory, hi-vis guards; orange is heat
 * alone). Every drawing is round its ANCHOR (its footprint's centre on the ground) in the kit's View3q, at true size; the
 * manifest part (manifest/worksHalls.ts) bakes them smaller (drawScale).
 *
 * A hall is drawn in LAYERS, never one picture per phase (the world, WLD-HALLS, stacks them by the rules' heat phase):
 *   shed     a portal-frame shed with its SOUTH WALL OPEN over the pour apron: two pitched roof slopes with roof lights
 *            and a ridge vent (louvres; never smoke), the headwall band and lintel above the opening, the corner
 *            columns with their foot guards, the interior's shade under the roof, the duct flange on the west gable
 *            (the bag-house filter's duct meets it: ART-HALLPARTS). One frame.
 *   furnace  the hall's furnace in three frames: cold (lid or door open, the lining dark), hot (closed, a heat seam),
 *            tilted (tipped east to pour, the melt bright at the mouth). Its fixed fume hood and duct are part of it.
 *            induction: a crucible in a water-cooled coil box that tilts about its spout (the coil turns seen through
 *            the box's window); rotary: a drum on riding rings and rollers, burner at the west end, the charging door
 *            with its salt-flux hatch at the east nose, tilted east by its rams; copper: a tilting refining hearth on
 *            rockers, its skimming door on the south face, tuyeres along the north side, the taphole spout east.
 *   glow     the heat's light over the furnace (2 frames that alternate; with reduced motion the world holds frame 0):
 *            a warm pool on the floor, a halo at the heat's own place (mouth, door, sight glass), a little shimmer.
 *   stream   the pour (3 frames, alternating): the fall from the lip into the launder, the metal down the launder, the
 *            drop into the mould on the apron, light droplets (never flame), and THE HALL'S OWN FURNACE HAND beside the
 *            mould in face shield, aluminised apron and gauntlets (drawPerson pose 'pour'), lit by the pour (pen.lit).
 *            Anchored at the hall's APRON point (content map.works.points '<hall>.apron').
 *
 * Where the layers stand (HALL_POUR, metres; the world reads it): the furnace and its glow at the apron point plus
 * HALL_POUR[h].furnace; the stream at the apron point; its drop lands at the apron point plus (HALL_POUR[h].pour, 0) at the
 * mould's top (z 0.12): the mould row there has a cavity under it (ART-HALLPARTS). Draw order: furnace, glow (same anchor,
 * after the furnace), the shed (its sort key is its south edge, south of the furnace), the moulds, the stream.
 *
 * Safety as the first yard shows it: a face shield and an aluminised apron at every pour; no water, hose or puddle near
 * molten metal (the coil's cooling water is inside its box). Nothing here is read by the first yard.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, SHADOW_ALPHA, SUN, YARD, mix, shade } from './palette';
import {
  box,
  builder,
  discPath,
  faceFill,
  fill,
  hash01,
  hazard,
  linear,
  lit,
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
import { crewLook, drawPerson } from './people.draw';

const INK = YARD.ink;

/** The three halls of the works (the content's plates). */
export type HallKind = 'rotary' | 'induction' | 'copper';
export const HALL_KINDS: readonly HallKind[] = ['rotary', 'induction', 'copper'];

/** A furnace frame: cold (open, dark), hot (closed, heating or ready), tilted (pouring). */
export type FurnaceFrame = 'cold' | 'hot' | 'tilted';
export const FURNACE_FRAMES: readonly FurnaceFrame[] = ['cold', 'hot', 'tilted'];

/** The cladding of the halls (the scale house's profiled sheet) and each hall's fascia colour (the yard wall's families). */
const CLAD = '#D9DCD2';
const FASCIA: Record<HallKind, string> = { rotary: YARD.containerTeal, induction: YARD.containerSage, copper: YARD.containerOxide };

/** A shed: footprint w x d metres, ridge h metres (the content's place sizes). */
export interface ShedSpec {
  w: number;
  d: number;
  h: number;
}
export const SHEDS: Record<HallKind, ShedSpec> = {
  rotary: { w: 8.5, d: 7, h: 7 },
  induction: { w: 6, d: 6, h: 6 },
  copper: { w: 6, d: 6, h: 6 },
};

/**
 * Where a hall's layers stand, metres from its apron's point (content '<hall>.apron'): `furnace` the furnace's (and its
 * glow's) anchor; `pour` how far east the drop lands at the mould's top. Chosen so the furnace stands inside the shed
 * behind the open south wall and its launder reaches the mould row on the apron.
 */
export const HALL_POUR: Record<HallKind, { furnace: [number, number]; pour: number }> = {
  rotary: { furnace: [-2.45, -2.0], pour: -1.2 },
  induction: { furnace: [-1.95, -2.1], pour: -0.9 },
  copper: { furnace: [-1.65, -2.15], pour: -0.3 },
};
/** The mould's top, metres (the first yard's mould: plant.draw.ts drawMould h 0.12). */
export const POUR_Z = 0.12;
/** The duct flange on each shed's west gable, metres from the shed's anchor (y, z) and its diameter: the filter's duct meets it. */
export const SHED_DUCT: Record<HallKind, { y: number; z: number; dia: number }> = {
  rotary: { y: -0.5, z: 4.0, dia: 0.55 },
  induction: { y: -0.5, z: 3.5, dia: 0.5 },
  copper: { y: -0.5, z: 3.5, dia: 0.5 },
};

// -------------------------------------------------------------------------------------------------------------------
// Small kit
// -------------------------------------------------------------------------------------------------------------------

/** Rotate a screen point about another by deg (Skia's sense: clockwise on screen). */
function rot(p: [number, number], o: [number, number], deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - o[0];
  const dy = p[1] - o[1];
  return [o[0] + dx * Math.cos(a) - dy * Math.sin(a), o[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

function turned(c: SkCanvas, o: [number, number], deg: number, draw: () => void): void {
  if (!deg) {
    draw();
    return;
  }
  c.save();
  c.rotate(deg, o[0], o[1]);
  draw();
  c.restore();
}

/** A flat ground shadow of a polygon of ground points (one path, the kit's tone). */
function groundPoly(c: SkCanvas, v: View3q, pts: [number, number][]): void {
  c.drawPath(
    poly(pts.flatMap(([x, y]) => proj(v, x, y, 0))),
    fill(YARD.shadow, SHADOW_ALPHA),
  );
}

/** A footprint's shadow swept east by the sun for a thing h tall (capped as the kit's boxes are, 0.8 m). */
function sunShadow(c: SkCanvas, v: View3q, w: number, d: number, h: number, ox = 0, oy = 0): void {
  const e = Math.min(h * SUN.dx, 0.8);
  const s = Math.min(h * SUN.dy, 0.2);
  groundPoly(c, v, [
    [ox - w / 2 + 0.05, oy - d / 2 + 0.05],
    [ox + w / 2, oy - d / 2 + 0.05],
    [ox + w / 2 + e, oy - d / 2 + s + 0.1],
    [ox + w / 2 + e, oy + d / 2 + s],
    [ox - w / 2 + 0.05 + e * 0.3, oy + d / 2 + s],
  ]);
}

/** A molten fall between two screen points: thick at the top, thinner below, three heat tones (the first yard's stream). */
function fall(c: SkCanvas, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, wob: number): void {
  const s = (a: number, b: number, col: string) =>
    c.drawPath(poly([x0 - a / 2, y0, x0 + a / 2, y0, x1 + b / 2 + wob, y1, x1 - b / 2 + wob, y1]), fill(col));
  s(w0, w1, YARD.glow);
  s(w0 * 0.7, w1 * 0.62, YARD.glowHot);
  s(w0 * 0.3, w1 * 0.24, YARD.glowWhite);
}

/** Light droplets thrown off a splash (light, never flame): short strokes, seeded per frame. */
function droplets(c: SkCanvas, x: number, y: number, seed: number, n = 6, reach = 20): void {
  for (let i = 0; i < n; i++) {
    const dx = (hash01(i, seed, 4) - 0.5) * reach;
    const dy = -2 - hash01(i, seed, 5) * reach * 0.45;
    c.drawPath(segment(x + dx * 0.4, y - 1, x + dx, y + dy), stroke(i % 2 ? YARD.spark : YARD.glowWhite, 1.1));
  }
}

/** A soft round light (heat only): colour to transparent. */
function halo(c: SkCanvas, x: number, y: number, rx: number, ry: number, color: string, a: number): void {
  c.drawPath(oval(x, y, rx, ry), radial(x, y, Math.max(rx, ry), [rgba(color, a), rgba(color, 0)]));
}

/** Rising heat shimmer over a hot place (the first yard's heat lines), phase by frame. */
function shimmer(c: SkCanvas, x: number, y: number, frame: number, n = 3, gap = 7): void {
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * gap + (frame ? 2 : -2);
    c.drawPath(
      builder().moveTo(x + dx, y).quadTo(x + dx + 3, y - 5, x + dx, y - 9).quadTo(x + dx - 3, y - 13, x + dx, y - 17).build(),
      stroke(YARD.glowHot, 1, 0.55),
    );
  }
}

/**
 * A fixed fume hood (the first yard's galvanised hood, smaller): its sloped front face toward the eye, the lip band (warm
 * when the melt is out), the duct rising out of its top towards the roof (the shed hides it above the lintel).
 */
function fumeHood(c: SkCanvas, v: View3q, x0: number, x1: number, y0: number, y1: number, zb: number, hot: boolean, duct = 1.2): void {
  const zt = zb + 0.3;
  const P = (x: number, y: number, z: number) => proj(v, x, y, z);
  const fb0 = P(x0, y1, zb);
  const fb1 = P(x1, y1, zb);
  const ft1 = P(x1 - 0.2, (y0 + y1) / 2, zt);
  const ft0 = P(x0 + 0.2, (y0 + y1) / 2, zt);
  // the duct first (behind the canopy's top)
  const [dx, dy] = P((x0 + x1) / 2, (y0 + y1) / 2, zt);
  const dw = 0.2 * v.ppm;
  const dh = duct * v.ppm * v.lift;
  c.drawPath(rect(dx - dw, dy - dh, dw * 2, dh + 1), fill(YARD.galvanised));
  c.drawRect({ x: dx - dw + 2, y: dy - dh, width: 3, height: dh + 1 }, fill(YARD.galvanisedLight));
  c.drawPath(rect(dx - dw, dy - dh, dw * 2, dh + 1), stroke(INK, LINE_W));
  c.drawPath(rrect(dx - dw - 2, dy - dh * 0.55, dw * 2 + 4, 4, 1), fill(YARD.galvanisedLight));
  c.drawPath(rrect(dx - dw - 2, dy - dh * 0.55, dw * 2 + 4, 4, 1), stroke(INK, 1));
  const face = poly([fb0[0], fb0[1], fb1[0], fb1[1], ft1[0], ft1[1], ft0[0], ft0[1]]);
  c.drawPath(face, fill(YARD.galvanised));
  c.drawPath(poly([ft0[0], ft0[1], ft1[0], ft1[1], ft1[0], ft1[1] + 5, ft0[0], ft0[1] + 5]), fill(YARD.galvanisedLight));
  for (const k of [0.33, 0.66]) {
    const a = [fb0[0] + (fb1[0] - fb0[0]) * k, fb0[1]];
    const b = [ft0[0] + (ft1[0] - ft0[0]) * k, ft0[1]];
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.15), 1));
  }
  c.drawPath(face, stroke(INK, LINE_W));
  const lip = poly([fb0[0], fb0[1], fb1[0], fb1[1], fb1[0], fb1[1] + 3.5, fb0[0], fb0[1] + 3.5]);
  c.drawPath(lip, fill(hot ? mix(YARD.galvanised, YARD.glowHot, 0.55) : shade(YARD.galvanised, -0.2)));
  c.drawPath(lip, stroke(INK, 1));
}

/** A low concrete plinth with its darker front lip (decks and pads sit in the view: yard-style.md 5). */
function plinth(c: SkCanvas, v: View3q, len: number, wid: number, ox = 0, oy = 0): void {
  box(c, v, { len, wid, h: 0.14, ox, oy, color: YARD.concreteLight, front: YARD.concreteDark, line: 1 });
}

// -------------------------------------------------------------------------------------------------------------------
// The shed
// -------------------------------------------------------------------------------------------------------------------

/** The eave and the opening's lintel of a shed, metres. */
const eaveOf = (s: ShedSpec) => s.h - 0.9;
const lintelOf = (s: ShedSpec) => eaveOf(s) - 1.35;

/**
 * A portal-frame shed (south wall open): the sun's sweep east of it, the shade under its roof (flat bands, behind where a
 * furnace stands), the corner columns, the headwall band and lintel over the opening, the duct flange on the west gable,
 * the two roof slopes with ribs, roof lights and the ridge vent, the gutter. Anchor: the footprint's centre.
 */
export function drawHallShed(c: SkCanvas, v: View3q, kind: HallKind): void {
  const s = SHEDS[kind];
  const { w, d, h } = s;
  const he = eaveOf(s);
  const hl = lintelOf(s);
  const W = w / 2;
  const D = d / 2;
  const o = 0.14; // the roof's overhang at the gables
  const oe = 0.3; // at the eaves
  sunShadow(c, v, w, d, h);
  // the shade under the roof, seen through the open south wall: two flat bands under the lintel, over the back of the
  // floor (a furnace stands south of them; whoever walks there is in the hall's shade, as they would be)
  {
    const yL = proj(v, 0, D, hl)[1];
    const yF = proj(v, 0, D, 0)[1];
    const span = yF - yL;
    const xs = (W - 0.3) * v.ppm;
    c.drawRect({ x: -xs, y: yL, width: xs * 2, height: span * 0.22 }, fill(YARD.shadow, 0.34));
    c.drawRect({ x: -xs, y: yL + span * 0.22, width: xs * 2, height: span * 0.16 }, fill(YARD.shadow, 0.16));
  }
  // the duct flange out of the west gable (under the roof's overhang)
  {
    const dd = SHED_DUCT[kind];
    const [fx, fy] = proj(v, -W, dd.y, dd.z);
    const r = (dd.dia / 2) * v.ppm;
    const len = 0.42 * v.ppm;
    c.drawPath(rect(fx - len, fy - r, len, r * 2), linear(0, fy - r, 0, fy + r, [YARD.galvanisedLight, YARD.galvanised, shade(YARD.galvanised, -0.25)]));
    c.drawPath(rect(fx - len, fy - r, len, r * 2), stroke(INK, LINE_W));
    c.drawPath(rrect(fx - len - 2, fy - r - 2, 4, r * 2 + 4, 1), fill(YARD.galvanisedLight));
    c.drawPath(rrect(fx - len - 2, fy - r - 2, 4, r * 2 + 4, 1), stroke(INK, 1));
  }
  // the headwall band over the opening: profiled cladding, the hall's fascia colour at the top, the lintel's clearance
  // stripes at its foot
  const head: V3[] = [
    [W, D, hl],
    [-W, D, hl],
    [-W, D, he],
    [W, D, he],
  ];
  faceFill(c, v, head, CLAD, LINE_W);
  const ribs = Math.round(w / 0.32);
  for (let i = 1; i < ribs; i++) faceFill(c, v, subQuad(head, i / ribs - 0.004, i / ribs + 0.004, 0.2, 0.7), shade(CLAD, -0.12));
  faceFill(c, v, subQuad(head, 0, 1, 0.7, 1), FASCIA[kind], LINE_W);
  faceFill(c, v, subQuad(head, 0, 1, 0.74, 0.8), shade(FASCIA[kind], 0.25), 0);
  {
    const p = subQuad(head, 0.004, 0.996, 0, 0.2).map((q) => proj(v, ...q));
    hazard(c, poly(p.flat()), 4, 0.9);
  }
  // the corner columns (portal legs, steel) with their yellow foot guards; the side walls' cladding seen end-on
  for (const sx of [-1, 1]) {
    const x = sx * (W - 0.15);
    box(c, v, { len: 0.34, wid: 0.3, h: he, ox: x, oy: D - 0.15, color: YARD.steel, line: LINE_W, bevel: true });
    box(c, v, { len: 0.12, wid: 0.3, h: he - 0.05, ox: x + sx * 0.2, oy: D - 0.15, color: CLAD, line: 1 });
    box(c, v, {
      len: 0.44,
      wid: 0.4,
      h: 0.9,
      ox: x - sx * 0.02,
      oy: D - 0.05,
      color: YARD.hivis,
      line: 1,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        const p = subQuad(q, 0, 1, 0.15, 0.75).map((pt) => proj(v, ...pt));
        hazard(c, poly(p.flat()), 3.5, 0.8);
      },
    });
    // a base plate
    box(c, v, { len: 0.5, wid: 0.46, h: 0.05, ox: x, oy: D - 0.15, color: YARD.steelDark, line: 0.8 });
  }
  // the roof: north slope (further, a little darker), then the south slope toward the eye
  const north: V3[] = [
    [-W - o, 0, h],
    [W + o, 0, h],
    [W + o, -D - oe, he - 0.12],
    [-W - o, -D - oe, he - 0.12],
  ];
  const south: V3[] = [
    [W + o, D + oe, he - 0.12],
    [-W - o, D + oe, he - 0.12],
    [-W - o, 0, h],
    [W + o, 0, h],
  ];
  const sheet = YARD.galvanised;
  faceFill(c, v, north, shade(sheet, 0.04), LINE_W);
  faceFill(c, v, south, shade(sheet, 0.16), LINE_W);
  const nr = Math.round(w / 0.42);
  for (const q of [north, south])
    for (let i = 1; i < nr; i++) {
      const a = proj(v, ...subQuad(q, i / nr, 0, 0.02, 0)[0]);
      const b = proj(v, ...subQuad(q, i / nr, 0, 0.98, 0)[0]);
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(sheet, -0.14), 1));
      c.drawPath(segment(a[0] + 1.2, a[1], b[0] + 1.2, b[1]), stroke(YARD.galvanisedLight, 0.8));
    }
  // roof lights on the south slope (translucent sheets: pale, never shining)
  const lights = kind === 'rotary' ? 3 : 2;
  for (let i = 0; i < lights; i++) {
    const s0 = (i + 0.5) / lights - 0.07;
    const q = subQuad(south, s0, s0 + 0.14, 0.22, 0.78);
    faceFill(c, v, q, mix(YARD.glass, '#FFFFFF', 0.45), 1);
    faceFill(c, v, subQuad(q, 0.15, 0.4, 0.1, 0.9), '#FFFFFF', 0, 0.35);
  }
  // the ridge vent: a low louvred box along the ridge (air, never smoke)
  {
    const L = w * 0.56;
    box(c, v, {
      len: L,
      wid: 0.5,
      h: 0.28,
      z: h - 0.04,
      color: YARD.steel,
      line: LINE_W,
      bevel: true,
      onFace: (q, n) => {
        if (n[1] < 0.9) return;
        const k = Math.round(L / 0.22);
        for (let i = 1; i < k; i++) faceFill(c, v, subQuad(q, i / k - 0.012, i / k + 0.012, 0.15, 0.85), YARD.steelDark);
      },
    });
  }
  // the gutter along the south eave and the downpipe down the south-east column
  {
    const a = proj(v, W + o, D + oe, he - 0.12);
    const b = proj(v, -W - o, D + oe, he - 0.12);
    c.drawPath(rect(b[0], b[1] - 1, a[0] - b[0], 4), fill(YARD.steelDark));
    c.drawPath(rect(b[0], b[1] - 1, a[0] - b[0], 4), stroke(INK, 1));
    const [px, py] = proj(v, W - 0.04, D + 0.05, he - 0.12);
    const [, pb] = proj(v, W - 0.04, D + 0.05, 0.9);
    c.drawPath(rect(px - 1.5, py + 2, 3, pb - py - 2), fill(YARD.steelDark));
    c.drawPath(rect(px - 1.5, py + 2, 3, pb - py - 2), stroke(INK, 0.8));
  }
}

// -------------------------------------------------------------------------------------------------------------------
// The induction furnace: a crucible in a water-cooled coil box, tilting about its spout
// -------------------------------------------------------------------------------------------------------------------

const IND = { pivot: [0.72, 0, 1.38] as V3, lip: [0.86, 0, 1.38] as V3, tilt: 55 };

function inductionBody(c: SkCanvas, v: View3q, f: FurnaceFrame): void {
  const lidOn = f === 'hot';
  box(c, v, {
    len: 1.3,
    wid: 1.3,
    h: 1.0,
    ox: -0.02,
    z: 0.34,
    color: YARD.machine,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // the yoke covers (vertical strips), the window onto the coil's copper turns, the hi-vis band, a blank plate
      for (const s0 of [0.04, 0.9]) faceFill(c, v, subQuad(q, s0, s0 + 0.06, 0.05, 0.95), shade(YARD.machine, -0.18), 0.8);
      const win = subQuad(q, 0.22, 0.72, 0.22, 0.7);
      faceFill(c, v, win, YARD.machineDark, LINE_W);
      for (let i = 0; i < 6; i++) {
        const t = 0.1 + i * 0.15;
        const a = proj(v, ...subQuad(win, 0.06, 0, t, 0)[0]);
        const b = proj(v, ...subQuad(win, 0.94, 0, t + 0.08, 0)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.copperDark, 3));
        c.drawPath(segment(a[0], a[1] - 0.6, b[0], b[1] - 0.6), stroke(YARD.copper, 1.6));
      }
      faceFill(c, v, subQuad(q, 0, 1, 0.8, 0.88), YARD.hivis, 0.9);
      faceFill(c, v, subQuad(q, 0.76, 0.86, 0.3, 0.5), YARD.paper, 0.8);
    },
    onTop: (q) => {
      // the refractory rim and the mouth (cold: the dark lining; tilted: the melt)
      const cx = (q[0][0] + q[2][0]) / 2;
      const cy = (q[0][1] + q[2][1]) / 2;
      const z = q[0][2];
      const disc = (r: number) => discPath(v, [cx, cy, z], [1, 0, 0], [0, 1, 0], r);
      c.drawPath(disc(0.54), fill(YARD.steelDark));
      c.drawPath(disc(0.48), fill(YARD.refractory));
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        const a = proj(v, cx + Math.cos(t) * 0.36, cy + Math.sin(t) * 0.36, z);
        const b = proj(v, cx + Math.cos(t) * 0.47, cy + Math.sin(t) * 0.47, z);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.refractory, -0.3), 0.8));
      }
      const [mx, my] = proj(v, cx, cy, z);
      if (f === 'tilted') c.drawPath(disc(0.35), radial(mx, my, 0.4 * v.ppm, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.45, 1]));
      else c.drawPath(disc(0.35), fill(shade(YARD.refractory, -0.45)));
      c.drawPath(disc(0.35), stroke(INK, 0.9));
      c.drawPath(disc(0.54), stroke(INK, LINE_W));
      if (lidOn) {
        // the lid shut on the mouth, a heat seam round its edge
        const lid = discPath(v, [cx, cy, z + 0.08], [1, 0, 0], [0, 1, 0], 0.5);
        c.drawPath(discPath(v, [cx, cy, z + 0.02], [1, 0, 0], [0, 1, 0], 0.5), stroke(YARD.glowHot, 1.6, 0.9));
        c.drawPath(lid, fill(YARD.machineDark));
        c.drawPath(lid, stroke(INK, LINE_W));
        c.drawPath(discPath(v, [cx, cy, z + 0.08], [1, 0, 0], [0, 1, 0], 0.3), stroke(shade(YARD.machineDark, 0.25), 1));
        const [hx, hy] = proj(v, cx + 0.1, cy + 0.2, z + 0.1);
        c.drawPath(rrect(hx - 4, hy - 2, 9, 4, 2), fill(YARD.hivis));
        c.drawPath(rrect(hx - 4, hy - 2, 9, 4, 2), stroke(INK, 0.9));
      }
    },
  });
  // the spout on the east rim
  const p = (x: number, y: number, z: number) => proj(v, x, y, z);
  const s0 = p(0.6, -0.12, 1.34);
  const s1 = p(0.88, -0.05, 1.38);
  const s2 = p(0.88, 0.05, 1.38);
  const s3 = p(0.6, 0.12, 1.34);
  const spout = poly([s0[0], s0[1], s1[0], s1[1], s2[0], s2[1] + 3, s3[0], s3[1] + 3]);
  c.drawPath(spout, fill(YARD.steelDark));
  c.drawPath(spout, stroke(INK, 1));
  if (f === 'tilted') c.drawPath(segment(s0[0] + 2, s0[1] + 1.5, s1[0] - 1, s1[1] + 1.5), stroke(YARD.glowHot, 2.2));
}

/** The induction furnace in a frame; returns its pour lip in points round its anchor. */
export function drawInductionFurnace(c: SkCanvas, v: View3q, f: FurnaceFrame): [number, number] {
  const hot = f !== 'cold';
  const P = proj(v, ...IND.pivot);
  const deg = f === 'tilted' ? IND.tilt : 0;
  sunShadow(c, v, 1.8, 1.7, 1.6);
  plinth(c, v, 1.9, 1.8);
  // the swung lid's post at the north-west (fixed) and the lid aside when the mouth is open
  box(c, v, { len: 0.12, wid: 0.12, h: 1.62, ox: -0.86, oy: -0.66, z: 0.14, color: YARD.machineDark, line: 1 });
  if (!(f === 'hot')) {
    const [lx, ly] = proj(v, -0.98, -0.32, 1.72);
    const [ax, ay] = proj(v, -0.86, -0.66, 1.72);
    c.drawPath(segment(ax, ay, lx, ly), stroke(INK, 3.4));
    c.drawPath(segment(ax, ay, lx, ly), stroke(YARD.steel, 1.8));
    c.drawPath(oval(lx, ly, 6.5, 19), fill(shade(YARD.refractory, -0.15)));
    c.drawPath(oval(lx + 3, ly, 6.5, 19), fill(YARD.machineDark));
    c.drawPath(oval(lx + 3, ly, 6.5, 19), stroke(INK, LINE_W));
    c.drawPath(rrect(lx + 1, ly - 7, 4, 14, 2), fill(YARD.hivis));
    c.drawPath(rrect(lx + 1, ly - 7, 4, 14, 2), stroke(INK, 0.9));
  }
  // the north pivot post (behind the box)
  box(c, v, { len: 0.16, wid: 0.16, h: IND.pivot[2] - 0.14, ox: IND.pivot[0], oy: -0.58, z: 0.14, color: YARD.machineDark, line: 1 });
  // the tilting frame and the coil box
  turned(c, P, deg, () => {
    box(c, v, { len: 1.5, wid: 1.45, h: 0.12, ox: -0.02, z: 0.22, color: YARD.machineDark, line: 1 });
    inductionBody(c, v, f);
  });
  // the hydraulic ram at the west: up to the frame's south-west corner (out when tilted)
  {
    const foot = proj(v, -0.7, 0.62, 0.14);
    const top = rot(proj(v, -0.7, 0.62, 0.3), P, deg);
    c.drawPath(segment(foot[0], foot[1], top[0], top[1]), stroke(INK, 5.6));
    c.drawPath(segment(foot[0], foot[1], top[0], top[1]), stroke(YARD.machineDark, 3.8));
    const mid: [number, number] = [foot[0] + (top[0] - foot[0]) * 0.45, foot[1] + (top[1] - foot[1]) * 0.45];
    c.drawPath(segment(mid[0], mid[1], top[0], top[1]), stroke(YARD.galvanisedLight, 2));
  }
  // the south pivot post with its bearing block (in front)
  box(c, v, { len: 0.16, wid: 0.16, h: IND.pivot[2] - 0.14, ox: IND.pivot[0], oy: 0.58, z: 0.14, color: YARD.machineDark, line: 1 });
  box(c, v, { len: 0.26, wid: 0.2, h: 0.16, ox: IND.pivot[0], oy: 0.58, z: IND.pivot[2] - 0.1, color: YARD.machine, line: 1, bevel: true });
  // the fume hood over the mouth (fixed), the duct up into the roof
  fumeHood(c, v, -0.75, 0.95, -0.75, 0.6, 2.15, hot, 1.3);
  return rot(proj(v, ...IND.lip), P, deg);
}

// -------------------------------------------------------------------------------------------------------------------
// The rotary furnace: a drum on riding rings and rollers, burner west, door and salt-flux hatch east, tilted east
// -------------------------------------------------------------------------------------------------------------------

const ROT = { xw: -1.3, xe: 0.75, xn: 1.08, zc: 1.2, r: 0.72, pivot: [1.0, 0, 0.3] as V3, tilt: 14 };

function rotaryTilting(c: SkCanvas, v: View3q, f: FurnaceFrame): void {
  const { xw, xe, xn, zc, r } = ROT;
  const ppm = v.ppm;
  const cy = proj(v, 0, 0, zc)[1];
  const R = r * ppm;
  // the tilting frame
  box(c, v, { len: 2.75, wid: 1.5, h: 0.16, ox: -0.15, z: 0.14, color: YARD.machineDark, line: 1 });
  // the drive: motor and gearbox on the frame's north side under the girth gear
  box(c, v, { len: 0.55, wid: 0.36, h: 0.36, ox: -0.58, oy: -0.52, z: 0.3, color: YARD.machineLight, line: 1, bevel: true });
  // the burner at the west end: its box, sight glass, the gas train's valve
  box(c, v, { len: 0.3, wid: 0.5, h: 0.55, ox: xw - 0.14, oy: 0.0, z: zc - 0.3, color: YARD.machine, line: LINE_W, bevel: true });
  {
    const [gx, gy] = proj(v, xw - 0.14, 0.25, zc);
    c.drawPath(oval(gx, gy, 3.4, 3.4), fill(INK));
    c.drawPath(oval(gx, gy, 2.4, 2.4), fill(f === 'cold' ? YARD.glassDark : YARD.glowHot));
    const [vx, vy] = proj(v, xw - 0.3, 0.25, zc - 0.35);
    const [bx, by] = proj(v, xw - 0.3, 0.25, 0.3);
    c.drawPath(segment(vx, vy, bx, by), stroke(INK, 3.6));
    c.drawPath(segment(vx, vy, bx, by), stroke(YARD.steel, 2));
    c.drawPath(rrect(vx - 4, vy + 6, 8, 3, 1.5), fill(YARD.hivis));
    c.drawPath(rrect(vx - 4, vy + 6, 8, 3, 1.5), stroke(INK, 0.8));
  }
  // the drum (a round body: shaded top to bottom), its riding rings and girth gear
  const body = builder()
    .moveTo(xw * ppm, cy - R)
    .lineTo(xe * ppm, cy - R)
    .lineTo(xn * ppm, cy - R * 0.5)
    .lineTo(xn * ppm, cy + R * 0.5)
    .lineTo(xe * ppm, cy + R)
    .lineTo(xw * ppm, cy + R)
    .close()
    .build();
  c.drawPath(body, linear(0, cy - R, 0, cy + R, [shade(YARD.machine, 0.28), YARD.machine, YARD.machineDark, shade(YARD.machineDark, -0.25)], [0, 0.35, 0.75, 1]));
  c.drawPath(segment(xw * ppm + 3, cy - R * 0.62, xe * ppm - 2, cy - R * 0.62), stroke(shade(YARD.machine, 0.45), 1.2));
  c.drawPath(body, stroke(INK, LINE_W));
  // the west end's dished head (a hint of its round)
  c.drawPath(oval(xw * ppm, cy, R * 0.18, R), fill(shade(YARD.machineDark, -0.1)));
  c.drawPath(oval(xw * ppm, cy, R * 0.18, R), stroke(INK, LINE_W));
  for (const [x, wdt, col] of [
    [-0.88, 0.14, YARD.steel],
    [0.38, 0.14, YARD.steel],
    [-0.6, 0.08, YARD.steelDark],
  ] as [number, number, string][]) {
    const x0 = (x - wdt / 2) * ppm;
    const ring = rect(x0, cy - R - 2.5, wdt * ppm, R * 2 + 5);
    c.drawPath(ring, linear(0, cy - R, 0, cy + R, [YARD.galvanisedLight, col, shade(col, -0.3)]));
    c.drawPath(ring, stroke(INK, 1));
    if (col === YARD.steelDark) for (let i = 0; i < 6; i++) c.drawPath(segment(x0, cy + R - 2 - i * 4, x0 + wdt * ppm, cy + R - 2 - i * 4), stroke(INK, 0.6, 0.6));
  }
  // the salt-flux hatch on the nose (hinged, a hi-vis grip) and the rib along the nose
  {
    const x0 = (xe + 0.04) * ppm;
    const x1 = (xn - 0.06) * ppm;
    const y0 = cy - R * 0.92;
    const hatch = poly([x0, y0 + 2, x1, y0 + R * 0.32, x1, y0 + R * 0.32 + 7, x0, y0 + 9]);
    c.drawPath(hatch, fill(YARD.steel));
    c.drawPath(hatch, stroke(INK, 1));
    c.drawPath(rrect(x0 + 3, y0 + 3, 6, 3, 1.5), fill(YARD.hivis));
    c.drawPath(rrect(x0 + 3, y0 + 3, 6, 3, 1.5), stroke(INK, 0.8));
  }
  // the mouth: steel lip, refractory ring, the lining (cold, hot behind the door) or the melt (tilted)
  const mx = xn * ppm;
  c.drawPath(oval(mx, cy, 4.6, R * 0.5), fill(YARD.steelDark));
  c.drawPath(oval(mx + 0.6, cy, 3.6, R * 0.43), fill(YARD.refractory));
  if (f === 'tilted') c.drawPath(oval(mx + 1, cy + R * 0.08, 2.6, R * 0.3), radial(mx + 1, cy, R * 0.34, [YARD.glowWhite, YARD.glowHot, YARD.glow], [0, 0.45, 1]));
  else c.drawPath(oval(mx + 1, cy, 2.6, R * 0.3), fill(shade(YARD.refractory, -0.45)));
  c.drawPath(oval(mx, cy, 4.6, R * 0.5), stroke(INK, LINE_W));
  // the front rollers under the riding rings, in their bearing blocks
  for (const x of [-0.88, 0.38]) {
    box(c, v, { len: 0.36, wid: 0.2, h: 0.18, ox: x, oy: 0.55, z: 0.3, color: YARD.machine, line: 1, bevel: true });
    const [rx, ry] = proj(v, x, 0.62, 0.58);
    c.drawPath(oval(rx, ry, 6.5, 6.5), fill(YARD.steel));
    c.drawPath(oval(rx, ry, 6.5, 6.5), stroke(INK, 1.1));
    c.drawPath(oval(rx, ry, 2.4, 2.4), fill(YARD.galvanisedLight));
  }
}

/** The rotary furnace in a frame; returns its pour lip in points round its anchor. */
export function drawRotaryFurnace(c: SkCanvas, v: View3q, f: FurnaceFrame): [number, number] {
  const hot = f !== 'cold';
  const P = proj(v, ...ROT.pivot);
  const deg = f === 'tilted' ? ROT.tilt : 0;
  sunShadow(c, v, 2.9, 1.7, 2.0);
  plinth(c, v, 3.0, 1.85);
  // the door's post (fixed) at the south-east, and the tilt rams at the west end
  box(c, v, { len: 0.14, wid: 0.14, h: 1.9, ox: 1.38, oy: -0.62, z: 0.14, color: YARD.machineDark, line: 1 });
  turned(c, P, deg, () => rotaryTilting(c, v, f));
  for (const oy of [0.58]) {
    const foot = proj(v, -1.3, oy, 0.14);
    const top = rot(proj(v, -1.3, oy, 0.3), P, deg);
    c.drawPath(segment(foot[0], foot[1] + 1, top[0], top[1]), stroke(INK, 5.6));
    c.drawPath(segment(foot[0], foot[1] + 1, top[0], top[1]), stroke(YARD.machineDark, 3.8));
    if (deg) c.drawPath(segment(foot[0] + (top[0] - foot[0]) * 0.4, foot[1] + (top[1] - foot[1]) * 0.4, top[0], top[1]), stroke(YARD.galvanisedLight, 2));
  }
  // the charging door on its arm: shut over the mouth (cold, hot: a heat seam round it), swung aside to pour
  const mouth = rot(proj(v, ROT.xn, 0, ROT.zc), P, deg);
  const R = ROT.r * v.ppm;
  const [ax, ay] = proj(v, 1.38, -0.62, 1.82);
  if (f === 'tilted') {
    const [dx, dy] = proj(v, 1.42, 0.55, 1.25);
    c.drawPath(segment(ax, ay, dx, dy - 14), stroke(INK, 3.4));
    c.drawPath(segment(ax, ay, dx, dy - 14), stroke(YARD.steel, 1.8));
    c.drawPath(oval(dx, dy, 11, 15), fill(YARD.machineDark));
    c.drawPath(oval(dx, dy, 11, 15), stroke(INK, LINE_W));
    c.drawPath(oval(dx - 2, dy, 8, 11.5), fill(shade(YARD.refractory, -0.1)));
    c.drawPath(oval(dx - 2, dy, 8, 11.5), stroke(INK, 0.8));
  } else {
    const dx = mouth[0] + 5;
    const dy = mouth[1];
    c.drawPath(segment(ax, ay, dx + 1, dy - R * 0.4), stroke(INK, 3.4));
    c.drawPath(segment(ax, ay, dx + 1, dy - R * 0.4), stroke(YARD.steel, 1.8));
    if (hot) c.drawPath(oval(dx - 1, dy, 6, R * 0.56), stroke(YARD.glowHot, 1.8, 0.9));
    c.drawPath(oval(dx, dy, 5.4, R * 0.56), fill(YARD.machineDark));
    c.drawPath(oval(dx, dy, 5.4, R * 0.56), stroke(INK, LINE_W));
    c.drawPath(rrect(dx - 1.5, dy - 8, 3.5, 16, 1.5), fill(YARD.hivis));
    c.drawPath(rrect(dx - 1.5, dy - 8, 3.5, 16, 1.5), stroke(INK, 0.8));
  }
  // the fume hood over the mouth (fixed), the duct up into the roof
  fumeHood(c, v, 0.45, 1.65, -0.8, 0.6, 2.35, hot, 1.2);
  // the lip: the mouth's lower edge, tipped
  return rot(proj(v, ROT.xn + 0.04, 0, ROT.zc - ROT.r * 0.42), P, deg);
}

// -------------------------------------------------------------------------------------------------------------------
// The copper refining furnace: a tilting hearth on rockers, skimming door south, tuyeres north, taphole spout east
// -------------------------------------------------------------------------------------------------------------------

const CU = { pivot: [1.1, 0, 0.55] as V3, lip: [1.32, 0, 0.9] as V3, tilt: 16 };

function copperTilting(c: SkCanvas, v: View3q, f: FurnaceFrame): void {
  const hot = f !== 'cold';
  // the rockers (curved cradles) on the south side, then the shell
  for (const x of [-0.65, 0.6]) {
    const [rx, ry] = proj(v, x, 0.7, 0.5);
    const rr = 0.38 * v.ppm;
    const p = builder().addArc({ x: rx - rr, y: ry - rr * 0.9, width: rr * 2, height: rr * 1.6 }, 20, 140).close().build();
    c.drawPath(p, fill(YARD.steelDark));
    c.drawPath(p, stroke(INK, 1));
  }
  // the tuyere manifold along the north side (behind the shell's top)
  {
    const a = proj(v, -0.85, -0.85, 1.62);
    const b = proj(v, 0.75, -0.85, 1.62);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 4.4));
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.galvanised, 2.6));
  }
  box(c, v, {
    len: 2.2,
    wid: 1.5,
    h: 0.98,
    ox: 0,
    z: 0.48,
    color: YARD.steel,
    bevel: true,
    onFace: (q, n) => {
      if (n[1] < 0.9) return;
      // buckstays (I-beams) and the skimming door with its refractory frame and grip
      for (const s of [0.06, 0.28, 0.72, 0.94]) faceFill(c, v, subQuad(q, s - 0.025, s + 0.025, 0, 1), YARD.machineDark, 0.8);
      const door = subQuad(q, 0.38, 0.62, 0.18, 0.78);
      faceFill(c, v, subQuad(q, 0.35, 0.65, 0.12, 0.84), YARD.refractory, 0.9);
      if (hot) {
        const p = subQuad(q, 0.365, 0.635, 0.15, 0.81).map((pt) => proj(v, ...pt));
        c.drawPath(poly(p.flat()), stroke(YARD.glowHot, 1.6, 0.9));
      }
      faceFill(c, v, door, YARD.machineDark, LINE_W);
      faceFill(c, v, subQuad(door, 0.15, 0.85, 0.55, 0.68), YARD.hivis, 0.8);
      // the tie rod along the top
      const a = proj(v, ...subQuad(q, 0, 0, 0.92, 0)[0]);
      const b = proj(v, ...subQuad(q, 1, 0, 0.92, 0)[0]);
      c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.steelDark, 1.4));
    },
    onTop: (q) => {
      // the arched brick roof: courses across, joints staggered
      faceFill(c, v, subQuad(q, 0.03, 0.97, 0.06, 0.94), YARD.refractory, 0.8);
      for (let j = 1; j < 5; j++) {
        const a = proj(v, ...subQuad(q, 0.03, 0, j / 5, 0)[0]);
        const b = proj(v, ...subQuad(q, 0.97, 0, j / 5, 0)[0]);
        c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.refractory, -0.28), 0.8));
        for (let i = 0; i < 9; i++) {
          const s = 0.06 + i * 0.11 + (j % 2) * 0.055;
          const p0 = proj(v, ...subQuad(q, s, 0, (j - 1) / 5 + 0.02, 0)[0]);
          const p1 = proj(v, ...subQuad(q, s, 0, j / 5 - 0.02, 0)[0]);
          c.drawPath(segment(p0[0], p0[1], p1[0], p1[1]), stroke(shade(YARD.refractory, -0.28), 0.6));
        }
      }
      // the arch's crown line
      const a = proj(v, ...subQuad(q, 0.03, 0, 0.5, 0)[0]);
      const b = proj(v, ...subQuad(q, 0.97, 0, 0.5, 0)[0]);
      c.drawPath(segment(a[0], a[1] - 1.5, b[0], b[1] - 1.5), stroke(shade(YARD.refractory, 0.3), 1));
    },
  });
  // the tuyeres: short pipes from the manifold into the shell's north top edge
  for (const x of [-0.6, -0.1, 0.4]) {
    const a = proj(v, x, -0.85, 1.62);
    const b = proj(v, x, -0.7, 1.46);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(INK, 3.4));
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(YARD.galvanised, 1.8));
    c.drawPath(oval(a[0], a[1], 2.4, 2.4), fill(YARD.hivis));
    c.drawPath(oval(a[0], a[1], 2.4, 2.4), stroke(INK, 0.7));
  }
  // the flue on the roof (into the fixed hood above)
  box(c, v, { len: 0.36, wid: 0.36, h: 0.36, ox: -0.45, oy: -0.15, z: 1.46, color: YARD.steelDark, line: 1, bevel: true });
  // the burner at the west end with its sight glass
  box(c, v, { len: 0.22, wid: 0.44, h: 0.42, ox: -1.2, oy: 0.1, z: 0.8, color: YARD.machine, line: LINE_W, bevel: true });
  {
    const [gx, gy] = proj(v, -1.2, 0.33, 1.02);
    c.drawPath(oval(gx, gy, 3.2, 3.2), fill(INK));
    c.drawPath(oval(gx, gy, 2.2, 2.2), fill(hot ? YARD.glowHot : YARD.glassDark));
  }
  // the taphole spout east: a refractory block and its lip
  box(c, v, { len: 0.24, wid: 0.3, h: 0.2, ox: 1.2, oy: 0.0, z: 0.82, color: YARD.refractory, line: 1, bevel: true });
  const l0 = proj(v, 1.22, 0, 1.02);
  const l1 = proj(v, CU.lip[0], 0, CU.lip[2]);
  c.drawPath(poly([l0[0] - 3, l0[1] - 1, l1[0], l1[1] - 2, l1[0], l1[1] + 2.5, l0[0] - 3, l0[1] + 4]), fill(YARD.steelDark));
  c.drawPath(poly([l0[0] - 3, l0[1] - 1, l1[0], l1[1] - 2, l1[0], l1[1] + 2.5, l0[0] - 3, l0[1] + 4]), stroke(INK, 1));
  if (f === 'tilted') c.drawPath(segment(l0[0] - 1, l0[1] + 1.4, l1[0] - 1, l1[1] + 0.4), stroke(YARD.glowHot, 2.2));
}

/** The copper refining furnace in a frame; returns its pour lip in points round its anchor. */
export function drawCopperFurnace(c: SkCanvas, v: View3q, f: FurnaceFrame): [number, number] {
  const hot = f !== 'cold';
  const P = proj(v, ...CU.pivot);
  const deg = f === 'tilted' ? CU.tilt : 0;
  sunShadow(c, v, 2.5, 1.7, 1.8);
  plinth(c, v, 2.6, 1.85);
  // the rails the rockers roll on
  for (const x of [-0.65, 0.6]) box(c, v, { len: 0.7, wid: 0.18, h: 0.12, ox: x, oy: 0.7, z: 0.14, color: YARD.steel, line: 1, bevel: true });
  turned(c, P, deg, () => copperTilting(c, v, f));
  // the fume hood over the flue (fixed), the duct up into the roof
  fumeHood(c, v, -1.05, 0.25, -0.75, 0.45, 2.05, hot, 1.3);
  return rot(proj(v, ...CU.lip), P, deg);
}

/** A hall's furnace in a frame (cold 0, hot 1, tilted 2); returns its pour lip in points round its anchor. */
export function drawHallFurnace(c: SkCanvas, v: View3q, kind: HallKind, frame: number): [number, number] {
  const f = FURNACE_FRAMES[Math.max(0, Math.min(2, frame))];
  if (kind === 'induction') return drawInductionFurnace(c, v, f);
  if (kind === 'rotary') return drawRotaryFurnace(c, v, f);
  return drawCopperFurnace(c, v, f);
}

/** The tilted furnace's lip in points round the furnace's anchor, without drawing (the same geometry). */
export function furnaceLip(v: View3q, kind: HallKind): [number, number] {
  if (kind === 'induction') return rot(proj(v, ...IND.lip), proj(v, ...IND.pivot), IND.tilt);
  if (kind === 'rotary') return rot(proj(v, ROT.xn + 0.04, 0, ROT.zc - ROT.r * 0.42), proj(v, ...ROT.pivot), ROT.tilt);
  return rot(proj(v, ...CU.lip), proj(v, ...CU.pivot), CU.tilt);
}

// -------------------------------------------------------------------------------------------------------------------
// The glow (over the furnace, its anchor)
// -------------------------------------------------------------------------------------------------------------------

/**
 * The heat's light over a hall's furnace, frame 0 or 1 (they alternate; reduced motion holds frame 0): a warm pool on
 * the floor south of it, a halo at the heat's own place, a little shimmer. Heat colours only, all of it near the furnace.
 */
export function drawHallGlow(c: SkCanvas, v: View3q, kind: HallKind, frame: number): void {
  const k = frame ? 1 : 0;
  const pool = (x: number, y: number, rx: number) => {
    const [gx, gy] = proj(v, x, y, 0);
    c.drawPath(oval(gx, gy, rx * v.ppm, rx * 0.55 * v.ppm * v.tilt), radial(gx, gy, rx * v.ppm, [`rgba(255,176,80,${0.3 + k * 0.08})`, 'rgba(255,190,90,0)']));
  };
  if (kind === 'induction') {
    pool(0.3, 0.7, 1.4 + k * 0.1);
    const [mx, my] = proj(v, 0, 0, 1.5);
    halo(c, mx, my, 26 + k * 3, 13 + k * 2, YARD.glowHot, 0.5 + k * 0.12);
    shimmer(c, mx, my - 8, frame);
  } else if (kind === 'rotary') {
    pool(1.0, 0.8, 1.6 + k * 0.12);
    const [dx, dy] = proj(v, ROT.xn + 0.1, 0, ROT.zc);
    halo(c, dx, dy, 18 + k * 3, 26 + k * 3, YARD.glowHot, 0.5 + k * 0.12);
    const [bx, by] = proj(v, ROT.xw - 0.14, 0.25, ROT.zc);
    halo(c, bx, by, 7 + k, 7 + k, YARD.glowHot, 0.55);
    shimmer(c, dx - 2, dy - 30, frame, 2, 8);
  } else {
    pool(0.2, 0.95, 1.5 + k * 0.12);
    const [sx, sy] = proj(v, 0, 0.75, 0.95);
    halo(c, sx, sy, 22 + k * 3, 16 + k * 2, YARD.glowHot, 0.5 + k * 0.12);
    const [tx, ty] = proj(v, 1.25, 0, 0.95);
    halo(c, tx, ty, 9 + k, 7 + k, YARD.glowHot, 0.5);
    const [fx, fy] = proj(v, -0.45, -0.15, 1.85);
    shimmer(c, fx, fy, frame, 2, 6);
  }
}

// -------------------------------------------------------------------------------------------------------------------
// The pour: launder, falls, droplets and the hall's furnace hand (anchored at the apron's point)
// -------------------------------------------------------------------------------------------------------------------

/** The hall's own furnace hand (a crew body in a yard hand's vest, the yellow hat under the shield). */
const HAND_LOOK = crewLook(YARD.vestYardHand, 3);

/**
 * A hall's pour, frame 0..2 (alternating): the fall from the furnace's tipped lip into the launder's head, the metal down
 * the launder (on two trestles) to its end over the mould row, the drop into the cavity at (HALL_POUR.pour, 0, POUR_Z),
 * droplets off the splash, and the hall's furnace hand west of the mould in face shield and aluminised apron, lit by the
 * pour. Anchor: the apron's point.
 */
export function drawHallStream(c: SkCanvas, v: View3q, kind: HallKind, frame: number): void {
  const L = HALL_POUR[kind];
  const [fx, fy] = L.furnace;
  const px = L.pour;
  const ppm = v.ppm;
  const lip0 = furnaceLip(v, kind);
  const [ox, oy] = proj(v, fx, fy, 0);
  const lip: [number, number] = [lip0[0] + ox, lip0[1] + oy];
  // the launder's head: world point under the lip (a little south of the furnace's middle line), 0.4 m below it
  const hy = fy + 0.25;
  const hx = lip[0] / ppm;
  const hz = (hy * v.tilt * ppm - (lip[1] + 0.4 * ppm * v.lift)) / (v.lift * ppm);
  const head: V3 = [hx, hy, hz];
  const end: V3 = [px, -0.16, 0.46];
  const at = (t: number): V3 => [head[0] + (end[0] - head[0]) * t, head[1] + (end[1] - head[1]) * t, head[2] + (end[2] - head[2]) * t];
  const wob = frame === 1 ? 0.6 : frame === 2 ? -0.5 : 0;
  // the furnace hand (behind the drop: west of the mould, facing east), his shadow, lit warm by the pour
  const [dx, dy] = proj(v, px, 0, POUR_Z);
  const [hxp, hyp] = proj(v, px - 0.95, 0.3, 0);
  lit(c, dx, dy - 10, 50, YARD.glowHot, 0.5, () => {
    c.save();
    c.translate(hxp, hyp);
    drawPerson(c, v, { dir: 'e', pose: 'pour', look: HAND_LOOK, shield: true, apron: true, shadow: true });
    // the tilt pendant in his hands (a hi-vis control box on its cable)
    c.drawPath(rrect(8, -36, 6, 8, 1.5), fill(YARD.hivis));
    c.drawPath(rrect(8, -36, 6, 8, 1.5), stroke(INK, 0.9));
    c.drawPath(builder().moveTo(11, -28).quadTo(9, -18, 3, -16).build(), stroke(INK, 1));
    c.restore();
  });
  // the trestles under the launder (steel legs to the ground)
  for (const t of [0.35, 0.82]) {
    const q = at(t);
    const a = proj(v, q[0], q[1], q[2] - 0.06);
    const b = proj(v, q[0], q[1], 0);
    for (const s of [-4, 4]) {
      c.drawPath(segment(a[0] + s * 0.4, a[1], b[0] + s, b[1]), stroke(INK, 2.8));
      c.drawPath(segment(a[0] + s * 0.4, a[1], b[0] + s, b[1]), stroke(YARD.steel, 1.4));
    }
    c.drawPath(segment(b[0] - 6, b[1], b[0] + 6, b[1]), stroke(INK, 1.6));
  }
  // the launder: a steel trough lined with refractory, the metal running in it
  const h0 = proj(v, ...head);
  const e0 = proj(v, ...end);
  const tr = builder().moveTo(h0[0], h0[1]).lineTo(e0[0], e0[1]).build();
  c.drawPath(tr, stroke(INK, 9.4));
  c.drawPath(tr, stroke(YARD.steel, 7.4));
  c.drawPath(builder().moveTo(h0[0], h0[1] + 2).lineTo(e0[0], e0[1] + 2).build(), stroke(YARD.steelDark, 2.6));
  c.drawPath(builder().moveTo(h0[0], h0[1] - 1.5).lineTo(e0[0], e0[1] - 1.5).build(), stroke(YARD.refractory, 4.4));
  c.drawPath(builder().moveTo(h0[0], h0[1] - 1.5).lineTo(e0[0], e0[1] - 1.5).build(), stroke(YARD.glow, 2.8));
  c.drawPath(builder().moveTo(h0[0], h0[1] - 1.8).lineTo(e0[0], e0[1] - 1.8).build(), stroke(YARD.glowHot, 1.5));
  // a bright ripple down the launder that moves frame to frame
  {
    const t0 = 0.15 + frame * 0.25;
    const a = proj(v, ...at(t0));
    const b = proj(v, ...at(t0 + 0.12));
    c.drawPath(segment(a[0], a[1] - 1.8, b[0], b[1] - 1.8), stroke(YARD.glowWhite, 1.2));
  }
  // the fall from the lip into the launder's head
  fall(c, lip[0], lip[1] + 1, h0[0], h0[1] - 2, 7.5, 5, wob);
  c.drawPath(oval(h0[0], h0[1] - 2, 6, 2.6), radial(h0[0], h0[1] - 2, 8, [YARD.glowWhite, rgba(YARD.glowHot, 0)]));
  // the drop from the launder's end into the mould
  fall(c, e0[0] + 1, e0[1] + 1, dx, dy, 6, 3.8, wob * 0.8);
  c.drawPath(oval(dx, dy, 9, 3.6), radial(dx, dy, 11, [YARD.glowWhite, rgba(YARD.glowHot, 0)]));
  droplets(c, dx, dy, 11 + frame, 6, 20);
  droplets(c, h0[0], h0[1] - 2, 21 + frame, 3, 10);
}
