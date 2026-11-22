import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { alpha, textOn, useTheme } from '../theme';

interface Props {
  label?: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'success' | 'ghost';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The game's button: chunky, with a darker bottom edge, label in the display font, 44 pt or taller.
 * One meaning per variant, everywhere:
 * - `primary` spends cash, gems or real money (buy a level, hire, unlock, upgrade, purchase);
 * - `success` takes something free (claim, collect, open, go);
 * - `accent` is an optional extra that goes through an ad ("Watch ad: +30 min");
 * - `ghost` is the quiet second choice ("Not now") and a price the player cannot pay yet.
 * The label colour of a filled button is textOn(fill), so it reads in any game's palette.
 */
export function Button({ label, sublabel, onPress, disabled, variant = 'primary', style, children }: Props) {
  const t = useTheme();
  const bg =
    variant === 'ghost' ? 'transparent' : variant === 'accent' ? t.c.accent : variant === 'success' ? t.c.success : t.c.primary;
  const fg = variant === 'ghost' ? t.c.text : textOn(bg);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderRadius: t.radius * 0.75, opacity: disabled ? 0.45 : 1 },
        // A darker bottom edge gives buttons a chunky, pressable look.
        variant !== 'ghost' && { borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.22)' },
        variant === 'ghost' && { borderWidth: 1, borderColor: alpha(t.c.text, 0.2) },
        pressed && { transform: [{ scale: 0.95 }, { translateY: 2 }] },
        style,
      ]}
    >
      {children}
      {label ? (
        <Text style={[styles.label, t.display, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {label}
        </Text>
      ) : null}
      {sublabel ? (
        <Text style={[styles.sub, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  label: { fontSize: 15 },
  sub: { fontWeight: '600', fontSize: 11, opacity: 0.9, marginTop: 1 },
});
