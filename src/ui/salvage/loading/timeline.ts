/**
 * The loading animation's clock (STAGE1-RULING S22, yard-design.md 11, yard-stage1.md 6.4): what
 * every moving part does at t seconds. Pure worklets: the app runs `loadingPose` on the UI thread from
 * one shared clock (./LoadingStage.tsx), the art sheets and the tests run it in Node.
 *
 * One plate per word of the title, 0.6 s each:
 *
 *   0.0 to 0.4             the gantry's trolley runs in from the left, the first plate under its magnet
 *   0.4 + 0.6 i, 0.6 s     plate i: the trolley moves over its place (0.12 s), lowers it (0.27 s), it
 *                          lands with a 2 pt shake (0.1 s), the magnet lets go and rises; the display
 *                          counts its kilograms as it settles (20 kg steps, as a weighbridge reads)
 *   P = 0.4 + 0.6 n        the trolley runs back to its stand at the left (0.5 s)
 *   P to P + 0.2           the crucible under its hood tips
 *   P + 0.2 to P + 0.6     the pour: the launder fills the five cavities west to east
 *   P + 0.6 to P + 1.4     the bars cool from orange to brass (0.8 s, the game's 3 s quickened); the
 *                          display's printer feeds the ticket out (the first 0.4 s)
 *   P + 1.0                the earliest moment the picture parts like two gate leaves (0.4 s), if the
 *                          yard's atlases are baked; else the calm loop holds until they are
 *   after P + 1.4          the calm loop: the parked magnet sways on its rope, the display's stable lamp
 *                          ticks (its reading stays the ticket's), the furnace breathes, the ingots glint every 2 s
 *
 * Three words give 3.6 s, the "about 3.5 s" of S22.
 */

export interface LoadingTimeline {
  /** Plates (words). */
  n: number;
  jibIn: readonly [number, number];
  plates: readonly (readonly [number, number])[];
  /** The trolley back to its stand after the last plate. */
  park: readonly [number, number];
  tip: readonly [number, number];
  pour: readonly [number, number];
  cool: readonly [number, number];
  /** The ticket feeding out of the display's slot. */
  ticket: readonly [number, number];
  /** The gate's slot in the first-launch timeline (the screen opens it only once the bakes are done). */
  gate: readonly [number, number];
  /** End of the timeline; the calm loop runs from here. */
  end: number;
  /** Kilograms each plate puts on the weighbridge (the sum is the final reading). */
  kg: readonly number[];
}

/** Seconds a plate takes (S22). */
export const PLATE_S = 0.6;
/** Seconds the gate takes to part. */
export const GATE_S = 0.4;
/** At most this many plates; further words share the last plate (./layout.ts `titleWords`). */
export const MAX_PLATES = 4;

/** Inside a plate's 0.6 s: move over until 0.2, lower until LAND, shake for 0.1 s, release from RELEASE. */
const MOVE = 0.2;
const LAND = 0.65;
const RELEASE = 0.82;

/** A plate's mass from its word: a steel plate grows with its letters; rounded to the weighbridge's 20 kg. */
export function plateKg(word: string): number {
  'worklet';
  return Math.round((100 + 84 * Math.max(1, word.length)) / 20) * 20;
}

/** The timeline for these words (one plate each). */
export function loadingTimeline(words: readonly string[]): LoadingTimeline {
  const n = Math.max(1, Math.min(MAX_PLATES, words.length));
  const plates: [number, number][] = [];
  for (let i = 0; i < n; i++) plates.push([0.4 + PLATE_S * i, 0.4 + PLATE_S * (i + 1)]);
  const P = 0.4 + PLATE_S * n;
  const kg: number[] = [];
  for (let i = 0; i < n; i++) kg.push(plateKg(words[i] ?? ''));
  // the display has four cells: the load stays under 10 t
  let sum = kg.reduce((a, b) => a + b, 0);
  while (sum > 9980) {
    const i = kg.indexOf(Math.max(...kg));
    kg[i] -= 20;
    sum -= 20;
  }
  return {
    n,
    jibIn: [0, 0.4],
    plates,
    park: [P, P + 0.5],
    tip: [P, P + 0.2],
    pour: [P + 0.2, P + 0.6],
    cool: [P + 0.6, P + 1.4],
    ticket: [P + 0.6, P + 1.0],
    gate: [P + 1.0, P + 1.0 + GATE_S],
    end: P + 1.4,
    kg,
  };
}

/** The working title's three words: the art sheets' and the tests' default (the app reads the game's title). */
export const DEFAULT_WORDS = ['SCRAP', 'TO', 'INGOT'] as const;
/** The timeline of three plates (the art kit's names, kept for scripts/art and art.test.ts). */
export const LOADING_T = loadingTimeline(DEFAULT_WORDS);
/** Kilograms of the three default plates. */
export const PLATE_KG = LOADING_T.kg;

export interface PlatePose {
  /** 0 hanging at the top, 1 landed. */
  drop: number;
  /** Shake offset, points (after landing). */
  shake: number;
  /** Hanging from the magnet. */
  carried: boolean;
  /** 0..1: a plate the trolley brings in fades in over its first 0.1 s (the first comes in with the trolley). */
  alpha: number;
}

export interface LoadingPose {
  t: number;
  /** Where the trolley is: -1 off screen left, 0..n-1 over plate i (fractional while it runs between). */
  aim: number;
  /** 0..1: how far the trolley has run from `aim` to its stand at the left (the calm loop's place). */
  park: number;
  /** How far the magnet is lowered: 0 up under the trolley, 1 a plate's foot on the deck. */
  cable: number;
  /** Magnet lit (holding). */
  magnetOn: boolean;
  /** The hanging load's swing, degrees (it lags when the trolley starts and swings out when it stops). */
  swing: number;
  plates: PlatePose[];
  /** What the weighbridge display reads, kilograms. */
  kg: number;
  /** Crucible tilt 0..1. */
  tilt: number;
  /** Pour progress 0..1 (the launder fills the cavities west to east). */
  pour: number;
  /** Cooling, in the game's seconds (3 = cooled to its metal): 0 until the bars are full. */
  cool: number;
  /** The ticket feeding out of the display's slot, 0..1. */
  ticket: number;
  /** The gate parting, 0..1. */
  gate: number;
  /** Seconds into the calm loop (0 before it). */
  loop: number;
  /** The parked magnet's sway, degrees. */
  sway: number;
  /** The furnace's breath, 0..1 (its mouth and the hood's glow). */
  breathe: number;
  /** A glint running along the cooled ingots, 0..1 while it runs, -1 when none. */
  glint: number;
  /** The display's stable lamp, ticking in the calm loop. */
  tick: boolean;
}

const clamp01 = (x: number) => {
  'worklet';
  return Math.max(0, Math.min(1, x));
};
const ease = (x: number) => {
  'worklet';
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/**
 * Every moving part at t seconds. `gateAt` is when the gate began to part (the screen sets it once the
 * bakes are done; default: the timeline's own slot, as the art sheets show it). `still` is reduced
 * motion: the final frame, with only the furnace breathing.
 */
export function loadingPose(t: number, tl: LoadingTimeline = LOADING_T, gateAt: number = tl.gate[0], still = false): LoadingPose {
  'worklet';
  const n = tl.n;
  const loopT = still ? t : Math.max(0, t - tl.end);
  const tt = still ? tl.end + 0.001 : t;
  const plates: PlatePose[] = [];
  let aim = -1;
  let cable = 0;
  let magnetOn = false;
  let kg = 0;
  let swing = 0;
  // the trolley runs in with the first plate
  if (tt < tl.jibIn[1]) {
    const k = tt / tl.jibIn[1];
    aim = -1 + ease(k);
    magnetOn = true;
    swing = -5 * Math.sin(Math.PI * clamp01(k));
  }
  for (let i = 0; i < n; i++) {
    const a = tl.plates[i][0];
    const b = tl.plates[i][1];
    const k = (tt - a) / (b - a);
    if (tt < a) {
      plates.push({ drop: 0, shake: 0, carried: i === 0, alpha: 1 });
      continue;
    }
    if (k < 1) {
      const m = clamp01(k / MOVE);
      aim = i === 0 ? 0 : i - 1 + ease(m);
      const down = ease((k - MOVE) / (LAND - MOVE));
      if (k < LAND) cable = down;
      else if (k < RELEASE) cable = 1;
      else cable = 1 - ease((k - RELEASE) / (1 - RELEASE));
      magnetOn = k < RELEASE;
      // swing: lag while the trolley runs over, swing out and settle while it lowers
      if (i > 0 && k < MOVE) swing = -4 * Math.sin(Math.PI * m);
      else if (k < LAND) {
        const s = (k - (i > 0 ? MOVE : 0)) * (b - a);
        swing = 3 * Math.sin(s * 14) * Math.exp(-s * 7);
      }
      const landed = k >= LAND;
      const since = (k - LAND) * (b - a);
      plates.push({
        drop: landed ? 1 : down,
        shake: landed && since < 0.1 ? 2 * Math.sin(since * 63) * (1 - since / 0.1) : 0,
        carried: !landed,
        alpha: i === 0 ? 1 : clamp01(k / 0.17),
      });
      // the load comes on the deck as the magnet lets go
      kg += tl.kg[i] * ease((k - (LAND - 0.05)) / (RELEASE - LAND + 0.1));
    } else {
      plates.push({ drop: 1, shake: 0, carried: false, alpha: 1 });
      kg += tl.kg[i];
    }
  }
  let park = 0;
  if (tt >= tl.park[0]) {
    aim = n - 1;
    park = ease((tt - tl.park[0]) / (tl.park[1] - tl.park[0]));
    cable = 0;
    swing = park < 1 ? -4 * Math.sin(Math.PI * park) : 0;
    if (park >= 1) {
      const s = tt - tl.park[1];
      swing = 3 * Math.sin(s * 9) * Math.exp(-s * 3);
    }
  }
  const tilt = tt < tl.tip[0] ? 0 : tt < tl.cool[0] ? ease((tt - tl.tip[0]) / (tl.tip[1] - tl.tip[0])) : 1 - ease((tt - tl.cool[0]) / 0.25);
  const pour = clamp01((tt - tl.pour[0]) / (tl.pour[1] - tl.pour[0]));
  const cool = tt <= tl.pour[1] ? 0 : ((tt - tl.pour[1]) / (tl.cool[1] - tl.pour[1])) * 3;
  const ticket = ease((tt - tl.ticket[0]) / (tl.ticket[1] - tl.ticket[0]));
  const gate = ease((t - gateAt) / GATE_S);
  // the round to the weighbridge's 20 kg
  const reading = Math.round(kg / 20) * 20;
  // the calm loop
  let sway = 0;
  let breathe = 0.5;
  let glint = -1;
  let tick = false;
  if (tt >= tl.end || still) {
    breathe = 0.5 + 0.5 * Math.sin((loopT / 1.8) * Math.PI * 2);
    if (!still) {
      sway = 2.6 * Math.sin((loopT / 2.6) * Math.PI * 2);
      // the display's stable lamp ticks (the reading itself never changes: it is the ticket's)
      tick = loopT % 0.9 < 0.45;
      const g = (loopT + 1.2) % 2;
      if (g < 0.6) glint = g / 0.6;
    }
  }
  return { t, aim, park, cable, magnetOn, swing, plates, kg: reading, tilt, pour, cool, ticket, gate, loop: tt >= tl.end ? loopT : 0, sway, breathe, glint, tick };
}

/** Thousands with a comma, no locale tables (worklet-safe). */
export function groupKg(n: number): string {
  'worklet';
  const s = String(Math.max(0, Math.round(n)));
  return s.length > 3 ? s.slice(0, s.length - 3) + ',' + s.slice(-3) : s;
}

/** The sound cues of the timeline (fx ids from the sound engineer's catalog; a missing id is silent). */
export interface LoadingCue {
  t: number;
  id: string;
}

/** Ids requested from the sound engineer (requests.md): yard-design.md 7's loading keys plus `load_cool`. */
export const LOADING_SOUNDS = { crane: 'load_crane', plate: 'load_clank', pour: 'load_pour', cooled: 'load_cool', gate: 'gate_open' } as const;

export function loadingCues(tl: LoadingTimeline): LoadingCue[] {
  const cues: LoadingCue[] = [{ t: 0.02, id: LOADING_SOUNDS.crane }];
  for (const [a, b] of tl.plates) cues.push({ t: a + (b - a) * LAND, id: LOADING_SOUNDS.plate });
  cues.push({ t: tl.pour[0], id: LOADING_SOUNDS.pour });
  cues.push({ t: tl.ticket[0] + 0.3, id: LOADING_SOUNDS.cooled });
  return cues;
}
