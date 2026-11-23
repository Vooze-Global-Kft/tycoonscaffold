/**
 * The balance bots of 8.2 on the real engine, event to event (8.1 step 4; WEB_ONLY: the web presets
 * are built from its states, scripts/content/decree-bot.ts runs it in Node). Owned by the bot
 * engineer (docs/design/office-build-plan.md), written against the public interface
 * src/engine/decree.ts only (this file is the one rules file that may also read the others).
 *
 * Hand model: a decision 6 s after landing (also 4 and 9 s), plus the 2 s rest after a sign; a slip
 * 1.5 s; a sheet 3 s; election night 12 s. No bot sees a hidden number: the reader scores only what
 * the strips print (`stripOf`).
 *
 * Skeleton: the bot list and the types; `runDecreeBot` throws notBuilt.
 */
import { notBuilt } from './notBuilt';
import type { DecreeConfig, DecreeGame } from './types';

/** The bots of 8.2, by group. */
export const BOTS = {
  /** 1. The reference: scores each outcome in seconds of B from what the strips print (8.2's V(o)). */
  reference: ['reader'],
  /** 2. Habits: only day-paper choices differ from the reader. */
  habits: ['alwaysSign', 'alwaysRefuse', 'random', 'moneyOnly', 'moodOnly'],
  /** 3. Buying habits. */
  buying: ['noBuy', 'goalFollower'],
  /** 4. Sessions. */
  sessions: ['passive', 'checkIn', 'idle', 'adEverything'],
  /** 5. Adversaries: the reader plus one habit. */
  adversaries: ['clockForward', 'clockBack', 'clockForwardAgain', 'reloadAfterDraw', 'reloadAfterDecision', 'reloadInTakeBack', 'hoardTray', 'quitElectionNight', 'closeDuringEvents', 'away299', 'away301', 'flickBlind'],
} as const;
export type BotId = (typeof BOTS)[keyof typeof BOTS][number];
export const ALL_BOTS: readonly BotId[] = Object.values(BOTS).flat() as BotId[];

/** The hand model of 8.2, seconds. */
export const HAND = { decision: 6, fast: 4, slow: 9, takeBackRest: 2, slip: 1.5, sheet: 3, electionNight: 12 } as const;

export interface BotOptions {
  bot: BotId;
  seed: number;
  /** Play hours to run (or until `stop`). */
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
}

export interface BotRow {
  name: string;
  kind: 'hard' | 'aim' | 'report';
  aim: string;
  value: string;
  ok: boolean;
  num?: number | null;
}

export interface BotRun {
  game: DecreeGame;
  states: Record<number, DecreeGame>;
  rows: BotRow[];
}

/** Plays `opts.bot` on the engine. Skeleton: throws notBuilt. */
export function runDecreeBot(cfg: DecreeConfig, opts: BotOptions): BotRun {
  return notBuilt('runDecreeBot');
}
