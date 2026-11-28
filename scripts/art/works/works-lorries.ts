/**
 * Sheet "works-lorries" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-LORRIES's): the crane lorry
 * family (the garage's recovery truck and the heavy lorry), its crane frames and loads: the manifest part
 * src/ui/salvage/art/manifest/worksLorries.ts drawn by src/ui/salvage/art/lorries.draw.ts.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-lorries     (WRITE_BOUNDS=1: write the table)
 *
 * Writes into <out>:
 *   works-lorries.png          the contact sheet (every frame at every baked heading, at its baked size, bounds faint)
 *   works-lorries-beside.png   the lorry beside the first yard's hook-lift truck, the merchant's flatbed and the public's
 *                              car, the same headings, true size at 2 px a point (the same hand?)
 *   works-lorries-phone.png    the same at 0.75 px a point (a phone at the world's zoom)
 *   works-lorries-turn.png     neighbouring headings overlaid (ink outlines in two colours) on the footprint diamond
 *   works-lorries-crane.png    the standing lorry's nine frames with the car (garage) and the sheeted piece (heavy
 *                              lorry) drawn at CRANE_LOAD in LOAD_ORDER, as the world will lay them, and the tints
 * and prints the row's checks, PASS/FAIL (exit 1 on a FAIL):
 *   bounds    every frame's ink (+2 pt) inside its entry's box at each baked heading (the MEASURED table printed)
 *   turn      at every baked heading the ink's ground line and width match the footprint's projection (no jump in
 *             anchor or size between neighbours), and the wheels' contact points centre on the anchor
 *   no tow    the crane stands at the FRONT (behind the cab), and in no frame does the hook hang off the tail: every hook
 *             is over the deck or out to a side (a tow truck's boom and hook hang behind the rear)
 *   no magnet the car is lifted by its wheels: four forks, one cupped under each tyre (tines either side of the contact
 *             point, inside the tyre's radius, under its axle); no magnet is drawn by the lorry file (its imports and
 *             its code name none)
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';
import type { WorksEntry } from '../../../src/ui/salvage/art/manifest';

export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const M = require('../../../src/ui/salvage/art/manifest/worksLorries') as typeof import('../../../src/ui/salvage/art/manifest/worksLorries');
  const MI = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const L = require('../../../src/ui/salvage/art/lorries.draw') as typeof import('../../../src/ui/salvage/art/lorries.draw');
  const VD = require('../../../src/ui/salvage/art/vehicles.draw') as typeof import('../../../src/ui/salvage/art/vehicles.draw');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { H, T } = x;
  const V = pen.VIEW;
  const { YARD } = pal;
  let failed = 0;
  const say = (ok: boolean, line: string) => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${line}`);
  };

  await x.contact('works-lorries', M.WORKS_LORRIES);

  // ---- ink of a drawing (points round the anchor), measured at 4 px a point -------------------------------------------
  const inkOf = (draw: (c: SkCanvas) => void, half = 260) => {
    const sc = 4;
    const W = half * 2 * sc;
    const img = H.image({ width: half * 2, height: half * 2, scale: sc }, (c) => {
      c.translate(half, half);
      draw(c);
    });
    const px = img.readPixels(0, 0, { width: W, height: W, colorType: 4, alphaType: 3 }) as Uint8Array;
    let l = 1e9;
    let t = 1e9;
    let r = -1e9;
    let b = -1e9;
    for (let y = 0; y < W; y++)
      for (let xx = 0; xx < W; xx++)
        if (px[(y * W + xx) * 4 + 3] > 8) {
          if (xx < l) l = xx;
          if (xx > r) r = xx;
          if (y < t) t = y;
          if (y > b) b = y;
        }
    return { l: l / sc - half, t: t / sc - half, r: (r + 1) / sc - half, b: (b + 1) / sc - half, px, W, sc, half };
  };

  // ---- bounds ---------------------------------------------------------------------------------------------------------
  const rows: string[] = [];
  for (const e of M.WORKS_LORRIES) {
    const baked = MI.bakedHeadings(e);
    const boxes: [number, number, number, number][] = [];
    const isCrane = e.id === 'vehicle.cranelorry.crane';
    for (const h of baked) {
      if (isCrane && h !== 1) {
        boxes.push([-3, -3, 6, 6]);
        continue;
      }
      let l = 1e9;
      let t = 1e9;
      let r = -1e9;
      let b = -1e9;
      for (let f = 0; f < e.frames.length; f++) {
        const k = inkOf((c) => e.draw(c, V, f, h), 160);
        l = Math.min(l, k.l);
        t = Math.min(t, k.t);
        r = Math.max(r, k.r);
        b = Math.max(b, k.b);
      }
      const m: [number, number, number, number] = [Math.floor(l) - 2, Math.floor(t) - 2, Math.ceil(r) - Math.floor(l) + 4, Math.ceil(b) - Math.floor(t) + 4];
      boxes.push(m);
      const B = MI.cellBounds(e, h);
      const inside = m[0] >= B.x && m[1] >= B.y && m[0] + m[2] <= B.x + B.w && m[1] + m[3] <= B.y + B.h;
      say(inside, `bounds ${e.id} heading ${h}: ink+2 [${m.join(', ')}] in [${B.x}, ${B.y}, ${B.w}, ${B.h}]`);
    }
    const kept = isCrane ? boxes.filter((_, i) => baked[i] === 1) : boxes;
    rows.push(`  '${e.id}': [${kept.map((b) => `[${b.join(', ')}]`).join(', ')}],`);
  }
  console.log('MEASURED (worksLorries.ts):\n' + rows.join('\n'));
  if (process.env.WRITE_BOUNDS === '1') {
    const file = path.join(__dirname, '../../../src/ui/salvage/art/manifest/worksLorries.ts');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('= {', a) + 3;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`bounds: ${rows.length} entries written to manifest/worksLorries.ts (run again to check with them)`);
  }

  // ---- turn: the ground line and the width at every heading against the footprint's projection ---------------------
  const drive = M.WORKS_LORRIES[0];
  const turnRows: string[] = [];
  for (let h8 = 0; h8 < 8; h8++) {
    const th = VD.headingRad(h8);
    const draw = (c: SkCanvas) => L.drawCraneLorry(c, V, th, {});
    const k = inkOf(draw);
    const fx = Math.cos(th);
    const fy = Math.sin(th);
    const corners = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ].map(([a, b]) => pen.proj(V, (fx * a * L.LORRY.len) / 2 - (fy * b * L.LORRY.wid) / 2, (fy * a * L.LORRY.len) / 2 + (fx * b * L.LORRY.wid) / 2, 0));
    const fl = Math.min(...corners.map((p) => p[0]));
    const fr = Math.max(...corners.map((p) => p[0]));
    // the ground line is where the tyres touch: the lowest projected point of every tyre's tread (its contact patch
    // as wide as the tyre, as long as 0.9 of its radius either side of the axle)
    const R = L.LORRY.wheelR;
    let fb = -1e9;
    for (const u0 of L.LORRY.axles)
      for (const s0 of [L.LORRY.track, -L.LORRY.track])
        for (const du of [-0.45 * R, 0.45 * R])
          for (const ds of [-0.17, 0.17]) {
            const u = u0 + du;
            const sv = s0 + ds;
            fb = Math.max(fb, pen.proj(V, fx * u - fy * sv, fy * u + fx * sv, 0)[1]);
          }
    // the ink's bottom (wheels and bumper on the ground) and its left and right against the footprint's; mirror arms and
    // the crane's knuckle may stand out up to 0.3 m (12 pt) beyond the outline seen end-on
    const dBottom = k.b - fb;
    const dl = fl - k.l;
    const dr = k.r - fr;
    // the wheels stand on the ground line (the ink reaches it) and nothing is drawn below the true outline's lowest
    // corner (the anchor neither rises nor sinks; the size does not grow at a heading)
    const fbO = Math.max(...corners.map((p) => p[1]));
    const ok = dBottom > -3 && k.b <= fbO + 3 && dl > -4 && dl < 14 && dr > -4 && dr < 14;
    turnRows.push(`h${h8}: ink bottom ${dBottom.toFixed(1)} pt from the tyres' ground line (${(k.b - fbO).toFixed(1)} from the outline's lowest corner), left ${dl.toFixed(1)}, right ${dr.toFixed(1)}; ink ${(k.r - k.l).toFixed(0)} x ${(k.b - k.t).toFixed(0)} pt`);
    say(ok, `turn heading ${h8}: ground line ${dBottom.toFixed(1)} pt, sides ${dl.toFixed(1)} / ${dr.toFixed(1)} pt beyond the footprint's projection`);
  }
  // the wheels' contact points centre on the anchor (one model at every heading)
  {
    const pts = L.LORRY.axles.flatMap((u) => [u, u]);
    const meanU = pts.reduce((a, b) => a + b, 0) / pts.length;
    const wb = L.LORRY.axles[0] - (L.LORRY.axles[1] + L.LORRY.axles[2]) / 2;
    console.log(`turn (information): the axles' mean ${meanU.toFixed(2)} m from the anchor along the heading (wheelbase ${wb.toFixed(2)} m, the same at every heading: one model)`);
  }
  console.log(turnRows.join('\n'));

  // ---- no tow-truck shape ----------------------------------------------------------------------------------------------
  const G = L.lorryGeometry();
  say(L.LORRY.colU > 0 && L.LORRY.colU < L.LORRY.cabU, `no tow: the crane's column at u ${L.LORRY.colU} m, behind the cab (u ${L.LORRY.cabU}) at the front half, not at the tail (${G.rearU})`);
  for (const f of L.CRANE_FRAMES) {
    const { t } = G.tips[f];
    const overDeck = t[0] >= L.LORRY.deckTail + 0.3 && Math.abs(t[1]) <= L.LORRY.wid / 2;
    const toSide = Math.abs(t[1]) > L.LORRY.wid / 2 && t[0] > G.rearU + 0.5;
    say(overDeck || toSide, `no tow: ${f}: hook at u ${t[0].toFixed(2)}, s ${t[1].toFixed(2)}, z ${t[2].toFixed(2)} m: ${overDeck ? 'over the deck' : toSide ? 'out to the side' : 'BEHIND THE TAIL'}`);
  }
  // ---- no magnet: the car is held by its wheels ------------------------------------------------------------------------
  {
    const W = L.CAR_WHEELS;
    let ok = G.forks.length === 4;
    for (const fk of G.forks) {
      const [ws] = [fk.wheel[1]];
      const lo = Math.min(...fk.tineS);
      const hi = Math.max(...fk.tineS);
      // the tines run from outside the body in past the tyre's outer face; they lie under the axle, inside the radius
      const covers = lo <= Math.abs(ws) * Math.sign(ws) + 0.08 * Math.sign(ws) || hi >= ws;
      const under = fk.z < W.r * 0.5;
      ok = ok && covers && under && Math.abs(fk.tineS[0]) > Math.abs(ws) && Math.abs(fk.tineS[1]) < Math.abs(ws) + 0.1;
    }
    say(ok, `no magnet: ${G.forks.length} forks, each with two tines (u +-${(W.r * 0.75).toFixed(2)} m about the contact point, inside the radius ${W.r}) from a leg at s +-${W.legS} in past the tyre at s +-${W.s}, z ${G.forks[0]?.z} m (under the axle at ${W.r})`);
    const src = fs.readFileSync(path.join(__dirname, '../../../src/ui/salvage/art/lorries.draw.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    say(!/magnet/i.test(code), `no magnet: lorries.draw.ts's code (comments aside) names no magnet; imports: ${(src.match(/^import .*$/gm) ?? []).map((s) => s.replace(/^import (type )?/, '').replace(/ from .*/, '')).join(' | ')}`);
  }

  // ---- beside the first yard (true size), and at a phone's size ---------------------------------------------------------
  const headsShown = [2, 3, 4, 1, 0];
  const besideDraw = (c: SkCanvas) => {
    c.drawPaint(pen.fill(YARD.concrete));
    T(c, 'ART-LORRIES beside the first yard: hook-lift truck, merchant flatbed, public car, crane lorry (empty, car, piece); headings e ne n se s', 12, 18, { size: 9, weight: 'semibold', color: YARD.ink });
    headsShown.forEach((h8, col) => {
      const th = VD.headingRad(h8);
      const cx = 170 + col * 330;
      const at = (y: number, d: () => void) => x.put(c, cx, y, d);
      at(110, () => VD.drawActorShadow(c, V, 'truck', h8));
      at(110, () => VD.drawHookTruck(c, V, th, { skip: 'on' }));
      at(300, () => VD.drawActorShadow(c, V, 'flatbed', h8));
      at(300, () => VD.drawFlatbed(c, V, th));
      at(450, () => VD.drawPublicCar(c, V, th));
      for (const [i, d] of (['stowed', 'car', 'piece'] as const).entries()) {
        at(660 + i * 250, () => L.drawCraneLorry(c, V, th, { load: d === 'car' ? 'car-open' : d === 'piece' ? 'obj-sheeted' : undefined }));
      }
    });
  };
  await x.write('works-lorries-beside.png', 1700, 1300, besideDraw, 2);
  await x.write('works-lorries-phone.png', 1700, 1300, besideDraw, 0.75);

  // ---- the turn overlay: heading i (ink) and i+1 (blue outline) on the footprint diamond -----------------------------
  await x.write('works-lorries-turn.png', 1720, 760, (c) => {
    c.drawPaint(pen.fill(YARD.paper));
    T(c, 'neighbouring headings overlaid at one anchor (black: h, blue ghost: h+1); yellow: the footprint at h; red cross: the anchor', 12, 16, { size: 9, weight: 'semibold', color: YARD.ink });
    for (let h8 = 0; h8 < 8; h8++) {
      const cx = 215 + (h8 % 4) * 430;
      const cy = 200 + Math.floor(h8 / 4) * 340;
      const th = VD.headingRad(h8);
      const th2 = VD.headingRad((h8 + 1) % 8);
      x.put(c, cx, cy, () => {
        const fx = Math.cos(th);
        const fy = Math.sin(th);
        const q = [
          [1, 1],
          [-1, 1],
          [-1, -1],
          [1, -1],
        ].map(([a, b]) => pen.proj(V, (fx * a * L.LORRY.len) / 2 - (fy * b * L.LORRY.wid) / 2, (fy * a * L.LORRY.len) / 2 + (fx * b * L.LORRY.wid) / 2, 0));
        c.drawPath(pen.poly(q.flat()), pen.fill(YARD.hivisLight, 0.7));
        L.drawCraneLorry(c, V, th, {});
      });
      // the ghost: h+1 as a translucent blue wash over the solid h
      x.put(c, cx, cy, () => {
        const img = H.image({ width: 600, height: 400, scale: 1 }, (cc) => {
          cc.translate(300, 240);
          L.drawCraneLorry(cc, V, th2, {});
        });
        const p = H.Skia.Paint();
        p.setAlphaf(0.35);
        p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color('#2C5DA8'), H.BlendMode.SrcIn));
        c.drawImage(img, -300, -240, p);
        c.drawPath(pen.segment(-6, 0, 6, 0), pen.stroke('#D22', 1.2));
        c.drawPath(pen.segment(0, -6, 0, 6), pen.stroke('#D22', 1.2));
      });
      T(c, `h${h8} with h${(h8 + 1) % 8}`, cx, cy + 135, { size: 8, color: YARD.inkSoft, align: 'center' });
    }
  }, 2);

  // ---- the standing lorry: nine frames with each load in its order, and the four tints ---------------------------------
  const crane = M.WORKS_LORRIES.find((e) => e.id === 'vehicle.cranelorry.crane') as WorksEntry;
  await x.write('works-lorries-crane.png', 1700, 2080, (c) => {
    c.drawPaint(pen.fill(YARD.concrete));
    T(c, 'the crane frames as the world lays them (load at CRANE_LOAD, before/after by LOAD_ORDER); row 1 the garage with a car, row 2 the heavy lorry with a sheeted piece; row 3 tints', 12, 16, { size: 9, weight: 'semibold', color: YARD.ink });
    const tints = Object.entries(L.LORRY_TINTS);
    L.CRANE_FRAMES.forEach((f, i) => {
      for (const [row, load] of (['car-open', 'obj-sheeted'] as const).entries()) {
        const cx = 220 + (i % 3) * 560;
        const cy = 190 + Math.floor(i / 3) * 290 + row * 880;
        const tint = tints[row === 0 ? 0 : 3][1];
        x.put(c, cx, cy, () => {
          const lp = L.craneLoadAt(V, f);
          const loadDraw = () => {
            if (!lp) return;
            c.save();
            c.translate(lp[0], lp[1]);
            L.drawLorryLoad(c, V, 0, load);
            c.restore();
          };
          if (L.LOAD_ORDER[f] === 'before') loadDraw();
          // the body and crane modulated by the sender's tint, as the world's atlas colour does
          const img = H.image({ width: 360, height: 360, scale: 2 }, (cc) => {
            cc.translate(180, 230);
            L.drawCraneLorry(cc, V, 0, { crane: f });
          });
          const p = H.Skia.Paint();
          p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color(tint), H.BlendMode.Modulate));
          c.save();
          c.scale(0.5, 0.5);
          c.drawImage(img, -360, -460, p);
          c.restore();
          if (L.LOAD_ORDER[f] === 'after') loadDraw();
        });
        T(c, f, cx, cy + 112, { size: 8, color: YARD.inkSoft, align: 'center' });
      }
    });
    tints.forEach(([who, tint], i) => {
      const cx = 200 + i * 420;
      x.put(c, cx, 1880, () => {
        const img = H.image({ width: 360, height: 220, scale: 2 }, (cc) => {
          cc.translate(180, 130);
          L.drawCraneLorry(cc, V, VD.headingRad(1), { load: i === 0 ? 'car-open' : 'obj-sheeted' });
        });
        const p = H.Skia.Paint();
        p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color(tint), H.BlendMode.Modulate));
        c.save();
        c.scale(0.5, 0.5);
        c.drawImage(img, -360, -260, p);
        c.restore();
      });
      T(c, who, cx, 1990, { size: 8, color: YARD.inkSoft, align: 'center' });
    });
    void crane;
  }, 2);

  console.log(`works-lorries: ${failed ? `${failed} FAIL` : 'all PASS'}`);
  if (failed) process.exitCode = 1;
}
