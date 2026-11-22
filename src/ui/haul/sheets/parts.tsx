/**
 * The pieces every haul sheet is built from (spec 4.4, 4.5):
 * - `HaulSheet`: the haul bottom sheet. 46 % of the screen height, slides up over the freighter bay
 *   on the UI thread, the map stays live above it (a light dim; a tap there closes the sheet).
 *   Registers with the overlay manager (src/state/overlays.ts) so popups and hints wait; one at a
 *   time because the shell opens one sheet at a time (uiState).
 * - `Plate`: a framed block in the station's line-lit look; `Meter`: a thin bar; `ActionButton`: a
 *   button with a price, dimmed when it cannot be afforded; `Chip`; `Mono` text.
 * - `ArtView`: one small Skia canvas showing a memoised picture (sheets are not list rows, so one
 *   canvas per drawing in a sheet is fine; lists use HaulIcon).
 * Colours come from the theme in game.json; the art kit's palette only for machine drawings.
 */
import { Canvas, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { useOverlay } from '../../kit';
import { alpha, textOn } from '../../theme';
import { useTarget } from '../../hints/targets';
import { say } from './shellText';

/** The radio face: monospaced, for numbers and call signs. */
export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, Consolas, monospace',
});

/** Share of the window height a haul sheet takes (spec 4.4). */
export const SHEET_SHARE = 0.46;
const SLIDE_MS = 260;

/** The game's theme colours (game.json theme.colors), selected once; they never change while the app runs. */
export function useColors() {
  return useGame((s) => s.cfg.theme.colors);
}

/** Font sizes of the sheets, scaled with the player's text size but capped so the 46 % sheet keeps its shape. */
export function useType() {
  const { fontScale, height } = useWindowDimensions();
  const k = Math.max(0.9, Math.min(1.25, fontScale));
  const compact = height < 740;
  const s = (n: number) => Math.round(n * k * (compact ? 0.94 : 1) * 2) / 2;
  return {
    k,
    compact,
    title: s(15),
    body: s(13),
    small: s(11),
    tiny: s(10),
    big: s(17),
  };
}

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** An art: or mach: icon or a small drawing beside the title. */
  left?: ReactNode;
  /** Between the title and the close button (the Rig sheet's ‹ › arrows). */
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}

/** The haul bottom sheet (spec 4.4): 46 % high, over the bay, the map live above. */
export function HaulSheet({ visible, onClose, title, left, right, children, scroll = true }: SheetProps) {
  const c = useColors();
  const ty = useType();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.round(Math.max(290, height * SHEET_SHARE)) + insets.bottom;
  useOverlay(visible);
  // Stays mounted while it slides out; nothing animates once it is gone.
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(sheetH);
  const dim = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      fx.play('ui_open');
      y.value = withTiming(0, {
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      });
      dim.value = withTiming(1, { duration: SLIDE_MS });
      return;
    }
    y.value = withTiming(sheetH, {
      duration: SLIDE_MS * 0.8,
      easing: Easing.in(Easing.cubic),
    });
    dim.value = withTiming(0, { duration: SLIDE_MS * 0.8 });
    const t = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(t);
    // sheetH only matters for the next slide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  if (!mounted) return null;
  const Body = scroll ? ScrollView : View;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: alpha('#000000', 0.32) }, dimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={say('close')} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            height: sheetH,
            backgroundColor: c.backgroundAlt,
            borderColor: alpha(c.primary, 0.45),
          },
          panelStyle,
        ]}
      >
        <View style={[styles.lip, { backgroundColor: alpha(c.primary, 0.5) }]} />
        <View style={styles.header}>
          {left}
          <Text style={[styles.title, { color: c.text, fontSize: ty.title }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {title.toUpperCase()}
          </Text>
          {right}
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={say('close')} style={[styles.close, { borderColor: alpha(c.primary, 0.5) }]}>
            <Text style={[styles.closeText, { color: c.primary }]} allowFontScaling={false}>
              ✕
            </Text>
          </Pressable>
        </View>
        <Body
          style={styles.body}
          {...(scroll
            ? {
                contentContainerStyle: StyleSheet.flatten([styles.bodyContent, { paddingBottom: insets.bottom + 14 }]),
              }
            : {})}
        >
          {children}
        </Body>
      </Animated.View>
    </View>
  );
}

/** A framed block with a small caption, drawn like a panel of the station schematic. */
export function Plate({ label, children, style, accent }: { label?: string; children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const c = useColors();
  const ty = useType();
  const edge = accent ?? c.primary;
  return (
    <View
      style={[
        styles.plate,
        {
          borderColor: alpha(edge, 0.35),
          backgroundColor: alpha(c.surface, 0.85),
        },
        style,
      ]}
    >
      {label ? (
        <Text style={[styles.plateLabel, { color: alpha(edge, 0.9), fontSize: ty.tiny, fontFamily: MONO }]} maxFontSizeMultiplier={1.2}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** A thin progress bar. */
export function Meter({ value, color, height = 5, style }: { value: number; color: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return (
    <View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: alpha(c.text, 0.1),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${v * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A button with an optional price line; `enabled` false dims it (a tap still says why, through the action's ui_denied). */
export function ActionButton({
  label,
  price,
  enabled = true,
  onPress,
  target,
  style,
  kind = 'primary',
}: {
  label: string;
  price?: string;
  enabled?: boolean;
  onPress: () => void;
  target?: string;
  style?: StyleProp<ViewStyle>;
  kind?: 'primary' | 'ghost';
}) {
  const c = useColors();
  const ty = useType();
  const t = useTarget(target ?? null);
  const fill = kind === 'primary' ? (enabled ? c.primary : alpha(c.primary, 0.18)) : 'transparent';
  const ink = kind === 'primary' ? (enabled ? textOn(c.primary, c.primaryText, '#FFFFFF') : alpha(c.text, 0.55)) : enabled ? c.primary : alpha(c.text, 0.45);
  return (
    <Pressable
      {...t}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={price ? `${label} ${price}` : label}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          borderColor: kind === 'ghost' || !enabled ? alpha(c.primary, 0.45) : c.primary,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: ink, fontSize: ty.body }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
        {label}
        {price ? <Text style={{ fontFamily: MONO, fontWeight: '700' }}>{`  ${price}`}</Text> : null}
      </Text>
    </Pressable>
  );
}

/** A small toggle chip (policy chips, switches). */
export function Chip({ label, on, onPress, color, style, target }: { label: string; on: boolean; onPress: () => void; color?: string; style?: StyleProp<ViewStyle>; target?: string }) {
  const c = useColors();
  const ty = useType();
  const t = useTarget(target ?? null);
  const tint = color ?? c.success;
  return (
    <Pressable
      {...t}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        styles.chip,
        {
          borderColor: on ? tint : alpha(c.text, 0.25),
          backgroundColor: on ? alpha(tint, 0.16) : 'transparent',
        },
        style,
      ]}
    >
      <View style={[styles.chipDot, { backgroundColor: on ? tint : alpha(c.text, 0.25) }]} />
      <Text
        style={{
          color: on ? tint : c.textMuted,
          fontFamily: MONO,
          fontWeight: '700',
          fontSize: ty.small,
        }}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Text in the sheets' body style; `mono` for numbers and readouts. */
export function Line({ children, muted, mono, size, color, style, lines = 2 }: { children: ReactNode; muted?: boolean; mono?: boolean; size?: number; color?: string; style?: StyleProp<TextStyle>; lines?: number }) {
  const c = useColors();
  const ty = useType();
  return (
    <Text
      style={[
        {
          color: color ?? (muted ? c.textMuted : c.text),
          fontSize: size ?? ty.body,
          fontFamily: mono ? MONO : undefined,
          fontWeight: mono ? '600' : '500',
        },
        style,
      ]}
      numberOfLines={lines}
      maxFontSizeMultiplier={1.25}
    >
      {children}
    </Text>
  );
}

/**
 * A small canvas showing a picture recorded around the origin (art kit pictures are), scaled by
 * `scale` and centred. The picture is memoised by its maker and never freed.
 */
export function ArtView({ picture, size, scale = 1, style }: { picture: SkPicture; size: { w: number; h: number }; scale?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Canvas style={StyleSheet.flatten([{ width: size.w, height: size.h }, style])} pointerEvents="none">
      <Group transform={[{ translateX: size.w / 2 }, { translateY: size.h / 2 }, { scale }]}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}

/** Remembers the last value of something that may go away while a sheet slides out (so it does not go blank mid-slide). */
export function useLast<T>(value: T | null): T | null {
  const ref = useRef<T | null>(value);
  if (value !== null) ref.current = value;
  return ref.current;
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  lip: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  title: { flex: 1, fontWeight: '800', letterSpacing: 1.2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, fontWeight: '900' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, gap: 10 },
  plate: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  plateLabel: { fontWeight: '700', letterSpacing: 1.4 },
  button: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '800', letterSpacing: 0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
});
