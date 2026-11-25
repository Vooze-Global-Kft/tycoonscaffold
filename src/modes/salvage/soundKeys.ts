/**
 * The salvage mode's sounds in one place (docs/design/yard-stage1.md 7 and 9, package 6; owned by the sound
 * package): which key of the salvage table (src/services/fx/catalog.salvage.ts) each rules event plays,
 * which key each shared key the store and the shared kit play maps onto, how often the screen chains a
 * segment, and how far the music is lowered under the pour and the tickets. Plain data and pure functions,
 * no imports but types, so tests load it under node and the wiring (./index.tsx, a listener on
 * src/state/modeEvents.ts, the screens) only calls `salvageSoundsFor(event)` and plays what it returns.
 *
 * EVENT NAMES are the specification's (yard-stage1.md 2.14) as of version 2, part one; the rules engineer
 * fixes them in src/engine/salvage/types.ts. Where a name changes, change it HERE (the table below is the one
 * place an event meets a key) and in ./soundKeys.test.ts. Payload fields are read defensively (a missing
 * field picks the plain sound), so a renamed field degrades to a quieter choice, never to a throw.
 * `roundLoad` and `roundBack` are not in 2.14 yet: they are the merchant's round as events (2.3), asked of
 * the rules engineer in requests.md; until they exist, `flatbed_load` and `flatbed_arrive` are silent.
 *
 * SEGMENTS: the shared fx service plays one-shots and one music loop, nothing else, so section 7's "loops"
 * are segments with faded ends that the screen plays again every SALVAGE_SEGMENT_MS[key] while the thing
 * lasts (the work, a machine working, the burner, the truck driving, the loading's calm loop, the yard's
 * surroundings), passing `step` for the two ladders (`furnaceStep`, `dieselStep`). The numbers mirror
 * scripts/audio/yard/yard_recipes.py SEGMENT_MS (`render_yard.py --check` fails when they differ).
 *
 * HAPTICS (section 7): light on a finished piece, medium on a collection and a purchase, success on a rung;
 * a cue says `haptic: false` when the event was not the player's own doing (a crew member's piece, an away
 * report), as the house rule asks.
 */
import type { SalvageFxName } from '../../services/fx/catalog.salvage';

/** One sound to play for an event: `fx.play(key, { step, haptic })`, `delayMs` after the event if given. */
export interface SoundCue {
  key: SalvageFxName;
  /** Ladder step (furnace_roar, truck_diesel). */
  step?: number;
  /** false: the sound without its vibration. */
  haptic?: false;
  /** Play this long after the event (a ticket prints after the display's beeps). */
  delayMs?: number;
  /** Lower the music for a while (SALVAGE_DUCK). */
  duck?: keyof typeof SALVAGE_DUCK;
}

/** The salvage key for each shared key the shared store, the feedback service and the shared kit play. */
export const SALVAGE_SHARED_SOUNDS = {
  ui_denied: 'denied',
  ui_open: 'ui_open',
  ui_close: 'ui_close',
  buy: 'buy',
  purchase_success: 'buy',
  unlock: 'buy',
  hire: 'crew_hello',
  milestone: 'rung_sign',
  offline_collect: 'coin_big',
  mission_complete: 'goal_tick',
  story_open: 'ui_open',
  deal_popup: 'ui_open',
} as const satisfies Record<string, SalvageFxName>;

/** Milliseconds between two plays of a segment while what it belongs to lasts (yard_recipes.py SEGMENT_MS). */
export const SALVAGE_SEGMENT_MS = {
  cut_spanner: 500,
  cut_sledge: 700,
  cut_grinder: 750,
  cut_torch: 1100,
  stripper_hand: 750,
  stripper_power: 950,
  bench_knock: 600,
  furnace_roar: 1900,
  truck_diesel: 950,
  load_loop: 2000,
  amb_yard: 7500,
} as const satisfies Partial<Record<SalvageFxName, number>>;

/**
 * How far the music is lowered (`fx.music.setVolume(to)`) and for how long before it comes back to 1:
 * under the pour, under a ticket and under the rung sign. The shared player sets a level at once (no fade),
 * so the screen may step it in two or three moves.
 */
export const SALVAGE_DUCK = {
  pour: { to: 0.35, ms: 2600 },
  ticket: { to: 0.6, ms: 1400 },
  rung: { to: 0.4, ms: 2600 },
} as const;

/** The work segment for the boss's (or the cutter's) tool, by tool and by the piece's family (S6: the sledge breaks cast iron, the grinder cuts thin steel). */
export function workLoopKey(tool: string | undefined, family?: string): SalvageFxName {
  const t = (tool ?? '').toLowerCase();
  if (t.includes('torch')) return 'cut_torch';
  if (t.includes('sledge') || t.includes('grinder')) return family === 'cast' || t === 'sledge' ? 'cut_sledge' : 'cut_grinder';
  return 'cut_spanner';
}

/** The machine segment by machine id (a machine without one is quiet). */
export function machineLoopKey(machine: string | undefined): SalvageFxName | null {
  const m = (machine ?? '').toLowerCase();
  if (m.includes('power')) return 'stripper_power';
  if (m.includes('strip')) return 'stripper_hand';
  if (m.includes('bench')) return 'bench_knock';
  if (m.includes('crucible')) return 'furnace_roar';
  return null;
}

/** furnace_roar's ladder: 0 lit, 1 half way, 2 at pouring heat, from the heat's progress 0..1. */
export function furnaceStep(progress: number): number {
  if (!(progress > 0.33)) return 0;
  return progress > 0.75 ? 2 : 1;
}

/** truck_diesel's ladder from the truck's speed as a share of its top speed (0 idle, 1 driving, 2 pulling hard). */
export function dieselStep(speedShare: number): number {
  if (!(speedShare > 0.08)) return 0;
  return speedShare > 0.7 ? 2 : 1;
}

/** Grade ids (yard-stage1.md 2.4) by the family a piece is heard as. Unknown grades sound as steel. */
const COPPER = new Set(['no2', 'bb', 'cab', 'cabt']);
const BRASS = new Set(['brs', 'bri', 'brd']);
const ALU = new Set(['alw', 'alc', 'ali', 'ald']);
const CAST = new Set(['ci']);

/** The piece sound of a grade (the grade is heard as well as seen). */
export function pieceKey(grade: string | undefined): SalvageFxName {
  const g = grade ?? '';
  if (COPPER.has(g)) return 'piece_copper';
  if (BRASS.has(g)) return 'piece_brass';
  if (ALU.has(g)) return 'piece_alu';
  if (CAST.has(g)) return 'piece_cast';
  return 'piece_steel';
}

type Loose = { type: string; [field: string]: unknown };

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** True when the event says someone other than the boss did it (a crew member, the away pass). */
function notTheBoss(e: Loose): boolean {
  const by = str(e.by) ?? str((e.ticket as Loose | undefined)?.by);
  return (by !== undefined && by !== 'boss') || e.away === true;
}

/** A collection is "big" with copper on it or a grade's first lot (section 7). */
function bigLot(e: Loose): boolean {
  if (e.first === true || e.firstGrade === true) return true;
  const t = e.ticket as { lines?: readonly { grade?: unknown }[]; first?: unknown } | undefined;
  if (t?.first === true) return true;
  return (t?.lines ?? []).some((l) => typeof l.grade === 'string' && COPPER.has(l.grade));
}

/**
 * The sounds of one rules event (yard-stage1.md 2.14), in order. Unknown events and the ones the screen
 * voices itself (workStart: the work segment; heatStart: the burner's segment; machineOut, skipFull) give none.
 */
export function salvageSoundsFor(event: Loose): SoundCue[] {
  const quiet = notTheBoss(event) ? ({ haptic: false } as const) : {};
  switch (event.type) {
    case 'pieceOff':
      return [{ key: event.to === 'waste' ? 'thud_waste' : pieceKey(str(event.grade)), ...quiet }];
    case 'pickup':
      return [{ key: 'pickup' }];
    case 'swap':
      return [{ key: 'swap' }];
    case 'loadFull':
      return [{ key: 'load_full' }];
    case 'feed':
      return [{ key: 'feed' }];
    case 'weighIn':
    case 'bridgeWeighIn':
      return [{ key: 'scale_beeps' }, { key: 'scale_print', delayMs: 420, duck: 'ticket' }];
    case 'dropOffSlip':
      return [{ key: 'slip' }];
    case 'roundLoad':
      return [{ key: 'flatbed_load' }];
    case 'roundBack':
      return [{ key: 'flatbed_arrive' }];
    case 'collected':
      return [{ key: bigLot(event) ? 'coin_big' : 'coin', ...quiet }];
    case 'lesson':
      return [{ key: 'lesson' }];
    case 'dealDelivered':
      return [{ key: 'deal_stamp' }];
    case 'owned':
      return [{ key: 'buy' }];
    case 'refused':
      return [{ key: 'denied' }];
    case 'arrival':
      switch (event.kind) {
        case 'drop-off':
          return [{ key: 'set_down' }];
        case 'flatbed':
          return [{ key: 'crane_set' }];
        case 'van':
          return [{ key: 'van' }];
        case 'truck':
          return [{ key: 'truck_reverse' }];
        case 'crew':
          return [{ key: 'door' }];
        default:
          return [];
      }
    case 'hired':
      return [{ key: 'crew_hello', delayMs: 600 }];
    case 'readyToPour':
      return [{ key: 'ready_chime' }];
    case 'pour':
      return [{ key: 'pour_glug', duck: 'pour' }, { key: 'cool_ticks', delayMs: 1900 }];
    case 'hook':
      return [{ key: 'hook_swap' }];
    case 'tip':
      return [{ key: 'skip_tip' }];
    case 'passed':
      return [{ key: 'chip_slide' }];
    case 'rung':
      return [{ key: 'rung_sign', duck: 'rung' }];
    case 'goal':
      return [{ key: 'goal_tick' }];
    case 'awayReport':
      return [{ key: 'coin_big', haptic: false }];
    default:
      return [];
  }
}

/** The loading animation's ids (src/ui/salvage/loading/timeline.ts LOADING_SOUNDS asks for these, and load_beeps per plate). */
export const SALVAGE_LOADING_SOUNDS = {
  crane: 'load_crane',
  plate: 'load_clank',
  count: 'load_beeps',
  pour: 'load_pour',
  cooled: 'load_cool',
  calm: 'load_loop',
  gate: 'gate_open',
} as const satisfies Record<string, SalvageFxName>;

/** The walk: the footstep by ground tile (ground ids of the map; anything else is concrete). */
export function stepKey(ground: string | undefined): SalvageFxName {
  if (ground === 'gravel' || ground === 'lane') return 'step_gravel';
  if (ground === 'asphalt' || ground === 'weighbridge') return 'step_asphalt';
  return 'step_concrete';
}
