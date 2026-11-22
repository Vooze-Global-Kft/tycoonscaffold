/**
 * The Shift Log (spec 2.11, 4.6): the "while you were away" report, a strip from the top of the
 * screen printed at once in the monospaced face:
 *
 *   SHIFT LOG · TAMSIN STATION
 *   AWAY        5 h 12 m
 *   IRON        3,420 u
 *   ROCKS DRY        4
 *   PODS             1
 *   IN FLIGHT    ₵220
 *   CREDITS    ₵18.4K
 *
 * Data: the store's `offline` (`report` is the rules' OfflineReport). "Collect" and "Double it · ad"
 * (the rewarded ad, dimmed while none is loaded) go through haulActions.collectShiftLog. Registers
 * with the overlay manager; plays shift_log when it prints. Not the first game's OfflineModal.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { useOverlay, useRewardedReady } from '../../kit';
import { alpha } from '../../theme';
import { ActionButton, MONO, useType } from '../sheets/parts';
import { say } from '../sheets/shellText';
import { shiftLogRows } from '../sheets/shellLogic';

export function ShiftLog() {
  const offline = useGame((s) => s.offline);
  const cfg = useGame((s) => s.cfg);
  const open = offline !== null && H.isHaul(cfg);
  useOverlay(open);
  if (!open || !offline) return null;
  return <Printout cfg={cfg as H.HaulConfig} offline={offline} />;
}

function Printout({ cfg, offline }: { cfg: H.HaulConfig; offline: { seconds: number; earnings: number; report?: unknown } }) {
  const c = cfg.theme.colors;
  const ty = useType();
  const insets = useSafeAreaInsets();
  const adReady = useRewardedReady();
  const { rows, note } = useMemo(() => shiftLogRows(cfg, offline), [cfg, offline]);
  const drop = useSharedValue(0);
  useEffect(() => {
    fx.play('shift_log');
    drop.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [drop]);
  const strip = useAnimatedStyle(() => ({
    transform: [{ translateY: (drop.value - 1) * 420 }],
  }));
  const dim = useAnimatedStyle(() => ({ opacity: drop.value }));
  const font = ty.body;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: alpha('#000000', 0.55) }, dim]} />
      <Animated.View
        style={[
          styles.strip,
          {
            top: insets.top + 8,
            backgroundColor: c.backgroundAlt,
            borderColor: alpha(c.primary, 0.5),
          },
          strip,
        ]}
      >
        <Text style={[styles.head, { color: c.primary, fontFamily: MONO, fontSize: ty.small }]} maxFontSizeMultiplier={1.2}>
          {say('shiftLog', { station: cfg.haul.names.station.toUpperCase() })}
        </Text>
        <View style={[styles.rule, { borderColor: alpha(c.primary, 0.35) }]} />
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text
              style={{
                color: row.strong ? c.text : c.textMuted,
                fontFamily: MONO,
                fontSize: font,
                fontWeight: row.strong ? '800' : '600',
              }}
              maxFontSizeMultiplier={1.25}
            >
              {row.label}
            </Text>
            <View style={[styles.leader, { borderColor: alpha(c.text, 0.15) }]} />
            <Text
              style={{
                color: row.strong ? c.success : c.text,
                fontFamily: MONO,
                fontSize: row.strong ? ty.big : font,
                fontWeight: row.strong ? '800' : '600',
              }}
              maxFontSizeMultiplier={1.25}
            >
              {row.value}
            </Text>
          </View>
        ))}
        {note ? (
          <Text style={{ color: c.textMuted, fontSize: ty.small, marginTop: 6 }} maxFontSizeMultiplier={1.25}>
            {note}
          </Text>
        ) : null}
        <View style={[styles.rule, { borderColor: alpha(c.primary, 0.35) }]} />
        <View style={styles.buttons}>
          <ActionButton label={say('collect')} onPress={() => void haulActions.collectShiftLog(false)} style={styles.flex} />
          {offline.earnings > 0 ? <ActionButton kind="ghost" label={say('doubleIt')} enabled={adReady} onPress={() => adReady && void haulActions.collectShiftLog(true)} style={styles.flex} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  strip: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  head: { fontWeight: '800', letterSpacing: 1.5 },
  rule: { borderTopWidth: 1, borderStyle: 'dashed', marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  leader: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    marginBottom: 5,
  },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
