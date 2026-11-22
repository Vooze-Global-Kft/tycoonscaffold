import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_ICON_NAMES } from './artIcons';

describe('art icon names', () => {
  it('match the art kit (src/ui/sim/art/props.tsx ART_ICON_NAMES)', () => {
    // Read as text: the art kit imports Skia, which does not load under node.
    const src = fs.readFileSync(path.join(__dirname, '../ui/sim/art/props.tsx'), 'utf8');
    const m = src.match(/export const ART_ICON_NAMES = \[([\s\S]*?)\] as const/);
    expect(m).not.toBeNull();
    const kit = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect([...ART_ICON_NAMES]).toEqual(kit);
  });
});
