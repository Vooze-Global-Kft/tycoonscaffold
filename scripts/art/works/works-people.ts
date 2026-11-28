/**
 * Sheet "works-people" of scripts/art/yard-sheets.ts (registered by C-ART; this file is ART-PEOPLE's): visitors, the boss's plasma and analyse poses, the dealer's van, the plasma rack, the manifest
 * part src/ui/salvage/art/manifest/worksPeople.ts drawn by src/ui/salvage/art/visitors.draw.ts. As registered it writes the part's
 * contact sheet (every frame at every baked heading, at its baked size, its bounds faint) to <out>/works-people.png; the art
 * package adds what its judging needs (a scene, a greyscale copy, 60 px beside the first yard) here.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> works-people     (WRITE_BOUNDS=1: write the table)
 *
 * ART-PEOPLE writes into <out>: works-people.png (the contact sheet), works-people-beside.png (the visitors in their four
 * tints and the dealer's people beside the first yard's boss and crew, the boss's plasma and analyse poses, the rack),
 * works-people-vans.png (the dealer's van shut and open beside the first yard's van), works-people-phone.png (0.75 px a
 * point); and prints the checks, PASS/FAIL (exit 1 on a FAIL): bounds (the MEASURED table), never a vest (no vest or
 * hi-vis pixel in any visitor cell under any tint), turn (the soles on the anchor line at every heading and frame), plasma
 * (arc and spray in both frames, the frames differ, no oxy-propane hose), tool ignored off its pose (the additive option
 * changes nothing where it does not apply; the first yard's cells are proved by hash in snap.mts check).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas } from '@shopify/react-native-skia';
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const M = require('../../../src/ui/salvage/art/manifest/worksPeople') as typeof import('../../../src/ui/salvage/art/manifest/worksPeople');
  const MI = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const VD = require('../../../src/ui/salvage/art/visitors.draw') as typeof import('../../../src/ui/salvage/art/visitors.draw');
  const P = require('../../../src/ui/salvage/art/people.draw') as typeof import('../../../src/ui/salvage/art/people.draw');
  const VH = require('../../../src/ui/salvage/art/vehicles.draw') as typeof import('../../../src/ui/salvage/art/vehicles.draw');
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

  await x.contact('works-people', M.WORKS_PEOPLE);

  // ---- pixels of a drawing (points round the anchor) at `sc` px a point --------------------------------------------
  const pixels = (draw: (c: SkCanvas) => void, half = 120, sc = 4, tint?: string) => {
    const W = half * 2 * sc;
    const img = H.image({ width: half * 2, height: half * 2, scale: sc }, (c) => {
      c.translate(half, half);
      if (tint) {
        const p = H.Skia.Paint();
        p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color(tint), H.BlendMode.Modulate));
        c.saveLayer(p);
        draw(c);
        c.restore();
      } else draw(c);
    });
    const px = img.readPixels(0, 0, { width: W, height: W, colorType: 4, alphaType: 3 }) as Uint8Array;
    return { px, W, sc, half };
  };
  const inkOf = (draw: (c: SkCanvas) => void, half = 120) => {
    const { px, W, sc } = pixels(draw, half);
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
    return { l: l / sc - half, t: t / sc - half, r: (r + 1) / sc - half, b: (b + 1) / sc - half };
  };

  // ---- bounds ---------------------------------------------------------------------------------------------------------
  const isTiny = (b: { x: number; y: number; w: number; h: number }) => b.x === -3 && b.y === -3 && b.w === 6 && b.h === 6;
  const rows: string[] = [];
  for (const e of M.WORKS_PEOPLE) {
    const baked = MI.bakedHeadings(e);
    const boxes: [number, number, number, number][] = [];
    for (const h of baked) {
      const B = MI.cellBounds(e, h);
      const tinyCell = e.id.startsWith('person.boss.') && (h === 1 || h === 3);
      if (tinyCell) {
        boxes.push([-3, -3, 6, 6]);
        say(isTiny(B), `bounds ${e.id} heading ${h}: TINY (never asked)`);
        continue;
      }
      let l = 1e9;
      let t = 1e9;
      let r = -1e9;
      let b = -1e9;
      for (let f = 0; f < e.frames.length; f++) {
        const k = inkOf((c) => e.draw(c, V, f, h));
        l = Math.min(l, k.l);
        t = Math.min(t, k.t);
        r = Math.max(r, k.r);
        b = Math.max(b, k.b);
      }
      const m: [number, number, number, number] = [Math.floor(l) - 2, Math.floor(t) - 2, Math.ceil(r) - Math.floor(l) + 4, Math.ceil(b) - Math.floor(t) + 4];
      boxes.push(m);
      const inside = m[0] >= B.x && m[1] >= B.y && m[0] + m[2] <= B.x + B.w && m[1] + m[3] <= B.y + B.h;
      say(inside, `bounds ${e.id} heading ${h}: ink+2 [${m.join(', ')}] in [${B.x}, ${B.y}, ${B.w}, ${B.h}]`);
    }
    rows.push(`  '${e.id}': [${boxes.map((b) => `[${b.join(', ')}]`).join(', ')}],`);
  }
  console.log('MEASURED (worksPeople.ts):\n' + rows.join('\n'));
  if (process.env.WRITE_BOUNDS === '1') {
    const file = path.join(__dirname, '../../../src/ui/salvage/art/manifest/worksPeople.ts');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf('const MEASURED');
    const start = src.indexOf('= {', a) + 3;
    const end = src.indexOf('};', start);
    fs.writeFileSync(file, src.slice(0, start) + '\n' + rows.join('\n') + '\n' + src.slice(end));
    console.log(`bounds: ${rows.length} entries written to manifest/worksPeople.ts (run again to check with them)`);
  }

  // ---- never a vest, never a hard hat: no pixel of a vest colour or the hats' in any visitor cell, under every tint ------
  const near = (px: Uint8Array, i: number, hex: string, tol: number) => {
    const [r, g, b] = pal.rgbOf(hex);
    return Math.abs(px[i] - r) + Math.abs(px[i + 1] - g) + Math.abs(px[i + 2] - b) < tol;
  };
  const vestColours = [YARD.hivis, YARD.hivisLight, YARD.vestYardHand, YARD.vestCutter, YARD.vestDriver];
  const vis = M.WORKS_PEOPLE[0];
  let vestPx = 0;
  let cells = 0;
  for (const tint of [...VD.VISITOR_TINTS, VD.DEALER_TINT, undefined])
    for (const h of MI.bakedHeadings(vis))
      for (let f = 0; f < vis.frames.length; f++) {
        const { px, W } = pixels((c) => vis.draw(c, V, f, h), 50, 2, tint);
        cells++;
        for (let i = 0; i < W * W * 4; i += 4) if (px[i + 3] > 200 && vestColours.some((hx) => near(px, i, hx, 40))) vestPx++;
      }
  say(vestPx === 0, `never a vest: ${vestPx} pixels of a vest or hi-vis colour in ${cells} visitor cells (4 tints, the dealer's, untinted)`);

  // ---- turn: the visitor's feet on the anchor line and its width steady at every heading and frame --------------------
  for (const h of MI.bakedHeadings(vis)) {
    let worst = 0;
    let widest = 0;
    for (let f = 0; f < vis.frames.length; f++) {
      const k = inkOf((c) => vis.draw(c, V, f, h), 60);
      worst = Math.max(worst, Math.abs(k.b - 0.8));
      if (f === 4) widest = k.r - k.l;
    }
    say(worst <= 2.5, `turn visitor heading ${h}: the soles' line within ${worst.toFixed(1)} pt of the anchor (<= 2.5) in all ${vis.frames.length} frames; standing width ${widest.toFixed(1)} pt`);
  }

  // ---- the plasma: arc and spray in both frames, the two frames differ, no oxy-propane hoses (the torch's blue and red) ----
  const plasma = M.WORKS_PEOPLE[1];
  for (const h of [0, 2, 4]) {
    const a = pixels((c) => plasma.draw(c, V, 0, h), 60, 2);
    const b = pixels((c) => plasma.draw(c, V, 1, h), 60, 2);
    let glow = 0;
    let hose = 0;
    let diff = 0;
    for (let i = 0; i < a.W * a.W * 4; i += 4) {
      if (a.px[i + 3] > 200 && (near(a.px, i, YARD.glow, 30) || near(a.px, i, YARD.glowHot, 30))) glow++;
      if (a.px[i + 3] > 200 && near(a.px, i, YARD.crateBlue, 20)) hose++;
      if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 3] - b.px[i + 3]) > 30) diff++;
    }
    say(glow > 6 && diff > 6 && hose === 0, `plasma heading ${h}: spray pixels ${glow}, frames differ by ${diff} px, oxy hose pixels ${hose}`);
  }

  // ---- the first yard's people unchanged by the additive tool: a person without `tool` draws as before ----------------
  // (proved by hash in snap.mts check; here: tool undefined and tool on another pose draw the same pixels)
  for (const pose of ['torch', 'stand', 'walk'] as const)
    for (const dir of ['s', 'e', 'n'] as const) {
      const a = pixels((c) => P.drawPerson(c, V, { dir, pose, shadow: false }), 50, 2);
      const b = pixels((c) => P.drawPerson(c, V, { dir, pose, shadow: false, tool: pose === 'torch' ? 'analyser' : pose === 'stand' ? 'plasma' : 'plasma' }), 50, 2);
      let d = 0;
      for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) d++;
      say(d === 0, `tool ignored off its pose: ${pose} ${dir} differs by ${d} bytes`);
    }

  // ---- sheets to LOOK at --------------------------------------------------------------------------------------------
  const crew = P.crewLook(YARD.vestYardHand, 0);
  const row = (c: SkCanvas, y: number, label: string, items: (() => void)[], dx = 70) => {
    x.caption(c, label, 70, y - 70);
    items.forEach((d, i) => x.put(c, 60 + i * dx, y, d));
  };
  const gnd = (c: SkCanvas) => (cx: number, cy: number) => c.drawPath(pen.oval(cx, cy, 14, 4), pen.fill(YARD.shadow, 0.2));
  await x.write('works-people-beside.png', 760, 820, (c) => {
    x.title(c, 'ART-PEOPLE beside the first yard: boss, crew (walk), visitor (walk, 4 tints + dealer), headings s se e ne n / s e n');
    const g = gnd(c);
    const head8 = [0, 1, 2, 3, 4];
    row(c, 100, 'first yard: boss stand s e n, crew walk s e n', [
      ...(['s', 'e', 'n'] as const).map((d) => () => { g(0, 0); P.drawPerson(c, V, { dir: d, pose: 'stand', shadow: false }); }),
      ...(['s', 'e', 'n'] as const).map((d) => () => { g(0, 0); P.drawPerson(c, V, { dir: d, pose: 'walk', frame: 1, look: crew, shadow: false }); }),
    ]);
    VD.VISITOR_TINTS.forEach((tint, ti) => {
      row(c, 200 + ti * 90, `visitor walk2 tinted ${tint}, then stand, pay (s e)`, [
        ...head8.map((h) => () => { g(0, 0); tinted(c, tint, () => VD.drawVisitor(c, V, h, 'walk', 1)); }),
        () => { g(0, 0); tinted(c, tint, () => VD.drawVisitor(c, V, 0, 'stand')); },
        () => { g(0, 0); tinted(c, tint, () => VD.drawVisitor(c, V, 0, 'pay')); },
        () => { g(0, 0); tinted(c, tint, () => VD.drawVisitor(c, V, 2, 'pay')); },
      ]);
    });
    row(c, 560, 'dealer push (sack truck) s se e ne n; visitor carry s e n', [
      ...head8.map((h) => () => {
        const d = h === 0 ? 's' : h === 4 ? 'n' : 'e';
        const front = h !== 4;
        const cart = () => {
          const ah = VH.CARRIER_AHEAD.sack * 40;
          const th = (h * Math.PI) / 4;
          x.put(c, Math.sin(th) * ah, Math.cos(th) * ah * 0.7, () => VH.drawCarrier(c, V, 'sack', d, 'cu', 'self'));
        };
        g(0, 0);
        if (!front) cart();
        tinted(c, VD.DEALER_TINT, () => VD.drawVisitor(c, V, h, 'push', 1));
        if (front) cart();
      }),
      ...[0, 2, 4].map((h) => () => { g(0, 0); tinted(c, VD.VISITOR_TINTS[1], () => VD.drawVisitor(c, V, h, 'carry', 1)); }),
    ]);
    row(c, 680, 'the boss: plasma cut1/cut2 s e n; analyse s e n', [
      ...[0, 2, 4].flatMap((h) => [0, 1].map((f) => () => M.WORKS_PEOPLE[1].draw(c, V, f, h))),
      ...[0, 2, 4].map((h) => () => M.WORKS_PEOPLE[2].draw(c, V, 0, h)),
    ], 75);
    x.put(c, 690, 770, () => M.WORKS_PEOPLE[4].draw(c, V, 0, 0));
    x.caption(c, 'rack', 690, 790);
  }, 2);
  function tinted(c: SkCanvas, tint: string, draw: () => void) {
    const p = H.Skia.Paint();
    p.setColorFilter(H.Skia.ColorFilter.MakeBlend(H.Skia.Color(tint), H.BlendMode.Modulate));
    c.saveLayer(p);
    draw();
    c.restore();
  }
  await x.write('works-people-vans.png', 900, 330, (c) => {
    x.title(c, 'the dealer van (shut / open, s e n, DEALER_TINT) beside the first yard van');
    const pts = [0, 1, 2];
    pts.forEach((h, i) => {
      x.put(c, 90 + i * 160, 130, () => VH.drawVan(c, V, VH.headingRad(h * 2)));
      x.put(c, 90 + i * 160, 270, () => tinted(c, VD.DEALER_TINT, () => VD.drawDealerVan(c, V, VD.vanHeadingRad(h), true)));
    });
    pts.forEach((h, i) => x.put(c, 590 + (i % 2) * 160, 130 + Math.floor(i / 2) * 140, () => tinted(c, VD.DEALER_TINT, () => VD.drawDealerVan(c, V, VD.vanHeadingRad(h), false))));
  }, 2);
  // a phone at the world's zoom: 0.75 px a point
  await x.write('works-people-phone.png', 560, 200, (c) => {
    const g = gnd(c);
    const items: (() => void)[] = [
      () => { g(0, 0); P.drawPerson(c, V, { dir: 's', pose: 'walk', frame: 1, shadow: false }); },
      () => { g(0, 0); P.drawPerson(c, V, { dir: 'e', pose: 'walk', frame: 1, look: crew, shadow: false }); },
      ...[0, 1, 2, 3].map((i) => () => { g(0, 0); tinted(c, VD.VISITOR_TINTS[i], () => VD.drawVisitor(c, V, i, i === 3 ? 'pay' : 'walk', 1)); }),
      () => M.WORKS_PEOPLE[1].draw(c, V, 0, 2),
      () => M.WORKS_PEOPLE[2].draw(c, V, 0, 2),
    ];
    items.forEach((d, i) => x.put(c, 40 + i * 64, 130, d));
  }, 0.75);

  console.log(failed ? `works-people: ${failed} FAIL` : 'works-people: all PASS');
  if (failed) process.exitCode = 1;
}
