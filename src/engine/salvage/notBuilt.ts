/**
 * Hour 0's marker (docs/design/yard-stage1.md section 9): a rule whose body is not written yet. The
 * facade's STUB bodies (src/engine/salvage.ts, "// STUB(hour 0)") never throw while rendering: an action
 * reports the refusal `notBuilt` and returns the same state; a selector returns an empty or frozen
 * answer. `NotBuiltError` is for a rules file that must stop (a bot that reaches an unbuilt rule).
 */
export class NotBuiltError extends Error {
  constructor(what: string) {
    super(`salvage: ${what} is not built yet (hour 0 stub)`);
    this.name = 'NotBuiltError';
  }
}
