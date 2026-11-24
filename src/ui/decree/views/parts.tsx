/**
 * Small pieces the VIEWS package's screens share: a button of at least 44 pt with its words sized by
 * hand from the font scale (4.1), and the palette of the views (the art kit's "baize-and-ink").
 */
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { DESK } from '../art/palette';
import { TOUCH, type } from './metrics';

export const INK = {
  paper: DESK.paper,
  paperLight: DESK.paperLight,
  ink: DESK.line,
  soft: DESK.lineSoft,
  violet: DESK.violet,
  violetDeep: DESK.violetDeep,
  violetPale: DESK.violetPale,
  slate: DESK.slate,
  slatePale: DESK.slatePale,
  chalk: DESK.chalk,
  chalkLine: DESK.chalkLine,
  chalkDust: DESK.chalkDust,
  baize: DESK.baize,
  walnut: DESK.walnut,
  walnutDeep: DESK.walnutDeep,
  brass: DESK.brass,
  mustard: DESK.mustardDeep,
  wall: DESK.wall,
  white: DESK.white,
} as const;

/** A button: violet ink on paper ('primary' fills it violet), at least 44 pt tall, one line of words at 15 × s. */
export function ViewButton({ label, onPress, s, kind = 'plain', disabled = false, style, accessibilityLabel }: { label: string; onPress: () => void; s: number; kind?: 'primary' | 'plain' | 'chalk'; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const t = type(15, s);
  const fill = kind === 'primary' ? INK.violet : kind === 'chalk' ? 'transparent' : INK.paperLight;
  const edge = kind === 'chalk' ? INK.chalkLine : INK.violet;
  const color = kind === 'primary' ? INK.white : kind === 'chalk' ? INK.chalkLine : INK.violetDeep;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.button, { minHeight: TOUCH, backgroundColor: fill, borderColor: edge, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, style]}
    >
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.label, t, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700' },
});
