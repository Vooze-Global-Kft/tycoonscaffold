/**
 * Lantern Row's app icons, drawn in code (the third game's entry of the icon builder; the first two
 * games' are in build.ts and stay unchanged).
 *
 *   npx tsx scripts/art/icons/night.build.ts preview <outDir>   the set + sheet.png (home screens at 180/120/60/40,
 *                                                               the adaptive layer under circle and squircle masks,
 *                                                               the splash), and the safe-zone reach; no repo writes
 *   npx tsx scripts/art/icons/night.build.ts candidates <outDir> every candidate in night.icon.ts at 1024, a sheet of
 *                                                               each (180 and 60 on a light and a dark home screen,
 *                                                               the adaptive layer under masks), each 60 px render
 *                                                               alone, and lineup-60.png beside the other two games'
 *                                                               icons (a store search list); no repo writes
 *   npx tsx scripts/art/icons/night.build.ts final               writes games/night-market/{icon,adaptive-icon,splash}.png
 *
 * icon.png is full-bleed and opaque (re-encoded without alpha by ffmpeg, as Apple asks);
 * adaptive-icon.png is transparent with the subject in the central 66 % (Android's safe zone);
 * splash.png is transparent. All 1024 x 1024, as the other games' are.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { headless } from '../headless';

headless(async (H) => {
  const { Skia, ClipOp } = H;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const night = require('./night.icon') as typeof import('./night.icon');
  const bg = JSON.parse(fs.readFileSync('games/night-market/game.json', 'utf8')).theme.colors.background as string;
  const img = (d: (c: SkCanvas) => void): SkImage => H.image({ width: 1024, height: 1024, scale: 1, background: 'transparent' }, d);
  const mode = process.argv[2] ?? 'preview';
  const outDir = process.argv[3];
  const solid = (col: string) => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(col));
    p.setAntiAlias(true);
    return p;
  };
  const put = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => c.drawImageRect(im, Skia.XYWHRect(0, 0, 1024, 1024), Skia.XYWHRect(x, y, s, s), Skia.Paint());
  /** Shrinks a 1024 image to `s` px in halving steps (as a store page's downscale does), so the 60 px look is honest. */
  const shrink = (im: SkImage, s: number): SkImage => {
    let cur = im;
    let size = 1024;
    while (size / 2 >= s) {
      const from = cur;
      const n = size / 2;
      cur = H.image({ width: n, height: n, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(from, Skia.XYWHRect(0, 0, size, size), Skia.XYWHRect(0, 0, n, n), Skia.Paint()));
      size = n;
    }
    const last = cur;
    const z = size;
    return H.image({ width: s, height: s, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(last, Skia.XYWHRect(0, 0, z, z), Skia.XYWHRect(0, 0, s, s), Skia.Paint()));
  };
  /** An icon at s px under the iOS rounded-square mask at (x, y). */
  const homeIcon = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => {
    const small = shrink(im, s);
    c.save();
    c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
    c.drawImageRect(small, Skia.XYWHRect(0, 0, s, s), Skia.XYWHRect(x, y, s, s), Skia.Paint());
    c.restore();
  };
  const HOMES = ['#EDEFF4', '#15171C'];

  if (mode === 'candidates') {
    if (!outDir) throw new Error('outDir needed');
    fs.mkdirSync(outDir, { recursive: true });
    const fromFile = (f: string): SkImage => {
      const im = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(f))));
      if (!im) throw new Error(`cannot read ${f}`);
      return im;
    };
    const icons: { id: string; im: SkImage }[] = [];
    for (const k of night.CANDIDATES) {
      const icon = img(k.icon);
      const adaptive = img(night.adaptiveOf(k));
      icons.push({ id: k.id, im: icon });
      fs.writeFileSync(path.join(outDir, `${k.id}-1024.png`), Buffer.from(icon.encodeToBytes()));
      const a = adaptive.readPixels(0, 0, { width: 1024, height: 1024, colorType: 4, alphaType: 3 }) as Uint8Array;
      let reach = 0;
      for (let y = 0; y < 1024; y++)
        for (let x = 0; x < 1024; x++) if (a[(y * 1024 + x) * 4 + 3] > 24) reach = Math.max(reach, Math.hypot(x + 0.5 - 512, y + 0.5 - 512) / (1024 / 108));
      console.log(`${k.id}: adaptive subject reaches ${reach.toFixed(1)} dp (safe 33.0)${reach <= 33 ? ' OK' : ' OUTSIDE'}  ${k.note}`);
      for (const [i, home] of HOMES.entries()) {
        await H.sheet(path.join(outDir, `${k.id}-60-${i ? 'dark' : 'light'}.png`), { width: 100, height: 100, scale: 1, background: home }, (c) => homeIcon(c, icon, 20, 20, 60));
        await H.sheet(path.join(outDir, `${k.id}-180-${i ? 'dark' : 'light'}.png`), { width: 220, height: 220, scale: 1, background: home }, (c) => homeIcon(c, icon, 20, 20, 180));
      }
      await H.sheet(path.join(outDir, `${k.id}-sheet.png`), { width: 840, height: 456, scale: 1, background: '#888888' }, (c) => {
        HOMES.forEach((home, row) => {
          const y = row * 228;
          c.drawRect(Skia.XYWHRect(0, y, 840, 228), solid(home));
          homeIcon(c, icon, 24, y + 24, 180);
          homeIcon(c, icon, 228, y + 24, 60);
          let x = 330;
          for (const s of [180, 60]) {
            c.save();
            c.clipPath(Skia.PathBuilder.Make().addCircle(x + s / 2, y + 24 + s / 2, s / 2).build(), ClipOp.Intersect, true);
            c.drawRect(Skia.XYWHRect(x, y + 24, s, s), solid(bg));
            const full = s * (108 / 72);
            put(c, adaptive, x - (full - s) / 2, y + 24 - (full - s) / 2, full);
            c.restore();
            x += s + 24;
          }
        });
      });
    }
    // A store search list at 60 px: the three candidates, the present icon, and the other two games.
    const others = [
      { id: 'now', im: fromFile('games/night-market/icon.png') },
      { id: 'pizza', im: fromFile('games/pizza-empire/icon.png') },
      { id: 'orbit', im: fromFile('games/space-miner/icon.png') },
    ];
    const all = [...icons, ...others];
    await H.sheet(path.join(outDir, 'lineup-60.png'), { width: all.length * 84 + 24, height: 2 * 108, scale: 1, background: '#888888' }, (c) => {
      HOMES.forEach((home, row) => {
        c.drawRect(Skia.XYWHRect(0, row * 108, all.length * 84 + 24, 108), solid(home));
        all.forEach((k, i) => homeIcon(c, k.im, 24 + i * 84, row * 108 + 24, 60));
      });
    });
    console.log('wrote candidates to', outDir, '(lineup order:', all.map((k) => k.id).join(', ') + ')');
    return;
  }

  const set = { icon: img(night.drawChosenIcon), adaptive: img(night.drawChosenAdaptive), splash: img(night.drawChosenSplash) };

  // Safe zone: the subject's farthest pixel from the centre, in dp of the 108 dp layer (safe: 33).
  const a = set.adaptive.readPixels(0, 0, { width: 1024, height: 1024, colorType: 4, alphaType: 3 }) as Uint8Array;
  let reach = 0;
  const dp = 1024 / 108;
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) if (a[(y * 1024 + x) * 4 + 3] > 24) reach = Math.max(reach, Math.hypot(x + 0.5 - 512, y + 0.5 - 512) / dp);
  console.log(`adaptive subject reaches ${reach.toFixed(1)} dp from the centre (safe 33.0)${reach <= 33 ? ' OK' : ' OUTSIDE (glow included)'}`);

  if (mode === 'final') {
    const dir = path.join('games', 'night-market');
    for (const [name, im] of Object.entries(set)) {
      const file = path.join(dir, `${name === 'adaptive' ? 'adaptive-icon' : name}.png`);
      if (name === 'icon') {
        const tmp = `${file}.rgba.png`;
        fs.writeFileSync(tmp, Buffer.from(im.encodeToBytes()));
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-pix_fmt', 'rgb24', file]);
        fs.unlinkSync(tmp);
      } else fs.writeFileSync(file, Buffer.from(im.encodeToBytes()));
      console.log('wrote', file);
    }
    return;
  }
  if (!outDir) throw new Error('outDir needed');
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, im] of Object.entries(set)) fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(im.encodeToBytes()));
  const sizes = [180, 120, 60, 40];
  await H.sheet(path.join(outDir, 'sheet.png'), { width: 1100, height: 700, scale: 1, background: '#888888' }, (c) => {
    ['#EDEFF4', '#15171C'].forEach((home, row) => {
      const y = row * 228;
      c.drawRect(Skia.XYWHRect(0, y, 1100, 228), solid(home));
      let x = 24;
      for (const s of sizes) {
        c.save();
        c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y + 24, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
        put(c, set.icon, x, y + 24, s);
        c.restore();
        x += s + 24;
      }
      x += 40;
      for (const s of [180, 60]) {
        for (const circleMask of [true, false]) {
          c.save();
          if (circleMask) c.clipPath(Skia.PathBuilder.Make().addCircle(x + s / 2, y + 24 + s / 2, s / 2).build(), ClipOp.Intersect, true);
          else c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y + 24, s, s), s * 0.3, s * 0.3), ClipOp.Intersect, true);
          c.drawRect(Skia.XYWHRect(x, y + 24, s, s), solid(bg));
          const full = s * (108 / 72);
          put(c, set.adaptive, x - (full - s) / 2, y + 24 - (full - s) / 2, full);
          c.restore();
          x += s + 24;
        }
      }
    });
    c.drawRect(Skia.XYWHRect(0, 456, 1100, 244), solid(bg));
    put(c, set.splash, 24, 456, 240);
  });
  console.log('wrote', path.join(outDir, 'sheet.png'));
});
