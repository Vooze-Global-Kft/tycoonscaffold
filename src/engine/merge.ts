/**
 * Merge mode rules (Night Market, "Lantern Row"; docs/design/market-design.md section 2): the one
 * public index of src/engine/merge/*. The store actions (src/modes/merge/actions.ts), the screens
 * (src/ui/merge) and the bot import the rules from here only, never from a file under
 * src/engine/merge/ (the bot, src/engine/merge/bot.ts, is the one exception: it is a rules file).
 *
 * Pure TypeScript, deterministic: time comes in as arguments (`dt`, `now`), randomness from the
 * derived streams of 2.3 (`streamValue`). It never imports economy.ts, chain.ts or another mode's
 * rules. Signatures were fixed by the skeleton (spec 9.2 "hour 0", Decision M1); every body is
 * built, and one engineer (the rules lead) owns them all since the integration. The seam between
 * the rule files: docs/design/market-build-plan.md, "The seam".
 */
export type * from './merge/types';
export { BOARD_COLS, BOARD_ROWS, BOARD_CELLS, CHAINS, TIERS, MAX_TICK, SITE, EVENT_KINDS, TARGET_NONE, TARGET_COUNTER, TARGET_FESTIVAL, TARGET_BASKET } from './merge/types';
export { NotBuiltError } from './merge/notBuilt';

// --- 2.3 derived values and streams (MECHANICS) ---
export {
  /** A merge game's config. */
  isMerge,
  MAX_CASH,
  EPS,
  /** One value in [0, 1) of a random site (2.3). */
  streamValue,
  /** Every derived value of 2.3. */
  mergeParams,
  /** value(c, k) of 2.3. */
  value,
  /** A ticket's current price P (2.1 rule 4, 2.3). */
  ticketPrice,
  /** U, the pace unit (2.3). */
  paceUnit,
  /** The gear's base tier (2.2). */
  baseTier,
  /** The Parade clock's one restart helper (2.7). */
  restartParade,
  /** roundCoins (Decision M19): the one rounding of every amount shown or paid; `roundCost` is its seam name. */
  roundCoins,
  roundCost,
  /** A minder's sale, the house tier, Q, a Basket sale (2.2, 2.5, rounded by M19). */
  saleAmount,
  houseTierOf,
  saleInterval,
  basketPrice,
  /** M34: a waiting line no new drop can make (two base steps after its draw). */
  lineUnmakeable,
  /** M29: the stall front's awning look (0 plain, 1 scalloped, 2 double) at a stall level. */
  awningLook,
  /** The ripe chance p and maxPop at a gear level (2.2). */
  ripeChance,
  maxPopAt,
  /** Recent ticket coins and R_t, per chain or in all (2.3, 2.10). */
  recentCoins,
  recentRate,
  RECENT_BUCKET,
  RECENT_BUCKETS,
} from './merge/params';

// --- 2.3 state: a new game, a loaded save (MECHANICS) ---
export { createMerge, startSeason, withMergeFields, reconcileMerge } from './merge/create';

// --- the board (MECHANICS) ---
export { rowOf, colOf, cellAt, isGood, freeCells, roomFor, dropCell, placeGood, looseCount } from './merge/board';

// --- 2.4 the tick and its event queue (MECHANICS) ---
export { advanceMerge, nextMergeStop } from './merge/tick';
export { nextEvent, runEvent, dueEvents, paradeDue, paradeOut } from './merge/events';

// --- 2.5 the drop (MECHANICS) ---
export { dropAt, decodeTarget, targetsFor } from './merge/drop';

// --- 2.5, 2.7, 5.7 purchases, buttons, ads, the cash clamp (MECHANICS) ---
export { commitCash, bookAway, openStall, levelGear, levelStall, hireMinder, levelMinder, openShutter, shutterGood, notTonight, notTonightRoom, undoBasket, canWatchAd, grantAd, applyLantern, entitleMerge } from './merge/actions';

// --- 2.9 time away (MECHANICS) ---
export { mergeOffline, mergeIncome, mergeActiveIncome, awayReportAlone, mergeAwayReports, awaySeconds, awayClosedForm, awayByEvents } from './merge/offline';

// --- tickets, the Festival, seasons, lanterns, gift boxes, advice and hints (built by ORDERS and META) ---

// --- 2.7 tickets (ORDERS) ---
export { missing, missingDetail, popsNeeded, goodsAtHand } from './merge/missing';
export type { MissingDetail } from './merge/missing';
export { drawTicket, drawParade, scriptedTicket, checkBounds } from './merge/draw';
export type { BoundFailures } from './merge/draw';

// --- 2.8 the Festival (ORDERS) ---
export { festivalFor, festivalLineFilled, festivalGift, canCloseSeason } from './merge/festival';

// --- 2.11 seasons (ORDERS) ---
export { seasonRow, seasonMods, openingBoard, closeSeason, seasonedStartLevel, familiarFactor, SEASON_RESETS, SEASON_STAYS, SEASON_BOOKKEEPING, hearthCells, seasonedAfterClose } from './merge/season';
export type { SeasonListItem } from './merge/season';

// --- 5.3 lanterns and the modifiers (ORDERS) ---
export { neutralMods, lanternMods, currentMods, onMerged, onTierMade, onTicketPaid, checkLanterns, featProgress, featState, featMet, discoveredCount, ladderCount, laddersComplete, chainsThisSeason, betterMod, giftEverySooner } from './merge/lanterns';

// --- 5.5 gift boxes (ORDERS) ---
export { countGiftTicket, openGiftBox, giftOdds, giftBoxAt, giftCoinAmount } from './merge/gift';

// --- 2.10 advice, 3.1 hints (ORDERS) ---
export { advice, incomeRate, purchaseAdvice, adviceCandidates, adviceExtras, basketCell, nearestTicket, mergeExists, gearOutput, waitEstimate, festivalAdvice } from './merge/advice';
export { hintsFor } from './merge/hints';
