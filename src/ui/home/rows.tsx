/**
 * Pieces shared by the three stage lists: the row card (which flashes when the scene points at it
 * and reports where it sits so the list can scroll to it), the cycle bar that glides on the UI
 * thread, and the level badge.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useGame } from '../../state/store';
import { alpha, textOn, useTheme } from '../theme';
import { ROW_GAP } from './layout';
import { useHomeUi } from './uiState';

/** Lets rows tell their list where they are, so a focus request can scroll to them. */
export const RowRegistry = createContext<{ register(key: string, y: number, h: number): void } | null>(null);

/**
 * Scrolls a home list to a focused row (useHomeUi().showRow): right away when the row's place is
 * known, or as soon as it lays out (a focus that also switched the stage remounts the list).
 * Spread `ref` on the ScrollView and provide `registry` through RowRegistry around its rows.
 */
export function useRowScroller(stage: string) {
  const scroll = useRef<ScrollViewInstance>(null);
  const rows = useRef(new Map<string, { y: number; h: number }>());
  const pending = useRef<string | null>(null);
  const scrollTo = useCallback((y: number) => scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true }), []);
  const registry = useMemo(
    () => ({
      register(key: string, y: number, h: number) {
        rows.current.set(key, { y, h });
        if (pending.current === key) {
          pending.current = null;
          scrollTo(y);
        }
      },
    }),
    [scrollTo],
  );
  useEffect(
    () =>
      useHomeUi.subscribe((s, prev) => {
        if (!s.focus || s.focus === prev.focus) return;
        const known = s.stage === prev.stage ? rows.current.get(s.focus.key) : undefined;
        if (known) scrollTo(known.y);
        else pending.current = s.focus.key;
      }),
    [scrollTo],
  );
  useEffect(() => {
    rows.current.clear();
  }, [stage]);
  return { ref: scroll, registry };
}

/**
 * A list row card. `focusKey` is the key useHomeUi().showRow() uses for it (a business id,
 * 'transport', 'transportManager' or 'sales'); when that key is focused the card flashes once.
 */
export function RowCard({ focusKey, children, dim, accent, style }: { focusKey: string; children: ReactNode; dim?: boolean; accent?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const registry = useContext(RowRegistry);
  const seq = useHomeUi((s) => (s.focus?.key === focusKey ? s.focus.seq : 0));
  const flash = useSharedValue(0);
  useEffect(() => {
    if (seq === 0) return;
    // Wait for the list to scroll there, then flash once.
    flash.value = withSequence(withTiming(0, { duration: 180 }), withTiming(1, { duration: 140 }), withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) }));
  }, [seq, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  return (
    <View
      onLayout={(e) => registry?.register(focusKey, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
      style={[
        styles.card,
        {
          backgroundColor: dim ? alpha(t.c.surface, 0.55) : t.c.surface,
          borderRadius: t.radius * 0.85,
          borderColor: accent ? alpha(accent, 0.28) : alpha(t.c.text, 0.06),
        },
        style,
      ]}
    >
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: t.radius * 0.85, borderWidth: 3, borderColor: accent ?? t.c.accent, backgroundColor: alpha(accent ?? t.c.accent, 0.12) }, flashStyle]} />
    </View>
  );
}

/**
 * The cycle bar of a station. It follows the station's progress through a store subscription (no
 * React render per tick) and glides between ticks on the UI thread. Very fast automated cycles
 * show as a full bar, which reads better than flicker.
 */
export function CycleBar({ venueId, businessId, solid, color, height, children }: { venueId: string; businessId: string; solid: boolean; color: string; height: number; children?: ReactNode }) {
  const t = useTheme();
  const fill = useSharedValue(0);
  const flash = useSharedValue(0);
  const trackW = useSharedValue(0);
  useEffect(() => {
    if (solid) {
      fill.value = withTiming(1, { duration: 150 });
      return;
    }
    const read = () => useGame.getState().game.venues[venueId]?.businesses[businessId];
    let last = read()?.progress ?? 0;
    fill.value = last;
    return useGame.subscribe((s) => {
      const b = s.game.venues[venueId]?.businesses[businessId];
      if (!b) return;
      const p = b.progress;
      if (p === last) return;
      if (p < last - 0.05) {
        // A cycle finished: snap back to the start and flash, never slide backwards.
        fill.value = p;
        flash.value = withSequence(withTiming(1, { duration: 50 }), withTiming(0, { duration: 320 }));
      } else {
        fill.value = withTiming(p, { duration: 110, easing: Easing.linear });
      }
      last = p;
    });
  }, [venueId, businessId, solid, fill, flash]);
  // A full-width fill slid in from the left (a transform, so no layout pass per frame); the track clips it.
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -(1 - Math.min(1, Math.max(0, fill.value))) * trackW.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.6 }));
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2, backgroundColor: alpha(t.c.text, 0.08) }]} onLayout={(e) => {
        trackW.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[styles.barFill, { backgroundColor: color, borderRadius: height / 2 }, fillStyle]} />
      <View style={[styles.barShine, { borderRadius: height / 2 }]} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderRadius: height / 2 }, flashStyle]} pointerEvents="none" />
      {children}
    </View>
  );
}

/** "Lv 37" on the corner of a row icon. */
export function LevelBadge({ level, color }: { level: number; color: string }) {
  const t = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color, borderColor: t.c.surface }]}>
      <Text style={[t.display, styles.badgeText, { color: textOn(color) }]} numberOfLines={1} maxFontSizeMultiplier={1}>
        {level}
      </Text>
    </View>
  );
}

/** Small segmented progress towards the next milestone. */
export function Pips({ value, color, count = 5 }: { value: number; color: string; count?: number }) {
  const t = useTheme();
  const filled = value * count;
  return (
    <View style={styles.pips}>
      {Array.from({ length: count }, (_, i) => {
        const f = Math.max(0, Math.min(1, filled - i));
        return (
          <View key={i} style={[styles.pip, { backgroundColor: alpha(t.c.text, 0.1) }]}>
            <View style={{ width: `${f * 100}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 10, marginBottom: ROW_GAP, borderWidth: 1, overflow: 'hidden' },
  bar: { overflow: 'hidden', justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  barShine: { position: 'absolute', left: 3, right: 3, top: 2, height: '35%', backgroundColor: 'rgba(255,255,255,0.28)' },
  badge: { position: 'absolute', top: -4, right: -6, minWidth: 22, height: 18, borderRadius: 9, borderWidth: 2, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 13 },
  pips: { flexDirection: 'row', gap: 2, width: 46 },
  pip: { flex: 1, height: 5, borderRadius: 2, overflow: 'hidden' },
});
