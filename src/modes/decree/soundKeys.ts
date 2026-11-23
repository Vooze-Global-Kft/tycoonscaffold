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
  purchase_success: 'buy_level',
  buy: 'buy_level',
  unlock: 'open_ministry',
  prestige: 'majority',
  offline_collect: 'clipping',
  story_open: 'ui_open',
  deal_popup: 'ui_open',
} as const;
