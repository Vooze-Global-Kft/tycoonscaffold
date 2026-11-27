/**
 * THE WORKS' ACTIONS (stage 2, yard-stage2.md 2.6 to 2.12, 2.19): buying and ordering a plate, setRoute,
 * setPlateRecipe, levelling a plate or the Yard sale's room. Owner: rules-works (Phase B). actions.ts is the
 * closed dispatcher (s2a-fix, the lead's ruling of 26 Nov 09:50): its `buy` hands a shop item of kind 'works'
 * here, its `level` a LevelTarget of kind 'plate' or 'reuse'. Same shape as every action: pure, a refusal
 * pushed to `events` with the SAME state returned; a plate is ordered through works.ts `orderPlate` (its one
 * path: WorksState {phase 'arriving', commissionAt}; `s.arriving` never holds a works key).
 *
 * PHASE A STUB: every action refuses with `nothing` (nothing of the works is on sale before they open).
 */
import { begin, finish, spend } from './clock';
import { plateDef } from './content';
import { hallBusy } from './halls';
import { cashRefusal, ceilingRefusal, gateRefusal, plateLevelPrice, shopItem, type PurchaseCheck } from './ladder';
import { contentAt } from './layer';
import { roundMoney } from './money';
import { checks } from './rate';
import { bayOf } from './bays';
import { routesChanged } from './memo';
import { orderPlate, reratePlate, routeOf, takesGrade } from './works';
import { forkliftOut } from './forklift';
import type { CardAction, GradeId, LevelTarget, PlateId, RecipeId, RefusalKey, SalvageConfig, SalvageEvent, SalvageGame, ShopKey, StationId, TxtArgs } from './types';

const refuse = (g: SalvageGame, events: SalvageEvent[] | undefined, key: RefusalKey, args: TxtArgs = {}, retry: CardAction | null = null): SalvageGame => {
  events?.push({ type: 'refused', key, args, retry });
  return g;
};
const same = (a: number, b: number) => Math.abs(a - b) < 0.005;
const plateName = (id: string): TxtArgs => ({ item: { text: `title.works.${id}` as never } });

/**
 * THE CHECK OF BUYING A PLATE (2.6.2): the card prints this object and buyWorks applies it, so the price shown is
 * the price applied. In order: not a plate of the content read now (contentAt) or not on sale: `nothing`;
 * already ordered (any phase): `owned` (state 'arriving' while on the flatbed or installed); its gate (a rung):
 * `rung`; the plate it needs not ordered: `needsItem` naming it; the price (the shop item's, rounded) above the
 * cash or the driver's earmark: `cash` / `earmark`. Cash only here (a loan is signFinance's, rules-money).
 */
export function plateBuyCheck(cfg: SalvageConfig, g: SalvageGame, plate: ShopKey): PurchaseCheck {
  const c = contentAt(cfg.salvage, g.salvage);
  const d = plateDef(c, plate);
  const it = shopItem(c, plate);
  if (!d || !it || it.kind !== 'works') return { price: null, refusal: { key: 'nothing', args: {} }, state: 'info' };
  const w = g.salvage.works[plate];
  if (w) return { price: null, refusal: { key: 'owned', args: {} }, state: w.phase === 'running' ? 'owned' : 'arriving' };
  const gate = gateRefusal(c, g, it.gate);
  if (gate) return { price: null, refusal: gate, state: 'locked' };
  const needs = d.needs ?? it.needsItem ?? null;
  if (needs && !g.salvage.works[needs]) return { price: null, refusal: { key: 'needsItem', args: plateName(needs) }, state: 'locked' };
  const price = roundMoney(it.price);
  // s2e-levels (yard-stage2-economy.md 2.11; 22 M10): the ceiling BEFORE the money, so the headroom never depends on the cash.
  const s = g.salvage;
  const ceil = ceilingRefusal(cfg, g, { ...g, salvage: { ...s, works: { ...s.works, [plate]: { phase: 'running', level: 1 } as unknown as (typeof s.works)[string] } } });
  if (ceil) return { price, refusal: ceil, state: 'locked' };
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford' };
  return { price, refusal: null, state: 'buy' };
}

/** Buy a plate at its shown price (actions.ts buy, for a shop item of kind 'works'): the money, then works.ts orderPlate (its one path). */
export function buyWorks(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  const ch = plateBuyCheck(cfg, g, item);
  if (ch.refusal) return refuse(g, events, ch.refusal.key, ch.refusal.args);
  if (ch.price === null) return refuse(g, events, 'nothing');
  if (!same(ch.price, shownPrice)) return refuse(g, events, 'priceUpdated', { a: { money: shownPrice }, b: { money: ch.price } }, { act: 'buy', item, price: ch.price });
  const x = begin(cfg, g, events, true);
  spend(x, ch.price);
  const t = Math.max(clock, x.s.t);
  orderPlate(x, item, t);
  checks(x, t);
  return finish(g, x);
}

/**
 * THE CHECK OF A PLATE'S LEVEL (2.6.4): not ordered or not running: `notOwned`; at works.maxLevel or the plate's
 * maxLevel: `topLevel`; the price is rules-money's ladder.ts plateLevelPrice (null: `nothing`); above the cash: `cash`.
 */
export function plateLevelCheck(cfg: SalvageConfig, g: SalvageGame, plate: PlateId): PurchaseCheck {
  const c = contentAt(cfg.salvage, g.salvage);
  const d = plateDef(c, plate);
  const w = g.salvage.works[plate];
  if (!d || !w || w.phase !== 'running') return { price: null, refusal: { key: 'notOwned', args: plateName(plate) }, state: 'locked' };
  const top = Math.min(d.maxLevel, c.works?.maxLevel ?? d.maxLevel);
  if (w.level >= top) return { price: null, refusal: { key: 'topLevel', args: {} }, state: 'top' };
  const p = plateLevelPrice(cfg, g, plate);
  if (p === null) return { price: null, refusal: { key: 'nothing', args: {} }, state: 'info' };
  const price = roundMoney(p);
  // s2e-levels: the ceiling before the money (as levelCheck's from the works' opening).
  const ceil = ceilingRefusal(cfg, g, { ...g, salvage: { ...g.salvage, works: { ...g.salvage.works, [plate]: { ...w, level: w.level + 1 } } } });
  if (ceil) return { price, refusal: ceil, state: 'locked' };
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford' };
  return { price, refusal: null, state: 'buy' };
}

/** Level a plate (actions.ts level, kind 'plate'); the Yard sale's room (kind 'reuse') is wave 2's and refuses `nothing` until it is built. A level re-rates the piece in work at once. */
export function levelWorks(cfg: SalvageConfig, g: SalvageGame, target: Extract<LevelTarget, { kind: 'plate' | 'reuse' }>, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  if (target.kind !== 'plate') return refuse(g, events, 'nothing');
  const ch = plateLevelCheck(cfg, g, target.plate);
  if (ch.refusal) return refuse(g, events, ch.refusal.key, ch.refusal.args);
  if (ch.price === null) return refuse(g, events, 'nothing');
  if (!same(ch.price, shownPrice)) return refuse(g, events, 'priceUpdated', { a: { money: shownPrice }, b: { money: ch.price } }, { act: 'level', target, price: ch.price });
  const x = begin(cfg, g, events, true);
  spend(x, ch.price);
  const t = Math.max(clock, x.s.t);
  const w = x.s.works[target.plate];
  w.level += 1;
  reratePlate(x, target.plate, w, t);
  x.ev.push({ type: 'levelled', target, level: w.level });
  checks(x, t);
  return finish(g, x);
}

/**
 * Route a grade's bay (2.7.1, 2.8.1): to a running station that takes the grade (a plate, or the crucible) or back
 * to 'bay' (sold by the round). Refusals: an unknown grade `nothing`; a station not running (not owned)
 * `notOwned`; one that does not take the grade `noRoute`. The same route again changes nothing. Event `routeSet`.
 * The plates read it at their next draw, charge or a hand's departure; the bays' reserves follow at once.
 */
export function setRoute(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, to: StationId | 'bay', clock: number, events?: SalvageEvent[]): SalvageGame {
  const c = contentAt(cfg.salvage, g.salvage);
  if (!c.grades[grade]) return refuse(g, events, 'nothing');
  const s = g.salvage;
  if (to !== 'bay') {
    const runs = to === 'crucible' ? s.machines.crucible.owned : s.works[to]?.phase === 'running';
    if (!runs) return refuse(g, events, 'notOwned', to === 'crucible' ? {} : plateName(to));
  }
  if (s.routes[grade] === to) return g;
  const x = begin(cfg, g, events, true);
  if (to !== 'bay' && !takesGrade(x, to, grade)) return refuse(g, events, 'noRoute');
  x.s.routes[grade] = to;
  routesChanged(x);
  x.ev.push({ type: 'routeSet', grade, to });
  void clock;
  return finish(g, x);
}

/**
 * A hall's recipe (2.8, as the crucible's setRecipe): not a running hall or not its recipe `notOwned`; a heat
 * running `heatRunning`; a charge in and not confirmed `confirmHeel` (retry with it); a grade of the new recipe
 * routed by its bay card to another station `routed`. The charge goes back to its own bays (by grade); the hall
 * then charges from its bays under the new recipe.
 * s2g-halls (RULING2.md 29.1): THE TAP PINS the recipe (`heat.pinned`): the hall stays on it, heat after heat, until
 * the player hands the choice back (letHallChoose). Tapping the recipe the hall is already on pins it as it stands
 * (nothing is handed back, whatever the heat's phase); tapping it again while pinned changes nothing.
 */
export function setPlateRecipe(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  const c = contentAt(cfg.salvage, g.salvage);
  const d = plateDef(c, plate);
  const w = g.salvage.works[plate];
  const rec = d?.recipes?.[recipe];
  if (!d || !w || !w.heat || w.phase !== 'running' || !rec) return refuse(g, events, 'notOwned', plateName(plate));
  if (w.heat.recipe === recipe) {
    if (w.heat.pinned) return g;
    const x = begin(cfg, g, events, true);
    x.s.works[plate].heat!.pinned = true;
    routesChanged(x);
    x.ev.push({ type: 'recipe', recipe, heelPoured: false, plate });
    void clock;
    return finish(g, x);
  }
  if (hallBusy(w.heat.phase)) return refuse(g, events, 'heatRunning');
  if (w.heat.charge_g > 0 && !confirmHeel) return refuse(g, events, 'confirmHeel', {}, { act: 'setRecipe', recipe, confirmHeel: true, plate });
  for (const gr of rec.in) {
    const set = g.salvage.routes[gr];
    if (set !== undefined && set !== plate) return refuse(g, events, 'routed', plateName(set === 'bay' ? plate : set));
  }
  const x = begin(cfg, g, events, true);
  const t = Math.max(clock, x.s.t);
  const h = x.s.works[plate].heat!;
  for (const [gr, gg] of Object.entries(h.chargeBy ?? {})) if (gg > 0) bayOf(x, gr).g += gg;
  h.charge_g = 0;
  h.chargeBy = {};
  h.recipe = recipe;
  h.pinned = true;
  routesChanged(x);
  h.phase = 'empty';
  h.phaseSince = t;
  h.endsAt = null;
  x.ev.push({ type: 'recipe', recipe, heelPoured: false, plate });
  void routeOf;
  return finish(g, x);
}

/**
 * s2g-halls (RULING2.md 29.1): "Let the hall choose": the hall's recipe is no longer pinned (`heat.pinned` removed); from
 * its next heat's start it charges the recipe that adds the most worth (halls.ts hallPick). A charge in or a heat running
 * stays as it is. Not a running hall with recipes `notOwned`; a hall that already chooses: `nothing` (the same state).
 */
export function letHallChoose(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, clock: number, events?: SalvageEvent[]): SalvageGame {
  const c = contentAt(cfg.salvage, g.salvage);
  const d = plateDef(c, plate);
  const w = g.salvage.works[plate];
  if (!d?.recipes || !w || !w.heat || w.phase !== 'running') return refuse(g, events, 'notOwned', plateName(plate));
  if (!w.heat.pinned) return refuse(g, events, 'nothing');
  const x = begin(cfg, g, events, true);
  delete x.s.works[plate].heat!.pinned;
  routesChanged(x);
  void clock;
  return finish(g, x);
}

/**
 * "Step out" of the forklift (2.9; wave 2): refused `nothing` when the boss is not in it, `stopFirst` while he
 * moves; else he stands beside it where it is parked, its forks keeping their load. Entering again is armed once he
 * has walked farther than truck.enter + truck.rearm from it (forklift.ts).
 */
export function stepOutForklift(cfg: SalvageConfig, g: SalvageGame, clock: number, events?: SalvageEvent[]): SalvageGame {
  void clock;
  const s = g.salvage;
  if (!s.forklift || s.forklift.by !== 'boss') return refuse(g, events, 'nothing');
  if (s.presence.moving) return refuse(g, events, 'stopFirst');
  const x = begin(cfg, g, events, true);
  forkliftOut(x);
  return finish(g, x);
}
