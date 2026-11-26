/**
 * WHAT THE WORLD DRAWS OF THE MONEY (stage 2, yard-stage2.md 2.15.1, 4.1.3, 4.5, P6, P7): the chosen looks
 * (colour, dressing, plaque, sign: `iap.looks`, which no rule reads), the financed plate's bank ring (taken ÷ T,
 * no amount, not a debt display), and whether a debt is on screen for the hud (`debtOnScreen`: a card's
 * `showsDebt` or a ticket's bank line; the hud hides the bottom bar's ad button while it holds). Owner:
 * rules-money. frame.ts `frameCfg` is the closed dispatcher: it hands the first yard's table here to ADD these
 * fields after frameWorks.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { bankRow } from './bank';
import type { FrameTable, SalvageGame } from './types';

/** Add the money's fields to the frame `f` of game g: the looks (stage 2 only: a state with `iap`), each works plate's bank ring. */
export function frameMoney(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  void c;
  const iap = g.salvage.iap;
  if (iap && Object.values(iap.looks).some((v) => v !== null)) f.looks = { ...iap.looks };
  if (f.works) for (const w of f.works) w.bankRing = bankRow(g, w.plate)?.ring ?? null;
}

/**
 * A debt is on screen (4.1.3): some card or ticket up shows a debt (CardData.showsDebt, TicketView.showsDebt).
 * The hud hides the bottom bar's ad button while it holds; no shop entry and no ad button are on such a card.
 * The world's tag and ring are not a debt display (P7): a financed plate in view never makes this true.
 */
export function debtOnScreen(up: readonly { showsDebt?: boolean }[]): boolean {
  return up.some((x) => !!x.showsDebt);
}
