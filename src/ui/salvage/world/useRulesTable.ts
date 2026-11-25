/**
 * What the rules decided, for the UI thread: at each store change of the salvage state (10 a second
 * at most, the store's tick) the cut progress of every wreck and the carried stack go into ONE shared
 * value the frame loop reads (./frameLoop.ts `RulesTable`). The screen never computes a rule itself.
 */
import { useEffect } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { NO_RULES, type RulesTable } from './frameLoop';
import { ACT_WRECK, type YardLayout } from './yard';

/** The table of a salvage state over a yard's interactables. Pure. */
export function rulesTable(yard: YardLayout, s: R.SalvageState): RulesTable {
  const byId = new Map(s.wrecks.map((w) => [w.id, w]));
  return {
    cut: yard.actList.map((a) => {
      if (a.kind !== ACT_WRECK) return -1;
      const w = byId.get(a.id);
      return !w ? 0 : w.cutAt !== null ? 2 : w.cut;
    }),
    carried: s.carried,
  };
}

export function useRulesTable(yard: YardLayout): SharedValue<RulesTable> {
  const table = useSharedValue<RulesTable>(NO_RULES);
  useEffect(() => {
    let last: R.SalvageState | null = null;
    const push = () => {
      const g = useGame.getState().game as R.SalvageGame;
      if (!g.salvage || g.salvage === last) return;
      last = g.salvage;
      table.value = rulesTable(yard, g.salvage);
    };
    push();
    return useGame.subscribe(push);
  }, [yard, table]);
  return table;
}
