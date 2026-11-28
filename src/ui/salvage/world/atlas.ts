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
 * THE OLD NAMES are gone (the lead's ruling 3, notes/lead-world.md): the yard view draws only manifest
 * ids, so the ground work's single sheet, its LEGACY name table and its placeholder sprites are no longer
 * baked. Pure Skia (no React).
 */
import { ClipOp, Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import type { SalvageProp } from '../../../config/schema.salvage';
import { MANIFEST, WORKS_MANIFEST, bakedHeadings, cellBounds, mirrorOf, type AnySheet, type ManifestEntry, type WorksSheet } from '../art/manifest';
import { RING_R as MARK_RING_R } from '../art/marks.draw';
import type { View3q } from '../art/pen';

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
  entry: ManifestEntry<AnySheet>;
}

export interface SheetPlan {
  sheet: AnySheet;
  density: number;
  width: number;
  height: number;
  cells: Cell[];
}

/** A baked manifest sheet: its image and, per cell, six numbers in `rects` (x, y, w, h, ax, ay). */
export interface ManifestAtlas {
  sheet: AnySheet;
  image: SkImage;
  density: number;
  width: number;
  height: number;
  /** `${id}#${frame}#${heading}` -> cell index (only baked headings). */
  index: Record<string, number>;
  rects: number[];
}

export const sideOf = (sheet: AnySheet): number => (sheet === 'G' ? G_SIDE : MAX_SIDE);

/** C-WORLD-1: the works' sheets (C the plant, D moving things), baked only under stageOn() from rung 2 (./useYard.ts). */
export const WORKS_SHEETS: readonly WorksSheet[] = ['C', 'D'];
export const isWorksSheet = (sheet: AnySheet): sheet is WorksSheet => sheet === 'C' || sheet === 'D';
/** The list a sheet is planned from when none is given: the first yard's MANIFEST for A, B, G; WORKS_MANIFEST for C, D. */
const listOf = (sheet: AnySheet): readonly ManifestEntry<AnySheet>[] => (isWorksSheet(sheet) ? WORKS_MANIFEST : MANIFEST);

const entriesOf = (sheet: AnySheet, list: readonly ManifestEntry<AnySheet>[] = listOf(sheet)) => list.filter((e) => e.sheet === sheet);

/**
 * Skyline packing (bottom-left: each cell goes where its top lands lowest), trying three orders (by
 * height, by width, by area) and keeping the shortest sheet.
 */
function packCells(entries: ManifestEntry<AnySheet>[], density: number, side: number) {
  const items: { e: ManifestEntry<AnySheet>; frame: number; heading: number; b: { x: number; y: number }; w: number; h: number }[] = [];
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

/**
 * The plan of a sheet at a wanted density: lowered by 0.25 until it fits (never below 1). `list` defaults to the sheet's own
 * manifest (MANIFEST for A, B, G; WORKS_MANIFEST for C, D); the works' bake passes only the sold entries (worksTable.ts).
 */
export function planSheet(sheet: AnySheet, want: number, list: readonly ManifestEntry<AnySheet>[] = listOf(sheet)): SheetPlan {
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
export const sheetSize = (sheet: AnySheet, want: number, list?: readonly ManifestEntry<AnySheet>[]) => {
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
  const e = isWorksSheet(atlas.sheet) ? WORKS_MANIFEST.find((m) => m.id === id) : MANIFEST.find((m) => m.id === id);
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
 * Draws plans into images, `sliceMs` of drawing at a time (a timer between slices), each sheet into a CPU raster surface
 * (./atlas bakeImage's way), snapshotted and disposed when its last cell is drawn. `onCell` after every cell, `onSheet`
 * with each finished atlas, `onDone` once all are drawn. The first yard's bakeManifest and the works' bakeWorksSheets
 * share it.
 */
function bakeSliced(plans: readonly SheetPlan[], sliceMs: number, onCell: () => void, onSheet: (a: ManifestAtlas) => void, onDone: () => void): void {
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
        onCell();
      }
      if (ci < plan.cells.length) return later(step);
      surface.flush();
      const snap = surface.makeImageSnapshot();
      const image = snap.makeNonTextureImage() ?? snap;
      if (image !== snap) snap.dispose();
      surface.dispose();
      surface = null;
      onSheet(finish(plan, image));
      si++;
      ci = 0;
      if (now() >= until) return later(step);
    }
    onDone();
  };
  later(step);
}

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
  bakeSliced(
    plans,
    sliceMs,
    () => {
      bakeState.done++;
    },
    (a) => {
      if (a.sheet === 'A' || a.sheet === 'B' || a.sheet === 'G') out[a.sheet] = a;
    },
    () => {
      out.ms = now() - t0;
      bakeState.result = out;
      bakeState.waiters.splice(0).forEach((f) => f(out));
    },
  );
  return p;
}

// --- the works' sheets C and D (C-WORLD-1; stage 2 only) ----------------------------------------------

/** The works' baked sheets (null where a sheet has no sold entry or could not be made) and the milliseconds the bake took. */
export interface WorksAtlases {
  C: ManifestAtlas | null;
  D: ManifestAtlas | null;
  ms: number;
  /** Cells baked (the bake line). */
  cells: number;
}

/** The works' slices: at most this many milliseconds of drawing a slice (PLAN2 6.1: never a frame over 50 ms). */
export const WORKS_SLICE_MS = 4;

/** The plans of the works' sheets for a list of entries (only those listed: the sold ones); a sheet with no entry is left out. */
export function planWorks(density: number, list: readonly ManifestEntry<AnySheet>[]): SheetPlan[] {
  return WORKS_SHEETS.map((s) => planSheet(s, density, list)).filter((pl) => pl.cells.length > 0);
}

const worksBake = { started: false, result: null as WorksAtlases | null, waiters: [] as ((a: WorksAtlases) => void)[], done: 0, total: 0 };

/** How far the works' bake is, 0 to 1 (0 before it starts). */
export function worksAtlasProgress(): number {
  if (!worksBake.started) return 0;
  if (worksBake.result) return 1;
  return worksBake.total ? Math.min(0.999, worksBake.done / worksBake.total) : 0;
}

/**
 * Bakes the works' sheets C and D from `list` (worksTable.ts worksBakeList: the content's sold entries only) at a density,
 * in slices of `sliceMs` (WORKS_SLICE_MS); idempotent like bakeManifest. Only ./useYard.ts calls it, and only under
 * stageOn() from rung 2: a first-yard player never bakes C or D.
 */
export function bakeWorksSheets(density: number, list: readonly ManifestEntry<AnySheet>[], sliceMs = WORKS_SLICE_MS): Promise<WorksAtlases> {
  if (worksBake.result) return Promise.resolve(worksBake.result);
  const p = new Promise<WorksAtlases>((res) => worksBake.waiters.push(res));
  if (worksBake.started) return p;
  worksBake.started = true;
  const t0 = now();
  const plans = planWorks(density, list);
  worksBake.total = plans.reduce((a, pl) => a + pl.cells.length, 0);
  const out: WorksAtlases = { C: null, D: null, ms: 0, cells: worksBake.total };
  bakeSliced(
    plans,
    sliceMs,
    () => {
      worksBake.done++;
    },
    (a) => {
      if (a.sheet === 'C' || a.sheet === 'D') out[a.sheet] = a;
    },
    () => {
      out.ms = now() - t0;
      worksBake.result = out;
      worksBake.waiters.splice(0).forEach((f) => f(out));
    },
  );
  return p;
}

// =====================================================================================================
// Kept from the ground work's single sheet (old callers compile; nothing bakes it any more)
// =====================================================================================================

/** The ground work's single sheet: no longer baked (the yard draws the manifest's sheets). Kept as a type for old callers. */
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

