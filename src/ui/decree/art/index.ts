/**
 * High Office's art kit: everything a player sees that is not a face and not text, drawn in code
 * with Skia (palette "baize-and-ink", office-design.md 4.6), plus the cast (faces/, the cast
 * package's) re-exported for one import. The *.draw.ts files, pen.ts, letters.ts, palette.ts,
 * atlas.ts, icons.ts, measure.ts, gallery.draw.ts and mock.draw.ts are pure (no React) and run in
 * Node too; DecreeIcon.tsx and Gallery.tsx are React components (import them by path).
 * README.md lists every export, its size and its anchor point.
 */
export * from './palette';
export { LINE, LINE_W, picture, around, grey, flat, at, nibPath, sampleCurve, type Box } from './pen';
export { drawLetters, lettersWidth, lettersCover, type LetterStyle, type LetterOptions } from './letters';
export * from './clubs.draw';
export * from './effects.draw';
export * from './ministries.draw';
export * from './desk.draw';
export * from './paper.draw';
export * from './meta.draw';
export * from './wall.draw';
export * from './emblem.draw';
export { drawBustStandIn } from './standin.draw';
export { drawDeskMock, drawButtonGround, type MockOptions, type MockPaper } from './mock.draw';
export * from './atlas';
export { decreeIcons, decreeIconNames, hasDecreeIcon, resolveDecreeIcon, clubIcon, ministryIcon, monumentIcon, effectIcon, faceIcon, type IconDraw } from './icons';
export { brickShare, isBrick, isGreenRedPair, BRICK_MAX_SHARE, greyDistance, lumaOf } from './measure';
export { CAST, CAST_IDS, PLAYER_IDS, CUTOUT_IDS, drawBust, drawCutout, drawBand, lookOf, hasLook, type Look, type BustBox, type BustOptions } from './faces';
