/**
 * The away report's words (spec 2.9, decision M8), pure: from the rules' report (`AwayReport`,
 * src/engine/merge/types.ts) and the store's offline record (its `earnings`, the amount the store
 * pays; two reports of one absence are already one, merged by the rules' `mergeAwayReports`):
 *
 *   "While you were away (3 h 10 m): Old Brindle and Pim sold 1,520 house goods, +18.2K.
 *    Your gear filled its shelves."
 *
 * - the report alone ("your gear filled its shelves") when no minder sold anything but shelves filled;
 * - null (no sheet at all) when the rules call the absence empty: nothing sold, nothing shelved.
 * Every amount through roundCoins and the project's short format (sheets/views.ts `coins`); names of
 * minders from game.json (the config). Owned by the hints and platform package.
 */
import * as R from '../../../engine/merge';
import { S } from '../strings';
import { coins } from './views';

/** The store's offline record (src/state/store.ts `offline`). */
export interface OfflineRecord {
  seconds: number;
  earnings: number;
  report?: unknown;
}

export interface AwayView {
  /** The sentences of the report, in order. */
  lines: string[];
  /** The coins to collect, as printed ("18.2K"), or null when there are none (the shelves alone). */
  amount: string | null;
  /** The amount with the ad (× the rules' multiplier), as printed; null with no coins. */
  withAd: string | null;
  /** The ad's share in whole percent (decision M8: 50). */
  adPercent: number;
  /** The chain whose minder sold the most (its portrait on the report), or null (the shelves alone). */
  lead: number | null;
}

/** A count with thousands separators ("1,520"): figures as figures (7.3). */
export function groupDigits(n: number): string {
  const s = String(Math.max(0, Math.round(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "3 h 10 m", "42 m", "40 s" (whole units, rounded down). */
export function awayDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return S.hints.away.hours(h, m);
  if (m > 0) return S.hints.away.minutes(m);
  return S.hints.away.seconds(s);
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return S.hints.away.and(names.slice(0, -1).join(S.hints.away.comma), names[names.length - 1]);
}

/**
 * The rules' report, or something else: a report still waiting when the app was closed comes back
 * from the save (src/state/store.ts), and a save is untrusted. Lists whose entries are not objects
 * are no report: the sheet then keeps to the record's own time and coins and never breaks.
 */
function isReport(x: unknown): x is R.AwayReport {
  const r = x as R.AwayReport | null;
  const rows = (list: unknown) => Array.isArray(list) && list.every((row) => !!row && typeof row === 'object');
  return !!r && typeof r === 'object' && rows(r.sales) && rows(r.shelved) && typeof r.seconds === 'number';
}

/** The away cap in whole hours or minutes, as printed. */
function capText(seconds: number): string {
  return awayDuration(seconds);
}

/**
 * What the away report shows for the store's offline record, or null for an absence the rules call
 * empty (no sale, no shelf good). `adMultiplier` is the rules' (EngineMode.offlineAdMultiplier, 1.5).
 */
export function awayView(cfg: R.MergeConfig, offline: OfflineRecord, adMultiplier: number, awayCap: number | null): AwayView | null {
  const report = isReport(offline.report) ? offline.report : null;
  const goods = report ? report.sales.reduce((a, s) => a + s.goods, 0) : 0;
  const shelved = report ? report.shelved.reduce((a, s) => a + s.goods, 0) : 0;
  const earned = R.roundCoins(cfg, offline.earnings);
  if (earned <= 0 && shelved <= 0) return null;
  const time = awayDuration(report ? report.seconds : offline.seconds);
  const lines: string[] = [];
  const amount = earned > 0 ? coins(cfg, offline.earnings) : null;
  if (earned > 0) {
    const names = report ? report.sales.filter((s) => s.goods > 0).map((s) => cfg.merge.chains[s.c]?.minder.name ?? '') : [];
    lines.push(S.hints.away.sold(time, joinNames(names.filter(Boolean)), groupDigits(goods), goods === 1, amount ?? ''));
    if (shelved > 0) lines.push(S.hints.away.shelves);
  } else {
    lines.push(S.hints.away.alone(time));
  }
  if (report && awayCap !== null && report.effective < report.seconds - 1) lines.push(S.hints.away.capped(capText(awayCap)));
  const mult = Number.isFinite(adMultiplier) && adMultiplier > 1 ? adMultiplier : 1;
  return {
    lines,
    amount,
    withAd: earned > 0 && mult > 1 ? coins(cfg, offline.earnings * mult) : null,
    adPercent: Math.round((mult - 1) * 100),
    lead: report && report.sales.length ? [...report.sales].sort((a, b) => b.coins - a.coins)[0].c : null,
  };
}
