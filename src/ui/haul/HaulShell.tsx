/**
 * SKELETON (package "shell"). The whole game screen of the haul mode (spec 4.1, 4.4): no header,
 * no tab bar. One full-bleed field under one gesture view, the contract strip and comms slot on
 * top, the freighter bay at the bottom; sheets (Rig, Station, Contract Board), one spoke at a time
 * full screen (Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post), the Shift Log and the Jump
 * sequence; the map's hint layer. The settings sheet comes from the rail's Menu button.
 * Every piece is a placeholder at its final path with its final name and props.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ShiftLog } from './overlays/ShiftLog';
import { SalvageBay } from './salvage/SalvageBay';
import { Field } from './scene/Field';
import { ContractBoardSheet } from './sheets/ContractBoardSheet';
import { RigSheet } from './sheets/RigSheet';
import { StationSheet } from './sheets/StationSheet';
import { Comms } from './spokes/Comms';
import { FittingBay } from './spokes/FittingBay';
import { StarMap, usePendingJump } from './spokes/StarMap';
import { TradePost } from './trade/TradePost';
import { useHaulUi } from './uiState';
import type { HaulConfig } from '../../engine/haul';

export function HaulShell() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cfg = useGame((s) => s.cfg) as HaulConfig;
  const trait = useGame((s) => s.game.haul?.trait ?? null);
  const layout = useMemo(() => fieldLayout({ width, height, insets: { top: insets.top, bottom: insets.bottom } }, cfg, trait), [width, height, insets.top, insets.bottom, cfg, trait]);
  const { responder } = useFieldGestures(layout);
  const open = useHaulUi((s) => s.spoke);
  // A confirmed Jump waits for its condition (no run): only the Star Map makes sense, also after a restart.
  const spoke = usePendingJump() ? 'starmap' : open;
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
      {spoke === 'fitting' ? <FittingBay /> : spoke === 'starmap' ? <StarMap /> : spoke === 'salvage' ? <SalvageBay /> : spoke === 'comms' ? <Comms /> : spoke === 'trade' ? <TradePost /> : null}
      <ShiftLog />
      <JumpSequence />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
