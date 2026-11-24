/**
 * Decide, take back, commit, and the order of operations of 2.17. Package P1a
 * (docs/design/office-build-plan.md).
 *
 * Sign is refused while cash < cost (the SAME object comes back); refuse is always possible and free.
 * A signed DAY paper rests on the out-tray (`pending`, until clock + takeBackSeconds), the desk empty;
 * a tap takes it back unchanged (`takeBack`, the very object that was on the desk, H3). It commits
 * (`commitPending`):
 * - when its 2 s pass: tick.ts (P1b) calls `commitPending` once the play clock reaches `pending.until`;
 * - at the next action: every action of this package (`decide`, `buy`, `raise`, `openMinistry`,
 *   `buyVanity`) commits it first itself; a tap elsewhere on the desk calls
 *   `decreeActions.commitPending()` (the desk, P6);
 * - when the app goes to the background: P8's AppState listener calls `decreeActions.commitPending()`
 *   (src/ui/decree/back.ts), and offline.ts (P1b) commits one a killed app left before the away rules.
 * Refusals, campaign papers, the rally and slips commit at once. Commit applies `shown` exactly (H1:
 * no second computation; a mood clamp is counted in `stats.clamps`, which the lemma keeps at 0) and
 * runs 2.17; the next paper lands after it. Forms are checked at commit: a requisition or slip whose
 * level is no longer the printed one leaves as "Already done" with no effect, one at the cap as "No
 * longer needed" (the void covers both sides of the form). Every purchase that is not a paper goes
 * through slips.ts `buy`, which keeps the reserve (2.6, D16).
 *
 * SEAM: `commitItem` IS 2.17: one function calling named steps of both rules packages, in order.
 * Each step is owned by the file named beside it; neither side reorders it without the other.
 */
import { landNext } from './draw';
import { scheduleFollowUp } from './followup';
import { appoint, sendAway } from './ministers';
import { standIn } from './notBuilt';
import { commitCash, EPS } from './params';
import { checkScandal, countDownScandal, endScandal } from './scandal';
import { costOf, formVoid } from './size';
import { buy, canBuy, slipFor } from './slips';
import { checkStrikes, countDownStrikes, endStrike } from './strike';
import { checkTermEnd, countDay } from './term';
import { DAY_KINDS, type Choice, type DecreeConfig, type DecreeEvent, type DecreeGame, type DeskItem } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/**
 * The player's choice on the desk item at play clock `clock` (2.6 `decide(choice)`): the same object
 * when nothing is on the desk or a sign is refused (cash short; a slip above the reserve); a signed day
 * paper goes to `pending`; everything else commits now (`commitItem`). A paper resting in its take-back
 * window commits first. Built.
 */
export function decide(cfg: DecreeConfig, g: DecreeGame, choice: Choice, clock: number, events: DecreeEvent[]): DecreeGame {
  const item = g.decree.desk;
  if (!item) return g;
  if (item.type === 'slip') {
    if (choice === 'sign' && !slipVoid(cfg, g, item) && canBuy(cfg, g, item.slip.purchase, item.slip.price) !== null) return g;
    return commitItem(cfg, g, item, choice, clock, events);
  }
  if (choice === 'sign' && g.cash + EPS < costOf(item.shown.sign) && !formVoid(cfg, g, item.shown.sign)) return g;
  if (choice === 'sign' && isDay(item)) {
    events.push({ type: 'signed', paper: item.paper.id });
    return withDecree(g, { desk: null, pending: { item, until: clock + cfg.decree.desk.takeBackSeconds } });
  }
  events.push({ type: choice === 'sign' ? 'signed' : 'studied', paper: item.paper.id });
  return commitItem(cfg, g, item, choice, clock, events);
}

/** A tap on the out-tray inside the 2 s: the pending paper back on the desk exactly as it was (the same objects, H3); the same state when none is pending or its time passed. Built. */
export function takeBack(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  void cfg;
  const p = g.decree.pending;
  if (!p || g.decree.desk || clock > p.until) return g;
  events.push({ type: 'takenBack', paper: p.item.paper.id });
  return withDecree(g, { desk: p.item, pending: null });
}

/** The pending paper commits now (its 2 s passed, the next action, a tap elsewhere, the app to the background); the same object when none is pending. Built. */
export function commitPending(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  const p = g.decree.pending;
  if (!p) return g;
  return commitItem(cfg, g, p.item, 'sign', clock, events);
}

/** Why a slip would leave with no effect now: its level moved or its ministry opened ('done'), or the cap ('cap'). */
function slipVoid(cfg: DecreeConfig, g: DecreeGame, item: DeskItem & { type: 'slip' }): 'done' | 'cap' | null {
  const pu = item.slip.purchase;
  if (pu.type === 'monument') return g.decree.monumentOffer === pu.monument && !g.decree.vanity.includes(pu.monument) ? null : 'done';
  const m = g.decree.ministries[pu.ministry];
  if (!m) return 'done';
  if (pu.type === 'open') return m.open ? 'done' : null;
  if (m.open && m.level >= cfg.decree.ministry.levelCap) return 'cap';
  return !m.open || m.level !== item.slip.drawnLevel ? 'done' : null;
}

/**
 * Applies `shown` of `choice` exactly (H1): moods, cash through commitCash (source `paper`), gossip,
 * levels (through slips.ts `buy`'s level step), appointments and returns (ministers.ts `appoint` /
 * `sendAway`), exits, campaign points, "Say nothing", the boycott's run; a follow-up's clipping of the
 * chosen side into `clippings`. A stale or capped form leaves with no effect (a `formVoid` event). A
 * slip: up buys it at the printed price (`buy`), down puts it back. Built.
 */
export function applyShown(cfg: DecreeConfig, g: DecreeGame, item: DeskItem, choice: Choice, events: DecreeEvent[]): DecreeGame {
  if (item.type === 'slip') {
    if (choice === 'refuse') {
      events.push({ type: 'slipReturned' });
      return g;
    }
    const v = slipVoid(cfg, g, item);
    if (v) {
      events.push({ type: 'formVoid', paper: 'slip', reason: v });
      return g;
    }
    const s = buy(cfg, g, item.slip.purchase, item.slip.price, events);
    return s === g ? g : withDecree(s, { stats: { ...s.decree.stats, slipsTaken: s.decree.stats.slipsTaken + 1 } });
  }
  const paper = item.paper;
  const shown = item.shown[choice];
  const v = formVoid(cfg, g, item.shown.sign);
  if (v) {
    events.push({ type: 'formVoid', paper: paper.id, reason: v });
    return g;
  }
  let s = g;
  for (const e of shown) {
    switch (e.type) {
      case 'money':
        s = commitCash(s, e.amount, 'paper');
        break;
      case 'moods': {
        let clamps = 0;
        const moods = s.decree.moods.map((m, gi) => {
          const x = m + (e.deltas[gi] ?? 0);
          if (x < 0 || x > 100) clamps++;
          return Math.max(0, Math.min(100, x));
        });
        s = withDecree(s, { moods, stats: { ...s.decree.stats, clamps: s.decree.stats.clamps + clamps } });
        break;
      }
      case 'gossip':
        if (e.delta !== 0) {
          const to = Math.max(0, s.decree.gossip + e.delta);
          events.push({ type: 'gossip', from: s.decree.gossip, to });
          s = withDecree(s, { gossip: to });
        }
        break;
      case 'level':
        s = levelStep(cfg, s, e.ministry, events);
        break;
      case 'appoint': {
        const m = e.minister;
        s = standIn(appoint, () => appoint(cfg, s, m, events), () => appointStandIn(cfg, s, m, events));
        break;
      }
      case 'applyAgain': {
        const m = e.minister;
        const papers = e.papers;
        s = standIn(sendAway, () => sendAway(cfg, s, m), () => withDecree(s, { applicationReturns: [...s.decree.applicationReturns.filter((r) => r.minister !== m), { minister: m, dueAt: s.decree.stats.decisions + 1 + papers }] }));
        break;
      }
      case 'endBoycott':
        if (s.decree.strikes[e.club]) s = endStrike(cfg, s, e.club, 'settled', events);
        break;
      case 'endScandal':
        if (s.decree.scandal) s = endScandal(cfg, s, 'apology', events);
        break;
      case 'district': {
        const n = s.decree.campaign?.C.length ?? 0;
        const campaign = s.decree.campaign ?? { C: [], papersLeft: 0, rallyDone: false };
        const C = Array.from({ length: Math.max(n, e.district + 1) }, (_, k) => (campaign.C[k] ?? 0) + (k === e.district ? e.points : 0));
        s = withDecree(s, { campaign: { ...campaign, C } });
        break;
      }
      case 'sayNothing':
        s = withDecree(s, { scandal: { papersLeft: e.papers, factor: e.factor, waiting: true } });
        break;
      case 'boycottRuns': {
        const st = s.decree.strikes[e.club];
        if (st) s = withDecree(s, { strikes: s.decree.strikes.map((x, gi) => (gi === e.club && x ? { ...x, papersLeft: e.papers, waiting: true } : x)) });
        break;
      }
    }
  }
  if (paper.clipping) {
    const headline = paper.clipping[choice];
    events.push({ type: 'clipping', headline });
    s = withDecree(s, { clippings: [...s.decree.clippings, headline] });
  }
  return s;
}

/** A level +1 through the one purchase path's level step (a requisition already paid its printed price). */
function levelStep(cfg: DecreeConfig, g: DecreeGame, ministry: number, events: DecreeEvent[]): DecreeGame {
  return buy(cfg, g, { type: 'level', ministry }, 0, events, { free: true });
}

/** The stand-in of ministers.ts `appoint` while it is not built: the cabinet seat and the delivery. */
function appointStandIn(cfg: DecreeConfig, g: DecreeGame, minister: string, events: DecreeEvent[]): DecreeGame {
  const m = cfg.decree.ministers.find((x) => x.id === minister);
  if (!m || g.decree.cabinet[minister]) return g;
  events.push({ type: 'appointed', minister });
  const d = g.decree;
  return withDecree(g, { cabinet: { ...d.cabinet, [minister]: { club: m.club, termsServed: 0 } }, applicationsDelivered: d.applicationsDelivered.includes(minister) ? d.applicationsDelivered : [...d.applicationsDelivered, minister] });
}

/** The stand-in of term.ts `countDay` while it is not built: day += 1, decisions ever += 1. */
function countDayStandIn(g: DecreeGame): DecreeGame {
  const st = g.decree.stats;
  return withDecree(g, { day: g.decree.day + 1, stats: { ...st, decisions: st.decisions + 1, daysEver: st.daysEver + 1 } });
}

/** Whether an item counts as a day (2.17 step 2): a paper of a day kind; never a campaign paper, a rally or a slip. Built. */
export function isDay(item: DeskItem): boolean {
  return item.type === 'paper' && DAY_KINDS.includes(item.paper.kind);
}

/**
 * The commit of `item` with `choice` and everything 2.17 runs after it, in this order:
 * (0) the item leaves the desk (or the out-tray), with its counts (signed, refused, the drawer);
 * (1) apply `shown` (`applyShown`), schedule any follow-up (followup.ts);
 * (2) for a day paper only: day += 1 and decisions ever += 1 (term.ts `countDay`, P1b), boycott
 *     counters −1 (strike.ts), the "Say nothing" counter −1, quiet and gossip decay (scandal.ts);
 * (3) the boycott check, then the gossip and scandal check (strike.ts, scandal.ts);
 * (4) at day D the run-up starts (term.ts `checkTermEnd`, P1b);
 * (5) after a paper, D18: when a paper waits, no slip has been offered since the last decided paper
 *     and a purchase is affordable above the reserve, the slip lands first (slips.ts `slipFor`);
 *     else the next paper lands (draw.ts `landNext`), or the slip's 1.0 s starts on an empty desk.
 * Built.
 */
export function commitItem(cfg: DecreeConfig, g: DecreeGame, item: DeskItem, choice: Choice, clock: number, events: DecreeEvent[]): DecreeGame {
  // (0)
  const d0 = g.decree;
  const st0 = d0.stats;
  const isPaper = item.type === 'paper';
  let s = withDecree(g, {
    desk: d0.desk === item ? null : d0.desk,
    pending: d0.pending?.item === item ? null : d0.pending,
    drawerCount: d0.drawerCount + (isPaper && choice === 'refuse' ? 1 : 0),
    slipOffered: isPaper ? false : d0.slipOffered,
    stats: isPaper ? { ...st0, signed: st0.signed + (choice === 'sign' ? 1 : 0), refused: st0.refused + (choice === 'refuse' ? 1 : 0) } : st0,
  });
  if (isPaper) events.push({ type: 'committed', paper: item.paper.id, choice });
  // (1)
  s = applyShown(cfg, s, item, choice, events);
  if (item.type === 'paper') s = scheduleFollowUp(cfg, s, item, choice, events);
  // (2)
  if (isDay(item)) {
    const gained = item.type === 'paper' && !formVoid(cfg, g, item.shown.sign) && item.shown[choice].some((e) => e.type === 'gossip' && e.delta > 0);
    const before = s;
    s = standIn(countDay, () => countDay(cfg, before), () => countDayStandIn(before));
    s = countDownStrikes(cfg, s, events);
    s = countDownScandal(cfg, s, gained, events);
  }
  // (3)
  s = checkStrikes(cfg, s, events);
  s = checkScandal(cfg, s, events);
  // (4)
  const atEnd = s;
  s = standIn(checkTermEnd, () => checkTermEnd(cfg, atEnd, events), () => atEnd);
  // (5)
  const d = s.decree;
  if (isPaper && !d.desk && !d.pending && d.tray.length && !d.slipOffered && d.phase === 'governing') {
    const slip = slipFor(cfg, s);
    if (slip) {
      events.push({ type: 'slipArrived' });
      return withDecree(s, { desk: { type: 'slip', slip, landedAt: clock }, slipOffered: true, emptySince: null });
    }
  }
  return landNext(cfg, s, clock, events);
}
