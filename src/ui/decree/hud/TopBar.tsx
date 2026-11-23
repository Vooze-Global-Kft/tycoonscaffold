/**
 * The top bar (spec 4.1): the treasury and its rate, the approval chip ("62 % ×1.14"), the gossip
 * chip and the menu. PLACEHOLDER now: plain text from the rules' `topBar` (the treasury becomes a
 * RollingNumber with no lineHeight; the rate, approval and gossip are sized by hand at s).
 * Keeps its name and props. Written by the skeleton; owned by P7 (docs/design/office-build-plan.md).
 */
import { StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/decree';
import type { DeskLayout } from '../layout';
import { at, PH } from '../placeholder';
import { dibs, S } from '../strings';
import { useDecreeShallow } from '../useDecree';

const NONE: R.TopBar = { cash: 0, income: 0, approval: 0, multiplier: 1, gossip: 0, gossipMax: 0 };

export function TopBar({ layout }: { layout: DeskLayout }) {
  const t = useDecreeShallow((cfg, g) => {
    const b = R.topBar(cfg, g);
    return { ...b, cash: R.roundDibs(cfg, b.cash), income: R.roundDibs(cfg, b.income) };
  }, NONE);
  const fs = 12 * layout.s;
  return (
    <View style={[at(layout.topBar), styles.bar]}>
      <View style={[at({ ...layout.bar.treasury, y: 0 }), styles.cell]}>
        <Text allowFontScaling={false} style={[styles.cash, { fontSize: 15 * layout.s }]} numberOfLines={1}>
          {dibs(t.cash)} <Text style={{ fontSize: fs, color: PH.mustard }}>{S.hud.rate(dibs(t.income))}</Text>
        </Text>
      </View>
      <View style={[at({ ...layout.bar.approval, y: 0 }), styles.cell]}>
        <Text allowFontScaling={false} style={[styles.text, { fontSize: fs }]} numberOfLines={1}>{S.hud.approvalChip(t.approval, t.multiplier.toFixed(2))}</Text>
      </View>
      <View style={[at({ ...layout.bar.gossip, y: 0 }), styles.cell]}>
        <Text allowFontScaling={false} style={[styles.text, { fontSize: fs }]} numberOfLines={1}>{S.hud.gossipChip(t.gossip, t.gossipMax)}</Text>
      </View>
      <View style={[at({ ...layout.bar.menu, y: 0 }), styles.cell]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: PH.walnut },
  cell: { justifyContent: 'center' },
  cash: { color: PH.paper, fontWeight: '700' },
  text: { color: PH.paper },
});
