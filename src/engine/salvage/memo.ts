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

/**
 * works.ts routeOf's kept answers for one transition (keyed by its Ctx, with the content object they were read on). Here
 * rather than in works.ts so that the files that drop them (rate.ts, actionsWorks.ts) need nothing of works.ts.
 */
export const ROUTES = new WeakMap<object, { c: object; at: Map<string, string | null> }>();

/** engine3: drop the transition's kept routes (works.ts routeOf): call after changing a plate's phase or heat, a route, a recipe or what is owned. */
export function routesChanged(x: object): void {
  ROUTES.delete(x);
}

/** Throw when a memo's kept value differs from the value recomputed (verify mode only). */
export function memoMismatch(what: string, kept: unknown, fresh: unknown): never {
  throw new Error(`engine3 memo ${what}: kept ${JSON.stringify(kept)} but recomputed ${JSON.stringify(fresh)}`);
}
