/**
 * PLANT FINANCE (stage 2, docs/design/yard-stage2.md 2.14; rulings 3 as corrected by 11): one agreement at
 * a time, repaid by a share of EVERY lot payment, no date. Owner: rules-money (Phase B fills the bodies:
 * the agreement, the terms, the letter, `bankSplit`).
 *
 * PHASE A STUB (engine2-hooks, 26 November): `payLot` takes nothing (no agreement exists), so every payment
 * reaches the player whole and the first yard advances exactly as before.
 *
 * THE CALL SITES (the closed list of 2.14.4; every lot payment, nothing else): the loop calls
 * `payLot(x, gross, t)` at the payment's site BEFORE its ticket prints, puts `bank: {y}` on the ticket when
 * y > 0, then `clock.ts bankPart(x, y)` (the away card's gross money and bank line), then `clock.ts
 * earn(x, z, t)` with the player's part z (the call site earns, not payLot).
 * Today's sites: round.ts roundEvent (the merchant's collection, Sell's set-aside lots included) and
 * deal.ts dealDeliver (a supply deal's delivery). Phase B's own sites follow the same four lines: a thing
 * sorted at the crate (crate.ts), a sale at the gate and the van's collection (reuse.ts). Ad rewards and
 * granted scrip never come here: `clock.ts credit(x, amount, t, kind)`.
 *
 * What Phase B must know (engine2-hooks; s2a-fix): `earn` adds what it is given to the income buckets and
 * to the away card's money; 2.14.4 keeps the away card's `money` GROSS of the bank and its `bank` the sum of
 * y. THE CALL SITE does both, right after payLot: `clock.ts bankPart(x, y)` adds y to `x.away.money` and to
 * `x.away.bank` (fix2a.test.ts pins it with a double), so payLot itself must NOT touch `x.away.money`. An
 * agreement repaid in full while away: push its plate onto `x.away.repaid` and emit `repaid` (the away
 * pass's sink lets that event through, 2.19). Every date payLot writes (none today) is at least t.
 */
import type { Ctx } from './clock';
import type { PayLotResult } from './types';

/** Split one lot payment of `gross` § at yard second t: y to the bank, z = gross − y to the player. Stub: nothing to the bank. */
export function payLot(x: Ctx, gross: number, t: number): PayLotResult {
  void x;
  void t;
  return { y: 0, z: gross };
}
