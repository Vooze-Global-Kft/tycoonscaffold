/**
 * The refusal keys (yard-stage1.md 5.4, plus `notBuilt` for the stub, `confirmHeel` for the crucible's
 * recipe change, `notOwned` and `stopFirst` for the actions' own checks, `earmark` for 5.4's second
 * cash text). The rules' list (rules-sim owns it); its text keys `refusal.<key>` are in textKeys.ts.
 * Which check returns which key: types.ts `SalvageActions`.
 */
export const REFUSAL_KEYS = ['cash', 'earmark', 'owned', 'notOwned', 'rung', 'ceiling', 'tool2', 'tool3', 'tooHeavy', 'topLevel', 'noPlace', 'filling', 'loadCash', 'floor', 'weighFirst', 'heatRunning', 'noTruck', 'noTorch', 'stopFirst', 'nothing', 'priceUpdated', 'confirmHeel', 'notBuilt'] as const;
export type RefusalKey = (typeof REFUSAL_KEYS)[number];
