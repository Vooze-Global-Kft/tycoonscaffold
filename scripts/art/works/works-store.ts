/**
 * Sheet "works-store" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-STORE's): the works bunkers, heaps,
 * stillage layers, big bags and roofs, the manifest part src/ui/salvage/art/manifest/worksStore.ts drawn by
 * src/ui/salvage/art/worksStore.draw.ts. Writes into <out>:
 *   works-store.png        the part's contact sheet (every frame at its baked size, its bounds faint)
 *   works-store-scene.png  the works' row as the world will lay it (the eleven bunkers at worksBays' slots, the four sold
 *                          heaps, the lean-to, the works stillages with their layers, big bags and roof), every sprite BAKED
 *                          as the atlas bakes it (its cell at density 2, drawn up by drawScale), beside the first yard's bay
 *                          and stillages; at 1 pt = 3 px (an iPhone), and the same in greyscale under it
 *   works-store-phone.png  the scene at 1 pt = 1 px (the phone's points, for a look at size)
 * and checks (PASS/FAIL lines; exit code 1 on a FAIL):
 *   bounds   every frame's ink (plus 2 pt) lies inside its entry's bounds; prints the MEASURED table for worksStore.ts
 *            (WRITE_BOUNDS=1 rewrites it)
 *   dark     an empty bunker carries no dark grade's name: the bunker has one frame, its plate is blank (no ink inside its
 *            `code` slot but the paper's), no works entry names a worksBays grade that is not drawn, and every drawn heap's
 *            grade is a works bunker grade of the content that a sold plate makes or a source brings
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-store
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';
import type { Bounds, ManifestEntry, WorksEntry } from '../../../src/ui/salvage/art/manifest';

/* eslint-disable @typescript-eslint/no-require-imports */
export async function run(x: WorksSheetCtx): Promise<void> {
  const M = require('../../../src/ui/salvage/art/manifest/worksStore') as typeof import('../../../src/ui/salvage/art/manifest/worksStore');
  const MF = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  const PLANT = (require('../../../src/ui/salvage/art/manifest/plant') as typeof import('../../../src/ui/salvage/art/manifest/plant'));
  const CONTENT = (require('../../../src/config/salvage.content') as typeof import('../../../src/config/salvage.content')).SALVAGE_CONTENT;
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { H, T } = x;
  const V = pen.VIEW;
  const { YARD } = pal;
  let failed = 0;
  const say = (ok: boolean, line: string) => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${line}`);
  };

  await x.contact('works-store', M.WORKS_STORE);

  // ---- bounds: the ink of every frame, measured at the baked size ----------------------------------------------------
  const inkOf = (e: WorksEntry, f: number) => {
    const half = 400;
    const img = H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
      c.translate(half, half);
      e.draw(c, V, f, 0);
    });
    const px = img.readPixels(0, 0, { width: half * 2, height: half * 2, colorType: 4, alphaType: 3 }) as Uint8Array;
    let l = 1e9;
    let t = 1e9;
    let r = -1e9;
    let b = -1e9;
    for (let y = 0; y < half * 2; y++)
      for (let xx = 0; xx < half * 2; xx++)
        if (px[(y * half * 2 + xx) * 4 + 3] > 4) {
          l = Math.min(l, xx - half);
          r = Math.max(r, xx - half + 1);
          t = Math.min(t, y - half);
          b = Math.max(b, y - half + 1);
        }
    return { l, t, r, b };
  };
  const rows: string[] = [];
  for (const e of M.WORKS_STORE) {
    let l = 1e9;
    let t = 1e9;
    let r = -1e9;
    let b = -1e9;
    for (let f = 0; f < e.frames.length; f++) {
      const k = inkOf(e, f);
      l = Math.min(l, k.l);
      t = Math.min(t, k.t);
      r = Math.max(r, k.r);
      b = Math.max(b, k.b);
    }
    const m: [number, number, number, number] = [l - 2, t - 2, r - l + 4, b - t + 4];
    rows.push(`  '${e.id}': [${m.join(', ')}],`);
    const B = e.bounds;
    const inside = m[0] >= B.x && m[1] >= B.y && m[0] + m[2] <= B.x + B.w && m[1] + m[3] <= B.y + B.h;
    say(inside, `bounds ${e.id}: ink+2 [${m.join(', ')}] in [${B.x}, ${B.y}, ${B.w}, ${B.h}]`);
  }
  console.log('MEASURED (worksStore.ts):\n' + rows.join('\n'));
  if (process.env.WRITE_BOUNDS === '1') {
    const file = path.join(__dirname, '../../../src/ui/salvage/art/manifest/worksStore.ts');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('{', a) + 1;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`bounds: ${rows.length} entries written to manifest/worksStore.ts (run again to bake with them)`);
  }

  // ---- dark: an empty bunker carries no dark grade's name -------------------------------------------------------------
  const bunker = M.WORKS_STORE.find((e) => e.id === 'works.bunker')!;
  say(bunker.frames.length === 1, `dark: works.bunker has one frame (${bunker.frames.join(', ')}): no look per grade`);
  {
    const slot = bunker.slots!.code;
    const half = 200;
    const sc = 4;
    const img = H.image({ width: half * 2, height: half * 2, scale: sc }, (c) => {
      c.translate(half, half);
      bunker.draw(c, V, 0, 0);
    });
    const W = half * 2 * sc;
    const px = img.readPixels(0, 0, { width: W, height: W, colorType: 4, alphaType: 3 }) as Uint8Array;
    const [pr, pg, pb] = pal.rgbOf(YARD.paper);
    // inside the slot, inset 2 pt from the plate's edge (its ink rim) and clear of its two screws
    let off = 0;
    let n = 0;
    for (let y = Math.ceil((slot.y + 2 + half) * sc); y < Math.floor((slot.y + slot.h - 2 + half) * sc); y++)
      for (let xx = Math.ceil((slot.x + 5 + half) * sc); xx < Math.floor((slot.x + slot.w - 5 + half) * sc); xx++) {
        const i = (y * W + xx) * 4;
        n++;
        if (Math.abs(px[i] - pr) + Math.abs(px[i + 1] - pg) + Math.abs(px[i + 2] - pb) > 24) off++;
      }
    say(n > 50 && off === 0, `dark: the bunker's code plate is blank paper inside its slot (${n} px looked at, ${off} not paper)`);
  }
  {
    const WL = (CONTENT as { worksLayer?: { grades?: Record<string, { bay?: { kind?: string; place?: string; slot?: number } }> } }).worksLayer?.grades ?? {};
    const inBunkers = Object.entries(WL).filter(([, g]) => g.bay?.kind === 'bunker' && g.bay?.place === 'worksBays').map(([id, g]) => [id, g.bay!.slot!] as const);
    const drawn = new Set<string>(M.WORKS_STORE.filter((e) => e.id.startsWith('plant.heap.')).map((e) => e.id.slice('plant.heap.'.length)));
    // a grade is made by a sold plate when some plate whose gate is not DARK names it in out or a recipe's out
    const plates = ((CONTENT as { works?: { plates?: Record<string, { gate?: string; out?: Record<string, [string, number][]>; recipes?: Record<string, { out: [string, number][] }> }> } }).works?.plates) ?? {};
    const madeBy = (g: string) =>
      Object.entries(plates)
        .filter(([, p]) => p.gate !== 'rung99')
        .filter(([, p]) => Object.values(p.out ?? {}).some((o) => o.some(([id]) => id === g)) || Object.values(p.recipes ?? {}).some((r) => r.out.some(([id]) => id === g)))
        .map(([k]) => k);
    // a grade a source brings: a works layer object (a thing a partner, a lot or the recovery truck brings) whose pieces
    // (grade, or the grade an analyser finds: pieces[i][4]) or whole name it
    const objects = (CONTENT as { worksLayer?: { objects?: Record<string, { pieces?: unknown[][]; whole?: string | null }> } }).worksLayer?.objects ?? {};
    const brought = (g: string) => Object.values(objects).some((o) => o.whole === g || (o.pieces ?? []).some((q) => q[0] === g || q[4] === g));
    const undrawn = inBunkers.filter(([id]) => !drawn.has(id)).map(([id]) => id);
    for (const g of drawn) {
      const slot = inBunkers.find(([id]) => id === g);
      say(!!slot, `dark: plant.heap.${g} is a works bunker grade (worksBays slot ${slot?.[1] ?? '?'})`);
      const by = madeBy(g);
      say(by.length > 0 || brought(g), `dark: ${g} comes in: made by ${by.join(', ') || 'no sold plate'}${brought(g) ? '; brought by a works thing' : ''}`);
    }
    // an undrawn bunker grade comes from nothing sold: it is dark (so the bunker stays empty with a blank plate)
    for (const g of undrawn) {
      const by = madeBy(g);
      say(by.length === 0 && !brought(g), `dark: ${g} (worksBays slot ${inBunkers.find(([id]) => id === g)?.[1]}) comes from nothing sold (plates: ${by.join(', ') || 'none'}; things: ${brought(g)}): not drawn`);
    }
    const all = [...MF.WORKS_MANIFEST.map((e) => e.id)];
    const naming = all.filter((id) => id.split('.').some((s) => undrawn.includes(s)));
    say(naming.length === 0, `dark: no works entry names an undrawn bunker grade (${undrawn.join(', ')})${naming.length ? ': ' + naming.join(', ') : ''}`);
  }

  // ---- the scene: the works' row as the world lays it, every sprite baked as the atlas bakes it ------------------------
  const DENSITY = 2;
  const bakedCache = new Map<string, SkImage>();
  type AnyEntry = WorksEntry | ManifestEntry;
  const bake = (e: AnyEntry, f: number): SkImage => {
    const key = `${e.id}#${f}`;
    const hit = bakedCache.get(key);
    if (hit) return hit;
    const b = e.bounds;
    const img = H.image({ width: b.w, height: b.h, scale: DENSITY }, (c) => {
      c.translate(-b.x, -b.y);
      e.draw(c, V, f, 0);
    });
    bakedCache.set(key, img);
    return img;
  };
  /** Draws an entry baked, at world point (wx, wy) metres, drawn up by its drawScale, as the atlas does. */
  const sprite = (c: SkCanvas, e: AnyEntry | undefined, wx: number, wy: number, f = 0, dy = 0) => {
    if (!e) return;
    const img = bake(e, f);
    const s = e.drawScale ?? 1;
    const [sx, sy] = pen.proj(V, wx, wy, 0);
    const b = e.bounds;
    c.drawImageRect(img, { x: 0, y: 0, width: img.width(), height: img.height() }, { x: sx + b.x * s, y: sy + (b.y + dy) * s, width: b.w * s, height: b.h * s }, H.Skia.Paint());
  };
  const W_ = (id: string) => M.WORKS_STORE.find((e) => e.id === id);
  const P_ = (id: string) => PLANT.PLANT.find((e) => e.id === id);
  const fp = (CONTENT as { map: { works: { footprints: Record<string, { x: number; y: number; w: number; d: number }>; roofs: Record<string, { x0: number; y0: number; w: number; d: number }> } } }).map.works;
  const bays = fp.footprints.worksBays;
  const sti = fp.footprints.worksStillages;
  const roofs = fp.roofs;
  const grades = (CONTENT as { worksLayer: { grades: Record<string, { bay?: { kind?: string; place?: string; slot?: number } }> } }).worksLayer.grades;
  const slotOf = (g: string) => grades[g]?.bay?.slot ?? -1;
  // the scene's frame: x from the works stillages' west end to the bunkers' east end, plus the first yard's bay beside
  const x0 = sti.x - sti.w / 2 - 1;
  const x1 = bays.x + bays.w / 2 + 9;
  const yTop = bays.y - 5.2;
  const yBot = bays.y + 3.2;
  const ox = -x0 * V.ppm;
  const oy = -(yTop * V.ppm * V.tilt) + 20;
  const Wpt = (x1 - x0) * V.ppm;
  const Hpt = (yBot - yTop) * V.ppm * V.tilt + 40;
  const heapFor: Record<number, [string, number]> = { [slotOf('bzs')]: ['bzs', 1], [slotOf('ss')]: ['ss', 0], [slotOf('ssu')]: ['ssu', 1], [slotOf('shred')]: ['shred', 1] };
  const codeFor: Record<string, string> = { bzs: 'BZ', ss: 'SS', ssu: 'SS MIX', shred: 'SHRED' };
  const drawScene = (c: SkCanvas) => {
    c.save();
    c.translate(ox, oy);
    // the concrete and the works road's kerb north of the row
    const [rx, ry] = pen.proj(V, x0, yTop, 0);
    c.drawPath(pen.rect(rx, ry, Wpt, Hpt), pen.fill(YARD.concrete));
    const [ax, ay] = pen.proj(V, x0, 23.6, 0);
    const [, by2] = pen.proj(V, x0, 27.6, 0);
    c.drawPath(pen.rect(ax, ay, Wpt, by2 - ay), pen.fill(YARD.concreteDark, 0.55));
    c.drawPath(pen.segment(ax, by2, ax + Wpt, by2), pen.stroke(YARD.linePaint, 2));
    // the works stillages: five slots of 1.2 m with 0.3 m between, the cage, layers, front; big bags at slot 3
    const stX = (i: number) => sti.x - sti.w / 2 + 0.6 + 0.24 + i * 1.5;
    const stillageGrades: (string | null)[] = ['bzi', 'bzd', null, 'dust', 'cui'];
    for (let i = 0; i < 5; i++) {
      const g = stillageGrades[i];
      if (g === 'dust') {
        sprite(c, W_('works.bigbags'), stX(i), sti.y, 1);
        continue;
      }
      sprite(c, P_('plant.stillage'), stX(i), sti.y);
      if (g) {
        sprite(c, W_(`works.stillage.layer.${g}`), stX(i), sti.y);
        if (g !== 'bzd') sprite(c, W_(`works.stillage.layer.${g}`), stX(i), sti.y, 0, PLANT.STILLAGE_LAYER_DY);
      }
      sprite(c, P_('plant.stillage.front'), stX(i), sti.y);
    }
    // the eleven bunkers, west to east, their heaps (sold grades only) and plates' words (sold grades only)
    for (let i = 0; i < 11; i++) {
      const bx = bays.x - bays.w / 2 + 1.5 + 3 * i;
      sprite(c, W_('works.bunker'), bx, bays.y);
      const h = heapFor[i];
      if (h) {
        sprite(c, W_(`plant.heap.${h[0]}`), bx, bays.y, h[1]);
        const s = W_('works.bunker')!;
        const slot = s.slots!.code;
        const k = s.drawScale ?? 1;
        const [sx, sy] = pen.proj(V, bx, bays.y, 0);
        T(c, codeFor[h[0]], sx + (slot.x + slot.w / 2) * k, sy + (slot.y + slot.h * 0.78) * k, { size: 8, weight: 'heavy', color: YARD.ink, align: 'center' });
      }
    }
    // the first yard's bay beside them for comparison (plant.bay with a light iron heap)
    const fx = bays.x + bays.w / 2 + 4.5;
    sprite(c, P_('plant.bay'), fx, bays.y - 0.3);
    const TH = (require('../../../src/ui/salvage/art/manifest/things') as typeof import('../../../src/ui/salvage/art/manifest/things')).THINGS;
    for (const [dx, lv] of [[-0.9, 4], [0.8, 3]] as const) sprite(c, TH.find((e) => e.id === `heap.li.${lv}`), fx + dx, bays.y + 0.1);
    // the roofs, drawn last (south edge after everything here), at their rects' centres
    const r1 = roofs['worksBays.roof'];
    const r2 = roofs['worksStillages.roof'];
    sprite(c, W_('works.stillages.roof'), r2.x0 + r2.w / 2, r2.y0 + r2.d / 2);
    sprite(c, W_('works.leanto.roof'), r1.x0 + r1.w / 2, r1.y0 + r1.d / 2);
    c.restore();
    T(c, 'works stillages (bzi, bzd, -, dust, cui) | bunkers 0..10 (bzs full, ss part, ssu full, shred full; the rest empty, plates blank) | first yard bay', 8, 12, { size: 8, weight: 'semibold', color: YARD.ink });
  };
  const grey = (c: SkCanvas, draw: (q: SkCanvas) => void) => {
    const p = H.Skia.Paint();
    p.setColorFilter(H.Skia.ColorFilter.MakeMatrix([0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]));
    c.saveLayer(p);
    draw(c);
    c.restore();
  };
  await x.write('works-store-scene.png', Wpt, Hpt * 2 + 10, (c) => {
    drawScene(c);
    c.save();
    c.translate(0, Hpt + 10);
    grey(c, drawScene);
    c.restore();
  }, 3, YARD.concrete);
  await x.write('works-store-phone.png', Wpt, Hpt, drawScene, 1, YARD.concrete);
  // the first yard's roof over its stillage block, and the three roofs alone, at their baked size (bigger cells for a look)
  await x.write('works-store-roofs.png', 640, 420, (c) => {
    const r3 = roofs['stillages.roof'];
    void r3;
    let yy = 0;
    for (const id of ['works.leanto.roof', 'works.stillages.roof', 'stillages.roof']) {
      const e = W_(id)!;
      const s = e.drawScale ?? 1;
      yy += -e.bounds.y * s + 10;
      c.save();
      c.translate(20 - e.bounds.x * s, yy);
      sprite(c, e, 0, 0);
      c.restore();
      T(c, id, 20, yy - (-e.bounds.y * s) + 8, { size: 8, weight: 'semibold', color: YARD.ink });
      yy += (e.bounds.h + e.bounds.y) * s + 6;
    }
  }, 2, YARD.concrete);

  // the budget of the part (density 2)
  const px = M.WORKS_STORE.reduce((a, e) => a + MF.entryPixels(e, 2), 0);
  console.log(`works-store: ${M.WORKS_STORE.length} entries, ${M.WORKS_STORE.reduce((a, e) => a + e.frames.length, 0)} cells, ${(px / 1e6).toFixed(3)} Mpx at density 2`);
  void ({} as Bounds);
  if (failed) {
    console.log(`works-store: ${failed} FAIL`);
    process.exitCode = 1;
  } else console.log('works-store: all PASS');
}
