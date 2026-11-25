/**
 * STAND-INS for the rules' card data of the market's cards (overlays-b's; src/engine/salvage/cards.ts
 * and the facade's `priceBoard` are the rules-book engineer's, and at 16:20 they still return a board
 * without Sell and a deal card without terms). Each function returns the rules' data UNCHANGED as soon
 * as it carries what the card needs; this file is deleted when the rules fill them (requests.md,
 * [overlays-b] rules-book).
 *
 * What a stand-in decides that the rules will decide instead (and may decide differently):
 * - the board's Sell on a held bay: grams = the bay's unreserved, not set-aside grams resolved down to
 *   0.1 kg, today's price, total roundMoney(kg × price) (2.8, 2.15 sell);
 * - the offered supply deal's terms: q and days from `deal.series[step]`, the price
 *   round(A_ci × (1 + premium)) with A_ci the mean of the last seven days' cast-iron prices (2.9).
 */
import * as R from '../../../engine/salvage';
import type { BoardRow, CardButton, DealTerms, PriceBoard, SalvageConfig, SalvageGame } from '../../../engine/salvage';

/** The board as the rules give it; a held row without Sell gets the stand-in Sell (only while no row of the rules' board has one). */
export function boardWithSell(cfg: SalvageConfig, g: SalvageGame, b: PriceBoard): PriceBoard {
  if (b.rows.some((r) => r.sell)) return b;
  return { ...b, rows: b.rows.map((r) => (r.held && !r.sell ? { ...r, sell: sellButton(b.day, r) } : r)) };
}

function sellButton(day: number, r: BoardRow): CardButton | null {
  const grams = Math.floor(Math.max(0, r.bay_g - r.reserved_g - r.aside_g) / 100) * 100;
  if (grams <= 0) return null;
  const total = R.roundMoney((grams / 1000) * r.price);
  return { label: { key: 'board.sellTotal', args: { x: { money: total } } }, action: { act: 'sell', grade: r.grade, shown: { day, price: r.price, grams } }, refusal: null };
}

/** The offered deal's terms (stand-in while cardOf's deal card is empty), or null when no deal is offered. */
export function offeredTerms(cfg: SalvageConfig, g: SalvageGame, now: number): DealTerms | null {
  const d = g.salvage.deal;
  if (d.step === null || (d.phase !== 'offered' && d.phase !== 'declined')) return null;
  if (d.q_g > 0 && d.days > 0 && d.price > 0) return { step: d.step, q_g: d.q_g, days: d.days, price: d.price };
  const s = cfg.salvage.deal.series[d.step];
  if (!s) return null;
  const day = R.marketDay(cfg, R.marketTime(g, now));
  const grade = cfg.salvage.deal.grade;
  let sum = 0;
  for (let k = 1; k <= 7; k++) sum += R.priceOf(cfg, grade, day - k);
  return { step: d.step, q_g: s.q_kg * 1000, days: s.days, price: R.roundMoney((sum / 7) * (1 + s.premium)) };
}
