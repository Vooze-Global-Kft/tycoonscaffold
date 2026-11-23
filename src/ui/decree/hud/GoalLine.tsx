/**
 * The goal line (spec 2.16, 4.1): words, price and "about 20 s / 2 min / 1 h" in at most 34
 * characters, from the rules' `goalLine` and `about`. PLACEHOLDER now: the rule is not built, so it
 * shows that. Keeps its name and props. Written by the skeleton; owned by P7.
 */
import { StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/decree';
import type { DeskLayout } from '../layout';
import { at, PH } from '../placeholder';
import { S } from '../strings';
import { useDecree } from '../useDecree';

export function GoalLine({ layout }: { layout: DeskLayout }) {
  const line = useDecree((cfg, g) => R.goalLine(cfg, g).kind, `${S.shell.placeholder} · goalLine ${S.shell.notBuilt}`);
  return (
    <View style={[at(layout.goalLine), styles.line]}>
      <Text allowFontScaling={false} style={[styles.text, { fontSize: 12 * layout.s }]} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { justifyContent: 'center', alignItems: 'center' },
  text: { color: PH.paper },
});
