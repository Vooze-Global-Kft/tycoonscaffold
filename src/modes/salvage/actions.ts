/**
 * The salvage mode's store actions (AGENTS.md: every state change goes through an action), one per
 * player action of yard-stage1.md 2.15. Each calls the rules' public index (src/engine/salvage.ts),
 * stores the result in the shared store, and hands the events the rules reported to the mode's
 * listeners (src/state/modeEvents.ts: the sound package's table and the screens' effects read them).
 * Null-safe: outside a salvage game, when the rules refuse (they return the same object and report a
 * `refused` event) or throw (a bug: the crash service records it), nothing changes.
 *
 * Each returns null when it was applied, else the refusal (its key and arguments) for the card to print.
 * No sound is played here: the hud's event pump plays them (src/ui/salvage/hud/pump.ts, the one
 * listener on modeEvents). The clock the rules take as `clock` is the YARD second `g.salvage.t` (never
 * stats.playSeconds, which is time played); `now` is Date.now(). Written by the contract; owned by
 * rules-sim (BUILD.md).
 */
import * as R from '../../engine/salvage';
import type { GameState } from '../../engine/types';
import { crash } from '../../services/firebase';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';

/** The current salvage config and game, or null outside a salvage game. */
export function salvageNow(): { cfg: R.SalvageConfig; g: R.SalvageGame } | null {
  const { cfg, game, hydrated } = useGame.getState();
  const g = game as R.SalvageGame;
  return hydrated && R.isSalvage(cfg) && g.salvage ? { cfg, g } : null;
}

/** A refusal as the card prints it, with the action a confirming card presses on "Yes" (confirmHeel, priceUpdated), else null. */
export interface Refusal {
  key: R.RefusalKey;
  args: R.TxtArgs;
  retry: R.CardAction | null;
}

const NOT_SALVAGE: Refusal = { key: 'notBuilt', args: {}, retry: null };

type Step = (cfg: R.SalvageConfig, g: R.SalvageGame, clock: number, events: R.SalvageEvent[]) => R.SalvageGame;

/** One transition: rules call, store, events. */
function act(where: string, fn: Step): Refusal | null {
  const now = salvageNow();
  if (!now) return NOT_SALVAGE;
  const events: R.SalvageEvent[] = [];
  let next: R.SalvageGame;
  try {
    next = fn(now.cfg, now.g, now.g.salvage.t, events);
  } catch (e) {
    crash.record(e, `salvage.${where}`);
    return NOT_SALVAGE;
  }
  if (next !== now.g) useGame.setState({ game: next as GameState });
  if (events.length) modeEvents.emit(events);
  const refused = events.find((e): e is Extract<R.SalvageEvent, { type: 'refused' }> => e.type === 'refused');
  if (refused) return { key: refused.key, args: refused.args, retry: refused.retry ?? null };
  // Applied, or nothing to change (the same object without a refusal: setHold on a held bay, ackAway with no card).
  return null;
}

export const salvageActions = {
  /**
   * Where the boss stands (sampled by the screen at most ten a second, at least every staleS/2 in the
   * foreground, overlays open included). Its events (workStart, pickup, enterTruck, refusals) go to the
   * mode's listeners like every other action's. Returns false outside a salvage game or when nothing changed.
   */
  presence(p: R.Presence): boolean {
    const now = salvageNow();
    if (!now) return false;
    const events: R.SalvageEvent[] = [];
    let next: R.SalvageGame;
    try {
      next = R.setPresence(now.cfg, now.g, p, now.g.salvage.t, events);
    } catch (e) {
      crash.record(e, 'salvage.presence');
      return false;
    }
    if (next !== now.g) useGame.setState({ game: next as GameState });
    if (events.length) modeEvents.emit(events);
    return next !== now.g;
  },
  /** 2.15 buy(item, shownPrice): a tool, carrier, machine, the truck, a recipe or the Night watch. */
  buy: (item: R.ShopKey, shownPrice: number) => act('buy', (cfg, g, clock, ev) => R.buy(cfg, g, item, shownPrice, clock, ev)),
  /** 2.15 hire(role, shownPrice). */
  hire: (role: R.CrewRole, shownPrice: number) => act('hire', (cfg, g, clock, ev) => R.hire(cfg, g, role, shownPrice, clock, ev)),
  /** 2.15 level(target, shownPrice): a crew member on the rota, a machine on the process board. */
  level: (target: R.LevelTarget, shownPrice: number) => act('level', (cfg, g, clock, ev) => R.level(cfg, g, target, shownPrice, clock, ev)),
  /** 2.15 setHold(grade, on). */
  setHold: (grade: R.GradeId, on: boolean) => act('setHold', (cfg, g, clock, ev) => R.setHold(cfg, g, grade, on, clock, ev)),
  /** 2.15 sell(grade, shown): a held bay at the price the board showed ("Price updated" re-asks with `retry`). */
  sell: (grade: R.GradeId, shown: R.SellShown) => act('sell', (cfg, g, clock, ev) => R.sell(cfg, g, grade, shown, Date.now(), clock, ev)),
  /** 2.15 setRecipe(recipe, confirmHeel). */
  setRecipe: (recipe: R.RecipeId, confirmHeel: boolean) => act('setRecipe', (cfg, g, clock, ev) => R.setRecipe(cfg, g, recipe, confirmHeel, clock, ev)),
  /** 2.15 setFromBays(on): the crucible's "Take from bays". */
  setFromBays: (on: boolean) => act('setFromBays', (cfg, g, clock, ev) => R.setFromBays(cfg, g, on, clock, ev)),
  /** 2.15 signDeal(shownTerms). */
  signDeal: (terms: R.DealTerms) => act('signDeal', (cfg, g, clock, ev) => R.signDeal(cfg, g, terms, Date.now(), clock, ev)),
  /** The deal card's Not now. */
  declineDeal: () => act('declineDeal', (cfg, g, clock, ev) => R.declineDeal(cfg, g, clock, ev)),
  /** 2.15 stepOut(at): "Step out" of the truck where the world stopped it (x, y, heading; omitted: the last presence). */
  stepOut: (at: { x: number; y: number; heading: number } | null = null) => act('stepOut', (cfg, g, clock, ev) => R.stepOut(cfg, g, at, clock, ev)),
  /** The goal card's Not now on an optional goal. */
  skipGoal: (id: string) => act('skipGoal', (cfg, g, clock, ev) => R.skipGoal(cfg, g, id, clock, ev)),
  /**
   * The screen saw a place's label (first sight) or opened a card: every "first time" text reads it.
   * The overlay host calls it when a card opens (press({act:'open'}) does it too).
   */
  noteSeen: (seen: { place?: R.PlaceId; card?: R.CardKind }) => act('noteSeen', (cfg, g, clock) => R.noteSeen(cfg, g, seen, clock)),
  /** 2.15 ackAway(): the away card's OK. */
  ackAway: () => act('ackAway', (cfg, g) => R.ackAway(cfg, g)),
  /** A card's button: the action it names (types.ts CardAction), with its exact arguments. */
  press(a: R.CardAction): Refusal | null {
    switch (a.act) {
      case 'buy':
        return salvageActions.buy(a.item, a.price);
      case 'hire':
        return salvageActions.hire(a.role, a.price);
      case 'level':
        return salvageActions.level(a.target, a.price);
      case 'setHold':
        return salvageActions.setHold(a.grade, a.on);
      case 'sell':
        return salvageActions.sell(a.grade, a.shown);
      case 'setRecipe':
        return salvageActions.setRecipe(a.recipe, a.confirmHeel);
      case 'setFromBays':
        return salvageActions.setFromBays(a.on);
      case 'signDeal':
        return salvageActions.signDeal(a.terms);
      case 'declineDeal':
        return salvageActions.declineDeal();
      case 'skipGoal':
        return salvageActions.skipGoal(a.id);
      case 'ackAway':
        return salvageActions.ackAway();
      case 'open': {
        // Opening a card is the screen's (uiState); the rules only note that it was seen.
        const now = salvageNow();
        if (!now) return null;
        const data = R.cardOf(now.cfg, now.g, a.card, Date.now());
        return salvageActions.noteSeen({ card: data.kind, ...(a.card.kind === 'place' ? { place: a.card.place } : {}) });
      }
      // Stage 2's buttons (types.ts CardAction v3; s2a-fix widened the union): the rules' actions are Phase B's
      // (actionsWorks.ts, actionsMoney.ts) and the store's purchases Phase C's; until then nothing happens.
      case 'signFinance':
      case 'setRoute':
      case 'buyPack':
      case 'buyProduct':
      case 'restorePurchases':
      case 'chooseLook':
      case 'watchAd':
      case 'setPacksHidden':
        return NOT_SALVAGE;
    }
  },
};
