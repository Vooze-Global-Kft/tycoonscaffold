/**
 * @deprecated The first feedback API, kept so existing callers compile. It is
 * now a thin wrapper over the fx service, which has a named event for every
 * moment in the game. New code calls it directly:
 *
 *   import { fx } from './fx';
 *   fx.play('buy');
 *   fx.play('tap', { step: comboLevel });
 *
 * See src/services/fx/catalog.ts for the events and
 * docs/design/fx-service-notes.md for the rules. Sounds no longer come from the
 * game's `assets` map (sfx_tap, sfx_buy, sfx_cash, music): they are files in
 * shared/sfx/ and games/<id>/assets/sfx/, named after the catalogue keys.
 */
import { fx } from './fx';

/** @deprecated Use `fx.init()` and `fx.music.start()`. */
export function initAudio() {
  void fx.init();
  fx.music.start();
}

/** @deprecated Use `fx.settings.set({ sound, music })`. Like the settings screen, this is remembered. */
export function setMuted(value: boolean) {
  fx.settings.set({ sound: !value, music: !value });
}

/** @deprecated Use `fx.play(name)` with the catalogue key that fits the moment. */
export const feedback = {
  /** @deprecated `fx.play('tap', { step })` */
  tap() {
    fx.play('tap');
  },
  /** @deprecated `fx.play('buy')` */
  buy() {
    fx.play('buy');
  },
  /** @deprecated Pick the real event: 'milestone', 'unlock', 'combo_up', 'bonus_collect', 'daily_claim', ... */
  reward() {
    fx.play('milestone');
  },
  /** @deprecated `fx.play('ui_denied')` */
  denied() {
    fx.play('ui_denied');
  },
};
