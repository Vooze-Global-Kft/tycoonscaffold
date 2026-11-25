/**
 * Rungs, range, ceilings and the prices of purchases (yard-stage1.md 2.11, 2.15, E2, E13a, E25, S16).
 * READS state only (owner: rules-book). ONE CHECK PER PURCHASE: `buyCheck`, `hireCheck`, `levelCheck`
 * return the price and the first refusal in the order types.ts SalvageActions lists, and the row state
 * a card draws. The cards print that object and the rules-sim's actions apply it, so the price and the
 * refusal a card shows are the ones the action applies (shown equals applied); the action adds only
 * `priceUpdated` (shown ≠ the check's price) and the change itself.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { roundMoney } from './money';
import { pointOf } from './positions';
import { ratedCapacity } from './rate';
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

/** The ceiling's refusal when R after a purchase (`after`) would pass the rung's ceiling (5.4 "Yard capacity {c} t/h · grows at {t} supplied"). */
function ceilingRefusal(cfg: SalvageConfig, g: SalvageGame, after: SalvageGame): { key: RefusalKey; args: TxtArgs } | null {
  const cap = ceilingFor(cfg, g);
  if (!Number.isFinite(cap)) return null;
  const now = ratedCapacity(cfg, g);
  const next = ratedCapacity(cfg, after);
  if (next <= cap + 1e-9 || next <= now + 1e-9) return null;
  return { key: 'ceiling', args: { c: { n: cap }, t: { tonnes_g: rungGrams(cfg.salvage, g.salvage.ladder.rung + 1) } } };
}

/** The price a card shows for a shop item now, or null when it is not for sale (owned, on its way, gated, unknown). */
export function shopPrice(cfg: SalvageConfig, g: SalvageGame, item: ShopKey): number | null {
  const it = shopItem(cfg.salvage, item);
  if (!it || owns(cfg.salvage, g, item) || arriving(g, item)) return null;
  if (!gateMet(cfg.salvage, g, it.gate)) return null;
  return roundMoney(it.price);
}

/** The buy check (2.15): owned (owned or arriving), the gate, earmark or cash, ceiling. */
export function buyCheck(cfg: SalvageConfig, g: SalvageGame, item: ShopKey): PurchaseCheck {
  const c = cfg.salvage;
  const it = shopItem(c, item);
  if (!it) return { price: null, refusal: { key: 'nothing', args: {} }, state: 'info' };
  if (owns(c, g, item)) return { price: null, refusal: { key: 'owned', args: {} }, state: 'owned' };
  if (arriving(g, item)) return { price: null, refusal: { key: 'owned', args: {} }, state: 'arriving' };
  const gate = gateRefusal(c, g, it.gate);
  if (gate) return { price: null, refusal: gate, state: 'locked' };
  const price = roundMoney(it.price);
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford' };
  const after = { ...g, salvage: { ...g.salvage, owned: [...g.salvage.owned, item] } };
  const ceil = ceilingRefusal(cfg, g, after);
  if (ceil) return { price, refusal: ceil, state: 'cantAfford' };
  return { price, refusal: null, state: 'buy' };
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
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford', key };
  const slot = g.salvage.crew.filter((m) => m.role === role).length;
  const member = { id: `${role}.${slot}`, role, slot, name: 0, level: 1, job: 'idle' as const, phase: 'wait' as const, from: { place: 'office' }, to: { place: 'office' }, t0: g.salvage.t, t1: g.salvage.t, carries: null, load: [], claims: [], cut: null };
  const after = { ...g, salvage: { ...g.salvage, crew: [...g.salvage.crew, member] } };
  const ceil = ceilingRefusal(cfg, g, after);
  if (ceil) return { price, refusal: ceil, state: 'cantAfford', key };
  return { price, refusal: null, state: 'buy', key };
}

// ============================================================================ levels (E13a, E25)

/** tau(L) minutes (content levels.tau): min(cap, first × growth^(L−1)). */
export function levelTau(c: SalvageContent, L: number): number {
  const t = c.levels.tau;
  return Math.min(t.cap, t.first * t.growth ** Math.max(0, L - 1));
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
  const p = s.partners[target.partner];
  return p?.open ? p.level : null;
}

/** The rated kilograms a minute one more level of the target adds at full feed (E13a: rated, never measured at a moment). */
export function levelAddsKgMin(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number {
  const c = cfg.salvage;
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
  const v = c.truck.v * c.truck.driverFactor * (1 + d.lev * (L - 1));
  let tot = 0;
  for (const [pid, p] of Object.entries(c.partners)) {
    if (!g.salvage.partners[pid]?.open) continue;
    const run = (2 * (c.map.lane[p.lane] ?? 0)) / v + c.truck.handle_s;
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
 * or at its top level.
 */
export function levelPrice(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): number | null {
  const c = cfg.salvage;
  const L = levelNow(g, target);
  if (L === null || L < 1 || L >= maxLevelOf(c, g, target)) return null;
  const { floor, growth } = levelFloor(c);
  const v = Math.max(levelTau(c, L) * levelAddsKgMin(cfg, g, target) * marginOf(c, target), floor * growth ** (L - 1));
  return roundPrice(v);
}

/** The level check (2.15): notOwned, the levels' gate (E25: levels open at rung 2), topLevel, earmark or cash, ceiling. */
export function levelCheck(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): PurchaseCheck {
  const c = cfg.salvage;
  const L = levelNow(g, target);
  if (L === null || L < 1) return { price: null, refusal: { key: 'notOwned', args: {} }, state: 'locked' };
  const gate = gateRefusal(c, g, c.levels.opens);
  if (gate) return { price: null, refusal: gate, state: 'locked' };
  if (L >= maxLevelOf(c, g, target)) return { price: null, refusal: { key: 'topLevel', args: {} }, state: 'top' };
  const price = levelPrice(cfg, g, target)!;
  const money = cashRefusal(g, price);
  if (money) return { price, refusal: money, state: 'cantAfford' };
  const ceil = ceilingRefusal(cfg, g, levelled(g, target));
  if (ceil) return { price, refusal: ceil, state: 'cantAfford' };
  return { price, refusal: null, state: 'buy' };
}

/** The state with one more level of the target (for the ceiling's "R after"). */
function levelled(g: SalvageGame, target: LevelTarget): SalvageGame {
  const s = g.salvage;
  if (target.kind === 'crew') return { ...g, salvage: { ...s, crew: s.crew.map((m) => (m.id === target.id ? { ...m, level: m.level + 1 } : m)) } };
  if (target.kind === 'machine') {
    const id: MachineId = target.machine;
    return { ...g, salvage: { ...s, machines: { ...s.machines, [id]: { ...s.machines[id], level: s.machines[id].level + 1 } } } };
  }
  const p = s.partners[target.partner];
  return { ...g, salvage: { ...s, partners: { ...s.partners, [target.partner]: { ...p, level: p.level + 1 } } } };
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

/** Range (2.11): materials whose lifetime supplied products are worth at least ladder.theta at p̄. */
export function rangeCount(c: SalvageContent, worth: Record<string, number>): number {
  return materialsOf(c).filter((m) => (worth[m] ?? 0) >= c.ladder.theta).length;
}

/** The range chips of the table: each material, counted or not. */
export function rangeChips(c: SalvageContent, worth: Record<string, number>): { material: string; counted: boolean; worth: number }[] {
  return materialsOf(c).map((m) => ({ material: m, counted: (worth[m] ?? 0) >= c.ladder.theta, worth: worth[m] ?? 0 }));
}

/** Stage 1 stops at rung 3 (rungs 4 to 9 show on the table with their gates and a padlock, 2.11). */
export const STAGE_TOP_RUNG = 3;

/** The rung a supplied mass and range reach: the highest n ≤ 3 with tonnes and range both met (never below the state's own rung: rungs are not lost). */
export function rungReached(cfg: SalvageConfig, g: SalvageGame): number {
  const c = cfg.salvage;
  const s = g.salvage.ladder;
  const range = rangeCount(c, s.worth);
  let r = 1;
  for (const x of rungsOf(c)) if (x.n <= STAGE_TOP_RUNG && s.supplied_g >= Math.round(x.t * 1e6) && range >= x.range) r = Math.max(r, x.n);
  return Math.max(s.rung, r);
}

/** The rung sign (the rung card): the crane's "{homeYard} · {t} supplied", what the rung opens, the next rung's gate. */
export function rungSign(c: SalvageContent, n: number): { n: number; t_g: number; range: number; sign: Txt; opens: Txt[]; next: Txt | null } {
  const rungs = rungsOf(c);
  const r = rungs.find((x) => x.n === n) ?? { n, t: 0, range: 0 };
  const nx = rungs.find((x) => x.n === n + 1);
  const opens: Txt[] = [];
  if (n === 2) opens.push({ key: 'opens.rung2' });
  if (n === 3) opens.push({ key: 'opens.rung3', args: { c: { n: c.ceilings_t_h[2] ?? 0 } } });
  return {
    n,
    t_g: Math.round(r.t * 1e6),
    range: r.range,
    sign: { key: 'table.rungSign', args: { homeYard: { name: 'homeYard' }, t: { tonnes_g: Math.round(r.t * 1e6) } } },
    opens,
    next: nx ? { key: 'table.locked', args: { t: { tonnes_g: Math.round(nx.t * 1e6) }, r: { n: nx.range } } } : null,
  };
}
