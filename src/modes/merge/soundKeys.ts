/**
 * The merge mode's own fx key for each shared key the shared store, the feedback service and the
 * shared modals play (spec 6.2 `soundKeys`), handed to the fx service by the mode entry
 * (./index.tsx). Every value is a key of the merge table (src/services/fx/catalog.merge.ts); a
 * shared key left out is silent in this game, by design (hint, tap, bell, ...).
 *
 * Owned by the sound package (docs/design/market-build-plan.md); moved here from
 * src/engine/mergeMode.ts by the skeleton so the rules package and the sound package never edit one
 * file. The second group is the sound package's request of 23 November (requests.md).
 */
export const MERGE_SHARED_SOUNDS = {
  offline_collect: 'coins',
  purchase_success: 'upgrade',
  prestige: 'season_close',
  unlock: 'stall_open',
  mission_complete: 'lantern_lit',
  card_levelup: 'upgrade',
  daily_claim: 'coins',
  ui_tap: 'ui_open',
  ui_tab: 'ui_open',
  gems: 'coins',
  boost_start: 'upgrade',
  buy: 'upgrade',
  milestone: 'lantern_lit',
  story_open: 'ui_open',
  deal_popup: 'ui_open',
} as const;
