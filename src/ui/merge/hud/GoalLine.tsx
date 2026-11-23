/**
 * The goal line (spec 2.10, 4.2): one goal, its price and estimate from `advice`; a tap opens its
 * sheet. PLACEHOLDER of the skeleton: a fixed label (advice is not built yet).
 * Owned by the bars, sheets and spokes package (docs/design/market-build-plan.md).
 */
import type { MergeLayout } from '../layout';
import { Placeholder } from '../Placeholder';
import { S } from '../strings';

export function GoalLine({ layout }: { layout: MergeLayout }) {
  return <Placeholder rect={layout.goalLine} label={`${S.hud.goalPlaceholder} · ${S.shell.placeholder}`} />;
}
