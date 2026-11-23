/**
 * Contact sheets of High Office's cast (src/ui/decree/art/faces), drawn in Node, and the
 * measurement the cast is judged on: every face told from every other at 44 points wide in greyscale.
 *
 *   npx tsx scripts/art/decree-faces.ts [outDir] [only...]
 *
 * Writes (outDir default $DECREE_FACES_OUT or scripts/art/out/decree-faces, which git ignores):
 * - busts-128.png / -grey: every bust at 128 x 160 (the atlas cell), labelled with its cast id
 * - busts-44.png / -grey: every bust at 44 pt wide (the paper's header photo), 3 px a point
 * - tones.png / -grey: the tone proof, one row of identical parts per person across all six tones
 * - portraits.png / -grey: the six player faces, then one-colour with ageing 0, 1, 2
 * - cutouts.png / -grey: election night's cut-outs and the band on the chalk board
 * - atlas-faces.png, atlas-faces2.png, atlas-cutouts.png: the baked pages
 * - faces.json and the console: the closest pairs at 44 pt in greyscale (share of pixels changed by
 *   more than 24 grey levels; the bar is FACE_MIN_CHANGED)
 */
import fs from 'node:fs';
import path from 'node:path';
import { headless } from './headless';

/** The smallest share of pixels two faces may share at 44 pt in greyscale before they count as alike. */
const FACE_MIN_CHANGED = 0.12;

headless(async (H) => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const F = require('../../src/ui/decree/art/faces') as typeof import('../../src/ui/decree/art/faces');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const out = process.argv[2] ?? process.env.DECREE_FACES_OUT ?? path.join(__dirname, 'out', 'decree-faces');
  const only = process.argv.slice(3);
  const want = (id: string) => !only.length || only.includes(id);
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const report: Record<string, unknown> = {};
  const fontFile = ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find((f) => fs.existsSync(f));
  const label = (size: number) => (fontFile ? H.font(fontFile, size) : null);
  const BG = '#2E4A3E';
  const PAPER = '#ECEFEA';
  const text = (c: import('@shopify/react-native-skia').SkCanvas, s: string, x: number, y: number, size: number, color = PAPER) => {
    const f = label(size);
    if (!f) return;
    const p = H.Skia.Paint();
    p.setColor(H.Skia.Color(color));
    c.drawText(s, x, y, p, f);
  };
  const write = async (name: string, size: { width: number; height: number }, scale: number, bg: string, draw: (c: import('@shopify/react-native-skia').SkCanvas) => void) => {
    const f = path.join(out, name);
    await H.sheet(f, { width: Math.ceil(size.width), height: Math.ceil(size.height), scale, background: bg }, draw);
    console.log('wrote', f);
  };

  if (want('busts')) {
    for (const greyscale of [false, true]) {
      // The atlas cell size (128 x 160 px at 1 px a point), with the id under each.
      const o = { cell: 128, cols: 8, gap: 16, greyscale };
      const s = F.castSheetSize(o);
      await write(`busts-128${greyscale ? '-grey' : ''}.png`, s, 1, BG, (c) => {
        F.drawCastSheet(c, o);
        F.CAST_IDS.forEach((id, i) => {
          const b = F.castCell(o, i);
          text(c, id, b.x + 4, b.y + b.h + 12, 11);
        });
      });
      // 44 pt wide, at 3 px a point (what an iPhone shows on the paper's header).
      const o44 = { cell: 44, cols: 10, gap: 6, greyscale };
      await write(`busts-44${greyscale ? '-grey' : ''}.png`, F.castSheetSize(o44), 3, PAPER, (c) => F.drawCastSheet(c, o44));
    }
  }

  if (want('tones')) {
    for (const greyscale of [false, true]) {
      const o = { cell: 96, gap: 8, left: 90, top: 22, greyscale };
      await write(`tones${greyscale ? '-grey' : ''}.png`, F.toneSheetSize(o), 2, BG, (c) => {
        F.drawToneSheet(c, o);
        F.TONE_IDS.forEach((t, k) => text(c, t, o.left + 8 + k * (o.cell + o.gap) + o.cell / 2 - 6, 16, 12));
        F.TONE_ROWS.forEach((id, r) => text(c, id, 6, o.top + 8 + r * (o.cell * 1.25 + o.gap) + 60, 12));
      });
    }
  }

  if (want('portraits')) {
    for (const greyscale of [false, true]) {
      const o = { cell: 110, gap: 10, top: 22, greyscale };
      await write(`portraits${greyscale ? '-grey' : ''}.png`, F.portraitSheetSize(o), 2, BG, (c) => {
        F.drawPortraitSheet(c, o);
        ['colour', 'age 0', 'age 1', 'age 2'].forEach((t, k) => text(c, t, 14 + k * (o.cell + o.gap) + 30, 16, 12));
      });
    }
  }

  if (want('cutouts')) {
    for (const greyscale of [false, true]) {
      const h = 220;
      await write(`cutouts${greyscale ? '-grey' : ''}.png`, F.cutoutSheetSize(h), 2, '#2D3436', (c) => F.drawCutoutSheet(c, h, { greyscale }));
    }
  }

  if (want('atlas')) {
    const sizes: Record<string, unknown> = {};
    for (const page of F.FACE_PAGES) {
      const t1 = Date.now();
      const a = F.bakeFacePage(page, 1);
      if (!a) throw new Error(`page ${page}: no surface`);
      const f = path.join(out, `atlas-${page}.png`);
      fs.writeFileSync(f, Buffer.from(a.image.encodeToBytes()));
      sizes[page] = { sprites: Object.keys(a.sprites).length, width: a.width, height: a.height, ms: Date.now() - t1 };
      console.log(`wrote ${f}: ${Object.keys(a.sprites).length} sprites, ${a.width} x ${a.height} px, ${Date.now() - t1} ms`);
    }
    report.atlas = sizes;
  }

  if (want('distinct')) {
    // Each bust at 44 x 55 pt, 3 px a point, on the paper, in luminance; every pair compared.
    const scale = 3;
    const w = 44;
    const h = 55;
    const lum = (id: string): Float32Array => {
      const im = H.image({ width: w, height: h, scale, background: PAPER }, (c) => F.drawBust(c, id, { x: 0, y: 0, width: w, height: h }));
      const px = im.readPixels(0, 0, { width: w * scale, height: h * scale, colorType: 4, alphaType: 3 }) as Uint8Array;
      const L = new Float32Array(px.length / 4);
      for (let i = 0; i < L.length; i++) L[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
      return L;
    };
    const ids = F.CAST_IDS;
    const L = ids.map(lum);
    const pairs: { a: string; b: string; changed: number }[] = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        let n = 0;
        const A = L[i];
        const B = L[j];
        for (let k = 0; k < A.length; k++) if (Math.abs(A[k] - B[k]) > 24) n++;
        pairs.push({ a: ids[i], b: ids[j], changed: +(n / A.length).toFixed(3) });
      }
    pairs.sort((x, y) => x.changed - y.changed);
    const closest = pairs.slice(0, 12);
    report.distinct44 = { bar: FACE_MIN_CHANGED, pairs: pairs.length, below: pairs.filter((p) => p.changed < FACE_MIN_CHANGED).length, closest };
    console.log(`44 pt greyscale, closest pairs (share of pixels changed > 24 levels; bar ${FACE_MIN_CHANGED * 100} %):`);
    for (const p of closest) console.log(`  ${p.a.padEnd(11)} ${p.b.padEnd(11)} ${(p.changed * 100).toFixed(1)} % ${p.changed >= FACE_MIN_CHANGED ? 'OK' : 'LOW'}`);
    // The closest pairs side by side, for the eye.
    await write('closest-44-grey.png', { width: 12 * 100 + 10, height: 70 }, 3, PAPER, (c) =>
      F.drawCastSheet(c, { cell: 44, cols: 24, gap: 6, greyscale: true }, closest.flatMap((p) => [p.a, p.b])),
    );
  }

  if (!only.length || only.includes('json')) fs.writeFileSync(path.join(out, 'faces.json'), JSON.stringify(report, null, 2));
  console.log(`done in ${Date.now() - t0} ms`);
});
