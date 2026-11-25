/// <reference types="node" />
/**
 * The fx catalogue reader (scripts/lib/fxCatalog.js): no catalogue may be empty. The salvage one was
 * allowed to be until its sound pack existed (yard-stage1.md 7); now an emptied shared, haul, merge,
 * decree or salvage catalogue fails alike, and the salvage table reads as its game needs it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import fxCatalog from './fxCatalog.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fxcat-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
const EMPTY = "import type { FxDef } from './catalog';\n\nexport const FX = {} as const satisfies Record<string, FxDef>;\n";

describe('an empty fx catalogue', () => {
  for (const name of ['catalog.ts', 'catalog.haul.ts', 'catalog.merge.ts', 'catalog.decree.ts', 'catalog.salvage.ts'])
    it(`throws for an emptied ${name}`, () => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, EMPTY);
      expect(() => fxCatalog.parseCatalog(file)).toThrow(/could not read/);
    });
  it('the real shared, haul, merge, decree and salvage catalogues are not empty', () => {
    for (const mode of ['haul', 'merge', 'decree', 'salvage'] as const) expect(fxCatalog.parseCatalog(fxCatalog.CATALOG_BY_MODE[mode]).length).toBeGreaterThan(0);
    expect(fxCatalog.parseCatalog(fxCatalog.CATALOG).length).toBeGreaterThan(0);
  });
});

describe('the salvage table', () => {
  const table = fxCatalog.fxTableFor('salvage');
  it('is read from catalog.salvage.ts only (no shared key that the yard does not define)', () => {
    expect(Object.keys(table)).toEqual(fxCatalog.parseCatalog(fxCatalog.CATALOG_BY_MODE.salvage).map((e: { key: string }) => e.key));
    expect(table.cook_done).toBeUndefined();
    expect(table.tap).toBeUndefined();
  });
  it('keeps the runtime fields and drops the briefs', () => {
    expect(table.music_main).toMatchObject({ loop: true });
    expect(table.truck_diesel).toMatchObject({ files: 3, pick: 'ladder' });
    expect(table.piece_copper).toMatchObject({ files: 3, pick: 'random', haptic: ['light'] });
    for (const def of Object.values(table)) expect(def).not.toHaveProperty('brief');
  });
});
