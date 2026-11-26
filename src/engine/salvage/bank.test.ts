/**
 * PLANT FINANCE (stage 2, yard-stage2.md 2.14 and 8.1's row 2.14; rulings 3 as corrected by 11; E37, E41):
 * the terms, the split, payLot at every lot payment before its ticket, the sum taken equal to T to the cent,
 * credit never shared, the letter, the Bank loan's foot, signFinance's refusals, the finance card, the
 * Agreements tab, the ticket's bank line, the advice's one sentence, an open agreement through a save. Frozen
 * content: the arithmetic on hand-written numbers (the ruling's worked example), the yard on the loop's frozen
 * `r3` and its own content (fixtures/salvage2money.ts), never game.json. No tuned number is pinned. Owner: rules-money.
 */
import { describe, expect, it } from 'vitest';
import { asLayout2, moneyCfg, r3finGame, r3loan, r3open, R3FIN_PLATE } from '../fixtures/salvage2money';
import { stage2Game } from '../fixtures/salvage';
import * as R from '../salvage';
import { onSeen, signFinance } from './actionsMoney';
import { advice, reserve } from './advice';
import { bankSplit, financeTerms, loanFoot, loanOffered, payLot, platePrice, ratedIG, saveUpSeconds, shownOf, termsAt } from './bank';
import { cardOfMoney } from './cardsMoney';
import { begin, credit, finish } from './clock';
import { roundMoney } from './money';
import { reconcileSalvage } from './save';
import { ticketView } from './tickets';
import type { Agreement, CardData, SalvageConfig, SalvageEvent, SalvageGame, Ticket } from './types';
import type { SalvageContent } from '../../config/schema.salvage';

const CFG = moneyCfg();
const PLATE = R3FIN_PLATE;
const rt = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const whole = (g: SalvageGame): unknown => {
  const s = rt(g.salvage) as unknown as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};
/** A game with an agreement of total T put in by hand (none taken yet): the split's tests need no plate. */
const withAgreement = (g: SalvageGame, T: number, taken = 0): SalvageGame => ({
  ...g,
  salvage: { ...g.salvage, bank: { ...g.salvage.bank, agreement: { kind: 'bank', plate: PLATE, P: T, F: T, c: 0, T, taken, signedAt: g.salvage.t, I: 1 } } },
});
const ticks = (cfg: SalvageConfig, g: SalvageGame, seconds: number, ev?: SalvageEvent[]): SalvageGame => {
  let a = g;
  let ms = a.salvage.clock.highMs;
  for (let i = 0; i < seconds * 10; i++) {
    ms += 100;
    a = R.advanceSalvage(cfg, a, 0.1, ms, ev);
  }
  return a;
};

// ============================================================================ the arithmetic (2.14.3, 2.14.6)

/** A content with only what the terms read: the bank's first values, one financeable plate, tau 9 h at rung 3. */
const ARITH = {
  bank: { share: 0.2, shareWords: 'A fifth', charge: 0.08, maxShare: 0.8, maxF_h: 2, maxF_tau: 0.15, minPrice_h: 0.5, maxAgreements: 1 },
  tau_h: [null, null, 9, 22, 45],
  works: { plates: { p: { financeable: true }, q: { financeable: false } } },
} as unknown as SalvageContent;

describe('2.14.3 the terms (the ruling\'s worked example, 2.14.6)', () => {
  it('a plate at §80,000 with I §54,500 at rung 3: F §64,000, deposit §16,000, charge §5,120, T §69,120', () => {
    expect(termsAt(ARITH, 'p', 80000, 54500, 3)).toMatchObject({ P: 80000, F: 64000, d: 16000, charge: 5120, T: 69120, I: 54500, share: 0.2 });
  });
  it('F_max = min(2 h, 0.15 × tau) × I binds a dear plate: §100,000 → F §73,575, charge §5,886, T §79,461', () => {
    expect(termsAt(ARITH, 'p', 100000, 54500, 3)).toMatchObject({ F: 73575, d: 26425, charge: 5886, T: 79461 });
    // At rung 4 (tau 22 h) the 2 h cap binds: F = min(0.8 P, 2 I).
    expect(termsAt(ARITH, 'p', 200000, 54500, 4)).toMatchObject({ F: 109000, d: 91000 });
  });
  it('nothing is financeable below half an hour of I, without the flag, below rung 3 (no tau) or with no income', () => {
    expect(termsAt(ARITH, 'p', 27249, 54500, 3)).toBeNull();
    expect(termsAt(ARITH, 'p', 27250, 54500, 3)).not.toBeNull();
    expect(termsAt(ARITH, 'q', 80000, 54500, 3)).toBeNull();
    expect(termsAt(ARITH, 'p', 80000, 54500, 2)).toBeNull();
    expect(termsAt(ARITH, 'p', 80000, 0, 3)).toBeNull();
    expect(termsAt({ ...ARITH, bank: undefined } as SalvageContent, 'p', 80000, 54500, 3)).toBeNull();
  });
});

describe('2.14.4 the split (bankSplit)', () => {
  it('a fifth of the payment, at most what is left', () => {
    expect(bankSplit(620, [{ T: 69120, taken: 0 }], 0.2)).toEqual([124]);
    expect(bankSplit(620, [{ T: 100, taken: 90 }], 0.2)).toEqual([10]);
    expect(bankSplit(0.03, [{ T: 100, taken: 0 }], 0.2)).toEqual([0.01]);
  });
  it('with maxAgreements raised (stage 3\'s path): two agreements together take exactly the share, oldest first', () => {
    expect(bankSplit(1000, [{ T: 150, taken: 0 }, { T: 1000, taken: 0 }], 0.2)).toEqual([150, 50]);
    expect(bankSplit(1000, [{ T: 1000, taken: 0 }, { T: 1000, taken: 0 }], 0.2)).toEqual([200, 0]);
    const ys = bankSplit(777.77, [{ T: 60, taken: 0 }, { T: 500, taken: 0 }, { T: 500, taken: 0 }], 0.2);
    expect(roundMoney(ys.reduce((a, y) => a + y, 0))).toBe(roundMoney(0.2 * 777.77));
  });
});

// ============================================================================ payLot: every payment, the sum exact

describe('2.14.4 payLot: the sum taken equals T exactly, to the cent, whatever the order and size of lots', () => {
  it('many lots of varied sizes (a fixed sequence) repay T to the cent; y ≤ a fifth; y + z = gross; one `repaid`', () => {
    for (const T of [69120, 12345.67, 0.05, 999.99]) {
      const x = begin(CFG, withAgreement(stage2Game('r3'), T), []);
      let seed = 12345;
      let sum = 0;
      let n = 0;
      while (x.s.bank.agreement && n < 100000) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        const gross = roundMoney(0.01 + (seed / 2147483648) * (n % 3 === 0 ? 5000 : 40));
        const { y, z } = payLot(x, gross, x.s.t + n);
        expect(y).toBeLessThanOrEqual(roundMoney(0.2 * gross) + 1e-9);
        expect(roundMoney(y + z)).toBe(gross);
        sum = roundMoney(sum + y);
        n++;
      }
      expect(sum, `T ${T}`).toBe(T);
      expect(x.s.bank.agreement).toBeNull();
      expect(x.s.bank.done.at(-1)).toMatchObject({ plate: PLATE, T });
      expect(x.ev.filter((e) => e.type === 'repaid')).toHaveLength(1);
      // Nothing more is taken once repaid.
      expect(payLot(x, 1000, x.s.t)).toEqual({ y: 0, z: 1000 });
    }
  });

  it('no agreement: payLot takes nothing (the first yard advances exactly as before)', () => {
    const x = begin(CFG, stage2Game('r3'), []);
    expect(payLot(x, 620, x.s.t)).toEqual({ y: 0, z: 620 });
    expect(x.ev).toHaveLength(0);
  });

  it('an ad reward or granted scrip goes through credit and never reaches the bank', () => {
    const g = withAgreement(stage2Game('r3'), 5000, 100);
    const x = begin(CFG, g, []);
    credit(x, 400, x.s.t, 'ad');
    credit(x, 1000, x.s.t, 'grant');
    const out = finish(g, x);
    expect(out.salvage.bank.agreement!.taken).toBe(100);
    expect(out.cash).toBe(roundMoney(g.cash + 1400));
    expect(x.ev.some((e) => e.type === 'bankTaken')).toBe(false);
  });
});

describe('2.14.4 in the running yard: before each ticket, by tick, by jump and away alike', () => {
  const T = 400;
  const g0 = withAgreement(stage2Game('r3'), T);

  it('each lot ticket carries bank.y equal to what was taken for it (bankTaken just before it), z earned; ticks equal a jump', () => {
    const ev: SalvageEvent[] = [];
    const a = ticks(CFG, g0, 600, ev);
    const b = R.jump(CFG, g0, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    const tickets: Ticket[] = [];
    let lastTaken: number | null = null;
    let took = 0;
    for (const e of ev) {
      if (e.type === 'bankTaken') {
        lastTaken = e.y;
        took = roundMoney(took + e.y);
      }
      // Every lot payment's ticket (the round's collection, a deal's delivery and, from wave 2 of the works, the gate's sale, the van, the picking table).
      const t0 = (e as { ticket?: Ticket }).ticket;
      if (t0 && 'paid' in t0 && e.type !== 'weighIn' && e.type !== 'bridgeWeighIn') {
        const t = t0;
        tickets.push(t);
        const y = 'bank' in t && t.bank ? t.bank.y : 0;
        expect(y, `ticket ${t.no}`).toBe(lastTaken ?? 0);
        lastTaken = null;
      }
    }
    expect(tickets.length).toBeGreaterThan(0);
    const fromTickets = roundMoney(tickets.reduce((s, t) => s + ('bank' in t && t.bank ? t.bank.y : 0), 0));
    expect(fromTickets).toBe(took);
    const taken = a.salvage.bank.agreement ? a.salvage.bank.agreement.taken : T;
    expect(took).toBe(taken);
    // The cash rose by what the yard kept: sales less the bank's part (purchases aside: the bot buys nothing here).
    expect(roundMoney(a.lifetimeEarnings - g0.lifetimeEarnings)).toBe(roundMoney(tickets.reduce((s, t) => s + ('paid' in t ? t.paid : 0), 0) - took));
  }, 300_000);

  it('with group.ahead false (every run trip by trip, out of sight too): ticks equal a jump with the agreement open; every gram of lot paid splits the same', () => {
    const grp = (CFG.salvage as unknown as { group?: Record<string, unknown> }).group;
    const cfgOff = { ...CFG, salvage: { ...CFG.salvage, group: { ...(grp ?? {}), ahead: false } } } as unknown as SalvageConfig;
    const a = ticks(cfgOff, g0, 300);
    const b = R.jump(cfgOff, g0, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    // A lot of any grade (no plate of the works runs in r3: every lot is of a grade the financed plate never touched) is split.
    expect(a.salvage.bank.agreement ? a.salvage.bank.agreement.taken : T).toBeGreaterThan(0);
  }, 300_000);

  it('away: the card\'s bank line is what was taken, its money gross; repaid in full names the plate once; one pass equals the absence cut in two', () => {
    const now0 = g0.salvage.clock.highMs;
    const one = R.salvageOffline(CFG, { ...g0, lastSavedAt: now0 }, now0 + 2 * 3600_000);
    const card = one.game.salvage.away!;
    expect(one.game.salvage.bank.agreement).toBeNull();
    expect(card.bank).toBe(T);
    expect(card.repaid).toEqual([PLATE]);
    expect(card.money).toBeGreaterThan(T);
    // Cut into two absences (the card acknowledged between them as a person would; the yard the same).
    const h1 = R.salvageOffline(CFG, { ...g0, lastSavedAt: now0 }, now0 + 3600_000).game;
    const h2 = R.salvageOffline(CFG, { ...h1, lastSavedAt: now0 + 3600_000 }, now0 + 2 * 3600_000).game;
    const taken = (g: SalvageGame) => (g.salvage.bank.agreement ? g.salvage.bank.agreement.taken : g.salvage.bank.done.at(-1)!.T);
    expect(taken(h2)).toBe(taken(one.game));
    expect(h2.salvage.bank.done.length).toBe(one.game.salvage.bank.done.length);
  }, 300_000);
});

// ============================================================================ the letter, the foot, signing (2.14.3, 2.14.5)

describe('2.14.5 the letter: once, at a financeable works card with P > cash − reserve and cash − reserve ≥ d', () => {
  const tm = financeTerms(CFG, r3open(), PLATE)!;
  it('the frozen r3 with the works open finances the shear (the test\'s premise)', () => {
    expect(tm).not.toBeNull();
    expect(tm.P).toBe(platePrice(CFG, r3open(), PLATE));
    expect(tm.F).toBeGreaterThan(0);
    expect(roundMoney(tm.d + tm.F)).toBe(tm.P);
  });
  it('reading the works card under the condition sets letterSeen and emits `letter`; never twice; not under other cards', () => {
    const g = r3loan();
    const unseen = { ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } };
    const ev: SalvageEvent[] = [];
    expect(onSeen(CFG, unseen, { card: 'board' }, ev)).toBe(unseen);
    const seen = R.noteSeen(CFG, unseen, { card: 'works', plate: PLATE } as never, unseen.salvage.t, ev);
    expect(seen.salvage.bank.letterSeen).toBe(true);
    expect(ev.filter((e) => e.type === 'letter')).toHaveLength(1);
    expect(onSeen(CFG, seen, { card: 'works', plate: PLATE }, ev)).toBe(seen);
    expect(ev.filter((e) => e.type === 'letter')).toHaveLength(1);
  });
  it('not while the cash pays the plate outright, nor while the deposit is not in hand', () => {
    const g = r3loan();
    const unseen = (cash: number) => ({ ...g, cash, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } });
    const res = reserve(CFG, g);
    for (const cash of [roundMoney(tm.P + res + 1), roundMoney(Math.max(0, res + tm.d - 1))]) {
      const ev: SalvageEvent[] = [];
      expect(onSeen(CFG, unseen(cash), { card: 'works', plate: PLATE }, ev).salvage.bank.letterSeen, `cash ${cash}`).toBe(false);
      expect(ev).toHaveLength(0);
    }
  });
});

describe('2.14.5 the works card\'s Bank loan (loanFoot) and Save up', () => {
  const g = r3loan();
  const tm = financeTerms(CFG, g, PLATE)!;
  const res = reserve(CFG, g);
  it('offered only after the letter and only while P > cash − reserve (P12)', () => {
    expect(loanFoot(CFG, g, PLATE).loan?.refusal).toBeNull();
    expect(loanFoot(CFG, g, PLATE).loan?.action).toEqual({ act: 'open', card: { kind: 'finance', plate: PLATE } });
    const noLetter = { ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } };
    expect(loanFoot(CFG, noLetter, PLATE).loan).toBeNull();
    const rich = { ...g, cash: roundMoney(tm.P + res) };
    expect(loanOffered(CFG, rich, PLATE)).toBe(false);
    expect(loanFoot(CFG, rich, PLATE).loan).toBeNull();
  });
  it('greyed with the deposit\'s shortfall while cash − reserve < d: "You pay now §d · §x more"', () => {
    const short = { ...g, cash: roundMoney(res + tm.d - 250) };
    const f = loanFoot(CFG, short, PLATE);
    expect(f.loanShort).toEqual({ d: tm.d, more: 250 });
    expect(f.loan?.refusal).toEqual({ key: 'card.works.loanShort', args: { d: { money: tm.d }, x: { money: 250 } } });
  });
  it('greyed with bankOne\'s words while an agreement is open', () => {
    const open = withAgreement(g, 1000);
    expect(loanFoot(CFG, open, PLATE).loan?.refusal).toEqual({ key: 'refusal.bankOne' });
  });
  it('"Save up": (P − cash) ÷ I, and with an agreement open (P − cash) ÷ (I − share × G)', () => {
    const { I, G } = ratedIG(CFG, g);
    expect(saveUpSeconds(CFG, g, tm.P)).toBeCloseTo((3600 * (tm.P - g.cash)) / I, 6);
    const open = withAgreement(g, 1000);
    const rate = I - 0.2 * G;
    if (rate > 0) expect(saveUpSeconds(CFG, open, tm.P)).toBeCloseTo((3600 * (tm.P - g.cash)) / rate, 6);
    else expect(saveUpSeconds(CFG, open, tm.P)).toBeNull();
    expect(saveUpSeconds(CFG, { ...g, cash: tm.P + 1 }, tm.P)).toBeNull();
  });
});

describe('2.14.3 signFinance: its refusals in order, then the deposit, the agreement, `financed`', () => {
  const g = r3loan();
  const tm = financeTerms(CFG, g, PLATE)!;
  const shown = shownOf(tm);
  const sign = (h: SalvageGame, s = shown) => {
    const ev: SalvageEvent[] = [];
    const out = signFinance(CFG, h, PLATE, s, h.salvage.t, ev);
    return { out, ev, refused: ev.find((e) => e.type === 'refused') as Extract<SalvageEvent, { type: 'refused' }> | undefined };
  };
  it('signed at the terms shown: cash − d, the agreement with the I read now, `financed {plate, F, T}`, nothing taken back', () => {
    const { out, ev } = sign(g);
    expect(out.cash).toBe(roundMoney(g.cash - tm.d));
    expect(out.cash).toBeGreaterThanOrEqual(0);
    expect(out.salvage.bank.agreement).toEqual({ kind: 'bank', plate: PLATE, P: tm.P, F: tm.F, c: tm.charge, T: tm.T, taken: 0, signedAt: g.salvage.t, I: tm.I } satisfies Agreement);
    expect(ev).toContainEqual({ type: 'financed', plate: PLATE, F: tm.F, T: tm.T });
  });
  it('bankOne: one agreement at a time', () => {
    const { refused, out } = sign(withAgreement(g, 1000));
    expect(refused?.key).toBe('bankOne');
    expect(out.salvage.bank.agreement!.T).toBe(1000);
  });
  it('notFinanceable before the letter and while the cash pays it outright; the gate before the works open', () => {
    expect(sign({ ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, letterSeen: false } } }).refused?.key).toBe('notFinanceable');
    expect(sign({ ...g, cash: roundMoney(tm.P + reserve(CFG, g) + 1) }).refused?.key).toBe('notFinanceable');
    // r3 as frozen (the works not open): the plate is not on sale.
    const closed = { ...stage2Game('r3'), cash: g.cash, salvage: { ...stage2Game('r3').salvage, bank: { ...g.salvage.bank, letterSeen: true } } };
    expect(sign(closed).refused?.key).toBe('notFinanceable');
  });
  it('bankReserve (or cash when nothing is reserved) while cash − d would fall below the reserve; the same state returned', () => {
    const res = reserve(CFG, g);
    const h = { ...g, cash: roundMoney(Math.max(0, res + tm.d - 1)) };
    const { refused, out } = sign(h);
    expect(out).toBe(h);
    if (res > 0 && h.cash >= tm.d) expect(refused).toMatchObject({ key: 'bankReserve', args: { x: { money: res } } });
    else expect(['cash', 'earmark']).toContain(refused?.key);
  });
  it('bankTerms when the terms shown differ from the terms now; its retry signs the terms now', () => {
    const { refused, out } = sign(g, { ...shown, T: shown.T + 1 });
    expect(out).toBe(g);
    expect(refused?.key).toBe('bankTerms');
    expect(refused?.retry).toEqual({ act: 'signFinance', plate: PLATE, shown });
  });
});

// ============================================================================ what the player sees (4.5, 4.1.3)

const actionsOf = (d: CardData) => [...d.foot, ...d.rows.map((r) => r.button).filter((b) => !!b)].map((b) => b!.action.act);

describe('2.14.5 the bank\'s cards: the finance card, the letter, Agreements; no shop entry or ad on a card that shows a debt', () => {
  it('the finance card prints the terms now and its Sign carries them as shown; it shows a debt', () => {
    const g = r3loan();
    const tm = financeTerms(CFG, g, PLATE)!;
    const d = cardOfMoney(CFG, g, { kind: 'finance', plate: PLATE }, 0, { country: null });
    expect(d.showsDebt).toBe(true);
    expect(d.finance).toMatchObject({ plate: PLATE, P: tm.P, deposit: tm.d, F: tm.F, charge: tm.charge, T: tm.T, refusal: null });
    expect(d.finance!.sign.action).toEqual({ act: 'signFinance', plate: PLATE, shown: shownOf(tm) });
    expect(d.lead[0]).toEqual({ key: 'card.finance.rule', args: { share: { text: 'share.fifth' }, x: { money: tm.T } } });
    // Pressing Sign as shown applies exactly what the card printed.
    const out = signFinance(CFG, g, PLATE, d.finance!.sign.action.act === 'signFinance' ? d.finance!.sign.action.shown : shownOf(tm), g.salvage.t);
    expect(out.salvage.bank.agreement).toMatchObject({ P: d.finance!.P, F: d.finance!.F, c: d.finance!.charge, T: d.finance!.T });
    expect(g.cash - out.cash).toBeCloseTo(d.finance!.deposit, 6);
  });
  it('the Agreements tab: the open row first (T, taken, left), then the history; it shows a debt', () => {
    const fin = r3finGame();
    const x = begin(CFG, fin, []);
    payLot(x, 1000, x.s.t);
    const g = finish(fin, x);
    const a = g.salvage.bank.agreement!;
    const d = cardOfMoney(CFG, { ...g, salvage: { ...g.salvage, bank: { ...g.salvage.bank, done: [{ plate: 'baler', T: 500, signedAt: 1, repaidAt: 2 }] } } }, { kind: 'office', tab: 'agreements' }, 0, { country: null });
    expect(d.showsDebt).toBe(true);
    expect(d.agreements![0]).toMatchObject({ open: true, plate: PLATE, T: a.T, taken: 200, left: roundMoney(a.T - 200), share: 0.2, lender: 'bank' });
    expect(d.agreements![1]).toMatchObject({ open: false, plate: 'baler', T: 500, left: 0, repaidAt: 2 });
  });
  it('the letter offers, it does not owe: no debt; no card of the bank carries a shop entry or an ad', () => {
    const g = r3loan();
    const letter = cardOfMoney(CFG, g, { kind: 'letter' }, 0, { country: 'US' });
    expect(letter.showsDebt).toBe(false);
    for (const ref of [{ kind: 'finance', plate: PLATE }, { kind: 'office', tab: 'agreements' }, { kind: 'letter' }] as const) {
      const d = cardOfMoney(CFG, r3finGame(), ref, 0, { country: 'US' });
      expect(d.shop, ref.kind).toBeUndefined();
      expect(d.bonus, ref.kind).toBeUndefined();
      for (const act of actionsOf(d)) expect(['buyPack', 'buyProduct', 'watchAd', 'restorePurchases'], ref.kind).not.toContain(act);
    }
  });
  it('a lot ticket the bank shared in prints "to the bank §y · to you §z" under Paid §x (z = x − y) and shows a debt; others do not', () => {
    const base = { no: 1, at: 0, day: 0 } as unknown as Ticket;
    const shared = { ...base, kind: 'collection', buyer: 'merchant', lines: [], paid: 620, withBoss: false, firstGrades: [], bank: { y: 124 } } as unknown as Ticket;
    const v = ticketView(shared);
    expect(v.value).toEqual({ key: 'ticket.paid', args: { x: { money: 620 } } });
    expect(v.bank).toEqual({ key: 'ticket.bankSplit', args: { y: { exact: 124 }, z: { exact: 496 } } });
    expect(v.showsDebt).toBe(true);
    const plain = ticketView({ ...shared, bank: undefined } as unknown as Ticket);
    expect(plain.bank).toBeUndefined();
    expect(plain.showsDebt).toBeUndefined();
  });
});

describe('2.13 the bank\'s one sentence on the advice line, only under its four conditions', () => {
  it('a financeable plate the finance card would offer, the letter seen, no agreement open: loanHint; else none', () => {
    const g = r3loan();
    const a = advice(CFG, g, 0);
    if (a && a.action.act === 'buy' && a.open.kind === 'works') {
      expect(!!a.loanHint).toBe(loanOffered(CFG, g, a.action.item));
    }
    const forced = { ...g, cash: roundMoney(g.cash) };
    for (const h of [withAgreement(forced, 1000), { ...forced, salvage: { ...forced.salvage, bank: { ...forced.salvage.bank, letterSeen: false } } }]) {
      expect(advice(CFG, h, 0)?.loanHint).toBeFalsy();
    }
  });
});

// ============================================================================ the save (2.20)

describe('2.20 an open agreement survives a save and a reload, and repays as the unsaved yard does', () => {
  it('r3fin through JSON: the agreement equal; 120 s of ticks after the reload equal 120 s without it', () => {
    const g = r3finGame();
    const loaded = reconcileSalvage(CFG, { ...g, salvage: undefined } as never, rt({ salvage: g.salvage }), g.salvage.clock.highMs);
    expect(loaded.salvage.bank).toEqual(rt(g.salvage.bank));
    // (A load resets the boss's presence by design; he is put back where he stood, so the two yards are the same yard.)
    const L = { ...loaded, cash: g.cash, lifetimeEarnings: g.lifetimeEarnings, salvage: { ...loaded.salvage, presence: g.salvage.presence, presenceAt: g.salvage.presenceAt, epoch: g.salvage.epoch } } as SalvageGame;
    const a = R.jump(CFG, g, g.salvage.t + 120);
    const b = R.jump(CFG, L, g.salvage.t + 120);
    expect(b.salvage.bank).toEqual(a.salvage.bank);
    expect(b.cash).toBe(a.cash);
  }, 120_000);
  it('a layout-2 save (no bank) loads with no agreement and the letter unseen', () => {
    const raw = asLayout2(stage2Game('r3'));
    const back = reconcileSalvage(CFG, { ...stage2Game('r3'), salvage: undefined } as never, raw, stage2Game('r3').salvage.clock.highMs);
    expect(back.salvage.bank).toEqual({ agreement: null, letterSeen: false, done: [] });
  });
});
