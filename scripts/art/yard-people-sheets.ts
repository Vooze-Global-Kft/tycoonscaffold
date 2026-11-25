/**
 * The artist "people"'s contact sheets (called from yard-sheets.ts: names crew, carriers, vehicles,
 * atlas-people). Everything that moves in the first yard: the boss and the crew in every pose, the hand
 * load and the wheeled carriers (STAGE1-RULING S8), the hook-lift truck, the merchant's flatbed, the
 * public's van, the delivery van; and the people part of the manifest as the atlas would bake it.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { Headless } from './headless';
import type { TextFn } from '../../src/ui/salvage/art/ui.draw';

export const PEOPLE_SHEETS = ['crew', 'carriers', 'vehicles', 'atlas-people', 'people-scene'] as const;

export async function peopleSheets(
  H: Headless,
  T: TextFn,
  want: (id: string) => boolean,
  write: (name: string, w: number, h: number, draw: (c: SkCanvas) => void, scale?: number, bg?: string) => Promise<void>,
): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const pal = require('../../src/ui/salvage/art/palette') as typeof import('../../src/ui/salvage/art/palette');
  const pen = require('../../src/ui/salvage/art/pen') as typeof import('../../src/ui/salvage/art/pen');
  const P = require('../../src/ui/salvage/art/people.draw') as typeof import('../../src/ui/salvage/art/people.draw');
  const VH = require('../../src/ui/salvage/art/vehicles.draw') as typeof import('../../src/ui/salvage/art/vehicles.draw');
  const MP = require('../../src/ui/salvage/art/manifest/people') as typeof import('../../src/ui/salvage/art/manifest/people');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { YARD } = pal;
  const V = pen.VIEW;
  const caption = (c: SkCanvas, text: string, x: number, y: number, size = 8) => T(c, text, x, y, { size, weight: 'semibold', color: YARD.inkSoft, align: 'center' });
  const title = (c: SkCanvas, text: string) => T(c, text, 12, 20, { size: 13, weight: 'heavy', color: YARD.ink });
  const put = (c: SkCanvas, x: number, y: number, draw: () => void) => pen.at(c, x, y, draw);
  type PO = import('../../src/ui/salvage/art/people.draw').PersonOptions;

  if (want('crew')) {
    // rows of poses, three directions each (s, e, n), the boss then the crew body tinted per role
    const rows: [string, (dir: 's' | 'e' | 'n') => PO[]][] = [
      ['stand · walk 4', (d) => [{ dir: d, pose: 'stand' }, ...[0, 1, 2, 3].map((f) => ({ dir: d, pose: 'walk', frame: f }) as PO)]],
      ['hand load (30 kg) · push 4', (d) => [{ dir: d, pose: 'walk', frame: 0, load: 'cu' }, { dir: d, pose: 'walk', frame: 2, load: 'fe' }, ...[0, 1, 2, 3].map((f) => ({ dir: d, pose: 'push', frame: f }) as PO)]],
      ['spanner 2 · sledge 2 · grinder 2', (d) => [0, 1].flatMap((f) => [{ dir: d, pose: 'spanner', frame: f } as PO]).concat([0, 1].map((f) => ({ dir: d, pose: 'sledge', frame: f }) as PO), [0, 1].map((f) => ({ dir: d, pose: 'grinder', frame: f }) as PO))],
      ['torch 2 · feed 2 · pour', (d) => [0, 1].map((f) => ({ dir: d, pose: 'torch', frame: f }) as PO).concat([0, 1].map((f) => ({ dir: d, pose: 'feed', frame: f }) as PO), [{ dir: d, pose: 'pour' }])],
    ];
    await write('people-crew.png', 900, 1000, (c) => {
      title(c, 'The boss in every pose, three directions (west is east mirrored); 40 pt a metre');
      let y = 70;
      for (const [name, poses] of rows) {
        T(c, name, 12, y - 42, { size: 10, weight: 'bold', color: YARD.ink });
        (['s', 'e', 'n'] as const).forEach((d, di) => {
          poses(d).forEach((o, i) => {
            const x = 40 + di * 290 + i * 44;
            put(c, x, y + 18, () => P.drawPerson(c, V, o));
          });
        });
        y += 100;
      }
      // the crew: one body, vest per role, beside the boss; and the people of the yard side by side
      T(c, 'the crew (one body, the vest recoloured by role) beside the boss: yard hand, cutter, driver; their work', 12, y - 30, { size: 10, weight: 'bold', color: YARD.ink });
      const vests = [YARD.vestYardHand, YARD.vestCutter, YARD.vestDriver];
      put(c, 40, y + 18, () => P.drawPerson(c, V, { dir: 's', pose: 'stand' }));
      vests.forEach((vest, i) => put(c, 84 + i * 44, y + 18, () => P.drawPerson(c, V, { dir: 's', pose: 'stand', look: { ...P.CREW_BODY, vest } })));
      put(c, 240, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'push', frame: 1, look: P.CREW_BODY }));
      put(c, 300, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'grinder', frame: 0, look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      put(c, 350, y + 18, () => P.drawPerson(c, V, { dir: 's', pose: 'sledge', frame: 1, look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      put(c, 400, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'torch', frame: 1, look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      put(c, 450, y + 18, () => P.drawPerson(c, V, { dir: 'w', pose: 'walk', frame: 0, load: 'ci', look: { ...P.CREW_BODY, vest: YARD.vestYardHand } }));
      put(c, 500, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'walk', frame: 1, look: { ...P.CREW_BODY, vest: YARD.vestDriver } }));
      put(c, 560, y + 18, () => P.drawPerson(c, V, { dir: 's', pose: 'pour', look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      put(c, 620, y + 18, () => P.drawPerson(c, V, { dir: 's', pose: 'stand', look: P.CREW_BODY_2 }));
      put(c, 664, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'walk', frame: 0, look: { ...P.CREW_BODY_2, vest: YARD.vestDriver } }));
      caption(c, 'second body (if room)', 642, y + 36);
      y += 100;
      // the hand load by family, from behind and side-on
      T(c, 'hand loads by family (fe ci cu br al cab mot hms), from behind and side-on: strapped on the carry frame, never a tower', 12, y - 30, { size: 10, weight: 'bold', color: YARD.ink });
      P.LOAD_FAMILIES.forEach((fam, i) => {
        const x = 40 + i * 104;
        put(c, x, y + 18, () => P.drawPerson(c, V, { dir: 'n', pose: 'walk', frame: 1, load: fam }));
        put(c, x + 46, y + 18, () => P.drawPerson(c, V, { dir: 'e', pose: 'walk', frame: 1, load: fam }));
        caption(c, fam, x + 23, y + 36);
      });
      y += 110;
      // the boss at phone size beside a 2x and 3x view
      put(c, 60, y + 60, () => P.drawPerson(c, pen.viewOf(80, 0.7), { dir: 'e', pose: 'torch', frame: 1 }));
      put(c, 170, y + 60, () => P.drawPerson(c, pen.viewOf(80, 0.7), { dir: 's', pose: 'grinder', frame: 0 }));
      put(c, 280, y + 60, () => P.drawPerson(c, pen.viewOf(80, 0.7), { dir: 'e', pose: 'walk', frame: 0, load: 'cu' }));
      put(c, 390, y + 60, () => P.drawPerson(c, pen.viewOf(80, 0.7), { dir: 's', pose: 'sledge', frame: 0, look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      put(c, 500, y + 60, () => P.drawPerson(c, pen.viewOf(80, 0.7), { dir: 'e', pose: 'pour', look: { ...P.CREW_BODY, vest: YARD.vestCutter } }));
      caption(c, 'at 2x: torch with dark visor, grinder with shield, copper hand load, sledge with glasses, the pour', 290, y + 82, 9);
    }, 2);
  }

  if (want('carriers')) {
    await write('people-carriers.png', 900, 470, (c) => {
      title(c, 'Wheeled carriers (S8): sack truck and flat trolley, empty and loaded, pushed; loads strapped on');
      const dirs = ['s', 'e', 'n', 'w'] as const;
      (['sack', 'trolley'] as const).forEach((kind, r) => {
        const y = 120 + r * 170;
        dirs.forEach((d, i) => {
          const x = 50 + i * 120;
          put(c, x, y, () => {
            if (d === 'n') VH.drawCarrier(c, V, kind, d, i % 2 ? 'cu' : 'fe');
            P.drawPerson(c, V, { dir: d, pose: 'push', frame: 1 });
            if (d !== 'n') VH.drawCarrier(c, V, kind, d, d === 's' ? 'ci' : d === 'e' ? 'fe' : 'cu');
          });
          caption(c, `${kind} ${d}`, x, y + 22);
        });
        P.LOAD_FAMILIES.slice(0, 6).forEach((fam, i) => {
          const x = 540 + (i % 3) * 120;
          const yy = y - 40 + Math.floor(i / 3) * 80;
          put(c, x, yy, () => VH.drawCarrier(c, V, kind, 'e', fam));
          caption(c, fam, x + 20, yy + 16);
        });
        put(c, 500, y - 40, () => VH.drawCarrier(c, V, kind, 'e', undefined));
        caption(c, 'empty', 515, y - 24);
      });
    }, 2);
  }

  if (want('vehicles')) {
    await write('people-vehicles.png', 1100, 1070, (c) => {
      title(c, 'Vehicles: the hook-lift truck in 8 headings (with its skip), hook and tip, the merchant’s flatbed, the vans');
      const H8 = [0, 1, 2, 3, 4, 5, 6, 7];
      H8.forEach((h, i) => {
        const x = 90 + (i % 4) * 250;
        const y = 150 + Math.floor(i / 4) * 190;
        put(c, x, y, () => {
          VH.drawActorShadow(c, V, 'truck', h);
          VH.drawHookTruck(c, V, VH.headingRad(h), { skip: 'on', load: i === 2 ? 'farm-full' : i === 5 ? 'demolition-trial' : undefined });
        });
        caption(c, `${['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'][h]}${i === 2 ? ' · farm load' : i === 5 ? ' · demolition trial' : ''}`, x, y + 70);
      });
      // hook and tip at heading east
      const frames = ['bare', 'reach', 'incline', 'tipped'] as const;
      frames.forEach((fr, i) => {
        const x = 150 + i * 255;
        put(c, x, 590, () => {
          VH.drawActorShadow(c, V, 'truck', 2);
          VH.drawHookFrame(c, V, fr, fr === 'tipped' ? 'farm-full' : undefined);
        });
        caption(c, `hook/tip: ${fr}`, x, 640);
      });
      // the flatbed
      ([0, 2, 4] as const).forEach((h, i) => {
        const x = 80 + i * 200;
        put(c, x, 800, () => {
          VH.drawActorShadow(c, V, 'flatbed', h);
          VH.drawFlatbed(c, V, VH.headingRad(h), { cargo: i === 1 ? 'full' : undefined });
        });
        caption(c, `flatbed ${['s', 'e', 'n'][i]}${i === 1 ? ' · loaded' : ''}`, x, 850);
      });
      (['reach', 'lift', 'swing'] as const).forEach((fr, i) => {
        const x = 700 + i * 150;
        put(c, x, 790, () => {
          VH.drawFlatbed(c, V, 0, { crane: fr, cargo: i === 2 ? 'part' : undefined });
        });
        caption(c, `loading: ${fr}`, x, 850);
      });
      // the vans
      ([0, 2, 4] as const).forEach((h, i) => {
        const x = 190 + i * 210;
        put(c, x, i === 0 ? 1010 : 960, () => {
          VH.drawActorShadow(c, V, 'van', h);
          VH.drawVan(c, V, VH.headingRad(h), { trailer: true });
        });
        caption(c, `public's van + trailer ${['s', 'e', 'n'][i]}`, x, 1050);
      });
      put(c, 800, 960, () => {
        VH.drawActorShadow(c, V, 'van', 2);
        VH.drawVan(c, V, 0, { body: YARD.machineLight });
      });
      caption(c, 'delivery van (tinted)', 800, 1050);
      put(c, 1000, 960, () => VH.drawSkip(c, V, 0, { load: 'farm-trial' }));
      caption(c, 'skip on the ground', 1000, 1050);
    }, 2);
  }

  if (want('atlas-people')) {
    // every manifest entry of the people part, each baked heading and frame, at true size
    const entries = MP.PEOPLE;
    const cells: { e: (typeof entries)[number]; f: number; h: number }[] = [];
    for (const e of entries) for (const h of MP.baked(e)) for (let f = 0; f < e.frames.length; f++) cells.push({ e, f, h });
    const W = 1400;
    let x = 10;
    let y = 40;
    let rowH = 0;
    const placed: { cell: (typeof cells)[number]; x: number; y: number }[] = [];
    for (const cell of cells) {
      const b = cell.e.bounds;
      if (x + b.w > W - 10) {
        x = 10;
        y += rowH + 6;
        rowH = 0;
      }
      placed.push({ cell, x, y });
      x += b.w + 4;
      rowH = Math.max(rowH, b.h);
    }
    const Ht = y + rowH + 20;
    await write('people-atlas.png', W, Ht, (c) => {
      title(c, `The people part as the atlas bakes it: ${cells.length} cells, boxes = manifest bounds`);
      for (const { cell, x, y } of placed) {
        const b = cell.e.bounds;
        c.drawRect({ x, y, width: b.w, height: b.h }, pen.stroke(YARD.inkSoft, 0.4));
        put(c, x - b.x, y - b.y, () => cell.e.draw(c, V, cell.f, cell.h));
      }
    }, 1.5, YARD.concrete);
  }

  if (want('people-scene')) {
    // the people part as the world will draw it: manifest entries in layers, the crew's vest overlay
    // modulated to its role, vehicles at their drawScale, shadows from drawActorShadow; 844 x 390 points
    const G = require('../../src/ui/salvage/art/ground.draw') as typeof import('../../src/ui/salvage/art/ground.draw');
    const byId = new Map(MP.PEOPLE.map((e) => [e.id, e]));
    type L = import('../../src/ui/salvage/art/manifest/people').Layer;
    const drawLayers = (c: SkCanvas, x: number, y: number, layers: L[], vest?: string) => {
      for (const l of layers) {
        const e = byId.get(l.id)!;
        const hs = MP.baked(e);
        const mirror = !hs.includes(l.heading);
        const h = mirror ? (e.headings === 4 ? 1 : 8 - l.heading) : l.heading;
        c.save();
        c.translate(x + l.dx, y + l.dy);
        if (mirror) c.scale(-1, 1);
        const k = e.drawScale ?? 1;
        if (k !== 1) c.scale(k, k);
        if (e.tint && vest) {
          const p = H.Skia.Paint();
          p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color(vest), H.BlendMode.Modulate));
          c.saveLayer(p);
          e.draw(c, V, l.frame, h);
          c.restore();
        } else e.draw(c, V, l.frame, h);
        c.restore();
      }
    };
    const shadow = (c: SkCanvas, x: number, y: number, kind: import('../../src/ui/salvage/art/vehicles.draw').ActorKind, h8 = 0) => put(c, x, y, () => VH.drawActorShadow(c, V, kind, h8));
    await write('people-scene.png', 844, 390, (c) => {
      put(c, 0, 0, () => G.drawGroundPatch(c, V, 21.1, 14, 7));
      // the merchant's flatbed loading at the bays (parked facing west), the truck coming in with the farm's load
      shadow(c, 610, 120, 'flatbed', 6);
      drawLayers(c, 610, 120, MP.flatbedLayers(3, { crane: 0, cargo: 'part' }));
      shadow(c, 250, 120, 'truck', 7);
      drawLayers(c, 250, 120, MP.truckLayers(7, 'farm-full'));
      // the public's van and trailer at the drop-off
      shadow(c, 720, 300, 'van', 6);
      drawLayers(c, 720, 300, MP.vanLayers(3, true));
      // people: the boss with a copper hand load, pushing a trolley, the crew at work
      const ppl: [number, number, import('../../src/ui/salvage/art/manifest/people').PersonActor, string?][] = [
        [90, 250, { who: 'boss', pose: 'walk', frame: 0, heading: 1, hand: 'cu' }],
        [150, 330, { who: 'boss', pose: 'push', frame: 1, heading: 1, carrier: { kind: 'trolley', load: 'fe' } }],
        [330, 260, { who: 'crew', pose: 'grinder', frame: 0, heading: 1 }, YARD.vestCutter],
        [400, 330, { who: 'crew', pose: 'push', frame: 2, heading: 3, carrier: { kind: 'sack', load: 'ci' } }, YARD.vestYardHand],
        [470, 250, { who: 'crew', pose: 'walk', frame: 1, heading: 0 }, YARD.vestDriver],
        [520, 330, { who: 'crew', pose: 'sledge', frame: 0, heading: 0 }, YARD.vestCutter],
        [580, 280, { who: 'boss', pose: 'torch', frame: 1, heading: 3 }],
        [40, 350, { who: 'crew', pose: 'walk', frame: 2, heading: 2 }, YARD.vestYardHand],
      ];
      for (const [x, y, a, vest] of ppl) {
        shadow(c, x, y, 'person');
        drawLayers(c, x, y, MP.personLayers(a), vest);
      }
    }, 3, YARD.concrete);
  }
}
