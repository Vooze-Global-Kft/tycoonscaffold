/**
 * The tab shell of the list-home modes (sim and classic): header, the tab on screen, the tab bar,
 * and on top of them every dialog and overlay. Dialogs and overlays render nothing until the store
 * asks for them, so they are simply always mounted here. Moved out of App.tsx unchanged; the mode
 * entry (src/modes/<mode>) gives the home tab and what sits on top of the staff tab.
 */
import { StatusBar } from 'expo-status-bar';
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../../state/store';
import { Banner } from '../components/Banner';
import { Celebrations } from '../components/Celebration';
import { Header } from '../components/Header';
import { OfflineModal, StoryModal } from '../components/Modals';
import { TabBar } from '../components/TabBar';
import { CONTENT_KEY, HintOverlay, reportTouch } from '../hints/HintOverlay';
import { useTarget } from '../hints/targets';
import { FlyLayer } from '../juice/FlyLayer';
import { CardSheet } from '../meta/cards/CardSheet';
import { StaffTab } from '../meta/cards/StaffTab';
import { ChestOddsSheet } from '../meta/chest/ChestOddsSheet';
import { ChestOverlay } from '../meta/chest/ChestOverlay';
import { DealPopup } from '../meta/deals/DealPopup';
import { EmpireTab } from '../meta/empire/EmpireTab';
import { MissionsSheet } from '../meta/missions/MissionsSheet';
import { SettingsSheet } from '../meta/settings/SettingsSheet';
import { ShopTab } from '../meta/shop/ShopTab';
import { UpgradesTab } from '../meta/upgrades/UpgradesTab';
import { useTheme } from '../theme';

export interface TabShellProps {
  /** The home tab. */
  Home: ComponentType;
  /** Shown above the staff cards on the staff tab (the classic mode's managers), or nothing. */
  StaffTop?: ComponentType;
}

export function TabShell({ Home, StaffTop }: TabShellProps) {
  const t = useTheme();
  const tab = useGame((s) => s.tab);
  // The visible content area: the tutorial hand never points at a row scrolled outside it.
  const content = useTarget(CONTENT_KEY);
  return (
    // Every touch passes through here first (without being taken) so the tutorial hand can step aside.
    <View style={{ flex: 1, backgroundColor: t.c.surface }} onStartShouldSetResponderCapture={onAnyTouch}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.c.gradient[0] }} edges={['top']}>
        <StatusBar style={t.darkStatusBar ? 'dark' : 'light'} />
        <Header />
        <View {...content} style={{ flex: 1, backgroundColor: t.c.background }}>
          {tab === 'home' && <Home />}
          {tab === 'staff' && <StaffTab top={StaffTop ? <StaffTop /> : undefined} />}
          {tab === 'upgrades' && <UpgradesTab />}
          {tab === 'empire' && <EmpireTab />}
          {tab === 'shop' && <ShopTab />}
        </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.c.surface }}>
          {/* No banner ad on the home tab or on the upgrades list: nothing may sit next to the buttons players
              tap fastest. Where it shows, it keeps a gap and a divider from the tab bar. */}
          {tab !== 'home' && tab !== 'upgrades' ? <Banner /> : null}
          <TabBar />
        </SafeAreaView>

        <OfflineModal />
        <StoryModal />
        <MissionsSheet />
        <SettingsSheet />
        <ChestOddsSheet />
        <CardSheet />
        <DealPopup />
        <ChestOverlay />
      </SafeAreaView>
      {/* Overlays in window coordinates (target rectangles are measured in the window). */}
      <Celebrations />
      <FlyLayer />
      <HintOverlay />
    </View>
  );
}

/** Reports a touch to the tutorial hand and lets the touch go on to whatever was tapped. */
function onAnyTouch() {
  reportTouch();
  return false;
}
