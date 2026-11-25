/**
 * What the rules decided, for the UI thread: at each store change of the salvage state (10 a second at
 * most, the store's tick) the rules' FrameTable (src/engine/salvage.ts `frame`) is read and the part the
 * frame loop draws today goes into ONE shared value (./frameLoop.ts `RulesTable`): each interactable's
 * cut (a thing's ring, 2 when it is gone, -1 for a place) and the carried pieces. The screen never
 * computes a rule itself.
 *
 * Hour-0 joint (contract step): the placeholder actors draw only this much of the frame; the world
 * package (package 3) draws the rest of it (machines' looks, bays, crew, the truck's skip, the flatbed,
 * labels, the chevron) when it replaces them.
 */
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { NO_RULES, type RulesTable } from './frameLoop';
import { ACT_WRECK, type YardLayout } from './yard';

/** The table of a frame over a yard's interactables. Pure. */
export function rulesTable(yard: YardLayout, f: R.FrameTable): RulesTable {
  const byUid = new Map(f.things.map((t) => [t.uid, t]));
  return {
    cut: yard.actList.map((a) => {
      if (a.kind !== ACT_WRECK) return -1;
      const t = byUid.get(a.id);
      return !t ? 2 : t.work !== null ? Math.min(0.99, Math.max(0.01, t.work)) : 0;
    }),
    carried: f.load.pieces.length,
  };
}

export function useRulesTable(yard: YardLayout): SharedValue<RulesTable> {
  const table = useSharedValue<RulesTable>(NO_RULES);
  useEffect(() => {
    let last: R.SalvageState | null = null;
    const push = () => {
      const { cfg, game } = useGame.getState();
      const g = game as R.SalvageGame;
      if (!R.isSalvage(cfg) || !g.salvage || g.salvage === last) return;
      last = g.salvage;
      table.value = rulesTable(yard, R.frame(cfg, g));
    };
    push();
    return useGame.subscribe(push);
  }, [yard, table]);
  return table;
}
