/**
 * THE FIRST YARD'S SHEETS DO NOT MOVE, AND THE WORKS' SHEETS FIT (C-ART, PLAN2 2.7 and 3.1 (5); critic F17).
 *
 * 1. Sheets A, B and G, planned by world/atlas.ts `planSheet(sheet, 2)` and drawn cell by cell with `drawCell` (as
 *    bakeManifest draws them), are pixel for pixel what BASELINE recorded from ff064ce (the first yard the owner plays):
 *    the record's items are sha1(JSON of sha1(RGBA pixels)) and sha1(JSON of the meta), copied below from
 *    $S/phasec/baseline/sheets.json (made 2026-11-28T00:22:54Z). They never change: a difference is a fault of the change
 *    that caused it, never a reason to edit the record.
 * 2. The works' entries (manifest WORKS_MANIFEST, sheets C and D only): ids unique across the whole manifest and dotted;
 *    every frame at every baked heading draws without throwing, leaves ink and stays inside its box; slots inside their
 *    sprite; C and D each pack at density 2 inside 2048 x 2048.
 * 3. The works' metals (palette.ts stainless, bronze): outside LADDER_ORDER; each differs from every metal in sheen or
 *    pictogram; the L* gaps of WORKS_METAL_PAIRS.
 * Skia runs on CanvasKit (as manifest.test.ts).
 */
import crypto from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@shopify/react-native-skia', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return resolve.call(this, request === 'react-native' ? 'react-native-web' : request, ...rest);
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@shopify/react-native-skia/lib/commonjs/mock').Mock(CanvasKit);
  } finally {
    Module._resolveFilename = resolve;
  }
});

type SkiaT = typeof import('@shopify/react-native-skia');
type M = typeof import('./manifest');
type At = typeof import('../world/atlas');
let S: SkiaT;
let MF: M;
let A: At;
beforeAll(async () => {
  S = await import('@shopify/react-native-skia');
  MF = await import('./manifest');
  A = await import('../world/atlas');
}, 60_000);

/** BASELINE's record of ff064ce (sheets.json): meta and the item hashes of the whole sheets. */
const RECORD = {
  A: { meta: { density: 2, width: 2046, height: 1040, cells: 386, failed: 0 }, whole: '53edc780af11634d78faecbee520e9bae2f33747' },
  B: { meta: { density: 2, width: 2048, height: 1286, cells: 169, failed: 0 }, whole: 'bc32f14cfa4660be3f000bdbd1a9e9ee21e20146' },
  G: { meta: { density: 2, width: 1024, height: 422, cells: 30, failed: 0 }, whole: '31904143941b64ff26cced2a4560114ac2ef8975' },
} as const;

const sha1 = (b: Uint8Array | string) => crypto.createHash('sha1').update(b).digest('hex');
/** As snap.mts's sink: the item is sha1 of the JSON of the value. */
const item = (v: unknown) => sha1(JSON.stringify(v));

describe('sheets A, B and G are pixel for pixel BASELINE (ff064ce)', () => {
  for (const sheet of ['A', 'B', 'G'] as const)
    it(`sheet ${sheet}`, () => {
      const plan = A.planSheet(sheet, 2);
      const surface = S.Skia.Surface.MakeOffscreen(plan.width, plan.height)!;
      const cv = surface.getCanvas();
      cv.clear(S.Skia.Color('#00000000'));
      const failed: string[] = [];
      for (const cell of plan.cells) {
        try {
          A.drawCell(cv, cell, plan.density);
        } catch {
          failed.push(`${cell.id}#${cell.frame}#${cell.heading}`);
        }
      }
      surface.flush();
      const img = surface.makeImageSnapshot();
      const meta = { density: plan.density, width: plan.width, height: plan.height, cells: plan.cells.length, failed: failed.length };
      expect(meta).toEqual(RECORD[sheet].meta);
      // snap.mts: colorType RGBA_8888 (4), alphaType 2, read whole
      const px = img.readPixels(0, 0, { width: plan.width, height: plan.height, colorType: 4, alphaType: 2 }) as Uint8Array;
      const bytes = px instanceof Uint8Array ? px : new Uint8Array((px as ArrayBufferView).buffer);
      expect(item(sha1(bytes)), `sheet ${sheet} pixels`).toBe(RECORD[sheet].whole);
      surface.dispose();
    }, 120_000);
});

/** The ink of one drawing, points round the anchor (null when it drew nothing). */
function ink(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, half: number) {
  const size = half * 2;
  const surface = S.Skia.Surface.MakeOffscreen(size, size)!;
  const c = surface.getCanvas();
  c.clear(S.Skia.Color('#00000000'));
  c.translate(half, half);
  draw(c);
  surface.flush();
  const px = surface.makeImageSnapshot().readPixels(0, 0, { width: size, height: size, colorType: 4, alphaType: 3 }) as Uint8Array;
  let l = size;
  let r = -1;
  let t = size;
  let b = -1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (px[(y * size + x) * 4 + 3] > 8) {
        l = Math.min(l, x);
        r = Math.max(r, x + 1);
        t = Math.min(t, y);
        b = Math.max(b, y + 1);
      }
  surface.dispose();
  return r < 0 ? null : { l: l - half, r: r - half, t: t - half, b: b - half };
}

describe('the works entries (sheets C and D)', () => {
  it('twelve parts; only sheets C and D; ids unique across the whole manifest; frames and headings sane', () => {
    expect(Object.keys(MF.WORKS_PARTS).length).toBe(12);
    const all = [...MF.MANIFEST.map((e) => e.id), ...MF.WORKS_MANIFEST.map((e) => e.id)];
    expect(new Set(all).size, all.filter((id, i) => all.indexOf(id) !== i).join(', ')).toBe(all.length);
    for (const e of MF.WORKS_MANIFEST) {
      expect(['C', 'D'], e.id).toContain(e.sheet);
      expect(e.id, e.id).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/i);
      expect(e.frames.length, e.id).toBeGreaterThan(0);
      expect([1, 4, 8], e.id).toContain(e.headings);
      expect(e.bounds.w > 0 && e.bounds.h > 0, e.id).toBe(true);
      if (e.boundsByHeading) expect(e.boundsByHeading.length, e.id).toBe(MF.bakedHeadings(e).length);
    }
    // nothing of the works on the first yard's sheets
    for (const e of MF.MANIFEST) expect(['A', 'B', 'G'], e.id).toContain(e.sheet);
  });

  it('every works entry draws every frame at every baked heading, leaves ink and stays inside its box', async () => {
    const { VIEW } = await import('./pen');
    const bad: string[] = [];
    for (const e of MF.WORKS_MANIFEST)
      for (const h of MF.bakedHeadings(e)) {
        const box = MF.cellBounds(e, h);
        const half = Math.ceil(Math.max(Math.abs(box.x), Math.abs(box.x + box.w), Math.abs(box.y), Math.abs(box.y + box.h))) + 20;
        for (let f = 0; f < e.frames.length; f++) {
          const name = `${e.id} ${e.frames[f]} h${h}`;
          let k: ReturnType<typeof ink> = null;
          expect(() => (k = ink((c) => e.draw(c, VIEW, f, h), half)), name).not.toThrow();
          if (!k) {
            bad.push(`${name}: no ink`);
            continue;
          }
          const q = k as { l: number; r: number; t: number; b: number };
          if (q.l < box.x - 1 || q.r > box.x + box.w + 1 || q.t < box.y - 1 || q.b > box.y + box.h + 1)
            bad.push(`${name}: ink [${q.l}, ${q.t}, ${q.r}, ${q.b}] outside [${box.x}, ${box.y}, ${box.x + box.w}, ${box.y + box.h}]`);
        }
      }
    expect(bad, bad.join('\n')).toEqual([]);
  }, 240_000);

  it('slots lie inside their sprite', () => {
    for (const e of MF.WORKS_MANIFEST)
      for (const [n, s] of Object.entries(e.slots ?? {})) {
        expect(s.x >= e.bounds.x - 1 && s.x + s.w <= e.bounds.x + e.bounds.w + 1, `${e.id} ${n} x`).toBe(true);
        expect(s.y >= e.bounds.y - 1 && s.y + s.h <= e.bounds.y + e.bounds.h + 1, `${e.id} ${n} y`).toBe(true);
      }
  });

  it('sheets C and D each pack at density 2 inside 2048 x 2048', () => {
    for (const sheet of ['C', 'D'] as const) {
      // atlas.ts types its sheet as the first yard's until C-WORLD-1 widens it; it packs by e.sheet === sheet
      const plan = A.planSheet(sheet as unknown as 'A', 2, MF.WORKS_MANIFEST as unknown as Parameters<At['planSheet']>[2]);
      const n = MF.WORKS_MANIFEST.filter((e) => e.sheet === sheet).reduce((a, e) => a + MF.bakedHeadings(e).length * e.frames.length, 0);
      expect(plan.cells.length, sheet).toBe(n);
      expect(plan.density, `${sheet}: the packer fell to density ${plan.density}`).toBe(2);
      expect(plan.width, sheet).toBeLessThanOrEqual(A.MAX_SIDE);
      expect(plan.height, sheet).toBeLessThanOrEqual(A.MAX_SIDE);
    }
  });
});

describe("the works' metals (palette.ts)", () => {
  it('stainless and bronze: outside the ladder, told apart by mark and by L*', async () => {
    const P = await import('./palette');
    for (const id of P.WORKS_METALS) {
      expect(P.METAL[id], id).toBeTruthy();
      expect((P.LADDER_ORDER as readonly string[]).includes(id), id).toBe(false);
      for (const [other, m] of Object.entries(P.METAL))
        if (other !== id) expect(m.sheen === P.METAL[id].sheen && m.pictogram === P.METAL[id].pictogram, `${id} / ${other}`).toBe(false);
    }
    for (const [a, b, gap] of P.WORKS_METAL_PAIRS)
      expect(Math.abs(P.lightness(P.METAL[a].base) - P.lightness(P.METAL[b].base)), `${a} / ${b}`).toBeGreaterThanOrEqual(gap);
  });
});
