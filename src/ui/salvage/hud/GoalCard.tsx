/**
 * The goal card (yard-stage1.md 4.1, 2.10): one 12 pt line under the top bar with its progress at the
 * right; a tap opens three lines (the goal, the next goal, the advice line; 84 pt) that close after 6 s
 * or on a second tap. After the last goal the advice line is the only line. Data from the facade's
 * selectors (`nextGoal`, `advice`); words through ../strings.ts.
 *
 * The meter ("1.20 / 2.50 t") stands at the right with a thin hi-vis bar of its share; a weigh-in's lesson
 * that has no room on the ticket (above font scale 1.15) stands as the second line for six seconds. The
 * card is the hint target `salvage:goal`.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { useTarget } from '../../hints/targets';
import { PAL } from '../palette';
import { useSalvageUi } from '../uiState';
import { GOAL_CHROME, fitText, goalSubPt, lineH, type HudLayout } from './metrics';
import { BarText, Paper } from './Paper';
import { goalValues } from './words';
import { hudAnchors } from './anchors';

/** The open card closes after this long (4.1). */
export const GOAL_OPEN_MS = 6000;

export function GoalCard({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const v = useGame(useShallow((s) => goalValues(cfg, s.game as R.SalvageGame, Date.now())));
  const open = useSalvageUi((s) => s.goalOpen);
  const lesson = useSalvageUi((s) => s.goalLesson);
  const target = useTarget('salvage:goal');
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => useSalvageUi.getState().setGoalOpen(false), GOAL_OPEN_MS);
    return () => clearTimeout(t);
  }, [open]);
  // A ticket's lesson (above font scale 1.15) stands as the second line for six seconds.
  useEffect(() => {
    if (!lesson) return;
    const t = setTimeout(() => useSalvageUi.getState().showGoalLesson(null), GOAL_OPEN_MS);
    return () => clearTimeout(t);
  }, [lesson]);
  const first = v.goal ?? v.advice;
  const s = L.s;
  const h1 = L.rows.goal - 4;
  const w = L.goalW;
  const fit = fitText(first + (v.progress ? `  ${v.progress}` : ''), w - GOAL_CHROME, h1, 12, s);
  const more = lesson ? [lesson.text] : open ? [v.goal ? v.next : null, v.goal ? v.advice : null].filter((x): x is string => !!x) : [];
  const canOpen = !!v.goal && !!(v.next || v.advice);
  // The opened lines (the next goal, the advice line, a lesson) have their own fit, measured as the text
  // check measures inside the card less its indent (owner1-hud: a 48-character lesson and a long advice
  // line were cut at 667 pt): at most the goal line's size, down to 11 pt, two lines rather than cut.
  const sub = goalSubPt(more, fit.pt, L);
  const subPt = sub.pt;
  const lh = lineH(Math.max(fit.pt, subPt));
  const tall = more.length > 0;
  const openH = Math.max(h1, Math.min(84, 8 + lh * (1 + more.length * sub.lines)));
  // Tickets keep clear of the card at its real height (P8, W17).
  const cardH = !first ? 0 : tall ? openH : h1;
  useEffect(() => {
    hudAnchors.setGoal(cardH ? { x: L.left, y: L.goalY + 2, w, h: cardH } : { x: 0, y: 0, w: 0, h: 0 });
  }, [cardH, L.left, L.goalY, w]);
  if (!first) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[first, v.progress, ...more].filter(Boolean).join('. ')}
      onPress={() => useSalvageUi.getState().setGoalOpen(!open && canOpen)}
      style={[styles.abs, { left: L.left, top: L.goalY + 2, width: w, height: tall ? openH : h1 }]}
    >
      <View {...target} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Paper style={StyleSheet.absoluteFill} radius={6} face={styles.face}>
          <View style={[styles.line, { height: h1 - 2 }]}>
            <View style={styles.dot} />
            <BarText pt={fit.pt} weight="700" style={styles.flex}>
              {first}
            </BarText>
            {v.progress ? (
              <BarText pt={fit.pt} weight="800" color={PAL.inkSoft}>
                {v.progress}
              </BarText>
            ) : null}
          </View>
          {v.share !== null ? <View style={[styles.meter, { top: h1 - 5, width: Math.round((w - 4) * v.share) }]} /> : null}
          {more.map((t, i) => (
            <BarText key={i} pt={subPt} lines={sub.lines} weight={lesson ? '700' : i === more.length - 1 && v.advice ? '600' : '500'} color={lesson ? PAL.stamp : PAL.inkSoft} style={styles.sub}>
              {t}
            </BarText>
          ))}
        </Paper>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  face: { paddingHorizontal: 8 },
  line: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PAL.hivis, borderWidth: 1.3, borderColor: PAL.ink, marginRight: 6 },
  flex: { flex: 1 },
  sub: { marginLeft: 14 },
  meter: { position: 'absolute', left: 0, height: 3, backgroundColor: PAL.hivis },
});
