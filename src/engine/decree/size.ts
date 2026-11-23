/**
 * Sizing and the strip (2.7 "Sizing", "A strip prints"). Package P1a (docs/design/office-build-plan.md).
 *
 * ONE MOMENT OF FREEZING (D23): every number a paper prints is fixed when it LANDS. At landing, the
 * twist and minister factors (the ONE Factors object, ./twists.ts `deskFactors`) multiply the base
 * effects (validator: every effective |Δ| ≤ 10); money = roundDibs(|seconds| × factor × B_landing × j)
 * with the jitter j drawn at the draw (`sizeMoney`); each mood effect is frozen into `shown`:
 * f+ = min(1.4, (100 − m)/50) for a gain, f− = min(1.4, m/50) for a loss,
 * shown = sign(Δ) × max(1, round(|Δ| × f)) (half away from zero), 0 with no headroom; a FIXED mood
 * effect (a settlement's +10, 2.8) is copied unsized. The lemma (tested): with |Δ| ≤ 10, m + shown
 * stays in 0 to 100 (a settlement's fixed +10 starts below 20); the engine asserts clamps = 0 (H1).
 *
 * SEAM: `freezeShown` is the only producer of `Shown` (create.ts and draw.ts land papers with it);
 * `stripOf` is what the desk prints (a screen never computes a value of a strip); it asks count.ts
 * (P1b) `heldAfter` for the poll title, `closeDistricts` for the flags and `shares` for a district
 * chip ("HT 48.6 → 52.6"), and advice.ts (P1b) `about` for "Short by 240 · about 9 s".
 */
import { shares } from './count';
import { decreeParams, roundDibs } from './params';
import type { Chip, Choice, DecreeConfig, DecreeGame, Factors, Paper, Shown, ShownEffect, Strip } from './types';

/** The frozen mood change of base Δ `delta` at mood `m` (2.7 "Sizing"), with f capped at capF. Built. */
export function sizeMood(cfg: DecreeConfig, m: number, delta: number): number {
  if (delta === 0) return 0;
  const cap = cfg.decree.mood.capF;
  const f = delta > 0 ? Math.min(cap, (100 - m) / 50) : Math.min(cap, m / 50);
  if (f <= 0) return 0;
  const size = Math.max(1, Math.round(Math.abs(delta) * f));
  return Math.sign(delta) * size;
}

/**
 * A paper's money at landing (D23): roundDibs(|seconds| × B × j), at least money.minimum, with the sign
 * of `seconds` (negative a cost). `seconds` already carries its factors. Built (the fixtures land
 * papers that cost money).
 */
export function sizeMoney(cfg: DecreeConfig, seconds: number, B: number, jitter: number): number {
  if (seconds === 0) return 0;
  return Math.sign(seconds) * Math.max(cfg.decree.money.minimum, roundDibs(cfg, Math.abs(seconds) * B * jitter));
}

/**
 * Both outcomes of `paper` frozen at landing in state `g` (2.7, D23). Built for the skeleton without
 * factors (`factors` is not read yet: P1a applies them to the base effects and records the initials;
 * P1a also guards the floating error of |Δ| × f at exact halves, 2.7 "half away from zero").
 */
export function freezeShown(cfg: DecreeConfig, g: DecreeGame, paper: Paper, factors: Factors): Shown {
  const moods = g.decree.moods;
  const B = decreeParams(cfg, g, factors).B;
  const n = moods.length;
  const side = (choice: Choice): ShownEffect[] =>
    paper[choice].effects.map((e): ShownEffect => {
      switch (e.type) {
        case 'mood': {
          const deltas = new Array<number>(n).fill(0);
          deltas[e.club] = e.fixed ? e.delta : sizeMood(cfg, moods[e.club], e.delta);
          return { type: 'moods', every: false, deltas };
        }
        case 'money':
          return { type: 'money', amount: sizeMoney(cfg, e.seconds, B, paper.jitter) };
        case 'moneyFixed':
          return { type: 'money', amount: e.amount };
        case 'every':
          return { type: 'moods', every: true, deltas: moods.map((m) => sizeMood(cfg, m, e.delta)) };
        case 'gossipSet':
          return { type: 'gossip', delta: e.to - g.decree.gossip };
        default:
          return e;
      }
    });
  return { sign: side('sign'), refuse: side('refuse'), factors: [], moodsAt: moods.slice(), BAt: B };
}

/**
 * What the desk paper's strip on `side` prints, as data (2.7 "A strip prints"), or null when no
 * paper is on the desk. Built for the skeleton: chips with resulting values (a district chip's from
 * the shares of count.ts, which throws notBuilt until P1b writes it), the approval row, ↩ and
 * affordability. Not yet: the poll title (count.ts `heldAfter`), the club flags (`closeDistricts`),
 * the notes (boycott and scandal warnings, "Short by 240 · about 9 s" with advice.ts `about`), the
 * factor initials: P1a.
 */
export function stripOf(cfg: DecreeConfig, g: DecreeGame, side: Choice): Strip | null {
  const desk = g.decree.desk;
  if (!desk || desk.type !== 'paper') return null;
  const shown = desk.shown[side];
  const moods = g.decree.moods;
  const after = moods.slice();
  const chips: Chip[] = [];
  let cost = 0;
  for (const e of shown) {
    if (e.type === 'moods') {
      e.deltas.forEach((dlt, gi) => (after[gi] += dlt));
      if (e.every) {
        const from = decreeParams(cfg, g).approval;
        const to = decreeParams(cfg, { ...g, decree: { ...g.decree, moods: moods.map((m, gi) => m + e.deltas[gi]) } }).approval;
        chips.push({ kind: 'every', deltas: e.deltas, approvalFrom: from, approvalTo: to, wide: true });
      } else {
        const gi = e.deltas.findIndex((x) => x !== 0);
        if (gi >= 0) chips.push({ kind: 'club', club: gi, from: moods[gi], to: moods[gi] + e.deltas[gi], flag: false, wide: false });
      }
    } else if (e.type === 'money') {
      if (e.amount < 0) cost -= e.amount;
      chips.push({ kind: 'money', amount: e.amount, wide: false });
    } else if (e.type === 'gossip') {
      chips.push({ kind: 'gossip', from: g.decree.gossip, to: g.decree.gossip + e.delta, max: decreeParams(cfg, g).gossipMax, wide: false });
    } else if (e.type === 'level') {
      const lv = g.decree.ministries[e.ministry]?.level ?? 0;
      chips.push({ kind: 'level', ministry: e.ministry, from: lv, to: lv + 1, wide: false });
    } else if (e.type === 'appoint') chips.push({ kind: 'appoint', minister: e.minister, wide: false });
    else if (e.type === 'endBoycott') chips.push({ kind: 'endBoycott', club: e.club, wide: false });
    else if (e.type === 'endScandal') chips.push({ kind: 'endScandal', wide: false });
    else if (e.type === 'district') {
      // The district's share in hundredths before and after the campaign points (count.ts, P1b).
      const C = g.decree.campaign?.C ?? [];
      const Cafter = C.map((c, d) => (d === e.district ? c + e.points : c));
      chips.push({ kind: 'district', district: e.district, from: shares(cfg, g)[e.district], to: shares(cfg, g, { C: Cafter })[e.district], wide: true });
    }
  }
  const from = decreeParams(cfg, g).approval;
  const to = decreeParams(cfg, { ...g, decree: { ...g.decree, moods: after } }).approval;
  return { side, poll: null, approval: { from, to }, followUp: desk.paper[side].followUp !== null, chips, notes: [], factors: [], affordable: side === 'refuse' || g.cash >= cost, label: desk.paper[side].label };
}
