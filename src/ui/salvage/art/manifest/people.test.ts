/**
 * The people part of the sprite manifest (manifest/people.ts): every entry draws without throwing at
 * every baked heading and frame, leaves ink, and stays inside its box for that heading (and the union);
 * ids are lower-case dotted words and unique; the layered actors name only entries that exist; the
 * part's pixels at density 3 stay within what it asks of sheets A and B. Skia runs on CanvasKit.
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
type MP = typeof import('./people');
let S: SkiaT;
let M: MP;
let VIEW: typeof import('../pen').VIEW;
beforeAll(async () => {
  S = await import('@shopify/react-native-skia');
  M = await import('./people');
  VIEW = (await import('../pen')).VIEW;
}, 60_000);

const HALF = 240;
function ink(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void) {
  const size = HALF * 2;
  const surface = S.Skia.Surface.MakeOffscreen(size, size)!;
  const c = surface.getCanvas();
  c.clear(S.Skia.Color('#00000000'));
  c.translate(HALF, HALF);
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
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
  return { l: l - HALF, r: r + 1 - HALF, t: t - HALF, b: b + 1 - HALF, any: r >= 0 };
}

describe('manifest: people', () => {
  it('ids are lower-case dotted words, unique, and every entry is well formed', () => {
    const seen = new Set<string>();
    for (const e of M.PEOPLE) {
      expect(e.id).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      expect(seen.has(e.id), e.id).toBe(false);
      seen.add(e.id);
      expect(['A', 'B', 'G']).toContain(e.sheet);
      expect(e.frames.length, e.id).toBeGreaterThan(0);
      expect(e.boundsByHeading.length, e.id).toBe(M.baked(e).length);
      expect(e.footprint.w > 0 && e.footprint.d > 0, e.id).toBe(true);
    }
  });

  it('every entry draws at every baked heading and frame, leaves ink and stays inside its box', () => {
    for (const e of M.PEOPLE) {
      M.baked(e).forEach((h, i) => {
        const box = e.boundsByHeading[i];
        for (let f = 0; f < e.frames.length; f++) {
          let k = { l: 0, r: 0, t: 0, b: 0, any: false };
          expect(() => (k = ink((c) => e.draw(c, VIEW, f, h)))).not.toThrow();
          const where = `${e.id} heading ${h} frame ${e.frames[f]}`;
          expect(k.any, where).toBe(true);
          expect(k.l, where).toBeGreaterThanOrEqual(box.x - 1);
          expect(k.t, where).toBeGreaterThanOrEqual(box.y - 1);
          expect(k.r, where).toBeLessThanOrEqual(box.x + box.w + 1);
          expect(k.b, where).toBeLessThanOrEqual(box.y + box.h + 1);
          // and inside the union the atlas packs today
          expect(k.l >= e.bounds.x - 1 && k.r <= e.bounds.x + e.bounds.w + 1 && k.t >= e.bounds.y - 1 && k.b <= e.bounds.y + e.bounds.h + 1, where).toBe(true);
        }
      });
    }
  }, 120_000);

  it('nobody bears more than a hand load: a person with a hand load is no taller than the hat', async () => {
    const P = await import('../people.draw');
    for (const dir of ['s', 'e', 'n'] as const) {
      const bare = ink((c) => P.drawPerson(c, VIEW, { dir, pose: 'walk', frame: 1, shadow: false }));
      for (const fam of P.LOAD_FAMILIES) {
        const loaded = ink((c) => P.drawPerson(c, VIEW, { dir, pose: 'walk', frame: 1, load: fam, shadow: false }));
        expect(loaded.t, `${dir} ${fam}`).toBeGreaterThanOrEqual(bare.t);
      }
    }
  });

  it('layered actors name only entries that exist, frames and headings in range', () => {
    const byId = new Map(M.PEOPLE.map((e) => [e.id, e]));
    const layers: import('./people').Layer[] = [];
    for (const who of ['boss', 'crew'] as const)
      for (const pose of ['stand', 'walk', 'push', 'feed', 'pour', 'sledge', 'grinder', 'torch'] as const)
        for (let h = 0; h < 4; h++)
          layers.push(
            ...M.personLayers({ who, pose, frame: 0, heading: h, hand: who === 'boss' && pose === 'walk' ? 'mot' : undefined, carrier: pose === 'push' ? { kind: h % 2 ? 'sack' : 'trolley', load: h === 3 ? 'br' : null } : undefined }),
          );
    layers.push(...M.personLayers({ who: 'boss', pose: 'spanner', frame: 1, heading: 1 }));
    for (let h = 0; h < 8; h++) layers.push(...M.truckLayers(h, 'demolition-full'));
    layers.push(...M.skipLayers('farm-trial'));
    for (let h = 0; h < 4; h++) layers.push(...M.flatbedLayers(h, { cargo: 'part' }), ...M.vanLayers(h, true));
    layers.push(...M.flatbedLayers(3, { crane: 2, cargo: 'full' }));
    for (const l of layers) {
      const e = byId.get(l.id);
      expect(e, l.id).toBeDefined();
      expect(l.frame, l.id).toBeLessThan(e!.frames.length);
      expect(l.heading, l.id).toBeLessThan(e!.headings);
    }
  });

  it('a pushed carrier is drawn after the person, except when the person faces north', () => {
    const south = M.personLayers({ who: 'boss', pose: 'push', frame: 0, heading: 0, carrier: { kind: 'sack', load: 'fe' } });
    const north = M.personLayers({ who: 'boss', pose: 'push', frame: 0, heading: 2, carrier: { kind: 'sack', load: 'fe' } });
    expect(south.map((l) => l.id)).toEqual(['person.boss.push', 'carrier.sack']);
    expect(north.map((l) => l.id)).toEqual(['carrier.sack', 'person.boss.push']);
    const crew = M.personLayers({ who: 'crew', pose: 'walk', frame: 2, heading: 1 });
    expect(crew.map((l) => l.id)).toEqual(['person.crew.walk', 'person.crew.vest.walk']);
  });

  it('the part fits what it asks of sheets A and B at density 3 (tight boxes)', () => {
    const b = M.budget(3);
    expect(b.A.tight).toBeLessThanOrEqual(M.SHARE_PX.A);
    expect(b.B.tight).toBeLessThanOrEqual(M.SHARE_PX.B);
  });
});
