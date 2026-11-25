/**
 * FROZEN TEST CONTENT of the salvage rules and the four frozen states built from it (yard-stage1.md 8.1:
 * rules tests run on this, never on the game's own numbers; no tuned number is pinned). Hour 0's
 * contract (section 9): small, round, never tuned: one thing per tool tier (cable and taps loose, the
 * washer for spanners, the radiator for the sledgehammer and grinder, the beam and the car for the
 * torch), every machine, both partners, the grades those need, three rivals.
 *
 * Until the content package generates the real block (scripts/content/build-yard.py from
 * proto/content2.json), games/scrap-yard/game.json's `salvage` block IS this content (with the names
 * filled from the register instead of the test names below), so the web preview runs on it.
 *
 * The four states (web preview `?preset=fresh|m5|m30|back`, src/modes/salvage/presets.web.ts):
 * - fresh: second 0, the full yard, nothing owned but the inherited hand stripper.
 * - m5: minute 5: the sack truck, a yard hand hired, a lot in the bays, the flatbed away on its round.
 * - m30: minute 30: everything of the hour owned (tools to the torch, carriers, the truck, every machine,
 *   both recipes, the Night watch, a yard hand, a cutter and a driver), a heat at "Ready to pour", a held
 *   bay, a supply deal running, the truck out on the driver's trip.
 * - back: m30 after time away, its away card waiting.
 * Web and tests only (scripts/lib/modes.js WEB_ONLY): no phone bundle carries it.
 */
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import type { GameConfig } from '../../config/schema';
import { freshSalvage, marketDay } from '../salvage';
import type { AwayCard, CrewMember, SalvageConfig, SalvageGame, SalvageState, Ticket } from '../salvage/types';
import type { GameState } from '../types';

/** The fixture's device time: 25 November 2026, 12:00 UTC (a Wednesday). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 25, 12);

const S = (id: string) => id;

/** The test content as written (JSON-able; game.json's block until the content package writes the real one). */
export const SALVAGE_TEST_RAW = {
  skeletonPlaceholder: true,
  version: 'hour-0 frozen test content',
  worldSeed: 7,
  names: {
    title: 'Test Title',
    currency: 'test scrip',
    homeYard: 'Test Yard',
    homeLane: 'Test Lane',
    merchant: 'Test Merchant',
    partnerFarm: 'Test Farm',
    farmContact: 'Farm Contact',
    partnerDemolition: 'Test Demolition',
    demolitionContact: 'Demolition Contact',
    foundry: 'Test Foundry',
    'rival.1': 'Rival One',
    'rival.2': 'Rival Two',
    'rival.3': 'Rival Three',
  } as Record<string, string>,
  yard: { width: 64, depth: 40, ppm: 40, tilt: 0.7, tile: 2 },
  worker: { radius: 0.35, reach: 0.8 },
  helpers: { count: 0, speed: 2.4, via: [24, 12] as [number, number] },
  // The ground work's static solids: the container wall (x 24) with its wide gap (y 10 to 14, the truck
  // passes) and its narrow gap (y 22.6 to 24, people only), rubble piles, crates.
  props: [
    { id: 'wall-1', kind: 'wall', x: 24, y: 2.5, shape: 'box', w: 2.4, d: 5, h: 2.6, solid: true },
    { id: 'wall-2', kind: 'wall', x: 24, y: 7.5, shape: 'box', w: 2.4, d: 5, h: 2.6, solid: true },
    { id: 'wall-3', kind: 'wall', x: 24, y: 16.15, shape: 'box', w: 2.4, d: 4.3, h: 2.6, solid: true },
    { id: 'wall-4', kind: 'wall', x: 24, y: 20.45, shape: 'box', w: 2.4, d: 4.3, h: 2.6, solid: true },
    { id: 'wall-5', kind: 'wall', x: 24, y: 26, shape: 'box', w: 2.4, d: 4, h: 2.6, solid: true },
    { id: 'wall-6', kind: 'wall', x: 24, y: 30, shape: 'box', w: 2.4, d: 4, h: 2.6, solid: true },
    { id: 'wall-7', kind: 'wall', x: 24, y: 34, shape: 'box', w: 2.4, d: 4, h: 2.6, solid: true },
    { id: 'wall-8', kind: 'wall', x: 24, y: 38, shape: 'box', w: 2.4, d: 4, h: 2.6, solid: true },
    { id: 'pile-1', kind: 'pile', x: 30, y: 37, shape: 'circle', r: 1.4, h: 1.2, solid: true },
    { id: 'pile-2', kind: 'pile', x: 57, y: 4, shape: 'circle', r: 1.4, h: 1.0, solid: true },
    { id: 'pile-3', kind: 'pile', x: 6, y: 33, shape: 'circle', r: 2.0, h: 1.4, solid: true },
    { id: 'crate-1', kind: 'crate', x: 3, y: 4, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
    { id: 'crate-2', kind: 'crate', x: 4.3, y: 4.4, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
    { id: 'crate-3', kind: 'crate', x: 14, y: 36, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
  ],
  grades: {
    li: { name: 'Light iron', pbar: 0.5, family: 'fe', material: 'lightiron', kind: 'grade', asFound: 0.8, sprite: S('piece.iron.light') },
    appl: { name: 'Appliances', pbar: 0.4, family: 'fe', material: 'lightiron', kind: 'grade', asFound: 1, sprite: S('piece.iron.appliance') },
    ci: { name: 'Cast iron', pbar: 1, family: 'fe', material: 'castiron', kind: 'grade', asFound: 0.8, sprite: S('piece.iron.cast') },
    ciu: { name: 'Cast iron, whole', pbar: 0.8, family: 'fe', material: 'castiron', kind: 'grade', asFound: 1, sprite: S('piece.iron.castwhole') },
    hms: { name: 'HMS 1&2 (80:20)', pbar: 1, family: 'fe', material: 'steel', kind: 'grade', asFound: 0.8, sprite: S('piece.steel.hms') },
    hmsu: { name: 'Steel, unprepared', pbar: 0.8, family: 'fe', material: 'steel', kind: 'grade', asFound: 1, sprite: S('piece.steel.unprepared') },
    cbody: { name: 'Car body', pbar: 0.5, family: 'fe', material: 'steel', kind: 'grade', asFound: 1, sprite: S('piece.steel.body') },
    alw: { name: 'Aluminium wheels', pbar: 5, family: 'nf', material: 'alu', kind: 'grade', asFound: 0.9, sprite: S('piece.alu.wheel') },
    alcast: { name: 'Cast aluminium', pbar: 4, family: 'nf', material: 'alu', kind: 'grade', asFound: 0.9, sprite: S('piece.alu.cast') },
    ali: { name: 'Alu alloy ingot', pbar: 8, family: 'nf', material: 'alu', kind: 'product', asFound: 1, sprite: S('piece.alu.ingot') },
    ald: { name: 'Aluminium dross', pbar: 1, family: 'nf', material: 'alu', kind: 'grade', asFound: 1, sprite: S('piece.alu.dross') },
    brs: { name: 'Yellow brass', pbar: 20, family: 'nf', material: 'brass', kind: 'grade', asFound: 0.9, sprite: S('piece.brass.solid') },
    bri: { name: 'Brass ingot', pbar: 25, family: 'nf', material: 'brass', kind: 'product', asFound: 1, sprite: S('piece.brass.ingot') },
    brd: { name: 'Brass dross', pbar: 2, family: 'nf', material: 'brass', kind: 'grade', asFound: 1, sprite: S('piece.brass.dross') },
    no2: { name: 'No.2 copper', pbar: 30, family: 'nf', material: 'copper', kind: 'grade', asFound: 0.9, sprite: S('piece.copper.no2') },
    bb: { name: 'Bare bright copper', pbar: 35, family: 'nf', material: 'copper', kind: 'grade', asFound: 0.9, sprite: S('piece.copper.bright') },
    cab: { name: 'Insulated cable', pbar: 20, family: 'nf', material: null, kind: 'intermediate', asFound: 1, sprite: S('piece.cable.heavy') },
    mot: { name: 'Electric motor', pbar: 2, family: 'nf', material: null, kind: 'intermediate', asFound: 1, sprite: S('piece.motor.whole') },
    conv: { name: 'Converter, whole', pbar: 0, family: 'pm', material: null, kind: 'intermediate', asFound: 1, sprite: S('piece.converter.whole') },
  },
  cable: { yield_: 0.7, tinned: 0.1, k: 0.85 },
  converter: { pt_g: 3, pd_g: 3, rh_g: 1, pt: 100, pd: 100, rh: 500, pay_pt: 0.75, pay_pd: 0.75, pay_rh: 0.65, ceramic_kg: 1, ceramic_fee: 5, assay_fee: 30, source: 'car', paid: 670 },
  objects: {
    washer: { name: 'Washing machine', tier: 1, h: 1, pieces: [['li', 10000, 2], ['mot', 5000, 1]], waste_g: 15000, whole: 'appl', text: 'two steel panels and a motor; the counterweight to the rubble skip', gross_g: 40000, preparedValue: 20, asFoundValue: 16, sprite: S('thing.washer'), stages: 4, size: { w: 0.8, d: 0.8, h: 1 } },
    cable: { name: 'Heavy cable offcuts', tier: 0, h: 0, pieces: [['cab', 10000, 1]], waste_g: 0, whole: 'cab', text: 'a bundle of heavy cable offcuts', gross_g: 10000, preparedValue: 200, asFoundValue: 200, sprite: S('thing.cable'), size: { w: 0.9, d: 0.9, h: 0.5 } },
    taps: { name: 'Crate of brass taps', tier: 0, h: 0, pieces: [['brs', 5000, 1]], waste_g: 0, whole: 'brs', text: 'a crate of brass taps', gross_g: 5000, preparedValue: 100, asFoundValue: 90, sprite: S('thing.taps'), size: { w: 0.7, d: 0.5, h: 0.5 } },
    radiator: { name: 'Cast-iron radiator', tier: 2, h: 1, pieces: [['ci', 10000, 3]], waste_g: 0, whole: 'ciu', text: 'broken in three with the sledgehammer', gross_g: 30000, preparedValue: 30, asFoundValue: 24, sprite: S('thing.radiator'), stages: 3, size: { w: 1.2, d: 0.4, h: 0.7 } },
    beam: { name: 'Steel beam', tier: 3, h: 2, pieces: [['hms', 20000, 5]], waste_g: 0, whole: 'hmsu', text: 'cut to HMS lengths with the torch', gross_g: 100000, preparedValue: 100, asFoundValue: 80, sprite: S('thing.beam'), stages: 4, size: { w: 3, d: 0.4, h: 0.4 } },
    car: {
      name: 'End-of-life car',
      tier: 3,
      h: 2,
      pieces: [['alw', 10000, 4], ['cab', 5000, 1], ['conv', 1000, 1], ['cbody', 100000, 5]],
      waste_g: 54000,
      whole: null,
      text: 'depolluted end-of-life car, treatment record ref. 0012',
      gross_g: 600000,
      preparedValue: 1000,
      asFoundValue: 1000,
      sprite: S('thing.car'),
      stages: 5,
      size: { w: 3.8, d: 1.7, h: 1.4 },
      source: { type: 'partner', partner: 'partnerDemolition', ref: '0012' },
    },
  },
  zones: {
    Z1: { tier: 1, things: { washer: 3, cable: 1, taps: 1 }, centre: [32, 30], r: 3 },
    Z2: { tier: 2, things: { radiator: 3 }, centre: [11, 24], r: 3 },
    Z3: { tier: 3, things: { beam: 2, car: 1 }, centre: [13, 5], r: 3 },
    bundle1: { tier: 0, things: { cable: 1 }, centre: [44, 27], r: 0.8 },
  },
  map: {
    points: {
      start: [58, 24],
      gate: [63, 24],
      dropoff: [58, 27],
      scale: [53, 24],
      weighbridge: [52, 29],
      scalehouse: [54, 20.5],
      bays: [48, 18],
      merchant: [47, 21],
      stillage: [42, 18.5],
      stripper: [44, 24],
      bundle1: [44, 27],
      bench: [40, 24],
      crucible: [36, 24],
      noticeboard: [57, 31],
      office: [36, 16],
      rack: [41, 15],
      rubble: [49, 25],
      floor: [46, 33],
      park: [56, 36],
      backfield: [3, 36],
      Z1: [32, 30],
      Z2: [11, 24],
      Z3: [13, 5],
    },
    detour: 1.15,
    lane: { farm_m: 100, demolition_m: 200, bridge_m: 300 },
    routes: { 'start-scale': 6, 'scale-stripper': 10, 'Z1-scale': 25 },
    places: {
      dropoff: { w: 3, d: 2, h: 0.1, solid: false, sprite: S('prop.dropoff.pad') },
      scale: { w: 2, d: 2, h: 0.1, solid: false, sprite: S('plant.scale.platform') },
      weighbridge: { w: 3, d: 6, h: 0.1, solid: false, sprite: S('plant.weighbridge.deck') },
      scalehouse: { w: 3, d: 2, h: 2.6, solid: true, sprite: S('prop.scalehouse') },
      bays: { w: 7, d: 1.6, h: 1.2, solid: true, sprite: S('prop.bays.lockblock') },
      merchant: { w: 4, d: 2, h: 0.1, solid: false, sprite: S('prop.flatbed.stand'), card: false },
      stillage: { w: 4, d: 1.2, h: 1.2, solid: true, sprite: S('prop.stillages'), card: false },
      stripper: { w: 2.5, d: 1.6, h: 1.4, solid: true, sprite: S('plant.stripper.pad') },
      bench: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: S('plant.bench.pad') },
      crucible: { w: 3, d: 2.4, h: 3, solid: true, sprite: S('plant.crucible.pad') },
      noticeboard: { w: 1.6, d: 0.5, h: 2, solid: true, sprite: S('prop.noticeboard') },
      office: { w: 4, d: 2.4, h: 2.8, solid: true, sprite: S('prop.office') },
      rack: { w: 3, d: 0.9, h: 2, solid: true, sprite: S('prop.toolrack') },
      rubble: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: S('prop.rubbleskip') },
      floor: { w: 6, d: 4, h: 0.05, solid: false, sprite: S('prop.tippingfloor') },
      park: { w: 3, d: 6, h: 0.05, solid: false, sprite: S('prop.truckpark') },
      backfield: { w: 2, d: 0.6, h: 2, solid: true, sprite: S('prop.backfield.gate') },
    },
  },
  tools: { spanners: { tier: 1, P: 5 }, sledge: { tier: 2, P: 10 }, torch: { tier: 3, P: 30 } },
  carriers: { frame: 30, sack: 60, trolley: 120 },
  walk: 4,
  pick_s: 0.2,
  weigh_s: 0.5,
  truck: { v: 9, handle_s: 10, driverFactor: 0.8, radius: 1.3, enter: 2 },
  machines: {
    hand_stripper: { rate: 1, needs_boss: true, inbuf: 50 },
    stripper: { rate: 5, inbuf: 200, lev: 0.1 },
    bench: { rate: 2, inbuf: 100, lev: 0.1, out: [['no2', 0.1], ['li', 0.8], ['alcast', 0.1]], waste: 0 },
    crucible: { pot: 20, s_per_kg: 2, lev: 0.1, start_share: 0.5, start_idle: 60, recipes: { brass: ['brs', 'bri', 0.95, 'brd'], alu: ['alw', 'ali', 0.95, 'ald'] }, first_wait_m: 6 },
  },
  crew: {
    hand: { load: 60, v: 3, lev: 0.1, handle_s: 2, maxlev: 10 },
    cutter: { share: 0.5, lev: 0.1, cap: 0.9, maxlev: 10 },
    driver: { lev: 0.1, maxlev: 10 },
  },
  dropoff: { period: 40, first: 20, places: 4, mix: [['washer', 3], ['cable', 1], ['radiator', 1]], initial: ['washer'] },
  partners: {
    partnerFarm: { opens: 'truck', lane: 'farm_m', trial: { washer: 2, radiator: 1 }, skip: { washer: 4, radiator: 3 }, fill_s: 300, k: 0.7, trialMass_kg: 110, trialPrice: 50, trialPrepared: 100, skipMass_kg: 250, skipPrice: 150, skipPrepared: 250 },
    partnerDemolition: { opens: 'torch', lane: 'demolition_m', trial: { beam: 1 }, skip: { beam: 2, cable: 2 }, fill_s: 600, k: 0.7, trialMass_kg: 100, trialPrice: 60, trialPrepared: 100, skipMass_kg: 220, skipPrice: 400, skipPrepared: 600 },
  },
  floorRoom_kg: 2000,
  merchant: { id: 'merchant', load_s: 3, round_s: 20 },
  shop: [
    { key: 'sack', kind: 'carry', place: 'rack', price: 50, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'hand1', kind: 'crew', place: 'office', price: 100, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'sledge', kind: 'tool', place: 'rack', price: 200, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'cutter', kind: 'crew', place: 'office', price: 300, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'trolley', kind: 'carry', place: 'rack', price: 300, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'stripper', kind: 'machine', place: 'stripper', price: 200, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'truck', kind: 'vehicle', place: 'park', price: 500, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'bench', kind: 'machine', place: 'bench', price: 300, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'driver', kind: 'crew', place: 'office', price: 500, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'torch', kind: 'tool', place: 'rack', price: 1000, gate: 'rung2', addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'crucible', kind: 'machine', place: 'crucible', price: 400, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'alu', kind: 'recipe', place: 'crucible', price: 400, gate: null, addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'hand2', kind: 'crew', place: 'office', price: 400, gate: 'rung3', addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'cutter2', kind: 'crew', place: 'office', price: 1000, gate: 'rung3', addsPerMin: 10, incomeNow: 100, tauMin: 2 },
    { key: 'night', kind: 'office', place: 'office', price: 1000, gate: null, addsPerMin: 0, incomeNow: 100, tauMin: 2 },
  ],
  levels: { tau: { first: 20, growth: 1.5, cap: 500 }, rule: 'price = base x tau(L) x 1.1^(L-1)', bases: { hand: 10, cutter: 10, driver: 10, stripper: 10, bench: 10, crucible: 10, partnerFarm: 50, partnerDemolition: 50 } },
  ladder: { rung2: { t: 2, range: 3 }, rung3: { t: 20, range: 5 }, theta: 100 },
  ceilings_t_h: [6, 20, 160],
  awayCap_h: [4, 6] as [number, number],
  rivals: [
    { id: 'rival01', T0_t: 0.1, passMin: 5 },
    { id: 'rival02', T0_t: 1, passMin: 15 },
    { id: 'rival03', T0_t: 5, passMin: 30 },
  ],
  bays: { li: 2000, ci: 2000, brs: 500, bb: 500, no2: 500 },
  deal: { partner: 'foundry', grade: 'ci', gate: 'rung2', series: [{ q_kg: 100, days: 3, premium: 0.1 }, { q_kg: 200, days: 5, premium: 0.1 }], trust: { up: 10, down: 15, start: 50 } },
  goals: [
    { id: 'takeWasher', text: 'goal.takeWasher', target: 'dropoff', done: 'cut:washer:1', buy: null },
    { id: 'weighIt', text: 'goal.weighIt', target: 'scale', done: 'collected:1', buy: null },
    { id: 'stripCable', text: 'goal.stripCable', target: 'stripper', done: 'graded:bb', buy: null },
    { id: 'buySack', text: 'goal.buySack', target: 'rack', done: 'owned:sack', buy: 'sack' },
    { id: 'hireHand', text: 'goal.hireHand', target: 'office', done: 'hired:hand', buy: 'hand1' },
    { id: 'signDeal', text: 'goal.signDeal', target: 'office', done: 'deal:signed', buy: null, optional: true },
    { id: 'supplyRung2', text: 'goal.supplyRung2', target: null, done: 'rung:2', buy: null },
  ],
  lessons: { li: 'lesson.li', mot: 'lesson.mot', cab: 'lesson.cab', bb: 'lesson.bb', brs: 'lesson.brs', ci: 'lesson.ci', conv: 'lesson.conv' },
};

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

/** The parsed test content (defaults filled), frozen. */
export const SALVAGE_TEST: SalvageContent = deepFreeze(SalvageSchema.parse(SALVAGE_TEST_RAW));

/** A shared config with the test content as its salvage block (tests: `withTestContent(GameConfigSchema.parse(raw))`). */
export function withTestContent(cfg: GameConfig): SalvageConfig {
  return { ...cfg, mode: 'salvage', salvage: SALVAGE_TEST } as SalvageConfig;
}

export const FIXTURE_NAMES = ['fresh', 'm5', 'm30', 'back'] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

/** What a frozen state sets on the shared state: cash, play seconds, and the salvage state. */
export interface FixtureState {
  cash: number;
  playSeconds: number;
  lifetimeEarnings: number;
  salvage: SalvageState;
}

const DAY = marketDay({ salvage: SALVAGE_TEST } as SalvageConfig, FIXTURE_NOW);
const ticketBase = (no: number, at: number) => ({ no, at, day: DAY });

function m5(): FixtureState {
  const s = freshSalvage({ salvage: SALVAGE_TEST } as SalvageConfig, FIXTURE_NOW);
  const t = 300;
  const hand: CrewMember = { id: 'hand.0', role: 'hand', slot: 0, name: 0, level: 1, job: 'dropoff', phase: 'walkTo', from: 'dropoff', to: 'scale', t0: t - 2, t1: t + 3, carries: 'li' };
  const tickets: Ticket[] = [
    { ...ticketBase(1, 22), kind: 'weighIn', by: 'boss', lines: [{ grade: 'li', g: 20000, price: 0.5, amount: 10 }, { grade: 'mot', g: 5000, price: 2, amount: 10 }], todaysValue: 20, lesson: 'lesson.li' },
    { ...ticketBase(2, 25), kind: 'collection', buyer: 'merchant', lines: [{ grade: 'li', g: 20000, price: 0.5, amount: 10 }, { grade: 'mot', g: 5000, price: 2, amount: 10 }], paid: 20 },
    { ...ticketBase(3, 90), kind: 'weighIn', by: 'boss', lines: [{ grade: 'bb', g: 6300, price: 35, amount: 220.5 }, { grade: 'no2', g: 700, price: 30, amount: 21 }], todaysValue: 241.5, lesson: 'lesson.bb' },
    { ...ticketBase(4, 93), kind: 'collection', buyer: 'merchant', lines: [{ grade: 'bb', g: 6300, price: 35, amount: 220.5 }, { grade: 'no2', g: 700, price: 30, amount: 21 }], paid: 241.5 },
    { ...ticketBase(5, 280), kind: 'weighIn', by: 'boss', lines: [{ grade: 'li', g: 40000, price: 0.5, amount: 20 }], todaysValue: 20, lesson: null },
  ];
  return {
    cash: 111.5,
    playSeconds: t,
    lifetimeEarnings: 261.5,
    salvage: {
      ...s,
      clock: { ...s.clock, highMs: FIXTURE_NOW + t * 1000 },
      owned: ['sack'],
      carrier: 'sack',
      load: [{ grade: 'li', g: 10000, from: 'Z1.washer.0' }],
      act: { kind: 'pickup', target: 'Z1.washer.0', since: t - 1 },
      // The drop-off's first washer is gone, a Z1 washer half cut, the bundle stripped.
      things: s.things.filter((th) => th.uid !== 'd0' && th.uid !== 'bundle1.cable.0').map((th) => (th.uid === 'Z1.washer.0' ? { ...th, cut: 1, progress: 0.5, by: 'boss' } : th)),
      piles: { 'beside.Z1.washer.0': { mot: 5000 }, dropoff: { li: 10000 } },
      bays: { li: { g: 40000, held: false, aside_g: 0, asidePrice: 0, forCrucible_g: 0, forDeal_g: 0 }, mot: { g: 0, held: false, aside_g: 0, asidePrice: 0, forCrucible_g: 0, forDeal_g: 0 }, bb: { g: 0, held: false, aside_g: 0, asidePrice: 0, forCrucible_g: 0, forDeal_g: 0 } },
      crew: [hand],
      merchant: { phase: 'away', endsAt: t + 15, lot: [] },
      dropoff: { nextAt: t + 20, n: 5 },
      ladder: { supplied_g: 32000, worth: { lightiron: 10, copper: 241.5 }, rung: 1, passed: 0 },
      goals: { at: 4, skipped: [], lastPromptAt: 200 },
      lessonsSeen: ['li', 'bb'],
      tickets,
      ticketNo: 6,
    },
  };
}

function m30(): FixtureState {
  const s = freshSalvage({ salvage: SALVAGE_TEST } as SalvageConfig, FIXTURE_NOW);
  const t = 1800;
  const member = (id: string, role: CrewMember['role'], job: CrewMember['job'], from: string, to: string, carries: string | null): CrewMember => ({ id, role, slot: 0, name: role === 'hand' ? 0 : role === 'cutter' ? 1 : 2, level: 2, job, phase: 'walkTo', from, to, t0: t - 1, t1: t + 4, carries });
  const bay = (g: number, held = false, forDeal_g = 0, forCrucible_g = 0) => ({ g, held, aside_g: 0, asidePrice: 0, forCrucible_g, forDeal_g });
  const away = (n: number): Ticket => ({ ...ticketBase(n, t - 40), kind: 'collection', buyer: 'merchant', lines: [{ grade: 'bb', g: 21000, price: 35, amount: 735 }, { grade: 'li', g: 160000, price: 0.5, amount: 80 }, { grade: 'brs', g: 4000, price: 20, amount: 80 }, { grade: 'no2', g: 2000, price: 30, amount: 60 }], paid: 955 });
  return {
    cash: 2480,
    playSeconds: t,
    lifetimeEarnings: 9300,
    salvage: {
      ...s,
      clock: { ...s.clock, highMs: FIXTURE_NOW + t * 1000 },
      owned: ['sack', 'sledge', 'trolley', 'stripper', 'truck', 'bench', 'torch', 'crucible', 'alu', 'night'],
      tier: 3,
      carrier: 'trolley',
      load: [{ grade: 'ci', g: 10000, from: 'Z2.radiator.1' }, { grade: 'ci', g: 10000, from: 'Z2.radiator.1' }],
      act: { kind: 'work', target: 'Z3.car.2', since: t - 3 },
      things: s.things
        .filter((th) => !['d0', 'bundle1.cable.0', 'Z1.washer.0', 'Z1.washer.1', 'Z1.cable.3', 'Z1.taps.4', 'Z2.radiator.0', 'Z3.beam.0'].includes(th.uid))
        .map((th) => (th.uid === 'Z3.car.2' ? { ...th, cut: 4, progress: 1.2, by: 'boss' } : th.uid === 'Z2.radiator.1' ? { ...th, cut: 2 } : th))
        .concat([
          { uid: 'd5', obj: 'washer', at: { at: 'dropoff', slot: 0 }, cut: 1, progress: 0.4, by: 'cutter.0' },
          { uid: 'd6', obj: 'radiator', at: { at: 'dropoff', slot: 1 }, cut: 0, progress: 0, by: null },
          { uid: 'f0', obj: 'washer', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null },
          { uid: 'f1', obj: 'radiator', at: { at: 'floor', slot: 1 }, cut: 0, progress: 0, by: null },
        ]),
      piles: { 'beside.Z3.car.2': { alw: 40000 }, 'beside.d5': { li: 10000 }, floor: { li: 20000 }, 'tray.bench': { no2: 1000, li: 8000 }, 'circle.0': { li: 10000 } },
      bays: { li: bay(320000), ci: bay(260000, true, 60000), hms: bay(80000), brs: bay(8000, false, 0, 8000), bb: bay(14000), no2: bay(3000), alw: bay(0), bri: bay(0) },
      machines: {
        hand_stripper: { ...s.machines.hand_stripper, status: 'idle' },
        stripper: { owned: true, level: 2, in_g: { cab: 30000 }, tray_g: { bb: 6000 }, status: 'working', since: 700 },
        bench: { owned: true, level: 1, in_g: { mot: 15000 }, tray_g: { no2: 1000, li: 8000, alcast: 1000 }, status: 'working', since: 900 },
        crucible: { ...s.machines.crucible, owned: true, level: 1, status: 'idle', since: 1400, recipe: 'brass', fromBays: true, charge_g: 20000, heel_g: 0, phase: 'ready', endsAt: null, lastFeedAt: 1700, firstPoured: false, cooling: null },
      },
      crew: [member('hand.0', 'hand', 'feed', 'floor', 'stripper', 'cab'), member('cutter.0', 'cutter', 'cutDropoff', 'dropoff', 'dropoff', null), member('driver.0', 'driver', 'drive', 'park', 'gate', null)],
      partners: {
        partnerFarm: { open: true, trialUsed: true, level: 1, skip: { phase: 'full', fullAt: 1500, contents: { washer: 4, radiator: 3 }, mass_g: 250000, price: 150, priceDay: DAY, trial: false, n: 3 } },
        partnerDemolition: { open: true, trialUsed: false, level: 1, skip: { ...s.partners.partnerDemolition.skip } },
      },
      truck: { owned: true, x: 56, y: 36, heading: 2, skip: null, by: 'driver', trip: { partner: 'partnerFarm', phase: 'out', endsAt: t + 12 }, hookRing: 0 },
      merchant: { phase: 'waiting', endsAt: null, lot: [] },
      dropoff: { nextAt: t + 12, n: 7 },
      deal: { step: 0, phase: 'running', q_g: 100000, days: 3, price: 1.1, delivered: 0, trust: 50, last: null },
      foreman: { day: DAY, used_s: 1400, lastWorkAt: t - 1 },
      ladder: { supplied_g: 6200000, worth: { lightiron: 800, castiron: 900, steel: 300, copper: 4100, brass: 600, alu: 40 }, rung: 2, passed: 2 },
      goals: { at: 6, skipped: [], lastPromptAt: 1650 },
      lessonsSeen: ['li', 'bb', 'mot', 'cab', 'brs', 'ci', 'no2'],
      tickets: [away(40), away(41)],
      ticketNo: 42,
    },
  };
}

function back(): FixtureState {
  const b = m30();
  const card: AwayCard = {
    seconds: 3 * 3600 + 12 * 60,
    capS: 6 * 3600,
    lines: [
      { grade: 'li', g: 410000, money: 205 },
      { grade: 'bb', g: 31000, money: 1085 },
      { grade: 'ci', g: 120000, money: 120 },
      { grade: 'no2', g: 4000, money: 120 },
      { grade: 'hms', g: 60000, money: 60 },
      { grade: 'brs', g: 2000, money: 40 },
    ],
    supplied_g: 627000,
    money: 1630,
    loads: 2,
    deliveries: 0,
    passed: ['rival03'],
    hint: null,
  };
  return { ...b, cash: b.cash + card.money, lifetimeEarnings: b.lifetimeEarnings + card.money, salvage: { ...b.salvage, away: card, ladder: { ...b.salvage.ladder, supplied_g: b.salvage.ladder.supplied_g + card.supplied_g, passed: 3 } } };
}

/** The four frozen states (frozen objects: copy before changing; the store's updates copy anyway). */
export const FIXTURE_STATES: Readonly<Record<FixtureName, FixtureState>> = deepFreeze({
  fresh: { cash: 0, playSeconds: 0, lifetimeEarnings: 0, salvage: freshSalvage({ salvage: SALVAGE_TEST } as SalvageConfig, FIXTURE_NOW) },
  m5: m5(),
  m30: m30(),
  back: back(),
});

/**
 * A frozen state laid over a shared state (`base`, e.g. economy.createInitialState(cfg, now)). The
 * salvage state is copied (structuredClone), so the caller may change it. The market clock's high mark
 * moves to `now` when given, so a preset loaded today stays on today's board.
 */
export function fixtureGame(name: FixtureName, base: GameState, now?: number): SalvageGame {
  const f = FIXTURE_STATES[name];
  const salvage = structuredClone(f.salvage) as SalvageState;
  if (now !== undefined) salvage.clock = { ...salvage.clock, highMs: Math.max(now, salvage.clock.highMs) };
  return { ...base, cash: f.cash, lifetimeEarnings: f.lifetimeEarnings, runEarnings: f.lifetimeEarnings, stats: { ...base.stats, playSeconds: f.playSeconds }, salvage };
}
