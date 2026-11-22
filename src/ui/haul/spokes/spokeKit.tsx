/**
 * The small kit the five spokes share: the terminal type (a monospaced face in capitals), keys
 * (buttons drawn as terminal keys, not rounded pills), bracketed panels, thin progress lines and
 * `ArtImage`, which shows one of the art kit's drawings as a cached image (so a tray of cartridges
 * or a rack of pods costs images, never one Skia canvas per item: AGENTS.md).
 *
 * The look belongs to the haul mode: square corners, 1 pt line light, corner brackets, dark navy
 * fills; nothing here resembles the first game's cards, pills or chunky buttons.
 */
import { Skia, type SkCanvas } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { Image, PixelRatio, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { fx } from '../../../services/fx';
import { textOn } from '../../theme';
import { SPACE } from '../art/palette';

/** The terminal face: Menlo on iOS, the system monospace elsewhere. */
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' });

/** Colours of the spokes (the art kit's palette; text colours checked against SPACE.panel). */
export const INK = {
  bg: SPACE.bg,
  panel: SPACE.panel,
  panelHi: '#101A31',
  edge: SPACE.panelEdge,
  line: SPACE.line,
  lineDim: SPACE.lineDim,
  text: '#E6F1FF',
  dim: '#8EA3C4',
  faint: '#5C7091',
  gold: SPACE.gold,
  green: SPACE.green,
  amber: SPACE.amber,
  red: SPACE.red,
  dm: SPACE.dm,
  core: SPACE.core,
} as const;

/** Largest text growth the dense rows allow (the system font scale still applies up to it). */
export const MAX_SCALE = 1.35;

export function Mono({ children, size = 12, color = INK.text, weight = '400', style, lines, caps = true, center }: { children: ReactNode; size?: number; color?: string; weight?: TextStyle['fontWeight']; style?: StyleProp<TextStyle>; lines?: number; caps?: boolean; center?: boolean }) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_SCALE}
      numberOfLines={lines}
      style={[{ fontFamily: MONO, fontSize: size, color, fontWeight: weight, letterSpacing: caps ? 0.6 : 0, textTransform: caps ? 'uppercase' : 'none', textAlign: center ? 'center' : undefined }, style]}
    >
      {children}
    </Text>
  );
}

type KeyTone = 'cyan' | 'gold' | 'dm' | 'green' | 'ghost';
const TONE: Record<KeyTone, string> = { cyan: INK.line, gold: INK.gold, dm: INK.dm, green: INK.green, ghost: INK.dim };

/**
 * A terminal key: a square-cornered plate with a lit top edge and a notch at the right. `solid`
 * fills it (the one main action of a panel); otherwise it is an outline. Disabled keys dim and
 * play `ui_denied` when pressed, so a refusal is heard, not silent.
 */
export function Key({ label, sub, onPress, tone = 'cyan', solid = false, disabled = false, style, small, target, accessibilityLabel }: { label: string; sub?: string; onPress?: () => void; tone?: KeyTone; solid?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; target?: object; accessibilityLabel?: string }) {
  const c = TONE[tone];
  const fillColor = solid && !disabled ? c : 'transparent';
  const ink = solid && !disabled ? textOn(c) : disabled ? INK.faint : c;
  return (
    <Pressable
      {...target}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      onPress={() => (disabled ? fx.play('ui_denied') : onPress?.())}
      hitSlop={6}
      style={({ pressed }) => [
        styles.key,
        small && styles.keySmall,
        { borderColor: disabled ? INK.edge : c, backgroundColor: fillColor, opacity: pressed && !disabled ? 0.7 : 1 },
        style,
      ]}
    >
      <View style={[styles.keyEdge, { backgroundColor: disabled ? INK.edge : solid ? 'rgba(255,255,255,0.55)' : c }]} />
      <Mono size={small ? 11 : 13} weight="700" color={ink} center lines={1}>
        {label}
      </Mono>
      {sub ? (
        <Mono size={10} color={solid && !disabled ? ink : INK.dim} center lines={1} style={{ marginTop: 1 }}>
          {sub}
        </Mono>
      ) : null}
      <View style={[styles.keyNotch, { borderColor: disabled ? INK.edge : c }]} />
    </Pressable>
  );
}

/** A panel with corner brackets instead of a rounded card; `label` sits in a tab on the top edge. */
export function Bracket({ children, label, right, style, color = INK.lineDim }: { children: ReactNode; label?: string; right?: ReactNode; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[styles.bracket, style]}>
      <View style={[styles.corner, styles.tl, { borderColor: color }]} />
      <View style={[styles.corner, styles.tr, { borderColor: color }]} />
      <View style={[styles.corner, styles.bl, { borderColor: color }]} />
      <View style={[styles.corner, styles.br, { borderColor: color }]} />
      {label || right ? (
        <View style={styles.bracketHead}>
          {label ? (
            <Mono size={10} color={color} weight="700" style={{ letterSpacing: 1.6 }}>
              {label}
            </Mono>
          ) : (
            <View />
          )}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A thin progress line with tick marks every quarter (a gauge, not a rounded bar). */
export function Gauge({ value, color = INK.line, style }: { value: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={[styles.gauge, style]}>
      <View style={[styles.gaugeFill, { width: `${v * 100}%`, backgroundColor: color }]} />
      {[0.25, 0.5, 0.75].map((t) => (
        <View key={t} style={[styles.gaugeTick, { left: `${t * 100}%` }]} />
      ))}
    </View>
  );
}

/** A dotted rule with a label: section separators of the terminal. */
export function Rule({ label, right, color = INK.dim }: { label: string; right?: ReactNode; color?: string }) {
  return (
    <View style={styles.rule}>
      <Mono size={10} color={color} weight="700" style={{ letterSpacing: 1.6 }}>
        {label}
      </Mono>
      <View style={[styles.ruleLine, { borderColor: INK.edge }]} />
      {right}
    </View>
  );
}

// ---------------------------------------------------------------- cached drawings

const images = new Map<string, string>();
const IMAGES_MAX = 160;

/**
 * A PNG data URI of a drawing `w` x `h` points, drawn centred on the origin (the art kit's
 * convention), at the device's density, cached by `key`. '' when it cannot be drawn.
 */
export function artImageUri(key: string, w: number, h: number, draw: (c: SkCanvas) => void): string {
  const density = Math.min(3, Math.max(1, PixelRatio.get()));
  const k = `${key}|${w}x${h}|${density}`;
  const hit = images.get(k);
  if (hit !== undefined) return hit;
  let uri = '';
  try {
    const pw = Math.max(1, Math.ceil(w * density));
    const ph = Math.max(1, Math.ceil(h * density));
    const surface = Skia.Surface.Make(pw, ph);
    if (surface) {
      const c = surface.getCanvas();
      c.scale(pw / w, ph / h);
      c.translate(w / 2, h / 2);
      draw(c);
      surface.flush();
      const snap = surface.makeImageSnapshot();
      const data = snap.encodeToBase64();
      snap.dispose();
      surface.dispose();
      if (data) uri = 'data:image/png;base64,' + data;
    }
  } catch {
    uri = '';
  }
  images.set(k, uri);
  if (images.size > IMAGES_MAX) images.delete(images.keys().next().value as string);
  return uri;
}

/** Shows `artImageUri(id, w, h, draw)`; `id` must change whenever the drawing does. */
export function ArtImage({ id, w, h, draw, style }: { id: string; w: number; h: number; draw: (c: SkCanvas) => void; style?: StyleProp<ViewStyle> }) {
  // The draw function is identified by `id`: a new closure with the same id is the same picture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uri = useMemo(() => artImageUri(id, w, h, draw), [id, w, h]);
  return <View style={[{ width: w, height: h, pointerEvents: 'none' }, style]}>{uri ? <Image source={{ uri }} style={{ width: w, height: h }} /> : null}</View>;
}

/** A percentage for a readout: "12%", "2.5%", never 0 for a non-zero value. */
export function pct(fraction: number): string {
  const p = fraction * 100;
  if (!(p > 0)) return '0%';
  if (p < 0.1) return '<0.1%';
  const r = p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
  return `${r}%`;
}

const styles = StyleSheet.create({
  key: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  keySmall: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 5 },
  keyEdge: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
  keyNotch: { position: 'absolute', right: -5, bottom: -5, width: 10, height: 10, borderWidth: 1, transform: [{ rotate: '45deg' }], backgroundColor: INK.bg },
  bracket: { padding: 12, backgroundColor: 'rgba(12,19,38,0.82)' },
  bracketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  corner: { position: 'absolute', width: 12, height: 12 },
  tl: { left: 0, top: 0, borderLeftWidth: 1.5, borderTopWidth: 1.5 },
  tr: { right: 0, top: 0, borderRightWidth: 1.5, borderTopWidth: 1.5 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 1.5, borderBottomWidth: 1.5 },
  br: { right: 0, bottom: 0, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
  gauge: { height: 4, backgroundColor: '#18243F', overflow: 'hidden' },
  gaugeFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  gaugeTick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: INK.bg },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 6 },
  ruleLine: { flex: 1, borderTopWidth: 1, borderStyle: 'dashed', height: 1 },
});
