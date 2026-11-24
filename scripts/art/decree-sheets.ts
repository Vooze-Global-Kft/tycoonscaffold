/**
 * Contact sheets of High Office's art kit (src/ui/decree/art), drawn in Node, and the measurements
 * the kit is judged on (office-design.md 4.2, 4.6, 9.1).
 *
 *   npx tsx scripts/art/decree-sheets.ts [outDir] [only...]
 *
 * Writes (outDir default $DECREE_ART_OUT or ./scripts/art/out-decree; keep PNGs out of the repository):
 * - one PNG per gallery section, colour and -grey;
 * - mock-375-<paper>.png (375 x 667) and mock-390-<paper>.png (390 x 844), for a day paper, a
 *   grievance (boycott), the front page (scandal) and a signing paper, and the governor's and the
 *   president's desks, with -grey twins of the day paper;
 * - icons-18.png and icons-18-grey.png: every "art:" icon at 18 pt (3 px a point) on paper and on baize;
 * - atlas-props.png and atlas-faces.png;
 * - measure.json and the console: the brick share of every mock (under 8 %), the SIGN/REFUSE
 *   colour pair (never green and red), the closest pair of club badges in greyscale at 18 pt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { headless } from './headless';

headless(async (H) => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const G = require('../../src/ui/decree/art/gallery.draw') as typeof import('../../src/ui/decree/art/gallery.draw');
  const M = require('../../src/ui/decree/art/mock.draw') as typeof import('../../src/ui/decree/art/mock.draw');
  const A = require('../../src/ui/decree/art/atlas') as typeof import('../../src/ui/decree/art/atlas');
  const I = require('../../src/ui/decree/art/icons') as typeof import('../../src/ui/decree/art/icons');
  const pen = require('../../src/ui/decree/art/pen') as typeof import('../../src/ui/decree/art/pen');
  const meas = require('../../src/ui/decree/art/measure') as typeof import('../../src/ui/decree/art/measure');
  const clubs = require('../../src/ui/decree/art/clubs.draw') as typeof import('../../src/ui/decree/art/clubs.draw');
  const { DESK, CLUB_IDS } = require('../../src/ui/decree/art/palette') as typeof import('../../src/ui/decree/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const out = process.argv[2] ?? process.env.DECREE_ART_OUT ?? path.join(__dirname, 'out-decree');
  const only = process.argv.slice(3);
  const want = (id: string) => !only.length || only.includes(id);
  fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const report: Record<string, unknown> = {};

  if (want('sections')) {
    const width = 720;
    for (const s of G.gallerySections()) {
      const id = s.title.split(':')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      for (const greyscale of [false, true]) {
        const { pic, height } = G.sectionPicture(s, width, { greyscale });
        const f = path.join(out, `${id}${greyscale ? '-grey' : ''}.png`);
        await H.sheet(f, { width, height, scale: 2, background: DESK.baize }, (c) => c.drawPicture(pic));
        console.log('wrote', f);
      }
    }
  }

  if (want('mock')) {
    const shares: Record<string, number> = {};
    const papers = ['day', 'grievance', 'front', 'signing'] as const;
    for (const [w, h] of [
      [375, 667],
      [390, 844],
    ] as const) {
      const variants: { name: string; o: import('../../src/ui/decree/art/mock.draw').MockOptions }[] = [
        ...papers.map((p) => ({ name: p, o: { paper: p } })),
        { name: 'governor', o: { office: 1 as const } },
        { name: 'president', o: { office: 2 as const, paper: 'grievance' as const } },
        { name: 'walnut', o: { set: 'walnut' as const } },
      ];
      for (const v of variants) {
        const f = path.join(out, `mock-${w}-${v.name}.png`);
        await H.sheet(f, { width: w, height: h, scale: 3, background: DESK.baize }, (c) => M.drawDeskMock(c, w, h, v.o));
        if (v.name === 'day') await H.sheet(path.join(out, `mock-${w}-day-grey.png`), { width: w, height: h, scale: 3, background: DESK.baize }, (c) => pen.grey(c, (q) => M.drawDeskMock(q, w, h, v.o)));
        const im = H.image({ width: w, height: h, scale: 2, background: DESK.baize }, (c) => M.drawDeskMock(c, w, h, v.o));
        const px = im.readPixels(0, 0, { width: w * 2, height: h * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
        shares[`${w}x${h}-${v.name}`] = +meas.brickShare(px).toFixed(5);
        console.log('wrote', f);
      }
    }
    report.brickShare = shares;
    const worst = Math.max(...Object.values(shares));
    for (const [k, v] of Object.entries(shares)) console.log(`brick share ${k}: ${(v * 100).toFixed(2)} %`);
    console.log(`brick share worst: ${(worst * 100).toFixed(2)} % (limit ${meas.BRICK_MAX_SHARE * 100} %) ${worst < meas.BRICK_MAX_SHARE ? 'OK' : 'OVER'}`);
    const pair = { sign: DESK.violet, refuse: DESK.slate, greenRed: meas.isGreenRedPair(DESK.violet, DESK.slate) };
    report.signRefuse = pair;
    console.log(`SIGN ${pair.sign} / REFUSE ${pair.refuse}: green-and-red ${pair.greenRed ? 'YES (fails)' : 'no'}`);
  }

  if (want('icons')) {
    const names = I.decreeIconNames().filter((n) => n.startsWith('art:'));
    const cols = 16;
    const cell = 30;
    const rows = Math.ceil(names.length / cols);
    for (const greyscale of [false, true]) {
      const f = path.join(out, `icons-18${greyscale ? '-grey' : ''}.png`);
      await H.sheet(f, { width: cols * cell * 2 + 12, height: rows * cell + 8, scale: 3, background: DESK.paperLight }, (c0) => {
        const draw = (c: import('@shopify/react-native-skia').SkCanvas) => {
          c.drawRect({ x: cols * cell + 6, y: 0, width: cols * cell + 6, height: rows * cell + 8 }, pen.fill(DESK.baize));
          names.forEach((n, i) => {
            const d = I.decreeIcons()[n];
            for (const side of [0, 1]) pen.at(c, 4 + side * (cols * cell + 6) + (i % cols) * cell + cell / 2, 4 + Math.floor(i / cols) * cell + cell / 2, 1, 0, (q) => d(q, 18));
          });
        };
        if (greyscale) pen.grey(c0, draw);
        else draw(c0);
      });
      console.log('wrote', f, `(${names.length} icons)`);
    }
    // closest pair of club badges in greyscale at 18 pt
    const S = 18;
    const sc = 3;
    const lum = (id: (typeof CLUB_IDS)[number]) => {
      const im = H.image({ width: S, height: S, scale: sc, background: DESK.paperLight }, (c) => pen.at(c, S / 2, S / 2, S / 24, 0, (q) => clubs.drawClubBadge(q, id, 12)));
      return meas.lumaOf(im.readPixels(0, 0, { width: S * sc, height: S * sc, colorType: 4, alphaType: 3 }) as Uint8Array);
    };
    const L = CLUB_IDS.map(lum);
    let worst = { pair: '', changed: 1 };
    for (let a = 0; a < L.length; a++)
      for (let b = a + 1; b < L.length; b++) {
        const d = meas.greyDistance(L[a], L[b]).changed;
        if (d < worst.changed) worst = { pair: `${CLUB_IDS[a]}/${CLUB_IDS[b]}`, changed: +d.toFixed(3) };
      }
    report.clubGreyWorst = worst;
    console.log(`clubs at 18 pt in greyscale, closest pair ${worst.pair}: ${(worst.changed * 100).toFixed(1)} % of pixels differ > 24 levels (bar ${meas.GREY_MIN_CHANGED * 100} %) ${worst.changed >= meas.GREY_MIN_CHANGED ? 'OK' : 'LOW'}`);
  }

  if (want('atlas')) {
    const sizes: Record<string, unknown> = {};
    for (const kind of A.ATLAS_KINDS) {
      const t1 = Date.now();
      const a = A.bakeAtlas(kind);
      if (!a) {
        console.log(`atlas ${kind}: not baked (no drawings yet)`);
        continue;
      }
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
