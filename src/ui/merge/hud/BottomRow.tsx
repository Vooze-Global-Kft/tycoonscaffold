/**
 * The bottom row (spec 4.2): the Basket (a drop target; the undo chip floats above it) and the
 * Book, Lanterns, Season and Shop buttons. PLACEHOLDER of the skeleton: labelled boxes at the
 * layout's rectangles. Owned by the bars, sheets and spokes package (docs/design/market-build-plan.md).
 */
import type { MergeLayout } from '../layout';
import { Placeholder } from '../Placeholder';
import { S } from '../strings';

export function BottomRow({ layout }: { layout: MergeLayout }) {
  const names = [S.hud.book, S.hud.lanterns, S.hud.season, S.hud.shop];
  return (
    <>
      <Placeholder rect={layout.basket} label={S.hud.basket} />
      {layout.buttons.map((r, i) => (
        <Placeholder key={names[i]} rect={r} label={names[i]} />
      ))}
    </>
  );
}
