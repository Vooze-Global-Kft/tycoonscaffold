/**
 * The merge mode's store actions (AGENTS.md: every state change goes through an action), one per
 * player action of spec 2.5. Each calls the rules' public interface (src/engine/merge.ts), stores the
 * result in the shared store, plays its fx key (src/services/fx/catalog.merge.ts), hands the events
 * the rules reported to the mode's listeners (src/state/modeEvents.ts), and is null-safe: outside a
 * merge game, when the rules refuse (they return the same object) or throw (a body not built yet),
 * it plays `ui_denied` and returns false.
 *
 * Screens call `mergeActions.<name>(...)`; they never call the rules to change state.
 * Written by the skeleton; owned afterwards by the rules package MECHANICS (it knows which result
 * plays which key; the sound package may move keys).
 */
import * as R from '../../engine/merge';
import type { GameState } from '../../engine/types';
import { ads } from '../../services/ads';
import { crash } from '../../services/firebase';
import { fx } from '../../services/fx';
import type { MergeFxName } from '../../services/fx/catalog.merge';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';

/** The current merge config and game, or null outside a merge game. */
export function mergeNow(): { cfg: R.MergeConfig; g: R.MergeGame } | null {
  const { cfg, game } = useGame.getState();
  const g = game as R.MergeGame;
  return R.isMerge(cfg) && g.merge ? { cfg, g } : null;
}

/** One transition: rules call, store, sound, events. `key` may depend on the result; `step` picks the ladder file. */
function act(where: string, fn: (cfg: R.MergeConfig, g: R.MergeGame, events: R.MergeEvent[]) => R.MergeGame, key: MergeFxName | ((before: R.MergeGame, after: R.MergeGame) => MergeFxName | null) | null): boolean {
  const now = mergeNow();
  if (!now) {
    fx.play('ui_denied');
    return false;
  }
  const events: R.MergeEvent[] = [];
  let next: R.MergeGame;
  try {
    next = fn(now.cfg, now.g, events);
  } catch (e) {
    crash.record(e, `merge.${where}`);
    next = now.g;
  }
  if (next === now.g) {
    fx.play('ui_denied');
    return false;
  }
  useGame.setState({ game: next as GameState });
  const k = typeof key === 'function' ? key(now.g, next) : key;
  if (k) fx.play(k);
  if (events.length) modeEvents.emit(events);
  return true;
}

/** The fx key of a drop's result (spec 6.2); a merge plays the ladder file of the tier made. */
function playDrop(result: R.DropResult): void {
  switch (result.kind) {
    case 'merge':
      fx.play('merge', { step: result.made.k - 1 });
      if (result.lucky || result.spark) fx.play('lucky');
      if (result.discovered.length) fx.play('discovery');
      break;
    case 'move':
      fx.play('move');
      break;
    case 'swap':
      fx.play('swap');
      break;
    case 'lineFill':
      fx.play(result.paid === null ? 'line_fill' : 'ticket_filled');
      break;
    case 'festivalFill':
      fx.play(result.done ? 'festival_done' : 'festival_line');
      break;
    case 'basket':
      fx.play('basket_sell');
      break;
    case 'ticketShake':
    case 'return':
      fx.play('return');
      break;
    default: {
      const unplaced: never = result;
      void unplaced;
    }
  }
}

/** A rewarded ad is open (double taps). */
let adOpen = false;

export const mergeActions = {
  /**
   * A drag or a tap-tap ends: the good of `fromCell` dropped on the target the hit test found
   * (`target`: a TargetCode, types.ts). Returns what happened (the screens shake a ticket, outline,
   * fly a lantern), or null when refused by the store (no merge game, the rules threw).
   */
  dropAt: (fromCell: number, target: R.TargetCode): R.DropResult | null => {
    const now = mergeNow();
    if (!now) return null;
    const events: R.MergeEvent[] = [];
    let out: R.DropOutcome;
    try {
      out = R.dropAt(now.cfg, now.g, fromCell, R.decodeTarget(target), events);
    } catch (e) {
      crash.record(e, 'merge.dropAt');
      fx.play('ui_denied');
      return null;
    }
    if (out.game !== now.g) useGame.setState({ game: out.game as GameState });
    playDrop(out.result);
    if (events.length) modeEvents.emit(events);
    return out.result;
  },
  openStall: (c: number) => act('openStall', (cfg, g, ev) => R.openStall(cfg, g, c, ev), 'stall_open'),
  levelGear: (c: number) => act('levelGear', (cfg, g, ev) => R.levelGear(cfg, g, c, ev), 'upgrade'),
  levelStall: (c: number) => act('levelStall', (cfg, g, ev) => R.levelStall(cfg, g, c, ev), 'upgrade'),
  hireMinder: (c: number) => act('hireMinder', (cfg, g, ev) => R.hireMinder(cfg, g, c, ev), 'minder_hire'),
  levelMinder: (c: number) => act('levelMinder', (cfg, g, ev) => R.levelMinder(cfg, g, c, ev), 'upgrade'),
  openShutter: (group: number) => act('openShutter', (cfg, g, ev) => R.openShutter(cfg, g, group, ev), 'shutter_open'),
  notTonight: (counter: number) => act('notTonight', (cfg, g, ev) => R.notTonight(cfg, g, counter, ev), 'ui_close'),
  undoBasket: () => act('undoBasket', (cfg, g, ev) => R.undoBasket(cfg, g, ev), 'undo'),
  /** Opens the oldest gift box; the game saves at once after it (5.5, as the shared openChestNow). */
  openGiftBox: (): boolean => {
    const ok = act('openGiftBox', (cfg, g, ev) => R.openGiftBox(cfg, g, ev), 'giftbox_open');
    if (ok) useGame.getState().save();
    return ok;
  },
  /**
   * Closes the season (2.11) through the shared prestige (the engine mode's `prestige`); refused
   * until the Festival is filled. The store's gate is the engine mode's `canPrestige` (a merge game
   * earns no prestige points), so the close reaches the rules (src/modes/merge/wiring.test.ts).
   */
  closeSeason: (): boolean => {
    const before = mergeNow();
    if (!before) return false;
    useGame.getState().prestige();
    const after = mergeNow();
    return !!after && after.g.merge.season > before.g.merge.season;
  },
  /**
   * A rewarded ad (5.7): "Fill one line" on `counter`'s ticket, "Gear rush" or "Call the dragon"
   * (M14). With Quiet Evening (kind skipAds, M13) the shared ads service returns at once with no
   * video (`ads.skipRewarded`, set by the shared store from the entitlement); nothing here checks it.
   */
  watchAd: async (kind: R.MergeAdKind, counter?: number): Promise<boolean> => {
    if (adOpen) return false;
    const now = mergeNow();
    let can = false;
    try {
      can = !!now && R.canWatchAd(now.cfg, now.g, kind, counter);
    } catch (e) {
      crash.record(e, 'merge.canWatchAd');
    }
    if (!can) {
      fx.play('ui_denied');
      return false;
    }
    adOpen = true;
    try {
      if (!(await ads.showRewarded(`merge_${kind}`))) return false;
      // The ad took a while: granted against the latest state (the rules check the cooldown again).
      return act('grantAd', (cfg, g, ev) => R.grantAd(cfg, g, kind, counter, ev), kind === 'gearRush' ? 'drop' : kind === 'callDragon' ? 'parade_arrive' : 'line_fill');
    } finally {
      adOpen = false;
    }
  },
  /** Collect the away report (+50 % with the ad, Decision M8): the shared offline collect. */
  collectAway: async (withAd: boolean): Promise<void> => {
    await useGame.getState().collectOffline(withAd);
  },
};
