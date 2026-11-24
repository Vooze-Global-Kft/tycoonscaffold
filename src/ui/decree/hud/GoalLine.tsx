/**
 * The goal line (spec 2.16, 4.1): the rules' advice (`goalLine`) in words from strings.ts, with its
 * price and "about 20 s / 2 min / 1 h" as the rules give them, in at most 34 characters (metrics.ts
 * `goalForm` picks the first form that fits). During a boycott or "Say nothing" it names the free way
 * out and, while the rules offer it, the ad as a button ("Watch ad"; "Take it" with the ad skip
 * owned) that the player taps; from the call to the end of election night "Closed during the run-up"
 * stands where that button would be. The line has no background of its own.
 * Keeps its name and props (DecreeShell's slot). Owned by the bars package (BARS).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { decreeActions } from '../../../modes/decree/actions';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { useRewardedReady } from '../../kit';
import { DESK, alpha } from '../art/palette';
import type { DeskLayout } from '../layout';
import { S } from '../strings';
import { useAdFree, useGoalView } from '../useDecree';
import { useFontScale } from './fontScale';
import { GOAL_BUTTON_W, GOAL_CLOSED_W, GOAL_GUTTER, goalForm, slopTo44 } from './metrics';
import { goalForms } from './texts';

export function GoalLine({ layout }: { layout: DeskLayout }) {
  const fontScale = useFontScale();
  const v = useGoalView();
  const adFree = useAdFree();
  const adReady = useRewardedReady();
  const [busy, setBusy] = useState(false);
  const ref = useTarget('goal');
  const zone = layout.goalLine;
  const trouble = !!v && (v.goal.kind === 'settle' || v.goal.kind === 'apologise' || v.goal.kind === 'ad' || v.scandalLeft !== null);
  const showAd = !!v && v.goal.kind === 'ad' && v.adOk;
  const closed = !!v && v.runUp && trouble && !showAd;
  const button = showAd ? (adFree ? S.hud.takeIt : S.hud.watchAd) : closed ? S.hud.closedRunUp : null;
  const forms = useMemo(() => (v ? goalForms(v) : []), [v]);
  const buttonW = closed ? GOAL_CLOSED_W : GOAL_BUTTON_W;
  const m = useMemo(() => goalForm(zone, fontScale, forms, button, buttonW), [zone, fontScale, forms, button, buttonW]);
  if (!v || !forms.length) return null;
  return (
    <View {...ref} style={[styles.line, { left: zone.x, top: zone.y, width: zone.w, height: zone.h }]} pointerEvents="box-none">
      <View pointerEvents="none" style={[styles.words, { left: GOAL_GUTTER, width: m.room, top: m.top, height: m.box }]}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.text, { fontSize: m.font }, trouble ? styles.trouble : null]}>
          {m.text}
        </Text>
      </View>
      {showAd ? (
        <Pressable
          onPress={async () => {
            if (busy || v.goal.kind !== 'ad') return;
            fx.play('ui_tap');
            setBusy(true);
            await decreeActions.watchAd(v.goal.ad);
            setBusy(false);
          }}
          accessibilityRole="button"
          accessibilityLabel={button ?? ''}
          accessibilityState={{ disabled: busy || (!adFree && !adReady) }}
          hitSlop={slopTo44(GOAL_BUTTON_W, zone.h)}
          style={[styles.button, { width: GOAL_BUTTON_W, height: zone.h, opacity: busy || (!adFree && !adReady) ? 0.55 : 1 }]}
        >
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.buttonText, { fontSize: m.buttonFont }]}>
            {button}
          </Text>
        </Pressable>
      ) : closed ? (
        <View style={[styles.button, styles.closed, { width: GOAL_CLOSED_W, height: zone.h }]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.closedText, { fontSize: m.buttonFont }]}>
            {button}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute' },
  words: { position: 'absolute', justifyContent: 'center' },
  text: { color: DESK.paperLight, textAlign: 'center', fontVariant: ['tabular-nums'] },
  trouble: { color: DESK.brassLight },
  button: { position: 'absolute', right: GOAL_GUTTER, top: 0, borderRadius: 4, backgroundColor: DESK.violet, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: DESK.violetLight },
  buttonText: { color: DESK.paperLight, fontWeight: '800' },
  closed: { backgroundColor: alpha(DESK.slateDeep, 0.85), borderColor: DESK.slateLight },
  closedText: { color: DESK.paperLight, fontWeight: '700' },
});
