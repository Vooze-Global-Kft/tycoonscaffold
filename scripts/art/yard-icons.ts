/**
 * The scrapyard's icon candidates (scripts/art/icons/yard.icon.ts) as files and contact sheets, drawn in
 * Node. Writes nothing into the repository: the lead chooses, then games/scrap-yard/icon.png is made.
 *
 *   npx tsx scripts/art/yard-icons.ts <outDir>
 *
 * - <id>.png: each candidate at 1024 x 1024;
 * - lineup.png: the four shipped games' icons and the three candidates at 120 and at 60 px, masked as an
 *   iPhone home screen masks them, on a white and on a dark home screen.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { headless } from './headless';
import { makeText } from './yard-text';

headless(async (H) => {
  const { Skia, ClipOp } = H;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Y = require('./icons/yard.icon') as typeof import('./icons/yard.icon');
  const out = process.argv[2];
  if (!out) throw new Error('outDir needed');
  fs.mkdirSync(out, { recursive: true });
  const T = makeText(H);
  const img = (d: (c: SkCanvas) => void): SkImage => H.image({ width: 1024, height: 1024, scale: 1, background: 'transparent' }, d);
  const shrink = (im: SkImage, s: number): SkImage => {
    let cur = im;
    let size = im.width();
    while (size / 2 >= s) {
      const from = cur;
      const n = size / 2;
      const z = size;
      cur = H.image({ width: n, height: n, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(from, Skia.XYWHRect(0, 0, z, z), Skia.XYWHRect(0, 0, n, n), Skia.Paint()));
      size = n;
    }
    const last = cur;
    const z = size;
    return H.image({ width: s, height: s, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(last, Skia.XYWHRect(0, 0, z, z), Skia.XYWHRect(0, 0, s, s), Skia.Paint()));
  };
  const home = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => {
    const small = shrink(im, s);
    c.save();
    c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
    c.drawImageRect(small, Skia.XYWHRect(0, 0, s, s), Skia.XYWHRect(x, y, s, s), Skia.Paint());
    c.restore();
  };
  const fromFile = (f: string): SkImage => {
    const im = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(f))));
    if (!im) throw new Error(`cannot read ${f}`);
    return im;
  };
  const cands = Y.CANDIDATES.map((k) => ({ id: k.id, im: img(k.icon) }));
  // the finished icon and its 60 px sheet beside the four shipped games (white and dark home screens)
  {
    const f = path.join(out, 'icon-final-1024.png');
    await H.sheet(f, { width: 1024, height: 1024, scale: 1, background: 'transparent' }, Y.ICON);
    console.log('wrote', f);
    const fin = img(Y.ICON);
    const row = [...['pizza-empire', 'space-miner', 'night-market', 'high-office'].map((g) => fromFile(`games/${g}/icon.png`)), fin];
    const g = path.join(out, 'icon-final-60.png');
    await H.sheet(g, { width: 20 + row.length * 80, height: 2 * 100, scale: 1, background: '#FFFFFF' }, (c) => {
      ['#F2F2F7', '#15171C'].forEach((bg, r) => {
        const p = Skia.Paint();
        p.setColor(Skia.Color(bg));
        c.drawRect(Skia.XYWHRect(0, r * 100, 20 + row.length * 80, 100), p);
        row.forEach((im, i) => home(c, im, 20 + i * 80, r * 100 + 20, 60));
      });
    });
    console.log('wrote', g);
  }
  for (const k of Y.CANDIDATES) {
    const f = path.join(out, `${k.id}.png`);
    await H.sheet(f, { width: 1024, height: 1024, scale: 1, background: 'transparent' }, k.icon);
    console.log('wrote', f);
  }
  const games = ['pizza-empire', 'space-miner', 'night-market', 'high-office'].map((g) => ({ id: g, im: fromFile(`games/${g}/icon.png`) }));
  const all = [...games, ...cands.map((k) => ({ id: `yard: ${k.id}`, im: k.im }))];
  const W = 40 + all.length * 150;
  const f = path.join(out, 'lineup.png');
  await H.sheet(f, { width: W, height: 2 * 290, scale: 1, background: '#FFFFFF' }, (c) => {
    ['#F2F2F7', '#15171C'].forEach((bg, row) => {
      const y0 = row * 290;
      const p = Skia.Paint();
      p.setColor(Skia.Color(bg));
      c.drawRect(Skia.XYWHRect(0, y0, W, 290), p);
      all.forEach((g, i) => {
        const x = 40 + i * 150;
        home(c, g.im, x, y0 + 20, 120);
        home(c, g.im, x + 30, y0 + 160, 60);
        T(c, g.id, x + 60, y0 + 250, { size: 12, weight: 'semibold', color: row ? '#E8E8EE' : '#2B2E33', align: 'center' });
      });
    });
  });
  console.log('wrote', f);
});
