/**
 * The away card as a weighbridge docket (owner1-hud; the owner's first review, point 6: "UI of while I was
 * away looks too simple, plain text no design"). Pure: what the card prints, row by row, from CardData's
 * away card (the state's, with rules-book's selector laid over it by marketLines.ts withAwayView) and
 * nothing else. Every number on it is one of CardData's, passed through a key and the rules' formatters;
 * the screen adds no number, sums nothing and decides no rule. A row exists only when it holds something.
 *
 * The docket, top to bottom:
 * - the head (fixed): how long you were away, how long the yard ran, a strip of the one inside the other,
 *   and what would make it run longer (the cap is what stops a yard early);
 * - SOLD: a row per grade the merchant collected (its pictogram, its name, its weight, its scrip), the deal's
 *   deliveries, the gate's and the van's sales (stage 2), then the Sales total, all in two right-aligned
 *   columns;
 * - BOUGHT: a row per partner (its mark, its name, the loads, the scrip that went out) and the bank's share
 *   (stage 2);
 * - notes: sold from hold, repaid in full, oversize pieces waiting, rivals passed;
 * - the advice: the one thing to do next (the goal, else the rules' hint);
 * - the foot (fixed): the net, the card's one big number, "already in your account", and what the absence
 *   left in the bays not yet sold.
 */
import type { Txt } from '../../../engine/salvage';
import { awayLines, type AwayData } from './marketLines';
import type { DocketMark } from '../art/docket.draw';

export interface DocketRow {
  id: string;
  mark: DocketMark;
  name: Txt;
  /** The middle column: a weight, a count of loads or things (null: empty). */
  qty: Txt | null;
  /** The right column: scrip in (amount) or out (cost). */
  money: Txt;
  cost: boolean;
}

export interface DocketNote {
  t: Txt;
  kind: 'held' | 'repaid' | 'lots' | 'passed' | 'news';
}

export interface Docket {
  away: Txt;
  ran: Txt;
  /** The yard's run inside the absence, 0 to 1, for the strip (a drawing of two of CardData's times), or null. */
  ranShare: number | null;
  longer: Txt | null;
  sold: DocketRow[];
  /** "Sales" and CardData's sales figure, under the sold rows; null when nothing was sold. */
  salesTotal: { name: Txt; money: Txt } | null;
  bought: DocketRow[];
  notes: DocketNote[];
  /** The one thing to do next, as advice. */
  next: Txt | null;
  /** The card's one big number, or null when no money moved. */
  net: { big: Txt; sub: Txt; up: boolean } | null;
  unsold: Txt | null;
  /** "Nothing was weighed out." when the card holds nothing else. */
  nothing: Txt | null;
}

const count = (n: number, one: Txt['key'], many: Txt['key']): Txt => ({ key: n === 1 ? one : many, args: { n: { n } } });

/** The docket of an away card. */
export function awayDocket(a: AwayData): Docket {
  const L = awayLines(a, false);
  const absent = a.absentS ?? a.seconds;
  const ranShare = absent > 0 ? Math.max(0, Math.min(1, a.seconds / absent)) : null;
  // SOLD: the merchant's collections by grade (held stock is never listed: money > 0), the best first.
  const grades = [...a.lines].filter((l) => l.money > 0).sort((x, y) => y.money - x.money || y.g - x.g);
  const sold: DocketRow[] = grades.map((l) => ({
    id: `g:${l.grade}`,
    mark: { grade: l.grade },
    name: { key: 'away.grade', args: { grade: { grade: l.grade } } },
    qty: { key: 'away.kg', args: { kg: { mass_g: l.g, step: 'lot' } } },
    money: { key: 'away.amount', args: { x: { money: l.money } } },
    cost: false,
  }));
  (a.deliveryList ?? []).forEach((d, i) =>
    sold.push({ id: `deal:${i}`, mark: { sign: 'deal' }, name: { key: 'away.dealName' }, qty: { key: 'away.kg', args: { kg: { mass_g: d.g, step: 'lot' } } }, money: { key: 'away.amount', args: { x: { money: d.paid } } }, cost: false }),
  );
  if (a.rack && (a.rack.n > 0 || a.rack.money > 0)) sold.push({ id: 'rack', mark: { sign: 'gate' }, name: { key: 'away.rackName' }, qty: count(a.rack.n, 'away.thingOne', 'away.thingsN'), money: { key: 'away.amount', args: { x: { money: a.rack.money } } }, cost: false });
  if (a.van && (a.van.n > 0 || a.van.money > 0)) sold.push({ id: 'van', mark: { sign: 'van' }, name: { key: 'away.vanName' }, qty: count(a.van.n, 'away.thingOne', 'away.thingsN'), money: { key: 'away.amount', args: { x: { money: a.van.money } } }, cost: false });
  const salesTotal = a.money > 0 ? { name: { key: 'away.salesTotal' } as Txt, money: { key: 'away.amount', args: { x: { money: a.money } } } as Txt } : null;
  // BOUGHT: loads by partner, then the bank's share.
  const bought: DocketRow[] = [];
  const by = (a.bought ?? []).filter((b) => b.n > 0 || b.spent > 0);
  if (by.length)
    for (const b of by)
      bought.push({
        id: `p:${b.partner || 'loads'}`,
        mark: b.partner ? { partner: b.partner } : { sign: 'skip' },
        name: b.partner ? { key: 'away.partner', args: { partner: { name: b.partner } } } : { key: 'away.labelBought' },
        qty: count(b.n, 'away.loadOne', 'away.loadsN'),
        money: { key: 'away.cost', args: { x: { money: b.spent } } },
        cost: true,
      });
  else if ((a.spent ?? 0) > 0)
    bought.push({ id: 'loads', mark: { sign: 'skip' }, name: { key: 'away.labelBought' }, qty: a.loads > 0 ? count(a.loads, 'away.loadOne', 'away.loadsN') : null, money: { key: 'away.cost', args: { x: { money: a.spent! } } }, cost: true });
  if ((a.bank ?? 0) > 0) bought.push({ id: 'bank', mark: { sign: 'bank' }, name: { key: 'away.bankName' }, qty: null, money: { key: 'away.cost', args: { x: { money: a.bank! } } }, cost: true });
  // Notes: what the time away did besides the money, each only when it happened.
  const notes: DocketNote[] = [];
  for (const t of L.held) notes.push({ t, kind: 'held' });
  for (const p of a.repaid ?? []) notes.push({ t: { key: 'away.repaid', args: { plate: { text: `title.works.${p}` as Txt['key'] } } }, kind: 'repaid' });
  if ((a.lotsWaiting ?? 0) > 0) notes.push({ t: a.lotsWaiting === 1 ? { key: 'away.lotOne' } : { key: 'away.lots', args: { n: { n: a.lotsWaiting! } } }, kind: 'lots' });
  // The deal's deliveries are rows (a count without its list is a note); the rivals passed are notes.
  for (const t of L.news) {
    if (t.key === 'ticket.dealDelivery' || t.key === 'away.nothing') continue;
    notes.push({ t, kind: t.key === 'away.passed' || t.key === 'away.passedN' ? 'passed' : 'news' });
  }
  const net = L.net ? { up: L.net.key === 'away.net', big: { key: L.net.key === 'away.net' ? 'away.netUp' : 'away.netDown', args: L.net.args } as Txt, sub: { key: L.net.key === 'away.net' ? 'away.inAccount' : 'away.fromAccount' } as Txt } : null;
  const empty = !sold.length && !bought.length && !notes.length && !net;
  return {
    away: { key: 'away.time', args: { t: { secs: absent } } },
    ran: { key: 'away.time', args: { t: { secs: a.seconds } } },
    ranShare,
    longer: L.longer,
    sold,
    salesTotal,
    bought,
    notes,
    next: L.next && L.next.key !== 'away.nothing' ? L.next : null,
    net,
    unsold: L.unsold,
    nothing: empty ? { key: 'away.nothing' } : null,
  };
}
