/**
 * Grand opening: when a new venue opens, a ribbon with its name and icon sweeps across the room
 * (confetti is drawn in the effects canvas), then clears by itself in about 2.3 s. It never takes
 * a tap: the player can keep playing straight through it.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { GameIcon } from '../../../components/GameIcon';
import { alpha, useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import type { Opening } from './gate';

export const OPENING_MS = 2300;

export function GrandOpening({ layout, opening, onDone }: { layout: SceneLayout; opening: Opening; onDone: () => void }) {
  const t = useTheme();
  const x = useSharedValue(-1);
  const shine = useSharedValue(0);
  useEffect(() => {
    x.value = -1;
    x.value = withSequence(
      withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.4)) }),
      withDelay(1450, withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(onDone)();
      })),
    );
    shine.value = 0;
    shine.value = withDelay(450, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }));
  }, [opening.seq, onDone, shine, x]);

  const band = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * layout.width * 1.1 }, { rotate: '-3deg' }] }));
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + shine.value * (layout.width + 160) }, { skewX: '-20deg' }], opacity: shine.value < 1 ? 0.55 : 0 }));
  const h = Math.max(64, 74 * layout.unit);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.band, { top: layout.height * 0.42 - h / 2, height: h, width: layout.width + 40, backgroundColor: t.c.primary, borderColor: t.c.accent }, band]}>
        <Animated.View style={[styles.shine, { height: h }, shineStyle]} />
        <View style={[styles.medal, { backgroundColor: alpha('#FFFFFF', 0.95), borderColor: t.c.accent }]}>
          <GameIcon icon={opening.icon} size={36} />
        </View>
        <View style={styles.texts}>
          <Text style={[t.display, styles.kicker, { color: t.c.accent }]} numberOfLines={1} allowFontScaling={false}>
            GRAND OPENING
          </Text>
          <Text style={[t.display, styles.name, { color: t.c.primaryText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>
            {opening.name}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: -20,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  shine: { position: 'absolute', left: 0, top: 0, width: 60, backgroundColor: '#FFFFFF' },
  medal: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  texts: { maxWidth: 250, alignItems: 'flex-start' },
  kicker: { fontSize: 12, letterSpacing: 2 },
  name: { fontSize: 26 },
});
