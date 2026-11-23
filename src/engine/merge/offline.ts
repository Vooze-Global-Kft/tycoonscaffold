/**
 * Time away as a closed form (spec 2.9): minders' sales and the gears' shelves over t′, the away
 * report (Decision M8: the mode's own sheet), the income readings.
 *
 * Package MECHANICS (docs/design/market-build-plan.md).
 *
 * Skeleton bodies: `mergeOffline` returns zero (no seconds, no earnings, the game unchanged, no
 * report); `mergeIncome` and `mergeActiveIncome` return 0; `awayReportAlone` returns false;
 * `mergeAwayReports` keeps the newer report.
 */
import type { AwayReport, MergeConfig, MergeGame } from './types';

/**
 * EngineMode.offline: t = (now − max(lastSavedAt, stats.clockHigh)) / 1000, t′ = min(t, cap); the
 * earnings to grant (not added to cash: the store grants them, × 1.5 with the ad), the game with
 * the minders' and gears' clocks re-phased and the shelves filled, and the report. Skeleton: zero.
 */
export function mergeOffline(cfg: MergeConfig, g: MergeGame, now: number): { seconds: number; earnings: number; game: MergeGame; report?: AwayReport } {
  void cfg;
  void now;
  return { seconds: 0, earnings: 0, game: g };
}

/** income(): the minder rate, coins per s (2.9). Skeleton: 0. */
export function mergeIncome(cfg: MergeConfig, g: MergeGame): number {
  void cfg;
  void g;
  return 0;
}

/** activeIncome(): the `recent` ticket rate plus the minder rate (2.9). Skeleton: 0. */
export function mergeActiveIncome(cfg: MergeConfig, g: MergeGame): number {
  void cfg;
  void g;
  return 0;
}

/** EngineMode.reportAlone: true when shelves were filled with no minder hired (2.9). Skeleton: false. */
export function awayReportAlone(report: unknown): boolean {
  void report;
  return false;
}

/** EngineMode.mergeReport: two reports of one absence as one. Skeleton: the newer one. */
export function mergeAwayReports(older: unknown, newer: unknown): unknown {
  return newer ?? older;
}
