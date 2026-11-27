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
import { awayCapS } from './away';
import { loanHintDue, loanOffered, platePrice, saveUpSeconds } from './bank';
import { goalBuyNow, goalSpecs } from './goals';
import { contentAt, worksOpened } from './layer';
import { buyCheck, cashRefusal, crewKeys, gateRung, hiredState, hireCheck, itemName, levelCheck, materialsOf, ratedGain, roleOfKey, rungGrams, rungsOf, shopItems, thetaOf, topRungOf } from './ladder';
import { roundMoney } from './money';
import { levelGain, levelGainCfg, ratedIncome } from './rate';
import { incomeRate } from './tick';
import type { Advice, AdviceWait, CardRef, CrewRole, LevelTarget, MachineId, SalvageConfig, SalvageGame, ShopItem, TextKey, Txt, TxtArgs } from './types';

// ============================================================================ the bottleneck (E13c)

/** What binds now, read from the yard's own stocks (the prototype's binding(), proto/yard4.py; content levels.advice says it). */
export interface Binding {
  cutter: boolean;
  hand: boolean;
  machines: MachineId[];
  /** Supply binds (no crew or machine does): skips in rotation at the open partners, and the driver while he is out. */
  partners: string[];
  driver: boolean;
  /** Stage 2 (2.13): works plates whose level binds (the shear by uncut tier-3 steel on the floor; a plate's hopper or its bays' reserve 80 % full). */
  plates: string[];
}

/** The rung the works open at (the lowest gate of content works.plates; Infinity without): stage 2's bindings start there, so the first yard's advice is untouched. */
function worksRungOf(c: SalvageContent): number {
  let r = Infinity;
  for (const p of Object.values(c.works?.plates ?? {})) r = Math.min(r, gateRung(p.gate) || Infinity);
  return r;
}

/** Grams of UNCUT tier-3 steel things on the tipping floor (2.13: what the shear's level is for). */
function uncutSteelFloorGrams(c: SalvageContent, g: SalvageGame): number {
  let sum = 0;
  for (const t of g.salvage.things) {
    if (t.at.at !== 'floor') continue;
    const o = c.objects[t.obj];
    if (!o || o.tier < 3 || !o.pieces.some((p) => c.grades[p[0]]?.material === 'steel')) continue;
    sum += thingLeft(c, t.obj, t.cut);
  }
  return sum;
}

/**
 * Grams still UNCUT on the tipping floor: whole things standing there (what a cutter takes). Pieces
 * already cut are not the cutter's work: they are the carry's backlog (carryGrams).
 */
function uncutFloorGrams(c: SalvageContent, g: SalvageGame): number {
  return g.salvage.things.filter((t) => t.at.at === 'floor').reduce((a, t) => a + thingLeft(c, t.obj, t.cut), 0);
}

/**
 * Grams of pieces already cut that wait for a yard hand (the carry's backlog): on the tipping floor, at
 * the drop-off, in a chalk circle, and beside a thing standing at the drop-off or on the floor -- the
 * piles a yard hand takes from (crew.ts waitsAt). Pieces in a zone's pile or beside a thing in a zone
 * stay the boss's (2.6: a hand never takes from the heaps), so no hand's level carries them.
 */
export function carryGrams(g: SalvageGame): number {
  const s = g.salvage;
  const atOf = new Map(s.things.map((t) => [t.uid, t.at.at] as const));
  let sum = 0;
  for (const p of s.pieces) {
    const pl = p.pile;
    let waits = pl === 'floor' || pl === 'dropoff' || pl.startsWith('circle.');
    if (!waits && pl.startsWith('beside.')) {
      const at = atOf.get(pl.slice(7));
      waits = at === 'dropoff' || at === 'floor';
    }
    if (waits) sum += p.g;
  }
  return sum;
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
  // The carry binds when pieces already cut wait for the hands (2.5 loads or more); the cutter binds
  // only when UNCUT things wait on the floor and no such carry backlog stands (the hands are idle):
  // levelling the cutter while cut pieces lie waiting only adds to the pile (the measure engineer's
  // 21:05 line, the lead's 21:12 ruling).
  const carryBacklog = carryGrams(g) > LOOSE_LOADS * c.crew.hand.load * 1000;
  const hand = hasHand && carryBacklog;
  const cutter = hasCutter && !carryBacklog && uncutFloorGrams(c, g) > FLOOR_SHARE * c.floorRoom_kg * 1000;
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
  // Stage 2 (2.13; from the works' rung only): the shear by uncut tier-3 steel, a plate's hopper (or its bays'
  // reserve for it) 80 % full, and a full skip waiting while the driver is busy.
  const plates: string[] = [];
  let skipWaits = false;
  const cm = contentAt(c, s);
  if (s.ladder.rung >= worksRungOf(cm)) {
    const defs = cm.works?.plates ?? {};
    const shearKg = cm.advice.shearKg;
    if (shearKg !== undefined && s.works.shear?.phase === 'running' && uncutSteelFloorGrams(cm, g) > shearKg * 1000) plates.push('shear');
    for (const [pid, w] of Object.entries(s.works)) {
      const d = defs[pid];
      if (!d || w.phase !== 'running' || plates.includes(pid) || !(d.inbuf > 0)) continue;
      const inbuf = d.inbuf * 1000;
      const hopper = w.hopper.reduce((a, p) => a + p.g, 0);
      let reserved = 0;
      for (const b of Object.values(s.bays)) reserved += b.reserved?.[pid] ?? 0;
      if (hopper > HOPPER_SHARE * inbuf || reserved > HOPPER_SHARE * inbuf) plates.push(pid);
    }
    skipWaits = s.truck.trip !== null && Object.values(s.partners).some((p) => p.open && p.skips.some((k) => k.phase === 'full'));
  }
  const crewBinds = cutter || hand || machines.length > 0 || plates.length > 0;
  const partners = crewBinds ? [] : Object.entries(s.partners).filter(([, p]) => p.open).map(([id]) => id);
  const hasDriver = s.crew.some((m) => m.role === 'driver');
  const driver = hasDriver && s.truck.trip !== null && (!crewBinds || skipWaits);
  return { cutter, hand, machines, partners, driver, plates };
}

/**
 * Does a level of this target widen the bottleneck now (E13c, E19)? FROM THE WORKS' OPENING (s2c-fix-money E3 (b), E7):
 * a level is "not the bottleneck now" only when its RATED GAIN is zero (I with the level less I now; rate.ts), whatever
 * the stocks say. The first yard (the works not opened): the stocks' reading (binding), as merged.
 */
export function levelBinds(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, b = binding(cfg, g)): boolean {
  // s2e-advice (RULING2 27.2 d): the one measure, rate.ts levelGain (the gain book where it has the ladder).
  if (worksOpened(g.salvage)) return target.kind !== 'reuse' && levelGainCfg(cfg, g, target) > 1e-6;
  if (target.kind === 'machine') return b.machines.includes(target.machine);
  if (target.kind === 'partner') return b.partners.includes(target.partner);
  if (target.kind === 'plate') return b.plates.includes(target.plate);
  if (target.kind !== 'crew') return false; // the Yard sale's room (stage 2): rules-works'
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
function candidates(cfg0: SalvageConfig, g: SalvageGame): Advice[] {
  // The content the state reads (layer.ts): the works layer's items once the works opened; the same config before.
  const cm = contentAt(cfg0.salvage, g.salvage);
  const cfg = cm === cfg0.salvage ? cfg0 : { ...cfg0, salvage: cm };
  const c = cfg.salvage;
  const s = g.salvage;
  const b = binding(cfg, g);
  const out: Advice[] = [];
  const hourKeys = new Set(c.shop.map((i) => i.key));
  const seenRole = new Set<CrewRole>();
  for (const it of shopItems(c)) {
    if (it.kind === 'works') {
      // Stage 2: a plate for sale (bank.ts platePrice: not in `works`, its gate and needs met), bought with cash.
      const price = platePrice(cfg, g, it.key);
      if (price === null || cashRefusal(g, price)?.key === 'earmark') continue;
      out.push({ action: { act: 'buy', item: it.key, price }, open: { kind: 'works', plate: it.key }, price, line: { key: 'advice.buy', args: { item: { text: `title.works.${it.key}` as TextKey }, x: { money: price } } } });
      continue;
    }
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
  for (const pid of b.plates) targets.push({ t: { kind: 'plate', plate: pid }, name: `title.works.${pid}` as TextKey, open: { kind: 'works', plate: pid }, level: s.works[pid]?.level ?? 1 });
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
export function advice(cfg: SalvageConfig, g: SalvageGame, now: number): AdviceW | null {
  void now;
  const budget = g.cash + cfg.salvage.advice.minutes * incomeRate(cfg, g) - reserve(cfg, g);
  // s2e-advice (yard-stage2-economy.md 2.13; RULING2 27.2 d, 27.3 D11): from the works' opening the line reads ONE measure
  // (worksAdvice: the best buy, the target to save for with its "Meanwhile", the bank's sentence by the bank's own
  // predicate). The first yard's line below is as merged (the owner's phone: pinned).
  if (worksOpened(g.salvage)) return worksAdvice(cfg, g, budget);
  const a = cheapestUseful(cfg, g, budget);
  // 2.13, the bank's one sentence: the purchase is a financeable plate the finance card would offer (P > cash − reserve), the letter seen, no agreement open.
  if (a && a.action.act === 'buy' && a.open.kind === 'works' && !g.salvage.bank.agreement && loanOffered(cfg, g, a.action.item)) return { ...a, loanHint: true };
  return a;
}

/** The first yard's line (2.10): the cheapest useful purchase within the budget. */
function cheapestUseful(cfg: SalvageConfig, g: SalvageGame, budget: number): Advice | null {
  const list = candidates(cfg, g).filter((a) => a.price <= budget + 1e-9);
  list.sort((a, b) => a.price - b.price);
  return list[0] ?? null;
}

/**
 * The state with a shop item owned, as rated income reads assets (rate.ts own(): the item in `owned`, a tool's tier, a
 * better carrier, a first-yard machine on its pad, the truck); a works plate running at level 1 (and, a hall, poured
 * once: what it earns once working). For the advice's rated gain only; nothing is applied.
 */
export function boughtState(c: SalvageContent, g: SalvageGame, item: string): SalvageGame {
  const s = g.salvage;
  if (c.works?.plates[item]) {
    const w = { phase: 'running', level: 1 } as unknown as (typeof s.works)[string];
    return { ...g, salvage: { ...s, works: { ...s.works, [item]: w }, counts: { ...(s.counts ?? {}), [`poured:${item}`]: Math.max(1, s.counts?.[`poured:${item}`] ?? 0) } } };
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
 * s2e-advice (yard-stage2-economy.md 2.13; RULING2 27.2 d, 27.3 D11): the stage-2 fields of the advice line, present ONLY
 * from the works' opening (a first-yard advice has no `works` field). STAND-IN for types.ts `Advice.works` (closed to this
 * package: requests.md asks the join to ADD `works?: AdviceWorks` to Advice and `next?: Txt | null` to AdviceWait).
 */
export interface AdviceWorks {
  /** The calculated gain an hour of the item named, on the player's own yard (levelGain for a level; rate.ts's replay with the item bought less now for a machine, vehicle, tool or hire): the one measure price and advice read. */
  gain_h: number;
  /** "+§x an hour on your yard" (advice.gain): x is gain_h as the formatter rounds it, never a table's mean. */
  gain: Txt;
  /** Payback, hours: price ÷ gain_h. */
  payback_h: number;
  /** (b) THE TARGET: the item costs more than the cash less the driver's reserve. `line` then reads "Save up: {item}" (advice.saveFor) and `save` "Cash for it in about {t}" (advice.saveTime) with this time (bank.ts saveUpSeconds, the card's closed form; while only the reserve stands in the way, the reserve's part). Null when the line names a purchase the cash pays now (a). */
  saveUp_s: number | null;
  /** The save-up time's line (advice.saveTime), or null when not saving. */
  save: Txt | null;
  /** (b) the second line "For now: {item}" (advice.meanwhile; the design's "Meanwhile") and its purchase: the largest-gain item the cash can buy that still leaves the target affordable on return; null when none, or when not saving. */
  meanwhile: { action: Advice['action']; open: CardRef; price: number; gain_h: number; line: Txt } | null;
}

/** The advice line from the works' opening: the first yard's Advice plus its stage-2 fields (`works`). */
export type AdviceW = Advice & { works?: AdviceWorks };

/** AdviceWait plus the next rung's main purchase (s2e-advice; STAND-IN for types.ts AdviceWait.next, requests.md). */
export type AdviceWaitW = AdviceWait & { next?: Txt | null };

/** One purchase the works' line may name: its card's action and price, its calculated gain and payback. */
interface Cand {
  a: Advice;
  gain: number;
  h: number;
  /** The shop key bought or hired (a goal's `buy`), null for a level. */
  key: string | null;
}

/** Shorter payback first; equal paybacks: the larger gain (2.13 (a)). */
const better = (x: Cand, y: Cand): boolean => x.h < y.h - 1e-9 || (Math.abs(x.h - y.h) <= 1e-9 && x.gain > y.gain + 1e-9);
const bestOf = (list: Cand[]): Cand | null => list.reduce<Cand | null>((b, x) => (!b || better(x, b) ? x : b), null);

/**
 * EVERYTHING SOLD NOW with a calculated gain above 0 (no budget, no window): every plate for sale (bank.ts platePrice), every
 * shop item its check prices (not owned, arriving, locked or info), the next hire of each role, the next level of every crew
 * member, first-yard machine, open partner and running plate that its check sells (s2e-levels: a level not worth having is
 * refused `notLimit`, state locked, so never named). Gains: a level's is rate.ts levelGain (the gain book where it has the
 * ladder); a purchase's is the replay with it bought less now (ladder.ts ratedGain). A level whose gain is under
 * `levels.minShareI` x I is not named either (27.2 c). Never a product of the store, a pack or the shop: those are not shop
 * items (2.13 (f)).
 */
function worksCandidates(cfg: SalvageConfig, g: SalvageGame): Cand[] {
  const c = cfg.salvage;
  const s = g.salvage;
  const out: Cand[] = [];
  const add = (a: Advice, gain: number, key: string | null) => {
    if (!(gain > 1e-6) || !(a.price > 0)) return;
    out.push({ a, gain, h: a.price / gain, key });
  };
  const seenRole = new Set<CrewRole>();
  for (const it of shopItems(c)) {
    if (it.kind === 'works') {
      const price = platePrice(cfg, g, it.key);
      if (price === null || cashRefusal(g, price)?.key === 'earmark') continue;
      add({ action: { act: 'buy', item: it.key, price }, open: { kind: 'works', plate: it.key }, price, line: { key: 'advice.buy', args: { item: { text: `title.works.${it.key}` as TextKey }, x: { money: price } } } }, ratedGain(cfg, g, boughtState(c, g, it.key)), it.key);
      continue;
    }
    const role = roleOfKey(it.key);
    if (role) {
      if (seenRole.has(role)) continue;
      seenRole.add(role);
      const ch = hireCheck(cfg, g, role);
      if (ch.price === null || ch.state === 'locked' || ch.state === 'top' || !ch.key) continue;
      const item = shopItems(c).find((x) => x.key === ch.key)!;
      add({ action: { act: 'hire', role, price: ch.price }, open: cardForItem(item), price: ch.price, line: { key: 'advice.buy', args: { item: { text: itemName(item.key) }, x: { money: ch.price } } } }, ratedGain(cfg, g, hiredState(g, role)), ch.key);
      continue;
    }
    const ch = buyCheck(cfg, g, it.key);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'owned' || ch.state === 'arriving' || ch.state === 'info') continue;
    add({ action: { act: 'buy', item: it.key, price: ch.price }, open: cardForItem(it), price: ch.price, line: { key: 'advice.buy', args: { item: { text: itemName(it.key) }, x: { money: ch.price } } } }, ratedGain(cfg, g, boughtState(c, g, it.key)), it.key);
  }
  const minShare = (c.levels as { minShareI?: number }).minShareI ?? 0;
  const I = minShare > 0 ? Math.max(0, ratedIncome(c, s)) : 0;
  const targets: { t: LevelTarget; name: TextKey; open: CardRef; level: number }[] = [];
  for (const m of s.crew) targets.push({ t: { kind: 'crew', id: m.id }, name: `role.${m.role}` as TextKey, open: { kind: 'office', tab: 'rota' }, level: m.level });
  for (const id of ['stripper', 'bench', 'crucible'] as const) if (s.machines[id].owned) targets.push({ t: { kind: 'machine', machine: id }, name: itemName(id), open: { kind: 'office', tab: 'processBoard' }, level: s.machines[id].level });
  for (const [pid, p] of Object.entries(s.partners)) if (p.open) targets.push({ t: { kind: 'partner', partner: pid }, name: 'item.skip', open: { kind: 'office', tab: 'partners' }, level: p.level });
  for (const [pid, w] of Object.entries(s.works)) if (w.phase === 'running') targets.push({ t: { kind: 'plate', plate: pid }, name: `title.works.${pid}` as TextKey, open: { kind: 'works', plate: pid }, level: w.level ?? 1 });
  for (const x of targets) {
    const ch = levelCheck(cfg, g, x.t);
    if (ch.price === null || ch.state === 'locked' || ch.state === 'top' || ch.state === 'info') continue;
    const gain = levelGain(c, s, x.t);
    if (minShare > 0 && gain < minShare * I - 1e-9) continue;
    add({ action: { act: 'level', target: x.t, price: ch.price }, open: x.open, price: ch.price, line: { key: 'advice.level', args: { item: { text: x.name }, n: { n: x.level + 1 }, x: { money: ch.price } } } }, gain, null);
  }
  return out;
}

/** The item of an advice's line as a { text } argument. */
const itemArg = (a: Advice): TxtArgs => ({ item: a.line.args?.item ?? { text: 'item.skip' } });

/**
 * THE ADVICE LINE FROM THE WORKS' OPENING (yard-stage2-economy.md 2.13; RULING2 27.2 d, 27.3 D11). Every gain is the one
 * measure (worksCandidates); tau_r is content `tau_h` at the yard's rung (a rung without one: no limit). In order:
 * (a) THE BEST BUY: of everything sold whose payback (price ÷ gain) is within 1.25 tau_r, the shortest payback, ties to the
 *     larger gain. It is named with its card's line ("Next: {item} · {x}", as built) and `works.gain` "+§x an hour on your
 *     yard's figures", the calculated number on this state.
 * (b) THE TARGET, when it costs more than the cash less the driver's reserve (E19): the current goal's item when the goal
 *     buys one (any payback: the goal list is the stage's order; this is what makes the card manager reach rungs 4 and 5);
 *     else the best buy of (a) when the cash will reach it at the next return (cash less reserve plus I x the away cap), else
 *     the best buy within the line's budget (cash + advice.minutes of income less the reserve), else the best buy however far
 *     (the line is never null while something sold pays back within the window). The line reads "Save up: {item}" (advice.saveFor)
 *     over "Cash for it in about {t}" (works.save, advice.saveTime); `loanHint` ("A loan suits a machine that earns.") ONLY where bank.ts loanHintDue holds for the
 *     target with its own gain (the letter seen, the loan offered, no agreement open, gain x save-up time > the charge).
 *     `works.meanwhile` ("For now: {item}", advice.meanwhile): of the items in the window the cash less the reserve pays
 *     now, the largest gain (ties: the shorter payback) that still leaves the target affordable on return (cash - p + I x
 *     the away cap >= the target's price) or that pays for itself before the target is reached (p ÷ its gain <= the
 *     save-up time: it does not delay the target); null when none.
 * (c) WAITING: null when nothing sold pays back within 1.25 tau_r (and no goal item is wanted): adviceLine then gives
 *     adviceWait, whose `next` names the next rung's main purchase.
 * The action is always the item named (the target's own Buy while saving); `price` its card's price.
 */
function worksAdvice(cfg0: SalvageConfig, g: SalvageGame, budget: number): AdviceW | null {
  const cm = contentAt(cfg0.salvage, g.salvage);
  const cfg = cm === cfg0.salvage ? cfg0 : { ...cfg0, salvage: cm };
  const c = cfg.salvage;
  const s = g.salvage;
  const tau = c.tau_h?.[Math.floor(s.ladder.rung) - 1];
  const window = typeof tau === 'number' && tau > 0 ? ADVICE_WINDOW * tau : Infinity;
  const all = worksCandidates(cfg, g);
  if (!all.length) return null;
  const inWin = all.filter((x) => x.h <= window + 1e-9);
  const room = g.cash - reserve(cfg, g);
  const I = Math.max(0, ratedIncome(c, s));
  const capH = awayCapS(cfg, g) / 3600;
  const reach = room + I * capH;
  const goalKey = goalBuyNow(cfg0, g);
  const goalC = goalKey ? all.find((x) => x.key === goalKey) ?? null : null;
  const best = bestOf(inWin);
  let target: Cand | null = null;
  if (goalC && goalC.a.price > room + 1e-9) target = goalC;
  else {
    const near = best && best.a.price <= reach + 1e-9 ? best : null;
    const pick = near ?? bestOf(inWin.filter((x) => x.a.price <= budget + 1e-9)) ?? best;
    if (!pick) return null;
    if (pick.a.price > room + 1e-9) target = pick;
    else return { ...pick.a, works: worksOf(pick, null, null) };
  }
  // (b) saving for the target.
  const P = target.a.price;
  const save = saveUpSeconds(cfg, g, P) ?? saveUpSeconds(cfg, { ...g, cash: room }, P) ?? 0;
  const saveH = save / 3600;
  const mw = inWin.filter((x) => x !== target && x.a.price <= room + 1e-9 && (g.cash - x.a.price + I * capH >= P - 1e-9 || x.h <= saveH + 1e-9));
  const m = mw.reduce<Cand | null>((b, x) => (!b || x.gain > b.gain + 1e-9 || (Math.abs(x.gain - b.gain) <= 1e-9 && x.h < b.h - 1e-9) ? x : b), null);
  const line: Txt = { key: 'advice.saveFor' as TextKey, args: itemArg(target.a) };
  const loan = target.a.action.act === 'buy' && loanHintDue(cfg, g, target.a.action.item, target.gain);
  const out: AdviceW = { ...target.a, line, works: worksOf(target, save, m) };
  return loan ? { ...out, loanHint: true } : out;
}

/** The advice line's window, in tau_r (RULING2 27.3 D11: the band's own error, so an item priced at exactly tau_r x its measured gain is always named). */
export const ADVICE_WINDOW = 1.25;

function worksOf(x: Cand, saveUp_s: number | null, m: Cand | null): AdviceWorks {
  return {
    gain_h: x.gain,
    gain: { key: 'advice.gain' as TextKey, args: { x: { money: roundMoney(x.gain) } } },
    payback_h: x.h,
    saveUp_s,
    save: saveUp_s === null ? null : { key: 'advice.saveTime' as TextKey, args: { t: { secs: saveUp_s } } },
    meanwhile: m ? { action: m.a.action, open: m.a.open, price: m.a.price, gain_h: m.gain, line: { key: 'advice.meanwhile' as TextKey, args: itemArg(m.a) } } : null,
  };
}

/**
 * THE NEXT RUNG'S MAIN PURCHASE (2.13 (c), the waiting line's second line; s2e-advice): "Next: {item} · {x}" (advice.buy)
 * for rung n: the first item of the stage's goal list whose gate is rung n and that the yard does not own yet, else the
 * dearest shop item gated at rung n; its content price (what its plot shows, "Opens at rung {n} · {price}": a locked thing
 * shows its gate and price, and promises nothing more). Null when rung n opens no purchase.
 */
function nextRungMain(c: SalvageContent, g: SalvageGame, n: number): Txt | null {
  const items = shopItems(c).filter((it) => gateRung(it.gate) === n && !g.salvage.owned.includes(it.key) && !g.salvage.works[it.key]);
  if (!items.length) return null;
  const order = goalSpecs(c).stage2.map((d) => d.buy).filter((k): k is string => !!k);
  const byGoal = order.map((k) => items.find((it) => it.key === k)).find((it) => !!it);
  const it = byGoal ?? [...items].sort((a, b) => b.price - a.price)[0];
  const price = roundMoney(it.price);
  const name: TextKey = it.kind === 'works' ? (`title.works.${it.key}` as TextKey) : itemName(it.key);
  return { key: 'advice.buy', args: { item: { text: name }, x: { money: price } } };
}

// ============================================================================ what the yard waits for (21.5)

/**
 * THE ADVICE LINE AS THE SCREEN PRINTS IT (s2-fix-small, R3; RULING2 21.5 and 24): the purchase of `advice` when there is
 * one; from the works' opening, when nothing pays back within tau_r (advice null), what the yard waits for
 * (adviceWait). Below the works' opening this is `advice` exactly (the first yard on the phone: pinned).
 */
export function adviceLine(cfg: SalvageConfig, g: SalvageGame, now: number): AdviceW | AdviceWaitW | null {
  const a = advice(cfg, g, now);
  if (a || !worksOpened(g.salvage)) return a;
  return adviceWait(cfg, g);
}

/** Grams of each material in one skip of partner `pid` (its contents and the grows its plates have opened), by its pieces' grades. */
function skipMaterialGrams(c: SalvageContent, g: SalvageGame, pid: string, material: string): number {
  const def = c.partners[pid] as (SalvageContent['partners'][string] & { grows?: { needs: string; contents: Record<string, number> }[] }) | undefined;
  if (!def) return 0;
  const s = g.salvage;
  const contents: Record<string, number>[] = [def.skip ?? {}];
  for (const gr of def.grows ?? []) if (s.works[gr.needs]?.owned) contents.push(gr.contents);
  let sum = 0;
  for (const list of contents) {
    for (const [obj, n] of Object.entries(list)) {
      const o = c.objects[obj];
      if (!o) continue;
      let per = 0;
      for (const [gr, pg, k] of o.pieces) if (c.grades[gr]?.material === material) per += pg * k;
      if (o.whole && c.grades[o.whole]?.material === material) per = Math.max(per, o.gross_g);
      sum += per * Math.max(0, n);
    }
  }
  return sum;
}

/** The plates of the works whose output (a rate plate's `out`, a hall's recipes' `out`) is of `material`, the yard's own running plates first. */
function platesMaking(c: SalvageContent, g: SalvageGame, material: string): string[] {
  const s = g.salvage;
  const out: string[] = [];
  for (const [pid, d] of Object.entries(c.works?.plates ?? {})) {
    const p = d as unknown as { out?: Record<string, [string, number][]>; recipes?: Record<string, { out: [string, number][] }> };
    const outs = [...Object.values(p.out ?? {}).flat(), ...Object.values(p.recipes ?? {}).flatMap((r) => r.out)];
    if (outs.some(([gr]) => c.grades[gr]?.material === material)) out.push(pid);
  }
  const running = (pid: string) => (s.works[pid]?.phase === 'running' ? 0 : 1);
  return out.sort((a, b) => running(a) - running(b));
}

/** Who brings most of `material`: the open partner whose skip holds the most of it a second of filling, else a plate that makes it. */
function sourceOf(c: SalvageContent, g: SalvageGame, material: string): AdviceWait['from'] {
  let best: { pid: string; rate: number } | null = null;
  for (const [pid, p] of Object.entries(g.salvage.partners)) {
    if (!p.open || !c.partners[pid]) continue;
    const rate = skipMaterialGrams(c, g, pid, material) / Math.max(1, c.partners[pid].fill_s);
    if (rate > 0 && (!best || rate > best.rate + 1e-9)) best = { pid, rate };
  }
  if (best) return { partner: best.pid };
  const plate = platesMaking(c, g, material)[0];
  return plate ? { plate } : null;
}

/**
 * WHAT THE YARD WAITS FOR (s2-fix-small, R3; RULING2 21.5 and 24; from the works' opening, null before): the next rung
 * (at most the stage's top; null at the top) and what it still needs. When its range lacks materials (fewer than the
 * rung's `range` have lifetime products worth θ of that rung, ladder.ts thetaOf), the material nearest to its worth that
 * someone brings (else the nearest), with the open partner whose skip brings most of it a second of filling, else a plate
 * of the works that makes it: "Rung 5 waits for Light iron" over "Hob's Farm Clearance brings it". Else the tonnes still
 * to supply: "Rung 5: 1,240 t to go". Null when nothing is missing (the rung opens at the next check). Names nothing to buy.
 */
export function adviceWait(cfg: SalvageConfig, g: SalvageGame): AdviceWaitW | null {
  const s = g.salvage;
  if (!worksOpened(s)) return null;
  const c = contentAt(cfg.salvage, s);
  const n = Math.floor(s.ladder.rung) + 1;
  if (n > topRungOf(c)) return null;
  const r = rungsOf(c).find((x) => x.n === n);
  if (!r) return null;
  const missing_g = Math.max(0, rungGrams(c, n) - s.ladder.supplied_g);
  const th = thetaOf(c, n);
  const mats = materialsOf(c);
  const worth = s.ladder.worth;
  const counted = mats.filter((m) => (worth[m] ?? 0) >= th).length;
  if (counted < r.range) {
    const short = mats.filter((m) => (worth[m] ?? 0) < th).sort((a, b) => th - (worth[a] ?? 0) - (th - (worth[b] ?? 0)));
    const withSource = short.map((m) => ({ m, from: sourceOf(c, g, m) }));
    const pick = withSource.find((x) => x.from !== null) ?? withSource[0];
    if (pick) {
      const grade = Object.entries(c.grades).find(([, gr]) => gr.material === pick.m)?.[0] ?? null;
      const from = pick.from;
      const source: Txt | null = !from ? null : 'partner' in from ? { key: 'advice.waitBrings', args: { partner: { name: from.partner } } } : { key: 'advice.waitMakes', args: { plate: { text: `title.works.${from.plate}` as TextKey } } };
      const open: CardRef | null = !from ? null : 'partner' in from ? { kind: 'office', tab: 'partners' } : { kind: 'works', plate: from.plate };
      return { kind: 'waiting', rung: n, missing_g, material: pick.m, grade, from, line: grade ? { key: 'advice.waitGrade', args: { n: { n }, grade: { grade } } } : { key: 'advice.waitTonnes', args: { n: { n }, t: { tonnes_g: missing_g } } }, source, open, next: nextRungMain(c, g, n) };
    }
  }
  if (missing_g <= 0) return null;
  return { kind: 'waiting', rung: n, missing_g, material: null, grade: null, from: null, line: { key: 'advice.waitTonnes', args: { n: { n }, t: { tonnes_g: missing_g } } }, source: null, open: null, next: nextRungMain(c, g, n) };
}

/** The item of an advice as a { text } argument (goal.widen's {item}). */
export function adviceItem(a: Advice): Txt['args'] {
  return { item: (a.line.args?.item ?? { text: 'item.skip' }) };
}

/** Crew shop keys of every role (for the rota). */
export function allCrewKeys(c: SalvageContent): Record<CrewRole, string[]> {
  return { hand: crewKeys(c, 'hand'), cutter: crewKeys(c, 'cutter'), driver: crewKeys(c, 'driver') };
}
