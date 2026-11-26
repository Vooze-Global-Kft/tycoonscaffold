/**
 * THE WORKS' FROZEN TEST CONTENT AND STATES (yard-stage2.md 8.1; owner rules-works). The test plates have round
 * numbers checkable by hand; no tuned number of the game is read. The content is the frozen stage-2 content of
 * fixtures/salvage.ts (`stage2Content()`, the game.json block the frozen states were played on) with its
 * thirteen plates REPLACED by the test plates below and their shop items priced alike (§1,000 each, ten seconds
 * on the flatbed, every gate rung 3 so that the frozen rung-3 yard can own all of them).
 *
 * `r4` (8.1: "shredder line and both halls"): the frozen state r3 on this content, the works opened at its
 * first live instant, every plate bought in content order with §100,000 given to it, set down and started up
 * by itself (jumped past arrival + selfCommission_s), then the bays the back field draws from stocked by hand
 * and the works' departures run once: every bay-fed plate and hall working. It is MADE (deterministically, from r3) rather than saved: the frozen content and r3 are
 * frozen, so is r4.
 *
 * Hand-checkable figures (each test names its own):
 * - baler: li → lib 1.00 at 1 kg/s (level L: 1 + 0.5 × (L − 1)), hopper 100 kg, tray 200 kg.
 * - shredder: li → shred 0.9 (waste 0.1); cbody → shred 0.7, the stream 0.3 to the eddy current (zorba 0.5 of
 *   it, waste 0.5); 2 kg/s; draws 100 kg a piece. sorter: zorba → twitch 0.8, ss 0.2 at 1 kg/s.
 * - breaker: pbb → pp 0.1, pbp 0.65 (waste 0.35) with soda ash 0.1 kg a kg at §1 (§10 a 100 kg piece).
 * - rotary: 100 kg a heat, 100 s, starts at half after 10 s idle; alu: ali 0.9, ald 0.05 (waste 0.1) with salt
 *   flux 0.05 kg a kg at §1 (§5 a full heat). smelter: pbp → pbi 0.9 (waste 0.2), coke and iron 0.1 at §1.
 * - induction: 50 kg, 50 s; brass brs → bri 0.9, brd 0.05, dust 0.05; bronze bzs → bzi 0.9, bzd 0.05, dust 0.05.
 * - works: commission_s 5, selfCommission_s 100, maxLevel 5.
 *
 * WAVE 2 (partners, vehicles, oversize pieces, the picking table, the Yard sale; TEST_REUSE, TEST_CRATE, TEST_LOTS):
 * - the Yard sale: 2 places (+1 a level, 2 levels), share 0.25 of the content's kinds, a sale 2 × the scrap value,
 *   the public at most 1 % of max(I₀, §1,000) an hour, 100 s after racking onto an empty rack, the first visitor 10 s
 *   after the first thing ever racked; the van 1,000 s after a batch, paying 1.5 × its value.
 * - the picking table: 0.2 of a tip by hash, at most 12, 2 s a thing, 1.5 × its prepared value.
 * - oversize pieces: one every 1,000 s, at most 4, worth 10 minutes of I at rungs 3 to 5 (the content's kinds).
 * `rackFull` (r3Works with both places of the rack taken, nothing else changed) and `lots4` (r3Works with the plasma
 * cutter's tier, four oversize pieces on the pad and eleven things on the picking table) are MADE from r3 as r4 is.
 */
import type { PlateDef, SalvageContent } from '../../config/schema.salvage';
import { buy } from '../salvage/actions';
import { begin, finish } from '../salvage/clock';
import { jump } from '../salvage/tick';
import { worksDepart } from '../salvage/works';
import type { SalvageConfig, SalvageGame } from '../salvage/types';
import { stage2Cfg, stage2Content, stage2Game } from './salvage';

type P = Omit<PlateDef, 'financeable'> & { financeable?: boolean };
const base = { needs: null as string | null, reagents: [] as [string, number, number][], out: {}, waste: {}, lev: 0.5, maxLevel: 5, inbuf: 0, tray: 0, price: 1000, deliver_s: 10, gate: 'rung3' };

/** The test plates (round numbers; every plate and recipe keeps mass and nets at least 1.05 × its input at p̄). */
export const TEST_PLATES: Record<string, P> = {
  crane: { ...base, row: 'yard', slot: 0, plot: 'crane', kind: 'handling', in: [], feedBy: null },
  shear: { ...base, row: 'yard', slot: 1, plot: 'shear', kind: 'rate', in: ['beam', 'tank', 'hmsu'], feedBy: 'hands', out: { beam: [['hms', 1]], tank: [['hms', 1]], hmsu: [['hms', 1]] }, inbuf: 600, tray: 1000 },
  baler: { ...base, row: 'yard', slot: 2, plot: 'baler', kind: 'rate', in: ['li'], feedBy: 'hands', out: { li: [['lib', 1]] }, rate_kg_s: 1, inbuf: 100, tray: 200 },
  analyser: { ...base, row: 'yard', slot: 3, plot: 'scalehouse', kind: 'assay', in: [], feedBy: null, lev: 0, maxLevel: 1 },
  granulator: { ...base, row: 'yard', slot: 5, plot: 'granulator', kind: 'rate', in: ['tcab'], feedBy: 'hands', out: { tcab: [['cug', 0.5]] }, waste: { tcab: [['carrier', 0.5]] }, rate_kg_s: 0.5, inbuf: 50, tray: 100 },
  shredder: {
    ...base, row: 'shredder', slot: 0, plot: 'shredder', kind: 'rate', in: ['cbody', 'li'], feedBy: 'bays',
    out: { li: [['shred', 0.9]], cbody: [['shred', 0.7], ['stream', 0.3]] }, waste: { li: [['carrier', 0.1]] }, feeds: { stream: 'eddy' }, rate_kg_s: 2, inbuf: 100,
  },
  eddy: { ...base, row: 'shredder', slot: 1, plot: 'eddy', needs: 'shredder', kind: 'rate', in: ['stream'], feedBy: 'stream', out: { stream: [['zorba', 0.5]] }, waste: { stream: [['carrier', 0.5]] }, lev: 0, maxLevel: 1 },
  sorter: { ...base, row: 'shredder', slot: 2, plot: 'sorter', needs: 'eddy', kind: 'rate', in: ['zorba'], feedBy: 'bays', out: { zorba: [['twitch', 0.8], ['ss', 0.2]] }, rate_kg_s: 1, inbuf: 50 },
  rotary: {
    ...base, row: 'melt', slot: 0, plot: 'rotary', kind: 'batch', in: [], feedBy: 'bays', inbuf: 100,
    batch: { kg: 100, s: 100, start_share: 0.5, start_idle: 10 },
    recipes: { alu: { in: ['alw', 'alcast', 'twitch'], out: [['ali', 0.9], ['ald', 0.05]], waste: [['carrier', 0.1]], reagents: [['saltFlux', 0.05, 1]] } },
  },
  induction: {
    ...base, row: 'melt', slot: 1, plot: 'induction', kind: 'batch', in: [], feedBy: 'bays', inbuf: 50,
    batch: { kg: 50, s: 50, start_share: 0.5, start_idle: 10 },
    recipes: {
      brass: { in: ['brs'], out: [['bri', 0.9], ['brd', 0.05], ['dust', 0.05]], waste: [], reagents: [] },
      bronze: { in: ['bzs'], out: [['bzi', 0.9], ['bzd', 0.05], ['dust', 0.05]], waste: [], reagents: [] },
    },
  },
  breaker: { ...base, row: 'lead', slot: 0, plot: 'breaker', kind: 'rate', in: ['pbb'], feedBy: 'bays', out: { pbb: [['pp', 0.1], ['pbp', 0.65]] }, waste: { pbb: [['carrier', 0.35]] }, reagents: [['sodaAsh', 0.1, 1]], rate_kg_s: 1, inbuf: 100 },
  smelter: {
    ...base, row: 'lead', slot: 1, plot: 'smelter', needs: 'breaker', kind: 'batch', in: [], feedBy: 'bays', inbuf: 100,
    batch: { kg: 100, s: 100, start_share: 0.5, start_idle: 10 },
    recipes: { lead: { in: ['pbp'], out: [['pbi', 0.9]], waste: [['carrier', 0.2]], reagents: [['cokeIron', 0.1, 1]] } },
  },
};

/** Wave 2's round numbers for the Yard sale, the picking table and the oversize pieces (the head of this file). */
export const TEST_REUSE = { slots: 2, levelSlots: 1, levels: 2, share: 0.25, factor: 2, shareI: [null, null, 0.01, 0.01, 0.01], floorI: 1000, period_s: 100, firstVisitor_s: 10, batchFactor: 1.5, vanPeriod_s: 1000 };
export const TEST_CRATE = { share: 0.2, max: 12, sort_s: 2, u: 1.5 };
export const TEST_LOTS = { period_s: 1000, max: 4, mu_min: [null, null, 10, 10, 10] };

const freeze = <T>(o: T): T => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) freeze(v);
  }
  return o;
};

let CONTENT: SalvageContent | null = null;
/** The works' test content (see the head of this file). */
export function worksContent(): SalvageContent {
  if (CONTENT) return CONTENT;
  const c = structuredClone(stage2Content()) as SalvageContent & { works: NonNullable<SalvageContent['works']>; worksLayer: NonNullable<SalvageContent['worksLayer']> };
  c.works = { ...c.works, commission_s: 5, selfCommission_s: 100, lev: 0.5, maxLevel: 5, floor: 1000, plates: TEST_PLATES as Record<string, PlateDef> };
  // Wave 2's round numbers (the head of this file).
  c.reuse = { ...c.reuse!, ...TEST_REUSE };
  c.crate = { ...TEST_CRATE };
  c.lots = { ...c.lots!, ...TEST_LOTS };
  c.worksLayer.shop = c.worksLayer.shop.map((it) => (it.kind === 'works' && TEST_PLATES[it.key] ? { ...it, price: 1000, gate: 'rung3', deliver_s: 10, needsItem: TEST_PLATES[it.key].needs ?? undefined } : it));
  return (CONTENT = freeze(c));
}

let CFG: SalvageConfig | null = null;
/** The config of the works' tests: the test content with r3's world seed (one object, so the rules' caches hold). */
export function worksCfg(): SalvageConfig {
  return (CFG ??= freeze({ mode: 'salvage', salvage: { ...worksContent(), worksLayer: worksContent().worksLayer, worldSeed: stage2Cfg('r3').salvage.worldSeed } } as unknown as SalvageConfig));
}

/** The plates in the order r4 buys them (content order; every `needs` before its plate). */
export const R4_ORDER = ['crane', 'shear', 'baler', 'analyser', 'granulator', 'shredder', 'eddy', 'sorter', 'rotary', 'induction', 'breaker', 'smelter'] as const;

/** r3 on the works' content with the works opened at its first live instant (nothing bought). */
export function r3Works(): SalvageGame {
  const cfg = worksCfg();
  const g0 = stage2Game('r3');
  return jump(cfg, g0, g0.salvage.t + 0.01);
}

let R4: SalvageGame | null = null;
/** r4: every plate bought, set down and started up by itself, the back field's bays stocked (see the head). Frozen: copy before changing. */
export function r4Game(): SalvageGame {
  if (R4) return R4;
  const cfg = worksCfg();
  let g: SalvageGame = { ...r3Works(), cash: 100_000 };
  for (const id of R4_ORDER) g = buy(cfg, g, id, 1000, g.salvage.t);
  // Set down and started up by itself (arrival + selfCommission_s), then the bays stocked and the works' departures run once.
  g = jump(cfg, g, g.salvage.t + 10 + 100 + 0.5);
  const s = structuredClone(g.salvage);
  const stock: Record<string, number> = { cbody: 500_000, li: 300_000, pbb: 200_000, brs: 100_000, alcast: 200_000, pbp: 50_000 };
  for (const [grade, gg] of Object.entries(stock)) {
    const b = (s.bays[grade] ??= { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 });
    b.g += gg;
  }
  g = { ...g, salvage: s };
  const x = begin(cfg, g, [], true);
  worksDepart(x, x.s.t);
  g = finish(g, x);
  return (R4 = freeze(g));
}

/** A racked thing on the rack's place `slot` (a radiator of the content, uid `rk<slot>`), racked at `since`. */
export function rackedThing(slot: number, since: number, obj = 'radiator'): SalvageGame['salvage']['things'][number] {
  return { uid: `rk${slot}`, obj, at: { at: 'rack', slot, since }, cut: 0, progress: 0, by: null };
}

let RACK: SalvageGame | null = null;
/** rackFull (8.1): r3Works with both places of the Yard sale taken (two radiators racked at its instant; the visitor dated as racking dates it). Frozen. */
export function rackFull(): SalvageGame {
  if (RACK) return RACK;
  const g = r3Works();
  const s = structuredClone(g.salvage);
  s.things.push(rackedThing(0, s.t), rackedThing(1, s.t));
  s.reuse = { ...s.reuse, nextAt: s.t + TEST_REUSE.firstVisitor_s };
  return (RACK = freeze({ ...g, salvage: s }));
}

let LOTS4: SalvageGame | null = null;
/** lots4 (8.1): r3Works with the plasma cutter's tier 4, four oversize pieces (casings, sender the garage) and eleven things on the picking table (radiators f9001..). Frozen. */
export function lots4(): SalvageGame {
  if (LOTS4) return LOTS4;
  const g = r3Works();
  const s = structuredClone(g.salvage);
  s.tier = 4;
  for (let k = 0; k < 4; k++) s.things.push({ uid: `lot${k}`, obj: 'casing', at: { at: 'lot', k }, cut: 0, progress: 0, by: null, g: 160_000, sender: 'partner.garage' });
  s.lots = { nextAt: null, n: 4 };
  for (let k = 0; k < 11; k++) s.things.push({ uid: `f${9001 + k}`, obj: 'radiator', at: { at: 'crate', k, since: s.t - 11 + k }, cut: 0, progress: 0, by: null });
  return (LOTS4 = freeze({ ...g, salvage: s }));
}
