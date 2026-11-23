/**
 * The art kit's checks (spec 4.5, 7.2, 9.2 P4): every good, gear, animal and name the schema and
 * game.json use has a drawing; the atlases fit in 2,048 px; no two goods share a picture; the red
 * accent stays a small share of the mock screen. Skia runs on CanvasKit (the library's own test
 * double, as scripts/art/headless.ts does).
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@shopify/react-native-skia', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // The test double requires react-native: give it the web build (as scripts/art/headless.ts does).
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

type Kit = typeof import('./index');
let K: Kit;
let Skia: typeof import('@shopify/react-native-skia').Skia;

beforeAll(async () => {
  K = await import('./index');
  Skia = (await import('@shopify/react-native-skia')).Skia;
}, 60_000);

const ROOT = path.resolve(__dirname, '../../../..');
const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/night-market/game.json'), 'utf8'));

function render(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, size = 48, scale = 2): Uint8Array {
  const px = size * scale;
  const s = Skia.Surface.Make(px, px)!;
  const c = s.getCanvas();
  c.clear(Skia.Color('#00000000'));
  c.scale(scale, scale);
  c.translate(size / 2, size / 2);
  draw(c);
  s.flush();
  return s.makeImageSnapshot().readPixels(0, 0, { width: px, height: px, colorType: 4, alphaType: 3 }) as Uint8Array;
}

function inked(px: Uint8Array): number {
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 16) n++;
  return n / (px.length / 4);
}

describe('names used by the game have drawings', () => {
  it('every chain of game.json is a kit chain with eight tiers, in data order', () => {
    const chains = game.merge.chains as { id: string; tiers: string[]; minder: { beast: string } }[];
    expect(chains.map((c) => c.id)).toEqual([...K.CHAIN_IDS].slice(0, chains.length));
    for (const c of chains) expect(c.tiers).toHaveLength(8);
  });

  it('every minder beast, character portrait and customer has an icon', () => {
    const names = new Set<string>();
    for (const c of game.merge.chains) names.add(`beast:${c.minder.beast}`);
    for (const ch of game.characters ?? []) if (typeof ch.portrait === 'string' && ch.portrait.startsWith('beast:')) names.add(ch.portrait);
    const customers: string[] = game.merge.tickets?.customers ?? ['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl'];
    const coats: number = game.merge.tickets?.coats ?? 3;
    expect(coats).toBeLessThanOrEqual(K.COATS);
    for (const sp of customers) for (let k = 0; k < coats; k++) names.add(`beast:${sp}-${k}`);
    for (const n of names) expect(K.hasMergeIcon(n), n).toBe(true);
    for (const sp of customers) for (let k = 0; k < coats; k++) expect(K.hasMergeIcon(K.customerIcon(sp, k)), sp).toBe(true);
    for (let c = 0; c < 6; c++) expect(K.hasMergeIcon(K.minderIcon(c))).toBe(true);
  });

  it('every customer and minder of the schema is a kit species, and every atlas id exists', () => {
    const a = K.spriteIds('animals');
    for (const sp of K.CUSTOMER_SPECIES) for (let k = 0; k < K.COATS; k++) expect(a).toContain(K.customerSprite(sp, k));
    for (let c = 0; c < 6; c++) expect(a).toContain(K.minderSprite(c));
    expect(a).toContain('dragon');
    for (const c of game.merge.chains) expect(K.SPECIES as readonly string[]).toContain(c.minder.beast);
    const items = K.spriteIds('items');
    for (let c = 0; c < 6; c++) {
      expect(items).toContain(K.gearSprite(c));
      for (let k = 1; k <= 8; k++) expect(items).toContain(K.goodSprite(c, k));
    }
    const stalls = K.spriteIds('stalls');
    for (let c = 0; c < 6; c++) for (const aw of [0, 1, 2] as const) for (const silk of [false, true]) expect(stalls).toContain(K.stallSprite(c, aw, silk));
  });

  it('every icon draws something', () => {
    for (const n of K.mergeIconNames()) expect(inked(render((c) => K.mergeIcons()[n](c, 40), 40, 1)), n).toBeGreaterThan(0.03);
  });

  it('the letters cover the app name', () => {
    expect(K.lettersCover(game.app.displayName)).toBe(true);
  });
});

describe('atlases', () => {
  it('fit in 2,048 px at their spec density and at 1x to 3x', () => {
    for (const kind of K.ATLAS_KINDS)
      for (const d of [1, 2, 3, K.SPEC_DENSITY[kind]]) {
        const s = K.atlasSize(kind, d);
        expect(s.width, kind).toBeLessThanOrEqual(2048);
        expect(s.height, kind).toBeLessThanOrEqual(2048);
      }
  });

  it('have the specified sizes (spec cells plus a 2 px transparent border each)', () => {
    expect(K.atlasSize('items')).toEqual({ density: 3, width: 8 * 148, height: 8 * 148 });
    expect(K.atlasSize('animals')).toEqual({ density: 3, width: 5 * 164, height: 5 * 164 });
    expect(K.atlasSize('stalls')).toEqual({ density: 4.8, width: 6 * 292, height: 7 * 196 });
    expect(K.spriteIds('items').length).toBeLessThanOrEqual(64);
    expect(K.spriteIds('animals')).toHaveLength(25);
  });

  it('ids are unique', () => {
    for (const kind of K.ATLAS_KINDS) {
      const ids = K.spriteIds(kind);
      expect(new Set(ids).size, kind).toBe(ids.length);
    }
  });

  it('no sprite is clipped: every rect edge is transparent (busts are cut at the bottom on purpose)', () => {
    for (const kind of K.ATLAS_KINDS) {
      const a = K.bakeAtlas(kind)!;
      const px = a.image.readPixels(0, 0, { width: a.width, height: a.height, colorType: 4, alphaType: 3 }) as Uint8Array;
      const at = (x: number, y: number) => px[(y * a.width + x) * 4 + 3];
      const bad: string[] = [];
      for (const [name, sp] of Object.entries(a.sprites)) {
        const x0 = Math.round(sp.rect.x);
        const y0 = Math.round(sp.rect.y);
        const x1 = Math.round(sp.rect.x + sp.rect.width) - 1;
        const y1 = Math.round(sp.rect.y + sp.rect.height) - 1;
        const cutBottom = kind === 'animals' && name !== 'dragon';
        let m = 0;
        for (let x = x0; x <= x1; x++) m = Math.max(m, at(x, y0), cutBottom ? 0 : at(x, y1));
        for (let y = y0; y <= y1; y++) m = Math.max(m, at(x0, y), at(x1, y));
        if (m > 8) bad.push(`${name} ${m}`);
      }
      expect(bad, kind).toEqual([]);
    }
  }, 120_000);

  it('mergeAtlas bakes once per kind and density and hands out the same atlas', () => {
    const a = K.mergeAtlas('animals', 1);
    expect(a).not.toBeNull();
    expect(K.mergeAtlas('animals', 1)).toBe(a);
  }, 30_000);

  it('bake into an image with a rectangle per sprite', () => {
    const a = K.bakeAtlas('animals', 1)!;
    expect(a).not.toBeNull();
    expect(Object.keys(a.sprites)).toHaveLength(25);
    expect(a.image.width()).toBe(a.width);
  }, 30_000);
});

describe('goods', () => {
  it('no two goods share a picture', () => {
    const seen = new Map<string, string>();
    for (const [c, k] of K.allGoods()) {
      const px = render((q) => K.drawGood(q, c, k, { pip: false }), 48, 1);
      // A coarse fingerprint: 12 x 12 blocks of mean colour.
      const f: number[] = [];
      for (let by = 0; by < 12; by++)
        for (let bx = 0; bx < 12; bx++) {
          let s = 0;
          for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
            const i = ((by * 4 + y) * 48 + bx * 4 + x) * 4;
            s += px[i] + px[i + 1] * 3 + px[i + 2] * 7 + px[i + 3] * 11;
          }
          f.push(Math.round(s / 64));
        }
      const key = f.join(',');
      expect(seen.get(key), `${c}/${k}`).toBeUndefined();
      seen.set(key, `${c}/${k}`);
    }
    expect(seen.size).toBe(48);
  }, 60_000);

  it('neighbouring tiers differ in greyscale without the pip', () => {
    for (let c = 0; c < 6; c++)
      for (let k = 1; k < 8; k++) {
        const a = K.lumaOf(render((q) => K.drawGood(q, c, k, { pip: false })), 40);
        const b = K.lumaOf(render((q) => K.drawGood(q, c, k + 1, { pip: false })), 40);
        expect(K.greyDistance(a, b).changed, `${c} ${k}-${k + 1}`).toBeGreaterThan(0.08);
      }
  }, 60_000);

  it('the same tier of two chains differs in greyscale as much as neighbouring tiers must', () => {
    for (let k = 1; k <= 8; k++) {
      const L = [0, 1, 2, 3, 4, 5].map((c) => K.lumaOf(render((q) => K.drawGood(q, c, k, { pip: false })), 40));
      for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) expect(K.greyDistance(L[a], L[b]).changed, `tier ${k}: ${a}/${b}`).toBeGreaterThan(0.08);
    }
  }, 60_000);
});

describe('red accent', () => {
  it('isRed knows the accent and not the amber, brass or rose', () => {
    expect(K.isRed(0xc8, 0x42, 0x3b)).toBe(true);
    expect(K.isRed(0xf2, 0xa5, 0x41)).toBe(false);
    expect(K.isRed(0xc9, 0xa4, 0x5c)).toBe(false);
    expect(K.isRed(0xd6, 0x5c, 0x86)).toBe(false);
  });

  it('the mock screen is under 10 % red', async () => {
    const { drawMainMock } = await import('./mock.draw');
    for (const [w, h] of [
      [375, 667],
      [390, 844],
    ] as const) {
      const s = Skia.Surface.Make(w, h)!;
      drawMainMock(s.getCanvas(), w, h);
      s.flush();
      const px = s.makeImageSnapshot().readPixels(0, 0, { width: w, height: h, colorType: 4, alphaType: 3 }) as Uint8Array;
      expect(K.redShare(px)).toBeLessThan(0.1);
    }
  }, 60_000);
});
