/**
 * The fx events of the merge mode (Night Market, "Lantern Row"): spec section 6.2. The same format
 * as ./catalog.ts, read by scripts/lib/fxCatalog.js for a game of mode "merge" INSTEAD of
 * ./catalog.ts: a merge game's runtime table (`fxTable` in src/generated/activeGame.ts) holds these
 * keys and no other, so no key of another game can sound in it, and an event without a file in
 * games/<id>/assets/sfx/ is silent (`soundPack: null`).
 *
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 * First version by the skeleton (the keys and the shape); volumes, minimum intervals, `preload`,
 * `voices`, haptics and briefs by the sound package, from scripts/audio/recipes_night.py `EVENTS`
 * (the table the files in games/night-market/assets/sfx were rendered from;
 * `python3 scripts/audio/render_night.py --check` fails when the two disagree). Notes:
 * docs/design/market-audio-notes.md.
 *
 * - `merge` has 8 files (merge_1 ... merge_8, `pick: 'ladder'`: the caller picks the tier made,
 *   step = tier - 1, so merge_1 is never heard). Each is a steamer lid lifted by a puff of steam
 *   (a clay tok, a two-formant pff let out in chuffs as the lid rattles, a sizzle): tier k rattles
 *   k times, so the size is the length (0.1 to 0.65 s), the low body and the level (mastered 0.4 dB
 *   louder a tier); the brightness is the formants and the sizzle opening. Never up a scale (6.1;
 *   `render_night.py --ladder` measures it). At most one every 60 ms (6.2); three voices so a quick
 *   run overlaps instead of cutting. One file per tier: no variants yet (the shared player cannot
 *   pick a random variant of a ladder rung; requested).
 * - `drop` at most one every 300 ms (6.2): with four gears dropping every 5 s it is the sound heard
 *   most, so it is the quietest (volume 0.26, mastered 4 dB under the pack; its peaks hold it 1.7 dB under
 *   that, which the volume makes up).
 * - Haptics follow only what the finger did (6.2): none for drops, coins, the Parade, moves or the
 *   sheets. Patterns land on the sound's own accents (`render_night.py --accents`) and no pattern
 *   pulses faster than 8 a second. Across plays, the haptics service's own floor
 *   (src/services/fx/haptics.ts HAPTIC_MIN_GAP_MS = 120 ms, so up to 8.3 a second) is what holds
 *   `merge` and `line_fill` (60 ms floors) near 8 a second; 125 ms is requested. `lantern_lit` and
 *   `slot_reveal` are played from passive events with no haptic (src/modes/merge/fx.ts): lantern_lit
 *   vibrates only when the shared `mission_complete` is mapped onto it, slot_reveal only once the
 *   gift sheet plays it per slot (requested).
 * - Loudness: every file is mastered to the pack target plus a tier (moves, ticks, coins, the
 *   upgrade and the sheets 2 dB under; the merges from 2.4 dB under for tier 1 to 0.4 dB over for
 *   tier 8; ticket_filled 1 dB over; festival_done and season_close 2 dB over), then `volume` sets
 *   the mix: the rare peaks sit about 8 dB over the sounds heard twenty times a minute.
 * - `return` (a dull paper tap) is meant to be every button press too: the shared `ui_tap` and
 *   `ui_tab` should map onto it, not onto the sheet sound `ui_open` as src/modes/merge/soundKeys.ts
 *   still has them (change requested).
 * - `music_main` is the spring loop ("Lantern Dusk"), the one the shared player starts
 *   (src/services/fx/mix.ts MUSIC). `music_summer` ("Firefly Lane") is rendered and waits for a
 *   way to choose the loop per season (requested of the shared player; until then it is unplayed).
 *
 * Keys may be added, never renamed or removed (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  // --- the board: what the finger does many times a minute ---------------------------------------
  merge: { brief: 'a steamer lid lifted by a puff of steam: a clay tok, a two-formant pff let out in chuffs as the lid rattles (tier k rattles k times), a sizzle; grows in size and brightness with the tier, never up a scale; eight files, tier 1 to 8', files: 8, pick: 'ladder', volume: 0.5, preload: 1, voices: 3, minIntervalMs: 60, haptic: ['light'] },
  lucky: { brief: 'a second, brighter puff with a paper flutter', volume: 0.6, preload: 9, voices: 2, minIntervalMs: 120, haptic: ['light'] },
  move: { brief: 'a cloth rub (low cloth noise with a stick-slip)', volume: 0.35, preload: 2, voices: 2, minIntervalMs: 80 },
  swap: { brief: 'two cloth rubs crossing', volume: 0.38, preload: 6, voices: 2, minIntervalMs: 80 },
  return: { brief: 'a dull paper tap (meant for ui_tap too: every button press)', volume: 0.35, preload: 3, voices: 2, minIntervalMs: 80 },
  drop: { brief: 'a tiny charcoal crackle, quiet', volume: 0.26, preload: 5, voices: 2, minIntervalMs: 300 },

  // --- tickets and money (no bell on any money moment) --------------------------------------------
  line_fill: { brief: 'a paper tick', volume: 0.45, preload: 4, voices: 2, minIntervalMs: 60, haptic: ['light'] },
  ticket_filled: { brief: 'a felt stamp and a paper fold', volume: 0.7, preload: 7, voices: 2, minIntervalMs: 120, haptic: ['medium'] },
  coins: { brief: 'clay coins into a cloth pouch', volume: 0.45, preload: 8, voices: 2, minIntervalMs: 150 },
  basket_sell: { brief: 'a basket rustle', volume: 0.5, preload: 12, minIntervalMs: 150, haptic: ['light'] },
  undo: { brief: 'the basket rustle reversed', volume: 0.5, preload: 18, minIntervalMs: 150, haptic: ['light'] },

  // --- purchases --------------------------------------------------------------------------------
  shutter_open: { brief: 'a cane shutter rolling up', volume: 0.6, preload: 14, haptic: ['medium'] },
  stall_open: { brief: 'an awning flapping open', volume: 0.7, haptic: ['medium'] },
  upgrade: { brief: 'a rising steam hiss: a steamer coming to the boil, its lid rattling faster', volume: 0.5, preload: 10, voices: 3, minIntervalMs: 100, haptic: ['light'] },
  minder_hire: { brief: 'a cloth bow', volume: 0.6, haptic: ['medium'] },

  // --- the book, lanterns, the Parade, gift boxes ----------------------------------------------------
  discovery: { brief: 'a brush stroke and a stamp', volume: 0.6, preload: 13, minIntervalMs: 200, haptic: ['light', 160, 'success'] },
  lantern_lit: { brief: 'a paper rustle and a flame catching', volume: 0.65, haptic: ['light', 220, 'success'] },
  parade_arrive: { brief: 'a small hand drum roll', volume: 0.6 },
  giftbox_open: { brief: 'paper unfolding', volume: 0.6, haptic: ['light'] },
  slot_reveal: { brief: 'a crinkle per slot (a felt pat and a short crinkle)', volume: 0.55, preload: 17, voices: 3, minIntervalMs: 120, haptic: ['light'] },

  // --- the Festival and the season ------------------------------------------------------------------
  festival_line: { brief: 'a low reed note', volume: 0.65, preload: 16, haptic: ['medium'] },
  festival_done: { brief: 'the one bell and a lantern swell', volume: 0.8, haptic: ['success'] },
  season_close: { brief: 'a reed swell and wind (3 pulses)', volume: 0.85, haptic: ['light', 300, 'medium', 600, 'success'] },

  // --- sheets ---------------------------------------------------------------------------------------
  ui_open: { brief: 'a sheet unfolded: a fold click and three crinkle bursts, the first the loudest', volume: 0.4, preload: 11 },
  ui_close: { brief: 'the sheet folded away: two soft crinkles and the fold pressed shut', volume: 0.35, preload: 15 },
  ui_denied: { brief: 'a soft crumple', volume: 0.5, preload: 19, minIntervalMs: 300, haptic: ['light'] },

  // --- music ----------------------------------------------------------------------------------------
  music_main: { brief: 'the spring loop "Lantern Dusk": 90 s at 72 bpm, D dorian; low reed drone, bowed pad, hand drum, a distant crowd', volume: 0.35, loop: true },
  music_summer: { brief: 'the summer loop "Firefly Lane": 90 s at 72 bpm, G lydian; reed drone and reed song, bowed pad, a triplet hand drum, a nearer crowd, fireflies', volume: 0.35, loop: true },
} as const satisfies Record<string, FxDef>;

export type MergeFxName = keyof typeof FX;
