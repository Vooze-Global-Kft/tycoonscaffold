/**
 * The derived values of 2.4, the one rounding rule, the one cash commit and the random streams.
 * Package P1a (docs/design/office-build-plan.md).
 *
 * SEAM (both rules packages read these; a change is agreed first):
 * - `decreeParams(cfg, g)`: every derived value of 2.4 (A, M(A), m_N, V, rates, s_i, B, I, τ, G_max,
 *   the record), with the ONE Factors object of `deskFactors` (P1b, ./twists.ts) applied: mix
 *   twists to the mixes, τ and G_max factors. tick, offline, advice, count, the strips and the bots
 *   read B and I from here only.
 * - `commitCash(g, delta, source)`: the ONE way cash changes (H5: dibs enter only through the tick,
 *   paper gains, the away payout and its ad top-up, Check the Sofa, the transition fund).
 * - `roundDibs(cfg, x)`: every amount of dibs shown or paid (merge M19's rule).
 * - `rand(g, site, x)`: one value in [0, 1) of a random site, advancing its counter (2.3).
 * - prices: `levelCost`, `openCost`, `vanityPrice` (2.2, 5.8): the Ledger, slips, advice and the
 *   Standing Order price with these only.
 */
import type { GameConfig } from '../../config/schema';
import { rngMix4 } from '../rng';
import { notBuilt } from './notBuilt';
import { sayNothingFactor } from './scandal';
import { deskFactors } from './twists';
import { SITE, type CashSource, type ClubId, type ClubIx, type DecreeConfig, type DecreeGame, type DecreeParams, type Factors, type Office, type OfficeIx, type Site, type TopBar } from './types';

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
  void source;
  if (!Number.isFinite(delta) || delta === 0) return g;
  const cash = Math.min(MAX_CASH, Math.max(0, g.cash + delta));
  const gain = delta > 0 ? cash - g.cash : 0;
  return { ...g, cash, runEarnings: g.runEarnings + gain, lifetimeEarnings: g.lifetimeEarnings + gain };
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

/** The price of ministry i's next level, L → L+1 = 15 × v_i × 1.25^(L−1), through roundDibs; Infinity at the cap (2.2). Skeleton: throws notBuilt. */
export function levelCost(cfg: DecreeConfig, g: DecreeGame, i: number): number {
  return notBuilt('levelCost');
}

/** The price of opening ministry i, O_i = S × 150 × r^(i−1) (O_0 = 0), through roundDibs (2.2). Skeleton: throws notBuilt. */
export function openCost(cfg: DecreeConfig, g: DecreeGame, i: number): number {
  return notBuilt('openCost');
}

/** The term's monument price, vanity.price s of B (5.8). Skeleton: throws notBuilt. */
export function vanityPrice(cfg: DecreeConfig, g: DecreeGame): number {
  return notBuilt('vanityPrice');
}

/**
 * Every derived value of 2.4 for the current state, with `factors` (default: `deskFactors(cfg, g)`,
 * the ONE object of twists and ministers). Built for the skeleton's tick (A, M, m_N, V, rates, s_i,
 * B, I); the mix twists (Factors.mixAdd) and the τ and G_max factors are P1a's to apply here.
 */
export function decreeParams(cfg: DecreeConfig, g: DecreeGame, factors: Factors = deskFactors(cfg, g)): DecreeParams {
  const d = g.decree;
  const c = cfg.decree;
  const row = officeOf(cfg, d.office);
  const mix = row.districts.map((dist) => dist.mix.map((w) => w / 100));
  const W = row.clubs.map((_, gi) => mix.reduce((s, m) => s + m[gi], 0) / mix.length);
  const approval = Math.round(W.reduce((s, w, gi) => s + w * (d.moods[gi] ?? c.mood.start), 0));
  const multiplier = c.approval.base + (c.approval.slope * approval) / 100;
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
  return { office: d.office, clubs: row.clubs, mix, W, approval, multiplier, mN, V, rates, values, served, B, I, sayNothing, tau: row.tau, gossipMax: row.gossipMax, record };
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
