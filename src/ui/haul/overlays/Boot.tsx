/**
 * This game's loading screen (Decisions 55 and 61, store-6): shown while the save, the fonts and the
 * remote config load, before the field exists. Its arrangement is its own: a boot log in the
 * terminal face, left-aligned in the lower third, its lines arriving one by one ("DRONE BAY ..... OK"),
 * the station's call line last ("TAMSIN STATION · LINKING..."), and the station ring small in the
 * top-right corner, its spokes coming on with the log. Not a centred emblem with the name under it.
 *
 * Plain views only: no canvas and nothing from the art atlas, so it shows on the first frame. The
 * mode entry hands it to the app shell as its Loading part (src/ui/App.tsx); the web preview shows it
 * on top of the game with `?view=boot` (dev.web.ts). Words from strings.ts, names from game.json.
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
const RING = 44;
const HUB = 14;
const SPOKES = 4;
/** One log line every STEP ms; the call line's dots keep cycling after the last one. */
const STEP = 300;
/** Width of a log line in characters, the status included (fits 375 wide at font scale 1.25). */
const COLS = 26;

export function HaulBoot() {
  const cfg = useGame((s) => s.cfg);
  const { fontScale, height } = useWindowDimensions();
  const c = cfg.theme.colors;
  const station = H.isHaul(cfg) ? cfg.haul.names.station : '';
  // Text sized by hand (AGENTS.md): every log line sits in a row of fixed height.
  const k = Math.max(0.9, Math.min(1.25, fontScale));
  const size = Math.round(11 * k);
  const row = Math.round(size * 1.7);
  const log = say('bootLog').split('|');
  const ok = say('bootOk');
  const spin = useSharedValue(0);
  const [lit, setLit] = useState(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    const t = setInterval(() => setLit((n) => n + 1), STEP);
    return () => {
      clearInterval(t);
      cancelAnimation(spin);
    };
  }, [spin]);
  const arc = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const shown = Math.min(log.length, lit);
  const on = Math.min(SPOKES, Math.ceil((shown / log.length) * SPOKES));
  const done = shown >= log.length;
  const dots = done ? '.'.repeat((lit - log.length) % 4) : '';
  const line = (label: string) => {
    const pad = Math.max(2, COLS - label.length - ok.length);
    return `${label} ${'.'.repeat(pad - 2)} ${ok}`;
  };
  return (
    <View style={[styles.fill, { backgroundColor: c.background }]} accessibilityRole="progressbar" accessibilityLabel={say('bootLine', { station })}>
      <View style={[styles.ringBox, { width: RING, height: RING }]}>
        <View style={[styles.ring, { borderColor: alpha(c.primary, 0.22) }]} />
        {Array.from({ length: SPOKES }, (_, i) => (
          <View key={i} style={[styles.spokeWrap, { transform: [{ rotate: `${45 + i * 90}deg` }] }]}>
            <View style={[styles.spoke, { backgroundColor: i < on ? c.primary : alpha(c.primary, 0.15) }]} />
          </View>
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, arc]}>
          <View style={[styles.ring, styles.arc, { borderTopColor: c.primary }]} />
        </Animated.View>
        <View style={[styles.hub, { borderColor: c.primary, backgroundColor: alpha(c.primary, done ? 0.35 : 0.12) }]} />
      </View>
      <View style={[styles.log, { top: Math.round(height * 0.62) }]}>
        <View style={{ height: Math.round(size * 1.4 * 1.6) }}>
          <Text style={[styles.title, { color: c.text, fontSize: Math.round(size * 1.4) }]} allowFontScaling={false} numberOfLines={1}>
            {cfg.app.displayName.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: alpha(c.primary, 0.3) }]} />
        {log.slice(0, shown).map((label, i) => (
          <View key={i} style={{ height: row, justifyContent: 'center' }}>
            <Text style={[styles.text, { color: alpha(c.text, 0.72), fontSize: size }]} allowFontScaling={false} numberOfLines={1}>
              {line(label)}
            </Text>
          </View>
        ))}
        {done ? (
          <View style={{ height: row, justifyContent: 'center' }}>
            <Text style={[styles.text, styles.call, { color: c.primary, fontSize: size }]} allowFontScaling={false} numberOfLines={1}>
              {`${say('bootLine', { station: station.toUpperCase() })}${dots.padEnd(3, ' ')}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  ringBox: { position: 'absolute', right: 20, top: 52 },
  ring: { position: 'absolute', left: 0, top: 0, width: RING, height: RING, borderRadius: RING / 2, borderWidth: 1.5 },
  arc: { borderColor: 'transparent', borderWidth: 2 },
  spokeWrap: { position: 'absolute', left: 0, top: 0, width: RING, height: RING, alignItems: 'center' },
  spoke: { width: 1.5, height: (RING - HUB) / 2 },
  hub: { position: 'absolute', left: (RING - HUB) / 2, top: (RING - HUB) / 2, width: HUB, height: HUB, borderRadius: HUB / 2, borderWidth: 1.5 },
  log: { position: 'absolute', left: 24, right: 24 },
  title: { fontFamily: MONO, fontWeight: '700', letterSpacing: 3 },
  rule: { height: 1, width: 48, marginBottom: 8 },
  text: { fontFamily: MONO, fontWeight: '500', letterSpacing: 1 },
  call: { fontWeight: '700' },
});
