/**
 * Sizing and the strip (2.7 "Sizing", "A strip prints"). Package P1a (docs/design/office-build-plan.md).
 *
 * ONE MOMENT OF FREEZING (D23): every number a paper prints is fixed when it LANDS. At landing, the
 * twist and minister factors (the ONE Factors object, ./twists.ts `deskFactors`) multiply the base
 * effects (2.17: before sizing, never after; validator: every effective |Δ| ≤ 10); money =
 * roundDibs(|seconds| × factor × B_landing × j) with the jitter j drawn at the draw (`sizeMoney`), a
 * requisition's price = roundDibs(the level's raw live price × factor); each mood effect is frozen into
 * `shown`: f+ = min(1.4, (100 − m)/50) for a gain, f− = min(1.4, m/50) for a loss,
 * shown = sign(Δ) × max(1, round(|Δ| × f)) (half away from zero), 0 with no headroom (`sizeMood`, the
 * ONE function of the f± rule: its parameters are `mood.capF` and the 50 of the rule); a FIXED mood
 * effect (a settlement's +10, 2.8) is copied unsized. The lemma (tested): with |Δ| ≤ 10, m + shown
 * stays in 0 to 100 (a settlement's fixed +10 starts below 20); the commit asserts clamps = 0 (H1).
 * Gossip gains are frozen up to the limit (gossip never passes G_max); "set to 0" as the change from
 * the gossip at landing.
 *
 * SEAM: `freezeShown` is the only producer of `Shown` (create.ts and draw.ts land papers with it);
 * `stripOf` is what the desk prints (a screen never computes a value of a strip), derived from `shown`
 * only; it asks count.ts (P1b) `heldAfter` for the poll title, `closeDistricts` for the flags and
 * `shares` for a district chip ("HT 48.6 → 52.6"), and advice.ts (P1b) `about` for "Short by 240 ·
 * about 9 s" (each with a stand-in while it is not built: no poll row, no flag, no "about").
 */
import { about } from './advice';
import { closeDistricts, heldAfter, shares } from './count';
import { standIn } from './notBuilt';
import { approvalOf, clubIndex, decreeParams, EPS, factorOn, levelCostRaw, officeOf, roundDibs } from './params';
import type { Chip, Choice, ClubIx, DecreeConfig, DecreeGame, Effect, FactorTarget, FactorValue, Factors, Paper, Shown, ShownEffect, Strip, StripNote } from './types';

/**
 * The frozen mood change of base Δ `delta` at mood `m` (2.7 "Sizing"): f = min(capF, headroom/50),
 * shown = sign(Δ) × max(1, round(|Δ| × f)), half away from zero, 0 with no headroom. Exact in integer
 * arithmetic for whole Δ (no floating error at halves). Built.
 */
export function sizeMood(cfg: DecreeConfig, m: number, delta: number): number {
  if (delta === 0) return 0;
  const room = delta > 0 ? 100 - m : m;
  if (room <= 0) return 0;
  const h = Math.min(cfg.decree.mood.capF * 50, room);
  const a = Math.abs(delta);
  // |Δ| × h / 50 rounded half up: floor((|Δ| × h + 25) / 50) for whole numbers; EPS for the rest.
  const size = Number.isInteger(a) && Number.isInteger(h) ? Math.floor((a * h + 25) / 50) : Math.floor((a * h) / 50 + 0.5 + EPS);
  return Math.sign(delta) * Math.max(1, size);
}

/**
 * A paper's money at landing (D23): roundDibs(|seconds| × B × j), at least money.minimum, with the sign
 * of `seconds` (negative a cost). `seconds` already carries its factors. Built.
 */
export function sizeMoney(cfg: DecreeConfig, seconds: number, B: number, jitter: number): number {
  if (seconds === 0) return 0;
  return Math.sign(seconds) * Math.max(cfg.decree.money.minimum, roundDibs(cfg, Math.abs(seconds) * B * jitter));
}

/** The served club of a form's ministry (null for ministry 0 and the Grand Projects). */
function formClub(cfg: DecreeConfig, g: DecreeGame, paper: Paper): ClubIx | null {
  if (paper.ministry === null) return null;
  const gi = clubIndex(cfg, g.decree.office, officeOf(cfg, g.decree.office).ministries[paper.ministry]?.club ?? null);
  return gi >= 0 ? gi : null;
}

/** Which factor target a paper's money answers to (2.9, 2.14): fees, ribbons, settlements, requisitions, the run-up. */
function moneyTarget(cfg: DecreeConfig, g: DecreeGame, paper: Paper): { target: FactorTarget; club: ClubIx | null } | null {
  switch (paper.kind) {
    case 'requisition':
      return { target: 'requisition.money', club: formClub(cfg, g, paper) };
    case 'ribbon':
      return { target: 'ribbon.money', club: formClub(cfg, g, paper) };
    case 'strike':
      return { target: 'settlement.money', club: paper.petitioner };
    case 'campaign':
    case 'rally':
      return { target: 'campaign.money', club: null };
    default:
      return paper.archetype === 'fee' ? { target: 'fee.money', club: paper.petitioner } : null;
  }
}

const NEUTRAL: FactorValue = { mul: 1, add: 0, sources: [] };
const isNeutral = (v: FactorValue) => Math.abs(v.mul - 1) < EPS && Math.abs(v.add) < EPS;
const fmt = (x: number) => String(Math.round(x * 100) / 100);

/**
 * Both outcomes of `paper` frozen at landing in state `g` with the ONE Factors object `factors` (2.7,
 * D23, 2.17 "before sizing, never after"): money from B now, moods by f± from the moods now, gossip,
 * a form's level `from` now, the "Say nothing" papers and factor, the boycott's papers, the
 * application's return; the initials of every minister factor that touched a side. Built.
 */
export function freezeShown(cfg: DecreeConfig, g: DecreeGame, paper: Paper, factors: Factors): Shown {
  const d = g.decree;
  const c = cfg.decree;
  const moods = d.moods;
  const p = decreeParams(cfg, g, factors);
  const B = p.B;
  const n = moods.length;
  const initials: Shown['factors'] = [];
  const touch = (side: Choice, v: FactorValue) => {
    if (isNeutral(v)) return;
    for (const s of v.sources) {
      if (!s.initials) continue;
      const text = Math.abs(v.mul - 1) >= EPS ? `${s.initials} ×${fmt(v.mul)}` : `${s.initials} ${v.add > 0 ? '+' : ''}${fmt(v.add)}`;
      if (!initials.some((x) => x.text === text && x.side === side)) initials.push({ initials: s.initials, text, side });
    }
  };
  const money = moneyTarget(cfg, g, paper);
  const clampDelta = (x: number) => Math.max(-c.mood.maxDelta, Math.min(c.mood.maxDelta, x));
  const moodFactor = (side: Choice, delta: number): FactorValue => {
    if (paper.kind !== 'ribbon' || delta <= 0) return NEUTRAL;
    const v = factorOn(factors, 'ribbon.mood', formClub(cfg, g, paper));
    touch(side, v);
    return v;
  };
  const side = (choice: Choice): ShownEffect[] =>
    paper[choice].effects.map((e: Effect): ShownEffect => {
      switch (e.type) {
        case 'mood': {
          const deltas = new Array<number>(n).fill(0);
          if (e.fixed) deltas[e.club] = e.delta;
          else {
            const v = moodFactor(choice, e.delta);
            deltas[e.club] = sizeMood(cfg, moods[e.club], clampDelta(e.delta * v.mul + v.add));
          }
          return { type: 'moods', every: false, deltas };
        }
        case 'every': {
          const v = moodFactor(choice, e.delta);
          const delta = clampDelta(e.delta * v.mul + v.add);
          return { type: 'moods', every: true, deltas: moods.map((m) => sizeMood(cfg, m, delta)) };
        }
        case 'money': {
          const v = money ? factorOn(factors, money.target, money.club) : NEUTRAL;
          touch(choice, v);
          return { type: 'money', amount: sizeMoney(cfg, e.seconds * v.mul + Math.sign(e.seconds) * v.add, B, paper.jitter) };
        }
        case 'moneyFixed':
          return { type: 'money', amount: e.amount };
        case 'levelCost': {
          const v = factorOn(factors, 'requisition.money', formClub(cfg, g, paper));
          touch(choice, v);
          const raw = levelCostRaw(cfg, g, e.ministry);
          return { type: 'money', amount: Number.isFinite(raw) ? -roundDibs(cfg, raw * v.mul) : 0 };
        }
        case 'gossip':
          return { type: 'gossip', delta: e.delta > 0 ? Math.min(e.delta, Math.max(0, p.gossipMax - d.gossip)) : Math.max(e.delta, -d.gossip) };
        case 'gossipSet':
          return { type: 'gossip', delta: e.to - d.gossip };
        case 'level':
          return { type: 'level', ministry: e.ministry, from: d.ministries[e.ministry]?.level ?? 0 };
        case 'sayNothing': {
          const cut = factorOn(factors, 'sayNothing.cut', null);
          const papers = factorOn(factors, 'sayNothing.papers', null);
          touch(choice, cut);
          touch(choice, papers);
          const factor = Math.min(1, Math.max(0, 1 - (1 - c.scandal.sayNothingFactor) * cut.mul - cut.add));
          return { type: 'sayNothing', papers: Math.max(1, Math.round(c.scandal.sayNothingPapers * papers.mul + papers.add)), factor };
        }
        case 'boycottRuns':
          return { type: 'boycottRuns', club: e.club, papers: c.boycott.papers };
        case 'applyAgain':
          return { type: 'applyAgain', minister: e.minister, papers: c.forms.application.returnAfter };
        case 'appoint':
        case 'endBoycott':
        case 'endScandal':
        case 'district':
          return e;
      }
    });
  return { sign: side('sign'), refuse: side('refuse'), factors: initials, moodsAt: moods.slice(), BAt: B };
}

/** The sign cost of a frozen side: the dibs it takes (0 when it pays or costs nothing). */
export function costOf(effects: readonly ShownEffect[]): number {
  return effects.reduce((s, e) => (e.type === 'money' && e.amount < 0 ? s - e.amount : s), 0);
}

/** Why a form would leave with no effect now (2.7 "Forms are checked at commit"): its level moved ('done'), or the cap ('cap'); null while it holds. */
export function formVoid(cfg: DecreeConfig, g: DecreeGame, effects: readonly ShownEffect[]): 'done' | 'cap' | null {
  for (const e of effects) {
    if (e.type !== 'level') continue;
    const m = g.decree.ministries[e.ministry];
    if (m && m.open && m.level >= cfg.decree.ministry.levelCap) return 'cap';
    if (!m || !m.open || m.level !== e.from) return 'done';
  }
  return null;
}

/** The icon of a chip (the art kit's names, src/ui/decree/art/icons.ts). */
const clubIcon = (cfg: DecreeConfig, g: DecreeGame, gi: number) => cfg.decree.clubs.find((x) => x.id === officeOf(cfg, g.decree.office).clubs[gi])?.icon ?? 'art:fx_approval';

/**
 * What the desk paper's strip on `side` prints, as data (2.7 "A strip prints"), or null when no paper
 * is on the desk; everything derives from the frozen `shown`: the title row ("Poll 3 → 4 of 5" when the
 * districts held change, else the approval "62 → 63 %", ↩ when the side schedules a follow-up), the
 * chips with icon ids and resulting values (a flag on a club strong, w ≥ 0.4, in a district within 3
 * points of 50; "every club" as one wide chip; a district chip's shares), the note row (the boycott
 * and scandal warnings first, "Short by … · about … s", what a refusal sets running, a void form),
 * the minister initials, whether the treasury pays it now. Built.
 */
export function stripOf(cfg: DecreeConfig, g: DecreeGame, side: Choice): Strip | null {
  const desk = g.decree.desk;
  if (!desk || desk.type !== 'paper') return null;
  const d = g.decree;
  const c = cfg.decree;
  const shown = desk.shown[side];
  const moods = d.moods;
  const p = decreeParams(cfg, g);
  const n = moods.length;
  const nd = officeOf(cfg, d.office).districts.length;
  const moodDeltas = new Array<number>(n).fill(0);
  const points = new Array<number>(nd).fill(0);
  const isVoid = formVoid(cfg, g, desk.shown.sign);
  for (const e of shown) {
    if (e.type === 'moods') e.deltas.forEach((x, gi) => (moodDeltas[gi] += x));
    else if (e.type === 'district') points[e.district] += e.points;
  }
  if (isVoid) {
    moodDeltas.fill(0);
    points.fill(0);
  }
  const flagged = new Set(standIn(closeDistricts, () => closeDistricts(cfg, g), () => []).flatMap((x) => x.clubs));
  const chips: Chip[] = [];
  let gossipTo = d.gossip;
  for (const e of shown) {
    switch (e.type) {
      case 'moods':
        if (e.every) chips.push({ kind: 'every', deltas: e.deltas.slice(), approvalFrom: p.approval, approvalTo: approvalOf(p.W, moods.map((m, gi) => m + e.deltas[gi])), wide: true, icon: 'art:fx_every' });
        else {
          const gi = e.deltas.findIndex((x) => x !== 0);
          if (gi >= 0) chips.push({ kind: 'club', club: gi, from: moods[gi], to: moods[gi] + e.deltas[gi], flag: flagged.has(gi), wide: false, icon: clubIcon(cfg, g, gi) });
        }
        break;
      case 'money':
        chips.push({ kind: 'money', amount: e.amount, wide: false, icon: 'art:fx_coin' });
        break;
      case 'gossip':
        if (e.delta !== 0) chips.push({ kind: 'gossip', from: d.gossip, to: d.gossip + e.delta, max: p.gossipMax, wide: false, icon: 'art:fx_gossip' });
        gossipTo += e.delta;
        break;
      case 'level':
        chips.push({ kind: 'level', ministry: e.ministry, from: e.from, to: e.from + 1, wide: false, icon: 'art:fx_level' });
        break;
      case 'appoint':
        chips.push({ kind: 'appoint', minister: e.minister, wide: false, icon: 'art:fx_minister' });
        break;
      case 'endBoycott':
        chips.push({ kind: 'endBoycott', club: e.club, wide: false, icon: 'art:fx_boycott_end' });
        break;
      case 'endScandal':
        chips.push({ kind: 'endScandal', wide: false, icon: 'art:fx_scandal_end' });
        break;
      case 'district': {
        const C = d.campaign?.C ?? new Array<number>(nd).fill(0);
        const before = shares(cfg, g)[e.district];
        const after = shares(cfg, g, { C: C.map((x, k) => (k === e.district ? x + e.points : x)) })[e.district];
        chips.push({ kind: 'district', district: e.district, from: before, to: after, wide: true, icon: 'art:fx_district' });
        break;
      }
      default:
        break;
    }
  }
  // The title row: the poll when the districts held change, else the approval.
  const zeros = (k: number) => new Array<number>(k).fill(0);
  const pollRow = standIn(
    heldAfter,
    () => {
      const from = heldAfter(cfg, g, zeros(n), zeros(nd));
      const to = heldAfter(cfg, g, moodDeltas, points);
      return from !== to ? { from, to, of: nd } : null;
    },
    () => null,
  );
  // The note row: warnings first.
  const notes: StripNote[] = [];
  if (!isVoid) {
    moodDeltas.forEach((x, gi) => {
      if (x < 0 && moods[gi] + x < c.boycott.below && moods[gi] >= c.boycott.below && d.armed[gi] && !d.strikes[gi]) notes.push({ kind: 'boycott', club: gi });
    });
    if (gossipTo >= p.gossipMax && d.gossip < p.gossipMax && !d.scandal) notes.push({ kind: 'scandal', gossip: gossipTo, max: p.gossipMax });
  }
  const cost = costOf(shown);
  const affordable = side === 'refuse' || g.cash + EPS >= cost;
  if (!affordable) {
    const by = Math.max(1, roundDibs(cfg, cost - g.cash));
    const I = p.I;
    notes.push({ kind: 'short', by, about: I > 0 ? standIn(about, () => about((cost - g.cash) / I), () => null) : null });
  }
  for (const e of shown) {
    if (e.type === 'sayNothing') notes.push({ kind: 'sayNothing', papers: e.papers, factor: e.factor });
    else if (e.type === 'boycottRuns') notes.push({ kind: 'boycottRuns', club: e.club, papers: e.papers });
    else if (e.type === 'applyAgain') notes.push({ kind: 'applyAgain', papers: e.papers });
  }
  if (isVoid) notes.push({ kind: 'void', reason: isVoid });
  return {
    side,
    poll: isVoid ? null : pollRow,
    approval: { from: p.approval, to: approvalOf(p.W, moods.map((m, gi) => m + moodDeltas[gi])) },
    followUp: desk.paper[side].followUp !== null,
    chips,
    notes,
    factors: desk.shown.factors.filter((x) => !x.side || x.side === side).map((x) => x.text),
    affordable,
    label: desk.paper[side].label,
    void: isVoid,
  };
}
