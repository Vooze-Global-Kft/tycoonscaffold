/**
 * The merge mode's named icons for list rows, sheets and shared screens (spec 7.2: "beast:" names;
 * plus "art:" names for the kit's props), as `(canvas, size) => void` drawing centred on the origin
 * in a square of `size` points. MergeIcon.tsx turns them into cached images (never one canvas per
 * row). Pure Skia.
 *
 * beast:  <species>-<coat>     a CUSTOMER (coat 0..2): build it with `customerIcon(species, coat)`;
 *                              a customer is never a bare species name
 *         minder-<chain id>    a minder by stall: `minderIcon(chain)`; also <minder id> (oldbrindle,
 *                              pim, nettle, juniper, tansy, marlo)
 *         <species>            kept ONLY for game.json's minder portraits (`characters[].portrait`,
 *                              chains' `minder.beast`): badger, owl, hedgehog, otter, hare and bat
 *                              draw that species' MINDER; `beast:fox` draws the coat-0 fox customer;
 *                              `beast:raccoon` (an old game.json's Tansy, decision M38) draws the
 *                              hare (palette.ts BEAST_ALIASES)
 *         minder-<chain id>    a minder by stall; <minder id> (oldbrindle, pim, nettle, juniper, tansy, marlo)
 *         dragon, firefly
 * art:    good-<chain id>-<1..8>, gear-<chain id>, stall-<chain id>, coin, purse, basket, spark,
 *         giftbag-3, giftbag-4, new, stamp, lantern-lit, lantern-unlit, lantern-moon, ticket, shutter, season-<0..3>,
 *         book, gate, scroll, shop, awnings (the Blue Silk Awnings product), late-hours, quiet-evening, undo
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { BEAST_BOX, MINDERS, drawCustomer, drawDragon, drawFirefly, drawMinder } from './animals.draw';
import { drawGear } from './gear.draw';
import { GOOD_BOX, drawGood } from './goods.draw';
import { drawLantern } from './lantern.draw';
import { BEAST_ALIASES, CHAIN_IDS, COATS, CUSTOMER_SPECIES, NIGHT, alpha } from './palette';
import { at, circle, fill, glow, rrect, stroke, INK } from './pen';
import { drawBambooPole, drawRung, drawSeasonPiece } from './spokes.draw';
import { STALL_W, drawStallFront } from './stalls.draw';
import { drawBasket, drawCoin, drawFilledStamp, drawGiftBag, drawLuckySpark, drawNewTag, drawPurse, drawShutter, drawTicket, drawUndoChip } from './street.draw';

export type IconDraw = (c: SkCanvas, size: number) => void;

/** The icon name of a customer on a ticket: species from `merge.tickets.customers`, coat 0..2. */
export function customerIcon(species: string, coat: number): string {
  return `beast:${species}-${((coat % COATS) + COATS) % COATS}`;
}

/** The icon name of a stall's minder (chain index 0..5). */
export function minderIcon(chain: number): string {
  return `beast:minder-${CHAIN_IDS[((chain % 6) + 6) % 6]}`;
}

/** Fits a drawing made in a square of half size `half` into `size`. */
function fit(half: number, draw: (c: SkCanvas) => void, zoom = 1): IconDraw {
  return (c, size) => at(c, 0, 0, (size / (half * 2)) * zoom, 0, draw);
}

function build(): Record<string, IconDraw> {
  const I: Record<string, IconDraw> = {};
  const B = BEAST_BOX;
  // Animals.
  for (const sp of CUSTOMER_SPECIES) for (let k = 0; k < COATS; k++) I[`beast:${sp}-${k}`] = fit(B, (c) => drawCustomer(c, sp, k));
  for (const m of MINDERS) {
    const d = fit(B, (c) => drawMinder(c, m.chain));
    I[`beast:minder-${CHAIN_IDS[m.chain]}`] = d;
    I[`beast:${m.id}`] = d;
    I[`beast:${m.species}`] = d;
  }
  for (const [old, sp] of Object.entries(BEAST_ALIASES)) if (!I[`beast:${old}`] && I[`beast:${sp}`]) I[`beast:${old}`] = I[`beast:${sp}`];
  if (!I['beast:fox']) I['beast:fox'] = I['beast:fox-0'];
  I['beast:dragon'] = fit(B, drawDragon);
  I['beast:firefly'] = fit(17, (c) => drawFirefly(c));
  // Goods and gear.
  for (let c = 0; c < CHAIN_IDS.length; c++) {
    const id = CHAIN_IDS[c];
    for (let k = 1; k <= 8; k++) I[`art:good-${id}-${k}`] = fit(GOOD_BOX, (q) => drawGood(q, c, k));
    I[`art:gear-${id}`] = fit(GOOD_BOX, (q) => drawGear(q, c));
    I[`art:stall-${id}`] = fit(STALL_W / 2, (q) => drawStallFront(q, c, { awning: 1 }));
  }
  // Props.
  I['art:coin'] = fit(7, (c) => drawCoin(c, 6));
  I['art:purse'] = fit(13, (c) => drawPurse(c, 24));
  I['art:basket'] = fit(GOOD_BOX, (c) => drawBasket(c), 1.15);
  I['art:spark'] = fit(GOOD_BOX, (c) => drawLuckySpark(c, 14), 1.3);
  I['art:giftbag-3'] = fit(GOOD_BOX, (c) => drawGiftBag(c, 3), 1.1);
  I['art:giftbag-4'] = fit(GOOD_BOX, (c) => drawGiftBag(c, 4), 1.1);
  I['art:lantern-lit'] = fit(14, (c) => drawLantern(c, 7, { look: 'lit' }));
  I['art:lantern-unlit'] = fit(14, (c) => drawLantern(c, 7, { look: 'unlit' }));
  I['art:lantern-moon'] = fit(14, (c) => drawLantern(c, 7, { look: 'moon' }));
  I['art:ticket'] = fit(26, (c) => at(c, -17, -25.5, 0.53, 0, (q) => drawTicket(q, 64, 96)));
  I['art:shutter'] = fit(GOOD_BOX, (c) => drawShutter(c, 48));
  for (let s = 0; s < 4; s++) I[`art:season-${s}`] = fit(GOOD_BOX, (c) => drawSeasonPiece(c, s));
  I['art:undo'] = fit(30, (c) => drawUndoChip(c, 56, 22));
  I['art:new'] = fit(12, (c) => drawNewTag(c));
  I['art:stamp'] = fit(22, (c) => drawFilledStamp(c, 18));
  // Bottom row and shop.
  I['art:book'] = fit(24, (c) => {
    for (const x of [-12, 12]) at(c, x, -21, 1, 0, (q) => drawBambooPole(q, 42, 5, 14));
    for (const y of [-12, 1, 14]) at(c, 0, y, 1, 0, (q) => drawRung(q, 30, y === 14 ? 'found' : y === 1 ? 'next' : 'unknown', { r: 5.2 }));
  });
  I['art:gate'] = fit(24, (c) => {
    c.drawPath(circle(0, 6, 18), stroke(INK, 6));
    c.drawPath(circle(0, 6, 18), stroke(NIGHT.wood, 4));
    for (const [x, y, on] of [[-12, -3, true], [0, -8, true], [12, -3, false]] as const) at(c, x, y, 1, 0, (q) => drawLantern(q, 4.4, { look: on ? 'lit' : 'unlit', cord: 2 }));
  });
  I['art:scroll'] = fit(24, (c) => {
    c.drawPath(rrect(-14, -16, 28, 32, 2), fill(NIGHT.paper));
    c.drawPath(rrect(-14, -16, 28, 32, 2), stroke(INK, 1.2));
    for (const y of [-6, 0, 6]) c.drawPath(rrect(-9, y - 1, 18, 2, 1), fill(alpha(NIGHT.paperEdge, 0.7)));
    for (const y of [-17, 17]) {
      c.drawPath(rrect(-18, y - 3, 36, 6, 3), fill(NIGHT.wood));
      c.drawPath(rrect(-18, y - 3, 36, 6, 3), stroke(INK, 1));
    }
  });
  I['art:shop'] = fit(STALL_W / 2, (c) => drawStallFront(c, 4, { awning: 2, silk: true }), 1.05);
  I['art:awnings'] = fit(STALL_W / 2, (c) => drawStallFront(c, 1, { awning: 1, silk: true }), 1.05);
  I['art:late-hours'] = fit(20, (c) => {
    glow(c, 0, 0, 20, NIGHT.moon, 0.35);
    c.drawPath(circle(-2, -4, 11), fill(NIGHT.moon));
    c.drawPath(circle(3, -8, 10), fill(NIGHT.indigo));
    at(c, 8, 6, 1, 0, (q) => drawLantern(q, 5, { look: 'lit', cord: 2 }));
  });
  I['art:quiet-evening'] = fit(20, (c) => {
    c.drawPath(circle(0, 0, 18), fill(NIGHT.indigoMid));
    c.drawPath(circle(0, 0, 18), stroke(NIGHT.brass, 1.4));
    c.drawPath(circle(-3, -3, 8), fill(NIGHT.moon));
    c.drawPath(circle(1, -6, 7), fill(NIGHT.indigoMid));
    for (const [x, y] of [[8, -9], [10, 3], [-9, 9]] as const) c.drawPath(circle(x, y, 1), fill(NIGHT.white));
    at(c, 5, 8, 1, 0, (q) => drawLantern(q, 4, { look: 'lit', tassel: false }));
  });
  return I;
}

let cache: Record<string, IconDraw> | null = null;

/** Every named icon (built once on first use). */
export function mergeIcons(): Record<string, IconDraw> {
  if (!cache) cache = build();
  return cache;
}

/** Whether `name` has a drawing. */
export function hasMergeIcon(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(mergeIcons(), name);
}

/** All icon names, sorted (tests, README). */
export function mergeIconNames(): string[] {
  return Object.keys(mergeIcons()).sort();
}
