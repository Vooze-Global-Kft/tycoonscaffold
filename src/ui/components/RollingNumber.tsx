/**
 * A number that rolls smoothly to its new value instead of jumping: the cash counter, the
 * welcome-back amount. The digits change on the UI thread (a read-only text input is the one
 * React Native text whose content Reanimated can set without a render), so a counter that moves
 * ten times a second costs no React work per frame.
 */
import { useEffect } from 'react';
import { Platform, StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatMoney, formatNumber } from '../../engine/format';
import { glideMs } from '../sim/scene/world/ticker';
import { rollMoney, rollNumber } from './rollFormat';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  value: number;
  /** Currency symbol: formats as money. Omit for a plain number. */
  symbol?: string;
  /** How long one roll takes. Ticks arrive every 100 ms, so a roll is usually overtaken by the next. */
  duration?: number;
  /** Start from zero and count up on mount (the welcome-back amount). */
  fromZero?: boolean;
  /**
   * Follow a value that changes every tick without re-rendering: called once with a setter, returns
   * the unsubscribe. Each new value glides there linearly in the time between ticks, so the
   * counter never restarts a long animation ten times a second. `value` is then only the start.
   */
  follow?: (set: (v: number) => void) => () => void;
  /**
   * False when the caller has already sized the text for the phone's text-size setting (a counter
   * in a bar of fixed height). Default: the system scales it, up to 1.2 times.
   */
  allowFontScaling?: boolean;
  /**
   * Give the box a `height` close to the text's own line and let the parent centre the box. Do not
   * set `lineHeight`: an iPhone text field puts the text at the bottom of a taller line.
   */
  style?: StyleProp<TextStyle>;
}

export function RollingNumber({ value, symbol, duration = 450, fromZero = false, follow, allowFontScaling = true, style }: Props) {
  const shown = useSharedValue(fromZero ? 0 : value);
  useEffect(() => {
    if (follow) return;
    shown.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, shown, follow]);
  useEffect(() => {
    if (!follow) return;
    return follow((v) => {
      shown.value = withTiming(v, { duration: glideMs(), easing: Easing.linear });
    });
  }, [follow, shown]);
  const animatedProps = useAnimatedProps(() => {
    const text = symbol !== undefined ? rollMoney(shown.value, symbol) : rollNumber(shown.value);
    return { text, defaultValue: text } as object;
  });
  const initial = fromZero ? (symbol !== undefined ? formatMoney(0, symbol) : '0') : symbol !== undefined ? formatMoney(value, symbol) : formatNumber(value);
  return (
    <AnimatedInput
      editable={false}
      pointerEvents="none"
      caretHidden
      contextMenuHidden
      focusable={false}
      underlineColorAndroid="transparent"
      defaultValue={initial}
      animatedProps={animatedProps}
      style={[styles.input, style]}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={1.2}
      accessibilityRole="text"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' as const } : null),
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', cursor: 'default' } as object) : null),
  },
});

/** A font size that fits `text` into `width` points, from `max` down to `min` (display fonts run about 0.62 em per glyph). */
export function fitFontSize(text: string, width: number, max: number, min = 12, emPerChar = 0.62): number {
  if (width <= 0) return max;
  return Math.max(min, Math.min(max, width / (Math.max(1, text.length) * emPerChar)));
}
