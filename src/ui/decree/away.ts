/**
 * The away report's words and figures (spec 2.15, 5.11), pure: what ./sheets/AwayReport.tsx shows
 * for the shared store's `offline` record, from the rules' own report (`decreeOffline`) and the
 * engine's ad multiplier. Every figure is the rules': the earnings (already in the treasury when the
 * report opens: `paysOnCompute`), the ad's extra (earnings × (multiplier − 1) through roundDibs, the
 * same sum the store grants), the cap (the rules' `awayCap`). No number of our own.
 * Owned by the hints and platform package (PLATFORM).
 */
import * as R from '../../engine/decree';
import { dibs, S } from './strings';

/** The shared store's away record (src/state/store.ts `offline`). */
export interface OfflineRecord {
  seconds: number;
  earnings: number;
  report?: unknown;
}

export interface AwayView {
  /** The report's sentences: what was collected and how many wait. */
  lines: string[];
  /** The deck's away line (writer 5), or null. */
  quip: string | null;
  /** The amount collected (already in the treasury), as printed; null when nothing was earned. */
  amount: string | null;
  /** The cap's sentence when the absence was longer than the cap. */
  capped: string | null;
  /** The ad's offer: its percent and the extra it grants (as printed), or 'closed' from the call to the end of election night, or null (nothing to add). */
  ad: { pct: number; extra: string } | 'closed' | null;
}

const isReport = (x: unknown): x is R.AwayReport => !!x && typeof x === 'object' && typeof (x as R.AwayReport).seconds === 'number' && typeof (x as R.AwayReport).earnings === 'number';

/** Hours as the report prints them ("4 h", "6 h", "4.5 h"). */
function hoursText(seconds: number): string {
  const h = seconds / 3600;
  return `${Number.isInteger(h) ? h : Math.round(h * 10) / 10} h`;
}

/**
 * What the report shows, or null for an absence the rules call empty (nothing earned and no visitor
 * arrived: the sheet shows nothing and the record is cleared silently). `mult` is the engine's
 * `offlineAdMultiplier`; `adAllowed` the rules' canWatchAd(…, 'awayBonus') now.
 */
export function awayView(cfg: R.DecreeConfig, g: R.DecreeGame, offline: OfflineRecord, mult: number, adAllowed: boolean): AwayView | null {
  const report = isReport(offline.report) ? offline.report : null;
  const earned = offline.earnings > 0 ? offline.earnings : 0;
  const arrived = report?.arrived ?? 0;
  if (earned <= 0 && arrived <= 0) return null;
  const seconds = report?.seconds ?? offline.seconds;
  const duration = S.platform.away.duration(seconds);
  const amount = earned > 0 ? dibs(R.roundDibs(cfg, earned)) : null;
  const lines = [amount ? S.platform.away.collected(duration, amount) : S.platform.away.nothingCollected(duration)];
  const waiting = report?.waiting ?? 0;
  if (waiting > 0) lines.push(S.platform.away.waiting(waiting));
  let capped: string | null = null;
  if (report?.capped) {
    try {
      capped = S.platform.away.capped(hoursText(R.awayCap(cfg, g)));
    } catch {
      capped = null;
    }
  }
  let ad: AwayView['ad'] = null;
  if (earned > 0 && mult > 1) {
    if (adAllowed) {
      const extra = R.roundDibs(cfg, earned * (mult - 1));
      ad = extra > 0 ? { pct: Math.round((mult - 1) * 100), extra: dibs(extra) } : null;
    } else if (g.decree && g.decree.phase !== 'governing') ad = 'closed';
  }
  return { lines, quip: report?.line ?? null, amount, capped, ad };
}
