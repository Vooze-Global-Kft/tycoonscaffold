/**
 * App icons for both games, drawn in code.
 *
 *   npx tsx scripts/art/icons/build.ts candidates <outDir>   round-1 candidates at 1024 + comparison sheets
 *   npx tsx scripts/art/icons/build.ts r2 <outDir>           round-2 candidates (after the store review)
 *   npx tsx scripts/art/icons/build.ts chosen <outDir>       the chosen set + sheet-chosen.png, no repo writes
 *   npx tsx scripts/art/icons/build.ts final [outDir]        the chosen icons; without outDir, writes
 *                                                           games/<id>/icon.png, adaptive-icon.png, splash.png
 *
 * icon.png is full-bleed and opaque (re-encoded without alpha by ffmpeg afterwards: see `final`).
 * adaptive-icon.png keeps the subject inside the central 66 % (Pizza Empire's is full-bleed sunburst, since
 * the launcher's background is the cream theme colour, and only the chef's bust runs on below the visible
 * window; Orbit Haulers' is transparent). splash.png is transparent. Check the adaptive icons under the
 * circle, squircle and rounded-square masks with `npx tsx scripts/art/icons/measure.ts <outDir>`.
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
  const marcoSlice = { x: 800, y: 800, turn: -22, unit: 12.5 };
  const C: Candidate[] = [
    {
      id: 'pizza-A',
      game: 'pizza-empire',
      note: 'Chef Marco bust, calm (eyes open), sunburst, slice lower right',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 480, y: 520, unit: 10.5, slice: marcoSlice }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, mood: 'calm', x: 480, y: 520, unit: 10.5, slice: marcoSlice }), 0.6),
    },
    {
      id: 'pizza-B',
      game: 'pizza-empire',
      note: 'Chef Marco laughing (eyes shut), closer crop, slice raised beside the cheek',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'happy', backdrop: 'sun', x: 450, y: 560, unit: 12.5, slice: { x: 820, y: 640, turn: 18, unit: 11 } }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, mood: 'happy', x: 450, y: 560, unit: 12.5, slice: { x: 820, y: 640, turn: 18, unit: 11 } }), 0.6),
    },
    {
      id: 'pizza-C',
      game: 'pizza-empire',
      note: 'Pizzaiolo (cast "pizzaiolo": dark hair, curled moustache) centred, no slice, plain gradient',
      icon: (c) => pizza.drawPizzaIcon(c, { look: JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).cast.pizzaiolo, mood: 'calm', backdrop: 'plain', x: 512, y: 540, unit: 11 }),
      layer: shrunk((c) => pizza.drawPizzaIcon(c, { background: false, look: JSON.parse(fs.readFileSync('games/pizza-empire/game.json', 'utf8')).cast.pizzaiolo, mood: 'calm', x: 512, y: 540, unit: 11 }), 0.6),
    },
    {
      id: 'haul-A',
      game: 'space-miner',
      note: 'Drone diagonal (nose up-right) heading home to the station ring arc in the top-right corner',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'ring', x: 470, y: 590, heading: -38, unit: 25, line: 1.05 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'ring', space: false, x: 512, y: 512, heading: -38, unit: 31 }), 0.6),
    },
    {
      id: 'haul-B',
      game: 'space-miner',
      note: 'Drone diagonal over a big asteroid whose edge is lit warm, lower right',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'rock', x: 440, y: 480, heading: -38, unit: 25, line: 1.05 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'rock', space: false, x: 512, y: 512, heading: -38, unit: 31 }), 0.6),
    },
    {
      id: 'haul-C',
      game: 'space-miner',
      note: 'Drone diagonal inside a cyan halo ring (no station or rock)',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'halo', x: 530, y: 510, heading: -38, unit: 24, line: 1.05 }),
      layer: shrunk((c) => haul.drawHaulIcon(c, { backdrop: 'halo', space: false, x: 512, y: 512, heading: -38, unit: 31 }), 0.6),
    },
  ];

  // ---------------------------------------------------------------- round 2 candidates (after the store review)
  const R2: Candidate[] = [
    {
      id: 'r2-pizza-A',
      game: 'pizza-empire',
      note: 'Marco smaller and left, slice upright in the lower-right corner, clear gap',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 430, y: 600, unit: 9.6, slice: { x: 835, y: 790, turn: 10, unit: 8.6 } }),
      layer: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 430, y: 600, unit: 9.6, slice: { x: 835, y: 790, turn: 10, unit: 8.6 } }),
    },
    {
      id: 'r2-pizza-B',
      game: 'pizza-empire',
      note: 'Marco centred, slice held low in front of the chest, below the chin',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 512, y: 560, unit: 9.8, slice: { x: 690, y: 905, turn: -62, unit: 8 } }),
      layer: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 512, y: 560, unit: 9.8, slice: { x: 690, y: 905, turn: -62, unit: 8 } }),
    },
    {
      id: 'r2-pizza-C',
      game: 'pizza-empire',
      note: 'Marco right of centre, slice raised in the upper-left beside the toque',
      icon: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 590, y: 610, unit: 9.6, slice: { x: 190, y: 800, turn: -18, unit: 8.4 } }),
      layer: (c) => pizza.drawPizzaIcon(c, { mood: 'calm', backdrop: 'sun', x: 590, y: 610, unit: 9.6, slice: { x: 190, y: 800, turn: -18, unit: 8.4 } }),
    },
    {
      id: 'r2-haul-A',
      game: 'space-miner',
      note: 'Iron asteroid lower left with a hot seam, drone leaving it up-right with ore, dotted route',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', route: true, x: 690, y: 340, heading: -38, unit: 17, line: 1.25, flame: 0.7, rock: { x: 250, y: 790, r: 340, turn: 0 } }),
      layer: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', route: true, x: 690, y: 340, heading: -38, unit: 17, line: 1.25, flame: 0.7, rock: { x: 250, y: 790, r: 340, turn: 0 } }),
    },
    {
      id: 'r2-haul-B',
      game: 'space-miner',
      note: 'Same, no route, bigger drone, rock larger',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', rock: { x: 260, y: 780, r: 360, turn: 8 }, x: 680, y: 350, heading: -38, unit: 19, line: 1.25, flame: 0.6 }),
      layer: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', rock: { x: 260, y: 780, r: 360, turn: 8 }, x: 680, y: 350, heading: -38, unit: 19, line: 1.25, flame: 0.6 }),
    },
    {
      id: 'r2-haul-C',
      game: 'space-miner',
      note: 'Rock lower right, drone upper left heading up-right away from it',
      icon: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', rock: { x: 780, y: 800, r: 340, turn: 20 }, x: 360, y: 400, heading: -38, unit: 17, line: 1.25, flame: 0.7 }),
      layer: (c) => haul.drawHaulIcon(c, { backdrop: 'ore-rock', rock: { x: 780, y: 800, r: 340, turn: 20 }, x: 360, y: 400, heading: -38, unit: 17, line: 1.25, flame: 0.7 }),
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
    const W = rowW + 600;
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

  if (mode === 'candidates' || mode === 'r2') {
    if (!outDir) throw new Error('outDir needed');
    fs.mkdirSync(outDir, { recursive: true });
    const made: Record<string, { icon: SkImage; layer: SkImage; c: Candidate }> = {};
    const list = mode === 'r2' ? R2 : C;
    for (const c of list) {
      const icon = img(c.icon);
      const layer = img(c.layer);
      made[c.id] = { icon, layer, c };
      fs.writeFileSync(path.join(outDir, `${c.id}.png`), Buffer.from(icon.encodeToBytes()));
      fs.writeFileSync(path.join(outDir, `${c.id}-layer.png`), Buffer.from(layer.encodeToBytes()));
      console.log(c.id, '-', c.note);
    }
    const pz = list.filter((c) => c.game === 'pizza-empire');
    const hl = list.filter((c) => c.game === 'space-miner');
    for (let i = 0; i < Math.max(pz.length, hl.length); i++) {
      const pairs = [pz[i], hl[i]].filter(Boolean).map((c) => ({ label: c.id, icon: made[c.id].icon, layer: made[c.id].layer, bg: games[c.game] }));
      await comparison(path.join(outDir, `sheet-${i}.png`), pairs);
    }
    return;
  }
  if (mode === 'chosen' || mode === 'final') {
    const pick = {
      'pizza-empire': { icon: img(pizza.drawChosenIcon), adaptive: img(pizza.drawChosenAdaptive), splash: img(pizza.drawChosenSplash) },
      'space-miner': { icon: img(haul.drawChosenIcon), adaptive: img(haul.drawChosenAdaptive), splash: img(haul.drawChosenLayer) },
    };
    const dirFor = (g: string) => (mode === 'final' && !outDir ? path.join('games', g) : path.join(outDir ?? '.', g));
    for (const [g, set] of Object.entries(pick)) {
      const dir = dirFor(g);
      fs.mkdirSync(dir, { recursive: true });
      for (const [name, im] of Object.entries(set)) {
        const file = path.join(dir, `${name === 'adaptive' ? 'adaptive-icon' : name}.png`);
        if (name === 'icon') {
          // Apple rejects an alpha channel: re-encode as 24-bit RGB.
          const tmp = `${file}.rgba.png`;
          fs.writeFileSync(tmp, Buffer.from(im.encodeToBytes()));
          execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-pix_fmt', 'rgb24', file]);
          fs.unlinkSync(tmp);
        } else fs.writeFileSync(file, Buffer.from(im.encodeToBytes()));
        console.log('wrote', file);
      }
    }
    if (outDir)
      await comparison(path.join(outDir, 'sheet-chosen.png'), (['pizza-empire', 'space-miner'] as const).map((g) => ({ label: g, icon: pick[g].icon, layer: pick[g].adaptive, bg: games[g] })));
  }
});
