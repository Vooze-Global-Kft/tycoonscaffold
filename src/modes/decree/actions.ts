/**
 * The decree mode's store actions (AGENTS.md: every state change goes through an action), one per
 * player action of spec 2.6. Each calls the rules' public interface (src/engine/decree.ts), stores
 * the result in the shared store, plays its fx key (src/services/fx/catalog.decree.ts), hands the
 * events the rules reported to the mode's listeners (src/state/modeEvents.ts), and is null-safe:
 * outside a decree game, when the rules refuse (they return the same object) or throw (a bug: the
 * crash service records it), it plays `denied` and returns false.
 *
 * Screens call `decreeActions.<name>(...)`; they never call the rules to change state. The play clock
 * the rules take as `clock` is the shared `stats.playSeconds`.
 * Written by the skeleton; owned by the rules (rules-lead since the join; the sound package may move
 * keys).
 */
import * as R from '../../engine/decree';
import type { GameState } from '../../engine/types';
import { ads } from '../../services/ads';
import { crash } from '../../services/firebase';
import { fx } from '../../services/fx';
import type { DecreeFxName } from '../../services/fx/catalog.decree';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';

/** The current decree config and game, or null outside a decree game. */
export function decreeNow(): { cfg: R.DecreeConfig; g: R.DecreeGame } | null {
  const { cfg, game } = useGame.getState();
  const g = game as R.DecreeGame;
  return R.isDecree(cfg) && g.decree ? { cfg, g } : null;
}

type Step = (cfg: R.DecreeConfig, g: R.DecreeGame, clock: number, events: R.DecreeEvent[]) => R.DecreeGame;

/** One transition: rules call, store, sound, events. `key` may depend on the result. */
function act(where: string, fn: Step, key: DecreeFxName | ((before: R.DecreeGame, after: R.DecreeGame, events: R.DecreeEvent[]) => DecreeFxName | null) | null): boolean {
  const now = decreeNow();
  if (!now) {
    fx.play('denied');
    return false;
  }
  const events: R.DecreeEvent[] = [];
  let next: R.DecreeGame;
  try {
    next = fn(now.cfg, now.g, now.g.stats.playSeconds, events);
  } catch (e) {
    // Every rule is built: a throw is a bug worth a report.
    crash.record(e, `decree.${where}`);
    next = now.g;
  }
  if (next === now.g) {
    fx.play('denied');
    return false;
  }
  useGame.setState({ game: next as GameState });
  const k = typeof key === 'function' ? key(now.g, next, events) : key;
  if (k) fx.play(k);
  if (events.length) modeEvents.emit(events);
  return true;
}

/** A rewarded ad is open (double taps). */
let adOpen = false;

export const decreeActions = {
  /**
   * 2.6 decide(choice): the desk item signed (up) or studied (down). A slip flicked up is a purchase
   * (buy_level, the sound package's map; open_ministry when it opens one); flicked down it is put back (study).
   */
  decide: (choice: R.Choice) => act('decide', (cfg, g, clock, ev) => R.decide(cfg, g, choice, clock, ev), (before, _after, events) => (choice === 'refuse' ? 'study' : before.decree.desk?.type === 'slip' ? (events.some((e) => e.type === 'ministryOpened') ? 'open_ministry' : 'buy_level') : 'sign')),
  /** 2.6 takeBack(): a tap on the out-tray inside the 2 s. */
  takeBack: () => act('takeBack', (cfg, g, clock, ev) => R.takeBack(cfg, g, clock, ev), 'take_back'),
  /**
   * The pending paper commits now: a tap elsewhere, Android back from the bare desk, the app to the
   * background (2.7). Silent. The AppState listener that calls it when the app goes to the background
   * is the platform package's (P8, src/ui/decree/back.ts beside Android back).
   */
  commitPending: () => act('commitPending', (cfg, g, clock, ev) => R.commitPending(cfg, g, clock, ev), null),
  /** 2.6 raise(i): the Ledger's untaught button. */
  raise: (ministry: number) => act('raise', (cfg, g, _c, ev) => R.raise(cfg, g, ministry, ev), 'buy_level'),
  /** 2.6 openMinistry(i). */
  openMinistry: (ministry: number) => act('openMinistry', (cfg, g, _c, ev) => R.openMinistry(cfg, g, ministry, ev), 'open_ministry'),
  /** 2.6 buyVanity(): this term's monument. */
  buyVanity: () => act('buyVanity', (cfg, g, _c, ev) => R.buyVanity(cfg, g, ev), 'storey'),
  /** 2.6 callElection(). */
  callElection: () => act('callElection', (cfg, g, clock, ev) => R.callElection(cfg, g, clock, ev), 'call_election'),
  /** 2.6 countVotes(): election night begins (its envelopes sound from the night view). */
  countVotes: () => act('countVotes', (cfg, g, _c, ev) => R.countVotes(cfg, g, ev), null),
  /** The end of election night (its last envelope, a tap that skips, Android back): the result sheet. Silent (the night view plays its own sounds). */
  endElectionNight: () => act('endElectionNight', (cfg, g) => R.endElectionNight(cfg, g), null),
  /**
   * 2.6 chooseAfterWin(moveUp | stay), and "Another term here" after a loss. The move goes through the
   * shared prestige (the engine mode's `prestige`, gated by its `canPrestige`), so the store saves and
   * books it as every mode's reset; another term is the rules' `chooseAfterResult`.
   */
  chooseAfterResult: (choice: R.MoveChoice): boolean => {
    const before = decreeNow();
    if (!before) return false;
    if (choice === 'moveUp') {
      // The shared prestige() keeps no events: the same pure move on the same state, with an events list,
      // gives the ones the listeners need ('moved', 'termStarted'); they are emitted only if the store moved.
      const events: R.DecreeEvent[] = [];
      try {
        R.moveUp(before.cfg, before.g, Date.now(), events);
      } catch (e) {
        crash.record(e, 'decree.moveUp');
      }
      useGame.getState().prestige();
      const after = decreeNow();
      const moved = !!after && after.g.decree.office > before.g.decree.office;
      if (moved && events.length) modeEvents.emit(events);
      return moved;
    }
    return act('chooseAfterResult', (cfg, g, _c, ev) => R.chooseAfterResult(cfg, g, 'stay', Date.now(), ev), null);
  },
  /** 2.6 setStandingOrder(on). */
  setStandingOrder: (on: boolean) => act('setStandingOrder', (cfg, g) => R.setStandingOrder(cfg, g, on), null),
  /** 3.1 the loading card's face. */
  pickFace: (face: string) => act('pickFace', (cfg, g) => R.pickFace(cfg, g, face), null),
  /**
   * A rewarded ad of 5.11 (Check the Sofa, Call the Spin Doctor, Send a Courier, Open the Doors). With
   * the skipAds product the shared ads service returns at once with no video; nothing here checks it.
   */
  watchAd: async (kind: R.DecreeAdKind): Promise<boolean> => {
    if (adOpen) return false;
    const now = decreeNow();
    let can = false;
    try {
      can = !!now && R.canWatchAd(now.cfg, now.g, kind);
    } catch (e) {
      crash.record(e, 'decree.canWatchAd');
    }
    if (!can) {
      fx.play('denied');
      return false;
    }
    adOpen = true;
    try {
      if (!(await ads.showRewarded(`decree_${kind}`))) return false;
      // The ad took a while: granted against the latest state (the rules check again).
      return act('grantAd', (cfg, g, _c, ev) => R.grantAd(cfg, g, kind, ev), null);
    } finally {
      adOpen = false;
    }
  },
  /**
   * Collect the away report: its earnings were paid when computed (2.15); the ad adds the extra 50 %,
   * offered only while governing (2.10: no ad from the call to the end of election night; the rules'
   * canWatchAd 'awayBonus'). The away report sheet (P7) asks canWatchAd before it shows the button.
   */
  collectAway: async (withAd: boolean): Promise<void> => {
    const now = decreeNow();
    const adAllowed = withAd && !!now && R.canWatchAd(now.cfg, now.g, 'awayBonus');
    await useGame.getState().collectOffline(adAllowed);
  },
};
