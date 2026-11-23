/**
 * The bottom row (spec 4.1, 4.2), 48 pt: the Basket at the rectangle mergeLayout gives it (the play
 * canvas's hit test drops onto that rectangle; a tap here with a good armed sells it, tap-tap 2.5),
 * the 4 s undo chip floating above it, and the Book, Lanterns, Season and Shop buttons (the spokes
 * are the spokes package's: they open through uiState; the Shop is a sheet of this package). Icon
 * over label, sized by hand (barMetrics.ts `buttonMetrics`); every button registers its hint key.
 * Owned by the bars package (BARS, 7a).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/merge';
import { mergeActions } from '../../../modes/merge/actions';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { MergeIcon } from '../art/MergeIcon';
import { NIGHT, alpha } from '../art/palette';
import type { MergeLayout, Rect } from '../layout';
import { S } from '../strings';
import { useMergeUi, type MergeSpoke } from '../uiState';
import { buttonMetrics } from './barMetrics';
import { useFontScale } from './fontScale';
import { UndoChip } from './UndoChip';

type Slot = { key: 'book' | 'lanterns' | 'season' | 'shop'; icon: string; label: string };

const SLOTS: readonly Slot[] = [
  { key: 'book', icon: 'art:book', label: S.hud.book },
  { key: 'lanterns', icon: 'art:gate', label: S.hud.lanterns },
  { key: 'season', icon: 'art:scroll', label: S.hud.season },
  { key: 'shop', icon: 'art:shop', label: S.hud.shop },
];

function RowButton({ rect, icon, label, target, onPress, armed }: { rect: Rect; icon: string; label: string; target: string; onPress: () => void; armed?: boolean }) {
  const fontScale = useFontScale();
  const m = buttonMetrics(rect.w, fontScale, label);
  const ref = useTarget(target);
  return (
    <Pressable
      {...ref}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }, armed ? styles.armed : null, pressed ? styles.pressed : null]}
    >
      <View style={{ position: 'absolute', top: m.iconTop, left: (rect.w - m.iconSize) / 2 }}>
        <MergeIcon icon={icon} size={m.iconSize} />
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.label, { top: m.labelTop, height: m.labelH, lineHeight: m.labelH, fontSize: m.labelFont }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomRow({ layout }: { layout: MergeLayout }) {
  const armed = useMergeUi((s) => s.armed);
  const row = layout.bottomRow;
  const open = (key: Slot['key']) => () => {
    fx.play('ui_tap');
    const ui = useMergeUi.getState();
    if (key === 'shop') ui.openSheet({ type: 'shop' });
    else ui.openSpoke(key as MergeSpoke);
  };
  const basket = () => {
    const cell = useMergeUi.getState().armed;
    if (cell === null) return;
    // Tap-tap (2.5): the armed good dropped on the Basket, as the drag would.
    useMergeUi.getState().disarm();
    mergeActions.dropAt(cell, R.TARGET_BASKET);
  };
  return (
    <>
      <View style={[styles.ground, { top: row.y, height: layout.height - row.y }]} pointerEvents="none" />
      <RowButton rect={layout.basket} icon="art:basket" label={S.hud.basket} target="basket" onPress={basket} armed={armed !== null} />
      {layout.buttons.map((r, i) => {
        const s = SLOTS[i];
        return s ? <RowButton key={s.key} rect={r} icon={s.icon} label={s.label} target={`button:${s.key}`} onPress={open(s.key)} /> : null;
      })}
      <UndoChip basket={layout.basket} />
    </>
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', left: 0, right: 0, backgroundColor: NIGHT.indigoDeep, borderTopWidth: StyleSheet.hairlineWidth, borderColor: alpha(NIGHT.brass, 0.45) },
  button: { position: 'absolute', borderRadius: 10 },
  armed: { backgroundColor: alpha(NIGHT.amber, 0.18), borderWidth: 1, borderColor: alpha(NIGHT.amber, 0.7) },
  pressed: { backgroundColor: alpha(NIGHT.paper, 0.08) },
  label: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: NIGHT.paper, fontWeight: '600' },
});
