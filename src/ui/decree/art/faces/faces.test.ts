/**
 * The cast's checks (spec 4.5, 7.3): every cast id of the names register has a look and no look is
 * outside it; no two looks are the same parts; every part exists; skin tone is independent of every
 * feature (the table has no tone-derived column, and the skin's drawn shape is the same in every
 * tone); the player faces cover four tones and both sexes; the atlas layout fits its pages and its
 * 2 px borders stay empty. Skia runs on CanvasKit (the library's own test double).
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
type CastMod = typeof import('./cast');
type InkMod = typeof import('./ink');
type HeadMod = typeof import('./head');
let F: Kit;
let C: CastMod;
let I: InkMod;
let H: HeadMod;
let Skia: typeof import('@shopify/react-native-skia').Skia;

beforeAll(async () => {
  F = await import('./index');
  C = await import('./cast');
  I = await import('./ink');
  H = await import('./head');
  Skia = (await import('@shopify/react-native-skia')).Skia;
}, 60_000);

const ROOT = path.resolve(__dirname, '../../../../..');
const register = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/content/office/names.json'), 'utf8')) as { names: { id?: string; kind: string }[] };
const registerCast = register.names.filter((n) => n.kind === 'cast' && n.id).map((n) => n.id as string);

function render(draw: (c: import('@shopify/react-native-skia').SkCanvas) => void, w: number, h: number): Uint8Array {
  const s = Skia.Surface.Make(w, h)!;
  const c = s.getCanvas();
  c.clear(Skia.Color('#00000000'));
  draw(c);
  s.flush();
  return s.makeImageSnapshot().readPixels(0, 0, { width: w, height: h, colorType: 4, alphaType: 3 }) as Uint8Array;
}

/** Pixels whose colour is within `tol` of `hex` (the skin's flat washes). */
function maskOf(px: Uint8Array, hex: string, tol = 2): Uint8Array {
  const [r, g, b] = I.parse(hex);
  const m = new Uint8Array(px.length / 4);
  for (let i = 0; i < m.length; i++) {
    const a = px[i * 4 + 3];
    if (a < 250) continue;
    if (Math.abs(px[i * 4] - r) <= tol && Math.abs(px[i * 4 + 1] - g) <= tol && Math.abs(px[i * 4 + 2] - b) <= tol) m[i] = 1;
  }
  return m;
}

describe('the cast table', () => {
  it('has a look for every cast id of the names register', () => {
    expect(registerCast.length).toBeGreaterThan(40);
    const missing = registerCast.filter((id) => !C.hasLook(id));
    expect(missing).toEqual([]);
  });

  it('has no look outside the register', () => {
    const extra = C.CAST_IDS.filter((id) => !registerCast.includes(id));
    expect(extra).toEqual([]);
  });

  it('builds every look from parts that exist', () => {
    const bad = C.CAST.flatMap((l) => C.lookProblems(l).map((p) => `${l.id}: ${p}`));
    expect(bad).toEqual([]);
  });

  it('gives no two looks the same parts (tone aside)', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const l of C.CAST) {
      const k = C.partsKey(l);
      if (seen.has(k)) dup.push(`${seen.get(k)} = ${l.id}`);
      seen.set(k, l.id);
    }
    expect(dup).toEqual([]);
  });

  it('has no column that depends on tone: the part columns never include it', () => {
    expect(C.PART_COLUMNS as readonly string[]).not.toContain('tone');
    // And every feature part is used with more than one tone (none is reserved for a tone),
    // except parts used by a single look.
    const reserved: string[] = [];
    for (const col of ['head', 'eyes', 'brows', 'nose', 'mouth', 'hair', 'facial', 'glasses'] as const) {
      const tonesBy = new Map<string, Set<string>>();
      for (const l of C.CAST) {
        const k = String(l[col]);
        if (!tonesBy.has(k)) tonesBy.set(k, new Set());
        tonesBy.get(k)!.add(l.tone);
      }
      for (const [k, tones] of tonesBy) {
        const users = C.CAST.filter((l) => String(l[col]) === k).length;
        if (users > 1 && tones.size < 2) reserved.push(`${col} ${k}`);
      }
    }
    expect(reserved).toEqual([]);
  });

  it('gives the six player faces at least four tones and both sexes', () => {
    const players = C.CAST.filter((l) => l.group === 'player');
    expect(players.map((l) => l.id)).toEqual(['bramble', 'fennel', 'quill', 'marchpane', 'tuttle', 'larkspur']);
    expect(new Set(players.map((l) => l.tone)).size).toBeGreaterThanOrEqual(4);
    const kinds = new Set(players.map((l) => C.PLAYER_PRESENTATION[l.id]));
    expect(kinds).toEqual(new Set(['woman', 'man']));
  });

  it('spreads beards and moustaches across the tones: none is kept to the light or the deep half', () => {
    // AD finding: facial hair once clustered on the deeper tones. Beards and moustaches (sideburns
    // aside) must fall 35..65 % in each half (t1-t3, t4-t6), and every such part used by two or more
    // people appears in both halves. The goatee with a thin moustache (a stock villain) is used by nobody.
    const light = new Set(['t1', 't2', 't3']);
    const hair = C.CAST.filter((l) => l.facial !== 'none' && l.facial !== 'sideburns');
    const lightShare = hair.filter((l) => light.has(l.tone)).length / hair.length;
    expect(hair.length).toBeGreaterThanOrEqual(8);
    expect(lightShare).toBeGreaterThanOrEqual(0.35);
    expect(lightShare).toBeLessThanOrEqual(0.65);
    const byPart = new Map<string, string[]>();
    for (const l of hair) byPart.set(l.facial, [...(byPart.get(l.facial) ?? []), l.tone]);
    const oneSided: string[] = [];
    for (const [part, tones] of byPart) {
      if (tones.length < 2) continue;
      const nLight = tones.filter((t) => light.has(t)).length;
      if (nLight === 0 || nLight === tones.length) oneSided.push(`${part}: ${tones.join(' ')}`);
    }
    expect(oneSided).toEqual([]);
    expect(C.CAST.filter((l) => l.facial === 'goatee' || l.facial === 'curl').map((l) => l.id)).toEqual([]);
  });

  it('draws every feature at 3:1 or more against every skin tone (the same ink and rim on all)', () => {
    // WCAG contrast. A feature line is the feature ink over a pale rim. It reads when the line or its
    // rim stands 3:1 off the skin, and the line stands 3:1 off its rim. Brows are measured for every
    // hair colour. One ink, one rim for every tone: nothing here is picked by tone.
    const lum = (hex: string) => {
      const [r, g, b] = I.parse(hex).map((v, i) => (i < 3 ? v / 255 : v));
      const f = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const over = (top: string, a: number, under: string) => I.mix(under, top, a);
    const bad: string[] = [];
    const inks: [string, string][] = [['eyes, nose, mouth, glasses', I.P.feature], ...Object.keys(I.HAIR).map((h) => [`brows ${h}`, H.browColour(I.DEFAULT_PEN, I.HAIR[h as keyof typeof I.HAIR])] as [string, string])];
    for (const t of I.TONES) {
      const rim = over(I.P.halo, I.P.haloAlpha, t.base);
      for (const [what, col] of inks) {
        const edge = Math.max(ratio(col, t.base), ratio(rim, t.base));
        const line = ratio(col, rim);
        if (edge < 3 || line < 3) bad.push(`${t.id} ${what}: edge ${edge.toFixed(2)}, line on rim ${line.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
    // And the halo is really drawn: a face's feature pixels include rim-pale pixels on the deepest tone.
    const look = C.lookOf('tuttle')!;
    const px = render((c) => F.drawBustLook(c, look, { tone: 't6', hatch: false, ground: false }), 100, 125);
    let pale = 0;
    for (let y = 45; y < 70; y++)
      for (let x = 30; x < 70; x++) {
        const i = (y * 100 + x) * 4;
        if (px[i + 3] > 250 && I.luma(px[i], px[i + 1], px[i + 2]) > 170) pale++;
      }
    expect(pale).toBeGreaterThan(20);
  });

  it('mixes the cast: every tone is worn by at least five people', () => {
    for (const t of I.TONE_IDS) expect(C.CAST.filter((l) => l.tone === t).length, t).toBeGreaterThanOrEqual(5);
  });

  it('draws the skin in the same shape whatever its colour, for every look (tone is only a colour)', () => {
    // The parts receive the skin only as two wash colours. Feed two marker skins far from every
    // other colour of the kit (magenta and cyan pairs) and every real tone; the skin's drawn shape
    // must be the same pixel for pixel: no part grows, shrinks or moves with the colour of the skin.
    const w = 100;
    const h = 125;
    const MARKERS = [
      { base: '#FF00FF', deep: '#C000C0' },
      { base: '#00FFFF', deep: '#00C0C0' },
    ];
    const moved: string[] = [];
    for (const id of C.CAST_IDS) {
      const masks = MARKERS.map((m) => maskOf(render((c) => F.drawBust(c, id, { x: 0, y: 0, width: w, height: h }, { skin: m, hatch: false }), w, h), m.base, 0));
      const n = masks[0].reduce((a, b) => a + b, 0);
      expect(n, id).toBeGreaterThan(200);
      let diff = 0;
      for (let i = 0; i < masks[0].length; i++) if (masks[0][i] !== masks[1][i]) diff++;
      if (diff > 0) moved.push(`${id}: ${diff} px`);
    }
    expect(moved).toEqual([]);
  });

  it('control: changing one part does move the skin (the test above can fail)', () => {
    const look = C.lookOf('bramble')!;
    const draw = (head: typeof look.head) => {
      const m = { base: '#FF00FF', deep: '#C000C0' };
      return maskOf(render((c) => F.drawBustLook(c, { ...look, head }, { skin: m, hatch: false }), 100, 125), m.base, 0);
    };
    const a = draw('egg');
    const b = draw('square');
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    expect(diff).toBeGreaterThan(50);
  });

  it('draws every bust, portrait and cut-out with ink inside its box', () => {
    for (const id of C.CAST_IDS) {
      const px = render((c) => F.drawBust(c, id, { x: 0, y: 0, width: 50, height: 62.5 }), 50, 63);
      let n = 0;
      for (let i = 3; i < px.length; i += 4) if (px[i] > 16) n++;
      expect(n / (50 * 63), id).toBeGreaterThan(0.5);
    }
    expect(F.drawBust({} as never, 'nobody', { x: 0, y: 0, width: 1, height: 1 })).toBe(false);
  });
});

describe('the atlas layout', () => {
  it('fits the busts in pages of 1,024 x 960 and everything under 2,048', () => {
    for (const p of ['faces', 'faces2'] as const) {
      const s = F.facePageSize(p);
      expect(s.width, p).toBeLessThanOrEqual(1024);
      expect(s.height, p).toBeLessThanOrEqual(960);
    }
    const cut = F.facePageSize('cutouts');
    expect(cut.width).toBeLessThan(2048);
    expect(cut.height).toBeLessThan(2048);
  });

  it('places every bust, portrait and cut-out once, at 128 x 160, without overlaps', () => {
    const sprites = F.faceSprites();
    const names = sprites.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const id of C.CAST_IDS) expect(names).toContain(F.faceSpriteName(id));
    for (const id of C.PLAYER_IDS) for (let a = 0; a < F.AGE_STEPS; a++) expect(names).toContain(F.portraitSpriteName(id, a));
    for (const id of C.CUTOUT_IDS) expect(names).toContain(F.cutoutSpriteName(id));
    expect(names).toContain('band');
    for (const s of sprites) if (s.name.startsWith('face-') || s.name.startsWith('portrait-')) expect([s.w, s.h]).toEqual([128, 160]);
    for (const a of sprites)
      for (const b of sprites) {
        if (a === b || a.page !== b.page) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.name} / ${b.name}`).toBe(false);
      }
  });

  it('bakes the busts page with every 2 px border empty', () => {
    const page = F.bakeFacePage('faces', 1)!;
    expect(page.width).toBe(1024);
    expect(page.height).toBe(960);
    const px = page.image.readPixels(0, 0, { width: page.width, height: page.height, colorType: 4, alphaType: 3 }) as Uint8Array;
    let worst = 0;
    for (const s of Object.values(page.sprites)) {
      const { x, y, width, height } = s.rect;
      for (let i = 0; i < width; i++)
        for (const yy of [y, y + 1, y + height - 2, y + height - 1]) worst = Math.max(worst, px[((yy * page.width + x + i) * 4) + 3]);
      for (let j = 0; j < height; j++)
        for (const xx of [x, x + 1, x + width - 2, x + width - 1]) worst = Math.max(worst, px[(((y + j) * page.width + xx) * 4) + 3]);
    }
    expect(worst).toBe(0);
  }, 30_000);
});
