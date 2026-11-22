/**
 * Mode entry "haul" (the coming Space Miner: a top-down orbital map, drones dragged onto rocks, a
 * freighter launched to sell; docs/design/space-design.md).
 *
 * PLACEHOLDER. Only the entry exists: it renders a labelled screen so a haul game builds, starts
 * and can be checked for what its bundle holds (npm run check:bundle). The real mode brings its
 * whole screen here (no tab bar) with its own overlays, its tutorial (`hints`) and its portraits
 * (`parts`); it must not import the sim or classic folders (scripts/lib/modes.js).
 */
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../../state/store';
import type { ModeEntry } from '../contract';

function HaulPlaceholder() {
  const name = useGame((s) => s.cfg.app.displayName);
  const colors = useGame((s) => s.cfg.theme.colors);
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={styles.centre}>
        <Text style={[styles.title, { color: colors.primary }]}>{name}</Text>
        <Text style={[styles.label, { color: colors.text }]}>Haul mode placeholder</Text>
        <Text style={[styles.note, { color: colors.textMuted }]}>The orbital map is not built yet (src/modes/haul).</Text>
      </View>
    </SafeAreaView>
  );
}

const entry: ModeEntry = {
  id: 'haul',
  Shell: HaulPlaceholder,
};

export default entry;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '900' },
  label: { fontSize: 18, fontWeight: '700' },
  note: { fontSize: 14, textAlign: 'center' },
});
