import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { alpha, useTheme } from '../theme';

interface Props {
  label?: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'success' | 'ghost';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Button({ label, sublabel, onPress, disabled, variant = 'primary', style, children }: Props) {
  const t = useTheme();
  const bg =
    variant === 'ghost' ? 'transparent' : variant === 'accent' ? t.c.accent : variant === 'success' ? t.c.success : t.c.primary;
  const fg = variant === 'ghost' ? t.c.text : t.c.primaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderRadius: t.radius * 0.75, opacity: disabled ? 0.45 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: alpha(t.c.text, 0.2) },
        pressed && { transform: [{ scale: 0.96 }] },
        style,
      ]}
    >
      {children}
      {label ? <Text style={[styles.label, { color: fg }]} numberOfLines={1}>{label}</Text> : null}
      {sublabel ? <Text style={[styles.sub, { color: fg }]} numberOfLines={1}>{sublabel}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  label: { fontWeight: '800', fontSize: 14 },
  sub: { fontWeight: '600', fontSize: 11, opacity: 0.9, marginTop: 1 },
});
