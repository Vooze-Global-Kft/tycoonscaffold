/**
 * The skeleton's marker for a rule whose body is not written yet (spec 9.2 hour 0). A function whose
 * doc comment says "Skeleton: throws notBuilt" throws this until its package writes it; the store
 * actions (src/modes/decree/actions.ts) catch it and play `denied`, and the placeholder screens print
 * "not built". Delete this file once no rule throws it (P1a owns it).
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
