/**
 * Rewarded ads, products and the Standing Order (5.10, 5.11, 2.6 "the grants of 5.11", D11). Package
 * P1b (docs/design/office-build-plan.md; a file the skeleton added beside 9.2's list, because 2.6's
 * grants have no other home).
 *
 * Ads (optional, from a button, play-clock cooldowns, a failed load loses nothing): the away report's
 * +50 % (the store pays it: EngineMode.offlineAdMultiplier); Check the Sofa (+40 s of B, once a term);
 * Call the Spin Doctor (ends "Say nothing", scandal.ts `endScandal`); Send a Courier (ends a boycott,
 * strike.ts `endStrike`, the grievance's club on the desk first, else the first club boycotting); Open
 * the Doors (fills the in-tray, draw.ts `fillTray`; 15 min play cooldown). The skipAds product makes
 * the shared ads service return at once with no video: the grant is the same. None is offered from
 * the call to the end of election night (phases campaign and count): `canWatchAd` and `canShop` say so,
 * and every grant refuses then (the same object).
 * Products (D11, five, none random, none touching a mood, the poll or the count, H10): Junior Clerk on
 * Duty (the Standing Order from the first day), Long Lunch (+2 h away cap, read by offline.ts), the two
 * cosmetics (looks only: `cosmetics`), Private Secretary (the shared skipAds kind; the rules never read it).
 * The Standing Order (from governor term 2, or the first day with Junior Clerk on Duty; a Ledger
 * switch): Cuthbert Wimble buys the advised level (advice.ts `standingOrderPick`) while you play when
 * cash ≥ 3 × its price plus the reserve; never while away (tick.ts runs it; the away rules never tick).
 */
import { standingOrderPick, standingOrderReserve } from './advice';
import { fillTray, landNext } from './draw';
import { commitCash, decreeParams, roundDibs } from './params';
import { endScandal } from './scandal';
import { buy, slipsComeNow } from './slips';
import { endStrike } from './strike';
import type { DecreeAdKind, DecreeConfig, DecreeEvent, DecreeGame } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** Ads and products are offered outside the run-up and election night (2.10, 5.11): while governing and on the result sheet. Built. */
export function offering(g: DecreeGame): boolean {
  return g.decree.phase === 'governing' || g.decree.phase === 'result';
}

/** Whether the player owns product `id` (the shared entitlements). */
export function owns(g: DecreeGame, id: string): boolean {
  return g.entitlements.products.includes(id);
}

/** The cosmetic products as flags the screens read (5.11, D11: looks only). Built. */
export function cosmetics(cfg: DecreeConfig, g: DecreeGame): { walnutDesk: boolean; portraitFrames: boolean } {
  const p = cfg.decree.products;
  return { walnutDesk: owns(g, p.walnutDesk), portraitFrames: owns(g, p.portraitFrames) };
}

/** The club whose boycott the Courier ends: the grievance's on the desk, else the first boycotting club; null with none. */
function courierClub(g: DecreeGame): number | null {
  const d = g.decree;
  const desk = d.desk?.type === 'paper' ? d.desk.paper : null;
  if (desk?.kind === 'strike' && desk.petitioner !== null && d.strikes[desk.petitioner]) return desk.petitioner;
  const i = d.strikes.findIndex((s) => !!s);
  return i >= 0 ? i : null;
}

/** The in-tray's free places (2.15 and Open the Doors: the tray's room, and the desk's when it holds no paper). */
export function freePlaces(cfg: DecreeConfig, g: DecreeGame): number {
  const d = g.decree;
  // D32: a slip lying on the desk keeps its place (the visitor waits in the tray); without D32 it would go back.
  const deskTaken = d.desk?.type === 'paper' || !!d.pending || (d.desk?.type === 'slip' && cfg.decree.desk.slipStays);
  return Math.max(0, cfg.decree.desk.trayCap - d.tray.length) + (deskTaken ? 0 : 1);
}

/** Whether the ad `kind` may be offered now (the phase, its cooldown or once-a-term limit, something for it to do). Built. */
export function canWatchAd(cfg: DecreeConfig, g: DecreeGame, kind: DecreeAdKind): boolean {
  if (!offering(g)) return false;
  const d = g.decree;
  switch (kind) {
    case 'awayBonus':
      return true;
    case 'checkSofa':
      return (d.adsUsed.checkSofa ?? 0) < 1;
    case 'spinDoctor':
      return !!d.scandal;
    case 'courier':
      return courierClub(g) !== null;
    case 'openDoors':
      return d.phase === 'governing' && g.stats.playSeconds >= (d.cooldowns.openDoors ?? -Infinity) && freePlaces(cfg, g) > 0;
  }
}

/** The play seconds until the ad `kind` is allowed again by its cooldown (Open the Doors' 15 min), 0 when it is not cooling down (the card prints the time left). Built. */
export function adCooldownLeft(cfg: DecreeConfig, g: DecreeGame, kind: DecreeAdKind): number {
  void cfg;
  const at = g.decree.cooldowns[kind];
  return typeof at === 'number' && Number.isFinite(at) ? Math.max(0, at - g.stats.playSeconds) : 0;
}

/** What Check the Sofa would pay now (40 s of B through roundDibs), the very amount `grantAd` pays when the video completes with the state unchanged. Built. */
export function sofaAmount(cfg: DecreeConfig, g: DecreeGame): number {
  return roundDibs(cfg, cfg.decree.ads.checkSofaSeconds * decreeParams(cfg, g).B);
}

/** Whether the Shop may offer products now (2.10, 5.11: never from the call to the end of election night). Built. */
export function canShop(cfg: DecreeConfig, g: DecreeGame): boolean {
  void cfg;
  return offering(g);
}

/** The ad's grant after the video completed (or at once with the skipAds product); the same object when it is not allowed now. Built. */
export function grantAd(cfg: DecreeConfig, g: DecreeGame, kind: DecreeAdKind, events: DecreeEvent[]): DecreeGame {
  if (kind === 'awayBonus' || !canWatchAd(cfg, g, kind)) return g;
  const d = g.decree;
  const used = (s: DecreeGame) => withDecree(s, { adsUsed: { ...s.decree.adsUsed, [kind]: (s.decree.adsUsed[kind] ?? 0) + 1 } });
  let next: DecreeGame = g;
  switch (kind) {
    case 'checkSofa': {
      const amount = sofaAmount(cfg, g);
      next = amount > 0 ? commitCash(g, amount, 'checkSofa') : g;
      break;
    }
    case 'spinDoctor':
      next = endScandal(cfg, g, 'ad', events);
      break;
    case 'courier': {
      const club = courierClub(g);
      // The grievance leaves with the boycott (strike.ts); the next paper lands on a desk it left empty.
      next = club === null ? g : endStrike(cfg, g, club, 'ad', events);
      if (next !== g && !next.decree.desk && !next.decree.pending) next = landNext(cfg, next, g.stats.playSeconds, events);
      break;
    }
    case 'openDoors': {
      const clock = g.stats.playSeconds;
      const filled = fillTray(cfg, g, freePlaces(cfg, g), clock, events);
      const landed = filled.decree.desk ? filled : landNext(cfg, filled, clock, events);
      next = withDecree(landed, { cooldowns: { ...d.cooldowns, openDoors: clock + cfg.decree.ads.openDoorsCooldown } });
      break;
    }
  }
  if (next === g) return g;
  events.push({ type: 'ad', ad: kind });
  return used(next);
}

/** A non-consumable just recorded (EngineMode.entitle): nothing of the run changes now (Long Lunch is read at the next absence, Junior Clerk on Duty by `standingOrderAvailable`). Built: the same object. */
export function entitleDecree(cfg: DecreeConfig, g: DecreeGame, productId: string): DecreeGame {
  void cfg;
  void productId;
  return g;
}

/** Whether the Standing Order's switch exists now (5.10, D11): from governor term 2, or from the first day with Junior Clerk on Duty. Built. */
export function standingOrderAvailable(cfg: DecreeConfig, g: DecreeGame): boolean {
  const d = g.decree;
  if (owns(g, cfg.decree.products.standingOrder)) return true;
  return d.office >= 2 || (d.office === 1 && d.term >= cfg.decree.standingOrder.fromGovernorTerm);
}

/** Whether the Standing Order buys now (switched on and available). Built. */
export function standingOrderActive(cfg: DecreeConfig, g: DecreeGame): boolean {
  return g.decree.standingOrder && standingOrderAvailable(cfg, g);
}

/** 2.6 `setStandingOrder(on)`; the same object while it is not available or nothing changes. Built. */
export function setStandingOrder(cfg: DecreeConfig, g: DecreeGame, on: boolean): DecreeGame {
  if (g.decree.standingOrder === on || (on && !standingOrderAvailable(cfg, g))) return g;
  return withDecree(g, { standingOrder: on });
}

/** The Standing Order's purchase now, if cash is at 3 × the advised level's price plus the reserve and no paper rests in its take-back window (tick.ts runs it at that moment, after the window); the same object otherwise. Built. */
export function standingOrderStep(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  // Never inside the player's take-back window (2.7: Wimble is not "the next action"; slips.ts `buy` with `auto` refuses then too).
  if (!standingOrderActive(cfg, g) || g.decree.pending || !slipsComeNow(g)) return g;
  const pick = standingOrderPick(cfg, g);
  // D33: it keeps back every waiting paper's sign cost (and the run-up's), not just the next two.
  if (!pick || g.cash < cfg.decree.standingOrder.times * pick.price + standingOrderReserve(cfg, g)) return g;
  return buy(cfg, g, pick.purchase, pick.price, events, { auto: true });
}

/** The face picked on the loading card (3.1): one of the six player faces; the same object once one is picked or for an unknown face. Built. */
export function pickFace(cfg: DecreeConfig, g: DecreeGame, face: string): DecreeGame {
  if (g.decree.face !== null || !cfg.decree.cast.players.some((p) => p.id === face)) return g;
  return withDecree(g, { face });
}
