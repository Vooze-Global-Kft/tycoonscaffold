/**
 * The buy / hire / unlock button of the home lists. It looks like the kit's Button (chunky, with a
 * darker bottom edge) and adds one thing the genre relies on: while the player cannot afford it,
 * a soft fill shows how close their savings are. The fill follows cash on the UI thread through a
 * store subscription, so rows do not re-render ten times a second for it.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useGame } from '../../state/store';
import { alpha, textOn, useTheme } from '../theme';

interface Props {
  label: string;
  sublabel?: string;
  onPress: () => void;
  /** Price in cash: the button is enabled when the player has this much. Infinity = never. */
  cost: number;
  /** Disabled for another reason (a mystery row). */
  locked?: boolean;
  variant?: 'primary' | 'success' | 'accent';
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Spread from useTarget so the tutorial hand can find it. */
  target?: object;
  accessibilityLabel?: string;
}

/** 0..1: how much of `cost` the player holds right now, kept on the UI thread. */
function useSavings(cost: number) {
  const fill = useSharedValue(0);
  useEffect(() => {
    const set = (cash: number) => {
      const v = Number.isFinite(cost) && cost > 0 ? Math.min(1, Math.max(0, cash / cost)) : 0;
      fill.value = withTiming(v, { duration: 120, easing: Easing.linear });
    };
    set(useGame.getState().game.cash);
    return useGame.subscribe((s, prev) => {
      if (s.game.cash !== prev.game.cash) set(s.game.cash);
    });
  }, [cost, fill]);
  return fill;
}

export function BuyButton({ label, sublabel, onPress, cost, locked, variant = 'primary', height = 50, style, target, accessibilityLabel }: Props) {
  const t = useTheme();
  const affordable = useGame((s) => !locked && Number.isFinite(cost) && s.game.cash >= cost);
  const fill = useSavings(cost);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const bg = variant === 'success' ? t.c.success : variant === 'accent' ? t.c.accent : t.c.primary;
  const fg = textOn(bg);
  return (
    <Pressable
      {...target}
      onPress={onPress}
      disabled={!affordable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !affordable }}
      accessibilityLabel={accessibilityLabel ?? `${label}${sublabel ? `, ${sublabel}` : ''}`}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      style={({ pressed }) => [
        styles.base,
        { height, borderRadius: t.radius * 0.7, backgroundColor: affordable ? bg : alpha(t.c.text, 0.12), borderBottomColor: affordable ? 'rgba(0,0,0,0.22)' : alpha(t.c.text, 0.1) },
        pressed && affordable && { transform: [{ scale: 0.95 }, { translateY: 2 }] },
        style,
      ]}
    >
      {!affordable && !locked ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: t.radius * 0.7, overflow: 'hidden' }]} pointerEvents="none">
          <Animated.View style={[styles.fill, { backgroundColor: alpha(bg, 0.22) }, fillStyle]} />
        </View>
      ) : null}
      <Text style={[t.display, styles.label, { color: affordable ? fg : alpha(t.c.text, 0.55) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.25}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[styles.sub, { color: affordable ? fg : alpha(t.c.text, 0.6) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.25}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 86, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { fontSize: 14 },
  sub: { fontSize: 11.5, fontWeight: '800', marginTop: 0 },
});
