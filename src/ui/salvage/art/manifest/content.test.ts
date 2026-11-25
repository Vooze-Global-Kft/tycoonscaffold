/**
 * ONE TABLE (contract v2): the content names manifest ENTRY ids, and the art draws exactly those. Every
 * sprite the game's own content (games/scrap-yard/game.json) and the frozen test content name is an entry
 * of this manifest: things (`objects.<id>.sprite`), the piece specs' 4th element, a grade's fallback piece,
 * its bay look and pictogram, and the map's places (a place may also name one of the world's aliases,
 * src/ui/salvage/world/actors.ts PLACE_ART); every grade's `load` is a LOAD_FAMILY.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LOAD_FAMILIES, SalvageSchema, type SalvageContent } from '../../../../config/schema.salvage';
import { SALVAGE_TEST } from '../../../../engine/fixtures/salvage';

// The manifest draws with Skia: the same CanvasKit stand-in as ./things.test.ts.
vi.mock('@shopify/react-native-skia', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request: string, ...rest: unknown[]) {
    return resolve.call(this, request === 'react-native' ? 'react-native-web' : request, ...rest);
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@shopify/react-native-skia/lib/commonjs/mock').Mock(CanvasKit);
  } finally {
    Module._resolveFilename = resolve;
  }
});

let IDS = new Set<string>();
beforeAll(async () => {
  const { MANIFEST } = await import('./index');
  IDS = new Set(MANIFEST.map((e) => e.id));
}, 60_000);
const game = SalvageSchema.parse(JSON.parse(readFileSync(new URL('../../../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage);

function sprites(c: SalvageContent): { where: string; id: string }[] {
  const out: { where: string; id: string }[] = [];
  for (const [id, o] of Object.entries(c.objects)) {
    if (o.sprite) out.push({ where: `objects.${id}.sprite`, id: o.sprite });
    o.pieces.forEach((p, i) => {
      const s = (p as unknown[])[3];
      if (typeof s === 'string') out.push({ where: `objects.${id}.pieces[${i}]`, id: s });
    });
  }
  for (const [id, gr] of Object.entries(c.grades)) {
    const g = gr as { sprite?: string; picto?: string; bay?: { sprite?: string } };
    if (g.sprite) out.push({ where: `grades.${id}.sprite`, id: g.sprite });
    if (g.picto) out.push({ where: `grades.${id}.picto`, id: g.picto });
    if (g.bay?.sprite) out.push({ where: `grades.${id}.bay.sprite`, id: g.bay.sprite });
  }
  return out;
}

describe('the content names manifest ids', () => {
  for (const [name, c] of [
    ['game.json', game],
    ['the frozen test content', SALVAGE_TEST],
  ] as const) {
    it(`every sprite of ${name} is a manifest entry`, () => {
      const missing = sprites(c).filter((s) => !IDS.has(s.id));
      expect(missing).toEqual([]);
    });
    it(`every grade of ${name} carries a load family`, () => {
      for (const [id, gr] of Object.entries(c.grades)) {
        const load = (gr as { load?: string }).load;
        if (load !== undefined) expect(LOAD_FAMILIES as readonly string[], id).toContain(load);
      }
    });
  }
});
