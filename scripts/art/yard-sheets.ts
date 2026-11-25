/**
 * The scrapyard's art kit (src/ui/salvage/art) drawn to PNG in Node: contact sheets of the kit, the
 * proof picture at 844 x 390 and 667 x 375 (2 px a point) and the loading animation's six key frames.
 * Writes only into <outDir> (default: scripts/art/out-yard; keep PNGs out of the repository).
 *
 *   npx tsx scripts/art/yard-sheets.ts [outDir] [only...]     only: palette type people things plant ground ui proof loading
 *                                                            and the registry's names (REGISTRY below)
 *
 * THE MANIFEST (src/ui/salvage/art/manifest): `manifest-people`, `manifest-things`, `manifest-plant` draw
 * every entry of a part at phone size (1 pt = 3 px, every frame, its bounds box faint); `atlas-A`,
 * `atlas-B`, `atlas-G` bake the three atlases exactly as the app does (world/atlas.ts) at density 3 and
 * print what each holds; `budget` prints each part's pixels per sheet at density 3; `bounds` measures the
 * plant part's ink and rewrites its MEASURED table (manifest/plant.ts).
 *
 * REGISTRY: an artist adds a sheet as one entry { name, run } (run gets the same helpers the built-in
 * sheets use); add entries, change nobody else's.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas } from '@shopify/react-native-skia';
import { headless } from './headless';
import { makeText } from './yard-text';

headless(async (H) => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const pal = require('../../src/ui/salvage/art/palette') as typeof import('../../src/ui/salvage/art/palette');
  const pen = require('../../src/ui/salvage/art/pen') as typeof import('../../src/ui/salvage/art/pen');
  const L = require('../../src/ui/salvage/art/letters') as typeof import('../../src/ui/salvage/art/letters');
  const P = require('../../src/ui/salvage/art/people.draw') as typeof import('../../src/ui/salvage/art/people.draw');
  const S = require('../../src/ui/salvage/art/scrap.draw') as typeof import('../../src/ui/salvage/art/scrap.draw');
  const M = require('../../src/ui/salvage/art/plant.draw') as typeof import('../../src/ui/salvage/art/plant.draw');
  const G = require('../../src/ui/salvage/art/ground.draw') as typeof import('../../src/ui/salvage/art/ground.draw');
  const U = require('../../src/ui/salvage/art/ui.draw') as typeof import('../../src/ui/salvage/art/ui.draw');
  const PR = require('../../src/ui/salvage/art/proof.draw') as typeof import('../../src/ui/salvage/art/proof.draw');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { YARD, METAL } = pal;
  const V = pen.VIEW;
  const out = process.argv[2] ?? path.join(__dirname, 'out-yard');
  const only = process.argv.slice(3);
  const want = (id: string) => !only.length || only.includes(id);
  fs.mkdirSync(out, { recursive: true });
  const T = makeText(H);
  const caption = (c: SkCanvas, text: string, x: number, y: number) => T(c, text, x, y, { size: 9, weight: 'semibold', color: YARD.inkSoft, align: 'center' });
  const title = (c: SkCanvas, text: string) => T(c, text, 12, 20, { size: 13, weight: 'heavy', color: YARD.ink });
  const grey = (c: SkCanvas, draw: (q: SkCanvas) => void) => {
    const p = H.Skia.Paint();
    p.setColorFilter(H.Skia.ColorFilter.MakeMatrix([0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]));
    c.saveLayer(p);
    draw(c);
    c.restore();
  };
  const write = async (name: string, w: number, h: number, draw: (c: SkCanvas) => void, scale = 3, bg: string = YARD.concrete) => {
    const f = path.join(out, name);
    await H.sheet(f, { width: w, height: h, scale, background: bg }, draw);
    console.log('wrote', f);
  };
  const put = (c: SkCanvas, x: number, y: number, draw: () => void) => pen.at(c, x, y, draw);

  // ---------------------------------------------------------------------------------------------------
  // The registry (one entry per sheet; artists add theirs here)
  // ---------------------------------------------------------------------------------------------------
  interface Ctx { H: typeof H; out: string; T: typeof T; write: typeof write; put: typeof put; caption: typeof caption; title: typeof title }
  const REGISTRY: { name: string; run: (x: Ctx) => Promise<void> }[] = [];
  /* eslint-disable @typescript-eslint/no-require-imports */
  const MF = () => require('../../src/ui/salvage/art/manifest') as typeof import('../../src/ui/salvage/art/manifest');
  const ATL = () => require('../../src/ui/salvage/world/atlas') as typeof import('../../src/ui/salvage/world/atlas');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const manifestSheet = (part: 'people' | 'things' | 'plant') => async () => {
    const entries = MF().PARTS[part];
    if (!entries.length) {
      console.log(`manifest-${part}: no entries yet`);
      return;
    }
    // lay every frame out in rows at its bounds' size, 1 pt = 3 px
    const W = 900;
    const cells: { e: (typeof entries)[number]; f: number; x: number; y: number }[] = [];
    let x = 10;
    let y = 30;
    let row = 0;
    for (const e of entries)
      for (let f = 0; f < e.frames.length; f++) {
        const w = Math.max(e.bounds.w, 46) + 8;
        if (x + w > W) {
          x = 10;
          y += row + 22;
          row = 0;
        }
        cells.push({ e, f, x: x - e.bounds.x + (w - 8 - e.bounds.w) / 2, y: y - e.bounds.y });
        x += w;
        row = Math.max(row, e.bounds.h);
      }
    const H2 = y + row + 30;
    await write(`manifest-${part}.png`, W, H2, (c) => {
      title(c, `manifest: ${part} (${entries.length} entries, every frame; faint box = bounds)`);
      for (const cell of cells) {
        const { e, f } = cell;
        c.drawPath(pen.rect(cell.x + e.bounds.x, cell.y + e.bounds.y, e.bounds.w, e.bounds.h), pen.stroke(YARD.inkSoft, 0.4, 0.5));
        put(c, cell.x, cell.y, () => e.draw(c, V, f, 0));
        T(c, `${e.id.replace(/^(plant|lane|ground|mark)\./, '')}${e.frames.length > 1 ? ' ' + e.frames[f] : ''}`, cell.x + e.bounds.x + e.bounds.w / 2, cell.y + e.bounds.y + e.bounds.h + 9, { size: 6.5, weight: 'semibold', color: YARD.inkSoft, align: 'center' });
      }
    }, 3);
  };
  REGISTRY.push({ name: 'manifest-people', run: manifestSheet('people') });
  REGISTRY.push({ name: 'manifest-things', run: manifestSheet('things') });
  REGISTRY.push({ name: 'manifest-plant', run: manifestSheet('plant') });
  // the artist "people" (scripts/art/yard-people-sheets.ts): crew, carriers, vehicles, atlas-people, people-scene
  for (const name of ['crew', 'carriers', 'vehicles', 'atlas-people', 'people-scene'])
    REGISTRY.push({
      name,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      run: async (x) => (require('./yard-people-sheets') as typeof import('./yard-people-sheets')).peopleSheets(x.H, x.T, (id) => id === name, x.write),
    });
  // the artist "things" (scripts/art/yard-things-sheets.ts): things, pieces, heaps, things-ui, things-scene, things-grey, things-bounds
  for (const name of ['things', 'pieces', 'heaps', 'things-ui', 'things-scene', 'things-grey', 'things-bounds'])
    REGISTRY.push({
      name: name === 'things' || name === 'pieces' ? `${name}-all` : name,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      run: async (x) => (require('./yard-things-sheets') as typeof import('./yard-things-sheets')).thingsSheets(x.H, x.T, (id) => id === name, x.write),
    });
  REGISTRY.push({
    name: 'budget',
    run: async () => {
      const M = MF();
      const sum: Record<string, Record<string, number>> = {};
      for (const [part, entries] of Object.entries(M.PARTS))
        for (const e of entries) {
          sum[e.sheet] ??= {};
          sum[e.sheet][part] = (sum[e.sheet][part] ?? 0) + M.entryPixels(e, 3);
        }
      for (const [sheet, parts] of Object.entries(sum)) {
        const cap = sheet === 'G' ? 1024 * 1024 : 2048 * 2048;
        const total = Object.values(parts).reduce((a, b) => a + b, 0);
        console.log(`sheet ${sheet}: ${Object.entries(parts).map(([p, n]) => `${p} ${(n / 1e6).toFixed(2)} Mpx`).join(', ')}; total ${(total / 1e6).toFixed(2)} of ${(cap / 1e6).toFixed(2)} Mpx (${Math.round((100 * total) / cap)} %)`);
      }
      const A = ATL();
      for (const sheet of ['A', 'B', 'G'] as const) {
        const s = A.sheetSize(sheet, 3);
        console.log(`packed ${sheet} at density 3: ${s.width} x ${s.height} px, density used ${s.density}`);
      }
    },
  });
  REGISTRY.push({
    name: 'bounds',
    run: async () => {
      const M = MF();
      const rows: string[] = [];
      for (const e of M.PARTS.plant) {
        let l = 1e9;
        let t = 1e9;
        let r = -1e9;
        let b = -1e9;
        const half = 420;
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
      const file = path.join(__dirname, '../../src/ui/salvage/art/manifest/plant.ts');
      const src = fs.readFileSync(file, 'utf8');
      const a = src.indexOf('const MEASURED');
      const start = src.indexOf('{', a) + 1;
      const end = src.indexOf('};', start);
      fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
      console.log(`bounds: ${rows.length} entries written to manifest/plant.ts`);
    },
  });
  REGISTRY.push({
    name: 'hero',
    run: async () => {
      for (const [name, Lay] of [['yard-844.png', PR.HERO_844], ['yard-667.png', PR.HERO_667]] as const) await write(name, Lay.w, Lay.h, (c) => PR.drawHero(c, Lay, T), 2, YARD.concrete);
    },
  });
  for (const sheet of ['A', 'B', 'G'] as const)
    REGISTRY.push({
      name: `atlas-${sheet}`,
      run: async () => {
        const A = ATL();
        const plan = A.planSheet(sheet, 3);
        const img = H.image({ width: plan.width / 3, height: plan.height / 3, scale: 3, background: sheet === 'G' ? '#808080' : '#5A6A7A' }, (c) => {
          c.scale(1 / 3, 1 / 3);
          A.drawPlan(c, plan);
        });
        const f = path.join(out, `atlas-${sheet}.png`);
        fs.writeFileSync(f, Buffer.from(img.encodeToBytes()));
        console.log(`wrote ${f}: ${plan.width} x ${plan.height} px, ${plan.cells.length} cells, density ${plan.density}`);
      },
    });

  if (want('palette')) {
    const draw = (c: SkCanvas) => {
      title(c, 'hi-vis-and-rust: the palette');
      const keys = Object.keys(YARD) as (keyof typeof YARD)[];
      keys.forEach((k, i) => {
        const x = 12 + (i % 10) * 70;
        const y = 34 + Math.floor(i / 10) * 46;
        c.drawPath(pen.rrect(x, y, 62, 22, 4), pen.fill(YARD[k]));
        c.drawPath(pen.rrect(x, y, 62, 22, 4), pen.stroke(YARD.ink, 1));
        T(c, k, x + 31, y + 32, { size: 7.5, weight: 'semibold', color: YARD.ink, align: 'center' });
        T(c, YARD[k], x + 31, y + 41, { size: 7, color: YARD.inkSoft, align: 'center' });
      });
      // the metals: chip, sheen mark, a carried piece and an ingot each
      const y0 = 34 + Math.ceil(keys.length / 10) * 46 + 10;
      T(c, 'metals: colour, sheen mark, carried piece, ingot (ladder order)', 12, y0, { size: 10, weight: 'bold', color: YARD.ink });
      pal.LADDER_ORDER.forEach((id, i) => {
        const x = 40 + i * 76;
        const m = METAL[id];
        c.drawPath(pen.circle(x, y0 + 26, 12), pen.fill(m.base));
        c.drawPath(pen.circle(x, y0 + 26, 12), pen.stroke(YARD.ink, 1.2));
        P.carriedPiece(c, id, x - 12, y0 + 46, 24, 9, i);
        put(c, x, y0 + 86, () => S.drawIngot(c, V, id, 99));
        caption(c, `${id} · ${m.sheen}`, x, y0 + 108);
      });
    };
    await write('palette.png', 720, 590, draw, 2, YARD.paper);
    await write('palette-grey.png', 720, 590, (c) => grey(c, draw), 2, YARD.paper);
  }

  if (want('type')) {
    await write('type.png', 640, 210, (c) => {
      title(c, 'Type: stencil (signs, plates), dot matrix (the ticket), seven segments (the display)');
      L.stencil(c, 'SCRAP TO INGOT', 12, 34, 30, YARD.ink);
      L.stencil(c, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789', 12, 76, 14, YARD.ink);
      L.dotMatrix(c, 'BARE BRIGHT CU  52.4 KG × §35.00  §1,834.00', 12, 104, 9, YARD.print, { bold: true });
      L.dotMatrix(c, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,:-/%·§×', 12, 120, 7, YARD.print);
      c.drawPath(pen.rrect(12, 140, 250, 56, 6), pen.fill(YARD.ledCase));
      L.sevenSeg(c, '1,240.5', 250, 148, 38, YARD.led, YARD.ledOff);
      T(c, '§1,834  ·  25th of 26  ·  52/60 kg   (system font: Inter stands in)', 280, 176, { size: 13, weight: 'heavy', color: YARD.ink });
    }, 3, YARD.paper);
  }

  if (want('people')) {
    const poses: [string, import('../../src/ui/salvage/art/people.draw').PersonOptions][] = [
      ['stand s', { dir: 's', pose: 'stand' }],
      ['walk s 1', { dir: 's', pose: 'walk', frame: 0 }],
      ['walk s 2', { dir: 's', pose: 'walk', frame: 1 }],
      ['stand e', { dir: 'e', pose: 'stand' }],
      ['walk e 1', { dir: 'e', pose: 'walk', frame: 0 }],
      ['walk e 2', { dir: 'e', pose: 'walk', frame: 1 }],
      ['cut e', { dir: 'e', pose: 'cut', spark: 0.2 }],
      ['cut s', { dir: 's', pose: 'cut', spark: 0.6 }],
      ['carry s', { dir: 's', pose: 'carry', stack: ['light_iron', 'copper', 'copper', 'light_iron'] }],
      ['carry e', { dir: 'e', pose: 'carry', stack: ['copper', 'copper', 'copper', 'copper'] }],
      ['carry n', { dir: 'n', pose: 'carry' }],
      ['stand w', { dir: 'w', pose: 'stand' }],
    ];
    await write('people.png', 640, 360, (c) => {
      title(c, 'The boss (white hat, hi-vis yellow) and crews (yellow hats, role vests) at 40 pt a metre');
      poses.forEach(([name, o], i) => {
        const x = 34 + i * 50;
        put(c, x, 104, () => P.drawPerson(c, V, o));
        caption(c, name, x, 122);
      });
      const crews: [string, string][] = [['yard hand', YARD.vestYardHand], ['cutter', YARD.vestCutter], ['driver', YARD.vestDriver]];
      crews.forEach(([name, vest], i) => {
        const x = 34 + i * 100;
        put(c, x, 210, () => P.drawPerson(c, V, { dir: 's', pose: 'stand', look: P.crewLook(vest, i * 2) }));
        put(c, x + 46, 210, () => P.drawPerson(c, V, { dir: 'e', pose: 'carry', look: P.crewLook(vest, i * 2 + 1), stack: ['light_iron', 'cast_iron', 'light_iron'] }));
        caption(c, name + ' (two crew)', x + 23, 230);
      });
      put(c, 340, 210, () => P.drawPerson(c, V, { dir: 'e', pose: 'lever', look: P.crewLook(YARD.vestCutter, 3), shield: true, apron: true }));
      put(c, 380, 210, () => P.drawPerson(c, V, { dir: 's', pose: 'stand', look: P.crewLook(YARD.vestCutter, 4), shield: true, apron: true }));
      caption(c, 'furnace hand: shield, aluminised apron', 360, 230);
      for (let i = 0; i < 5; i++) {
        put(c, 40 + i * 44, 320, () => P.drawPerson(c, V, { dir: i % 2 ? 'e' : 's', pose: 'stand', look: P.crewLook(YARD.vestYardHand, i) }));
      }
      caption(c, 'crew looks by index: five skin tones, hair and beards', 128, 340);
      // scale bar: 1 m
      c.drawPath(pen.segment(470, 210, 470, 210 - V.ppm * V.lift), pen.stroke(YARD.ink, 1.5));
      caption(c, '1 m up', 470, 222);
      put(c, 560, 330, () => P.drawPerson(c, { ppm: 120, tilt: 0.7, lift: V.lift }, { dir: 's', pose: 'stand' }));
      caption(c, 'the boss at 3x', 560, 348);
    }, 3);
  }

  if (want('things')) {
    await write('things.png', 640, 262, (c) => {
      title(c, 'What the yard takes in and gives out (true size, 40 pt a metre)');
      const items: [string, number, number, () => void][] = [
        ['washer', 40, 110, () => S.drawWasher(c, V, 'whole')],
        ['half stripped', 100, 110, () => S.drawWasher(c, V, 'stripped')],
        ['pieces', 170, 110, () => S.drawWasher(c, V, 'pieces')],
        ['cable drum', 240, 110, () => S.drawCableDrum(c, V)],
        ['cable coil', 305, 110, () => S.drawCoil(c, V, 'cable')],
        ['bare bright', 370, 110, () => S.drawBrightCopper(c, V)],
        ['brass taps', 430, 110, () => S.drawTapCrate(c, V)],
        ['cast-iron radiator', 510, 110, () => S.drawRadiator(c, V)],
        ['brass ingot', 590, 110, () => S.drawIngot(c, V, 'brass')],
        ['gate tip heap', 70, 215, () => S.drawHeap(c, V, 1.3, 0.85)],
        ['pouring', 190, 215, () => S.drawIngot(c, V, 'brass', 0.2)],
        ['1 s', 250, 215, () => S.drawIngot(c, V, 'brass', 1)],
        ['2 s', 310, 215, () => S.drawIngot(c, V, 'brass', 2)],
        ['cooled', 370, 215, () => S.drawIngot(c, V, 'brass', 3)],
        ['copper', 440, 215, () => S.drawIngot(c, V, 'copper')],
        ['aluminium', 510, 215, () => S.drawIngot(c, V, 'aluminium')],
      ];
      for (const [name, x, y, d] of items) {
        put(c, x, y, d);
        caption(c, name, x, y + 26);
      }
    }, 3);
  }

  if (want('pieces')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PC = require('../../src/ui/salvage/art/pieces.draw') as typeof import('../../src/ui/salvage/art/pieces.draw');
    await write('pieces.png', 640, 250, (c) => {
      title(c, 'Pieces by grade: each its own shape (bays, heaps, skips, the carried stack)');
      const grades = ['copper', 'brass', 'light_iron', 'hms', 'cast_iron', 'aluminium', 'enamel'];
      grades.forEach((g, i) => {
        const x = 50 + i * 88;
        for (let k = 0; k < 3; k++) PC.pieceGlyph(c, g, x, 50 + k * 26, 20, 0, k * 7 + 1);
        c.save();
        c.translate(x, 205);
        PC.pieceHeap(c, [g], 80, 30, 14, i + 1, 15);
        c.restore();
        caption(c, g.replace('_', ' '), x, 232);
      });
    }, 3);
  }

  if (want('plant')) {
    await write('plant.png', 900, 560, (c) => {
      title(c, 'Machines, the weighbridge, the furnace, the truck, a bay, the containers');
      const items: [string, number, number, () => void][] = [
        ['cable stripper (running)', 80, 130, () => M.drawStripper(c, V, { running: true })],
        ['weighbridge + display', 280, 150, () => M.drawWeighbridgeDeck(c, V)],
        ['', 365, 128, () => { M.drawWeighDisplay(c, V, '1,240'); }],
        ['crucible: cold, lid on', 500, 140, () => M.drawFurnaceSet(c, V, 'cold')],
        ['crucible: pouring', 700, 140, () => M.drawFurnaceSet(c, V, 'pouring')],
        ['truck + skip, east', 120, 310, () => M.drawTruck(c, V, 0, { load: ['light_iron', 'copper', 'cast_iron', 'light_iron'] })],
        ['south-west', 340, 310, () => M.drawTruck(c, V, Math.PI * 0.75)],
        ['north', 520, 310, () => M.drawTruck(c, V, -Math.PI / 2, { load: ['light_iron', 'light_iron'] })],
        ['bay, held', 730, 330, () => M.drawBay(c, V, 2.4, 2.0, { heap: ['copper'], code: 'CU', hold: true, seed: 2 })],
        ['container wall', 330, 520, () => M.drawContainerWall(c, V, 2, 1, 3)],
        ['container, 4 m section', 730, 520, () => M.drawContainer(c, V, YARD.containerTeal, { len: 4 })],
      ];
      for (const [name, x, y, d] of items) {
        put(c, x, y, d);
        if (name) caption(c, name, x, y + 32);
      }
    }, 2);
  }

  if (want('ground')) {
    await write('ground.png', 640, 330, (c) => {
      title(c, 'Ground: slabs, a dashed bay line, oil stains, puddles; the furnace pad open and locked');
      put(c, 12, 30, () => G.drawGroundPatch(c, V, 7, 8.5, 5));
      put(c, 470, 100, () => M.drawPad(c, V, 3.6, 2.6));
      caption(c, 'furnace pad (bought)', 470, 150);
      put(c, 470, 255, () => M.drawPad(c, V, 3.6, 2.6, true));
      U.padlockChip(c, T, 470, 232, 'Crucible furnace', '§1,500');
      put(c, 470, 268, () => S.drawIngot(c, V, 'brass'));
      caption(c, 'locked: padlock chip, price, sample ingot', 470, 312);
    }, 3, YARD.paper);
  }

  if (want('ui')) {
    await write('ui.png', 640, 330, (c) => {
      title(c, 'Interface: ticket-paper chips with ink edges and a hard drop; the weighbridge ticket');
      U.cashChip(c, T, 12, 34, 120, 30, '1,834');
      U.ladderChip(c, T, 146, 34, 300, 30, { rank: '25th', of: 'of 26', next: 'Pennick Scrap', gap: '1.5 t', progress: 0.68 });
      U.carryChip(c, T, 460, 34, 80, 30, '52/60 kg');
      U.clipboardButton(c, 554, 34, 44, 30);
      U.goalCard(c, T, 12, 80, 420, 24, 'Strip cable into bare bright copper', '18 / 20 kg', 0.9);
      U.drawTicket(c, 12, 126, PR.PROOF_TICKET);
      const two = { ...PR.PROOF_TICKET, number: '000128', lines: [
        { grade: 'BRASS SOLIDS', net: '12.0 KG', price: '§16.00', amount: '§192.00', metal: 'brass' },
        { grade: 'LIGHT IRON', net: '140 KG', price: '§0.50', amount: '§70.00', metal: 'light_iron' },
      ], total: '§262.00' };
      U.drawTicket(c, 220, 116, two);
      U.stick(c, 490, 190, 14, -8);
      U.oneButton(c, T, 590, 190, 'Open');
      U.padlockChip(c, T, 520, 268, 'Motor bench', '§800');
      U.priceTag(c, T, 520, 308, '§35.00/kg', 'copper');
    }, 3, YARD.concrete);
  }

  if (want('proof')) {
    for (const [name, Lay] of [['proof-844.png', PR.PROOF_844], ['proof-667.png', PR.PROOF_667]] as const) {
      await write(name, Lay.w, Lay.h, (c) => PR.drawProof(c, Lay, T), 2, YARD.concrete);
    }
    await write('proof-844-grey.png', 844, 390, (c) => grey(c, (q) => PR.drawProof(q, PR.PROOF_844, T)), 2, YARD.concrete);
  }

  if (want('loading')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const LD = require('../../src/ui/salvage/art/loading.draw') as typeof import('../../src/ui/salvage/art/loading.draw');
    const keys: [string, number][] = [
      ['1-crane', 0.2],
      ['2-magnet', 0.62],
      ['3-plates', 1.3],
      ['4-counting', 1.62],
      ['5-pour', 1.95],
      ['6-cooled', 2.4],
    ];
    for (const [name, t] of keys) await write(`loading-${name}.png`, 844, 390, (c) => LD.drawLoading(c, 844, 390, LD.loadingPose(t)), 2, YARD.sky);
    await write('loading-sheet.png', 844 + 20, 230 * 3 + 10, (c) => {
      keys.forEach(([name, t], i) => {
        const x = 5 + (i % 2) * 427;
        const y = 5 + Math.floor(i / 2) * 230;
        c.save();
        c.translate(x, y);
        c.scale(0.5, 0.5);
        c.clipRect({ x: 0, y: 0, width: 844, height: 390 }, H.ClipOp.Intersect, true);
        LD.drawLoading(c, 844, 390, LD.loadingPose(t));
        c.restore();
        T(c, `${name}  t = ${t.toFixed(2)} s`, x + 4, y + 212, { size: 11, weight: 'bold', color: YARD.ink });
      });
    }, 2, '#FFFFFF');
  }
  for (const r of REGISTRY) if (only.includes(r.name) || (!only.length && r.name.startsWith('manifest-'))) await r.run({ H, out, T, write, put, caption, title });
});
