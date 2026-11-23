/**
 * The long-press chip (spec 4.2): a good's name (game.json) and what it is worth on a ticket line
 * (the rules' value, rounded as paid), above its cell, kept inside the screen. Two text rows sized
 * by hand from fontScale (allowFontScaling off), whose heights add up to the chip's; it never wraps
 * (the width is measured from the words, capped by the screen, and a long name is cut with an ellipsis).
 * Closed by the next touch on the canvas or by Android back (uiState `chip`).
 */
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/merge';
import { NIGHT } from '../art/palette';
import type { MergeLayout } from '../layout';
import { S } from '../strings';
import { useMerge, useMergeShallow } from '../useMerge';
import { cellCentre } from './geometry';
import { chipWords } from './vm';
import { fontScaleOverride } from './devSlow';
import { CHIP, chipMetrics, chipTop } from './chipMetrics';

const { padX: PAD_X, padY: PAD_Y, gutter: GUTTER, border: BORDER } = CHIP;

export function ChipView({ layout, cell }: { layout: MergeLayout; cell: number }) {
  const dims = useWindowDimensions();
  const fontScale = fontScaleOverride ?? dims.fontScale;
  const words = useMergeShallow((cfg, g) => chipWords(cfg, g, cell) ?? { name: '', worth: '' }, { name: '', worth: '' });
  const top = useMerge((_c, g) => {
    const good = g.merge.board[cell];
    return R.isGood(good) && good.k >= R.TIERS;
  }, false);
  if (!words.name) return null;
  const M = chipMetrics(fontScale);
  const worth = top ? S.play.chipTop : words.worth;
  // Width from the longer row at about 0.56 em a letter, capped by the screen.
  const est = Math.max(words.name.length * M.name * 0.58, worth.length * M.worth * 0.56) + PAD_X * 2;
  const w = Math.min(layout.width - GUTTER * 2, Math.ceil(est));
  const c = cellCentre(layout, cell);
  const half = layout.board.cell / 2;
  const x = Math.max(GUTTER, Math.min(layout.width - GUTTER - w, c.x - w / 2));
  // Above the cell; below it when the street is too close.
  const y = chipTop(c.y, half, M.h, layout.street.y);
  return (
    <View pointerEvents="none" style={[styles.chip, { left: x, top: y, width: w, height: M.h }]}>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.name, { fontSize: M.name, height: M.nameRow, lineHeight: M.nameRow }]}>
        {words.name}
      </Text>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.worth, { fontSize: M.worth, height: M.worthRow, lineHeight: M.worthRow }]}>
        {worth}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    paddingHorizontal: PAD_X,
    paddingVertical: PAD_Y,
    borderRadius: 10,
    backgroundColor: NIGHT.paperLight,
    borderColor: NIGHT.brass,
    borderWidth: BORDER,
    shadowColor: NIGHT.ink,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  name: { color: NIGHT.ink, fontWeight: '700', textAlign: 'center' },
  worth: { color: NIGHT.inkSoft, textAlign: 'center' },
});
