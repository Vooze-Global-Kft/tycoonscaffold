/**
 * The whole game screen of the merge mode (spec 4.1, 4.2): portrait, one screen, no tab bar. The
 * zones come from the pure mergeLayout (./layout.ts); each named slot below is mounted here and
 * owned by a later package (docs/design/market-build-plan.md): the play canvas (street and board),
 * the top bar, the goal line, the bottom row, and the overlays (sheets and spokes). This file
 * belongs to the wiring package (spec 9.2 P3); a slot's file changes, not this one, unless a slot is
 * added.
 */
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomRow } from './hud/BottomRow';
import { GoalLine } from './hud/GoalLine';
import { TopBar } from './hud/TopBar';
import { devInsets } from './devInsets';
import { mergeLayout } from './layout';
import { Overlays } from './overlays/Overlays';
import { PH } from './Placeholder';
import { PlayCanvas } from './play/PlayCanvas';

export function MergeShell() {
  const { width, height, fontScale } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  // The web preview may pretend a phone's insets (`?insets=47,34`); on a phone devInsets is null.
  const insets = devInsets ? { ...safe, ...devInsets } : safe;
  const layout = useMemo(() => mergeLayout(width, height, { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }, fontScale), [width, height, insets.top, insets.bottom, insets.left, insets.right, fontScale]);
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <PlayCanvas layout={layout} />
      <TopBar layout={layout} />
      <GoalLine layout={layout} />
      <BottomRow layout={layout} />
      <Overlays layout={layout} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PH.indigo },
});
