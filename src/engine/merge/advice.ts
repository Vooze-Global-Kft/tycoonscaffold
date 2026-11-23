/**
 * `advice(cfg, state)` (spec 2.10 with Decision M22): the single next goal, for the bot and the goal
 * line, and the rate R it is measured by.
 *
 * Package META (docs/design/market-build-plan.md names ORDERS for these; the lead gave this file to
 * META). Reads params.ts (`mergeParams`, `recentRate`, `baseTier`, `ripeChance`, `maxPopAt`) and
 * lanterns.ts (`featProgress`). Pure.
 *
 * Income gained per s by each candidate purchase (2.10):
 * - gear L → L+1: Δu × vb_c, u = (1 + p)/T × 2^(b−1) basic goods per s, vb_c the value of one basic
 *   good at tier k* = max(b + 1, best_c − 1): value(c, k*)/2^(k*−1) (= v_c × (g/2)^(k*−1) × S_c ×
 *   lanternPay; the spec's 1.2 is g/2 at g = 2.4);
 * - stall M → M+1: (ΔS/S_c) × (the chain's recent ticket coins per s + its minder rate), ΔS = 0.1
 *   below the cap;
 * - minder hire or level: (value(c, h′) − value(c, h))/Q;
 * - a new stall: ΔU/Φ, ΔU = value(c, max(2, maxPop − 1)) at its opening gear level and stall level 1;
 * - a shutter: κ × R/O (one cell).
 * Score = max(0, cost − cash)/R + cost/gain, the lowest wins. A candidate with no gain, or one the
 * player cannot reach (R = 0 and cost > cash), is never advised; one at its maximum has no cost
 * (params.ts) and is not a candidate.
 *
 * Which goal `advice` returns: the best purchase if it is affordable now; else "Sell spare goods in
 * the Basket" when the board is full and no merge exists (M22: an unwanted tier 8 first); else the
 * best purchase (with its wait); else, when no purchase is possible, the extras in this order:
 * "Fill the Festival" once its chains are open, the next lantern feat within reach, the ticket
 * nearest completion. `adviceExtras` lists the extras for the goal line's sheet.
 */
import { currentMods, featProgress } from './lanterns';
import { baseTier, maxPopAt, mergeParams, recentRate, ripeChance } from './params';
import { isGood } from './board';
import type { Advice, Good, MergeConfig, MergeGame, MergeParams } from './types';

/** R = R_t + R_m (2.9, 2.10): the `recent` ticket coins ÷ min(300, season clock), plus the minder rate. Coins per s. */
export function incomeRate(cfg: MergeConfig, g: MergeGame, p: MergeParams = mergeParams(cfg, g)): number {
  return recentRate(g) + p.minderRate;
}

/** Basic goods per s of a gear at level L (2.10): u = (1 + p)/T × 2^(b−1). */
export function gearOutput(cfg: MergeConfig, g: MergeGame, level: number): number {
  const mods = currentMods(cfg, g.merge);
  return ((1 + ripeChance(cfg, mods, level)) / cfg.merge.gear.interval) * Math.pow(2, baseTier(cfg, level) - 1);
}

function scored(kind: Advice['kind'], target: number, cost: number, gain: number, cash: number, R: number): Advice | null {
  if (!(gain > 0) || !Number.isFinite(cost)) return null;
  const short = Math.max(0, cost - cash);
  if (R <= 0 && short > 0) return null;
  const wait = R > 0 ? short / R : null;
  return { kind, target, cost, gain, wait, score: (R > 0 ? short / R : 0) + cost / gain };
}

/** Every purchase the player could make now or by waiting, scored by 2.10, lowest score first (ties: the order of 2.5's purchases, chain by chain). */
export function adviceCandidates(cfg: MergeConfig, g: MergeGame): Advice[] {
  const p = mergeParams(cfg, g);
  const m = g.merge;
  const k = cfg.merge;
  const R = incomeRate(cfg, g, p);
  const cash = g.cash;
  const Q = k.minders.interval * p.mods.minderIntervalMult;
  const out: Advice[] = [];
  const push = (a: Advice | null) => a && out.push(a);
  for (const ch of p.chains) {
    const st = m.chains[ch.c];
    if (ch.open) {
      if (ch.gearCost !== null) {
        const kStar = Math.min(8, Math.max(ch.base + 1, st.best - 1));
        const vb = ch.values[kStar - 1] / Math.pow(2, kStar - 1);
        push(scored('gear', ch.c, ch.gearCost, (gearOutput(cfg, g, st.gear + 1) - gearOutput(cfg, g, st.gear)) * vb, cash, R));
      }
      if (ch.stallCost !== null) {
        const dS = Math.min(k.stalls.bonusMax, ch.stallBonus + k.stalls.bonusPerLevel) - ch.stallBonus;
        push(scored('stall', ch.c, ch.stallCost, (dS / ch.stallBonus) * (recentRate(g, ch.c) + ch.minderRate), cash, R));
      }
      if (ch.minderCost !== null) {
        const h = ch.houseTier;
        const h2 = Math.min(st.minder + 2, ch.base + 1);
        const gain = (ch.values[h2 - 1] - (h > 0 ? ch.values[h - 1] : 0)) / Q;
        push(scored(st.minder === 0 ? 'minderHire' : 'minderLevel', ch.c, ch.minderCost, gain, cash, R));
      }
    } else if (ch.openCost !== null) {
      const mp = maxPopAt(cfg, p.mods, st.gear);
      const dU = ch.values[Math.max(2, mp - 1) - 1] / ch.stallBonus;
      push(scored('openStall', ch.c, ch.openCost, dU / k.advice.newStallPhi, cash, R));
    }
  }
  p.shutters.forEach((s, group) => {
    if (s && s.allowed && p.O > 0) push(scored('shutter', group, s.cost, (k.advice.shutterKappa * R) / p.O, cash, R));
  });
  return out.map((a, i) => ({ a, i })).sort((x, y) => x.a.score - y.a.score || x.i - y.i).map((x) => x.a);
}

// ----------------------------------------------------------------------------- the extras (2.10, M22)

const extra = (kind: Advice['kind'], target: number | null): Advice => ({ kind, target, cost: 0, gain: 0, wait: null, score: Infinity });

/** Whether two identical goods below tier 8 lie on the board (a merge exists). */
export function mergeExists(g: MergeGame): boolean {
  const seen = new Set<number>();
  for (const cell of g.merge.board) {
    if (!isGood(cell) || cell.k >= 8) continue;
    const key = cell.c * 8 + cell.k;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/** The unfilled lines of every ticket out and of the Festival. */
function wantedLines(g: MergeGame): Good[] {
  const out: Good[] = [];
  for (const ct of g.merge.counters) for (const l of ct.ticket?.lines ?? []) if (!l.filled) out.push({ c: l.c, k: l.k });
  if (g.merge.festival.filledAt === null) for (const l of g.merge.festival.lines) if (!l.filled) out.push({ c: l.c, k: l.k });
  return out;
}

/**
 * The cell to sell in the Basket when the board is full and no merge exists (2.10, M22): a good no
 * unfilled line asks for, a tier 8 first, else the lowest value (lowest chain, then tier); null when
 * the board has room, a merge exists, or every good is wanted (then a delivery exists).
 */
export function basketCell(cfg: MergeConfig, g: MergeGame, p: MergeParams = mergeParams(cfg, g)): number | null {
  if (p.F > 0 || mergeExists(g)) return null;
  const wanted = wantedLines(g);
  let best: number | null = null;
  let bestKey = Infinity;
  g.merge.board.forEach((cell, i) => {
    if (!isGood(cell) || wanted.some((w) => w.c === cell.c && w.k === cell.k)) return;
    const key = cell.k === 8 ? -1 : p.chains[cell.c].values[cell.k - 1];
    if (key < bestKey) {
      bestKey = key;
      best = i;
    }
  });
  return best;
}

/** The counter whose ticket is nearest completion: fewest unfilled lines, then the lowest counter; null with none out. */
export function nearestTicket(g: MergeGame): number | null {
  let best: number | null = null;
  let bestLeft = Infinity;
  g.merge.counters.forEach((ct, j) => {
    if (!ct.ticket) return;
    const left = ct.ticket.lines.filter((l) => !l.filled).length;
    if (left > 0 && left < bestLeft) {
      bestLeft = left;
      best = j;
    }
  });
  return best;
}

/**
 * The extra goals of 2.10 that apply now, in the order `advice` would use them: the Basket (board
 * full, no merge: M22), "Fill the Festival" (unfilled, every chain it asks for open), the next
 * lantern feat within reach (the most advanced of the next three, from `meta.lanternReach` of its
 * progress), the ticket nearest completion.
 */
export function adviceExtras(cfg: MergeConfig, g: MergeGame): Advice[] {
  const p = mergeParams(cfg, g);
  const m = g.merge;
  const out: Advice[] = [];
  const cell = basketCell(cfg, g, p);
  if (cell !== null) out.push(extra('basket', cell));
  const fest = m.festival;
  if (fest.filledAt === null && fest.lines.some((l) => !l.filled) && fest.lines.every((l) => l.filled || m.chains[l.c]?.open)) out.push(extra('festival', null));
  const feats = featProgress(cfg, g)
    .filter((f) => f.need > 0 && f.have < f.need && f.have / f.need >= cfg.merge.meta.lanternReach)
    .sort((a, b) => b.have / b.need - a.have / a.need || a.n - b.n);
  if (feats.length) out.push(extra('lantern', feats[0].n));
  const t = nearestTicket(g);
  if (t !== null) out.push(extra('fillTicket', t));
  return out;
}

/** The best purchase only (2.10's score), affordable now or not; null when no purchase can be made or waited for. The bot buys this when it is affordable. */
export function purchaseAdvice(cfg: MergeConfig, g: MergeGame): Advice | null {
  return adviceCandidates(cfg, g)[0] ?? null;
}

/** The single next goal (2.10): see the file comment for the order. null when there is nothing to do. */
export function advice(cfg: MergeConfig, g: MergeGame): Advice | null {
  const best = adviceCandidates(cfg, g)[0] ?? null;
  if (best && best.cost <= g.cash) return best;
  const extras = adviceExtras(cfg, g);
  if (extras[0]?.kind === 'basket') return extras[0];
  return best ?? extras[0] ?? null;
}

/**
 * The goal line's estimate of a wait (2.10): "about 20 s", "about 2 min", "about 1 h", as a number
 * and a unit (the words are the screens' strings); null when there is no estimate (R = 0). Under a
 * minute to the nearest 10 s (at least 10; 0 means affordable now), under an hour to the nearest minute, else to the hour.
 */
export function waitEstimate(wait: number | null): { n: number; unit: 's' | 'min' | 'h' } | null {
  if (wait === null || !Number.isFinite(wait) || wait < 0) return null;
  if (wait === 0) return { n: 0, unit: 's' };
  if (wait < 55) return { n: Math.max(10, Math.round(wait / 10) * 10), unit: 's' };
  if (wait < 3570) return { n: Math.max(1, Math.round(wait / 60)), unit: 'min' };
  return { n: Math.max(1, Math.round(wait / 3600)), unit: 'h' };
}
