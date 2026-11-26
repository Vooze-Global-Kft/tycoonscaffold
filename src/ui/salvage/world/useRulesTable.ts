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
import { NO_SCENE, makeResolver, rulesScene, type Resolver, type RulesScene } from './actors';
import { onYardArt, yardArtNow } from './useYard';

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
const NO_ITEMS: number[] = [];

/**
 * The pusher behind useRulesTable, testable without React: `read()` is called at each store change and pushes
 * at most one scene (`out.scene`) and one item list (`out.items`). Counts in `stats`.
 */
export function makeRulesPusher(
  yard: YardLayout,
  get: () => { cfg: unknown; game: unknown },
  out: { scene: (s: RulesScene) => void; items: (a: number[]) => void },
  resolver: () => Resolver = currentResolver,
): { read: (force?: boolean) => void; stats: { reads: number; frames: number; scenes: number; items: number } } {
  let last: R.SalvageState | null = null;
  let lastFrame: R.FrameTable | null = null;
  let lastStamp: number | undefined;
  let lastItems: number[] | null = null;
  let n = 0;
  const stats = { reads: 0, frames: 0, scenes: 0, items: 0 };
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
    } catch (e) {
      console.warn('salvage: the rules frame could not be read', e);
    }
  };
  return { read, stats };
}

export function useRulesTable(yard: YardLayout): SharedValue<RulesScene> {
  const table = useSharedValue<RulesScene>(NO_SCENE);
  useEffect(() => {
    const { read: push } = makeRulesPusher(yard, () => useGame.getState(), { scene: (s) => (table.value = s), items: (a) => (rulesItems.value = a) });
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
