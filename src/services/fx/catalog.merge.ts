/**
 * The fx events of the merge mode (Night Market): spec section 6.2. The same format as ./catalog.ts,
 * read by scripts/lib/fxCatalog.js for a game of mode "merge" INSTEAD of ./catalog.ts: a merge game's
 * runtime table (`fxTable` in src/generated/activeGame.ts) holds these keys and no other, so no key
 * of another game can sound in it, and an event without a file in games/<id>/assets/sfx/ is silent
 * (`soundPack: null`).
 *
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 * FIRST VERSION by the skeleton: the keys of 6.2 with placeholder volumes, briefs from the
 * specification's table and the haptics of its third column. The sound package owns this file
 * from now on (volumes, minimum intervals, `preload`, `voices`, the briefs of
 * scripts/audio/recipes_night.py).
 *
 * `merge` has 8 files (merge_1 ... merge_8, `pick: 'ladder'`: the caller picks the tier).
 * `music_main` is the loop the shared player starts (src/services/fx/mix.ts MUSIC): the spring loop
 * until the sound package decides how `music_summer` takes over (6.2 names music_spring and
 * music_summer; the shared player knows only music_main).
 *
 * Keys may be added, never renamed or removed (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  merge: { brief: 'a steam puff growing in size and brightness with the tier; eight files, tier 1 to 8', files: 8, pick: 'ladder', volume: 0.5, minIntervalMs: 60, haptic: ['light'] },
  lucky: { brief: 'a second, brighter puff with a paper flutter', volume: 0.55, haptic: ['light'] },
  move: { brief: 'a cloth slide', volume: 0.35 },
  swap: { brief: 'a cloth slide, two ways', volume: 0.35 },
  return: { brief: 'a dull paper tap', volume: 0.3 },
  drop: { brief: 'a tiny charcoal crackle, quiet', volume: 0.2, minIntervalMs: 300 },
  line_fill: { brief: 'a paper tick', volume: 0.45, haptic: ['light'] },
  ticket_filled: { brief: 'a felt stamp and a paper fold', volume: 0.6, haptic: ['medium'] },
  coins: { brief: 'clay coins into a cloth pouch', volume: 0.5 },
  basket_sell: { brief: 'a basket rustle', volume: 0.45, haptic: ['light'] },
  undo: { brief: 'the basket rustle reversed', volume: 0.45, haptic: ['light'] },
  shutter_open: { brief: 'a shutter rolling up', volume: 0.55, haptic: ['medium'] },
  stall_open: { brief: 'an awning flap', volume: 0.6, haptic: ['medium'] },
  upgrade: { brief: 'a rising steam hiss', volume: 0.5, minIntervalMs: 50, haptic: ['light'] },
  minder_hire: { brief: 'a cloth bow', volume: 0.55, haptic: ['light'] },
  discovery: { brief: 'a brush stroke and a stamp', volume: 0.55, haptic: ['success'] },
  lantern_lit: { brief: 'a paper rustle and a flame catching', volume: 0.6, haptic: ['success'] },
  parade_arrive: { brief: 'a small hand drum roll', volume: 0.55 },
  giftbox_open: { brief: 'paper unfolding', volume: 0.55, haptic: ['light'] },
  slot_reveal: { brief: 'a crinkle per slot', volume: 0.5, voices: 2, haptic: ['light'] },
  festival_line: { brief: 'a low reed note', volume: 0.6, haptic: ['medium'] },
  festival_done: { brief: 'the one bell and a lantern swell', volume: 0.75, haptic: ['success'] },
  season_close: { brief: 'a reed swell and wind', volume: 0.75, haptic: ['light', 200, 'light', 200, 'medium', 300, 'success'] },
  ui_open: { brief: 'a paper slide', volume: 0.4 },
  ui_close: { brief: 'a paper slide, back', volume: 0.35 },
  ui_denied: { brief: 'a soft crumple', volume: 0.45, minIntervalMs: 300, haptic: ['light'] },
  music_main: { brief: 'the spring loop: 90 s at 72 bpm, low reed drone, bowed pad, hand drum, a distant crowd', volume: 0.35, loop: true },
  music_summer: { brief: 'the summer loop: the spring loop tinted, 90 s at 72 bpm', volume: 0.35, loop: true },
} as const satisfies Record<string, FxDef>;

export type MergeFxName = keyof typeof FX;
