/**
 * engine3 (time away made cheaper, results unchanged bit for bit; notes/engine3.md). Owner: the loop's engineer.
 *
 * The rules keep a few DERIVED memos for the length of one transition (a Ctx: one tick, jump, action or away
 * pass): each is a pure function of the content and of named fields of the state, held beside the state (never in
 * it, never saved, never read by a rule's result other than as the value it stands for), and dropped whenever what
 * it was derived from may have changed. `MEMO_CHECK.verify` (tests and the engine3 checker only; false in the
 * game) makes every memo hit recompute its value and throw when the two differ, so a memo that was not dropped
 * where it should have been shows at once.
 */
export const MEMO_CHECK = { verify: false };

/** Throw when a memo's kept value differs from the value recomputed (verify mode only). */
export function memoMismatch(what: string, kept: unknown, fresh: unknown): never {
  throw new Error(`engine3 memo ${what}: kept ${JSON.stringify(kept)} but recomputed ${JSON.stringify(fresh)}`);
}
