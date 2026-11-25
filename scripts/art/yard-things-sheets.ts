/**
 * The artist "things"'s contact sheets (called from yard-sheets.ts: names things, pieces, heaps,
 * things-ui, things-scene, things-grey, things-bounds). Every object of the first yard whole and in its
 * stages, every piece at its three sizes, the bays' heaps at five levels, the old stock's beds, the skip
 * card and the pictograms; a yard corner composed from them at phone size; the grey test picture; and the
 * bounds measure that rewrites manifest/things.ts MEASURED.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas } from '@shopify/react-native-skia';
import type { Headless } from './headless';
import type { TextFn } from '../../src/ui/salvage/art/ui.draw';

export const THINGS_SHEETS = ['things', 'pieces', 'heaps', 'things-ui', 'things-scene', 'things-grey', 'things-bounds'] as const;

export async function thingsSheets(
  H: Headless,
  T: TextFn,
  want: (id: string) => boolean,
  write: (name: string, w: number, h: number, draw: (c: SkCanvas) => void, scale?: number, bg?: string) => Promise<void>,
): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const pal = require('../../src/ui/salvage/art/palette') as typeof import('../../src/ui/salvage/art/palette');
  const pen = require('../../src/ui/salvage/art/pen') as typeof import('../../src/ui/salvage/art/pen');
  const MT = require('../../src/ui/salvage/art/manifest/things') as typeof import('../../src/ui/salvage/art/manifest/things');
  const PC = require('../../src/ui/salvage/art/pieces.draw') as typeof import('../../src/ui/salvage/art/pieces.draw');
  const GR = require('../../src/ui/salvage/art/ground.draw') as typeof import('../../src/ui/salvage/art/ground.draw');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { YARD } = pal;
  const V = pen.VIEW;
  const byId = (id: string) => MT.THINGS.find((e) => e.id === id)!;
  const caption = (c: SkCanvas, text: string, x: number, y: number, size = 7) => T(c, text, x, y, { size, weight: 'semibold', color: YARD.inkSoft, align: 'center' });
  const title = (c: SkCanvas, text: string) => T(c, text, 12, 20, { size: 13, weight: 'heavy', color: YARD.ink });
  /** Draw an entry's frame at (x, y) at TRUE size (undo the bake scale, as the world does). */
  const drawTrue = (c: SkCanvas, id: string, frame: number, x: number, y: number) => {
    const e = byId(id);
    pen.at(c, x, y, () => e.draw(c, V, frame, 0), e.drawScale ?? 1);
  };

  // A row-flow layout: cells of entries at true size with captions.
  const flow = async (name: string, head: string, ids: string[], W = 900, captions = true) => {
    const cells: { id: string; f: number; x: number; y: number }[] = [];
    let x = 14;
    let y = 40;
    let row = 0;
    for (const id of ids) {
      const e = byId(id);
      const k = e.drawScale ?? 1;
      for (let f = 0; f < e.frames.length; f++) {
        const w = Math.max(e.bounds.w * k, 40) + 10;
        if (x + w > W) {
          x = 14;
          y += row + 22;
          row = 0;
        }
        cells.push({ id, f, x: x + (w - 10) / 2 - (e.bounds.x + e.bounds.w / 2) * k, y: y - e.bounds.y * k });
        x += w;
        row = Math.max(row, e.bounds.h * k);
      }
    }
    await write(name, W, y + row + 34, (c) => {
      title(c, head);
      for (const cell of cells) {
        const e = byId(cell.id);
        const k = e.drawScale ?? 1;
        drawTrue(c, cell.id, cell.f, cell.x, cell.y);
        if (captions) caption(c, `${cell.id.replace(/^(thing|piece|heap|ui)\./, '')}${e.frames.length > 1 ? ' ' + e.frames[cell.f] : ''}`, cell.x + (e.bounds.x + e.bounds.w / 2) * k, cell.y + (e.bounds.y + e.bounds.h) * k + 9);
      }
    }, 3);
  };

  if (want('things')) {
    const ids = MT.THINGS.filter((e) => e.group === 'thing').map((e) => e.id);
    await flow('things-objects.png', 'The first yard\'s things, whole and in their stages (true size, 40 pt a metre; phone pixels)', ids, 900);
  }
  if (want('pieces')) {
    const ground = MT.THINGS.filter((e) => e.group === 'piece' && !e.id.endsWith('.carried') && !e.id.endsWith('.bay')).map((e) => e.id);
    await flow('things-pieces.png', 'Pieces on the ground (true size), ingots hot to cold and the heel', ground, 900);
    const small = MT.THINGS.filter((e) => e.id.endsWith('.carried') || e.id.endsWith('.bay')).map((e) => e.id);
    await flow('things-pieces-small.png', 'Pieces carried (0.8) and in a bay heap (0.6)', small, 900, false);
  }
  if (want('heaps')) {
    const ids = MT.THINGS.filter((e) => e.group === 'heap').map((e) => e.id);
    await flow('things-heaps.png', 'Bay heaps by grade at five fill levels; the old stock\'s beds (zone 1, 2, 3; full, low)', ids, 900);
  }
  if (want('things-ui')) {
    await write('things-ui.png', 520, 260, (c) => {
      title(c, 'The skip card (from above: empty, trial load, full) and the 10 pt grade pictograms');
      ['ui.skip.farm', 'ui.skip.demolition'].forEach((id, r) =>
        [0, 1, 2].forEach((f) => {
          drawTrue(c, id, f, 70 + f * 100, 70 + r * 60);
          caption(c, `${id.split('.')[2]} ${byId(id).frames[f]}`, 70 + f * 100, 70 + r * 60 + 30);
        }),
      );
      Object.keys(MT.GRADE_SPRITE).forEach((g, i) => {
        const x = 30 + (i % 11) * 44;
        const y = 200 + Math.floor(i / 11) * 34;
        drawTrue(c, `ui.picto.${g}`, 0, x, y);
        caption(c, g, x, y + 16);
      });
    }, 3, YARD.paper);
  }
  if (want('things-grey')) {
    // The grey test as a picture: copper, brass, steel, aluminium pieces at every size, colour above, grey below
    const kinds: [string, string][] = [
      ['steel (HMS)', 'piece.steel.beam'],
      ['steel plate', 'piece.steel.plate'],
      ['copper bright', 'piece.copper.bright'],
      ['copper tube', 'piece.copper.tube'],
      ['brass taps', 'piece.brass.taps'],
      ['brass fittings', 'piece.brass.fittings'],
      ['aluminium', 'piece.alu.profile'],
      ['alu wheel', 'piece.alu.wheel'],
    ];
    const grey = (c: SkCanvas, draw: () => void) => {
      const p = H.Skia.Paint();
      p.setColorFilter(H.Skia.ColorFilter.MakeMatrix([0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]));
      c.saveLayer(p);
      draw();
      c.restore();
    };
    await write('things-grey.png', 760, 300, (c) => {
      title(c, 'Copper, brass, steel and aluminium in colour and in grey (each 25 L* apart: things.test.ts)');
      const row = (y: number) =>
        kinds.forEach(([name, id], i) => {
          const x = 50 + i * 90;
          drawTrue(c, id, 0, x, y);
          drawTrue(c, `${id}.bay`, 0, x - 18, y + 46);
          drawTrue(c, `${id}.carried`, 0, x + 18, y + 46);
          caption(c, name, x, y + 72);
        });
      row(70);
      grey(c, () => row(190));
    }, 3);
  }
  if (want('things-scene')) {
    // A corner of the first yard at phone size: the old stock in its zones, the drop-off washer, bays
    await write('things-scene.png', 844, 390, (c) => {
      GR.drawConcrete(c, V, 0, 0, 844 / 40, 390 / 28 + 2, 3, true);
      const put = (id: string, f: number, mx: number, my: number) => drawTrue(c, id, f, mx * 40, my * 28);
      // zone 3 at the back: the car, beams, the tank
      put('heap.zone3', 0, 4.5, 3.2);
      put('thing.beam', 0, 4.5, 2.4);
      put('thing.beam', 2, 4.2, 3.1);
      put('thing.tank', 0, 8.6, 3.6);
      put('thing.car', 0, 13.2, 3.0);
      put('thing.car', 3, 18.6, 3.4);
      // zone 2 in the middle
      put('heap.zone2', 0, 5.0, 7.6);
      put('thing.radiator', 0, 3.6, 7.0);
      put('thing.radiator', 1, 5.0, 7.3);
      put('thing.bath', 0, 6.8, 7.6);
      put('thing.gate', 0, 4.2, 8.6);
      put('thing.cylinder', 0, 7.6, 8.4);
      put('thing.stove', 0, 2.6, 8.0);
      put('thing.wheels', 0, 6.0, 9.1);
      put('thing.railings', 1, 9.6, 8.8);
      // zone 1 at the front right
      put('heap.zone1', 0, 14.5, 8.6);
      put('thing.washer', 0, 13.2, 8.0);
      put('thing.washer', 0, 14.1, 7.7);
      put('thing.washer', 1, 15.0, 8.3);
      put('thing.bike', 0, 14.6, 9.4);
      put('thing.cable.bundle', 0, 16.4, 9.0);
      put('thing.taps', 0, 12.6, 9.2);
      put('thing.fittings', 0, 16.3, 7.8);
      put('thing.cable.drum', 0, 17.6, 8.2);
      // the bays at the front: FE, CI, HMS heaps; pieces on the ground
      put('heap.li.4', 0, 3.0, 12.4);
      put('heap.ci.3', 0, 6.0, 12.6);
      put('heap.hms.5', 0, 9.2, 12.4);
      put('heap.appl.2', 0, 12.0, 12.8);
      put('piece.copper.bright', 0, 15.0, 11.9);
      put('piece.brass.taps', 0, 15.8, 12.2);
      put('piece.motor', 0, 16.6, 11.8);
      put('piece.drum', 0, 17.4, 12.3);
      put('piece.alu.wheel', 0, 18.4, 12.0);
      put('piece.cast.shard', 0, 19.2, 12.4);
      put('piece.steel.beam', 0, 18.4, 13.0);
      put('piece.ingot.brass', 3, 20.2, 11.8);
      put('piece.ingot.brass', 0, 20.2, 12.4);
      put('thing.coil', 0, 19.4, 9.6);
      put('thing.pipe', 0, 10.4, 10.4);
      put('thing.plough', 0, 19.2, 6.4);
    }, 3, YARD.concrete);
  }
  if (want('things-bounds')) {
    const rows: string[] = [];
    for (const e of MT.THINGS) {
      let l = 1e9;
      let t = 1e9;
      let r = -1e9;
      let b = -1e9;
      const half = 300;
      for (let f = 0; f < e.frames.length; f++) {
        const img = H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
          c.translate(half, half);
          e.draw(c, V, f, 0);
        });
        const px = img.readPixels(0, 0, { width: half * 2, height: half * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
        for (let y = 0; y < half * 2; y++)
          for (let x = 0; x < half * 2; x++)
            if (px[(y * half * 2 + x) * 4 + 3] > 4) {
              l = Math.min(l, x - half);
              r = Math.max(r, x - half + 1);
              t = Math.min(t, y - half);
              b = Math.max(b, y - half + 1);
            }
      }
      if (r < l) continue;
      rows.push(`  '${e.id}': [${l - 2}, ${t - 2}, ${r - l + 4}, ${b - t + 4}],`);
    }
    const file = path.join(__dirname, '../../src/ui/salvage/art/manifest/things.ts');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('{', a) + 1;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`things-bounds: ${rows.length} entries written to manifest/things.ts; pixels at density 3: ${(MT.thingsPixels(3) / 1e6).toFixed(2)} Mpx`);
  }
  void PC;
}
