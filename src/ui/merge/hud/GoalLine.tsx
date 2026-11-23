/**
 * The goal line (spec 2.10, 4.2), 20 pt: the one goal the rules' `advice` names, its price and the
 * estimate ("about 20 s"), truncated by a computed width (barMetrics.ts `goalMetrics`), never
 * wrapped. A tap opens the sheet that buys it, or the place it names (the Lantern Gate, the Season
 * scroll, the ticket); a Basket goal arms the good to sell (tap-tap, 2.5). Nothing is shown when
 * the rules name nothing. Owned by the bars package (BARS, 7a).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { NIGHT, alpha } from '../art/palette';
import type { MergeLayout } from '../layout';
import type { GoalView } from '../sheets/views';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useGoal } from '../useMerge';
import { BAR_GUTTER, GOAL_H, goalMetrics } from './barMetrics';
import { useFontScale } from './fontScale';
import { NO_SELECT } from '../sheets/parts';

/** The goal's words (strings.ts) from the view the rules gave. */
export function goalWords(v: GoalView): string {
  switch (v.kind) {
    case 'gear':
      return v.festivalGear ? S.hud.goalFestivalGear(v.name, v.level, v.tier) : S.hud.goalGear(v.name, v.level);
    case 'stall':
      return S.hud.goalStall(v.name, v.level);
    case 'minderHire':
      return S.hud.goalHire(v.name);
    case 'minderLevel':
      return S.hud.goalMinderLevel(v.name, v.level);
    case 'openStall':
      return S.hud.goalOpenStall(v.name);
    case 'shutter':
      return S.hud.goalShutter;
    case 'lantern':
      return S.hud.goalLantern(v.have, v.need);
    case 'festival':
      return S.hud.goalFestival(v.tier);
    case 'basket':
      return S.hud.goalBasket(v.tier);
    case 'fillTicket':
      return v.level === 1 ? S.hud.goalDragonTicket : S.hud.goalTicket(v.name);
    default:
      return '';
  }
}

/** What a tap on the goal opens (2.10: the sheet that buys it, or the place it names). */
export function openGoal(v: GoalView): void {
  const ui = useMergeUi.getState();
  switch (v.kind) {
    case 'gear':
    case 'stall':
    case 'minderHire':
    case 'minderLevel':
    case 'openStall':
      if (v.target >= 0) ui.openSheet({ type: 'stall', chain: v.target });
      break;
    case 'shutter':
      if (v.target >= 0) ui.openSheet({ type: 'shutter', group: v.target });
      break;
    case 'lantern':
      ui.openSpoke('lanterns');
      break;
    case 'festival':
      ui.openSpoke('season');
      break;
    case 'basket':
      // Arms the good to sell: the next tap on the Basket sells it (tap-tap, 2.5).
      if (v.target >= 0) ui.arm(v.target);
      break;
    case 'fillTicket':
      if (v.target >= 0) ui.openSheet({ type: 'ticket', counter: v.target });
      break;
    default:
      break;
  }
}

export function GoalLine({ layout }: { layout: MergeLayout }) {
  const fontScale = useFontScale();
  const v = useGoal();
  const ref = useTarget(v.kind === 'none' ? null : 'goal');
  const r = layout.goalLine;
  if (v.kind === 'none') return <View style={[styles.line, { left: r.x, top: r.y, width: r.w, height: GOAL_H }]} pointerEvents="none" />;
  const words = goalWords(v);
  const est = v.estN > 0 ? S.hud.about(v.estN, v.estUnit) : '';
  const chevron = 10;
  const m = goalMetrics(r.w, fontScale, words, v.costText, est, chevron);
  return (
    <Pressable
      {...ref}
      onPress={() => {
        fx.play('ui_tap');
        openGoal(v);
      }}
      accessibilityRole="button"
      accessibilityLabel={[words, v.costText, m.showEst ? est : ''].filter(Boolean).join(', ')}
      hitSlop={{ top: 8, bottom: 16 }}
      style={[styles.line, { left: r.x, top: r.y, width: r.w, height: GOAL_H }]}
    >
      <View style={styles.row}>
        <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail" style={[styles.words, { fontSize: m.font, maxWidth: m.wordsW }]}>
          {words}
        </Text>
        {v.costText ? (
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.sep, { fontSize: m.font }]}>
            {'\u00A0·\u00A0'}
            <Text style={styles.price}>{v.costText}</Text>
          </Text>
        ) : null}
        {m.showEst ? (
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.est, { fontSize: m.font }]}>
            {'\u00A0·\u00A0'}
            {est}
          </Text>
        ) : null}
        <Text allowFontScaling={false} style={[styles.chevron, { fontSize: m.font, width: chevron }]}>
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', ...NO_SELECT, justifyContent: 'center', paddingHorizontal: BAR_GUTTER, backgroundColor: alpha(NIGHT.indigoDeep, 0.92) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  words: { color: NIGHT.paperLight, fontWeight: '600', flexShrink: 1 },
  sep: { color: NIGHT.paperShade },
  price: { color: NIGHT.amber, fontWeight: '800' },
  est: { color: NIGHT.paperShade },
  chevron: { color: NIGHT.amber, textAlign: 'right', fontWeight: '700', marginLeft: 2 },
});
