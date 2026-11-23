/**
 * The skeleton's marker for a rule whose body was not written yet. Every rule is built now and no
 * rules function throws it; the class stays exported only because the balance bot's guard
 * (src/engine/merge/bot.ts, scripts/content/merge-bot.ts: the numbers package's files) still names
 * it. Delete it with those two lines.
 */
export class NotBuiltError extends Error {
  constructor(readonly rule: string) {
    super(`merge rules: ${rule}() is not built yet (docs/design/market-build-plan.md names its package)`);
    this.name = 'NotBuiltError';
  }
}
