/**
 * The fx events of the decree mode (High Office): spec section 6. The same format as ./catalog.ts,
 * read by scripts/lib/fxCatalog.js for a game of mode "decree" INSTEAD of ./catalog.ts: a decree game's
 * runtime table (`fxTable` in src/generated/activeGame.ts) holds these keys and no other, so no key of
 * another game can sound in it, and an event without a file in games/high-office/assets/sfx/ is silent
 * (`soundPack: null`).
 *
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 * First version by the skeleton: the keys of section 6 with the volumes, intervals and haptics the
 * sound package's scripts/audio/recipes_office.py `EVENTS` held when the skeleton was written
 * (placeholders); owned from now on by the sound package, which keeps the two in step. The desk
 * loop is `music_main` (the key the shared player starts, src/services/fx/mix.ts MUSIC; section 6
 * calls it music_desk). The shared keys the store plays map onto these in
 * src/modes/decree/soundKeys.ts. Haptics follow the thumb and rare peaks, at most 8 a second, none
 * for taxes, arrivals or payouts.
 *
 * Keys may be added, never renamed or removed (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  // --- the desk: what the thumb does ---------------------------------------------------------------
  paper_arrive: { brief: 'a visitor: two knocks on the panelled door, the glass pane answering, their paper laid on the desk; two files, random', volume: 0.4, minIntervalMs: 5000 },
  slip_arrive: { brief: 'the Treasury Clerk\'s slip slid across the baize and stopped by a fingertip', volume: 0.35, minIntervalMs: 800 },
  sign_ink: { brief: 'the steel nib signing from 40 pt: a 280 ms flourish whose pressure grows, the nib squeaking a little; three files, random', volume: 0.4, minIntervalMs: 250, haptic: ['light'] },
  sign: { brief: 'signed: card stock into the wire out-tray, the brass wires clinking (bright, short); three files, random', volume: 0.5, minIntervalMs: 150, haptic: ['medium'] },
  study: { brief: 'for further study: the wooden drawer creaking, sliding on its runners, a hollow thunk at its stop (low, woody); three files, random', volume: 0.5, minIntervalMs: 150, haptic: ['medium'] },
  take_back: { brief: 'taken back: one wire lifted, the paper laid back on the desk', volume: 0.45, minIntervalMs: 150, haptic: ['light'] },
  denied: { brief: 'not enough in the treasury: one dull knuckle tap on the desk, the pen rattling on it', volume: 0.5, minIntervalMs: 300, haptic: ['light'] },

  // --- purchases and the cabinet -------------------------------------------------------------------
  buy_level: { brief: 'a level: the nib ticks the Ledger, a heavy brass token set down on the blotter and settling (no till, no bell)', volume: 0.45, minIntervalMs: 100, haptic: ['light'] },
  open_ministry: { brief: 'a ministry opens: a brass latch thrown, a tuba blat from the corridor', volume: 0.6, haptic: ['medium'] },
  appoint: { brief: 'a minister appointed: a press camera, shutter and film-advance ratchet', volume: 0.6, haptic: ['light'] },
  storey: { brief: 'a new storey: a brass hand bell swung twice (F5), a tuba under it', volume: 0.65, haptic: ['success'] },
  ribbon: { brief: 'a ribbon cut: scissors, the ribbon parting, a clarinet flourish', volume: 0.6, haptic: ['light'] },

  // --- boycotts, gossip, clippings -----------------------------------------------------------------
  boycott_start: { brief: 'a club walks out: a wordless kazoo chant of three kazoos, a bass drum', volume: 0.6, haptic: ['medium'] },
  boycott_end: { brief: 'the boycott ends: a door unlatched and swinging open on its hinge', volume: 0.55, haptic: ['light'] },
  scandal: { brief: 'the front page: a newspaper slapped down, a muted trombone\'s "oh dear"', volume: 0.65, haptic: ['heavy'] },
  clipping: { brief: 'a clipping: two snips and the clipping pressed onto the page', volume: 0.45, minIntervalMs: 300 },

  // --- the election --------------------------------------------------------------------------------
  call_election: { brief: 'the election called: the gavel, twice', volume: 0.65, haptic: ['medium'] },
  env_open: { brief: 'an envelope opened: a snare roll swelling into one stroke', volume: 0.5 },
  tally: { brief: 'a chalk tally mark on the board; three files, random', volume: 0.5, minIntervalMs: 120 },
  district_held: { brief: 'a district held: the band\'s PAH (rimshot, tuba and euphoniums) and the tuba\'s oom answering', volume: 0.6, minIntervalMs: 300, haptic: ['success'] },
  district_lost: { brief: 'a district lost: a trombone sliding down a fourth', volume: 0.5, minIntervalMs: 300 },
  majority: { brief: 'the majority: eight bars of "The Middling March", the full bandstand (B-flat, 2/4 at 112)', volume: 0.8, haptic: ['heavy'] },
  defeat: { brief: 'defeat: one tuba playing the first four bars of "The Middling March" slowly', volume: 0.7, haptic: ['soft'] },

  // --- sheets --------------------------------------------------------------------------------------
  ui_open: { brief: 'a sheet opened: a capsule arriving by pneumatic tube into its brass receiver', volume: 0.4 },
  ui_close: { brief: 'the sheet closed: the capsule sent off with a suck of air, the receiver lid falling shut', volume: 0.35 },

  // --- music (90 s loops) --------------------------------------------------------------------------
  music_main: { brief: 'the desk loop "Minutes of the Previous Meeting" (spec 6 music_desk): 90 s at 90 bpm in F, bassoon, pizzicato, brushes; sparse, no tune', volume: 0.3, loop: true },
  music_campaign: { brief: 'the campaign loop: "The Middling March" for the bandstand, 90 s at 112 bpm in B-flat', volume: 0.35, loop: true },
} as const satisfies Record<string, FxDef>;

export type DecreeFxName = keyof typeof FX;
