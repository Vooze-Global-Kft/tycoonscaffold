import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { alpha, textOn, useTheme } from '../theme';

/** A list row card: icon on the left, text in the middle, a button on the right. */
export function Card({ children, highlight, dim, style }: { children: ReactNode; highlight?: boolean; dim?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: dim ? alpha(t.c.surface, 0.6) : t.c.surface, borderRadius: t.radius },
        highlight && { borderWidth: 2, borderColor: t.c.accent },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The text block in the middle of a Card. */
export function CardText({ title, sub, lines = 2 }: { title: ReactNode; sub?: ReactNode; lines?: number }) {
  const t = useTheme();
  return (
    <View style={styles.text}>
      <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1}>
        {title}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={lines}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** A small caps heading between groups of cards. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionText, { color: t.c.textMuted }]}>{children}</Text>
      {right}
    </View>
  );
}

/** A short neutral label on an offer or a card ("ONE TIME", "NEW", "×3"). */
export function Pill({ children, color, textColor }: { children: ReactNode; color?: string; textColor?: string }) {
  const t = useTheme();
  const bg = color ?? t.c.accent;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, t.display, { color: textColor ?? textOn(bg) }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** A horizontal bar, 0..1, with an optional label centred on it. */
export function ProgressBar({ value, color, height = 18, label }: { value: number; color?: string; height?: number; label?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: alpha(t.c.text, 0.1) }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? t.c.progress }} />
      {label ? (
        <Text style={[styles.trackLabel, t.display, { color: t.c.text, lineHeight: height, fontSize: Math.max(10, height * 0.62) }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** A red notification dot with an optional count, positioned by the parent. */
export function Dot({ count, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.dot, { backgroundColor: t.c.danger, borderColor: t.c.surface }, style]}>
      {count !== undefined && count > 0 ? (
        <Text style={[styles.dotText, { color: textOn(t.c.danger) }]} maxFontSizeMultiplier={1}>
          {count > 9 ? '9+' : count}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginHorizontal: 12, marginBottom: 8 },
  text: { flex: 1, marginHorizontal: 10 },
  title: { fontSize: 17 },
  sub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  sectionText: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  pill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, letterSpacing: 0.5 },
  track: { overflow: 'hidden', justifyContent: 'center' },
  trackLabel: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  dot: { minWidth: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  dotText: { fontSize: 9, fontWeight: '900' },
});
