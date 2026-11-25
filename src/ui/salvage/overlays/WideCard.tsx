/**
 * The wide card (yard-stage1.md 4.3; the process board of 4.5): the safe width less 12 pt a side (726 pt
 * at 844, 611 at 667), from under the top bar to the bottom inset, centred in the safe area. Title 15 pt,
 * an optional tab strip (the office's), then its body, which lays itself out to the card's box.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Txt } from '../../../engine/salvage';
import { INK, TabStrip, TitleRow, useFrame, type Tab } from './parts';

export interface WideCardProps {
  title: Txt;
  onClose: () => void;
  tabs?: Tab[];
  onTab?: (id: string) => void;
  children?: ReactNode;
}

export function WideCard({ title, onClose, tabs, onTab, children }: WideCardProps) {
  const { layout } = useFrame();
  const b = layout.wide;
  return (
    <View accessibilityViewIsModal style={[styles.card, { left: b.x, top: b.y, width: b.w, height: b.h }]}>
      <TitleRow title={title} onClose={onClose} />
      {tabs && onTab ? <TabStrip tabs={tabs} onTab={onTab} /> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', backgroundColor: INK.paper, borderRadius: 12, borderWidth: 1.3, borderColor: INK.ink, overflow: 'hidden' },
});
