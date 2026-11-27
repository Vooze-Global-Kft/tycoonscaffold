/**
 * Rungs, range, ceilings and the prices of purchases (yard-stage1.md 2.11, 2.15, E2, E13a, E25, S16).
 * READS state only (owner: rules-book). ONE CHECK PER PURCHASE: `buyCheck`, `hireCheck`, `levelCheck`
 * return the price and the first refusal in the order types.ts SalvageActions lists, and the row state
 * a card draws. The cards print that object and the rules-sim's actions apply it, so the price and the
 * refusal a card shows are the ones the action applies (shown equals applied); the action adds only
 * `priceUpdated` (shown ≠ the check's price) and the change itself.
 */
import { contentAt, worksOpened } from './layer';
import type { SalvageContent } from '../../config/schema.salvage';
import { driverRoundF } from './content';
import { roundMoney } from './money';
import { pointOf } from './positions';
import { levelGain, ratedCapacity, ratedIncome, replayIncome } from './rate';
import type { CrewRole, LevelTarget, MachineId, PartnerId, RefusalKey, RowState, SalvageConfig, SalvageGame, ShopItem, ShopKey, TextKey, Txt, TxtArgs } from './types';

/** What a purchase check returns: the price it would charge (null: nothing to charge), the first refusal, the row's state. */
export interface PurchaseCheck {
  price: number | null;
  refusal: { key: RefusalKey; args: TxtArgs } | null;
  state: RowState;
  /** hireCheck: the crew shop key the hire takes (hand1, hand2, cutter, ...). */
  key?: ShopKey;
}

// ============================================================================ the shop

/** Every shop item: the hour's list, then the day-1 list. */
export function shopItems(c: SalvageContent): ShopItem[] {
  return [...c.shop, ...c.dayOneList];
}

export function shopItem(c: SalvageContent, key: ShopKey): ShopItem | undefined {
  return shopItems(c).find((i) => i.key === key);
}

/** The crew role a crew shop key hires (hand1, hand2 → hand; cutter, cutter2 → cutter; driver). */
export function roleOfKey(key: ShopKey): CrewRole | null {
  const m = /^(hand|cutter|driver)\d*$/.exec(key);
  return m ? (m[1] as CrewRole) : null;
}

/** The crew shop keys of a role, in shop order (2.15: hand1, hand2, cutter, cutter2, driver). */
export function crewKeys(c: SalvageContent, role: CrewRole): ShopKey[] {
  return shopItems(c)
    .filter((i) => i.kind === 'crew' && roleOfKey(i.key) === role)
    .map((i) => i.key);
}

/** The text key of a shop item's name (item.sack, role.hand, ...). */
export function itemName(key: ShopKey): TextKey {
  const role = roleOfKey(key);
  if (role) return `role.${role}` as TextKey;
  const k = key === 'hand_stripper' ? 'handStripper' : key;
  return `item.${k}` as TextKey;
}

/** The rung a gate names ('rung2' → 2), or 0 when it names none. */
export function gateRung(gate: string | null | undefined): number {
  const m = /^rung(\d+)$/.exec(gate ?? '');
  return m ? Number(m[1]) : 0;
}

/** Grams supplied that a rung asks (content ladder). */
export function rungGrams(c: SalvageContent, n: number): number {
  const r = rungsOf(c).find((x) => x.n === n);
  return Math.round((r?.t ?? 0) * 1e6);
}

/** Is a content gate (a rung id, or a shop key that must be owned) met? */
export function gateMet(c: SalvageContent, g: SalvageGame, gate: string | null | undefined): boolean {
  if (!gate) return true;
  const r = gateRung(gate);
  if (r) return g.salvage.ladder.rung >= r;
  return owns(c, g, gate);
}

/** The gate's refusal, or null when met: a rung ("Opens at {t} supplied") or an item owned (E25: "Opens with: {item}"). */
export function gateRefusal(c: SalvageContent, g: SalvageGame, gate: string | null | undefined): { key: RefusalKey; args: TxtArgs } | null {
  if (gateMet(c, g, gate)) return null;
  const r = gateRung(gate);
  if (r) return { key: 'rung', args: { t: { tonnes_g: rungGrams(c, r) } } };
  // E25's item gate. STAND-IN: refusal key `notOwned` until rules-sim adds `needsItem` (requests.md).
  return { key: 'notOwned', args: { item: { text: itemName(gate as string) } } };
}

/** True when a shop key is owned, or a crew key already hired. */
export function owns(c: SalvageContent, g: SalvageGame, key: ShopKey): boolean {
  if (g.salvage.owned.includes(key)) return true;
  const role = roleOfKey(key);
  if (!role) return false;
  const i = crewKeys(c, role).indexOf(key);
  return i >= 0 && g.salvage.crew.filter((m) => m.role === role).length > i;
}

const arriving = (g: SalvageGame, key: ShopKey) => g.salvage.arriving.some((a) => a.item === key);
const earmarkOf = (g: SalvageGame) => g.salvage.truck.earmark?.money ?? 0;

/** The money refusal of a price (E11, 5.4): `cash` when it is above cash, `earmark` when the driver's earmark holds it, else null. */
export function cashRefusal(g: SalvageGame, price: number): { key: RefusalKey; args: TxtArgs } | null {
  if (price > g.cash + 1e-9) return { key: 'cash', args: { x: { money: roundMoney(price - g.cash) } } };
  const ear = earmarkOf(g);
  if (ear > 0 && price > g.cash - ear + 1e-9) return { key: 'earmark', args: { x: { money: ear } } };
  return null;
}

/** The capacity ceiling of the current rung, t/h (2.11, S16): a purchase lifting R over it is refused. */
export function ceilingFor(cfg: SalvageConfig, g: SalvageGame): number {
  const list = cfg.salvage.ceilings_t_h;
  const r = Math.max(1, Math.min(list.length, g.salvage.ladder.rung));
  return list[r - 1] ?? Infinity;
}

/** The ceiling's refusal when R after a purchase (`after`) would pass the rung's ceiling (5.4 "Yard capacity {c} t/h · grows at {t} supplied"). Exported for bank.ts signFinance (rules-money). */
export function ceilingRefusal(cfg: SalvageConfig, g: SalvageGame, after: SalvageGame): { key: RefusalKey; args: TxtArgs } | null {
  const cap = ceilingFor(cfg, g);
  if (!Number.isFinite(cap)) return null;
  const now = ratedCapacity(cfg, g);
  const next = ratedCapacity(cfg, after);
  if (next <= cap + 1e-9 || next <= now + 1e-9) return null;
  return { key: 'ceiling', args: { c: { n: cap }, t: { tonnes_g: rungGrams(cfg.salvage, g.salvage.ladder.rung + 1) } } };
}

/** The price a card shows for a shop item now, or null when it is not for sale (owned, on its way, gated, unknown). */
export function shopPrice(cfg: SalvageConfig, g: SalvageGame, item: ShopKey): number | null {
  // The content the state reads (layer.ts contentAt, s2a-fix): the works layer's items once the works opened.
  const c = contentAt(cfg.salvage, g.salvage);
  const it = shopItem(c, item);
  if (!it || owns(c, g, item) || arriving(g, item)) return null;
  if (!gateMet(c, g, it.gate)) return null;
  return roundMoney(it.price);
}

/** The buy check (2.15): owned (owned or arriving), the gate, earmark or cash, ceiling. */
export function buyCheck(cfg: SalvageConfig, g: SalvageGame, item: ShopKey): PurchaseCheck {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const it = shopItem(c, item);
  if (!it) return { price: null, refusal: { key: 'nothing', args: {} }, state: 'info' };
  if (owns(c, g, item)) return { price: null, refusal: { key: 'owned', args: {} }, state: 'owned' };
  if (arriving(g, item)) return { price: null, refusal: { key: 'owned', args: {} }, state: 'arriving' };
  const gate = gateRefusal(c, g, it.gate);
  if (gate) return { price: null, refusal: gate, state: 'locked' };
  const price = roundMoney(it.price);
  const after = { ...g, salvage: { ...g.salvage, owned: [...g.salvage.owned, item] } };
  return moneyAndCeiling(cfg, g, price, after);
}

/** The next unbought crew key of a role (shop order), or null. */
export function nextCrewKey(cfg: SalvageConfig, g: SalvageGame, role: CrewRole): ShopKey | null {
  const keys = crewKeys(cfg.salvage, role);
  const hired = g.salvage.crew.filter((m) => m.role === role).length;
  return keys[hired] ?? null;
}

/** The hire check (2.15): noPlace when no crew key of that role is left, then as buy. */
export function hireCheck(cfg: SalvageConfig, g: SalvageGame, role: CrewRole): PurchaseCheck {
  const key = nextCrewKey(cfg, g, role);
  if (!key) return { price: null, refusal: { key: 'noPlace', args: {} }, state: 'top' };
  const it = shopItem(cfg.salvage, key)!;
  const gate = gateRefusal(cfg.salvage, g, it.gate);
  if (gate) return { price: null, refusal: gate, state: 'locked', key };
  const price = roundMoney(it.price);
  return { ...moneyAndCeiling(cfg, g, price, hiredState(g, role)), key };
}

/** The state with one more crew member of a role (for the ceiling's "R after" and the advice's rated gain): a new member at level 1, idle at the office. */
export function hiredState(g: SalvageGame, role: CrewRole): SalvageGame {
  const slot = g.salvage.crew.filter((m) => m.role === role).length;
  const member = { id: `${role}.${slot}`, role, slot, name: 0, level: 1, job: 'idle' as const, phase: 'wait' as const, from: { place: 'office' }, to: { place: 'office' }, t0: g.salvage.t, t1: g.salvage.t, carries: null, load: [], claims: [], cut: null };
  return { ...g, salvage: { ...g.salvage, crew: [...g.salvage.crew, member] } };
}

/**
 * THE RATED GAIN of a change of assets (s2c-fix-money E3, E7): the rated replay's income (rate.ts replayIncome, on the
 * content at the state: the yard's assets all in use, before E6's envelope) of `after` less now, § an hour. What a level
 * of a partner is priced from, what the advice line's payback reads and what the card's "not the bottleneck now" asks.
 * One replay a state (the envelope costs ten or more: a card or the line reads many states after every purchase).
 */
export function ratedGain(cfg: SalvageConfig, g: SalvageGame, after: SalvageGame): number {
  const c = contentAt(cfg.salvage, g.salvage);
  return replayIncome(c, after.salvage) - replayIncome(c, g.salvage);
}

/**
 * The last two refusals of a purchase check: the money (cash, earmark) and the ceiling. THE FIRST YARD (the works
 * not opened): the money first, as merged and as on the owner's phone. FROM THE WORKS' OPENING (s2c-fix-money M10,
 * E10): the ceiling first, so an item the ceiling forbids reads its ceiling refusal whatever the cash, and the
 * headroom U (shop.ts) never depends on the cash in hand. The price is the same either way.
 */
function moneyAndCeiling(cfg: SalvageConfig, g: SalvageGame, price: number, after: SalvageGame): PurchaseCheck {
  const ceilFirst = worksOpened(g.salvage);
  if (ceilFirst) {
    const ceil = ceilingRefusal(cfg, g, after);
    if (ceil) return { price, refusal: ceil, state: 'locked' };
  }
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford' };
  if (!ceilFirst) {
    const ceil = ceilingRefusal(cfg, g, after);
    if (ceil) return { price, refusal: ceil, state: 'locked' };
  }
  return { price, refusal: null, state: 'buy' };
}

// ============================================================================ levels (E13a, E25)

/** The first yard's top rung: below and at it every first-yard rule stays exactly as measured (2.11's changes start above it). */
export const FIRST_YARD_TOP_RUNG = 3;

/**
 * The level cap, minutes (2.11, E11): content `levels.tau.cap` (540) up to the first yard's top rung; from
 * rung 4, 60 × tau_r minutes (content `tau_h[rung − 1]`), so that crew, partner and first-yard machine levels
 * do not pay back in 9 h beside plates at 22 to 45 h. A rung without a tau keeps `levels.tau.cap`.
 */
export function levelCapMin(c: SalvageContent, rung: number): number {
  const cap = c.levels.tau.cap;
  if (rung <= FIRST_YARD_TOP_RUNG) return cap;
  const tau = c.tau_h?.[Math.floor(rung) - 1];
  return typeof tau === 'number' && tau > 0 ? 60 * tau : cap;
}

/** tau(L) minutes (content levels.tau): min(cap, first × growth^(L−1)); the cap by rung (levelCapMin; rung 1 when not given: the first yard's). */
export function levelTau(c: SalvageContent, L: number, rung = 1): number {
  const t = c.levels.tau;
  return Math.min(levelCapMin(c, rung), t.first * t.growth ** Math.max(0, L - 1));
}

/** Metres between two map points: `map.routes["a-b"]` (either order) if listed, else detour × the straight distance (2.12). */
export function route(c: SalvageContent, a: string, b: string): number {
  const r = c.map.routes[`${a}-${b}`] ?? c.map.routes[`${b}-${a}`];
  if (r !== undefined) return r;
  const p = pointOf(c, a);
  const q = pointOf(c, b);
  return c.map.detour * Math.hypot(p.x - q.x, p.y - q.y);
}

/** A partner's regular skip mass, kg (its content mix of whole things). */
export function skipMassKg(c: SalvageContent, partner: PartnerId): number {
  const p = c.partners[partner];
  if (!p) return 0;
  return Object.entries(p.skip).reduce((a, [o, n]) => a + ((c.objects[o]?.gross_g ?? 0) * n) / 1000, 0);
}

/** The best tool's power P, kg/s. */
function toolP(c: SalvageContent, tier: number): number {
  return Math.max(0, ...Object.values(c.tools).filter((t) => t.tier <= tier).map((t) => t.P));
}

// The rated model of the prototype (proto/yard4.py level_adds, E13a): machines and the driver are rated
// at a quarter duty (cable, motors and loads are a share of the supply), a cutter's kilograms at a mean
// hardness of 1.2. These are the model's shares, not tuned numbers.
const DUTY = 0.25;
const MEAN_H = 1.2;

/** The level's current value: a crew member's, a machine's, a partner's (skips in rotation). */
function levelNow(g: SalvageGame, target: LevelTarget): number | null {
  const s = g.salvage;
  if (target.kind === 'crew') return s.crew.find((m) => m.id === target.id)?.level ?? null;
  if (target.kind === 'machine') return s.machines[target.machine]?.owned ? s.machines[target.machine].level : null;
  // Stage 2 (s2a-fix widened LevelTarget): a plate's level and the Yard sale's room.
  if (target.kind === 'plate') return s.works[target.plate] ? Math.max(1, s.works[target.plate].level || 1) : null;
  if (target.kind === 'reuse') return s.reuse.level;
  const p = s.partners[target.partner];
  return p?.open ? p.level : null;
}

/** The rated kilograms a minute one more level of the target adds at full feed (E13a: rated, never measured at a moment). */
export function levelAddsKgMin(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const L = levelNow(g, target) ?? 1;
  if (target.kind === 'partner') {
    const p = c.partners[target.partner];
    return p ? (60 * skipMassKg(c, target.partner)) / p.fill_s : 0;
  }
  if (target.kind === 'machine') {
    const m = target.machine;
    if (m === 'crucible') return (60 / c.machines.crucible.s_per_kg) * c.machines.crucible.lev * DUTY;
    if (m === 'stripper' || m === 'bench') return 60 * c.machines[m].rate * c.machines[m].lev * DUTY;
    return 0;
  }
  if (target.kind === 'plate' || target.kind === 'reuse') return 0; // priced by plateLevelPrice (rules-works, Phase B), not by kilograms here
  const member = g.salvage.crew.find((x) => x.id === target.id);
  if (!member) return 0;
  if (member.role === 'hand') {
    const h = c.crew.hand;
    const v = h.v * (1 + h.lev * (L - 1));
    const T = (2 * route(c, 'floor', 'scale')) / v + h.handle_s;
    return ((60 * h.load) / T) * (h.lev / (1 + h.lev * (L - 1)));
  }
  if (member.role === 'cutter') {
    const k = c.crew.cutter;
    const P = toolP(c, g.salvage.tier);
    const a = P * Math.min(k.cap, k.share * (1 + k.lev * L)) - P * Math.min(k.cap, k.share * (1 + k.lev * (L - 1)));
    return (60 * Math.max(0, a)) / MEAN_H;
  }
  const d = c.crew.driver;
  const F = driverRoundF(c, L);
  const v = c.truck.v * c.truck.driverFactor * F;
  let tot = 0;
  for (const [pid, p] of Object.entries(c.partners)) {
    if (!g.salvage.partners[pid]?.open) continue;
    // E31a: the whole round shortens by the level's factor (the handling too).
    const run = (2 * (c.map.lane[p.lane] ?? 0)) / v + c.truck.handle_s / F;
    tot += skipMassKg(c, pid) / Math.max(p.fill_s, run);
  }
  return 60 * tot * (d.lev / (1 + d.lev * (L - 1))) * DUTY;
}

/** The margin § a kg of the target's work (content levels.margin_per_kg: stripper, bench, crucible; yard for crew and partners). */
function marginOf(c: SalvageContent, target: LevelTarget): number {
  const m = c.levels.margin_per_kg;
  if (target.kind === 'machine') return m[target.machine] ?? m.yard ?? 0;
  return m.yard ?? 0;
}

/** The highest level of a target (content levels.maxLevel, crew roles' maxlev). */
export function maxLevelOf(c: SalvageContent, g: SalvageGame, target: LevelTarget): number {
  if (target.kind === 'plate') {
    const cm = contentAt(c, g.salvage);
    const d = cm.works?.plates[target.plate];
    return d ? Math.min(d.maxLevel, cm.works?.maxLevel ?? d.maxLevel) : 1;
  }
  if (target.kind === 'crew') {
    const role = g.salvage.crew.find((m) => m.id === target.id)?.role;
    return Math.min(c.levels.maxLevel, role ? c.crew[role].maxlev : c.levels.maxLevel);
  }
  return c.levels.maxLevel;
}

/** levels.floor and levels.floorGrowth (content4 R21; the schema keeps them once the contract adds them). */
function levelFloor(c: SalvageContent): { floor: number; growth: number } {
  const l = c.levels as { floor?: number; floorGrowth?: number };
  return { floor: l.floor ?? 0, growth: l.floorGrowth ?? 1 };
}

/** A price as the prototype rounds it: to §10 below §1,000, to §100 from it; never under §50. */
function roundPrice(v: number): number {
  const r = v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100;
  return Math.max(50, r);
}

/**
 * The price of the next level (E13a): max(tau(L) × the rated kg a minute it adds × the margin a kg,
 * floor × floorGrowth^(L−1)), L the level now; null when the target is unknown, not owned, not open,
 * or at its top level. FROM THE WORKS' OPENING (s2e-levels; yard-stage2-economy.md 2.6.4, 2.11; RULING2.md 27.2 c,
 * 27.3 D5): the works' rule (`levelQuote`): roundPrice(max(levels.floor × floorGrowth^(L−1), tau_r × levelGain)), and
 * null while the level is not sold ("Not the limit now": never sold at the floor).
 */
export function levelPrice(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number | null {
  // Stage 2: a works plate's level has its own rule (plateLevelPrice, the one function rules-works reads).
  if (target.kind === 'plate') return plateLevelPrice(cfg, g, target.plate);
  if (worksOpened(g.salvage)) {
    const q = levelQuote(cfg, g, target);
    return q && q.sold ? q.price : null;
  }
  return firstYardLevelPrice(cfg, g, target);
}

/**
 * THE FIRST YARD'S LEVEL PRICE (E13a, as on the owner's phone; pinned): max(tau(L) × the rated kg a minute the level
 * adds × the margin a kg, floor × floorGrowth^(L−1)); null when the target is unknown, not owned, not open, or at its
 * top. Below the works' opening it is levelPrice; above it, it is only printed (the lead's comparison of D5).
 */
export function firstYardLevelPrice(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number | null {
  if (target.kind === 'plate') return plateLevelPrice(cfg, g, target.plate);
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const L = levelNow(g, target);
  if (L === null || L < 1 || L >= maxLevelOf(c, g, target)) return null;
  const { floor, growth } = levelFloor(c);
  const v = Math.max(levelTau(c, L, g.salvage.ladder.rung) * levelAddsKgMin(cfg, g, target) * marginOf(c, target), floor * growth ** (L - 1));
  return roundPrice(v);
}

/** tau_r, hours (yard-stage2-economy.md 2.11; content `tau_h` at the yard's rung: 12 / 36 / 48), or null where the rung has none. */
export function worksTauH(c: SalvageContent, rung: number): number | null {
  const tau = c.tau_h?.[Math.floor(rung) - 1];
  return typeof tau === 'number' && tau > 0 ? tau : null;
}

/**
 * A LEVEL AS THE WORKS PRICE IT (s2e-levels; yard-stage2-economy.md 2.6.4 and 2.11; RULING2.md 27.2 a and c, 27.3 D5,
 * 27.4), from the works' opening, for every level but a plate's (crew, first-yard machines, open partners, the driver):
 * - gain = rate.ts `levelGain` (THE ONE MEASURE: the gain book where `levels.book` has the ladder, else the calculated
 *   gain: the replay with the level one step up less now), § an hour on the player's own yard;
 * - I = rated income now (rate.ts ratedIncome on the state's content), unless the caller passes it (the headroom's walk);
 * - SOLD only while gain ≥ `levels.minShareI` × I and gain > 0 (absent minShareI: any gain above 0); otherwise "Not the
 *   limit now" and NEVER sold at the floor;
 * - price = roundPrice(max(levels.floor × floorGrowth^(L−1), tau_r × gain)), tau_r = `tau_h` at the yard's rung (a rung
 *   without one: levels.tau.cap minutes);
 * - payback_h = price ÷ gain: what the card prints ("pays for itself in about N hours of the yard's running").
 * A price comes from what the level earns, never from the cash. Null below the works' opening (the first yard's rule,
 * firstYardLevelPrice), for a plate's level, and where the target has no next level (not owned, not open, at its top).
 */
export interface LevelQuote {
  /** The level now (the step bought takes it to L + 1). */
  L: number;
  /** § an hour the step adds (levelGain), exactly what the card prints and what the price is made of. */
  gain: number;
  /** Rated income now, § an hour (the 1 % test's I). */
  I: number;
  /** tau_r, hours. */
  tauH: number;
  /** levels.floor × floorGrowth^(L−1), §. */
  floor: number;
  /** The price charged when sold (also when not sold: what it would cost; never charged then). */
  price: number;
  /** price ÷ gain, hours (Infinity at a zero gain). */
  paybackH: number;
  /** Sold now: gain ≥ minShareI × I and gain > 0. */
  sold: boolean;
  /** The floor, not tau_r × gain, set the price. */
  floorBound: boolean;
}

export function levelQuote(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, Inow?: number): LevelQuote | null {
  if (target.kind === 'plate' || !worksOpened(g.salvage)) return null;
  const c = contentAt(cfg.salvage, g.salvage);
  const L = levelNow(g, target);
  if (L === null || L < 1 || L >= maxLevelOf(c, g, target)) return null;
  const { floor: f0, growth } = levelFloor(c);
  const floor = f0 * growth ** (L - 1);
  const tauH = worksTauH(c, g.salvage.ladder.rung) ?? c.levels.tau.cap / 60;
  const gain = levelGain(c, g.salvage, target);
  const I = Inow ?? Math.max(0, ratedIncome(c, g.salvage));
  const share = (c.levels as { minShareI?: number }).minShareI ?? 0;
  const sold = gain > 1e-6 && gain >= share * I - 1e-9;
  const price = roundPrice(Math.max(floor, tauH * gain));
  return { L, gain, I, tauH, floor, price, paybackH: gain > 1e-6 ? price / gain : Infinity, sold, floorBound: floor >= tauH * gain };
}

/** s2e-levels: the refusal of a level that is not worth having now ("Not the limit now", with its gain); refusals.ts lists it (s2e-join). */
export const NOT_LIMIT: RefusalKey = 'notLimit';

/** tau(L) minutes of a level priced from its rated gain (a plate's, 2.6.4; a partner's from the works' opening): min(60 x tau_r, levels.tau.first x growth^(L-1)); a rung without a tau: levels.tau.cap. */
function plateTauMin(c: SalvageContent, L: number, rung: number): number {
  const t = c.levels.tau;
  const tauR = c.tau_h?.[Math.floor(rung) - 1];
  const cap = typeof tauR === 'number' && tauR > 0 ? 60 * tauR : t.cap;
  return Math.min(cap, t.first * t.growth ** (L - 1));
}

/**
 * The level check (2.15): notOwned, the levels' gate (E25: levels open at rung 2), topLevel, earmark or cash, ceiling.
 * FROM THE WORKS' OPENING (s2e-levels), after topLevel: `notLimit` (state 'locked', no price, no Buy) while the level is not
 * worth having (levelQuote), then the ceiling and the money (the ceiling first: moneyAndCeiling), at levelQuote's price.
 */
export function levelCheck(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): PurchaseCheck {
  return levelCheckAt(cfg, g, target);
}

/** levelCheck with I given (the headroom's walk up a ladder reads I once, at the state it starts from). */
export function levelCheckAt(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, Inow?: number): PurchaseCheck {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const L = levelNow(g, target);
  if (L === null || L < 1 || (target.kind === 'plate' && g.salvage.works[target.plate]?.phase !== 'running')) return { price: null, refusal: { key: 'notOwned', args: {} }, state: 'locked' };
  const gate = gateRefusal(c, g, c.levels.opens);
  if (gate) return { price: null, refusal: gate, state: 'locked' };
  if (L >= maxLevelOf(c, g, target)) return { price: null, refusal: { key: 'topLevel', args: {} }, state: 'top' };
  if (target.kind !== 'plate' && worksOpened(g.salvage)) {
    const q = levelQuote(cfg, g, target, Inow)!;
    if (!q.sold) return { price: null, refusal: { key: NOT_LIMIT, args: { x: { money: q.gain } } }, state: 'locked' };
    return moneyAndCeiling(cfg, g, q.price, levelled(g, target));
  }
  const price = levelPrice(cfg, g, target)!;
  return moneyAndCeiling(cfg, g, price, levelled(g, target));
}

/** The state with one more level of the target (for the ceiling's "R after", a partner's rated gain and the advice's). */
export function levelled(g: SalvageGame, target: LevelTarget): SalvageGame {
  const s = g.salvage;
  if (target.kind === 'crew') return { ...g, salvage: { ...s, crew: s.crew.map((m) => (m.id === target.id ? { ...m, level: m.level + 1 } : m)) } };
  if (target.kind === 'machine') {
    const id: MachineId = target.machine;
    return { ...g, salvage: { ...s, machines: { ...s.machines, [id]: { ...s.machines[id], level: s.machines[id].level + 1 } } } };
  }
  if (target.kind === 'plate') {
    const w = s.works[target.plate];
    return w ? { ...g, salvage: { ...s, works: { ...s.works, [target.plate]: { ...w, level: w.level + 1 } } } } : g;
  }
  if (target.kind === 'reuse') return { ...g, salvage: { ...s, reuse: { ...s.reuse, level: s.reuse.level + 1 } } };
  const p = s.partners[target.partner];
  return { ...g, salvage: { ...s, partners: { ...s.partners, [target.partner]: { ...p, level: p.level + 1 } } } };
}

/**
 * A WORKS PLATE'S LEVEL PRICE (2.6.4, 2.11; s2a-fix, the lead's ruling 1 of 26 Nov 09:50): rules-money's one
 * function for rules-works. THE RULE AS BUILT: L the plate's level now; ΔI = rated income with the plate one
 * level up less rated income now (§ an hour, rate.ts ratedIncome on the state's content: what the level adds
 * at full feed, read from the assets); tau(L) = min(60 × tau_r, levels.tau.first × growth^(L−1)) minutes, tau_r
 * the rung's (`tau_h[rung − 1]`; a rung without a tau: levels.tau.cap); price = roundPrice(max(tau(L)/60 × ΔI,
 * levels.floor × floorGrowth^(L−1))). Null when the plate is not in `works`, not running, or at its top level
 * (the plate's `maxLevel`, at most `works.maxLevel`). While rate.ts counts no plate's terms (2.3.1 step 5,
 * rules-works' request to engine2), ΔI is 0 and every plate level costs the floor's price.
 */
export function plateLevelPrice(cfg: SalvageConfig, g: SalvageGame, plate: string): number | null {
  const c = contentAt(cfg.salvage, g.salvage);
  const s = g.salvage;
  const w = s.works[plate];
  const def = c.works?.plates[plate];
  if (!w || !def || w.phase !== 'running') return null;
  const L = Math.max(1, Math.floor(w.level || 1));
  const top = Math.min(def.maxLevel, c.works?.maxLevel ?? def.maxLevel);
  if (L >= top) return null;
  const up = { ...s, works: { ...s.works, [plate]: { ...w, level: L + 1 } } };
  // s2c-fix-money: the rated gain of the replay (ratedGain's measure, one replay a state), as a partner's level.
  const dI = Math.max(0, replayIncome(c, up) - replayIncome(c, s));
  const tauMin = plateTauMin(c, L, s.ladder.rung);
  const { floor, growth } = levelFloor(c);
  return roundPrice(Math.max((tauMin / 60) * dI, floor * growth ** (L - 1)));
}

/** A check's refusal as a printable line (refusal.<key> with its arguments), or null. */
export function refusalTxt(ch: Pick<PurchaseCheck, 'refusal'>): Txt | null {
  return ch.refusal ? { key: `refusal.${ch.refusal.key}` as TextKey, args: ch.refusal.args } : null;
}

// ============================================================================ rungs and range (2.11)

/** The nine rungs: content `ladder.rungs`, else 1 to 3 from rung2 and rung3. */
export function rungsOf(c: SalvageContent): { n: number; t: number; range: number }[] {
  if (c.ladder.rungs.length) return [...c.ladder.rungs].sort((a, b) => a.n - b.n);
  return [
    { n: 1, t: 0, range: 0 },
    { n: 2, t: c.ladder.rung2.t, range: c.ladder.rung2.range },
    { n: 3, t: c.ladder.rung3.t, range: c.ladder.rung3.range },
  ];
}

/** The materials of the stage (each grade's `material`, content order, once). */
export function materialsOf(c: SalvageContent): string[] {
  return Array.from(new Set(Object.values(c.grades).map((gr) => gr.material).filter((m): m is string => !!m)));
}

/**
 * §1,200 a tonne: 2.11's worth of a tonne in θ_r = max(ladder.theta, ladder.thetaShare × T_r × §1,200). The
 * specification names no content key for it; content `ladder.thetaPerT` is read when present (a request to
 * content2 in requests.md), else this value.
 */
export const THETA_PER_T = 1200;

/**
 * θ_r (2.11): the worth at p̄ a material's lifetime supplied products must reach to count toward rung r's
 * range. Rungs 1 to 3 (and any content without `ladder.thetaShare`): `ladder.theta`, as built; from rung 4
 * max(theta, thetaShare × T_r × §1,200), T_r rung r's tonnes.
 */
export function thetaOf(c: SalvageContent, rung: number): number {
  const L = c.ladder as SalvageContent['ladder'] & { thetaPerT?: number };
  if (rung <= FIRST_YARD_TOP_RUNG || !L.thetaShare) return L.theta;
  const r = rungsOf(c).find((x) => x.n === rung);
  return Math.max(L.theta, L.thetaShare * (r?.t ?? 0) * (L.thetaPerT ?? THETA_PER_T));
}

/** The rung whose range a yard at rung `rung` works toward (the next one, at most the stage's top). */
function towardRung(c: SalvageContent, rung: number | undefined): number {
  return Math.min(topRungOf(c), Math.max(1, Math.floor(rung ?? 0)) + 1);
}

/** Range (2.11): materials whose lifetime supplied products are worth at least θ of the rung worked toward (rung + 1; `ladder.theta` up to rung 3). */
export function rangeCount(c: SalvageContent, worth: Record<string, number>, rung?: number): number {
  const th = thetaOf(c, towardRung(c, rung));
  return materialsOf(c).filter((m) => (worth[m] ?? 0) >= th).length;
}

/** The range chips of the table: each material, counted or not (against θ of the rung worked toward). */
export function rangeChips(c: SalvageContent, worth: Record<string, number>, rung?: number): { material: string; counted: boolean; worth: number }[] {
  const th = thetaOf(c, towardRung(c, rung));
  return materialsOf(c).map((m) => ({ material: m, counted: (worth[m] ?? 0) >= th, worth: worth[m] ?? 0 }));
}

/** The first yard stops at rung 3 (kept for its readers; the stage's top is content: topRungOf). */
export const STAGE_TOP_RUNG = 3;

/** The stage's top rung (2.11, B18): content `ladder.topRung`, else the first yard's 3. Rungs above it show a padlock and their tonnage only. */
export function topRungOf(c: SalvageContent): number {
  return c.ladder.topRung ?? STAGE_TOP_RUNG;
}

/** The rung a supplied mass and range reach: the highest n ≤ the stage's top with tonnes and its own range (θ_n) both met (never below the state's own rung: rungs are not lost). */
export function rungReached(cfg: SalvageConfig, g: SalvageGame): number {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const s = g.salvage.ladder;
  // RULING2.md 14.4: the away pass checks the rung at every changed instant, so the content's lists are
  // read once per content object (rungsOf sorts, materialsOf builds a set).
  let k = ladderMemo.get(c);
  if (!k) {
    const top = topRungOf(c);
    k = { rungs: rungsOf(c).filter((x) => x.n <= top).map((x) => ({ n: x.n, g: Math.round(x.t * 1e6), range: x.range, theta: thetaOf(c, x.n) })), materials: materialsOf(c) };
    ladderMemo.set(c, k);
  }
  let r = 1;
  // The range is counted once per θ met (rungs 1 to 3 share ladder.theta: one count, as built).
  let th = NaN;
  let range = -1;
  for (const x of k.rungs) {
    if (x.n <= r || s.supplied_g < x.g) continue;
    if (x.theta !== th) {
      th = x.theta;
      range = k.materials.filter((m) => (s.worth[m] ?? 0) >= th).length;
    }
    if (range >= x.range) r = x.n;
  }
  return Math.max(s.rung, r);
}

const ladderMemo = new WeakMap<SalvageContent, { rungs: { n: number; g: number; range: number; theta: number }[]; materials: string[] }>();

/** The rung sign (the rung card): the crane's "{homeYard} · {t} supplied", what the rung opens, the next rung's gate. */
export function rungSign(c: SalvageContent, n: number): { n: number; t_g: number; range: number; sign: Txt; opens: Txt[]; next: Txt | null } {
  const rungs = rungsOf(c);
  const r = rungs.find((x) => x.n === n) ?? { n, t: 0, range: 0 };
  const nx = rungs.find((x) => x.n === n + 1);
  const opens: Txt[] = [];
  if (n === 2) opens.push({ key: 'opens.rung2' });
  if (n === 3) opens.push({ key: 'opens.rung3', args: { c: { n: c.ceilings_t_h[2] ?? 0 } } });
  // Stage 2 (2.11, 1.4; only where the content holds the works): what rungs 3 to 5 open.
  if (c.works && n <= topRungOf(c)) {
    if (n === 3) opens.push({ key: 'opens.works' }, { key: 'opens.backfield' }, { key: 'opens.yardSale' });
    if (n === 4) opens.push({ key: 'opens.shredder' }, { key: 'opens.halls' }, { key: 'opens.lead' });
    if (n === 5) opens.push({ key: 'opens.levelsOn' });
  }
  return {
    n,
    t_g: Math.round(r.t * 1e6),
    range: r.range,
    sign: { key: 'table.rungSign', args: { homeYard: { name: 'homeYard' }, t: { tonnes_g: Math.round(r.t * 1e6) } } },
    opens,
    next: nx ? { key: 'table.locked', args: { t: { tonnes_g: Math.round(nx.t * 1e6) }, r: { n: nx.range } } } : null,
  };
}

// ============================================================================ the table's rung box and tiles (fix pass: P17, S10)

/** The rung box (P17): the player's OWN tonnes and materials, and the next rung's condition on its own line. */
export interface RungProgress {
  supplied_g: number;
  materials: number;
  rung: number;
  /** "{t} supplied · {r} materials" with the player's own figures. */
  own: Txt;
  /** The next rung's condition ("Opens at {t} supplied · {r} materials"), or null past this stage's last rung. */
  next: Txt | null;
}

export function rungProgress(cfg: SalvageConfig, g: SalvageGame): RungProgress {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const s = g.salvage.ladder;
  const materials = rangeCount(c, s.worth, s.rung);
  const nx = rungsOf(c).find((r) => r.n === s.rung + 1 && r.n <= topRungOf(c));
  return {
    supplied_g: s.supplied_g,
    materials,
    rung: s.rung,
    own: { key: 'table.rung', args: { t: { tonnes_g: s.supplied_g }, r: { n: materials } } },
    next: nx ? { key: 'table.locked', args: { t: { tonnes_g: Math.round(nx.t * 1e6) }, r: { n: nx.range } } } : null,
  };
}

/** One rung tile of the table (S10): a tile past this stage's last rung has NO line (a bare padlock and its tonnage). */
export interface RungTile {
  n: number;
  t_g: number;
  range: number;
  current: boolean;
  open: boolean;
  /** False past the stage's top rung (topRungOf): nothing opens there in this stage. */
  inStage: boolean;
  /** "Opens at {t} supplied · {r} materials" on a locked tile of this stage; null on an open tile or past the stage. */
  line: Txt | null;
}

export function rungTiles(cfg: SalvageConfig, g: SalvageGame): RungTile[] {
  // join2b: the content the state reads (layer.ts contentAt): the works layer's items, grades and materials once the works opened (the base content itself before).
  const c = contentAt(cfg.salvage, g.salvage);
  const rung = g.salvage.ladder.rung;
  return rungsOf(c).map((r) => {
    const t_g = Math.round(r.t * 1e6);
    const open = r.n <= rung;
    const inStage = r.n <= topRungOf(c);
    return { n: r.n, t_g, range: r.range, current: r.n === rung, open, inStage, line: !open && inStage ? { key: 'table.locked', args: { t: { tonnes_g: t_g }, r: { n: r.range } } } : null };
  });
}

/**
 * s2e-join: ONE function for the advice line (advice.ts) and the headroom (shop.ts, which carried a copy `boughtFor`).
 * The state with a shop item owned, as rated income reads assets (rate.ts own(): the item in `owned`, a tool's tier, a
 * better carrier, a first-yard machine on its pad, the truck); a works plate running at level 1 (and, a hall, poured
 * once: what it earns once working). For the advice's rated gain only; nothing is applied.
 * s2e-fix1 (RULING2 28.5 b): A LINE IS ONE PURCHASE here too: the plates that come `with` it (the shredder line's depollution
 * bay; works.ts orderPlate orders and starts them together) run beside its first plate, so the line is counted with its cars.
 */
export function boughtState(c: SalvageContent, g: SalvageGame, item: string): SalvageGame {
  const s = g.salvage;
  const d = c.works?.plates[item];
  if (d) {
    const run = () => ({ phase: 'running', level: 1 }) as unknown as (typeof s.works)[string];
    const works = { ...s.works, [item]: run() };
    for (const q of d.with ?? []) if (c.works?.plates[q] && !s.works[q]) works[q] = run();
    return { ...g, salvage: { ...s, works, counts: { ...(s.counts ?? {}), [`poured:${item}`]: Math.max(1, s.counts?.[`poured:${item}`] ?? 0) } } };
  }
  const n = { ...s, owned: s.owned.includes(item) ? s.owned : [...s.owned, item] };
  const tool = c.tools[item];
  if (tool) n.tier = Math.max(s.tier, tool.tier);
  if (c.carriers[item] !== undefined && (c.carriers[item] ?? 0) > (c.carriers[s.carrier] ?? 0)) n.carrier = item;
  if (item === 'stripper' || item === 'bench' || item === 'crucible') n.machines = { ...s.machines, [item]: { ...s.machines[item], owned: true, level: Math.max(1, s.machines[item].level) } };
  if (item === 'truck') n.truck = { ...s.truck, owned: true };
  return { ...g, salvage: n };
}

/**
 * s2e-fix1 (RULING2 28.5 b, "one measure for machines too"): THE MEASURED GAIN a sold machine's, vehicle's or tool's price is
 * made of, § an hour: content `gain_h` on its works plate (a plate) or on its works-layer shop item (a vehicle, a tool), which
 * build-yard.py writes from bots/plates.json `dE` beside the price (price = max(works.floor, tau_r x gain_h) to its rounding).
 * `c` is the content the state reads (layer.ts contentAt: the works layer's items joined). Null where the content names none
 * (a level, a hire, a first-yard item, a content written before this pass): the reader then keeps the replay's gain.
 */
export function measuredGain(c: SalvageContent, item: string): number | null {
  const p = c.works?.plates[item];
  if (p) return typeof p.gain_h === 'number' && Number.isFinite(p.gain_h) ? p.gain_h : null;
  const it = shopItems(c).find((i) => i.key === item);
  return it && it.kind !== 'works' && typeof it.gain_h === 'number' && Number.isFinite(it.gain_h) ? it.gain_h : null;
}

/**
 * s2e-fix1: the gain the advice line and the headroom read for buying `item` now (from the works' opening): its measured gain
 * where the content holds one (28.5 b), else the replay's calculated gain of the bought state (ratedGain of boughtState).
 */
export function buyGain(cfg: SalvageConfig, g: SalvageGame, item: string): number {
  const c = contentAt(cfg.salvage, g.salvage);
  return measuredGain(c, item) ?? ratedGain(cfg, g, boughtState(c, g, item));
}
