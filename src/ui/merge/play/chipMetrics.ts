/**
 * The long-press chip's text metrics (spec 4.1 "Text"): two rows sized by hand from fontScale, whose
 * heights add up to the chip's, so nothing wraps or clips at fontScale 1.3. Pure (the layout test reads it).
 */
export const CHIP = { name: 13, worth: 11, padX: 10, padY: 5, gutter: 8, border: 1 } as const;

export function chipMetrics(fontScale: number): { name: number; worth: number; nameRow: number; worthRow: number; h: number } {
  const fs = Math.max(1, Math.min(1.5, fontScale));
  const name = Math.round(CHIP.name * fs);
  const worth = Math.round(CHIP.worth * fs);
  const nameRow = Math.ceil(name * 1.3);
  const worthRow = Math.ceil(worth * 1.3);
  return { name, worth, nameRow, worthRow, h: CHIP.padY * 2 + CHIP.border * 2 + nameRow + worthRow };
}

/** The chip's top for a cell whose centre is at y (half a cell `half`): above the cell, or below it when above would cover the street (its tickets and prices). */
export function chipTop(cy: number, half: number, h: number, boardY: number): number {
  const above = cy - half - 6 - h;
  return above >= boardY ? above : cy + half + 6;
}
