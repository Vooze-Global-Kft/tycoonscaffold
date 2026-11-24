/**
 * The skeleton's marker for a rule whose body was not written yet (spec 9.2 hour 0). Every rule is
 * built now and nothing in src/engine/decree throws it; the class stays only because callers outside
 * the rules still name it in `instanceof` checks (the placeholder desk, src/ui/decree/desk/DeskCanvas.tsx;
 * the bot, src/engine/decree/bot.ts; src/modes/decree/actions.ts). Delete it with those checks.
 */
export class NotBuiltError extends Error {
  constructor(readonly rule: string) {
    super(`decree rules: ${rule}() is not built yet (docs/design/office-build-plan.md names its package)`);
    this.name = 'NotBuiltError';
  }
}
