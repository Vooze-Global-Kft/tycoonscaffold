/**
 * A bay's card (yard-stage1.md 4.3: "a bay opens the board at its row"). The rules route `{kind:'bay',
 * grade}` to the board's card with `focus` set (cards.ts), so the bay's card IS the price board, its
 * row first and marked: Hold, Sell with its total, the five days and the bay's stock in one place.
 */
import type { CardViewProps } from './OverlayHost';
import { PriceBoard } from './PriceBoard';

export function Bay(p: CardViewProps) {
  return <PriceBoard {...p} />;
}
