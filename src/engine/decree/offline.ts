/**
 * Time away as a closed form (2.15, `EngineMode.offline`). Package P1b (docs/design/office-build-plan.md).
 *
 * t = (now − max(lastSavedAt, stats.clockHigh))/1000, t′ = min(t, cap) (4 h, +4 h with Long Lunch).
 * I_away = a × (I with the boycott and "Say nothing" factors frozen as they stand). earnings =
 * roundDibs(I_away × t′), PAID WHEN COMPUTED (the store's `paysOnCompute` seam). Papers:
 * n = min(free places, floor((t′ + awayCarry)/360)), drawn in order on return with the unchanged state
 * (draw.ts `fillTray`), none during a run-up; nextArrivalAt re-phased within one τ. Unchanged while
 * away: moods, gossip, every counter, the day, the poll, cooldowns; a pending take-back was committed
 * when the app went to the background. Every absence, however short, follows these rules
 * (`catchUpSeconds: 0`). Cross-check (10.2): event stepping equals the form at 30 s, 299 s, 301 s, 4 h.
 *
 * SEAM, what it calls of P1a: decide.ts `commitPending` (a take-back left pending in a killed app
 * commits first), draw.ts `fillTray` (the away papers), params.ts `decreeParams`. The store pays
 * `earnings` itself (src/state/store.ts grantCash, the `paysOnCompute` seam), never commitCash.
 */
import { notBuilt } from './notBuilt';
import { decreeParams } from './params';
import type { AwayReport, DecreeConfig, DecreeGame } from './types';

/** The away rules for an absence ending at wall time `now`. Skeleton: returns zero (nothing earned, the state unchanged, no report). */
export function decreeOffline(cfg: DecreeConfig, g: DecreeGame, now: number): { seconds: number; earnings: number; game: DecreeGame; report: AwayReport | null } {
  return { seconds: 0, earnings: 0, game: g, report: null };
}

/** I_away (EngineMode.income): a × I with the boycott and "Say nothing" factors as they stand. Built. */
export function decreeIncome(cfg: DecreeConfig, g: DecreeGame): number {
  return cfg.decree.away.rate * decreeParams(cfg, g).I;
}

/** I (EngineMode.activeIncome). Built. */
export function decreeActiveIncome(cfg: DecreeConfig, g: DecreeGame): number {
  return decreeParams(cfg, g).I;
}

/** Two reports of one absence as one (a resume while the report is still open: seconds and earnings add, waiting is the newer). Skeleton: throws notBuilt. */
export function mergeAwayReports(older: unknown, newer: unknown): unknown {
  return notBuilt('mergeAwayReports');
}

/** Whether a report that earned nothing is still worth showing (visitors arrived). Skeleton: throws notBuilt. */
export function awayReportAlone(report: unknown): boolean {
  return notBuilt('awayReportAlone');
}
