/**
 * What the rules decided, for the UI thread: at each store change of the salvage state (ten a second at
 * most, the store's tick) the rules' FrameTable (src/engine/salvage.ts `frame`) is read and turned into ONE
 * shared value (./actors.ts `RulesScene`): the things, pieces, machines, bays, skips and circles as atlas
 * items, the solids of the whole things, and the actors' facts (the boss's carrier, load and act, crew
 * legs, the truck, the flatbed, the public's car) that the frame loop moves. The screen never computes a
 * rule itself. Before the art is baked the scene holds the facts and no items; it is pushed again when the
 * bake ends.
 *
 * owner1 L1 / L2 (the owner's review, point 1: "helper laggy"): the frame is read ONCE per store change (the
 * rules' frame() is memoised on the state, so the hud, the rings, the hints and the labels that read it at the
 * same change share that one object), a store change whose frame keeps its `scene` stamp (a presence sample
 * that moved only the boss, who is the screen's own) pushes NOTHING to the UI thread, and the scene's atlas
 * items travel in their own shared value (`rulesItems`) only when the list itself changed (./actors.ts
 * reuses it while things, pieces and the rest are the same): an ordinary tick copies the actors' few numbers,
 * not the yard's hundreds of sprites.
 */
import { useEffect } from 'react';
import { makeMutable, useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { ACT_WRECK, type YardLayout } from './yard';
import { ARRIVAL_PHASE, NO_SCENE, makeResolver, rulesScene, type Resolver, type RulesScene } from './actors';
import { onYardArt, yardArtNow } from './useYard';
import { packVisitors } from './worksPeopleMotion';

/** The ground work's name for the scene (the shell imports it as the type of `rules`). */
export type RulesTable = RulesScene;

const NONE: Resolver = () => -1;

/** The scene of a frame over a yard (pure; the tests call it with a resolver of their own). */
export function rulesTable(yard: YardLayout, f: R.FrameTable, cfgSalvage?: R.SalvageConfig['salvage'], res: Resolver = NONE, n = 0): RulesScene {
  const byUid = new Map(f.things.map((t) => [t.uid, t]));
  const scene = cfgSalvage ? rulesScene(cfgSalvage, f, res, n) : { ...NO_SCENE, t: f.t, n, carried: f.load.pieces.length };
  scene.cut = yard.actList.map((a) => {
    if (a.kind !== ACT_WRECK) return -1;
    const t = byUid.get(a.id);
    return !t ? 2 : t.work !== null ? Math.min(0.99, Math.max(0.01, t.work)) : 0;
  });
  return scene;
}

let resolverFor: { art: object; res: Resolver } | null = null;
function currentResolver(): Resolver {
  const art = yardArtNow();
  if (!art) return NONE;
  if (!resolverFor || resolverFor.art !== art) resolverFor = { art, res: makeResolver(art.sheets) };
  return resolverFor.res;
}
export { currentResolver };

/** The scene's atlas items (RulesScene.items), on the UI thread; replaced only when the list changed. */
export const rulesItems = makeMutable<number[]>([]);
/** Scenes and item lists pushed to the UI thread so far (owner1 phone 3: the development panel's 'push' rates). */
export const pushCounts = { scenes: 0, items: 0, works: 0 };
const NO_ITEMS: number[] = [];

// -----------------------------------------------------------------------------------------------------------------------
// C-WORLD-2 (PLAN2 2.8): THE WORKS' MOVING THINGS FOR THE UI THREAD, in their own shared value (`rulesWorks`), pushed
// only when their numbers changed, and never below the works' opening (the frame carries no `works` there: the value stays
// NO_WORKS, the first yard pushes nothing more than today).
// - `vehicles`: the works' own vehicles that are not the rules' arrivals, ARRIVAL numbers each in the arrivals' layout
//   (actors.ts RulesScene.arrivals: kind code, phase code, from x, y, to x, y, t0, t1, path points, first point), so
//   ./worksVehicleMotion.ts draws them with the same worklet as the arrivals the frame loop hands it. Today: the
//   reclamation dealer's van at the Yard sale (FrameTable.van: its phase and span; it stands at `stop`, from = to).
// - `visitors`: the Yard sale's public, packed by ./worksPeopleMotion.ts packVisitors (its layout, VISITOR numbers each).
// The frame loop calls the works' worklets only while one of the two lists holds something (frameLoop.ts).
// -----------------------------------------------------------------------------------------------------------------------

/** The works' moving things as numbers (see above). `n` counts the pushes (a new object each). */
export interface WorksPack {
  n: number;
  vehicles: number[];
  visitors: number[];
}
export const NO_WORKS: WorksPack = { n: 0, vehicles: [], visitors: [] };
/**
 * Kind codes of the works' own vehicles in `vehicles`, after actors.ts ARRIVAL_CODE's (recovery 5, lowLoader 6): the
 * dealer's van 7. A STAND-IN of C-WORLD-2 until actors.ts ARRIVAL_CODE carries it ([seam] 28 Nov, C-WORLD-2).
 */
export const WORKS_VEHICLE_CODE: Readonly<Record<string, number>> = { dealerVan: 7 };
/** The dealer's van's phases as the arrivals' phase codes (in 0, loading at its stop as a set-down 1, out 2). */
const VAN_PHASE: Readonly<Record<string, number>> = { in: ARRIVAL_PHASE.in, load: ARRIVAL_PHASE.setDown, out: ARRIVAL_PHASE.out };

/** The works' vehicles of a frame in the arrivals' layout (none below the opening). Pure. */
export function packWorksVehicles(f: R.FrameTable): number[] {
  if (f.works === undefined) return NO_ITEMS;
  const out: number[] = [];
  const v = f.van;
  if (v && v.stop) out.push(WORKS_VEHICLE_CODE.dealerVan, VAN_PHASE[v.phase] ?? ARRIVAL_PHASE.in, v.stop.x, v.stop.y, v.stop.x, v.stop.y, v.span.t0, v.span.t1, 0, 0);
  return out.length === 0 ? NO_ITEMS : out;
}

const sameNums = (a: readonly number[], b: readonly number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!(a[i] === b[i] || (a[i] !== a[i] && b[i] !== b[i]))) return false;
  return true;
};

/**
 * The works' pack of a frame: NO_WORKS below the opening and while both lists are empty; `prev` itself while its numbers
 * are the same (nothing to push); else a new pack numbered prev.n + 1. Pure.
 */
export function worksPack(f: R.FrameTable, prev: WorksPack = NO_WORKS): WorksPack {
  if (f.works === undefined) return NO_WORKS;
  const vehicles = packWorksVehicles(f);
  const visitors = packVisitors(f.visitors);
  if (vehicles.length === 0 && visitors.length === 0) return prev.vehicles.length === 0 && prev.visitors.length === 0 ? prev : NO_WORKS;
  if (sameNums(vehicles, prev.vehicles) && sameNums(visitors, prev.visitors)) return prev;
  return { n: prev.n + 1, vehicles, visitors };
}

/** The works' moving things on the UI thread (C-WORLD-2); NO_WORKS below the works' opening. */
export const rulesWorks = makeMutable<WorksPack>(NO_WORKS);

/**
 * The pusher behind useRulesTable, testable without React: `read()` is called at each store change and pushes
 * at most one scene (`out.scene`) and one item list (`out.items`). Counts in `stats`.
 */
export function makeRulesPusher(
  yard: YardLayout,
  get: () => { cfg: unknown; game: unknown },
  out: { scene: (s: RulesScene) => void; items: (a: number[]) => void; works?: (w: WorksPack) => void },
  resolver: () => Resolver = currentResolver,
): { read: (force?: boolean) => void; stats: { reads: number; frames: number; scenes: number; items: number; works: number } } {
  let last: R.SalvageState | null = null;
  let lastFrame: R.FrameTable | null = null;
  let lastStamp: number | undefined;
  let lastItems: number[] | null = null;
  let lastWorks: WorksPack = NO_WORKS;
  let n = 0;
  const stats = { reads: 0, frames: 0, scenes: 0, items: 0, works: 0 };
  const read = (force = false) => {
    const { cfg, game } = get();
    const g = game as R.SalvageGame;
    if (!R.isSalvage(cfg as never) || !g?.salvage || (g.salvage === last && !force)) return;
    last = g.salvage;
    stats.reads++;
    try {
      const f = R.frame(cfg as R.SalvageConfig, g);
      if (f !== lastFrame) stats.frames++;
      const same = !force && lastFrame !== null && f.scene !== undefined && f.scene === lastStamp;
      lastFrame = f;
      lastStamp = f.scene;
      if (same) return;
      const sc = rulesTable(yard, f, (cfg as R.SalvageConfig).salvage, resolver(), ++n);
      if (sc.items !== lastItems || force) {
        lastItems = sc.items;
        out.items(sc.items);
        stats.items++;
      }
      out.scene({ ...sc, items: NO_ITEMS });
      stats.scenes++;
      // C-WORLD-2: the works' vehicles and visitors, only when their numbers changed (never below the opening).
      const wp = worksPack(f, lastWorks);
      if (wp !== lastWorks) {
        lastWorks = wp;
        out.works?.(wp);
        stats.works++;
      }
    } catch (e) {
      console.warn('salvage: the rules frame could not be read', e);
    }
  };
  return { read, stats };
}

export function useRulesTable(yard: YardLayout): SharedValue<RulesScene> {
  const table = useSharedValue<RulesScene>(NO_SCENE);
  useEffect(() => {
    const { read: push } = makeRulesPusher(yard, () => useGame.getState(), {
        scene: (s) => {
          pushCounts.scenes++;
          table.value = s;
        },
        items: (a) => {
          pushCounts.items++;
          rulesItems.value = a;
        },
        works: (w) => {
          pushCounts.works++;
          rulesWorks.value = w;
        },
      });
    push();
    const off = onYardArt(() => push(true));
    const unsub = useGame.subscribe(() => push());
    return () => {
      off();
      unsub();
    };
  }, [yard, table]);
  return table;
}
