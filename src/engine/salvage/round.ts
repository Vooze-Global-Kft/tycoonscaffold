/**
 * The merchant's round (yard-stage1.md 2.3, 2.12, S1, R5): waiting; at the first event at which a bay
 * has collectable grams it starts loading (`merchant.load_s`) and FIXES the lot then (each line resolved
 * down to 0.1 kg, the grams leave the bays onto the flatbed); at the end it pays one collection ticket
 * and is away `round_s`; on return it waits or loads again. "Supplied" counts collected lots only.
 * Owner: rules-sim.
 */
import { asideOf, collectable } from './bays';
import { count, dayAt, earn, priceAt, printTicket, ticketBase, type Ctx } from './clock';
import { roundMoney } from './money';
import { shellsLeave } from './things';
import type { MerchantState, TicketLine } from './types';

/** Credit a collected (or delivered) lot to the ladder: lifetime supplied grams and the range's worth at p̄ (2.11). */
export function supply(x: Ctx, grade: string, g: number): void {
  x.s.ladder.supplied_g += g;
  const gr = x.c.grades[grade];
  if (gr?.material) x.s.ladder.worth[gr.material] = (x.s.ladder.worth[gr.material] ?? 0) + (g / 1000) * gr.pbar;
}

/** Start loading if anything is collectable (the merchant waiting); the lot is fixed now. */
export function roundTry(x: Ctx, t: number): void {
  const m = x.s.merchant;
  if (m.phase !== 'waiting') return;
  const day = dayAt(x, t);
  const lot: MerchantState['lot'] = [];
  for (const grade of Object.keys(x.s.bays)) {
    const b = x.s.bays[grade];
    const { free, aside } = collectable(x, grade);
    if (aside > 0) {
      // Set-aside lots, each at its own price (2.3 Sell: shown equals applied).
      let left = aside;
      const keep: typeof b.aside = [];
      for (const a of b.aside) {
        const take = Math.min(a.g, left);
        if (take > 0) lot.push({ grade, g: take, price: a.price, amount: roundMoney((take / 1000) * a.price) });
        left -= take;
        if (a.g - take > 0) keep.push({ ...a, g: a.g - take });
      }
      b.aside = keep;
      b.g -= aside;
    }
    if (free > 0) {
      const units = x.c.wholeUnits_kg[grade];
      const price = priceAt(x, grade, day);
      const line: MerchantState['lot'][number] = { grade, g: free, price, amount: roundMoney((free / 1000) * price) };
      if (units !== undefined) {
        const n = b.n > 0 ? Math.min(b.n, Math.max(1, Math.round(free / (units * 1000)))) : 0;
        line.n = n;
        b.n -= n;
      }
      lot.push(line);
      b.g -= free;
      // W9 (rules-sim-b): a car's stripped shell weighed whole leaves with the round that collects its grade.
      if (free > 0) shellsLeave(x, grade);
    }
    if (b.g <= 0 && asideOf(b) <= 0) b.n = 0;
  }
  if (!lot.length) return;
  m.phase = 'loading';
  m.since = t;
  m.endsAt = t + x.c.merchant.load_s;
  m.lot = lot;
  x.ev.push({ type: 'roundLoad', grams: lot.reduce((a, l) => a + l.g, 0) });
}

/** The round's dated event: loading ends (pay, away) or the round ends (back, maybe load again). */
export function roundEvent(x: Ctx, t: number): void {
  const m = x.s.merchant;
  if (m.phase === 'loading') {
    const lines: TicketLine[] = m.lot.map((l) => ({ grade: l.grade, g: l.g, price: l.price, amount: l.amount, ...(l.n !== undefined ? { n: l.n } : {}) }));
    const paid = roundMoney(lines.reduce((a, l) => a + l.amount, 0));
    const firstGrades = [...new Set(lines.map((l) => l.grade))].filter((g) => (x.s.counts![`sold:${g}`] ?? 0) === 0);
    for (const l of lines) {
      supply(x, l.grade, l.g);
      count(x, `sold:${l.grade}`);
      if (x.away) {
        const a = (x.away.lines[l.grade] ??= { g: 0, money: 0 });
        a.g += l.g;
        a.money = roundMoney(a.money + l.amount);
      }
    }
    // withBoss: some of the lot was weighed in by the boss since the last collection (else the cab's one-line chip, 4.4 item 4).
    const withBoss = x.live && (x.s.counts!.bossWeighedSinceCollect ?? 0) > 0;
    x.s.counts!.bossWeighedSinceCollect = 0;
    const ticket = printTicket(x, { ...ticketBase(x, t), kind: 'collection' as const, buyer: x.c.merchant.id, lines, paid, withBoss, firstGrades });
    earn(x, paid, t);
    count(x, 'collected');
    const first = firstGrades.length > 0;
    x.ev.push({ type: 'collected', ticket, first });
    x.ev.push({ type: 'roundAway' });
    m.phase = 'away';
    m.since = t;
    m.endsAt = t + x.c.merchant.round_s;
    m.lot = [];
    return;
  }
  if (m.phase === 'away') {
    m.phase = 'waiting';
    m.since = t;
    m.endsAt = null;
    x.ev.push({ type: 'roundBack' });
    roundTry(x, t);
  }
}
