/**
 * The goal card (yard-stage1.md 4.1, 2.10): one 12 pt line under the top bar with its progress at the
 * right; a tap opens three lines (the goal, the next goal, the advice line; 84 pt) that close after 6 s
 * or on a second tap. After the last goal the advice line is the only line. Data from the facade's
 * selectors (`nextGoal`, `advice`); words through ../strings.ts.
 *
 * STAND-IN: "next" is read from the content's goal list (the goal after the current one) until the
 * rules give a selector for it (requests.md); the stub's `advice` is null, so the third line is absent.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { PAL } from '../palette';
import { useSalvageUi } from '../uiState';
import { fitText, lineH, type HudLayout } from './metrics';
import { BarText, Paper } from './Paper';
import { goalValues } from './words';

/** The open card closes after this long (4.1). */
export const GOAL_OPEN_MS = 6000;

export function GoalCard({ cfg, L }: { cfg: R.SalvageConfig; L: HudLayout }) {
  const v = useGame(useShallow((s) => goalValues(cfg, s.game as R.SalvageGame, Date.now())));
  const open = useSalvageUi((s) => s.goalOpen);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => useSalvageUi.getState().setGoalOpen(false), GOAL_OPEN_MS);
    return () => clearTimeout(t);
  }, [open]);
  const first = v.goal ?? v.advice;
  if (!first) return null;
  const s = L.s;
  const h1 = L.rows.goal - 4;
  const w = L.goalW;
  const fit = fitText(first + (v.progress ? `  ${v.progress}` : ''), w - 28, h1, 12, s);
  const more = [v.goal ? v.next : null, v.goal ? v.advice : null].filter((x): x is string => !!x);
  const lh = lineH(fit.pt);
  const openH = Math.max(h1, Math.min(84, 8 + lh * (1 + more.length)));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[first, ...more].join('. ')}
      onPress={() => useSalvageUi.getState().setGoalOpen(!open && more.length > 0)}
      style={[styles.abs, { left: L.left, top: L.goalY + 2, width: w, height: open ? openH : h1 }]}
    >
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
        {open
          ? more.map((t, i) => (
              <BarText key={i} pt={fit.pt} weight={i === more.length - 1 && v.advice ? '600' : '500'} color={PAL.inkSoft} style={styles.sub}>
                {t}
              </BarText>
            ))
          : null}
      </Paper>
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
});
