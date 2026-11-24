/**
 * Time away as a closed form (2.15, `EngineMode.offline`). Package P1b (docs/design/office-build-plan.md).
 *
 * t = (now − max(lastSavedAt, stats.clockHigh))/1000, t′ = min(t, cap) (away.capHours, + away.longLunchHours
 * with Long Lunch, D11: 4 h, 6 h). I_away = a × (I with the boycott and "Say nothing" factors frozen as
 * they stand: their counters do not move, the income they cut stays cut). earnings = roundDibs(I_away ×
 * t′), PAID WHEN COMPUTED (the store's `paysOnCompute` seam grants them in the same update). Papers:
 * n = min(free places, floor((t′ + awayCarry)/arrivalSeconds)), drawn in order on return with the
 * unchanged state (draw.ts `fillTray`: a reload re-rolls nothing, as the state it draws from is the saved
 * one), none during a run-up, the count or the result. awayCarry keeps the remainder while time limits n
 * and is 0 once the places run out (the tray full stops the arrival clock, as 2.5 has it while played:
 * nothing banks toward an arrival there is no place for). nextArrivalAt is re-phased within one τ of the
 * play clock (the play clock did not move while away; the arrival clock stops when the away papers fill
 * the tray, and starts again τ after a place frees, 2.5). Unchanged while away: moods, gossip, every
 * counter, the day, the poll, cooldowns, the Standing Order (it never acts while away: nothing here
 * buys). A pending take-back left by a killed app commits first, at the play clock (2.7: it commits
 * "when the app goes to the background"); that commit is a decision the player made, not away time.
 * Every absence, however short, follows these rules (`catchUpSeconds: 0`).
 *
 * The clock guard is the shared one: the store's clampClock keeps `stats.clockHigh` (the latest wall
 * time the game ran at), so a clock moved forward, back and forward pays the hours once.
 *
 * Cross-check (10.2): `awayByEvents` steps the same absence event to event (each away arrival at its
 * own time into a free place, cash per segment) and must equal the closed form at 30 s, 299 s, 301 s
 * and 4 h (offline.test.ts).
 *
 * SEAM, what it calls of P1a: decide.ts `commitPending`, draw.ts `fillTray` and `drawNext`, params.ts
 * `decreeParams`, `roundDibs`. The store pays `earnings` itself (src/state/store.ts grantCash, the
 * `paysOnCompute` seam), never commitCash.
 */
import { commitPending } from './decide';
import { drawNext, fillTray } from './draw';
import { freePlaces, owns } from './grants';
import { decreeParams, roundDibs } from './params';
import type { AwayReport, DecreeConfig, DecreeEvent, DecreeGame } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** What every away computation of one absence shares: the seconds away, the capped seconds, the cap and the away rate. */
export interface AwayPlan {
  /** Seconds away by the wall clock (0 when the clock went back or a timestamp is broken). */
  seconds: number;
  /** min(seconds, cap). */
  effective: number;
  cap: number;
  /** I_away = a × I (frozen factors). */
  rate: number;
  /** Whether away papers may arrive (phase governing). */
  papers: boolean;
}

/** The away cap in seconds (2.15, D11): capHours, + longLunchHours with the Long Lunch product. Built. */
export function awayCap(cfg: DecreeConfig, g: DecreeGame): number {
  const a = cfg.decree.away;
  return (a.capHours + (owns(g, cfg.decree.products.longLunch) ? a.longLunchHours : 0)) * 3600;
}

/** The plan of an absence ending at wall time `now` (ms), on the state as it is (a pending take-back already committed). Built. */
export function awayPlan(cfg: DecreeConfig, g: DecreeGame, now: number): AwayPlan {
  const from = Math.max(g.lastSavedAt, g.stats.clockHigh ?? 0);
  const raw = (now - from) / 1000;
  const seconds = Number.isFinite(raw) && raw > 0 ? raw : 0;
  const cap = awayCap(cfg, g);
  return { seconds, effective: Math.min(seconds, cap), cap, rate: decreeIncome(cfg, g), papers: g.decree.phase === 'governing' };
}

/** How many away papers arrive and the carry left (2.15): n = min(free, floor((t′ + carry)/interval)); carry the remainder while time limits n, 0 when the places run out. Built. */
export function awayArrivals(cfg: DecreeConfig, g: DecreeGame, effective: number): { n: number; carry: number } {
  const d = g.decree;
  if (d.phase !== 'governing') return { n: 0, carry: d.awayCarry };
  const every = cfg.decree.away.arrivalSeconds;
  const free = freePlaces(cfg, g);
  const banked = effective + (Number.isFinite(d.awayCarry) && d.awayCarry > 0 ? d.awayCarry : 0);
  const due = Math.floor(banked / every);
  if (due >= free) return { n: free, carry: 0 };
  return { n: due, carry: banked - due * every };
}

/** nextArrivalAt after the away papers (2.15 "re-phased within one τ"): null while the tray is full or outside governing, else at most τ after the play clock. */
function rephase(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  const d = g.decree;
  if (d.phase !== 'governing') return g;
  const clock = g.stats.playSeconds;
  const tau = decreeParams(cfg, g).tau;
  const full = d.tray.length >= cfg.decree.desk.trayCap;
  const next = full ? null : d.nextArrivalAt === null ? clock + tau : Math.min(Math.max(d.nextArrivalAt, clock), clock + tau);
  return next === d.nextArrivalAt ? g : withDecree(g, { nextArrivalAt: next });
}

/** The away line of the report (deck `away`, writer 5), by the absence: deterministic, no random site. */
function awayLine(cfg: DecreeConfig, g: DecreeGame, effective: number): string | null {
  const lines = cfg.decree.deck.away;
  if (!lines.length) return null;
  return lines[(g.decree.stats.daysEver + Math.floor(effective / 60)) % lines.length].text;
}

/** The papers in the tray and on the desk now (the report's "10 visitors are waiting"). */
function waitingNow(g: DecreeGame): number {
  return g.decree.tray.length + (g.decree.desk?.type === 'paper' ? 1 : 0);
}

/** A pending take-back left by a killed app commits first, at the play clock (2.7, 2.15). */
function settlePending(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  return g.decree.pending ? commitPending(cfg, g, g.stats.playSeconds, events) : g;
}

/**
 * The away rules for an absence ending at wall time `now` (ms): the earnings (the store pays them in
 * the same update, `paysOnCompute`), the state with the away papers in the tray and the carry, and the
 * report. An absence of no time (the clock went back, a broken timestamp) returns the same state, zero
 * and no report. Built.
 */
export function decreeOffline(cfg: DecreeConfig, g: DecreeGame, now: number): { seconds: number; earnings: number; game: DecreeGame; report: AwayReport | null } {
  const first = awayPlan(cfg, g, now);
  if (!(first.seconds > 0)) return { seconds: 0, earnings: 0, game: g, report: null };
  const events: DecreeEvent[] = [];
  const s0 = settlePending(cfg, g, events);
  const plan = s0 === g ? first : awayPlan(cfg, s0, now);
  const earnings = roundDibs(cfg, plan.rate * plan.effective);
  const { n, carry } = awayArrivals(cfg, s0, plan.effective);
  const filled = n > 0 ? fillTray(cfg, s0, n, s0.stats.playSeconds, events) : s0;
  const arrived = n > 0 ? waitingNow(filled) - waitingNow(s0) : 0;
  const game = rephase(cfg, carry === filled.decree.awayCarry ? filled : withDecree(filled, { awayCarry: carry }));
  const report: AwayReport = { seconds: plan.effective, capped: plan.seconds > plan.cap, earnings, arrived, waiting: waitingNow(game), line: awayLine(cfg, s0, plan.effective) };
  return { seconds: plan.effective, earnings, game, report };
}

/**
 * The same absence stepped event to event with no player (the cross-check of 10.2): cash accrues
 * at I_away segment by segment, and each away arrival comes at its own time (interval − carry, then
 * every interval) into a free place, drawn by draw.ts `drawNext` on the state as it stands; when the
 * places run out the arrival clock stops (carry 0). Earnings through roundDibs once, at the end.
 * Built (a test and bot tool, never the store's path).
 */
export function awayByEvents(cfg: DecreeConfig, g: DecreeGame, now: number): { seconds: number; earnings: number; game: DecreeGame; raw: number } {
  const first = awayPlan(cfg, g, now);
  if (!(first.seconds > 0)) return { seconds: 0, earnings: 0, game: g, raw: 0 };
  const events: DecreeEvent[] = [];
  let s = settlePending(cfg, g, events);
  const plan = s === g ? first : awayPlan(cfg, s, now);
  const every = cfg.decree.away.arrivalSeconds;
  const clock = s.stats.playSeconds;
  let t = 0;
  let raw = 0;
  let carry = s.decree.awayCarry > 0 ? s.decree.awayCarry : 0;
  let stopped = !plan.papers;
  while (!stopped) {
    if (freePlaces(cfg, s) <= 0) {
      stopped = true;
      break;
    }
    const at = t + (every - carry);
    if (at > plan.effective) break;
    raw += plan.rate * (at - t);
    t = at;
    carry = 0;
    const next = drawNext(cfg, s, clock, events);
    if (next === s) {
      stopped = true;
      break;
    }
    s = next;
    if (freePlaces(cfg, s) <= 0) stopped = true;
  }
  raw += plan.rate * (plan.effective - t);
  const left = !plan.papers ? s.decree.awayCarry : stopped ? 0 : carry + (plan.effective - t);
  const game = rephase(cfg, left === s.decree.awayCarry ? s : withDecree(s, { awayCarry: left }));
  return { seconds: plan.effective, earnings: roundDibs(cfg, raw), game, raw };
}

/** I_away (EngineMode.income): a × I with the boycott and "Say nothing" factors as they stand. Built. */
export function decreeIncome(cfg: DecreeConfig, g: DecreeGame): number {
  return cfg.decree.away.rate * decreeParams(cfg, g).I;
}

/** I (EngineMode.activeIncome). Built. */
export function decreeActiveIncome(cfg: DecreeConfig, g: DecreeGame): number {
  return decreeParams(cfg, g).I;
}

const isReport = (x: unknown): x is AwayReport => !!x && typeof x === 'object' && typeof (x as AwayReport).seconds === 'number' && typeof (x as AwayReport).earnings === 'number';

/** Two reports of one absence as one (a resume while the report is still open): seconds, earnings and arrivals add, waiting and the line are the newer's. Built. */
export function mergeAwayReports(older: unknown, newer: unknown): unknown {
  if (!isReport(older)) return newer ?? older;
  if (!isReport(newer)) return older;
  return { seconds: older.seconds + newer.seconds, capped: older.capped || newer.capped, earnings: older.earnings + newer.earnings, arrived: older.arrived + newer.arrived, waiting: newer.waiting, line: newer.line ?? older.line } satisfies AwayReport;
}

/** Whether a report that earned nothing is still worth showing: visitors arrived while away. Built. */
export function awayReportAlone(report: unknown): boolean {
  return isReport(report) && report.arrived > 0;
}
