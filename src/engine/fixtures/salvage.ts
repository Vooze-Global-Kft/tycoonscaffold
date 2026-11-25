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
 * The five states (web preview `?preset=fresh|m5|m15|m30|back`; m15 needs the wiring owner's alias, see
 * notes/contract.md). Each is a state the engine could reach: masses kept (things + pieces + loads +
 * hoppers + bays + trays + waste), every piece's uid names the thing that produced it, the goals done
 * by id, the clocks in yard seconds (`salvage.t`):
 * - fresh: second 0, the full yard, nothing owned but the inherited hand stripper.
 * - m5: minute 5: the sack truck, a yard hand walking to the drop-off for a whole washer, the boss's
 *   load FULL, a lot (cable) in the bays, the flatbed away on its round; a lesson ticket in the history.
 * - m15: rung 2 just reached (its event waits in FIXTURE_EVENTS), the supply deal offered, the boss
 *   driving the truck with the weighed trial skip, the farm's skip filling, the powered stripper's tray
 *   full; one ticket of every kind but the deal delivery in the history.
 * - m30: everything of the hour owned (tools to the torch, carriers, the truck, the strippers, the
 *   bench, the crucible), a yard hand, a cutter and a driver; the FIRST heat at "Ready to pour", a held
 *   cast-iron bay with the deal's reservation, the supply deal running, the driver out on the lane, a
 *   second farm skip filling, a collection of four lines.
 * - back: m30 after 3 h 12 m away (the boss poured the first heat before leaving): the away card
 *   waiting (with a hint line), the crucible heating with a heel, the bench waiting for motors, the
 *   epoch bumped.
 * FIXTURE_EVENTS: events the preview emits once after loading a preset, so tickets rise and cards open.
 * Web and tests only (scripts/lib/modes.js WEB_ONLY): no phone bundle carries it.
 */
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import type { GameConfig } from '../../config/schema';
import { buy, createSalvage, shopPrice } from '../salvage';
import { playStates, type Played } from '../salvage/director';
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
  awayCap_h: [4, 6] as [number, number],
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
