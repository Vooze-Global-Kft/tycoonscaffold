/**
 * The few words drawn over the room: the "×N" count beside a full pass and the "+cash" that rises
 * from a paying table. They are React Native text on top of the canvas (Skia text would need font
 * files loaded on every platform), animated on the UI thread; they re-render only when their
 * number changes, never per frame.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { formatMoney, formatNumber } from '../../../../engine/format';
import { useGame } from '../../../../state/store';
import { useTheme } from '../../../theme';
import { MAX_PASS_DISHES_DRAWN, MAX_SEATS_DRAWN, type SceneLayout } from '../../layout';

/** "×N" beside the pile when more dishes wait than are drawn. */
export function PileCount({ layout, api }: { layout: SceneLayout; api: { current: ((n: number) => void) | null } }) {
  const t = useTheme();
  const [total, setTotal] = useState(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    let shown = '';
    api.current = (n) => {
      const text = n > MAX_PASS_DISHES_DRAWN ? formatNumber(n) : '';
      if (text === shown) return;
      if (shown === '' && text !== '') pulse.value = withSequence(withTiming(1.25, { duration: 110 }), withTiming(1, { duration: 140 }));
      shown = text;
      setTotal(n);
    };
    return () => {
      api.current = null;
    };
  }, [api, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (total <= MAX_PASS_DISHES_DRAWN) return null;
  const k = layout.artScale;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pill, { left: layout.pass.x + 4 * k, top: layout.pass.y - 20 * k, paddingHorizontal: 7 * k, height: 20 * k, borderRadius: 10 * k }, style]}
    >
      <Text style={[t.display, styles.pillText, { fontSize: 12 * Math.max(0.85, k) }]} numberOfLines={1}>
        {'×' + formatNumber(total)}
      </Text>
    </Animated.View>
  );
}

interface LabelSlot {
  text: string;
  seq: number;
}

/** "+cash" rising over a table each time its guest pays (merged when payments come fast). */
export function PayLabels({ layout, api }: { layout: SceneLayout; api: { current: ((seat: number, cash: number) => void) | null } }) {
  const symbol = useGame((s) => s.cfg.strings.currencySymbol);
  const [slots, setSlots] = useState<LabelSlot[]>(() => Array.from({ length: MAX_SEATS_DRAWN }, () => ({ text: '', seq: 0 })));
  const pending = useRef<Map<number, number>>(new Map());
  const lastShown = useRef<number[]>(Array.from({ length: MAX_SEATS_DRAWN }, () => 0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const flush = () => {
      timer.current = null;
      const now = Date.now();
      const entries = [...pending.current.entries()];
      pending.current.clear();
      if (entries.length === 0) return;
      for (const [seat] of entries) lastShown.current[seat] = now;
      setSlots((prev) => {
        const next = prev.slice();
        for (const [seat, cash] of entries) if (seat < next.length) next[seat] = { text: '+' + formatMoney(cash, symbol), seq: prev[seat].seq + 1 };
        return next;
      });
    };
    api.current = (seat, cash) => {
      if (!(cash > 0) || seat >= MAX_SEATS_DRAWN) return;
      pending.current.set(seat, (pending.current.get(seat) ?? 0) + cash);
      // At most one label update every 250 ms for the whole room.
      if (!timer.current) timer.current = setTimeout(flush, 250);
    };
    return () => {
      api.current = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [api, symbol]);
  return (
    <>
      {slots.map((s, i) => {
        const tbl = layout.tables[i];
        return tbl && s.seq > 0 ? <PayLabel key={i} x={tbl.x} y={tbl.y - 46 * layout.artScale} text={s.text} seq={s.seq} k={layout.artScale} /> : null;
      })}
    </>
  );
}

function PayLabel({ x, y, text, seq, k }: { x: number; y: number; text: string; seq: number; k: number }) {
  const t = useTheme();
  const u: SharedValue<number> = useSharedValue(1);
  useEffect(() => {
    u.value = 0;
    u.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
  }, [seq, u]);
  const style = useAnimatedStyle(() => ({
    opacity: u.value >= 1 ? 0 : u.value < 0.12 ? u.value / 0.12 : u.value > 0.7 ? (1 - u.value) / 0.3 : 1,
    transform: [{ translateY: -18 * k * u.value }, { scale: u.value < 0.12 ? 0.7 + 2.5 * u.value : 1 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.label, { left: x - 60, top: y - 10 }, style]}>
      <Text style={[t.display, styles.labelText, { fontSize: Math.max(11, 13 * k) }]} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', backgroundColor: 'rgba(58,36,22,0.82)', alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#FFFFFF' },
  label: { position: 'absolute', width: 120, alignItems: 'center' },
  labelText: {
    color: '#FFD447',
    textShadowColor: 'rgba(58,36,22,0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 2.5,
  },
});

export { View };
