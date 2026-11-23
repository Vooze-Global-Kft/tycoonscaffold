import { headless } from './headless';
headless(async ({ sheet }) => {
  const a = require('../../src/ui/merge/art/animals.draw');
  const s = require('../../src/ui/merge/art/stalls.draw');
  const g = require('../../src/ui/merge/art/gear.draw');
  const out = process.argv[2];
  const sp = ['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl'];
  await sheet(`${out}/animals.png`, { width: 7 * 60, height: 5 * 60, scale: 3, background: '#1C2140' }, (c) => {
    sp.forEach((x: string, i: number) => [0, 1, 2].forEach((k) => { c.save(); c.translate(30 + i * 60, 30 + k * 60); a.drawCustomer(c, x, k); c.restore(); }));
    for (let i = 0; i < 6; i++) { c.save(); c.translate(30 + i * 60, 210); a.drawMinder(c, i); c.restore(); }
    c.save(); c.translate(390, 30); a.drawDragon(c); c.restore();
    c.save(); c.translate(390, 100); c.scale(2,2); a.drawFirefly(c); c.restore();
    c.save(); c.translate(390, 150); a.drawTrailPiece(c); c.restore();
  });
  await sheet(`${out}/stalls.png`, { width: 6 * 64, height: 5 * 44 + 60, scale: 4, background: '#1C2140' }, (c) => {
    for (let i = 0; i < 6; i++) for (let k = 0; k < 5; k++) { c.save(); c.translate(32 + i * 64, 22 + k * 44); s.drawStallFront(c, i, { awning: k < 3 ? k : 1, silk: k === 3, closed: k === 4 }); c.restore(); }
    for (let i = 0; i < 6; i++) { c.save(); c.translate(32 + i * 64, 5 * 44 + 30); c.scale(0.9, 0.9); g.drawGear(c, i); c.restore(); }
  });
});
