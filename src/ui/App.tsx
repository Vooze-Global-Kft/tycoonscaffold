import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { gameAssets } from '../config/game';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { fx } from '../services/fx';
import { useGame } from '../state/store';
import { Banner } from './components/Banner';
import { Celebrations } from './components/Celebration';
import { GameIcon } from './components/GameIcon';
import { Header } from './components/Header';
import { OfflineModal, StoryModal } from './components/Modals';
import { BusinessesPanel, ManagersPanel, PrestigePanel, ShopPanel, UpgradesPanel } from './components/Panels';
import { TabBar } from './components/TabBar';
import { SkiaScene } from './scene/SkiaScene';
import { ArtGallery } from './sim/art/Gallery';
import { PropsGallery } from './sim/art/GalleryProps';
import { ThreeScene } from './scene/ThreeScene';
import { DISPLAY_FONT, useTheme } from './theme';

const TICK_MS = 100;
const SAVE_EVERY_MS = 5000;

/** Fixed-rate simulation loop plus autosave, paused in the background. */
function useGameLoop() {
  const hydrated = useGame((s) => s.hydrated);
  const last = useRef(Date.now());
  useEffect(() => {
    if (!hydrated) return;
    const { tick, save } = useGame.getState();
    last.current = Date.now();
    const loop = setInterval(() => {
      const now = Date.now();
      // Clamp dt so a long JS stall doesn't skip past offline-earnings accounting.
      const dt = Math.min(1, (now - last.current) / 1000);
      last.current = now;
      tick(dt);
    }, TICK_MS);
    const autosave = setInterval(save, SAVE_EVERY_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Returning from background: re-boot computes offline earnings from lastSavedAt.
        useGame.getState().boot();
        last.current = Date.now();
      } else {
        save();
      }
    });
    return () => {
      clearInterval(loop);
      clearInterval(autosave);
      sub.remove();
    };
  }, [hydrated]);
}

function Game() {
  const t = useTheme();
  const tab = useGame((s) => s.tab);
  useGameLoop();
  const Scene = t.scene === 'three' ? ThreeScene : SkiaScene;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.c.gradient[0] }} edges={['top']}>
      <StatusBar style={t.darkStatusBar ? 'dark' : 'light'} />
      <Header />
      <View style={{ flex: 1, backgroundColor: t.c.background }}>
        {tab === 'businesses' ? <Scene /> : null}
        <View style={{ flex: 1 }}>
          {tab === 'businesses' && <BusinessesPanel />}
          {tab === 'managers' && <ManagersPanel />}
          {tab === 'upgrades' && <UpgradesPanel />}
          {tab === 'prestige' && <PrestigePanel />}
          {tab === 'shop' && <ShopPanel />}
        </View>
      </View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.c.surface }}>
        <Banner />
        <TabBar />
      </SafeAreaView>
      <OfflineModal />
      <StoryModal />
      <Celebrations />
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
    useGame.getState().boot();
    // Sound, music and haptics. Both calls are safe to repeat; music waits for the settings and the audio session.
    fx.init();
    fx.music.start();
  }, []);
  return (
    <SafeAreaProvider>
      {ready ? <Game /> : <Loading />}
    </SafeAreaProvider>
  );
}
