/**
 * Settings > Development (PLAN2 2.5, D102): the works' development rows, mounted by ../overlays/Settings.tsx only under
 * `__DEV__ && stageOn()` (never needing EXPO_PUBLIC_YARD_DEV). C-CARDSUI's STUB: the section's head only; the rows (the store
 * country, the dev save slots, the timer row) are MOD-TIMER's, then MOD-SLOTS'. Words: ../strings/dev.ts, rooms
 * ../rooms/dev.ts (re-exported below). A release build never reaches this file's rows (__DEV__ folds the mount away).
 */
import { SectionHead } from '../overlays/marketParts';

export { ROOMS } from '../rooms/dev';

export function DevRows() {
  return <SectionHead t={{ key: 'dev.section' }} />;
}
