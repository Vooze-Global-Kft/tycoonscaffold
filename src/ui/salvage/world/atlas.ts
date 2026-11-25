/**
 * The yard's sprite atlases (yard-stage1.md 6.2; package 5 of section 9).
 *
 * THE MANIFEST'S SHEETS. Every entry of the art manifest (src/ui/salvage/art/manifest: people, things,
 * plant) is baked into one of three atlases at the device's density: sheet A (people, things, pieces) and
 * sheet B (vehicles, machines, props, interface plates), each at most 2048 x 2048 pixels, and sheet G
 * (ground tiles and decals), at most 1024 x 1024. One cell per entry, frame and baked heading (west
 * headings of a `mirrorWest` entry are drawn as their east cell mirrored). A sheet that does not fit
 * lowers its own density in steps of 0.25 (and says so in `density`). The bake runs in slices of a few
 * milliseconds behind the loading animation (`bakeManifest`), and `atlasProgress()` tells the loading
 * animation's calm loop how far it is.
 *
 * THE OLD NAMES. Until the yard view moves to the manifest's ids, `bakeSheet` still bakes the ground
 * work's single sheet under its old names (worker-d-f, helper-d-f, truck-k, ring-k, mark, piece,
 * prop-<sig>, pieces-<sig>); LEGACY maps each old name to the manifest id, frame and heading that now
 * draws it, and falls back to the ground work's placeholder (./draw.ts) where the manifest has no entry
 * yet. Pure Skia (no React).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { WORLD_LABELS } from '../strings';
import { DIRS, WALK_FRAMES, crate, machine, pawn, piece, pile, ring, truck, wall, wreck, wreckPieces, type View3q } from './draw';
import type { YardLayout } from './yard';
import type { SalvageProp } from '../../../config/schema.salvage';
import { MANIFEST, bakedHeadings, cellBounds, mirrorOf, type ManifestEntry, type Sheet } from '../art/manifest';
import { CONTAINER_TINTS } from '../art/manifest/plant';
import { RING_R as MARK_RING_R } from '../art/marks.draw';
import { drawContainerNS, drawBlock, drawBayHeap, drawHandStripper } from '../art/site.draw';

/** Every phone GPU takes a 2048 x 2048 texture. */
export const MAX_SIDE = 2048;
/** The ground sheet's side. */
export const G_SIDE = 1024;
const PAD = 2;
/** Headings of the truck's sprites (a three-quarter view cannot simply rotate a picture). */
export const TRUCK_HEADINGS = 8;
/** Steps of the cut ring. */
export const RING_STEPS = 8;
/** The radius the ring sprites are baked at, metres (scaled per wreck): the manifest's mark.ring. */
export const RING_R = MARK_RING_R;
export const WORKER_VEST = '#F4C20D';
export const HELPER_VEST = '#9CCB3B';

// =====================================================================================================
// The manifest's sheets A, B and G
// =====================================================================================================

/** One baked cell: an entry's frame at a heading, x/y/w/h in atlas pixels, (ax, ay) its anchor in them. */
export interface Cell {
  id: string;
  frame: number;
  heading: number;
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  entry: ManifestEntry;
}

export interface SheetPlan {
  sheet: Sheet;
  density: number;
  width: number;
  height: number;
  cells: Cell[];
}

/** A baked manifest sheet: its image and, per cell, six numbers in `rects` (x, y, w, h, ax, ay). */
export interface ManifestAtlas {
  sheet: Sheet;
  image: SkImage;
  density: number;
  width: number;
  height: number;
  /** `${id}#${frame}#${heading}` -> cell index (only baked headings). */
  index: Record<string, number>;
  rects: number[];
}

export const sideOf = (sheet: Sheet): number => (sheet === 'G' ? G_SIDE : MAX_SIDE);

const entriesOf = (sheet: Sheet, list: readonly ManifestEntry[] = MANIFEST) => list.filter((e) => e.sheet === sheet);

/**
 * Skyline packing (bottom-left: each cell goes where its top lands lowest), trying three orders (by
 * height, by width, by area) and keeping the shortest sheet.
 */
function packCells(entries: ManifestEntry[], density: number, side: number) {
  const items: { e: ManifestEntry; frame: number; heading: number; b: { x: number; y: number }; w: number; h: number }[] = [];
  for (const e of entries)
    for (let f = 0; f < e.frames.length; f++)
      for (const hd of bakedHeadings(e)) {
        const b = cellBounds(e, hd);
        items.push({ e, frame: f, heading: hd, b, w: Math.ceil(b.w * density) + PAD * 2, h: Math.ceil(b.h * density) + PAD * 2 });
      }
  const orders: ((a: (typeof items)[number], b: (typeof items)[number]) => number)[] = [
    (a, b) => b.h - a.h || b.w - a.w,
    (a, b) => b.w - a.w || b.h - a.h,
    (a, b) => b.w * b.h - a.w * a.h,
  ];
  let best: { cells: Cell[]; width: number; height: number } | null = null;
  for (const order of orders) {
    const list = items.slice().sort(order);
    // the skyline: segments [x, w, y] covering 0..side
    let sky: [number, number, number][] = [[0, side, 0]];
    const cells: Cell[] = [];
    let width = 0;
    let height = 0;
    for (const it of list) {
      let bx = -1;
      let by = Infinity;
      for (let i = 0; i < sky.length; i++) {
        const x = sky[i][0];
        if (x + it.w > side) break;
        let y = 0;
        let cover = 0;
        for (let j = i; j < sky.length && cover < it.w; j++) {
          y = Math.max(y, sky[j][2]);
          cover = sky[j][0] + sky[j][1] - x;
        }
        if (y + it.h < by) {
          by = y + it.h;
          bx = x;
        }
      }
      if (bx < 0) {
        bx = 0;
        by = height + it.h;
      }
      const y = by - it.h;
      cells.push({ id: it.e.id, frame: it.frame, heading: it.heading, x: bx, y, w: it.w, h: it.h, ax: PAD - it.b.x * density, ay: PAD - it.b.y * density, entry: it.e });
      width = Math.max(width, bx + it.w);
      height = Math.max(height, by);
      // raise the skyline under the cell
      const next: [number, number, number][] = [];
      for (const [x, w, sy] of sky) {
        const x1 = x + w;
        if (x1 <= bx || x >= bx + it.w) next.push([x, w, sy]);
        else {
          if (x < bx) next.push([x, bx - x, sy]);
          if (x1 > bx + it.w) next.push([bx + it.w, x1 - bx - it.w, sy]);
        }
      }
      next.push([bx, it.w, by]);
      next.sort((a, b) => a[0] - b[0]);
      sky = [];
      for (const seg of next) {
        const last = sky[sky.length - 1];
        if (last && last[2] === seg[2] && last[0] + last[1] === seg[0]) last[1] += seg[1];
        else sky.push([...seg]);
      }
    }
    if (!best || height < best.height) best = { cells, width, height };
  }
  return best ?? { cells: [], width: 0, height: 0 };
}

/** The plan of a sheet at a wanted density: lowered by 0.25 until it fits (never below 1). */
export function planSheet(sheet: Sheet, want: number, list: readonly ManifestEntry[] = MANIFEST): SheetPlan {
  const side = sideOf(sheet);
  const entries = entriesOf(sheet, list);
  let density = Math.max(1, Math.min(3, want));
  let p = packCells(entries, density, side);
  while (p.height > side && density > 1) {
    density = Math.max(1, density - 0.25);
    p = packCells(entries, density, side);
  }
  return { sheet, density, width: Math.max(1, p.width), height: Math.max(1, p.height), cells: p.cells };
}

/** The size a sheet bakes to (tests, the budget script). */
export const sheetSize = (sheet: Sheet, want: number, list?: readonly ManifestEntry[]) => {
  const p = planSheet(sheet, want, list);
  return { density: p.density, width: p.width, height: p.height };
};

const VIEW: View3q = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };

/** Draws one cell of a plan (clipped to it). */
export function drawCell(c: SkCanvas, cell: Cell, density: number): void {
  c.save();
  c.clipRect({ x: cell.x, y: cell.y, width: cell.w, height: cell.h }, ClipOp.Intersect, true);
  c.translate(cell.x + cell.ax, cell.y + cell.ay);
  c.scale(density, density);
  cell.entry.draw(c, VIEW, cell.frame, cell.heading);
  c.restore();
}

/** Draws every cell of a plan (the sheets script; a synchronous bake). */
export function drawPlan(c: SkCanvas, plan: SheetPlan): void {
  for (const cell of plan.cells) drawCell(c, cell, plan.density);
}

function finish(plan: SheetPlan, image: SkImage): ManifestAtlas {
  const index: Record<string, number> = {};
  const rects: number[] = [];
  plan.cells.forEach((cell, i) => {
    index[`${cell.id}#${cell.frame}#${cell.heading}`] = i;
    rects.push(cell.x, cell.y, cell.w, cell.h, cell.ax, cell.ay);
  });
  return { sheet: plan.sheet, image, density: plan.density, width: plan.width, height: plan.height, index, rects };
}

/**
 * The cell of an entry's frame at a heading in a baked atlas: its index in `rects` and whether the world
 * must mirror it (a west heading of a mirrorWest entry). -1 when the atlas lacks it.
 */
export function cellOf(atlas: ManifestAtlas, id: string, frame = 0, heading = 0): { cell: number; mirror: boolean } {
  const e = MANIFEST.find((m) => m.id === id);
  const src = e ? mirrorOf(e, heading) : null;
  const cell = atlas.index[`${id}#${frame}#${src ?? heading}`] ?? -1;
  return { cell, mirror: src !== null };
}

// --- the bake in slices, and its progress ------------------------------------------------------------

export interface ManifestAtlases {
  A: ManifestAtlas | null;
  B: ManifestAtlas | null;
  G: ManifestAtlas | null;
  ms: number;
}

const bakeState = { total: 0, done: 0, started: false, result: null as ManifestAtlases | null, waiters: [] as ((a: ManifestAtlases) => void)[] };

/**
 * How far the manifest's bake is, 0 to 1 (0 before it starts; 1 when the three sheets are baked).
 * Read it from the loading animation's calm loop: the gate may part once it is 1.
 */
export function atlasProgress(): number {
  if (!bakeState.started) return 0;
  if (bakeState.result) return 1;
  return bakeState.total ? Math.min(0.999, bakeState.done / bakeState.total) : 0;
}

/** The baked sheets, or null until the bake is done. */
export const manifestAtlases = (): ManifestAtlases | null => bakeState.result;

const later = (f: () => void) => setTimeout(f, 0);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Bakes sheets A, B and G at a density, `sliceMs` of drawing at a time so the loading animation keeps
 * its frames; idempotent (a second call returns the same promise's result). Each sheet draws into a CPU
 * raster surface (./atlas bakeImage's way), snapshotted and disposed when its last cell is drawn.
 */
export function bakeManifest(density: number, sliceMs = 8): Promise<ManifestAtlases> {
  if (bakeState.result) return Promise.resolve(bakeState.result);
  const p = new Promise<ManifestAtlases>((res) => bakeState.waiters.push(res));
  if (bakeState.started) return p;
  bakeState.started = true;
  const t0 = now();
  const plans = (['A', 'B', 'G'] as const).map((s) => planSheet(s, density));
  bakeState.total = plans.reduce((a, pl) => a + pl.cells.length, 0);
  const out: ManifestAtlases = { A: null, B: null, G: null, ms: 0 };
  let si = 0;
  let ci = 0;
  let surface: ReturnType<typeof Skia.Surface.Make> = null;
  const step = () => {
    const until = now() + sliceMs;
    while (si < plans.length) {
      const plan = plans[si];
      if (!surface) {
        surface = Skia.Surface.Make(plan.width, plan.height) ?? Skia.Surface.MakeOffscreen(plan.width, plan.height);
        if (!surface) {
          si++;
          continue;
        }
        surface.getCanvas().clear(Skia.Color('#00000000'));
      }
      while (ci < plan.cells.length && now() < until) {
        try {
          drawCell(surface.getCanvas(), plan.cells[ci], plan.density);
        } catch (e) {
          console.warn('salvage: a sprite could not be drawn', plan.cells[ci].id, e);
        }
        ci++;
        bakeState.done++;
      }
      if (ci < plan.cells.length) return later(step);
      surface.flush();
      const snap = surface.makeImageSnapshot();
      const image = snap.makeNonTextureImage() ?? snap;
      if (image !== snap) snap.dispose();
      surface.dispose();
      surface = null;
      out[plan.sheet] = finish(plan, image);
      si++;
      ci = 0;
      if (now() >= until) return later(step);
    }
    out.ms = now() - t0;
    bakeState.result = out;
    bakeState.waiters.splice(0).forEach((f) => f(out));
  };
  later(step);
  return p;
}

// =====================================================================================================
// The old names (the yard view's single sheet until it moves to the manifest)
// =====================================================================================================

export interface Def {
  name: string;
  /** Bounds in points round the anchor: left and top are negative. */
  l: number;
  t: number;
  r: number;
  b: number;
  draw: (c: SkCanvas) => void;
}

export interface SpriteSheet {
  image: SkImage;
  density: number;
  width: number;
  height: number;
  names: string[];
  index: Record<string, number>;
  /** Six numbers per sprite: x, y, w, h, ax, ay (pixels). */
  rects: number[];
}

/** The signature that makes two props share a sprite. */
export const propSig = (p: SalvageProp) => `${p.kind}-${p.shape}-${p.w}-${p.d}-${p.h}-${p.r}`;

/**
 * Old name -> the manifest's id, frame and heading that draws it now (prefix match for the families).
 * Ids the people and things artists have not delivered yet fall back to the placeholder.
 */
export const LEGACY: Record<string, (name: string) => { id: string; frame: number; heading: number } | null> = {
  // worker-<dir>-<frame>: dir 0 s, 1 e, 2 n, 3 w (the manifest's heading order)
  worker: (n) => {
    const [, d, f] = n.split('-').map(Number);
    return { id: 'person.boss.walk', frame: f, heading: d };
  },
  helper: (n) => {
    const [, d, f] = n.split('-').map(Number);
    return { id: 'person.crew.walk', frame: f, heading: d };
  },
  // truck-<k>: k eighths of a turn from east, clockwise (y south); manifest: 0 s, 1 se, 2 e, ... 7 sw
  truck: (n) => {
    const k = Number(n.split('-')[1]);
    return { id: 'vehicle.truck.skip', frame: 0, heading: (2 - k + 8) % 8 };
  },
  ring: (n) => ({ id: 'mark.ring', frame: Number(n.split('-')[1]), heading: 0 }),
  piece: () => ({ id: 'piece.copper.bright', frame: 0, heading: 0 }),
  'pieces-': () => null,
  mark: () => null,
};

/** The manifest entry, frame and heading for an old name, if the manifest has it. */
export function legacyEntry(name: string): { e: ManifestEntry; frame: number; heading: number; mirror: boolean } | null {
  const key = name.startsWith('pieces-') ? 'pieces-' : name.split('-')[0];
  const m = LEGACY[key]?.(name);
  if (!m) return null;
  const e = MANIFEST.find((x) => x.id === m.id);
  if (!e) return null;
  const src = mirrorOf(e, m.heading);
  const heading = src ?? (m.heading < e.headings ? m.heading : 0);
  return { e, frame: Math.min(m.frame, e.frames.length - 1), heading, mirror: src !== null };
}

/** The sprite list for a yard. Names are stable: ./frameLoop.ts relies on them. */
export function atlasDefs(y: YardLayout): Def[] {
  const v: View3q = { ppm: y.ppm, tilt: y.tilt, lift: y.lift };
  const P = y.ppm;
  const k = P / 40;
  const defs: Def[] = [];
  const box = (name: string, hw: number, hd: number, h: number, draw: (c: SkCanvas) => void, extra = 0.6) => {
    const m = legacyEntry(name);
    if (m) {
      const b = m.e.bounds;
      const l = m.mirror ? -(b.x + b.w) : b.x;
      defs.push({
        name,
        l: l * k,
        t: b.y * k,
        r: (l + b.w) * k,
        b: (b.y + b.h) * k,
        draw: (c) => {
          c.save();
          c.scale(k * (m.mirror ? -1 : 1), k);
          m.e.draw(c, { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) }, m.frame, m.heading);
          c.restore();
        },
      });
      return;
    }
    defs.push({ name, l: -(hw + extra) * P, r: (hw + extra) * P + h * 0.42 * P, t: -(h * y.lift + hd * y.tilt + extra) * P - 8, b: (hd * y.tilt + extra) * P + 4, draw });
  };
  for (const [who, vest] of [['worker', WORKER_VEST], ['helper', HELPER_VEST]] as const)
    DIRS.forEach((dir, di) => {
      for (let f = 0; f < WALK_FRAMES; f++) box(`${who}-${di}-${f}`, 0.4, 0.4, 1.95, (c) => pawn(c, v, dir, f, vest), 0.1);
    });
  for (let t = 0; t < TRUCK_HEADINGS; t++) box(`truck-${t}`, 1.8, 1.8, 1.6, (c) => truck(c, v, (t / TRUCK_HEADINGS) * Math.PI * 2, WORLD_LABELS.truck), 0.2);
  box('piece', 0.3, 0.3, 0.35, (c) => piece(c, v), 0.05);
  for (let s = 0; s <= RING_STEPS; s++) box(`ring-${s}`, RING_R, RING_R, 0, (c) => ring(c, v, RING_R, s, RING_STEPS, '#FFD34D'), 0.15);
  box('mark', RING_R, RING_R, 0, (c) => ring(c, v, RING_R, RING_STEPS, RING_STEPS, '#FFFFFF'), 0.15);
  const seen = new Set<string>();
  for (const p of y.props) {
    const sig = propSig(p);
    if (seen.has(sig) || p.kind === 'truck') continue;
    seen.add(sig);
    const hw = p.shape === 'circle' ? p.r : p.w / 2;
    const hd = p.shape === 'circle' ? p.r : p.d / 2;
    const name = `prop-${sig}`;
    const scaled = (draw: (c: SkCanvas) => void) => (c: SkCanvas) => {
      c.save();
      c.scale(k, k);
      draw(c);
      c.restore();
    };
    const art: View3q = { ppm: 40, tilt: 0.7, lift: Math.sqrt(1 - 0.49) };
    if (p.kind === 'wreck') {
      box(name, hw, hd, p.h + 0.3, (c) => wreck(c, v, p.w, p.d, p.h, WORLD_LABELS.wreck));
      box(`pieces-${sig}`, hw, hd, 0.6, (c) => wreckPieces(c, v, p.w, p.d));
    } else if (p.kind === 'machine') box(name, hw, hd, 2.0, scaled((c) => drawHandStripper(c, art, 1)));
    else if (p.kind === 'wall') {
      // the container wall runs north-south in the ground work's yard: one container per prop, its colour by size
      const tint = CONTAINER_TINTS[Math.round(p.d * 10) % CONTAINER_TINTS.length];
      box(name, hw, hd, p.h, scaled((c) => (p.d >= p.w ? drawContainerNS(c, art, tint, p.d, Math.round(p.d * 10)) : wall(c, art, p.w, p.d, p.h))), 0.3);
    } else if (p.kind === 'pile') box(name, hw, hd, p.h, scaled((c) => drawBayHeap(c, art, ['light_iron', 'hms', 'cast_iron'], 1, Math.round(hw * 10))));
    else if (p.kind === 'crate') box(name, hw, hd, p.h, scaled((c) => drawBlock(c, art)));
    else box(name, hw, hd, p.h, (c) => crate(c, v, p.shape === 'circle' ? p.r * 2 : p.w, p.shape === 'circle' ? p.r * 2 : p.d, p.h));
    void machine;
    void pile;
  }
  return defs;
}

/** Shelf packing, tallest first, at `density` pixels a point, MAX_SIDE wide. */
function pack(defs: Def[], density: number) {
  const items = defs.map((d) => ({ d, w: Math.ceil((d.r - d.l) * density) + PAD * 2, h: Math.ceil((d.b - d.t) * density) + PAD * 2 })).sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0;
  let y = 0;
  let shelf = 0;
  let width = 0;
  const placed: { d: Def; x: number; y: number; w: number; h: number }[] = [];
  for (const it of items) {
    if (x + it.w > MAX_SIDE) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.push({ d: it.d, x, y, w: it.w, h: it.h });
    x += it.w;
    width = Math.max(width, x);
    shelf = Math.max(shelf, it.h);
  }
  return { placed, width, height: y + shelf };
}

/** The atlas's size at a density without baking (tests): the density lowered by 0.25 until it fits MAX_SIDE. */
export function atlasSize(defs: Def[], want: number): { density: number; width: number; height: number } {
  let density = Math.max(1, Math.min(3, want));
  let p = pack(defs, density);
  while (p.height > MAX_SIDE && density > 1) {
    density = Math.max(1, density - 0.25);
    p = pack(defs, density);
  }
  return { density, width: p.width, height: p.height };
}

/**
 * Draws into a w x h image, the way Orbit Haulers' atlas does on the owner's phone (src/ui/haul/art/atlas.ts):
 * a CPU raster surface first (Skia.Surface.Make), its snapshot drawn by any canvas on any thread. Only
 * when no raster surface can be made, a GPU offscreen surface, copied to the CPU by makeNonTextureImage
 * (a texture of the JavaScript thread's GPU context must never reach the UI thread's canvas: when the copy
 * fails, the bake fails). The surface and an intermediate snapshot are disposed after the copy; the image
 * returned is kept for the life of the app. Null when nothing could be made.
 */
export function bakeImage(w: number, h: number, draw: (c: SkCanvas) => void): SkImage | null {
  const raster = Skia.Surface.Make(w, h);
  const surface = raster ?? Skia.Surface.MakeOffscreen(w, h);
  if (!surface) return null;
  try {
    draw(surface.getCanvas());
    surface.flush();
    const snap = surface.makeImageSnapshot();
    if (raster) return snap;
    const copy = snap.makeNonTextureImage();
    snap.dispose();
    return copy ?? null;
  } finally {
    surface.dispose();
  }
}

/** Bakes the old-names atlas of a yard at a density. Null when no image could be made. */
export function bakeSheet(y: YardLayout, want: number): SpriteSheet | null {
  const defs = atlasDefs(y);
  const { density } = atlasSize(defs, want);
  const { placed, width, height } = pack(defs, density);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const names: string[] = [];
  const index: Record<string, number> = {};
  const rects: number[] = [];
  const image = bakeImage(w, h, (c) => {
    c.clear(Skia.Color('#00000000'));
    for (const p of placed) {
      const ax = PAD - p.d.l * density;
      const ay = PAD - p.d.t * density;
      c.save();
      c.clipRect({ x: p.x, y: p.y, width: p.w, height: p.h }, ClipOp.Intersect, true);
      c.translate(p.x + ax, p.y + ay);
      c.scale(density, density);
      p.d.draw(c);
      c.restore();
      index[p.d.name] = names.length;
      names.push(p.d.name);
      rects.push(p.x, p.y, p.w, p.h, ax, ay);
    }
  });
  if (!image) return null;
  return { image, density, width: w, height: h, names, index, rects };
}
