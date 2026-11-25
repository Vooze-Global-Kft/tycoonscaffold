/**
 * The scrapyard's app icon set from the art director's finished icon (scripts/art/icons/yard.icon.ts
 * `ICON`, approved by the lead at 60 px beside the four games on 25 November). This file only places
 * that drawing into the three files every game ships; it draws nothing of its own but a flat ground.
 *
 *   npx tsx scripts/art/icons/yard.build.ts preview <outDir>   icon, adaptive layer and splash + sheet.png; no repo writes
 *   npx tsx scripts/art/icons/yard.build.ts final              writes games/scrap-yard/{icon,adaptive-icon,splash}.png
 *
 * The house's sizes and kinds (as office.build.ts and night.build.ts make them), all 1024 x 1024:
 * - icon.png: full-bleed and opaque, re-encoded without alpha by ffmpeg (Apple refuses an icon with alpha);
 * - adaptive-icon.png: Android's foreground layer (108 dp). Here the layer is OPAQUE hi-vis yellow over
 *   the whole 108 dp, with the icon scaled down so that its subject (everything that is not the yellow
 *   ground) stays inside the 33 dp safe circle; so the launcher's mask never cuts the crucible or the
 *   wire, and the background colour behind it (theme.colors.background, the sky) never shows;
 * - splash.png: transparent, the icon as a rounded tile in the middle, shown at 200 pt on the theme's
 *   background (the daylight sky the loading animation fades in from).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { headless } from '../headless';

headless(async (H) => {
  const { Skia, ClipOp } = H;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Y = require('./yard.icon') as typeof import('./yard.icon');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { YARD } = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  const bg = JSON.parse(fs.readFileSync('games/scrap-yard/game.json', 'utf8')).theme.colors.background as string;
  const mode = process.argv[2] ?? 'preview';
  const outDir = process.argv[3];
  const N = 1024;
  const img = (d: (c: SkCanvas) => void): SkImage => H.image({ width: N, height: N, scale: 1, background: 'transparent' }, d);
  const solid = (col: string) => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(col));
    p.setAntiAlias(true);
    return p;
  };
  const put = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => c.drawImageRect(im, Skia.XYWHRect(0, 0, im.width(), im.height()), Skia.XYWHRect(x, y, s, s), Skia.Paint());
  const shrink = (im: SkImage, s: number): SkImage => {
    let cur = im;
    let size = im.width();
    while (size / 2 >= s) {
      const from = cur;
      const z = size;
      const n = size / 2;
      cur = H.image({ width: n, height: n, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(from, Skia.XYWHRect(0, 0, z, z), Skia.XYWHRect(0, 0, n, n), Skia.Paint()));
      size = n;
    }
    const last = cur;
    const z = size;
    return H.image({ width: s, height: s, scale: 1, background: 'transparent' }, (c) => c.drawImageRect(last, Skia.XYWHRect(0, 0, z, z), Skia.XYWHRect(0, 0, s, s), Skia.Paint()));
  };
  const homeIcon = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) => {
    const small = shrink(im, s);
    c.save();
    c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
    put(c, small, x, y, s);
    c.restore();
  };
  const adaptiveAt = (c: SkCanvas, layer: SkImage, x: number, y: number, s: number, circleMask: boolean) => {
    c.save();
    if (circleMask) c.clipPath(Skia.PathBuilder.Make().addCircle(x + s / 2, y + s / 2, s / 2).build(), ClipOp.Intersect, true);
    else c.clipRRect(Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.3, s * 0.3), ClipOp.Intersect, true);
    c.drawRect(Skia.XYWHRect(x, y, s, s), solid(bg));
    const full = s * (108 / 72);
    put(c, layer, x - (full - s) / 2, y - (full - s) / 2, full);
    c.restore();
  };
  const pixels = (im: SkImage) => im.readPixels(0, 0, { width: im.width(), height: im.height(), colorType: 4, alphaType: 3 }) as Uint8Array;

  const icon = img(Y.ICON);
  // The subject: every pixel of the icon far from the yellow ground (hivis to hivisLight, blue channel low).
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const ground = [hex(YARD.hivis), hex(YARD.hivisLight)];
  const nearGround = (r: number, g: number, b: number) => {
    // distance to the segment between the two ground colours
    const [a, z] = ground;
    const d = [z[0] - a[0], z[1] - a[1], z[2] - a[2]];
    const t = Math.max(0, Math.min(1, ((r - a[0]) * d[0] + (g - a[1]) * d[1] + (b - a[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2)));
    return Math.hypot(r - a[0] - t * d[0], g - a[1] - t * d[1], b - a[2] - t * d[2]) < 40;
  };
  const px = pixels(icon);
  let reachPx = 0;
  for (let y = 0; y < N; y += 2) for (let x = 0; x < N; x += 2) {
    const k = (y * N + x) * 4;
    if (!nearGround(px[k], px[k + 1], px[k + 2])) reachPx = Math.max(reachPx, Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2));
  }
  // The layer is 108 dp across: 1 dp = N / 108 px. The subject must stay inside 33 dp (0.5 dp of margin).
  const dp = N / 108;
  const scale = Math.min(1, (32.5 * dp) / reachPx);
  const adaptive = img((c) => {
    c.drawRect(Skia.XYWHRect(0, 0, N, N), solid(YARD.hivis));
    const s = N * scale;
    put(c, icon, (N - s) / 2, (N - s) / 2, s);
  });
  console.log(`adaptive: the subject reaches ${(reachPx / dp).toFixed(1)} dp at full size; drawn at ${(scale * 100).toFixed(1)} %, so it reaches ${((reachPx * scale) / dp).toFixed(1)} dp (safe 33.0)`);
  const splash = img((c) => {
    const s = N * 0.78;
    const o = (N - s) / 2;
    c.save();
    c.clipRRect(Skia.RRectXY(Skia.XYWHRect(o, o, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
    put(c, icon, o, o, s);
    c.restore();
  });
  const set = { icon, adaptive, splash };

  if (mode === 'final') {
    const dir = path.join('games', 'scrap-yard');
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
  // the house's 60 px board: the four games' icons and this one, on a light and a dark home screen
  const fromFile = (f: string): SkImage => {
    const im = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(f))));
    if (!im) throw new Error(`cannot read ${f}`);
    return im;
  };
  const row = [...['pizza-empire', 'space-miner', 'night-market', 'high-office'].map((g) => fromFile(`games/${g}/icon.png`)), icon];
  const HOMES = ['#EDEFF4', '#15171C'];
  await H.sheet(path.join(outDir, 'lineup-60.png'), { width: 20 + row.length * 80, height: 200, scale: 1, background: '#FFFFFF' }, (c) => {
    HOMES.forEach((home, r) => {
      c.drawRect(Skia.XYWHRect(0, r * 100, 20 + row.length * 80, 100), solid(home));
      row.forEach((im, i) => homeIcon(c, im, 20 + i * 80, r * 100 + 20, 60));
    });
  });
  await H.sheet(path.join(outDir, 'sheet.png'), { width: 1100, height: 700, scale: 1, background: '#888888' }, (c) => {
    HOMES.forEach((home, r) => {
      const y = r * 228;
      c.drawRect(Skia.XYWHRect(0, y, 1100, 228), solid(home));
      let x = 24;
      for (const s of [180, 120, 60, 40]) {
        homeIcon(c, icon, x, y + 24, s);
        x += s + 24;
      }
      x += 40;
      for (const s of [180, 60]) {
        adaptiveAt(c, adaptive, x, y + 24, s, true);
        x += s + 24;
        adaptiveAt(c, adaptive, x, y + 24, s, false);
        x += s + 24;
      }
    });
    c.drawRect(Skia.XYWHRect(0, 456, 1100, 244), solid(bg));
    put(c, splash, 24, 466, 200);
  });
  console.log('wrote', outDir);
});
