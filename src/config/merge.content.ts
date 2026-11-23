/**
 * The merge mode's starting content (Night Market; docs/design/market-design.md 2.2 and the lead's
 * decisions of section 11): every name and starting value of the `merge` block, as the
 * specification gives them, until scripts/content/build-night.py writes the tuned block into
 * games/night-market/game.json. A merge-mode file (scripts/lib/modes.js MODE_FOLDERS.merge): no other
 * game's bundle carries it.
 *
 * Owned by the numbers package (docs/design/market-build-plan.md); the fields and their ranges are
 * in ./schema.merge.ts (the rules package MECHANICS). Split from the schema by the skeleton so the
 * two packages never edit one file.
 */
import type { MergeContentInput } from './schema.merge';

const BOARD_W = 7;
const cell = (row: number, col: number) => row * BOARD_W + col;
const rowCells = (row: number, cols: number[]) => cols.map((c) => cell(row, c));
const COLS_0_5 = [0, 1, 2, 3, 4, 5];

/**
 * The specification's starting content (2.2, 2.7, 2.8, 2.11, 5.3 with Decision M5, 5.5, 5.7, and
 * Decisions M13 to M15). Names are original (spec 2.2). The fixtures (src/engine/fixtures/merge.ts)
 * and the placeholder games/night-market/game.json use it as it is.
 */
export const MERGE_STARTING_CONTENT: MergeContentInput = {
  chains: [
    {
      id: 'grill',
      name: 'Grill',
      gear: 'Ember Grill',
      tiers: ['Pepper Skewer', 'Twin Skewer', 'Glazed Skewer', 'Skewer Bundle', 'Skewer Fan', 'Ember Plate', 'Smoke Platter', 'Dragon Grill Board'],
      minder: { name: 'Old Brindle', beast: 'badger' },
    },
    {
      id: 'tea',
      name: 'Tea',
      gear: 'Copper Urn',
      tiers: ['Tea Leaf', 'Cup of Tea', 'Milk Tea', 'Pearl Tea', 'Tea Flight', 'Tea Tray', 'Moon Teapot', 'Midnight Tea Set'],
      minder: { name: 'Pim', beast: 'owl' },
    },
    {
      id: 'steamer',
      name: 'Steamer',
      gear: 'Bamboo Steamer',
      tiers: ['Dough Ball', 'Dumpling', 'Dumpling Pair', 'Steamer Basket', 'Double Basket', 'Steamer Stack', 'Lantern Stack', 'Jade Pagoda'],
      minder: { name: 'Nettle', beast: 'hedgehog' },
    },
    {
      id: 'sweets',
      name: 'Sweets',
      gear: 'Sugar Pan',
      tiers: ['Sugar Drop', 'Candied Berry', 'Berry Stick', 'Candy Posy', 'Honey Cake', 'Cake Stack', 'Lantern Cake', 'Festival Cake'],
      minder: { name: 'Juniper', beast: 'otter' },
    },
    {
      id: 'noodles',
      name: 'Noodles',
      gear: 'Noodle Wok',
      tiers: ['Noodle Nest', 'Noodle Cup', 'Broth Bowl', 'Topped Bowl', 'Big Bowl', 'Family Bowl', 'Long-Life Bowl', 'Thousand-Thread Pot'],
      minder: { name: 'Tansy', beast: 'raccoon' },
    },
    {
      id: 'puffs',
      name: 'Puffs',
      gear: 'Lantern Pan',
      tiers: ['Puff Drop', 'Twin Puffs', 'Sesame Puff', 'Puff Cone', 'Puff Basket', 'Golden Heap', 'Sun Platter', 'Paper Moon Tower'],
      minder: { name: 'Marlo', beast: 'bat' },
      fromSeason: 1,
    },
  ],
  values: { base: 5, chainStep: 4, tierGrowth: 2.4 },
  board: {
    cols: 7,
    rows: 8,
    open: [2, 3, 4, 5, 6].flatMap((r) => rowCells(r, COLS_0_5)),
    shutterGroups: [
      { cells: rowCells(7, COLS_0_5), condition: { type: 'tierMade', chain: 0, tier: 3 } },
      { cells: [0, 1, 2, 3, 4, 5, 6, 7].map((r) => cell(r, 6)), condition: { type: 'chainOpen', chain: 2 } },
      { cells: rowCells(1, COLS_0_5), condition: { type: 'chainOpen', chain: 3 } },
      { cells: rowCells(0, COLS_0_5), condition: { type: 'chainOpen', chain: 4 } },
    ],
    shutterBase: 30,
    shutterGrowth: 1.45,
    goodEvery: 3,
    goodFirst: 2,
    goodNearShare: 0.6,
  },
  costs: {
    stallBase: 100,
    stallRatio: 12,
    gearBase: 20,
    gearGrowth: 1.45,
    gearMaxLevel: 41,
    stallLevelBase: 50,
    stallLevelGrowth: 1.35,
    stallMaxLevel: 31,
    minderBase: 150,
    minderGrowth: 3,
    minderMaxLevel: 4,
    roundBelow: 1000,
    sigDigits: 3,
  },
  gear: { interval: 5, step: 10, ripePerLevel: 0.05, ripeMax: 0.6, maxBase: 4, shelf: 6, looseCap: 4, release: 0.5 },
  stalls: { bonusPerLevel: 0.1, bonusMax: 3.9, awningLevels: [5, 10, 20] },
  minders: { interval: 15, tillRoll: 60 },
  merges: { luckyOdds: 25 },
  basket: { share: 0.25, undoSeconds: 4 },
  tickets: {
    counters: 2,
    refillDelay: 4,
    lineOddsEarly: [0.6, 0.35, 0.05],
    lineOddsLate: [0.45, 0.4, 0.15],
    lateFrom: 1800,
    topChainWeight: 3,
    gamma: 1,
    stretch: 0.15,
    beta: 0.15,
    outputWindow: 180,
    handActions: 60,
    spareCells: 6,
    notTonightCooldown: 30,
    customers: ['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl'],
    coats: 3,
  },
  parade: { every: 600, first: 360, multiplier: 2, lines: 3, outputWindow: 360, handActions: 100 },
  festival: [
    [
      { chain: 0, tier: 8 },
      { chain: 1, tier: 8 },
      { chain: 2, tier: 6 },
      { chain: 4, tier: 5 },
    ],
    [
      { chain: 0, tier: 8 },
      { chain: 1, tier: 8 },
      { chain: 2, tier: 6 },
      { chain: 4, tier: 5 },
      { chain: 5, tier: 4 },
    ],
  ],
  festivalPace: 30,
  gift: { every: 10, slots: 3, odds: { coins: 0.5, good: 0.35, spark: 0.15 }, goodSteps: [2, 3, 4], goodOdds: [0.6, 0.3, 0.1], coinPace: 3 },
  lanterns: [
    { n: 1, feat: { type: 'tickets', count: 3 }, effect: { type: 'counters', value: 3 }, isNew: true },
    { n: 2, feat: { type: 'tickets', count: 25 }, effect: { type: 'basketShare', value: 0.4 } },
    { n: 3, feat: { type: 'tierMade', tier: 6 }, effect: { type: 'shelfCap', value: 8 } },
    { n: 4, feat: { type: 'tickets', count: 100 }, effect: { type: 'counters', value: 4 }, isNew: true },
    { n: 5, feat: { type: 'discover', count: 30 }, effect: { type: 'paradeEvery', value: 480 }, isNew: true },
    { n: 6, feat: { type: 'tierMade', tier: 8 }, effect: { type: 'awayHours', value: 2 } },
    { n: 7, feat: { type: 'merges', count: 1000 }, effect: { type: 'luckyOdds', value: 20 } },
    { n: 8, feat: { type: 'seasonsClosed', count: 1 }, effect: { type: 'startOpen', chain: 1 }, isNew: true },
    { n: 9, feat: { type: 'ladderComplete' }, effect: { type: 'seasonedSteps', value: 1 } },
    { n: 10, feat: { type: 'parades', count: 50 }, effect: { type: 'paradeMultiplier', value: 2.5 } },
    { n: 11, feat: { type: 'allMinders' }, effect: { type: 'mindersStartHired' }, isNew: true },
    { n: 12, feat: { type: 'tickets', count: 500 }, effect: { type: 'ripeAdd', value: 0.05 } },
    { n: 13, feat: { type: 'threeLineTickets', count: 50 }, effect: { type: 'betaAdd', value: 0.1 } },
    // Decision M5: no Pocket; lantern 14 gives a fourth gift-box slot (new), lantern 16 Lucky 1 in 16.
    { n: 14, feat: { type: 'allShutters' }, effect: { type: 'giftSlots', value: 4 }, isNew: true },
    { n: 15, feat: { type: 'seasonsClosed', count: 3 }, effect: { type: 'minderIntervalMult', value: 0.8 } },
    { n: 16, feat: { type: 'tickets', count: 2000 }, effect: { type: 'luckyOdds', value: 16 } },
    { n: 17, feat: { type: 'discover', count: 48 }, effect: { type: 'sparkTiers', value: 2 } },
    { n: 18, feat: { type: 'seasonsClosed', count: 8 }, effect: { type: 'festivalPurseMult', value: 2 } },
    { n: 19, feat: { type: 'parades', count: 100 }, effect: { type: 'giftEvery', value: 8 } },
    { n: 20, feat: { type: 'tier8sInSeason', count: 10 }, effect: { type: 'ticketPay', value: 1.05 } },
  ],
  seasons: {
    table: [
      { name: 'Spring Lanterns', shape: 'rectangle', character: 'none' },
      { name: 'Summer Fireflies', shape: 'rectangle', character: 'fireflies' },
      { name: 'Autumn Moon', shape: 'moonGate', character: 'harvest' },
      { name: 'Winter Embers', shape: 'hearth', character: 'warmGear' },
      { name: 'Second Spring', shape: 'rectangle', character: 'lateCrowd' },
      { name: 'Second Summer', shape: 'moonGate', character: 'marketDay' },
      { name: 'Second Autumn', shape: 'hearth', character: 'fireflies' },
      { name: 'Second Winter', shape: 'rectangle', character: 'harvest' },
      { name: 'Third Spring', shape: 'moonGate', character: 'warmGear' },
      { name: 'Third Summer', shape: 'hearth', character: 'lateCrowd' },
      { name: 'Third Autumn', shape: 'rectangle', character: 'marketDay' },
      { name: 'Third Winter', shape: 'moonGate', character: 'fireflies' },
      { name: 'Fourth Spring', shape: 'hearth', character: 'harvest' },
      { name: 'Fourth Summer', shape: 'rectangle', character: 'warmGear' },
      { name: 'Fourth Autumn', shape: 'moonGate', character: 'lateCrowd' },
      { name: 'Fourth Winter', shape: 'hearth', character: 'marketDay' },
    ],
    repeatFrom: 1,
    moonGateCells: [cell(3, 2), cell(3, 3)],
    fireflies: { luckyOdds: 12 },
    harvest: { threeLineShare: 0.25, betaAdd: 0.1 },
    warmGear: { ripeAdd: 0.15 },
    lateCrowd: { minderIntervalMult: 0.67 },
    marketDay: { paradeEvery: 300 },
    stepTier: 6,
    maxSteps: 3,
    levelsPerStep: 10,
    familiarBase: 0.85,
    familiarMax: 4,
    openingGoods: 4,
  },
  ads: { fillLineCooldown: 300, gearRushGoods: 6, gearRushCooldown: 900, callDragonCooldown: 1200, awayBonus: 0.5 },
  away: { capHours: 4, lateHoursHours: 4 },
  advice: { newStallPhi: 40, shutterKappa: 1 },
  products: { awnings: 'night_awnings', lateHours: 'night_late_hours', quietEvening: 'night_quiet_evening' },
};
