/**
 * THE ANALYSER (stage 2, docs/design/yard-stage2.md 2.5.2): with the analyser owned and commissioned, a
 * piece weighs in at its spec's assay grade (`[grade, g, n, sprite, assay]`), whatever its age, and its
 * weigh-in line carries the note `analysed`. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no analyser, so every piece weighs in at its own grade. Called
 * by scales.ts weighIn for each piece before its lines are made (s2a-fix); the line's `note: 'analysed'` and
 * the `analysed` event are rules-works' (scales.ts is rules-works' in Phase B).
 */
import type { Ctx } from './clock';
import { assayOf } from './content';
import type { GradeId, Piece } from './types';

// THE RULE AS BUILT (rules-works, wave 1): a plate of kind 'assay' (the analyser) that is RUNNING (commissioned)
// gives every piece weighed in on the platform the assay grade of its spec, found in the content by (grade, spec
// index, grams) where every object with that key agrees (content.ts assayOf; on the shipped content the washer's
// drum, the sink and the bronze valve), whatever the piece's age: a piece cut before the analyser came is
// assayed at its weigh-in too (B16). A whole thing, a tray's grams and a piece of no assay keep their grade.
// scales.ts marks the line "Analysed", emits `analysed` and counts `analysed:<grade>`.

/** Is an analyser running (a commissioned plate of kind 'assay')? No allocation. */
export function analyserOn(x: Ctx): boolean {
  const ws = x.s.works;
  for (const id in ws) if (ws[id].phase === 'running' && x.c.works?.plates[id]?.kind === 'assay') return true;
  return false;
}

/** The grade a piece weighs in at now: its spec's assay grade with the analyser running, else its own. */
export function assayGrade(x: Ctx, piece: Piece): GradeId {
  if (!analyserOn(x)) return piece.grade;
  return assayOf(x.c, piece) ?? piece.grade;
}
