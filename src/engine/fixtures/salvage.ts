/**
 * FROZEN TEST CONTENT of the salvage rules and the five frozen states built from it (yard-stage1.md 8.1:
 * rules tests run on this, never on the game's own numbers; no tuned number is pinned). Small, round,
 * never tuned: one thing per tool tier (cable and taps loose, the washer for spanners, the radiator for
 * the sledgehammer and grinder, the beam and the car for the torch), every machine, both partners, the
 * grades those need, the 25 rivals of the ladder (register ids rival.1 to rival.25).
 *
 * The content has content3.json's key structure (the contract, version 2), with the keys the build adds
 * (sprites as manifest ENTRY ids, piece specs' 4th element, load families, bay looks, place cards and
 * labels). Until the content package generates the real block (scripts/content/build-yard.py),
 * games/scrap-yard/game.json's `salvage` block IS this content (with the names filled from the
 * register instead of the test names below), so the web preview runs on it.
 *
 * The five states (web preview `?preset=fresh|m5|m15|m30|back`) are PLAYED through the real engine
 * (src/engine/salvage/director.ts, 17:15): a person-like hand with the screen's own actions (presence
 * while walking and standing, buy, hire, sign, hold, Take from bays) and time away, so each is a state the
 * game can reach; nothing is hand-built. What each holds is what the play reached on this content:
 * - fresh: second 0 (createSalvage).
 * - m5: five minutes played: the first purchases, weigh-in and collection tickets, supplied > 0.
 * - m15: the phone down for the away cap after minute 5 (the crew earned), then fifteen minutes played:
 *   rung 2, the supply deal ON OFFER (not signed), the hour's purchases the cash allowed.
 * - m30: the deal signed, the deal's grade (cast iron) held from minute 15, thirty minutes played and on
 *   until the driver is out on the lane (at most five minutes more).
 * - back: m30 after 3 h 12 m away: the away card waiting, the epoch bumped.
 * `playedGame(cfg, name, base, now)` / `playedEvents(cfg, name)` play the same on ANY content (the
 * preview on the game's own game.json).
 * FIXTURE_EVENTS: events the preview emits once after loading a preset, so tickets rise and cards open.
 * Web and tests only (scripts/lib/modes.js WEB_ONLY): no phone bundle carries it.
 */
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import type { GameConfig } from '../../config/schema';
import { buy, createSalvage, shopPrice } from '../salvage';
import { playStates, type Played } from '../salvage/director';
import { away as botAway, newBot, playTo, seededCfg, startGame, type Bot } from '../salvage/bot';
import stage2Json from './salvage-stage2.json';
import worksJson from './salvage-works.json';
import { shipped2Raw } from './shipped2';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from '../salvage/types';
import type { GameState } from '../types';

/** The fixture's device time: 25 November 2026, 12:00 UTC (a Wednesday). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 25, 12);

const RIVAL_T0 = [0.1, 0.5, 1, 3, 5, 8, 12, 20, 30, 50, 80, 120, 200, 300, 500, 800, 1200, 2000, 3000, 5000, 8000, 12000, 20000, 30000, 50000];

/** The test content as written (JSON-able; game.json's block until the content package writes the real one). */
export const SALVAGE_TEST_RAW = {
  skeletonPlaceholder: true,
  version: 'frozen test content (contract v2)',
  worldSeed: 7,
  names: {
    title: 'Test Title',
    currency: 'test scrip',
    homeYard: 'Test Yard',
    homeLane: 'Test Lane',
    merchant: 'Test Merchant',
    'merchant.short': 'Merchant',
    partnerFarm: 'Test Farm',
    farmContact: 'Farm Contact',
    partnerDemolition: 'Test Demolition',
    demolitionContact: 'Demolition Contact',
    foundry: 'Test Foundry',
    'crew.0': 'Ann',
    'crew.1': 'Bo',
    'crew.2': 'Cy',
    ...Object.fromEntries(RIVAL_T0.flatMap((_, i) => [[`rival.${i + 1}`, `Rival ${i + 1}`], [`rival.${i + 1}.chip`, `Rival ${i + 1}`]])),
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
    { id: 'pile-1', kind: 'pile', x: 30, y: 37, shape: 'circle', r: 1.4, h: 1.0, solid: true },
    { id: 'pile-2', kind: 'pile', x: 57, y: 4, shape: 'circle', r: 1.4, h: 1.0, solid: true },
    { id: 'pile-3', kind: 'pile', x: 6, y: 33, shape: 'circle', r: 2.0, h: 1.4, solid: true },
    { id: 'crate-1', kind: 'crate', x: 3, y: 4, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
    { id: 'crate-2', kind: 'crate', x: 4.3, y: 4.4, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
    { id: 'crate-3', kind: 'crate', x: 14, y: 36, shape: 'box', w: 1, d: 1, h: 0.9, solid: true },
  ],
  grades: {
    li: { name: 'Light iron', pbar: 0.5, family: 'fe', material: 'lightiron', kind: 'grade', asFound: 0.8, sprite: 'piece.iron.plate', load: 'fe', bay: { kind: 'heap', sprite: 'plant.heap.li' } },
    appl: { name: 'Appliances', pbar: 0.4, family: 'fe', material: 'lightiron', kind: 'grade', asFound: 1, sprite: 'piece.panel', load: 'fe', bay: { kind: 'heap', sprite: 'plant.heap.appl' } },
    ci: { name: 'Cast iron', pbar: 1, family: 'fe', material: 'castiron', kind: 'grade', asFound: 0.8, sprite: 'piece.cast.shard', load: 'ci', bay: { kind: 'heap', sprite: 'plant.heap.ci' } },
    ciu: { name: 'Cast iron, whole', pbar: 0.8, family: 'fe', material: 'castiron', kind: 'grade', asFound: 1, sprite: 'piece.cast.section', load: 'ci', bay: { kind: 'heap', sprite: 'plant.heap.ciu' } },
    hms: { name: 'HMS 80:20', pbar: 1, family: 'fe', material: 'steel', kind: 'grade', asFound: 0.8, sprite: 'piece.steel.beam', load: 'hms', bay: { kind: 'heap', sprite: 'plant.heap.hms' } },
    hmsu: { name: 'Steel, unprepared', pbar: 0.8, family: 'fe', material: 'steel', kind: 'grade', asFound: 1, sprite: 'piece.steel.beam', load: 'hms', bay: { kind: 'heap', sprite: 'plant.heap.hmsu' } },
    cbody: { name: 'Car body', pbar: 0.5, family: 'fe', material: 'steel', kind: 'grade', asFound: 1, sprite: 'piece.steel.body', load: 'hms', bay: { kind: 'heap', sprite: 'plant.heap.cbody' } },
    alw: { name: 'Alloy wheels', pbar: 5, family: 'nf', material: 'alu', kind: 'grade', asFound: 0.9, sprite: 'piece.alu.wheel', load: 'al', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    alcast: { name: 'Cast aluminium', pbar: 4, family: 'nf', material: 'alu', kind: 'grade', asFound: 0.9, sprite: 'piece.alu.endcap', load: 'al', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    ali: { name: 'Alu alloy ingot', pbar: 8, family: 'nf', material: 'alu', kind: 'product', asFound: 1, sprite: 'piece.ingot.alu', load: 'al', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    ald: { name: 'Aluminium dross', pbar: 1, family: 'nf', material: 'alu', kind: 'grade', asFound: 1, sprite: 'piece.dross.alu', load: 'al' },
    brs: { name: 'Brass solids', pbar: 20, family: 'nf', material: 'brass', kind: 'grade', asFound: 0.9, sprite: 'piece.brass.taps', load: 'br', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    bri: { name: 'Brass ingot', pbar: 25, family: 'nf', material: 'brass', kind: 'product', asFound: 1, sprite: 'piece.ingot.brass', load: 'br', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    brd: { name: 'Brass dross', pbar: 2, family: 'nf', material: 'brass', kind: 'grade', asFound: 1, sprite: 'piece.dross.brass', load: 'br' },
    no2: { name: 'No.2 copper', pbar: 30, family: 'nf', material: 'copper', kind: 'grade', asFound: 0.9, sprite: 'piece.copper.no2', load: 'cu', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    bb: { name: 'Bare bright copper', pbar: 35, family: 'nf', material: 'copper', kind: 'grade', asFound: 0.9, sprite: 'piece.copper.bright', load: 'cu', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    cab: { name: 'Heavy cable', pbar: 20, family: 'nf', material: null, kind: 'intermediate', asFound: 1, sprite: 'piece.cable', load: 'cab', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    tcab: { name: 'Thin cable', pbar: 10, family: 'nf', material: null, kind: 'grade', asFound: 1, sprite: 'piece.cable', load: 'cab' },
    mot: { name: 'Electric motors', pbar: 2, family: 'nf', material: null, kind: 'intermediate', asFound: 1, sprite: 'piece.motor', load: 'mot', bay: { kind: 'stillage', sprite: 'plant.stillage' } },
    conv: { name: 'Converter, whole', pbar: 0, family: 'pm', material: null, kind: 'intermediate', asFound: 1, sprite: 'piece.converter', load: 'fe', bay: { kind: 'cage', sprite: 'plant.cage.converter' } },
  },
  cable: { yield_: 0.7, tinned: 0.1, k: 0.85 },
  converter: { pt_g: 3, pd_g: 3, rh_g: 1, pt: 100, pd: 100, rh: 500, pay_pt: 0.75, pay_pd: 0.75, pay_rh: 0.65, ceramic_kg: 1, ceramic_fee: 5, assay_fee: 30, source: 'car', paid: 670 },
  objects: {
    washer: { name: 'Washing machine', tier: 1, h: 1, pieces: [['li', 10000, 2, 'piece.panel'], ['mot', 5000, 1, 'piece.motor']], waste_g: 15000, whole: 'appl', text: 'two steel panels and a motor; the counterweight to the rubble skip', gross_g: 40000, preparedValue: 20, asFoundValue: 16, sprite: 'thing.washer', size: { w: 0.8, d: 0.8, h: 1 } },
    cable: { name: 'Heavy cable offcuts', tier: 0, h: 0, pieces: [['cab', 10000, 1, 'piece.cable']], waste_g: 0, whole: 'cab', text: 'a bundle of heavy cable offcuts', gross_g: 10000, preparedValue: 200, asFoundValue: 200, sprite: 'thing.cable.bundle', size: { w: 0.9, d: 0.9, h: 0.5 } },
    taps: { name: 'Crate of brass taps', tier: 0, h: 0, pieces: [['brs', 5000, 1, 'piece.brass.taps']], waste_g: 0, whole: 'brs', text: 'a crate of brass taps', gross_g: 5000, preparedValue: 100, asFoundValue: 90, sprite: 'thing.taps', size: { w: 0.7, d: 0.5, h: 0.5 } },
    radiator: { name: 'Cast-iron radiator', tier: 2, h: 1, pieces: [['ci', 10000, 3, 'piece.cast.section']], waste_g: 0, whole: 'ciu', text: 'broken in three with the sledgehammer', gross_g: 30000, preparedValue: 30, asFoundValue: 24, sprite: 'thing.radiator', size: { w: 1.2, d: 0.4, h: 0.7 } },
    beam: { name: 'Steel beam', tier: 3, h: 2, pieces: [['hms', 20000, 5, 'piece.steel.beam']], waste_g: 0, whole: 'hmsu', text: 'cut to HMS lengths with the torch', gross_g: 100000, preparedValue: 100, asFoundValue: 80, sprite: 'thing.beam', size: { w: 3, d: 0.4, h: 0.4 } },
    car: {
      name: 'End-of-life car',
      tier: 3,
      h: 2,
      pieces: [['alw', 10000, 4, 'piece.alu.wheel'], ['tcab', 5000, 1, 'piece.cable'], ['conv', 1000, 1, 'piece.converter'], ['cbody', 100000, 5, 'piece.steel.body']],
      waste_g: 54000,
      whole: null,
      text: 'depolluted end-of-life car, treatment record ref. 0012',
      gross_g: 600000,
      preparedValue: 1000,
      asFoundValue: 1000,
      sprite: 'thing.car',
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
      dropoff: { w: 3, d: 2, h: 0.1, solid: false, sprite: 'ground.chalk', card: 'dropoff' },
      scale: { w: 2, d: 2, h: 0.1, solid: false, sprite: 'plant.scale.platform', card: false },
      weighbridge: { w: 3, d: 6, h: 0.1, solid: false, sprite: 'plant.weighbridge.deck', card: false },
      scalehouse: { w: 2.6, d: 2, h: 2.4, solid: true, sprite: 'plant.scalehouse', card: 'board' },
      bays: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.bay', card: 'board' },
      merchant: { w: 4, d: 2, h: 0.1, solid: false, sprite: 'plant.block', card: false },
      stillage: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.stillage', card: false, label: 'place.stillages' },
      stripper: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.stripper.hand', card: 'machine' },
      bench: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.bench.motor', card: 'machine' },
      crucible: { w: 2.6, d: 2, h: 2.4, solid: true, sprite: 'plant.hood', card: 'machine' },
      noticeboard: { w: 1.6, d: 0.6, h: 2, solid: true, sprite: 'plant.sign.posts', card: 'table' },
      office: { w: 2.6, d: 2, h: 2.4, solid: true, sprite: 'plant.portacabin', card: 'rota' },
      rack: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.toolrack', card: 'rack' },
      rubble: { w: 2.4, d: 1.4, h: 1.2, solid: true, sprite: 'plant.skip.rubble', card: false },
      floor: { w: 6, d: 4, h: 0.05, solid: false, sprite: 'ground.chalk', card: 'floor' },
      park: { w: 3, d: 6, h: 0.05, solid: false, sprite: 'ground.chalk', card: 'park' },
      backfield: { w: 1.6, d: 0.6, h: 2, solid: true, sprite: 'plant.gate.field', card: false },
    },
    sites: { partnerFarm: { w: 6, d: 4 }, partnerDemolition: { w: 6, d: 4 } },
  },
  tools: { spanners: { tier: 1, P: 5 }, sledge: { tier: 2, P: 10 }, torch: { tier: 3, P: 30 } },
  carriers: { frame: 30, sack: 40, trolley: 120 },
  walk: 4,
  pick_s: 0.2,
  weigh_s: 0.5,
  truck: { v: 9, handle_s: 10, driverFactor: 0.8, radius: 1.3, enter: 2 },
  machines: {
    hand_stripper: { rate: 1, needs_boss: true, inbuf: 50, tray: 20 },
    stripper: { rate: 5, inbuf: 200, lev: 0.1, tray: 20 },
    bench: { rate: 2, inbuf: 100, lev: 0.1, out: [['no2', 0.1], ['li', 0.8], ['alcast', 0.1]], waste: 0, tray: 50 },
    crucible: { pot: 20, s_per_kg: 2, lev: 0.1, start_share: 0.5, start_idle: 60, recipes: { brass: ['brs', 'bri', 0.95, 'brd'], alu: [['alw', 'alcast'], 'ali', 0.95, 'ald'] }, first_wait_m: 6, ingot_kg: 5, tray: 100 },
  },
  crew: {
    hand: { load: 60, v: 3, lev: 0.1, handle_s: 2, maxlev: 10 },
    cutter: { share: 0.5, lev: 0.1, cap: 0.9, maxlev: 10 },
    driver: { lev: 0.1, maxlev: 10 },
  },
  dropoff: { period: 100, first: 20, places: 4, mix: [['washer', 3], ['cable', 1], ['radiator', 1]], initial: ['washer'] },
  partners: {
    partnerFarm: { opens: 'truck', lane: 'farm_m', trial: { washer: 2, radiator: 1 }, skip: { washer: 4, radiator: 3 }, fill_s: 300, k: 0.7, trialMass_kg: 110, trialPrice: 50, trialPrepared: 100, skipMass_kg: 250, skipPrice: 150, skipPrepared: 250, skipLook: 'farm' },
    partnerDemolition: { opens: 'torch', lane: 'demolition_m', trial: { beam: 1 }, skip: { beam: 2, cable: 2 }, fill_s: 600, k: 0.7, trialMass_kg: 100, trialPrice: 60, trialPrepared: 100, skipMass_kg: 220, skipPrice: 400, skipPrepared: 600, skipLook: 'demolition' },
  },
  floorRoom_kg: 2000,
  merchant: { id: 'merchant', load_s: 3, round_s: 20 },
  shop: [
    { key: 'sack', kind: 'carry', place: 'rack', price: 50, gate: null, deliver_s: 10, arrive: 'van' },
    { key: 'hand1', kind: 'crew', place: 'office', price: 100, gate: null },
    { key: 'sledge', kind: 'tool', place: 'rack', price: 200, gate: null, deliver_s: 10, arrive: 'van' },
    { key: 'cutter', kind: 'crew', place: 'office', price: 300, gate: null },
    { key: 'trolley', kind: 'carry', place: 'rack', price: 300, gate: null, deliver_s: 10, arrive: 'van' },
    { key: 'truck', kind: 'vehicle', place: 'park', price: 500, gate: null, deliver_s: 20, arrive: 'truck' },
    { key: 'stripper', kind: 'machine', place: 'stripper', price: 200, gate: null, deliver_s: 20, arrive: 'machineFlatbed' },
    { key: 'bench', kind: 'machine', place: 'bench', price: 300, gate: null, deliver_s: 20, arrive: 'machineFlatbed' },
    { key: 'crucible', kind: 'machine', place: 'crucible', price: 400, gate: null, deliver_s: 20, arrive: 'machineFlatbed' },
    { key: 'driver', kind: 'crew', place: 'office', price: 500, gate: null },
    { key: 'torch', kind: 'tool', place: 'rack', price: 1000, gate: 'rung2', deliver_s: 10, arrive: 'van' },
  ],
  dayOneList: [
    { key: 'alu', kind: 'recipe', place: 'crucible', price: 400, gate: null },
    { key: 'night', kind: 'office', place: 'office', price: 1000, gate: null },
    { key: 'hand2', kind: 'crew', place: 'office', price: 400, gate: 'rung3' },
    { key: 'cutter2', kind: 'crew', place: 'office', price: 1000, gate: 'rung3' },
  ],
  goalOrder: ['sack', 'hand1', 'sledge', 'cutter', 'trolley', 'truck', 'stripper', 'bench', 'crucible', 'driver', 'torch'],
  wholeUnits_kg: { conv: 1, mot: 5 },
  levels: { tau: { first: 20, growth: 1.5, cap: 500 }, maxLevel: 10, opens: 'torch', margin_per_kg: { stripper: 1, bench: 1, crucible: 1, yard: 1 }, rule: 'price = tau(L) x rated kg/min added x margin per kg' },
  ladder: {
    rung2: { t: 2, range: 3 },
    rung3: { t: 20, range: 5 },
    theta: 100,
    rungs: [
      { n: 1, t: 0, range: 0 },
      { n: 2, t: 2, range: 3 },
      { n: 3, t: 20, range: 5 },
      { n: 4, t: 100, range: 6 },
      { n: 5, t: 500, range: 7 },
      { n: 6, t: 2000, range: 8 },
      { n: 7, t: 10000, range: 9 },
      { n: 8, t: 50000, range: 10 },
      { n: 9, t: 200000, range: 11 },
    ],
  },
  ceilings_t_h: [6, 20, 160],
  awayCapByRung_h: [4],
  nightWatch_h: 2,
  rivals: { rule: 'T0 x (1 + g_day x min(d, 40))', list: RIVAL_T0.map((T0_t, i) => ({ id: `rival.${i + 1}`, T0_t, g_day: 0.005, passMin: (i + 1) * 5 })) },
  reach: { work: 1.4, pickup: 1, place: 1.2, sight: 8 },
  bays: { li: 2000, ci: 2000, hms: 2000, brs: 500, bri: 500, bb: 500, no2: 500, cab: 500, mot: 500, alw: 500, conv: 50 },
  deal: { partner: 'foundry', grade: 'ci', gate: 'rung2', series: [{ q_kg: 100, days: 3, premium: 0.1 }, { q_kg: 200, days: 5, premium: 0.1 }], trust: { up: 10, down: 15, start: 50 } },
  advice: { minutes: 3, promptGapS: 60, reserveS: 120 },
  goals: [
    { id: 'takeWasher', text: 'goal.takeWasher', target: 'dropoff', done: 'cut:washer:1', buy: null },
    { id: 'weighIt', text: 'goal.weighIt', target: 'scale', done: 'collected:1', buy: null },
    { id: 'stripCable', text: 'goal.stripCable', target: 'stripper', done: 'graded:bb', buy: null },
    { id: 'buySack', text: 'goal.buySack', target: 'rack', done: 'owned:sack', buy: 'sack' },
    { id: 'hireHand', text: 'goal.hireHand', target: 'office', done: 'hired:hand', buy: 'hand1' },
    { id: 'buySledge', text: 'goal.buySledge', target: 'rack', done: 'owned:sledge', buy: 'sledge' },
    { id: 'supplyRung2', text: 'goal.supplyRung2', target: null, done: 'rung:2', buy: null },
    { id: 'signDeal', text: 'goal.signDeal', target: 'office', done: 'deal:signed', buy: null, optional: true },
    { id: 'pourFirst', text: 'goal.pourFirst', target: 'crucible', done: 'poured:1', buy: null },
    { id: 'widen', text: 'goal.widen', target: null, done: 'advice:bought', buy: null, repeat: true },
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

export const FIXTURE_NAMES = ['fresh', 'm5', 'm15', 'm30', 'back'] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

/** What a frozen state sets on the shared state: cash, play seconds (time PLAYED), and the salvage state (yard seconds in `salvage.t`). */
export interface FixtureState {
  cash: number;
  playSeconds: number;
  lifetimeEarnings: number;
  salvage: SalvageState;
}

const CFG = { mode: 'salvage', salvage: SALVAGE_TEST } as unknown as SalvageConfig;

// The states are PLAYED through the real engine (src/engine/salvage/director.ts: a person-like hand with
// the screen's actions, and time away), once, on first use: each is a state the game can reach.
let PLAYED: Played | null = null;
const playedCache = new WeakMap<object, Played>();

/** The five states played on a content (memoised per content object). `dt` is the person's tick. */
export function playedOn(cfg: SalvageConfig, dt = 0.5): Played {
  const hit = playedCache.get(cfg.salvage);
  if (hit) return hit;
  const g0 = createSalvage(cfg, { cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW } } as unknown as GameState, FIXTURE_NOW);
  const p = playStates(cfg, g0, FIXTURE_NOW, dt);
  for (const n of FIXTURE_NAMES) deepFreeze(p.games[n]);
  playedCache.set(cfg.salvage, p);
  return p;
}

function played(): Played {
  if (!PLAYED) PLAYED = playedOn(CFG);
  return PLAYED;
}

function lazy<T>(make: (n: FixtureName) => T): Readonly<Record<FixtureName, T>> {
  const memo: Partial<Record<FixtureName, T>> = {};
  const o = {} as Record<FixtureName, T>;
  for (const n of FIXTURE_NAMES) Object.defineProperty(o, n, { enumerable: true, get: () => (memo[n] ??= make(n)) });
  return Object.freeze(o);
}

const stateOf = (p: Played, n: FixtureName): FixtureState => {
  const g = p.games[n];
  return deepFreeze({ cash: g.cash, playSeconds: g.stats.playSeconds, lifetimeEarnings: g.lifetimeEarnings ?? 0, salvage: g.salvage });
};

/** The five frozen states (frozen objects: copy before changing; the store's updates copy anyway). Played on first use. */
export const FIXTURE_STATES: Readonly<Record<FixtureName, FixtureState>> = lazy((n) => stateOf(played(), n));

/** A refusal the screen would get at this state: the first shop item it cannot pay for (a real refusal through `buy`). */
function refusalAt(cfg: SalvageConfig, g: SalvageGame): SalvageEvent | null {
  for (const item of [...cfg.salvage.shop, ...cfg.salvage.dayOneList]) {
    if (item.kind === 'crew') continue;
    const ev: SalvageEvent[] = [];
    const price = shopPrice(cfg, g, item.key) ?? item.price;
    buy(cfg, g, item.key, price, g.salvage.t, ev);
    const r = ev.find((e) => e.type === 'refused');
    if (r && r.type === 'refused' && r.key !== 'owned') return r;
  }
  return null;
}

/** The events a state re-emits once in the preview: the last of each kind the play emitted up to it (and a real refusal). */
function eventsOf(cfg: SalvageConfig, p: Played, n: FixtureName): SalvageEvent[] {
  const evs = p.events[n];
  const last = (pred: (e: SalvageEvent) => boolean) => [...evs].reverse().find(pred) ?? null;
  const out: (SalvageEvent | null)[] = [];
  if (n === 'm5') out.push(last((e) => e.type === 'weighIn' && e.by !== 'boss') ?? last((e) => e.type === 'weighIn'), last((e) => e.type === 'collected'));
  if (n === 'm15') out.push(last((e) => e.type === 'rung'), last((e) => e.type === 'dealOffered'), last((e) => e.type === 'bridgeWeighIn'), refusalAt(cfg, p.games[n]));
  if (n === 'm30') out.push(last((e) => e.type === 'weighIn' && e.ticket.kind === 'weighIn' && !!e.ticket.lessonText) ?? last((e) => e.type === 'weighIn'), last((e) => e.type === 'lesson'), last((e) => e.type === 'collected'), refusalAt(cfg, p.games[n]));
  if (n === 'back') out.push(last((e) => e.type === 'awayReport'), last((e) => e.type === 'dealDelivered'));
  return deepFreeze(out.filter((e): e is SalvageEvent => !!e));
}

/**
 * Events the preview emits ONCE after a preset loads (tickets, chips, cards and sounds can be looked at
 * without playing), taken from what the play emitted: m5 a weigh-in (a crew member's if any) and a
 * collection; m15 the rung sign, the deal's offer, a skip ticket and a refusal (each when it happened);
 * m30 a weigh-in (with its lesson when one was dealt), the lesson, a collection, a refusal; back the
 * away report and a deal delivery.
 */
export const FIXTURE_EVENTS: Readonly<Record<FixtureName, readonly SalvageEvent[]>> = lazy((n) => eventsOf(CFG, played(), n));

/** A played state's events on any content (the preview on the game's own content). */
export function playedEvents(cfg: SalvageConfig, n: FixtureName): readonly SalvageEvent[] {
  return eventsOf(cfg, playedOn(cfg), n);
}

/**
 * A frozen state laid over a shared state (`base`, e.g. economy.createInitialState(cfg, now)). The
 * salvage state is copied (structuredClone), so the caller may change it; its epoch is bumped (the
 * world snaps). The market clock's high mark moves to `now` when given, so a preset loaded today stays
 * on today's board.
 */
export function fixtureGame(name: FixtureName, base: GameState, now?: number): SalvageGame {
  return gameOf(FIXTURE_STATES[name], base, now);
}

/** The same state played on the game's OWN content (the preview's presets on game.json): `cfg` is the game's config. */
export function playedGame(cfg: SalvageConfig, name: FixtureName, base: GameState, now?: number): SalvageGame {
  return gameOf(stateOf(playedOn(cfg), name), base, now);
}

function gameOf(f: FixtureState, base: GameState, now?: number): SalvageGame {
  const salvage = structuredClone(f.salvage) as SalvageState;
  salvage.epoch += 1;
  if (now !== undefined) salvage.clock = { ...salvage.clock, highMs: Math.max(now, salvage.clock.highMs) };
  return { ...base, cash: f.cash, lifetimeEarnings: f.lifetimeEarnings, runEarnings: f.lifetimeEarnings, stats: { ...base.stats, playSeconds: f.playSeconds }, salvage };
}

// ================================================================================================ stage 2's frozen states (engine2)
//
// yard-stage2.md 8.1 (B1): `r3`, `r3plain` and `held14`, PLAYED by the balance bot (src/engine/salvage/bot.ts)
// on the game's own content as it stood when they were frozen, and FROZEN with that content beside them
// (src/engine/fixtures/salvage-stage2.json, as bots/gate5 is in salvage-gate5.json): a rules test that loads
// one runs it on the content it was played on, so tuning game.json moves nothing here. Remade only by the
// loop's engineer (engine2), with `playStage2States` on the content of the day, the commands in
// notes/s2a-engine2-hooks.md. What each holds (as played on 26 Nov by engine2-hooks):
// - r3: seed 257, the normal hand, every purchase it meets (habit 'all'), route A, played to minute 60: the
//   awaybench's state, at rung 3 (runs on), the foreman's boost used up for the day, the hand stripper idle,
//   nothing held. The works layer opens at its first tick once Phase B builds it (2.20, from the state).
// - r3plain: the same play to the first whole minute after 60 at which no boost is on, the hand stripper has
//   nothing in its hopper or under way, no bay is held (so E40's lot cannot apply) and no thing of a
//   `reuse.kinds` object stands at the drop-off or on the floor (the crews' places; the zones' old stock is
//   the boss's alone and never a crew's, 2.6): the run tests' yard (B3, 2.1.7).
// - held14: seed 1, the day-word holder (Hold on every bay on a low day), habit 'goal', route A: an hour, then
//   twice 11.75 h away and 15 minutes played (the end of its third sitting, day 1): fourteen bays held and
//   the cash below every load's price (yard-bots.md C5's dead absence; C5 named about §524 on the engine of
//   25 Nov; on this engine the same habit holds all fourteen one sitting later, with less cash).
// FIXTURE_EVENTS of each: the last event of each named kind the play emitted up to it.

/** The three stage-2 states of 8.1 that are the loop's (engine2's). */
export const STAGE2_NAMES = ['r3', 'r3plain', 'held14'] as const;
export type Stage2Name = (typeof STAGE2_NAMES)[number];

/** One frozen stage-2 state: its world seed and device time, the game, the events the preview re-emits. */
export interface Stage2Frozen {
  seed: number;
  worldSeed: number;
  now: number;
  what: string;
  g: SalvageGame;
  events: SalvageEvent[];
}

/** The events a frozen state re-emits once (the last of each kind the play emitted up to it). */
const STAGE2_EVENT_KINDS: Record<Stage2Name, SalvageEvent['type'][]> = {
  r3: ['rung', 'collected', 'weighIn', 'bridgeWeighIn'],
  r3plain: ['collected', 'weighIn', 'tip'],
  held14: ['awayReport', 'heldBay', 'collected'],
};

/** A bot whose events are kept: the last of each kind, read before the bot clears them (bot.ts clears b.ev after each read). */
function keeping(b: Bot): Map<string, SalvageEvent> {
  const last = new Map<string, SalvageEvent>();
  const raw: SalvageEvent[] = [];
  b.ev = new Proxy(raw, {
    set(target, prop, value) {
      if (prop === 'length' && value === 0) for (const e of target) last.set(e.type, e);
      (target as unknown as Record<string | symbol, unknown>)[prop] = value;
      return true;
    },
  });
  return last;
}

const pick = (last: Map<string, SalvageEvent>, kinds: SalvageEvent['type'][]): SalvageEvent[] => {
  const out: SalvageEvent[] = [];
  for (const k of kinds) {
    const e = last.get(k);
    if (e) out.push(structuredClone(e));
  }
  return out;
};

/**
 * PLAY the three states on a content (the game's game.json `salvage` block, parsed): deterministic, a pure
 * function of the content and the engine. Throws when a state does not hold what it is named for.
 */
export function playStage2States(content: SalvageContent, now = Date.UTC(2026, 10, 25, 9)): Record<Stage2Name, Stage2Frozen> {
  const kinds = new Set(Object.keys((content as unknown as { reuse?: { kinds?: Record<string, unknown> } }).reuse?.kinds ?? {}));
  const cfgOf = (seed: number) => seededCfg({ mode: 'salvage', salvage: content } as unknown as SalvageConfig, seed);
  const frozen = (b: Bot, seed: number, what: string, last: Map<string, SalvageEvent>, n: Stage2Name): Stage2Frozen => {
    for (const e of b.ev) last.set(e.type, e);
    const g = structuredClone({ ...b.g, lastSavedAt: b.g.salvage.clock.highMs }) as SalvageGame;
    return { seed, worldSeed: b.cfg.salvage.worldSeed, now: b.now, what, g, events: pick(last, STAGE2_EVENT_KINDS[n]) };
  };
  const plain = (b: Bot): boolean => {
    const s = b.g.salvage;
    const hs = s.machines.hand_stripper;
    const f = content.foreman;
    const boost = f.boost > 0 && s.foreman.day === s.clock.day && s.foreman.used_s < f.minutesPerDay * 60 - 1e-6 && s.t - s.foreman.lastWorkAt < f.windowS;
    return !boost && !hs.work && hs.hopper.length === 0 && !Object.values(s.bays).some((q) => q.held) && !s.things.some((th) => kinds.has(th.obj) && (th.at.at === 'dropoff' || th.at.at === 'floor'));
  };
  // r3 and r3plain: seed 257.
  const c257 = cfgOf(257);
  const b = newBot(c257, startGame(c257, now), now, { seed: 257, hand: 'normal', habit: 'all', route: 'A' });
  const last = keeping(b);
  playTo(b, 3600);
  if (b.g.salvage.ladder.rung < 3) throw new Error(`r3: rung ${b.g.salvage.ladder.rung} at minute 60`);
  const r3 = frozen(b, 257, 'seed 257, the normal hand, habit all, route A, played to minute 60', last, 'r3');
  let m = 61;
  for (; m <= 120; m++) {
    playTo(b, m * 60);
    if (plain(b)) break;
  }
  if (!plain(b)) throw new Error('r3plain: no plain minute by minute 120');
  const r3plain = frozen(b, 257, `r3's play continued to minute ${m}, the first whole minute with no boost, the hand stripper idle, nothing held and no reusable kind at the drop-off or on the floor`, last, 'r3plain');
  // held14: seed 1, the day-word holder.
  const c1 = cfgOf(1);
  const h = newBot(c1, startGame(c1, now), now, { seed: 1, hand: 'normal', habit: 'goal', route: 'A', holder: true });
  const lastH = keeping(h);
  playTo(h, 3600);
  for (let k = 0; k < 2; k++) {
    botAway(h, 11.75 * 3600);
    playTo(h, h.g.salvage.t + 15 * 60);
  }
  const held = Object.values(h.g.salvage.bays).filter((q) => q.held).length;
  if (held !== 14) throw new Error(`held14: ${held} bays held`);
  const held14 = frozen(h, 1, `seed 1, the day-word holder, habit goal, route A: an hour, then twice 11.75 h away and 15 min played; ${held} bays held, cash ${h.g.cash}`, lastH, 'held14');
  return { r3, r3plain, held14 };
}

const STAGE2_FILE = stage2Json as unknown as { note: string; content: unknown; states: Record<Stage2Name, Stage2Frozen> };

let STAGE2_CONTENT: SalvageContent | null = null;
/** The content the stage-2 states were played on (salvage-stage2.json), parsed and frozen. */
export function stage2Content(): SalvageContent {
  return (STAGE2_CONTENT ??= deepFreeze(SalvageSchema.parse(STAGE2_FILE.content)));
}

const STAGE2_CFG: Partial<Record<Stage2Name, SalvageConfig>> = {};
/** A frozen state's config: its content with its world seed (one object per state, so the rules' caches hold). */
export function stage2Cfg(n: Stage2Name): SalvageConfig {
  return (STAGE2_CFG[n] ??= deepFreeze({ mode: 'salvage', salvage: { ...stage2Content(), worldSeed: STAGE2_FILE.states[n].worldSeed } } as unknown as SalvageConfig));
}

function lazy2<T>(make: (n: Stage2Name) => T): Readonly<Record<Stage2Name, T>> {
  const memo: Partial<Record<Stage2Name, T>> = {};
  const o = {} as Record<Stage2Name, T>;
  for (const n of STAGE2_NAMES) Object.defineProperty(o, n, { enumerable: true, get: () => (memo[n] ??= make(n)) });
  return Object.freeze(o);
}

/** The three frozen states (frozen objects: copy before changing). */
export const STAGE2_STATES: Readonly<Record<Stage2Name, FixtureState & { now: number; what: string }>> = lazy2((n) => {
  const f = STAGE2_FILE.states[n];
  return deepFreeze({ cash: f.g.cash, playSeconds: f.g.stats.playSeconds, lifetimeEarnings: f.g.lifetimeEarnings ?? 0, salvage: f.g.salvage, now: f.now, what: f.what });
});

/** FIXTURE_EVENTS of the stage-2 states: what the preview re-emits once after loading one. */
export const STAGE2_EVENTS: Readonly<Record<Stage2Name, readonly SalvageEvent[]>> = lazy2((n) => deepFreeze(STAGE2_FILE.states[n].events));

/** A frozen stage-2 state as a game (the salvage state copied; the epoch bumped as fixtureGame does). Run it with stage2Cfg(n). */
export function stage2Game(n: Stage2Name, base?: GameState, now?: number): SalvageGame {
  const f = STAGE2_STATES[n];
  const b = (base ?? ({ cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: f.salvage.clock.highMs, stats: { playSeconds: 0, clockHigh: f.salvage.clock.highMs } } as unknown as GameState)) as GameState;
  return { ...gameOf(f, b, now), lastSavedAt: f.salvage.clock.highMs };
}

// ================================================================================================ the works' recorded states (C-FIXTURE)
//
// PLAN2 2.6 and s2c-plan-wiring a.6: the twenty moments of the works, PLAYED by the normal hand (bot.ts) on the SHIPPED
// content at stage 2 (shipped2.ts: game.json with release.stage 2) and recorded by scripts/content/yard/record-works.ts
// into salvage-works.json (DEVELOPMENT ONLY: scripts/lib/modes.js DEV_ONLY; the file carries the marker). Unlike r3,
// r3plain and held14 (the rules' tests', frozen WITH their content), these are played on the game's own content of the
// day and name its hash: when the content moves and the file does not, a state is STALE (the preview warns loudly, the
// presets' test skips naming why) until C-FIXTURE-2 records again. The preview loads them through `worksPresetState`.

/** The works' moments by name (PLAN2 2.6; src/modes/salvage/presets.web.ts WORKS_PRESETS is the same list, tested). */
export const WORKS_NAMES = ['w3open', 'w3', 'w3save', 'w3letter', 'w3sale', 'w3van', 'w3lot', 'w4entry', 'w4arrive', 'w4pour', 'w4hall', 'w4line', 'w4loan', 'w4packs', 'w4all', 'w4back', 'w5', 'w5wait', 'w3plain', 'w4plain'] as const;
export type WorksName = (typeof WORKS_NAMES)[number];

/** The marker every DEV_ONLY file carries (scripts/lib/modes.js DEV_ONLY_MARKER): the recording's top-level `marker`. */
export const WORKS_FILE_MARKER = 'yard-dev-only:works';

/** One recorded moment: what it holds in words, the hand that played it, its device time and yard second, the events it re-emits once, the game. */
export interface WorksRecord {
  what: string;
  bot: string;
  seed: number;
  /** Device epoch ms at the state (the market clock). */
  now: number;
  /** Yard second and rung at the state (information; the game holds them). */
  t: number;
  rung: number;
  /** null when the moment was met as PLAN2 2.6 names it; else what the nearest state recorded lacks. */
  missed: string | null;
  events: SalvageEvent[];
  g: SalvageGame;
}

export interface WorksRecording {
  marker: string;
  note: string;
  /** worksContentHash() of the content the states were played on. */
  contentHash: string;
  recordedNow: number;
  states: Partial<Record<WorksName, WorksRecord>>;
}

const WORKS_FILE = worksJson as unknown as WorksRecording;

/** The recording as it is on disk (read only). */
export function worksRecording(): WorksRecording {
  return WORKS_FILE;
}

/** FNV-1a over a string in two 32-bit lanes (pure JavaScript: the preview and node give the same 16 hex digits). */
function fnv2(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    a = Math.imul(a ^ ch, 0x01000193) >>> 0;
    b = Math.imul(b ^ ch, 0x5bd1e995) >>> 0;
    b = (b ^ (b >>> 15)) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

let WORKS_HASH: { raw: unknown; hash: string } | null = null;
/**
 * The content fingerprint of a.6: a hash of the PARSED stage-2 salvage block of the game (`raw`, default game.json, read
 * as a stage-2 build writes it: shipped2Raw). Memoised for the default.
 */
export function worksContentHash(raw?: unknown): string {
  if (raw === undefined && WORKS_HASH) return WORKS_HASH.hash;
  const r = shipped2Raw<{ salvage: unknown }>(raw ?? undefined);
  const hash = fnv2(JSON.stringify(SalvageSchema.parse(r.salvage)));
  if (raw === undefined) WORKS_HASH = { raw: null, hash };
  return hash;
}

/** Why the recording no longer matches the game's content (or is not recorded), else null. */
export function worksStale(): string | null {
  if (!WORKS_FILE.contentHash) return 'the works\' states are not recorded yet (scripts/content/yard/record-works.ts)';
  const now = worksContentHash();
  return now === WORKS_FILE.contentHash ? null : `recorded on content ${WORKS_FILE.contentHash}, the game's content is now ${now} (C-FIXTURE-2 records again)`;
}

/**
 * A recorded state moved to device time `now` (when later than the recording's): every DEVICE date in it moves by the same
 * amount (the market clock's high mark, the iap's creation, its quotes' and ledger's dates, the open agreement's
 * signature), so what the moment holds between device dates (a quote waiting under its 24 h, not yet 72 h old) holds in a
 * preview opened later. Yard seconds (every rule's dates) are untouched. The epoch is bumped (the world snaps).
 */
function movedTo(f: WorksRecord, base: GameState, now: number): SalvageGame {
  const g = structuredClone(f.g) as SalvageGame;
  const s = g.salvage;
  const d = Math.max(0, now - s.clock.highMs);
  if (d > 0) {
    s.clock = { ...s.clock, highMs: s.clock.highMs + d };
    const iap = s.iap;
    if (iap) {
      iap.createdMs += d;
      for (const q of iap.pending) {
        q.atMs += d;
        if (q.askedMs !== null) q.askedMs += d;
      }
      for (const l of iap.ledger) l.atMs += d;
      for (const x of iap.expired ?? []) x.atMs += d;
    }
    if (s.bank?.agreement) s.bank.agreement.signedAt += d;
  }
  s.epoch += 1;
  return { ...base, cash: g.cash, lifetimeEarnings: g.lifetimeEarnings ?? 0, runEarnings: g.lifetimeEarnings ?? 0, stats: { ...base.stats, playSeconds: g.stats.playSeconds }, salvage: s, lastSavedAt: s.clock.highMs } as SalvageGame;
}

/**
 * THE SEAM of C-MODE (src/modes/salvage/presets.web.ts worksPresetOf): the recorded moment `name` laid over the shared state
 * `base` at device time `now` (see movedTo), the events to emit once after the curtain, and `stale` (null, or why the
 * recording's content hash no longer matches the game's content: the preview warns loudly and still shows it). null for a
 * name not recorded. Run it on the game's own config at stage 2 (the preview's `&stage=2`).
 */
export function worksPresetState(name: WorksName, base: GameState, now: number): { game: SalvageGame; events: readonly SalvageEvent[]; stale: string | null } | null {
  const f = WORKS_FILE.states[name];
  if (!f) return null;
  return { game: movedTo(f, base, now), events: structuredClone(f.events), stale: worksStale() };
}
