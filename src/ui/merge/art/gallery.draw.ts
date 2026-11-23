/**
 * The contact sheet of the art kit as pictures: what the dev view `merge-art` shows and what
 * scripts/art/merge-sheets.ts writes to PNG. Each piece at its real size and enlarged beside it,
 * labels in the kit's own letters; the goods as each chain's eight tiers in a row on the real board
 * colour at 47 and 51 pt cells; every section can be drawn in greyscale.
 */
import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';
import { MINDERS, drawCustomer, drawDragon, drawFirefly, drawMinder, drawTrailPiece } from './animals.draw';
import { drawGear, drawGearRail, drawShelfBadge, drawTill, drawWaitingPip } from './gear.draw';
import { GOOD_BOX, drawGood, drawTierPip } from './goods.draw';
import { drawLantern } from './lantern.draw';
import { drawLetters } from './letters';
import { LOADING_LANTERNS, drawLoadingScreen } from './loading.draw';
import { CHAIN_IDS, COATS, CUSTOMER_SPECIES, NIGHT, alpha } from './palette';
import { at, fill, grey, picture, rrect, stroke } from './pen';
import { PARTICLES, archHooks, drawGateLantern, drawLadder, drawLanternArch, drawParticle, drawRung, drawScroll, drawSeasonBoard, drawSeasonPiece } from './spokes.draw';
import { STALL_H, STALL_W, drawStallFront } from './stalls.draw';
import {
  FOLD_FRAMES,
  drawArmedRing,
  drawBasket,
  drawBoardBase,
  drawBrazier,
  drawCellTile,
  drawCoin,
  drawCounter,
  drawFestivalBanner,
  drawFilledStamp,
  drawFlyingLantern,
  drawGiftBag,
  drawLuckySpark,
  drawMatchGlow,
  drawPurse,
  drawShutter,
  drawStoneGate,
  drawStreet,
  drawTargetOutline,
  drawTicket,
  drawTicketFold,
  drawUndoChip,
} from './street.draw';

export interface Cell {
  label: string;
  /** Size of the piece's box in points, origin at the box centre. */
  w: number;
  h: number;
  draw: (c: SkCanvas) => void;
  /** Enlargement beside the real size (default 3; 0: real size only). */
  zoom?: number;
}

export interface Section {
  title: string;
  cells: Cell[];
}

const PAD = 10;
const LABEL = 6;

export interface SheetOptions {
  greyscale?: boolean;
}

function label(c: SkCanvas, text: string, x: number, y: number, size = LABEL, color: string = NIGHT.paperShade): void {
  drawLetters(c, text.toUpperCase(), x, y, { size, color, weight: 0.18 });
}

/** Lays a section out in rows `width` points wide; returns the picture and its height. */
export function sectionPicture(section: Section, width: number, o: SheetOptions = {}): { pic: SkPicture; height: number } {
  const placed: { cell: Cell; x: number; y: number }[] = [];
  let x = PAD;
  let y = PAD + 16;
  let rowH = 0;
  for (const cell of section.cells) {
    const z = cell.zoom ?? 3;
    const cw = cell.w + (z ? PAD + cell.w * z : 0);
    const ch = Math.max(cell.h, cell.h * z) + LABEL + 8;
    if (x + cw > width - PAD && x > PAD) {
      x = PAD;
      y += rowH + PAD;
      rowH = 0;
    }
    placed.push({ cell, x, y });
    x += cw + PAD * 2;
    rowH = Math.max(rowH, ch);
  }
  const height = y + rowH + PAD;
  const body = (c: SkCanvas) => {
    c.drawRect({ x: 0, y: 0, width, height }, fill(NIGHT.indigo));
    label(c, section.title, PAD, PAD, 8, NIGHT.amberSoft);
    for (const { cell, x: cx, y: cy } of placed) {
      const z = cell.zoom ?? 3;
      const big = Math.max(cell.h, cell.h * z);
      at(c, cx + cell.w / 2, cy + big / 2, 1, 0, cell.draw);
      c.drawRect({ x: cx, y: cy + big / 2 - cell.h / 2, width: cell.w, height: cell.h }, stroke(alpha(NIGHT.paperShade, 0.12), 0.5));
      if (z) {
        const zx = cx + cell.w + PAD;
        at(c, zx + (cell.w * z) / 2, cy + big / 2, z, 0, cell.draw);
        c.drawRect({ x: zx, y: cy, width: cell.w * z, height: cell.h * z }, stroke(alpha(NIGHT.paperShade, 0.12), 0.5));
      }
      label(c, cell.label, cx, cy + big + 4);
    }
  };
  const pic = picture({ x: 0, y: 0, w: width, h: height }, (c) => (o.greyscale ? grey(c, body) : body(c)));
  return { pic, height };
}

/**
 * Each chain's eight tiers in a row on the real board (tray, cell tiles), at `cell` points a cell:
 * the view the 47 pt gate is judged on. Returns its size; draws at the origin.
 */
export function drawGoodsBoard(c: SkCanvas, cell: number, o: SheetOptions & { pip?: boolean } = {}): { w: number; h: number } {
  const left = 58;
  const top = 18;
  const w = left + 8 * cell + 12;
  const h = top + 6 * cell + 12;
  const body = (q: SkCanvas) => {
    q.drawRect({ x: 0, y: 0, width: w, height: h }, fill(NIGHT.indigo));
    label(q, `${cell} PT CELLS`, 8, 5, 7, NIGHT.amberSoft);
    at(q, left, top, 1, 0, (k) => drawBoardBase(k, 8, 6, cell));
    for (let ch = 0; ch < 6; ch++) {
      label(q, CHAIN_IDS[ch], 6, top + ch * cell + cell / 2 - 3, 6);
      for (let k = 1; k <= 8; k++) {
        at(q, left + (k - 1) * cell + cell / 2, top + ch * cell + cell / 2, 1, 0, (z) => {
          drawCellTile(z, cell);
          at(z, 0, 0, cell / (GOOD_BOX * 2), 0, (g) => drawGood(g, ch, k, { pip: o.pip }));
        });
      }
    }
  };
  if (o.greyscale) grey(c, body);
  else body(c);
  return { w, h };
}

/** Every section of the kit, in order. */
export function gallerySections(): Section[] {
  return [goods(), gear(), stalls(), animals(), street(), board(), spokes(), loading()];
}

function goods(): Section {
  const cells: Cell[] = [];
  for (let ch = 0; ch < 6; ch++)
    for (let k = 1; k <= 8; k++) cells.push({ label: `${CHAIN_IDS[ch]} ${k}`, w: 48, h: 48, zoom: ch === 0 ? 2 : 0, draw: (c) => drawGood(c, ch, k) });
  for (let k = 1; k <= 8; k++) cells.push({ label: `PIP ${k}`, w: 34, h: 8, zoom: 2, draw: (c) => drawTierPip(c, k) });
  cells.push({ label: 'SILHOUETTE', w: 48, h: 48, zoom: 2, draw: (c) => drawGood(c, 2, 5, { silhouette: NIGHT.inkSoft, pip: false }) });
  return { title: 'Goods: the eight dressings', cells };
}

function gear(): Section {
  const cells: Cell[] = [];
  for (let ch = 0; ch < 6; ch++) cells.push({ label: `GEAR ${CHAIN_IDS[ch]}`, w: 48, h: 48, zoom: 2, draw: (c) => drawGear(c, ch) });
  cells.push({ label: 'GEAR RAIL', w: 180, h: 14, zoom: 0, draw: (c) => at(c, -90, 0, 1, 0, (q) => drawGearRail(q, 180, [25, 90, 155], [true, false, false])) });
  for (const n of [2, 6]) cells.push({ label: `SHELF +${n}`, w: 18, h: 12, zoom: 3, draw: (c) => drawShelfBadge(c, n) });
  cells.push({ label: 'WAITING', w: 12, h: 12, zoom: 3, draw: (c) => drawWaitingPip(c) });
  for (let k = 0; k < 5; k++) cells.push({ label: `TILL ${k}`, w: 16, h: 20, zoom: 2, draw: (c) => drawTill(c, k) });
  return { title: 'Gear, rail, shelf badge, waiting pip, till', cells };
}

function stalls(): Section {
  const cells: Cell[] = [];
  for (let ch = 0; ch < 6; ch++)
    for (const a of [0, 1, 2] as const) cells.push({ label: `${CHAIN_IDS[ch]} ${a}`, w: STALL_W, h: STALL_H, zoom: ch === 0 ? 2 : 0, draw: (c) => drawStallFront(c, ch, { awning: a }) });
  for (let ch = 0; ch < 6; ch++) cells.push({ label: `${CHAIN_IDS[ch]} SILK`, w: STALL_W, h: STALL_H, zoom: ch === 0 ? 2 : 0, draw: (c) => drawStallFront(c, ch, { awning: 1, silk: true }) });
  for (let ch = 0; ch < 6; ch++) cells.push({ label: `${CHAIN_IDS[ch]} CLOSED`, w: STALL_W, h: STALL_H, zoom: 0, draw: (c) => drawStallFront(c, ch, { closed: true }) });
  cells.push({ label: 'AT 52 PT', w: 52, h: 35, zoom: 0, draw: (c) => at(c, 0, 0, 52 / 60, 0, (q) => drawStallFront(q, 3, { awning: 2 })) });
  return { title: 'Stall fronts: 3 awnings, silk, closed', cells };
}

function animals(): Section {
  const cells: Cell[] = [];
  for (const sp of CUSTOMER_SPECIES) for (let k = 0; k < COATS; k++) cells.push({ label: `${sp} ${k}`, w: 54, h: 54, zoom: k === 0 ? 1.5 : 0, draw: (c) => drawCustomer(c, sp, k) });
  for (const m of MINDERS) cells.push({ label: m.name, w: 54, h: 54, zoom: 1.5, draw: (c) => drawMinder(c, m.chain) });
  cells.push({ label: 'PAPER DRAGON', w: 54, h: 54, zoom: 2, draw: (c) => drawDragon(c) });
  cells.push({ label: 'MINDER AT 18 PT', w: 20, h: 20, zoom: 0, draw: (c) => at(c, 0, 0, 18 / 53.3, 0, (q) => drawMinder(q, 0)) });
  cells.push({ label: 'FIREFLY', w: 34, h: 34, zoom: 2, draw: (c) => drawFirefly(c) });
  cells.push({ label: 'TRAIL', w: 12, h: 12, zoom: 3, draw: (c) => drawTrailPiece(c) });
  return { title: 'Animals: customers, minders, dragon, firefly', cells };
}

function street(): Section {
  const cells: Cell[] = [];
  cells.push({ label: 'STREET 375 X 156', w: 375, h: 156, zoom: 0, draw: (c) => at(c, -187.5, -78, 1, 0, (q) => drawStreet(q, 375, 156)) });
  cells.push({ label: 'COUNTER', w: 68, h: 12, zoom: 2, draw: (c) => at(c, -34, -5, 1, 0, (q) => drawCounter(q, 68)) });
  cells.push({ label: 'TICKET', w: 66, h: 100, zoom: 2, draw: (c) => at(c, -32, -48, 1, 0, (q) => drawTicket(q, 64, 96)) });
  cells.push({ label: 'PARADE TICKET', w: 66, h: 100, zoom: 0, draw: (c) => at(c, -32, -48, 1, 0, (q) => drawTicket(q, 64, 96, { gold: true })) });
  cells.push({ label: 'STAMP', w: 44, h: 44, zoom: 2, draw: (c) => drawFilledStamp(c, 18, 'FILLED') });
  cells.push({ label: 'STAMP PLAIN', w: 44, h: 44, zoom: 0, draw: (c) => drawFilledStamp(c, 18) });
  for (let f = 0; f < FOLD_FRAMES; f++) cells.push({ label: `FOLD ${f}`, w: 70, h: 100, zoom: 0, draw: (c) => drawTicketFold(c, f) });
  cells.push({ label: 'FLYING LANTERN', w: 30, h: 36, zoom: 2, draw: (c) => drawFlyingLantern(c) });
  cells.push({ label: 'BANNER', w: 52, h: 116, zoom: 1.5, draw: (c) => at(c, -26, -58, 1, 0, (q) => drawFestivalBanner(q, 52, 116)) });
  cells.push({ label: 'BANNER LIT', w: 52, h: 116, zoom: 0, draw: (c) => at(c, -26, -58, 1, 0, (q) => drawFestivalBanner(q, 52, 116, { lit: true })) });
  for (const look of ['lit', 'unlit', 'moon', 'gold'] as const) cells.push({ label: `LANTERN ${look}`, w: 24, h: 30, zoom: 2, draw: (c) => drawLantern(c, 7, { look }) });
  return { title: 'Street: backdrop and wire, counter, ticket, stamp, fold, banner', cells };
}

function board(): Section {
  const cells: Cell[] = [];
  cells.push({ label: 'CELL', w: 48, h: 48, zoom: 2, draw: (c) => drawCellTile(c, 48) });
  cells.push({ label: 'SHUTTER', w: 48, h: 48, zoom: 2, draw: (c) => drawShutter(c, 48) });
  cells.push({ label: 'NEXT SHUTTER', w: 48, h: 48, zoom: 2, draw: (c) => drawShutter(c, 48, { next: true }) });
  cells.push({ label: 'STONE GATE', w: 48, h: 48, zoom: 2, draw: (c) => drawStoneGate(c, 48) });
  cells.push({ label: 'BRAZIER', w: 48, h: 48, zoom: 2, draw: (c) => drawBrazier(c, 48) });
  cells.push({ label: 'BASKET', w: 48, h: 48, zoom: 2, draw: (c) => drawBasket(c) });
  cells.push({ label: 'UNDO', w: 58, h: 24, zoom: 2, draw: (c) => drawUndoChip(c) });
  cells.push({ label: 'GIFT BAG 3', w: 48, h: 48, zoom: 2, draw: (c) => drawGiftBag(c, 3) });
  cells.push({ label: 'GIFT BAG 4', w: 48, h: 48, zoom: 0, draw: (c) => drawGiftBag(c, 4) });
  cells.push({ label: 'LUCKY SPARK', w: 40, h: 40, zoom: 2, draw: (c) => drawLuckySpark(c) });
  cells.push({ label: 'COIN', w: 14, h: 14, zoom: 3, draw: (c) => drawCoin(c) });
  cells.push({ label: 'PURSE', w: 26, h: 26, zoom: 2, draw: (c) => drawPurse(c) });
  cells.push({ label: 'MATCH GLOW', w: 48, h: 48, zoom: 0, draw: (c) => { drawCellTile(c, 47); drawMatchGlow(c, 47); drawGood(c, 0, 2); } });
  cells.push({ label: 'TARGET', w: 48, h: 48, zoom: 0, draw: (c) => { drawCellTile(c, 47); drawTargetOutline(c, 47); } });
  cells.push({ label: 'ARMED', w: 48, h: 48, zoom: 0, draw: (c) => { drawCellTile(c, 47); drawGood(c, 1, 3); drawArmedRing(c, 47); } });
  return { title: 'Board: tiles, shutters, blocks, basket, undo, gift bag, spark, coin, purse, marks', cells };
}

function spokes(): Section {
  const cells: Cell[] = [];
  cells.push({ label: 'LADDER', w: 54, h: 300, zoom: 0, draw: (c) => at(c, -27, -150, 1, 0, (q) => drawLadder(q, 54, 300, ['found', 'found', 'found', 'next', 'unknown', 'unknown', 'unknown', 'unknown'])) });
  for (const s of ['found', 'next', 'unknown'] as const) cells.push({ label: `RUNG ${s}`, w: 60, h: 36, zoom: 1.5, draw: (c) => drawRung(c, 56, s, { best: s === 'found' }) });
  cells.push({
    label: 'LANTERN GATE',
    w: 300,
    h: 220,
    zoom: 0,
    draw: (c) =>
      at(c, -150, -110, 1, 0, (q) => {
        drawLanternArch(q, 300, 220);
        archHooks(300, 220).forEach((p, i) => at(q, p.x, p.y, 1, 0, (k) => drawGateLantern(k, i < 7)));
      }),
  });
  cells.push({ label: 'SCROLL', w: 160, h: 220, zoom: 0, draw: (c) => at(c, -80, -110, 1, 0, (q) => drawScroll(q, 160, 220)) });
  for (const s of ['rectangle', 'moongate', 'hearth'] as const) cells.push({ label: s, w: 76, h: 86, zoom: 0, draw: (c) => at(c, -35, -40, 1, 0, (q) => drawSeasonBoard(q, s, 10)) });
  for (let s = 0; s < 4; s++) cells.push({ label: `PIECE ${s}`, w: 48, h: 48, zoom: 1.5, draw: (c) => drawSeasonPiece(c, s) });
  for (const p of PARTICLES) cells.push({ label: p, w: 12, h: 12, zoom: 3, draw: (c) => drawParticle(c, p) });
  return { title: 'Spokes: ladder book, lantern gate, season scroll, pieces, particles', cells };
}

function loading(): Section {
  const cells: Cell[] = [];
  for (const p of [0.15, 0.6, 1]) cells.push({ label: `LOADING ${Math.round(p * LOADING_LANTERNS)}/${LOADING_LANTERNS}`, w: 188, h: 334, zoom: 0, draw: (c) => at(c, -94, -167, 0.5, 0, (q) => drawLoadingScreen(q, 375, 667, p, 'Lantern Row')) });
  return { title: 'Loading screen', cells };
}
