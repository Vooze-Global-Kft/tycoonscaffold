/**
 * The term ribbon (spec 4.1, 2.10): "Day 41/80 · NR 9/10 · Lv 52/80" in its long form where it fits,
 * else "Day 41/110 · NR 9/50" with the record as the Poll badge; never wrapped or cut. PLACEHOLDER
 * now: the rules' `termRibbon` is not built, so it shows that.
 * Keeps its name and props. Written by the skeleton; owned by P7 (docs/design/office-build-plan.md).
 */
import { StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/decree';
import type { DeskLayout } from '../layout';
import { at, PH } from '../placeholder';
import { S } from '../strings';
import { useDecree } from '../useDecree';

export function TermRibbon({ layout }: { layout: DeskLayout }) {
  const line = useDecree((cfg, g) => {
    const r = R.termRibbon(cfg, g);
    return `${r.day}/${r.termDays} · ${r.nr} · ${r.record}`;
  }, `${S.shell.placeholder} · termRibbon ${S.shell.notBuilt}`);
  return (
    <View style={[at(layout.ribbon), styles.ribbon]}>
      <Text allowFontScaling={false} style={[styles.text, { fontSize: 11 * layout.s }]} numberOfLines={1}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: { justifyContent: 'center', alignItems: 'center', backgroundColor: PH.ink },
  text: { color: PH.brass },
});
