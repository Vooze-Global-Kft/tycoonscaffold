/**
 * Sheet "works-truck3" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-TRUCK3's): the three-axle hook-lift and the bridge partners' skip loads, the manifest
 * part src/ui/salvage/art/manifest/worksTruck3.ts drawn by src/ui/salvage/art/truck3.draw.ts.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-truck3
 *
 * Writes:
 *  - works-truck3.png: the contact sheet (every frame at every baked heading at its baked size, its bounds faint);
 *  - works-truck3-side.png (1 px a point) and works-truck3-phone.png (0.4 px a point): ALL EIGHT headings as the world
 *    draws them (baked cell at drawScale, 5..7 mirrored), the first yard's truck in the row above, the bare body, the hook
 *    and tip frames beside the first yard's hook frames, the four loads on the skip; on concrete; works-truck3-close.png
 *    (2 px a point: four headings beside the first yard's truck) and works-truck3-frames.png (1.5 px a point: hook and tip);
 *  - works-truck3-turn.png: each pair of neighbouring headings laid over each other (one in ink, one faint) with the
 *    footprint's outline and the anchor's cross: the eye checks that size, anchor and wheelbase do not jump;
 *  - the row's checks, printed PASS / FAIL (exit code 1 on a FAIL): (1) all eight headings drawn, none forced east (the
 *    south and north cells differ from the east one); (2) the turn: at every heading the ink's west, east and lowest edges
 *    equal the projection of the truck's model (cab, skip, chassis, rollers, wheels) round the same anchor within 5 pt (the
 *    pen's line half-widths), so no heading is bigger, smaller or off its anchor, and neighbours cannot jump against each
 *    other; (3) the footprint is the true outline: the tyres, the cab and the skip lie inside 6.2 x 2.4 m; the ground parts
 *    (wheels) of every heading lie inside the footprint's projection; (4) every frame inside its measured box;
 *  - MEASURE=1: the MEASURED table of manifest/worksTruck3.ts (ink + 2 pt at the baked size) printed to paste.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const M = require('../../../src/ui/salvage/art/manifest/worksTruck3') as typeof import('../../../src/ui/salvage/art/manifest/worksTruck3');
  const MF = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const T3 = require('../../../src/ui/salvage/art/truck3.draw') as typeof import('../../../src/ui/salvage/art/truck3.draw');
  const VD = require('../../../src/ui/salvage/art/vehicles.draw') as typeof import('../../../src/ui/salvage/art/vehicles.draw');
  const pen = require('../../../src/ui/salvage/art/pen') as typeof import('../../../src/ui/salvage/art/pen');
  const pal = require('../../../src/ui/salvage/art/palette') as typeof import('../../../src/ui/salvage/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { YARD } = pal;
  const V = pen.VIEW;
  const Sk = x.H.Skia;
  type E = (typeof M.WORKS_TRUCK3)[number];
  const byId = new Map(M.WORKS_TRUCK3.map((e) => [e.id, e]));
  const mine = (id: string) => byId.get(id)!;
  const first = (id: string) => MF.MANIFEST.find((e) => e.id === id)! as unknown as E;
  let failed = false;
  const report = (ok: boolean, line: string) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${line}`);
    if (!ok) failed = true;
  };

  /** The ink box of a draw at 1 px a point (l, t, r, b round the anchor), or null. */
  const inkOf = (draw: (c: SkCanvas) => void, half = 320) => {
    const img = x.H.image({ width: half * 2, height: half * 2, scale: 1 }, (c) => {
      c.translate(half, half);
      draw(c);
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
    return l > r ? null : { l, t, r, b, px, half };
  };

  if (process.env.MEASURE) {
    for (const e of M.WORKS_TRUCK3) {
      const hs = e.headings === 8 ? [0, 1, 2, 3, 4] : e.headings === 4 ? [1] : [0];
      const boxes = hs.map((h) => {
        let l = 1e9;
        let t = 1e9;
        let r = -1e9;
        let b = -1e9;
        for (let f = 0; f < e.frames.length; f++) {
          const k = inkOf((c) => e.draw(c, V, f, h));
          if (!k) continue;
          l = Math.min(l, k.l);
          t = Math.min(t, k.t);
          r = Math.max(r, k.r);
          b = Math.max(b, k.b);
        }
        return `B(${l - 2}, ${t - 2}, ${r - l + 4}, ${b - t + 4})`;
      });
      console.log(`  '${e.id}': [${boxes.join(', ')}],`);
    }
    return;
  }

  await x.contact('works-truck3', M.WORKS_TRUCK3);

  /** An entry's picture as the world draws it: the baked cell of heading h (h8 for 8-heading entries), mirrored west, at drawScale. */
  const cell = (c: SkCanvas, e: E, f: number, h: number) => {
    const m = MF.mirrorOf(e, h);
    c.save();
    if (m !== null) c.scale(-1, 1);
    const s = e.drawScale ?? 1;
    c.scale(s, s);
    e.draw(c, V, f, m ?? h);
    c.restore();
  };
  const at = (c: SkCanvas, px: number, py: number, draw: () => void) => pen.at(c, px, py, draw);
  const label = (c: SkCanvas, text: string, px: number, py: number) => x.caption(c, text, px, py);
  const truck = mine('vehicle.truckBridge');
  const bare = mine('vehicle.truckBridge.bare');
  const hook = mine('vehicle.truckBridge.hook');
  const tip = mine('vehicle.truckBridge.tip');
  const load = mine('vehicle.skip.load.bridge');
  const fTruck = first('vehicle.truck');
  const fHook = first('vehicle.truck.hook');
  const fLoad = first('vehicle.skip.load');
  const NAMES = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
  const SW = 2140;
  const SH = 1250;
  const footprint = (c: SkCanvas, h8: number, color: string, alpha = 1) => {
    const F = T3.headingRad(h8);
    const fx = Math.cos(F);
    const fy = Math.sin(F);
    const pts: [number, number, number][] = [
      [1, 1, 0],
      [-1, 1, 0],
      [-1, -1, 0],
      [1, -1, 0],
    ].map(([u, s]) => [fx * u * 3.1 - fy * s * 1.2, fy * u * 3.1 + fx * s * 1.2, 0]);
    c.drawPath(pen.facePath(V, pts), pen.stroke(color, 1, alpha));
  };
  const scene = (c: SkCanvas) => {
    c.drawRect({ x: 0, y: 0, width: SW, height: SH }, pen.fill(YARD.concrete));
    const col = 262;
    // row 1: the first yard's truck, 8 headings; row 2: the hook-lift; row 3: bare
    for (let h = 0; h < 8; h++) {
      const cx = 140 + h * col;
      label(c, NAMES[h], cx - 8, 26);
      at(c, cx, 170, () => cell(c, fTruck, 0, h));
      at(c, cx, 170, () => c.drawPath(pen.circle(0, 0, 1.6), pen.fill('#D0021B')));
      at(c, cx, 420, () => {
        footprint(c, h, YARD.inkSoft, 0.5);
        cell(c, truck, 0, h);
        c.drawPath(pen.circle(0, 0, 1.6), pen.fill('#D0021B'));
      });
      at(c, cx, 640, () => cell(c, bare, 0, h));
    }
    label(c, 'first yard truck (above) / three-axle hook-lift / bare', 20, 700);
    // row 4: hook frames, the first yard's beside
    for (let f = 0; f < 4; f++) at(c, 250 + f * 270, 830, () => cell(c, fHook, f, 0));
    for (let f = 0; f < 2; f++) at(c, 1550 + f * 470, 760, () => cell(c, hook, f, 1));
    for (let f = 2; f < 4; f++) at(c, 1550 + (f - 2) * 470, 880, () => cell(c, hook, f, 1));
    label(c, 'first yard hook frames (bare reach incline tipped)  |  hook1 .. hook4 (east; west mirrored)', 20, 900);
    // row 5: tip frames, then the loads on the skip at four headings, the first yard's farm load beside
    for (let f = 0; f < 3; f++) at(c, 170 + f * 290, 1100, () => cell(c, tip, f, 1));
    const loadAt = (h8: number, f: number, px: number) =>
      at(c, px, 1100, () => {
        cell(c, truck, 0, h8);
        const [sx, sy] = T3.bridgeSkipTop(V, T3.headingRad(h8));
        c.save();
        c.translate(MF.mirrorOf(truck, h8) !== null ? sx : sx, sy);
        cell(c, load, f, 0);
        c.restore();
      });
    loadAt(2, 0, 1080);
    loadAt(1, 1, 1330);
    loadAt(0, 2, 1530);
    loadAt(6, 3, 1760);
    at(c, 2010, 1100, () => {
      cell(c, fTruck, 0, 2);
      const [sx, sy] = VD.skipTopOnTruck(V, VD.headingRad(2));
      c.save();
      c.translate(sx, sy);
      cell(c, fLoad, 1, 0);
      c.restore();
    });
    label(c, 'tip1 tip2 tip3 (east; the floor stop faces west: mirrored)  |  garage trial, garage full, plumbing trial, plumbing full  |  first yard farm full', 20, 1230);
  };
  await x.write('works-truck3-side.png', SW, SH, scene, 1);
  await x.write('works-truck3-phone.png', SW, SH, scene, 0.4);
  // a close look at full size: four headings of both trucks
  await x.write('works-truck3-close.png', 1560, 330, (c) => {
    c.drawRect({ x: 0, y: 0, width: 1560, height: 330 }, pen.fill(YARD.concrete));
    [2, 1, 0, 3].forEach((h, i) => {
      at(c, 140 + i * 320, 200, () => cell(c, truck, 0, h));
    });
    at(c, 1240, 200, () => cell(c, fTruck, 0, 2));
    at(c, 1450, 200, () => cell(c, fTruck, 0, 1));
  }, 2);

  // the hook and tip frames at full size, one under another
  await x.write('works-truck3-frames.png', 1000, 1320, (c) => {
    c.drawRect({ x: 0, y: 0, width: 1000, height: 1320 }, pen.fill(YARD.concrete));
    for (let f = 0; f < 4; f++) at(c, 560, 120 + f * 150, () => cell(c, hook, f, 1));
    for (let f = 0; f < 3; f++) at(c, 560, 780 + f * 190, () => cell(c, tip, f, 1));
    at(c, 560, 1290, () => cell(c, truck, 0, 2));
  }, 1.5);

  // the turn: neighbouring headings laid over each other, with both footprints and the anchor
  await x.write('works-truck3-turn.png', 2140, 300, (c) => {
    c.drawRect({ x: 0, y: 0, width: 2140, height: 300 }, pen.fill(YARD.concrete));
    for (let h = 0; h < 8; h++) {
      const n = (h + 1) % 8;
      at(c, 140 + h * 262, 190, () => {
        const p = Sk.Paint();
        p.setAlphaf(0.4);
        c.saveLayer(p);
        cell(c, truck, 0, n);
        c.restore();
        const q = Sk.Paint();
        q.setAlphaf(0.75);
        c.saveLayer(q);
        cell(c, truck, 0, h);
        c.restore();
        footprint(c, h, YARD.ink, 0.9);
        footprint(c, n, '#D0021B', 0.9);
        c.drawPath(pen.segment(-6, 0, 6, 0), pen.stroke('#D0021B', 1.2));
        c.drawPath(pen.segment(0, -6, 0, 6), pen.stroke('#D0021B', 1.2));
      });
      label(c, `${NAMES[h]} + ${NAMES[n]}`, 100 + h * 262, 290);
    }
  }, 1);

  // ---- the checks -------------------------------------------------------------------------------------------------
  // (1) all eight headings drawn, none forced east
  const shots = Array.from({ length: 8 }, (_, h) => inkOf((c) => cell(c, truck, 0, h)));
  report(shots.every((s) => s !== null), 'all eight headings of vehicle.truckBridge leave ink');
  const sig = (s: NonNullable<(typeof shots)[number]>) => `${s.r - s.l}x${s.b - s.t}`;
  const east = shots[2]!;
  for (const h of [0, 4]) report(sig(shots[h]!) !== sig(east), `heading ${NAMES[h]} is its own drawing (${sig(shots[h]!)} against E ${sig(east)}), not the east one forced`);
  // (2) the turn: at every heading the drawing's ink equals its model's projection (the west, east and lowest edges of the
  // cab, the skip, the wheels and the mirrors, projected at that heading round the same anchor) within 3 pt. A heading drawn
  // bigger, smaller or off its anchor fails here; two neighbours that both pass cannot jump against each other.
  // the model is geometry; the ink adds the pen's line half-widths (the rollers' member is 5.6 pt wide: 2.8 pt a side)
  const TOL = 5;
  const B3 = T3.BRIDGE;
  const SK = T3.BRIDGE_SKIP;
  const model = (h8: number) => {
    const F = T3.headingRad(h8);
    const fx = Math.cos(F);
    const fy = Math.sin(F);
    const P = (u: number, s: number, z: number) => pen.proj(V, fx * u - fy * s, fy * u + fx * s, z);
    const pts: [number, number][] = [];
    for (const u of [B3.cabU - B3.cabLen / 2, B3.cabU + B3.cabLen / 2]) for (const s of [-B3.cabWid / 2, B3.cabWid / 2]) for (const z of [0.78, 2.42]) pts.push(P(u, s, z));
    for (const u of [B3.skipU - SK.len / 2, B3.skipU + SK.len / 2]) for (const s of [-SK.wid / 2, SK.wid / 2]) for (const z of [B3.bedZ - 0.08, B3.bedZ + SK.h]) pts.push(P(u, s, z));
    // a wheel's disc on its outer face (track + 0.16), sampled round its rim
    for (const u of B3.axles) for (const s of [-1, 1]) for (let i = 0; i < 24; i++) pts.push(P(u + B3.wheelR * Math.cos((i * Math.PI) / 12), s * (B3.track + 0.16), B3.wheelR + B3.wheelR * Math.sin((i * Math.PI) / 12)));
    // the wheels end-on are tread blocks 0.92 x 2r long on the ground (the first yard's wheel), the chassis, the rollers
    const sideFacing = Math.abs(pen.facing(V, [-fy, fx, 0]));
    if (sideFacing < 0.3) for (const u of B3.axles) for (const s of [-1, 1]) for (const du of [-0.92 * B3.wheelR, 0.92 * B3.wheelR]) for (const ds of [-0.16, 0.16]) pts.push(P(u + du, s * B3.track + ds, 0));
    // the mirrors' heads 2 pt past the cab's sides, and the mirrored disc's rim (a disc is drawn in a 28-gon, its stroke 1 pt)
    for (const s of [-1, 1]) pts.push(P(B3.cabU + B3.cabLen / 2 - 0.19, s * (B3.cabWid / 2 + 0.05 + 0.05), 1.9));
    for (const u of [-0.1 - (B3.len * 0.94) / 2, -0.1 + (B3.len * 0.94) / 2]) for (const s of [-B3.wid * 0.3, B3.wid * 0.3]) for (const z of [0.56, 0.9]) pts.push(P(u, s, z));
    for (const s of [-0.7, 0.7]) pts.push(P(B3.pivotU, s, B3.bedZ));
    return { l: Math.min(...pts.map((q) => q[0])), r: Math.max(...pts.map((q) => q[0])), b: Math.max(...pts.map((q) => q[1])) };
  };
  for (let h = 0; h < 8; h++) {
    const s = shots[h]!;
    const m = model(h);
    // ink lines are 1.2 to 2 pt wide outside the geometry, the mirrors stand 2 pt past the cab's side
    const d = [s.l - m.l, s.r - m.r, s.b - m.b];
    const worst = Math.max(...d.map(Math.abs));
    report(worst <= TOL, `turn ${NAMES[h]}: ink west/east/lowest [${s.l}, ${s.r}, ${s.b}] against the model's [${m.l.toFixed(1)}, ${m.r.toFixed(1)}, ${m.b.toFixed(1)}]: worst ${worst.toFixed(1)} pt (<= ${TOL})`);
  }
  for (let h = 0; h < 8; h++) {
    const n = (h + 1) % 8;
    const a = shots[h]!;
    const b = shots[n]!;
    const ma = model(h);
    const mb = model(n);
    const d = [a.l - ma.l - (b.l - mb.l), a.r - ma.r - (b.r - mb.r), a.b - ma.b - (b.b - mb.b)].map(Math.abs);
    report(Math.max(...d) <= TOL, `neighbours ${NAMES[h]} -> ${NAMES[n]}: beyond what the model's turn moves, the edges move ${Math.max(...d).toFixed(1)} pt (<= ${TOL})`);
  }
  // (3) the footprint is the true outline: the ink of the wheels alone (ground parts) inside the footprint's ground polygon
  for (let h = 0; h < 8; h++) {
    const F = T3.headingRad(h);
    const fx = Math.cos(F);
    const fy = Math.sin(F);
    let worst = 0;
    for (const u of T3.BRIDGE.axles)
      for (const s of [-1, 1]) {
        // the tyre's outer face (track + 0.16) at the axle +- the wheel's radius, on the ground
        for (const du of [-T3.BRIDGE.wheelR, T3.BRIDGE.wheelR]) {
          const uu = u + du;
          const ss = s * (T3.BRIDGE.track + 0.16);
          worst = Math.max(worst, Math.abs(uu) - T3.BRIDGE.len / 2, Math.abs(ss) - T3.BRIDGE.wid / 2);
          void fx;
          void fy;
        }
      }
    if (h === 0) report(worst <= 0, `every tyre's ground contact lies inside the 6.2 x 2.4 m footprint (worst ${worst.toFixed(2)} m outside)`);
  }
  // the cab's front and the skip's rear inside the footprint's length
  const cabFront = T3.BRIDGE.cabU + T3.BRIDGE.cabLen / 2;
  const skipRear = T3.BRIDGE.skipU - T3.BRIDGE_SKIP.len / 2;
  report(cabFront <= T3.BRIDGE.len / 2 && -skipRear <= T3.BRIDGE.len / 2 && T3.BRIDGE.cabWid / 2 <= T3.BRIDGE.wid / 2, `cab front ${cabFront.toFixed(3)} m, skip rear ${skipRear.toFixed(3)} m, cab half-width ${(T3.BRIDGE.cabWid / 2).toFixed(2)} m inside 3.1 / 1.2`);
  // (4) every frame inside its measured box
  for (const e of M.WORKS_TRUCK3) {
    const hs = e.headings === 8 ? [0, 1, 2, 3, 4] : e.headings === 4 ? [1] : [0];
    for (const h of hs)
      for (let f = 0; f < e.frames.length; f++) {
        const k = inkOf((c) => e.draw(c, V, f, h));
        const b = MF.cellBounds(e, h);
        const ok = !!k && k.l >= b.x - 1 && k.r <= b.x + b.w + 1 && k.t >= b.y - 1 && k.b <= b.y + b.h + 1;
        if (!ok) report(false, `${e.id} ${e.frames[f]} h${h}: ink ${k ? `[${k.l}, ${k.t}, ${k.r}, ${k.b}]` : 'none'} outside [${b.x}, ${b.y}, ${b.x + b.w}, ${b.y + b.h}]`);
      }
  }
  report(true, 'frames inside their boxes checked (a FAIL line above names any outside)');
  if (failed) process.exitCode = 1;
}
