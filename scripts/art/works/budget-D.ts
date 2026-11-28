/**
 * Sheet "budget-D" of scripts/art/yard-sheets.ts (C-ART): sheet D of the works packed as world/atlas.ts packs a
 * sheet, at density 2 (the app's SHEET_DENSITY at most): its size, the density the packer had to fall to (PASS only at 2
 * with both sides at most 2048), the pixels per part and the ten biggest entries; and the packed sheet itself drawn to
 * <out>/atlas-D.png (1 px a pixel, on a grey ground) to be looked at.
 *
 *   flock /tmp/itf-heavy.lock npx tsx scripts/art/yard-sheets.ts <out> budget-D
 */
import fs from 'node:fs';
import path from 'node:path';
import type { WorksSheetCtx } from '../yard-sheets';

export async function run(x: WorksSheetCtx): Promise<void> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const M = require('../../../src/ui/salvage/art/manifest') as typeof import('../../../src/ui/salvage/art/manifest');
  const A = require('../../../src/ui/salvage/world/atlas') as typeof import('../../../src/ui/salvage/world/atlas');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const sheet = 'D' as const;
  const want = 2;
  // atlas.ts plans the first yard's sheets by type (Sheet = 'A' | 'B' | 'G') until C-WORLD-1 gives it the sheet list; the
  // packing itself is by e.sheet === sheet, so a works sheet plans the same way (the cast is the only stand-in)
  const plan = A.planSheet(sheet as unknown as 'A', want, M.WORKS_MANIFEST as unknown as Parameters<typeof A.planSheet>[2]);
  const entries = M.WORKS_MANIFEST.filter((e) => e.sheet === sheet);
  const byPart = Object.entries(M.WORKS_PARTS)
    .map(([part, list]) => [part, (list as readonly import('../../../src/ui/salvage/art/manifest').WorksEntry[]).filter((e) => e.sheet === sheet).reduce((a, e) => a + M.entryPixels(e, want), 0)] as const)
    .filter(([, n]) => n > 0);
  const total = byPart.reduce((a, [, n]) => a + n, 0);
  const side = A.MAX_SIDE;
  const ok = plan.density === want && plan.width <= side && plan.height <= side;
  console.log(`budget-${sheet}: ${entries.length} entries, ${plan.cells.length} cells; packed at density ${plan.density} (wanted ${want}): ${plan.width} x ${plan.height} px of ${side} x ${side}; cells ${(total / 1e6).toFixed(2)} Mpx of ${((side * side) / 1e6).toFixed(2)} (${Math.round((100 * total) / (side * side))} %); ${ok ? 'PASS' : 'FAIL'}`);
  for (const [part, n] of byPart) console.log(`  ${part.padEnd(16)} ${(n / 1e6).toFixed(3)} Mpx`);
  const big = entries.map((e) => [e.id, M.entryPixels(e, want)] as const).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('  biggest: ' + big.map(([id, n]) => `${id} ${Math.round(n / 1e3)}k`).join(', '));
  const img = x.H.image({ width: plan.width, height: plan.height, scale: 1, background: '#5A6A7A' }, (c) => A.drawPlan(c, plan));
  fs.mkdirSync(x.out, { recursive: true });
  const f = path.join(x.out, `atlas-${sheet}.png`);
  fs.writeFileSync(f, Buffer.from(img.encodeToBytes()));
  console.log(`wrote ${f}`);
  if (!ok) process.exitCode = 1;
}
