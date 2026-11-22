/**
 * This game's loading screen (Decision 55, store-6): shown while the save, the fonts and the remote
 * config load, before the field exists. The station ring powers up (its hub lit, a line of light
 * running round the ring, the four spokes coming on one by one) over the game's own background,
 * with the station's call line in the terminal face under it: "TAMSIN STATION · LINKING".
 *
 * Plain views only: no canvas and nothing from the art atlas, so it shows on the first frame. The
 * mode entry hands it to the app shell as its Loading part (src/ui/App.tsx). Words from strings.ts,
 * names from game.json.
 */
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { useGame } from '../../../state/store';
import { alpha } from '../../theme';
import { say } from '../sheets/shellText';

/** The terminal face (as sheets/parts.tsx MONO; not imported from there, which pulls in the canvas kit). */
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' });
const RING = 148;
const HUB = 46;
const SPOKES = 4;

export function HaulBoot() {
  const cfg = useGame((s) => s.cfg);
  const { fontScale } = useWindowDimensions();
  const c = cfg.theme.colors;
  const station = H.isHaul(cfg) ? cfg.haul.names.station : '';
  // Text sized by hand (AGENTS.md): the line sits in a fixed column under the ring.
  const k = Math.max(0.9, Math.min(1.25, fontScale));
  const spin = useSharedValue(0);
  const [lit, setLit] = useState(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    // The spokes come on one by one, then the dots of the call line keep cycling.
    const t = setInterval(() => setLit((n) => n + 1), 380);
    return () => {
      clearInterval(t);
      cancelAnimation(spin);
    };
  }, [spin]);
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const on = Math.min(SPOKES, lit);
  const dots = '.'.repeat(lit % 4);
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]} accessibilityRole="progressbar" accessibilityLabel={say('bootLine', { station })}>
      <View style={{ width: RING, height: RING }}>
        <View style={[styles.ring, { borderColor: alpha(c.primary, 0.22) }]} />
        {Array.from({ length: SPOKES }, (_, i) => (
          <View key={i} style={[styles.spokeWrap, { transform: [{ rotate: `${45 + i * 90}deg` }] }]}>
            <View style={[styles.spoke, { backgroundColor: i < on ? c.primary : alpha(c.primary, 0.15) }]} />
          </View>
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, arc]}>
          <View style={[styles.ring, styles.arc, { borderTopColor: c.primary, borderRightColor: alpha(c.primary, 0.35) }]} />
        </Animated.View>
        <View style={[styles.hub, { borderColor: c.primary, backgroundColor: alpha(c.primary, on >= SPOKES ? 0.3 : 0.12) }]} />
      </View>
      <Text style={[styles.name, { color: c.text, fontSize: Math.round(19 * k) }]} allowFontScaling={false} numberOfLines={1}>
        {cfg.app.displayName.toUpperCase()}
      </Text>
      <Text style={[styles.line, { color: c.primary, fontSize: Math.round(11 * k) }]} allowFontScaling={false} numberOfLines={1}>
        {`${say('bootLine', { station: station.toUpperCase() })}${dots.padEnd(3, ' ')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ring: { position: 'absolute', left: 0, top: 0, width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2 },
  arc: { borderColor: 'transparent', borderWidth: 3 },
  spokeWrap: { position: 'absolute', left: 0, top: 0, width: RING, height: RING, alignItems: 'center' },
  spoke: { width: 2, height: (RING - HUB) / 2, marginTop: 0 },
  hub: { position: 'absolute', left: (RING - HUB) / 2, top: (RING - HUB) / 2, width: HUB, height: HUB, borderRadius: HUB / 2, borderWidth: 2 },
  name: { marginTop: 28, fontFamily: MONO, fontWeight: '700', letterSpacing: 4 },
  line: { marginTop: 8, fontFamily: MONO, fontWeight: '600', letterSpacing: 2 },
});
