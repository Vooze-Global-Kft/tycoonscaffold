/**
 * Lantern Row's app icons, drawn in code (the third game's entry of the icon builder; the first two
 * games' are in build.ts and stay unchanged).
 *
 *   npx tsx scripts/art/icons/night.build.ts preview <outDir>   the set + sheet.png (home screens at 180/120/60/40,
 *                                                               the adaptive layer under circle and squircle masks,
 *                                                               the splash), and the safe-zone reach; no repo writes
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
  const set = { icon: img(night.drawChosenIcon), adaptive: img(night.drawChosenAdaptive), splash: img(night.drawChosenSplash) };
  const mode = process.argv[2] ?? 'preview';
  const outDir = process.argv[3];

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
  const solid = (col: string) => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(col));
    p.setAntiAlias(true);
    return p;
  };
  const put = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => c.drawImageRect(im, Skia.XYWHRect(0, 0, 1024, 1024), Skia.XYWHRect(x, y, s, s), Skia.Paint());
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
