/**
 * The words of a game's reminders and where they come from: game.json `reminders` (sim and classic
 * games), or the mode entry's own (a mode whose words live in its string table: haul, merge). No
 * native import: the mode contract and the tests read this file.
 */
import type { GameConfig } from '../config/schema';
import type { ReminderKind } from '../engine/reminders';

/** What a reminder says, in the game's own voice. */
export interface ReminderText {
  title: string;
  body: string;
}

/** A game's reminder words: one text per kind, and the name of the Android notification channel (shown in the phone's settings). */
export type ReminderTexts = Record<ReminderKind, ReminderText> & { channel: string };

let modeTexts: ReminderTexts | null = null;

/** The mode entry's reminder words (src/modes/contract.ts `installMode`); null for a mode that brings none. */
export function setModeReminderTexts(texts: ReminderTexts | null): void {
  modeTexts = texts;
}

/** The game's reminder words: the mode's own when it brings them, else game.json `reminders`; null when the game has none (then no reminder is ever shown or asked for). */
export function reminderTexts(cfg: GameConfig): ReminderTexts | null {
  return modeTexts ?? cfg.reminders ?? null;
}

/** Words that make a notification an offer. A reminder never names a price, a sale or a deal (docs/design/research/policy.md 2). */
const OFFER_WORDS = /(\b(sale|deal|deals|offer|offers|discount|price|prices|buy|purchase|shop|limited|bargain)\b|%\s*off|[$€£])/i;

/** Limits a phone shows without cutting: the bold line and the line under it. */
export const REMINDER_LIMITS = { title: 40, body: 110, channel: 40 } as const;

/** What is wrong with a game's reminder words, as a list of sentences ([] = fine). */
export function reminderTextProblems(texts: ReminderTexts): string[] {
  const out: string[] = [];
  if (!texts.channel || texts.channel.length > REMINDER_LIMITS.channel) out.push(`the channel name must be 1 to ${REMINDER_LIMITS.channel} characters`);
  for (const kind of ['awayFull', 'later'] as const) {
    const t = texts[kind];
    if (!t || !t.title || !t.body) {
      out.push(`${kind} needs a title and a body`);
      continue;
    }
    if (t.title.length > REMINDER_LIMITS.title) out.push(`${kind}.title is ${t.title.length} characters; a phone shows ${REMINDER_LIMITS.title}`);
    if (t.body.length > REMINDER_LIMITS.body) out.push(`${kind}.body is ${t.body.length} characters; a phone shows ${REMINDER_LIMITS.body}`);
    const offer = OFFER_WORDS.exec(`${t.title} ${t.body}`);
    if (offer) out.push(`${kind} reads as an offer ("${offer[0]}"): a reminder never names a price, a sale or a deal`);
  }
  return out;
}
