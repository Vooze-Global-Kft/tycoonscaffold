/**
 * The advice line, the bottleneck and E19's reserve (yard-stage1.md 2.10, 2.12; ECONOMY E2, E13c,
 * E19, E22, E29). READS state only (owner: rules-book).
 *
 * USEFUL (E2): a purchase is useful when it widens the bottleneck now. The hour's shop items are in the
 * goal order because each changes something (E22), so each is useful while not owned; a day-1 item is
 * useful when what it adds binds (the second hand while carrying binds, the second cutter while cutting
 * binds, the aluminium recipe while cast aluminium waits, the Night watch after the first time away); a
 * level is useful only when its target binds (E19: the advice line never names "not the bottleneck now").
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { buyCheck, crewKeys, hireCheck, itemName, levelCheck, roleOfKey, shopItems } from './ladder';
import { roundMoney } from './money';
import { incomeRate } from './tick';
import type { Advice, CardRef, CrewRole, LevelTarget, MachineId, SalvageConfig, SalvageGame, ShopItem, TextKey, Txt } from './types';

// ============================================================================ the bottleneck (E13c)

/** What binds now, read from the yard's own stocks (the prototype's binding(), proto/yard4.py; content levels.advice says it). */
export interface Binding {
  cutter: boolean;
  hand: boolean;
  machines: MachineId[];
  /** Supply binds (no crew or machine does): skips in rotation at the open partners, and the driver while he is out. */
  partners: string[];
  driver: boolean;
}

/** Floor mass of whole things and loose pieces, grams. */
function floorGrams(c: SalvageContent, g: SalvageGame): number {
  const s = g.salvage;
  const things = s.things.filter((t) => t.at.at === 'floor').reduce((a, t) => a + thingLeft(c, t.obj, t.cut), 0);
  return things + s.pieces.filter((p) => p.pile === 'floor').reduce((a, p) => a + p.g, 0);
}

/** Grams still on a thing after `cut` pieces are off (its remaining pieces and its waste). */
export function thingLeft(c: SalvageContent, obj: string, cut: number): number {
  const o = c.objects[obj];
  if (!o) return 0;
  let k = cut;
  let left = o.waste_g;
  for (const [, gr, n] of o.pieces) {
    const off = Math.min(n, k);
    k -= off;
    left += gr * (n - off);
  }
  return left;
}

// The prototype's thresholds as shares of content (proto/yard4.py binding(): floor 1,500 of 4,000 kg,
// loose pieces 200 kg against an 80 kg load, a hopper at 80 %, the crucible's grade above one pot).
const FLOOR_SHARE = 0.375;
const LOOSE_LOADS = 2.5;
const HOPPER_SHARE = 0.8;

export function binding(cfg: SalvageConfig, g: SalvageGame): Binding {
  const c = cfg.salvage;
  const s = g.salvage;
  const hasCutter = s.crew.some((m) => m.role === 'cutter');
  const hasHand = s.crew.some((m) => m.role === 'hand');
  const loose = s.pieces.filter((p) => p.pile !== 'floor' && !p.pile.startsWith('zone.')).reduce((a, p) => a + p.g, 0);
  const cutter = hasCutter && floorGrams(c, g) > FLOOR_SHARE * c.floorRoom_kg * 1000;
  const hand = hasHand && loose > LOOSE_LOADS * c.crew.hand.load * 1000;
  const machines: MachineId[] = [];
  for (const id of ['stripper', 'bench'] as const) {
    const m = s.machines[id];
    const inbuf = c.machines[id].inbuf * 1000;
    if (m.owned && m.hopper.reduce((a, p) => a + p.g, 0) > HOPPER_SHARE * inbuf) machines.push(id);
  }
  const cr = s.machines.crucible;
  if (cr.owned) {
    const r = c.machines.crucible.recipes[cr.recipe];
    const ins = r ? (Array.isArray(r[0]) ? r[0] : [r[0]]) : [];
    const pot = c.machines.crucible.pot * 1000 * (1 + c.machines.crucible.lev * Math.max(0, cr.level - 1));
    const stock = ins.reduce((a, gr) => a + (s.bays[gr]?.g ?? 0), 0);
    if (stock > pot) machines.push('crucible');
  }
  const crewBinds = cutter || hand || machines.length > 0;
  const partners = crewBinds ? [] : Object.entries(s.partners).filter(([, p]) => p.open).map(([id]) => id);
  const driver = !crewBinds && s.crew.some((m) => m.role === 'driver') && s.truck.trip !== null;
  return { cutter, hand, machines, partners, driver };
}

/** Does a level of this target widen the bottleneck now (E13c, E19)? */
export function levelBinds(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, b = binding(cfg, g)): boolean {
  if (target.kind === 'machine') return b.machines.includes(target.machine);
  if (target.kind === 'partner') return b.partners.includes(target.partner);
  const role = g.salvage.crew.find((m) => m.id === target.id)?.role;
  return role === 'cutter' ? b.cutter : role === 'hand' ? b.hand : role === 'driver' ? b.driver : false;
}

// ============================================================================ E19's reserve (E29)

/**
 * The reserve (E19, E29): the price of the load the driver will fetch next, when one is full now or
 * within advice.reserveS (the skip full longest first, then the one that fills first), the driver hired
 * and the truck owned; 0 otherwise. A load already earmarked for a trip is not counted twice. It
 * refuses nothing: the advice line and the bots never spend below it; the rota prints it.
 */
export function reserve(cfg: SalvageConfig, g: SalvageGame): number {
  const s = g.salvage;
  if (!s.truck.owned || !s.crew.some((m) => m.role === 'driver')) return 0;
  const horizon = s.t + cfg.salvage.advice.reserveS;
  const onTrip = s.truck.trip ? `${s.truck.trip.partner}.${s.truck.trip.slot}` : null;
  const cands: { at: number; price: number }[] = [];
  for (const [pid, p] of Object.entries(s.partners)) {
    if (!p.open) continue;
    for (const sk of p.skips) {
      if (`${pid}.${sk.slot}` === onTrip) continue;
      const at = sk.phase === 'full' ? Math.min(sk.fullAt, s.t) : sk.fullAt;
      if (at <= horizon + 1e-6) cands.push({ at, price: sk.price });
    }
  }
  cands.sort((a, b) => a.at - b.at);
  return roundMoney(cands[0]?.price ?? 0);
}

// ============================================================================ the advice line (2.10)

/** The card that sells a shop item (the rack, the office's rota, a machine's card, the truck park). */
export function cardForItem(it: ShopItem): CardRef {
  if (it.kind === 'crew' || it.kind === 'office') return { kind: 'office', tab: 'rota' };
  if (it.kind === 'machine') return { kind: 'machine', machine: it.key as MachineId };
  if (it.kind === 'recipe') return { kind: 'machine', machine: 'crucible' };
  return { kind: 'place', place: it.place };
}

/** Is a day-1 item useful now (E22)? */
function dayOneUseful(cfg: SalvageConfig, g: SalvageGame, it: ShopItem, b: Binding): boolean {
  const s = g.salvage;
  const role = roleOfKey(it.key);
  if (role === 'hand') return b.hand || !s.crew.some((m) => m.role === 'hand');
  if (role === 'cutter') return b.cutter || !s.crew.some((m) => m.role === 'cutter');
  if (role === 'driver') return true;
  if (it.key === 'night') return s.beenAway;
  if (it.kind === 'recipe') {
    const r = cfg.salvage.machines.crucible.recipes[it.key];
    const ins = r ? (Array.isArray(r[0]) ? r[0] : [r[0]]) : [];
    return s.machines.crucible.owned && ins.some((gr) => (s.bays[gr]?.g ?? 0) > 0);
  }
  return true;
}

/** Every purchase the advice line may name now, with its card's action and price (owned, gated and top excluded). */
function candidates(cfg: SalvageConfig, g: SalvageGame): Advice[] {
  const c = cfg.salvage;
  const s = g.salvage;
  const b = binding(cfg, g);
  const out: Advice[] = [];
  const hourKeys = new Set(c.shop.map((i) => i.key));
  const seenRole = new Set<CrewRole>();
  for (const it of shopItems(c)) {
    const role = roleOfKey(it.key);
    if (role) {
      if (seenRole.has(role)) continue;
      const ch = hireCheck(cfg, g, role);
      if (ch.price === null || ch.state === 'locked' || !ch.key) continue;
      seenRole.add(role);
      const item = shopItems(c).find((x) => x.key === ch.key)!;
      if (!hourKeys.has(item.key) && !dayOneUseful(cfg, g, item, b)) continue;
      out.push({ action: { act: 'hire', role, price: ch.price }, open: cardForItem(item), price: ch.price, line: { key: 'advice.buy', args: { item: { text: itemName(item.key) }, x: { money: ch.price } } } });
      continue;
    }
    const ch = buyCheck(cfg, g, it.key);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'owned' || ch.state === 'arriving') continue;
    if (!hourKeys.has(it.key) && !dayOneUseful(cfg, g, it, b)) continue;
    out.push({ action: { act: 'buy', item: it.key, price: ch.price }, open: cardForItem(it), price: ch.price, line: { key: 'advice.buy', args: { item: { text: itemName(it.key) }, x: { money: ch.price } } } });
  }
  const targets: { t: LevelTarget; name: TextKey; open: CardRef; level: number }[] = [];
  for (const m of s.crew) targets.push({ t: { kind: 'crew', id: m.id }, name: `role.${m.role}` as TextKey, open: { kind: 'office', tab: 'rota' }, level: m.level });
  for (const id of ['stripper', 'bench', 'crucible'] as const) if (s.machines[id].owned) targets.push({ t: { kind: 'machine', machine: id }, name: itemName(id), open: { kind: 'office', tab: 'processBoard' }, level: s.machines[id].level });
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) targets.push({ t: { kind: 'partner', partner: pid }, name: 'item.skip', open: { kind: 'office', tab: 'partners' }, level: p.level });
  for (const x of targets) {
    if (!levelBinds(cfg, g, x.t, b)) continue;
    const ch = levelCheck(cfg, g, x.t);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'top') continue;
    out.push({ action: { act: 'level', target: x.t, price: ch.price }, open: x.open, price: ch.price, line: { key: 'advice.level', args: { item: { text: x.name }, n: { n: x.level + 1 }, x: { money: ch.price } } } });
  }
  return out;
}

/**
 * The advice line (2.10): the cheapest useful purchase priced at most cash + advice.minutes of
 * incomeRate, never leaving cash below E19's reserve; ties by the hour's goal order. `now` is unused
 * (prices do not move with the market day). Null when nothing qualifies.
 */
export function advice(cfg: SalvageConfig, g: SalvageGame, now: number): Advice | null {
  void now;
  const budget = g.cash + cfg.salvage.advice.minutes * incomeRate(cfg, g) - reserve(cfg, g);
  const list = candidates(cfg, g).filter((a) => a.price <= budget + 1e-9);
  list.sort((a, b) => a.price - b.price);
  return list[0] ?? null;
}

/** The item of an advice as a { text } argument (goal.widen's {item}). */
export function adviceItem(a: Advice): Txt['args'] {
  return { item: (a.line.args?.item ?? { text: 'item.skip' }) };
}

/** Crew shop keys of every role (for the rota). */
export function allCrewKeys(c: SalvageContent): Record<CrewRole, string[]> {
  return { hand: crewKeys(c, 'hand'), cutter: crewKeys(c, 'cutter'), driver: crewKeys(c, 'driver') };
}
