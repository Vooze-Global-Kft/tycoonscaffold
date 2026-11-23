/**
 * Decree mode rules (High Office; docs/design/office-design.md section 2): the one public index of
 * src/engine/decree/*. The store actions (src/modes/decree/actions.ts), the screens (src/ui/decree)
 * and the bots import the rules from here only, never from a file under src/engine/decree/ (the bot,
 * src/engine/decree/bot.ts, is the one exception: it is a rules file).
 *
 * Pure TypeScript, deterministic: time comes in as arguments (`dt`, `now`, `clock` = play seconds),
 * randomness from the sites of 2.3 (`rand`). It never imports economy.ts or another mode's rules.
 *
 * A screen never computes a price, a rate, a share or a time itself: everything a screen prints has
 * a function here (the strip of 2.7 as data `stripOf`, the poll rows of 4.4 `poll`, the Ledger rows
 * `ledger`, the term ribbon `termRibbon`, the goal line `goalLine` with `about`, the reserve
 * `reserve`, the top bar `topBar`, the club strip `clubStrip`, the result and move sheets, the away
 * report). Signatures were fixed by the skeleton (spec 9.2 "hour 0"); each function's doc comment
 * (in its file) cites the section it implements and says whether it is built or throws notBuilt.
 * Owned by P1b after the skeleton (it adds exports; a signature changes only with P1a and the lead).
 * The seam between the rule files: docs/design/office-build-plan.md, "The seam".
 */
export type * from './decree/types';
export { SITE, PAPER_KINDS, DAY_KINDS, MAX_TICK } from './decree/types';
export { NotBuiltError, notBuilt } from './decree/notBuilt';

// --- 2.4 derived values, the one rounding, the one cash commit, the streams, prices (P1a: params.ts) ---
export { isDecree, officeOf, clubIndex, roundDibs, rand, commitCash, ministryValue, storeys, rateOf, levelCost, openCost, vanityPrice, decreeParams, topBar, clubStrip, EPS, MAX_CASH } from './decree/params';

// --- 2.3 state: a new game, a loaded save (P1a: create.ts) ---
export { freshDecree, createDecree, withDecreeFields, reconcileDecree } from './decree/create';

// --- 2.7 the draw, landing, the run-up's papers, set-aside and return (P1a: draw.ts) ---
export { drawNext, fillTray, landNext, landPaper, drawCampaignPaper, drawRally, setAside, restoreAside, returnToDeck, resolveEffects, scriptedPaper } from './decree/draw';

// --- 2.7 sizing and the strip (P1a: size.ts) ---
export { sizeMood, sizeMoney, freezeShown, stripOf } from './decree/size';

// --- 2.6, 2.7, 2.17 decide, take back, commit, the order of operations (P1a: decide.ts) ---
export { decide, takeBack, commitPending, applyShown, commitItem, isDay } from './decree/decide';

// --- 2.6, 2.7 slips, purchases, the reserve, the Ledger (P1a: slips.ts) ---
export { reserve, slipFor, buy, raise, openMinistry, buyVanity, ledger } from './decree/slips';

// --- 2.7, 7.6 follow-ups (P1a: followup.ts) ---
export { scheduleFollowUp, dueFollowUp, followUpPaper, stickyNote } from './decree/followup';

// --- 2.8 boycotts and the scandal (P1a: strike.ts, scandal.ts) ---
export { countDownStrikes, checkStrikes, endStrike } from './decree/strike';
export { sayNothingFactor, countDownScandal, checkScandal, endScandal } from './decree/scandal';

// --- 2.5 the tick (P1b: tick.ts) ---
export { advanceDecree, nextStop } from './decree/tick';

// --- 2.15 time away (P1b: offline.ts) ---
export { decreeOffline, decreeIncome, decreeActiveIncome, mergeAwayReports, awayReportAlone } from './decree/offline';

// --- 2.10 the term, the call, the run-up, the result (P1b: term.ts) ---
export { countDay, checkTermEnd, canCall, callElection, countVotes, chooseAfterResult, newTerm, termRibbon, resultSheet } from './decree/term';

// --- 2.4, 2.10, 2.11 shares, the poll, the count (P1b: count.ts) ---
export { shares, heldAfter, closeDistricts, poll, count } from './decree/count';

// --- 2.12 the bigger office (P1b: move.ts) ---
export { MOVE_RESETS, MOVE_STAYS, canMoveUp, moveUp, moveSheet } from './decree/move';

// --- 2.16 advice and the goal line (P1b: advice.ts) ---
export { advice, goalLine, about } from './decree/advice';

// --- 2.14 new things a term, the ONE Factors object (P1b: twists.ts) ---
export { neutralFactors, combineFactors, factorFor, twistFactors, deskFactors, newThingAt, compositionProblems } from './decree/twists';

// --- 2.9 ministers (P1b: ministers.ts) ---
export { nextApplication, ministerFactors, appoint, sendAway, cabinet } from './decree/ministers';

// --- 3.1 the pen's hints (P1b: hints.ts) ---
export { hintsFor } from './decree/hints';

// --- 5.10, 5.11 ads, products, the Standing Order, the face (P1b: grants.ts) ---
export { canWatchAd, grantAd, entitleDecree, setStandingOrder, standingOrderStep, pickFace } from './decree/grants';
