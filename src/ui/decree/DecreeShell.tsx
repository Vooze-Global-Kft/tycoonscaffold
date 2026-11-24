/**
 * The whole game screen of the decree mode (spec 4.1): portrait, one screen, no tab bar. The zones come
 * from the pure deskLayout (./layout.ts); each named slot below is mounted here and owned by a later
 * package (docs/design/office-build-plan.md): the desk (P6: desk/DeskCanvas.tsx), the top bar, the
 * club strip, the term ribbon, the goal line and the bottom row (P7: hud/), and the overlays (P7 and
 * P8: overlays/Overlays.tsx, where sheets and views mount). This file belongs to the wiring owner; a
 * slot's file changes, not this one, unless a slot is added.
 */
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeskCanvas } from './desk/DeskCanvas';
import { BottomRow } from './hud/BottomRow';
import { ClubStrip } from './hud/ClubStrip';
import { GoalLine } from './hud/GoalLine';
import { TermRibbon } from './hud/TermRibbon';
import { TopBar } from './hud/TopBar';
import { deskLayout } from './layout';
import { Overlays } from './overlays/Overlays';
import { DESK } from './art/palette';
import { useDecreeUi } from './uiState';

/** Every touch anywhere counts as one (3.1: the pen shows only after 20 s without a touch). */
const touch = () => useDecreeUi.getState().touch();

export function DecreeShell() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useMemo(() => deskLayout(width, height, { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }, fontScale), [width, height, insets.top, insets.bottom, insets.left, insets.right, fontScale]);
  return (
    <View style={styles.root} onTouchStart={touch}>
      <StatusBar style="light" />
      {/* ===== slot: the desk (P6) ===== */}
      <DeskCanvas layout={layout} />
      {/* ===== slots: the bars (P7) ===== */}
      <TopBar layout={layout} />
      <ClubStrip layout={layout} />
      <TermRibbon layout={layout} />
      <GoalLine layout={layout} />
      <BottomRow layout={layout} />
      {/* ===== slot: sheets and views (P7, P8) ===== */}
      <Overlays layout={layout} />
    </View>
  );
}

const styles = StyleSheet.create({
  // userSelect: a drag or a quick double tap in the web preview never selects the desk's words (a phone has no text selection here).
  root: { flex: 1, backgroundColor: DESK.baize, userSelect: 'none' },
});
