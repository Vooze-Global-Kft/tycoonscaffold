/**
 * The fx events of the haul mode (Orbit Haulers): spec section 6.2, with its decisions applied
 * (docs/design/space-design.md, Decisions). The same format as ./catalog.ts, read by
 * scripts/lib/fxCatalog.js for a game of mode "haul" INSTEAD of ./catalog.ts: a haul game's
 * runtime table (`fxTable` in src/generated/activeGame.ts) holds these 56 keys and no other, so no
 * key of another game can sound in it, and an event without a file in games/<id>/assets/sfx/ is silent.
 *
 * Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY): the app imports its types only.
 * Keys, volumes and briefs come from scripts/audio/recipes_haul.py EVENTS (the sound package,
 * rendered from the same table); haptics are the sound package's accent-aligned proposals
 * (PROPOSED_HAPTICS) with decision 6.3: no vibration for passive events (rock_crumble, bonanza,
 * vein_start, vein_end, hold_full, pod_arrive, freighter_land); credit_tick at 45 ms (12 glyphs in
 * 0.6 s). launch_charge, warp_out and contract_met vibrate only after the player's own swipe: the
 * caller passes `{ haptic: false }` for an autopilot launch. src/services/fx/haulTable.test.ts
 * checks this file against recipes_haul.py.
 *
 * Keys may be added, never renamed or removed (the sound files are named by them).
 */
import type { FxDef } from './catalog';

export const FX = {
  ui_tap: { brief: 'dry 30 ms pulse blip', volume: 0.45, minIntervalMs: 40, haptic: ['select'] },
  ui_tab: { brief: 'two-tone sine tick', volume: 0.4, minIntervalMs: 60, haptic: ['select'] },
  ui_open: { brief: 'short upward filter sweep, 120 ms', volume: 0.45, haptic: ['soft'] },
  ui_close: { brief: 'downward twin of ui_open', volume: 0.35 },
  ui_denied: { brief: 'low square double blip, muted', volume: 0.5, minIntervalMs: 300, haptic: ['warning'] },
  hint: { brief: 'one soft sine ping with echo', volume: 0.35, minIntervalMs: 800 },
  purchase_success: { brief: 'rising FM fifth with a filtered noise latch, 0.8 s', volume: 0.7, haptic: ['light', 190, 'success'] },
  gems: { brief: 'Dark Matter: glassy shimmer over a low hum', volume: 0.55, minIntervalMs: 150 },
  boost_start: { brief: 'flare ignition: hiss rising into a bright pop, 0.9 s', volume: 0.65, haptic: ['light', 580, 'medium'] },
  music_main: { brief: 'Slow Orbit, 60 s loop (spec 6.1)', volume: 0.35, loop: true },
  route_grab: { brief: 'small magnetic click and hum start', volume: 0.45, haptic: ['select'] },
  route_snap: { brief: 'quick rising blip when the line locks onto a rock', volume: 0.5, minIntervalMs: 80, haptic: ['light'] },
  route_set: { brief: 'two-note confirm, pulse wave', volume: 0.55, haptic: ['rigid'] },
  route_cancel: { brief: 'falling blip', volume: 0.4 },
  hold_tick: { brief: 'soft metallic thunk of ore into the tank', volume: 0.25, minIntervalMs: 120 },
  hold_full: { brief: 'two low sine tones, polite', volume: 0.5, minIntervalMs: 4000 },
  launch_arm: { brief: 'latch click when the swipe passes 30 pt', volume: 0.5, haptic: ['select'] },
  launch_charge: { brief: 'rising engine whine, 2.5 s, matched to the climb', volume: 0.65, haptic: ['light', 300, 'medium', 300, 'heavy'] },
  launch_abort: { brief: 'spool-down when the swipe is released short', volume: 0.4 },
  warp_out: { brief: 'compressed whoomp plus a bright tail, 0.7 s', volume: 0.8, haptic: ['heavy'] },
  payout: { brief: 'credit chime', volume: 0.7 },
  credit_tick: { brief: 'tiny sine tick per falling credit glyph', volume: 0.25, minIntervalMs: 45 },
  freighter_land: { brief: 'low thump and hiss', volume: 0.45 },
  contract_new: { brief: 'radio squelch plus a three-note teletype', volume: 0.5 },
  contract_select: { brief: 'a pulse double tick', volume: 0.45, haptic: ['select'] },
  contract_met: { brief: 'stamp: noise burst plus a major-sixth FM stab', volume: 0.75, haptic: ['success'] },
  contract_lapse: { brief: 'short burn-out crackle', volume: 0.35, minIntervalMs: 500 },
  rock_dry: { brief: 'descending creak, filtered noise', volume: 0.4, minIntervalMs: 500 },
  rock_crumble: { brief: 'granular break, 0.6 s', volume: 0.55, minIntervalMs: 200 },
  rock_arrive: { brief: 'doppler swoosh ending in a soft bump', volume: 0.4, minIntervalMs: 300 },
  bonanza: { brief: 'bright double ping over the arrival', volume: 0.55 },
  vein_start: { brief: 'gold shimmer rising, 1 s', volume: 0.6 },
  vein_end: { brief: 'shimmer fading down', volume: 0.35 },
  flare_launch: { brief: 'canister thump and a trail hiss', volume: 0.6, haptic: ['medium'] },
  rig_upgrade: { brief: 'ratchet click plus a rising blip; pleasant on repeat', volume: 0.55, minIntervalMs: 50, haptic: ['medium'] },
  rig_tier: { brief: 'drill rev-up plus a chord (new bit)', volume: 0.7, haptic: ['medium', 400, 'success'] },
  claim_slot: { brief: 'beacon ping, twice', volume: 0.6, haptic: ['medium'] },
  drone_buy: { brief: 'bay door, servo, puff', volume: 0.55, haptic: ['medium'] },
  fleet_upgrade: { brief: 'servo sweep for capacity, engines and freighter', volume: 0.55, minIntervalMs: 50, haptic: ['medium'] },
  freighter_tier: { brief: 'bigger servo plus a low horn', volume: 0.7, haptic: ['medium', 360, 'success'] },
  system_online: { brief: 'power-up: three ascending hums and a click', volume: 0.7, haptic: ['light', 160, 'light', 160, 'light', 180, 'success'] },
  module_fit: { brief: 'cartridge seat: slide and latch', volume: 0.55, haptic: ['light', 120, 'rigid'] },
  module_remove: { brief: 'latch release', volume: 0.4, haptic: ['light'] },
  module_levelup: { brief: 'rising FM arpeggio', volume: 0.65, haptic: ['light', 210, 'success'] },
  pod_arrive: { brief: 'short retro-burn', volume: 0.55 },
  salvage_cut: { brief: 'laser hiss and a split, 1.2 s', volume: 0.55, haptic: ['light', 200, 'light', 800, 'medium'] },
  salvage_common: { brief: 'reveal tone, short (0.3 s)', volume: 0.6, haptic: ['light'] },
  salvage_rare: { brief: 'reveal tones, longer and brighter', volume: 0.7, haptic: ['medium'] },
  salvage_epic: { brief: 'reveal tones, longest and brightest (1.2 s)', volume: 0.8, haptic: ['medium', 260, 'success'] },
  comms_in: { brief: 'radio squelch open plus a short carrier tone', volume: 0.45, minIntervalMs: 1500 },
  comms_ack: { brief: 'squelch close', volume: 0.4, haptic: ['select'] },
  shift_log: { brief: 'one teleprinter burst when the log prints', volume: 0.35 },
  daily_relay: { brief: 'allotment received: carrier chord', volume: 0.6, haptic: ['light', 260, 'success'] },
  starmap_node: { brief: 'node lights: crystalline ping and hum', volume: 0.6, haptic: ['medium'] },
  trait_pick: { brief: 'selection chord', volume: 0.55, haptic: ['select'] },
  jump_warp: { brief: 'the long jump: 2.5 s rising, cut, tail', volume: 0.85, haptic: ['heavy', 400, 'heavy', 1100, 'heavy'] },
} as const satisfies Record<string, FxDef>;

export type HaulFxName = keyof typeof FX;
