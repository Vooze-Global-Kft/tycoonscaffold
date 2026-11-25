/**
 * The centred card (yard-stage1.md 4.3: the away card, the rung sign, confirmations): at most 520 × 300,
 * centred in the band under the top bar; title 15 pt, lead lines, a body, the foot's buttons.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { CardButton, Txt } from '../../../engine/salvage';
import { PAD } from './layout';
import { Foot, INK, Lead, TitleRow, useFrame } from './parts';

export interface CentredCardProps {
  title: Txt;
  onClose: () => void;
  lead?: Txt[];
  foot?: CardButton[];
  children?: ReactNode;
}

export function CentredCard({ title, onClose, lead, foot, children }: CentredCardProps) {
  const { layout } = useFrame();
  const b = layout.centred;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', top: layout.band.top, bottom: undefined, height: layout.band.height }]}>
      <View accessibilityViewIsModal style={[styles.card, { width: b.w, maxHeight: b.h }]}>
        <TitleRow title={title} onClose={onClose} />
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 6 }}>
          {lead?.map((t, i) => <Lead key={i} t={t} bold={i === 0} />)}
          {children}
        </ScrollView>
        {foot?.length ? (
          <View style={{ paddingHorizontal: PAD, paddingBottom: 10 }}>
            <Foot buttons={foot} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: INK.paper, borderRadius: 12, borderWidth: 1.3, borderColor: INK.ink, overflow: 'hidden' },
});
