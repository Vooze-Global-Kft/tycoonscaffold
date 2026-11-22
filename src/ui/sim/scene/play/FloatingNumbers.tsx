/**
 * "+$12" numbers that rise and fade where the player tapped (tips and the caught bonus). They
 * come from the store's tapEvents queue; each one removes itself from the queue when it is done.
 */
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../../../../engine/format';
import { useGame } from '../../../../state/store';
import { useTheme } from '../../../theme';
import type { SceneLayout } from '../../layout';
import { SLOWMO } from './dev';

/** More than this many at once only clutters the room; older ones are dropped. */
const MAX_SHOWN = 10;
const FLOAT_W = 160;

export function FloatingNumbers({ layout }: { layout: SceneLayout }) {
  const events = useGame((s) => s.tapEvents);
  const consume = useGame((s) => s.consumeTapEvent);
  const symbol = useGame((s) => s.cfg.strings.currencySymbol);
  useEffect(() => {
    // Drop the oldest beyond the cap at once, so a long tapping streak never builds a backlog.
    if (events.length > MAX_SHOWN) events.slice(0, events.length - MAX_SHOWN).forEach((e) => consume(e.id));
  }, [events, consume]);
  const shown = events.slice(-MAX_SHOWN);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {shown.map((e) => (
        <FloatNumber key={e.id} id={e.id} text={'+' + formatMoney(e.amount, symbol)} x={e.x} y={e.y} big={Boolean(e.big)} layout={layout} onDone={consume} />
      ))}
    </View>
  );
}

const FloatNumber = memo(function FloatNumber({ id, text, x, y, big, layout, onDone }: { id: number; text: string; x: number; y: number; big: boolean; layout: SceneLayout; onDone: (id: number) => void }) {
  const t = useTheme();
  const p = useSharedValue(0);
  const pop = useSharedValue(0.4);
  // A small sideways drift from the id, so quick taps on one spot fan out instead of stacking.
  const drift = ((id * 37) % 41) - 20;
  useEffect(() => {
    pop.value = withSequence(withTiming(big ? 1.25 : 1.1, { duration: 110, easing: Easing.out(Easing.back(3)) }), withTiming(1, { duration: 140 }));
    p.value = withTiming(1, { duration: (big ? 1250 : 900) * SLOWMO, easing: Easing.out(Easing.quad) }, (done) => {
      if (done) runOnJS(onDone)(id);
    });
  }, [big, id, onDone, p, pop]);
  const rise = (big ? 78 : 56) * layout.unit;
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.6 ? 1 : 1 - (p.value - 0.6) / 0.4,
    transform: [{ translateX: drift * p.value }, { translateY: -rise * p.value }, { scale: pop.value }],
  }));
  // Keep the whole number inside the scene even for taps at the very edge.
  const left = Math.max(-FLOAT_W / 2 + 40, Math.min(layout.width - FLOAT_W / 2 - 40, x - FLOAT_W / 2));
  const size = (big ? 26 : 19) * Math.max(0.85, layout.unit);
  return (
    <Animated.Text
      numberOfLines={1}
      allowFontScaling={false}
      style={[
        styles.float,
        t.display,
        { left, top: y - size * 1.4, fontSize: size, lineHeight: size * 1.25, color: big ? '#FFE15A' : '#FFFFFF' },
        style,
      ]}
    >
      {text}
    </Animated.Text>
  );
});

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
    width: FLOAT_W,
    textAlign: 'center',
    textShadowColor: 'rgba(40,20,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
