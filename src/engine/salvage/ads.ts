/**
 * THE MODE'S AD RULES (stage 2, docs/design/yard-stage2.md 2.16): the away bonus (at most one a market day,
 * after an absence of `ads.awayMinAbsence_min`, never on the away card), the spot buyer on a held bay's
 * Sell, the day's cap, nothing before `iap.sessions2At`, nothing while a card shows a debt. Rewards go
 * through `clock.ts credit(x, amount, t, 'ad')`, never a lot payment. The shared ad service
 * (src/services/ads.ts) is store-shared's. Owner: rules-money (Phase B).
 *
 * PHASE A STUB (engine2-hooks, 26 November): no ad is offered. The loop does not call this file.
 */
import type { AdKind, SalvageConfig, SalvageGame } from './types';

/** What an ad of this kind would pay now (the button's figure), or null when none is offered. Stub: none. */
export function adOffer(cfg: SalvageConfig, g: SalvageGame, kind: AdKind, ref: { grade?: string } = {}): number | null {
  void cfg;
  void g;
  void kind;
  void ref;
  return null;
}
