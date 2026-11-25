/**
 * The right panel (yard-stage1.md 4.3): min(520, 0.58 W) on a wide phone (489 pt at 844), 0.62 W on a
 * small one (413 at 667), from under the top bar to the bottom inset, sliding in from the right; the
 * place stays dimmed at its left (the host's scrim). Title 15 pt, an optional tab strip and lead lines,
 * then the rows in a scroll view, then the foot. The panel's box reaches the screen's right edge; its
 * text keeps inside the right inset.
 */
import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { CardButton, Txt } from '../../../engine/salvage';
import { PAD } from './layout';
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingLeft: PAD, paddingRight: p.padRight, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
        {lead?.map((t, i) => <Lead key={i} t={t} bold={i === 0} />)}
        {children}
        {after}
      </ScrollView>
      {foot?.length ? (
        <View style={{ paddingLeft: PAD, paddingRight: p.padRight, paddingBottom: 8 }}>
          <Foot buttons={foot} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', backgroundColor: INK.paper, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderLeftWidth: 1.3, borderTopWidth: 1.3, borderBottomWidth: 1.3, borderColor: INK.ink, overflow: 'hidden' },
});
