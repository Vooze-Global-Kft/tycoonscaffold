/**
 * Advice and the goal line (2.16). Package P1b (docs/design/office-build-plan.md).
 *
 * `advice(cfg, g)` (pure) picks one goal for the bot, the slip and the goal line:
 * score = max(0, cost − cash + reserve)/I + cost/Δincome over levels, openings and the monument
 * (Δincome of the monument advice.deltaShare × I = 0.02 × I; of a level or an opening what it adds to
 * I, params.ts `levelGain` / `openGain`); while the record is short (the next office's record not met),
 * a level's score is divided by advice.recordDivisor (1.5). Lowest score wins; ties in the order levels,
 * openings, the monument, by ministry. It also offers the call when the reader would call (8.2, D17:
 * the first allowed day on which the poll shows a majority), and during a boycott or scandal the ad
 * (when it may be offered) or the free exit. Nothing already bought, capped or closed for good is a
 * candidate. The goal line shows words (strings), price and "about 20 s / 2 min / 1 h" (`about`), none
 * at I = 0.
 *
 * The reserve (2.6, D16) is slips.ts `reserve` (the desk, the run-up); a slip on an empty desk with an
 * empty tray also keeps back desk.slipReserveSeconds of B (D16): `slipReserve`.
 *
 * SEAM: slips.ts (P1a) takes `advice(...).slip`; size.ts (P1a) takes `about` for the strip's
 * "Short by 240 · about 9 s"; it reads params.ts (P1a) prices and gains and slips.ts `reserve`;
 * tick.ts reads `slipNeed` (when a slip becomes possible) and grants.ts `standingOrderPick`.
 */
import { decreeParams, levelCost, levelGain, openCost, openGain, roundDibs, vanityPrice } from './params';
import { costOf } from './size';
import { standIn } from './notBuilt';
import { reserve } from './slips';
import { canWatchAd } from './grants';
import { canCall } from './term';
import { poll } from './count';
import type { About, AdviceResult, DecreeConfig, DecreeGame, DecreeParams, Goal, Purchase, Slip } from './types';

/** One thing money can buy now (a level, an opening, this term's monument), with its price and what it adds to I. */
export interface Candidate {
  purchase: Purchase;
  price: number;
  /** What it adds to I (dibs per second). */
  gain: number;
  /** The level it starts from (0 for an opening and a monument). */
  level: number;
}

/** The reserve of 2.6 and D16 ("Kept for the desk" and "Kept for the run-up"), from slips.ts; while that is not built, the desk paper's sign cost. */
export function reserveNow(cfg: DecreeConfig, g: DecreeGame): number {
  return standIn(
    reserve,
    () => reserve(cfg, g),
    () => (g.decree.desk?.type === 'paper' ? costOf(g.decree.desk.shown.sign) : 0),
  );
}

/** What a slip keeps back (D16): the reserve, plus desk.slipReserveSeconds of B when the desk and the tray are empty. */
export function slipReserve(cfg: DecreeConfig, g: DecreeGame, p: DecreeParams = decreeParams(cfg, g)): number {
  const d = g.decree;
  const empty = !d.desk && !d.tray.length && !d.pending;
  return reserveNow(cfg, g) + (empty ? roundDibs(cfg, cfg.decree.desk.slipReserveSeconds * p.B) : 0);
}

/** Every purchase possible now, in the order levels, openings, the monument (by ministry). Built. */
export function candidates(cfg: DecreeConfig, g: DecreeGame, p: DecreeParams = decreeParams(cfg, g)): Candidate[] {
  const d = g.decree;
  const out: Candidate[] = [];
  d.ministries.forEach((m, i) => {
    if (!m.open) return;
    const price = levelCost(cfg, g, i);
    const gain = levelGain(cfg, g, i, p);
    if (Number.isFinite(price) && gain > 0) out.push({ purchase: { type: 'level', ministry: i }, price, gain, level: m.level });
  });
  d.ministries.forEach((m, i) => {
    if (m.open) return;
    const price = openCost(cfg, g, i);
    const gain = openGain(cfg, g, i, p);
    if (Number.isFinite(price) && gain > 0) out.push({ purchase: { type: 'open', ministry: i }, price, gain, level: 0 });
  });
  if (d.monumentOffer && !d.vanity.includes(d.monumentOffer)) {
    const price = vanityPrice(cfg, g);
    const gain = cfg.decree.advice.deltaShare * p.I;
    if (Number.isFinite(price) && gain > 0) out.push({ purchase: { type: 'monument', monument: d.monumentOffer }, price, gain, level: 0 });
  }
  return out;
}

/** Whether the record the next office needs is still short (2.16's record weighting). */
export function recordShort(cfg: DecreeConfig, g: DecreeGame, p: DecreeParams = decreeParams(cfg, g)): boolean {
  const next = cfg.decree.offices[g.decree.office + 1];
  return !!next?.stand && p.record < next.stand.record;
}

/** 2.16's score of one candidate: the wait for it above `res` plus its payback, a level's divided by 1.5 while the record is short. */
export function scoreOf(cfg: DecreeConfig, c: Candidate, cash: number, res: number, I: number, short: boolean): number {
  const wait = I > 0 ? Math.max(0, c.price - cash + res) / I : c.price - cash + res > 0 ? Infinity : 0;
  const s = wait + c.price / c.gain;
  return c.purchase.type === 'level' && short ? s / cfg.decree.advice.recordDivisor : s;
}

/** The best of `cs` by score (ties: the first). */
function best(cfg: DecreeConfig, cs: readonly Candidate[], cash: number, res: number, I: number, short: boolean): Candidate | null {
  let out: Candidate | null = null;
  let s = Infinity;
  for (const c of cs) {
    const x = scoreOf(cfg, c, cash, res, I, short);
    if (x < s) [out, s] = [c, x];
  }
  return out;
}

/** A time as the goal line and slips print it: "about 20 s / 2 min / 1 h" (2.16), rounded by the rules (at least 1 of its unit). Built. */
export function about(seconds: number): About {
  if (!(seconds > 0) || !Number.isFinite(seconds)) return { value: Number.isFinite(seconds) ? 0 : Infinity, unit: Number.isFinite(seconds) ? 's' : 'h' };
  if (seconds < 59.5) return { value: Math.max(1, Math.round(seconds)), unit: 's' };
  if (seconds < 3570) return { value: Math.max(1, Math.round(seconds / 60)), unit: 'min' };
  return { value: Math.max(1, Math.round(seconds / 3600)), unit: 'h' };
}

/** "about …" for a wait, or null at I = 0 or with nothing to wait for. */
function aboutWait(need: number, I: number): About | null {
  return I > 0 && need > 0 ? about(need / I) : null;
}

/** The slip a candidate makes (2.7 "Budget slips": its printed price, the level it starts from, +n/s). */
function slipOf(c: Candidate): Slip {
  return { kind: 'slip', purchase: c.purchase, price: c.price, drawnLevel: c.level, rateGain: c.gain };
}

/** Whether a boycott or "Say nothing" runs, and which club boycotts first (the grievance on the desk first). */
function trouble(g: DecreeGame): { boycott: number | null; scandal: boolean; frontPage: boolean } {
  const d = g.decree;
  const desk = d.desk?.type === 'paper' ? d.desk.paper : null;
  const deskClub = desk?.kind === 'strike' ? desk.petitioner : null;
  const first = d.strikes.findIndex((s) => !!s);
  const boycott = deskClub !== null && d.strikes[deskClub] ? deskClub : first >= 0 ? first : null;
  const frontPage = !d.scandal && (desk?.kind === 'scandal' || d.tray.some((p) => p.kind === 'scandal'));
  return { boycott, scandal: !!d.scandal, frontPage };
}

/** The one goal of 2.16, the slip a budget slip would carry now, the next purchase when nothing is affordable, and whether the reader would call. Built. */
export function advice(cfg: DecreeConfig, g: DecreeGame): AdviceResult {
  const p = decreeParams(cfg, g);
  const I = p.I;
  const cs = candidates(cfg, g, p);
  const res = slipReserve(cfg, g, p);
  const short = recordShort(cfg, g, p);
  const affordable = cs.filter((c) => g.cash >= c.price + res);
  const pickNow = best(cfg, affordable, g.cash, res, I, short);
  const pick = best(cfg, cs, g.cash, res, I, short);
  const slip = pickNow ? slipOf(pickNow) : null;
  const next = !slip && pick ? { purchase: pick.purchase, price: pick.price, about: aboutWait(pick.price + res - g.cash, I) } : null;
  const call = callNow(cfg, g);
  const t = trouble(g);
  const adOr = (ad: 'courier' | 'spinDoctor'): boolean => standIn(canWatchAd, () => canWatchAd(cfg, g, ad), () => false);
  let goal: Goal;
  if (call) goal = { kind: 'call', held: poll(cfg, g).held, of: cfg.decree.offices[g.decree.office].districts.length };
  else if (t.boycott !== null) goal = adOr('courier') ? { kind: 'ad', ad: 'courier' } : { kind: 'settle', club: t.boycott };
  else if (t.scandal && adOr('spinDoctor')) goal = { kind: 'ad', ad: 'spinDoctor' };
  else if (t.frontPage) goal = { kind: 'apologise' };
  else if (pick) goal = { kind: 'purchase', purchase: pick.purchase, price: pick.price, about: aboutWait(pick.price + res - g.cash, I) };
  else goal = { kind: 'none' };
  return { goal, slip, next, call };
}

/** The reader calls on the first allowed day on which the poll shows a majority (8.2, D17). */
export function callNow(cfg: DecreeConfig, g: DecreeGame): boolean {
  return standIn(canCall, () => canCall(cfg, g), () => false) && poll(cfg, g).held >= cfg.decree.offices[g.decree.office].majority;
}

/** The goal line's goal (4.1): advice's, as the screen prints it. Built. */
export function goalLine(cfg: DecreeConfig, g: DecreeGame): Goal {
  return advice(cfg, g).goal;
}

/**
 * The cash at which a slip becomes possible (the cheapest candidate's price plus what a slip keeps
 * back), or null when there is nothing to buy: tick.ts lands the slip when cash reaches it. A slip is
 * possible exactly when `advice(...).slip` is non-null. Built.
 */
export function slipNeed(cfg: DecreeConfig, g: DecreeGame): number | null {
  const p = decreeParams(cfg, g);
  const cs = candidates(cfg, g, p);
  if (!cs.length) return null;
  return Math.min(...cs.map((c) => c.price)) + slipReserve(cfg, g, p);
}

/**
 * The level the Standing Order buys (5.10 "the advised level"): the level with the best payback
 * (price / what it adds to I, divided by 1.5 while the record is short), whatever the cash, so the
 * moment it is bought follows from cash alone (tick.ts). Null with no level to buy. Built.
 */
export function standingOrderPick(cfg: DecreeConfig, g: DecreeGame): Candidate | null {
  const p = decreeParams(cfg, g);
  const levels = candidates(cfg, g, p).filter((c) => c.purchase.type === 'level');
  return best(cfg, levels, Infinity, 0, p.I, recordShort(cfg, g, p));
}
