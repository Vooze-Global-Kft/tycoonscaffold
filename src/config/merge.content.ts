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
 * The specification's starting content (2.2, 2.7, 2.8, 2.11, 5.3 with Decision M5, 5.5, 5.7, Decisions M3,
 * M18 and M23 to M28 (T fixed at 4 s, six opening goods, the stall table, gift boxes every N tickets, the
 * Festival rows, gear level 40 the top), and
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
    // Decision M23: the stall-opening table (Tea, Steamer, Sweets, Noodles, Puffs), each × F_s.
    stallOpen: [120, 3200, 51_200, 819_000, 13_100_000],
    gearBase: 20,
    gearGrowth: 1.45,
    // Decision M28: gear level 40 is the top.
    gearMaxLevel: 40,
    stallLevelBase: 50,
    stallLevelGrowth: 1.35,
    stallMaxLevel: 31,
    minderBase: 150,
    minderGrowth: 3,
    minderMaxLevel: 4,
    roundBelow: 1000,
    sigDigits: 3,
  },
  // Decision M3: T = 4 s for every gear, a rule. Decision M50: no loose cap; gears fill the board to its last
  // `spare` cells (2, tune 1 to 4) whatever the chain.
  gear: { interval: 4, step: 10, ripePerLevel: 0.05, ripeMax: 0.6, maxBase: 4, shelf: 6, spare: 2, release: 0.5 },
  stalls: { bonusPerLevel: 0.1, bonusMax: 3.9, awningLevels: [5, 10] },
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
  // Decision M25: every row is tuned (4 to 6 lines; 2.8's ranges); season 1's starts as 2.8's lines, seasons 3
  // and 4 as the numbers prototype left them; a season past the last row uses the last row.
  // Decision M25: every row is tuned (4 to 6 lines; 2.8's ranges); season 1's starts as 2.8's lines, seasons 3
  // and 4 as the numbers prototype left them; a season past the last row uses the last row. The tuned rows are
  // MERGE_TUNED's below.
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
    [
      { chain: 0, tier: 8 },
      { chain: 1, tier: 8 },
      { chain: 2, tier: 6 },
      { chain: 4, tier: 5 },
      { chain: 5, tier: 4 },
    ],
    [
      { chain: 0, tier: 8 },
      { chain: 1, tier: 8 },
      { chain: 2, tier: 7 },
      { chain: 4, tier: 5 },
      { chain: 5, tier: 4 },
    ],
  ],
  // Decision M37: the Festival pays no coins; filling it gives Lucky Sparks.
  festivalSparks: 3,
  // Decision M24: a box every N = 25 paid tickets (tune 15 to 40), a coin slot of m × U with m = 0.5 (tune 0.25 to 1.5).
  gift: { every: 25, slots: 3, odds: { coins: 0.5, good: 0.35, spark: 0.15 }, goodSteps: [2, 3, 4], goodOdds: [0.6, 0.3, 0.1], coinPace: 0.5 },
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
    { n: 18, feat: { type: 'seasonsClosed', count: 8 }, effect: { type: 'festivalSparks', value: 5 } },
    // Decision M24: lantern 19 brings gift boxes a fifth sooner (N × 0.8), whatever N is tuned to.
    { n: 19, feat: { type: 'parades', count: 100 }, effect: { type: 'giftEveryMult', value: 0.8 } },
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
    // Decision M40: seasoned gear holds one step (two with lantern 9); N equals the gear step s (M25).
    maxSteps: 1,
    familiarBase: 0.85,
    familiarMax: 4,
    // Decision M18: the opening board holds 6 Pepper Skewers (the fox's Twin Skewer and the hedgehog's Glazed Skewer).
    openingGoods: 6,
  },
  ads: { fillLineCooldown: 300, gearRushGoods: 6, gearRushCooldown: 900, callDragonCooldown: 1200, awayBonus: 0.5 },
  away: { capHours: 4, lateHoursHours: 4 },
  advice: { newStallPhi: 40, shutterKappa: 1 },
  products: { awnings: 'night_awnings', lateHours: 'night_late_hours', quietEvening: 'night_quiet_evening' },
};

/**
 * The tuned numbers (the numbers step, 23 November 2026): every value moved from MERGE_STARTING_CONTENT, as a
 * RANGES path (src/config/schema.merge.ts) → value, each inside its range. Measured on the real engine with the
 * active bot at 2.0 s an action (Decision M30), 15 tuning seeds, checked on the five named seeds and beside it at
 * 1.5 s and 2.5 s. scripts/content/build-night.py lays these over the starting content and writes
 * games/night-market/game.json only after every hard gate passes; the starting content stays as the specification
 * gives it (the rules' tests and fixtures are built on it).
 */
export const MERGE_TUNED: Record<string, unknown> = {
  // Decision M23, gate 2 (Tea 0:45-1:30, Steamer 5-9, Sweets 18-30, Noodles 60-90 min at 2.0 s): from
  // 120 / 3,200 / 51.2K / 819K / 13.1M. Puffs at its range floor so season 2's Festival takes 0.8 to 1.1 of season 1.
  'costs.stallOpen[0]': 120,
  'costs.stallOpen[1]': 2200,
  'costs.stallOpen[2]': 28_000,
  'costs.stallOpen[3]': 600_000,
  'costs.stallOpen[4]': 6_550_000,
  // M27 (1.40 to 1.70), from 1.45: dearer gear levels put season 1's tier 7s, and so its Festival, at
  // 110 to 190 min (M31) with the slowest seed within 1.6 times the fastest (M25), without moving the stall windows.
  'costs.gearGrowth': 1.5,
  // M27 / 2.2, from 150 and 3: a dearer first hire and cheaper levels move minder income from minute 10
  // (8 to 30 %, M41) toward minutes 30 to 180 (20 to 35 %).
  'costs.minderBase': 250,
  'costs.minderGrowth': 2.5,
  // 2.7 (b), 120 to 300, from 180: smaller tickets, for gate 3's 90th percentile.
  'tickets.outputWindow': 150,
  // 2.11, 0.75 to 0.90, from 0.85 (the range floor): season 2's Noodles at 0.6 of season 1's or sooner (gate 10).
  'seasons.familiarBase': 0.75,
  // M25 with M31 and M40 (4 to 6 lines; 2.8's ranges). Season 1 asks for tier 7s of the four higher chains (a low
  // chain's tier 8 made the season chaotic, M31); season 2 adds the Puffs line at tier 3 at index 4 (RANGES
  // festival[1][4]); later rows climb to tier 8 so that seasons 3 to 10 take 45 to 90 % of season 1 on the median
  // seed (M40). A season past the last row uses the last row.
  festival: [
      [
        { chain: 1, tier: 7 },
        { chain: 2, tier: 7 },
        { chain: 3, tier: 7 },
        { chain: 4, tier: 7 },
        { chain: 4, tier: 7 },
      ],
      [
        { chain: 1, tier: 7 },
        { chain: 2, tier: 7 },
        { chain: 3, tier: 7 },
        { chain: 4, tier: 7 },
        { chain: 5, tier: 3 },
        { chain: 4, tier: 7 },
      ],
      [
        { chain: 1, tier: 8 },
        { chain: 2, tier: 8 },
        { chain: 3, tier: 7 },
        { chain: 4, tier: 7 },
        { chain: 5, tier: 5 },
        { chain: 4, tier: 7 },
      ],
      [
        { chain: 1, tier: 8 },
        { chain: 2, tier: 8 },
        { chain: 3, tier: 8 },
        { chain: 4, tier: 8 },
        { chain: 5, tier: 6 },
        { chain: 4, tier: 7 },
      ],
      [
        { chain: 1, tier: 8 },
        { chain: 2, tier: 8 },
        { chain: 3, tier: 8 },
        { chain: 4, tier: 8 },
        { chain: 5, tier: 7 },
        { chain: 4, tier: 7 },
      ],
      [
        { chain: 1, tier: 8 },
        { chain: 2, tier: 8 },
        { chain: 3, tier: 8 },
        { chain: 4, tier: 8 },
        { chain: 5, tier: 7 },
        { chain: 4, tier: 8 },
      ],
      [
        { chain: 1, tier: 8 },
        { chain: 2, tier: 8 },
        { chain: 3, tier: 8 },
        { chain: 4, tier: 8 },
        { chain: 5, tier: 8 },
        { chain: 4, tier: 8 },
      ],
  ],
};
