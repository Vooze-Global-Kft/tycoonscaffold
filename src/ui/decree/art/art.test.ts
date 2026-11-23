/**
 * The props kit's checks (office-design.md 4.5, 4.6, 9.2 P4): every club, ministry, Grand Project,
 * monument, product and icon name the schema and game.json use has a drawing that leaves ink; the
 * atlases fit (props in 1,024 x 1,024, every page under 2,048 px) and no sprite draws past its rect;
 * approve and refuse are never green and red; brick stays under 8 % of the mock desk. Skia runs on
 * CanvasKit (the library's own test double, as scripts/art/headless.ts does).
 */
import fs from 'node:fs';
import path from 'node:path';
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

type Kit = typeof import('./index');
let K: Kit;
let Skia: typeof import('@shopify/react-native-skia').Skia;

beforeAll(async () => {
  K = await import('./index');
  Skia = (await import('@shopify/react-native-skia')).Skia;
}, 60_000);

const ROOT = path.resolve(__dirname, '../../../..');
const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/high-office/game.json'), 'utf8'));

function render(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, size = 24, scale = 2): Uint8Array {
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

const iconInk = (name: string, size = 24) => {
  const d = K.resolveDecreeIcon(name);
  return d ? inked(render((c) => d(c, size), size)) : 0;
};

describe('names the game uses have drawings', () => {
  it('every club of the schema and of game.json', () => {
    const ids = new Set<string>([...K.CLUB_IDS, ...game.decree.clubs.map((c: { id: string }) => c.id)]);
    for (const id of ids) {
      expect(K.clubOf(id), id).not.toBeNull();
      expect(iconInk(K.clubIcon(id)), id).toBeGreaterThan(0.25);
      expect(iconInk(K.clubIcon(id, true)), `${id} boycott`).toBeGreaterThan(0.25);
    }
    for (const c of game.decree.clubs) expect(iconInk(c.icon), c.icon).toBeGreaterThan(0.25);
  });

  it('every ministry and Grand Project of game.json, and the register ids', () => {
    const ids: string[] = [...game.decree.offices.flatMap((o: { ministries: { id: string }[] }) => o.ministries.map((m) => m.id)), ...game.decree.grandProjects.map((p: { id: string }) => p.id)];
    expect(ids.length).toBeGreaterThanOrEqual(23);
    for (const id of ids) {
      expect(K.ministryArtOf(id), id).not.toBeNull();
      expect(iconInk(K.ministryIcon(id)), id).toBeGreaterThan(0.08);
    }
    for (const alias of Object.keys(K.MINISTRY_ALIASES)) expect(K.ministryArtOf(alias), alias).not.toBeNull();
  });

  it('the 24 monuments, each its own picture, at most 8 statues; any written name resolves', () => {
    expect(K.MONUMENTS.length).toBe(24);
    expect(K.MONUMENTS.filter((m) => m.statue).length).toBeLessThanOrEqual(8);
    const seen = new Set<string>();
    for (const m of K.MONUMENTS) {
      const px = render((c) => K.drawMonument(c, m.id));
      expect(inked(px), m.id).toBeGreaterThan(0.08);
      const key = Buffer.from(px).toString('base64');
      expect(seen.has(key), `${m.id} duplicates another`).toBe(false);
      seen.add(key);
    }
    for (const m of game.decree.deck?.monuments ?? game.decree.monuments ?? []) expect(iconInk(K.monumentIcon(m.id)), m.id).toBeGreaterThan(0.08);
    expect(K.monumentArtOf('A bust of the bust')).toBe('bust-of-bust');
    expect(K.MONUMENT_IDS).toContain(K.monumentArtOf('Something nobody drew'));
  });

  it('every product of game.json has an icon', () => {
    for (const p of game.monetization.iap.products) expect(iconInk(`art:product_${p.id}`), p.id).toBeGreaterThan(0.08);
  });

  it('every "art:" and "face:" name in game.json resolves', () => {
    const text = fs.readFileSync(path.join(ROOT, 'games/high-office/game.json'), 'utf8');
    const names = new Set([...text.matchAll(/"((?:art|face):[^"]+)"/g)].map((m) => m[1]));
    for (const n of names) {
      if (n === 'face:test') continue; // the skeleton's fixture visitor, not a cast member
      expect(K.resolveDecreeIcon(n), n).not.toBeNull();
    }
  });

  it('every registered icon leaves ink at 18 pt', () => {
    for (const n of K.decreeIconNames()) {
      if (n === 'art:storeys_0') continue; // the bare plinth line of an empty margin
      expect(iconInk(n, 18), n).toBeGreaterThan(0.02);
    }
  });

  it('every player face has its own signature', () => {
    for (const p of game.decree.cast.players) expect(K.SIGNATURE_IDS, p.id).toContain(p.id);
    expect(new Set(K.SIGNATURE_IDS.map((id) => K.signatureOf(id).total.toFixed(1))).size).toBe(K.SIGNATURE_IDS.length);
  });
});

describe('atlases', () => {
  it('props fits 1,024 x 1,024 at 3 px a point; the face pages fit 2,048', () => {
    const p = K.atlasSize('props', 3);
    expect(p.density).toBe(3);
    expect(p.width).toBeLessThanOrEqual(1024);
    expect(p.height).toBeLessThanOrEqual(1024);
    for (const k of K.ATLAS_KINDS) {
      const s = K.atlasSize(k);
      expect(s.width, k).toBeLessThanOrEqual(2048);
      expect(s.height, k).toBeLessThanOrEqual(2048);
    }
  });

  it('no props sprite draws into its 2 px border', () => {
    const a = K.bakeAtlas('props', 3)!;
    const px = a.image.readPixels(0, 0, { width: a.width, height: a.height, colorType: 4, alphaType: 3 }) as Uint8Array;
    for (const [name, s] of Object.entries(a.sprites)) {
      const { x, y, width, height } = s.rect;
      for (let i = 0; i < width; i++)
        for (const yy of [y, y + height - 1]) expect(px[(yy * a.width + x + i) * 4 + 3], `${name} edge`).toBe(0);
      for (let j = 0; j < height; j++)
        for (const xx of [x, x + width - 1]) expect(px[((y + j) * a.width + xx) * 4 + 3], `${name} edge`).toBe(0);
    }
    expect(Object.keys(a.sprites).length).toBe(K.spriteIds('props').length);
  });
});

describe('palette rules', () => {
  it('SIGN and REFUSE are never green and red', () => {
    expect(K.isGreenRedPair(K.DESK.violet, K.DESK.slate)).toBe(false);
    expect(K.isGreenRedPair('#2E8B57', '#C0392B')).toBe(true);
  });

  it('brick stays under 8 % of the mock desk, boycott and scandal included', () => {
    for (const [w, h] of [
      [375, 667],
      [390, 844],
    ] as const)
      for (const paper of ['day', 'grievance', 'front'] as const) {
        const s = Skia.Surface.Make(w, h)!;
        K.drawDeskMock(s.getCanvas(), w, h, { paper, office: paper === 'grievance' ? 2 : 0 });
        s.flush();
        const px = s.makeImageSnapshot().readPixels(0, 0, { width: w, height: h, colorType: 4, alphaType: 3 }) as Uint8Array;
        expect(K.brickShare(px), `${w}x${h} ${paper}`).toBeLessThan(K.BRICK_MAX_SHARE);
      }
  });

  it('the club terracotta is not counted as brick', () => {
    expect(K.isBrick(...K.rgbOf(K.CLUB.bus.main))).toBe(false);
    expect(K.isBrick(...K.rgbOf(K.DESK.brick))).toBe(true);
  });
});
