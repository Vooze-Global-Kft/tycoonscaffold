/**
 * The decree mode's tuned numbers (High Office; docs/design/office-design.md 2.2 and the lead's
 * decisions of section 11). The STARTING values are the schema's defaults (./schema.decree.ts, with
 * section 11's decisions); this file holds what tuning moved, as RANGES path -> value, every value
 * inside its range (RANGES and `archetypeRanges()` of ./schema.decree.ts).
 *
 * Its ONE reader is scripts/content/build-office.py, which lays these values over the defaults, merges
 * the writers' deck and writes the result into games/high-office/game.json when every hard target of
 * 8.3 passes (docs/design/office-build-plan.md). The schema's defaults never import it, the rules tests
 * never read it (they run on the fixtures' frozen numbers, lesson 4) and no screen imports it. A
 * decree-mode file (scripts/lib/modes.js MODE_FOLDERS.decree).
 *
 * The block between TUNED-BEGIN and TUNED-END is written by `build-office.py --tune --save`.
 * Its first values are the numbers prototype's candidate (scratchpad/office/proto/candidate.json, 23
 * November 2026, outside the repository; nothing here depends on it), mapped onto the schema's paths:
 * callFrac 0.5 -> offices[*].callFraction; needNR [-, 7, 40] -> offices[1|2].stand.nr; tierM 60 ->
 * money.M; r 13 -> ministry.openRatio; the sign side's "other" club of project −4, swap −5, fee −5,
 * treat −2, committee −3 (each ±1 of 2.2) -> archetypes[i].sign[j].delta. The prototype's final report
 * may move them; the tuner then re-saves this block.
 */

/** Where the values below came from (build-office.py rewrites it with --save). */
export const DECREE_TUNED_FROM = 'the numbers prototype candidate.json of 23 November 2026 (mapped by hand onto RANGES paths), before the first bot run on the engine';

// TUNED-BEGIN
export const DECREE_TUNED: Record<string, number> = {
  "archetypes[0].sign[2].delta": -4,
  "archetypes[1].sign[1].delta": -5,
  "archetypes[2].sign[2].delta": -5,
  "archetypes[3].sign[1].delta": -2,
  "archetypes[4].sign[2].delta": -3,
  "ministry.openRatio": 13,
  "money.M": 60,
  "offices[0].callFraction": 0.5,
  "offices[1].callFraction": 0.5,
  "offices[1].stand.nr": 7,
  "offices[2].callFraction": 0.5,
  "offices[2].stand.nr": 40
};
// TUNED-END

/** Why each tuned value moved (the aim it serves), for the lead's review. */
export const DECREE_TUNED_WHY: Record<string, string> = {
  'archetypes[0].sign[2].delta': 'H9 / D27: signing costs the other club more, so reading beats always-sign',
  'archetypes[1].sign[1].delta': 'H9 / D27, as above',
  'archetypes[2].sign[2].delta': 'H9 / D27, as above',
  'archetypes[3].sign[1].delta': 'H9 / D27, as above',
  'archetypes[4].sign[2].delta': 'H9 / D27, as above',
  'ministry.openRatio': '8.4 pace: every ministry opens by half of its first term',
  'money.M': '8.4 money: paper gains 10 to 25 % of dibs',
  'offices[0].callFraction': 'D17: the reader calls on the first allowed day with a majority; 8.4 first election 11 to 15 min',
  'offices[1].callFraction': 'D17, as above',
  'offices[2].callFraction': 'D17, as above',
  'offices[1].stand.nr': '8.4 pace: governor 12 to 30 min (a non-sweep first win moves up)',
  'offices[2].stand.nr': '8.4 pace: president 55 to 95 min',
};
