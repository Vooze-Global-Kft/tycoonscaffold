/**
 * The skeleton's marker for a rule whose body is not written yet: `throw notBuilt('dropAt')`.
 * A caller that must not fail (the store actions, the screens) catches it like any rules error.
 * Delete this file once no rules file imports it (the MECHANICS package checks with
 * `grep -rn notBuilt src/engine/merge*`; docs/design/market-build-plan.md).
 */
export class NotBuiltError extends Error {
  constructor(readonly rule: string) {
    super(`merge rules: ${rule}() is not built yet (docs/design/market-build-plan.md names its package)`);
    this.name = 'NotBuiltError';
  }
}

export function notBuilt(rule: string): NotBuiltError {
  return new NotBuiltError(rule);
}
