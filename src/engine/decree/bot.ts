/**
 * The balance bots of 8.2 on the real engine, event to event (8.1 step 4; WEB_ONLY: the web presets
 * are built from its states, scripts/content/decree-bot.ts runs it in Node). Owned by the bot
 * engineer (docs/design/office-build-plan.md), written against the public interface
 * src/engine/decree.ts only.
 *
 * THE RULE OF THIS FILE: a bot acts ONLY through what a screen or the app can do: it decides the desk
 * item (`decide`, the flick), takes back (`takeBack`), commits the take-back by a tap elsewhere
 * (`commitPending`), raises in the Ledger (`raise`, `openMinistry`, `buyVanity`), calls the election
 * (`canCall`, `callElection`), counts (`countVotes`), chooses after the result (the shared prestige =
 * `moveUp`, or `chooseAfterResult('stay')`), switches the Standing Order, watches an ad (`canWatchAd`,
 * `grantAd`), and lets the app clock run (`advanceDecree`, stepped to `nextStop`) or the app close and
 * resume (`decreeOffline`, paid on compute as the store does: 2.15). What it READS is what the screens
 * read: `stripOf`, `poll`, `shares` (the poll board's numbers), `decreeParams` (the top bar and the
 * poll's mixes), `advice` / `goalLine`, `resultSheet`. If a bot could do something a player cannot,
 * the measurement would be worthless. Measurement code (H8's re-evaluation in earlier states, the
 * away probes on copies) reads more, and never changes the run.
 *
 * Hand model (8.2): a decision `hand` s after landing (6 s; also 4 and 9 s), plus the 2 s take-back
 * rest after a sign (committed by a tap elsewhere 1 ms before the rest ends, so a sign's commit is a
 * pure call whose cash change is exactly what the strip printed); a slip 1.5 s; a sheet 3 s; election
 * night 12 s.
 *
 * THE REFERENCE READER (D27) is 8.2's formula as written, its constants fixed and REPORTED, never
 * tuned (`READER_CONSTANTS`): V(o) = money/B + 0.012 × ΔA/M(A) × H × (I/B)
 *   + Σ_d 60 × Δshare_d × max(0, 1 − |share_d − 50|/8) × (day/D) − 10 × Δgossip − 120 × [scandal]
 *   − 120 × [each boycott] + 60 × [ends a boycott] + Δrate × H/B + 300 × [appoints],
 * ΔA = Σ_g W_g × shown_g, Δshare_d from the poll's own shares (count.ts `shares`, D25's huff
 * included, so a campaign point counts as the count will), H = min(600, τ × (D − day)). It takes the
 * higher V; when short it waits if the shortfall is ≤ 20 s of I and V_sign − V_refuse ≥ 15, else
 * refuses; it takes every slip; it calls on the first allowed day with a majority on the poll (D17);
 * it moves up when allowed. The rule order is the prototype's (`proto/sim/bots.py` `Reader`).
 * Beside it (D27): the misreader (flips one day paper in ten, seeded) and the casual reader (the
 * larger number on each strip). Habits (only day-paper choices differ): always-sign, always-refuse,
 * random, money-only, mood-only, happier (the auditor's happier-club habit). Buying: no-buy,
 * goal-follower. Sessions: passive, check-in, idle, ad-everything. Adversaries: the reader plus one
 * habit (`ADVERSARY`).
 *
 * Every measurement of 8.3 and 8.4 is a pure function over a `Trace` (exported, unit-tested on small
 * synthetic traces); `evaluate(trace)` gives one row per target; `acrossSeeds(summaries)` the targets
 * that need many seeds (H6's handover, H9, H10, H12, the tension aims).
 */
import { decreeEngineMode } from '../decreeMode';
import { rngMix4 } from '../rng';
import type { GameState } from '../types';
import * as R from '../decree';
import type { Choice, ClubIx, DecreeConfig, DecreeEvent, DecreeGame, DeskItem, OfficeIx, Paper, Purchase, Strip } from './types';

// ============================================================================================
// the bots, the hand
// ============================================================================================

/** The bots of 8.2, by group. */
export const BOTS = {
  /** 1. The reference: 8.2's V(o) from what the strips print (D27). */
  reference: ['reader'],
  /** D27: readers who misread (one paper in ten; the larger number on each strip). */
  readers: ['misreader', 'casual'],
  /** 2. Habits: only day-paper choices differ from the reader. `happier` is the auditor's happier-club habit (D27). */
  habits: ['alwaysSign', 'alwaysRefuse', 'random', 'moneyOnly', 'moodOnly', 'happier'],
  /** 3. Buying habits. */
  buying: ['noBuy', 'goalFollower'],
  /** 4. Sessions. */
  sessions: ['passive', 'checkIn', 'idle', 'adEverything'],
  /** D27: the auditor's other cheap habits, as adversaries of the tuning (the prototype's `abots.py`): reported beside the happier-club habit. */
  cheap: ['signFree', 'noLobby', 'noTrap', 'lowestClub', 'sadder', 'happier30', 'happier70'],
  /** 5. Adversaries: the reader plus one habit. */
  adversaries: ['clockForward', 'clockBack', 'clockForwardAgain', 'reloadAfterDraw', 'reloadAfterDecision', 'reloadInTakeBack', 'hoardTray', 'quitElectionNight', 'closeDuringEvents', 'away299', 'away301', 'flickBlind'],
} as const;
export type BotId = (typeof BOTS)[keyof typeof BOTS][number];
export const ALL_BOTS: readonly BotId[] = Object.values(BOTS).flat() as BotId[];
export const isBotId = (x: string): x is BotId => (ALL_BOTS as readonly string[]).includes(x);

/** The hand model of 8.2, seconds. */
export const HAND = { decision: 6, fast: 4, slow: 9, takeBackRest: 2, slip: 1.5, sheet: 3, electionNight: 12 } as const;

/** The reference reader's constants (8.2 as written; D27: reported, never tuned). */
export const READER_CONSTANTS = {
  approval: 0.012,
  horizonCap: 600,
  district: 60,
  districtBand: 8,
  gossip: 10,
  scandal: 120,
  boycott: 120,
  endsBoycott: 60,
  appoints: 300,
  waitShortSeconds: 20,
  waitMargin: 15,
  misreadRate: 0.1,
} as const;

/** The passive bot's sessions (8.2: 5 sessions of 8 minutes a day) and the check-in bot's (every 4 h: the tray, then 2 minutes of buying). */
export const SESSIONS = { passiveStarts: [8, 11, 14, 17, 20], passiveMinutes: 8, checkInEvery: 4, checkInBuyMinutes: 2 } as const;

/** Seconds a sign rests before the bot's tap elsewhere commits it (the 2 s of 2.7 less 1 ms). */
const REST_TAP = 0.001;

// ============================================================================================
// what a bot sees: the two strips as numbers
// ============================================================================================

/** One strip as the bots score it: every value derives from `stripOf` and the poll's shares. */
export interface SideView {
  side: Choice;
  /** The money chip (negative a cost), 0 when none. */
  money: number;
  /** Mood change per club of the office (club chips and the every-club chip). */
  clubDeltas: number[];
  /** Club chips carrying a flag (strong in a district within 3 points of 50). */
  flagged: boolean[];
  /** ΔA = Σ_g W_g × shown_g (unrounded) and the printed approval row. */
  dA: number;
  approvalFrom: number;
  approvalTo: number;
  /** The printed title row (districts held before and after; equal when no poll row prints). */
  heldFrom: number;
  heldTo: number;
  /** Δshare_d in share points (the poll's shares after this strip minus now). */
  dShares: number[];
  /** Gossip gained (0 for the apology's "to 0"). */
  gossipGain: number;
  warnScandal: boolean;
  warnBoycott: number;
  endsBoycott: boolean;
  endsScandal: boolean;
  appoints: boolean;
  /** A level chip: Δrate × m_N × V of that level (dibs per second), else 0. */
  rateGain: number;
  isLevel: boolean;
  affordable: boolean;
  /** The cash the sign side asks (0 for a refuse). */
  cost: number;
}

/** The desk paper as a bot sees it, with the context the reader's formula needs. */
export interface PaperView {
  kind: Paper['kind'];
  archetype: Paper['archetype'];
  petitioner: ClubIx | null;
  other: ClubIx | null;
  moods: number[];
  sign: SideView;
  refuse: SideView;
  ctx: { B: number; I: number; M: number; H: number; day: number; D: number; cash: number; shares0: number[] };
}

const pct = (hundredths: number) => hundredths / 100;

/** The view of one strip in state `g` (the strip is the rules' `stripOf`). */
export function sideView(cfg: DecreeConfig, g: DecreeGame, strip: Strip, shares0: readonly number[], shown: readonly R.ShownEffect[] = []): SideView {
  const p = R.decreeParams(cfg, g);
  const n = g.decree.moods.length;
  const clubDeltas = new Array<number>(n).fill(0);
  const flagged = new Array<boolean>(n).fill(false);
  let money = 0;
  let gossipGain = 0;
  let rateGain = 0;
  let isLevel = false;
  let endsBoycott = false;
  let endsScandal = false;
  let appoints = false;
  const C = (g.decree.campaign?.C ?? new Array<number>(p.mix.length).fill(0)).slice();
  let points = false;
  for (const e of shown) if (e.type === 'district') ((C[e.district] = (C[e.district] ?? 0) + e.points), (points = true));
  for (const c of strip.chips) {
    if (c.kind === 'club') {
      clubDeltas[c.club] += c.to - c.from;
      if (c.flag) flagged[c.club] = true;
    } else if (c.kind === 'every') c.deltas.forEach((d, gi) => (clubDeltas[gi] += d));
    else if (c.kind === 'money') money += c.amount;
    else if (c.kind === 'gossip') gossipGain += Math.max(0, c.to - c.from);
    else if (c.kind === 'level') {
      isLevel = true;
      const m = g.decree.ministries[c.ministry];
      if (m) rateGain += (R.rateOf(cfg, g.decree.office, c.ministry, { open: true, level: c.to }) - R.rateOf(cfg, g.decree.office, c.ministry, { open: true, level: c.from })) * p.mN * p.V;
    } else if (c.kind === 'appoint') appoints = true;
    else if (c.kind === 'endBoycott') endsBoycott = true;
    else if (c.kind === 'endScandal') endsScandal = true;
  }
  const dA = p.W.reduce((s, w, gi) => s + w * clubDeltas[gi], 0);
  const moodsAfter = g.decree.moods.map((m, gi) => m + clubDeltas[gi]);
  const moved = clubDeltas.some((d) => d !== 0) || points;
  const after = moved ? R.shares(cfg, g, points ? { moods: moodsAfter, C } : { moods: moodsAfter }) : shares0;
  const dShares = shares0.map((s, d) => pct((after[d] ?? s) - s));
  const held0 = shares0.filter((s) => s >= 5000).length;
  return {
    side: strip.side,
    money,
    clubDeltas,
    flagged,
    dA,
    approvalFrom: strip.approval.from,
    approvalTo: strip.approval.to,
    heldFrom: strip.poll ? strip.poll.from : held0,
    heldTo: strip.poll ? strip.poll.to : held0,
    dShares,
    gossipGain,
    warnScandal: strip.notes.some((x) => x.kind === 'scandal'),
    warnBoycott: strip.notes.filter((x) => x.kind === 'boycott').length,
    endsBoycott,
    endsScandal,
    appoints,
    rateGain,
    isLevel,
    affordable: strip.affordable,
    cost: strip.side === 'sign' ? Math.max(0, -money) : 0,
  };
}

/** The view of the desk paper, or null when the desk holds no paper. */
export function paperView(cfg: DecreeConfig, g: DecreeGame): PaperView | null {
  const desk = g.decree.desk;
  if (!desk || desk.type !== 'paper') return null;
  const s = R.stripOf(cfg, g, 'sign');
  const r = R.stripOf(cfg, g, 'refuse');
  if (!s || !r) return null;
  const p = R.decreeParams(cfg, g);
  const shares0 = R.shares(cfg, g);
  const D = R.officeOf(cfg, g.decree.office).termDays;
  const day = g.decree.day;
  const H = Math.min(READER_CONSTANTS.horizonCap, p.tau * Math.max(0, D - day));
  const paper = desk.paper;
  return {
    kind: paper.kind,
    archetype: paper.archetype,
    petitioner: paper.petitioner,
    other: paper.other,
    moods: g.decree.moods.slice(),
    sign: sideView(cfg, g, s, shares0, desk.shown.sign),
    refuse: sideView(cfg, g, r, shares0, desk.shown.refuse),
    ctx: { B: p.B, I: p.I, M: p.multiplier, H, day, D, cash: g.cash, shares0: shares0.map(pct) },
  };
}

/** 8.2's V(o) in seconds of B (D27: as written). Pure. */
export function readerValue(v: SideView, ctx: PaperView['ctx']): number {
  const K = READER_CONSTANTS;
  const B = Math.max(ctx.B, 1e-9);
  let x = v.money / B;
  x += (K.approval * v.dA) / Math.max(ctx.M, 1e-9) * ctx.H * (ctx.I / B);
  const late = ctx.D > 0 ? ctx.day / ctx.D : 0;
  v.dShares.forEach((ds, d) => (x += K.district * ds * Math.max(0, 1 - Math.abs((ctx.shares0[d] ?? 50) - 50) / K.districtBand) * late));
  x -= K.gossip * v.gossipGain;
  if (v.warnScandal) x -= K.scandal;
  x -= K.boycott * v.warnBoycott;
  if (v.endsBoycott) x += K.endsBoycott;
  x += (v.rateGain * ctx.H) / B;
  if (v.appoints) x += K.appoints;
  return x;
}

export type BotChoice = Choice | 'wait';

/** The campaign rule every bot shares (8.2, the prototype's final `campWait` 20): sign when affordable; when short wait up to 20 s of income, else refuse. */
export function campaignChoice(v: PaperView): BotChoice {
  if (v.sign.affordable) return 'sign';
  return v.sign.cost - v.ctx.cash <= READER_CONSTANTS.waitShortSeconds * v.ctx.I ? 'wait' : 'refuse';
}
const isCampaign = (v: PaperView) => v.kind === 'campaign' || v.kind === 'rally';
const signIfAffordable = (v: PaperView, want: boolean): BotChoice => (want && v.sign.affordable ? 'sign' : 'refuse');

/** The reference reader's choice (8.2 rule order). */
export function readerChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  const vs = readerValue(v.sign, v.ctx);
  const vr = readerValue(v.refuse, v.ctx);
  if (vs <= vr) return 'refuse';
  if (v.sign.affordable) return 'sign';
  if (v.sign.cost - v.ctx.cash <= READER_CONSTANTS.waitShortSeconds * v.ctx.I && vs - vr >= READER_CONSTANTS.waitMargin) return 'wait';
  return 'refuse';
}
/** Always-sign: waits up to 20 s of income when short. */
export function alwaysSignChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  if (v.sign.affordable) return 'sign';
  return v.sign.cost - v.ctx.cash <= READER_CONSTANTS.waitShortSeconds * v.ctx.I ? 'wait' : 'refuse';
}
export function alwaysRefuseChoice(v: PaperView): BotChoice {
  return isCampaign(v) ? campaignChoice(v) : 'refuse';
}
/** Money-only: the side with more money (a level is signed when affordable). */
export function moneyOnlyChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  if (v.sign.isLevel) return signIfAffordable(v, true);
  return signIfAffordable(v, v.sign.money > v.refuse.money);
}
/** Mood-only: the side whose printed poll, then approval, is higher. */
export function moodOnlyChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  const better = v.sign.heldTo > v.refuse.heldTo || (v.sign.heldTo === v.refuse.heldTo && v.sign.approvalTo > v.refuse.approvalTo);
  return signIfAffordable(v, better);
}
/** H8's "side whose printed title line looks better": the poll row when either prints one, else approval. */
export function titleLineChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  const pollMoves = v.sign.heldFrom !== v.sign.heldTo || v.refuse.heldFrom !== v.refuse.heldTo;
  return signIfAffordable(v, pollMoves ? v.sign.heldTo > v.refuse.heldTo : v.sign.approvalTo > v.refuse.approvalTo);
}
/** The largest number on a strip (D27's casual reader; the audit's `bignum` rule). */
export function bigNumber(s: SideView, ctx: PaperView['ctx']): number {
  const I = Math.max(ctx.I, 1e-9);
  const cand: number[] = [];
  if (s.money) cand.push(s.money / (10 * I));
  s.clubDeltas.forEach((d) => d !== 0 && cand.push(d));
  if (s.approvalTo !== s.approvalFrom) cand.push(s.approvalTo - s.approvalFrom);
  if (s.heldTo !== s.heldFrom) cand.push(5 * (s.heldTo - s.heldFrom));
  if (s.gossipGain) cand.push(-s.gossipGain);
  if (s.isLevel) cand.push(1);
  if (s.appoints) cand.push(1);
  if (s.endsBoycott) cand.push(10);
  if (!cand.length) return 0;
  return cand.reduce((a, b) => (Math.abs(b) > Math.abs(a) || (Math.abs(b) === Math.abs(a) && b > a) ? b : a));
}
export function casualChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  if (bigNumber(v.sign, v.ctx) > bigNumber(v.refuse, v.ctx)) {
    if (v.sign.affordable) return 'sign';
    if (v.sign.cost - v.ctx.cash <= READER_CONSTANTS.waitShortSeconds * v.ctx.I) return 'wait';
  }
  return 'refuse';
}
/** The auditor's happier-club habit (D27): sign whatever the happier of the two clubs asks; refuse traps and favours; sign forms, treats and apologies. */
export function happierChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  if (v.archetype === 'vanity' || v.archetype === 'basket' || v.archetype === 'favour') return 'refuse';
  if (v.kind === 'scandal') return signIfAffordable(v, true);
  const pair = v.archetype !== null && PAIR.has(v.archetype);
  if (pair && v.petitioner !== null && v.other !== null) return signIfAffordable(v, v.moods[v.petitioner] >= v.moods[v.other]);
  return signIfAffordable(v, true);
}

const PAIR = new Set(['project', 'swap', 'fee', 'committee', 'biggerStudy']);
const signOrWait = (v: PaperView): BotChoice => (v.sign.affordable ? 'sign' : v.sign.cost - v.ctx.cash <= READER_CONSTANTS.waitShortSeconds * v.ctx.I ? 'wait' : 'refuse');
/** Sign everything that costs no money; refuse the rest. */
export function signFreeChoice(v: PaperView): BotChoice {
  return isCampaign(v) ? campaignChoice(v) : v.sign.money >= 0 ? signIfAffordable(v, true) : 'refuse';
}
/** Refuse the lobbyists (baskets and their favours); sign the rest, waiting like always-sign. */
export function noLobbyChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  return v.archetype === 'basket' || v.archetype === 'favour' ? 'refuse' : signOrWait(v);
}
/** Refuse baskets, favours and vanity; sign the rest. */
export function noTrapChoice(v: PaperView): BotChoice {
  return !isCampaign(v) && v.archetype === 'vanity' ? 'refuse' : noLobbyChoice(v);
}
/** Sign only what the lowest club asks (its petitioner's papers and forms); refuse the rest. */
export function lowestClubChoice(v: PaperView): BotChoice {
  if (isCampaign(v)) return campaignChoice(v);
  const low = v.moods.reduce((b, m, g) => (m < v.moods[b] ? g : b), 0);
  return v.petitioner === low ? signOrWait(v) : 'refuse';
}
/** The happier-club habit turned round: sign a two-club paper only when the petitioner is the sadder club. */
export function sadderChoice(v: PaperView): BotChoice {
  if (!isCampaign(v) && v.archetype && PAIR.has(v.archetype) && v.petitioner !== null && v.other !== null) return signIfAffordable(v, v.moods[v.petitioner] < v.moods[v.other]);
  return happierChoice(v);
}
/** The happier-club habit that reads one chip: no sign when the other club's printed result falls below 30 (D25's huff line). */
export function happier30Choice(v: PaperView): BotChoice {
  const c = happierChoice(v);
  if (c === 'sign' && v.archetype && PAIR.has(v.archetype) && v.other !== null && v.moods[v.other] + v.sign.clubDeltas[v.other] < 30) return 'refuse';
  return c;
}
/** The happier-club habit that also refuses whenever the petitioner is already above 70. */
export function happier70Choice(v: PaperView): BotChoice {
  if (!isCampaign(v) && v.petitioner !== null && v.moods[v.petitioner] > 70 && v.archetype && (PAIR.has(v.archetype) || v.archetype === 'treat')) return 'refuse';
  return happierChoice(v);
}

/** A seeded coin of the bot (its own stream, never a rules site). */
export function botCoin(seed: number, stream: number, n: number): number {
  return rngMix4(seed >>> 0, 0x0b07 + stream, n, 0) / 4294967296;
}

/** How each bot chooses a day paper (only the reference and its adversaries read; the rest are habits). */
function choiceRule(bot: BotId): (v: PaperView, n: number, seed: number) => BotChoice {
  switch (bot) {
    case 'alwaysSign':
      return alwaysSignChoice;
    case 'alwaysRefuse':
      return alwaysRefuseChoice;
    case 'moneyOnly':
      return moneyOnlyChoice;
    case 'moodOnly':
      return moodOnlyChoice;
    case 'happier':
      return happierChoice;
    case 'casual':
      return casualChoice;
    case 'signFree':
      return signFreeChoice;
    case 'noLobby':
      return noLobbyChoice;
    case 'noTrap':
      return noTrapChoice;
    case 'lowestClub':
      return lowestClubChoice;
    case 'sadder':
      return sadderChoice;
    case 'happier30':
      return happier30Choice;
    case 'happier70':
      return happier70Choice;
    case 'random':
      return (v, n, seed) => (isCampaign(v) ? campaignChoice(v) : signIfAffordable(v, botCoin(seed, 1, n) < 0.5));
    case 'misreader':
      return (v, n, seed) => {
        let c = readerChoice(v);
        if (isCampaign(v) || botCoin(seed, 2, n) >= READER_CONSTANTS.misreadRate) return c;
        if (c === 'wait') c = 'sign';
        return c === 'sign' ? 'refuse' : v.sign.affordable ? 'sign' : 'refuse';
      };
    case 'idle':
      return () => 'refuse';
    default:
      return readerChoice;
  }
}

/** The adversaries' one habit each (8.2 item 5). */
export const ADVERSARY: Record<string, string> = {
  clockForward: 'the device clock jumps +4 h once (minute 20)',
  clockBack: 'the clock jumps +4 h, then −4 h',
  clockForwardAgain: 'the clock jumps +4 h, −4 h, +4 h',
  reloadAfterDraw: 'save and reload after every draw',
  reloadAfterDecision: 'save and reload after every decision',
  reloadInTakeBack: 'save and reload inside every take-back window, and take one paper in five back',
  hoardTray: 'lets the tray fill to the cap before deciding',
  quitElectionNight: 'closes the app for 10 minutes during every election night',
  closeDuringEvents: 'closes the app for 1 h whenever a boycott or a scandal starts',
  away299: 'an absence of 299 s every 10 minutes',
  away301: 'an absence of 301 s every 10 minutes',
  flickBlind: 'flicks 1 s after landing (the reader\'s choice, read in no time)',
};

// ============================================================================================
// the trace
// ============================================================================================

export interface DecisionRec {
  t: number;
  office: OfficeIx;
  term: number;
  day: number;
  kind: Paper['kind'] | 'slip';
  archetype: string | null;
  source: string;
  paper: string;
  choice: Choice;
  /** Seconds the bot waited for the treasury (8.2's wait when short). */
  waited: number;
  landedAt: number;
  affordableAtLanding: boolean;
  vs: number | null;
  vr: number | null;
  /** What the habit rules would have chosen on the same strips (H8). */
  alt: { moneyOnly: Choice; moodOnly: Choice; titleLine: Choice } | null;
  printed: { money: number; moods: number[]; level: number | null; gossip: number };
  applied: { money: number; moods: number[]; level: number | null; gossip: number };
  /** The stale form of 2.7 left with no effect. */
  formVoid: boolean;
  /** The commit happened inside a tick, out of the bot's sight (an H3 fault says why): printed and applied are not compared. */
  unmeasured?: boolean;
  /** |cash| at the commit: applied money is a difference of two treasuries, exact only to their last bits. */
  cashScale?: number;
  /** A stored paper field changed between landing and commit (H1). */
  paperChanged: boolean;
  /** The sign side's printed money (negative a cost) and whether this paper is a basket (8.4). */
  signMoney: number;
  /** H8: the reader's choices for this paper landed in the states of its 10 previous decisions, or null. */
  reeval: Choice[] | null;
}

export interface DrawRec {
  t: number;
  office: OfficeIx;
  kind: Paper['kind'];
  source: string;
  club: ClubIx | null;
  archetype: string | null;
  returning: boolean;
  note: string | null;
  /** A template's frame id and the paper text (frame with its phrase). */
  text: string;
}

export interface ElectionRec {
  t: number;
  office: OfficeIx;
  term: number;
  day: number;
  called: boolean;
  held: number;
  majority: number;
  of: number;
  won: boolean;
  /** Districts held without the disarray bonus (D26). */
  heldOnMerit: number;
  lossesBefore: number;
  /** Shares at the count (hundredths), the poll's just before it, and the announcement order against 2.10's. */
  shares: number[];
  pollShares: number[];
  pollHeld: number;
  order: number[];
  expectedOrder: number[];
  nrBefore: number;
  nrAfter: number;
}

export interface CashRec {
  t: number;
  /** `reset`: the old treasury left behind at a move (2.12), never a gain. */
  source: 'tick' | 'paper' | 'spend' | 'away' | 'awayAd' | 'checkSofa' | 'transition' | 'reset' | 'unexplained';
  amount: number;
}

export interface SampleRec {
  t: number;
  office: OfficeIx;
  term: number;
  cash: number;
  I: number;
  B: number;
  approval: number;
  nr: number;
  record: number;
  ministries: number;
  ministry0Rate: number;
}

export interface IdleRec {
  from: number;
  to: number;
  /** Nothing on the desk and nothing affordable (advice names no slip). */
  nothing: boolean;
}

export interface EventRec {
  t: number;
  type: DecreeEvent['type'] | 'clamp';
  office: OfficeIx;
  detail: string;
}

export interface AwayRec {
  t: number;
  seconds: number;
  earnings: number;
  expected: number;
  adTopUp: number;
  arrived: number;
  expectedArrivedAtMost: number;
  /** Moods, gossip, counters, the day and the poll unchanged by the absence. */
  unchanged: boolean;
  /** 10.2: the closed form equals the absence stepped event to event (offline.ts `awayByEvents`): earnings and the papers brought. */
  stepsEqual?: boolean;
  what: string;
}

export interface PurchaseRec {
  t: number;
  via: 'slip' | 'raise' | 'goal' | 'standing' | 'monument';
  purchase: string;
  price: number;
}

export interface Trace {
  bot: BotId;
  seed: number;
  hand: number;
  started: number;
  ended: number;
  decisions: DecisionRec[];
  draws: DrawRec[];
  elections: ElectionRec[];
  cash: CashRec[];
  samples: SampleRec[];
  idle: IdleRec[];
  events: EventRec[];
  away: AwayRec[];
  purchases: PurchaseRec[];
  /** Take-backs: whether the paper came back byte for byte (H3). */
  takeBacks: { t: number; same: boolean }[];
  /** Reloads: whether the reloaded game equals the saved one (H3). */
  reloads: { t: number; same: boolean }[];
  /** Calls refused that the rules said were allowed, refuses refused (H6), other oddities: plain notes. */
  faults: string[];
  /** Thumb actions, by play time: flicks (papers and slips) and taps (sheets, buttons). */
  flicks: number[];
  taps: number[];
  maxNumber: number;
  /** The rules' own book of dibs by source at the end (DecreeStats.book; H5 cross-check), or null when the rules keep none. */
  book: Record<string, number> | null;
  /** Times of reaching each office (seconds of play), null when not reached. */
  reached: (number | null)[];
  /** A handover run (H6, H12): the habit that played first, and when the reader took over. Its reader-only rows are not evaluated (they would judge the habit's part). */
  handover?: { habit: BotId; at: number };
  hash: string;
}

export function emptyTrace(bot: BotId, seed: number, hand: number, t0: number): Trace {
  return { bot, seed, hand, started: t0, ended: t0, decisions: [], draws: [], elections: [], cash: [], samples: [], idle: [], events: [], away: [], purchases: [], takeBacks: [], reloads: [], faults: [], flicks: [], taps: [], maxNumber: 0, book: null, reached: [t0, null, null], hash: '' };
}

/** A short stable hash of the trace's decisions, draws and elections (H3: byte-identical traces). */
export function traceHash(tr: Pick<Trace, 'decisions' | 'draws' | 'elections'>): string {
  let h = 0x811c9dc5;
  const add = (s: string) => {
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  };
  for (const d of tr.decisions) add(`${d.t.toFixed(6)}|${d.kind}|${d.source}|${d.choice}|${d.printed.money}|${d.printed.moods.join(',')}`);
  // Draws by order and text: their time is the bot's clock at the end of the tick that drew them (the event carries none), which a 10 Hz run stamps up to 0.1 s later.
  for (const d of tr.draws) add(`${d.source}|${d.text}`);
  for (const e of tr.elections) add(`${e.t.toFixed(6)}|${e.shares.join(',')}|${e.won}`);
  return h.toString(16).padStart(8, '0');
}

// ============================================================================================
// the run
// ============================================================================================

export interface BotOptions {
  bot: BotId;
  seed: number;
  /** Play hours to run (or until `stop`); with sessions, the days below instead. */
  hours: number;
  /** Seconds per decision (HAND.decision by default). */
  hand?: number;
  /** Wall time of the start (the shared clock the away rules read). */
  wall0: number;
  /** The state to start from (default: a fresh game of `cfg`). */
  start?: DecreeGame;
  /** Stop when this returns true. */
  stop?: (g: DecreeGame) => boolean;
  /** Keep the state at these play seconds (the web presets). */
  keepAt?: number[];
  /** Days of the session bots (passive, check-in, ad-everything); default 3. */
  days?: number;
  /** 'event' (default): from event to event; 'fixed': the app's 10 Hz ticks (H3). */
  stepping?: 'event' | 'fixed';
  /** H8's re-evaluation in the states of the 10 previous decisions (default: on for the reader in hours 2 and 3). */
  reeval?: boolean;
  /** Products held (D11: H10 runs ad-everything with all five). */
  products?: string[];
  /** Play `bot` until the first term start after `hours` of `habit` (H6's and H12's handover). */
  handover?: { habit: BotId; hours: number };
}

export interface BotRun {
  game: DecreeGame;
  states: Record<number, DecreeGame>;
  rows: BotRow[];
  trace: Trace;
  /** The rule that stopped the run because it is not built yet (NotBuiltError), or null. */
  notBuilt: string | null;
  /** The handover's start (H6, H12): play seconds and the state's approval when the reader took over. */
  handedOver: { t: number; approval: number; decisions: number } | null;
}

export interface BotRow {
  name: string;
  kind: 'hard' | 'aim' | 'report';
  aim: string;
  value: string;
  ok: boolean;
  num?: number | null;
}

const SESSION_BOTS = new Set<BotId>(['passive', 'checkIn', 'adEverything']);
const DAY = 86400;

/** The bot's habits, as switches the driver reads. */
interface Habits {
  choose: (v: PaperView, n: number, seed: number) => BotChoice;
  takesSlips: boolean;
  standingOrder: boolean;
  goalFollower: boolean;
  /** Every in-game ad (ad-everything). */
  ads: boolean;
  /** The away report's ad (8.2: the passive bot takes it; ad-everything too). */
  awayAd: boolean;
  moves: boolean;
  decides: boolean;
}
function habitsOf(bot: BotId): Habits {
  return {
    choose: choiceRule(bot),
    takesSlips: bot !== 'noBuy' && bot !== 'idle',
    standingOrder: bot !== 'noBuy' && bot !== 'idle',
    goalFollower: bot === 'goalFollower',
    ads: bot === 'adEverything',
    awayAd: bot === 'passive' || bot === 'adEverything',
    moves: bot !== 'idle',
    decides: bot !== 'idle',
  };
}

/** The shared fresh state the bot plays (as economy.createInitialState gives it, without importing economy). */
export function botBaseGame(seed: number, wall: number, cash = 0): GameState {
  return {
    version: 2,
    cash,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    venues: {},
    activeVenue: 'main',
    upgrades: [],
    boostUntil: 0,
    rush: { until: 0, readyAt: 0 },
    storySeen: [],
    entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    cards: {},
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0, seed: seed ^ 0x4348, opened: {} },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seed >>> 0,
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: wall, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: wall },
    lastSavedAt: wall,
  } as unknown as GameState;
}

/** A fixed epoch for bot runs (23 Nov 2026, 12:00 UTC): the bot never reads the real clock. */
export const BOT_EPOCH = Date.UTC(2026, 10, 23, 12, 0, 0);

/** A new game of `cfg` with `seed`, as the app creates it (the engine mode's create). */
export function botNewGame(cfg: DecreeConfig, seed: number, wall = BOT_EPOCH): DecreeGame {
  return decreeEngineMode.create(cfg, botBaseGame(seed, wall)) as DecreeGame;
}

const json = (x: unknown) => JSON.stringify(x);
/** The decree state as a save restores it: without the tick's transient cash anchor (types.ts: "null or missing: anchored at the next tick"). H3's trace hashes check that play after a reload is unchanged. */
const savedState = (d: DecreeGame['decree']) => {
  const { cashAnchor, ...rest } = d as DecreeGame['decree'] & { cashAnchor?: unknown };
  void cashAnchor;
  // An optional field saved as null comes back missing (the same meaning; requests.md "[bot] to TERM").
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null && v !== undefined));
};
const sameJson = (a: unknown, b: unknown) => json(a) === json(b);

/** The driver: one bot, one game, event to event. */
class Driver {
  g: DecreeGame;
  wall: number;
  tr: Trace;
  states: Record<number, DecreeGame> = {};
  keepAt: number[];
  hab: Habits;
  n = 0;
  hand: number;
  prev: DecreeGame[] = [];
  landed = new Map<string, { at: number; affordable: boolean; json: string }>();
  idleFrom: number | null = null;
  idleNothing = false;
  nextSample = 0;
  lastJump = 0;
  lastClockAdv = 0;
  constructor(
    readonly cfg: DecreeConfig,
    readonly opts: BotOptions,
    public bot: BotId,
  ) {
    this.wall = opts.wall0;
    this.g = opts.start ?? botNewGame(cfg, opts.seed, opts.wall0);
    const products = opts.products ?? (bot === 'adEverything' ? Object.values(cfg.decree.products) : []);
    if (products.length) this.g = { ...this.g, entitlements: { ...this.g.entitlements, products: [...new Set([...this.g.entitlements.products, ...products])] } };
    this.hand = bot === 'flickBlind' ? 1 : opts.hand ?? HAND.decision; // the adversary's 1 s hand overrides --hand (rules-lead request 129)
    this.tr = emptyTrace(bot, opts.seed, this.hand, this.clock);
    this.hab = habitsOf(bot);
    this.keepAt = [...(opts.keepAt ?? [])].sort((a, b) => a - b);
    this.reachedCheck();
  }
  get clock(): number {
    return this.g.stats.playSeconds;
  }
  get d() {
    return this.g.decree;
  }

  // ---------------------------------------------------------------- bookkeeping

  book(source: CashRec['source'], amount: number) {
    if (amount !== 0) this.tr.cash.push({ t: this.clock, source, amount });
  }
  note(events: DecreeEvent[]) {
    for (const e of events) {
      const picket = e.type === 'boycottStart' ? this.d.strikes[e.club]?.picket ?? null : undefined;
      const detail = json(picket === undefined ? e : { ...e, picket }).slice(0, 200);
      this.tr.events.push({ t: this.clock, type: e.type, office: this.d.office, detail });
      if (e.type === 'paperArrived') this.drawn(e.paper);
    }
    if (this.bot === 'reloadAfterDraw' && events.some((e) => e.type === 'paperArrived')) this.reload();
  }
  /** Paper ids already recorded: the rules say `paperArrived` when a paper comes into the tray AND again when it lands on the desk from the tray (`toDesk`), and a paper set aside at a call lands again later; a draw is one paper id, recorded once. */
  private drawnIds = new Set<string>();
  drawn(id: string) {
    if (this.drawnIds.has(id)) return;
    this.drawnIds.add(id);
    const d = this.d;
    const p = [...d.tray, ...(d.desk?.type === 'paper' ? [d.desk.paper] : []), ...(d.pending ? [d.pending.item.paper] : [])].find((x) => x.id === id);
    if (!p) return;
    this.tr.draws.push({ t: this.clock, office: d.office, kind: p.kind, source: p.source, club: p.petitioner, archetype: p.archetype, returning: p.returning !== null, note: p.note, text: p.text });
  }
  sample() {
    while (this.clock >= this.nextSample) {
      const p = R.decreeParams(this.cfg, this.g);
      this.tr.samples.push({ t: this.clock, office: this.d.office, term: this.d.term, cash: this.g.cash, I: p.I, B: p.B, approval: p.approval, nr: this.d.nr, record: p.record, ministries: this.d.ministries.filter((m) => m.open).length, ministry0Rate: p.rates[0] ?? 0 });
      this.nextSample += 60;
    }
    this.tr.maxNumber = Math.max(this.tr.maxNumber, this.g.cash, R.decreeParams(this.cfg, this.g).I);
    while (this.keepAt.length && this.clock >= this.keepAt[0]) this.states[this.keepAt.shift()!] = this.g;
  }
  reachedCheck() {
    const o = this.d.office;
    if (this.tr.reached[o] === null) this.tr.reached[o] = this.clock;
  }
  idleStart() {
    if (this.idleFrom !== null || this.d.phase !== 'governing') return;
    this.idleFrom = this.clock;
    let slip = null;
    try {
      slip = R.advice(this.cfg, this.g).slip;
    } catch (e) {
      if (e instanceof R.NotBuiltError) throw e;
    }
    this.idleNothing = slip === null;
  }
  idleEnd() {
    if (this.idleFrom === null) return;
    if (this.clock > this.idleFrom) this.tr.idle.push({ from: this.idleFrom, to: this.clock, nothing: this.idleNothing });
    this.idleFrom = null;
  }

  // ---------------------------------------------------------------- the app clock

  /** The app clock runs to `t` (event-stepped, or at 10 Hz); a sign's rest is never crossed here. */
  advanceTo(t: number) {
    const fixed = this.opts.stepping === 'fixed';
    let guard = 0;
    while (this.clock < t) {
      if (++guard > 5_000_000) throw new Error('decree bot: the clock does not advance (advanceDecree returned the same play time)');
      let dt = Math.min(t - this.clock, fixed ? 0.1 : R.MAX_TICK);
      // A 10 Hz step that would leave a sliver (under 1 µs) before `t` takes the sliver with it.
      if (fixed && t - (this.clock + dt) < 1e-6) dt = t - this.clock;
      // The last step lands the play clock on `t` exactly (clock + (t − clock) can miss t by an ulp, and a
      // 10 Hz run reaches it through a different sum than an event-stepped one): the hand's moments are
      // then the same doubles at 10 Hz and event to event, and so is every time the rules derive from
      // them (a slip's 1.0 s after an empty desk against an arrival at the same instant, H3).
      if (dt === t - this.clock) for (let k = 0; k < 4 && this.clock + dt !== t; k++) dt += t - (this.clock + dt);
      const before = this.g;
      const I0 = R.decreeParams(this.cfg, before).I;
      const events: DecreeEvent[] = [];
      this.g = R.advanceDecree(this.cfg, this.g, dt, this.wall, events);
      this.wall += dt * 1000;
      const I1 = R.decreeParams(this.cfg, this.g).I;
      let gain = this.g.cash - before.cash;
      // A take-back committed inside the tick (its 2 s passed, or the rules cut it short: H3) pays its printed money there.
      const p0 = before.decree.pending;
      if (p0 && !this.g.decree.pending && events.some((e) => e.type === 'committed')) {
        const m = printedOf(p0.item.shown.sign, before.decree.moods.length).money;
        this.book(m >= 0 ? 'paper' : 'spend', m);
        gain -= m;
      }
      const bound = Math.max(I0, I1) * dt;
      if (gain > bound * (1 + 1e-9) + 1e-6) {
        this.book('tick', bound);
        this.book('unexplained', gain - bound);
      } else this.book('tick', gain);
      for (const e of events) if (e.type === 'levelBought') this.tr.purchases.push({ t: this.clock, via: 'standing', purchase: `level ${e.ministry}`, price: 0 });
      this.note(events);
      if (this.g.cash < 0) this.tr.faults.push(`H5: cash ${this.g.cash} below 0 at ${this.clock.toFixed(1)} s`);
      this.sample();
      if (this.d.desk) this.idleEnd();
      if (this.g.stats.playSeconds <= before.stats.playSeconds && dt > 0) throw new Error(`decree bot: advanceDecree(${dt}) did not move the play clock`);
    }
  }
  /** To the next thing that happens by itself (the rules' `nextStop`), or `limit`. */
  advanceToNext(limit: number) {
    const next = R.nextStop(this.cfg, this.g);
    const t = next === null || next <= this.clock + 1e-9 ? Math.min(limit, this.clock + (next === null ? 60 : 1e-3)) : Math.min(limit, next);
    this.advanceTo(Math.max(t, this.clock + 1e-6));
  }

  // ---------------------------------------------------------------- the app closed and opened (2.15, the store's seam)

  /** The app goes to the background for `seconds` (a pending take-back commits first), then resumes: the away rules, paid on compute. */
  away(seconds: number, what: string): AwayRec {
    this.idleEnd();
    if (this.d.pending) this.commitPending();
    const save = { ...this.g, lastSavedAt: this.wall };
    this.wall += seconds * 1000;
    const res = awayAt(this.cfg, save, this.wall, this.hab.awayAd, what);
    this.g = res.game;
    this.book('away', res.rec.earnings);
    this.book('awayAd', res.rec.adTopUp);
    this.tr.away.push({ ...res.rec, t: this.clock });
    this.note(res.events);
    return res.rec;
  }

  // ---------------------------------------------------------------- the player's actions

  reload() {
    const saved = JSON.parse(json(this.g)) as unknown;
    const back = decreeEngineMode.reconcile(this.cfg, JSON.parse(json(this.g)) as GameState, saved) as DecreeGame;
    this.tr.reloads.push({ t: this.clock, same: sameJson(savedState(back.decree), savedState(this.g.decree)) && back.cash === this.g.cash });
    this.g = back;
  }
  commitPending() {
    const events: DecreeEvent[] = [];
    const next = R.commitPending(this.cfg, this.g, this.clock, events);
    this.g = next;
    this.note(events);
  }
  /** A tap or a sheet: the hand rests `seconds`. */
  tap(seconds: number) {
    this.tr.taps.push(this.clock);
    this.advanceTo(this.clock + seconds);
  }

  decidePaper(item: DeskItem & { type: 'paper' }) {
    const cfg = this.cfg;
    const seen = this.landed.get(item.paper.id);
    const v0 = paperView(cfg, this.g)!;
    const at = item.landedAt + this.hand;
    if (this.clock < at) this.advanceTo(at);
    if (!(this.d.desk?.type === 'paper' && this.d.desk.paper.id === item.paper.id)) return;
    if (this.bot === 'reloadAfterDecision') this.reload();
    let v = paperView(cfg, this.g)!;
    this.n++;
    let choice = this.hab.choose(v, this.n, this.opts.seed);
    let waited = 0;
    if (choice === 'wait') {
      const need = v.sign.cost - this.g.cash;
      waited = Math.max(0, need) / Math.max(v.ctx.I, 1e-9) + 1e-6;
      this.advanceTo(this.clock + waited);
      v = paperView(cfg, this.g)!;
      choice = v.sign.affordable ? 'sign' : 'refuse';
    }
    const vs = readerValue(v.sign, v.ctx);
    const vr = readerValue(v.refuse, v.ctx);
    const alt = { moneyOnly: final(moneyOnlyChoice(v)), moodOnly: final(moodOnlyChoice(v)), titleLine: final(titleLineChoice(v)) };
    const reeval = this.reevalOf(item.paper);
    const desk = this.d.desk as DeskItem & { type: 'paper' };
    const shown = desk.shown[choice];
    const printed = printedOf(shown, this.d.moods.length);
    const before = this.g;
    this.tr.flicks.push(this.clock);
    const events: DecreeEvent[] = [];
    let next = R.decide(cfg, this.g, choice, this.clock, events);
    if (next === this.g) {
      if (choice === 'refuse') this.tr.faults.push(`H6: refuse refused on ${item.paper.id} at ${this.clock.toFixed(1)} s`);
      else this.tr.faults.push(`sign refused on ${item.paper.id} although the strip printed it affordable`);
      choice = 'refuse';
      next = R.decide(cfg, this.g, 'refuse', this.clock, events);
    }
    this.g = next;
    this.note(events);
    let atCommit = before;
    let cutShort = false;
    if (this.d.pending && this.d.pending.item.paper.id === item.paper.id) {
      // The take-back window (2.7): the reload adversary saves inside it; one in five is taken back and decided again.
      if (this.bot === 'reloadInTakeBack') {
        this.reload();
        if (this.n % 5 === 0) {
          const tb: DecreeEvent[] = [];
          const back = R.takeBack(cfg, this.g, this.clock, tb);
          this.tr.takeBacks.push({ t: this.clock, same: back.decree.desk?.type === 'paper' && sameJson(back.decree.desk, desk) });
          this.g = back;
          this.note(tb);
          this.tr.taps.push(this.clock);
          const ev2: DecreeEvent[] = [];
          this.g = R.decide(cfg, this.g, 'sign', this.clock, ev2);
          this.note(ev2);
        }
      }
      const until = this.d.pending ? this.d.pending.until : this.clock;
      this.advanceTo(Math.max(this.clock, until - REST_TAP));
      atCommit = this.g;
      if (this.d.pending) this.commitPending();
      else {
        // The rules committed it inside the rest, before the bot's tap: the take-back window was cut short (H3).
        cutShort = true;
        this.tr.faults.push(`H3: the take-back window of ${item.paper.id} ended before its ${this.cfg.decree.desk.takeBackSeconds} s (committed by the rules inside the tick, by ${atCommit.stats.playSeconds.toFixed(1)} s)`);
      }
    }
    const after = this.g;
    const applied = appliedOf(atCommit, after);
    this.book(applied.money >= 0 ? 'paper' : 'spend', applied.money);
    const formVoid = this.tr.events.slice(-12).some((e) => e.type === 'formVoid' && e.detail.includes(item.paper.id));
    if (after.decree.stats.clamps > before.decree.stats.clamps) this.tr.events.push({ t: this.clock, type: 'clamp', office: this.d.office, detail: item.paper.id });
    this.tr.decisions.push({
      t: atCommit.stats.playSeconds,
      office: before.decree.office,
      term: before.decree.term,
      day: before.decree.day,
      kind: item.paper.kind,
      archetype: item.paper.archetype,
      source: item.paper.source,
      paper: item.paper.id,
      choice,
      waited,
      landedAt: item.landedAt,
      affordableAtLanding: seen?.affordable ?? v0.sign.affordable,
      vs,
      vr,
      alt,
      printed,
      applied,
      formVoid,
      unmeasured: cutShort,
      cashScale: Math.max(Math.abs(atCommit.cash), Math.abs(after.cash)),
      paperChanged: seen ? seen.json !== json(item.paper) : false,
      signMoney: v.sign.money,
      reeval,
    });
    this.prev.push(before);
    if (this.prev.length > 10) this.prev.shift();
    this.afterDecision();
  }

  /** H8: the reader's choice for `paper` landed in each of the 10 previous decisions' states (a measurement on copies). */
  reevalOf(paper: Paper): Choice[] | null {
    const on = this.opts.reeval ?? (this.bot === 'reader');
    if (!on || this.clock < 3600 || this.clock > 3 * 3600 || this.prev.length < 10) return null;
    if (paper.kind !== 'comic' && paper.kind !== 'template' && paper.kind !== 'followup') return null;
    const out: Choice[] = [];
    for (const s of [...this.prev, this.g]) {
      if (s.decree.office !== paper.office) continue;
      const g = R.landPaper(this.cfg, { ...s, decree: { ...s.decree, desk: null, pending: null } }, paper, s.stats.playSeconds);
      const v = paperView(this.cfg, g);
      if (v) out.push(final(readerChoice(v)));
    }
    return out;
  }

  decideSlip(item: DeskItem & { type: 'slip' }) {
    const at = item.landedAt + HAND.slip;
    if (this.clock < at) this.advanceTo(at);
    if (this.d.desk?.type !== 'slip') return;
    let choice: Choice = this.hab.takesSlips ? 'sign' : 'refuse';
    const before = this.g;
    const events: DecreeEvent[] = [];
    this.tr.flicks.push(this.clock);
    let next = R.decide(this.cfg, this.g, choice, this.clock, events);
    // A slip the treasury no longer pays (the goal-follower spent it after the slip landed) is put back, as a player would.
    if (next === before && choice === 'sign') {
      choice = 'refuse';
      next = R.decide(this.cfg, this.g, 'refuse', this.clock, events);
      if (next === before) this.tr.faults.push(`H6: a slip could be neither bought nor put back at ${this.clock.toFixed(1)} s`);
    }
    this.g = next;
    this.note(events);
    const spent = this.g.cash - before.cash;
    this.book('spend', spent);
    if (next === before) this.advanceTo(this.clock + HAND.slip);
    if (choice === 'sign' && next !== before) this.tr.purchases.push({ t: this.clock, via: 'slip', purchase: purchaseName(item.slip.purchase), price: item.slip.price });
    if (choice === 'sign' && Math.abs(spent + item.slip.price) > moneyTol(item.slip.price, Math.max(Math.abs(before.cash), Math.abs(this.g.cash))) && !this.tr.events.slice(-6).some((e) => e.type === 'formVoid')) this.tr.faults.push(`H1: slip printed ${item.slip.price}, the treasury changed by ${spent}`);
    this.afterDecision();
  }

  afterDecision() {
    if (this.bot === 'reloadAfterDecision') this.reload();
    const cfg = this.cfg;
    if (this.d.phase === 'governing' && this.hab.decides && R.canCall(cfg, this.g)) {
      const p = R.poll(cfg, this.g);
      if (p.held >= p.majority) {
        this.tap(HAND.sheet);
        if (this.d.phase === 'governing' && R.canCall(cfg, this.g)) {
          const events: DecreeEvent[] = [];
          const next = R.callElection(cfg, this.g, this.clock, events);
          if (next === this.g) this.tr.faults.push(`callElection refused although canCall at ${this.clock.toFixed(1)} s`);
          this.g = next;
          this.note(events);
        }
      }
    }
  }

  countAndResult() {
    const cfg = this.cfg;
    const before = this.g;
    const pollBefore = R.poll(cfg, before);
    const merit = R.shares(cfg, { ...before, decree: { ...before.decree, losses: 0 } }).filter((s) => s >= 5000).length;
    this.tr.taps.push(this.clock);
    let events: DecreeEvent[] = [];
    this.g = R.countVotes(cfg, this.g, events);
    this.note(events);
    if (this.g === before) throw new Error('decree bot: countVotes refused after the rally (the run-up is over and nothing waits)');
    if (this.bot === 'quitElectionNight') this.away(600, 'quit during election night');
    this.advanceTo(this.clock + HAND.electionNight);
    // The last envelope (or a tap that skips): the night ends.
    if (this.d.phase === 'count') this.g = R.endElectionNight(cfg, this.g);
    if (this.d.phase !== 'result') throw new Error(`decree bot: after election night the phase is "${this.d.phase}", not "result" (term.ts: how does the count end?)`);
    const c = this.d.count!;
    const order = c.order;
    const expectedOrder = c.districts.map((x, i) => ({ i, k: Math.abs(x.share - 5000) })).sort((a, b) => b.k - a.k || a.i - b.i).map((x) => x.i);
    this.tr.elections.push({
      t: this.clock,
      office: before.decree.office,
      term: before.decree.term,
      day: before.decree.day,
      called: before.decree.day < R.officeOf(cfg, before.decree.office).termDays,
      held: c.held,
      majority: c.majority,
      of: c.districts.length,
      won: c.won,
      heldOnMerit: merit,
      lossesBefore: before.decree.losses,
      shares: c.districts.map((x) => x.share),
      pollShares: pollBefore.rows.map((r) => r.share),
      pollHeld: pollBefore.held,
      order,
      expectedOrder,
      nrBefore: before.decree.nr,
      nrAfter: this.d.nr,
    });
    this.tap(HAND.sheet);
    const wall = this.wall;
    events = [];
    if (this.hab.moves && R.canMoveUp(cfg, this.g)) {
      const cash0 = this.g.cash;
      this.g = R.moveUp(cfg, this.g, wall, events);
      if (this.d.office !== before.decree.office) {
        this.book('reset', -cash0);
        this.book('transition', this.g.cash);
      }
    } else this.g = R.chooseAfterResult(cfg, this.g, 'stay', wall, events);
    this.note(events);
    this.reachedCheck();
    if (this.hab.standingOrder) {
      const so = R.setStandingOrder(cfg, this.g, true);
      if (so !== this.g) this.tr.taps.push(this.clock);
      this.g = so;
    }
  }

  /** The goal-follower buys what the goal line names the moment it is affordable above the reserve (through the Ledger's buttons). */
  goalBuy(): boolean {
    const goal = R.goalLine(this.cfg, this.g);
    if (goal.kind !== 'purchase') return false;
    if (this.g.cash < goal.price + R.reserve(this.cfg, this.g)) return false;
    const events: DecreeEvent[] = [];
    const pu = goal.purchase;
    const before = this.g;
    this.g = pu.type === 'level' ? R.raise(this.cfg, this.g, pu.ministry, events) : pu.type === 'open' ? R.openMinistry(this.cfg, this.g, pu.ministry, events) : R.buyVanity(this.cfg, this.g, events);
    this.note(events);
    if (this.g === before) return false;
    this.tr.taps.push(this.clock);
    this.book('spend', this.g.cash - before.cash);
    this.tr.purchases.push({ t: this.clock, via: 'goal', purchase: purchaseName(pu), price: before.cash - this.g.cash });
    return true;
  }

  /**
   * D36: the term's offered monument is bought whenever the treasury holds its price above the reserve
   * (a fixed habit of every bot that buys as the reader; advice never names a monument). One tap on the
   * shelf (a slip's hand, 1.5 s).
   */
  monumentHabit(): boolean {
    const offer = this.d.monumentOffer;
    if (!offer || this.d.vanity.includes(offer) || this.d.pending) return false;
    const purchase = { type: 'monument', monument: offer } as const;
    const price = R.vanityPrice(this.cfg, this.g);
    if (R.canBuy(this.cfg, this.g, purchase, price) !== null) return false;
    const events: DecreeEvent[] = [];
    const before = this.g;
    this.g = R.buyVanity(this.cfg, this.g, events);
    this.note(events);
    if (this.g === before) return false;
    this.tr.taps.push(this.clock);
    this.book('spend', this.g.cash - before.cash);
    this.tr.purchases.push({ t: this.clock, via: 'monument', purchase: purchaseName(purchase), price: before.cash - this.g.cash });
    this.advanceTo(this.clock + HAND.slip);
    return true;
  }

  /** Ad-everything: every ad the rules offer now (Check the Sofa once a term, the Spin Doctor, the Courier, Open the Doors). */
  watchAds() {
    for (const kind of ['checkSofa', 'spinDoctor', 'courier', 'openDoors'] as const) {
      if (!R.canWatchAd(this.cfg, this.g, kind)) continue;
      const events: DecreeEvent[] = [];
      const cash0 = this.g.cash;
      const next = R.grantAd(this.cfg, this.g, kind, events);
      if (next === this.g) continue;
      this.tr.taps.push(this.clock);
      this.g = next;
      this.book(kind === 'checkSofa' ? 'checkSofa' : 'unexplained', this.g.cash - cash0);
      this.note(events);
    }
  }

  stuck = 0;
  lastStep: DecreeGame | null = null;
  /** One step of play (guarded: a step that changes nothing 1,000 times in a row is a bot bug, said loudly). */
  step(tEnd: number): boolean {
    const r = this.step1(tEnd);
    this.stuck = this.g === this.lastStep ? this.stuck + 1 : 0;
    this.lastStep = this.g;
    if (this.stuck > 1000) throw new Error(`decree bot (${this.bot}): no step changes the game at ${this.clock.toFixed(2)} s (desk ${this.d.desk?.type ?? 'empty'}, phase ${this.d.phase}): the bot asks for something the rules refuse, over and over`);
    return r;
  }
  /** One step of play: whatever the desk, the phase and the hand say next. Returns false when the run ends. */
  probed = false;
  step1(tEnd: number): boolean {
    if (this.clock >= tEnd - 1e-9) return false;
    // H4's probes of 10.2 once, on copies at minute 30 (the run goes on unchanged).
    if (!this.probed && this.clock >= 1800 && this.d.phase === 'governing' && !this.d.pending) {
      this.probed = true;
      for (const r of awayProbes(this.cfg, this.g, this.wall)) this.tr.away.push({ ...r, t: this.clock });
    }
    if (this.opts.stop?.(this.g)) return false;
    this.sample();
    const d = this.d;
    if (this.adversaryClock()) return true;
    if (d.pending) {
      this.advanceTo(Math.max(this.clock, d.pending.until - REST_TAP));
      if (this.d.pending) this.commitPending();
      return true;
    }
    if (d.phase === 'result') {
      this.countAndResultSheetOnly();
      return true;
    }
    if (d.phase === 'count') {
      this.advanceTo(this.clock + HAND.electionNight);
      if (this.d.phase === 'count') {
        this.g = R.endElectionNight(this.cfg, this.g);
        if (this.d.phase === 'count') throw new Error('decree bot: phase "count" does not end (endElectionNight does not move it to "result")');
      }
      return true;
    }
    if (this.hab.ads && d.phase === 'governing') this.watchAds();
    if (this.hab.goalFollower && d.phase === 'governing' && this.goalBuy()) return true;
    if (this.hab.takesSlips && d.phase === 'governing' && this.monumentHabit()) return true;
    const desk = this.d.desk;
    if (desk?.type === 'paper') {
      this.idleEnd();
      if (!this.landed.has(desk.paper.id)) this.landed.set(desk.paper.id, { at: desk.landedAt, affordable: R.stripOf(this.cfg, this.g, 'sign')?.affordable ?? true, json: json(desk.paper) });
      if (!this.hab.decides) {
        this.advanceToNext(tEnd);
        return true;
      }
      if (this.bot === 'hoardTray' && this.d.phase === 'governing' && this.hoarding(desk)) {
        this.advanceToNext(tEnd);
        return true;
      }
      this.decidePaper(desk);
      return true;
    }
    if (desk?.type === 'slip') {
      this.idleEnd();
      if (!this.hab.decides) {
        this.advanceToNext(tEnd);
        return true;
      }
      this.decideSlip(desk);
      return true;
    }
    // An empty desk.
    if (R.canCount(this.cfg, this.g)) {
      if (!this.hab.decides) return false;
      this.countAndResult();
      return true;
    }
    this.idleStart();
    this.advanceToNext(tEnd);
    return true;
  }

  /** A result left on the sheet (a start state in phase result): only the choice after it. */
  countAndResultSheetOnly() {
    this.tap(HAND.sheet);
    const events: DecreeEvent[] = [];
    this.g = this.hab.moves && R.canMoveUp(this.cfg, this.g) ? R.moveUp(this.cfg, this.g, this.wall, events) : R.chooseAfterResult(this.cfg, this.g, 'stay', this.wall, events);
    this.note(events);
    this.reachedCheck();
  }

  hoardingNow = false;
  hoardGrew = { n: -1, at: 0 };
  /** The hoard adversary waits until the tray is full: the cap, the arrival clock stopped (2.5), or no growth for two arrival intervals (the opening's scripted papers hold the draw, 3.1). */
  hoarding(desk: DeskItem & { type: 'paper' }): boolean {
    if (desk.paper.kind === 'strike' || desk.paper.kind === 'scandal') return false;
    const cap = this.cfg.decree.desk.trayCap;
    const n = this.d.tray.length;
    if (n !== this.hoardGrew.n) this.hoardGrew = { n, at: this.clock };
    const stalled = this.clock - this.hoardGrew.at > 2 * R.decreeParams(this.cfg, this.g).tau;
    const full = n >= cap || R.nextVisitorIn(this.cfg, this.g) === null || stalled;
    if (full) this.hoardingNow = false;
    else if (n === 0) this.hoardingNow = true;
    return this.hoardingNow && !full;
  }

  /** The clock and absence adversaries (8.2 item 5). Returns true when it acted. */
  adversaryClock(): boolean {
    const t = this.clock;
    const b = this.bot;
    if ((b === 'clockForward' || b === 'clockBack' || b === 'clockForwardAgain') && this.lastJump === 0 && t >= 1200) {
      this.lastJump = t;
      const seq = b === 'clockForward' ? [4] : b === 'clockBack' ? [4, -4] : [4, -4, 4];
      const paid0 = sumAway(this.tr);
      let first = 0;
      seq.forEach((h, i) => {
        const r = this.away(h * 3600, `clock ${h > 0 ? '+' : ''}${h} h`);
        if (i === 0) first = r.earnings;
      });
      const paid = sumAway(this.tr) - paid0;
      if (Math.abs(paid - first) > 1e-6 && b !== 'clockForward') this.tr.faults.push(`H4: the clock jumps ${seq.join(', ')} h paid ${paid} (the first jump alone ${first})`);
      return true;
    }
    if ((b === 'away299' || b === 'away301') && t - this.lastJump >= 600 && t >= 600) {
      this.lastJump = t;
      this.away(b === 'away299' ? 299 : 301, b);
      return true;
    }
    if (b === 'closeDuringEvents') {
      const ev = this.tr.events;
      const last = ev.length ? ev[ev.length - 1] : null;
      if (last && (last.type === 'boycottStart' || last.type === 'scandalStart') && last.t > this.lastJump) {
        this.lastJump = t + 1e-6;
        this.away(3600, `closed during ${last.type}`);
        return true;
      }
    }
    return false;
  }
}

/** A choice with "wait" resolved as the sign it waits for. */
const final = (c: BotChoice): Choice => (c === 'wait' ? 'sign' : c);

function purchaseName(p: Purchase): string {
  return p.type === 'monument' ? `monument ${p.monument}` : `${p.type} ${p.ministry}`;
}

function sumAway(tr: Trace): number {
  return tr.cash.filter((c) => c.source === 'away').reduce((s, c) => s + c.amount, 0);
}

/** What a frozen side prints, summed: money, mood per club, a level, gossip. */
export function printedOf(shown: readonly R.ShownEffect[], clubs: number): DecisionRec['printed'] {
  const moods = new Array<number>(clubs).fill(0);
  let money = 0;
  let level: number | null = null;
  let gossip = 0;
  for (const e of shown) {
    if (e.type === 'money') money += e.amount;
    else if (e.type === 'moods') e.deltas.forEach((x, i) => (moods[i] += x));
    else if (e.type === 'level') level = e.ministry;
    else if (e.type === 'gossip') gossip += e.delta;
  }
  return { money, moods, level, gossip };
}

/** What a commit changed: the treasury, the moods, the level that rose, gossip (2.17's decay and resets included). */
export function appliedOf(atCommit: DecreeGame, after: DecreeGame): DecisionRec['applied'] {
  const a = atCommit.decree;
  const b = after.decree;
  const same = a.office === b.office;
  const moods = same ? b.moods.map((m, i) => m - (a.moods[i] ?? m)) : a.moods.map(() => 0);
  let level: number | null = null;
  if (same) b.ministries.forEach((m, i) => m.level === (a.ministries[i]?.level ?? 0) + 1 && (level = i));
  return { money: after.cash - atCommit.cash, moods, level, gossip: b.gossip - a.gossip };
}

/**
 * The app closed with `save` (its lastSavedAt is the moment it closed) and opened at wall `now`: the
 * store's resume for a mode with `paysOnCompute` (2.15): the clock clamped (a later time remembered),
 * the away rules computed, the earnings paid in the same update, the report's ad top-up when `ad` and
 * allowed. Checks what H4 asks of one absence. Pure.
 */
export function awayAt(cfg: DecreeConfig, save: DecreeGame, now: number, ad: boolean, what: string): { game: DecreeGame; rec: AwayRec; events: DecreeEvent[] } {
  const clockHigh = Math.max(save.stats.clockHigh ?? 0, save.lastSavedAt);
  let g: DecreeGame = { ...save, lastSavedAt: Math.min(save.lastSavedAt, now), stats: { ...save.stats, clockHigh } };
  const from = Math.max(g.lastSavedAt, clockHigh);
  const t = Math.max(0, (now - from) / 1000);
  const longLunch = g.entitlements.products.includes(cfg.decree.products.longLunch);
  const cap = (cfg.decree.away.capHours + (longLunch ? cfg.decree.away.longLunchHours : 0)) * 3600;
  const tCap = Math.min(t, cap);
  const expected = R.roundDibs(cfg, R.decreeIncome(cfg, g) * tCap);
  const d0 = g.decree;
  // 2.15's free places: the tray's, and the desk's when no paper is on it (grants.ts `freePlaces`).
  const free = R.freePlaces(cfg, g);
  const expectedArrivedAtMost = d0.phase === 'governing' ? Math.min(free, Math.floor((tCap + d0.awayCarry) / cfg.decree.away.arrivalSeconds)) : 0;
  const shares0 = safeShares(cfg, g);
  // 10.2's cross-check: the same absence stepped event to event pays the same and brings the same papers.
  const byEvents = R.awayByEvents(cfg, g, now);
  const r = R.decreeOffline(cfg, g, now);
  const ids = (x: DecreeGame) => json([...x.decree.tray.map((p) => p.id), x.decree.desk?.type === 'paper' ? x.decree.desk.paper.id : null]);
  const stepsEqual = byEvents.earnings === r.earnings && ids(byEvents.game) === ids(r.game);
  g = r.game;
  const earnings = r.earnings;
  g = { ...g, cash: g.cash + earnings, runEarnings: g.runEarnings + earnings, lifetimeEarnings: g.lifetimeEarnings + earnings };
  let adTopUp = 0;
  if (ad && earnings > 0 && R.canWatchAd(cfg, g, 'awayBonus')) {
    adTopUp = earnings * (decreeEngineMode.offlineAdMultiplier!(cfg) - 1);
    g = { ...g, cash: g.cash + adTopUp, runEarnings: g.runEarnings + adTopUp, lifetimeEarnings: g.lifetimeEarnings + adTopUp };
  }
  g = { ...g, lastSavedAt: now, stats: { ...g.stats, clockHigh: Math.max(g.stats.clockHigh ?? 0, now) } };
  const d1 = g.decree;
  const unchanged = sameJson(d0.moods, d1.moods) && d0.gossip === d1.gossip && d0.day === d1.day && d0.phase === d1.phase && sameJson(d0.strikes.map((s) => s?.papersLeft ?? null), d1.strikes.map((s) => s?.papersLeft ?? null)) && (d0.scandal?.papersLeft ?? null) === (d1.scandal?.papersLeft ?? null) && sameJson(d0.cooldowns, d1.cooldowns) && sameJson(shares0, safeShares(cfg, g));
  const arrived = Math.max(0, d1.tray.length - d0.tray.length + (d1.desk && !d0.desk ? 1 : 0));
  return { game: g, rec: { t: save.stats.playSeconds, seconds: t, earnings, expected, adTopUp, arrived, expectedArrivedAtMost, unchanged, stepsEqual, what }, events: [] };
}
function safeShares(cfg: DecreeConfig, g: DecreeGame): number[] {
  return R.shares(cfg, g);
}

/** H4's probes on a copy of the state (the run goes on unchanged): 30 s, 299 s, 301 s, 4 h, and the clock jumps +4 h, −4 h, +4 h. */
export function awayProbes(cfg: DecreeConfig, g: DecreeGame, wall: number): AwayRec[] {
  const out: AwayRec[] = [];
  for (const s of [30, 299, 301, 4 * 3600]) out.push(awayAt(cfg, { ...g, lastSavedAt: wall }, wall + s * 1000, false, `probe ${s} s`).rec);
  const a = awayAt(cfg, { ...g, lastSavedAt: wall }, wall + 4 * 3600_000, false, 'jump +4 h');
  const b = awayAt(cfg, a.game, wall, false, 'jump −4 h');
  const c = awayAt(cfg, b.game, wall + 4 * 3600_000, false, 'jump +4 h again');
  out.push(a.rec, { ...b.rec, expected: 0 }, { ...c.rec, expected: 0 });
  return out;
}

/**
 * Plays `opts.bot` on the engine. Stops at `opts.hours` of play (session bots: `opts.days`), at
 * `opts.stop`, or at the first rule that is not built yet (`notBuilt` names it; the trace holds what
 * was played until then). Anything else that throws is a bug and propagates.
 */
export function runDecreeBot(cfg: DecreeConfig, opts: BotOptions): BotRun {
  const first: BotId = opts.handover ? opts.handover.habit : opts.bot;
  const dr = new Driver(cfg, opts, first);
  let notBuilt: string | null = null;
  let handedOver: BotRun['handedOver'] = null;
  try {
    if (opts.handover) {
      const until = opts.handover.hours * 3600;
      const term0 = () => dr.g.decree.term * 10 + dr.g.decree.office;
      let mark = -1;
      while (dr.step(until + 6 * 3600)) {
        if (dr.clock >= until && mark < 0) mark = term0();
        if (mark >= 0 && term0() !== mark && dr.d.phase === 'governing') break;
      }
      handedOver = { t: dr.clock, approval: R.decreeParams(cfg, dr.g).approval, decisions: dr.tr.decisions.length };
      dr.tr.handover = { habit: opts.handover.habit, at: dr.clock };
      dr.bot = opts.bot;
      dr.hab = habitsOf(opts.bot);
      dr.tr.bot = opts.bot;
      const tEnd = dr.clock + opts.hours * 3600;
      while (dr.step(tEnd));
    } else if (SESSION_BOTS.has(opts.bot)) runSessions(dr, opts);
    else {
      const tEnd = dr.clock + opts.hours * 3600;
      while (dr.step(tEnd));
    }
  } catch (e) {
    if (e instanceof R.NotBuiltError) notBuilt = e.rule;
    else throw e;
  }
  dr.idleEnd();
  dr.tr.ended = dr.clock;
  const book = (dr.g.decree.stats as { book?: Record<string, number> }).book;
  dr.tr.book = book ? { ...book } : null;
  dr.tr.hash = traceHash(dr.tr);
  // A run stopped at an unbuilt rule is still measured up to that point (its rows are partial; the CLI says so).
  let rows: BotRow[] = [];
  try {
    rows = evaluate(cfg, dr.tr);
  } catch (e) {
    if (!(e instanceof R.NotBuiltError)) throw e;
    notBuilt = notBuilt ?? e.rule;
  }
  return { game: dr.g, states: dr.states, rows, trace: dr.tr, notBuilt, handedOver };
}

/** The session bots: passive (5 × 8 min a day), check-in (every 4 h: the tray, then 2 min of buying), ad-everything (passive with every product and ad). */
function runSessions(dr: Driver, opts: BotOptions) {
  const days = opts.days ?? 3;
  const starts: number[] = [];
  for (let day = 0; day < days; day++) {
    if (opts.bot === 'checkIn') for (let h = 0; h < 24; h += SESSIONS.checkInEvery) starts.push(day * DAY + h * 3600);
    else for (const h of SESSIONS.passiveStarts) starts.push(day * DAY + h * 3600);
  }
  const wall0 = dr.wall;
  for (const s of starts) {
    const at = wall0 + s * 1000;
    if (at > dr.wall) dr.away((at - dr.wall) / 1000, 'between sessions');
    const t0 = dr.clock;
    const len = opts.bot === 'checkIn' ? (dr.d.tray.length + 1) * (dr.hand + HAND.takeBackRest) + SESSIONS.checkInBuyMinutes * 60 : SESSIONS.passiveMinutes * 60;
    while (dr.step(t0 + len));
  }
}

// ============================================================================================
// measurements (pure over a trace)
// ============================================================================================

export function quantile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return s[i];
}
export const median = (xs: readonly number[]) => quantile(xs, 0.5);
const DAY_PAPER = new Set(['comic', 'template', 'followup', 'requisition', 'ribbon', 'application', 'strike', 'scandal', 'scripted']);
const COMIC = new Set(['comic', 'template', 'followup']);
const isDayRec = (d: DecisionRec) => DAY_PAPER.has(d.kind);

/** The money tolerance of H1: a millionth of the amount, or the float resolution of the treasury it was added to (cash − cash at 1e20 is exact only to about 1e5). */
export function moneyTol(amount: number, cashScale: number): number {
  return Math.max(1e-6 * Math.max(1, Math.abs(amount)), 8 * Number.EPSILON * cashScale);
}

/** H1: printed against applied on every decision (money, every club's mood, the level); clamps; stored papers changed; stale forms with an effect. */
export function h1(tr: Pick<Trace, 'decisions' | 'events' | 'faults'>): { differences: number; clamps: number; changed: number; staleWithEffect: number; detail: string[] } {
  let differences = 0;
  let staleWithEffect = 0;
  const detail: string[] = [];
  for (const d of tr.decisions) {
    if (d.unmeasured) continue;
    if (d.formVoid) {
      if (d.applied.money !== 0 || d.applied.moods.some((x) => x !== 0) || d.applied.level !== null) {
        staleWithEffect++;
        detail.push(`${d.paper}: a stale form changed something`);
      }
      continue;
    }
    const moodsDiffer = d.printed.moods.some((x, i) => x !== (d.applied.moods[i] ?? 0));
    const moneyDiffers = Math.abs(d.printed.money - d.applied.money) > moneyTol(d.printed.money, d.cashScale ?? 0);
    const levelDiffers = d.printed.level !== d.applied.level;
    if (moodsDiffer || moneyDiffers || levelDiffers) {
      differences++;
      if (detail.length < 5) detail.push(`${d.paper} ${d.choice}: printed ${json(d.printed)} applied ${json(d.applied)}`);
    }
  }
  differences += tr.faults.filter((f) => f.startsWith('H1')).length;
  return { differences, clamps: tr.events.filter((e) => e.type === 'clamp').length, changed: tr.decisions.filter((d) => d.paperChanged).length, staleWithEffect, detail };
}

/** H2: the poll just before each count against the count, number for number, and 2.10's announcement order. */
export function h2(tr: Pick<Trace, 'elections'>): { differences: number; orderWrong: number } {
  let differences = 0;
  let orderWrong = 0;
  for (const e of tr.elections) {
    if (!sameJson(e.shares, e.pollShares) || e.held !== e.pollHeld) differences++;
    if (!sameJson(e.order, e.expectedOrder)) orderWrong++;
  }
  return { differences, orderWrong };
}

/** H3 on one trace: take-backs and reloads that did not restore byte for byte. */
export function h3(tr: Pick<Trace, 'takeBacks' | 'reloads'> & { faults?: string[] }): { takeBacksWrong: number; reloadsWrong: number; windowsCut: number } {
  return { takeBacksWrong: tr.takeBacks.filter((x) => !x.same).length, reloadsWrong: tr.reloads.filter((x) => !x.same).length, windowsCut: (tr.faults ?? []).filter((f) => f.startsWith('H3: the take-back window')).length };
}

/** H4: every absence paid the closed form, moved nothing else, never paid more papers than the rule; faults of the clock jumps. */
export function h4(tr: Pick<Trace, 'away' | 'faults'>): { absences: number; wrongPay: number; moved: number; tooManyPapers: number; jumps: number; stepsDiffer: number } {
  return {
    stepsDiffer: tr.away.filter((a) => a.stepsEqual === false).length,
    absences: tr.away.length,
    wrongPay: tr.away.filter((a) => Math.abs(a.earnings - a.expected) > 1e-6 * Math.max(1, a.expected)).length,
    moved: tr.away.filter((a) => !a.unchanged).length,
    tooManyPapers: tr.away.filter((a) => a.arrived > a.expectedArrivedAtMost).length,
    jumps: tr.faults.filter((f) => f.startsWith('H4')).length,
  };
}

/** H5: dibs by source; anything unexplained; cash below 0; a refusal that cost money. */
export const RULE_SOURCES = ['tick', 'paper', 'checkSofa', 'transition', 'spend'] as const;
export function h5(tr: Pick<Trace, 'cash' | 'decisions' | 'faults' | 'book'>): { bySource: Record<string, number>; unexplained: number; negative: number; refuseCost: number; foreignBook: string[] } {
  const bySource: Record<string, number> = {};
  for (const c of tr.cash) bySource[c.source] = (bySource[c.source] ?? 0) + c.amount;
  // The rules' own book (commitCash): a gain booked under any other source than the five of H5 is foreign (the away payout is the store's).
  const foreignBook = Object.entries(tr.book ?? {}).filter(([k, v]) => v > 0 && !(RULE_SOURCES as readonly string[]).includes(k)).map(([k]) => k);
  return {
    bySource,
    foreignBook,
    unexplained: tr.cash.filter((c) => c.source === 'unexplained').length,
    negative: tr.faults.filter((f) => f.startsWith('H5')).length,
    refuseCost: tr.decisions.filter((d) => d.choice === 'refuse' && d.kind !== 'slip' && d.applied.money < 0).length,
  };
}

/** H6 on one trace: refuses refused; boycotts and scandals that outran their count; ministry 0 without income; terms from the first loss at a seat to a win. */
export function h6(tr: Pick<Trace, 'faults' | 'events' | 'decisions' | 'samples' | 'elections'>, boycottPapers: number, scandalPapers: number): { refuseRefused: number; overran: number; zeroIncome: number; worstTermsToWin: number | null } {
  const refuseRefused = tr.faults.filter((f) => f.startsWith('H6')).length;
  // A boycott (scandal) that ran more decided day papers than its count, +1 for the paper that started it.
  let overran = 0;
  const dayTimes = tr.decisions.filter(isDayRec).map((d) => d.t);
  const papersBetween = (a: number, b: number) => dayTimes.filter((t) => t > a && t <= b).length;
  const open: Record<string, number> = {};
  for (const e of tr.events) {
    if (e.type === 'boycottStart') open[`b${e.detail}`] = e.t;
    if (e.type === 'scandalStart') open.s = e.t;
    if (e.type === 'boycottEnd') {
      const k = Object.keys(open).find((x) => x.startsWith('b') && x.includes(`"club":${/"club":(\d+)/.exec(e.detail)?.[1]}`));
      if (k !== undefined) {
        if (papersBetween(open[k], e.t) > boycottPapers + 1) overran++;
        delete open[k];
      }
    }
    if (e.type === 'scandalEnd' && open.s !== undefined) {
      if (papersBetween(open.s, e.t) > scandalPapers + 1) overran++;
      delete open.s;
    }
  }
  const zeroIncome = tr.samples.filter((s) => !(s.ministry0Rate > 0)).length;
  let worst: number | null = null;
  const bySeat = new Map<string, ElectionRec[]>();
  for (const e of tr.elections) bySeat.set(`${e.office}`, [...(bySeat.get(`${e.office}`) ?? []), e]);
  for (const list of bySeat.values()) {
    const i = list.findIndex((e) => !e.won);
    if (i < 0) continue;
    const j = list.findIndex((e, k) => k > i && e.won);
    const n = j < 0 ? (list.length - i > 6 ? Infinity : null) : j - i;
    if (n !== null) worst = Math.max(worst ?? 0, n);
  }
  return { refuseRefused, overran, zeroIncome, worstTermsToWin: worst };
}

/** The 2.11 bound with D15 (the content's disarray rule) and D25 (the worst count utility u(0) = huffBelow − huffSlope × huffBelow, −60 at 30 and 3): the losses after which Y(n) − R + u(0) ≥ 50 holds every district. */
export function certainWinBound(cfg: DecreeConfig): number {
  const c = cfg.decree.count;
  const u0 = c.huffBelow - c.huffSlope * c.huffBelow;
  let worst = 0;
  for (const o of cfg.decree.offices) {
    let n = 0;
    while (R.disarray(n, (cfg.decree as { paperRules?: { disarray?: { first: number; ratio: number } } }).paperRules?.disarray) - o.rivalPull + u0 < 50 && n < 64) n++;
    worst = Math.max(worst, n);
  }
  return worst;
}

/** H7: texts drawn twice in hour 1 (hand-written texts, frames, notes, pickets), repeats in hours 2 and 3 as a share of comic draws, cells exhausted while their club is drawn. */
export function h7(tr: Pick<Trace, 'draws' | 'events' | 'started'>, cfg?: DecreeConfig): { hour1Repeats: number; repeats23: number; comic23: number; repeatShare23: number; notesRepeated: number; picketsRepeated: number; emptyCells: string[]; detail: string[] } {
  const t0 = tr.started;
  const h1d = tr.draws.filter((d) => d.t < t0 + 3600);
  const seen = new Map<string, number>();
  let hour1Repeats = 0;
  const detail: string[] = [];
  for (const d of h1d) {
    if (!COMIC.has(d.kind) && d.kind !== 'scripted') continue;
    const k = d.kind === 'template' ? `frame:${d.source}` : d.source;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n === 2 || d.returning) {
      hour1Repeats++;
      if (detail.length < 5) detail.push(k);
    }
  }
  const notes = h1d.filter((d) => d.note).map((d) => d.note!);
  const notesRepeated = notes.length - new Set(notes).size;
  const pickets = tr.events.filter((e) => e.type === 'boycottStart' && e.t < t0 + 3600).map((e) => /"picket":"([^"]*)"/.exec(e.detail)?.[1] ?? e.detail);
  const picketsRepeated = pickets.length - new Set(pickets).size;
  const all = new Map<string, number>();
  let repeats23 = 0;
  let comic23 = 0;
  for (const d of tr.draws) {
    if (!COMIC.has(d.kind)) continue;
    const k = d.kind === 'template' ? `text:${d.text}` : d.source;
    const n = (all.get(k) ?? 0) + 1;
    all.set(k, n);
    if (d.t >= t0 + 3600 && d.t < t0 + 3 * 3600) {
      comic23++;
      if ((n > 1 || d.returning) && d.kind !== 'template') repeats23++;
    }
  }
  const emptyCells: string[] = [];
  if (cfg) {
    const used = cellUse(tr.draws.filter((d) => d.t < t0 + 3600), cfg);
    for (const c of used) if (c.exhaustedWhileDrawn) emptyCells.push(c.cell);
  }
  return { hour1Repeats, repeats23, comic23, repeatShare23: comic23 ? repeats23 / comic23 : 0, notesRepeated, picketsRepeated, emptyCells, detail };
}

/** The use of every (office, club, archetype) cell: texts in the deck, distinct texts drawn, draws, and whether the cell ran out while its club was still drawn (H7, 7.7). */
export function cellUse(draws: readonly DrawRec[], cfg: DecreeConfig): { cell: string; texts: number; used: number; draws: number; exhaustedWhileDrawn: boolean }[] {
  const size = new Map<string, number>();
  const offices = cfg.decree.offices.map((o) => o.id);
  const cellOf = (office: string, club: string | null, archetype: string) => (archetype === 'vanity' || archetype === 'basket' ? `${office}/${archetype}` : `${office}/${club}/${archetype}`);
  for (const p of cfg.decree.deck.papers) {
    const os = p.office === 'any' ? offices : [p.office];
    for (const o of os) size.set(cellOf(o, p.club, p.archetype), (size.get(cellOf(o, p.club, p.archetype)) ?? 0) + 1);
  }
  const used = new Map<string, Set<string>>();
  const count = new Map<string, number>();
  const exhausted = new Set<string>();
  for (const d of draws) {
    if (d.kind !== 'comic' || !d.archetype) continue;
    const office = offices[d.office];
    const club = d.club === null ? null : cfg.decree.offices[d.office].clubs[d.club];
    const cell = cellOf(office, club, d.archetype);
    const set = used.get(cell) ?? new Set<string>();
    if (d.returning || set.has(d.source)) exhausted.add(cell);
    set.add(d.source);
    used.set(cell, set);
    count.set(cell, (count.get(cell) ?? 0) + 1);
  }
  return [...new Set([...size.keys(), ...used.keys()])].sort().map((cell) => ({ cell, texts: size.get(cell) ?? 0, used: used.get(cell)?.size ?? 0, draws: count.get(cell) ?? 0, exhaustedWhileDrawn: exhausted.has(cell) }));
}

/** The first repeat and the repeat share of each kind of text (comic, template, follow-up, note). */
export function repeatsByKind(tr: Pick<Trace, 'draws' | 'started'>): { kind: string; draws: number; repeats: number; share: number; firstRepeatAt: number | null }[] {
  const out = new Map<string, { draws: number; repeats: number; first: number | null; seen: Set<string> }>();
  const add = (kind: string, key: string, t: number, returning: boolean) => {
    const r = out.get(kind) ?? { draws: 0, repeats: 0, first: null, seen: new Set<string>() };
    r.draws++;
    if (r.seen.has(key) || returning) {
      r.repeats++;
      if (r.first === null) r.first = t - tr.started;
    }
    r.seen.add(key);
    out.set(kind, r);
  };
  for (const d of tr.draws) {
    add(d.kind, d.kind === 'template' ? d.text : d.source, d.t, d.returning);
    if (d.note) add('note', d.note, d.t, false);
  }
  return [...out].map(([kind, r]) => ({ kind, draws: r.draws, repeats: r.repeats, share: r.draws ? r.repeats / r.draws : 0, firstRepeatAt: r.first }));
}

/** H8: the reader's re-evaluations (both choices for ≥ 30 % of texts), its sign share of day papers, and how often it differs from the habits on the same strips. */
export function h8(tr: Pick<Trace, 'decisions'>): { reevaluated: number; bothShare: number; signShare: number; vsMoney: number; vsMood: number; vsTitle: number; deadTexts: { source: string; side: Choice; states: number }[] } {
  const day = tr.decisions.filter(isDayRec);
  const comic = day.filter((d) => COMIC.has(d.kind));
  const re = comic.filter((d) => d.reeval && d.reeval.length >= 2);
  const bySource = new Map<string, Choice[]>();
  for (const d of re) bySource.set(d.source, [...(bySource.get(d.source) ?? []), ...d.reeval!]);
  let both = 0;
  const deadTexts: { source: string; side: Choice; states: number }[] = [];
  for (const [source, cs] of bySource) {
    if (cs.includes('sign') && cs.includes('refuse')) both++;
    else deadTexts.push({ source, side: cs[0], states: cs.length });
  }
  const differ = (k: 'moneyOnly' | 'moodOnly' | 'titleLine') => {
    const xs = comic.filter((d) => d.alt);
    return xs.length ? xs.filter((d) => d.alt![k] !== d.choice).length / xs.length : 0;
  };
  return { reevaluated: bySource.size, bothShare: bySource.size ? both / bySource.size : 0, signShare: day.length ? day.filter((d) => d.choice === 'sign').length / day.length : 0, vsMoney: differ('moneyOnly'), vsMood: differ('moodOnly'), vsTitle: differ('titleLine'), deadTexts: deadTexts.sort((a, b) => a.source.localeCompare(b.source)) };
}

/** Wins, merit wins (D26: at zero consecutive losses) and the rest, per trace. */
export function wins(tr: Pick<Trace, 'elections'>): { elections: number; won: number; merit: number; meritOf: number; afterLosses: number; longestLosing: number } {
  let run = 0;
  let longest = 0;
  for (const e of tr.elections) {
    run = e.won ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  const fresh = tr.elections.filter((e) => e.lossesBefore === 0);
  return { elections: tr.elections.length, won: tr.elections.filter((e) => e.won).length, merit: fresh.filter((e) => e.won).length, meritOf: fresh.length, afterLosses: tr.elections.filter((e) => e.won && e.lossesBefore > 0).length, longestLosing: longest };
}

/** H10 on one trace: the share of day papers whose sign was unaffordable when they landed. */
export function unaffordableShare(tr: Pick<Trace, 'decisions'>): number {
  const day = tr.decisions.filter((d) => isDayRec(d) && d.signMoney < 0);
  const all = tr.decisions.filter(isDayRec);
  return all.length ? day.filter((d) => !d.affordableAtLanding).length / all.length : 0;
}

/** Per term: the mean district share at the count, the margin in districts, and NR after it (H10's per-term comparison). */
export function perTerm(tr: Pick<Trace, 'elections'>): { office: OfficeIx; term: number; share: number; margin: number; nr: number }[] {
  return tr.elections.map((e) => ({ office: e.office, term: e.term, share: e.shares.reduce((s, x) => s + x, 0) / Math.max(1, e.shares.length) / 100, margin: e.held - e.majority, nr: e.nrAfter }));
}

/** 8.4 opening: the first paper, the first purchase, paying moments in minutes 0 to 10 (a paper paying, or a purchase), flicks among thumb actions, purchases. */
export function opening(tr: Pick<Trace, 'decisions' | 'draws' | 'purchases' | 'started' | 'flicks' | 'taps'>): { firstPaper: number | null; firstPurchase: number | null; payingGapMedian: number; flickShare: number; purchases10: number } {
  const t0 = tr.started;
  const firstPaper = tr.decisions.length ? tr.decisions[0].landedAt - t0 : null;
  const firstPurchase = tr.purchases.length ? tr.purchases[0].t - t0 : null;
  const paying = [...tr.decisions.filter((d) => d.choice === 'sign' && d.applied.money > 0).map((d) => d.t), ...tr.purchases.map((p) => p.t)].filter((t) => t - t0 <= 600).sort((a, b) => a - b);
  const gaps = paying.map((t, i) => t - (i ? paying[i - 1] : t0));
  const flicks10 = tr.flicks.filter((t) => t - t0 <= 600).length;
  const taps10 = tr.taps.filter((t) => t - t0 <= 600).length;
  return { firstPaper, firstPurchase, payingGapMedian: gaps.length ? median(gaps) : Infinity, flickShare: flicks10 + taps10 ? flicks10 / (flicks10 + taps10) : 0, purchases10: tr.purchases.filter((p) => p.t - t0 <= 600).length };
}

/** 8.4 idle desk: the share of governing time in [a, b) with an empty desk, and the longest stretch with nothing on it and nothing affordable. */
export function idleDesk(tr: Pick<Trace, 'idle' | 'elections' | 'started'>, a: number, b: number): { emptyShare: number; nothingShare: number; longestNothing: number } {
  const t0 = tr.started;
  const lo = t0 + a;
  const hi = t0 + b;
  const clip = (x: IdleRec) => Math.max(0, Math.min(hi, x.to) - Math.max(lo, x.from));
  const empty = tr.idle.reduce((s, x) => s + clip(x), 0);
  const nothing = tr.idle.filter((x) => x.nothing).reduce((s, x) => s + clip(x), 0);
  const span = Math.max(1e-9, hi - lo);
  return { emptyShare: empty / span, nothingShare: nothing / span, longestNothing: tr.idle.filter((x) => x.nothing && clip(x) > 0).reduce((m, x) => Math.max(m, clip(x)), 0) };
}

/** 8.4 pace: the first election, governor, president (minutes of play), and whether every ministry opened by half of its office's first term. */
export function pace(tr: Pick<Trace, 'elections' | 'reached' | 'events' | 'decisions' | 'started'>, cfg?: DecreeConfig): { firstElection: number | null; governor: number | null; president: number | null; lateOpenings: string[] } {
  const m = (t: number | null) => (t === null ? null : (t - tr.started) / 60);
  const lateOpenings: string[] = [];
  if (cfg) {
    for (const o of [0, 1, 2] as OfficeIx[]) {
      const enter = tr.reached[o];
      if (enter === null) continue;
      // D34: every ministry of an office opens by the END of the office's first term (its first count).
      const endAt = tr.elections.find((e) => e.office === o && e.term === 1)?.t ?? null;
      const opened = new Set(tr.events.filter((e) => e.type === 'ministryOpened' && e.office === o && e.t >= enter && (endAt === null || e.t <= endAt)).map((e) => /"ministry":(\d+)/.exec(e.detail)?.[1]));
      const n = R.officeOf(cfg, o).ministries.length;
      if (endAt !== null && opened.size < n - 1) lateOpenings.push(`${R.officeOf(cfg, o).id}: ${opened.size + 1} of ${n} open at the end of the first term`);
    }
  }
  return { firstElection: tr.elections.length ? m(tr.elections[0].t) : null, governor: m(tr.reached[1]), president: m(tr.reached[2]), lateOpenings };
}

/** 8.4 tension: the median margin in districts, the share of elections with two districts within 5 points of 50, whether the first was won. */
export function tension(tr: Pick<Trace, 'elections'>): { medianMargin: number; twoClose: number; firstWon: boolean | null } {
  const e = tr.elections;
  return { medianMargin: e.length ? median(e.map((x) => Math.abs(x.held - x.majority))) : NaN, twoClose: e.length ? e.filter((x) => x.shares.filter((s) => Math.abs(s - 5000) <= 500).length >= 2).length / e.length : 0, firstWon: e.length ? e[0].won : null };
}

/** 8.4 per bot: boycotts and scandals an hour (and per term), the reader's baskets refused. */
export function eventsRate(tr: Pick<Trace, 'events' | 'decisions' | 'elections' | 'started' | 'ended'>): { boycottsPerHour: number; scandalsPerHour: number; scandalsPerTerm: number; basketsRefused: number } {
  const hours = Math.max(1e-9, (tr.ended - tr.started) / 3600);
  const b = tr.events.filter((e) => e.type === 'boycottStart').length;
  const s = tr.events.filter((e) => e.type === 'scandalStart').length;
  const baskets = tr.decisions.filter((d) => d.archetype === 'basket');
  return { boycottsPerHour: b / hours, scandalsPerHour: s / hours, scandalsPerTerm: s / Math.max(1, tr.elections.length), basketsRefused: baskets.length ? baskets.filter((d) => d.choice === 'refuse').length / baskets.length : 1 };
}

/** 8.4 money: paper gains as a share of dibs earned, and papers' costs (requisitions excluded) as a share of the income, in [a, b). */
export function money(tr: Pick<Trace, 'cash' | 'decisions' | 'started'>, a = 0, b = 3 * 3600): { paperGainShare: number; paperCostShare: number } {
  const lo = tr.started + a;
  const hi = tr.started + b;
  const inside = tr.cash.filter((c) => c.t >= lo && c.t < hi);
  const gains = inside.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0);
  const paper = inside.filter((c) => c.source === 'paper' && c.amount > 0).reduce((s, c) => s + c.amount, 0);
  const income = inside.filter((c) => c.source === 'tick').reduce((s, c) => s + c.amount, 0);
  const costs = tr.decisions.filter((d) => d.t >= lo && d.t < hi && d.kind !== 'requisition' && d.kind !== 'slip' && d.applied.money < 0).reduce((s, d) => s - d.applied.money, 0);
  return { paperGainShare: gains ? paper / gains : 0, paperCostShare: income ? costs / income : 0 };
}

/** 8.4 novelty: the longest gap between new things (a ministry, a minister, a storey, an office, a twist or Grand Project, a clipping, a monument, a first boycott, scandal or election) in [a, b). */
export function novelty(tr: Pick<Trace, 'events' | 'elections' | 'started'>, a: number, b: number): number {
  const seen = new Set<string>();
  const ts: number[] = [];
  for (const e of tr.events) {
    const key =
      e.type === 'ministryOpened' || e.type === 'storey' || e.type === 'appointed' || e.type === 'clipping' || e.type === 'monument' || e.type === 'moved'
        ? `${e.type}:${e.detail}`
        : e.type === 'termStarted' && /"next":"[^"]+"/.test(e.detail)
          ? `term:${e.detail}`
          : e.type === 'boycottStart' || e.type === 'scandalStart'
            ? e.type
            : null;
    if (key && !seen.has(key)) {
      seen.add(key);
      ts.push(e.t);
    }
  }
  if (tr.elections.length) ts.push(tr.elections[0].t);
  const lo = tr.started + a;
  const hi = tr.started + b;
  const xs = [lo, ...ts.filter((t) => t > lo && t < hi).sort((x, y) => x - y), hi];
  let gap = 0;
  for (let i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]);
  return gap;
}

/** The new office's income passes the old: minutes after each move until I passes the last income of the office below. */
export function passesOld(tr: Pick<Trace, 'samples' | 'reached'>): (number | null)[] {
  return [1, 2].map((o) => {
    const at = tr.reached[o];
    if (at === null) return null;
    const old = [...tr.samples].filter((s) => s.office === o - 1 && s.t <= at).pop();
    if (!old) return null;
    const pass = tr.samples.find((s) => s.office === o && s.t >= at && s.I > old.I);
    return pass ? (pass.t - at) / 60 : null;
  });
}

// ============================================================================================
// evaluate: one row per target
// ============================================================================================

const f1 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(1));
const f2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(2));
const pc = (x: number) => `${(100 * x).toFixed(0)} %`;
const row = (name: string, kind: BotRow['kind'], aim: string, value: string, ok: boolean, num: number | null = null): BotRow => ({ name, kind, aim, value, ok, num });
const READERS = new Set<BotId>(['reader', 'misreader', 'casual']);

/**
 * Every target one trace can show (8.3 hard targets, 8.4 aims, and reports). The hard rows hold on
 * every bot's trace; the reader's own rows (H8, pace, money, idle desk) only on the reference reader's.
 * Targets that need several seeds or bots are `acrossSeeds`.
 */
export function evaluate(cfg: DecreeConfig, tr: Trace): BotRow[] {
  const rows: BotRow[] = [];
  const a = h1(tr);
  rows.push(row('H1 printed equals applied', 'hard', '0 differences, 0 clamps, no stored paper changed, stale forms void', `${a.differences} differences, ${a.clamps} clamps, ${a.changed} changed, ${a.staleWithEffect} stale with effect${a.detail.length ? ` (${a.detail[0]})` : ''}`, a.differences + a.clamps + a.changed + a.staleWithEffect === 0, a.differences));
  const b = h2(tr);
  rows.push(row('H2 the poll is the count', 'hard', '0 differences, order as 2.10', `${b.differences} differences, ${b.orderWrong} orders wrong over ${tr.elections.length} counts`, b.differences + b.orderWrong === 0, b.differences));
  const c = h3(tr);
  const cut = tr.faults.find((f) => f.startsWith('H3: the take-back window'));
  const h3Exercised = tr.takeBacks.length + tr.reloads.length > 0;
  rows.push(row('H3 take-back and reload restore byte for byte', 'hard', '0 wrong; every take-back window lasts its 2 s', `${h3Exercised ? '' : 'not exercised (no take-back, no reload in this run; the windows are still checked): '}${c.takeBacksWrong} take-backs, ${c.reloadsWrong} reloads wrong (of ${tr.takeBacks.length}, ${tr.reloads.length}); ${c.windowsCut} windows cut short${cut ? ` (${cut.slice(4)})` : ''}`, c.takeBacksWrong + c.reloadsWrong + c.windowsCut === 0));
  const d = h4(tr);
  rows.push(row('H4 offline: the closed form, nothing else moves, pays once', 'hard', '0 wrong', `${d.absences} absences: ${d.wrongPay} paid wrong, ${d.moved} moved a mood/gossip/counter/day/poll, ${d.tooManyPapers} too many papers, ${d.jumps} clock-jump faults, ${d.stepsDiffer} differ from stepping`, d.wrongPay + d.moved + d.tooManyPapers + d.jumps + d.stepsDiffer === 0));
  rows.push(row('H4 earnings paid when computed', 'hard', 'paysOnCompute and catchUpSeconds 0', `paysOnCompute ${String(decreeEngineMode.paysOnCompute)}, catchUpSeconds ${String(decreeEngineMode.catchUpSeconds)}`, decreeEngineMode.paysOnCompute === true && decreeEngineMode.catchUpSeconds === 0));
  const e = h5(tr);
  rows.push(row('H5 dibs only through the named sources', 'hard', '0 unexplained, cash ≥ 0, refusing never costs, the rules book only their five sources', `${e.unexplained} unexplained, ${e.negative} below 0, ${e.refuseCost} refusals that cost${e.foreignBook.length ? `, rules booked ${e.foreignBook.join(', ')}` : ''}; by source ${Object.entries(e.bySource).map(([k, v]) => `${k} ${v.toPrecision(3)}`).join(', ')}`, e.unexplained + e.negative + e.refuseCost + e.foreignBook.length === 0));
  const f = h6(tr, cfg.decree.boycott.papers, cfg.decree.scandal.sayNothingPapers);
  const bound = certainWinBound(cfg);
  const boundMax = Math.min(8, cfg.decree.ladder.maxLossesBound);
  rows.push(row('H6 no dead end', 'hard', `refuse always possible, every boycott and scandal ends within its count, ministry 0 always earns, 2.11 bound ≤ ${boundMax} (D25), a win within 6 terms of a first loss`, `${f.refuseRefused} refuses refused, ${f.overran} overran, ${f.zeroIncome} samples without ministry 0 income, bound ${bound}, worst ${f.worstTermsToWin ?? 'no loss'} terms`, f.refuseRefused + f.overran + f.zeroIncome === 0 && bound <= boundMax && (f.worstTermsToWin === null || f.worstTermsToWin <= 6), bound));
  const t0 = tr.started;
  // A handover run: only the rows every trace holds (its targets are acrossSeeds' H6 and H12).
  if (tr.handover) {
    rows.push(row('H11 number range', 'hard', 'below 1e30', tr.maxNumber.toExponential(2), tr.maxNumber < 1e30, tr.maxNumber));
    const w = wins(tr);
    rows.push(row('wins', 'report', '', `${w.won} of ${w.elections}, the reader from ${tr.handover.habit}'s state at ${f1((tr.handover.at - t0) / 60)} min`, true, w.elections ? w.won / w.elections : null));
    return rows;
  }
  // D19: the hour-one gate holds for the reader (at 4, 6 and 9 s), always-refuse and random; ad-everything is reported.
  if (tr.ended - t0 >= 3600 && (tr.bot === 'reader' || tr.bot === 'alwaysRefuse' || tr.bot === 'random' || tr.bot === 'adEverything')) {
    const g = h7(tr, cfg);
    rows.push(row('H7 no text twice in hour 1', tr.bot === 'adEverything' ? 'report' : 'hard', '0 hand-written texts, frames, notes or pickets twice; no cell empty while its club is drawn', `${g.hour1Repeats} texts, ${g.notesRepeated} notes, ${g.picketsRepeated} pickets; ${g.emptyCells.length} cells ran out${g.emptyCells.length ? ` (${g.emptyCells.slice(0, 3).join(', ')})` : ''}`, g.hour1Repeats + g.notesRepeated + g.picketsRepeated + g.emptyCells.length === 0, g.hour1Repeats));
    if (tr.bot === 'reader' && tr.ended - t0 >= 3 * 3600) rows.push(row('H7 repeats in hours 2 and 3 (reader)', 'hard', '≤ 2 % of comic draws', `${pc(g.repeatShare23)} (${g.repeats23} of ${g.comic23})`, g.repeatShare23 <= 0.02, g.repeatShare23));
  }
  // H8 is a gate of a 3-hour reader game (its re-evaluations are hours 2 and 3): the short runs that
  // exist for H3 (10 min, 1 h) do not carry it.
  if (tr.bot === 'reader' && tr.ended - t0 >= 3 * 3600) {
    const h = h8(tr);
    if (tr.ended - t0 >= 3 * 3600) rows.push(row('H8 both choices in other states', 'hard', '≥ 30 % of texts', `${pc(h.bothShare)} of ${h.reevaluated} texts`, h.bothShare >= 0.3, h.bothShare));
    rows.push(row('H8 reader signs', 'hard', '40 to 65 % of day papers', pc(h.signShare), h.signShare >= 0.4 && h.signShare <= 0.65, h.signShare));
    rows.push(row('H8 differs from money-only', 'hard', '≥ 25 %', pc(h.vsMoney), h.vsMoney >= 0.25, h.vsMoney));
    rows.push(row('H8 differs from mood-only', 'hard', '≥ 25 %', pc(h.vsMood), h.vsMood >= 0.25, h.vsMood));
    rows.push(row('H8 differs from the title line', 'hard', '≤ 30 %', pc(h.vsTitle), h.vsTitle <= 0.3, h.vsTitle));
    const u = unaffordableShare(tr);
    rows.push(row('H10 sign unaffordable for the reader', 'hard', '≤ 5 % of papers', pc(u), u <= 0.05, u));
  }
  rows.push(row('H11 number range', 'hard', 'below 1e30', tr.maxNumber.toExponential(2), tr.maxNumber < 1e30, tr.maxNumber));
  // ------------------------------------------------------------------ aims (8.4), the reference reader's
  if (READERS.has(tr.bot)) {
    const o = opening(tr);
    rows.push(row('8.4 first paper', 'aim', 'by 10 s', f1(o.firstPaper), o.firstPaper !== null && o.firstPaper <= 10, o.firstPaper));
    rows.push(row('8.4 first purchase', 'aim', 'by 0:20', f1(o.firstPurchase), o.firstPurchase !== null && o.firstPurchase <= 20, o.firstPurchase));
    rows.push(row('8.4 paying moment, minutes 0 to 10', 'aim', 'every 30 s at the median', f1(o.payingGapMedian), o.payingGapMedian <= 30, o.payingGapMedian));
    rows.push(row('8.4 flicks among thumb actions, minutes 0 to 10', 'aim', '≥ 70 %', pc(o.flickShare), o.flickShare >= 0.7, o.flickShare));
    rows.push(row('8.4 purchases, minutes 0 to 10', 'aim', '≥ 20', String(o.purchases10), o.purchases10 >= 20, o.purchases10));
    const i30 = idleDesk(tr, 0, 1800);
    rows.push(row('8.4 empty desk, minutes 0 to 30', 'aim', '≤ 10 % of governing time', pc(i30.emptyShare), i30.emptyShare <= 0.1, i30.emptyShare));
    rows.push(row('8.4 nothing on the desk and nothing affordable, minutes 0 to 30 (D24)', 'aim', '≤ 15 %', pc(i30.nothingShare), i30.nothingShare <= 0.15, i30.nothingShare));
    rows.push(row('8.4 longest stretch with nothing to do', 'aim', '≤ 8 s', f1(i30.longestNothing), i30.longestNothing <= 8, i30.longestNothing));
    if (tr.ended - t0 >= 3 * 3600) {
      const i13 = idleDesk(tr, 3600, 3 * 3600);
      rows.push(row('8.4 empty desk, hours 1 to 3', 'aim', '≤ 10 %', pc(i13.emptyShare), i13.emptyShare <= 0.1, i13.emptyShare));
    }
    const p = pace(tr, cfg);
    const inBand = (x: number | null, lo: number, hi: number) => x !== null && x >= lo && x <= hi;
    rows.push(row('8.4 pace: first election', 'aim', '11 to 15 min', f1(p.firstElection), inBand(p.firstElection, 11, 15), p.firstElection));
    rows.push(row('8.4 pace: governor', 'aim', '12 to 30 min', f1(p.governor), inBand(p.governor, 12, 30), p.governor));
    rows.push(row('8.4 pace: president', 'aim', '55 to 95 min', f1(p.president), inBand(p.president, 55, 95), p.president));
    rows.push(row('8.4 every ministry opens by the end of its first term (D34)', 'aim', 'all', p.lateOpenings.join('; ') || 'all', p.lateOpenings.length === 0));
    const tn = tension(tr);
    rows.push(row('8.4 median margin', 'aim', '1 district', f1(tn.medianMargin), tn.medianMargin === 1, tn.medianMargin));
    rows.push(row('8.4 two districts within 5 points', 'aim', 'in half the elections', pc(tn.twoClose), tn.twoClose >= 0.5, tn.twoClose));
    const ev = eventsRate(tr);
    if (tr.bot === 'reader') rows.push(row('D38 reader boycotts', 'aim', '≤ 0.3 an hour', f2(ev.boycottsPerHour), ev.boycottsPerHour <= 0.3, ev.boycottsPerHour));
    else rows.push(row('8.4 reader boycotts', 'aim', '≤ 1 an hour', f2(ev.boycottsPerHour), ev.boycottsPerHour <= 1, ev.boycottsPerHour));
    rows.push(row('8.4 reader scandals', 'aim', '≤ 1 per 2 h', f1(ev.scandalsPerHour), ev.scandalsPerHour <= 0.5, ev.scandalsPerHour));
    rows.push(row('8.4 reader refuses baskets', 'aim', '≥ 80 %', pc(ev.basketsRefused), ev.basketsRefused >= 0.8, ev.basketsRefused));
    const mo = money(tr);
    rows.push(row('8.4 paper gains share of dibs, hours 0 to 3', 'aim', '10 to 25 %', pc(mo.paperGainShare), mo.paperGainShare >= 0.1 && mo.paperGainShare <= 0.25, mo.paperGainShare));
    rows.push(row('8.4 papers take of the reader\'s income', 'aim', '20 to 35 %', pc(mo.paperCostShare), mo.paperCostShare >= 0.2 && mo.paperCostShare <= 0.35, mo.paperCostShare));
    const po = passesOld(tr);
    po.forEach((m, k) => m !== null && rows.push(row(`8.4 ${k ? 'president' : 'governor'} passes the old income`, 'aim', '4 to 8 min', f1(m), m >= 4 && m <= 8, m)));
    rows.push(row('8.4 novelty, minutes 0 to 30', 'aim', 'something new every 3 min', `${f1(novelty(tr, 0, 1800) / 60)} min longest gap`, novelty(tr, 0, 1800) <= 180, novelty(tr, 0, 1800)));
    if (tr.ended - t0 >= 3 * 3600) rows.push(row('8.4 novelty, hours 1 to 3', 'aim', 'every 15 min', `${f1(novelty(tr, 3600, 3 * 3600) / 60)} min longest gap`, novelty(tr, 3600, 3 * 3600) <= 900, novelty(tr, 3600, 3 * 3600)));
  }
  // D38: a careless mayor meets boycotts (the happier-club habit ≥ 1 an hour, always-refuse and random ≥ 0.5; the reader ≤ 0.3 above).
  if (tr.bot === 'alwaysRefuse' || tr.bot === 'random' || tr.bot === 'happier') {
    const ev = eventsRate(tr);
    const aim = tr.bot === 'happier' ? 1 : 0.5;
    rows.push(row(`D38 ${tr.bot} boycotts`, 'aim', `≥ ${aim} an hour`, f2(ev.boycottsPerHour), ev.boycottsPerHour >= aim, ev.boycottsPerHour));
  }
  if (tr.bot === 'alwaysSign') {
    const ev = eventsRate(tr);
    rows.push(row('8.4 always-sign scandals', 'aim', '≥ 1 a term', f1(ev.scandalsPerTerm), ev.scandalsPerTerm >= 1, ev.scandalsPerTerm));
    const mo = money(tr);
    rows.push(row('8.4 papers take of always-sign\'s income', 'aim', '45 to 70 %', pc(mo.paperCostShare), mo.paperCostShare >= 0.45 && mo.paperCostShare <= 0.7, mo.paperCostShare));
  }
  if (tr.bot === 'goalFollower') {
    const u = unaffordableShare(tr);
    rows.push(row('8.4 goal-follower finds papers unaffordable', 'aim', '≤ 10 %', pc(u), u <= 0.1, u));
  }
  // ------------------------------------------------------------------ reports
  const w = wins(tr);
  rows.push(row('wins', 'report', '', `${w.won} of ${w.elections} (on merit ${w.merit} of ${w.meritOf}; after losses ${w.afterLosses}; longest losing run ${w.longestLosing})`, true, w.elections ? w.won / w.elections : null));
  rows.push(row('repeats by kind', 'report', '', repeatsByKind(tr).map((r) => `${r.kind} ${r.repeats}/${r.draws}${r.firstRepeatAt !== null ? ` first at ${f1(r.firstRepeatAt / 60)} min` : ''}`).join('; '), true));
  rows.push(row('reader constants (D27: never tuned)', 'report', '', json(READER_CONSTANTS), true));
  return rows;
}

// ============================================================================================
// across seeds
// ============================================================================================

/** What one seed's run of one bot contributes to the targets across seeds. */
export interface SeedSummary {
  seed: number;
  bot: BotId;
  hand: number;
  elections: number;
  won: number;
  merit: number;
  meritOf: number;
  firstWon: boolean | null;
  governor: number | null;
  president: number | null;
  nrAt3h: number | null;
  perTerm: ReturnType<typeof perTerm>;
  /** H6's and H12's handover runs. */
  handover?: { habit: BotId; winsWithin2: boolean; lifted: boolean | null };
  /** For the tuning table (pass counts and ranges per bot and hand): D38, H10, D24, the pace aims. */
  extra?: { firstElection: number | null; boycottsPerHour: number; scandalsPerHour: number; unaffordable: number; emptyDesk30: number; nothing30: number; emptyDesk13: number | null; signShare: number; lateOpenings: number; monuments: number; papers: number };
}

export function summarize(tr: Trace, handedOver: BotRun['handedOver'] = null, habit: BotId | null = null, cfg?: DecreeConfig): SeedSummary {
  const w = wins(tr);
  const p = pace(tr, cfg);
  const at3 = [...tr.samples].filter((s) => s.t <= tr.started + 3 * 3600).pop();
  const out: SeedSummary = { seed: tr.seed, bot: tr.bot, hand: tr.hand, elections: w.elections, won: w.won, merit: w.merit, meritOf: w.meritOf, firstWon: tension(tr).firstWon, governor: p.governor, president: p.president, nrAt3h: at3 ? at3.nr : null, perTerm: perTerm(tr) };
  if (!handedOver) {
    const ev = eventsRate(tr);
    const i30 = idleDesk(tr, 0, 1800);
    const long = tr.ended - tr.started >= 3 * 3600;
    const day = tr.decisions.filter(isDayRec);
    out.extra = {
      firstElection: p.firstElection, boycottsPerHour: ev.boycottsPerHour, scandalsPerHour: ev.scandalsPerHour, unaffordable: unaffordableShare(tr),
      emptyDesk30: i30.emptyShare, nothing30: i30.nothingShare, emptyDesk13: long ? idleDesk(tr, 3600, 3 * 3600).emptyShare : null,
      signShare: day.length ? day.filter((d) => d.choice === 'sign').length / day.length : 0, lateOpenings: p.lateOpenings.length,
      monuments: tr.events.filter((e) => e.type === 'monument').length, papers: day.length,
    };
  }
  if (handedOver && habit) {
    const after = tr.elections.filter((e) => e.t >= handedOver.t);
    const winsWithin2 = after.slice(0, 2).some((e) => e.won);
    // H12: from below 35, approval back to 50 within 80 papers.
    let lifted: boolean | null = null;
    if (handedOver.approval < 35) {
      const days = tr.decisions.filter((d) => d.t >= handedOver.t && isDayRec(d)).slice(0, 80);
      const until = days.length ? days[days.length - 1].t : handedOver.t;
      lifted = tr.samples.some((s) => s.t >= handedOver.t && s.t <= until + 60 && s.approval >= 50);
    }
    out.handover = { habit, winsWithin2, lifted };
  }
  return out;
}

/** The targets of 8.3 and 8.4 that need many seeds (H6 handover, H9, H10, H12; first election won; D27's readers). */
export function acrossSeeds(sums: readonly SeedSummary[]): BotRow[] {
  const rows: BotRow[] = [];
  const by = (b: BotId, hand = HAND.decision) => sums.filter((s) => s.bot === b && s.hand === hand && !s.handover);
  const share = (xs: SeedSummary[], merit: boolean) => {
    const n = xs.reduce((s, x) => s + (merit ? x.meritOf : x.elections), 0);
    return n ? xs.reduce((s, x) => s + (merit ? x.merit : x.won), 0) / n : NaN;
  };
  const ok = (x: number, test: (x: number) => boolean) => Number.isFinite(x) && test(x);
  const reader = by('reader');
  const r = share(reader, false);
  if (reader.length) rows.push(row('H9 wins reader', 'hard', '≥ 85 % (D27 aims 90 %)', `${pc(r)} over ${reader.length} seeds`, ok(r, (x) => x >= 0.85), r));
  const gates: [BotId, number, string, boolean][] = [
    ['alwaysSign', 0.45, 'H9 wins always-sign (merit, D26)', true],
    ['random', 0.35, 'H9 wins random (merit)', true],
    ['alwaysRefuse', 0.25, 'H9 wins always-refuse (merit)', true],
  ];
  for (const [b, hi, name] of gates) {
    const xs = by(b);
    if (!xs.length) continue;
    const s = share(xs, true);
    rows.push(row(name, 'hard', `≤ ${pc(hi)}`, `${pc(s)} over ${xs.length} seeds (all wins ${pc(share(xs, false))})`, ok(s, (x) => x <= hi), s));
  }
  // D27's order of importance (aims the tuning works toward).
  const d27: [BotId, (x: number) => boolean, string, boolean][] = [
    ['misreader', (x) => x >= 0.75, '≥ 75 %', false],
    ['casual', (x) => x >= 0.6, '≥ 60 %', false],
    ['reader', (x) => x >= 0.9, '≥ 90 %', false],
    ['alwaysSign', (x) => x <= 0.35, '≤ 35 % on merit', true],
    ['random', (x) => x <= 0.3, '≤ 30 % on merit', true],
    ['alwaysRefuse', (x) => x <= 0.25, '≤ 25 % on merit', true],
    ['happier', (x) => x <= 0.6, '≤ 60 %', false],
  ];
  d27.forEach(([b, test, aim, merit], i) => {
    const xs = by(b);
    if (!xs.length) return;
    const s = share(xs, merit);
    rows.push(row(`D27 (${i + 1}) wins ${b}`, 'aim', aim, `${pc(s)} over ${xs.length} seeds`, ok(s, test), s));
  });
  for (const b of BOTS.cheap) {
    const xs = by(b);
    if (!xs.length) continue;
    rows.push(row(`D27 cheap habit ${b}: wins on merit (all wins)`, 'report', 'beside happier ≤ 60 %', `${pc(share(xs, true))} (${pc(share(xs, false))}) over ${xs.length} seeds`, true, share(xs, true)));
  }
  const meanT = (xs: SeedSummary[], k: 'president' | 'governor', cap: number) => (xs.length ? xs.reduce((s, x) => s + (x[k] ?? cap), 0) / xs.length : NaN);
  const rT = meanT(reader, 'president', 180);
  const timeGates: [BotId, number][] = [['alwaysSign', 1.5], ['alwaysRefuse', 1.5], ['random', 1.5], ['noBuy', 1.5], ['moneyOnly', 1.2], ['happier', 1.2]];
  for (const [b, k] of timeGates) {
    const xs = by(b);
    if (!xs.length || !reader.length) continue;
    const t = meanT(xs, 'president', 180);
    rows.push(row(`H9 time to president ${b}`, b === 'happier' ? 'aim' : 'hard', `≥ ${k} × the reader's (${f1(rT)} min; not reached counts 180)`, `${f1(t)} min (${xs.filter((x) => x.president !== null).length} of ${xs.length} reached)`, ok(t / rT, (x) => x >= k), t / rT));
  }
  const rNR = reader.length ? reader.reduce((s, x) => s + (x.nrAt3h ?? 0), 0) / reader.length : NaN;
  for (const b of ['alwaysSign', 'alwaysRefuse', 'random'] as BotId[]) {
    const xs = by(b);
    if (!xs.length || !reader.length) continue;
    const nr = xs.reduce((s, x) => s + (x.nrAt3h ?? 0), 0) / xs.length;
    rows.push(row(`H9 NR at 3 h ${b}`, 'hard', `≤ 0.6 × the reader's (${f1(rNR)})`, `${f1(nr / rNR)} ×`, ok(nr / rNR, (x) => x <= 0.6), nr / rNR));
  }
  // H10: ad-everything against passive on paired seeds, per term.
  const ads = sums.filter((s) => s.bot === 'adEverything');
  const pas = sums.filter((s) => s.bot === 'passive');
  if (ads.length && pas.length) {
    let worst = 0;
    let pairs = 0;
    for (const a of ads) {
      const p = pas.find((x) => x.seed === a.seed);
      if (!p) continue;
      pairs++;
      a.perTerm.forEach((t, k) => {
        const q = p.perTerm[k];
        if (!q) return;
        worst = Math.max(worst, Math.abs(t.share - q.share), Math.abs(t.nr - q.nr));
      });
    }
    rows.push(row('H10 money cannot reach the vote', 'hard', 'share and NR per term within 3 points (paired seeds)', `worst ${f1(worst)} points over ${pairs} pairs`, pairs > 0 && worst <= 3, worst));
  }
  const firsts = reader.filter((s) => s.firstWon !== null);
  if (firsts.length) rows.push(row('8.4 first election won', 'aim', '13 of 15 seeds', `${firsts.filter((s) => s.firstWon).length} of ${firsts.length}`, firsts.filter((s) => s.firstWon).length >= Math.ceil((13 / 15) * firsts.length), firsts.filter((s) => s.firstWon).length));
  const hand = sums.filter((s) => s.handover);
  for (const habit of [...new Set(hand.map((s) => s.handover!.habit))]) {
    const xs = hand.filter((s) => s.handover!.habit === habit);
    const n = xs.filter((s) => s.handover!.winsWithin2).length;
    rows.push(row(`H6 reader from ${habit}'s state wins within 2 elections`, 'hard', '≥ 13 of 15 seeds', `${n} of ${xs.length}`, n >= Math.ceil((13 / 15) * xs.length), n));
    const lift = xs.filter((s) => s.handover!.lifted !== null);
    if (habit === 'alwaysRefuse' && lift.length) {
      const m = lift.filter((s) => s.handover!.lifted).length;
      rows.push(row('H12 no gossip spiral: approval from below 35 to 50 within 80 papers', 'hard', '≥ 13 of 15 seeds', `${m} of ${lift.length} (${xs.length - lift.length} seeds started at 35 or above)`, m >= Math.ceil((13 / 15) * lift.length), m));
    }
  }
  return rows;
}
