/**
 * The proof picture (yard-style.md 10): the first yard as the game draws it, in the three-quarter view at
 * the ground work's scale, with the interface drawn in, at 844 x 390 or 667 x 375 points. It leads with
 * copper (cable drums, the stripper and its bare bright bundles at their posted price, the boss carrying
 * copper on the weighbridge), the ticket feeding out of the display's slot and the pour under its hood
 * (ruling 14), in a warm late-day light with the far yard past the fence. No truck. Composed only from
 * the kit's drawings, sorted by footprint y as the world sorts its sprites. Names come from the names
 * register (scripts/content/yard/names.json).
 */
import { BlendMode, ClipOp, Skia, type SkCanvas } from '@shopify/react-native-skia';
import { YARD } from './palette';
import { BOSS, crewLook, drawPerson } from './people.draw';
import { at, box, boxShadow, builder, fill, linear, lit, proj, radial, rrect, segment, stroke, VIEW, type View3q } from './pen';
import { drawBrightCopper, drawCableDrum, drawHeap, drawIngot, drawRadiator, drawTapCrate, drawWasher } from './scrap.draw';
import { drawBay, drawContainer, drawFurnaceSet, drawPad, drawStripper, drawWeighDisplay, drawWeighbridgeDeck, FURNACE_SCALE } from './plant.draw';
import { SUN_MULTIPLY, SUN_WASH, drawConcrete, drawFarYard, drawOilStain, drawPaintLine, drawPuddle, drawSkyline, drawWeeds } from './ground.draw';
import { drawBlock, drawFloodlight } from './site.draw';
import { flatbedLayers } from './manifest/people';
import { MANIFEST } from './manifest';
import { sevenSeg } from './letters';
import { STILLAGE_LAYER_DY } from './manifest/plant';
// The names register (read by id, never spelled here: join2, seam f). The proof sheet is drawn by the art scripts only.
import register from '../../../../scripts/content/yard/names.json';
import { cashChip, carryChip, clipboardButton, drawTicket, goalCard, ladderChip, padlockChip, priceTag, stick, ticketFromSlot, ticketHeight, ticketWidth, type TextFn, type Ticket } from './ui.draw';

const INK = YARD.ink;

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
// The hero frame of the first yard (yard-stage1.md 3 and S19; the judge's notes/art-judge.md): the working
// core as the world draws it, from the manifest's sprites, in a proud but crowded yard in late-day light.
// Back to front: the sky and the far yard over the back wall (containers, a scrap mountain, a handler's
// grab, a gantry), the yard's own containers and a floodlight; the old stock against the wall (E1: zone
// beds with the end-of-life car, a bath, radiators, washers, a bike); the merchant's flatbed loading its
// grab over a bay (S1); the bays, the stripper with its full tray, the copper and brass stillages (brass
// ingots strapped flat); the boss on the platform scale with a hand load of bare bright (S8) and the
// weigh-in ticket feeding out of the indicator's printer slot (no payment on it); the pour under its
// hood, its light 2 m across the slabs, the furnace hand in shield and apron (S11). Then the warm sun.
// Where the content map (content2 `map.points`) puts a place, it stands there; the back wall, the old
// stock row and the flatbed's stand are placed for this frame (notes/art-plant.md asks the map for them).
// =====================================================================================================

/** The content map's points the hero frame uses (metres; proto content2.json `map.points`). */
export const HERO_POINTS = {
  scale: [53.5, 23.0],
  weighbridge: [52.0, 26.5],
  scalehouse: [55.2, 20.4],
  bays: [48.5, 20.0],
  merchant: [47.4, 17.6],
  stillage_cu: [43.5, 22.5],
  stillage_br: [43.5, 25.0],
  stripper: [46.3, 23.6],
  bundle1: [47.6, 22.3],
  crucible: [37.0, 25.0],
  board: [48.0, 26.8],
} as const;

/** The back wall's line (metres, y of the blocks' centre) and the old stock row in front of it. */
export const HERO_WALL_Y = 15.2;

/** The caller's words in the hero frame (names from the names register by id: homeYard, merchant, rival.1). */
export const HERO_WORDS = {
  cash: '412',
  rank: '26th',
  of: 'of 26',
  next: (register as { byId?: Record<string, string> }).byId?.['rival.1'] ?? 'rival.1',
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
  lines: [{ grade: 'BARE BRIGHT CU', net: '28.6 KG', price: '', amount: '§35.50/KG', metal: 'copper' }],
  total: '',
  stamp: null,
  muted: ['TODAY', '§1,015.30'],
  legal: ['WEIGHED INTO BAYS', 'NOT YET SOLD'],
};

export interface HeroLayout extends ProofLayout {
  /** the world's x (metres) at the screen's left edge, and its y at the screen's top */
  wx: number;
  wy: number;
  /** the boss on the platform with the ticket out of its slot (844), or walking to it with the load (667) */
  moment: 'weigh' | 'walk';
}

export const HERO_844: HeroLayout = { ...PROOF_844, wx: 35.0, wy: 12.0, moment: 'weigh' };
export const HERO_667: HeroLayout = { ...PROOF_667, camX: 0, wx: 36.7, wy: 12.0, moment: 'walk' };

/** The hero ticket's print size (yard-style 8: 7 pt in play, 9 in store pictures; 8.5 keeps it clear of the boss). */
export const HERO_PRINT = 8.5;

/** Draws a manifest sprite as the world will (its frame, its drawScale, its tint), or nothing when it is missing. */
function sprite(c: SkCanvas, id: string, frame = 0, heading = 0, tint?: string): boolean {
  const e = MANIFEST.find((m) => m.id === id);
  if (!e) return false;
  c.save();
  const k = e.drawScale ?? 1;
  if (k !== 1) c.scale(k, k);
  if (tint) {
    const p = Skia.Paint();
    p.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(tint), BlendMode.Modulate));
    c.saveLayer(p);
  }
  e.draw(c, VIEW, Math.min(frame, e.frames.length - 1), heading);
  if (tint) c.restore();
  c.restore();
  return true;
}

/** The hero frame's world, camera at the layout's (wx, wy). Returns the platform indicator's printer slot in screen points. */
export function drawHeroWorld(c: SkCanvas, L: HeroLayout, T: TextFn): [number, number] {
  const v = VIEW;
  const camX = L.wx * v.ppm;
  const camY = L.wy * v.ppm * v.tilt;
  const P = HERO_POINTS;
  const sy = (y: number, z = 0) => proj(v, 0, y, z)[1] - camY;
  // ---- the far yard over the back wall (screen space): sky, skyline, the neighbour's stacks and cranes
  const wallFoot = sy(HERO_WALL_Y + 0.4);
  const wallTop = sy(HERO_WALL_Y - 0.4, 0.6);
  drawFarYard(c, -10, L.w + 20, 0, wallTop + 10, 4);
  c.save();
  c.translate(-camX, -camY);
  const put = (x: number, y: number, draw: () => void) => {
    const [px, py] = proj(v, x, y, 0);
    at(c, px, py, draw);
  };
  // ---- the ground from the wall's foot: slabs (world/ground.ts's tile), then the ground sheet's decals
  c.save();
  c.clipRect({ x: camX - 10, y: wallFoot + camY - 24, width: L.w + 20, height: L.h + 40 }, ClipOp.Intersect, true);
  drawConcrete(c, v, 33, HERO_WALL_Y - 1, 27, 15, 5, true);
  c.restore();
  const decal = (id: string, x: number, y: number, f = 0) => put(x, y, () => sprite(c, `ground.${id}`, f));
  decal('pad.strip', P.stripper[0], P.stripper[1] + 0.2);
  decal('pad.crucible', P.crucible[0] + 0.6, P.crucible[1] + 0.2);
  for (let x = 41.0; x < 51; x += 1.5) decal('line.ew', x, 21.7);
  for (let y = 22.6; y < 28; y += 1.5) decal('line.ns', 41.1, y);
  decal('hatch', 49.6, 27.9);
  decal('oil', 50.6, 24.6, 0);
  decal('oil', 40.3, 23.4, 2);
  decal('oil', 49.2, 18.9, 1);
  decal('puddle', 45.6, 27.0, 0);
  decal('puddle', 56.0, 25.8, 1);
  for (const [x, y, f] of [[41.6, 21.0, 0], [47.9, 28.1, 1], [39.5, 27.6, 2], [55.6, 22.1, 3], [44.9, 16.6, 1], [36.0, 16.5, 2], [50.6, 16.5, 0], [53.8, 16.4, 3], [39.9, 21.2, 1]] as const) decal('weeds', x, y, f);
  put(P.weighbridge[0], P.weighbridge[1], () => sprite(c, 'plant.weighbridge.deck'));
  // the pour's light on the pad and the slabs, 2 m round the mould (under everything that stands)
  {
    const [gx, gy] = proj(v, P.crucible[0] + 1.1, P.crucible[1] + 0.5, 0);
    const R = 2.2 * v.ppm;
    c.save();
    c.scale(1, v.tilt);
    c.drawCircle(gx, gy / v.tilt, R, radial(gx, gy / v.tilt, R, ['rgba(255,170,80,0.5)', 'rgba(255,182,96,0.22)', 'rgba(255,190,110,0)'], [0, 0.45, 1]));
    c.restore();
  }

  const items: Item[] = [];
  const add = (x: number, y: number, draw: () => void) => items.push({ y, draw: () => put(x, y, draw) });
  const addS = (id: string, x: number, y: number, frame = 0, heading = 0, tint?: string) => add(x, y, () => sprite(c, id, frame, heading, tint));
  // ---- the back wall and a floodlight
  // (the yard's own containers stand elsewhere on the map; here the far yard's stacks show over the wall)
  // one course of lock blocks: the far yard shows over it
  items.push({
    y: HERO_WALL_Y,
    draw: () => {
      for (let x = 33.2; x < 58; x += 0.8) put(x, HERO_WALL_Y, () => drawBlock(c, v, { seed: Math.round(x * 10) }));
    },
  });
  add(45.0, HERO_WALL_Y + 0.55, () => drawFloodlight(c, v));
  // ---- the old stock against the wall (E1): zone beds and whole things by tool tier
  add(38.4, 17.2, () => sprite(c, 'heap.zone3')); // a ground bed: drawn before the row
  items[items.length - 1].y -= 1.5;
  addS('thing.car', 38.3, 17.1, 0);
  addS('thing.tank', 35.4, 17.0, 0);
  add(42.6, 17.3, () => sprite(c, 'heap.zone2')); // a ground bed: drawn before the row
  items[items.length - 1].y -= 1.5;
  addS('thing.bath', 41.9, 16.9, 0);
  addS('thing.radiator', 43.6, 16.7, 0);
  addS('thing.radiator', 43.3, 17.6, 0);
  addS('thing.stove', 41.4, 17.9, 0);
  addS('thing.gate', 42.9, 16.1, 0);
  add(52.0, 17.2, () => sprite(c, 'heap.zone1')); // a ground bed: drawn before the row
  items[items.length - 1].y -= 1.5;
  addS('thing.washer', 50.9, 16.8, 0);
  addS('thing.washer', 51.7, 16.6, 0);
  addS('thing.washer', 52.9, 17.0, 1);
  addS('thing.bike', 52.2, 17.9, 0);
  addS('thing.cable.drum', 53.5, 17.5);
  addS('thing.taps', 50.6, 17.8);
  // ---- the bays (open south) with their heaps; the merchant's flatbed behind them, its grab over the west bay
  addS('plant.bay', P.bays[0] - 2.6, P.bays[1]);
  addS('heap.li.4', P.bays[0] - 3.4, P.bays[1] + 0.25);
  addS('heap.appl.3', P.bays[0] - 1.8, P.bays[1] + 0.35);
  addS('plant.bay', P.bays[0] + 2.6, P.bays[1]);
  addS('heap.ci.4', P.bays[0] + 1.9, P.bays[1] + 0.25);
  addS('heap.ciu.2', P.bays[0] + 3.4, P.bays[1] + 0.35);
  add(P.bays[0] - 2.6, P.bays[1] - 0.39, () => at(c, 0, -1, () => sprite(c, 'plant.plate.code')));
  add(P.bays[0] + 2.6, P.bays[1] - 0.39, () => at(c, 0, -1, () => sprite(c, 'plant.plate.code')));
  add(P.merchant[0], P.merchant[1], () => {
    for (const l of flatbedLayers(1, { crane: 0, cargo: 'part' })) at(c, l.dx, l.dy, () => sprite(c, l.id, l.frame, l.heading));
  });
  // the scale house, its board facing the yard, and the scales
  addS('plant.scalehouse', P.scalehouse[0], P.scalehouse[1]);
  addS('plant.scale.platform', P.scale[0], P.scale[1], L.moment === 'weigh' ? 1 : 0);
  // the boss: on the platform with a hand load of bare bright on the carry frame (S8), or walking to it
  if (L.moment === 'weigh') add(P.scale[0] - 0.15, P.scale[1] + 0.15, () => drawPerson(c, v, { dir: 'w', pose: 'carry', look: BOSS, load: 'cu' }));
  else add(50.4, 23.9, () => drawPerson(c, v, { dir: 'e', pose: 'walk', frame: 1, look: BOSS, load: 'cu' }));
  // the stripper on its pad (tray full of bare bright), the yard hand feeding it, cable to strip beside it
  addS('plant.stripper.hand', P.stripper[0], P.stripper[1], 3);
  add(P.stripper[0] - 0.45, P.stripper[1] + 0.55, () => drawPerson(c, v, { dir: 'e', pose: 'feed', look: crewLook(YARD.vestYardHand, 2) }));
  addS('thing.cable.bundle', P.bundle1[0], P.bundle1[1], 0);
  addS('thing.cable.drum', 45.3, 22.1);
  // the copper and brass stillages (the brass one held); brass ingots strapped flat beside the mould
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
  // ---- the pour: furnace, mould under its lip, hood over it, the furnace hand in shield and apron, lit
  const FX = P.crucible[0];
  const FY = P.crucible[1];
  addS('plant.crucible.pour', FX, FY, 1);
  addS('plant.mould', FX + 0.77 * 1.2 + 0.25, FY + 0.36, 2);
  const [gx, gy] = proj(v, FX + 1.0, FY + 0.4, 0.5);
  items.push({ y: FY + 0.9, draw: () => lit(c, gx, gy, 90, YARD.glow, 0.55, () => put(FX - 0.9, FY + 0.9, () => drawPerson(c, v, { dir: 'e', pose: 'pour', look: crewLook(YARD.vestCutter, 3), shield: true, apron: true }))) });
  add(FX, FY + 0.66, () => sprite(c, 'plant.hood', 0));
  addS('plant.extinguisher', FX - 1.7, FY - 0.9);
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  c.restore();
  void T;
  // the platform indicator's printer slot in screen points; its LED window shows the same kilograms as the ticket
  const e = MANIFEST.find((m) => m.id === 'plant.scale.platform');
  const s = e?.slots?.printer ?? { x: 0, y: 0, w: 0, h: 0 };
  const [ax, ay] = proj(v, P.scale[0], P.scale[1], 0);
  const d = e?.slots?.digits;
  if (d && L.moment === 'weigh') {
    c.drawRect({ x: ax - camX + d.x + 1, y: ay - camY + d.y + 1, width: d.w - 2, height: d.h - 2 }, fill(YARD.ledCase));
    sevenSeg(c, HERO_WORDS.display, ax - camX + d.x + d.w - 3, ay - camY + d.y + 2, d.h - 4, YARD.led, YARD.ledOff);
  }
  return [ax - camX + s.x + s.w / 2, ay - camY + s.y + s.h / 2];
}

/**
 * The weigh-in ticket feeding out of the indicator's slot at (sx, sy): a curl of paper from the slot runs
 * west and opens into the ticket hanging clear of the boss on the plate (yard-style 8: always tied to its
 * printer). Returns the ticket's box.
 */
function ticketOutOfSlot(c: SkCanvas, L: HeroLayout, sx: number, sy: number): void {
  const p = HERO_PRINT;
  const tw = ticketWidth(p);
  const th = ticketHeight(HERO_TICKET, p);
  const tx = Math.max(L.side, sx - 70 - tw);
  const ty = Math.max(L.bar + L.goal + 6, Math.min(L.h - L.bottom - th, sy - 40));
  // the paper from the slot: a tongue that widens and bends down-west into the ticket's top edge
  const strip = builder()
    .moveTo(sx - 8, sy)
    .quadTo(sx - 26, sy + 10, tx + tw - 44, ty + 3)
    .lineTo(tx + tw - 6, ty + 3)
    .quadTo(sx - 8, sy + 14, sx + 8, sy)
    .close()
    .build();
  c.drawPath(strip, fill(YARD.paperShade));
  c.drawPath(strip, stroke(YARD.paperLine, 0.9));
  c.save();
  c.rotate(-2, tx + tw / 2, ty);
  c.drawPath(rrect(tx + 3, ty + 4, tw, th, 2), fill(INK, 0.22));
  drawTicket(c, tx, ty, HERO_TICKET, p);
  c.restore();
}

/** The hero frame with its interface: the weigh-in ticket out of the platform's indicator, the top bar and the goal. */
export function drawHero(c: SkCanvas, L: HeroLayout, T: TextFn): void {
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, fill(YARD.concrete));
  const [sx, sy] = drawHeroWorld(c, L, T);
  // the low sun from the west: the world's wash, then the screenshot's warm multiply (yard-style 4)
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, linear(0, 0, L.w, 0, [...SUN_WASH.colors], [...SUN_WASH.stops]));
  const m = linear(0, 0, L.w, L.h * 0.3, [...SUN_MULTIPLY.colors], [...SUN_MULTIPLY.stops]);
  m.setBlendMode(BlendMode.Multiply);
  c.drawRect({ x: 0, y: 0, width: L.w, height: L.h }, m);
  if (L.moment === 'weigh') ticketOutOfSlot(c, L, sx, sy);
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
