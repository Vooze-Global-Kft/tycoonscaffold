/**
 * Sheet "works-lane" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LANE's): the garage's and the
 * plumber's sites past the bridge and the axle-weight sign, the manifest part src/ui/salvage/art/manifest/worksLane.ts drawn
 * by src/ui/salvage/art/worksLane.draw.ts. Writes into <out>:
 *   works-lane.png         the part's contact sheet (every frame at its baked size, its bounds faint)
 *   works-lane-scene.png   the lane as the world will lay it, every sprite BAKED as the atlas bakes it (its cell at density 2,
 *                          drawn up by drawScale): the first yard's farm site (shed, house, sign) for comparison, then the
 *                          garage and the plumber at their places past the bridge with the lane's asphalt, verges, hedges and
 *                          fields, the three-axle hook-lift at the garage's skip zone; the bridge with the first yard's limit
 *                          sign beside the new axle sign; names and limits written in the slots as the caller will (the
 *                          register's names; illustrative, no string key); at 1 pt = 2 px, and in greyscale under it
 *   works-lane-phone.png   the same scene at 1 pt = 1 px (a phone's points)
 * and checks (PASS/FAIL lines; exit code 1 on a FAIL):
 *   bounds   every frame's ink (plus 2 pt) lies inside its entry's bounds; prints the MEASURED table (WRITE_BOUNDS=1 writes it)
 *   blank    each slot's face is blank (paper on the fascias, white in the roundel's lower half): no words, no mark in it
 *   clear    nothing of a site stands in the strip kept for the partner's skip zone (worksLane.draw SITE.clear): there the
 *            site's pixels are its ground's, or its ground under a shadow
 *   dark     the part names nothing dark (its ids are the two partners' sites and the sign; no machine or grade)
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-lane
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';
import type { ManifestEntry, WorksEntry } from '../../../src/ui/salvage/art/manifest';

/* eslint-disable @typescript-eslint/no-require-imports */
export async function run(x: WorksSheetCtx): Promise<void> {
  const M = require('../../../src/ui/salvage/art/manifest/worksLane') as typeof import('../../../src/ui/salvage/art/manifest/worksLane');
  const MF = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const D = require('../../../src/ui/salvage/art/worksLane.draw') as typeof import('../../../src/ui/salvage/art/worksLane.draw');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  const PLANT = (require('../../../src/ui/salvage/art/manifest/plant') as typeof import('../../../src/ui/salvage/art/manifest/plant')).PLANT;
  const PEOPLE = (require('../../../src/ui/salvage/art/manifest/people') as typeof import('../../../src/ui/salvage/art/manifest/people')).PEOPLE;
  const TRUCK3 = (require('../../../src/ui/salvage/art/manifest/worksTruck3') as typeof import('../../../src/ui/salvage/art/manifest/worksTruck3')).WORKS_TRUCK3;
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

  await x.contact('works-lane', M.WORKS_LANE);

  const pixels = (draw: (c: SkCanvas) => void, half: number, sc: number) => {
    const img = H.image({ width: half * 2, height: half * 2, scale: sc }, (c) => {
      c.translate(half, half);
      draw(c);
    });
    const W = half * 2 * sc;
    return { W, px: img.readPixels(0, 0, { width: W, height: W, colorType: 4, alphaType: 3 }) as Uint8Array };
  };

  // ---- bounds ---------------------------------------------------------------------------------------------------------
  const rows: string[] = [];
  for (const e of M.WORKS_LANE) {
    let l = 1e9;
    let t = 1e9;
    let r = -1e9;
    let b = -1e9;
    const half = 420;
    for (let f = 0; f < e.frames.length; f++) {
      const { W, px } = pixels((c) => e.draw(c, V, f, 0), half, 1);
      for (let y = 0; y < W; y++)
        for (let xx = 0; xx < W; xx++)
          if (px[(y * W + xx) * 4 + 3] > 4) {
            l = Math.min(l, xx - half);
            r = Math.max(r, xx - half + 1);
            t = Math.min(t, y - half);
            b = Math.max(b, y - half + 1);
          }
    }
    const m: [number, number, number, number] = [l - 2, t - 2, r - l + 4, b - t + 4];
    rows.push(`  '${e.id}': [${m.join(', ')}],`);
    const B = e.bounds;
    const inside = m[0] >= B.x && m[1] >= B.y && m[0] + m[2] <= B.x + B.w && m[1] + m[3] <= B.y + B.h;
    say(inside, `bounds ${e.id}: ink+2 [${m.join(', ')}] in [${B.x}, ${B.y}, ${B.w}, ${B.h}]`);
  }
  console.log('MEASURED (worksLane.ts):\n' + rows.join('\n'));
  if (process.env.WRITE_BOUNDS === '1') {
    const file = path.join(__dirname, '../../../src/ui/salvage/art/manifest/worksLane.ts');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('{', a) + 1;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`bounds: ${rows.length} entries written to manifest/worksLane.ts (run again to bake with them)`);
  }

  // ---- blank: the slots' faces carry nothing ---------------------------------------------------------------------------
  for (const e of M.WORKS_LANE) {
    for (const [name, s] of Object.entries(e.slots ?? {})) {
      const sc = 4;
      const half = 220;
      const { W, px } = pixels((c) => e.draw(c, V, 0, 0), half, sc);
      const face = name === 'value' ? pal.rgbOf('#FFFFFF') : pal.rgbOf(YARD.paper);
      let n = 0;
      let off = 0;
      for (let y = Math.ceil((s.y + 1 + half) * sc); y < Math.floor((s.y + s.h - 1 + half) * sc); y++)
        for (let xx = Math.ceil((s.x + 1 + half) * sc); xx < Math.floor((s.x + s.w - 1 + half) * sc); xx++) {
          const i = (y * W + xx) * 4;
          n++;
          if (Math.abs(px[i] - face[0]) + Math.abs(px[i + 1] - face[1]) + Math.abs(px[i + 2] - face[2]) > 24) off++;
        }
      say(n > 40 && off <= n * 0.01, `blank ${e.id} slot '${name}' [${[s.x, s.y, s.w, s.h].map((q) => q.toFixed(1)).join(', ')}]: ${n} px looked at, ${off} not the face`);
    }
  }

  // ---- clear: the skip zone's strip on each site is ground (or ground in shadow) ---------------------------------------
  {
    const sh = pal.rgbOf(YARD.shadow);
    for (const [id, draw, ground] of [
      ['lane.site.garage', D.drawGarageSite, YARD.concrete],
      ['lane.site.plumbing', D.drawPlumbingSite, YARD.asphaltLight],
    ] as const) {
      const g = pal.rgbOf(ground);
      const sc = 1;
      const half = 320;
      const { W, px } = pixels((c) => draw(c, V), half, sc);
      const [x0, y0] = pen.proj(V, D.SITE.clear.x0, D.SITE.clear.y0, 0);
      const [x1, y1] = pen.proj(V, D.SITE.clear.x1, D.SITE.d / 2 - 0.25, 0);
      let n = 0;
      let off = 0;
      const near = (i: number, ref: number[]) => Math.abs(px[i] - ref[0]) + Math.abs(px[i + 1] - ref[1]) + Math.abs(px[i + 2] - ref[2]) < 60;
      const dim = (k: number) => g.map((q, j) => q * k + sh[j] * (1 - k));
      const refs = [g, dim(0.74), dim(0.74 * 0.74), pal.rgbOf(pal.shade(ground, -0.12)), pal.rgbOf(YARD.oil)];
      for (let y = Math.ceil(y0 + half); y < Math.floor(y1 + half); y++)
        for (let xx = Math.ceil(x0 + half); xx < Math.floor(x1 + half); xx++) {
          const i = (y * W + xx) * 4;
          n++;
          if (!refs.some((r) => near(i, r))) off++;
        }
      say(n > 1000 && off <= n * 0.005, `clear ${id}: the skip zone's strip (x ${D.SITE.clear.x0}..${D.SITE.clear.x1}, y ${D.SITE.clear.y0}..${D.SITE.d / 2}) is ground: ${n} px, ${off} not ground`);
    }
  }

  // ---- dark ------------------------------------------------------------------------------------------------------------
  {
    const ids = M.WORKS_LANE.map((e) => e.id);
    const C2 = CONTENT as { partners?: Record<string, unknown>; worksLayer?: { partners?: Record<string, unknown> } };
    const partners = [...Object.keys(C2.partners ?? {}), ...Object.keys(C2.worksLayer?.partners ?? {})];
    const ok = ids.every((id) => id === 'lane.sign.axle10t' || partners.includes(`partner.${id.split('.').pop()}`));
    say(ok, `dark: the part's ids (${ids.join(', ')}) are the content's bridge partners' sites and the bridge's sign only`);
  }

  // ---- the scene -------------------------------------------------------------------------------------------------------
  const DENSITY = 2;
  const cache = new Map<string, SkImage>();
  type Any = WorksEntry | ManifestEntry;
  const bake = (e: Any, f: number, h: number): SkImage => {
    const key = `${e.id}#${f}#${h}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const b = e.boundsByHeading?.[h] ?? e.bounds;
    const img = H.image({ width: b.w, height: b.h, scale: DENSITY }, (c) => {
      c.translate(-b.x, -b.y);
      e.draw(c, V, f, h);
    });
    cache.set(key, img);
    return img;
  };
  const sprite = (c: SkCanvas, e: Any | undefined, wx: number, wy: number, f = 0, h = 0) => {
    if (!e) return;
    const img = bake(e, f, h);
    const s = e.drawScale ?? 1;
    const [sx, sy] = pen.proj(V, wx, wy, 0);
    const b = e.boundsByHeading?.[h] ?? e.bounds;
    c.drawImageRect(img, { x: 0, y: 0, width: img.width(), height: img.height() }, { x: sx + b.x * s, y: sy + b.y * s, width: b.w * s, height: b.h * s }, H.Skia.Paint());
  };
  const slotText = (c: SkCanvas, e: Any, slot: string, wx: number, wy: number, text: string, size: number) => {
    const s = e.slots![slot];
    const k = e.drawScale ?? 1;
    const [sx, sy] = pen.proj(V, wx, wy, 0);
    T(c, text, sx + (s.x + s.w / 2) * k, sy + (s.y + s.h * 0.8) * k, { size, weight: 'heavy', color: YARD.ink, align: 'center' });
  };
  const L_ = (id: string) => M.WORKS_LANE.find((e) => e.id === id);
  const P_ = (id: string) => PLANT.find((e) => e.id === id) ?? PEOPLE.find((e) => e.id === id);
  const map = CONTENT.map as unknown as { points: Record<string, [number, number]>; lane: Record<string, number>; laneWidth?: number; works?: { lane?: Record<string, number> } };
  const [gx, gy] = map.points.gate;
  const half = (map.laneWidth ?? 6) / 2;
  const wl = map.works?.lane ?? {};
  const names = JSON.parse(fs.readFileSync(path.join(__dirname, '../../content/yard/names.json'), 'utf8')) as unknown;
  const nameOf = (id: string): string => {
    let found = id;
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') {
        const r = o as Record<string, unknown>;
        if (r.id === id && typeof r.name === 'string' && typeof r.verdict === 'string' && !r.verdict.startsWith('rejected')) found = r.name;
        Object.values(r).forEach(walk);
      }
    };
    walk(names);
    return found;
  };
  const siteY = gy - half - D.SITE.d / 2;
  const panelW = 26;
  const panelTop = 15;
  const panelBot = 6;
  const panelHpt = (panelTop + panelBot) * V.ppm * V.tilt + 40;
  const Wpt = panelW * V.ppm;

  /** One stretch of lane round x = cx: fields, verges, asphalt, hedges outside the site, then `site`. */
  const stretch = (c: SkCanvas, cx: number, title: string, site: () => void, front?: () => void) => {
    c.save();
    c.translate(-(cx - panelW / 2) * V.ppm, -(gy - panelTop) * V.ppm * V.tilt + 24);
    const x0 = cx - panelW / 2;
    const [rx, ry] = pen.proj(V, x0, gy - panelTop, 0);
    c.drawPath(pen.rect(rx, ry, Wpt, panelHpt), pen.fill(YARD.grass));
    const field = P_('lane.field');
    if (field) for (let x = x0 + 3; x < x0 + panelW + 3; x += 6) {
      for (let y = gy - half - 1.6 - 2; y > gy - panelTop - 2; y -= 4) sprite(c, field, x, y, 1);
      for (let k = 0; k < 2; k++) sprite(c, field, x, gy + half + 1.6 + 2 + k * 4, 0);
    }
    for (let x = x0 + 1.5; x < x0 + panelW; x += 3) {
      for (let y = gy - half + 1.5; y < gy + half; y += 3) sprite(c, P_('ground.asphalt'), x, y);
      for (const s of [-1, 1]) sprite(c, P_('ground.verge'), x, gy + s * (half + 1.5));
    }
    for (let x = x0 + 2; x < x0 + panelW; x += 3) if (Math.abs(x - cx) >= 7) sprite(c, P_('lane.hedge'), x, gy - half - 0.6);
    site();
    for (let x = x0 + 2; x < x0 + panelW; x += 3) sprite(c, P_('lane.hedge'), x, gy + half + 0.6);
    front?.();
    c.restore();
    T(c, title, 8, 14, { size: 9, weight: 'semibold', color: YARD.ink });
  };
  const farmX = gx + map.lane.farm_m;
  const garageX = gx + (wl.garage_m ?? 430);
  const plumbX = gx + (wl.plumbing_m ?? 480);
  const bridgeX = gx + (map.lane.bridge_m ?? 360);
  const garage = L_('lane.site.garage')!;
  const plumbing = L_('lane.site.plumbing')!;
  const axle = L_('lane.sign.axle10t')!;
  const panels: ((c: SkCanvas) => void)[] = [
    (c) =>
      stretch(c, farmX, `first yard: the farm partner's site (lane ${map.lane.farm_m} m), sheet B, for comparison`, () => {
        sprite(c, P_('lane.farmhouse'), farmX + 3.5, gy - half - 4.6);
        sprite(c, P_('lane.shed.farm'), farmX, gy - half - 2.2);
        sprite(c, P_('ground.hatch'), farmX, gy + half - 0.5);
        const sign = P_('lane.sign.partner');
        sprite(c, sign, farmX - 4, gy - half - 0.2, 0);
        if (sign?.slots?.name) slotText(c, sign, 'name', farmX - 4, gy - half - 0.2, nameOf('partner.farm'), 5.5);
      }),
    (c) =>
      stretch(
        c,
        garageX,
        `works: the garage (lane ${wl.garage_m} m), the hook-lift at its skip zone; fascia name written in its slot`,
        () => {
          sprite(c, garage, garageX, siteY);
          slotText(c, garage, 'sign', garageX, siteY, nameOf('partner.garage').toUpperCase(), 9);
        },
        () => {
          const hook = TRUCK3.find((e) => e.id === 'vehicle.truckBridge.hook');
          sprite(c, hook, garageX + 3.6, gy - 1.6, 0, 1);
        },
      ),
    (c) =>
      stretch(
        c,
        plumbX,
        `works: the plumber (lane ${wl.plumbing_m} m), the hook-lift driving past east`,
        () => {
          sprite(c, plumbing, plumbX, siteY);
          slotText(c, plumbing, 'sign', plumbX, siteY, nameOf('partner.plumbing').toUpperCase(), 8);
        },
        () => sprite(c, TRUCK3.find((e) => e.id === 'vehicle.truckBridge'), plumbX + 7, gy + 1.4, 0, 2),
      ),
    (c) =>
      stretch(c, bridgeX - 3, `the bridge (lane ${map.lane.bridge_m} m): the first yard's limit sign (left) and the works' axle sign (right), limits written`, () => {
        for (const s of [-1, 1]) sprite(c, P_('lane.parapet'), bridgeX + 3, gy + s * (half + 0.2));
        const lim = P_('lane.sign.limit');
        sprite(c, lim, bridgeX - 6, gy - half - 0.8);
        if (lim?.slots?.limit) slotText(c, lim, 'limit', bridgeX - 6, gy - half - 0.8, '7.5t', 5.5);
        sprite(c, axle, bridgeX - 3, gy - half - 0.8);
        slotText(c, axle, 'value', bridgeX - 3, gy - half - 0.8, '10 t', 5.5);
      }),
  ];
  const drawScene = (c: SkCanvas) => {
    panels.forEach((p, i) => {
      c.save();
      c.translate(0, i * (panelHpt + 30));
      p(c);
      c.restore();
    });
  };
  const Hpt = panels.length * (panelHpt + 30);
  const grey = (c: SkCanvas, draw: (q: SkCanvas) => void) => {
    const p = H.Skia.Paint();
    p.setColorFilter(H.Skia.ColorFilter.MakeMatrix([0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]));
    c.saveLayer(p);
    draw(c);
    c.restore();
  };
  await x.write('works-lane-scene.png', Wpt * 2 + 20, Hpt, (c) => {
    drawScene(c);
    c.save();
    c.translate(Wpt + 20, 0);
    grey(c, drawScene);
    c.restore();
  }, 2, YARD.concrete);
  await x.write('works-lane-phone.png', Wpt, Hpt, drawScene, 1, YARD.concrete);

  const px = M.WORKS_LANE.reduce((a, e) => a + MF.entryPixels(e, 2), 0);
  console.log(`works-lane: ${M.WORKS_LANE.length} entries, ${M.WORKS_LANE.reduce((a, e) => a + e.frames.length, 0)} cells, ${(px / 1e6).toFixed(3)} Mpx at density 2`);
  if (failed) {
    console.log(`works-lane: ${failed} FAIL`);
    process.exitCode = 1;
  } else console.log('works-lane: all PASS');
}
