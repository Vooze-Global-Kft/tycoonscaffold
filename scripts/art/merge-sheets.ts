/**
 * Contact sheets of Lantern Row's art kit (src/ui/merge/art), drawn in Node, plus the two
 * measurements the kit is judged on (spec 4.6, 10.1 item 11).
 *
 *   npx tsx scripts/art/merge-sheets.ts [outDir] [only...]
 *
 * Writes (outDir default $MERGE_ART_OUT or ./scripts/art/out-merge; keep PNGs out of the repository):
 * - goods-47.png, goods-51.png and their -grey twins: each chain's eight tiers in a row on the real
 *   board at 47 and 51 pt cells (3 px a point), and goods-47-nopip-grey.png (tiers told apart
 *   without the pip);
 * - one PNG per gallery section, colour and -grey;
 * - mock-375.png (375 x 667) and mock-390.png (390 x 844): the main screen from the kit, with -grey;
 * - atlas-items.png, atlas-animals.png, atlas-stalls.png, atlas-fx.png;
 * - measure.json and the console: the red share of both mock screens (must be under 10 %), and for
 *   each chain the greyscale distance between neighbouring tiers at 47 pt (with and without pips).
 */
import fs from 'node:fs';
import path from 'node:path';
import { headless } from './headless';

headless(async (H) => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const G = require('../../src/ui/merge/art/gallery.draw') as typeof import('../../src/ui/merge/art/gallery.draw');
  const M = require('../../src/ui/merge/art/mock.draw') as typeof import('../../src/ui/merge/art/mock.draw');
  const A = require('../../src/ui/merge/art/atlas') as typeof import('../../src/ui/merge/art/atlas');
  const goods = require('../../src/ui/merge/art/goods.draw') as typeof import('../../src/ui/merge/art/goods.draw');
  const pen = require('../../src/ui/merge/art/pen') as typeof import('../../src/ui/merge/art/pen');
  const street = require('../../src/ui/merge/art/street.draw') as typeof import('../../src/ui/merge/art/street.draw');
  const meas = require('../../src/ui/merge/art/measure') as typeof import('../../src/ui/merge/art/measure');
  const { NIGHT, CHAIN_IDS } = require('../../src/ui/merge/art/palette') as typeof import('../../src/ui/merge/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const out = process.argv[2] ?? process.env.MERGE_ART_OUT ?? path.join(__dirname, 'out-merge');
  const only = process.argv.slice(3);
  const want = (id: string) => !only.length || only.includes(id);
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const report: Record<string, unknown> = {};

  if (want('goods')) {
    for (const cell of [47, 51]) {
      const size = { w: 58 + 8 * cell + 12, h: 18 + 6 * cell + 12 };
      for (const greyscale of [false, true]) {
        const f = path.join(out, `goods-${cell}${greyscale ? '-grey' : ''}.png`);
        await H.sheet(f, { width: size.w, height: size.h, scale: 3, background: NIGHT.indigo }, (c) => G.drawGoodsBoard(c, cell, { greyscale }));
        console.log('wrote', f);
      }
    }
    const f = path.join(out, 'goods-47-nopip-grey.png');
    await H.sheet(f, { width: 58 + 8 * 47 + 12, height: 18 + 6 * 47 + 12, scale: 3, background: NIGHT.indigo }, (c) => G.drawGoodsBoard(c, 47, { greyscale: true, pip: false }));
    console.log('wrote', f);
  }

  if (want('sections')) {
    const width = 720;
    for (const s of G.gallerySections()) {
      const id = s.title.split(':')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (const greyscale of [false, true]) {
        const { pic, height } = G.sectionPicture(s, width, { greyscale });
        const f = path.join(out, `${id}${greyscale ? '-grey' : ''}.png`);
        await H.sheet(f, { width, height, scale: 2, background: NIGHT.indigo }, (c) => c.drawPicture(pic));
        console.log('wrote', f);
      }
    }
  }

  if (want('mock')) {
    const shares: Record<string, number> = {};
    for (const [w, h] of [
      [375, 667],
      [390, 844],
    ] as const) {
      for (const greyscale of [false, true]) {
        const f = path.join(out, `mock-${w}${greyscale ? '-grey' : ''}.png`);
        await H.sheet(f, { width: w, height: h, scale: 3, background: NIGHT.indigo }, (c) => (greyscale ? pen.grey(c, (q) => M.drawMainMock(q, w, h)) : M.drawMainMock(c, w, h)));
        console.log('wrote', f);
      }
      // The red share at 2 px a point over the whole screen.
      const im = H.image({ width: w, height: h, scale: 2, background: NIGHT.indigo }, (c) => M.drawMainMock(c, w, h));
      const px = im.readPixels(0, 0, { width: w * 2, height: h * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
      shares[`${w}x${h}`] = meas.redShare(px);
    }
    report.redShare = shares;
    for (const [k, v] of Object.entries(shares)) console.log(`red share ${k}: ${(v * 100).toFixed(2)} % (limit 10 %) ${v < 0.1 ? 'OK' : 'OVER'}`);
  }

  if (want('grey')) {
    // Each tier at 47 pt on a cell tile, 3 px a point, in luminance; distance to the next tier.
    const cell = 47;
    const scale = 3;
    const px = cell * scale;
    const lumaFor = (ch: number, k: number, pip: boolean) => {
      const im = H.image({ width: cell, height: cell, scale, background: NIGHT.teal }, (c) =>
        pen.at(c, cell / 2, cell / 2, 1, 0, (q) => {
          street.drawCellTile(q, cell);
          pen.at(q, 0, 0, cell / 48, 0, (z) => goods.drawGood(z, ch, k, { pip }));
        }),
      );
      return meas.lumaOf(im.readPixels(0, 0, { width: px, height: px, colorType: 4, alphaType: 3 }) as Uint8Array);
    };
    const table: Record<string, { withPip: number[]; noPip: number[]; meanNoPip: number[] }> = {};
    let worst = { chain: '', tiers: '', changed: 1 };
    for (let ch = 0; ch < 6; ch++) {
      const withPip: number[] = [];
      const noPip: number[] = [];
      const meanNoPip: number[] = [];
      for (let k = 1; k < 8; k++) {
        const a = meas.greyDistance(lumaFor(ch, k, true), lumaFor(ch, k + 1, true));
        const b = meas.greyDistance(lumaFor(ch, k, false), lumaFor(ch, k + 1, false));
        withPip.push(+a.changed.toFixed(3));
        noPip.push(+b.changed.toFixed(3));
        meanNoPip.push(+b.mean.toFixed(1));
        if (b.changed < worst.changed) worst = { chain: CHAIN_IDS[ch], tiers: `${k}-${k + 1}`, changed: b.changed };
      }
      table[CHAIN_IDS[ch]] = { withPip, noPip, meanNoPip };
      console.log(`${CHAIN_IDS[ch].padEnd(8)} share of pixels changed > 24 levels between tiers 1-2 ... 7-8, no pips: ${noPip.map((v) => (v * 100).toFixed(0).padStart(3)).join(' ')} %`);
    }
    report.greyNeighbours = table;
    report.greyWorst = worst;
    // The same tier of two different chains (no pips): tiers 1 to 8, every pair of chains.
    const cross: Record<string, { pair: string; changed: number }> = {};
    let crossWorst = { tier: 0, pair: '', changed: 1 };
    for (let k = 1; k <= 8; k++) {
      const L = [0, 1, 2, 3, 4, 5].map((ch) => lumaFor(ch, k, false));
      let w = { pair: '', changed: 1 };
      for (let a = 0; a < 6; a++)
        for (let b = a + 1; b < 6; b++) {
          const d = meas.greyDistance(L[a], L[b]).changed;
          if (d < w.changed) w = { pair: `${CHAIN_IDS[a]}/${CHAIN_IDS[b]}`, changed: +d.toFixed(3) };
        }
      cross[`tier${k}`] = w;
      if (w.changed < crossWorst.changed) crossWorst = { tier: k, ...w };
    }
    report.greyCross = cross;
    console.log(`grey cross-chain, closest pair per tier 1..8: ${Object.values(cross).map((v) => `${v.pair} ${(v.changed * 100).toFixed(0)}%`).join(', ')}`);
    console.log(`grey: worst neighbours ${worst.chain} ${worst.tiers}: ${(worst.changed * 100).toFixed(1)} % of pixels changed (bar ${meas.GREY_MIN_CHANGED * 100} %) ${worst.changed >= meas.GREY_MIN_CHANGED ? 'OK' : 'LOW'}`);
  }

  if (want('atlas')) {
    const sizes: Record<string, unknown> = {};
    for (const kind of A.ATLAS_KINDS) {
      const t1 = Date.now();
      const a = A.bakeAtlas(kind);
      if (!a) throw new Error(`atlas ${kind}: no surface`);
      const f = path.join(out, `atlas-${kind}.png`);
      fs.writeFileSync(f, Buffer.from(a.image.encodeToBytes()));
      sizes[kind] = { sprites: Object.keys(a.sprites).length, width: a.width, height: a.height, density: a.density, ms: Date.now() - t1 };
      console.log(`wrote ${f}: ${Object.keys(a.sprites).length} sprites, ${a.width} x ${a.height} px at ${a.density} px/pt, ${Date.now() - t1} ms`);
    }
    report.atlases = sizes;
  }

  if (only.length === 0 || only.includes('json')) fs.writeFileSync(path.join(out, 'measure.json'), JSON.stringify(report, null, 2));
  console.log(`done in ${Date.now() - t0} ms`);
});
