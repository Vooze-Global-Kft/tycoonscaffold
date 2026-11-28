/**
 * THE WORKS' DEVELOPMENT SWITCH (PLAN2 2.4, 7 D1; C-MODE). The content keeps `salvage.release.stage` 1 (the first yard
 * the owner plays, every store build); stage 2 ("the works") is turned on for ONE development run only:
 *
 *   GAME=scrap-yard STAGE=2 npm run go        (scripts/go.js passes STAGE on as EXPO_PUBLIC_YARD_STAGE=2; Metro inlines it)
 *   ?stage=2 on the web preview's address     (./stage.web.ts, Metro's web twin of this file)
 *
 * `stageOn()` is true only in a development bundle (`__DEV__`) built with EXPO_PUBLIC_YARD_STAGE=2. In a release build
 * `__DEV__` is false, the minifier folds the whole expression away, and neither the variable's name nor anything it
 * guards ships (first-yard.sh part 1e and `npm run check:bundle -- --export` prove it). In node (tests, bots, tools)
 * `__DEV__` is undefined: off, unless a test sets both `globalThis.__DEV__` and the variable (stage.test.ts does).
 *
 * Read at every call (cheap); every caller that decides something once (returning.ts's config wrapper) reads it once
 * at its own load. Every change a first-yard player could see sits behind this (PLAN2 3.1 rule 5). Pure: no import.
 * Owner: C-MODE.
 */

// No exported constant names the variable: a release export must not hold its name at all (the check refuses it), and
// Metro inlines only `process.env.EXPO_PUBLIC_*` written out, as below.
/** The works (stage 2) are switched on for this development run. */
export function stageOn(): boolean {
  return typeof __DEV__ !== 'undefined' && !!__DEV__ && process.env.EXPO_PUBLIC_YARD_STAGE === '2';
}
