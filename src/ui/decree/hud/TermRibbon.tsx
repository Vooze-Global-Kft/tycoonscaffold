/**
 * The term ribbon (spec 4.1, 2.10): "Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170" in its long
 * form where it fits, else "Day 41/110 · NR 9/50" (the record then on the Poll button's badge); never
 * wrapped or cut (metrics.ts `ribbonForm`). From the call day it is the button "Call the election ·
 * poll 4 of 5", which opens the call's confirmation (2.10: it prints the count as it stands); during
 * the run-up and election night it says so. Every value is the rules' `termRibbon`.
 * The ribbon is 18 / 20 pt: as a button its hit slop reaches 13 pt above and below (44 pt).
 * Keeps its name and props (DecreeShell's slot). Owned by the bars package (BARS).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { DESK, alpha } from '../art/palette';
import type { DeskLayout } from '../layout';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';
import { useRibbonView } from '../useDecree';
import { useFontScale } from './fontScale';
import { ribbonForm, slopTo44 } from './metrics';
import { ribbonTexts } from './texts';

/** The ribbon's texts and chosen form, shared with the bottom row (the Poll badge shows in the short form). */
export function useRibbon(zone: { w: number; h: number }) {
  const fontScale = useFontScale();
  const v = useRibbonView();
  return useMemo(() => {
    if (!v) return null;
    const t = ribbonTexts(v);
    const m = ribbonForm(zone, fontScale, t.long, t.short);
    return { v, t, m };
  }, [v, zone, fontScale]);
}

export function TermRibbon({ layout }: { layout: DeskLayout }) {
  const zone = layout.ribbon;
  const r = useRibbon(zone);
  const ribbonRef = useTarget('ribbon');
  const callRef = useTarget(r?.t.kind === 'call' ? 'call' : null);
  if (!r) return null;
  const { t, m, v } = r;
  const call = t.kind === 'call';
  const style = [styles.ribbon, { left: zone.x, top: zone.y, width: zone.w, height: zone.h }, call ? styles.callGround : null];
  const label = (
    <View style={[styles.textBox, { top: m.top, height: m.box }]}>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.text, { fontSize: m.font }, call ? styles.callText : null]}>
        {m.text}
      </Text>
    </View>
  );
  if (!call)
    return (
      <View {...ribbonRef} style={style} pointerEvents="none" accessible accessibilityLabel={m.text}>
        {label}
      </View>
    );
  const w = Math.min(zone.w, m.width + 28);
  return (
    <View {...ribbonRef} style={style} pointerEvents="box-none">
      <Pressable
        {...callRef}
        onPress={() => {
          fx.play('ui_tap');
          useDecreeUi.getState().openSheet({ type: 'callConfirm' });
        }}
        accessibilityRole="button"
        accessibilityLabel={S.hud.callLabel(v.poll.held, v.poll.of)}
        hitSlop={slopTo44(w, zone.h)}
        style={[styles.callButton, { left: Math.round((zone.w - w) / 2), width: w, height: zone.h }]}
      >
        {label}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: { position: 'absolute', backgroundColor: alpha(DESK.chalk, 0.82), borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: alpha(DESK.brass, 0.55) },
  callGround: { backgroundColor: DESK.violetDeep },
  textBox: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  text: { color: DESK.brassLight, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  callButton: { position: 'absolute', top: 0, borderRadius: 4, backgroundColor: DESK.violet, borderWidth: StyleSheet.hairlineWidth, borderColor: DESK.violetLight },
  callText: { color: DESK.paperLight },
});
