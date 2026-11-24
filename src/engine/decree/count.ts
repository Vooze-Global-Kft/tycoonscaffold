/**
 * Shares, the poll and the count (2.4, 2.10, 2.11, 4.4, D15, D25, D26). Package P1b
 * (docs/design/office-build-plan.md).
 *
 * share_d = Σ_g w_{d,g} × u(m_g) + C_d + Y − R, held between 0 and 100, in hundredths (shown to one
 * decimal); held when ≥ 50.0; the poll is the number held. u is the count's utility (`moodUtility`, the
 * ONE function, from `decree.count`: D25 3m − 60 below 30, m from 30 to 70, D31 70 + (m − 70)/4 above); Y(n) = 2^(n+1) − 2 after n
 * consecutive losses (D15, params.ts `disarray`, the ONE function); the mixes after mix twists and R
 * from params.ts `decreeParams`. Only the count and the poll read u: approval and income use the plain
 * moods. The count is the poll, number for number (H2); districts are announced by |share_d − 50|,
 * largest first (ties in district order), 2.5 s each. D26: Name Recognition counts only districts held
 * without the disarray bonus (`meritOf`). 2.11 with D15 and D25: the worst share is u(0) + Y − R, so a
 * count is a certain win after `certainWinBound` consecutive losses (6 for any pull up to 12).
 *
 * SEAM: what the paper core asks (P1a): size.ts `heldAfter` (the "Poll 3 → 4 of 5" title row for the
 * shown deltas and campaign points), `closeDistricts` (a club chip's flag: the club is strong,
 * w ≥ 0.4, in a district within 3 points of 50) and `shares` (a district chip's "HT 48.6 → 52.6");
 * draw.ts `shares` (`drawCampaignPaper`: a district within 6 points of 50, else the closest).
 */
import { decreeParams, disarray } from './params';
import type { ClubIx, CountResult, DecreeConfig, DecreeContent, DecreeGame, DecreeParams, Poll, PollRow } from './types';

/** A held district: share ≥ 50.0 (5000 hundredths). */
export const HELD_AT = 5000;
/** A club is strong in a district at this weight (2.7 "w ≥ 0.4"). */
export const STRONG_WEIGHT = 0.4;
/** A district is close within this many hundredths of 50 (2.7: "within 3 points"). */
export const CLOSE_WITHIN = 300;

/**
 * The count's utility of a mood (D25 with D31), the ONE function (parameters `decree.count`):
 * huffBelow − huffSlope × (huffBelow − m) below huffBelow (3m − 60 below 30), m up to topAbove,
 * topAbove + topSlope × (m − topAbove) above it (70 + (m − 70)/4 above 70: "won over").
 */
export function moodUtility(c: { huffBelow: number; huffSlope: number; topAbove?: number; topSlope?: number }, m: number): number {
  if (m < c.huffBelow) return c.huffBelow - c.huffSlope * (c.huffBelow - m);
  const top = c.topAbove ?? 100;
  return m > top ? top + (c.topSlope ?? 1) * (m - top) : m;
}

/** The shares of the districts in hundredths for moods `moods`, campaign points `C` and disarray `Y`, with the params' mixes and pull. */
function sharesOf(cfg: DecreeConfig, p: DecreeParams, moods: readonly number[], C: readonly number[], Y: number): number[] {
  const u = moods.map((m) => moodUtility(cfg.decree.count, Math.min(100, Math.max(0, m))));
  return p.mix.map((w, d) => {
    let x = 0;
    for (let gi = 0; gi < w.length; gi++) x += w[gi] * 100 * u[gi];
    x += 100 * ((C[d] ?? 0) + Y - p.rivalPull);
    return Math.min(10000, Math.max(0, Math.round(x)));
  });
}

/** share_d of every district in hundredths, for the current moods (or `moods` and campaign points `C` when given). Built. */
export function shares(cfg: DecreeConfig, g: DecreeGame, over?: { moods?: readonly number[]; C?: readonly number[] }): number[] {
  const p = decreeParams(cfg, g);
  const C = over?.C ?? g.decree.campaign?.C ?? [];
  return sharesOf(cfg, p, over?.moods ?? g.decree.moods, C, p.disarray);
}

/** The shares as they would stand without the disarray bonus (D26: the districts held on merit). Built. */
export function meritShares(cfg: DecreeConfig, g: DecreeGame): number[] {
  const p = decreeParams(cfg, g);
  return sharesOf(cfg, p, g.decree.moods, g.decree.campaign?.C ?? [], 0);
}

/** Districts held after `moodDeltas` (per club) and `points` (per district) were applied: the strip's poll row. Built. */
export function heldAfter(cfg: DecreeConfig, g: DecreeGame, moodDeltas: readonly number[], points: readonly number[]): number {
  const C0 = g.decree.campaign?.C ?? [];
  const n = cfg.decree.offices[g.decree.office].districts.length;
  const C = Array.from({ length: n }, (_, d) => (C0[d] ?? 0) + (points[d] ?? 0));
  const moods = g.decree.moods.map((m, gi) => m + (moodDeltas[gi] ?? 0));
  return shares(cfg, g, { moods, C }).filter((s) => s >= HELD_AT).length;
}

/** Clubs strong (w ≥ 0.4) in a district within 3 points of 50: their chips carry a flag (2.7). Built. */
export function closeDistricts(cfg: DecreeConfig, g: DecreeGame): { district: number; clubs: ClubIx[] }[] {
  const p = decreeParams(cfg, g);
  const sh = sharesOf(cfg, p, g.decree.moods, g.decree.campaign?.C ?? [], p.disarray);
  const out: { district: number; clubs: ClubIx[] }[] = [];
  sh.forEach((s, d) => {
    if (Math.abs(s - HELD_AT) > CLOSE_WITHIN) return;
    const clubs = p.mix[d].map((w, gi) => (w >= STRONG_WEIGHT - 1e-9 ? gi : -1)).filter((gi) => gi >= 0);
    if (clubs.length) out.push({ district: d, clubs });
  });
  return out;
}

/** The current rival of the seat (2.10: the same rival returns after a win; the next stands after a loss). */
export function currentRival(cfg: DecreeConfig, g: DecreeGame): { id: string; name: string } {
  const rivals = cfg.decree.offices[g.decree.office].rivals;
  const r = rivals[(g.decree.rivalIndex[g.decree.office] ?? 0) % rivals.length];
  return { id: r.id, name: r.name };
}

/** The call day C of the current office (2.2: "from 60 % of it", C = the first whole day ≥ callFraction × D; slips.ts `callFrom` reads it for the run-up's reserve). */
export function callDay(cfg: DecreeConfig, g: DecreeGame): number {
  return callDayOf(cfg.decree.offices[g.decree.office]);
}

/** C of one office row (the lint reads it too). */
export function callDayOf(row: { callFraction: number; termDays: number }): number {
  return Math.ceil(row.callFraction * row.termDays - 1e-9);
}

/** The poll board's rows (4.4), exactly as the count would hold them today, with D25's huffs. Built. */
export function poll(cfg: DecreeConfig, g: DecreeGame): Poll {
  const d = g.decree;
  const row = cfg.decree.offices[d.office];
  const p = decreeParams(cfg, g);
  const sh = sharesOf(cfg, p, d.moods, d.campaign?.C ?? [], p.disarray);
  const c = cfg.decree.count;
  const rows: PollRow[] = row.districts.map((dist, k) => ({
    district: k,
    name: dist.name,
    short: dist.short,
    share: sh[k],
    held: sh[k] >= HELD_AT,
    strong: p.mix[k].map((w, gi) => (w >= STRONG_WEIGHT - 1e-9 ? gi : -1)).filter((gi) => gi >= 0),
    campaign: d.campaign?.C[k] ?? 0,
    // D25: what a club below huffBelow costs this district (u(m) − m, weighted), in hundredths.
    huffs: d.moods.flatMap((m, gi) => (m < c.huffBelow ? [{ club: gi, cost: Math.round(p.mix[k][gi] * 100 * (moodUtility(c, m) - m)) }] : [])),
    // D31: what a won-over club's mood above topAbove does not count in this district (u(m) − m, weighted), in hundredths.
    wonOver: d.moods.flatMap((m, gi) => (m > c.topAbove ? [{ club: gi, cost: Math.round(p.mix[k][gi] * 100 * (moodUtility(c, m) - m)) }] : [])),
  }));
  const held = rows.filter((r) => r.held).length;
  const C = callDay(cfg, g);
  return {
    rows,
    held,
    majority: row.majority,
    of: rows.length,
    rivalPull: p.rivalPull,
    disarray: p.disarray,
    rival: currentRival(cfg, g).name,
    canCall: d.phase === 'governing' && d.day >= C,
    callFrom: C,
    huffing: d.moods.flatMap((m, gi) => (m >= cfg.decree.boycott.below && m < c.huffBelow ? [gi] : [])),
    wonOver: d.moods.flatMap((m, gi) => (m > c.topAbove ? [gi] : [])),
  };
}

/** The announcement order of 2.10: by |share − 50| largest first, ties in district order. */
export function announcementOrder(sh: readonly number[]): number[] {
  return sh
    .map((s, d) => ({ d, gap: Math.abs(s - HELD_AT) }))
    .sort((a, b) => b.gap - a.gap || a.d - b.d)
    .map((x) => x.d);
}

/** The count of 2.10: the poll, number for number, with the announcement order. Built. */
export function count(cfg: DecreeConfig, g: DecreeGame): CountResult {
  const row = cfg.decree.offices[g.decree.office];
  const sh = shares(cfg, g);
  const districts = sh.map((share, district) => ({ district, share, held: share >= HELD_AT }));
  const held = districts.filter((x) => x.held).length;
  return { districts, order: announcementOrder(sh), held, majority: row.majority, won: held >= row.majority, sweep: held === districts.length, rival: currentRival(cfg, g).id };
}

/** D26: the districts held without the disarray bonus, whether that is a sweep, and the districts carried only by disarray. Built. */
export function meritOf(cfg: DecreeConfig, g: DecreeGame): { held: number; sweep: boolean; carried: number[] } {
  const all = shares(cfg, g);
  const merit = meritShares(cfg, g);
  const heldMerit = merit.filter((s) => s >= HELD_AT).length;
  const carried = all.map((s, d) => (s >= HELD_AT && merit[d] < HELD_AT ? d : -1)).filter((d) => d >= 0);
  return { held: heldMerit, sweep: heldMerit === merit.length, carried };
}

/**
 * 2.11 with D15 and D25, computed from the numbers: the fewest consecutive losses n after which every
 * district of office `office` is held whatever the moods and campaign points (u(0) + Y(n) − R ≥ 50, as
 * Σ_g w = 1, C ≥ 0 and u rises with m), or Infinity when no n up to 60 does it. The validator fails
 * above `ladder.maxLossesBound`. Built.
 */
export function certainWinBound(d: Pick<DecreeContent, 'offices' | 'count'> & { paperRules?: DecreeContent['paperRules'] }, office: number): number {
  const R = d.offices[office]?.rivalPull ?? 0;
  const worst = moodUtility(d.count, 0);
  for (let n = 0; n <= 60; n++) if (worst + disarray(n, d.paperRules?.disarray) - R >= 50) return n;
  return Infinity;
}
