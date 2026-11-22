/**
 * Contact sheets of Orbit Haulers' art kit (src/ui/haul/art), drawn in Node.
 *
 *   npx tsx scripts/art/haul-sheets.ts [outDir] [section...]
 *
 * Writes one PNG per section at 3 pixels per point on the game's background (each piece at its
 * real size and four times enlarged), plus field.png: a mock of the main screen at 390 x 844.
 * Default outDir: $HAUL_ART_OUT or ./scripts/art/out (keep PNGs out of the repository).
 */
import path from 'node:path';
import { headless } from './headless';

headless(async ({ sheet }) => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { sectionPicture } = require('../../src/ui/haul/art/gallery.draw') as typeof import('../../src/ui/haul/art/gallery.draw');
  const { gallerySections } = require('../../src/ui/haul/art/gallery.sections') as typeof import('../../src/ui/haul/art/gallery.sections');
  const { drawFieldMock } = require('../../src/ui/haul/art/mock.draw') as typeof import('../../src/ui/haul/art/mock.draw');
  const { SPACE } = require('../../src/ui/haul/art/palette') as typeof import('../../src/ui/haul/art/palette');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const out = process.argv[2] ?? process.env.HAUL_ART_OUT ?? path.join(__dirname, 'out');
  const only = process.argv.slice(3);
  const width = 640;
  const t0 = Date.now();
  for (const section of gallerySections()) {
    const id = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (only.length && !only.includes(id)) continue;
    const { pic, height } = sectionPicture(section, width);
    const file = await sheet(path.join(out, `${id}.png`), { width, height, scale: 3, background: SPACE.bg }, (c) => c.drawPicture(pic));
    console.log('wrote', file);
  }
  if (!only.length || only.includes('field')) {
    for (const [w, h, name] of [
      [390, 844, 'field'],
      [375, 667, 'field-small'],
    ] as const) {
      const file = await sheet(path.join(out, `${name}.png`), { width: w, height: h, scale: 3, background: SPACE.bg }, (c) => drawFieldMock(c, w, h));
      console.log('wrote', file);
    }
  }
  if (!only.length || only.includes('atlas')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { bakeAtlas } = require('../../src/ui/haul/art/atlas') as typeof import('../../src/ui/haul/art/atlas');
    const t1 = Date.now();
    const atlas = bakeAtlas({ density: 3, freighter: { hull: 3, segments: 8 } });
    if (!atlas) throw new Error('atlas: no surface');
    const ms = Date.now() - t1;
    const file = path.join(out, 'atlas.png');
    require('node:fs').writeFileSync(file, Buffer.from(atlas.image.encodeToBytes()));
    console.log(`wrote ${file}: ${Object.keys(atlas.sprites).length} sprites, ${atlas.width} x ${atlas.height} px at 3x, baked in ${ms} ms`);
  }
  console.log(`done in ${Date.now() - t0} ms`);
});
