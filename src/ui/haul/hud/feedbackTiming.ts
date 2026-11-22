/**
 * Timing shared by the warp-out's feedback (spec 4.3 credit glyphs): the glyphs fall from the warp
 * flash into the dock counter, and the counter's credits wait for them.
 */
/** From the warp-out to the first glyph leaving the flash. */
export const GLYPH_LEAD_MS = 80;
/** One glyph's fall (0.6 s). */
export const GLYPH_FALL_MS = 600;
/** Between two glyphs (credit_tick plays at most every 45 ms). */
export const GLYPH_GAP_MS = 50;
/** At most this many glyphs per warp-out. */
export const MAX_GLYPHS = 12;
