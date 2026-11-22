/** The ×1 / ×10 / ×100 / MAX selector over the home lists. The store plays the tap sound. */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BuyAmount } from '../../engine/types';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';

const AMOUNTS: readonly BuyAmount[] = [1, 10, 100, 'max'];

export function BuyAmountRow({ height }: { height: number }) {
  const t = useTheme();
  const amount = useGame((s) => s.buyAmount);
  const set = useGame((s) => s.setBuyAmount);
  // Short buttons still get a 44 pt touch area.
  const slop = Math.max(0, Math.ceil((44 - (height - 4)) / 2));
  return (
    <View style={[styles.row, { height }]}>
      <Text style={[styles.caption, { color: t.c.textMuted }]} maxFontSizeMultiplier={1.25}>BUY</Text>
      <View style={[styles.group, { height: height - 4, borderRadius: (height - 4) / 2, backgroundColor: alpha(t.c.text, 0.07) }]}>
        {AMOUNTS.map((a) => {
          const on = a === amount;
          return (
            <Pressable
              key={String(a)}
              onPress={() => set(a)}
              hitSlop={{ top: slop, bottom: slop }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={a === 'max' ? 'Buy as many as you can afford' : `Buy ${a} at a time`}
              style={[styles.seg, { borderRadius: (height - 8) / 2 }, on && { backgroundColor: t.c.primary }]}
            >
              <Text style={[t.display, styles.segText, { color: on ? t.c.primaryText : t.c.textMuted, fontSize: height < 30 ? 12 : 13 }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                {a === 'max' ? 'MAX' : `×${a}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  caption: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  group: { flex: 1, flexDirection: 'row', padding: 2, gap: 2 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: {},
});
