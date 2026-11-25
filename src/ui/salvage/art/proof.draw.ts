/**
 * The proof picture (yard-style.md 10): the first yard as the game draws it, in the three-quarter view at
 * the ground work's scale, with the interface drawn in, at 844 x 390 or 667 x 375 points. It leads with
 * copper (cable drums, the stripper and its bare bright bundles at their posted price, the boss carrying
 * copper on the weighbridge), the ticket feeding out of the display's slot and the pour under its hood
 * (ruling 14), in a warm late-day light with the far yard past the fence. No truck. Composed only from
 * the kit's drawings, sorted by footprint y as the world sorts its sprites. Names come from the names
 * register (scripts/content/yard/names.json).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from './palette';
import { BOSS, crewLook, drawPerson } from './people.draw';
import { at, box, boxShadow, fill, linear, lit, proj, rrect, segment, stroke, VIEW, type View3q } from './pen';
import { drawBrightCopper, drawCableDrum, drawHeap, drawIngot, drawRadiator, drawTapCrate, drawWasher } from './scrap.draw';
import { drawBay, drawContainer, drawFurnaceSet, drawPad, drawStripper, drawWeighDisplay, drawWeighbridgeDeck, FURNACE_SCALE } from './plant.draw';
import { SUN_WASH, drawConcrete, drawOilStain, drawPaintLine, drawPuddle, drawSkyline, drawWeeds } from './ground.draw';
import { MANIFEST } from './manifest';
import { STILLAGE_LAYER_DY } from './manifest/plant';
import { drawFlatbed } from './vehicles.draw';
import { TYPE, cashChip, carryChip, clipboardButton, drawTicket, goalCard, ladderChip, padlockChip, priceTag, risingLines, stick, ticketFromSlot, ticketHeight, ticketWidth, type TextFn, type Ticket } from './ui.draw';

export const PROOF_WORDS = {
  cash: '1,834',
  rank: '25th',
  of: 'of 26',
  next: 'Pennick Scrap',
  gap: '1.5 t',
  carry: '52/60 kg',
  goal: 'Strip cable into bare bright copper',
  goalTally: '18 / 20 kg',
  price: '§35.00/kg',
  lockLabel: 'Motor bench',
  lockPrice: '§800',
  display: '52.4',
} as const;

export const PROOF_TICKET: Ticket = {
  yard: 'THWAITEBY LANE YARD',
  number: '000127',
  date: '25 NOV',
  lines: [{ grade: 'BARE BRIGHT CU', net: '52.4 KG', price: '§35.00', amount: '§1,834.00', metal: 'copper' }],
  total: '§1,834.00',
  stamp: ['ID CHECKED', 'PAID BY TRANSFER'],
};

/** The ticket's print size in the store picture: 9 pt, so its smallest line reads on a phone. */
export const PROOF_PRINT = 9;

interface Item {
  y: number;
  draw: () => void;
}

/** Screen y (points) of the world's north edge (y = 0): above it the fence and the far yard. */
const NORTH = 118;

/** A low wall of concrete blocks along the north edge, x0..x1 metres, with lamp posts: the far yard shows over it. */
function lowWall(c: SkCanvas, v: View3q, x0: number, x1: number): void {
  const y = -0.35;
  for (let x = x0; x < x1 - 0.01; x += 0.8) box(c, v, { len: 0.8, wid: 0.5, h: 0.5, ox: x + 0.4, oy: y, color: '#BDB8AC', line: 1 });
  for (const x of [x0 + 2.2, x1 - 2.6]) {
    box(c, v, { len: 0.1, wid: 0.1, h: 3.2, ox: x, oy: y, z: 0.5, color: YARD.galvanised, line: 1 });
    const [lx, ly] = proj(v, x, y, 3.7);
    c.drawPath(rrect(lx - 2, ly - 3, 14, 5, 2), fill(YARD.steelDark));
    c.drawPath(rrect(lx - 2, ly - 3, 14, 5, 2), stroke(YARD.ink, 1));
  }
}

/** The yard of the proof in world metres, drawn with the camera at (camX, camY) points. */
export function drawProofWorld(c: SkCanvas, v: View3q, camX: number, camY: number, T: TextFn, L: ProofLayout): { slot: [number, number]; slotW: number } {
  c.save();
  c.translate(-camX, -camY);
  const put = (x: number, y: number, draw: () => void) => {
    const [sx, sy] = proj(v, x, y, 0);
    at(c, sx, sy, draw);
  };
  // the far yard past the fence, then the ground and its decals
  drawSkyline(c, camX - 2, L.w + 4, camY, -22, 3);
  drawConcrete(c, v, -1, -0.1, 24, 12, 7, true);
  drawPaintLine(c, v, 0.3, 7.4, 8.4, 7.4, 0.12, true);
  drawPaintLine(c, v, 14.0, 5.9, 21.0, 5.9, 0.12, true);
  drawPaintLine(c, v, 9.0, 6.4, 9.0, 10.5, 0.1);
  drawOilStain(c, v, 4.9, 5.0, 0.5, 3);
  drawOilStain(c, v, 13.9, 6.6, 0.4, 5);
  drawOilStain(c, v, 8.0, 3.8, 0.35, 8);
  drawPuddle(c, v, 2.6, 8.6, 1.1, 0.5, 2);
  drawPuddle(c, v, 14.6, 7.3, 0.9, 0.4, 6);
  for (const [x, y, s] of [[0.4, 7.0, 3], [3.9, 9.6, 5], [13.4, 8.1, 7], [7.7, 0.4, 9], [20.6, 7.4, 11]] as const) {
    const [sx, sy] = proj(v, x, y, 0);
    drawWeeds(c, sx, sy, s, 1.1);
  }
  put(17.9, 2.7, () => drawPad(c, v, 5.0, 2.6));
  put(5.3, 5.5, () => drawPad(c, v, 2.2, 1.4, true));
  put(11.2, 4.2, () => drawWeighbridgeDeck(c, v));

  const items: Item[] = [];
  const add = (x: number, y: number, draw: () => void) => items.push({ y, draw: () => put(x, y, draw) });
  add(1.5, -1.25, () => drawContainer(c, v, YARD.containerOxide, { seed: 2 }));
  add(17.9, -1.25, () => drawContainer(c, v, YARD.containerTeal, { seed: 4 }));
  add(24.0, -1.25, () => drawContainer(c, v, YARD.containerSage, { seed: 5 }));
  items.push({ y: -0.35, draw: () => lowWall(c, v, 4.55, 14.85) });
  // the gate tip and the white goods
  add(1.8, 1.7, () => drawHeap(c, v, 1.4, 1.0, 4));
  add(0.8, 3.6, () => drawWasher(c, v, 'whole', 1));
  add(2.0, 3.9, () => drawWasher(c, v, 'stripped', 2));
  add(3.3, 4.2, () => drawWasher(c, v, 'pieces', 3));
  add(4.4, 2.9, () => drawTapCrate(c, v));
  add(1.0, 5.5, () => drawRadiator(c, v, 3));
  add(0.9, 6.7, () => drawPerson(c, v, { dir: 'e', pose: 'walk', frame: 1, look: crewLook(YARD.vestYardHand, 2), stack: [] }));
  // copper: drums of cable, the stripper running, bare bright bundles on a pallet at their price
  add(5.5, 1.2, () => drawCableDrum(c, v, 0.55, 0.6, 1));
  add(6.6, 1.6, () => drawCableDrum(c, v, 0.45, 0.5, 2));
  add(8.0, 2.2, () => drawStripper(c, v, { running: true }));
  add(6.9, 2.9, () => drawPerson(c, v, { dir: 'e', pose: 'lever', look: crewLook(YARD.vestCutter, 1) }));
  add(8.6, 4.5, () => {
    boxShadow(c, v, 1.0, 0.8, 0, 0, 0.4);
    box(c, v, { len: 1.0, wid: 0.8, h: 0.14, color: YARD.wood, line: 1 });
    at(c, -10, -8, () => drawBrightCopper(c, v));
    at(c, 10, -6, () => drawBrightCopper(c, v));
    at(c, 0, 2, () => drawBrightCopper(c, v));
    at(c, 0, -14, () => drawBrightCopper(c, v));
  });
  // the boss on the weighbridge with a stack of copper
  add(10.5, 4.5, () => drawPerson(c, v, { dir: 'e', pose: 'carry', look: BOSS, stack: ['copper', 'copper', 'copper', 'copper', 'copper', 'copper'] }));
  let slot: { slot: [number, number]; slotW: number } = { slot: [0, 0], slotW: 40 };
  add(13.25, 3.0, () => {
    slot = drawWeighDisplay(c, v, PROOF_WORDS.display);
  });
  // the pour: the furnace under its hood, the furnace hand at the tilt wheel lit by the melt
  const FX = 17.4;
  const FY = 2.2;
  add(FX, FY, () => drawFurnaceSet(c, v, 'pouring'));
  const [gx, gy] = proj(v, FX + 0.95 * FURNACE_SCALE, FY + 0.3, 0.5);
  items.push({
    y: FY + 0.9,
    draw: () => lit(c, gx, gy, 90, YARD.glow, 0.5, () => put(FX - 1.0, FY + 0.9, () => drawPerson(c, v, { dir: 'e', pose: 'lever', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true }))),
  });
  add(20.3, 3.4, () => {
    boxShadow(c, v, 1.0, 0.8, 0, 0, 0.3);
    box(c, v, { len: 1.0, wid: 0.8, h: 0.14, color: YARD.wood, line: 1 });
    drawIngot(c, v, 'brass', 99, { ox: -0.2, oy: -0.15, z: 0.14 });
    drawIngot(c, v, 'brass', 99, { ox: -0.2, oy: 0.15, z: 0.14 });
    drawIngot(c, v, 'brass', 99, { ox: -0.15, oy: 0.0, z: 0.25 });
  });
  // the bays along the south, each its grade's own pieces
  add(10.4, 8.75, () => drawBay(c, v, 2.4, 2.0, { heap: ['light_iron', 'hms', 'light_iron'], code: 'FE', seed: 1 }));
  add(13.6, 8.75, () => drawBay(c, v, 2.4, 2.0, { heap: ['copper'], code: 'CU', hold: true, seed: 2 }));
  add(16.8, 8.75, () => drawBay(c, v, 2.4, 2.0, { heap: ['brass'], code: 'BR', seed: 3 }));
  add(20.0, 8.75, () => drawBay(c, v, 2.4, 2.0, { heap: ['cast_iron', 'cast_iron', 'aluminium'], code: 'CI', seed: 4 }));
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // world-anchored chips
  const [tx, ty] = proj(v, 8.6, 4.5, 1.45);
  priceTag(c, T, tx, ty, PROOF_WORDS.price, 'copper');
  const [lx, ly] = proj(v, 5.3, 5.5, 1.0);
  // a world chip is drawn only when it is wholly on screen (at 667 the pad is at the edge)
  if (lx - 66 - camX >= L.side) padlockChip(c, T, lx, ly, PROOF_WORDS.lockLabel, PROOF_WORDS.lockPrice);
  c.restore();
  const [ax, ay] = proj(v, 13.25, 3.0, 0);
  return { slot: [ax + slot.slot[0] - camX, ay + slot.slot[1] - camY], slotW: slot.slotW };
}

export interface ProofLayout {
  w: number;
  h: number;
  /** Safe insets left/right and bottom (pt), margins when none. */
  side: number;
  bottom: number;
  bar: number;
  goal: number;
  cashW: number;
  ladderW: number;
  carryW: number;
  gap: number;
  camX: number;
}

export const PROOF_844: ProofLayout = { w: 844, h: 390, side: 47, bottom: 21, bar: 36, goal: 28, cashW: 120, ladderW: 300, carryW: 80, gap: 14, camX: 0 };
export const PROOF_667: ProofLayout = { w: 667, h: 375, side: 16, bottom: 16, bar: 34, goal: 26, cashW: 104, ladderW: 240, carryW: 76, gap: 12.75, camX: 200 };

/** The whole proof picture: world, the late-day light, the ticket out of the display, HUD and stick. */
export function drawProof(c: SkCanvas, L: ProofLayout, T: TextFn, o: { stick?: boolean } = {}): void {
  const v = VIEW;
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, fill(YARD.concrete));
  const { slot, slotW } = drawProofWorld(c, v, L.camX, -NORTH, T, L);
  // the low sun from the west: a warm wash over the world, strongest at the left
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, linear(0, 0, L.w, L.h * 0.4, ['rgba(255,206,140,0.26)', 'rgba(255,214,150,0.08)', 'rgba(120,140,170,0.06)'], [0, 0.6, 1]));
  ticketFromSlot(c, slot[0], slot[1], slotW, PROOF_TICKET, PROOF_PRINT);
  // the top bar
  const y0 = 3;
  const ch = L.bar - 6;
  let x = L.side;
  cashChip(c, T, x, y0, L.cashW, ch, PROOF_WORDS.cash);
  x += L.cashW + L.gap;
  ladderChip(c, T, x, y0, L.ladderW, ch, { rank: PROOF_WORDS.rank, of: PROOF_WORDS.of, next: PROOF_WORDS.next, gap: PROOF_WORDS.gap, progress: 0.68 });
  const right = L.w - L.side;
  clipboardButton(c, right - 44, y0, 44, ch);
  carryChip(c, T, right - 44 - L.gap - L.carryW, y0, L.carryW, ch, PROOF_WORDS.carry);
  goalCard(c, T, L.side, L.bar + 4, L.cashW + L.gap + L.ladderW, L.goal - 4, PROOF_WORDS.goal, PROOF_WORDS.goalTally, 0.9);
  // the stick, held, over open ground at the lower left (the one button has no word on the deck: not drawn)
  if (o.stick !== false) stick(c, L.side + 70, L.h - L.bottom - 52, 18, -6);
}

// =====================================================================================================
// The hero frame of the first yard (yard-stage1.md 3 and S19): the working core as the world draws it,
// from the manifest's sprites at the content map's positions (proto content2 `map.points`): the platform
// scale with the boss weighing in a hand load of bare bright copper, the weigh-in ticket out of its post
// (no payment on it: today's value, muted), the weighbridge and its display, the scale house with the
// posted price board, the hand stripper on its pad with the cable bundle, the copper and brass stillages,
// the merchant's flatbed loading over the bays' back wall, and the pour under its hood.
// =====================================================================================================

/** The content map's points the hero frame uses (metres; proto content2.json `map.points`). */
export const HERO_POINTS = {
  scale: [53.5, 23.0],
  weighbridge: [52.0, 26.5],
  scalehouse: [54.0, 20.5],
  bays: [48.5, 20.0],
  merchant: [48.5, 18.8],
  stillage_cu: [43.5, 22.5],
  stillage_br: [43.5, 25.0],
  stripper: [46.0, 23.5],
  bundle1: [46.5, 22.0],
  crucible: [37.0, 25.0],
  board: [48.0, 26.8],
} as const;

/** The caller's words in the hero frame (names from the names register by id: homeYard, merchant, rival.1). */
export const HERO_WORDS = {
  cash: '412',
  rank: '26th',
  of: 'of 26',
  next: 'Bramley & Daughters Scrap',
  gap: '0.15 t',
  carry: '28.6 / 30 kg',
  goal: 'Weigh it on the scale',
  goalTally: '0 / 1',
  display: '28.6',
} as const;

export const HERO_TICKET: Ticket = {
  kind: 'weighin',
  yard: 'CINDER LANE YARD',
  number: '000014',
  date: '25 NOV',
  lines: [
    { grade: 'BARE BRIGHT CU', net: '25.8 KG', price: '', amount: '§35.50/KG', metal: 'copper' },
    { grade: 'NO.2 COPPER', net: '2.8 KG', price: '', amount: '§34.30/KG', metal: 'copper' },
  ],
  total: '',
  stamp: null,
  muted: ['TODAY', '§1,011.94'],
  legal: ['WEIGHED INTO BAYS', 'NOT YET SOLD'],
};

export interface HeroLayout extends ProofLayout {
  /** the world's x (metres) at the screen's left edge, and its y at the screen's top */
  wx: number;
  wy: number;
}

export const HERO_844: HeroLayout = { ...PROOF_844, wx: 35.0, wy: 13.9 };
export const HERO_667: HeroLayout = { ...PROOF_667, camX: 0, wx: 38.2, wy: 13.9 };

/**
 * A stand-in for the things artist's cable bundle (until manifest id thing.cable.bundle exists): heavy
 * cable offcuts lying straight and tied in two places, grey and black sheaths, copper showing at the cut ends.
 */
function cableBundle(c: SkCanvas, v: View3q): void {
  boxShadow(c, v, 1.3, 0.5, 0, 0, 0.3);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const row = i < 4 ? 0 : 1;
    const k = row ? i - 4 : i;
    const y = (k - (row ? 1 : 1.5)) * 0.11;
    const z = 0.06 + row * 0.1;
    const [x0, y0] = proj(v, -0.6 + (i % 3) * 0.04, y, z);
    const [x1, y1] = proj(v, 0.6 - (i % 2) * 0.05, y, z);
    c.drawPath(segment(x0, y0, x1, y1), stroke(YARD.ink, 6));
    c.drawPath(segment(x0, y0, x1, y1), stroke(i % 2 ? YARD.pvc : YARD.pvcGrey, 4.2));
    c.drawPath(segment(x0 + 2, y0 - 1.2, x1 - 2, y1 - 1.2), stroke('#FFFFFF', 0.7, 0.25));
    c.drawCircle(x1, y1, 2.3, fill(YARD.ink));
    c.drawCircle(x1, y1, 1.5, fill(YARD.copperLight));
  }
  for (const t of [-0.3, 0.3]) {
    const [a, b] = proj(v, t, -0.25, 0.3);
    c.drawPath(rrect(a - 1.5, b - 2, 3, 12, 1), fill(YARD.hivis));
    c.drawPath(rrect(a - 1.5, b - 2, 3, 12, 1), stroke(YARD.ink, 0.7));
  }
}

/** Draws a manifest sprite as the world will (its frame, its drawScale), or nothing when it is missing. */
function sprite(c: SkCanvas, id: string, frame = 0, heading = 0): boolean {
  const e = MANIFEST.find((m) => m.id === id);
  if (!e) return false;
  c.save();
  const k = e.drawScale ?? 1;
  if (k !== 1) c.scale(k, k);
  e.draw(c, VIEW, Math.min(frame, e.frames.length - 1), heading);
  c.restore();
  return true;
}

/** The hero frame's world, camera at the layout's (wx, wy). Returns the platform display's printer slot in screen points. */
export function drawHeroWorld(c: SkCanvas, L: HeroLayout, T: TextFn): [number, number] {
  const v = VIEW;
  const camX = L.wx * v.ppm;
  const camY = L.wy * v.ppm * v.tilt;
  c.save();
  c.translate(-camX, -camY);
  const P = HERO_POINTS;
  const put = (x: number, y: number, draw: () => void) => {
    const [sx, sy] = proj(v, x, y, 0);
    at(c, sx, sy, draw);
  };
  // the ground: slabs (world/ground.ts's tile), then the ground sheet's decals
  drawConcrete(c, v, 33, 14, 27, 18, 5, true);
  const decal = (id: string, x: number, y: number, f = 0) => put(x, y, () => sprite(c, `ground.${id}`, f));
  decal('pad.strip', P.stripper[0], P.stripper[1] + 0.2);
  decal('pad.crucible', P.crucible[0] + 0.6, P.crucible[1] + 0.2);
  for (let x = 41.0; x < 51; x += 1.5) decal('line.ew', x, 21.6);
  for (let y = 22.6; y < 28; y += 1.5) decal('line.ns', 41.2, y);
  decal('hatch', 49.6, 27.9);
  decal('hatch', 51.1, 27.9);
  decal('oil', 50.6, 24.6, 0);
  decal('oil', 40.3, 23.4, 2);
  decal('puddle', 45.2, 27.6, 0);
  decal('puddle', 56.2, 26.2, 1);
  for (const [x, y, f] of [[41.6, 21.0, 0], [47.9, 28.1, 1], [39.5, 27.6, 2], [55.6, 21.9, 3], [44.6, 19.1, 1]] as const) decal('weeds', x, y, f);
  put(P.weighbridge[0], P.weighbridge[1], () => sprite(c, 'plant.weighbridge.deck'));
  // the pour's light on the pad, under everything that stands
  put(P.crucible[0] + 0.9, P.crucible[1] + 0.35, () => sprite(c, 'mark.light.pour'));

  const items: Item[] = [];
  const add = (x: number, y: number, draw: () => void) => items.push({ y, draw: () => put(x, y, draw) });
  const addS = (id: string, x: number, y: number, frame = 0, heading = 0) => add(x, y, () => sprite(c, id, frame, heading));
  // the bays (open south) with their heaps; the merchant's flatbed behind them, its crane over the wall
  addS('plant.bay', P.bays[0] - 2.6, P.bays[1]);
  addS('plant.heap.li', P.bays[0] - 3.3, P.bays[1] + 0.2);
  addS('plant.heap.appl', P.bays[0] - 1.9, P.bays[1] + 0.25);
  addS('plant.bay', P.bays[0] + 2.6, P.bays[1]);
  addS('plant.heap.ci', P.bays[0] + 2.0, P.bays[1] + 0.2);
  addS('plant.heap.ciu', P.bays[0] + 3.3, P.bays[1] + 0.25);
  add(P.merchant[0], P.merchant[1] - 1.6, () => drawFlatbed(c, v, Math.PI, { crane: 'lift', cargo: 'part' }));
  add(P.bays[0] - 2.6, P.bays[1] - 0.39, () => at(c, 0, -1, () => sprite(c, 'plant.plate.code')));
  // the scale house, its board facing the yard, and the scales
  addS('plant.scalehouse', P.scalehouse[0], P.scalehouse[1]);
  addS('plant.scale.platform', P.scale[0], P.scale[1]);
  addS('plant.weighbridge.pole', P.weighbridge[0] - 3.2, P.weighbridge[1] + 0.6);
  addS('plant.weighbridge.display', P.weighbridge[0] - 3.2, P.weighbridge[1] + 0.6);
  // the boss on the platform with a hand load of bare bright copper on the carry frame
  add(P.scale[0] - 0.1, P.scale[1] + 0.1, () => drawPerson(c, v, { dir: 's', pose: 'carry', look: BOSS, load: 'cu' }));
  // the stripper on its pad (tray full of bare bright), the cable bundle beside it
  addS('plant.stripper.hand', P.stripper[0], P.stripper[1], 3);
  add(P.bundle1[0] + 0.6, P.bundle1[1], () => {
    if (!sprite(c, 'thing.cable.bundle')) cableBundle(c, v);
  });
  add(P.stripper[0] - 1.4, P.stripper[1] - 1.0, () => drawCableDrum(c, v, 0.5, 0.55, 2));
  // the copper and brass stillages (the brass one held)
  const stillage = (x: number, y: number, g: string, full: boolean, hold = false) => {
    addS('plant.stillage', x, y);
    add(x, y + 0.01, () => {
      sprite(c, `plant.stillage.layer.${g}`);
      if (full) at(c, 0, STILLAGE_LAYER_DY, () => sprite(c, `plant.stillage.layer.${g}`));
    });
    addS('plant.stillage.front', x, y + 0.02);
    if (hold) addS('plant.flag.hold', x + 0.62, y + 0.5);
  };
  stillage(P.stillage_cu[0], P.stillage_cu[1], 'bb', true);
  stillage(P.stillage_cu[0] - 1.4, P.stillage_cu[1], 'no2', false);
  stillage(P.stillage_br[0], P.stillage_br[1], 'brs', true, true);
  stillage(P.stillage_br[0] - 1.4, P.stillage_br[1], 'bri', false);
  // the pour: furnace, mould under its lip, hood over it, the furnace hand in shield and apron, lit
  const FX = P.crucible[0];
  const FY = P.crucible[1];
  addS('plant.crucible.pour', FX, FY, 1);
  addS('plant.mould', FX + 0.77 * 1.2 + 0.25, FY + 0.36, 2);
  const [gx, gy] = proj(v, FX + 1.0, FY + 0.4, 0.5);
  items.push({ y: FY + 0.9, draw: () => lit(c, gx - camX + camX, gy, 80, YARD.glow, 0.5, () => put(FX - 0.9, FY + 0.9, () => drawPerson(c, v, { dir: 'e', pose: 'pour', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true }))) });
  add(FX, FY + 0.66, () => sprite(c, 'plant.hood'));
  // a notice board on posts by the weighbridge, and the extinguisher by the furnace pad
  addS('plant.extinguisher', FX - 1.9, FY - 0.9);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  c.restore();
  // the platform display's printer slot in screen points
  const e = MANIFEST.find((m) => m.id === 'plant.scale.platform');
  const s = e?.slots?.printer ?? { x: 0, y: 0, w: 0, h: 0 };
  const [ax, ay] = proj(v, P.scale[0], P.scale[1], 0);
  void T;
  return [ax - camX + s.x + s.w / 2, ay - camY + s.y + s.h / 2];
}

/** The hero frame with its interface: the weigh-in ticket out of the platform's post, the top bar and the goal. */
export function drawHero(c: SkCanvas, L: HeroLayout, T: TextFn): void {
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, fill(YARD.concrete));
  const [sx, sy] = drawHeroWorld(c, L, T);
  // the low sun from the west (ground.draw SUN_WASH, as the world draws it)
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, linear(0, 0, L.w, 0, [...SUN_WASH.colors], [...SUN_WASH.stops]));
  // the weigh-in ticket rises out of the indicator's slot (yard-stage1.md 4.4), in play print
  const p = TYPE.ticket + 1;
  const tw = ticketWidth(p);
  const th = ticketHeight(HERO_TICKET, p);
  // clamped inside the free world, beside its post (west of it, so the boss on the plate stays in view)
  const tx = Math.max(L.side, Math.min(L.w - L.side - tw, sx - tw - 46));
  const ty = Math.max(L.bar + L.goal + 6, Math.min(L.h - L.bottom - th, sy - th * 0.55));
  c.drawPath(segment(tx + tw - 4, ty + th * 0.6, sx - 10, sy - 2), stroke(YARD.ink, 1.2, 0.5));
  c.save();
  c.rotate(-2, tx + tw / 2, ty + th);
  drawTicket(c, tx, ty, HERO_TICKET, p);
  c.restore();
  risingLines(c, tx, ty + th - 2, tw);
  const y0 = 3;
  const ch = L.bar - 6;
  let x = L.side;
  cashChip(c, T, x, y0, L.cashW, ch, HERO_WORDS.cash);
  x += L.cashW + L.gap;
  ladderChip(c, T, x, y0, L.ladderW, ch, { rank: HERO_WORDS.rank, of: HERO_WORDS.of, next: HERO_WORDS.next, gap: HERO_WORDS.gap, progress: 0.2 });
  const right = L.w - L.side;
  clipboardButton(c, right - 44, y0, 44, ch);
  carryChip(c, T, right - 44 - L.gap - L.carryW - 20, y0, L.carryW + 20, ch, HERO_WORDS.carry);
  goalCard(c, T, L.side, L.bar + 4, 260, L.goal - 4, HERO_WORDS.goal, HERO_WORDS.goalTally, 0);
}
