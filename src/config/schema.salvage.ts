/**
 * PLACEHOLDER config of the salvage mode (the scrapyard, game "scrap-yard"): the game data's `salvage`
 * block as the ground work needs it (docs/design/yard-ground.md): the test yard's size and view, the
 * worker's and the truck's speeds and sizes, the test props, the helpers, and the few numbers of the
 * test loop (cut, carry, unload). Nothing here is a designed rule or a tuned number: the rules
 * engineers replace this block with the specification's (docs/design/yard-design.md) and keep only
 * what the world still reads (`yard`, the sizes and speeds), renamed as they like.
 *
 * The shared schema (./schema.ts) keeps the block opaque; the salvage engine mode parses it with this
 * schema when the salvage entry installs it (src/engine/salvageMode.ts `config`), so no other game's
 * bundle carries it (a salvage-mode file: scripts/lib/modes.js MODE_FOLDERS.salvage).
 *
 * UNITS (yard-ground.md "Coordinates"): the world is the yard's ground plane in metres, x to the right
 * (east), y towards the viewer (south); a prop's (x, y) is the centre of its footprint. `yard.ppm` is
 * points per metre across the screen; `yard.tilt` the three-quarter view's foreshortening of y.
 */
import { z } from 'zod';

/** A thing standing in the yard: its footprint (a circle of radius `r`, or a box `w` by `d` metres). */
export const PropSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** What it is. wreck: cut it; machine: unload into it; truck: drive it; wall, pile, crate: in the way. */
  kind: z.enum(['wreck', 'machine', 'truck', 'wall', 'pile', 'crate']),
  x: z.number(),
  y: z.number(),
  shape: z.enum(['circle', 'box']),
  /** Radius of a circle, metres. */
  r: z.number().positive().default(1),
  /** Width (along x) and depth (along y) of a box, metres. */
  w: z.number().positive().default(2),
  d: z.number().positive().default(2),
  /** Height drawn above the ground, metres (the sprite only; collision is on the ground plane). */
  h: z.number().positive().default(1.5),
  /** The worker and the truck cannot enter it (a crate on the ground is solid too). */
  solid: z.boolean().default(true),
});
export type SalvageProp = z.infer<typeof PropSchema>;

export const SalvageSchema = z.object({
  /** True while the block is the ground work's placeholder (validate says so as a warning). */
  skeletonPlaceholder: z.boolean().default(false),
  yard: z
    .object({
      /** Ground size in metres. At 40 pt a metre, 64 x 40 m is 3.0 screens wide and 2.9 high on an 844 x 390 phone. */
      width: z.number().min(10).default(64),
      depth: z.number().min(10).default(40),
      /** Points per metre across the screen. */
      ppm: z.number().min(8).max(120).default(40),
      /** How much the ground's depth is foreshortened in the three-quarter view (1 = top-down). */
      tilt: z.number().min(0.4).max(1).default(0.7),
      /** Ground tile size, metres. */
      tile: z.number().positive().default(2),
    })
    .default({ width: 64, depth: 40, ppm: 40, tilt: 0.7, tile: 2 }),
  worker: z
    .object({
      /** Walking speed, metres a second. */
      speed: z.number().positive().default(4.2),
      /** The worker's footprint radius, metres. */
      radius: z.number().positive().default(0.35),
      /** How far from a thing's edge the worker counts as next to it, metres. */
      reach: z.number().positive().default(0.8),
      /** Starting place, metres. */
      x: z.number().default(16),
      y: z.number().default(12),
    })
    .default({ speed: 4.2, radius: 0.35, reach: 0.8, x: 16, y: 12 }),
  truck: z
    .object({
      speed: z.number().positive().default(9),
      /** Its footprint as a circle, metres: wider than the worker, so it cannot pass a narrow gap. */
      radius: z.number().positive().default(1.3),
      /** How close the worker must come to its centre to get in, metres. */
      enter: z.number().positive().default(2.0),
    })
    .default({ speed: 9, radius: 1.3, enter: 2.0 }),
  /** PLACEHOLDER numbers of the test loop: cut a wreck, carry its pieces, unload them one by one. */
  loop: z
    .object({
      /** Seconds standing next to a wreck to cut it. */
      cutSeconds: z.number().positive().default(2),
      /** Pieces one wreck gives. */
      pieces: z.number().int().positive().default(3),
      /** Pieces the worker carries at most. */
      capacity: z.number().int().positive().default(6),
      /** Seconds between two pieces unloaded at the machine. */
      unloadSeconds: z.number().positive().default(0.35),
      /** Placeholder cash a piece pays when unloaded. */
      pieceValue: z.number().nonnegative().default(5),
      /** Seconds until a cut wreck is whole again (so the test loop never runs dry). */
      respawnSeconds: z.number().positive().default(20),
      /** A presence sample older than this is ignored (the screen stopped sending), seconds. */
      staleSeconds: z.number().positive().default(0.6),
    })
    .default({ cutSeconds: 2, pieces: 3, capacity: 6, unloadSeconds: 0.35, pieceValue: 5, respawnSeconds: 20, staleSeconds: 0.6 }),
  /** Helpers walking by themselves between a wreck and the machine (on screen only in the ground work). */
  helpers: z
    .object({
      count: z.number().int().min(0).max(200).default(6),
      speed: z.number().positive().default(2.4),
      /** A point every helper walks through between the machine and its wreck (a gap in a wall), metres; none: straight. */
      via: z.tuple([z.number(), z.number()]).optional(),
    })
    .default({ count: 6, speed: 2.4 }),
  props: z.array(PropSchema).default([]),
});

export type SalvageContent = z.infer<typeof SalvageSchema>;

/** Cross-field checks of the block (src/config/lint.ts). */
export function lintSalvage(s: SalvageContent): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const p of s.props) {
    if (ids.has(p.id)) out.push(`duplicate prop id "${p.id}"`);
    ids.add(p.id);
    if (p.x < 0 || p.y < 0 || p.x > s.yard.width || p.y > s.yard.depth) out.push(`prop "${p.id}" stands outside the yard`);
  }
  if (!s.props.some((p) => p.kind === 'machine')) out.push('the yard has no machine');
  if (s.props.filter((p) => p.kind === 'truck').length > 1) out.push('the ground work drives one truck only');
  return out;
}
