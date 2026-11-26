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
import type { GradeId, LevelTarget, PlateId, RecipeId, SalvageConfig, SalvageEvent, SalvageGame, ShopKey, StationId } from './types';

const nothing = (g: SalvageGame, events: SalvageEvent[] | undefined): SalvageGame => {
  events?.push({ type: 'refused', key: 'nothing', args: {}, retry: null });
  return g;
};

/** Buy a plate at its shown price (actions.ts buy, for a shop item of kind 'works'). Stub: refused. */
export function buyWorks(cfg: SalvageConfig, g: SalvageGame, item: ShopKey, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void item;
  void shownPrice;
  void clock;
  return nothing(g, events);
}

/** Level a plate or the Yard sale's room (actions.ts level, for kinds 'plate' and 'reuse'). Stub: refused. */
export function levelWorks(cfg: SalvageConfig, g: SalvageGame, target: Extract<LevelTarget, { kind: 'plate' | 'reuse' }>, shownPrice: number, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void target;
  void shownPrice;
  void clock;
  return nothing(g, events);
}

/** Route a grade's bay to a station or back to the bay (2.8.1; refusals notOwned, noRoute). Stub: refused. */
export function setRoute(cfg: SalvageConfig, g: SalvageGame, grade: GradeId, to: StationId | 'bay', clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void grade;
  void to;
  void clock;
  return nothing(g, events);
}

/** A hall's recipe (as setRecipe; refusals notOwned, heatRunning, confirmHeel, routed). Stub: refused. */
export function setPlateRecipe(cfg: SalvageConfig, g: SalvageGame, plate: PlateId, recipe: RecipeId, confirmHeel: boolean, clock: number, events?: SalvageEvent[]): SalvageGame {
  void cfg;
  void plate;
  void recipe;
  void confirmHeel;
  void clock;
  return nothing(g, events);
}
