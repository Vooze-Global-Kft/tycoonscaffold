/**
 * Every player action (yard-stage1.md 2.15): pure `(cfg, g, ..., clock, events)`; a refusal returns the
 * same state and pushes `refused {key, args, retry}`. Owner: rules-sim.
 */
import { goalOf } from './cards';
import type { CardKind, CrewRole, DealTerms, GradeId, Heading, LevelTarget, PlaceId, Presence, RecipeId, RefusalKey, SalvageConfig, SalvageEvent, SalvageGame, SellShown, ShopKey, TxtArgs } from './types';

const refuse = (g: SalvageGame, events: SalvageEvent[] | undefined, key: RefusalKey, args: TxtArgs = {}): SalvageGame => {
  events?.push({ type: 'refused', key, args, retry: null });
  return g;
};

/**
 * The screen's presence sample (at most ten a second; at least every staleS/2 in the foreground, under
 * overlays too). Starts, continues and cancels the boss's act and reports its events (Presence's doc).
 * Returns the same object when nothing changed. STUB(hour 0): stores the sample only.
 */
export function setPresence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number, events?: SalvageEvent[]): SalvageGame {
  // STUB(hour 0)
  void events;
  const s = g.salvage;
  const q = s.presence;
  const heading = Number.isFinite(p.heading) ? Math.floor(p.heading as number) : (q.heading ?? 0);
  const same = q.x === p.x && q.y === p.y && q.driving === p.driving && q.moving === p.moving && heading === q.heading && Math.abs(q.standingFor - p.standingFor) < 0.05;
  if (same && clock - s.presenceAt < cfg.salvage.feel.staleS / 2) return g;
  return { ...g, salvage: { ...s, presence: { x: p.x, y: p.y, driving: !!p.driving, moving: !!p.moving, standingFor: Math.max(0, p.standingFor || 0), heading }, presenceAt: clock } };
}

/** Buy a tool, carrier, machine, the truck, a recipe or the Night watch at the price the card showed. STUB(hour 0). */
export function buy(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void item;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Hire a crew member of a role at the price the rota showed. STUB(hour 0). */
export function hire(cfg: SalvageConfig, g: SalvageGame, role: CrewRole, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void role;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Buy the next level of a crew member or a machine at the price shown. STUB(hour 0). */
export function level(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void target;
  void shownPrice;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Keep a bay off the merchant's round, or release it (free). STUB(hour 0). */
export function setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void on;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sell a held bay's stock at the price shown (set aside for the next round); a changed day re-asks ("priceUpdated"). STUB(hour 0). */
export function sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void shown;
  void now;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Change the crucible's recipe; with a heel, first `confirmHeel` (refusal "confirmHeel" asks); refused during a heat. STUB(hour 0). */
export function setRecipe(cfg: SalvageConfig, g: SalvageGame, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void recipe;
  void confirmHeel;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** "Take from bays" on the crucible's card. STUB(hour 0). */
export function setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void on;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** Sign the supply deal on the terms the card showed. STUB(hour 0). */
export function signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void shownTerms;
  void now;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The deal card's Not now (the goal may be skipped). STUB(hour 0). */
export function declineDeal(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** "Step out" of the truck: its stopped place and heading (from the world; null: the last presence) become rules state; refused `stopFirst` while it moves. STUB(hour 0). */
export function stepOut(cfg: SalvageConfig, g: SalvageGame, at: { x: number; y: number; heading: Heading } | null, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void at;
  void clock;
  // STUB(hour 0)
  return refuse(g, events, 'notBuilt');
}

/** The goal card's Not now on an optional goal (refused `nothing` when it is not the current optional goal). Real. */
export function skipGoal(cfg: SalvageConfig, g: SalvageGame, id: string, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const cur = goalOf(cfg.salvage, g);
  if (!cur || cur.id !== id || !cur.optional) return refuse(g, events, 'nothing');
  return { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, skipped: [...g.salvage.goals.skipped, id] } } };
}

/** The screen saw a place's label or opened a card (every "first time" text reads `seen`). Same object when already seen. Real. */
export function noteSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: PlaceId; card?: CardKind }, clock: number): SalvageGame {
  void cfg;
  void clock;
  const s = g.salvage;
  const addPlace = seen.place !== undefined && !s.seen.places.includes(seen.place);
  const addCard = seen.card !== undefined && !s.seen.cards.includes(seen.card);
  if (!addPlace && !addCard) return g;
  return { ...g, salvage: { ...s, seen: { places: addPlace ? [...s.seen.places, seen.place as string] : s.seen.places, cards: addCard ? [...s.seen.cards, seen.card as CardKind] : s.seen.cards } } };
}

/** The away card's OK: the card goes (its money was paid when computed). */
export function ackAway(cfg: SalvageConfig, g: SalvageGame): SalvageGame {
  void cfg;
  if (!g.salvage.away) return g;
  return { ...g, salvage: { ...g.salvage, away: null } };
}

