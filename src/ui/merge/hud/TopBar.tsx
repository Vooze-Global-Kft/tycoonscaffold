/**
 * The top bar (spec 4.1, 4.2, M35), 40 pt: the purse (a coin and a RollingNumber: the till's coins
 * join it with every paid ticket and each minute, so it simply follows the shared cash), the season
 * chip ("Spring Lanterns" over "Festival 0/4"; the count alone when the bar is narrow, M35; a tap
 * opens the Season scroll), the gift bag with its count (only while boxes wait; a tap opens the gift
 * box sheet) and the menu button (Settings). Every font comes from barMetrics.ts (sized by hand from
 * the font scale, allowFontScaling={false}); the purse has a box height and no lineHeight.
 * Owned by the bars package (BARS, 7a).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fx } from '../../../services/fx';
import { RollingNumber } from '../../components/RollingNumber';
import { rollNumber } from '../../components/rollFormat';
import { useTarget } from '../../hints/targets';
import { MergeIcon } from '../art/MergeIcon';
import { NIGHT, alpha } from '../art/palette';
import type { MergeLayout } from '../layout';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useGiftCount, usePurse, useSeasonChip } from '../useMerge';
import { BAR_GUTTER, PURSE_ICON, TOP_BAR_H, TOP_BUTTON, topBarMetrics } from './barMetrics';
import { useFontScale } from './fontScale';

export function TopBar({ layout }: { layout: MergeLayout }) {
  const fontScale = useFontScale();
  const cash = usePurse();
  const chip = useSeasonChip();
  const gifts = useGiftCount();
  // What the RollingNumber settles on (its own format), so the width fits the longest form.
  const purseText = rollNumber(cash);
  const count = chip.done ? S.hud.festivalDone : S.hud.festivalCount(chip.filled, chip.lines);
  // Re-measured only when the text's shape or the chip changes (not on every coin).
  const purseShape = purseText.replace(/[0-9]/g, '0');
  const m = useMemo(
    () => topBarMetrics(layout.topBar.w, fontScale, purseShape, chip.season, count, gifts > 0),
    [layout.topBar.w, fontScale, purseShape, chip.season, count, gifts],
  );
  const purseRef = useTarget('purse');
  const menuRef = useTarget('button:menu');
  const bagRef = useTarget(gifts > 0 ? 'giftbox' : null);
  const r = layout.topBar;
  const tap = (fn: () => void) => () => {
    fx.play('ui_tap');
    fn();
  };
  return (
    <View style={[styles.bar, { left: r.x, top: r.y, width: r.w, height: TOP_BAR_H }]} pointerEvents="box-none">
      <View {...purseRef} style={[styles.purse, { left: BAR_GUTTER, height: TOP_BAR_H }]} accessible accessibilityLabel={S.hud.purseLabel(purseText)}>
        <MergeIcon icon="art:coin" size={PURSE_ICON} />
        <View style={{ width: m.purseW, height: m.purseBox, marginLeft: 4 }}>
          <RollingNumber value={cash} allowFontScaling={false} style={[styles.purseText, { fontSize: m.purseFont, height: m.purseBox, width: m.purseW }]} />
        </View>
      </View>
      <Pressable
        onPress={tap(() => useMergeUi.getState().openSpoke('season'))}
        accessibilityRole="button"
        accessibilityLabel={S.hud.seasonLabel}
        style={[styles.chip, { left: m.chipX, width: m.chipW, height: TOP_BAR_H }]}
      >
        <View style={{ position: 'absolute', top: m.chipTop, left: 0, right: 0 }}>
          {m.chipText.map((t, i) => (
            <Text
              key={i}
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.chipText, { fontSize: m.chipFont, height: m.chipRowH, color: m.chipRows === 2 && i === 0 ? NIGHT.amberSoft : chip.done ? NIGHT.amber : NIGHT.paper, fontWeight: i === 0 && m.chipRows === 2 ? '700' : '500' }]}
            >
              {t}
            </Text>
          ))}
        </View>
      </Pressable>
      {m.bagX !== null ? (
        <Pressable
          {...bagRef}
          onPress={tap(() => useMergeUi.getState().openSheet({ type: 'gift' }))}
          accessibilityRole="button"
          accessibilityLabel={S.hud.giftLabel(gifts)}
          hitSlop={{ top: 2, bottom: 2 }}
          style={[styles.button, { left: m.bagX, width: TOP_BUTTON, height: TOP_BAR_H }]}
        >
          <MergeIcon icon="art:giftbag-3" size={m.iconSize + 4} />
          <View style={styles.badge}>
            <Text allowFontScaling={false} style={[styles.badgeText, { fontSize: m.badgeFont }]}>
              {gifts}
            </Text>
          </View>
        </Pressable>
      ) : null}
      <Pressable
        {...menuRef}
        onPress={tap(() => useMergeUi.getState().openSheet({ type: 'settings' }))}
        accessibilityRole="button"
        accessibilityLabel={S.hud.menuLabel}
        hitSlop={{ top: 2, bottom: 2 }}
        style={[styles.button, { left: m.menuX, width: TOP_BUTTON, height: TOP_BAR_H }]}
      >
        <View style={styles.menuIcon}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.menuLine} />
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', backgroundColor: NIGHT.indigoDeep, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: alpha(NIGHT.brass, 0.6) },
  purse: { position: 'absolute', top: 0, flexDirection: 'row', alignItems: 'center' },
  purseText: { color: NIGHT.amber, fontWeight: '800', padding: 0, margin: 0, borderWidth: 0, textAlign: 'left' },
  chip: { position: 'absolute', top: 0, justifyContent: 'center' },
  chipText: { textAlign: 'center' },
  button: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 3, top: 3, minWidth: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: NIGHT.amber, alignItems: 'center' },
  badgeText: { color: NIGHT.ink, fontWeight: '800' },
  menuIcon: { width: 20, height: 16, justifyContent: 'space-between' },
  menuLine: { height: 2.5, borderRadius: 1.25, backgroundColor: NIGHT.paper },
});
