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
import type { GradeId, Piece } from './types';

/** The grade a piece weighs in at now. Stub: its own. */
export function assayGrade(x: Ctx, piece: Piece): GradeId {
  void x;
  return piece.grade;
}
