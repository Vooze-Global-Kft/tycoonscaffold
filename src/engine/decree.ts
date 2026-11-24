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
 * `reserve` / `reserveParts`, the top bar `topBar`, the club strip `clubStrip`, the door glass
 * `nextVisitorIn`, the result and move sheets, the away report, whether an ad or the Shop may be
 * offered `canWatchAd` / `canShop`). Signatures were fixed by the skeleton (spec 9.2 "hour 0"); each
 * function's doc comment (in its file) cites the section it implements. Every rule is built and the
 * two packages are joined (rules-lead owns every rules file); the two export blocks below keep the
 * packages' original grouping only.
 * The seam between the rule files: docs/design/office-build-plan.md, "The seam".
 */
export type * from './decree/types';
export { SITE, PAPER_KINDS, DAY_KINDS, MAX_TICK } from './decree/types';

// ============================================================================ BLOCK P1a (the paper core)
export { NotBuiltError } from './decree/notBuilt';

// --- 2.4 derived values, the one rounding, the one cash commit, the streams, prices (P1a: params.ts) ---
export { isDecree, officeOf, clubIndex, roundDibs, rand, commitCash, disarray, disarrayOf, DISARRAY_D15, ministryValue, storeys, rateOf, levelCostRaw, levelCost, openCost, vanityPrice, factorOn, mixWith, approvalOf, multiplierOf, levelGain, openGain, decreeParams, topBar, clubStrip, EPS, MAX_CASH } from './decree/params';

// --- 2.3 state: a new game, a loaded save (P1a: create.ts) ---
export { freshDecree, createDecree, withDecreeFields, reconcileDecree, buildDecree } from './decree/create';
export type { DecreeSetup } from './decree/create';
export type { DisarrayRule } from './decree/params';

// --- 2.7 the draw, landing, the run-up's papers, set-aside and return (P1a: draw.ts) ---
export { drawNext, fillTray, landNext, landPaper, drawCampaignPaper, drawRally, setAside, restoreAside, returnToDeck, resolveEffects, scriptedPaper, comicPaper, comicWeights, clubWeight, requisitionPaper, requisitionMinistry, ribbonPaper, applicationPaper, grievancePaper, frontPagePaper, onTop, isEventPaper, servedClub, returningLines } from './decree/draw';

// --- 2.7 sizing and the strip (P1a: size.ts) ---
export { sizeMood, sizeMoney, freezeShown, stripOf, costOf, formVoid } from './decree/size';

// --- 2.6, 2.7, 2.17 decide, take back, commit, the order of operations (P1a: decide.ts) ---
export { decide, takeBack, commitPending, applyShown, commitItem, isDay } from './decree/decide';

// --- 2.6, 2.7 slips, purchases, the reserve, the Ledger (P1a: slips.ts) ---
export { reserve, reserveParts, slipFor, slipOf, slipYields, slipsComeNow, canBuy, buy, raise, openMinistry, buyVanity, ledger, callFrom, runUpPrices } from './decree/slips';

// --- 2.7, 7.6 follow-ups (P1a: followup.ts) ---
export { scheduleFollowUp, dueFollowUp, followUpPaper, stickyNote } from './decree/followup';

// --- 2.8 boycotts and the scandal (P1a: strike.ts, scandal.ts) ---
export { countDownStrikes, checkStrikes, endStrike } from './decree/strike';
export { sayNothingFactor, quietLimit, countDownScandal, checkScandal, endScandal } from './decree/scandal';

// ============================================================================ BLOCK P1b (time, term and wiring)

// --- 2.5 the tick (P1b: tick.ts) ---
export { advanceDecree, nextStop, nextVisitorIn, cashAt, anchorOf, timeCashReaches, TICK_EVENTS, MAX_EVENTS_PER_TICK } from './decree/tick';
export type { TickEvent } from './decree/tick';

// --- 2.15 time away (P1b: offline.ts) ---
export { decreeOffline, decreeIncome, decreeActiveIncome, mergeAwayReports, awayReportAlone, awayPlan, awayCap, awayArrivals, awayByEvents } from './decree/offline';
export type { AwayPlan } from './decree/offline';

// --- 2.10 the term, the call, the run-up, the result (P1b: term.ts) ---
export { countDay, checkTermEnd, canCall, callElection, canCount, countVotes, endElectionNight, chooseAfterResult, newTerm, termRibbon, resultSheet, nrFor, halfwayBack, monumentFor, reconcileTerm } from './decree/term';

// --- 2.4, 2.10, 2.11 shares, the poll, the count (P1b: count.ts) ---
export { shares, meritShares, heldAfter, closeDistricts, poll, count, meritOf, moodUtility, certainWinBound, callDay, callDayOf, currentRival, announcementOrder, HELD_AT, STRONG_WEIGHT, CLOSE_WITHIN } from './decree/count';

// --- 2.12 the bigger office (P1b: move.ts) ---
export { MOVE_RESETS, MOVE_STAYS, canMoveUp, moveUp, moveSheet, movedState, moveRequirements, transitionFund, moveMood, passesIn } from './decree/move';
export type { MoveListItem } from './decree/move';

// --- 2.16 advice and the goal line (P1b: advice.ts) ---
export { advice, goalLine, about, candidates, scoreOf, recordShort, slipNeed, slipReserve, reserveNow, standingOrderReserve, standingOrderPick, callNow } from './decree/advice';
export type { Candidate } from './decree/advice';

// --- 2.14 new things a term, the ONE Factors object (P1b: twists.ts) ---
export { neutralFactors, combineFactors, factorFor, twistFactors, twistIdsFactors, deskFactors, newThingAt, newThingLabel, compositionProblems, QUIET_TERM, COMPOSITION_TERMS } from './decree/twists';

// --- 2.9 ministers (P1b: ministers.ts) ---
export { nextApplication, ministerFactors, appoint, sendAway, cabinet, ministerOf } from './decree/ministers';

// --- 3.1 the pen's hints (P1b: hints.ts) ---
export { hintsFor, TEACHING_SLOTS } from './decree/hints';

// --- 5.10, 5.11 ads, products, the Standing Order, the face (P1b: grants.ts) ---
export { canWatchAd, canShop, grantAd, entitleDecree, setStandingOrder, standingOrderStep, standingOrderAvailable, standingOrderActive, pickFace, offering, owns, cosmetics, freePlaces, adCooldownLeft, sofaAmount } from './decree/grants';
