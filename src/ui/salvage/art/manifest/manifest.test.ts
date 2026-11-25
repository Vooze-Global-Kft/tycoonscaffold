/**
 * The sprite manifest's contract (manifest/index.ts): ids are unique lower-case dotted words; every entry
 * of every part draws every frame at every baked heading without throwing, leaves ink, and stays inside
 * its bounds (or its boundsByHeading box) at pen.VIEW; the plant part's pixels fit its share of sheet B
 * and sheet G packs at density 3. Skia runs on CanvasKit (as scripts/art/headless.ts).
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
type M = typeof import('./index');
let S: SkiaT;
let MF: M;
beforeAll(async () => {
  S = await import('@shopify/react-native-skia');
  MF = await import('./index');
}, 60_000);

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

describe('the manifest', () => {
  it('ids are unique lower-case dotted words; frames and headings are sane', () => {
    const ids = MF.MANIFEST.map((e) => e.id);
    expect(new Set(ids).size, ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')).toBe(ids.length);
    for (const e of MF.MANIFEST) {
      expect(e.id, e.id).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      expect(e.frames.length, e.id).toBeGreaterThan(0);
      expect([1, 4, 8], e.id).toContain(e.headings);
      expect(['A', 'B', 'G'], e.id).toContain(e.sheet);
      expect(e.bounds.w > 0 && e.bounds.h > 0, e.id).toBe(true);
      if (e.boundsByHeading) expect(e.boundsByHeading.length, e.id).toBe(MF.bakedHeadings(e).length);
    }
  });

  it('every entry draws every frame at every baked heading, leaves ink and stays inside its box', async () => {
    const { VIEW } = await import('../pen');
    const bad: string[] = [];
    for (const e of MF.MANIFEST)
      for (const h of MF.bakedHeadings(e)) {
        const box = MF.cellBounds(e, h);
        const half = Math.ceil(Math.max(Math.abs(box.x), Math.abs(box.x + box.w), Math.abs(box.y), Math.abs(box.y + box.h))) + 40;
        for (let f = 0; f < e.frames.length; f++) {
          const name = `${e.id} ${e.frames[f]} h${h}`;
          let k: ReturnType<typeof ink> = null;
          expect(() => (k = ink((c) => e.draw(c, VIEW, f, h), half)), name).not.toThrow();
          if (!k) {
            bad.push(`${name}: no ink`);
            continue;
          }
          const q = k as { l: number; r: number; t: number; b: number };
          const m = 1;
          if (q.l < box.x - m || q.r > box.x + box.w + m || q.t < box.y - m || q.b > box.y + box.h + m)
            bad.push(`${name}: ink [${q.l}, ${q.t}, ${q.r}, ${q.b}] outside [${box.x}, ${box.y}, ${box.x + box.w}, ${box.y + box.h}]`);
        }
      }
    expect(bad, bad.join('\n')).toEqual([]);
  }, 240_000);

  it('slots lie inside their sprite', () => {
    for (const e of MF.MANIFEST)
      for (const [n, s] of Object.entries(e.slots ?? {})) {
        expect(s.x >= e.bounds.x - 1 && s.x + s.w <= e.bounds.x + e.bounds.w + 1, `${e.id} ${n} x`).toBe(true);
        expect(s.y >= e.bounds.y - 1 && s.y + s.h <= e.bounds.y + e.bounds.h + 1, `${e.id} ${n} y`).toBe(true);
      }
  });
});

describe('the budget (yard-stage1.md 6.2, at density 3)', () => {
  it('the plant part takes at most 3.3 Mpx of sheet B and sheet G packs at density 3', async () => {
    const plantB = MF.PARTS.plant.filter((e) => e.sheet === 'B').reduce((a, e) => a + MF.entryPixels(e, 3), 0);
    expect(plantB).toBeLessThanOrEqual(3.3e6);
    const { planSheet, G_SIDE } = await import('../../world/atlas');
    const g = planSheet('G', 3);
    expect(g.density).toBe(3);
    expect(g.height).toBeLessThanOrEqual(G_SIDE);
  });
  it('every sheet plan fits its side (lowering its density if it must)', async () => {
    const { planSheet, sideOf } = await import('../../world/atlas');
    for (const s of ['A', 'B', 'G'] as const) {
      const p = planSheet(s, 3);
      expect(p.width, s).toBeLessThanOrEqual(sideOf(s));
      if (p.density > 1) expect(p.height, s).toBeLessThanOrEqual(sideOf(s));
      for (const c of p.cells) expect(c.x + c.w <= p.width && c.y + c.h <= p.height, `${s} ${c.id}`).toBe(true);
    }
  });
});
