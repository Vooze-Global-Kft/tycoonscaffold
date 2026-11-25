/**
 * The proof picture (yard-style.md "The first screenshot"): the first yard as the game draws it, in the
 * three-quarter view at the ground work's scale, with the interface drawn in, at 844 x 390 or 667 x 375
 * points. It leads with copper (the stripper and its bright copper, the worker carrying copper onto
 * the weighbridge), the ticket (rising from the display) and the pour (the crucible on its pad), not a
 * truck (ruling 14). Composed only from the kit's drawings, sorted by footprint y as the world sorts
 * its sprites. Words are placeholders the caller can replace (names wait for the register).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { YARD } from './palette';
import { BOSS, crewLook, drawPerson } from './people.draw';
import { at, box, fill, proj, VIEW, type View3q } from './pen';
import { drawBrightCopper, drawCableDrum, drawCoil, drawHeap, drawIngot, drawRadiator, drawTapCrate, drawWasher } from './scrap.draw';
import { drawBay, drawContainer, drawFurnaceSet, drawPad, drawStripper, drawWeighDisplay, drawWeighbridgeDeck } from './plant.draw';
import { drawConcrete, drawOilStain, drawPaintLine, drawPuddle } from './ground.draw';
import { carryChip, cashChip, clipboardButton, drawTicket, goalCard, ladderChip, oneButton, padlockChip, priceTag, risingLines, stick, ticketHeight, TICKET_W, type TextFn, type Ticket } from './ui.draw';

export const PROOF_WORDS = {
  cash: '1,834',
  rank: '25th',
  of: 'of 26',
  next: 'Pennick Scrap',
  gap: '1.5 t',
  carry: '52/60 kg',
  goal: 'Strip cable into bare bright copper',
  goalTally: '18 / 20 kg',
  button: 'Open',
  price: '§35.00/kg',
  lockLabel: 'Motor bench',
  lockPrice: '§800',
  display: '52.4',
} as const;

export const PROOF_TICKET: Ticket = {
  yard: 'KETTLE LANE YARD',
  number: '000127',
  date: '25 NOV',
  lines: [
    { grade: 'BARE BRIGHT CU', net: '52.4 KG', price: '§35.00', amount: '§1,834.00', metal: 'copper' },
  ],
  total: '§1,834.00',
  stamp: ['ID CHECKED', 'PAID BY TRANSFER'],
};

interface Item {
  y: number;
  draw: () => void;
}

/** The yard of the proof, in world metres; drawn with the camera at (camX, camY) points. */
export function drawProofWorld(c: SkCanvas, v: View3q, camX: number, camY: number, T: TextFn): { display: [number, number]; lockAt: [number, number] } {
  c.save();
  c.translate(-camX, -camY);
  const put = (x: number, y: number, draw: () => void) => {
    const [sx, sy] = proj(v, x, y, 0);
    at(c, sx, sy, draw);
  };
  // the ground and its decals first
  drawConcrete(c, v, -1, -1, 24, 17, 7);
  drawPaintLine(c, v, 0.2, 10.9, 8.8, 10.9, 0.12, true);
  drawPaintLine(c, v, 8.6, 7.6, 8.6, 11.0, 0.12);
  drawPaintLine(c, v, 13.6, 7.6, 13.6, 11.0, 0.12);
  drawOilStain(c, v, 4.8, 9.9, 0.5, 3);
  drawOilStain(c, v, 14.4, 7.2, 0.35, 5);
  drawOilStain(c, v, 9.4, 6.9, 0.4, 8);
  drawPuddle(c, v, 7.5, 10.2, 0.8, 0.4, 2);
  drawPuddle(c, v, 15.6, 11.4, 1.1, 0.5, 6);
  put(17.6, 5.4, () => drawPad(c, v, 4.8, 3.0));
  put(19.3, 10.7, () => drawPad(c, v, 3.0, 2.2, true));
  put(11.0, 9.2, () => drawWeighbridgeDeck(c, v));

  const items: Item[] = [];
  const add = (x: number, y: number, draw: () => void) => items.push({ y, draw: () => put(x, y, draw) });
  for (const [i, x] of [1.5, 7.65, 13.8, 19.95].entries()) add(x, 0.9, () => drawContainer(c, v, [YARD.containerTeal, YARD.containerOxide, YARD.containerSage, YARD.containerTeal][i], { seed: i + 2 }));
  add(2.1, 4.1, () => drawHeap(c, v, 1.5, 1.0, 4));
  add(5.0, 4.3, () => drawCableDrum(c, v, 0.55, 0.6, 1));
  add(6.4, 4.6, () => drawCableDrum(c, v, 0.42, 0.5, 2));
  add(5.4, 5.6, () => drawCoil(c, v, 'cable', 0.36));
  add(8.6, 4.7, () => drawStripper(c, v, { running: true }));
  add(10.2, 5.7, () => {
    box(c, v, { len: 1.0, wid: 0.8, h: 0.14, color: YARD.wood, line: 1 });
    at(c, -10, -6, () => drawBrightCopper(c, v));
    at(c, 9, 2, () => drawBrightCopper(c, v));
    at(c, 0, -10, () => drawBrightCopper(c, v));
  });
  add(1.2, 6.4, () => drawWasher(c, v, 'whole', 1));
  add(2.5, 6.7, () => drawWasher(c, v, 'stripped', 2));
  add(3.9, 7.0, () => drawWasher(c, v, 'pieces', 3));
  add(1.7, 8.5, () => drawRadiator(c, v, 3));
  add(3.4, 8.9, () => drawTapCrate(c, v));
  add(6.3, 7.7, () => drawPerson(c, v, { dir: 'e', pose: 'carry', look: crewLook(YARD.vestYardHand), stack: ['light_iron', 'cast_iron', 'light_iron', 'light_iron'] }));
  add(10.4, 9.3, () => drawPerson(c, v, { dir: 'e', pose: 'carry', look: BOSS, stack: ['copper', 'copper', 'copper', 'copper', 'copper', 'copper'] }));
  add(12.7, 8.0, () => drawWeighDisplay(c, v, PROOF_WORDS.display));
  add(16.5, 5.1, () => drawFurnaceSet(c, v, 'pouring'));
  add(16.7, 7.5, () => drawPerson(c, v, { dir: 'e', pose: 'stand', look: crewLook(YARD.vestCutter), shield: true }));
  add(19.2, 6.3, () => {
    drawIngot(c, v, 'brass', 99, { ox: 0, oy: 0 });
    drawIngot(c, v, 'brass', 99, { ox: 0.02, oy: 0.25 });
    drawIngot(c, v, 'brass', 99, { ox: 0.01, oy: 0.12, z: 0.1, shadow: false });
    drawIngot(c, v, 'copper', 99, { ox: 0.65, oy: 0.15 });
  });
  add(1.3, 12.0, () => drawBay(c, v, 2.4, 2.0, { heap: ['light_iron', 'light_iron', 'hms'], code: 'FE', seed: 1 }));
  add(4.5, 12.0, () => drawBay(c, v, 2.4, 2.0, { heap: ['copper'], code: 'CU', hold: true, seed: 2 }));
  add(7.7, 12.0, () => drawBay(c, v, 2.4, 2.0, { heap: ['brass', 'brass', 'copper'], code: 'BR', seed: 3 }));
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  // world-anchored chips
  const [tx, ty] = proj(v, 9.9, 5.7, 1.3);
  priceTag(c, T, tx, ty, PROOF_WORDS.price, 'copper');
  const [lx, ly] = proj(v, 19.3, 10.7, 1.1);
  padlockChip(c, T, lx - 34, ly, PROOF_WORDS.lockLabel, PROOF_WORDS.lockPrice);
  c.restore();
  const [dx, dy] = proj(v, 12.7, 8.0, 2.0);
  return { display: [dx - camX, dy - camY], lockAt: [lx - camX, ly - camY] };
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
export const PROOF_667: ProofLayout = { w: 667, h: 375, side: 16, bottom: 16, bar: 34, goal: 26, cashW: 104, ladderW: 240, carryW: 76, gap: 12.75, camX: 176 };

/** The whole proof picture: world, HUD (top bar, goal card), the rising ticket, stick and button. */
export function drawProof(c: SkCanvas, L: ProofLayout, T: TextFn): void {
  const v = VIEW;
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, fill(YARD.concrete));
  const { display } = drawProofWorld(c, v, L.camX, 8, T);
  // the ticket rising out of the display, a little turned
  const k = L.w > 700 ? 0.84 : 0.8;
  const th = ticketHeight(PROOF_TICKET) * k;
  const tw = TICKET_W * k;
  const tx = display[0] - tw * 0.26;
  const ty = Math.max(L.bar + 8, display[1] - 40 - th);
  c.save();
  c.translate(tx + tw / 2, ty + th / 2);
  c.rotate(-3, 0, 0);
  c.scale(k, k);
  drawTicket(c, -TICKET_W / 2, -ticketHeight(PROOF_TICKET) / 2, PROOF_TICKET);
  c.restore();
  risingLines(c, tx + 4, ty + th + 2, tw - 8);
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
  // the stick (held, the knob pushed east) and the one button
  stick(c, L.side + 78, L.h - L.bottom - 50, 18, -6);
  oneButton(c, T, right - 30, L.h - L.bottom - 8 - 30, PROOF_WORDS.button);
}
