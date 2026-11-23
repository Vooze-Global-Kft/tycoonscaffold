/**
 * A mock of the main screen drawn only from the kit, at the real zones of `mergeLayout` (spec 4.1):
 * the contact sheet's "mock screen" on which the red share is measured (4.6: under 10 %) and the
 * board's readability under 30 goods is judged. Bars are sketched (their text is the bars
 * package's); every picture is the kit's own. Pure Skia.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { mergeLayout, cellRect, COLS } from '../layout';
import { drawCustomer, drawDragon, drawMinder } from './animals.draw';
import { drawGearRail, drawShelfBadge, drawTill, drawWaitingPip } from './gear.draw';
import { GOOD_BOX, drawGood, drawTierPip } from './goods.draw';
import { drawLetters } from './letters';
import { NIGHT, alpha, type Species } from './palette';
import { INK, at, fill, rrect, stroke } from './pen';
import { STALL_BADGE, STALL_H, STALL_MINDER, STALL_PIP, STALL_TILL, STALL_W, drawStallFront } from './stalls.draw';
import { drawBambooPole, drawRung } from './spokes.draw';
import { drawLantern } from './lantern.draw';
import {
  bannerGrid,
  drawArmedRing,
  drawBasket,
  drawBoardBase,
  drawCellTile,
  drawCounter,
  drawFestivalBanner,
  drawMatchGlow,
  drawPurse,
  drawShutter,
  drawStreet,
  drawTick,
  drawTicket,
  shutterTag,
  ticketLayout,
} from './street.draw';

/** A board of 30 goods across the open cells (columns 0 to 5, rows 2 to 6) and a few shutters, for the mock. */
const MOCK_GOODS: [number, number][] = [
  [0, 1], [0, 1], [0, 2], [1, 2], [0, 3], [2, 1],
  [1, 1], [0, 2], [2, 2], [1, 3], [0, 4], [2, 1],
  [3, 1], [1, 1], [0, 5], [2, 3], [1, 4], [3, 2],
  [0, 6], [2, 4], [1, 2], [0, 1], [3, 1], [4, 1],
  [2, 5], [1, 6], [0, 7], [3, 3], [4, 2], [5, 8],
];

const CUSTOMERS: [Species, number][] = [['fox', 0], ['hedgehog', 1], ['otter', 2], ['badger', 0]];

function button(c: SkCanvas, x: number, y: number, w: number, h: number): void {
  c.drawPath(rrect(x + 1, y + 3, w - 2, h - 6, 10), fill(NIGHT.indigoLift));
  c.drawPath(rrect(x + 1, y + 3, w - 2, h - 6, 10), stroke(alpha(NIGHT.brass, 0.6), 1));
}

/** The mock main screen at w x h with the given safe-area insets. */
export function drawMainMock(c: SkCanvas, w: number, h: number, insets = { top: w > 380 ? 47 : 20, bottom: w > 380 ? 34 : 0 }): void {
  const L = mergeLayout(w, h, insets, 1);
  c.drawRect({ x: 0, y: 0, width: w, height: h }, fill(NIGHT.indigo));
  // Top bar: the purse and a season chip (sketched).
  const tb = L.topBar;
  at(c, 22, tb.y + tb.h / 2, 1, 0, (q) => drawPurse(q, 22));
  drawLetters(c, '1,240', 38, tb.y + tb.h / 2 - 7, { size: 14, color: NIGHT.paperLight, weight: 0.18 });
  c.drawPath(rrect(w - 170, tb.y + 9, 120, 22, 11), fill(NIGHT.indigoLift));
  c.drawPath(rrect(w - 170, tb.y + 9, 120, 22, 11), stroke(alpha(NIGHT.brass, 0.6), 1));
  c.drawPath(rrect(w - 40, tb.y + 8, 28, 24, 8), fill(NIGHT.indigoLift));
  // Goal line.
  c.drawPath(rrect(10, L.goalLine.y + 3, w - 20, 14, 7), fill(alpha(NIGHT.teal, 0.9)));
  c.drawPath(rrect(16, L.goalLine.y + 8, w * 0.5, 4, 2), fill(alpha(NIGHT.paperShade, 0.6)));

  // Street.
  const st = L.street;
  at(c, st.x, st.y, 1, 0, (q) => drawStreet(q, st.w, st.h, { band: 40, lanterns: 0 }));
  L.fronts.forEach((r, i) => {
    const s = r.w / STALL_W;
    const open = i < 3;
    at(c, r.x + r.w / 2, r.y + (STALL_H * s) / 2 + (r.h - STALL_H * s), s, 0, (q) => {
      drawStallFront(q, i, { awning: open ? ((i % 3) as 0 | 1 | 2) : 0, closed: !open });
      if (!open) return;
      at(q, STALL_MINDER.x, STALL_MINDER.y, STALL_MINDER.size / 53.3, 0, (k) => drawMinder(k, i));
      at(q, STALL_TILL.x, STALL_TILL.y, 0.8, 0, (k) => drawTill(k, i + 1));
      if (i === 1) at(q, STALL_BADGE.x, STALL_BADGE.y, 1, 0, (k) => drawShelfBadge(k, 3));
      if (i === 0) at(q, STALL_PIP.x, STALL_PIP.y, 1, 0, (k) => drawWaitingPip(k, 3.4));
    });
  });
  // Festival banner.
  const bn = L.banner;
  at(c, bn.x, bn.y, 1, 0, (q) => {
    drawFestivalBanner(q, bn.w, bn.h);
    const grid = bannerGrid(bn.w, bn.h);
    const lines: [number, number][] = [[0, 8], [1, 8], [2, 6], [4, 5]];
    lines.forEach(([ch, k], i) => {
      const g = grid[i];
      at(q, g.x + g.size / 2, g.y + g.size / 2, g.size / 48, 0, (z) => drawGood(z, ch, k, { pip: false }));
    });
  });
  // Counters: customers holding tickets.
  const cols = L.counters[4];
  cols.forEach((r, j) => {
    const tw = r.w - 4;
    const th = 96;
    const ty = r.y + r.h - th - 2;
    const parade = j === 3;
    at(c, r.x + r.w / 2, ty - 6, 0.82, 0, (q) => (parade ? drawDragon(q) : drawCustomer(q, CUSTOMERS[j][0], CUSTOMERS[j][1])));
    at(c, r.x, r.y + r.h - 10, 1, 0, (q) => drawCounter(q, r.w));
    at(c, r.x + 2, ty, 1, 0, (q) => {
      drawTicket(q, tw, th, { gold: parade });
      const TL = ticketLayout(tw, th);
      const lines: [number, number, boolean][][] = [[[0, 2, false]], [[0, 3, true], [1, 2, false]], [[1, 4, false], [0, 5, false], [2, 3, true]], [[0, 5, false], [1, 4, false], [2, 3, false]]];
      lines[j].forEach(([ch, k, done], i) => {
        const row = TL.rows[i];
        at(q, row.x + 13, row.y + row.h / 2, 24 / 48, 0, (z) => drawGood(z, ch, k, { pip: false }));
        drawTierPip(q, k, row.x + 27 + 9, row.y + row.h / 2, 0.85);
        if (done) at(q, row.x + row.w - 6, row.y + row.h / 2, 1, 0, (z) => drawTick(z, 9));
      });
      const p = TL.price;
      drawLetters(q, ['12', '58', '316', '1.2K'][j], p.x + p.w / 2, p.y + 3.6, { size: 8, color: NIGHT.ink, align: 'center', weight: 0.2 });
    });
  });

  // Board.
  const b = L.board;
  const cell = b.cell;
  at(c, b.x, b.y, 1, 0, (q) => drawBoardBase(q, 7, 8, cell));
  at(c, b.x, b.y - 4, 1, 0, (q) => drawGearRail(q, b.w, [cell * 0.5, cell * 3.5, cell * 6.5], [true, false, false]));
  let g = 0;
  for (let i = 0; i < 56; i++) {
    const r = cellRect(L, i);
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const open = col <= 5 && row >= 2 && row <= 6;
    at(c, r.x + r.w / 2, r.y + r.h / 2, 1, 0, (q) => {
      if (!open) {
        const next = row === 7 && col === 0;
        drawShutter(q, cell, { next });
        if (next) {
          const t = shutterTag(cell);
          drawLetters(q, 'GRILL 3', 0, t.y + 3, { size: 5.2, color: NIGHT.ink, align: 'center', weight: 0.2 });
          drawLetters(q, '30', 0, t.y + t.h - 9, { size: 6, color: NIGHT.ink, align: 'center', weight: 0.22 });
        }
        return;
      }
      drawCellTile(q, cell);
      if (g < MOCK_GOODS.length) {
        const [ch, k] = MOCK_GOODS[g++];
        if (row === 3 && col === 1) drawMatchGlow(q, cell);
        at(q, 0, 0, cell / (GOOD_BOX * 2), 0, (z) => drawGood(z, ch, k));
        if (row === 2 && col === 0) drawArmedRing(q, cell);
      }
    });
  }
  // Bottom row: the Basket and the four buttons with their icons.
  const bas = L.basket;
  button(c, bas.x, bas.y, bas.w, bas.h);
  at(c, bas.x + bas.w / 2, bas.y + bas.h / 2, 0.8, 0, (q) => drawBasket(q));
  L.buttons.forEach((r, i) => {
    button(c, r.x, r.y, r.w, r.h);
    at(c, r.x + r.w / 2, r.y + r.h / 2, 1, 0, (q) => {
      if (i === 0) {
        for (const x of [-8, 8]) at(q, x, -14, 1, 0, (k) => drawBambooPole(k, 28, 3.6, 9));
        for (const y of [-7, 2, 11]) at(q, 0, y, 1, 0, (k) => drawRung(k, 20, 'found', { r: 3.4 }));
      } else if (i === 1) at(q, 0, -2, 1, 0, (k) => drawLantern(k, 7, { look: 'lit', cord: 3 }));
      else if (i === 2) {
        q.drawPath(rrect(-10, -11, 20, 22, 2), fill(NIGHT.paper));
        q.drawPath(rrect(-10, -11, 20, 22, 2), stroke(INK, 1));
        for (const y of [-12, 12]) q.drawPath(rrect(-13, y - 2.4, 26, 4.8, 2.4), fill(NIGHT.wood));
      } else at(q, 0, 0, 0.36, 0, (k) => drawStallFront(k, 4, { awning: 1, silk: true }));
    });
  });
}
