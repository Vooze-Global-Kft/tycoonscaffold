/**
 * The Basket's undo chip (spec 2.5, 4.2): for 4 s after a Basket sale it floats above the Basket
 * with the refund it takes back; a tap undoes the sale (`mergeActions.undoBasket`; the rules refuse
 * it after a purchase or when the purse holds less than the refund, and then it is gone). Android
 * back only puts it away (uiState `undoHidden`, 4.5), it never undoes. Its life is the rules'
 * `basketUndo.until` on the play clock. Owned by the bars package (BARS, 7a).
 */
import { Pressable, StyleSheet, Text } from 'react-native';
import { mergeActions } from '../../../modes/merge/actions';
import { NIGHT, alpha } from '../art/palette';
import { MergeIcon } from '../art/MergeIcon';
import type { Rect } from '../layout';
import { coins } from '../sheets/views';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMerge } from '../useMerge';
import { barScale } from './barMetrics';
import { useFontScale } from './fontScale';
import { NO_SELECT } from '../sheets/parts';

const CHIP_H = 28;

export function UndoChip({ basket }: { basket: Rect }) {
  const fontScale = useFontScale();
  const until = useMerge((_c, g) => {
    const u = g.merge.basketUndo;
    return u && g.stats.playSeconds < u.until && g.merge.board[u.cell] === null ? u.until : -1;
  }, -1);
  const refund = useMerge((cfg, g) => (g.merge.basketUndo ? coins(cfg, g.merge.basketUndo.refund) : ''), '');
  const hidden = useMergeUi((s) => s.undoHidden);
  if (until < 0 || hidden === until) return null;
  const font = Math.min(14, Math.round(11.5 * barScale(fontScale) * 10) / 10);
  const w = basket.w + 8;
  return (
    <Pressable
      onPress={() => mergeActions.undoBasket()}
      accessibilityRole="button"
      accessibilityLabel={S.hud.undoLabel(refund)}
      // No slop upward: the board's bottom row sits right above; the chip overlaps the Basket's top
      // edge instead (the Basket is idle while the undo is offered), never a board cell.
      hitSlop={{ top: 0, bottom: 8, left: 4, right: 4 }}
      style={({ pressed }) => [styles.chip, { left: basket.x - 4, top: basket.y - CHIP_H + 8, minWidth: w, height: CHIP_H }, pressed ? styles.pressed : null]}
    >
      <MergeIcon icon="art:coin" size={14} />
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.text, { fontSize: font }]}>
        {S.hud.undo} −{refund}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    ...NO_SELECT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: CHIP_H / 2,
    backgroundColor: NIGHT.paper,
    borderWidth: 1,
    borderColor: NIGHT.brass,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pressed: { backgroundColor: alpha(NIGHT.paper, 0.8) },
  text: { color: NIGHT.ink, fontWeight: '800' },
});
