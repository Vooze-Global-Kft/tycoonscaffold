/**
 * Sheet "works-halls" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-HALLS's): the three halls (sheds, furnaces, glow, pour streams), the manifest
 * part src/ui/salvage/art/manifest/worksHalls.ts drawn by src/ui/salvage/art/halls.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-halls.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-halls
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';

/*
 * ART-HALLS adds, beside the contact sheet:
 *   works-halls-scene.png   each hall put together as the world stacks it (shed, furnace, glow, moulds' place, stream) in its
 *                           phases (cold, heating, pour), at full size, the first yard's furnace corner beside them
 *   works-halls-60.png      the same at phone size (a furnace about 60 px tall) beside the first yard's crucible and hood
 *   HALLS_MEASURE=1         measures every entry's ink (every frame, plus 2 pt) and writes manifest/worksHalls.ts MEASURED
 */
export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const file = path.join(__dirname, '../../../src/ui/salvage/art/manifest/worksHalls.ts');
  const M = require('../../../src/ui/salvage/art/manifest/worksHalls') as typeof import('../../../src/ui/salvage/art/manifest/worksHalls');
  const HD = require('../../../src/ui/salvage/art/halls.draw') as typeof import('../../../src/ui/salvage/art/halls.draw');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const SD = require('../../../src/ui/salvage/art/site.draw') as typeof import('../../../src/ui/salvage/art/site.draw');
  const PD = require('../../../src/ui/salvage/art/plant.draw') as typeof import('../../../src/ui/salvage/art/plant.draw');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const V = pen.VIEW;

  if (process.env.HALLS_MEASURE === '1') {
    const rows: string[] = [];
    for (const e of M.WORKS_HALLS) {
      let l = 1e9;
      let t = 1e9;
      let r = -1e9;
      let b = -1e9;
      const half = 520;
      for (let f = 0; f < e.frames.length; f++) {
        const img = x.H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
          c.translate(half, half);
          e.draw(c, V, f, 0);
        });
        const px = img.readPixels(0, 0, { width: half * 2, height: half * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
        for (let y = 0; y < half * 2; y++)
          for (let q = 0; q < half * 2; q++)
            if (px[(y * half * 2 + q) * 4 + 3] > 4) {
              l = Math.min(l, q - half);
              r = Math.max(r, q - half + 1);
              t = Math.min(t, y - half);
              b = Math.max(b, y - half + 1);
            }
      }
      if (r < l) continue;
      rows.push(`  '${e.id}': [${l - 2}, ${t - 2}, ${r - l + 4}, ${b - t + 4}],`);
    }
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('{', a) + 1;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`works-halls: ${rows.length} bounds measured into manifest/worksHalls.ts (run again without HALLS_MEASURE to draw)`);
    console.log(rows.join('\n'));
    return;
  }

  await x.contact('works-halls', M.WORKS_HALLS);

  // the halls put together as the world will stack them, at true size (each layer at its drawScale)
  const byId = (id: string) => M.WORKS_HALLS.find((e) => e.id === id)!;
  const layer = (c: SkCanvas, id: string, f: number, ox: number, oy: number) => {
    const e = byId(id);
    const [sx, sy] = pen.proj(V, ox, oy, 0);
    c.save();
    c.translate(sx, sy);
    const k = e.drawScale ?? 1;
    c.scale(k, k);
    e.draw(c, V, f, 0);
    c.restore();
  };
  /** A hall at a phase: 'cold' (empty), 'heat' (hot, glowing), 'pour' (tilted, glow, stream). Origin: the hall's place point. */
  const putHall = (c: SkCanvas, kind: 'rotary' | 'induction' | 'copper', phase: 'cold' | 'heat' | 'pour', frame = 0) => {
    const sh = HD.SHEDS[kind];
    const L = HD.HALL_POUR[kind];
    // the apron's point (content: rotary at the shed's south wall + 0.5, induction and copper + 1.0)
    const ay = sh.d / 2 + (kind === 'rotary' ? 0.5 : 1.0);
    const [fx, fy] = [L.furnace[0], ay + L.furnace[1]];
    // the apron (a paler poured slab) and the mould row's place (ART-HALLPARTS draws the moulds: a dashed outline here)
    const aw = kind === 'rotary' ? 4 : 3;
    const ad = kind === 'rotary' ? 1 : 2;
    c.drawPath(pen.facePath(V, [[-aw / 2, ay - ad / 2, 0], [aw / 2, ay - ad / 2, 0], [aw / 2, ay + ad / 2, 0], [-aw / 2, ay + ad / 2, 0]]), pen.fill(pal.YARD.concreteLight));
    const mw = kind === 'rotary' ? 4 : 3;
    c.drawPath(pen.facePath(V, [[-mw / 2, ay - 0.35, 0], [mw / 2, ay - 0.35, 0], [mw / 2, ay + 0.35, 0], [-mw / 2, ay + 0.35, 0]]), pen.dashed(pal.YARD.inkSoft, 0.8, 3, 2));
    const fr = phase === 'cold' ? 0 : phase === 'heat' ? 1 : 2;
    layer(c, `works.hall.${kind}.furnace`, fr, fx, fy);
    if (phase !== 'cold') layer(c, `works.hall.${kind}.glow`, frame % 2, fx, fy);
    layer(c, `works.hall.${kind}.shed`, 0, 0, 0);
    if (phase === 'pour') layer(c, `works.hall.${kind}.stream`, frame % 3, 0, ay);
  };
  const kinds = ['rotary', 'induction', 'copper'] as const;
  await x.write('works-halls-scene.png', 1500, 1180, (c) => {
    x.title(c, 'works-halls: each hall stacked as the world draws it (furnace, glow, shed, stream); cold / heating / pour; right: the first yard');
    kinds.forEach((k, j) => {
      (['cold', 'heat', 'pour'] as const).forEach((ph, i) => {
        const cx = 200 + i * 400;
        const cy = 330 + j * 380;
        x.put(c, cx, cy, () => putHall(c, k, ph));
        x.caption(c, `${k} ${ph}`, cx, cy + 190);
      });
    });
    // the first yard's furnace corner (as its world draws it: hood, crucible state, mould) at the same scale
    const fy = (cx: number, cy: number, st: 'idle' | 'pour') =>
      x.put(c, cx, cy, () => {
        SD.drawCrucibleState(c, V, st, 0);
        PD.drawMould(c, V, { ox: PD.MOULD_X * 1.2 + 0.5, oy: 0.36, poured: st === 'pour' ? [0.2, 0.8] : [] });
        SD.drawHood(c, V, st === 'pour');
      });
    fy(1330, 330, 'idle');
    fy(1330, 700, 'pour');
    x.caption(c, 'first yard: crucible idle / pour', 1330, 800);
  }, 2);
  // phone size: 1 pt = 1 px and the world zoomed so a hall's furnace is about 60 px tall (0.85 of the ground work's 40 pt a metre)
  await x.write('works-halls-60.png', 1180, 380, (c) => {
    x.title(c, 'phone size (a furnace about 60 px): pour, heating; the first yard\'s crucible corner at the same zoom');
    const z = 0.85;
    kinds.forEach((k, i) => {
      x.put(c, 130 + i * 330, 210, () => {
        c.scale(z, z);
        putHall(c, k, 'pour', 1);
      });
      x.put(c, 270 + i * 330, 210, () => {
        c.scale(z * 0.5, z * 0.5);
        putHall(c, k, 'heat', 0);
      });
    });
    x.put(c, 1110, 210, () => {
      c.scale(z, z);
      SD.drawCrucibleState(c, V, 'pour', 0);
      PD.drawMould(c, V, { ox: PD.MOULD_X * 1.2 + 0.5, oy: 0.36, poured: [0.2, 0.8] });
      SD.drawHood(c, V, true);
    });
  }, 1);
}
