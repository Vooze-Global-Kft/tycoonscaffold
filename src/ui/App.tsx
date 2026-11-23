import { useFonts } from 'expo-font';
import { useEffect, useRef } from 'react';
import { AppState, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { gameAssets } from '../config/game';
import { applyDevParams, devSpeed, devView } from '../dev/devtools';
import { modeEntry } from '../generated/mode';
import { installMode } from '../modes/contract';
import { fx } from '../services/fx';
import { wireSession } from '../state/session';
import { useGame } from '../state/store';
import { GameIcon } from './components/GameIcon';
import { DISPLAY_FONT } from './theme';

// The active game's mode (src/generated/mode.ts imports only that one): its screens, and the pieces
// shared screens ask it for (portraits, art icons, the tutorial script). Installed before anything renders.
installMode(modeEntry);

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
      } else if (state === 'background') {
        void useGame.getState().pause();
      }
      // 'inactive' (iOS Control Centre, a call banner, a purchase sheet) is not leaving: do nothing.
    });
    return () => {
      clearInterval(loop);
      clearInterval(autosave);
      sub.remove();
    };
  }, [hydrated]);
}

/** The whole game once loaded: the simulation loop and the mode's screen (the tab shell for sim and classic). */
function Game() {
  useGameLoop();
  const Shell = modeEntry.Shell;
  return <Shell />;
}

/**
 * Shown while the save, fonts and remote config load: the hero bouncing over the game's name. The
 * loading screen of every mode entry without its own (`ModeEntry.Loading`: sim and classic).
 */
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

/** Dev views for visual review in the web build, e.g. `?view=art`. Never set on phones (src/dev/devtools.ts). */
const DEV_VIEW = devView();

export default function App() {
  // The mode's review screens, e.g. the sim mode's `?view=art` and `?view=props`.
  const DevView = DEV_VIEW ? modeEntry.devViews?.[DEV_VIEW] : undefined;
  if (DevView) return <DevView />;
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
    // Reminders, the rating prompt and leaderboard scores listen to the store's session moments.
    wireSession();
    useGame
      .getState()
      .boot()
      // Development only: `?preset=mid&tab=shop` and friends in the web address (see src/dev/devtools.ts).
      .then(applyDevParams);
    // Sound, music and haptics. Both calls are safe to repeat; music waits for the settings and the audio session.
    fx.init();
    fx.music.start();
  }, []);
  // The mode's own loading screen when it has one (Decision 55; haul), else the shared one below (sim, classic).
  const Wait = modeEntry.Loading ?? Loading;
  return <SafeAreaProvider>{ready ? <Game /> : <Wait />}</SafeAreaProvider>;
}
