/**
 * What every merge sheet is built from (spec 4.4, 4.5, 4.6):
 * - `MergeSheet`: the lantern-night bottom sheet. It slides up on the UI thread (one clock, stopped
 *   once in place), dims the street a little (a tap there closes it), and registers with the overlay
 *   manager (`useOverlay`, src/state/overlays.ts) so popups and hints wait: one dialog at a time,
 *   because uiState holds one `sheet`. Nothing animates once it is closed: it unmounts.
 * - `useType`: font sizes by hand from the font scale (text has allowFontScaling={false}, so the
 *   1.3 check of 10.1 is what the phone shows).
 * - `Txt`, `Card`, `Btn` (at least 44 pt tall; a price; dimmed when it cannot be done), `Pill`.
 * Colours are the art kit's palette (lantern-night): indigo panels, brass rims, amber for what can
 * be bought, rice-paper blue-grey for text; no cream. Owned by the bars package (BARS, 7a); the
 * spokes and platform packages may build their sheets from these too.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { useOverlay } from '../../kit';
import { NIGHT, alpha } from '../art/palette';
import { MergeIcon } from '../art/MergeIcon';
import { barScale } from '../hud/barMetrics';
import { useFontScale } from '../hud/fontScale';
import { S } from '../strings';

/** On the web a drag that starts over sheet text must not select it (phones never select). */
export const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

/** The sheets' colours (the art kit's lantern-night palette). */
export const INK = {
  panel: NIGHT.indigoLift,
  card: NIGHT.indigo,
  cardEdge: alpha(NIGHT.brass, 0.35),
  rim: NIGHT.brass,
  text: NIGHT.paperLight,
  soft: NIGHT.paperShade,
  faint: NIGHT.paperEdge,
  amber: NIGHT.amber,
  amberText: NIGHT.ink,
  teal: NIGHT.tealLift,
  tealEdge: alpha(NIGHT.amberSoft, 0.4),
  off: NIGHT.inkSoft,
  offText: NIGHT.paperEdge,
  good: NIGHT.leaf,
  warn: NIGHT.amberSoft,
};

/** Font sizes of the sheets, by hand from the font scale (0.85 to 1.35). */
export function useType() {
  const fs = useFontScale();
  const { height } = useWindowDimensions();
  const k = barScale(fs);
  const compact = height < 740;
  const s = (n: number) => Math.round(n * k * (compact ? 0.95 : 1) * 2) / 2;
  return { k, compact, title: s(18), body: s(14), small: s(12), tiny: s(11), big: s(17) };
}

/** Text of the sheets: never scaled by the system (sized by `useType`), ink of the palette. */
export function Txt({ children, size, color = INK.text, bold, lines, style, center }: { children: ReactNode; size: number; color?: string; bold?: boolean; lines?: number; style?: StyleProp<TextStyle>; center?: boolean }) {
  return (
    <Text allowFontScaling={false} numberOfLines={lines} style={[{ color, fontSize: size, fontWeight: bold ? '700' : '400' }, center ? styles.center : null, style]}>
      {children}
    </Text>
  );
}

/** A block of a sheet: an indigo card with a brass hairline, an optional icon on the left. */
export function Card({ children, icon, iconSize = 36, style }: { children: ReactNode; icon?: string; iconSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={[styles.cardIcon, { width: iconSize }]}>
          <MergeIcon icon={icon} size={iconSize} />
        </View>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

type BtnKind = 'buy' | 'ad' | 'plain';

/**
 * A button of a sheet: at least 44 pt tall, a label and (for a purchase) its price after a dot.
 * `enabled` false dims it and ignores taps (the reason is printed beside it by the caller).
 * `target`: the hint key it registers (src/ui/hints/targets.ts).
 */
export function Btn({ label, price, onPress, enabled = true, kind = 'buy', target, style, sub }: { label: string; price?: string; onPress: () => void; enabled?: boolean; kind?: BtnKind; target?: string; style?: StyleProp<ViewStyle>; sub?: string }) {
  const ty = useType();
  const ref = useTarget(target);
  const bg = !enabled ? INK.off : kind === 'buy' ? INK.amber : kind === 'ad' ? INK.teal : INK.card;
  const fg = !enabled ? INK.offText : kind === 'buy' ? INK.amberText : INK.text;
  const edge = kind === 'ad' ? INK.tealEdge : kind === 'plain' ? INK.cardEdge : 'transparent';
  return (
    <Pressable
      {...ref}
      onPress={enabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={price ? `${label}, ${price} ${S.sheets.coinsLabel}` : label}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, borderColor: edge, opacity: pressed && enabled ? 0.8 : 1 }, style]}
    >
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: fg, fontSize: ty.body, fontWeight: '700' }}>
        {label}
        {price ? (
          <Text style={{ fontWeight: '800' }}>
            {'  ·  '}
            {price}
          </Text>
        ) : null}
      </Text>
      {sub ? (
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: fg, fontSize: ty.tiny, opacity: 0.85, textAlign: 'center' }}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A small rounded label (NEW, filled, owned). */
export function Pill({ label, color = INK.amber, text = INK.amberText }: { label: string; color?: string; text?: string }) {
  const ty = useType();
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: text, fontSize: ty.tiny, fontWeight: '800' }}>
        {label}
      </Text>
    </View>
  );
}

const SLIDE_MS = 240;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** An "art:" or "beast:" icon beside the title. */
  icon?: string;
  children: ReactNode;
  /** Pinned under the scrolling content (the main button). */
  footer?: ReactNode;
}

/**
 * The merge bottom sheet (4.4): up to 82 % of the screen, its content scrolls, the footer stays.
 * Plays `ui_open` and `ui_close` (6.2: paper slides).
 */
export function MergeSheet({ visible, onClose, title, icon, children, footer }: SheetProps) {
  const ty = useType();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useOverlay(visible);
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const dim = useSharedValue(0);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      wasOpen.current = true;
      fx.play('ui_open');
      y.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
      dim.value = withTiming(1, { duration: SLIDE_MS });
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    fx.play('ui_close');
    y.value = withTiming(height, { duration: SLIDE_MS * 0.8, easing: Easing.in(Easing.cubic) });
    dim.value = withTiming(0, { duration: SLIDE_MS * 0.8 });
    const t = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(t);
    // height only matters for the next slide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, NO_SELECT]} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={S.sheets.close} />
      </Animated.View>
      <Animated.View style={[styles.panel, { maxHeight: Math.round(height * 0.82), paddingBottom: Math.max(insets.bottom, 10) }, panelStyle]}>
        <View style={styles.lip} />
        <View style={styles.header}>
          {icon ? <MergeIcon icon={icon} size={30} /> : null}
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, { fontSize: ty.title }]}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={6} accessibilityRole="button" accessibilityLabel={S.sheets.close} style={styles.close}>
            <Text allowFontScaling={false} style={[styles.closeText, { fontSize: ty.body }]}>
              ✕
            </Text>
          </Pressable>
        </View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} bounces={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

/**
 * A sheet's last parameter while it slides out: `param` is what the sheet was opened with (a chain, a
 * counter), kept after uiState closed it so the content does not vanish mid-slide.
 */
export function useLastParam<T>(param: T | null): T | null {
  const last = useRef<T | null>(param);
  if (param !== null) last.current = param;
  return param ?? last.current;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  dim: { backgroundColor: alpha('#000000', 0.38) },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: INK.panel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1.5,
    borderColor: alpha(NIGHT.brass, 0.7),
    overflow: 'hidden',
  },
  lip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, marginTop: 7, backgroundColor: alpha(NIGHT.amber, 0.7) },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6, minHeight: 48 },
  title: { flex: 1, color: NIGHT.paperLight, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(NIGHT.paper, 0.08) },
  closeText: { color: NIGHT.paper, fontWeight: '900' },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  footer: { paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  card: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: INK.card, borderWidth: 1, borderColor: INK.cardEdge },
  cardIcon: { alignItems: 'center', paddingTop: 2 },
  cardBody: { flex: 1, gap: 4, minWidth: 0 },
  btn: { minHeight: 44, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pill: { alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
});
