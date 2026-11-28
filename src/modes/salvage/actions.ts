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
import type { GameConfig } from '../../config/schema';
import type { GameState } from '../../engine/types';
import { ads } from '../../services/ads';
import { crash } from '../../services/firebase';
import { storefrontCountry } from '../../services/region';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';
import { heldForCount, onPending } from './returning';

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
/** An action pressed while an absence waits for its pass (owner2-fix-hud, A2). */
const HELD: Refusal = { key: 'nothing', args: {}, retry: null };

type Step = (cfg: R.SalvageConfig, g: R.SalvageGame, clock: number, events: R.SalvageEvent[]) => R.SalvageGame;

/** One transition: rules call, store, events. */
function act(where: string, fn: Step): Refusal | null {
  const now = salvageNow();
  if (!now) return NOT_SALVAGE;
  // owner2-hud: while an absence waits for its pass (./returning.ts) nothing is applied to the old state; A2: and
  // the screen hears a refusal (null would mean "applied"), the same `nothing` every other "nothing to do" gives.
  if (heldForCount()) return HELD;
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

// ------------------------------------------------------------------ C-ACTIONS (PLAN2 2.3, 6.3): presses that take seconds

/**
 * C-ACTIONS: a refusal that a words key of its own prints in place of `refusal.<key>` (the card prints `txt` when it is
 * set). Today only the rewarded video that did not show: "No video right now" (WORDS: `card.ad.notReady` is the key that
 * exists, 'Video not ready'; a [seam] asks for `refusal.noVideo`).
 */
export type PressRefusal = Refusal & { txt?: R.Txt };

/**
 * C-ACTIONS: what a press needs that the action does not carry. `country`: the store country the shop read when it
 * opened (ShopCard.country; a pack's quote is made for it; omitted, it is read at the press). `code`: the code pad's
 * four digits for setPacksHidden.
 */
export interface PressContext {
  country?: string | null;
  code?: string;
}

/** C-ACTIONS stand-in until refusals.ts gains `noVideo` ([seam] 28 Nov): the words of a video that did not show. */
export const NO_VIDEO_TXT: R.Txt = { key: 'card.ad.notReady', args: {} };
const NO_VIDEO: PressRefusal = { key: 'nothing', args: {}, retry: null, txt: NO_VIDEO_TXT };

/**
 * The press that is running (PLAN2 6.3): an ad on screen, a store sheet open, a restore asked. One at a time: while it
 * runs every card press (all but `open`) is refused `nothing` (the BuyButton shows its pressed state until it lands),
 * so a second tap never buys, pays or sells twice. `since` bounds it: a store or an ad that never answers stops
 * blocking after PRESS_MAX_MS (its promise still settles the state when it does).
 */
let running: { act: R.CardAction['act']; since: number } | null = null;
const PRESS_MAX_MS = 120_000;
/** How long a paid video waits for a counted return that began while it showed, before its pay is tried (and held). */
const UNHELD_MAX_MS = 120_000;
const pressListeners = new Set<() => void>();

function tellPress(): void {
  for (const f of [...pressListeners]) f();
}

/** True while an async press runs (the cards' pressed state; C-CARDSUI's BuyButton reads it). */
export function pressRunning(): boolean {
  if (running && Date.now() - running.since > PRESS_MAX_MS) running = null;
  return running !== null;
}

/** Called when an async press starts or lands. */
export function onPressRunning(f: () => void): () => void {
  pressListeners.add(f);
  return () => {
    pressListeners.delete(f);
  };
}

/** Runs one async press: refused `nothing` while another runs or the return counts; held (pressRunning) until it lands. */
function runAsync(a: R.CardAction, body: (now: { cfg: R.SalvageConfig; g: R.SalvageGame }) => Promise<PressRefusal | null>): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
  const now = salvageNow();
  const early = !now ? NOT_SALVAGE : heldForCount() || pressRunning() ? HELD : null;
  if (early || !now) return { sync: early, done: Promise.resolve(early) };
  running = { act: a.act, since: Date.now() };
  tellPress();
  const done = (async () => {
    try {
      return await body(now);
    } catch (e) {
      crash.record(e, `salvage.${a.act}`);
      return NOT_SALVAGE;
    } finally {
      running = null;
      tellPress();
    }
  })();
  return { sync: null, done };
}

/** Resolves once no absence waits for its pass (at once when none does), or after `maxMs`. */
function untilUnheld(maxMs: number): Promise<void> {
  if (!heldForCount()) return Promise.resolve();
  return new Promise((resolve) => {
    let off: () => void = () => {};
    const timer = setTimeout(() => {
      off();
      resolve();
    }, maxMs);
    off = onPending(() => {
      if (heldForCount()) return;
      clearTimeout(timer);
      off();
      resolve();
    });
  });
}

/** The shared list's product with this id (the shop's rows name products by id), or null. */
function productOf(id: string): GameConfig['monetization']['iap']['products'][number] | null {
  const cfg = useGame.getState().cfg as GameConfig;
  return cfg.monetization?.iap?.products?.find((p) => p.id === id) ?? null;
}

/** The first refusal among events the rules reported (already emitted to the listeners), as the card prints it. */
function refusalIn(events: readonly R.SalvageEvent[]): PressRefusal | null {
  const r = events.find((e): e is Extract<R.SalvageEvent, { type: 'refused' }> => e.type === 'refused');
  return r ? { key: r.key, args: r.args, retry: r.retry ?? null } : null;
}

/** An async press with nothing to do (a product the shared list does not hold): heard as a refusal, nothing changed. */
function refusalOfNothing(where: string): PressRefusal {
  void where;
  modeEvents.emit([{ type: 'refused', key: 'nothing', args: {}, retry: null }]);
  return HELD;
}

/** A refusal every rule gives the same way: reported as the rules report one (the listeners hear it), the state unchanged. */
const refuseNothing: Step = (_cfg, g, _clock, ev) => {
  ev.push({ type: 'refused', key: 'nothing', args: {}, retry: null });
  return g;
};

export const salvageActions = {
  /**
   * Where the boss stands (sampled by the screen at most ten a second, at least every staleS/2 in the
   * foreground, overlays open included). Its events (workStart, pickup, enterTruck, refusals) go to the
   * mode's listeners like every other action's. Returns false outside a salvage game or when nothing changed.
   */
  presence(p: R.Presence): boolean {
    const now = salvageNow();
    if (!now || heldForCount()) return false;
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
  /** C-ACTIONS (PLAN2 2.3): a hall's recipe tab; the hall keeps it (pinned) until "Let the hall choose". */
  setPlateRecipe: (plate: R.PlateId, recipe: R.RecipeId, confirmHeel: boolean) => act('setPlateRecipe', (cfg, g, clock, ev) => R.setPlateRecipe(cfg, g, plate, recipe, confirmHeel, clock, ev)),
  /** C-ACTIONS (s2g-halls, RULING2 29.1): a hall's "Let the hall choose". */
  letHallChoose: (plate: R.PlateId) => act('letHallChoose', (cfg, g, clock, ev) => R.letHallChoose(cfg, g, plate, clock, ev)),
  /** 2.15 setFromBays(on): the crucible's "Take from bays". */
  setFromBays: (on: boolean) => act('setFromBays', (cfg, g, clock, ev) => R.setFromBays(cfg, g, on, clock, ev)),
  /** C-ACTIONS (PLAN2 2.3): signing the finance card at the terms AS SHOWN (refused bankTerms with the terms now as retry). */
  signFinance: (plate: R.PlateId, shown: R.FinanceShown) => act('signFinance', (cfg, g, clock, ev) => R.signFinance(cfg, g, plate, shown, clock, ev)),
  /** C-ACTIONS: a grade's route to a station or back to its bay (no card of stage 2 presses it; routed so a refusal is the rules'). */
  setRoute: (grade: R.GradeId, to: R.StationId | 'bay') => act('setRoute', (cfg, g, clock, ev) => R.setRoute(cfg, g, grade, to, clock, ev)),
  /** C-ACTIONS: a look chosen for a slot (null: the yard's own). */
  chooseLook: (slot: R.LookSlot, id: string | null) => act('chooseLook', (cfg, g, clock, ev) => R.chooseLook(cfg, g, slot, id, clock, ev)),
  /** C-ACTIONS (wiring a.2): the code pad's OK under Settings' "Scrip packs: shown / hidden" (the pad holds the code). */
  setPacksHidden: (on: boolean, code: string) => act('setPacksHidden', (cfg, g, clock, ev) => R.setPacksHidden(cfg, g, on, code, clock, ev)),
  /** C-ACTIONS (wiring a.2, b.6): the age question's OK (the keypad holds the year; only the band is kept). */
  setAgeBand: (year: number) => act('setAgeBand', (cfg, g, clock, ev) => R.setAgeBand(cfg, g, year, Date.now(), clock, ev)),
  /**
   * C-ACTIONS: a scrip pack's Buy, through the shared store's buyQuoted with the rules' quote (quotePack, the store
   * country read when the shop opened: `country`; omitted, it is read now) and settle (settleQuote). Async and held
   * (pressRunning) until the store answers; `sync` is the refusal known at once (counting, a press running), `done`
   * what it came to (null: granted, or waiting for approval as the store says).
   */
  buyPack(product: string, S: number, country?: string | null): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
    return runAsync({ act: 'buyPack', product, S }, async () => {
      const p = productOf(product);
      if (!p) return refusalOfNothing('buyPack');
      const ctx: R.CardContext = { country: country === undefined ? await storefrontCountry() : country };
      if (heldForCount()) return HELD;
      const events: R.SalvageEvent[] = [];
      const quote = (cfg: GameConfig, game: GameState, nowMs: number, known: readonly string[], askedMs: number): GameState => {
        const g = game as R.SalvageGame;
        return R.quotePack(cfg as unknown as R.SalvageConfig, g, product, S, nowMs, [...known], askedMs, g.salvage.t, events, ctx) as unknown as GameState;
      };
      const settle = (cfg: GameConfig, game: GameState, outcome: Parameters<typeof R.settleQuote>[2], q: { product: string; atMs: number }): GameState =>
        R.settleQuote(cfg as unknown as R.SalvageConfig, game as R.SalvageGame, outcome, q) as unknown as GameState;
      const out = await useGame.getState().buyQuoted(p, quote, settle);
      if (events.length) modeEvents.emit(events);
      const refused = refusalIn(events);
      if (refused) return refused;
      // Every other outcome the store has already said on screen (granted, waiting, not confirmed, closed, failed).
      return out === 'refused' ? HELD : null;
    });
  },
  /** C-ACTIONS: a look or No ad videos: the shared store's plain purchase (async, held). null when paid and granted. */
  buyProduct(product: string): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
    return runAsync({ act: 'buyProduct', product }, async () => {
      const p = productOf(product);
      if (!p) return refusalOfNothing('buyProduct');
      // Not granted: the store has said why (or the player closed its sheet); the card refreshes either way.
      await useGame.getState().purchase(p);
      return null;
    });
  },
  /** C-ACTIONS: Restore (looks and No ad videos; scrip lives in the save and is never restored). Async, held. */
  restorePurchases(): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
    return runAsync({ act: 'restorePurchases' }, async () => {
      await useGame.getState().restorePurchases();
      return null;
    });
  },
  /**
   * C-ACTIONS: a rewarded video's button (or, with No ad videos owned, "Take +§x": ads.showRewarded answers at once).
   * The rules are asked first on the state as it is (adPaid on a copy: a capped day or a moved amount is refused BEFORE
   * any video shows); then the video; then adPaid on the latest state (it checks again). A video that did not show is
   * "No video right now" (NO_VIDEO_TXT) and changes nothing. Held while it runs; a return that began counting while the
   * video showed is waited for, so the reward is never applied to the old state nor lost.
   */
  watchAd(kind: R.AdKind, amount: number, ref: { grade?: R.GradeId; sell?: R.SellShown } = {}): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
    const a: R.CardAction = { act: 'watchAd', kind, amount, ...ref };
    const now = salvageNow();
    if (now && !heldForCount() && !pressRunning()) {
      const dry: R.SalvageEvent[] = [];
      try {
        R.adPaid(now.cfg, now.g, kind, amount, ref, now.g.salvage.t, dry);
      } catch (e) {
        crash.record(e, 'salvage.watchAd');
        return { sync: NOT_SALVAGE, done: Promise.resolve(NOT_SALVAGE) };
      }
      const r = refusalIn(dry);
      if (r) {
        modeEvents.emit(dry.filter((e) => e.type === 'refused'));
        return { sync: r, done: Promise.resolve(r) };
      }
    }
    return runAsync(a, async () => {
      if (!(await ads.showRewarded(`salvage_${kind}`))) return NO_VIDEO;
      await untilUnheld(UNHELD_MAX_MS);
      const r = act('adPaid', (cfg, g, clock, ev) => R.adPaid(cfg, g, kind, amount, ref, clock, ev));
      if (!r) void useGame.getState().save();
      return r;
    });
  },
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
  noteSeen: (seen: { place?: R.PlaceId; card?: R.CardKind; plate?: R.PlateId }) => act('noteSeen', (cfg, g, clock, ev) => R.noteSeen(cfg, g, seen, clock, ev)),
  /** 2.15 ackAway(): the away card's OK. */
  ackAway: () => act('ackAway', (cfg, g) => R.ackAway(cfg, g)),
  /** A card's button: the action it names (types.ts CardAction), with its exact arguments. */
  press(a: R.CardAction, ctx: PressContext = {}): PressRefusal | null {
    // C-ACTIONS (PLAN2 6.3): while a press that takes seconds runs (a video, a store sheet), a second press is `nothing`.
    if (a.act !== 'open' && pressRunning()) return HELD;
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
        // C-ACTIONS: a hall's tab carries its plate (setPlateRecipe), its "Let the hall choose" also `choose`; none: the crucible.
        if (a.plate !== undefined && a.choose) return salvageActions.letHallChoose(a.plate);
        if (a.plate !== undefined) return salvageActions.setPlateRecipe(a.plate, a.recipe, a.confirmHeel);
        return salvageActions.setRecipe(a.recipe, a.confirmHeel);
      case 'setFromBays':
        // C-ACTIONS (PLAN2 2.3): a hall has no "Take from bays" (actionsWorks.ts has no such switch): refused as a rule.
        if (a.plate !== undefined) return act('setFromBays', refuseNothing);
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
        // s2c-fix-money (M4): a works card reports its plate, so the lender's letter can fall due from a real screen.
        return salvageActions.noteSeen({ card: data.kind, ...(a.card.kind === 'place' ? { place: a.card.place } : {}), ...(a.card.kind === 'works' ? { plate: a.card.plate } : {}) });
      }
      // Stage 2's buttons (types.ts CardAction v3), C-ACTIONS (PLAN2 2.3): each through act() or runAsync, so the
      // held-for-count rule and the crash record apply. An async one answers at once with what is known then (null:
      // started); what it came to is `pressAsync`'s.
      case 'signFinance':
        return salvageActions.signFinance(a.plate, a.shown);
      case 'setRoute':
        return salvageActions.setRoute(a.grade, a.to);
      case 'chooseLook':
        return salvageActions.chooseLook(a.slot, a.id);
      case 'setPacksHidden':
        // The switch opens the code pad (the screen's, as `open` is); the pad's OK calls setPacksHidden(on, code). A press
        // with the code in `ctx` is that OK; without one the rules answer for an empty code (nothing, or packCode).
        return salvageActions.setPacksHidden(a.on, ctx.code ?? '');
      case 'buyPack':
      case 'buyProduct':
      case 'restorePurchases':
      case 'watchAd':
        return salvageActions.pressAsync(a, ctx).sync;
    }
  },
  /** C-ACTIONS: the async presses (buyPack, buyProduct, restorePurchases, watchAd): what is known at once, and what it came to. Others land at once. */
  pressAsync(a: R.CardAction, ctx: PressContext = {}): { sync: PressRefusal | null; done: Promise<PressRefusal | null> } {
    switch (a.act) {
      case 'buyPack':
        return salvageActions.buyPack(a.product, a.S, ctx.country);
      case 'buyProduct':
        return salvageActions.buyProduct(a.product);
      case 'restorePurchases':
        return salvageActions.restorePurchases();
      case 'watchAd':
        return salvageActions.watchAd(a.kind, a.amount, { ...(a.grade !== undefined ? { grade: a.grade } : {}), ...(a.sell !== undefined ? { sell: a.sell } : {}) });
      default: {
        const r = salvageActions.press(a, ctx);
        return { sync: r, done: Promise.resolve(r) };
      }
    }
  },
};
