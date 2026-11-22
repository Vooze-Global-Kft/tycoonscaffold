/**
 * The whole game screen of the haul mode (spec 4.1, 4.4): no header, no tab bar. One full-bleed
 * field under one gesture view, the contract strip and comms slot on top, the freighter bay at the
 * bottom. Hub and spoke: the map is the only home; at most one of these is open at a time
 * (uiState): a sheet (Rig, Station, Contract Board, the station menu from the rail's Menu button,
 * all the haul bottom sheet at 46 % over the bay with the map live above), a full-screen spoke
 * (Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post), or an overlay (the Jump sequence; the
 * Shift Log whenever the store holds an offline report). Map hints (drag, swipe, point) are the
 * bay's HintLayer; hints for controls inside a sheet are SheetHints (errata 53).
 *
 * A confirmed Jump waits for its condition with no run: only the Star Map makes sense then, also
 * after a restart. When the next galaxy's run starts, the Jump sequence plays over the new map.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HaulConfig, HaulGame } from '../../engine/haul';
import { useGame } from '../../state/store';
import { applyHaulDevParams } from './dev';
import { useFieldGestures } from './gestures/useFieldGestures';
import { CommsSlot } from './hud/CommsSlot';
import { ContractStrip } from './hud/ContractStrip';
import { FloatingFeedback } from './hud/FloatingFeedback';
import { FreighterBay } from './hud/FreighterBay';
import { HintLayer } from './hud/HintLayer';
import { fieldLayout } from './layout';
import { JumpSequence } from './overlays/JumpSequence';
import { SheetHints } from './overlays/SheetHints';
import { ShiftLog } from './overlays/ShiftLog';
import { SalvageBay } from './salvage/SalvageBay';
import { Field } from './scene/Field';
import { ContractBoardSheet } from './sheets/ContractBoardSheet';
import { RigSheet } from './sheets/RigSheet';
import { StationMenuSheet } from './sheets/StationMenuSheet';
import { StationSheet } from './sheets/StationSheet';
import { Comms } from './spokes/Comms';
import { FittingBay } from './spokes/FittingBay';
import { StarMap, usePendingJump } from './spokes/StarMap';
import { TradePost } from './trade/TradePost';
import { useHaulUi } from './uiState';

/** Plays the Jump sequence when a new galaxy's run starts (the run's galaxy index rises). */
function useJumpCue(): void {
  useEffect(() => {
    let last = (useGame.getState().game as unknown as HaulGame).haul?.galaxy ?? null;
    return useGame.subscribe((s) => {
      const g = (s.game as unknown as HaulGame).haul?.galaxy;
      // Between galaxies there is no run: keep the last galaxy seen until the next run exists.
      if (g === undefined) return;
      if (last !== null && g > last) {
        const ui = useHaulUi.getState();
        ui.closeSpoke();
        ui.openOverlay('jump');
      }
      last = g;
    });
  }, []);
}

export function HaulShell() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cfg = useGame((s) => s.cfg) as HaulConfig;
  const trait = useGame((s) => (s.game as unknown as HaulGame).haul?.trait ?? null);
  const layout = useMemo(() => fieldLayout({ width, height, insets: { top: insets.top, bottom: insets.bottom } }, cfg, trait), [width, height, insets.top, insets.bottom, cfg, trait]);
  const { responder } = useFieldGestures(layout);
  const open = useHaulUi((s) => s.spoke);
  const spoke = usePendingJump() ? 'starmap' : open;
  useJumpCue();
  useEffect(applyHaulDevParams, []);
  return (
    <View style={[styles.fill, { backgroundColor: cfg.theme.colors.background }]}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill} {...responder}>
        <Field layout={layout} />
      </View>
      <ContractStrip rect={layout.zones.strip} />
      <CommsSlot rect={layout.zones.comms} />
      <FreighterBay layout={layout} />
      <FloatingFeedback />
      <HintLayer layout={layout} />
      <RigSheet />
      <StationSheet />
      <ContractBoardSheet />
      <StationMenuSheet />
      <SheetHints />
      {spoke === 'fitting' ? <FittingBay /> : spoke === 'starmap' ? <StarMap /> : spoke === 'salvage' ? <SalvageBay /> : spoke === 'comms' ? <Comms /> : spoke === 'trade' ? <TradePost /> : null}
      <JumpSequence />
      <ShiftLog />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
