/**
 * Type sizes of the full-screen views and of the VIEWS package's sheets (spec 4.1, AGENTS.md): every
 * text is drawn with allowFontScaling={false} at a size set by hand from the phone's font scale,
 * capped at 1.3, so a box of fixed height (a tally row, a button, a scrapbook place) holds its words
 * at 1.3 on 375 x 667. Pure (no React).
 */

/** The font scale the views honour: the phone's, at most 1.3 (4.1). */
export function viewScale(fontScale: number): number {
  return Math.max(1, Math.min(fontScale || 1, 1.3));
}

/** A type size and its line height at scale `s` (line = size × 1.3, rounded up). */
export function type(base: number, s: number): { fontSize: number; lineHeight: number } {
  const fontSize = Math.round(base * s * 10) / 10;
  return { fontSize, lineHeight: Math.ceil(fontSize * 1.3) };
}

/** The smallest touch target (AGENTS.md: 44 pt, hit slop counts). */
export const TOUCH = 44;
