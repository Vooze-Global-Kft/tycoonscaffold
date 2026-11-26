/**
 * The refusal keys (yard-stage1.md 5.4, plus `notBuilt` for the stub, `confirmHeel` for the crucible's
 * recipe change, `notOwned` and `stopFirst` for the actions' own checks, `earmark` for 5.4's second
 * cash text), `needsItem` for E25's gate by another item owned. The rules' list (rules-sim owns it); its text keys `refusal.<key>` are in textKeys.ts.
 * Which check returns which key: types.ts `SalvageActions`.
 */
export const REFUSAL_KEYS = ['cash', 'earmark', 'owned', 'notOwned', 'needsItem', 'rung', 'ceiling', 'tool2', 'tool3', 'tooHeavy', 'topLevel', 'noPlace', 'filling', 'loadCash', 'floor', 'weighFirst', 'heatRunning', 'noTruck', 'noTorch', 'stopFirst', 'nothing', 'priceUpdated', 'confirmHeel', 'notBuilt'] as const;
/**
 * CONTRACT VERSION 3 (stage 2, yard-stage2.md 2.19; contract2, 26 November): the new refusal keys, listed
 * apart as DATA (the keys version 3 added; textKeys.ts derives `refusal.<key>` from both lists, strings2 has
 * their words). s2a-fix (the lead's ruling of 09:50): ONE type, `RefusalKey`, holds both lists; the parallel
 * unions RefusalKeyV3 and RefusalKeyAll are gone. Which action returns which: types.ts `SalvageActions2`.
 * - bankOne: an agreement is open ("One loan at a time. This one is repaid as you sell.").
 * - bankReserve: cash − deposit would fall below the driver's reserve ("Kept for the next load: §x").
 * - bankTerms: the terms shown differ from the terms now (as priceUpdated; retry carries the terms now).
 * - notFinanceable: the plate is not financeable, below `bank.minPrice_h` × I, or the letter is not seen.
 * - quoteUpdated: the pack's S shown differs from S now ("Updated: §a → §b").
 * - packPending: a WAITING quote of that product stands, under 24 h old (RULING2 15.6; "Waiting for approval").
 * - packHeadroom: cash + Σ standing S + S > U ("Nothing to spend it on yet").
 * - packOff: packs are not offered here (rung, country, age band, hidden in Settings, before the second session).
 * - packCode: the four-digit code does not match ("That code does not match").
 * - badYear: the year given is not four digits between 1900 and this year.
 * - rackFull: no free place on the Yard sale. notReusable: the thing carries no tag.
 * - forkliftLoad: over `forklift.load` ("Too heavy for the forklift: {kg}").
 * - noRoute: the route names a station that does not take the grade, or is not owned.
 * - routed: the grams are reserved for a station ("This feeds the {plate}. Choose Sell from the bay first.").
 * - adCap: the day's count of that ad is used up (the button is hidden; the action refuses all the same).
 * Gates reuse `rung` and `needsItem`; money reuses `cash` and `ceiling`; "nothing offered" reuses `nothing`.
 */
export const REFUSAL_KEYS_V3 = ['bankOne', 'bankReserve', 'bankTerms', 'notFinanceable', 'quoteUpdated', 'packPending', 'packHeadroom', 'packOff', 'packCode', 'badYear', 'rackFull', 'notReusable', 'forkliftLoad', 'noRoute', 'routed', 'adCap'] as const;
/** Every refusal key of version 3 (stage 1 and stage 2). */
export type RefusalKey = (typeof REFUSAL_KEYS)[number] | (typeof REFUSAL_KEYS_V3)[number];
