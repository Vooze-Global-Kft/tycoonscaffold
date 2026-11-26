/**
 * The money rules' frozen test states (stage 2, yard-stage2.md 8.1; owner rules-money): `r3fin` (the loop's
 * frozen `r3` with the works open and an agreement signed on the shear through the real action) and `l2save`
 * (the first yard's five frozen states as the first yard's build saved them: layout 2, no stage-2 field).
 * Built from the loop's frozen states (fixtures/salvage.ts, played on the content they were frozen with), never
 * from game.json, so tuning moves nothing here; numbers a test checks by hand are written in the test itself.
 * `u13` and `firstHour2min` are wave 2's (the shop and the ads).
 */
import type { GameState } from '../types';
import { signFinance } from '../salvage/actionsMoney';
import { financeTerms, shownOf } from '../salvage/bank';
import { reserve } from '../salvage/advice';
import { roundMoney } from '../salvage/money';
import { STAGE2_KEYS } from '../salvage/state2';
import type { SalvageConfig, SalvageEvent, SalvageGame } from '../salvage/types';
import { FIXTURE_NAMES, fixtureGame, stage2Cfg, stage2Game, type FixtureName } from './salvage';

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
