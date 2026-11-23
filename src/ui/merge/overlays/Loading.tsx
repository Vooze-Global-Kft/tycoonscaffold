/**
 * The loading screen (spec 4.6, `ModeEntry.Loading`): the street at dusk, the wire's lanterns
 * lighting one by one, the name in paper-cut letters. PLACEHOLDER of the skeleton: the indigo
 * ground, a row of amber dots and the app's name. Plain views only (it shows before the fonts and
 * the atlas). Owned by the hints and platform package (docs/design/market-build-plan.md).
 */
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../../../state/store';
import { PH } from '../Placeholder';
import { S } from '../strings';

export function MergeLoading() {
  const name = useGame((s) => s.cfg.app.displayName);
  return (
    <View style={styles.root}>
      <View style={styles.wire}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.lantern} />
        ))}
      </View>
      <Text style={styles.name} allowFontScaling={false}>
        {name}
      </Text>
      <Text style={styles.sub} allowFontScaling={false}>
        {S.hints.loading}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PH.indigo, alignItems: 'center', justifyContent: 'center' },
  wire: { flexDirection: 'row', gap: 18, marginBottom: 24 },
  lantern: { width: 14, height: 18, borderRadius: 7, backgroundColor: PH.amber },
  name: { color: PH.paper, fontSize: 28, letterSpacing: 2 },
  sub: { color: PH.brass, fontSize: 13, marginTop: 8 },
});
