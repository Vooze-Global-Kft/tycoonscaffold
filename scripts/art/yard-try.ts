import { headless } from './headless';
headless(async (H) => {
  const P = require('../../src/ui/salvage/art/people.draw');
  const pen = require('../../src/ui/salvage/art/pen');
  const L = require('../../src/ui/salvage/art/letters');
  const { YARD } = require('../../src/ui/salvage/art/palette');
  const out = process.argv[2];
  await H.sheet(out, { width: 520, height: 200, scale: 3, background: YARD.concrete }, (c) => {
    const poses = [['s','stand',0],['s','walk',0],['s','walk',1],['e','stand',0],['e','walk',0],['e','walk',1],['e','cut',0],['s','carry',0],['e','carry',0],['n','carry',0],['s','cut',0]];
    poses.forEach(([d,p,f], i) => pen.at(c, 30 + i * 44, 80, () => P.drawPerson(c, pen.VIEW, { dir: d, pose: p, frame: f, spark: 0.3 })));
    pen.at(c, 30, 160, () => P.drawPerson(c, pen.VIEW, { dir: 's', pose: 'stand', look: P.crewLook(YARD.vestYardHand) }));
    pen.at(c, 74, 160, () => P.drawPerson(c, pen.VIEW, { dir: 'e', pose: 'carry', look: P.crewLook(YARD.vestYardHand), stack: ['copper','copper','brass'] }));
    L.stencil(c, 'SCRAP TO INGOT 0123456789', 110, 110, 16, YARD.ink);
    L.dotMatrix(c, 'BARE BRIGHT 52.4 KG §35.00', 110, 140, 9, YARD.ink);
    c.drawRect({x:110,y:155,width:200,height:30}, pen.fill(YARD.ledCase));
    L.sevenSeg(c, '1,240', 300, 160, 20, YARD.led, YARD.ledOff);
  });
});
