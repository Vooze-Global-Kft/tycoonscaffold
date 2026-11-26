/**
 * Every player action (yard-stage1.md 2.15): pure `(cfg, g, ..., clock, events)`; a refusal returns the
 * SAME state object and pushes `refused {key, args, retry}`; an action that changes nothing returns the
 * same object and pushes nothing. Every purchase compares the shown price with the price now and re-asks
 * (`priceUpdated`, retry = the same act at the price now) when they differ: shown equals applied.
 * Owner: rules-sim. The prices are the book's (ladder.ts): the card and the check read one function.
 */
import { nextGoal } from './goals';
import { priceOf } from './board';
import { onAwayClosed, onSeen } from './actionsMoney';
import { buyWorks, levelWorks } from './actionsWorks';
import { contentAt } from './layer';
import { asideOf, bayOf, freeOf } from './bays';
import { begin, count, finish, spend } from './clock';
import { newCrew } from './crew';
import { crucibleFromBays, pour } from './crucible';
import { dealSign, dealTerms } from './deal';
import { bossStep } from './hand';
import { buyCheck, hireCheck, levelCheck } from './ladder';
import { rerate } from './machines';
import { resolveGrams } from './money';
import { own, checks } from './rate';
import { setSkipDown } from './partners';
import { leaveTruck } from './truck';
import { marketDay } from './board';
import type { CardAction, CardKind, CrewRole, DealTerms, GradeId, Heading, LevelTarget, MachineId, PlaceId, Presence, RecipeId, RefusalKey, SalvageConfig, SalvageEvent, SalvageGame, SellShown, ShopKey, TxtArgs } from './types';

const refuse = (g: SalvageGame, events: SalvageEvent[] | undefined, key: RefusalKey, args: TxtArgs = {}, retry: CardAction | null = null): SalvageGame => {
  events?.push({ type: 'refused', key, args, retry });
  return g;
};

const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * The screen's presence sample (at most ten a second; at least every staleS/2 in the foreground, under
 * overlays too). Starts, continues and cancels the boss's act and reports its events. Returns the same
 * object when nothing changed.
 */
/** R7: the longest standingFor a sample may carry, seconds. */
const STANDING_MAX_S = 3600;
/** R7: metres a sample may move beyond the truck's speed × the time since the last one (Step out sets the boss down beside the truck). */
const PRESENCE_SLACK_M = 3;

/** R7/P10: a sample's position inside the yard and the lane, and no farther from the last sample than truck.bossV allows. */
export function clampPresence(cfg: SalvageConfig, s: SalvageGame['salvage'], px: number, py: number, clock: number): { x: number; y: number } {
  const c = cfg.salvage;
  const lane = Math.max(0, ...Object.values(c.map.lane).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)));
  let x = Math.min(c.yard.width + lane + 40, Math.max(0, px));
  let y = Math.min(c.yard.depth, Math.max(0, py));
  const q = s.presence;
  const dt = clock - s.presenceAt;
  if (s.presenceAt >= 0 && Number.isFinite(dt) && dt >= 0 && Number.isFinite(q.x) && Number.isFinite(q.y)) {
    const v = c.truck.bossV ?? c.truck.v;
    const max = v * dt + PRESENCE_SLACK_M;
    const d = Math.hypot(x - q.x, y - q.y);
    if (d > max && d > 0) {
      x = q.x + ((x - q.x) * max) / d;
      y = q.y + ((y - q.y) * max) / d;
    }
  }
  return { x, y };
}

export function setPresence(cfg: SalvageConfig, g: SalvageGame, p: Presence, clock: number, events?: SalvageEvent[]): SalvageGame {
  const s = g.salvage;
  const q = s.presence;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return g;
  const heading = Number.isFinite(p.heading) ? Math.floor(p.heading as number) : (q.heading ?? 0);
  const sameSample = q.x === p.x && q.y === p.y && q.driving === !!p.driving && q.moving === !!p.moving && heading === q.heading && Math.abs(q.standingFor - (p.standingFor || 0)) < 0.05;
  if (sameSample && clock - s.presenceAt < cfg.salvage.feel.staleS / 2) return g;
  const x = begin(cfg, g, events, true);
  // R7: the sample is clamped: inside the yard and the lane (save.ts's bounds), no faster than the boss's
  // truck (truck.bossV, P10) since the last sample (a step's slack for Step out's placement), driving only
  // while the boss holds the truck, standingFor in [0, 3600].
  const at = clampPresence(cfg, s, p.x, p.y, clock);
  const standing = Number.isFinite(p.standingFor) ? Math.min(STANDING_MAX_S, Math.max(0, p.standingFor || 0)) : 0;
  x.s.presence = { x: at.x, y: at.y, driving: !!p.driving && s.truck.owned && s.truck.by === 'boss', moving: !!p.moving, standingFor: standing, heading };
  x.s.presenceAt = clock;
  const t = Math.max(clock, x.s.t);
  bossStep(x, t);
  checks(x, t);
  return finish(g, x);
}

// ---------------------------------------------------------------------------------------- purchases
// The checks are the book's (ladder.ts buyCheck, hireCheck, levelCheck): the card prints the SAME object,
// so the price shown is the price applied; the action adds only priceUpdated and the state change.

type Check = { price: number | null; refusal: { key: RefusalKey; args: TxtArgs } | null };

function checked(g: SalvageGame, events: SalvageEvent[] | undefined, ch: Check, shown: number, retry: (price: number) => CardAction): SalvageGame | null {
  if (ch.refusal) return refuse(g, events, ch.refusal.key, ch.refusal.args);
  if (ch.price === null) return refuse(g, events, 'nothing');
  if (!same(ch.price, shown)) return refuse(g, events, 'priceUpdated', { a: { money: shown }, b: { money: ch.price } }, retry(ch.price));
  return null;
}

function shopItem(cfg: SalvageConfig, key: ShopKey) {
  return [...cfg.salvage.shop, ...cfg.salvage.dayOneList].find((i) => i.key === key) ?? null;
}

/** Buy a tool, carrier, machine, the truck, a recipe or the Night watch at the price the card showed. */
export function buy(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  // The content the state reads (layer.ts contentAt, s2a-fix): the works layer's items once the works opened.
  const it = shopItem({ ...cfg, salvage: contentAt(cfg.salvage, g.salvage) }, item);
  // Stage 2 (s2a-fix, the dispatcher): a plate is the works' (actionsWorks.ts buyWorks, through works.ts orderPlate).
  if (it?.kind === 'works') return buyWorks(cfg, g, item, shownPrice, clock, events);
  if (!it || it.kind === 'crew') return refuse(g, events, 'nothing');
  const ch = buyCheck(cfg, g, item);
  const r = checked(g, events, ch, shownPrice, (price) => ({ act: 'buy', item, price }));
  if (r) return r;
  const x = begin(cfg, g, events, true);
  spend(x, ch.price!);
  const t = Math.max(clock, x.s.t);
  if (it.deliver_s > 0) {
    const by = it.arrive ?? (it.kind === 'machine' ? 'machineFlatbed' : it.kind === 'vehicle' ? 'truck' : 'van');
    x.s.arriving.push({ item, by, place: it.place, since: t, at: t + it.deliver_s });
    const m = x.s.machines[item as MachineId];
    if (m && it.kind === 'machine') {
      m.status = 'arriving';
      m.since = t;
    }
  } else own(x, item, t);
  checks(x, t);
  return finish(g, x);
}

/** Hire a crew member of a role at the price the rota showed (the next unbought crew key of that role in shop order). */
export function hire(cfg: SalvageConfig, g: SalvageGame, role: CrewRole, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  const ch = hireCheck(cfg, g, role);
  const r = checked(g, events, ch, shownPrice, (price) => ({ act: 'hire', role, price }));
  if (r) return r;
  const x = begin(cfg, g, events, true);
  spend(x, ch.price!);
  const t = Math.max(clock, x.s.t);
  const m = newCrew(x, role, t);
  count(x, `hired:${role}`);
  x.ev.push({ type: 'hired', role, id: m.id });
  x.ev.push({ type: 'arrival', kind: 'crew', what: m.id });
  checks(x, t);
  return finish(g, x);
}

/** Buy the next level of a crew member, a machine or a partner (another skip in rotation) at the price shown. */
export function level(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  // Stage 2 (s2a-fix, the dispatcher): a plate's level and the Yard sale's room are the works' (actionsWorks.ts).
  if (target.kind === 'plate' || target.kind === 'reuse') return levelWorks(cfg, g, target, shownPrice, clock, events);
  const ch = levelCheck(cfg, g, target);
  const r = checked(g, events, ch, shownPrice, (price) => ({ act: 'level', target, price }));
  if (r) return r;
  const x = begin(cfg, g, events, true);
  spend(x, ch.price!);
  const t = Math.max(clock, x.s.t);
  let L = 1;
  if (target.kind === 'crew') {
    const m = x.s.crew.find((q) => q.id === target.id)!;
    L = m.level += 1;
  } else if (target.kind === 'machine') {
    L = x.s.machines[target.machine].level += 1;
    if (target.machine !== 'crucible') rerate(x, target.machine, t);
  } else {
    const p = x.s.partners[target.partner];
    L = p.level += 1;
    setSkipDown(x, target.partner, L - 1, t);
  }
  x.ev.push({ type: 'levelled', target, level: L });
  checks(x, t);
  return finish(g, x);
}

// ---------------------------------------------------------------------------------------- bays

/** Keep a bay off the merchant's round, or release it (free). */
export function setHold(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  if (!cfg.salvage.grades[grade]) return refuse(g, events, 'nothing');
  const b = g.salvage.bays[grade];
  if ((b?.held ?? false) === on) return g;
  const x = begin(cfg, g, events, true);
  bayOf(x, grade).held = on;
  // E32: the market day it was held on (the release after two market days counts from it).
  if (on) x.s.counts![`heldDay:${grade}`] = x.s.clock.day;
  else delete x.s.counts![`heldDay:${grade}`];
  x.ev.push({ type: 'heldBay', grade, on });
  return finish(g, x);
}

/** Sell a held bay's free stock at the price shown (set aside for the next round); a changed day re-asks. */
export function sell(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, shown: SellShown, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const s = g.salvage;
  const b = s.bays[grade];
  if (!b || !b.held) return refuse(g, events, 'nothing');
  const grams = Math.floor(freeOf(b) / 100) * 100;
  if (grams <= 0) return refuse(g, events, 'nothing');
  const day = marketDay(cfg.salvage, Math.max(now, s.clock.highMs));
  const price = priceOf(cfg.salvage, grade, day);
  if (shown.day !== day || !same(shown.price, price) || shown.grams !== grams) {
    return refuse(g, events, 'priceUpdated', { a: { price: shown.price }, b: { price } }, { act: 'sell', grade, shown: { day, price, grams } });
  }
  const x = begin(cfg, g, events, true);
  bayOf(x, grade).aside.push({ g: grams, price, day });
  void asideOf;
  void resolveGrams;
  return finish(g, x);
}

// ---------------------------------------------------------------------------------------- the crucible

/** Change the crucible's recipe; with a heel, first `confirmHeel`; refused during a heat. */
export function setRecipe(cfg: SalvageConfig, g: SalvageGame, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  const s = g.salvage;
  const cr = s.machines.crucible;
  if (!cr.owned || !cfg.salvage.machines.crucible.recipes[recipe]) return refuse(g, events, 'notOwned');
  const first = Object.keys(cfg.salvage.machines.crucible.recipes)[0];
  if (recipe !== first && !s.owned.includes(recipe)) return refuse(g, events, 'notOwned');
  if (cr.recipe === recipe) return g;
  if (cr.phase === 'heating' || cr.phase === 'ready' || cr.phase === 'pouring') return refuse(g, events, 'heatRunning');
  if ((cr.heel_g > 0 || cr.charge_g > 0) && !confirmHeel) return refuse(g, events, 'confirmHeel', {}, { act: 'setRecipe', recipe, confirmHeel: true });
  const x = begin(cfg, g, events, true);
  const t = Math.max(clock, x.s.t);
  const c2 = x.s.machines.crucible;
  // The unmelted charge goes back to its bay; the heel pours as one short ingot to the tray.
  // Each grade of the charge goes back to its own bay (R1: never all of it as the first input).
  if (c2.charge_g > 0) {
    const rec = cfg.salvage.machines.crucible.recipes[c2.recipe];
    const inG = Array.isArray(rec[0]) ? rec[0][0] : (rec[0] as string);
    let left = c2.charge_g;
    for (const [gr, gg] of Object.entries(c2.chargeBy ?? {})) {
      const back = Math.min(left, Math.max(0, gg));
      if (back <= 0) continue;
      bayOf(x, gr).g += back;
      left -= back;
    }
    if (left > 0) bayOf(x, inG).g += left;
    c2.charge_g = 0;
  }
  c2.chargeBy = {};
  // R1 (blocking): the heel pours WITHOUT refilling; the new recipe is set; only then the pot takes from the bays.
  const heel = c2.heel_g > 0;
  if (heel) pour(x, t, 'boss', true, false);
  for (const b of Object.values(x.s.bays)) b.forCrucible_g = 0;
  c2.recipe = recipe;
  c2.phase = 'empty';
  c2.endsAt = null;
  x.ev.push({ type: 'recipe', recipe, heelPoured: heel });
  crucibleFromBays(x, t);
  return finish(g, x);
}

/** "Take from bays" on the crucible's card. */
export function setFromBays(cfg: SalvageConfig, g: SalvageGame, on: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  const cr = g.salvage.machines.crucible;
  if (!cr.owned) return refuse(g, events, 'notOwned');
  if (cr.fromBays === on) return g;
  const x = begin(cfg, g, events, true);
  x.s.machines.crucible.fromBays = on;
  if (!on) for (const b of Object.values(x.s.bays)) b.forCrucible_g = 0;
  crucibleFromBays(x, Math.max(clock, x.s.t));
  return finish(g, x);
}

// ---------------------------------------------------------------------------------------- the deal, the truck, goals, seen, away

/** Sign the supply deal on the terms the card showed. */
export function signDeal(cfg: SalvageConfig, g: SalvageGame, shownTerms: DealTerms, now: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const d = g.salvage.deal;
  if (d.phase !== 'offered' || d.step === null) return refuse(g, events, 'nothing');
  const day = marketDay(cfg.salvage, Math.max(now, g.salvage.clock.highMs));
  const terms = dealTerms({ c: cfg.salvage }, d.step, day);
  if (!terms) return refuse(g, events, 'nothing');
  if (shownTerms.step !== terms.step || shownTerms.q_g !== terms.q_g || shownTerms.days !== terms.days || !same(shownTerms.price, terms.price)) {
    return refuse(g, events, 'priceUpdated', { a: { price: shownTerms.price }, b: { price: terms.price } }, { act: 'signDeal', terms });
  }
  const x = begin(cfg, g, events, true);
  dealSign(x, terms);
  checks(x, x.s.t);
  return finish(g, x);
}

/** The deal card's Not now. */
export function declineDeal(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  if (g.salvage.deal.phase !== 'offered' || g.salvage.deal.step === null) return refuse(g, events, 'nothing');
  const x = begin(cfg, g, events, true);
  // Declined: the offer comes back the next market day (2.9, v3); the optional goal is passed over.
  x.s.deal.phase = 'declined';
  const id = (cfg.salvage.goals.find((q) => q.done === 'deal:signed') ?? null)?.id;
  if (id && !x.s.goals.skipped.includes(id) && !x.s.goals.done.includes(id)) x.s.goals.skipped.push(id);
  return finish(g, x);
}

/** "Step out" of the truck: its stopped place and heading become rules state; refused while it moves. */
export function stepOut(cfg: SalvageConfig, g: SalvageGame, at: { x: number; y: number; heading: Heading } | null, clock: number, events?: SalvageEvent[]): SalvageGame {
  const s = g.salvage;
  if (s.truck.by !== 'boss') return refuse(g, events, 'nothing');
  if (s.presence.moving) return refuse(g, events, 'stopFirst');
  const x = begin(cfg, g, events, true);
  leaveTruck(x, at ?? { x: s.presence.x, y: s.presence.y, heading: s.presence.heading ?? s.truck.heading }, Math.max(clock, x.s.t));
  return finish(g, x);
}

/** The goal card's Not now on an optional goal (refused `nothing` when it is not the current optional goal). */
export function skipGoal(cfg: SalvageConfig, g: SalvageGame, id: string, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const cur = nextGoal(cfg, g);
  if (!cur || cur.id !== id || !cur.optional) return refuse(g, events, 'nothing');
  return { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, skipped: [...g.salvage.goals.skipped, id] } } };
}

/** The screen saw a place's label or opened a card (every "first time" text reads `seen`). Same object when already seen. */
export function noteSeen(cfg: SalvageConfig, g: SalvageGame, seen: { place?: PlaceId; card?: CardKind; plate?: string }, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const s = g.salvage;
  const addPlace = seen.place !== undefined && !s.seen.places.includes(seen.place);
  const addCard = seen.card !== undefined && !s.seen.cards.includes(seen.card);
  // Stage 2 (s2a-fix): the money's part of a sighting (the lender's letter, actionsMoney.ts onSeen; the stub returns the game as it is).
  if (!addPlace && !addCard) return onSeen(cfg, g, seen, events);
  return onSeen(cfg, { ...g, salvage: { ...s, seen: { places: addPlace ? [...s.seen.places, seen.place as string] : s.seen.places, cards: addCard ? [...s.seen.cards, seen.card as CardKind] : s.seen.cards } } }, seen, events);
}

/** The away card's OK: the card goes (its money was paid when computed). */
export function ackAway(cfg: SalvageConfig, g: SalvageGame): SalvageGame {
  if (!g.salvage.away) return g;
  const counts = { ...(g.salvage.counts ?? {}) };
  counts.away = (counts.away ?? 0) + 1;
  // Stage 2 (s2a-fix): what closing the card starts (iap.sessions2At, the away bonus: actionsMoney.ts onAwayClosed; the stub returns the game as it is).
  return onAwayClosed(cfg, { ...g, salvage: { ...g.salvage, away: null, counts } }, g.salvage.away);
}
