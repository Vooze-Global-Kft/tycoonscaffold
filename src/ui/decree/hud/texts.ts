/**
 * The bars' words from the rules' values (pure; the screens and metrics.test.ts share them):
 * - `ribbonTexts`: the term ribbon's two fixed forms (4.1), its button from the call day (2.10), its
 *   run-up and election-night forms;
 * - `goalForms`: the goal line's forms for the rules' goal (2.16), longest first, each with the
 *   price and "about …" the rules give (metrics.ts `goalForm` picks the first that fits 34 characters).
 * Every number here is one the rules returned; the words are strings.ts's. Owned by the bars package (BARS).
 */
import type * as R from '../../../engine/decree';
import { S, aboutText, dibs } from '../strings';

export interface RibbonValues {
  acting: boolean;
  title: string;
  phase: R.Phase;
  day: number;
  termDays: number;
  nr: number;
  nrTarget: number | null;
  record: number;
  recordTarget: number | null;
  canCall: boolean;
  poll: { held: number; of: number };
}

export interface RibbonTexts {
  /** 'term': the long or short form; 'call': the button; 'runUp' and 'night': one fixed text. */
  kind: 'term' | 'call' | 'runUp' | 'night';
  long: string;
  short: string;
  /** The record for the Poll button's badge when the short form shows ("Lv 52/80"). */
  badge: string | null;
}

export function ribbonTexts(v: RibbonValues): RibbonTexts {
  const j = S.hud.ribbonJoin;
  if (v.phase === 'count' || v.phase === 'result') return { kind: 'night', long: S.hud.ribbonNight, short: S.hud.ribbonNight, badge: null };
  if (v.phase === 'campaign') {
    const t = S.hud.ribbonRunUp(v.poll.held, v.poll.of);
    return { kind: 'runUp', long: t, short: t, badge: null };
  }
  if (v.canCall) {
    const t = S.hud.ribbonCall(v.poll.held, v.poll.of);
    return { kind: 'call', long: t, short: t, badge: null };
  }
  const title = v.acting ? S.hud.acting(v.title) : v.title;
  const day = S.hud.ribbonDay(v.day, v.termDays);
  const nr = S.hud.ribbonNr(v.nr, v.nrTarget);
  const lv = S.hud.ribbonLv(v.record, v.recordTarget);
  // The record matters only while the next office needs it; at the top it is left out.
  const long = [title, day, nr, ...(v.recordTarget !== null ? [lv] : [])].join(j);
  const short = [day, nr].join(j);
  return { kind: 'term', long, short, badge: v.recordTarget !== null ? S.hud.pollBadge(v.record, v.recordTarget) : null };
}

export interface GoalValues {
  goal: R.Goal;
  name: string | null;
  club: string | null;
  papersLeft: number | null;
  /** The papers "Say nothing" still runs, or null. */
  scandalLeft: number | null;
}

/** The goal line's forms, longest first (2.16): words · price · about, then shorter. Empty for no goal. */
export function goalForms(v: GoalValues): string[] {
  const j = S.hud.goalJoin;
  const g = v.goal;
  switch (g.kind) {
    case 'purchase': {
      const words = g.purchase.type === 'monument' ? S.hud.goalMonument : g.purchase.type === 'open' ? S.hud.goalOpen(v.name ?? '') : S.hud.goalLevel(v.name ?? '');
      const price = dibs(g.price);
      const out: string[] = [];
      if (g.about && g.about.value > 0 && Number.isFinite(g.about.value)) out.push([words, price, aboutText(g.about)].join(j));
      out.push([words, price].join(j));
      // A long ministry name: the name and the price, then the name alone (34 characters, 2.16).
      if (g.purchase.type === 'level' && v.name) out.push([v.name, price].join(j));
      out.push(words);
      return out;
    }
    case 'call':
      return [S.hud.goalCall(g.held, g.of), S.hud.goalCallShort(g.held, g.of)];
    case 'settle':
      return [...(v.papersLeft !== null ? [S.hud.goalSettle(v.club ?? '', v.papersLeft)] : []), S.hud.goalSettleShort];
    case 'apologise':
      return [S.hud.goalApologise];
    case 'ad':
      // The free exit in words, the ad as the line's button (2.16).
      if (g.ad === 'courier') return [...(v.papersLeft !== null ? [S.hud.goalSettle(v.club ?? '', v.papersLeft)] : []), S.hud.goalCourier];
      if (g.ad === 'spinDoctor') return [...(v.scandalLeft !== null ? [S.hud.goalSayNothing(v.scandalLeft)] : []), S.hud.goalSpin];
      return [];
    case 'none':
      return [S.hud.goalNone];
  }
}
