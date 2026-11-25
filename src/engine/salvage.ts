/**
 * Salvage mode rules (the scrapyard's first yard, docs/design/yard-stage1.md version 2): THE ONE PUBLIC
 * INDEX of src/engine/salvage/*. The store actions (src/modes/salvage/actions.ts), the engine mode
 * (src/engine/salvageMode.ts), the screens (src/ui/salvage) and the bots import the rules from here only.
 *
 * THE SEAM (16:20): this file is a list of re-exports, nothing else. Every public function keeps its
 * final signature and lives in the module of its owner (BUILD.md):
 * - rules-sim (everything that CHANGES state): create, tick, away, rate, actions, positions;
 * - rules-book (everything that only READS state): money (formatters), board (prices, the price board),
 *   ladder (shop and level prices, ceilings), rivals (the industry table), goals, advice (and the
 *   reserve), cards (every card's data, the top bar, the process board, skip labels, the away card),
 *   frame (what the world draws), tickets, save (reconcile).
 * Bodies still marked "// STUB(hour 0)" are replaced in their module without touching this file.
 */
export type * from './salvage/types';
export { MAX_TICK, REFUSAL_KEYS, SAVE_TAG, TEXT_KEYS } from './salvage/types';
export { NotBuiltError } from './salvage/notBuilt';

// ---- rules-book (reads)
export { fmtDay, fmtDuration, fmtHours, fmtKg, fmtMass, fmtMoney, fmtPct, fmtPrice, fmtRank, fmtRate, fmtTonnes, resolveGrams, roundMoney } from './salvage/money';
export { boardX, hash01, marketTime, priceBoard, marketDayCfg as marketDay, priceOfCfg as priceOf, dayWordCfg as dayWord } from './salvage/board';
export { ceilingFor, levelPrice, shopPrice } from './salvage/ladder';
export { industryTable, rivalGrams } from './salvage/rivals';
export { goalList, nextGoal } from './salvage/goals';
export { advice, reserve } from './salvage/advice';
export { awayCard, cardOfCfg as cardOf, processBoard, skipLabel, skipLabels, topBar } from './salvage/cards';
export { frameCfg as frame, loadFamily, pieceAt, specIndex, toolFor } from './salvage/frame';
export { tickets } from './salvage/tickets';
// rules-book, fix pass (W11, P3, P17, S10, W15): new selectors, add only.
export { fmtMoneyExact } from './salvage/money';
export { reconcileSalvage } from './salvage/save';

// ---- rules-sim (changes)
export { createSalvage, freshSalvageCfg as freshSalvage, isSalvage, stockThings, withSalvageFields } from './salvage/create';
export { activeIncomeRate, advanceSalvage, incomeRate, jump, nextEvent, steadyIncomeRate, tick } from './salvage/tick';
export { awayCapS, salvageOffline } from './salvage/away';
export { ratedCapacity } from './salvage/rate';
export { ackAway, buy, declineDeal, hire, level, noteSeen, sell, setFromBays, setHold, setPresence, setRecipe, signDeal, skipGoal, stepOut } from './salvage/actions';
export {
  bayPosCfg as bayPos,
  circlePosCfg as circlePos,
  lanePathCfg as lanePath,
  machinePosCfg as machinePos,
  pileNearCfg as pileNear,
  piecePosCfg as piecePos,
  placeNearCfg as placeNear,
  pointCfg as point,
  skipZoneCfg as skipZone,
  spotPosCfg as spotPos,
  thingNearCfg as thingNear,
  thingPosCfg as thingPos,
} from './salvage/positions';
