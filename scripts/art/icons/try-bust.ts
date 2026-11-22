/** Probe: draw cast busts with the game's own character code. npx tsx scripts/art/icons/try-bust.ts <out.png> */
import { headless } from '../headless';
headless(async ({ sheet }) => {
  const { getBustArt } = require('../../../src/ui/sim/art/characterArt');
  const { resolveLook } = require('../../../src/ui/sim/art/looks');
  const names = ['marco', 'pizzaiolo', 'mayor', 'tony', 'maitre'];
  const game = require('../../../games/pizza-empire/game.json');
  await sheet(process.argv[2], { width: 200 * names.length, height: 220, scale: 1, background: '#F4A261' }, (c) => {
    names.forEach((n, i) => {
      const entry = game.cast[n] ?? n;
      const art = getBustArt(resolveLook(entry), 3.4, 'happy');
      c.save(); c.translate(100 + i * 200, 100); c.scale(1.6, 1.6);
      c.drawPicture(art.base); if (art.eyes) c.drawPicture(art.eyes);
      c.restore();
    });
  });
});
