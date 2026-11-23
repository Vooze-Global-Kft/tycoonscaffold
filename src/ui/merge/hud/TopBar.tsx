/**
 * The top bar (spec 4.2): the purse (a RollingNumber), the season chip "Spring · Festival 0/4",
 * the menu button. PLACEHOLDER of the skeleton: the purse and the chip as plain text.
 * Owned by the bars, sheets and spokes package (docs/design/market-build-plan.md).
 */
import { Text } from 'react-native';
import { formatShort } from '../../../engine/format';
import * as R from '../../../engine/merge';
import type { MergeLayout } from '../layout';
import { PH, Placeholder } from '../Placeholder';
import { S } from '../strings';
import { useMerge } from '../useMerge';

export function TopBar({ layout }: { layout: MergeLayout }) {
  const cash = useMerge((_c, g) => Math.floor(g.cash), 0);
  const chip = useMerge((cfg, g) => S.shell.seasonChip(R.seasonRow(cfg, g.merge.season).name, g.merge.festival.lines.filter((l) => l.filled).length, g.merge.festival.lines.length), '');
  return (
    <Placeholder rect={layout.topBar} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
      <Text style={{ color: PH.amber, fontSize: 18 }} allowFontScaling={false}>
        {formatShort(cash)}
      </Text>
      <Text style={{ color: PH.paper, fontSize: 12 }} allowFontScaling={false}>
        {chip}
      </Text>
      <Text style={{ color: PH.paper, fontSize: 12 }} allowFontScaling={false}>
        {S.hud.menu}
      </Text>
    </Placeholder>
  );
}
