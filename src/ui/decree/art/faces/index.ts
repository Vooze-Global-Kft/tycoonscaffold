/**
 * The cast of the Republic of Middling, drawn in code (office-design.md 1.2, 4.5, 7.3): what the
 * props package (atlas.ts, DecreeIcon.tsx "face:<castId>", Gallery.tsx) and the screens import.
 * Pure Skia, no React. See README.md in this folder.
 */
export { CAST, CAST_IDS, CUTOUT_IDS, PART_COLUMNS, PLAYER_IDS, hasLook, lookOf, lookProblems, partsKey, type CastGroup, type Look } from './cast';
export { BUST_H, BUST_W, PHOTO, drawBust, drawBustLook, photoPath, type BustBox, type BustOptions } from './bust.draw';
export { BAND_H, BAND_W, CUTOUT_H, CUTOUT_W, drawBand, drawCutout } from './cutout.draw';
export {
  AGE_STEPS,
  BUST_CELL,
  CUTOUT_CELL,
  FACE_PAGES,
  PAD as FACE_PAD,
  PORTRAIT_INK,
  bakeFacePage,
  cutoutSpriteName,
  facePageSize,
  faceSpriteName,
  faceSprites,
  portraitSpriteName,
  type FacePage,
  type FacePageId,
  type FaceSprite,
} from './layout';
export { TONES, TONE_IDS, type ToneId } from './ink';
export { TONE_ROWS, castCell, castSheetSize, cutoutSheetSize, drawCastSheet, drawCutoutSheet, drawPortraitSheet, drawToneSheet, portraitSheetSize, toneSheetSize, type GridOpts } from './sheet.draw';
