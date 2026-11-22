/**
 * The tutorial script of the list homes (sim and classic modes): the engine's guideHint, the
 * route to each hint's control, and the stage list that holds it. Installed by those modes'
 * entries (src/modes/sim, src/modes/classic) as the hint source of the tutorial hand.
 */
import type { Stage } from '../../engine/chain';
import * as View_ from '../../engine/view';
import { hintKey, type GuideHint } from '../../engine/view';
import { useGame } from '../../state/store';
import { hintRoute } from './hintRoute';
import type { Hint, HintSource } from '../hints/source';
import { useHomeUi } from './uiState';

interface ListHint extends Hint {
  /** The stage list that holds the hint's own control (null = not in a stage list). */
  stage: Stage | null;
}

/** Which stage list holds a hint's own control, and the row key in it (null = not in a stage list). */
function hintRow(h: GuideHint): { stage: Stage; row: string } | null {
  switch (h.kind) {
    case 'buyBusiness':
    case 'hireBusiness':
      return { stage: 'production', row: h.businessId };
    case 'buyTransport':
      return { stage: 'transport', row: 'transport' };
    case 'hireTransport':
      return { stage: 'transport', row: 'transportManager' };
    case 'buySales':
      return { stage: 'sales', row: 'sales' };
    default:
      return null;
  }
}

function toHint(h: GuideHint): ListHint {
  const r = hintRow(h);
  return { key: hintKey(h), route: hintRoute(h), stage: r?.stage ?? null, row: r?.row ?? null };
}

/**
 * Every hint the engine would show, most urgent first. The engine may offer an ordered list
 * (`guideHints`); otherwise it is the one hint from `guideHint`.
 */
function askEngine(): GuideHint[] {
  const { cfg, game } = useGame.getState();
  const now = Date.now();
  try {
    const many = (View_ as { guideHints?: (c: typeof cfg, g: typeof game, n: number) => GuideHint[] }).guideHints;
    if (many) return many(cfg, game, now);
    const one = View_.guideHint(cfg, game, now);
    return one ? [one] : [];
  } catch {
    return [];
  }
}

export const listHints: HintSource<ListHint> = {
  ask: () => askEngine().map(toHint),
  // Drawings in the tab shell's scenes (no label to keep clear of); the skill button's name sits under it.
  sceneKeys: ['tapStation', 'bell', 'startRush', 'openChest', 'missionsButton'],
  fromAboveKeys: ['startRush'],
  // Pointing at the stage chip the player is already on would say nothing.
  useIsHere() {
    const tab = useGame((s) => s.tab);
    const stage = useHomeUi((s) => s.stage);
    return (key) => tab === 'home' && key === `stage:${stage}`;
  },
  // A new hint: switch the stage list once if its control is in another one.
  onNewHint(hint) {
    if (hint.stage && useGame.getState().tab === 'home') useHomeUi.getState().setStage(hint.stage);
  },
  reveal(hint) {
    if (!hint.row || !hint.stage) return false;
    if (useGame.getState().tab !== 'home' || useHomeUi.getState().stage !== hint.stage) return false;
    useHomeUi.getState().showRow(hint.stage, hint.row);
    return true;
  },
};
