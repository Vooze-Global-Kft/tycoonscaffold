/**
 * Sample away cards (owner1-hud): the shapes the docket must look designed in, for the tests and the web
 * preview's dev board (`?awaySample=two|twelve|every`, src/ui/salvage/dev/CardStandIn.web.tsx). They are
 * CardData's own type (the state's AwayCard) with made-up numbers on the game's real ids; nothing here is
 * read by the rules or shipped as a state.
 */
import type { AwayCard } from '../../../engine/salvage';

export type AwaySampleName = 'two' | 'twelve' | 'every';

const H = 3600;

/** Two grades, one partner: a short absence. */
const TWO: AwayCard = {
  seconds: 1 * H + 20 * 60,
  capS: 2 * H,
  absentS: 1 * H + 20 * 60,
  lines: [
    { grade: 'li', g: 412_300, money: 103.08 },
    { grade: 'ci', g: 268_000, money: 77.72 },
  ],
  supplied_g: 680_300,
  money: 180.8,
  spent: 150,
  loads: 1,
  bought: [{ partner: 'partnerFarm', n: 1, spent: 150 }],
  net: 30.8,
  deliveries: 0,
  passed: [],
  hint: { key: 'away.hintHand' },
  runLonger: { rung: 2, capS: 4 * H },
};

/** Twelve grades, two partners, a deal delivery, a held bay sold, two rivals passed: a long night. */
const TWELVE: AwayCard = {
  seconds: 4 * H,
  capS: 4 * H,
  absentS: 9 * H + 41 * 60,
  lines: [
    { grade: 'bb', g: 96_400, money: 3_374.0 },
    { grade: 'no2', g: 141_800, money: 4_396.8 },
    { grade: 'brs', g: 388_200, money: 8_152.2 },
    { grade: 'cab', g: 512_600, money: 4_101.0 },
    { grade: 'mot', g: 1_204_500, money: 3_011.25 },
    { grade: 'alcast', g: 610_000, money: 1_220.0 },
    { grade: 'alw', g: 220_400, money: 771.4 },
    { grade: 'hms', g: 3_480_000, money: 1_044.0 },
    { grade: 'li', g: 5_912_300, money: 1_478.08 },
    { grade: 'ci', g: 2_268_000, money: 657.72 },
    { grade: 'conv', g: 18_200, money: 1_092.0 },
    { grade: 'cbody', g: 1_840_000, money: 368.0 },
  ],
  supplied_g: 16_692_400,
  money: 32_066.45,
  spent: 12_420,
  loads: 9,
  bought: [
    { partner: 'partnerDemolition', n: 4, spent: 9_420 },
    { partner: 'partnerFarm', n: 5, spent: 3_000 },
  ],
  net: 19_646.45,
  unsold: 4_212.5,
  deliveries: 1,
  deliveryList: [{ day: 41, g: 1_000_000, paid: 2_350 }],
  heldSold: ['brs'],
  passed: ['rival.1', 'rival.2'],
  hint: null,
  runLonger: { item: 'night', capS: 6 * H },
};

/** Every row a later stage adds: the gate, the van, the bank's share, a plant repaid, oversize pieces waiting. */
const EVERY: AwayCard = {
  ...TWELVE,
  rack: { n: 3, money: 1_140 },
  van: { n: 7, money: 2_380 },
  bank: 3_206.6,
  repaid: ['baler'],
  lotsWaiting: 2,
  bought: [
    { partner: 'partnerDemolition', n: 4, spent: 9_420 },
    { partner: 'partnerFarm', n: 5, spent: 3_000 },
    { partner: 'partner.garage', n: 2, spent: 4_800 },
  ],
  spent: 17_220,
  net: 14_846.45,
  runLonger: { rung: 4, capS: 6 * H },
};

export const AWAY_SAMPLES: Record<AwaySampleName, AwayCard> = { two: TWO, twelve: TWELVE, every: EVERY };
