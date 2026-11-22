/**
 * The home tab of a sim game: the living scene, the stage strip, the buy-amount row and the list of
 * the selected stage (design sheet section 3). The scene gets its full height (300, or 220 on small
 * phones) unless that would leave room for fewer than three list rows; then it gives up height.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VenueScene } from '../sim/VenueScene';
import { useTheme } from '../theme';
import { BuyAmountRow } from './BuyAmountRow';
import { ROW_GAP, useHomeMetrics, type HomeMetrics } from './layout';
import { RowRegistry } from './rows';
import { StageStrip } from './StageStrip';
import { SalesList, TransportList } from './StageLists';
import { StationList } from './StationList';
import { useHomeUi } from './uiState';

/** Scene height for the space the home tab has, keeping at least three list rows visible. */
export function sceneHeightFor(m: HomeMetrics, available: number): number {
  const listMin = 3 * (m.row + ROW_GAP) + 8;
  return Math.round(Math.max(m.minScene, Math.min(m.scene, available - m.strip - m.buyRow - listMin)));
}

export function HomeSim() {
  const t = useTheme();
  const m = useHomeMetrics();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [measured, setMeasured] = useState(0);
  const available = measured > 0 ? measured : height - insets.top - insets.bottom - m.header - m.tabBar;
  const sceneH = sceneHeightFor(m, available);
  const stage = useHomeUi((s) => s.stage);

  // Scroll a focused row into view: right away when we know where it is, or as soon as it lays out
  // (a focus that also switched the stage remounts the list).
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

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setMeasured(e.nativeEvent.layout.height)}>
      <VenueScene width={width} height={sceneH} />
      <View style={[styles.shade, { backgroundColor: t.c.backgroundAlt }]}>
        <StageStrip height={m.strip} compact={m.compact} />
        <BuyAmountRow height={m.buyRow} />
      </View>
      <RowRegistry.Provider value={registry}>
        <ScrollView ref={scroll} key={stage} style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(160)}>
            {stage === 'production' ? <StationList rowHeight={m.row} compact={m.compact} /> : null}
            {stage === 'transport' ? <TransportList rowHeight={m.row} compact={m.compact} /> : null}
            {stage === 'sales' ? <SalesList rowHeight={m.row} compact={m.compact} /> : null}
          </Animated.View>
        </ScrollView>
      </RowRegistry.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { paddingTop: 2, paddingBottom: 2, zIndex: 2 },
  list: { paddingTop: 6, paddingBottom: 16 },
});
