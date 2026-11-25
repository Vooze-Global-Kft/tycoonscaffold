/** Phone twin of ./devOpen.web.ts: no development switches on a phone. */
import type { CardRef } from '../../../engine/salvage';
import type { OfficeTab } from './cardStack';

export function devCard(): { ref: CardRef; tab?: OfficeTab } | null {
  return null;
}

export function devFontScale(): number | null {
  return null;
}
