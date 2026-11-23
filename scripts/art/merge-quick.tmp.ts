import { headless } from './headless';
headless(async ({ sheet, Skia }) => {
  const g = require('../../src/ui/merge/art/goods.draw');
  const pen = require('../../src/ui/merge/art/pen');
  const out = process.argv[2];
  for (const z of [1, 3]) {
    const cell = 47;
    await sheet(`${out}/goods-${z}.png`, { width: 8 * cell * z + 20, height: 6 * cell * z * 2 + 20, scale: z === 1 ? 3 : 1, background: '#123A40' }, (c) => {
      for (let ch = 0; ch < 6; ch++) for (let k = 1; k <= 8; k++) for (const gr of [0, 1]) {
        c.save();
        c.translate(10 + (k - 1) * cell * z + cell * z / 2, 10 + (ch * 2 + gr) * cell * z + cell * z / 2);
        c.scale(z * cell / 48, z * cell / 48);
        const p = Skia.Paint(); p.setColor(Skia.Color('#174349'));
        c.drawRRect(Skia.RRectXY(Skia.XYWHRect(-23, -23, 46, 46), 5, 5), p);
        if (gr) pen.grey(c, (q: any) => g.drawGood(q, ch, k)); else g.drawGood(c, ch, k);
        c.restore();
      }
    });
  }
});
