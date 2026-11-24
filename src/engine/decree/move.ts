/**
 * The bigger office (2.12, `EngineMode.prestige` and `canPrestige`). Package P1b
 * (docs/design/office-build-plan.md).
 *
 * `canPrestige` is true only on the result sheet after a win meeting both requirements (Name
 * Recognition and the record of the office below; a win carried by disarray counts as the win, D26).
 * Resets: treasury to the transition fund (30 s of the old B, through commitCash 'transition', the old
 * cash set aside first as every mode's reset does); the new office's ministries (ministry 0 at level
 * 1); clubs at 50 + min(5, floor(NR/20)); gossip, boycotts, scandal, day, campaign, losses; tray and
 * asideTray back to the deck unseen (draw.ts `returnToDeck`, P1a: their follow-ups due again, their
 * applications undelivered). Carries: Name Recognition; ministers (each runs the new office's
 * ministry of their club: ministers.ts reads the club, nothing to move); monuments; scrapbook and seen
 * texts; due follow-ups (sized when they land, D23); purchases (the shared entitlements, untouched);
 * the Office wall with the old town's photograph and levels. Then the new office's first paper
 * (draw.ts `scriptedPaper` slot 1, `landPaper`) and its arrival clock.
 *
 * The two lists are DATA (`MOVE_RESETS`, `MOVE_STAYS`): every field of the decree state is in exactly
 * one of them (move.test.ts holds the state against them field by field, so a field added later
 * cannot slip through unlisted), and the move sheet shows their item ids (strings name them).
 *
 * SEAM, what it calls of P1a: create.ts `freshDecree`, draw.ts `returnToDeck`, `scriptedPaper`,
 * `landNext`/`landPaper`, params.ts `decreeParams`, `commitCash`, `roundDibs`.
 */
import { candidates, recordShort, scoreOf, about } from './advice';
import { freshDecree } from './create';
import { landPaper, returnToDeck, scriptedPaper } from './draw';
import { commitCash, decreeParams, roundDibs } from './params';
import { monumentFor } from './term';
import type { DecreeConfig, DecreeEvent, DecreeGame, DecreeState, MoveSheet, OfficeIx } from './types';

/** One item of the move sheet's lists: its id (strings.ts names it) and the decree fields it covers (`cash` and `runEarnings` are the shared fields). */
export interface MoveListItem {
  id: string;
  fields: readonly (keyof DecreeState | 'cash' | 'runEarnings')[];
}

/**
 * "Resets" (2.12): each field takes the new office's fresh value (create.ts `freshDecree`), but for
 * `cash` (the transition fund), `moods` (50 + min(5, floor(NR/20))), `monumentOffer` (the new term's
 * offer, 5.8) and `nextArrivalAt` / `desk` / `emptySince` (the first paper of the office lands).
 */
export const MOVE_RESETS: readonly MoveListItem[] = [
  { id: 'treasury', fields: ['cash', 'runEarnings', 'cashAnchor'] },
  { id: 'office', fields: ['office', 'term', 'presTerms', 'twistIndex', 'twists', 'monumentOffer', 'adsUsed', 'appSlotsUsed', 'picketsThisTerm', 'signedThisTerm'] },
  { id: 'ministries', fields: ['ministries', 'ribbonsDue'] },
  { id: 'moods', fields: ['moods'] },
  { id: 'gossip', fields: ['gossip', 'quiet'] },
  { id: 'boycotts', fields: ['strikes', 'armed'] },
  { id: 'scandal', fields: ['scandal'] },
  { id: 'day', fields: ['day', 'phase', 'count', 'result'] },
  { id: 'campaign', fields: ['campaign'] },
  { id: 'losses', fields: ['losses'] },
  { id: 'tray', fields: ['tray', 'asideTray', 'desk', 'pending', 'nextArrivalAt', 'emptySince', 'slipOffered'] },
];

/**
 * "Stays" (2.12): each field keeps its value after the tray went back to the deck (`returnToDeck`),
 * but for `wall` (the old office's photograph is added) and what the new office's first paper itself
 * records when it is drawn (`draws`, `seen`, `followUps`, `scriptedDone`, `stats`: the draw's own
 * bookkeeping, 2.7).
 */
export const MOVE_STAYS: readonly MoveListItem[] = [
  { id: 'nr', fields: ['nr'] },
  { id: 'ministers', fields: ['cabinet', 'applicationsDelivered', 'applicationReturns'] },
  { id: 'monuments', fields: ['vanity'] },
  { id: 'scrapbook', fields: ['clippings', 'seen', 'frameBag', 'notesSeen', 'drawerCount'] },
  { id: 'followUps', fields: ['followUps'] },
  { id: 'purchases', fields: ['standingOrder', 'cooldowns'] },
  { id: 'wall', fields: ['wall', 'formerOpponents', 'rivalIndex', 'face'] },
  { id: 'record', fields: ['seed', 'draws', 'stats', 'scriptedDone', 'awayCarry'] },
];

/** The next office's requirements and where the player stands (2.10 "what is missing"). */
export function moveRequirements(cfg: DecreeConfig, g: DecreeGame): { nr: number; nrNeeded: number; record: number; recordNeeded: number } | null {
  const next = cfg.decree.offices[g.decree.office + 1];
  if (!next?.stand) return null;
  return { nr: g.decree.nr, nrNeeded: next.stand.nr, record: decreeParams(cfg, g).record, recordNeeded: next.stand.record };
}

/** Whether the move up may happen now: the result sheet after a win, both requirements met, an office above. Built. */
export function canMoveUp(cfg: DecreeConfig, g: DecreeGame): boolean {
  const d = g.decree;
  if (d.phase !== 'result' || !d.result?.won || d.office >= 2) return false;
  const r = moveRequirements(cfg, g);
  return !!r && r.nr >= r.nrNeeded && r.record >= r.recordNeeded;
}

/** The transition fund of a move from `g` (2.12): transitionFund seconds of the old B, through roundDibs. */
export function transitionFund(cfg: DecreeConfig, g: DecreeGame): number {
  return roundDibs(cfg, cfg.decree.ladder.transitionFund * decreeParams(cfg, g).B);
}

/** The moods of a new office (2.12): 50 + min(moveMoodCap, floor(NR / moveMoodPerNr)) for every club. */
export function moveMood(cfg: DecreeConfig, nr: number): number {
  const l = cfg.decree.ladder;
  return Math.min(100, cfg.decree.mood.start + Math.min(l.moveMoodCap, Math.floor(nr / l.moveMoodPerNr)));
}

/**
 * The state of the move by the two lists, before the new office's first paper is drawn (the move
 * test holds it against MOVE_RESETS and MOVE_STAYS field by field). `now` is wall ms (lastSavedAt).
 * No check: `moveUp` asks `canMoveUp` first. Built.
 */
export function movedState(cfg: DecreeConfig, g: DecreeGame, now: number): DecreeGame {
  const fund = transitionFund(cfg, g);
  const back = returnToDeck(cfg, g);
  const d = back.decree;
  const to = (d.office + 1) as OfficeIx;
  const fresh = freshDecree(cfg, d.seed, to);
  const photo = { office: d.office, terms: d.term, levels: d.ministries.map((m) => (m.open ? m.level : 0)) };
  const decree: DecreeState = {
    ...fresh,
    // Stays.
    seed: d.seed,
    draws: d.draws,
    stats: d.stats,
    scriptedDone: d.scriptedDone,
    awayCarry: d.awayCarry,
    nr: d.nr,
    cabinet: d.cabinet,
    applicationsDelivered: d.applicationsDelivered,
    applicationReturns: d.applicationReturns,
    vanity: d.vanity,
    clippings: d.clippings,
    seen: d.seen,
    frameBag: d.frameBag,
    notesSeen: d.notesSeen,
    drawerCount: d.drawerCount,
    followUps: d.followUps,
    standingOrder: d.standingOrder,
    cooldowns: d.cooldowns,
    wall: [...d.wall, photo],
    formerOpponents: d.formerOpponents,
    rivalIndex: d.rivalIndex,
    face: d.face,
    // Resets that are not the fresh value.
    moods: fresh.moods.map(() => moveMood(cfg, d.nr)),
    monumentOffer: monumentFor(cfg, to, 1, d.vanity),
    appSlotsUsed: 0,
    result: null,
    cashAnchor: null,
  };
  const lastSavedAt = Number.isFinite(now) && now > 0 ? now : back.lastSavedAt;
  // The old treasury is set aside as every mode's reset does (booked 'reset', never a spend or a gain), then the fund enters (H5: 'transition').
  const reset = commitCash({ ...back, runEarnings: 0, prestigeCount: back.prestigeCount + 1, lastSavedAt, decree }, -back.cash, 'reset');
  return commitCash(reset, fund, 'transition');
}

/** The move to the next office (2.12); the same object when not allowed. `now` is wall ms (only lastSavedAt takes it). Built. */
export function moveUp(cfg: DecreeConfig, g: DecreeGame, now: number, events: DecreeEvent[]): DecreeGame {
  if (!canMoveUp(cfg, g)) return g;
  const from = g.decree.office;
  let x = movedState(cfg, g, now);
  const clock = x.stats.playSeconds;
  const first = scriptedPaper(cfg, x, x.decree.office, 1);
  if (first) {
    events.push({ type: 'paperArrived', paper: first.paper.id, toDesk: true });
    x = landPaper(cfg, first.g, first.paper, clock);
  }
  x = { ...x, decree: { ...x.decree, nextArrivalAt: clock + decreeParams(cfg, x).tau, emptySince: x.decree.desk ? null : clock } };
  events.push({ type: 'moved', from, to: x.decree.office });
  events.push({ type: 'termStarted', term: 1, office: x.decree.office, next: null });
  return x;
}

/**
 * When the new office's income passes the old (2.12 "about 5 min", from advice): from the moved state,
 * advice's best purchase (2.16's score, no paper on the desk to keep back) is bought as soon as cash
 * pays it, until I passes the old I; null when it never does within 500 purchases. Built.
 */
export function passesIn(cfg: DecreeConfig, g: DecreeGame, moved: DecreeGame): number | null {
  const target = decreeParams(cfg, g).I;
  let s: DecreeGame = { ...moved, decree: { ...moved.decree, desk: null, tray: [], pending: null } };
  let t = 0;
  for (let k = 0; k < 500; k++) {
    const p = decreeParams(cfg, s);
    if (p.I >= target) return t;
    const cs = candidates(cfg, s, p);
    if (!cs.length || !(p.I > 0)) return null;
    const short = recordShort(cfg, s, p);
    let best = cs[0];
    let bs = Infinity;
    for (const c of cs) {
      const sc = scoreOf(cfg, c, s.cash, 0, p.I, short);
      if (sc < bs) [best, bs] = [c, sc];
    }
    const wait = Math.max(0, (best.price - s.cash) / p.I);
    t += wait;
    const i = (best.purchase as { ministry: number }).ministry;
    const ministries = s.decree.ministries.map((m, j) => (j !== i ? m : best.purchase.type === 'open' ? { open: true, level: 1 } : { open: true, level: m.level + 1 }));
    s = { ...s, cash: s.cash + wait * p.I - best.price, decree: { ...s.decree, ministries } };
  }
  return null;
}

/** The move sheet (2.12): Resets, Stays, Next, the fund, and when the new income passes the old; null unless the move is allowed now. Built. */
export function moveSheet(cfg: DecreeConfig, g: DecreeGame): MoveSheet | null {
  if (!canMoveUp(cfg, g)) return null;
  const moved = movedState(cfg, g, g.lastSavedAt);
  const t = passesIn(cfg, g, moved);
  return {
    from: g.decree.office,
    to: moved.decree.office,
    resets: MOVE_RESETS.map((x) => x.id),
    stays: MOVE_STAYS.map((x) => x.id),
    passesIn: t === null ? null : about(Math.max(1, t)),
    transitionFund: transitionFund(cfg, g),
  };
}
