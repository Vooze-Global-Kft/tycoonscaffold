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
import { at, box, boxShadow, fill, linear, lit, proj, rrect, stroke, VIEW, type View3q } from './pen';
import { drawBrightCopper, drawCableDrum, drawHeap, drawIngot, drawRadiator, drawTapCrate, drawWasher } from './scrap.draw';
import { drawBay, drawContainer, drawFurnaceSet, drawPad, drawStripper, drawWeighDisplay, drawWeighbridgeDeck, FURNACE_SCALE } from './plant.draw';
import { drawConcrete, drawOilStain, drawPaintLine, drawPuddle, drawSkyline, drawWeeds } from './ground.draw';
import { cashChip, carryChip, clipboardButton, goalCard, ladderChip, padlockChip, priceTag, stick, ticketFromSlot, type TextFn, type Ticket } from './ui.draw';

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
  add(3.0, 6.5, () => drawPerson(c, v, { dir: 'e', pose: 'walk', frame: 1, look: crewLook(YARD.vestYardHand, 2), stack: [] }));
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
