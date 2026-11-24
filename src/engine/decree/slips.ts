/**
 * Budget slips, the purchases of 2.6, the reserve and the Ledger (2.5, 2.6, 2.7 "Budget slips",
 * 4.4). Package P1a (docs/design/office-build-plan.md).
 *
 * 1.0 s after desk and tray become empty, Gwendolyn Abacus slides advice()'s purchase onto the desk
 * if it is affordable above the reserve ("Benches & Bandstands +1 level · −120 · +8/s"); up buys it at
 * the printed price, down puts it back; a visitor's arrival returns an undragged slip (draw.ts); never
 * a day, never a counter. Every purchase other than a paper keeps back the reserve, the sign cost of
 * the desk paper plus the next waiting one ("Kept for the desk: 540"; a paper in the take-back window
 * counts as the desk paper, and a waiting paper's cost is what it would print if it landed now, D23),
 * and is refused when it would cut into it. A purchase that would change nothing is refused (merge
 * M45). D16: from the call day C until the count the reserve also keeps back what the run-up can ask
 * (the campaign papers left and the rally at their prices), "Kept for the run-up"; a slip on an empty
 * desk with an empty tray also keeps back desk.slipReserveSeconds of B. D18: a slip may land between
 * two papers (decide.ts `commitItem` step 5: a paper waiting, a purchase affordable above the reserve,
 * no slip since the last decided paper: `DecreeState.slipOffered`), at most one per paper.
 *
 * SEAM: `slipFor` reads advice.ts (P1b) `advice(...).slip`; advice builds its Slip with `slipOf` here (one price, one level, one
 * rate gain). `reserve` / `reserveParts` are read by advice.ts, the Standing Order (grants.ts, P1b)
 * and the Ledger; `buy` is the one purchase path (Ledger "Raise", slips, the Standing Order, the
 * monument, a requisition's level); `canBuy` says why one would be refused. `ledger` reads the cabinet
 * state for each row's minister and strike state for its picket. `slipFor` is called by tick.ts (P1b:
 * 1.0 s after the desk and tray empty) and by decide.ts `commitItem` step 5 (D18).
 */
import { advice } from './advice';
import { callDay } from './count';
import { commitPending } from './decide';
import { clubIndex, commitCash, decreeParams, EPS, factorOn, levelCost, levelGain, officeOf, openCost, openGain, rateOf, roundDibs, storeys, vanityPrice } from './params';
import { costOf, freezeShown, sizeMoney } from './size';
import { deskFactors } from './twists';
import type { DecreeConfig, DecreeEvent, DecreeGame, Ledger, LedgerRow, Paper, Purchase, Slip } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** The day from which the election may be called (count.ts `callDay`, the ONE formula), as the reserve reads it. */
export function callFrom(cfg: DecreeConfig, g: DecreeGame): number {
  return callDay(cfg, g);
}

/** What a waiting paper's sign would cost if it landed now (D23: it is sized only when it lands). */
function waitingCost(cfg: DecreeConfig, g: DecreeGame, paper: Paper): number {
  return costOf(freezeShown(cfg, g, paper, deskFactors(cfg, g)).sign);
}

/** The run-up's prices (2.10, D16): one campaign paper and the rally at the current B (they carry no jitter). */
export function runUpPrices(cfg: DecreeConfig, g: DecreeGame): { campaign: number; rally: number } {
  const f = cfg.decree.forms;
  const factors = deskFactors(cfg, g);
  const B = decreeParams(cfg, g, factors).B;
  const v = factorOn(factors, 'campaign.money', null);
  return { campaign: sizeMoney(cfg, f.campaign.seconds * v.mul, B, 1), rally: sizeMoney(cfg, f.rally.seconds * v.mul, B, 1) };
}

/** The two parts of the reserve (2.6, D16): "Kept for the desk" and "Kept for the run-up" (0 outside day C to the count). Built. */
export function reserveParts(cfg: DecreeConfig, g: DecreeGame): { desk: number; runUp: number } {
  const d = g.decree;
  const costs: number[] = [];
  if (d.pending) costs.push(costOf(d.pending.item.shown.sign));
  if (d.desk?.type === 'paper') costs.push(costOf(d.desk.shown.sign));
  for (const p of d.tray) {
    if (costs.length >= 2) break;
    costs.push(waitingCost(cfg, g, p));
  }
  const desk = costs.slice(0, 2).reduce((a, b) => a + b, 0);
  let runUp = 0;
  const row = officeOf(cfg, d.office);
  if ((d.phase === 'governing' && d.day >= callFrom(cfg, g)) || d.phase === 'campaign') {
    const p = runUpPrices(cfg, g);
    const left = d.phase === 'campaign' ? (d.campaign?.papersLeft ?? 0) : row.campaignPapers;
    const rally = d.phase === 'campaign' && d.campaign?.rallyDone ? 0 : p.rally;
    runUp = left * p.campaign + rally;
  }
  return { desk, runUp };
}

/** "Kept for the desk" plus "Kept for the run-up" (2.6, D16). Built. */
export function reserve(cfg: DecreeConfig, g: DecreeGame): number {
  const r = reserveParts(cfg, g);
  return r.desk + r.runUp;
}

/** The slip of `purchase` now (2.7): its live price, the level it starts from, the income it adds; null when it would change nothing. Built. */
export function slipOf(cfg: DecreeConfig, g: DecreeGame, purchase: Purchase): Slip | null {
  const d = g.decree;
  const p = decreeParams(cfg, g);
  if (purchase.type === 'monument') {
    if (d.monumentOffer !== purchase.monument || d.vanity.includes(purchase.monument)) return null;
    return { kind: 'slip', purchase, price: vanityPrice(cfg, g), drawnLevel: 0, rateGain: p.I * (cfg.decree.vanity.factor - 1) };
  }
  const m = d.ministries[purchase.ministry];
  if (!m) return null;
  const price = purchase.type === 'level' ? levelCost(cfg, g, purchase.ministry) : openCost(cfg, g, purchase.ministry);
  if (!Number.isFinite(price)) return null;
  return { kind: 'slip', purchase, price, drawnLevel: m.level, rateGain: purchase.type === 'level' ? levelGain(cfg, g, purchase.ministry, p) : openGain(cfg, g, purchase.ministry, p) };
}

/** The extra a slip on an empty desk with an empty tray keeps back (D16): slipReserveSeconds of B. */
function emptyDeskExtra(cfg: DecreeConfig, g: DecreeGame): number {
  const d = g.decree;
  if (d.desk || d.pending || d.tray.length) return 0;
  return roundDibs(cfg, cfg.decree.desk.slipReserveSeconds * decreeParams(cfg, g).B);
}

/**
 * A visitor (or a run-up paper) arrives while a slip lies on the desk: 2.7 as written puts the slip
 * back ("a visitor's arrival returns an undragged slip"); with `desk.slipStays` the slip stays and the
 * visitor waits in the tray. The ONE place of that rule (draw.ts arrivals, tick.ts run-up arrivals).
 */
export function slipYields(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  if (g.decree.desk?.type !== 'slip' || cfg.decree.desk.slipStays) return g;
  events.push({ type: 'slipReturned' });
  return withDecree(g, { desk: null });
}

/** The slip that would land now (advice's purchase, affordable above the reserve, D16's extra on an empty desk), or null; never during the count or on the result sheet. Built. */
export function slipFor(cfg: DecreeConfig, g: DecreeGame): Slip | null {
  if (g.decree.phase === 'count' || g.decree.phase === 'result') return null;
  const slip = advice(cfg, g).slip;
  if (!slip) return null;
  return g.cash - slip.price + EPS >= reserve(cfg, g) + emptyDeskExtra(cfg, g) ? slip : null;
}

/** Why `purchase` at `price` (null: the live price) would be refused now, or null when it may be bought. */
export function canBuy(cfg: DecreeConfig, g: DecreeGame, purchase: Purchase, price: number | null): LedgerRow['refusal'] | 'done' | null {
  const live = slipOf(cfg, g, purchase);
  if (!live) {
    if (purchase.type === 'level') {
      const m = g.decree.ministries[purchase.ministry];
      return !m ? 'done' : !m.open ? 'closed' : 'cap';
    }
    return 'done';
  }
  const cost = price ?? live.price;
  if (g.cash + EPS < cost) return 'cash';
  const parts = reserveParts(cfg, g);
  if (g.cash - cost + EPS < parts.desk) return 'reserve';
  if (g.cash - cost + EPS < parts.desk + parts.runUp) return 'runUp';
  return null;
}

/**
 * The one purchase path: `purchase` at `price` (a slip's printed price; null: the live price) when it
 * may be bought (`canBuy`); the SAME object when refused. A paper resting in its take-back window
 * commits first (at the play clock): a player's action is "the next action" of 2.7. `auto` (the
 * Standing Order, which nobody tapped) is refused instead while a paper rests in the take-back window.
 * `free` (a requisition's level, its price already paid as the paper printed it) skips the price and the reserve. A level crossing a storey brings its ribbon form
 * (`ribbonsDue`). Built.
 */
export function buy(cfg: DecreeConfig, g: DecreeGame, purchase: Purchase, price: number | null, events: DecreeEvent[], opts: { free?: boolean; auto?: boolean } = {}): DecreeGame {
  if (opts.free) return applyPurchase(cfg, g, purchase, 0, events);
  // A purchase nobody tapped (the Standing Order, `auto`) never ends the player's take-back window: refused while a paper rests there.
  if (opts.auto && g.decree.pending) return g;
  const local: DecreeEvent[] = [];
  const s = g.decree.pending ? commitPending(cfg, g, g.stats.playSeconds, local) : g;
  const live = slipOf(cfg, s, purchase);
  if (!live || canBuy(cfg, s, purchase, price) !== null) return g;
  events.push(...local);
  return applyPurchase(cfg, s, purchase, price ?? live.price, events);
}

function applyPurchase(cfg: DecreeConfig, g: DecreeGame, purchase: Purchase, price: number, events: DecreeEvent[]): DecreeGame {
  let s = price > 0 ? commitCash(g, -price, 'spend') : g;
  const d = s.decree;
  if (purchase.type === 'monument') {
    events.push({ type: 'monument', monument: purchase.monument });
    return withDecree(s, { vanity: [...d.vanity, purchase.monument], monumentOffer: null });
  }
  const i = purchase.ministry;
  const m = d.ministries[i];
  if (!m) return g;
  if (purchase.type === 'open') {
    if (m.open) return g;
    events.push({ type: 'ministryOpened', ministry: i });
    return withDecree(s, { ministries: d.ministries.map((x, k) => (k === i ? { open: true, level: 1 } : x)) });
  }
  if (!m.open || m.level >= cfg.decree.ministry.levelCap) return g;
  const level = m.level + 1;
  events.push({ type: 'levelBought', ministry: i, level });
  s = withDecree(s, { ministries: d.ministries.map((x, k) => (k === i ? { open: true, level } : x)), stats: { ...d.stats } });
  const st = storeys(cfg, level);
  if (st > storeys(cfg, m.level)) {
    events.push({ type: 'storey', ministry: i, storey: st });
    s = withDecree(s, { ribbonsDue: [...s.decree.ribbonsDue, { ministry: i, storey: st }] });
  }
  return { ...s, stats: { ...s.stats, levelsBought: s.stats.levelsBought + 1 } };
}

/** 2.6 `raise(i)`: the Ledger's untaught button, ministry i +1 level at the live price; the same object when refused. Built. */
export function raise(cfg: DecreeConfig, g: DecreeGame, ministry: number, events: DecreeEvent[]): DecreeGame {
  return buy(cfg, g, { type: 'level', ministry }, null, events);
}

/** 2.6 `openMinistry(i)`; the same object when refused. Built. */
export function openMinistry(cfg: DecreeConfig, g: DecreeGame, ministry: number, events: DecreeEvent[]): DecreeGame {
  return buy(cfg, g, { type: 'open', ministry }, null, events);
}

/** 2.6 `buyVanity()`: this term's monument (5.8), ×vanity.factor income for good; the same object without an offer or when refused. Built. */
export function buyVanity(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  const offer = g.decree.monumentOffer;
  return offer ? buy(cfg, g, { type: 'monument', monument: offer }, null, events) : g;
}

/** The Ledger's rows (4.4): level, storeys, what it adds to I, club, minister, picket, price, why "Raise" (or opening) is refused; the record; the reserve. Built. */
export function ledger(cfg: DecreeConfig, g: DecreeGame): Ledger {
  const d = g.decree;
  const c = cfg.decree;
  const row = officeOf(cfg, d.office);
  const p = decreeParams(cfg, g);
  const parts = reserveParts(cfg, g);
  const rows: LedgerRow[] = d.ministries.map((m, i) => {
    const clubId = row.ministries[i]?.club ?? null;
    const gi = clubIndex(cfg, d.office, clubId);
    const club = gi >= 0 ? gi : null;
    const minister = clubId ? (Object.entries(d.cabinet).find(([, seat]) => seat.club === clubId)?.[0] ?? null) : null;
    const st = club !== null ? d.strikes[club] : null;
    const purchase: Purchase = m.open ? { type: 'level', ministry: i } : { type: 'open', ministry: i };
    const price = m.open ? levelCost(cfg, g, i) : openCost(cfg, g, i);
    const refusal = canBuy(cfg, g, purchase, null);
    return {
      ministry: i,
      open: m.open,
      level: m.level,
      storeys: storeys(cfg, m.level),
      rate: rateOf(cfg, d.office, i, m) * p.multiplier * p.mN * p.V * p.served[i] * p.sayNothing,
      club,
      minister,
      boycott: st && club !== null ? { club, mood: d.moods[club], endsAt: c.boycott.endsAt, papersLeft: st.papersLeft, picket: st.picket } : null,
      price: Number.isFinite(price) ? price : 0,
      refusal: refusal === 'done' ? 'cap' : refusal,
    };
  });
  const next = d.office < 2 ? cfg.decree.offices[d.office + 1].stand : null;
  return { rows, record: p.record, recordTarget: next?.record ?? null, recordName: row.recordName, reserve: roundDibs(cfg, parts.desk), reserveRunUp: roundDibs(cfg, parts.runUp) };
}
