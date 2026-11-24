/**
 * The bottom row (spec 4.1): the in-tray (its wire tray, the count waiting, a tap shows the next three
 * visitors' faces: the peek, sheets/Peek.tsx) and Ledger, Cabinet, Poll, Office, each an icon over its
 * label in rows that add up to the button's height (metrics.ts `buttonMetrics`). While the term ribbon
 * shows its short form the Poll button carries the record as a badge ("Lv 52/80", 4.1). Every button is
 * at least 44 × 44 (64 or 72 × 48 / 52) and registers its hint target. No background of its own.
 * Keeps its name and props (DecreeShell's slot). Owned by the bars package (BARS).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import type { DeskLayout, Rect } from '../layout';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';
import { useTray } from '../useDecree';
import { useFontScale } from './fontScale';
import { ROW_INSET, buttonMetrics, type ButtonMetrics } from './metrics';
import { useRibbon } from './TermRibbon';

const LABELS = [S.hud.inTray, S.hud.ledger, S.hud.cabinet, S.hud.poll, S.hud.office];

function Button({ rect, x0, icon, label, badge, onPress, target, m, a11y }: { rect: Rect; x0: number; icon: string; label: string; badge: string | null; onPress: () => void; target: string; m: ButtonMetrics; a11y?: string }) {
  const ref = useTarget(target);
  return (
    <Pressable
      {...ref}
      onPress={() => {
        fx.play('ui_tap');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [styles.button, { left: rect.x - x0, top: ROW_INSET, width: rect.w, height: m.h, opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.icon, { top: m.iconTop, height: m.iconSize }]}>
        <DecreeIcon icon={icon} size={m.iconSize} />
      </View>
      <View style={[styles.label, { top: m.labelTop, height: m.labelBox }]}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.labelText, { fontSize: m.labelFont }]}>
          {label}
        </Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { height: m.badgeBox }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.badgeText, { fontSize: m.badgeFont }]}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function BottomRow({ layout }: { layout: DeskLayout }) {
  const fontScale = useFontScale();
  const tray = useTray();
  const ribbon = useRibbon(layout.ribbon);
  const row = layout.bottomRow;
  const b = layout.buttons;
  const pollBadge = ribbon && ribbon.t.kind === 'term' && ribbon.m.form === 'short' ? ribbon.t.badge : null;
  const m = useMemo(() => buttonMetrics(row.h, b.ledger.w, fontScale, LABELS, [pollBadge ?? '', String(tray.count)]), [row.h, b.ledger.w, fontScale, pollBadge, tray.count]);
  const ui = useDecreeUi.getState;
  return (
    <View style={[styles.row, { left: row.x, top: row.y, width: row.w, height: row.h }]} pointerEvents="box-none">
      <Button rect={b.inTray} x0={row.x} icon="art:intray" label={S.hud.inTray} badge={tray.count > 0 ? String(tray.count) : null} target="button:inTray" m={m} a11y={S.hud.trayLabel(tray.count)} onPress={() => (useDecreeUi.getState().peek ? ui().closePeek() : ui().openPeek())} />
      <Button rect={b.ledger} x0={row.x} icon="art:btn_ledger" label={S.hud.ledger} badge={null} target="button:ledger" m={m} onPress={() => ui().openSheet({ type: 'ledger' })} />
      <Button rect={b.cabinet} x0={row.x} icon="art:btn_cabinet" label={S.hud.cabinet} badge={null} target="button:cabinet" m={m} onPress={() => ui().openSheet({ type: 'cabinet' })} />
      <Button rect={b.poll} x0={row.x} icon="art:btn_poll" label={S.hud.poll} badge={pollBadge} target="button:poll" m={m} onPress={() => ui().openSheet({ type: 'poll' })} />
      <Button rect={b.office} x0={row.x} icon="art:btn_office" label={S.hud.office} badge={null} target="button:office" m={m} onPress={() => ui().openView('office')} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute' },
  button: { position: 'absolute', borderRadius: 8, backgroundColor: alpha(DESK.walnutDeep, 0.72), borderWidth: StyleSheet.hairlineWidth, borderColor: alpha(DESK.brass, 0.8) },
  icon: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  labelText: { color: DESK.paperLight, fontWeight: '700', textAlign: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, paddingHorizontal: 4, borderRadius: 8, backgroundColor: DESK.paperLight, borderWidth: StyleSheet.hairlineWidth, borderColor: DESK.violet, justifyContent: 'center' },
  badgeText: { color: DESK.violetDeep, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
});
