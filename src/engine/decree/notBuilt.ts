/**
 * The skeleton's marker for a rule whose body is not written yet (spec 9.2 hour 0). A function whose
 * doc comment says "Skeleton: throws notBuilt" throws this until its package writes it; the store
 * actions (src/modes/decree/actions.ts) catch it and play `denied`, and the placeholder screens print
 * "not built". Delete this file once no rule throws it (P1a owns it).
 *
 * `standIn(fn, built, fallback)`: the paper core's bridge over a function of the other rules package
 * that is not built yet (the seam table of docs/design/office-build-plan.md): `built()` is called, and
 * only while it throws NotBuiltError the local `fallback()` answers. Once the real body lands the
 * fallback is dead code (the integration engineer deletes every `standIn` call; rules-paper's
 * handover notes list them). A function that threw once is remembered, so the fallback costs no
 * exception per call.
 */
export class NotBuiltError extends Error {
  constructor(readonly rule: string) {
    super(`decree rules: ${rule}() is not built yet (docs/design/office-build-plan.md names its package)`);
    this.name = 'NotBuiltError';
  }
}

/** Throws NotBuiltError for `rule`. */
export function notBuilt(rule: string): never {
  throw new NotBuiltError(rule);
}

const unbuilt = new WeakSet<object>();

/** `built()` (a call of `fn`, another package's function), or `fallback()` while `fn` throws NotBuiltError. */
export function standIn<T>(fn: object, built: () => T, fallback: () => T): T {
  if (unbuilt.has(fn)) return fallback();
  try {
    return built();
  } catch (e) {
    if (!(e instanceof NotBuiltError)) throw e;
    unbuilt.add(fn);
    return fallback();
  }
}
