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
 * Which goal `advice` returns, in this order (2.10 with M22, M31, M33):
 * 1. the board is deadlocked (no free cell, no merge, no delivery): the Basket, naming the cell to
 *    sell (an unwanted tier 8 first);
 * 2. the best purchase, if it is affordable now ("within reach");
 * 3. the Festival (M31), once every chain it asks for is open: the gear level of the missing good's
 *    chain that halves its work when there is one (kind 'gear', the next level's price; the goal
 *    line names the level from `festivalAdvice`), else the missing good's line (kind 'festival',
 *    target = the line's index);
 * 4. the best purchase with its wait;
 * 5. when no purchase can be made or waited for: the next lantern feat within reach, then the
 *    ticket nearest completion.
 * `adviceExtras` lists the non-purchase goals that apply; `purchaseAdvice` is the best purchase only.
 */
import { currentMods, featProgress } from './lanterns';
import { baseTier, lineUnmakeable, maxPopAt, mergeParams, recentRate, ripeChance } from './params';
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
 * The cell to sell in the Basket when the board is deadlocked (2.10, M22, M33: no free cell, no
 * merge, no delivery): a tier 8 first, else the lowest value; null when the board has room, a merge
 * exists or a good on it fills an unfilled line.
 */
export function basketCell(cfg: MergeConfig, g: MergeGame, p: MergeParams = mergeParams(cfg, g)): number | null {
  if (p.F > 0 || mergeExists(g)) return null;
  const wanted = wantedLines(g);
  // A delivery exists: not deadlocked (M33).
  if (g.merge.board.some((cell) => isGood(cell) && wanted.some((w) => w.c === cell.c && w.k === cell.k))) return null;
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

/**
 * The counter whose ticket is nearest completion: fewest unfilled lines, then the lowest counter;
 * null with none out. A ticket with a line no new drop can make (M34, `lineUnmakeable`) whose good
 * is not on the board is never within reach, so it is not counted.
 */
export function nearestTicket(cfg: MergeConfig, g: MergeGame): number | null {
  let best: number | null = null;
  let bestLeft = Infinity;
  g.merge.counters.forEach((ct, j) => {
    if (!ct.ticket) return;
    if (ct.ticket.lines.some((l) => lineUnmakeable(cfg, g, l) && !g.merge.board.some((cell) => isGood(cell) && cell.c === l.c && cell.k === l.k))) return;
    const left = ct.ticket.lines.filter((l) => !l.filled).length;
    if (left > 0 && left < bestLeft) {
      bestLeft = left;
      best = j;
    }
  });
  return best;
}

/** Pops of a chain's drops a good of tier k needs: 2^(k − b) (at least 1). */
const work = (k: number, b: number) => Math.pow(2, Math.max(0, k - b));

/**
 * The Festival goal of M31: once every chain the Festival asks for is open and it is not filled,
 * the missing good to name (an unfilled line whose good lies on the board first, a delivery; else
 * the line needing the most drops of its chain, 2^(k − b), then the lower chain), and, when a gear
 * level of that chain would halve the work for it (its next base step, within the top level), that
 * level, its chain and the price of the next level bought toward it. null when it does not apply.
 */
export function festivalAdvice(cfg: MergeConfig, g: MergeGame): { line: number; good: Good; gear: { c: number; level: number; cost: number } | null } | null {
  const m = g.merge;
  const fest = m.festival;
  if (fest.filledAt !== null || !fest.lines.some((l) => !l.filled) || !fest.lines.every((l) => l.filled || m.chains[l.c]?.open)) return null;
  const onBoard = (l: Good) => m.board.some((cell) => isGood(cell) && cell.c === l.c && cell.k === l.k);
  let line = fest.lines.findIndex((l) => !l.filled && onBoard(l));
  if (line < 0) {
    let bestWork = -1;
    fest.lines.forEach((l, i) => {
      if (l.filled) return;
      const w = work(l.k, baseTier(cfg, m.chains[l.c].gear));
      if (w > bestWork || (w === bestWork && l.c < fest.lines[line].c)) {
        bestWork = w;
        line = i;
      }
    });
  }
  const l = fest.lines[line];
  const good = { c: l.c, k: l.k };
  let gear: { c: number; level: number; cost: number } | null = null;
  if (line >= 0 && !onBoard(good)) {
    const ch = m.chains[l.c];
    const b = baseTier(cfg, ch.gear);
    const level = cfg.merge.gear.step * b + 1;
    const cost = mergeParams(cfg, g).chains[l.c].gearCost;
    if (b < cfg.merge.gear.maxBase && l.k > b && level <= cfg.merge.costs.gearMaxLevel && cost !== null && baseTier(cfg, level) === b + 1) gear = { c: l.c, level, cost };
  }
  return { line, good, gear };
}

/**
 * The extra goals of 2.10 that apply now, in the order `advice` would use them: the Basket (board
 * deadlocked: M22, M33), "Fill the Festival" (M31: target = the missing good's line), the next
 * lantern feat within reach (the most advanced of the next three, from `meta.lanternReach` of its
 * progress; a "make tier k" feat measured in basic goods), the ticket nearest completion (before
 * the lantern while the opening script's tickets wait, M42).
 */
export function adviceExtras(cfg: MergeConfig, g: MergeGame): Advice[] {
  const p = mergeParams(cfg, g);
  const m = g.merge;
  const out: Advice[] = [];
  const cell = basketCell(cfg, g, p);
  if (cell !== null) out.push(extra('basket', cell));
  const fest = festivalAdvice(cfg, g);
  if (fest) out.push(extra('festival', fest.line));
  const feats = featProgress(cfg, g)
    .map((f) => ({ ...f, reach: featReach(cfg, f) }))
    .filter((f) => f.need > 0 && f.have < f.need && f.reach >= cfg.merge.meta.lanternReach)
    .sort((a, b) => b.reach - a.reach || a.n - b.n);
  const t = nearestTicket(cfg, g);
  // While the opening script's tickets wait (M42), filling them is the goal before any lantern.
  if (t !== null && m.script !== 'done') out.push(extra('fillTicket', t));
  if (feats.length) out.push(extra('lantern', feats[0].n));
  if (t !== null && m.script === 'done') out.push(extra('fillTicket', t));
  return out;
}

/**
 * How far a lantern's feat is, 0 to 1, for "within reach": have/need, except a "make tier k" feat,
 * measured in basic goods (2^(best − 1) of 2^(k − 1)): a tier 3 is a sixteenth of a tier 6, not half.
 */
function featReach(cfg: MergeConfig, f: { n: number; have: number; need: number }): number {
  if (!(f.need > 0)) return 0;
  const feat = cfg.merge.lanterns.find((l) => l.n === f.n)?.feat;
  if (feat?.type === 'tierMade') return f.have > 0 ? Math.pow(2, f.have - 1) / Math.pow(2, f.need - 1) : 0;
  return f.have / f.need;
}

/** The best purchase only (2.10's score), affordable now or not; null when no purchase can be made or waited for. The bot buys this when it is affordable. */
export function purchaseAdvice(cfg: MergeConfig, g: MergeGame): Advice | null {
  return adviceCandidates(cfg, g)[0] ?? null;
}

/** The single next goal (2.10, M31, M33): see the file comment for the order. null when there is nothing to do. */
export function advice(cfg: MergeConfig, g: MergeGame): Advice | null {
  const candidates = adviceCandidates(cfg, g);
  const best = candidates[0] ?? null;
  const extras = adviceExtras(cfg, g);
  if (extras[0]?.kind === 'basket') return extras[0];
  if (best && best.cost <= g.cash) return best;
  const fest = festivalAdvice(cfg, g);
  if (fest) {
    const gear = fest.gear;
    if (gear) {
      const own = candidates.find((a) => a.kind === 'gear' && a.target === gear.c);
      if (own) return own;
      const R = incomeRate(cfg, g);
      const short = Math.max(0, gear.cost - g.cash);
      if (R > 0 || short === 0) return { kind: 'gear', target: gear.c, cost: gear.cost, gain: 0, wait: R > 0 ? short / R : null, score: Infinity };
    }
    return extra('festival', fest.line);
  }
  if (best) return best;
  return extras.find((a) => a.kind !== 'festival') ?? null;
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
