/**
 * The fx events of the decree mode (High Office, "Proudly Adequate"): spec section 6. The same format
 * as ./catalog.ts, read by scripts/lib/fxCatalog.js for a game of mode "decree" INSTEAD of
 * ./catalog.ts: a decree game's runtime table (`fxTable` in src/generated/activeGame.ts) holds these
 * keys and no other, so no key of another game can sound in it, and an event without a file in
 * games/high-office/assets/sfx/ is silent (`soundPack: null`).
 *
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 * First version by the skeleton (the keys and the shape); volumes, minimum intervals, files, `pick`,
 * `preload`, `voices`, haptics and briefs by the sound package, from scripts/audio/recipes_office.py
 * `EVENTS` and `FILES` (the table the files in games/high-office/assets/sfx are rendered from;
 * `python3 scripts/audio/render_office.py --check` fails when the two disagree). Notes:
 * docs/design/office-audio-notes.md.
 *
 * - The two sounds heard hundreds of times an hour, signing (`sign_ink` from 40 pt, then `sign`) and
 *   the drawer (`study`), have three files each (`pick: 'random'`), so fifty in a row are never one
 *   copy fifty times; signing is bright and short (a nib, card stock on a wire tray), the drawer low
 *   and woody (a creak, the runners, a hollow thunk), told apart with the screen off
 *   (`render_office.py --tell`).
 * - Haptics follow only what the thumb did and the rare peaks (spec 6): none for arrivals, slips,
 *   clippings, envelopes, tallies, a lost district, a boycott that ends on its own or the sheets. No
 *   pattern has more than one pulse. Across plays the haptics service's floor (HAPTIC_MIN_GAP_MS 120
 *   ms, src/services/fx/haptics.ts) holds light pulses to 8.3 a second at most; a HEAVIER pulse is
 *   not held by it (PatternPlayer.play waits 0 ms when its pulse outweighs the last one). So one
 *   fast flick (spec 4.3: committed at 48 pt) gives `sign_ink`'s light pulse at 40 pt and `sign`'s
 *   medium 10 to 50 ms later, two pulses almost together. The desk (src/modes/decree/actions.ts)
 *   is asked to play `sign_ink` with `{ haptic: false }` when the commit comes within 120 ms of the
 *   40 pt crossing (requests.md); until it does, that is the one place the rate goes past 8 a
 *   second, for one pair. `district_held` (success) has a 300 ms floor (spec 6: success pulses at
 *   least 300 ms apart); election night calls a district every 2.5 s (every 625 ms when tapped).
 * - `majority` and `defeat` are .m4a stings (eight bars of "The Middling March" are about 9 s: a
 *   .wav would cost 800 KB); every other effect is a .wav.
 * - `music_main` is spec 6's music_desk ("Minutes of the Previous Meeting"), the loop the shared
 *   player starts (src/services/fx/mix.ts MUSIC). `music_campaign` ("The Middling March") waits
 *   for a way to choose the loop during the run-up (requested of the shared player).
 * - The shared keys the store plays map onto these in src/modes/decree/soundKeys.ts (the map is in
 *   recipes_office.py SHARED_SOUNDS and the notes); `ui_tap` and `ui_tab` stay silent on purpose.
 *
 * Keys may be added, never renamed or removed (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  // --- the desk: what the thumb does hundreds of times an hour ----------------------------------------
  sign_ink: { brief: 'the steel nib signing from 40 pt: a 180 ms soft mid scratch whose pressure grows; three files (three nib pitches), random', files: 3, pick: 'random', volume: 0.35, preload: 1, minIntervalMs: 250, haptic: ['light'] },
  sign: { brief: 'signed: card stock into the wire out-tray, the brass wires clinking (bright, short); three files, random', files: 3, pick: 'random', volume: 0.5, preload: 2, voices: 2, minIntervalMs: 150, haptic: ['medium'] },
  study: { brief: 'for further study: the wooden drawer creaking, sliding on its runners, a hollow thunk at its stop (low, woody); three files (three drawers, +-2 semitones), random', files: 3, pick: 'random', volume: 0.5, preload: 3, voices: 2, minIntervalMs: 150, haptic: ['medium'] },
  take_back: { brief: 'taken back: one wire lifted, the paper laid back on the desk', volume: 0.45, preload: 7, minIntervalMs: 150, haptic: ['light'] },
  denied: { brief: 'not enough in the treasury: one dull knuckle tap on the desk, the pen rattling on it', volume: 0.5, preload: 8, minIntervalMs: 300, haptic: ['light'] },

  // --- arrivals (no haptic: nothing the thumb did) ----------------------------------------------------
  paper_arrive: { brief: 'a visitor: two knocks on the panelled door, the glass pane answering, their paper laid on the desk; two files, random', files: 2, pick: 'random', volume: 0.3, preload: 5, minIntervalMs: 5000 },
  slip_arrive: { brief: 'the Treasury Clerk\'s slip slid slowly across the baize in one push and laid flat', volume: 0.35, preload: 4, minIntervalMs: 800 },

  // --- the Ledger and the cabinet ---------------------------------------------------------------------
  buy_level: { brief: 'a level: the nib ticks the Ledger, a heavy brass token set down on the blotter and settling (no till, no bell)', volume: 0.45, preload: 6, voices: 2, minIntervalMs: 125, haptic: ['light'] },
  open_ministry: { brief: 'a ministry opens: a brass latch thrown, a tuba blat from the corridor', volume: 0.6, haptic: ['medium'] },
  appoint: { brief: 'a minister appointed: a press camera, shutter and film-advance ratchet', volume: 0.6, haptic: ['light'] },
  storey: { brief: 'a new storey: a brass hand bell swung twice (F5), a tuba under it', volume: 0.65, haptic: ['success'] },
  ribbon: { brief: 'a ribbon cut: scissors, the ribbon parting, a clarinet flourish', volume: 0.6, haptic: ['light'] },

  // --- boycotts, scandals, clippings ------------------------------------------------------------------
  boycott_start: { brief: 'a club walks out: a wordless kazoo chant of three kazoos, a bass drum', volume: 0.6, haptic: ['medium'] },
  boycott_end: { brief: 'the boycott ends: a door unlatched and swinging open on its hinge', volume: 0.55 },
  scandal: { brief: 'the front page: a newspaper slapped down, a muted trombone\'s "oh dear"', volume: 0.65, haptic: ['heavy'] },
  clipping: { brief: 'a clipping: two snips and the clipping pressed onto the page', volume: 0.45, minIntervalMs: 300 },

  // --- the election -----------------------------------------------------------------------------------
  call_election: { brief: 'the election called: the gavel, twice', volume: 0.65, haptic: ['medium'] },
  env_open: { brief: 'an envelope opened: a snare roll swelling into one stroke', volume: 0.5 },
  tally: { brief: 'a chalk tally mark on the board; three files, random', files: 3, pick: 'random', volume: 0.5, voices: 2, minIntervalMs: 120 },
  district_held: { brief: 'a district held: the band\'s PAH (rimshot, tuba and euphoniums) and the tuba\'s oom answering', volume: 0.6, minIntervalMs: 300, haptic: ['success'] },
  district_lost: { brief: 'a district lost: a trombone sliding down a fourth', volume: 0.5, minIntervalMs: 300 },
  majority: { brief: 'the majority: eight bars of "The Middling March", the full bandstand (B-flat, 2/4 at 112)', volume: 0.8, haptic: ['heavy'] },
  defeat: { brief: 'defeat: one tuba, high in its register, playing the first four bars of "The Middling March" slowly', volume: 0.7, haptic: ['soft'] },

  // --- sheets (pneumatic tubes) -----------------------------------------------------------------------
  ui_open: { brief: 'a sheet opened: a capsule arriving by pneumatic tube (the tube\'s hollow note) into its brass receiver', volume: 0.4, preload: 9 },
  ui_close: { brief: 'the sheet closed: the capsule sent off with a suck of air, the receiver lid falling shut', volume: 0.35, preload: 10 },

  // --- music (90 s loops; the shared player starts music_main) ----------------------------------------
  music_main: { brief: 'the desk loop "Minutes of the Previous Meeting" (spec 6 music_desk): 90 s at 90 bpm in F, bassoon, pizzicato, brushes; sparse, no tune', volume: 0.2, loop: true },
  music_campaign: { brief: 'the campaign loop: "The Middling March" for the bandstand, 90 s at 112 bpm in B-flat', volume: 0.35, loop: true },
} as const satisfies Record<string, FxDef>;

export type DecreeFxName = keyof typeof FX;
