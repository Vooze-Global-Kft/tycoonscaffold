/**
 * The mode's own overlay host (docs/design/research/yard-tech.md A5: no kit Sheet, no React Native
 * Modal anywhere in this mode, because a Modal is portrait-only by default on iOS and can turn the
 * screen or crash a landscape-only build). Two kinds, both drawn here as absolutely positioned views
 * and registered with `useOverlay` (so the shared popups and hints wait for them):
 * - a panel that slides in from the right side (at most 46 % of the width, inside the safe area);
 * - a centred card (at most 420 pt wide), on top of the panel.
 * Android back closes the top one (and leaves the app only when none is open). A tap on the scrim
 * closes the top one too; a scrim lies directly under each open overlay, so only the top one takes touches. PLACEHOLDER contents: the screens package fills them.
 */
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useOverlay } from '../../kit/overlay';
import { PAL } from '../palette';
import { S } from '../strings';
import { useSalvageUi } from '../uiState';

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function useAndroidBack(): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => useSalvageUi.getState().closeTop());
    return () => sub.remove();
  }, []);
}

export function OverlayHost({ width, height, insets }: { width: number; height: number; insets: Insets }) {
  useAndroidBack();
  const stack = useSalvageUi((s) => s.stack);
  const panel = stack.includes('panel');
  const card = stack.includes('card');
  return (
    <>
      {stack.length ? <Pressable accessibilityRole="button" accessibilityLabel={S.close} style={[StyleSheet.absoluteFill, { backgroundColor: PAL.scrim }]} onPress={() => useSalvageUi.getState().closeTop()} /> : null}
      <SidePanel open={panel} width={width} height={height} insets={insets} />
      {/* A scrim directly under the card too: over an open panel it dims it and takes its touches, so only the top overlay is live. */}
      {card && panel ? <Pressable accessibilityRole="button" accessibilityLabel={S.close} style={[StyleSheet.absoluteFill, { backgroundColor: PAL.scrim }]} onPress={() => useSalvageUi.getState().closeTop()} /> : null}
      {card ? <CentreCard width={width} height={height} insets={insets} /> : null}
    </>
  );
}

function SidePanel({ open, width, height, insets }: { open: boolean; width: number; height: number; insets: Insets }) {
  useOverlay(open);
  const w = Math.min(380, Math.round(width * 0.46)) + insets.right;
  const x = useSharedValue(w);
  useEffect(() => {
    x.value = withTiming(open ? 0 : w, { duration: 220 });
  }, [open, w, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.panel, { width: w, height, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingRight: insets.right + 16 }, style]}>
      <Text style={styles.title}>{S.panelTitle}</Text>
      <Text style={styles.body}>{S.panelBody}</Text>
      <View style={styles.row}>
        <Btn label={S.openCard} onPress={() => useSalvageUi.getState().open('card')} />
        <Btn label={S.close} onPress={() => useSalvageUi.getState().closeTop()} />
      </View>
    </Animated.View>
  );
}

function CentreCard({ width, height, insets }: { width: number; height: number; insets: Insets }) {
  useOverlay(true);
  const w = Math.min(420, width - insets.left - insets.right - 48);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.card, { width: w, maxHeight: height - insets.top - insets.bottom - 32 }]}>
        <Text style={styles.title}>{S.cardTitle}</Text>
        <Text style={styles.body}>{S.cardBody}</Text>
        <View style={styles.row}>
          <Btn label={S.ok} onPress={() => useSalvageUi.getState().closeTop()} />
        </View>
      </View>
    </View>
  );
}

export function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, right: 0, backgroundColor: PAL.card, paddingLeft: 16, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  card: { backgroundColor: PAL.card, borderRadius: 14, padding: 18 },
  title: { fontSize: 18, fontWeight: '800', color: PAL.ink, marginBottom: 8 },
  body: { fontSize: 15, color: PAL.ink, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btn: { minHeight: 44, minWidth: 64, paddingHorizontal: 16, borderRadius: 10, backgroundColor: PAL.button, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: PAL.buttonText },
});
