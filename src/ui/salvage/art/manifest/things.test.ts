/**
 * The "things" part of the manifest: every entry draws every frame inside its bounds; every object and
 * grade of the first yard's content has its sprites; copper, brass, steel and aluminium pieces differ in
 * a grey rendering by at least 25 L* (the median lightness of each piece's opaque pixels); the stages
 * advance with the pieces off; the part stays inside its share of sheet A at density 3.
 */
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
let S: SkiaT;
let MT: typeof import('./things');
let MF: typeof import('./index');
let pal: typeof import('../palette');
let pen: typeof import('../pen');
beforeAll(async () => {
  S = await import('@shopify/react-native-skia');
  MT = await import('./things');
  MF = await import('./index');
  pal = await import('../palette');
  pen = await import('../pen');
}, 60_000);

/** Pixels of one drawing at density 3 round the anchor. */
function render(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, half: number, d = 3) {
  const size = half * 2 * d;
  const surface = S.Skia.Surface.MakeOffscreen(size, size)!;
  const c = surface.getCanvas();
  c.clear(S.Skia.Color('#00000000'));
  c.scale(d, d);
  c.translate(half, half);
  draw(c);
  surface.flush();
  const px = surface.makeImageSnapshot().readPixels(0, 0, { width: size, height: size, colorType: 4, alphaType: 3 }) as Uint8Array;
  surface.dispose();
  return { px, size };
}

/**
 * The value a sprite reads at in grey: the most common L* (1 L* bins) of its opaque pixels, leaving out
 * its ink outline (within 1.5 L* of the ink) and its shadow (26 % alpha). At phone size a piece is a few
 * strokes of ink round one dominant fill; that fill is what tells copper from steel in grey.
 */
function medianL(id: string): number {
  const e = MT.THINGS.find((x) => x.id === id)!;
  const half = Math.ceil(Math.max(Math.abs(e.bounds.x), Math.abs(e.bounds.x + e.bounds.w), Math.abs(e.bounds.y), Math.abs(e.bounds.y + e.bounds.h))) + 4;
  const { px } = render((c) => e.draw(c, pen.VIEW, 0, 0), half);
  const inkL = pal.lightness(pal.YARD.ink);
  const bins = new Array(101).fill(0);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 250) continue;
    const l = pal.lightness(pal.hexOf(px[i], px[i + 1], px[i + 2]));
    if (Math.abs(l - inkL) < 1.5) continue;
    bins[Math.round(l)]++;
  }
  return bins.indexOf(Math.max(...bins));
}

// content2.json (the prototype's content) as of 25 Nov: the objects and grades the yard deals
const CONTENT_OBJECTS = ['washer', 'bike', 'cable', 'taps', 'fittings', 'radiator', 'bath', 'stove', 'gate', 'cylinder', 'wheels', 'sheet', 'trough', 'plough', 'beam', 'tank', 'cladding', 'pipe', 'coil', 'car'];
const CONTENT_GRADES = ['li', 'appl', 'ci', 'ciu', 'hms', 'hmsu', 'cbody', 'alw', 'alcast', 'ali', 'ald', 'brs', 'bri', 'brd', 'no2', 'bb', 'cyl', 'cab', 'mot', 'batt', 'conv'];

describe('manifest part "things"', () => {
  it('ids are unique, on sheet A, and every entry draws every frame inside its bounds', () => {
    const ids = MT.THINGS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bad: string[] = [];
    for (const e of MT.THINGS) {
      expect(e.sheet, e.id).toBe('A');
      expect(e.id, e.id).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      const b = e.bounds;
      const half = Math.ceil(Math.max(Math.abs(b.x), Math.abs(b.x + b.w), Math.abs(b.y), Math.abs(b.y + b.h))) + 30;
      for (let f = 0; f < e.frames.length; f++) {
        let out: ReturnType<typeof render> | null = null;
        expect(() => (out = render((c) => e.draw(c, pen.VIEW, f, 0), half, 1)), `${e.id} ${f}`).not.toThrow();
        const { px, size } = out as unknown as ReturnType<typeof render>;
        let l = size, r = -1, t = size, btm = -1;
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++)
            if (px[(y * size + x) * 4 + 3] > 8) {
              l = Math.min(l, x);
              r = Math.max(r, x + 1);
              t = Math.min(t, y);
              btm = Math.max(btm, y + 1);
            }
        if (r < 0) bad.push(`${e.id} ${e.frames[f]}: no ink`);
        else if (l - half < b.x - 1 || r - half > b.x + b.w + 1 || t - half < b.y - 1 || btm - half > b.y + b.h + 1) bad.push(`${e.id} ${e.frames[f]}: outside`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  }, 240_000);

  it('every content object and grade has its sprites', () => {
    const ids = new Set(MT.THINGS.map((e) => e.id));
    for (const o of CONTENT_OBJECTS) expect(ids.has(MT.OBJECT_SPRITE[o]), o).toBe(true);
    for (const g of CONTENT_GRADES) {
      expect(MT.GRADE_SPRITE[g]?.length, g).toBeGreaterThan(0);
      for (const id of MT.GRADE_SPRITE[g]) {
        expect(ids.has(id), `${g} ${id}`).toBe(true);
        if (!id.startsWith('piece.ingot')) expect(ids.has(MT.pieceSprite(id, 'carried')), `${g} ${id} carried`).toBe(true);
      }
      expect(ids.has(`ui.picto.${g}`), `picto ${g}`).toBe(true);
    }
    for (const g of ['li', 'appl', 'ci', 'ciu', 'hms', 'hmsu', 'cbody']) for (let k = 1; k <= 5; k++) expect(ids.has(`heap.${g}.${k}`), `heap ${g} ${k}`).toBe(true);
  });

  it('copper, brass, steel and aluminium differ in grey by at least 25 L*, at both sizes', () => {
    const groups: Record<string, string[]> = {
      steel: ['piece.steel.beam', 'piece.steel.plate'],
      copper: ['piece.copper.bright', 'piece.copper.tube'],
      brass: ['piece.brass.taps', 'piece.brass.fittings'],
      aluminium: ['piece.alu.profile', 'piece.alu.wheel'],
    };
    for (const size of ['ground', 'carried'] as const) {
      const L: Record<string, number[]> = {};
      for (const [g, ids] of Object.entries(groups)) L[g] = ids.map((id) => medianL(MT.pieceSprite(id, size)));
      if (process.env.SHOW_L) console.log(size, JSON.stringify(L));
      const names = Object.keys(L);
      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++)
          for (const a of L[names[i]])
            for (const b of L[names[j]]) expect(Math.abs(a - b), `${size}: ${names[i]} ${a.toFixed(1)} vs ${names[j]} ${b.toFixed(1)}`).toBeGreaterThanOrEqual(25);
    }
  }, 60_000);

  it('stages advance with the pieces off and never skip back', () => {
    for (const frames of [2, 3, 4, 5])
      for (const total of [1, 2, 4, 10]) {
        let last = 0;
        expect(MT.stageOf(frames, 0, total)).toBe(0);
        for (let off = 1; off <= total; off++) {
          const s = MT.stageOf(frames, off, total);
          expect(s).toBeGreaterThanOrEqual(last);
          expect(s).toBeGreaterThanOrEqual(1);
          expect(s).toBeLessThan(frames);
          last = s;
        }
      }
  });

  it('the part stays within 1.3 Mpx of sheet A at density 3', () => {
    const px = MT.THINGS.reduce((a, e) => a + MF.entryPixels(e, 3), 0);
    expect(px).toBeLessThanOrEqual(1.3e6);
  });
});
