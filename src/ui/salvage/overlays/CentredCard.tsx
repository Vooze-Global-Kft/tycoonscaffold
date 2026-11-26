/**
 * The centred card (yard-stage1.md 4.3: the away card, the rung sign, confirmations): at most 520 × 300,
 * centred in the band under the top bar; title 15 pt, lead lines, a body, the foot's buttons.
 *
 * owner1-hud (the away card's docket, the owner's review point 6): a card may bring its own title band
 * (`titleNode`) and a fixed part above the scroll (`fixedTop`), so its head and its foot stay in sight
 * while a long list scrolls between them; while more of the list is below, a flat paper-shade lip with a
 * small ink chevron says so (no gradient: yard-style 4).
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { CardButton, Txt } from '../../../engine/salvage';
import { PAD, moreBelow } from './layout';
import { Foot, INK, Lead, TitleRow, useFrame } from './parts';

export interface CentredCardProps {
  title: Txt;
  onClose: () => void;
  lead?: Txt[];
  foot?: CardButton[];
  /** A foot of the screen's own (the away card's OK), kept under the scroll like `foot`. */
  footNode?: ReactNode;
  /** A title band of the card's own in place of the plain title row (it must carry the close button). */
  titleNode?: ReactNode;
  /** A part fixed under the title, above the scroll (the away card's head). */
  fixedTop?: ReactNode;
  /** Padding of the foot (default PAD a side, 10 below). */
  footStyle?: object;
  children?: ReactNode;
}

export function CentredCard({ title, onClose, lead, foot, footNode, titleNode, fixedTop, footStyle, children }: CentredCardProps) {
  const { layout } = useFrame();
  const b = layout.centred;
  const [scroll, setScroll] = useState({ content: 0, view: 0, y: 0 });
  const more = moreBelow(scroll.content, scroll.view, scroll.y);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', top: layout.band.top, bottom: undefined, height: layout.band.height }]}>
      <View accessibilityViewIsModal style={[styles.card, { width: b.w, maxHeight: b.h }]}>
        {titleNode ?? <TitleRow title={title} onClose={onClose} />}
        {fixedTop}
        <View style={styles.scrollWrap}>
          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 6 }}
            scrollEventThrottle={64}
            onLayout={(e) => {
              const view = e.nativeEvent.layout.height;
              setScroll((s) => (s.view === view ? s : { ...s, view }));
            }}
            onContentSizeChange={(_w, content) => setScroll((s) => (s.content === content ? s : { ...s, content }))}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              setScroll((s) => (moreBelow(s.content, s.view, y) === moreBelow(s.content, s.view, s.y) ? s : { ...s, y }));
            }}
          >
            {lead?.map((t, i) => <Lead key={i} t={t} bold={i === 0} />)}
            {children}
          </ScrollView>
          {more ? (
            <View pointerEvents="none" style={styles.more}>
              <View style={styles.chevron} />
            </View>
          ) : null}
        </View>
        {foot?.length ? (
          <View style={{ paddingHorizontal: PAD, paddingBottom: 10 }}>
            <Foot buttons={foot} />
          </View>
        ) : null}
        {footNode ? <View style={footStyle ?? { paddingHorizontal: PAD, paddingBottom: 10 }}>{footNode}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: INK.paper, borderRadius: 12, borderWidth: 1.3, borderColor: INK.ink, overflow: 'hidden' },
  scrollWrap: { flexShrink: 1 },
  more: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 9, backgroundColor: INK.shade, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: INK.rule, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 7, height: 7, borderRightWidth: 1.6, borderBottomWidth: 1.6, borderColor: INK.ink, transform: [{ rotate: '45deg' }], marginTop: -4 },
});
