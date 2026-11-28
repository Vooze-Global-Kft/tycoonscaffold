/**
 * Sheet "works-hall-parts" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-HALLPARTS's): the halls' filters, moulds, charge boxes, slag skips and the drums, the manifest
 * part src/ui/salvage/art/manifest/worksHallParts.ts drawn by src/ui/salvage/art/hallParts.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-hall-parts.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-hall-parts
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';

/**
 * ART-HALLPARTS: the contact sheet, then
 *  - works-hall-parts-sets.png: each hall's parts as the world lays them out (filter west of the door, the charge box, the
 *    moulds with their ingots TINTED by coolingColour at 0.3 s, 1.5 s (shimmer frame) and cold (full frame), the slag
 *    vessel) at true size on concrete, beside the first yard's furnace corner (drawFurnaceSet, with its hood) at the same scale;
 *    drawn at 2 px a point and again at 0.75 px a point (a hall's furnace about 60 px: the phone) and in greyscale;
 *  - the row's checks, printed PASS / FAIL: (1) no wet ground near a charge (no puddle-like pixel in any frame of the
 *    charge boxes or the moulds); (2) a cooling ingot differs from a cold one in shape or frame, not only tint (the
 *    'shimmer' and 'full' frames, tinted by the SAME colour, differ in many pixels and in their alpha mask);
 *  - MEASURE=1: the MEASURED table of manifest/worksHallParts.ts (ink + 2 pt at the baked size) printed to paste.
 */
export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const M = require('../../../src/ui/salvage/art/manifest/worksHallParts') as typeof import('../../../src/ui/salvage/art/manifest/worksHallParts');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  const PD = require('../../../src/ui/salvage/art/plant.draw') as typeof import('../../../src/ui/salvage/art/plant.draw');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { YARD, coolingColour } = pal;
  const V = pen.VIEW;
  const Sk = x.H.Skia;
  const byId = new Map(M.WORKS_HALL_PARTS.map((e) => [e.id, e]));
  const entry = (id: string) => byId.get(id)!;
  let failed = false;

  if (process.env.MEASURE) {
    for (const e of M.WORKS_HALL_PARTS) {
      let l = 1e9;
      let t = 1e9;
      let r = -1e9;
      let b = -1e9;
      const half = 260;
      for (let f = 0; f < e.frames.length; f++) {
        const img = x.H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
          c.translate(half, half);
          e.draw(c, V, f, 0);
        });
        const px = img.readPixels(0, 0, { width: half * 2, height: half * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
        for (let y = 0; y < half * 2; y++)
          for (let xx = 0; xx < half * 2; xx++)
            if (px[(y * half * 2 + xx) * 4 + 3] > 4) {
              l = Math.min(l, xx - half);
              r = Math.max(r, xx - half + 1);
              t = Math.min(t, y - half);
              b = Math.max(b, y - half + 1);
            }
      }
      console.log(`  '${e.id}': [${l - 2}, ${t - 2}, ${r - l + 4}, ${b - t + 4}],`);
    }
    return;
  }

  await x.contact('works-hall-parts', M.WORKS_HALL_PARTS);

  /** Draw `draw` modulated by `col` (as the Atlas's colours with the modulate blend). */
  const tinted = (c: SkCanvas, col: string, draw: () => void) => {
    const p = Sk.Paint();
    p.setColorFilter(Sk.ColorFilter.MakeBlend(Sk.Color(col), x.H.BlendMode.Modulate));
    c.saveLayer(p);
    draw();
    c.restore();
  };
  /** An entry drawn at true size (the world's drawScale), frame f. */
  const at = (c: SkCanvas, id: string, wx: number, wy: number, f = 0) => {
    const e = entry(id);
    const [sx, sy] = pen.proj(V, wx, wy, 0);
    c.save();
    c.translate(sx, sy);
    c.scale(e.drawScale ?? 1, e.drawScale ?? 1);
    e.draw(c, V, f, 0);
    c.restore();
  };
  const metalOf = { rotary: 'aluminium', induction: 'brass', copper: 'copper' } as const;
  // one hall's set: the filter (its east edge on the hall's west wall at x 0), the charge box at the door, the moulds on the
  // apron in three states (hot, cooling, cold), the slag vessel; the hall itself is ART-HALLS's (a pale outline stands in)
  const set = (c: SkCanvas, hall: 'rotary' | 'induction' | 'copper', ox: number, oy: number, shimmer: boolean) => {
    const fw = { rotary: 3.5, induction: 3, copper: 4 }[hall];
    const fd = { rotary: 4, induction: 3, copper: 4 }[hall];
    const hw = { rotary: 8.5, induction: 6, copper: 6 }[hall];
    const hd = { rotary: 7, induction: 6, copper: 6 }[hall];
    // the hall's footprint (ART-HALLS draws the shed): a faint outline on the concrete
    c.drawPath(pen.facePath(V, [[ox, oy - hd / 2, 0], [ox + hw, oy - hd / 2, 0], [ox + hw, oy + hd / 2, 0], [ox, oy + hd / 2, 0]]), pen.stroke(YARD.inkSoft, 0.8, 0.6));
    at(c, `works.hall.${hall}.filter`, ox - fw / 2, oy - hd / 2 + fd / 2, shimmer ? 1 : 0);
    at(c, `works.slagSkip.${hall}`, ox - 1.2, oy + hd / 2 + 0.9);
    at(c, `works.hall.${hall}.charge`, ox + hw * 0.25, oy + hd / 2 + 1.0, shimmer ? 2 : 1);
    const metal = metalOf[hall];
    const mw = hall === 'rotary' ? 4 : 3;
    [[0.3, 2], [1.5, 2], [99, 1]].forEach(([t, f], i) => {
      const mx = ox + hw * 0.5 + 0.6 + (i - 1) * 0.0;
      const my = oy + hd / 2 + 1.0 + i * 1.5;
      at(c, `works.hall.${hall}.moulds`, mx + mw / 2, my, 0);
      tinted(c, coolingColour(metal, t), () => at(c, `works.hall.${hall}.moulds`, mx + mw / 2, my, f));
    });
  };
  const SW = 1560;
  const SH = 470;
  const scene = (c: SkCanvas, shimmer: boolean) => {
    c.drawRect({ x: 0, y: 0, width: SW, height: SH }, pen.fill(YARD.concrete));
    pen.at(c, 40, 250, () => set(c, 'rotary', 4.5, 0, shimmer));
    pen.at(c, 560, 250, () => set(c, 'induction', 4.5, 0, shimmer));
    pen.at(c, 980, 250, () => set(c, 'copper', 4.5, 0, false));
    // the first yard's furnace corner at the same scale (its own 1.2 scale), cooling, under its hood
    pen.at(c, 1400, 330, () => {
      PD.drawFurnaceSet(c, V, 'cooling', 1.2);
    });
  };
  await x.write('works-hall-parts-sets.png', SW, SH, (c) => scene(c, true), 2);
  await x.write('works-hall-parts-phone.png', SW, SH, (c) => scene(c, true), 0.75);
  await x.write('works-hall-parts-still.png', SW, SH, (c) => scene(c, false), 1);
  await x.write('works-hall-parts-grey.png', SW, SH, (c) => {
    const p = Sk.Paint();
    p.setColorFilter(Sk.ColorFilter.MakeMatrix([0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]));
    c.saveLayer(p);
    scene(c, true);
    c.restore();
  }, 1);

  // ---- the checks -------------------------------------------------------------------------------------------------
  const pixels = (draw: (c: SkCanvas) => void, half = 160) => {
    const img = x.H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
      c.translate(half, half);
      draw(c);
    });
    return img.readPixels(0, 0, { width: half * 2, height: half * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
  };
  // (1) wet ground: a puddle is pale and BLUE (YARD.puddle #B7CCD6, puddleLight #E4EEF2: blue over red by 14 to 31): a pixel
  // near either with blue over red by 10 or more, or any light pixel with blue over red by 25. (Aluminium's pale pieces,
  // #F4F7F9 and its mixes, lie near puddleLight in RGB but are grey, blue over red by 7 at most: the first try of this check
  // counted them; they are metal, not water.)
  const [pr, pg, pb] = pal.rgbOf(YARD.puddle);
  const [qr, qg, qb] = pal.rgbOf(YARD.puddleLight);
  const wetLike = (r: number, g: number, b: number) =>
    (b - r >= 25 && g - r >= 10 && r > 150) || (b - r >= 10 && (Math.hypot(r - pr, g - pg, b - pb) < 14 || Math.hypot(r - qr, g - qg, b - qb) < 10));
  for (const e of M.WORKS_HALL_PARTS.filter((q) => /\.(charge|moulds)$/.test(q.id)))
    for (let f = 0; f < e.frames.length; f++) {
      const px = pixels((c) => e.draw(c, V, f, 0));
      let wet = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200 && wetLike(px[i], px[i + 1], px[i + 2])) wet++;
      const ok = wet === 0;
      if (!ok) failed = true;
      console.log(`dry: ${e.id} ${e.frames[f]}: ${wet} wet-like pixels ${ok ? 'PASS' : 'FAIL'}`);
    }
  // (2) cooling against cold: the 'shimmer' (cooling) and 'full' (cold) frames tinted by the SAME colour
  for (const hall of ['rotary', 'induction', 'copper'] as const) {
    const e = entry(`works.hall.${hall}.moulds`);
    const col = coolingColour(metalOf[hall], 1.5);
    const one = (f: number) => pixels((c) => tinted(c, col, () => e.draw(c, V, f, 0)));
    const a = one(e.frames.indexOf('full'));
    const b = one(e.frames.indexOf('shimmer'));
    let inkA = 0;
    let diff = 0;
    let mask = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i + 3] > 8 || b[i + 3] > 8) inkA++;
      if (Math.abs(a[i + 3] - b[i + 3]) > 64) mask++;
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3])) > 40) diff++;
    }
    const share = diff / Math.max(1, inkA);
    const ok = share > 0.15 && mask > 50;
    if (!ok) failed = true;
    console.log(`cooling vs cold: ${e.id} tinted ${col}: ${diff} of ${inkA} inked pixels differ (${Math.round(share * 100)} %), alpha mask differs in ${mask} ${ok ? 'PASS' : 'FAIL'}`);
  }
  // the filters: the shimmer frame adds only warm light lines (no grey: never smoke)
  for (const hall of ['rotary', 'induction', 'copper'] as const) {
    const e = entry(`works.hall.${hall}.filter`);
    const a = pixels((c) => e.draw(c, V, 0, 0));
    const b = pixels((c) => e.draw(c, V, 1, 0));
    let changed = 0;
    let grey = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
      if (d <= 24) continue;
      changed++;
      // a pixel the shimmer changed that is not warm (red over blue by 40) and not the lamp's green is smoke-like
      const warm = b[i] - b[i + 2] > 40;
      const lamp = b[i + 1] > b[i] + 30;
      if (!warm && !lamp && b[i + 3] > 8) grey++;
    }
    const ok = changed > 0 && grey <= Math.max(3, changed * 0.05);
    if (!ok) failed = true;
    console.log(`never smoke: ${e.id} shimmer changes ${changed} pixels, ${grey} not warm or the lamp ${ok ? 'PASS' : 'FAIL'}`);
  }
  if (failed) process.exitCode = 1;
}
