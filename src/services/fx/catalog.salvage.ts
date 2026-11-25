/**
 * The fx events of the salvage mode (the scrapyard, game "scrap-yard"): docs/design/yard-stage1.md section 7.
 * The same format as ./catalog.ts, read by scripts/lib/fxCatalog.js for a game of mode "salvage" INSTEAD of
 * ./catalog.ts, so no key of another game can ever sound in it (`soundPack: null`, every file in
 * games/scrap-yard/assets/sfx/).
 *
 * WRITTEN BY scripts/audio/yard/render_yard.py --catalog from scripts/audio/yard/yard_recipes.py EVENTS and FILES
 * (the table the files are rendered from; `render_yard.py --check` fails when the two disagree): change the
 * table there and write this file again, never by hand. Owner: the sound package (yard-stage1.md 9, package 6).
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 *
 * - Segments: the shared fx service has no looping effect (one music player only), so the "loops" of
 *   section 7 (the four tools, the strippers, the bench, the burner, the diesel, the loading's calm loop, the
 *   yard's surroundings) are segments with faded ends that the screen plays again every
 *   `SALVAGE_SEGMENT_MS[key]` ms while the work lasts (src/modes/salvage/soundKeys.ts); two voices let the
 *   tail of one overlap the head of the next. Each segment's minimum interval sits a little under its period.
 * - Ladders: `furnace_roar` (0 lit, 1 half way, 2 pouring heat) and `truck_diesel` (0 idle, 1 driving, 2
 *   pulling hard) take `step` (the "pitch by speed" of section 7, in three files).
 * - Haptics (section 7): light on a finished piece (the piece_* keys and thud_waste), medium on a collection
 *   (coin, coin_big) and on a purchase (buy), success on a rung (rung_sign), light on a refusal (denied).
 *   Pieces cut by a crew member and collections nobody's finger caused play with `{ haptic: false }`
 *   where the caller can tell (soundKeys.ts says which).
 * - Keys this file adds to section 7's list: `goal_tick` (a goal done) and `load_cool` (the loading
 *   animation's bar cooled, asked for by the loading engineer).
 * - Variants (`pick: 'random'`) for every sound that can repeat within a second.
 *
 * Keys may be added, never renamed or removed once files exist (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  step_concrete: { brief: 'a work boot on concrete: heel tap with a thin scuff, the toe after; four files, random', files: 4, pick: 'random', volume: 0.25, preload: 3, voices: 2, minIntervalMs: 150 },
  step_gravel: { brief: 'a boot on gravel: a soft heel under a crunch of stones; four files, random', files: 4, pick: 'random', volume: 0.25, preload: 4, voices: 2, minIntervalMs: 150 },
  step_asphalt: { brief: 'a boot on asphalt: a duller heel, no grit; four files, random', files: 4, pick: 'random', volume: 0.25, preload: 5, voices: 2, minIntervalMs: 150 },
  cut_spanner: { brief: 'spanners and bolt cutters, a 0.55 s segment: ratchet clicks, a bolt squeal, a tap on the panel; chained every 500 ms; two files', files: 2, pick: 'random', volume: 0.5, preload: 6, voices: 2, minIntervalMs: 450 },
  cut_sledge: { brief: 'the sledgehammer on cast iron, one blow (0.7 s): the swing, the dull heavy clank, dust; chained every 700 ms; two files', files: 2, pick: 'random', volume: 0.6, preload: 7, voices: 2, minIntervalMs: 650 },
  cut_grinder: { brief: 'the angle grinder\'s short bite (0.8 s): disc at speed, pressed in (its note drops, sparks), lifted; chained every 750 ms; two files', files: 2, pick: 'random', volume: 0.5, preload: 8, voices: 2, minIntervalMs: 700 },
  cut_torch: { brief: 'the cutting torch (1.2 s segment): preheat roar, the oxygen jet, slag pops; chained every 1100 ms; two files', files: 2, pick: 'random', volume: 0.45, preload: 9, voices: 2, minIntervalMs: 1050 },
  piece_steel: { brief: 'a sheet-steel panel landing: a wobbly flat clang and a bounce on concrete (steel clunk); three files, random', files: 3, pick: 'random', volume: 0.55, preload: 10, voices: 2, minIntervalMs: 90, haptic: ['light'] },
  piece_cast: { brief: 'a cast-iron section: iron\'s dull clank, no ring, a heavy thud; three files, random', files: 3, pick: 'random', volume: 0.6, preload: 11, voices: 2, minIntervalMs: 90, haptic: ['light'] },
  piece_alu: { brief: 'an aluminium wheel or end cap: a light hollow tonk; three files, random', files: 3, pick: 'random', volume: 0.5, preload: 12, voices: 2, minIntervalMs: 90, haptic: ['light'] },
  piece_copper: { brief: 'copper: a bright ring (a tube\'s bar modes in E major, B5/G#5/C#6), 0.5 s; three files, random', files: 3, pick: 'random', volume: 0.5, preload: 13, voices: 2, minIntervalMs: 90, haptic: ['light'] },
  piece_brass: { brief: 'brass taps and fittings: a warmer ring than copper, two or three fittings clattering; three files, random', files: 3, pick: 'random', volume: 0.5, preload: 14, voices: 2, minIntervalMs: 90, haptic: ['light'] },
  thud_waste: { brief: 'the concrete counterweight into the rubble skip: a dead heavy thud, stones skittering; two files, random', files: 2, pick: 'random', volume: 0.5, preload: 15, minIntervalMs: 150, haptic: ['light'] },
  pickup: { brief: 'a piece lifted onto the carry frame: a glove scrape and a small clink; three files, random', files: 3, pick: 'random', volume: 0.4, preload: 16, voices: 2, minIntervalMs: 120 },
  swap: { brief: 'the swap: the cheaper piece knocked down, the better one clinked up', volume: 0.45, preload: 17, minIntervalMs: 300 },
  load_full: { brief: 'load full: the frame\'s strap cinched (two ratchet clicks, the webbing pulled tight)', volume: 0.5, preload: 18, minIntervalMs: 1000 },
  feed: { brief: 'pieces down a hopper\'s chute: a rasp and a hollow knock; two files, random', files: 2, pick: 'random', volume: 0.45, preload: 19, voices: 2, minIntervalMs: 200 },
  scale_beeps: { brief: 'weighed in: the scale\'s relay, the display counting, two piezo beeps (B6, E7)', volume: 0.5, preload: 20, minIntervalMs: 400 },
  scale_print: { brief: 'the scale house\'s dot-matrix printer: three lines, line feeds, the ticket torn off', volume: 0.4, preload: 21, minIntervalMs: 600 },
  slip: { brief: 'the drop-off slip torn from the pad and stamped', volume: 0.45, preload: 22, minIntervalMs: 400 },
  flatbed_arrive: { brief: 'the merchant\'s diesel flatbed back at its stand: slowing to idle, the air brake\'s hiss', volume: 0.4, minIntervalMs: 3000 },
  flatbed_load: { brief: 'the flatbed\'s crane loading the bay (3 s): pump whine, the grab\'s rattle, the deep clank on the bed', volume: 0.45, minIntervalMs: 2500 },
  coin: { brief: 'paid by transfer: the cash counter\'s number wheels turning over and settling with a steel tick; three files, random', files: 3, pick: 'random', volume: 0.45, preload: 1, minIntervalMs: 200, haptic: ['medium'] },
  coin_big: { brief: 'a big collection: the counter rolling longer, two struck steel bars ringing an open fifth (E5, B5)', volume: 0.55, preload: 2, minIntervalMs: 400, haptic: ['medium'] },
  lesson: { brief: 'a lesson on the ticket: a soft bell (a small steel bowl, G#5, padded beater)', volume: 0.35, preload: 23, minIntervalMs: 1500 },
  deal_stamp: { brief: 'a deal delivery stamped: a rubber stamp\'s thump and its handle\'s knock', volume: 0.5, minIntervalMs: 400 },
  ui_open: { brief: 'a card opens: a clipboard\'s spring clip lifted (a click, the spring\'s short buzz)', volume: 0.4, preload: 24, minIntervalMs: 60 },
  ui_close: { brief: 'the card closes: the clip snapping back onto the board', volume: 0.35, preload: 25, minIntervalMs: 60 },
  buy: { brief: 'bought: a ticket punch\'s crunch and a steel tag hung on its hook (A5)', volume: 0.55, preload: 26, voices: 2, minIntervalMs: 150, haptic: ['medium'] },
  denied: { brief: 'refused: a gloved fist on a steel cabinet door, twice, dull', volume: 0.5, preload: 27, minIntervalMs: 300, haptic: ['light'] },
  goal_tick: { brief: 'a goal done (my key): a carpenter\'s pencil ticking the clipboard', volume: 0.4, minIntervalMs: 500 },
  van: { brief: 'the delivery van at the tool rack: a petrol engine slowing, the sliding door rolling open', volume: 0.45, minIntervalMs: 2000 },
  set_down: { brief: 'a thing set down on the concrete at the drop-off: a weight on its feet, a clank', volume: 0.5, minIntervalMs: 500 },
  crane_set: { brief: 'a machine set on its pad by the flatbed\'s crane: pump lowering, a deep clunk, chains going slack', volume: 0.55, minIntervalMs: 2000 },
  door: { brief: 'the portacabin door: lever handle, the light door swinging, a hollow knock on its frame', volume: 0.4, minIntervalMs: 800 },
  crew_hello: { brief: 'a new hand\'s hummed "mm-hm" (G#4 down to E4)', volume: 0.4, minIntervalMs: 2000 },
  stripper_hand: { brief: 'the hand stripper cranked (0.8 s segment): gear clicks, the blade slitting PVC; chained every 750 ms; two files', files: 2, pick: 'random', volume: 0.4, preload: 28, voices: 2, minIntervalMs: 700 },
  stripper_power: { brief: 'the powered stripper (1.0 s segment): motor hum, rollers, the blade; chained every 950 ms', files: 2, pick: 'random', volume: 0.35, voices: 2, minIntervalMs: 900 },
  bench_knock: { brief: 'the motor bench (0.6 s segment): hammer and chisel on a motor casing, two knocks; chained every 600 ms; two files', files: 2, pick: 'random', volume: 0.4, voices: 2, minIntervalMs: 550 },
  furnace_roar: { brief: 'the crucible\'s burner (2.0 s segment), a ladder of heat (0 lit, 1 half, 2 pouring heat); chained every 1900 ms', files: 3, pick: 'ladder', volume: 0.4, voices: 2, minIntervalMs: 1800 },
  ready_chime: { brief: 'ready to pour: the crucible\'s steel signal bar struck twice (E5, B5)', volume: 0.5, minIntervalMs: 3000 },
  pour_glug: { brief: 'the pour: a thick hiss and sizzle, low glugs, sparkle where it splashes (2 s)', volume: 0.6, preload: 29, minIntervalMs: 2000 },
  cool_ticks: { brief: 'the bar cooling: the sizzle fading, then metal ticking as it contracts (2.6 s)', volume: 0.4, minIntervalMs: 2000 },
  truck_diesel: { brief: 'the hook-lift truck\'s diesel (1.0 s segment), a ladder of speed (0 idle, 1 driving, 2 pulling); chained every 950 ms', files: 3, pick: 'ladder', volume: 0.35, preload: 30, voices: 2, minIntervalMs: 900 },
  truck_reverse: { brief: 'reversing over the weighbridge: three reverse-alarm bursts (1.18 kHz) over the idle', volume: 0.4, minIntervalMs: 1500 },
  hook_swap: { brief: 'the hook-lift swap: hydraulics, the hook\'s clank on the skip bar, the skip dragged up and seated', volume: 0.5, minIntervalMs: 2500 },
  skip_tip: { brief: 'the skip tipped: the arm lifting, a long crash of mixed scrap sliding out', volume: 0.55, minIntervalMs: 2500 },
  chip_slide: { brief: 'a rival passed: the enamel name plate sliding along its rail and clicking into the slot above', volume: 0.5, minIntervalMs: 1000 },
  rung_sign: { brief: 'a rung: the crane hangs the new sign; it stops on its chains and rings low and long (E3)', volume: 0.65, minIntervalMs: 3000, haptic: ['success'] },
  load_crane: { brief: 'loading: the gantry trolley running in, wheels over rail joints, the motor\'s whine', volume: 0.45, preload: 31, minIntervalMs: 400 },
  load_clank: { brief: 'loading: a title plate set down on the weighbridge deck (a thick plate\'s clank); three files, random', files: 3, pick: 'random', volume: 0.6, preload: 32, minIntervalMs: 300 },
  load_beeps: { brief: 'loading: the display counting a plate\'s kilograms, a settle beep (E7)', volume: 0.4, preload: 33, minIntervalMs: 300 },
  load_pour: { brief: 'loading: the crucible tips and pours: a burner swell, the stream\'s hiss, two glugs', volume: 0.55, preload: 34, minIntervalMs: 800 },
  load_cool: { brief: 'loading: the bar cooled to brass: the last sizzle and one glint ping (B6) (requested by the loading engineer)', volume: 0.45, preload: 35, minIntervalMs: 800 },
  load_loop: { brief: 'loading\'s calm loop (2.0 s segment): the magnet\'s rope creaking, the furnace breathing, a soft glint; chained every 2 s', files: 2, pick: 'random', volume: 0.35, voices: 2, minIntervalMs: 1900 },
  gate_open: { brief: 'the picture parts: the yard gate\'s two leaves rolling apart and clacking against their posts', volume: 0.55, preload: 36, minIntervalMs: 800 },
  amb_yard: { brief: 'the yard\'s surroundings (8 s segment): distant traffic, small birds, a far reverse beeper in one file; chained every 7.5 s', files: 3, pick: 'random', volume: 0.25, voices: 2, minIntervalMs: 7000 },
  music_main: { brief: '"yard radio": 92 bpm in E, mellow clean electric guitar and fingered bass over the yard\'s own metal hits, two variants crossfaded inside one 89 s loop; sparse', volume: 0.22, loop: true },
} as const satisfies Record<string, FxDef>;

export type SalvageFxName = keyof typeof FX;
