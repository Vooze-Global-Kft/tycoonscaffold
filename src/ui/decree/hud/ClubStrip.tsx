/**
 * The club strip (spec 4.1): each club's icon with a mood ring, numbers for 2 s on a change or a tap
 * (always with 3 clubs); while a drag is armed, rings preview its values. PLACEHOLDER now: each club's
 * short name and mood as text, from the rules' `clubStrip`.
 * Keeps its name and props. Written by the skeleton; owned by P7 (docs/design/office-build-plan.md).
 */
import { StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/decree';
import type { DeskLayout } from '../layout';
import { at, PH } from '../placeholder';
import { useDecree } from '../useDecree';

export function ClubStrip({ layout }: { layout: DeskLayout }) {
  // One primitive per render: "Bus 50|Shops 50|Vegetables 50".
  const line = useDecree((cfg, g) => R.clubStrip(cfg, g).map((c) => `${c.short} ${c.mood}${c.boycott ? ' !' : ''}`).join('|'), '');
  const clubs = line ? line.split('|') : [];
  return (
    <View style={[at(layout.clubStrip), styles.strip]}>
      {clubs.map((c) => (
        <Text key={c} allowFontScaling={false} style={[styles.text, { fontSize: 11 * layout.s }]} numberOfLines={1}>
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: PH.baize },
  text: { color: PH.paper },
});
