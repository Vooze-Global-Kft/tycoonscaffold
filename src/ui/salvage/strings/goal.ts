/**
 * Words of the GOAL family (PLAN2 2.2; the goal card, the advice and the clipboard at the works, s2c-plan-cards 1.5 G1 to G4,
 * critic m4). Owner from wave 1: CRD-GOAL. Spread into TEXT by ../strings.ts; keys in textKeys.ts `TEXT_KEYS.famGoal`;
 * rooms in ../rooms/goal.ts (the goal card's real room, moved here from check.ts's GOAL_W). The goals (goal.*) and the
 * advice line (advice.*) stay in strings.ts.
 */
export const GOAL = {
  'clip.goalsWorks': 'At the works', // the clipboard's head over the stage's goals
  'table.rungWaits': 'Waits for {grade}', // the industry table's rung tile: the material a rung waits for (AdviceWait), its first grade
} as const;
