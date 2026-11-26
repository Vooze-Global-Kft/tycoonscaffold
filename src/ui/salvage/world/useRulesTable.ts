/**
 * What the rules decided, for the UI thread: at each store change of the salvage state (ten a second at
 * most, the store's tick) the rules' FrameTable (src/engine/salvage.ts `frame`) is read and turned into ONE
 * shared value (./actors.ts `RulesScene`): the things, pieces, machines, bays, skips and circles as atlas
 * items, the solids of the whole things, and the actors' facts (the boss's carrier, load and act, crew
 * legs, the truck, the flatbed, the public's car) that the frame loop moves. The screen never computes a
 * rule itself. Before the art is baked the scene holds the facts and no items; it is pushed again when the
 * bake ends.
 */
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
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

export function useRulesTable(yard: YardLayout): SharedValue<RulesScene> {
  const table = useSharedValue<RulesScene>(NO_SCENE);
  useEffect(() => {
    let last: R.SalvageState | null = null;
    let n = 0;
    const push = (force = false) => {
      const { cfg, game } = useGame.getState();
      const g = game as R.SalvageGame;
      if (!R.isSalvage(cfg) || !g.salvage || (g.salvage === last && !force)) return;
      last = g.salvage;
      try {
        table.value = rulesTable(yard, R.frame(cfg, g), cfg.salvage, currentResolver(), ++n);
      } catch (e) {
        console.warn('salvage: the rules frame could not be read', e);
      }
    };
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
