/**
 * Lantern Row's art kit: everything a player sees that is not text, drawn in code with Skia
 * (palette "lantern-night", spec 4.6). The *.draw.ts files, pen.ts, letters.ts, palette.ts,
 * atlas.ts, icons.ts, measure.ts, gallery.draw.ts and mock.draw.ts are pure (no React) and run in
 * Node too; MergeIcon.tsx and Gallery.tsx are React components (import them by path). README.md
 * lists every export, its size and its anchor point.
 */
export * from './palette';
export { INK, INK_W, picture, around, grey, flat, type Box } from './pen';
export { drawLetters, lettersWidth, lettersCover, type LetterStyle } from './letters';
export * from './goods.draw';
export * from './gear.draw';
export * from './lantern.draw';
export * from './stalls.draw';
export * from './animals.draw';
export * from './street.draw';
export * from './spokes.draw';
export * from './loading.draw';
export * from './atlas';
export { mergeIcons, mergeIconNames, hasMergeIcon, customerIcon, minderIcon, type IconDraw } from './icons';
export { redShare, isRed, greyDistance, lumaOf } from './measure';
