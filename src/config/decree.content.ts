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
 * Its first values are the numbers prototype's candidate (scratchpad/office/proto/candidate.json, its
 * state of 24 November 2026 09:38 ("final candidate"), outside the repository; nothing here depends on it), mapped onto the
 * schema's paths: R [3, 3, 3] -> offices[*].rivalPull (D15 starts 3 / 4 / 5); callFrac 0.7 ->
 * offices[*].callFraction; growth 1.2 -> ministry.levelGrowth (D24); slipReserveSecs 30 ->
 * desk.slipReserveSeconds (D16); tierM 60 -> money.M; tierL 40 -> money.L; r 13 -> ministry.openRatio;
 * the sign side's "other" club of project −4, swap −5, fee −5, treat −2, committee −3 (each ±1 of 2.2)
 * -> archetypes[i].sign[j].delta. The candidate's `ruleChanges` are RULES, not tunables, and are not
 * here: topT 70 / topK 0.25 (in the count a club above 70 counts 70 + 0.25 (m − 70)) and slipStays (a
 * landed slip stays until flicked; 2.7 returns it when a visitor arrives). They wait for the lead
 * (notes/bot.md). The prototype's REPORT.txt may still move these values; the tuner then re-saves
 * this block.
 */

/** Where the values below came from (build-office.py rewrites it with --save). */
export const DECREE_TUNED_FROM = "the final numbers step (D46), 24 November: the apology costs every club 1 and the president needs Name Recognition 75, on the second engineer's table; before that: the numbers step on the final rules (D41 to D45), 24 November: the D34 candidate with the first engineer's E3/G0 balance findings, tuned on seeds 101 to 130 at 4, 6 and 9 s and checked on 201 to 215 (scratchpad/office/numbers2/TABLE.txt)";

// TUNED-BEGIN
export const DECREE_TUNED: Record<string, number> = {
  "archetypes[0].sign[2].delta": -4,
  "archetypes[1].sign[1].delta": -5,
  "archetypes[2].sign[2].delta": -5,
  "archetypes[3].sign[1].delta": -2,
  "archetypes[4].refuse[0].delta": -1,
  "archetypes[4].sign[2].delta": -2,
  "boycott.below": 25,
  "desk.slipReserveSeconds": 30,
  "forms.apology.every": -1,
  "ministry.levelGrowth": 1.15,
  "ministry.openRatio": 13,
  "money.L": 30,
  "money.M": 30,
  "money.S": 7.5,
  "offices[0].callFraction": 0.6,
  "offices[0].requisitionEvery": 12,
  "offices[0].rivalPull": 3,
  "offices[1].callFraction": 0.6,
  "offices[1].requisitionEvery": 10,
  "offices[1].rivalPull": 4,
  "offices[2].callFraction": 0.5,
  "offices[2].requisitionEvery": 6,
  "offices[2].rivalPull": 5,
  "offices[2].stand.nr": 75,
  "paperRules.sizing.pull": 0.5
};
// TUNED-END

/** Why each tuned value moved (the aim it serves), for the lead's review. */
export const DECREE_TUNED_WHY: Record<string, string> = {
  'archetypes[0].sign[2].delta': 'H9 / D27: signing a project costs the other club 4 (D34), so reading beats always-sign',
  'archetypes[1].sign[1].delta': 'H9 / D27, as above (swap, D34)',
  'archetypes[2].sign[2].delta': 'H9 / D27, as above (fee, D34)',
  'archetypes[3].sign[1].delta': 'H9 / D27, as above (treat, D34)',
  'archetypes[4].sign[2].delta': 'D27: −3 → −2. Committee Week (committees ×2, president term 5) bled the clubs the exact reader signs against and cost it that election on every seed (margin −3); softer, it is a close election and the reader wins ≥ 90 % pooled',
  'archetypes[4].refuse[0].delta': 'D27: −2 → −1, as above: the reader refuses three committees in four, and in Committee Week the petitioners sank below 30 (huff, D25)',
  'desk.slipReserveSeconds': 'H10: the reader finds sign unaffordable on at most 5 % of papers (D16; at its top already)',
  'ministry.levelGrowth': 'D24: more to buy on an idle desk (D34: 1.15, the bottom of its range)',
  'ministry.openRatio': '8.4 / D34 pace: every ministry opens by the end of its office\'s first term',
  'money.S': 'H10: 12 → 7.5 s of B (bottom). Projects, committees and ribbons cost S; after a bundle the treasury sits at the slip reserve, and the forms that land next must be payable',
  'money.M': 'D27 / H8: 60 → 30 s of B. A fee paid 60 s of B for −5 to another club, so the reader signed every fee and bled the clubs into lost presidential terms; at 30 a fee is a real choice (H8 differs from money-only stays ≥ 25 %)',
  'money.L': 'H10: vanity at L is the paper most often unaffordable (D34)',
  'boycott.below': 'D38: a careless mayor meets boycotts (25 with pull 0.5: always-refuse and random about 3 an hour, the happier-club habit 2.5, the reader 0)',
  'paperRules.sizing.pull': 'D38 lever 2 with boycott.below: moods drift further from 50, so neglect shows (pull 1 measured: H8 both choices fell, nothing gained)',
  'offices[0].callFraction': 'D44: 0.7 → 0.6 (call from day 48 of 80): the first election night ends at about 10.6 min at 6 s and 9 s (aims 12 and 16)',
  'offices[1].callFraction': '8.4 pace with D17: 0.7 → 0.6. With 0.5 the reader reached president at 46 min (aim 55 to 95); with 0.7 at 55 but H8 "both choices" fell to 2 of 10 seeds; 0.6 is the middle',
  'offices[2].callFraction': 'D27: 0.7 → 0.5: the reader calls on the first allowed day with a majority (D17), before a presidential term\'s long drift can sink a club',
  'offices[0].requisitionEvery': 'H10: 10 → 12 (top): fewer requisitions, the form most often unaffordable after a bundle',
  'offices[1].requisitionEvery': 'H10: 8 → 10 (top), as above',
  'offices[2].requisitionEvery': 'H10: 4 → 6 (top), as above (the first engineer\'s F1 finding)',
  'offices[2].stand.nr': '8.4 pace with D46 (range up to 80): 50 → 65 → 75. At 65 the reader reached president at 50.6 min (median, 1 of 30 tuning seeds inside 55 to 95); at 75 at 65.2 (25 of 30 inside, the rest 54.3); at 80 at 65.2 but one seed needed 130 min and H7 hours 2 and 3 rose to 23 % there (a governor deck used up)',
  'forms.apology.every': 'D46 (a decision, not a tunable): the apology costs every club 1 (was 3). With the reader\'s formula counting the tax of "Say nothing" (D46), it apologises on 32 % of the front pages the careless bots meet (aim 25 to 75 %), so the tax (0.8) and the length (10 papers) of "Say nothing" stay',
  'offices[0].rivalPull': 'D27: the one-in-ten and casual readers win shares (3 / 4 / 5 is the start; 4 / 6 / 7 cost the misreader its 75 %)',
  'offices[1].rivalPull': 'D27, as above',
  'offices[2].rivalPull': 'D27, as above',
};
