/**
 * WHAT THE WORLD DRAWS OF THE MONEY (stage 2, yard-stage2.md 2.15.1, 4.5, P7): the chosen looks (colour,
 * dressing, plaque, sign), the financed plate's bank ring (taken ÷ T, no amount), and whether a debt is on
 * screen for the hud (a card's `showsDebt`, a ticket's bank line, an away card's bank: the hud ORs them).
 * Owner: rules-money (Phase B). frame.ts `frameCfg` is the closed dispatcher (s2a-fix, the lead's ruling of
 * 26 Nov 09:50): it hands the first yard's table here to ADD these fields after frameWorks.
 *
 * PHASE A STUB: adds nothing.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { FrameTable, SalvageGame } from './types';

/** Add the money's fields to the frame `f` of game g. Stub: nothing. */
export function frameMoney(c: SalvageContent, g: SalvageGame, f: FrameTable): void {
  void c;
  void g;
  void f;
}
