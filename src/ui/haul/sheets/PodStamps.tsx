/**
 * A pod counter drawn as this game's own object (Decision 60, guard:new:4): a manifest strip of
 * `of` stamp boxes, `filled` of them stamped, and the words beside it ("DERELICT CACHE · 3 MORE
 * ACKS"). Used by the Contract Board (Scrap Pod per contracts met) and Comms (Derelict Cache per
 * acknowledgement). Never the "Every Nth X: Y" sentence of the first game's missions dialog.
 * Plain views; text sized by hand (allowFontScaling false).
 */
import { Platform, StyleSheet, Text, View } from 'react-native';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' });

export function PodStamps({ filled, of, label, color, dim, size }: { filled: number; of: number; label: string; color: string; dim: string; size: number }) {
  // Long ladders (12) get narrower boxes so the strip stays short of half the width at 375.
  const box = of > 8 ? 9 : 12;
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.strip}>
        {Array.from({ length: of }, (_, i) => {
          const on = i < filled;
          return (
            <View key={i} style={[styles.box, { width: box, height: 12, borderColor: on ? color : dim, backgroundColor: on ? color : 'transparent', opacity: on ? 0.85 : 1 }]}>
              {on ? <View style={[styles.notch, { backgroundColor: 'rgba(0,0,0,0.45)' }]} /> : null}
            </View>
          );
        })}
      </View>
      <Text style={[styles.text, { color, fontSize: size }]} numberOfLines={1} allowFontScaling={false}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strip: { flexDirection: 'row', gap: 2 },
  box: { borderWidth: 1, borderRadius: 1.5, alignItems: 'center', justifyContent: 'center' },
  notch: { width: 3, height: 3, borderRadius: 1.5 },
  text: { flexShrink: 1, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.5 },
});
