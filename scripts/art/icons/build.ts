/**
 * App icons for both games, drawn in code.
 *
 *   npx tsx scripts/art/icons/build.ts candidates <outDir>   every candidate at 1024 + comparison sheets
 *   npx tsx scripts/art/icons/build.ts final [outDir]        the chosen icons; without outDir, writes
 *                                                           games/<id>/icon.png, adaptive-icon.png, splash.png
 *
 * icon.png is full-bleed and opaque (re-encoded without alpha by ffmpeg afterwards: see `final`).
 * adaptive-icon.png and splash.png are transparent with the subject inside the central 66 %.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import { headless } from '../headless';

type Draw = (c: SkCanvas) => void;
interface Candidate {
  id: string;
  game: 'pizza-empire' | 'space-miner';
  note: string;
  icon: Draw;
  /** Transparent layer: subject in the central 66 %. */
  layer: Draw;
}

headless(async (H) => {
  const { Skia, FilterMode, MipmapMode, PaintStyle } = H;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const haul = require('./haul.icon') as typeof import('./haul.icon');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pizza = require('./pizza.icon') as typeof import('./pizza.icon');
  const games = {
    'pizza-empire': JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).theme.colors.background as string,
    'space-miner': JSON.parse(fs.readFileSync('games/space-miner/game.json', 'utf8')).theme.colors.background as string,
  };

  /** Draws `d` (made for 1024) shrunk about the centre so it fits a fraction `k` of the square. */
  const shrunk = (d: Draw, k: number): Draw => (c) => {
    c.save();
    c.translate(512 * (1 - k), 512 * (1 - k));
    c.scale(k, k);
    d(c);
    c.restore();
  };

  // ---------------------------------------------------------------- candidates
  const marcoSlice = { x: 790, y: 830, turn: -24, unit: 10.5 };
  const C: Candidate[] = [
    {
      id: 'pizza-A',
      game: 'pizza-empire',
      note: 'Chef Marco bust, calm (eyes open), sunburst, slice lower right',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 480, y: 520, unit: 10.5, slice: marcoSlice }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, mood: 'calm', x: 480, y: 520, unit: 10.5, slice: marcoSlice }), 0.66),
    },
    {
      id: 'pizza-B',
      game: 'pizza-empire',
      note: 'Chef Marco laughing (eyes shut), closer crop, slice raised beside the cheek',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'happy', backdrop: 'sun', x: 450, y: 560, unit: 12.5, slice: { x: 820, y: 640, turn: 18, unit: 11 } }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, mood: 'happy', x: 450, y: 560, unit: 12.5, slice: { x: 820, y: 640, turn: 18, unit: 11 } }), 0.66),
    },
    {
      id: 'pizza-C',
      game: 'pizza-empire',
      note: 'Pizzaiolo (cast "pizzaiolo": dark hair, curled moustache) centred, no slice, plain gradient',
      icon: (c) => pizza.drawPizzaIcon(c, { look: JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).cast.pizzaiolo, mood: 'calm', backdrop: 'plain', x: 512, y: 540, unit: 11 }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, look: JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).cast.pizzaiolo, mood: 'calm', x: 512, y: 540, unit: 11 }), 0.66),
    },
    {
      id: 'haul-A',
      game: 'space-miner',
      note: 'Drone diagonal (nose up-right) heading home to the station ring arc in the top-right corner',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'ring', x: 470, y: 570, heading: -38, unit: 34 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'ring', space: false, x: 512, y: 512, heading: -38, unit: 34 }), 0.66),
    },
    {
      id: 'haul-B',
      game: 'space-miner',
      note: 'Drone diagonal over a big asteroid whose edge is lit warm, lower right',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'rock', x: 450, y: 470, heading: -38, unit: 33 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'rock', space: false, x: 512, y: 512, heading: -38, unit: 33 }), 0.66),
    },
    {
      id: 'haul-C',
      game: 'space-miner',
      note: 'Drone diagonal inside a cyan halo ring (no station or rock)',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'halo', x: 512, y: 520, heading: -38, unit: 30 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'halo', space: false, x: 512, y: 512, heading: -38, unit: 30 }), 0.66),
    },
  ];

  // ---------------------------------------------------------------- helpers
  const img = (d: Draw, bg = 'transparent'): SkImage => H.image({ width: 1024, height: 1024, scale: 1, background: bg }, d);
  const sampling = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear };
  const put = (c: SkCanvas, im: SkImage, x: number, y: number, s: number) =>
    c.drawImageRectOptions(im, Skia.XYWHRect(0, 0, im.width(), im.height()), Skia.XYWHRect(x, y, s, s), sampling.filter, sampling.mipmap);
  const squircle = (x: number, y: number, s: number) => {
    // Superellipse (n = 5), close to the iOS and Pixel shapes.
    const b = Skia.PathBuilder.Make();
    const n = 5;
    for (let i = 0; i <= 96; i++) {
      const t = (Math.PI * 2 * i) / 96;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const px = x + s / 2 + (s / 2) * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
      const py = y + s / 2 + (s / 2) * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
      if (i) b.lineTo(px, py);
      else b.moveTo(px, py);
    }
    b.close();
    return b.build();
  };
  const rounded = (x: number, y: number, s: number) => Skia.PathBuilder.Make().addRRect(Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.2237, s * 0.2237)).build();
  const solid = (col: string) => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(col));
    p.setAntiAlias(true);
    return p;
  };
  /** An adaptive icon as a launcher shows it: 108 dp layer, 72 dp visible, mask inside that. */
  const adaptive = (c: SkCanvas, layer: SkImage, bg: string, x: number, y: number, s: number, mask: 'circle' | 'squircle') => {
    const shape = mask === 'circle' ? Skia.PathBuilder.Make().addCircle(x + s / 2, y + s / 2, s / 2).build() : squircle(x, y, s);
    c.save();
    c.clipPath(shape, H.ClipOp.Intersect, true);
    c.drawRect(Skia.XYWHRect(x, y, s, s), solid(bg));
    const full = s * (108 / 72);
    put(c, layer, x - (full - s) / 2, y - (full - s) / 2, full);
    c.restore();
  };

  const comparison = async (out: string, pairs: { label: string; icon: SkImage; layer: SkImage; bg: string }[]) => {
    const sizes = [180, 120, 60, 40];
    const rowW = sizes.reduce((a, b) => a + b + 24, 0) + 24;
    const W = rowW * 2;
    const rowH = 180 + 48;
    const H2 = pairs.length * rowH * 2 + pairs.length * 140;
    await H.sheet(out, { width: W, height: H2, scale: 1, background: '#888888' }, (c) => {
      let y = 0;
      for (const p of pairs) {
        for (const [i, home] of ['#EDEFF4', '#15171C'].entries()) {
          c.drawRect(Skia.XYWHRect(0, y, W, rowH), solid(home));
          let x = 24;
          for (const s of sizes) {
            c.save();
            c.clipPath(rounded(x, y + 24, s), H.ClipOp.Intersect, true);
            put(c, p.icon, x, y + 24, s);
            c.restore();
            x += s + 24;
          }
          // Adaptive on the same row, right half.
          x = rowW + 24;
          for (const s of [180, 60]) {
            adaptive(c, p.layer, p.bg, x, y + 24, s, 'circle');
            x += s + 24;
            adaptive(c, p.layer, p.bg, x, y + 24, s, 'squircle');
            x += s + 24;
          }
          void i;
          y += rowH;
        }
        // Splash preview: the layer at 200 pt wide (x 1/0.66 for the 66 % margin) on the theme colour.
        c.drawRect(Skia.XYWHRect(0, y, W, 140), solid(p.bg));
        put(c, p.layer, 24, y - 30, 200);
        y += 140;
      }
      void PaintStyle;
    });
  };

  const mode = process.argv[2] ?? 'candidates';
  const outDir = process.argv[3];

  if (mode === 'candidates') {
    if (!outDir) throw new Error('outDir needed');
    fs.mkdirSync(outDir, { recursive: true });
    const made: Record<string, { icon: SkImage; layer: SkImage; c: Candidate }> = {};
    for (const c of C) {
      const icon = img(c.icon);
      const layer = img(c.layer);
      made[c.id] = { icon, layer, c };
      fs.writeFileSync(path.join(outDir, `${c.id}.png`), Buffer.from(icon.encodeToBytes()));
      fs.writeFileSync(path.join(outDir, `${c.id}-layer.png`), Buffer.from(layer.encodeToBytes()));
      console.log(c.id, '-', c.note);
    }
    const pz = C.filter((c) => c.game === 'pizza-empire');
    const hl = C.filter((c) => c.game === 'space-miner');
    for (let i = 0; i < Math.max(pz.length, hl.length); i++) {
      const pairs = [pz[i], hl[i]].filter(Boolean).map((c) => ({ label: c.id, icon: made[c.id].icon, layer: made[c.id].layer, bg: games[c.game] }));
      await comparison(path.join(outDir, `sheet-${i}.png`), pairs);
    }
    return;
  }
  void execFileSync;
});
