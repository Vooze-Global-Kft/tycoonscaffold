/**
 * Shares, the poll and the count (2.4, 2.10, 2.11, 4.4). Package P1b (docs/design/office-build-plan.md).
 *
 * share_d = min(100, max(0, Σ_g w_{d,g} × m_g + C_d + Y − R)), Y(n) = 2^(n+1) − 2 after n consecutive
 * losses (D15, params.ts `disarray`; the mixes after mix twists from params.ts `decreeParams`), in
 * hundredths, shown to one decimal; held when ≥ 50.0; the poll is the number held. The count is the
 * poll, number for number (H2); districts are announced by |share_d − 50|, largest first, 2.5 s each.
 * After at most 5 consecutive losses at any seat the next count is a certain win (2.11 with D15; the
 * validator checks 2^(n+1) − 2 − R ≥ 50 at n = 5).
 *
 * SEAM: what the paper core asks (P1a): size.ts `heldAfter` (the "Poll 3 → 4 of 5" title row for the
 * shown deltas and campaign points), `closeDistricts` (a club chip's flag: the club is strong,
 * w ≥ 0.4, in a district within 3 points of 50) and `shares` (a district chip's "HT 48.6 → 52.6");
 * draw.ts `shares` (`drawCampaignPaper`: a district within 6 points of 50, else the closest).
 */
import { notBuilt } from './notBuilt';
import type { ClubIx, CountResult, DecreeConfig, DecreeGame, Poll } from './types';

/** share_d of every district in hundredths, for the current moods (or `moods` and campaign points `C` when given). Skeleton: throws notBuilt. */
export function shares(cfg: DecreeConfig, g: DecreeGame, over?: { moods?: readonly number[]; C?: readonly number[] }): number[] {
  return notBuilt('shares');
}

/** Districts held after `moodDeltas` (per club) and `points` (per district) were applied: the strip's poll row. Skeleton: throws notBuilt. */
export function heldAfter(cfg: DecreeConfig, g: DecreeGame, moodDeltas: readonly number[], points: readonly number[]): number {
  return notBuilt('heldAfter');
}

/** Clubs strong (w ≥ 0.4) in a district within 3 points of 50: their chips carry a flag (2.7). Skeleton: throws notBuilt. */
export function closeDistricts(cfg: DecreeConfig, g: DecreeGame): { district: number; clubs: ClubIx[] }[] {
  return notBuilt('closeDistricts');
}

/** The poll board's rows (4.4), exactly as the count would hold them today. Skeleton: throws notBuilt. */
export function poll(cfg: DecreeConfig, g: DecreeGame): Poll {
  return notBuilt('poll');
}

/** The count of 2.10: the poll, number for number, with the announcement order. Skeleton: throws notBuilt. */
export function count(cfg: DecreeConfig, g: DecreeGame): CountResult {
  return notBuilt('count');
}
