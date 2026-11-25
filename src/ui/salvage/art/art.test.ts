/**
 * The scrapyard kit's checks (docs/design/yard-style.md): the palette's rules (metals told apart by
 * more than hue, ink readable on paper and on hi-vis, orange only for heat), the letterings' tables,
 * the loading animation's timeline, and that every drawing leaves ink inside the box its anchor
 * promises (so the world's atlas can bake it). Skia runs on CanvasKit (as scripts/art/headless.ts).
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

import { LADDER_ORDER, METAL, SUN, YARD, contrast, coolingColour, lightness, rgbOf } from './palette';
import { DOTS, STENCIL } from './letters';
import { LOADING_T, PLATE_KG, groupKg, loadingPose } from './loading.draw';

type SkiaT = typeof import('@shopify/react-native-skia');
let S: SkiaT;
beforeAll(async () => {
  S = await import('@shopify/react-native-skia');
}, 60_000);

describe('palette', () => {
  it('every colour is a #RRGGBB hex', () => {
    for (const [k, v] of Object.entries(YARD)) expect(v, k).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
  it('neighbouring metals on the ladder differ in sheen mark and pictogram, not only hue', () => {
    for (let i = 1; i < LADDER_ORDER.length; i++) {
      const a = METAL[LADDER_ORDER[i - 1]];
      const b = METAL[LADDER_ORDER[i]];
      expect(a.sheen === b.sheen && a.pictogram === b.pictogram, `${LADDER_ORDER[i - 1]} / ${LADDER_ORDER[i]}`).toBe(false);
      expect(a.pictogram).not.toBe(b.pictogram);
    }
  });
  it('neighbouring metals on the ladder are at least 20 L* apart, so they part in greyscale too', () => {
    for (let i = 1; i < LADDER_ORDER.length; i++) {
      const a = METAL[LADDER_ORDER[i - 1]].base;
      const b = METAL[LADDER_ORDER[i]].base;
      expect(Math.abs(lightness(a) - lightness(b)), `${LADDER_ORDER[i - 1]} / ${LADDER_ORDER[i]}`).toBeGreaterThanOrEqual(20);
    }
  });
  it('no metal carries a four-point sparkle (it pushes toward bullion; spec 11)', () => {
    for (const m of Object.values(METAL)) expect(m.sheen as string).not.toBe('glint');
  });
  it('ink reads on ticket paper and on hi-vis yellow', () => {
    expect(contrast(YARD.ink, YARD.paper)).toBeGreaterThanOrEqual(7);
    expect(contrast(YARD.ink, YARD.hivis)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(YARD.led, YARD.ledCase)).toBeGreaterThanOrEqual(7);
  });
  it('orange is kept for heat: no other colour sits near the furnace glow', () => {
    const heat = new Set(['glow', 'glowHot', 'glowWhite', 'spark']);
    const [r0, g0, b0] = rgbOf(YARD.glow);
    for (const [k, v] of Object.entries(YARD)) {
      if (heat.has(k)) continue;
      const [r, g, b] = rgbOf(v);
      expect(Math.hypot(r - r0, g - g0, b - b0), k).toBeGreaterThan(45);
    }
  });
  it('an ingot cools from the glow to its metal in 3 s', () => {
    expect(coolingColour('brass', 0).toUpperCase()).toBe(YARD.glowHot.toUpperCase());
    expect(coolingColour('brass', 3).toUpperCase()).toBe(METAL.brass.base.toUpperCase());
    expect(coolingColour('copper', 10).toUpperCase()).toBe(METAL.copper.base.toUpperCase());
  });
});

describe('letterings', () => {
  it('every dot-matrix glyph is 5 x 7 and leaves dots (space aside)', () => {
    for (const [k, g] of Object.entries(DOTS)) {
      expect(g.length, k).toBe(35);
      expect(g.some(Boolean), k).toBe(true);
    }
    for (const ch of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,:-/%§×') expect(DOTS[ch], ch).toBeDefined();
  });
  it('stencil glyphs stay on their 4 x 6 grid', () => {
    for (const [k, g] of Object.entries(STENCIL))
      for (const s of g) {
        expect(s.length % 2, k).toBe(0);
        for (let i = 0; i < s.length; i += 2) {
          expect(s[i], k).toBeGreaterThanOrEqual(0);
          expect(s[i], k).toBeLessThanOrEqual(4.2);
          expect(s[i + 1], k).toBeGreaterThanOrEqual(0);
          expect(s[i + 1], k).toBeLessThanOrEqual(6.8);
        }
      }
  });
  it('groups kilograms without locale tables', () => {
    expect(groupKg(0)).toBe('0');
    expect(groupKg(780)).toBe('780');
    expect(groupKg(1240)).toBe('1,240');
  });
});

describe('loading timeline', () => {
  const total = PLATE_KG.reduce((a, b) => a + b, 0);
  it('the display only counts up, and reads the final weight once the third plate lands', () => {
    let last = -1;
    for (let t = 0; t <= LOADING_T.end; t += 0.01) {
      const p = loadingPose(t);
      expect(p.kg).toBeGreaterThanOrEqual(last);
      last = p.kg;
    }
    expect(loadingPose(LOADING_T.plates[2][1]).kg).toBe(total);
    expect(loadingPose(0).kg).toBe(0);
  });
  it('plates land in order and each shakes once', () => {
    for (let i = 0; i < 3; i++) {
      expect(loadingPose(LOADING_T.plates[i][0] - 0.01).plates[i].drop).toBe(0);
      expect(loadingPose(LOADING_T.plates[i][1] + 0.01).plates[i].drop).toBe(1);
      expect(loadingPose(LOADING_T.plates[i][1] + 0.2).plates[i].shake).toBe(0);
    }
  });
  it('the ticket feeds out only after the pour, and is out by the gate', () => {
    expect(loadingPose(LOADING_T.pour[1] - 0.01).ticket).toBe(0);
    expect(loadingPose(LOADING_T.gate[0]).ticket).toBe(1);
  });
  it('nothing pours before the title stands; the bar is poured by 2.1 s and brass by 2.4 s', () => {
    expect(loadingPose(1.5).tilt).toBe(0);
    expect(loadingPose(1.5).pour).toBe(0);
    expect(loadingPose(LOADING_T.pour[1]).pour).toBe(1);
    expect(loadingPose(LOADING_T.cool[1]).cool).toBeGreaterThanOrEqual(3);
  });
});

describe('drawings', () => {
  /** Draws at the centre of a surface and returns the bounds of the pixels it touched (points from the anchor). */
  const inkBounds = (draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, half = 220) => {
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
          r = Math.max(r, x);
          t = Math.min(t, y);
          b = Math.max(b, y);
        }
    return { l: l - half, r: r - half, t: t - half, b: b - half, any: r >= 0 };
  };

  it('a person stands on the anchor, about 47 points tall, within half a metre each side', async () => {
    const { drawPerson } = await import('./people.draw');
    const { VIEW } = await import('./pen');
    for (const dir of ['s', 'e', 'n', 'w'] as const)
      for (const pose of ['stand', 'walk', 'cut', 'carry'] as const) {
        const k = inkBounds((c) => drawPerson(c, VIEW, { dir, pose, frame: 1 }));
        expect(k.any).toBe(true);
        expect(k.b, `${dir} ${pose}`).toBeLessThanOrEqual(10);
        expect(k.t, `${dir} ${pose}`).toBeGreaterThanOrEqual(pose === 'carry' ? -80 : -56);
        expect(-k.l, `${dir} ${pose}`).toBeLessThanOrEqual(pose === 'cut' ? 40 : 26);
        expect(k.r, `${dir} ${pose}`).toBeLessThanOrEqual((pose === 'cut' ? 40 : 26) + 1.1 * SUN.dx * VIEW.ppm);
      }
  });

  it('every kit drawing leaves ink and stays inside a box of its footprint plus its height', async () => {
    const Sd = await import('./scrap.draw');
    const M = await import('./plant.draw');
    const { VIEW } = await import('./pen');
    const P = VIEW.ppm;
    // [name, draw, half width m, half depth m, height m]
    const cases: [string, (c: import('@shopify/react-native-skia').SkCanvas) => void, number, number, number][] = [
      ['washer', (c) => Sd.drawWasher(c, VIEW, 'whole'), 0.5, 0.5, 0.9],
      ['washer stripped', (c) => Sd.drawWasher(c, VIEW, 'stripped'), 0.6, 0.5, 0.9],
      ['washer pieces', (c) => Sd.drawWasher(c, VIEW, 'pieces'), 0.7, 0.6, 0.4],
      ['cable drum', (c) => Sd.drawCableDrum(c, VIEW), 0.8, 0.7, 1.2],
      ['cable coil', (c) => Sd.drawCoil(c, VIEW, 'cable'), 0.7, 0.7, 0.3],
      ['bare bright', (c) => Sd.drawBrightCopper(c, VIEW), 0.5, 0.5, 0.4],
      ['tap crate', (c) => Sd.drawTapCrate(c, VIEW), 0.5, 0.4, 0.56],
      ['radiator', (c) => Sd.drawRadiator(c, VIEW), 0.65, 0.3, 0.75],
      ['ingot', (c) => Sd.drawIngot(c, VIEW, 'brass'), 0.4, 0.3, 0.2],
      ['stripper', (c) => M.drawStripper(c, VIEW), 1.6, 0.8, 1.9],
      ['weighbridge', (c) => M.drawWeighbridgeDeck(c, VIEW), 2.0, 1.4, 0.2],
      ['display', (c) => M.drawWeighDisplay(c, VIEW, '1,240'), 1.1, 0.4, 3.2],
      ['crucible cold', (c) => M.drawFurnaceSet(c, VIEW, 'cold'), 2.4, 1.2, 3.3],
      ['crucible pouring', (c) => M.drawFurnaceSet(c, VIEW, 'pouring'), 3.4, 1.8, 3.3], // the melt's light pool reaches past the pad
      ['truck', (c) => M.drawTruck(c, VIEW, 0.6), 2.7, 2.7, 2.6],
      ['container', (c) => M.drawContainer(c, VIEW, YARD.containerTeal, { len: 4 }), 2.2, 1.4, 2.8],
      ['pad', (c) => M.drawPad(c, VIEW, 3, 2, true), 1.7, 1.2, 0.2],
      ['bay', (c) => M.drawBay(c, VIEW, 2.4, 2.0, { heap: ['copper'], code: 'CU', hold: true }), 2.1, 1.4, 2.0],
    ];
    for (const [name, draw, hw, hd, h] of cases) {
      const k = inkBounds(draw, 260);
      expect(k.any, name).toBe(true);
      expect(-k.l, name).toBeLessThanOrEqual(hw * P + 2);
      // the low sun throws shadows east: up to SUN.dx of the height beyond the footprint
      expect(k.r, name).toBeLessThanOrEqual((hw + h * SUN.dx) * P + 2);
      expect(k.b, name).toBeLessThanOrEqual(hd * P * VIEW.tilt + 2);
      expect(-k.t, name).toBeLessThanOrEqual((h * VIEW.lift + hd * VIEW.tilt) * P + 2);
    }
  });

  it('the proof and the loading frames draw at both phone sizes', async () => {
    const PR = await import('./proof.draw');
    const LD = await import('./loading.draw');
    const T = (_c: unknown, text: string, _x: number, _y: number, o: { size: number }) => text.length * o.size * 0.55;
    for (const L of [PR.PROOF_844, PR.PROOF_667]) {
      const surface = S.Skia.Surface.MakeOffscreen(L.w, L.h)!;
      expect(() => PR.drawProof(surface.getCanvas(), L, T)).not.toThrow();
      expect(() => LD.drawLoading(surface.getCanvas(), L.w, L.h, LD.loadingPose(1.9))).not.toThrow();
    }
  });
});
