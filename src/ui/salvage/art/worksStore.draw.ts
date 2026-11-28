/**
 * The works' storage (stage 2, sheet C; ART-STORE, PLAN2 2.7, s2c-plan-world 1.2): a works bunker of lock blocks, the
 * heaps of the four grades a sold flow brings to a bunker (bronze solids, stainless 304, mixed stainless, shredded steel),
 * a works stillage's layers (bronze ingot, fire-refined copper ingot, bronze dross), the zinc filter dust in big bags on a
 * pallet, and the three roofs (the lean-to over the covered bunkers, the works stillages' roof, the first yard's stillage
 * block's roof from the works' opening).
 *
 * Drawn as the first yard's bays are (site.draw.ts drawBlock, drawBayWalls, drawCodePlate, drawStillageLayer; heaps.draw.ts
 * drawBayHeapLevel): the same lock block, ink line, three-tone faces, low west sun and palette families, so a works bunker
 * stands in the same yard as the first yard's bays. Every drawing is round its ANCHOR (the footprint's centre on the
 * ground) in pen.VIEW at TRUE size; the manifest part (manifest/worksStore.ts) bakes them smaller. No words: the bunker
 * carries a BLANK code plate (the caller paints a sold grade's code in the `code` slot; a bunker whose grade is not sold
 * stays blank), nothing here names, draws or hints at a grade that is not sold. Pure Skia; nothing here is read by the
 * first yard.
 */
import { ClipOp, type SkCanvas } from '@shopify/react-native-skia';
import { LINE_W, METAL, YARD, mix, shade } from './palette';
import { box, boxShadow, builder, faceFill, fill, groundShadow, hash01, oval, poly, proj, rect, rrect, segment, stroke, subQuad, type V3, type View3q } from './pen';
import { drawBlock, drawCodePlate, drawPallet } from './site.draw';
import { drawIngot } from './scrap.draw';

const INK = YARD.ink;
const BZ = METAL.bronze;
const SS = METAL.stainless;
/** Verdigris: bronze's patina mark (small flecks, never a whole surface). */
const PATINA = '#6F927C';

// ---------------------------------------------------------------------------------------------------------------------
// The bunker: one 3 m lock-block bunker of the works' row (eleven side by side, x -35 to -2), open south as the first
// yard's bays. Back wall three blocks long and two high along the north edge; a divider on each side ON the bunker's
// edge (x = +-1.5: the neighbour's divider is drawn at the same place, with the same seeds, so a row of bunkers shows one
// divider between two bunkers), two blocks high at the back stepping down to one at the front. A worn floor between them.
// ---------------------------------------------------------------------------------------------------------------------

/** The bunker's measures, metres round its anchor (the world sorts it by its south edge, y = +1.5). */
export const BUNKER = { w: 3, d: 3, block: 0.8, course: 0.6, backY: -1.1, faceY: -0.7, inner: 1.1 } as const;

/** Where the bunker's code plate hangs (points round the anchor, true size): the back wall's top course, centred. */
export const bunkerPlate = (v: View3q): [number, number] => proj(v, 0, BUNKER.faceY, BUNKER.course * 1.55);

/** Draws one works bunker, empty (no frame names a grade: the heap is its own sprite, the plate is blank). */
export function drawBunker(c: SkCanvas, v: View3q): void {
  const { block: b, course, backY, faceY, inner } = BUNKER;
  // the shadows first: the back wall's and each divider's, swept east by the low sun
  boxShadow(c, v, 3 + b, b, 0, backY, course * 2);
  for (const sx of [-1.5, 1.5]) boxShadow(c, v, b, 2 * b, sx, backY + b / 2, course * 2);
  // the floor: worn concrete between the dividers, scuffed by the loader's bucket (no stray pieces: an empty bunker is empty)
  const floor: V3[] = [[-inner, faceY, 0], [inner, faceY, 0], [inner, 1.45, 0], [-inner, 1.45, 0]];
  faceFill(c, v, floor, shade(YARD.concrete, -0.07));
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + i * 0.17;
    const a = proj(v, -inner + 0.25 + hash01(41, i) * 0.3, faceY + (1.45 - faceY) * t, 0);
    const e = proj(v, inner - 0.25 - hash01(43, i) * 0.4, faceY + (1.45 - faceY) * (t + 0.05), 0);
    c.drawPath(segment(a[0], a[1], e[0], e[1]), stroke(YARD.concreteDark, 0.9, 0.7));
  }
  // the blocks back to front (no east or west face shows in the view: the row's order is the north-south order)
  const blocks: { x: number; y: number; z: number; seed: number }[] = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) blocks.push({ x: (i - 1) * b, y: backY, z: k * course, seed: 11 + i * 3 + k });
  // a divider's seeds depend only on its place in the divider, so both bunkers that share it draw the same pixels
  for (const sx of [-1.5, 1.5])
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < (j < 2 ? 2 : 1); k++) blocks.push({ x: sx, y: backY + j * b, z: k * course, seed: 31 + j * 2 + k });
  blocks.sort((p, q) => p.y - q.y || p.z - q.z);
  for (const k of blocks) drawBlock(c, v, { ox: k.x, oy: k.y, z: k.z, seed: k.seed, shadow: false });
  // the blank enamel code plate on the back wall's top course (the caller paints a sold grade's code in the slot)
  const [px, py] = bunkerPlate(v);
  c.save();
  c.translate(px, py);
  drawCodePlate(c);
  c.restore();
}

// ---------------------------------------------------------------------------------------------------------------------
// The heaps in a bunker: one grade's own pieces piled against the back wall between the dividers (drawn after the
// bunker at the bunker's anchor), 'part' low against the back wall, 'full' up to the wall's top and out towards the front.
// ---------------------------------------------------------------------------------------------------------------------

/** The four grades a SOLD flow brings to a works bunker at stage 2 (content `worksLayer.grades.<id>.bay`). */
export const BUNKER_HEAPS = ['bzs', 'ss', 'ssu', 'shred'] as const;
export type BunkerHeap = (typeof BUNKER_HEAPS)[number];

/** The gaps' tone of a grade's mound. */
function moundOf(g: BunkerHeap): string {
  switch (g) {
    case 'bzs':
      return shade(BZ.dark, -0.18);
    case 'ss':
      return shade(SS.dark, -0.05);
    case 'ssu':
      return mix(SS.dark, YARD.steelDark, 0.55);
    case 'shred':
      return mix(YARD.steelDark, YARD.rust, 0.32);
  }
}

/** A bronze piece of the solids grade: a bushing, a valve body, a bearing shell, a propeller's blade tip. */
function bronzePiece(c: SkCanvas, x: number, y: number, s: number, turn: number, seed: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const kind = Math.floor(hash01(seed, 5) * 4);
  if (kind === 0) {
    // a bushing: a thick short tube, its bore dark
    const w = s * 0.55;
    const h = s * 0.36;
    c.drawPath(rect(-w / 2, -h / 2, w, h), fill(BZ.base));
    c.drawPath(rect(-w / 2, -h / 2, w, h * 0.3), fill(BZ.light));
    c.drawPath(builder().moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).moveTo(-w / 2, h / 2).lineTo(w / 2, h / 2).build(), stroke(INK, 0.9));
    c.drawPath(oval(-w / 2, 0, h * 0.26, h / 2), fill(BZ.dark));
    c.drawPath(oval(w / 2, 0, h * 0.26, h / 2), fill(BZ.light));
    c.drawPath(oval(w / 2, 0, h * 0.13, h * 0.26), fill(shade(BZ.dark, -0.4)));
    c.drawPath(oval(w / 2, 0, h * 0.26, h / 2), stroke(INK, 0.9));
  } else if (kind === 1) {
    // a valve body: a round belly with a flange at each end and a bonnet boss
    const r = s * 0.24;
    c.drawPath(rect(-s * 0.42, -r * 0.55, s * 0.84, r * 1.1), fill(BZ.dark));
    for (const fx of [-s * 0.42, s * 0.36]) {
      c.drawPath(rect(fx, -r, s * 0.07, r * 2), fill(BZ.base));
      c.drawPath(rect(fx, -r, s * 0.07, r * 2), stroke(INK, 0.8));
    }
    c.drawPath(oval(0, 0, r, r * 0.92), fill(BZ.base));
    c.drawPath(oval(-r * 0.3, -r * 0.35, r * 0.45, r * 0.3), fill(BZ.light));
    c.drawPath(oval(0, 0, r, r * 0.92), stroke(INK, 0.9));
    c.drawPath(rect(-r * 0.3, -r * 1.55, r * 0.6, r * 0.7), fill(BZ.base));
    c.drawPath(rect(-r * 0.3, -r * 1.55, r * 0.6, r * 0.7), stroke(INK, 0.8));
  } else if (kind === 2) {
    // a bearing shell: half a thick ring
    const p = builder().moveTo(-s * 0.36, 0).quadTo(0, -s * 0.5, s * 0.36, 0).build();
    c.drawPath(p, stroke(INK, s * 0.2 + 1.6));
    c.drawPath(p, stroke(BZ.base, s * 0.2));
    c.drawPath(builder().moveTo(-s * 0.3, -s * 0.06).quadTo(0, -s * 0.4, s * 0.3, -s * 0.06).build(), stroke(BZ.light, 1));
  } else {
    // a propeller blade's tip, cut off: a broad leaf with a bright cut edge
    const p = builder().moveTo(-s * 0.45, s * 0.1).quadTo(-s * 0.1, -s * 0.38, s * 0.42, -s * 0.12).quadTo(s * 0.1, s * 0.22, -s * 0.45, s * 0.1).close().build();
    c.drawPath(p, fill(BZ.base));
    c.drawPath(builder().moveTo(-s * 0.4, s * 0.04).quadTo(-s * 0.05, -s * 0.3, s * 0.38, -s * 0.12).build(), stroke(BZ.light, 1.2));
    c.drawPath(p, stroke(INK, 0.9));
    c.drawPath(segment(-s * 0.45, s * 0.1, -s * 0.38, -s * 0.06), stroke(YARD.copperSheen, 1.4));
  }
  // the patina mark: two small verdigris flecks
  c.drawCircle(-s * 0.12, s * 0.02, Math.max(0.8, s * 0.05), fill(PATINA, 0.9));
  c.drawCircle(s * 0.1, -s * 0.06, Math.max(0.6, s * 0.035), fill(PATINA, 0.9));
  c.restore();
}

/** The brushed mark of stainless: three short fine light strokes along a piece. */
function brushed(c: SkCanvas, x: number, y: number, w: number): void {
  for (let i = 0; i < 3; i++) c.drawPath(segment(x - w * 0.4 + i * 1.2, y - 1.6 + i * 1.6, x + w * 0.3 + i * 1.2, y - 1.6 + i * 1.6), stroke(SS.light, 0.7, 0.9));
}

/** A stainless piece: a sink, a cut plate, a tube offcut, and (mixed stainless) a pan, cutlery, a fitting with a hose stub. */
function stainlessPiece(c: SkCanvas, x: number, y: number, s: number, turn: number, seed: number, mixed: boolean): void {
  c.save();
  c.translate(x, y);
  c.rotate(turn, 0, 0);
  const kind = Math.floor(hash01(seed, 6) * (mixed ? 6 : 3));
  const base = mixed && hash01(seed, 8) > 0.6 ? shade(SS.base, -0.12) : SS.base;
  if (kind === 0) {
    // a sink: a rim round a deep bowl, its drain
    const w = s * 0.62;
    const h = s * 0.42;
    c.drawPath(rrect(-w / 2, -h / 2, w, h, 2), fill(SS.light));
    c.drawPath(rrect(-w / 2 + 2.2, -h / 2 + 2, w - 4.4, h - 4, 2), fill(SS.dark));
    c.drawPath(rrect(-w / 2 + 2.2, -h / 2 + 2, w - 4.4, (h - 4) * 0.35, 2), fill(shade(SS.dark, -0.18)));
    c.drawCircle(w * 0.1, h * 0.08, 1.2, fill(INK));
    c.drawPath(rrect(-w / 2, -h / 2, w, h, 2), stroke(INK, 0.9));
  } else if (kind === 1 || kind === 4) {
    // a cut plate (or, mixed, a bent sheet with a weld seam)
    const w = s * 0.6;
    const h = s * 0.3;
    const p = poly([-w / 2, h / 2, w / 2 - 2, h / 2, w / 2, -h / 2, -w / 2 + 2, -h / 2]);
    c.drawPath(p, fill(base));
    brushed(c, 0, 0, w);
    if (kind === 4) c.drawPath(segment(-w * 0.1, -h / 2 + 1, -w * 0.05, h / 2 - 1), stroke('#8C7B5E', 1.2));
    c.drawPath(p, stroke(INK, 0.9));
  } else if (kind === 2) {
    // a tube offcut with its bright cut end
    const w = s * 0.62;
    const h = s * 0.16;
    c.drawPath(rect(-w / 2, -h / 2, w, h), fill(base));
    c.drawPath(rect(-w / 2, -h / 2, w, h * 0.35), fill(SS.light));
    c.drawPath(builder().moveTo(-w / 2, -h / 2).lineTo(w / 2, -h / 2).moveTo(-w / 2, h / 2).lineTo(w / 2, h / 2).build(), stroke(INK, 0.9));
    c.drawPath(oval(w / 2, 0, h * 0.3, h / 2), fill('#FFFFFF'));
    c.drawPath(oval(w / 2, 0, h * 0.14, h * 0.26), fill(SS.dark));
    c.drawPath(oval(w / 2, 0, h * 0.3, h / 2), stroke(INK, 0.8));
  } else if (kind === 3) {
    // a dented pan with its handle
    const r = s * 0.24;
    c.drawPath(segment(r * 0.8, 0, r * 2.1, -r * 0.3), stroke(INK, 3.2));
    c.drawPath(segment(r * 0.8, 0, r * 2.1, -r * 0.3), stroke(SS.base, 1.8));
    c.drawPath(oval(0, 0, r, r * 0.7), fill(SS.light));
    c.drawPath(oval(0.6, 0.5, r * 0.72, r * 0.48), fill(SS.dark));
    c.drawPath(oval(0, 0, r, r * 0.7), stroke(INK, 0.9));
  } else {
    // a fitting with a black hose stub still on it (mixed: not yet prepared)
    const w = s * 0.42;
    const h = s * 0.14;
    c.drawPath(rect(-w / 2, -h / 2, w, h), fill(base));
    c.drawPath(rect(-w / 2, -h / 2, w, h), stroke(INK, 0.8));
    c.drawPath(rrect(w / 2 - 1, -h * 0.65, w * 0.55, h * 1.3, h * 0.5), fill(YARD.pvc));
    c.drawPath(rrect(w / 2 - 1, -h * 0.65, w * 0.55, h * 1.3, h * 0.5), stroke(INK, 0.8));
  }
  c.restore();
}

/** A fist-sized piece of shredded steel: a torn, folded lump, steel grey or rust brown, now and then a fleck of old paint. */
function shredPiece(c: SkCanvas, x: number, y: number, s: number, seed: number): void {
  const n = 5 + Math.floor(hash01(seed, 1) * 3);
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash01(seed, 2) * 3;
    const r = s * (0.32 + hash01(seed, i, 3) * 0.24);
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.72);
  }
  const tones = [YARD.steel, shade(YARD.steel, 0.14), mix(YARD.steel, YARD.rust, 0.45), YARD.steelDark, mix(METAL.light_iron.base, YARD.rust, 0.25)];
  const col = tones[Math.floor(hash01(seed, 4) * tones.length)];
  const p = poly(pts);
  c.drawPath(p, fill(col));
  // the fold: a lighter facet on the west, catching the low sun
  c.drawPath(poly([pts[0], pts[1], x, y, pts[pts.length - 2], pts[pts.length - 1]]), fill(shade(col, 0.2)));
  c.drawPath(p, stroke(INK, 0.7));
  const f = hash01(seed, 9);
  if (f > 0.86) c.drawCircle(x + s * 0.08, y - s * 0.05, Math.max(0.7, s * 0.09), fill(f > 0.93 ? YARD.crateBlue : YARD.skip));
}

/**
 * A works bunker's heap of one grade, 'part' (frame 0) or 'full' (1), at the bunker's anchor: a lumpy mound against the
 * back wall between the dividers, its pieces the grade's own, sorted back to front; the low sun on its west shoulder.
 */
export function drawBunkerHeap(c: SkCanvas, v: View3q, g: BunkerHeap, full: boolean): void {
  const seed = 7 + BUNKER_HEAPS.indexOf(g) * 13;
  const hw = full ? 1.02 : 0.78;
  const y0 = BUNKER.faceY;
  const y1 = full ? 1.25 : 0.55;
  const hM = full ? 1.08 : 0.58;
  const W = hw * v.ppm;
  const [, yBack] = proj(v, 0, y0, 0);
  const [, yFront] = proj(v, 0, y1, 0);
  const H = hM * v.ppm * v.lift;
  const crest = yBack + (yFront - yBack) * 0.28;
  // its shade on the floor, east of it (the sun from the west)
  groundShadow(c, v, hw * 0.9, (y1 - y0) / 2, 0.22, (y0 + y1) / 2 + 0.05, hM * 0.5);
  // the mound: a lumpy ridge whose crest lies near the back wall and slopes to the front
  const pts: number[] = [];
  const n = 13;
  for (let i = 0; i <= n; i++) {
    const a = i / n;
    const bump = 0.84 + hash01(seed, i, full ? 2 : 1) * 0.28;
    pts.push(-W + 2 * W * a, crest - H * Math.sin(Math.PI * a) ** 0.7 * bump);
  }
  pts.push(W * 0.92, yFront - 2, W * 0.5, yFront + 2, 0, yFront + 3, -W * 0.5, yFront + 2, -W * 0.92, yFront - 2);
  const mound = poly(pts);
  const tone = moundOf(g);
  c.drawPath(mound, fill(tone));
  c.save();
  c.clipPath(mound, ClipOp.Intersect, true);
  c.drawPath(oval(-W * 0.4, crest - H * 0.7, W * 0.7, H * 0.7 + 6), fill(shade(tone, 0.24)));
  c.drawPath(oval(W * 0.75, (crest + yFront) / 2, W * 0.5, H + 8), fill(shade(tone, -0.3), 0.55));
  c.restore();
  c.drawPath(mound, stroke(INK, 1));
  // the pieces: by the heap's size, inside the dome, back to front
  const count = g === 'shred' ? (full ? 150 : 70) : full ? 46 : 22;
  const items: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const u = hash01(seed, i, 21) * 2 - 1;
    const dome = Math.sin((Math.PI * (u + 1)) / 2) ** 0.7;
    const top = crest - H * dome * 0.9;
    const bot = yFront - 1;
    const y = top + 2 + (bot - top - 2) * hash01(seed, i, 22) ** 1.6;
    items.push([u * W * 0.9, y, i]);
  }
  items.sort((p, q) => p[1] - q[1]);
  for (const [x, y, i] of items) {
    const turn = (hash01(seed, i, 24) - 0.5) * 70;
    const sz = (0.85 + hash01(seed, i, 23) * 0.35) * (v.ppm / 40);
    if (g === 'bzs') bronzePiece(c, x, y, 17 * sz, turn, seed * 31 + i);
    else if (g === 'shred') shredPiece(c, x, y, 7.5 * sz, seed * 17 + i);
    else stainlessPiece(c, x, y, 18 * sz, turn, seed * 29 + i, g === 'ssu');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The works stillages' layers (laid over the first yard's plant.stillage cage at one anchor, as plant.stillage.layer.*:
// the cage, one or two layers, the front rails): bronze ingots, fire-refined copper ingots, bronze dross.
// ---------------------------------------------------------------------------------------------------------------------

export const WORKS_LAYERS = ['bzi', 'cui', 'bzd'] as const;
export type WorksLayer = (typeof WORKS_LAYERS)[number];

/** The steel strap round two courses at x = sx (a stillage of ingots is strapped, never a pyramid of bars). */
function strap(c: SkCanvas, v: View3q, sx: number, z0: number, z1: number, wy: number): void {
  const a = proj(v, sx, -wy, z1);
  const b = proj(v, sx, wy, z1);
  const d = proj(v, sx, wy, z0);
  const p = builder().moveTo(a[0], a[1]).lineTo(b[0], b[1]).lineTo(d[0], d[1]).build();
  c.drawPath(p, stroke(INK, 2.4));
  c.drawPath(p, stroke(YARD.galvanisedLight, 1.1));
}

/** One layer of a works stillage grade (no front), anchored at the stillage's footprint centre. */
export function drawWorksLayer(c: SkCanvas, v: View3q, g: WorksLayer): void {
  if (g === 'bzi') {
    // bronze ingots: short notched bars, two courses of three rows of two, strapped; verdigris flecks on the tops
    for (let k = 0; k < 2; k++) {
      const z = 0.14 + k * 0.1;
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 2; i++) {
          const ox = (i - 0.5) * 0.5;
          const oy = (r - 1) * 0.24 + (k ? 0.04 : 0);
          drawIngot(c, v, 'bronze', 99, { ox, oy, z, shadow: false });
          if (k === 1) {
            const [fx, fy] = proj(v, ox - 0.12 + r * 0.05, oy, z + 0.1);
            c.drawCircle(fx, fy, 0.9, fill(PATINA));
          }
        }
    }
    for (const sx of [-0.25, 0.25]) strap(c, v, sx, 0.14, 0.34, 0.36);
    return;
  }
  if (g === 'cui') {
    // fire-refined copper: long bars (as the refinery casts them), four rows a course, two courses, strapped twice
    for (let k = 0; k < 2; k++) {
      const z = 0.14 + k * 0.1;
      for (let r = 0; r < 4; r++) drawIngot(c, v, 'copper', 99, { ox: k ? 0.03 : 0, oy: (r - 1.5) * 0.21 + (k ? 0.03 : 0), z, len: 0.92, shadow: false });
    }
    for (const sx of [-0.3, 0.3]) strap(c, v, sx, 0.14, 0.34, 0.42);
    return;
  }
  // bronze dross: skimmed lumps, dark olive with a grey oxide skin and a bronze glint here and there
  const n = 12;
  const { len, wid } = { len: 1.2, wid: 1.0 };
  for (let i = 0; i < n; i++) {
    const s = hash01(83, i, 1);
    const t = hash01(83, i, 2);
    const z = 0.14 + 0.26 * (i / n);
    const [x, y] = proj(v, (s - 0.5) * (len - 0.32), (t - 0.5) * (wid - 0.36), z);
    const sz = 15;
    const b = builder().moveTo(x - sz * 0.42, y + 1);
    for (let j = 0; j < 6; j++) b.lineTo(x - sz * 0.42 + (sz * 0.84 * (j + 0.5)) / 6, y - sz * (0.14 + hash01(i, j, 5) * 0.26));
    b.lineTo(x + sz * 0.42, y + 1).close();
    const lump = b.build();
    c.drawPath(lump, fill(i % 2 ? '#6E5E38' : '#5B4D2D'));
    c.drawPath(oval(x - sz * 0.1, y - sz * 0.16, sz * 0.2, sz * 0.07), fill('#8E8A80', 0.85));
    if (i % 3 === 0) c.drawPath(segment(x + sz * 0.05, y - sz * 0.2, x + sz * 0.2, y - sz * 0.24), stroke(BZ.light, 1.1));
    c.drawPath(lump, stroke(INK, 0.9));
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Big bags: the zinc filter dust in woven bags on a pallet (never an open heap, T3); one bag (frame 0) or two (frame 1)
// ---------------------------------------------------------------------------------------------------------------------

const BAG = '#E7E3D6';
const BAG_SHADE = '#C9C4B3';

/** One big bag (FIBC): bulging woven sides, four lifting loops, its filling spout tied off, a blank document pocket. */
function bigBag(c: SkCanvas, v: View3q, ox: number): void {
  const w = 0.56;
  const d = 0.72;
  const h = 0.82;
  const z0 = 0.14;
  const L = ox - w / 2;
  const R = ox + w / 2;
  const N = -d / 2;
  const S = d / 2;
  const [ax, ay] = proj(v, L, S, z0);
  const [bx, by] = proj(v, R, S, z0);
  const [cx, cy] = proj(v, R, S, z0 + h);
  const [dx, dy] = proj(v, L, S, z0 + h);
  const bulge = 3.2;
  // the front (south) face, bulging out at its sides and bottom
  const front = builder()
    .moveTo(ax, ay)
    .quadTo((ax + bx) / 2, ay + bulge, bx, by)
    .quadTo(bx + bulge, (by + cy) / 2, cx, cy)
    .lineTo(dx, dy)
    .quadTo(ax - bulge, (ay + dy) / 2, ax, ay)
    .close()
    .build();
  c.drawPath(front, fill(BAG));
  c.save();
  c.clipPath(front, ClipOp.Intersect, true);
  // the weave (faint) and the grey dust settled at its foot
  for (let i = 1; i < 6; i++) c.drawPath(segment(ax + ((bx - ax) * i) / 6, ay + 2, dx + ((cx - dx) * i) / 6, dy), stroke(BAG_SHADE, 0.5, 0.8));
  c.drawPath(rect(ax - 4, ay - 7, bx - ax + 8, 10), fill('#A9A69E', 0.45));
  // the east side in shade
  c.drawPath(rect(bx - (bx - ax) * 0.22, cy, (bx - ax) * 0.3, ay - cy + 6), fill(BAG_SHADE, 0.7));
  c.restore();
  c.drawPath(front, stroke(INK, 1));
  // the document pocket (blank: no words in a sprite)
  const px = ax + (bx - ax) * 0.28;
  const py = dy + (ay - dy) * 0.3;
  c.drawPath(rect(px, py, (bx - ax) * 0.34, (ay - dy) * 0.26), fill(YARD.paper));
  c.drawPath(rect(px, py, (bx - ax) * 0.34, (ay - dy) * 0.26), stroke(INK, 0.7));
  // the top: a slightly domed square, its loops at the corners and the tied spout in the middle
  const top = facePath4(v, [[L, N, z0 + h], [R, N, z0 + h], [R, S, z0 + h], [L, S, z0 + h]]);
  c.drawPath(top, fill(shade(BAG, 0.05)));
  c.drawPath(top, stroke(INK, 1));
  for (const [qx, qy] of [[L + 0.06, N + 0.06], [R - 0.06, N + 0.06], [R - 0.06, S - 0.06], [L + 0.06, S - 0.06]] as const) {
    const [lx, ly] = proj(v, qx, qy, z0 + h);
    const loop = builder().moveTo(lx - 2.2, ly + 1).quadTo(lx, ly - 7, lx + 2.2, ly + 1).build();
    c.drawPath(loop, stroke(INK, 2.6));
    c.drawPath(loop, stroke(YARD.containerSage, 1.4));
  }
  const [sx, sy] = proj(v, ox, 0, z0 + h);
  c.drawPath(rrect(sx - 2.4, sy - 7, 4.8, 7, 1.5), fill(BAG_SHADE));
  c.drawPath(rrect(sx - 2.4, sy - 7, 4.8, 7, 1.5), stroke(INK, 0.8));
  c.drawPath(segment(sx - 3.2, sy - 4, sx + 3.2, sy - 4), stroke(INK, 1.4));
}

const facePath4 = (v: View3q, q: V3[]) => {
  const b = builder();
  q.forEach((p, i) => {
    const [x, y] = proj(v, ...p);
    if (i === 0) b.moveTo(x, y);
    else b.lineTo(x, y);
  });
  return b.close().build();
};

/** The zinc filter dust on its pallet: one bag (west) or two. */
export function drawBigBags(c: SkCanvas, v: View3q, two: boolean): void {
  boxShadow(c, v, two ? 1.2 : 0.62, 0.8, two ? 0 : -0.3, 0, 0.95);
  drawPallet(c, v);
  bigBag(c, v, -0.3);
  if (two) bigBag(c, v, 0.3);
}

// ---------------------------------------------------------------------------------------------------------------------
// Roofs: a mono-pitch canopy of profiled galvanised sheet, high at the back and falling to a gutter at the front, on slim
// steel columns along its front edge (drawn after everything north of its south edge, so a column stands IN FRONT of
// what it covers and behind whoever walks south of it); at the back it rests on short stub posts (on the bunkers' back
// wall) or on columns at its two ends. The world eases its ink to a third while somebody stands under it.
// ---------------------------------------------------------------------------------------------------------------------

export interface CanopySpec {
  /** east-west and north-south, metres (the content's map.works.roofs rect) */
  w: number;
  d: number;
  /** the gutter's height at the front and the ridge's at the back, metres */
  zFront: number;
  zBack: number;
  /** x of the front columns, metres round the anchor */
  front: readonly number[];
  /** x of the back supports and the height they stand on (the bunkers' wall top, or 0 for the ground) */
  back: readonly number[];
  backFoot: number;
}

/** The lean-to over the covered works bunkers (12 x 3.4): columns at the dividers every 6 m, stubs on the back wall. */
export const LEANTO: CanopySpec = { w: 12, d: 3.4, zFront: 4.2, zBack: 4.6, front: [-6, 0, 6], back: [-6, 0, 6], backFoot: 1.2 };
/** The works stillages' roof (8.4 x 3.4): the lean-to's height, so the two read as one canopy along the row. */
export const STILLAGES_ROOF: CanopySpec = { w: 8.4, d: 3.4, zFront: 4.2, zBack: 4.6, front: [-4.2, 0, 4.2], back: [-4.2, 4.2], backFoot: 0 };
/** The first yard's stillage block's roof (9 x 2.5), drawn from the works' opening (T5: what feeds a hall is covered). */
export const FIRST_STILLAGES_ROOF: CanopySpec = { w: 9, d: 2.5, zFront: 3.4, zBack: 3.8, front: [-4.5, 0, 4.5], back: [-4.5, 4.5], backFoot: 0 };

/** A slim steel column from z0 to z1 at (x, y), with its base plate on the ground or on the wall. */
function column(c: SkCanvas, v: View3q, x: number, y: number, z0: number, z1: number, plateLen = 0.3): void {
  box(c, v, { len: plateLen, wid: 0.3, h: 0.03, ox: x, oy: y, z: z0, color: YARD.steel, line: 0.7 });
  box(c, v, { len: 0.16, wid: 0.16, h: z1 - z0, ox: x, oy: y, z: z0, color: YARD.machine, line: LINE_W });
}

/** A canopy round its anchor (the roof rect's centre on the ground). */
export function drawCanopy(c: SkCanvas, v: View3q, s: CanopySpec): void {
  const L = -s.w / 2;
  const R = s.w / 2;
  const N = -s.d / 2;
  const S = s.d / 2;
  const yCol = S - 0.12;
  // the front columns' shadows on the ground (their tops' shadow lies under the roof's own)
  for (const x of s.front) groundShadow(c, v, 0.1, 0.08, x, yCol, Math.min(s.zFront, 1.9));
  // the back supports (behind the sheet's south edge, drawn first)
  for (const x of s.back) column(c, v, Math.max(L + 0.1, Math.min(R - 0.1, x)), N + 0.2, s.backFoot, s.zBack - 0.1, s.backFoot ? 0.24 : 0.3);
  // the front columns
  for (const x of s.front) column(c, v, Math.max(L + 0.1, Math.min(R - 0.1, x)), yCol, 0, s.zFront - 0.1);
  // the sheet: its top (falling to the front), its ribs, the gutter and fascia along the front edge
  const sheet: V3[] = [[L, N, s.zBack], [R, N, s.zBack], [R, S, s.zFront], [L, S, s.zFront]];
  faceFill(c, v, sheet, YARD.galvanised);
  // the low sun on the sheet: lighter to the west, a cooler shade to the east
  c.save();
  c.clipPath(facePath4(v, sheet), ClipOp.Intersect, true);
  const [wx, wy] = proj(v, L, 0, (s.zFront + s.zBack) / 2);
  c.drawPath(rect(wx - 2, wy - 200, s.w * v.ppm * 0.3, 400), fill(YARD.galvanisedLight, 0.35));
  c.restore();
  const ribs = Math.round(s.w / 0.5);
  for (let i = 1; i < ribs; i++) {
    const q = subQuad(sheet, i / ribs, i / ribs, 0.01, 0.99);
    const a = proj(v, ...q[0]);
    const b = proj(v, ...q[3]);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.16), 0.9));
    c.drawPath(segment(a[0] + 1.1, a[1], b[0] + 1.1, b[1]), stroke(YARD.galvanisedLight, 0.7));
  }
  // a few rust-free sheet laps across the run (the sheets' ends)
  for (const t of [0.34, 0.68]) {
    const q = subQuad(sheet, 0, 1, t, t);
    const a = proj(v, ...q[0]);
    const b = proj(v, ...q[1]);
    c.drawPath(segment(a[0], a[1], b[0], b[1]), stroke(shade(YARD.galvanised, -0.1), 0.8));
  }
  faceFill(c, v, sheet, YARD.galvanised, LINE_W, 0);
  // the fascia and its gutter (a box along the front edge, 0.22 m deep)
  box(c, v, { len: s.w + 0.1, wid: 0.14, h: 0.22, ox: 0, oy: S - 0.02, z: s.zFront - 0.22, color: YARD.steel, line: LINE_W, bevel: true });
  // the downpipe at the east end, to the ground by the last column
  const [p0x, p0y] = proj(v, R - 0.06, S - 0.04, s.zFront - 0.22);
  const [p1x, p1y] = proj(v, R - 0.06, S - 0.04, 0.1);
  c.drawPath(segment(p0x, p0y, p1x, p1y), stroke(INK, 3.2));
  c.drawPath(segment(p0x, p0y, p1x, p1y), stroke(YARD.galvanised, 1.8));
}
