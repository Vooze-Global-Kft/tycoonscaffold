/**
 * The money rules' frozen test states (stage 2, yard-stage2.md 8.1; owner rules-money): `r3fin` (the loop's
 * frozen `r3` with the works open and an agreement signed on the shear through the real action) and `l2save`
 * (the first yard's five frozen states as the first yard's build saved them: layout 2, no stage-2 field).
 * Built from the loop's frozen states (fixtures/salvage.ts, played on the content they were frozen with), never
 * from game.json, so tuning moves nothing here; numbers a test checks by hand are written in the test itself.
 * Wave 2 (the shop and the ads): `SHOP_PRODUCTS` (the sixteen products of 2.15.1 as the shared list holds them,
 * test prices), `shopCfg` (the works' test content with them), `shopGame` (r4 with the second session begun,
 * the band a18 and rung 4: packs show where the country allows), `u13Game` (8.1's `u13`: the same yard whose
 * age band is u13) and `firstHour2min` (8.1: the first yard's m30 after a 2-minute absence, its card closed).
 */
import type { GameState } from '../types';
import { signFinance } from '../salvage/actionsMoney';
import { financeTerms, shownOf } from '../salvage/bank';
import { reserve } from '../salvage/advice';
import { roundMoney } from '../salvage/money';
import { STAGE2_KEYS } from '../salvage/state2';
import type { SalvageConfig, SalvageEvent, SalvageGame } from '../salvage/types';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, SALVAGE_TEST, stage2Cfg, stage2Content, stage2Game, type FixtureName } from './salvage';
import { r4Game, worksCfg } from './salvage2works';
import { ackAway } from '../salvage/actions';
import { salvageOffline } from '../salvage/away';

/** The plate r3fin finances (a rung-3 plate the frozen content marks financeable). */
export const R3FIN_PLATE = 'shear';

/** The content r3fin runs on: r3's own (fixtures/salvage.ts stage2Cfg). */
export function moneyCfg(): SalvageConfig {
  return stage2Cfg('r3');
}

/**
 * r3 with the works OPEN (counts.bathSet set at its clock, as works.ts worksOpen sets it at the first live
 * instant at rung 3): the works layer's shop (the plates) is read from then on. Nothing else is changed (the
 * bath and the lots' date are rules-works'; a bank test needs only the plates on sale).
 */
export function r3open(base?: GameState): SalvageGame {
  const g = stage2Game('r3', base);
  return { ...g, salvage: { ...g.salvage, counts: { ...(g.salvage.counts ?? {}), bathSet: Math.floor(g.salvage.t) } } };
}

/** r3open with the cash a loan needs on `plate` (2.14.5: P > cash − reserve and cash − reserve ≥ d, by `margin` §) and the letter seen. */
export function r3loan(plate = R3FIN_PLATE, margin = 500, base?: GameState): SalvageGame {
  const cfg = moneyCfg();
  let g = r3open(base);
  // First with plenty of cash, to read the terms (they move only with assets, never with cash).
  const tm = financeTerms(cfg, { ...g, cash: 0 }, plate);
  if (!tm) throw new Error(`r3loan: ${plate} is not financeable on r3's content`);
  const cash = roundMoney(reserve(cfg, g) + tm.d + margin);
  if (!(tm.P > cash - reserve(cfg, g))) throw new Error('r3loan: the margin pays the plate outright');
  g = { ...g, cash, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: true } } };
  return g;
}

/** r3fin (8.1): r3loan with the agreement SIGNED through signFinance at the terms shown (the shear ordered, the deposit paid). */
export function r3finGame(base?: GameState): SalvageGame {
  const cfg = moneyCfg();
  const g = r3loan(R3FIN_PLATE, 500, base);
  const tm = financeTerms(cfg, g, R3FIN_PLATE)!;
  const ev: SalvageEvent[] = [];
  const out = signFinance(cfg, g, R3FIN_PLATE, shownOf(tm), g.salvage.t, ev);
  if (!out.salvage.bank.agreement) throw new Error(`r3fin: signFinance refused (${JSON.stringify(ev)})`);
  return out;
}

/** A layout-2 save of a game: what the first yard's build wrote (no stage-2 field, `v: 2`), as JSON. */
export function asLayout2(g: SalvageGame): { salvage: Record<string, unknown> } & Record<string, unknown> {
  const raw = JSON.parse(JSON.stringify(g)) as { salvage: Record<string, unknown> } & Record<string, unknown>;
  for (const k of STAGE2_KEYS) delete raw.salvage[k];
  raw.salvage.v = 2;
  return raw;
}

/** l2save (8.1): the first yard's five frozen states (fixtures/salvage.ts, the test content) as layout-2 saves. */
export function l2saves(base: GameState, now?: number): Record<FixtureName, { game: SalvageGame; raw: ReturnType<typeof asLayout2> }> {
  const out = {} as Record<FixtureName, { game: SalvageGame; raw: ReturnType<typeof asLayout2> }>;
  for (const n of FIXTURE_NAMES) {
    const game = fixtureGame(n, base, now);
    out[n] = { game, raw: asLayout2(game) };
  }
  return out;
}

// ============================================================================ wave 2: the shop and the ads

/**
 * The sixteen products of 2.15.1 (ids as `iap.lookOf` names them; test prices): six colours, four sets, the plaque,
 * No ad videos, four packs. FROZEN TEST VALUES: the packs here are worth H = 0.5, 1, 2 and 4 hours (game.json's are
 * 2, 5, 10, 20, fixed by ruling 9.1), so that several quotes fit the headroom of the test yard (U a little over
 * §100,000 on r4's test content); the rules read H from the list, never from the id.
 */
export const SHOP_PRODUCTS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `colour${n}`, title: `Colour ${n}`, kind: 'cosmetic', value: 1, fallbackPrice: '$1.99', highlight: false })),
  ...[1, 2, 3, 4].map((n) => ({ id: `dressing${n}`, title: `Set ${n}`, kind: 'cosmetic', value: 1, fallbackPrice: '$2.99', highlight: false })),
  { id: 'plaque', title: 'Plaque', kind: 'cosmetic', value: 1, fallbackPrice: '$2.99', highlight: false },
  { id: 'noAds', title: 'No ad videos', kind: 'skipAds', value: 1, fallbackPrice: '$4.99', highlight: false },
  ...([[2, 0.5], [5, 1], [10, 2], [20, 4]] as const).map(([n, H]) => ({ id: `pack${n}`, title: `Pack ${n}`, kind: 'hoursOfIncome', value: H, fallbackPrice: '$1.99', highlight: false })),
] as const;

let SHOP_CFG: SalvageConfig | null = null;
/** The works' test content (fixtures/salvage2works.ts, r3's world seed) with the shared product list of 2.15.1. One object, so the rules' caches hold. */
export function shopCfg(): SalvageConfig {
  return (SHOP_CFG ??= { ...worksCfg(), monetization: { iap: { products: SHOP_PRODUCTS.map((p) => ({ ...p })) } } } as unknown as SalvageConfig);
}

/** A device time well after every frozen state's market clock (the shop's tests' "now", epoch ms). */
export const SHOP_NOW = Date.UTC(2026, 10, 27, 12);

/** r4 (every plate running) with the second session begun at its clock, the age band a18 and the ladder at rung 4: the yard where packs show (country allowing). */
export function shopGame(over: { ageBand?: 'u13' | 't13' | 'a18' | null; cash?: number } = {}): SalvageGame {
  const g = r4Game();
  const s = structuredClone(g.salvage);
  s.iap.sessions2At = Math.floor(s.t);
  s.iap.ageBand = over.ageBand === undefined ? 'a18' : over.ageBand;
  s.ladder.rung = Math.max(4, s.ladder.rung);
  return { ...g, cash: over.cash ?? g.cash, salvage: s };
}

/** u13 (8.1): the r4 yard of shopGame whose age band is u13. */
export function u13Game(): SalvageGame {
  return shopGame({ ageBand: 'u13' });
}

let FH_CFG: SalvageConfig | null = null;
/** The first yard's test content with stage 2's frozen `iap` and `ads` blocks and the product list: what the first hour reads of money (nothing, until the second session). */
export function firstHourCfg(): SalvageConfig {
  const c2 = stage2Content() as unknown as { iap: unknown; ads: unknown };
  return (FH_CFG ??= { mode: 'salvage', salvage: { ...SALVAGE_TEST, iap: c2.iap, ads: c2.ads }, monetization: { iap: { products: SHOP_PRODUCTS.map((p) => ({ ...p })) } } } as unknown as SalvageConfig);
}

/** firstHour2min (8.1, P1): the first yard's frozen m30 after a 2-minute absence; `card` the away card shown, `closed` the game after its OK. */
export function firstHour2min(base?: GameState): { cfg: SalvageConfig; card: SalvageGame; closed: SalvageGame } {
  const cfg = firstHourCfg();
  const b = (base ?? ({ cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: FIXTURE_NOW, stats: { playSeconds: 0, clockHigh: FIXTURE_NOW }, entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} } } as unknown as GameState)) as GameState;
  const g = fixtureGame('m30', b, FIXTURE_NOW);
  const start = Math.max(g.lastSavedAt || 0, g.salvage.clock.highMs);
  const r = salvageOffline(cfg, { ...g, lastSavedAt: start }, start + 2 * 60_000);
  const card = r.game as SalvageGame;
  return { cfg, card, closed: ackAway(cfg, card) };
}
