/**
 * The term, the call, the run-up, the count and the result (2.10, 2.14's new thing a term, 2.17 at a
 * call and at a new term, D15, D17, D25, D26). Package P1b (docs/design/office-build-plan.md).
 *
 * Ribbon "Day 41/80 · NR 9/10 · Lv 52/80"; from day C the button "Call the election · poll 4 of 5".
 * Calling needs day ≥ C and phase governing; at day D the run-up starts by itself. The run-up (phase
 * campaign): a pending take-back commits, a slip goes back, the desk paper if ordinary and the waiting
 * ordinary papers go aside (draw.ts `setAside`, P1a); a settlement or front page stays on top and is
 * decided first; a scandal running ends (the term's last day, 2.8); the K campaign papers arrive τ apart
 * (the first at once, the rest by the tick, draw.ts `drawCampaignPaper`), then the rally (`drawRally`).
 * Campaign papers and the rally are not days and move no counter. No ad and no product from the call
 * to the end of election night (grants.ts). `countVotes` (once every run-up paper is decided) counts:
 * the poll number for number (count.ts), phase count (election night); `endElectionNight` ends it,
 * phase result. After a win NR += O × (3 + districts held on merit) + 2 × O for a sweep on merit (D26),
 * losses 0; after a loss NR += O, losses + 1, "Acting", the rival resigns over a hobby and the office's
 * next rival stands (the old one joins the former opponents); terms served + 1 either way. Then
 * "Another term here" (`chooseAfterResult('stay')`, the only choice after a loss) or the move
 * (move.ts). A new term in the seat: day 0; moods halfway back to 50 (rounded toward 50); gossip and
 * campaign points 0; the aside papers back to the tray (`restoreAside`); then any boycott whose club is
 * now 25 or more ends (strike.ts `endStrike`, P1a); a monument offered (5.8); the term's new thing
 * (twists.ts `newThingAt`: its twists run for the term, a Grand Project opens to buy).
 *
 * SEAM: `countDay` and `checkTermEnd` are steps 2 and 4 of 2.17 (decide.ts `commitItem`, P1a).
 */
import { callDay, count, currentRival, HELD_AT, meritOf, meritShares, poll } from './count';
import { commitPending } from './decide';
import { drawCampaignPaper, landNext, restoreAside, setAside } from './draw';
import { canMoveUp, moveUp } from './move';
import { decreeParams } from './params';
import { endScandal } from './scandal';
import { endStrike } from './strike';
import { newThingAt, newThingLabel } from './twists';
import type { DecreeConfig, DecreeEvent, DecreeGame, MoveChoice, ResultSheet, TermResult, TermRibbon } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** 2.17 step 2 for a day paper: day += 1 and decisions ever += 1 (what follow-ups and returns count), days ever + 1. Built. */
export function countDay(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  void cfg;
  const d = g.decree;
  return withDecree(g, { day: d.day + 1, stats: { ...d.stats, decisions: d.stats.decisions + 1, daysEver: d.stats.daysEver + 1 } });
}

/** 2.17 step 4: at day D the run-up starts by itself (the first campaign paper waits in the tray for step 5). Built. */
export function checkTermEnd(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  const d = g.decree;
  if (d.phase !== 'governing' || d.day < cfg.decree.offices[d.office].termDays) return g;
  return startRunUp(cfg, g, g.stats.playSeconds, events, true);
}

/** Whether the election may be called now (2.10: day ≥ C, phase governing). Built. */
export function canCall(cfg: DecreeConfig, g: DecreeGame): boolean {
  return g.decree.phase === 'governing' && g.decree.day >= callDay(cfg, g);
}

/** The run-up starts (2.10, 2.17 "At a call"); `byItself` at day D, inside a commit (the first campaign paper then lands at 2.17 step 5). */
function startRunUp(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[], byItself: boolean): DecreeGame {
  let x = g;
  if (!byItself) {
    // A tap elsewhere: the take-back window ends (2.7).
    if (x.decree.pending) x = commitPending(cfg, x, clock, events);
    if (x.decree.phase !== 'governing') return x;
    events.push({ type: 'callElection' });
  }
  if (x.decree.desk?.type === 'slip') {
    events.push({ type: 'slipReturned' });
    x = withDecree(x, { desk: null });
  }
  x = setAside(cfg, x);
  // A scandal running at the term's last day ends (2.8): the call makes this the last day.
  if (x.decree.scandal) x = endScandal(cfg, x, 'term', events);
  const row = cfg.decree.offices[x.decree.office];
  x = withDecree(x, { phase: 'campaign', campaign: { C: new Array<number>(row.districts.length).fill(0), papersLeft: row.campaignPapers, rallyDone: false }, emptySince: null });
  events.push({ type: 'runUpStarted', byItself });
  // The first campaign paper at once (2.17), the next τ later (tick.ts).
  const r = drawCampaignPaper(cfg, x, 0, events);
  const c = r.g.decree.campaign!;
  x = withDecree(r.g, { campaign: { ...c, papersLeft: c.papersLeft - 1 }, tray: [...r.g.decree.tray, r.paper], nextArrivalAt: clock + decreeParams(cfg, r.g).tau });
  if (!byItself && !x.decree.desk && !x.decree.pending) x = landNext(cfg, x, clock, events);
  return x;
}

/** 2.6 `callElection()`: starts the run-up (2.10, 2.17 "At a call"); the same object when not allowed. Built. */
export function callElection(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  if (!canCall(cfg, g)) return g;
  return startRunUp(cfg, g, clock, events, false);
}

/** Whether the votes may be counted now: the run-up's papers all came and were decided, and nothing waits on the desk (2.10, 2.17). Built. */
export function canCount(cfg: DecreeConfig, g: DecreeGame): boolean {
  void cfg;
  const d = g.decree;
  if (d.phase !== 'campaign' || !d.campaign || d.campaign.papersLeft > 0 || !d.campaign.rallyDone) return false;
  if (d.pending || d.desk?.type === 'paper') return false;
  return !d.tray.length;
}

/** NR a count adds (2.10 with D26): a win O × (winBase + held on merit) + sweepBonus × O for a sweep on merit; a loss O. */
export function nrFor(cfg: DecreeConfig, office: number, won: boolean, merit: { held: number; sweep: boolean }): number {
  const O = cfg.decree.offices[office].winWeight;
  const l = cfg.decree.ladder;
  return won ? O * (l.winBase + merit.held) + (merit.sweep ? l.sweepBonus * O : 0) : O;
}

/**
 * 2.6 `countVotes()`: the count (count.ts `count`: the poll, number for number) into `count`, phase
 * count (election night: the envelopes in announcement order), and the result applied: Name
 * Recognition, losses and disarray, terms served, the rival. The same object when not allowed. Built.
 */
export function countVotes(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  if (!canCount(cfg, g)) return g;
  const d = g.decree;
  const result = count(cfg, g);
  const merit = meritOf(cfg, g);
  const won = result.won;
  const nrGained = nrFor(cfg, d.office, won, merit);
  events.push({ type: 'countStarted' });
  for (const k of result.order) events.push({ type: 'envelope', district: k, held: result.districts[k].held });
  events.push({ type: won ? 'majority' : 'defeat' });
  const cabinet = Object.fromEntries(Object.entries(d.cabinet).map(([id, seat]) => [id, { ...seat, termsServed: seat.termsServed + 1 }]));
  const rivals = cfg.decree.offices[d.office].rivals;
  const rival = currentRival(cfg, g);
  const tr: TermResult = { won, nrGained, meritHeld: merit.held, meritSweep: merit.sweep, carried: won ? merit.carried : [], resigned: won ? null : rival.id };
  // After a loss the winner resigns over a hobby and the office's next rival stands; the old one joins the former opponents.
  const rivalIndex = won ? d.rivalIndex : d.rivalIndex.map((r, o) => (o === d.office ? (r + 1) % Math.max(1, rivals.length) : r));
  const formerOpponents = won || d.formerOpponents.includes(rival.id) ? d.formerOpponents : [...d.formerOpponents, rival.id];
  // Nothing is bought on election night: a slip still lying on the desk goes back (a save from before slipsComeNow).
  if (d.desk?.type === 'slip') events.push({ type: 'slipReturned' });
  return withDecree(g, {
    phase: 'count',
    desk: d.desk?.type === 'slip' ? null : d.desk,
    count: result,
    result: tr,
    nr: d.nr + nrGained,
    losses: won ? 0 : d.losses + 1,
    cabinet,
    rivalIndex,
    formerOpponents,
    nextArrivalAt: null,
    emptySince: null,
    stats: { ...d.stats, elections: d.stats.elections + 1, wins: d.stats.wins + (won ? 1 : 0) },
  });
}

/** The end of election night (its last envelope, a tap that skips, Android back): phase result. The same object outside phase count. Built. */
export function endElectionNight(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  void cfg;
  return g.decree.phase === 'count' ? withDecree(g, { phase: 'result' }) : g;
}

/**
 * 2.6 `chooseAfterWin(moveUp | stay)` and the only choice after a loss ('stay'): a new term here
 * (`newTerm`) or the move (move.ts `moveUp`, only when allowed). The same object when not allowed. Built.
 */
export function chooseAfterResult(cfg: DecreeConfig, g: DecreeGame, choice: MoveChoice, now: number, events: DecreeEvent[]): DecreeGame {
  if (g.decree.phase !== 'result') return g;
  if (choice === 'moveUp') return canMoveUp(cfg, g) ? moveUp(cfg, g, now, events) : g;
  return newTerm(cfg, g, events);
}

/** A mood at a new term, moved mood.termReset of the way back to the start (2.10: halfway; D38's third lever; rounded toward 50). */
export function halfwayBack(cfg: DecreeConfig, m: number): number {
  const c = cfg.decree.mood.start;
  return c + Math.trunc((m - c) * (1 - cfg.decree.mood.termReset));
}

/** This term's monument offer (5.8): from mayor term 2 on, the first monument not yet bought, or null. */
export function monumentFor(cfg: DecreeConfig, office: number, term: number, bought: readonly string[]): string | null {
  if (office === 0 && term < cfg.decree.vanity.fromMayorTerm) return null;
  return cfg.decree.deck.monuments.find((m) => !bought.includes(m.id))?.id ?? null;
}

/** A new term in the same seat (2.10 "A new term in the seat", 2.17 "At a new term"). Built. */
export function newTerm(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  const d = g.decree;
  const term = d.term + 1;
  const thing = newThingAt(cfg, d.office, term);
  const ministries = thing.grandProject ? [...d.ministries, { open: false, level: 0 }] : d.ministries;
  let x = withDecree(g, {
    term,
    presTerms: d.office === 2 ? d.presTerms + 1 : d.presTerms,
    day: 0,
    phase: 'governing',
    moods: d.moods.map((m) => halfwayBack(cfg, m)),
    gossip: 0,
    quiet: 0,
    campaign: null,
    count: null,
    result: null,
    ministries,
    twists: thing.twists,
    twistIndex: term,
    monumentOffer: monumentFor(cfg, d.office, term, d.vanity),
    picketsThisTerm: [],
    adsUsed: {},
    appSlotsUsed: 0,
    signedThisTerm: 0,
    slipOffered: false,
    nextArrivalAt: null,
    emptySince: null,
  });
  x = restoreAside(cfg, x);
  // Then any boycott whose club is now at endsAt or more ends (2.17 "At a new term").
  for (let gi = 0; gi < x.decree.strikes.length; gi++) {
    if (x.decree.strikes[gi] && x.decree.moods[gi] >= cfg.decree.boycott.endsAt) {
      const club = gi;
      const before = x;
      x = endStrike(cfg, before, club, 'term', events);
    }
  }
  // A club the reset lifted to rearmAt is armed again (2.8 "it re-arms at 30", by any means).
  const armed = x.decree.armed.map((a, gi) => a || (!x.decree.strikes[gi] && x.decree.moods[gi] >= cfg.decree.boycott.rearmAt));
  if (armed.some((a, gi) => a !== x.decree.armed[gi])) x = withDecree(x, { armed });
  events.push({ type: 'termStarted', term, office: d.office, next: newThingLabel(thing) });
  const clock = x.stats.playSeconds;
  const room = x.decree.tray.length < cfg.decree.desk.trayCap;
  x = withDecree(x, { nextArrivalAt: room ? clock + decreeParams(cfg, x).tau : null });
  return x.decree.desk ? x : landNext(cfg, x, clock, events);
}

/** The term ribbon's values (4.1). Built. */
export function termRibbon(cfg: DecreeConfig, g: DecreeGame): TermRibbon {
  const d = g.decree;
  const row = cfg.decree.offices[d.office];
  const next = cfg.decree.offices[d.office + 1];
  const p = poll(cfg, g);
  return {
    acting: d.losses > 0,
    office: d.office,
    day: d.day,
    termDays: row.termDays,
    nr: d.nr,
    nrTarget: next?.stand?.nr ?? null,
    record: decreeParams(cfg, g).record,
    recordTarget: next?.stand?.record ?? null,
    callFrom: callDay(cfg, g),
    canCall: canCall(cfg, g),
    poll: { held: p.held, of: p.of },
  };
}

/** The result sheet after the count (2.10, D26), on election night and after it (phases count and result), else null. Built. */
export function resultSheet(cfg: DecreeConfig, g: DecreeGame): ResultSheet | null {
  const d = g.decree;
  if ((d.phase !== 'result' && d.phase !== 'count') || !d.count || !d.result) return null;
  const r = d.result;
  const next = cfg.decree.offices[d.office + 1];
  const record = decreeParams(cfg, g).record;
  const missing = r.won && next?.stand && (d.nr < next.stand.nr || record < next.stand.record) ? { nr: d.nr, nrNeeded: next.stand.nr, record, recordNeeded: next.stand.record } : null;
  const resigned = r.resigned ? cfg.decree.offices[d.office].rivals.find((x) => x.id === r.resigned) : undefined;
  return {
    count: d.count,
    nrGained: r.nrGained,
    canMoveUp: canMoveUp(cfg, g),
    missing,
    next: newThingLabel(newThingAt(cfg, d.office, d.term + 1)),
    resignation: resigned ? resigned.resignation : null,
    won: r.won,
    meritHeld: r.meritHeld,
    carried: r.carried,
  };
}

/**
 * The term's own fields of a loaded save (types.ts, the rules-term block: `result`, `appSlotsUsed`,
 * `cashAnchor`), checked after create.ts `reconcileDecree` copied them from `raw` (they are fields of
 * `freshDecree`, so a saved `result: null` comes back as null and a reload is byte for byte); never
 * throws. A result is kept only while the phase is count or result and has its fields (else null; on
 * election night or the result sheet a broken one is rebuilt from the count, and without a count the
 * next term starts); an
 * application slot count is a whole number from 0 to the slots of a term (else 0); a cash anchor only
 * with every field a finite number (else null: the tick anchors anew, and tick.ts `anchorOf` keeps a
 * saved anchor only while it still matches the state exactly). Built.
 */
export function reconcileTerm(cfg: DecreeConfig, g: DecreeGame, raw: unknown): DecreeGame {
  try {
    const d = (raw as { decree?: Record<string, unknown> } | null)?.decree;
    // A save the reconcile could not read started afresh: nothing of it is copied back.
    if (!d || typeof d !== 'object' || d.seed !== g.decree.seed || d.office !== g.decree.office) return g;
    const patch: Partial<DecreeGame['decree']> = {};
    const slots = d.appSlotsUsed;
    patch.appSlotsUsed = typeof slots === 'number' && Number.isFinite(slots) ? Math.max(0, Math.min(cfg.decree.forms.application.days.length, Math.round(slots))) : 0;
    const r = d.result as Partial<TermResult> | null | undefined;
    const live = g.decree.phase === 'count' || g.decree.phase === 'result';
    patch.result =
      live && r && typeof r === 'object' && typeof r.won === 'boolean' && typeof r.nrGained === 'number' && typeof r.meritHeld === 'number'
        ? { won: r.won, nrGained: r.nrGained, meritHeld: r.meritHeld, meritSweep: !!r.meritSweep, carried: Array.isArray(r.carried) ? r.carried.filter((x): x is number => typeof x === 'number') : [], resigned: typeof r.resigned === 'string' ? r.resigned : null }
        : null;
    // On election night or the result sheet with a broken result, it is rebuilt from the count (the NR it gave is already in `nr`);
    // without a count the night cannot be shown, and the next term in the seat starts.
    const cnt = g.decree.count;
    if (live && !cnt) return newTerm(cfg, withDecree(g, { ...patch, result: null }), []);
    if (live && !patch.result && cnt) {
      // The NR is already in `nr`; the sheet's "+n NR" is what the count gave (nrFor on the saved run-up, as countVotes computed it).
      // Merit leaves the disarray out, so the moods and campaign points the count left behind give it again; "carried" is the count's held minus merit's.
      const merit = meritOf(cfg, g);
      const ms = meritShares(cfg, g);
      const carried = cnt.won ? cnt.districts.filter((x) => x.held && (ms[x.district] ?? 0) < HELD_AT).map((x) => x.district) : [];
      patch.result = { won: cnt.won, nrGained: nrFor(cfg, g.decree.office, cnt.won, merit), meritHeld: merit.held, meritSweep: merit.sweep, carried, resigned: cnt.won ? null : cnt.rival };
    }
    const a = d.cashAnchor as Record<string, unknown> | null | undefined;
    const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
    patch.cashAnchor = a && typeof a === 'object' && fin(a.at) && fin(a.cash) && fin(a.run) && fin(a.life) && fin(a.book) && fin(a.I) ? { at: a.at, cash: a.cash, run: a.run, life: a.life, book: a.book, I: a.I } : null;
    return withDecree(g, patch);
  } catch {
    return g;
  }
}
