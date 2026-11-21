import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { initAudio } from '../services/feedback';
import { useGame } from '../state/store';
import { Banner } from './components/Banner';
import { Header } from './components/Header';
import { OfflineModal, StoryModal } from './components/Modals';
import { BusinessesPanel, ManagersPanel, PrestigePanel, ShopPanel, UpgradesPanel } from './components/Panels';
import { TabBar } from './components/TabBar';
import { SkiaScene } from './scene/SkiaScene';
import { ThreeScene } from './scene/ThreeScene';
import { useTheme } from './theme';

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
    </SafeAreaView>
  );
}

export default function App() {
  const hydrated = useGame((s) => s.hydrated);
  const bg = useGame((s) => s.cfg.theme.colors.background);
  useEffect(() => {
    useGame.getState().boot();
    initAudio();
  }, []);
  return (
    <SafeAreaProvider>
      {hydrated ? (
        <Game />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <ActivityIndicator />
        </View>
      )}
    </SafeAreaProvider>
  );
}
