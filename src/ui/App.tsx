import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { gameAssets } from '../config/game';
import { applyDevParams, devSpeed } from '../dev/devtools';
import { fx } from '../services/fx';
import { useGame } from '../state/store';
import { Banner } from './components/Banner';
import { Celebrations } from './components/Celebration';
import { GameIcon } from './components/GameIcon';
import { Header } from './components/Header';
import { OfflineModal, StoryModal } from './components/Modals';
import { ManagersPanel } from './components/Panels';
import { TabBar } from './components/TabBar';
import { HintOverlay } from './hints/HintOverlay';
import { HomeClassic } from './home/HomeClassic';
import { HomeSim } from './home/HomeSim';
import { FlyLayer } from './juice/FlyLayer';
import { CardSheet } from './meta/cards/CardSheet';
import { StaffTab } from './meta/cards/StaffTab';
import { ChestOddsSheet } from './meta/chest/ChestOddsSheet';
import { ChestOverlay } from './meta/chest/ChestOverlay';
import { DealPopup } from './meta/deals/DealPopup';
import { EmpireTab } from './meta/empire/EmpireTab';
import { MissionsSheet } from './meta/missions/MissionsSheet';
import { SettingsSheet } from './meta/settings/SettingsSheet';
import { ShopTab } from './meta/shop/ShopTab';
import { UpgradesTab } from './meta/upgrades/UpgradesTab';
import { ArtGallery } from './sim/art/Gallery';
import { PropsGallery } from './sim/art/GalleryProps';
import { DISPLAY_FONT, useTheme } from './theme';

const TICK_MS = 100;
const SAVE_EVERY_MS = 5000;

/** Fixed-rate simulation loop plus autosave. The store stops the clock while the app is in the background. */
function useGameLoop() {
  const hydrated = useGame((s) => s.hydrated);
  const last = useRef(Date.now());
  useEffect(() => {
    if (!hydrated) return;
    const { tick, save } = useGame.getState();
    // Development only (web address `?speed=10`): run the simulation faster. Always 1 on phones.
    const speed = devSpeed();
    last.current = Date.now();
    const loop = setInterval(() => {
      const now = Date.now();
      // Clamp dt so a long JS stall doesn't skip past offline-earnings accounting.
      const dt = Math.min(1, (now - last.current) / 1000);
      last.current = now;
      tick(dt * speed);
    }, TICK_MS);
    const autosave = setInterval(save, SAVE_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Back in the foreground: pay for the time away from the in-memory game (never re-read the save).
        useGame.getState().resume();
        last.current = Date.now();
      } else {
        useGame.getState().pause();
      }
    });
    return () => {
      clearInterval(loop);
      clearInterval(autosave);
      sub.remove();
    };
  }, [hydrated]);
}

/**
 * The whole game: header, the tab on screen, the tab bar, and on top of them every dialog and
 * overlay. Dialogs and overlays render nothing until the store asks for them, so they are simply
 * always mounted here.
 */
function Game() {
  const t = useTheme();
  const tab = useGame((s) => s.tab);
  const sim = useGame((s) => s.cfg.mode === 'sim');
  useGameLoop();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.c.gradient[0] }} edges={['top']}>
      <StatusBar style={t.darkStatusBar ? 'dark' : 'light'} />
      <Header />
      <View style={{ flex: 1, backgroundColor: t.c.background }}>
        {tab === 'home' && (sim ? <HomeSim /> : <HomeClassic />)}
        {tab === 'staff' && <StaffTab top={sim ? undefined : <ManagersPanel />} />}
        {tab === 'upgrades' && <UpgradesTab />}
        {tab === 'empire' && <EmpireTab />}
        {tab === 'shop' && <ShopTab />}
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.c.surface }}>
        {/* No banner ad on the home tab: nothing may sit next to the buttons players tap fastest. */}
        {tab !== 'home' ? <Banner /> : null}
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
      <Celebrations />
      <FlyLayer />
      <HintOverlay />
    </SafeAreaView>
  );
}

/** Shown while the save, fonts and remote config load: the hero bouncing over the game's name. */
function Loading() {
  const cfg = useGame((s) => s.cfg);
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }), -1, true);
  }, [bounce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -bounce.value * 26 }, { scaleY: 1 - (1 - bounce.value) * 0.08 }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cfg.theme.colors.background }}>
      <Animated.View style={style}>
        <GameIcon icon={cfg.theme.heroIcon} size={140} />
      </Animated.View>
      <Text style={{ marginTop: 18, fontSize: 30, fontWeight: '900', color: cfg.theme.colors.primary }}>{cfg.app.displayName}</Text>
    </View>
  );
}

/** Dev views for visual review in the web build, e.g. `?view=art`. Never set on phones. */
const DEV_VIEW = Platform.OS === 'web' && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('view') : null;

export default function App() {
  if (DEV_VIEW === 'art') return <ArtGallery />;
  if (DEV_VIEW === 'props') return <PropsGallery />;
  return <Root />;
}

function Root() {
  const hydrated = useGame((s) => s.hydrated);
  const fontKey = useGame((s) => s.cfg.theme.displayFont);
  const fontSrc = fontKey ? gameAssets[fontKey] : undefined;
  // If the font fails to load we still start; text falls back to the system font.
  const [fontsLoaded, fontError] = useFonts(fontSrc ? { [DISPLAY_FONT]: fontSrc } : {});
  const ready = hydrated && (fontsLoaded || fontError !== null || !fontSrc);
  useEffect(() => {
    useGame
      .getState()
      .boot()
      // Development only: `?preset=mid&tab=shop` and friends in the web address (see src/dev/devtools.ts).
      .then(applyDevParams);
    // Sound, music and haptics. Both calls are safe to repeat; music waits for the settings and the audio session.
    fx.init();
    fx.music.start();
  }, []);
  return <SafeAreaProvider>{ready ? <Game /> : <Loading />}</SafeAreaProvider>;
}
