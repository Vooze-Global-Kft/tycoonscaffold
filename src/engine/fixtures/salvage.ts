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
import { freshSalvage, marketDay, priceOf } from '../salvage';
import { pointOf, thingPos } from '../salvage/positions';
import type { AwayCard, BayState, CrewMember, GroundPiece, Piece, SalvageConfig, SalvageEvent, SalvageGame, SalvageState, ThingState, Ticket, TicketLine, Txt } from '../salvage/types';
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

const C = SALVAGE_TEST;
const CFG = { salvage: C } as SalvageConfig;
const DAY = marketDay(CFG, FIXTURE_NOW);
const P = (g: string) => priceOf(CFG, g, DAY);
const r2 = (x: number) => Math.round(x * 100) / 100;
const line = (grade: string, g: number, extra: Partial<TicketLine> = {}): TicketLine => ({ grade, g, price: P(grade), amount: r2((g / 1000) * P(grade)), ...extra });
const total = (ls: TicketLine[]) => r2(ls.reduce((a, l) => a + l.amount, 0));
const base = (no: number, at: number) => ({ no, at, day: DAY });
const slip = (no: number, at: number, thing: string): Ticket => ({ ...base(no, at), kind: 'dropOffSlip', thing });
const weighIn = (no: number, at: number, by: string, lines: TicketLine[], lessonText: Txt | null = null): Ticket => ({ ...base(no, at), kind: 'weighIn', by, lines, todaysValue: total(lines), lessonText, lesson: lessonText?.key ?? null });
const collection = (no: number, at: number, lines: TicketLine[], withBoss: boolean, firstGrades: string[] = []): Ticket => ({ ...base(no, at), kind: 'collection', buyer: 'merchant', lines, paid: total(lines), withBoss, firstGrades });
const bay = (g: number, o: Partial<BayState> = {}): BayState => ({ g, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0, ...o });
/** A whole piece cut off a thing: uid `${thing}.p${n}`, spec its index in the object's pieces. */
const piece = (thing: string, n: number, grade: string, g: number, spec: number): Piece => ({ uid: `${thing}.p${n}`, grade, g, from: thing, spec });
const ground = (p: Piece, pile: string, k: number, claim: string | null = null): GroundPiece => ({ ...p, pile, k, claim });
const crewOf = (id: string, o: Partial<CrewMember>): CrewMember => ({ id, role: id.split('.')[0] as CrewMember['role'], slot: Number(id.split('.')[1]) || 0, name: 0, level: 1, job: 'idle', phase: 'wait', from: { place: 'scalehouse' }, to: { place: 'scalehouse' }, t0: 0, t1: 0, carries: null, load: [], claims: [], cut: null, ...o });
const nearThing = (things: ThingState[], uid: string) => {
  const th = things.find((x) => x.uid === uid)!;
  const p = thingPos(C, th.at);
  return { x: p.x + 0.6, y: p.y + 0.5 };
};
const bbRatio = Math.round(P('bb') / P('li'));

function fresh(): SalvageState {
  return freshSalvage(CFG, FIXTURE_NOW);
}

/**
 * Minute 5. Mass: d0 (a washer) cut by the boss and sold (li 20, mot 5, waste 15); bundle1's cable
 * stripped (bb 6.3, no2 0.7, PVC 3 to waste); Z1.washer.1 cut and sold (li 20, mot 5, waste 15);
 * Z1.washer.0 cut whole and on the load with Z1.cable.3 and Z1.taps.4 (40 kg: the sack is full); d2 (a
 * cable bundle) carried whole by the yard hand and weighed in (the lot in the bays); the merchant away
 * with the lot of ticket 10; the yard hand walking to the drop-off for d1 (a whole washer, E4).
 */
function m5(): FixtureState {
  const s = fresh();
  const t = 300;
  const things = s.things
    .filter((th) => !['d0', 'bundle1.cable.0', 'Z1.washer.1', 'Z1.washer.0', 'Z1.cable.3', 'Z1.taps.4'].includes(th.uid))
    .concat([
      { uid: 'd1', obj: 'washer', at: { at: 'dropoff', slot: 0 }, cut: 0, progress: 0, by: 'hand.0' },
      { uid: 'd3', obj: 'radiator', at: { at: 'dropoff', slot: 1 }, cut: 0, progress: 0, by: null },
    ]);
  const lot = [line('li', 20000), line('mot', 5000, { n: 1 })];
  const tickets: Ticket[] = [
    slip(1, 0, 'washer'),
    slip(2, 20, 'washer'),
    weighIn(3, 22, 'boss', [line('li', 20000), line('mot', 5000, { n: 1 })]),
    collection(4, 25, [line('li', 20000), line('mot', 5000, { n: 1 })], true, ['li', 'mot']),
    weighIn(5, 90, 'boss', [line('bb', 6300), line('no2', 700)], { key: 'lesson.bb', args: { n: { n: bbRatio } } }),
    collection(6, 93, [line('bb', 6300), line('no2', 700)], true, ['bb', 'no2']),
    slip(7, 120, 'cable'),
    slip(8, 220, 'radiator'),
    weighIn(9, 282, 'boss', lot),
    collection(10, 285, lot, true),
    weighIn(11, 296, 'hand.0', [line('cab', 10000)]),
  ];
  const paid = 2 * total(lot) + total([line('bb', 6300), line('no2', 700)]);
  const hand = crewOf('hand.0', { job: 'wholeThing', phase: 'walkTo', from: { place: 'scale' }, to: { thing: 'd1' }, t0: 298, t1: 301, claims: ['d1'] });
  return {
    cash: r2(paid - 50 - 100),
    playSeconds: t,
    lifetimeEarnings: paid,
    salvage: {
      ...s,
      t,
      clock: { ...s.clock, highMs: FIXTURE_NOW + t * 1000 },
      owned: ['sack'],
      carrier: 'sack',
      load: [piece('Z1.washer.0', 0, 'li', 10000, 0), piece('Z1.washer.0', 1, 'li', 10000, 0), piece('Z1.washer.0', 2, 'mot', 5000, 1), piece('Z1.cable.3', 0, 'cab', 10000, 0), piece('Z1.taps.4', 0, 'brs', 5000, 0)],
      presence: { ...nearThing(s.things, 'Z1.washer.0'), driving: false, moving: false, standingFor: 1.2, heading: 0 },
      presenceAt: t - 0.05,
      act: { kind: 'none', target: null, since: t - 1, endsAt: null },
      things,
      pieces: [],
      waste_g: 15000 + 3000 + 15000 + 15000,
      bays: { li: bay(0), mot: bay(0), bb: bay(0), no2: bay(0), cab: bay(10000) },
      crew: [hand],
      merchant: { phase: 'away', since: 285, endsAt: 305, lot: lot.map((l) => ({ grade: l.grade, g: l.g, n: l.n, price: l.price, amount: l.amount })) },
      dropoff: { nextAt: 320, n: 4 },
      foreman: { day: DAY, used_s: 0, lastWorkAt: t - 1 },
      ladder: { supplied_g: 57000, worth: { lightiron: 20, copper: r2(6.3 * C.grades.bb.pbar + 0.7 * C.grades.no2.pbar) }, rung: 1, passed: 0 },
      goals: { done: ['takeWasher', 'weighIt', 'stripCable', 'buySack', 'hireHand'], skipped: [], lastPromptAt: 150, repeats: 0 },
      lessonsSeen: ['bb'],
      seen: { places: ['dropoff', 'scale', 'stripper', 'rack', 'office'], cards: ['rack', 'rota'] },
      tickets,
      ticketNo: 12,
      income: { minute: 5, buckets: [total([line('bb', 6300), line('no2', 700)]), 0, 0, 2 * total(lot), 0] },
    },
  };
}

/**
 * Minute 15: rung 2 just reached (the rung event and the deal's offer wait in FIXTURE_EVENTS.m15). The
 * boss drives the truck with the farm's trial skip, weighed in on the weighbridge, to the tipping floor;
 * the farm's next skip fills; the powered stripper has filled its tray and stands.
 */
function m15(): FixtureState {
  const s = fresh();
  const t = 900;
  const trialMass = Object.entries(C.partners.partnerFarm.trial).reduce((a, [o, n]) => a + C.objects[o].gross_g * n, 0);
  const lot = [line('li', 120000), line('ci', 60000), line('bb', 14000), line('no2', 2000)];
  const tickets: Ticket[] = [
    slip(30, 820, 'washer'),
    weighIn(31, 830, 'boss', [line('ci', 30000)], { key: 'lesson.ci' }),
    weighIn(32, 840, 'hand.0', [line('li', 40000)]),
    collection(33, 845, lot, true),
    collection(34, 870, [line('li', 20000)], false),
    { ...base(35, 885), kind: 'skipWeighIn', partner: 'partnerFarm', trial: true, gross_g: 6_000_000 + trialMass, tare_g: 6_000_000, net_g: trialMass, paid: C.partners.partnerFarm.trialPrice, things: Object.entries(C.partners.partnerFarm.trial).map(([obj, n]) => ({ obj, n })) },
  ];
  const wb = pointOf(C, 'weighbridge');
  return {
    cash: 640,
    playSeconds: t,
    lifetimeEarnings: 2400,
    salvage: {
      ...s,
      t,
      clock: { ...s.clock, highMs: FIXTURE_NOW + t * 1000 },
      owned: ['sack', 'sledge', 'truck', 'stripper'],
      tier: 2,
      carrier: 'sack',
      presence: { x: wb.x, y: wb.y + 3, driving: true, moving: true, standingFor: 0, heading: 0 },
      presenceAt: t - 0.05,
      act: { kind: 'drive', target: null, since: 886, endsAt: null },
      things: s.things.filter((th) => !['d0', 'bundle1.cable.0', 'Z1.washer.0', 'Z1.washer.1', 'Z1.cable.3', 'Z1.taps.4', 'Z2.radiator.0'].includes(th.uid)),
      waste_g: 60000,
      bays: { li: bay(0), ci: bay(0), bb: bay(0), no2: bay(0), mot: bay(5000, { n: 1 }) },
      machines: {
        ...s.machines,
        stripper: { owned: true, level: 1, hopper: [], work: null, tray_g: { bb: 18000, no2: 2000 }, trayClaim_g: {}, status: 'trayFull', since: 700 },
      },
      crew: [crewOf('hand.0', { name: 0, job: 'idle', phase: 'wait', from: { place: 'scalehouse' }, to: { place: 'scalehouse' }, t0: 842, t1: 842 })],
      partners: {
        partnerFarm: { open: true, trialUsed: true, level: 1, skips: [{ slot: 0, phase: 'filling', setAt: 880, fullAt: 880 + C.partners.partnerFarm.fill_s, contents: { ...C.partners.partnerFarm.skip }, mass_g: C.partners.partnerFarm.skipMass_kg * 1000, price: C.partners.partnerFarm.skipPrice, priceDay: DAY, trial: false, n: 1 }] },
        partnerDemolition: s.partners.partnerDemolition,
      },
      truck: { owned: true, x: wb.x, y: wb.y + 3, heading: 0, skip: { partner: 'partnerFarm', slot: 0, contents: { ...C.partners.partnerFarm.trial }, mass_g: trialMass, price: C.partners.partnerFarm.trialPrice, trial: true, weighed: true }, by: 'boss', trip: null, hookSince: null, earmark: null },
      merchant: { phase: 'waiting', since: 893, endsAt: null, lot: [] },
      dropoff: { nextAt: 920, n: 9 },
      deal: { step: 0, phase: 'offered', q_g: 0, days: 0, price: 0, delivered: 0, trust: C.deal.trust.start, last: null },
      foreman: { day: DAY, used_s: 600, lastWorkAt: 880 },
      ladder: { supplied_g: 2_010_000, worth: { lightiron: 300, castiron: 200, copper: 1500 }, rung: 2, passed: 3 },
      goals: { done: ['takeWasher', 'weighIt', 'stripCable', 'buySack', 'hireHand', 'buySledge', 'supplyRung2'], skipped: [], lastPromptAt: 850, repeats: 0 },
      lessonsSeen: ['bb', 'ci'],
      seen: { places: ['dropoff', 'scale', 'stripper', 'rack', 'office', 'park', 'weighbridge'], cards: ['rack', 'rota', 'machine', 'park'] },
      tickets,
      ticketNo: 36,
      income: { minute: 15, buckets: [120, 90, 160, total(lot) + 10, 0] },
    },
  };
}

/** Minute 30 (see the header). The first heat waits at "Ready to pour"; the boss cuts the car's fourth wheel with two radiator pieces on his trolley. */
function m30(): FixtureState {
  const s = fresh();
  const t = 1800;
  const gone = ['d0', 'bundle1.cable.0', 'Z1.washer.0', 'Z1.washer.1', 'Z1.cable.3', 'Z1.taps.4', 'Z2.radiator.0', 'Z3.beam.0'];
  const things: ThingState[] = s.things
    .filter((th) => !gone.includes(th.uid))
    .map((th) => (th.uid === 'Z3.car.2' ? { ...th, cut: 3, progress: 0.1, by: 'boss' } : th.uid === 'Z2.radiator.1' ? { ...th, cut: 2 } : th))
    .concat([
      { uid: 'd5', obj: 'washer', at: { at: 'dropoff', slot: 0 }, cut: 0, progress: 0, by: 'cutter.0' },
      { uid: 'd6', obj: 'radiator', at: { at: 'dropoff', slot: 1 }, cut: 0, progress: 0, by: null },
      { uid: 'f0', obj: 'washer', at: { at: 'floor', slot: 0 }, cut: 0, progress: 0, by: null },
      { uid: 'f1', obj: 'radiator', at: { at: 'floor', slot: 1 }, cut: 0, progress: 0, by: null },
    ]);
  const car = 'Z3.car.2';
  const lot = [line('bb', 21000), line('li', 160000), line('brs', 4000), line('no2', 2000)];
  const farm = C.partners.partnerFarm;
  const cut = C.objects.car.pieces[0];
  const cutLen = Math.max(C.cut.minS, ((cut[1] as number) / 1000) * C.objects.car.h / C.tools.torch.P);
  const tickets: Ticket[] = [
    { ...base(38, 1500), kind: 'skipWeighIn', partner: 'partnerFarm', trial: false, gross_g: 6_000_000 + farm.skipMass_kg * 1000, tare_g: 6_000_000, net_g: farm.skipMass_kg * 1000, paid: farm.skipPrice, things: Object.entries(farm.skip).map(([obj, n]) => ({ obj, n })) },
    weighIn(39, 1700, 'boss', [line('hms', 80000), line('alw', 10000)]),
    collection(40, 1703, [line('hms', 80000), line('alw', 10000)], true, ['hms', 'alw']),
    weighIn(41, 1792, 'boss', lot),
    collection(42, 1795, lot, true),
    weighIn(43, 1798, 'hand.0', [line('li', 20000)]),
  ];
  return {
    cash: 2480,
    playSeconds: t,
    lifetimeEarnings: 9300,
    salvage: {
      ...s,
      t,
      clock: { ...s.clock, highMs: FIXTURE_NOW + t * 1000 },
      owned: ['sack', 'sledge', 'trolley', 'truck', 'stripper', 'bench', 'crucible', 'torch'],
      tier: 3,
      carrier: 'trolley',
      load: [piece('Z2.radiator.1', 0, 'ci', 10000, 0), piece('Z2.radiator.1', 1, 'ci', 10000, 0)],
      presence: { ...nearThing(s.things, car), driving: false, moving: false, standingFor: 2.4, heading: 3 },
      presenceAt: t - 0.05,
      act: { kind: 'work', target: car, since: t - 0.2, endsAt: t - 0.2 + cutLen - 0.1 },
      things,
      pieces: [
        ground(piece(car, 0, 'alw', 10000, 0), `beside.${car}`, 0),
        ground(piece(car, 1, 'alw', 10000, 0), `beside.${car}`, 1),
        ground(piece(car, 2, 'alw', 10000, 0), `beside.${car}`, 2),
        ground(piece('f2', 1, 'li', 10000, 0), 'floor', 1),
        ground(piece('Z1.washer.1', 0, 'li', 10000, 0), 'circle.0', 0),
      ],
      waste_g: 120000,
      bays: { li: bay(20000), ci: bay(260000, { held: true, forDeal_g: 60000 }), hms: bay(0), brs: bay(0), bb: bay(0), no2: bay(0), alw: bay(0), bri: bay(0) },
      machines: {
        hand_stripper: { ...s.machines.hand_stripper, status: 'idle' },
        stripper: { owned: true, level: 2, hopper: [piece('d4', 0, 'cab', 10000, 0)], work: { piece: piece('d3', 0, 'cab', 10000, 0), startAt: t - 1, rate_kg_s: 5 * 1.1, credited: { bb: 3000, no2: 300 } }, tray_g: { bb: 9000, no2: 1000 }, trayClaim_g: {}, status: 'working', since: 700 },
        bench: { owned: true, level: 1, hopper: [piece('f2', 2, 'mot', 5000, 1)], work: { piece: piece('f3', 2, 'mot', 5000, 1), startAt: t - 1, rate_kg_s: 2, credited: { no2: 200, li: 1600, alcast: 200 } }, tray_g: { no2: 1000, li: 8000, alcast: 1000 }, trayClaim_g: {}, status: 'working', since: 900 },
        crucible: { ...s.machines.crucible, owned: true, level: 1, status: 'idle', since: 1400, recipe: 'brass', fromBays: true, charge_g: 20000, heel_g: 0, phase: 'ready', phaseSince: t - 30, endsAt: null, lastFeedAt: 1700, firstPoured: false, cooling: null },
      },
      crew: [
        crewOf('hand.0', { name: 0, level: 2, job: 'floor', phase: 'walkTo', from: { pile: 'floor', k: 0 }, to: { place: 'scale' }, t0: t - 1, t1: t + 4, carries: 'li', load: [piece('f2', 0, 'li', 10000, 0)] }),
        crewOf('cutter.0', { name: 1, level: 2, job: 'cutDropoff', phase: 'work', from: { thing: 'd5' }, to: { thing: 'd5' }, t0: t - 6, t1: t + 4, cut: { thing: 'd5', whole: true } }),
        crewOf('driver.0', { name: 2, level: 1, job: 'drive', phase: 'wait', from: { truck: true }, to: { truck: true }, t0: t - 8, t1: t - 8 }),
      ],
      partners: {
        partnerFarm: {
          open: true,
          trialUsed: true,
          level: 2,
          skips: [
            { slot: 0, phase: 'full', setAt: 1200, fullAt: 1500, contents: { ...farm.skip }, mass_g: farm.skipMass_kg * 1000, price: farm.skipPrice, priceDay: DAY, trial: false, n: 3 },
            { slot: 1, phase: 'filling', setAt: 1595, fullAt: 1895, contents: { ...farm.skip }, mass_g: farm.skipMass_kg * 1000, price: farm.skipPrice, priceDay: DAY, trial: false, n: 4 },
          ],
        },
        partnerDemolition: { ...s.partners.partnerDemolition, open: true, level: 1 },
      },
      truck: { owned: true, x: 56, y: 36, heading: 2, skip: null, by: 'driver', trip: { partner: 'partnerFarm', slot: 0, phase: 'out', t0: t - 8, endsAt: t + 12 }, hookSince: null, earmark: { money: farm.skipPrice, floor_g: farm.skipMass_kg * 1000 } },
      merchant: { phase: 'away', since: 1795, endsAt: 1815, lot: lot.map((l) => ({ grade: l.grade, g: l.g, price: l.price, amount: l.amount })) },
      dropoff: { nextAt: t + 12, n: 7 },
      deal: { step: 0, phase: 'running', q_g: 100000, days: 3, price: r2(C.grades.ci.pbar * 1.1), delivered: 0, trust: 50, last: null },
      foreman: { day: DAY, used_s: 1400, lastWorkAt: t - 1 },
      ladder: { supplied_g: 6_200_000, worth: { lightiron: 800, castiron: 900, steel: 300, copper: 4100, brass: 600, alu: 40 }, rung: 2, passed: 5 },
      goals: { done: ['takeWasher', 'weighIt', 'stripCable', 'buySack', 'hireHand', 'buySledge', 'supplyRung2', 'signDeal'], skipped: [], lastPromptAt: 1650, repeats: 0 },
      lessonsSeen: ['li', 'bb', 'mot', 'cab', 'brs', 'ci', 'no2'],
      seen: { places: ['dropoff', 'scale', 'stripper', 'rack', 'office', 'park', 'weighbridge', 'bench', 'crucible', 'scalehouse', 'bays', 'noticeboard', 'floor'], cards: ['rack', 'rota', 'machine', 'park', 'board', 'partners', 'processBoard', 'table', 'deal'] },
      tickets,
      ticketNo: 44,
      income: { minute: 30, buckets: [410, 380, 520, total([line('hms', 80000), line('alw', 10000)]), total(lot)] },
    },
  };
}

/** After 3 h 12 m away (see the header): advanced by hand to a state the away pass reaches. */
function back(): FixtureState {
  const b = m30();
  const A = 3 * 3600 + 12 * 60;
  const t = b.salvage.t + A;
  const card: AwayCard = {
    seconds: A,
    capS: C.awayCap_h[0] * 3600,
    lines: [
      { grade: 'li', g: 410000, money: 205 },
      { grade: 'bb', g: 31000, money: 1085 },
      { grade: 'ci', g: 120000, money: 120 },
      { grade: 'no2', g: 4000, money: 120 },
      { grade: 'hms', g: 60000, money: 60 },
      { grade: 'bri', g: 15000, money: 375 },
    ],
    supplied_g: 1_900_000,
    money: 1965,
    loads: 2,
    deliveries: 0,
    passed: ['rival.6'],
    hint: { key: 'away.hintHand' },
  };
  const s = b.salvage;
  const farm = C.partners.partnerFarm;
  return {
    cash: b.cash + card.money,
    playSeconds: b.playSeconds,
    lifetimeEarnings: b.lifetimeEarnings + card.money,
    salvage: {
      ...s,
      t,
      epoch: s.epoch + 1,
      clock: { ...s.clock, highMs: s.clock.highMs + A * 1000 },
      act: { kind: 'none', target: null, since: t, endsAt: null },
      presence: { ...s.presence, moving: false, standingFor: 0 },
      presenceAt: b.salvage.t,
      things: s.things
        .filter((th) => !['d5', 'd6', 'f0', 'f1'].includes(th.uid))
        .map((th) => (th.by === 'boss' ? { ...th, by: null } : th))
        .concat([
          { uid: 'd40', obj: 'washer', at: { at: 'dropoff', slot: 0 }, cut: 0, progress: 0, by: 'cutter.0' },
          { uid: 'd41', obj: 'radiator', at: { at: 'dropoff', slot: 1 }, cut: 0, progress: 0, by: null },
          { uid: 'd42', obj: 'washer', at: { at: 'dropoff', slot: 2 }, cut: 0, progress: 0, by: null },
          { uid: 'd43', obj: 'cable', at: { at: 'dropoff', slot: 3 }, cut: 0, progress: 0, by: null },
        ]),
      pieces: s.pieces.filter((p) => p.pile !== 'floor' && p.pile !== 'circle.0'),
      bays: { ...s.bays, li: s.bays.li && { ...s.bays.li, g: 0 }, ci: { ...s.bays.ci, g: 380000, forDeal_g: 100000 }, bri: { ...s.bays.bri, g: 0 } },
      machines: {
        ...s.machines,
        stripper: { ...s.machines.stripper, hopper: [], work: null, tray_g: {}, status: 'idle' },
        bench: { ...s.machines.bench, hopper: [], work: null, tray_g: {}, status: 'waiting' },
        crucible: { ...s.machines.crucible, status: 'working', charge_g: 15000, heel_g: 3000, phase: 'heating', phaseSince: t - 20, endsAt: t + 20, lastFeedAt: t - 25, firstPoured: true, cooling: null },
      },
      crew: [
        crewOf('hand.0', { name: 0, level: 2, job: 'idle', phase: 'wait', from: { place: 'scalehouse' }, to: { place: 'scalehouse' }, t0: t - 30, t1: t - 30 }),
        crewOf('cutter.0', { name: 1, level: 2, job: 'cutDropoff', phase: 'work', from: { thing: 'd40' }, to: { thing: 'd40' }, t0: t - 3, t1: t + 7, cut: { thing: 'd40', whole: true } }),
        crewOf('driver.0', { name: 2, level: 1, job: 'idle', phase: 'wait', from: { place: 'park' }, to: { place: 'park' }, t0: t - 200, t1: t - 200 }),
      ],
      partners: {
        ...s.partners,
        partnerFarm: {
          ...s.partners.partnerFarm,
          skips: [
            { slot: 0, phase: 'filling', setAt: t - 120, fullAt: t - 120 + farm.fill_s, contents: { ...farm.skip }, mass_g: farm.skipMass_kg * 1000, price: farm.skipPrice, priceDay: DAY, trial: false, n: 6 },
            { slot: 1, phase: 'full', setAt: t - 400, fullAt: t - 100, contents: { ...farm.skip }, mass_g: farm.skipMass_kg * 1000, price: farm.skipPrice, priceDay: DAY, trial: false, n: 5 },
          ],
        },
      },
      truck: { ...s.truck, x: 56, y: 36, heading: 0, by: null, trip: null, earmark: null, skip: null },
      merchant: { phase: 'waiting', since: t - 40, endsAt: null, lot: [] },
      dropoff: { nextAt: t + 30, n: 44 },
      ladder: { ...s.ladder, supplied_g: s.ladder.supplied_g + card.supplied_g, passed: 6 },
      goals: { ...s.goals, done: [...s.goals.done, 'pourFirst'] },
      tickets: [...s.tickets, collection(44, t - 40, [line('li', 410000), line('bb', 31000), line('ci', 120000), line('no2', 4000), line('hms', 60000)], false)],
      ticketNo: 45,
      away: card,
      beenAway: true,
      income: { minute: Math.floor(t / 60), buckets: [300, 280, 0, 310, 0] },
    },
  };
}

/** The five frozen states (frozen objects: copy before changing; the store's updates copy anyway). */
export const FIXTURE_STATES: Readonly<Record<FixtureName, FixtureState>> = deepFreeze({
  fresh: { cash: 0, playSeconds: 0, lifetimeEarnings: 0, salvage: fresh() },
  m5: m5(),
  m15: m15(),
  m30: m30(),
  back: back(),
});

const lastTicket = (n: FixtureName, kind: Ticket['kind']) => [...FIXTURE_STATES[n].salvage.tickets].reverse().find((x) => x.kind === kind)!;

/**
 * Events the preview emits ONCE after a preset loads (the screens' tickets, chips, cards and sounds can
 * be looked at without playing): m5 a crew weigh-in chip and a collection; m15 the rung sign, the
 * deal's offer, the skip ticket and a skip refusal; m30 a weigh-in with its lesson, a collection, a
 * refused purchase; back the away report and a deal delivery ticket.
 */
export const FIXTURE_EVENTS: Readonly<Record<FixtureName, readonly SalvageEvent[]>> = deepFreeze({
  fresh: [],
  m5: [
    { type: 'weighIn', ticket: lastTicket('m5', 'weighIn'), pieces: ['d2.p0'], by: 'hand.0' },
    { type: 'collected', ticket: lastTicket('m5', 'collection'), first: false },
  ],
  m15: [
    { type: 'rung', n: 2 },
    { type: 'dealOffered', step: 0 },
    { type: 'bridgeWeighIn', ticket: lastTicket('m15', 'skipWeighIn') },
    { type: 'refused', key: 'loadCash', args: { x: { money: 100 } }, retry: null },
  ],
  m30: [
    { type: 'weighIn', ticket: weighIn(44, 1800, 'boss', [line('ci', 20000)], { key: 'lesson.ci' }), pieces: ['Z2.radiator.1.p0', 'Z2.radiator.1.p1'], by: 'boss' },
    { type: 'lesson', grade: 'ci', text: { key: 'lesson.ci' } },
    { type: 'collected', ticket: lastTicket('m30', 'collection'), first: true },
    { type: 'refused', key: 'cash', args: { x: { money: 120 } }, retry: null },
  ],
  back: [
    { type: 'awayReport', card: FIXTURE_STATES.back.salvage.away! },
    { type: 'dealDelivered', ticket: { ...base(46, FIXTURE_STATES.back.salvage.t), kind: 'dealDelivery', buyer: 'foundry', grade: 'ci', g: 100000, paid: r2(100 * C.grades.ci.pbar * 1.1) } },
  ],
});

/**
 * A frozen state laid over a shared state (`base`, e.g. economy.createInitialState(cfg, now)). The
 * salvage state is copied (structuredClone), so the caller may change it; its epoch is bumped (the
 * world snaps). The market clock's high mark moves to `now` when given, so a preset loaded today stays
 * on today's board.
 */
export function fixtureGame(name: FixtureName, base: GameState, now?: number): SalvageGame {
  const f = FIXTURE_STATES[name];
  const salvage = structuredClone(f.salvage) as SalvageState;
  salvage.epoch += 1;
  if (now !== undefined) salvage.clock = { ...salvage.clock, highMs: Math.max(now, salvage.clock.highMs) };
  return { ...base, cash: f.cash, lifetimeEarnings: f.lifetimeEarnings, runEarnings: f.lifetimeEarnings, stats: { ...base.stats, playSeconds: f.playSeconds }, salvage };
}
