/**
 * Measures the chosen adaptive icons against Android's masks (pizza-0): renders each layer, finds
 * the subject's pixels (alpha for a transparent layer; for a full-bleed layer, pixels that differ
 * from the same layer drawn without its subject) and prints the largest distance from the centre in
 * dp of the 108 dp layer. Android's safe zone is the central 66 dp circle (radius 33 dp); every
 * launcher mask contains it. Also writes `<outDir>/<game>-masks.png`: the layer under a circle, a
 * squircle and a rounded square, at 180 px, on the launcher's colour.
 *
 *   npx tsx scripts/art/icons/measure.ts <outDir>
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { headless } from '../headless';

type Draw = (c: SkCanvas) => void;

headless(async (H) => {
  const { Skia } = H;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const haul = require('./haul.icon') as typeof import('./haul.icon');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pizza = require('./pizza.icon') as typeof import('./pizza.icon');
  const outDir = process.argv[2] ?? '.';
  fs.mkdirSync(outDir, { recursive: true });
  const img = (d: Draw): SkImage => H.image({ width: 1024, height: 1024, scale: 1, background: 'transparent' }, d);
  const px = (im: SkImage) => im.readPixels(0, 0, { width: 1024, height: 1024, colorType: 4, alphaType: 3 }) as Uint8Array;
  const bgOf = JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).theme.colors.background as string;
  const bgHaul = JSON.parse(fs.readFileSync('games/space-miner/game.json', 'utf8')).theme.colors.background as string;

  const sets = [
    // Pizza Empire's chef is a bust: below 18 dp under the centre only his body continues, cropped by the mask.
    { game: 'pizza-empire', layer: pizza.drawChosenAdaptive, base: pizza.drawAdaptiveBackdrop as Draw | undefined, bg: bgOf, bodyBelow: 18 },
    { game: 'space-miner', layer: haul.drawChosenAdaptive, base: undefined as Draw | undefined, bg: bgHaul, bodyBelow: Infinity },
  ];
  const dp = 1024 / 108;
  for (const s of sets) {
    const a = px(img(s.layer));
    const b = s.base ? px(img(s.base)) : null;
    let max = 0;
    let where = '';
    // The largest reach in each 30-degree sector (0 = right, clockwise), to see what pokes out.
    const sector = new Array(12).fill(0);
    for (let y = 0; y < 1024; y++)
      for (let x = 0; x < 1024; x++) {
        const i = (y * 1024 + x) * 4;
        const on = b ? Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24 : a[i + 3] > 8;
        if (!on) continue;
        // The visible window is 72 dp: what lies outside it is never shown by any launcher.
        if (Math.abs(x - 512) > 36 * dp || Math.abs(y - 512) > 36 * dp) continue;
        if (y - 512 > s.bodyBelow * dp) continue;
        const d = Math.hypot(x + 0.5 - 512, y + 0.5 - 512) / dp;
        const k = Math.floor((((Math.atan2(y + 0.5 - 512, x + 0.5 - 512) * 180) / Math.PI + 360) % 360) / 30);
        sector[k] = Math.max(sector[k], d);
        if (d > max) {
          max = d;
          where = `${x},${y}`;
        }
      }
    console.log(`${s.game} sectors (0 = right, clockwise, 30 deg each): ${sector.map((v) => v.toFixed(0)).join(' ')}`);
    console.log(`${s.game}: subject reaches ${max.toFixed(1)} dp from the centre (safe 33.0) at ${where}${max <= 33 ? ' OK' : ' OUTSIDE'}`);
    const layer = img(s.layer);
    await H.sheet(path.join(outDir, `${s.game}-masks.png`), { width: 3 * 200 + 40, height: 220, scale: 1, background: '#EDEFF4' }, (c) => {
      const shapes = [
        (x: number, y: number, z: number) => Skia.PathBuilder.Make().addCircle(x + z / 2, y + z / 2, z / 2).build(),
        (x: number, y: number, z: number) => Skia.PathBuilder.Make().addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, z, z), z * 0.3, z * 0.3)).build(),
        (x: number, y: number, z: number) => Skia.PathBuilder.Make().addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, z, z), z * 0.12, z * 0.12)).build(),
      ];
      shapes.forEach((shape, k) => {
        const x = 20 + k * 200;
        const y = 20;
        const z = 180;
        c.save();
        c.clipPath(shape(x, y, z), H.ClipOp.Intersect, true);
        const p = Skia.Paint();
        p.setColor(Skia.Color(s.bg));
        c.drawRect(Skia.XYWHRect(x, y, z, z), p);
        const full = z * (108 / 72);
        c.drawImageRect(layer, Skia.XYWHRect(0, 0, 1024, 1024), Skia.XYWHRect(x - (full - z) / 2, y - (full - z) / 2, full, full), Skia.Paint());
        c.restore();
        // The safe circle (66 dp) as a thin line.
        const ring = Skia.Paint();
        ring.setStyle(1);
        ring.setColor(Skia.Color('#00C2FF'));
        ring.setStrokeWidth(1);
        ring.setAntiAlias(true);
        c.drawCircle(x + z / 2, y + z / 2, (z / 72) * 33, ring);
      });
    });
  }
});
