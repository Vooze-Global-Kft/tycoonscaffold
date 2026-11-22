import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_ICONS_BY_MODE, HAUL_ART_ICON_NAMES, HAUL_MACH_ICON_NAMES, SIM_ART_ICON_NAMES, TABS_ART_ICON_NAMES } from './artIcons';

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
    // The haul entry draws its own icons through parts.Icon (src/ui/haul/art/HaulIcon.tsx), never the shared registry.
    expect(read('../modes/haul/index.tsx')).not.toMatch(/artIcons/);
    expect(ART_ICONS_BY_MODE.haul).toEqual([...HAUL_ART_ICON_NAMES]);
  });

  it('the haul lists match the art kit\'s registry (src/ui/haul/art/icons.ts)', () => {
    // Read as text (the kit imports Skia, which does not load under vitest): literal keys plus the three generated families.
    const src = read('../ui/haul/art/icons.ts');
    const list = (file: string, name: string) => [...read(file).match(new RegExp(`${name}[^=]*= \\[([^\\]]*)\\]`))![1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
    const buyers = [...read('../ui/haul/art/portraits.draw.ts').matchAll(/\{ id: '([a-z]+)', name:/g)].map((x) => x[1]);
    const names = [
      ...[...src.matchAll(/icons\['((?:art|mach):[a-z0-9-]+)'\]/g)].map((x) => x[1]),
      ...list('../ui/haul/art/palette.ts', 'ORE_IDS').map((o) => `art:ore-${o}`),
      ...list('../ui/haul/art/icons.draw.ts', 'RAIL_GLYPHS').map((g) => `art:rail-${g}`),
      ...buyers.map((b) => `mach:buyer-${b}`),
      ...[...read('../ui/haul/art/spokes.draw.ts').matchAll(/\{ id: '([a-z]+)', name: '[^']*', rings:/g)].map((x) => `art:cond-${x[1]}`),
      ...list('../ui/haul/art/station.draw.ts', 'STAR_NODES').map((n) => `art:node-${n}`),
    ];
    expect(names.length).toBe(51);
    const art = names.filter((n) => n.startsWith('art:')).map((n) => n.slice(4));
    const mach = names.filter((n) => n.startsWith('mach:')).map((n) => n.slice(5));
    expect([...art].sort()).toEqual([...HAUL_ART_ICON_NAMES].sort());
    expect([...mach].sort()).toEqual([...HAUL_MACH_ICON_NAMES].sort());
  });
});
