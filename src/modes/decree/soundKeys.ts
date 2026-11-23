/**
 * The decree mode's own fx key for each shared key the shared store, the feedback service and the
 * shared kit play (spec 6 "Shared keys map in src/modes/decree/soundKeys.ts"), handed to the fx
 * service by the mode entry (./index.tsx). Every value is a key of the decree table
 * (src/services/fx/catalog.decree.ts); a shared key left out is silent in this game, by design.
 *
 * Written by the skeleton; owned afterwards by the sound package (P5).
 */
export const DECREE_SHARED_SOUNDS = {
  ui_denied: 'denied',
  ui_open: 'ui_open',
  ui_close: 'ui_close',
  // The sound package's map (requests.md [sound]; recipes_office.py SHARED_SOUNDS): a shop purchase is
  // rare (open_ministry, not the Ledger's frequent buy_level); the move after the result sheet's march is
  // a storey; the Clerk's away report is the slip's arrival (a payout, no haptic). ui_tap and ui_tab stay
  // unmapped (silent on purpose).
  purchase_success: 'open_ministry',
  buy: 'buy_level',
  unlock: 'open_ministry',
  prestige: 'storey',
  milestone: 'storey',
  offline_collect: 'slip_arrive',
  story_open: 'ui_open',
  deal_popup: 'ui_open',
} as const;
