/**
 * The derived values of 2.4, the one rounding rule, the one cash commit and the random streams.
 * Package P1a (docs/design/office-build-plan.md).
 *
 * SEAM (both rules packages read these; a change is agreed first):
 * - `decreeParams(cfg, g)`: every derived value of 2.4 (A, M(A), m_N, V, rates, s_i, B, I, τ, G_max,
 *   the record), with the ONE Factors object of `deskFactors` (P1b, ./twists.ts) applied: mix
 *   twists to the mixes, τ and G_max factors. tick, offline, advice, count, the strips and the bots
 *   read B and I from here only.
 * - `commitCash(g, delta, source)`: the ONE way the RULES change cash (H5: the tick, paper gains and
 *   costs, purchases, Check the Sofa, the transition fund). The away payout and its ad top-up are paid
 *   by the shared store through economy's grantCash (2.15 `paysOnCompute`), not through here: a coins
 *   test books `away` and `awayAd` in its own harness.
 * - `disarray(losses)`: Y(n) = 2^(n+1) − 2 (D15); `disarrayOf(rule, losses)` with the config's `paperRules.disarray`, read by count.ts and the poll.
 * - `roundDibs(cfg, x)`: every amount of dibs shown or paid (merge M19's rule).
 * - `rand(g, site, x)`: one value in [0, 1) of a random site, advancing its counter (2.3).
 * - prices: `levelCost`, `openCost`, `vanityPrice` (2.2, 5.8): the Ledger, slips, advice and the
 *   Standing Order price with these only.
 */
import type { GameConfig } from '../../config/schema';
import { rngMix4 } from '../rng';
import { sayNothingFactor } from './scandal';
import { deskFactors, factorFor } from './twists';
import { SITE, type CashSource, type ClubId, type ClubIx, type DecreeConfig, type DecreeGame, type DecreeParams, type FactorTarget, type FactorValue, type Factors, type Office, type OfficeIx, type Site, type TopBar } from './types';

/** Floating tolerance of comparisons. */
export const EPS = 1e-9;
/** Cash never goes above this. */
export const MAX_CASH = Number.MAX_VALUE;

/** A decree game's config (the block parsed by src/engine/decreeMode.ts). Built. */
export function isDecree(cfg: GameConfig): cfg is DecreeConfig {
  return cfg.mode === 'decree' && !!cfg.decree && Array.isArray((cfg as DecreeConfig).decree.offices);
}

/** The current office's row of 2.2. Built. */
export function officeOf(cfg: DecreeConfig, office: OfficeIx): Office {
  return cfg.decree.offices[office];
}

/** A club id's index in office `office`'s clubs, or −1 when the office has no such club. Built. */
export function clubIndex(cfg: DecreeConfig, office: OfficeIx, club: ClubId | null): ClubIx {
  return club === null ? -1 : officeOf(cfg, office).clubs.indexOf(club);
}

/** roundDibs (merge M19): below 1,000 half up to a whole dib, from 1,000 three significant figures; 0 for ≤ 0. Built. */
export function roundDibs(cfg: DecreeConfig, x: number): number {
  const { roundBelow, sigDigits } = cfg.decree.money;
  if (!Number.isFinite(x) || x <= 0) return 0;
  const whole = Math.floor(x + 0.5 + EPS);
  if (whole < roundBelow) return whole;
  const f = Math.pow(10, Math.floor(Math.log10(x)) - sigDigits + 1);
  return Math.floor(x / f + 0.5 + EPS) * f;
}

/** One value in [0, 1) of site `site` (2.3: rngMix4(seed, site, counter, x)), and the state with that site's counter advanced. Built. */
export function rand(g: DecreeGame, site: Site, x = 0): { value: number; g: DecreeGame } {
  const d = g.decree;
  const n = d.draws[site];
  const value = rngMix4(d.seed, SITE[site], n, x) / 4294967296;
  return { value, g: { ...g, decree: { ...d, draws: { ...d.draws, [site]: n + 1 } } } };
}

/**
 * The one way cash changes (2.3): adds `delta` (negative to spend), never below 0, books earnings
 * into the shared `runEarnings` and `lifetimeEarnings` for gains. `source` names where dibs come
 * from (H5); the rules package may book them per source. Built.
 */
export function commitCash(g: DecreeGame, delta: number, source: CashSource): DecreeGame {
  if (!Number.isFinite(delta) || delta === 0) return g;
  const cash = Math.min(MAX_CASH, Math.max(0, g.cash + delta));
  const applied = cash - g.cash;
  const gain = applied > 0 ? applied : 0;
  const stats = g.decree.stats;
  const book = { ...stats.book, [source]: (stats.book?.[source] ?? 0) + applied };
  return { ...g, cash, runEarnings: g.runEarnings + gain, lifetimeEarnings: g.lifetimeEarnings + gain, decree: { ...g.decree, stats: { ...stats, book } } };
}

/** D15's disarray rule as the config has it (`decree.paperRules.disarray`): first step and ratio. */
export type DisarrayRule = { first: number; ratio: number };
/** D15 as decided (first 2, ratio 2): the default when no config is passed (the validator's bound). */
export const DISARRAY_D15: DisarrayRule = { first: 2, ratio: 2 };

/**
 * Disarray after `losses` consecutive losses at a seat under `rule`, the ONE formula of D15:
 * Y(n) = first × (ratio^n − 1)/(ratio − 1) share points (first 2, ratio 2: 2^(n+1) − 2 = +2, +6, +14, +30,
 * +62, +126; ratio 1: first × n, the old linear rule). `rule` is `cfg.decree.paperRules.disarray`
 * (decreeParams passes it, so the shares and the poll follow a tuned rule). Built.
 */
export function disarrayOf(rule: DisarrayRule, losses: number): number {
  if (!(losses > 0)) return 0;
  const { first, ratio } = rule;
  return Math.abs(ratio - 1) < EPS ? first * losses : (first * (Math.pow(ratio, losses) - 1)) / (ratio - 1);
}

/**
 * The seam's `disarray(losses, rule?)` (count.ts, the validator's bound, the bot): `disarrayOf(rule, losses)`
 * with the config's rule when given (`cfg.decree.paperRules.disarray`), else D15 as decided. A number in
 * place of the rule (Array.map's index, `[0, 1, 2].map(disarray)`) is ignored. Built.
 */
export function disarray(losses: number, rule?: DisarrayRule | number | null): number {
  return disarrayOf(rule && typeof rule === 'object' ? rule : DISARRAY_D15, losses);
}

/** v_i = S × valueStep^i (2.2; Grand Project j is i = 8 + j... continues as ministry 7 + j of the president). Built. */
export function ministryValue(cfg: DecreeConfig, office: OfficeIx, i: number): number {
  return officeOf(cfg, office).scale * Math.pow(cfg.decree.ministry.valueStep, i);
}

/** st(L) = floor(L / 12): the storeys of a level (2.2). Built. */
export function storeys(cfg: DecreeConfig, level: number): number {
  return Math.floor(level / cfg.decree.ministry.storeyEvery);
}

/** rate_i = v_i × L_i × 2^st(L_i), 0 when closed (2.4). Built. */
export function rateOf(cfg: DecreeConfig, office: OfficeIx, i: number, m: { open: boolean; level: number }): number {
  return m.open ? ministryValue(cfg, office, i) * m.level * Math.pow(2, storeys(cfg, m.level)) : 0;
}

/** The raw (unrounded) price of ministry i's next level, L → L+1 = levelCostFactor × v_i × levelGrowth^(L−1); Infinity when closed or at the cap (2.2). */
export function levelCostRaw(cfg: DecreeConfig, g: DecreeGame, i: number): number {
  const m = g.decree.ministries[i];
  const c = cfg.decree.ministry;
  if (!m || !m.open || m.level >= c.levelCap) return Infinity;
  return c.levelCostFactor * ministryValue(cfg, g.decree.office, i) * Math.pow(c.levelGrowth, m.level - 1);
}

/** The price of ministry i's next level through roundDibs; Infinity when closed or at the cap (2.2: "a purchase that would change nothing is refused"). Built. */
export function levelCost(cfg: DecreeConfig, g: DecreeGame, i: number): number {
  const raw = levelCostRaw(cfg, g, i);
  return Number.isFinite(raw) ? roundDibs(cfg, raw) : Infinity;
}

/** The price of opening ministry i, O_0 = 0, O_i = S × openBase × openRatio^(i−1), through roundDibs; Infinity when it is open or not in the office (2.2). Built. */
export function openCost(cfg: DecreeConfig, g: DecreeGame, i: number): number {
  const m = g.decree.ministries[i];
  if (!m || m.open) return Infinity;
  if (i === 0) return 0;
  const c = cfg.decree.ministry;
  return roundDibs(cfg, officeOf(cfg, g.decree.office).scale * c.openBase * Math.pow(c.openRatio, i - 1));
}

/** The term's monument price, vanity.price seconds of B, through roundDibs (5.8). Built. */
export function vanityPrice(cfg: DecreeConfig, g: DecreeGame): number {
  return roundDibs(cfg, cfg.decree.vanity.price * decreeParams(cfg, g).B);
}

/** One factor target for one club's paper (null: a target of no club), from the ONE Factors object (twists.ts `factorFor`). */
export function factorOn(f: Factors, target: FactorTarget, club: ClubIx | null): FactorValue {
  return factorFor(f, target, club);
}

/**
 * The mixes w_{d,g} after mix twists (2.14 "Brass +0.10 in every mix, others scaled down"): each club
 * with an add gets w + add (at most 1), the others share what is left in their old proportions, so
 * every district still sums to 1.
 */
export function mixWith(mix: readonly (readonly number[])[], add: readonly number[]): number[][] {
  if (!add.some((a) => a !== 0)) return mix.map((m) => m.slice());
  return mix.map((m) => {
    const raised = m.map((w, gi) => (add[gi] ? Math.min(1, Math.max(0, w + add[gi])) : w));
    const fixedOld = m.reduce((s, w, gi) => s + (add[gi] ? w : 0), 0);
    const fixedNew = raised.reduce((s, w, gi) => s + (add[gi] ? w : 0), 0);
    const restOld = 1 - fixedOld;
    const restNew = Math.max(0, 1 - fixedNew);
    return raised.map((w, gi) => (add[gi] ? w : restOld > EPS ? (w * restNew) / restOld : 0));
  });
}

/** Approval A for moods `moods` with population weights W: Σ_g W_g × m_g as a whole percent (2.4). */
export function approvalOf(W: readonly number[], moods: readonly number[]): number {
  return Math.round(W.reduce((s, w, gi) => s + w * (moods[gi] ?? 0), 0) + EPS);
}

/** M(A) = 1 + slope × (A − 50)/100 (×1.0 at 50; 2.4). */
export function multiplierOf(cfg: DecreeConfig, approval: number): number {
  return 1 + (cfg.decree.approval.slope * (approval - 50)) / 100;
}

/**
 * Every derived value of 2.4 for the current state, with `factors` (default: `deskFactors(cfg, g)`,
 * the ONE object of twists and ministers): the mix twists (Factors.mixAdd) on the mixes (and so W and
 * approval), the τ and G_max factors, the "Say nothing" cut (scandal.ts `sayNothingFactor`). Built.
 */
export function decreeParams(cfg: DecreeConfig, g: DecreeGame, factors: Factors = deskFactors(cfg, g)): DecreeParams {
  const d = g.decree;
  const c = cfg.decree;
  const row = officeOf(cfg, d.office);
  const mix = mixWith(
    row.districts.map((dist) => dist.mix.map((w) => w / 100)),
    row.clubs.map((_, gi) => factors.mixAdd[gi] ?? 0),
  );
  const W = row.clubs.map((_, gi) => mix.reduce((s, m) => s + m[gi], 0) / mix.length);
  const approval = approvalOf(W, d.moods);
  const multiplier = multiplierOf(cfg, approval);
  const mN = 1 + c.ladder.nrFactor * d.nr;
  const V = Math.pow(c.vanity.factor, d.vanity.length);
  const values = d.ministries.map((_, i) => ministryValue(cfg, d.office, i));
  const rates = d.ministries.map((m, i) => rateOf(cfg, d.office, i, m));
  const served = d.ministries.map((_, i) => {
    const club = row.ministries[i]?.club ?? null;
    const gi = clubIndex(cfg, d.office, club);
    return gi >= 0 && d.strikes[gi] ? 0 : 1;
  });
  const sum = rates.reduce((s, r) => s + r, 0);
  const sumServed = rates.reduce((s, r, i) => s + r * served[i], 0);
  const sayNothing = sayNothingFactor(cfg, g, factors);
  const B = mN * V * sum;
  const I = multiplier * mN * V * sumServed * sayNothing;
  const record = d.ministries.slice(0, row.ministries.length).reduce((s, m) => s + (m.open ? m.level : 0), 0);
  const tf = factorOn(factors, 'tau', null);
  const gf = factorOn(factors, 'gossipMax', null);
  return {
    office: d.office,
    clubs: row.clubs,
    mix,
    W,
    approval,
    multiplier,
    mN,
    V,
    rates,
    values,
    served,
    B,
    I,
    sayNothing,
    tau: row.tau * tf.mul + tf.add,
    gossipMax: Math.max(1, Math.round(row.gossipMax * gf.mul + gf.add)),
    disarray: disarrayOf(c.paperRules.disarray, d.losses),
    rivalPull: row.rivalPull,
    record,
  };
}

/**
 * What one more level of ministry i adds to I now (the payback of a requisition, a slip, advice):
 * Δrate × M(A) × m_N × V × s_i × the "Say nothing" factor; while the ministry earns nothing (a
 * boycott) its gain at full service, so a payback is never infinite. 0 when closed or capped.
 */
export function levelGain(cfg: DecreeConfig, g: DecreeGame, i: number, p: DecreeParams = decreeParams(cfg, g)): number {
  const m = g.decree.ministries[i];
  if (!m || !m.open || m.level >= cfg.decree.ministry.levelCap) return 0;
  const dRate = rateOf(cfg, g.decree.office, i, { open: true, level: m.level + 1 }) - rateOf(cfg, g.decree.office, i, m);
  const base = dRate * p.multiplier * p.mN * p.V;
  return p.served[i] ? base * p.sayNothing : base;
}

/** What opening ministry i adds to I now (its level 1). */
export function openGain(cfg: DecreeConfig, g: DecreeGame, i: number, p: DecreeParams = decreeParams(cfg, g)): number {
  const m = g.decree.ministries[i];
  if (!m || m.open) return 0;
  const base = rateOf(cfg, g.decree.office, i, { open: true, level: 1 }) * p.multiplier * p.mN * p.V;
  return p.served[i] ? base * p.sayNothing : base;
}

/** The top bar's values (4.1). Built. */
export function topBar(cfg: DecreeConfig, g: DecreeGame): TopBar {
  const p = decreeParams(cfg, g);
  return { cash: g.cash, income: p.I, approval: p.approval, multiplier: p.multiplier, gossip: g.decree.gossip, gossipMax: p.gossipMax };
}

/** The club strip (4.1): each club's icon, mood and boycott, in club order. Built. */
export function clubStrip(cfg: DecreeConfig, g: DecreeGame): { club: ClubIx; id: ClubId; short: string; icon: string; mood: number; boycott: boolean }[] {
  const d = g.decree;
  return officeOf(cfg, d.office).clubs.map((id, gi) => {
    const def = cfg.decree.clubs.find((x) => x.id === id)!;
    return { club: gi, id, short: def.short, icon: def.icon, mood: d.moods[gi], boycott: !!d.strikes[gi] };
  });
}
