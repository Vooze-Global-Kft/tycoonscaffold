/**
 * The right panel (yard-stage1.md 4.3): min(520, 0.58 W) on a wide phone (489 pt at 844), 0.62 W on a
 * small one (413 at 667), from under the top bar to the bottom inset, sliding in from the right; the
 * place stays dimmed at its left (the host's scrim). Title 15 pt, an optional tab strip and lead lines,
 * then the rows in a scroll view, then the foot. The panel's box reaches the screen's right edge; its
 * text keeps inside the right inset.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { CardButton, Txt } from '../../../engine/salvage';
import { PAD, moreBelow } from './layout';
import { Foot, INK, Lead, TabStrip, TitleRow, useFrame, type Tab } from './parts';

export interface PanelProps {
  title: Txt;
  onClose: () => void;
  tabs?: Tab[];
  onTab?: (id: string) => void;
  lead?: Txt[];
  foot?: CardButton[];
  /** The rows (parts.tsx Row) or any body. */
  children?: ReactNode;
  /** Under the rows, inside the scroll (the legal line, a note). */
  after?: ReactNode;
}

export function Panel({ title, onClose, tabs, onTab, lead, foot, children, after }: PanelProps) {
  const { layout } = useFrame();
  const p = layout.panel;
  const x = useSharedValue(p.w);
  useEffect(() => {
    x.value = withTiming(0, { duration: 200 });
  }, [x]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View accessibilityViewIsModal style={[styles.panel, { left: p.x, top: p.y, width: p.w, height: p.h }, slide]}>
      <View style={{ paddingRight: p.padRight - PAD }}>
        <TitleRow title={title} onClose={onClose} />
        {tabs && onTab ? <TabStrip tabs={tabs} onTab={onTab} /> : null}
      </View>
      <MoreBelow style={{ flex: 1 }} contentContainerStyle={{ paddingLeft: PAD, paddingRight: p.padRight, paddingBottom: 10 }}>
        {lead?.map((t, i) => <Lead key={i} t={t} bold={i === 0} />)}
        {children}
        {after}
      </MoreBelow>
      {foot?.length ? (
        <View style={{ paddingLeft: PAD, paddingRight: p.padRight, paddingBottom: 8 }}>
          <Foot buttons={foot} />
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Steps of the fade at a scroll's foot (no gradient package: paper strips of rising opacity). */
const FADE_STEPS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 0.96];
const FADE_H = 30;


/**
 * A vertical scroll that shows it scrolls (L14): while more lies below, its foot fades into the paper
 * and a small chevron sits in the fade; at the end the fade goes. Used by every panel (and the wide card's
 * bodies where they scroll).
 */
export function MoreBelow({ style, contentContainerStyle, children }: { style?: object; contentContainerStyle?: object; children?: ReactNode }) {
  const [m, setM] = useState({ c: 0, v: 0, y: 0 });
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setM((o) => (Math.abs(o.y - y) < 2 ? o : { ...o, y }));
  };
  const more = moreBelow(m.c, m.v, m.y);
  return (
    <View style={[{ position: 'relative' }, style]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={onScroll}
        onLayout={(e) => {
          const v = e.nativeEvent.layout.height;
          setM((o) => (o.v === v ? o : { ...o, v }));
        }}
        onContentSizeChange={(_w, c) => setM((o) => (o.c === c ? o : { ...o, c }))}
      >
        {children}
      </ScrollView>
      {more ? (
        <View pointerEvents="none" style={styles.fade} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {FADE_STEPS.map((a, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: INK.paper, opacity: a }} />
          ))}
          <View style={styles.chevron} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE_H },
  chevron: { position: 'absolute', left: '50%', bottom: 7, width: 10, height: 10, marginLeft: -5, borderRightWidth: 2, borderBottomWidth: 2, borderColor: INK.soft, transform: [{ rotate: '45deg' }] },
  panel: { position: 'absolute', backgroundColor: INK.paper, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderLeftWidth: 1.3, borderTopWidth: 1.3, borderBottomWidth: 1.3, borderColor: INK.ink, overflow: 'hidden' },
});
