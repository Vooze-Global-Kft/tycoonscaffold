/// <reference types="node" />
/**
 * The fx catalogue reader (scripts/lib/fxCatalog.js): only the salvage catalogue may be empty (its
 * sounds are not designed yet). An emptied shared, haul, merge or decree catalogue still fails, as it
 * did before the salvage mode existed.
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
  it('is allowed for the salvage mode only', () => {
    expect(fxCatalog.parseCatalog(fxCatalog.CATALOG_BY_MODE.salvage)).toEqual([]);
    expect(fxCatalog.fxTableFor('salvage')).toEqual({});
  });
  for (const name of ['catalog.ts', 'catalog.haul.ts', 'catalog.merge.ts', 'catalog.decree.ts'])
    it(`still throws for an emptied ${name}`, () => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, EMPTY);
      expect(() => fxCatalog.parseCatalog(file)).toThrow(/could not read/);
    });
  it('the real shared, haul, merge and decree catalogues are not empty', () => {
    for (const mode of ['haul', 'merge', 'decree'] as const) expect(fxCatalog.parseCatalog(fxCatalog.CATALOG_BY_MODE[mode]).length).toBeGreaterThan(0);
    expect(fxCatalog.parseCatalog(fxCatalog.CATALOG).length).toBeGreaterThan(0);
  });
});
