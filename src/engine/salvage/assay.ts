/**
 * THE ANALYSER (stage 2, docs/design/yard-stage2.md 2.5.2): with the analyser owned and commissioned, a
 * piece weighs in at its spec's assay grade (`[grade, g, n, sprite, assay]`), whatever its age, and its
 * weigh-in line carries the note `analysed`. Owner: rules-works (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no analyser, so every piece weighs in at its own grade. The
 * loop does not call this yet: the weigh-in is scales.ts's (the call goes where a weigh-in line's grade is
 * chosen; scales.ts's owner writes it).
 */
import type { Ctx } from './clock';
import type { GradeId, Piece } from './types';

/** The grade a piece weighs in at now. Stub: its own. */
export function assayGrade(x: Ctx, piece: Piece): GradeId {
  void x;
  return piece.grade;
}
