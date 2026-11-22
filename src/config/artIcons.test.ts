import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_ICONS_BY_MODE, SIM_ART_ICON_NAMES, TABS_ART_ICON_NAMES } from './artIcons';

const read = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8');

/** The keys of one `const NAME: Record<string, ArtIconDef> = { ... }` table in an art file, read as text. */
function iconKeys(file: string, table: string): string[] {
  // Read as text: the art kit imports Skia, which does not load under node.
  const m = read(file).match(new RegExp(`const ${table}: Record<string, ArtIconDef> = \\{([\\s\\S]*?)\\n\\};`));
  expect(m, `${table} in ${file}`).not.toBeNull();
  return [...m![1].matchAll(/^\s+'?([a-z-]+)'?: \{/gm)].map((x) => x[1]);
}

describe('art icon names', () => {
  it('match the art files: the tab-shell icons (src/ui/art/props.tsx) and the sim mode\'s (src/ui/sim/art/props.tsx)', () => {
    expect(iconKeys('../ui/art/props.tsx', 'TABS_ART_ICONS')).toEqual([...TABS_ART_ICON_NAMES]);
    expect(iconKeys('../ui/sim/art/props.tsx', 'SIM_ART_ICONS')).toEqual([...SIM_ART_ICON_NAMES]);
  });

  it('match what each mode entry registers', () => {
    const registers = (mode: string) => {
      const m = read(`../modes/${mode}/index.tsx`).match(/artIcons: artIconSources\((.*)\),/);
      return m ? m[1] : '';
    };
    expect(registers('sim')).toBe('{ ...TABS_ART_ICONS, ...SIM_ART_ICONS }');
    expect(ART_ICONS_BY_MODE.sim).toEqual([...TABS_ART_ICON_NAMES, ...SIM_ART_ICON_NAMES]);
    expect(registers('classic')).toBe('TABS_ART_ICONS');
    expect(ART_ICONS_BY_MODE.classic).toEqual([...TABS_ART_ICON_NAMES]);
    expect(read('../modes/haul/index.tsx')).not.toMatch(/artIcons/);
    expect(ART_ICONS_BY_MODE.haul).toEqual([]);
  });
});
