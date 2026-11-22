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
import { BackHandler, StyleSheet, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as H from '../../engine/haul';
import type { HaulConfig, HaulGame } from '../../engine/haul';
import { haulActions } from '../../modes/haul/actions';
import { fx } from '../../services/fx';
import { useGame } from '../../state/store';
import { applyHaulDevParams } from './dev';
import { useFieldInput } from './gestures/fieldInput';
import { useFieldGestures } from './gestures/useFieldGestures';
import { CommsSlot } from './hud/CommsSlot';
import { ContractStrip } from './hud/ContractStrip';
import { FloatingFeedback } from './hud/FloatingFeedback';
import { FreighterBay } from './hud/FreighterBay';
import { HintLayer } from './hud/HintLayer';
import { fieldLayout } from './layout';
import { HaulBoot } from './overlays/Boot';
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
import { say } from './sheets/shellText';
import { closeBackLayer, useHaulUi } from './uiState';

/** Plays the Jump sequence when a new galaxy's run starts (the run's galaxy index rises). */
function useJumpCue(): void {
  useEffect(() => {
    const g0 = useGame.getState().game as unknown as HaulGame;
    // A restart while a confirmed Jump waits: any run that starts next is the new galaxy.
    let last = g0.haul?.galaxy ?? (g0.haulStats?.pendingJump ? -1 : null);
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

/** A pod opening started anywhere shows in the Salvage Bay (its reveal lives there). */
function useOpeningShowsSalvage(): void {
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.chestOpening && s.chestOpening !== prev.chestOpening && useHaulUi.getState().spoke !== 'salvage') useHaulUi.getState().openSpoke('salvage');
      }),
    [],
  );
}

/**
 * The Android back key (Decision 47): closes the top layer, in order the Shift Log (collected
 * without the ad), a spoke's inner layer (an armed confirm, a picked module), the sheet, the
 * station menu, the spoke, the selected drone or the armed claim chip. The Jump sequence, an
 * opening pod and the Star Map while a confirmed Jump waits swallow it. Only on the bare map does
 * the key leave the app (false: the system default).
 */
function useAndroidBack(): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = useGame.getState();
      const ui = useHaulUi.getState();
      if (ui.overlay) return true;
      if (s.offline) {
        void haulActions.collectShiftLog(false);
        return true;
      }
      // A spoke's inner layer first (a revealed pod is stowed); a pod still being cut swallows the key.
      if (closeBackLayer()) return true;
      if (s.chestOpening) return true;
      if (ui.sheet) {
        fx.play('ui_close');
        ui.closeSheet();
        return true;
      }
      if (ui.menuOpen) {
        fx.play('ui_close');
        ui.setMenu(false);
        return true;
      }
      if ((s.game as unknown as HaulGame).haulStats?.pendingJump) return true;
      if (ui.spoke) {
        fx.play('ui_close');
        ui.closeSpoke();
        return true;
      }
      if (ui.selection) {
        ui.select(null);
        return true;
      }
      const input = useFieldInput.getState();
      if (input.claimArmed) {
        input.arm(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);
}

/** The map for a screen reader (phone-13): the two things a player must be able to do there. */
function onFieldAction(e: AccessibilityActionEvent): void {
  const { cfg, game } = useGame.getState();
  if (!H.isHaul(cfg)) return;
  const g = game as unknown as HaulGame;
  if (e.nativeEvent.actionName === 'launch') {
    if (!haulActions.launch()) fx.play('ui_denied');
    return;
  }
  if (e.nativeEvent.actionName === 'assign') {
    const slot = g.haul && g.haul.idle > 0 ? H.bestSlotForDrone(cfg, g) : null;
    if (slot === null || !haulActions.assignDrone(slot)) fx.play('ui_denied');
  }
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
  const devView = useHaulUi((s) => s.devView);
  useJumpCue();
  useOpeningShowsSalvage();
  useAndroidBack();
  useEffect(applyHaulDevParams, []);
  const n = cfg.haul.names;
  const a11y = useMemo(
    () => ({
      label: say('fieldLabel'),
      hint: say('fieldHint'),
      actions: [
        { name: 'launch', label: say('fieldLaunch', { freighter_l: n.freighter.toLowerCase() }) },
        { name: 'assign', label: say('fieldAssign', { drone_l: n.drone.toLowerCase() }) },
      ],
    }),
    [n.freighter, n.drone],
  );
  return (
    <View style={[styles.fill, { backgroundColor: cfg.theme.colors.background }]}>
      <StatusBar style="light" />
      <View
        style={StyleSheet.absoluteFill}
        {...responder}
        accessible
        accessibilityLabel={a11y.label}
        accessibilityHint={a11y.hint}
        accessibilityActions={a11y.actions}
        onAccessibilityAction={onFieldAction}
      >
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
      {devView === 'boot' ? (
        <View style={StyleSheet.absoluteFill}>
          <HaulBoot />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
