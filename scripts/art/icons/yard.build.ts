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
 * - adaptive-icon.png: Android's foreground layer (108 dp), transparent, with the icon as the home screen's
 *   rounded tile inside the 33 dp safe circle (a stand-in until the art director draws an adaptive
 *   composition: the icon's tongs run off its edge, see below); the launcher's colour around the tile is
 *   theme.colors.background, the sky;
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
  // the launcher's and the splash's colour: theme.colors.background as scripts/content/yard-app.json gives it to game.json
  const bg = JSON.parse(fs.readFileSync('scripts/content/yard-app.json', 'utf8')).theme.colors.background as string;
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
  // The adaptive layer is 108 dp across (1 dp = N / 108 px); a launcher shows the middle 72 dp under its mask
  // and only the circle of 33 dp around the centre is safe. ICON's tongs run off its top-left edge by design,
  // so ICON cannot be laid full-bleed on a yellow layer without either cutting the copper bundle (lower left)
  // with the mask or ending the tongs in mid-air. Until the art director draws an adaptive composition, the
  // layer carries ICON as the same rounded tile as the home screen, as large as keeps its corners inside the
  // safe circle, on transparency: the launcher's colour around it is theme.colors.background (the sky).
  const reachOf = (im: SkImage) => {
    const a = pixels(im);
    let reach = 0;
    for (let y = 0; y < N; y += 2) for (let x = 0; x < N; x += 2) if (a[(y * N + x) * 4 + 3] > 24) reach = Math.max(reach, Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2));
    return reach / (N / 108);
  };
  const tile = (scale: number) =>
    img((c) => {
      const s = N * scale;
      const o = (N - s) / 2;
      c.save();
      c.clipRRect(Skia.RRectXY(Skia.XYWHRect(o, o, s, s), s * 0.2237, s * 0.2237), ClipOp.Intersect, true);
      put(c, icon, o, o, s);
      c.restore();
    });
  let scale = 0.62;
  while (reachOf(tile(scale)) > 32.5) scale -= 0.005;
  const adaptive = tile(scale);
  console.log(`adaptive: ICON as a rounded tile at ${(scale * 100).toFixed(1)} % of the layer (${(108 * scale).toFixed(1)} dp), its corners reach ${reachOf(adaptive).toFixed(1)} dp (safe 33.0)`);
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
