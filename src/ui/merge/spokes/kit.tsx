/**
 * The spokes' small parts: text sized by hand from the font scale (allowFontScaling off, so a row's
 * height is known; spec 4.1), the paper card, the paper button (44 pt at least), the progress
 * cord, a section head, and the hook that re-reads the game only when what the spokes show changes.
 * Colours are the art kit's palette (lantern-night, spec 4.6). Package SPOKES (7b).
 */
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type * as R from '../../../engine/merge';
import { mergeNow } from '../../../modes/merge/actions';
import { NIGHT, alpha } from '../art/palette';
import { useMerge } from '../useMerge';
import { useMergeUi } from '../uiState';
import { spokeFontScale } from './dev';
import { spokeKey } from './views';

/** The spokes' colours (art/palette.ts NIGHT). */
export const C = {
  bg: NIGHT.indigo,
  deep: NIGHT.indigoDeep,
  lift: NIGHT.indigoLift,
  mid: NIGHT.indigoMid,
  text: NIGHT.paperLight,
  dim: NIGHT.paperShade,
  faint: NIGHT.paperEdge,
  amber: NIGHT.amber,
  amberSoft: NIGHT.amberSoft,
  brass: NIGHT.brass,
  paper: NIGHT.paper,
  ink: NIGHT.ink,
  inkSoft: NIGHT.inkSoft,
  line: alpha(NIGHT.brass, 0.35),
  teal: NIGHT.tealLift,
} as const;

export const GUTTER = 16;

/** The text scale of the spokes: the system font scale, kept between 1 and 1.4 (rows grow with it; checked at 1.3). */
export function useFs(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(1.4, Math.max(1, spokeFontScale(fontScale)));
}

export function T({
  size = 14,
  color = C.text,
  weight = '400',
  lines,
  align,
  style,
  children,
}: {
  size?: number;
  color?: string;
  weight?: TextStyle['fontWeight'];
  lines?: number;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const fs = useFs();
  return (
    <Text allowFontScaling={false} numberOfLines={lines} style={[{ fontSize: size * fs, lineHeight: Math.round(size * fs * 1.32), color, fontWeight: weight, textAlign: align }, style]}>
      {children}
    </Text>
  );
}

/** A section head: small brass capitals with a rule. */
export function Head({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.head}>
      <T size={12} weight="700" color={C.brass} style={styles.headText} lines={1}>
        {children}
      </T>
      <View style={styles.headRule} />
      {right}
    </View>
  );
}

/** A dark lacquer card with a brass hairline. */
export function Card({ children, style, glow }: { children: ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  return <View style={[styles.card, glow && styles.cardGlow, style]}>{children}</View>;
}

/** A paper button, at least 44 pt tall; disabled it is a dim slate and says so to a screen reader. */
export function PaperButton({ label, onPress, disabled, tone = 'amber', small }: { label: string; onPress: () => void; disabled?: boolean; tone?: 'amber' | 'paper'; small?: boolean }) {
  const fill = disabled ? C.mid : tone === 'amber' ? C.amber : C.paper;
  // A small button sits in a spoke's header beside the paper-cut title: its text grows with the font
  // scale only to 1.15 (at 1.3 the Ladder Book's "Odds" touched the title at 375 pt).
  const fs = useFs();
  const size = small ? (14 * Math.min(fs, 1.15)) / fs : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPressIn={() => useMergeUi.getState().touched()}
      onPress={onPress}
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: fill, opacity: pressed ? 0.8 : 1 }]}
    >
      <T size={size} weight="700" color={disabled ? C.faint : C.ink} lines={1} align="center">
        {label}
      </T>
    </Pressable>
  );
}

/** A progress cord: a thin bamboo-brown track with an amber fill. */
export function Cord({ have, need }: { have: number; need: number }) {
  const p = need > 0 ? Math.max(0, Math.min(1, have / need)) : 0;
  return (
    <View style={styles.cord}>
      <View style={[styles.cordFill, { width: `${Math.round(p * 1000) / 10}%` }]} />
    </View>
  );
}

/**
 * The game, re-read only when what the spokes show changes (spokeKey: a short string the selector
 * returns, so the store's ten changes a second do not re-render a spoke). Null outside a merge game.
 */
export function useSpokeView<T>(build: (cfg: R.MergeConfig, g: R.MergeGame) => T): T | null {
  const key = useMerge((cfg, g) => spokeKey(cfg, g), '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const now = mergeNow();
    return now ? build(now.cfg, now.g) : null;
  }, [key]);
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8, gap: 8 },
  headText: { letterSpacing: 1.2, textTransform: 'uppercase' },
  headRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  card: { backgroundColor: alpha(NIGHT.indigoLift, 0.92), borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: alpha(NIGHT.brass, 0.45), padding: 12 },
  cardGlow: { borderColor: alpha(NIGHT.amber, 0.8), backgroundColor: alpha(NIGHT.indigoMid, 0.95) },
  button: { minHeight: 48, borderRadius: 24, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: alpha(NIGHT.ink, 0.6) },
  buttonSmall: { minHeight: 44, borderRadius: 22, paddingHorizontal: 14 },
  cord: { height: 6, borderRadius: 3, backgroundColor: alpha(NIGHT.woodDeep, 0.9), overflow: 'hidden' },
  cordFill: { height: 6, borderRadius: 3, backgroundColor: NIGHT.amber },
});
