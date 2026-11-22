/**
 * The feedback catalogue: every game event that makes a sound and/or a
 * vibration. One name per event; the UI only ever calls `fx.play(name)`.
 *
 * - Sound files live in `shared/sfx/` (the default pack every game gets) and
 *   can be overridden per game by a file of the same name in
 *   `games/<id>/assets/sfx/`. They are synthesised by `scripts/audio/`.
 * - File naming: `<name>.wav`, or `<name>_1.wav` ... `<name>_<files>.wav`
 *   when `files` is greater than 1.
 * - Haptics are short patterns: a step is an impact/notification type, or a
 *   number meaning "pause this many milliseconds".
 * - The haptics rule: the phone vibrates for what the player's finger just did
 *   (tap, buy, claim, ring the bell) and for rare peaks they caused (unlock,
 *   chest, prestige). It never vibrates for things the simulation does on its
 *   own (a guest paying, a bonus appearing) or for offers. A whole chest
 *   opening stays under ten pulses.
 *
 * Keys are a contract between the synth script, the audio service and the UI.
 * Volumes, intervals, briefs and haptic patterns may be tuned; keys may only
 * be added, never renamed or removed.
 */
export type HapticStep = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'select' | 'success' | 'warning' | 'error' | number;

export interface FxDef {
  /** What the sound should feel like. The synth script implements this. */
  brief: string;
  /** Number of sound files. 1 (default) = `<name>.wav`; n = `<name>_1.wav` ... `<name>_n.wav`. */
  files?: number;
  /** With several files: 'ladder' = the caller picks the step (e.g. combo level); 'random' = a random variant. */
  pick?: 'ladder' | 'random';
  /** 0..1 loudness in the mix. */
  volume: number;
  /** Ignore repeats within this many ms (some events fire many times a second). */
  minIntervalMs?: number;
  /** Vibration pattern. Omit for events too frequent or too subtle to vibrate. */
  haptic?: HapticStep[];
  /** True for looping music rather than a one-shot effect. */
  loop?: boolean;
}

/** Musical home for the default pack: C major / A minor pentatonic, warm and woody (marimba, kalimba, small bells). */
export const FX = {
  // --- interface -------------------------------------------------------
  ui_tap: { brief: 'Tiny soft pop for any button, about 40 ms. Friendly, never clicky or harsh.', volume: 0.5, minIntervalMs: 40, haptic: ['select'] },
  ui_tab: { brief: 'Softer two-tone tick for switching tabs.', volume: 0.45, minIntervalMs: 60, haptic: ['select'] },
  ui_open: { brief: 'Quick upward whoosh-pop as a panel or dialog opens, about 120 ms.', volume: 0.5, haptic: ['soft'] },
  ui_close: { brief: 'The downward twin of ui_open.', volume: 0.4 },
  ui_denied: { brief: 'Dull low double "bonk": you cannot afford this. Gentle, not punishing.', volume: 0.55, minIntervalMs: 300, haptic: ['warning'] },
  hint: { brief: 'Gentle "psst" pluck that draws the eye to a tutorial pointer.', volume: 0.4, minIntervalMs: 800 },

  // --- tapping and combo -----------------------------------------------
  tap: { brief: 'Plucky marimba note. Eight files climbing the C major pentatonic scale, so a tap combo rises in pitch.', files: 8, pick: 'ladder', volume: 0.6, minIntervalMs: 30, haptic: ['light'] },
  combo_up: { brief: 'Bright three-note upward arpeggio with a sparkle when the combo multiplier steps up, about 300 ms.', volume: 0.7, haptic: ['medium', 130, 'light'] },
  combo_max: { brief: 'Bigger five-note flourish when the combo reaches its maximum.', volume: 0.8, haptic: ['heavy', 50, 'medium', 50, 'light'] },

  // --- money -----------------------------------------------------------
  coin: { brief: 'Tiny bright coin "tink". Three variants a few cents apart so streams of coins never sound mechanical.', files: 3, pick: 'random', volume: 0.45, minIntervalMs: 70 },
  cash: { brief: 'Light "ka-ching" when a customer pays: two small bell hits and a soft shaker.', volume: 0.5, minIntervalMs: 180 },
  buy: { brief: 'Satisfying rising "bloop" with a click for buying a level. The sound players hear most; must stay pleasant on repeat.', volume: 0.65, minIntervalMs: 50, haptic: ['medium'] },
  milestone: { brief: 'Sparkle plus a major chord stab when a level milestone is reached.', volume: 0.75, haptic: ['success'] },
  upgrade: { brief: 'Power-up sweep into a chord for buying an upgrade.', volume: 0.7, haptic: ['medium', 240, 'medium'] },
  unlock: { brief: 'Short happy fanfare for a new station, about 0.9 s.', volume: 0.8, haptic: ['heavy', 255, 'success'] },
  unlock_venue: { brief: 'Bigger fanfare for opening a whole new venue, about 1.6 s.', volume: 0.85, haptic: ['heavy', 100, 'heavy', 100, 'medium', 620, 'success'] },
  hire: { brief: 'Cheerful two-chord "ta-da" with a little whistle slide when someone is hired.', volume: 0.75, haptic: ['medium', 170, 'success'] },
  prestige: { brief: 'Swelling riser into a big shimmering chord, about 2.5 s. The biggest moment in the game.', volume: 0.9, haptic: ['heavy', 120, 'heavy', 120, 'heavy', 200, 'success'] },
  offline_collect: { brief: 'A one-second shower of coins.', volume: 0.7, haptic: ['medium', 50, 'light', 50, 'light'] },
  boost_start: { brief: 'Energetic power-up when a boost starts.', volume: 0.75, haptic: ['medium', 210, 'success'] },

  // --- the living scene (quiet, heavily rate-limited) ---------------------
  cook_done: { brief: 'Small oven bell "ding" when a station finishes a cycle.', volume: 0.3, minIntervalMs: 350 },
  toss: { brief: 'Soft airy whoosh as a dish flies to the counter.', volume: 0.25, minIntervalMs: 250 },
  bell: { brief: 'Bright service bell "ding!" with about 0.6 s of ring. The player rings it by hand, so it must feel great.', volume: 0.75, minIntervalMs: 120, haptic: ['rigid'] },
  pickup: { brief: 'Plate-and-tray clink as a worker loads up.', volume: 0.25, minIntervalMs: 300 },
  serve: { brief: 'Soft plate set-down: a thud with a tiny clink.', volume: 0.25, minIntervalMs: 300 },
  door: { brief: 'Tiny two-note shop door chime when a customer arrives.', volume: 0.2, minIntervalMs: 1200 },
  happy: { brief: 'Cute two-note upward chirp from a satisfied customer.', volume: 0.25, minIntervalMs: 500 },

  // --- bonus, rush -----------------------------------------------------
  bonus_appear: { brief: 'Magical twinkling shimmer as the flying bonus appears, about 0.8 s.', volume: 0.6 },
  bonus_collect: { brief: 'Glittery burst followed by a coin cascade, about 0.9 s.', volume: 0.85, haptic: ['heavy', 130, 'success'] },
  rush_start: { brief: 'Fast bell ringing into a rising whoosh: everything speeds up.', volume: 0.8, haptic: ['heavy', 75, 'medium', 65, 'medium'] },
  rush_end: { brief: 'Descending whoosh as things calm down.', volume: 0.5 },
  // --- chests and cards --------------------------------------------------
  chest_appear: { brief: 'Heavy wooden thud with a small sparkle as a chest lands.', volume: 0.8, haptic: ['heavy'] },
  chest_shake: { brief: 'Rattling wood and coins, about 0.5 s, building anticipation.', volume: 0.7, minIntervalMs: 200 },
  chest_open: { brief: 'Creak, burst and a shimmering chord, about 1.2 s.', volume: 0.9, haptic: ['heavy', 230, 'success'] },
  card_flip: { brief: 'Quick papery whip as a card turns over.', volume: 0.55, minIntervalMs: 60 },
  reveal_common: { brief: 'Single soft chime.', volume: 0.6, haptic: ['light'] },
  reveal_rare: { brief: 'Brighter two-note chime with shimmer.', volume: 0.7, haptic: ['medium'] },
  reveal_epic: { brief: 'Dramatic rising triad with sparkle.', volume: 0.8, haptic: ['heavy', 270, 'heavy'] },
  reveal_legendary: { brief: 'Big golden fanfare over a choir-like pad with a long sparkling tail, about 2 s.', volume: 0.95, haptic: ['heavy', 80, 'heavy', 80, 'heavy', 160, 'success'] },
  card_levelup: { brief: 'Ascending arpeggio ending in a ding.', volume: 0.75, haptic: ['medium', 320, 'success'] },
  gems: { brief: 'Crystalline, glassy arpeggio for receiving premium currency.', volume: 0.7, haptic: ['medium'] },

  // --- deals, missions, daily --------------------------------------------
  deal_popup: { brief: 'Friendly attention chime for a new offer. Inviting, never alarming.', volume: 0.6 },
  purchase_success: { brief: 'Celebratory cash register into a short fanfare after a real purchase.', volume: 0.9, haptic: ['medium', 540, 'success'] },
  mission_complete: { brief: 'Bright three-note "task done" jingle.', volume: 0.75, haptic: ['success'] },
  daily_claim: { brief: 'Gift-box pop followed by a chime.', volume: 0.7, haptic: ['medium', 110, 'light'] },

  // --- story -----------------------------------------------------------
  story_open: { brief: 'Soft whoosh as a character slides in.', volume: 0.5 },
  blip_low: { brief: 'Very short low voice blip (about 40 ms) for typewriter text: gruff characters.', volume: 0.3, minIntervalMs: 45 },
  blip_mid: { brief: 'Mid-register voice blip: neutral characters.', volume: 0.3, minIntervalMs: 45 },
  blip_high: { brief: 'High, bouncy voice blip: small or excitable characters.', volume: 0.3, minIntervalMs: 45 },

  // --- music -----------------------------------------------------------
  music_main: { brief: 'The game\'s main loop, 30 to 45 s, seamless. Lives in the game folder, not the shared pack.', volume: 0.35, loop: true },
} as const satisfies Record<string, FxDef>;

export type FxName = keyof typeof FX;
