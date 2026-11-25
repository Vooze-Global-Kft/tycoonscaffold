/**
 * tickets.ts (2.2): printed arithmetic exact (a ticket's total equals its lines; a line equals rounded
 * kilograms times price), the weighbridge's net = gross − tare at its step, at most three lines and
 * "+ n more", the legal lines, the lesson paced (only on a value jump in the quiet minutes, never twice).
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NAMES, FIXTURE_NOW, SALVAGE_TEST, fixtureGame, withTestContent } from '../fixtures/salvage';
import { marketDay } from './board';
import { roundMoney, sumAmounts } from './money';
import { collectionTicket, lotLine, skipTicket, ticketView, weighInTicket } from './tickets';
import type { Piece, SalvageGame } from './types';
import { TEXT_KEYS } from './types';

const cfg = withTestContent(GameConfigSchema.parse(gameJson));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const C = SALVAGE_TEST;
const DAY = marketDay(C, FIXTURE_NOW);
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat());
const pc = (uid: string, grade: string, g: number): Piece => ({ uid, grade, g, from: null, spec: 0 });

describe('tickets', () => {
  it('a weigh-in: lines rounded half up to 0.1 kg, amount = kg × price, total = sum, rounding kept', () => {
    const g = fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
    const pieces = [pc('a', 'li', 10_049), pc('b', 'li', 10_051), pc('c', 'mot', 5_050), pc('d', 'bb', 7_333), pc('e', 'no2', 777)];
    const { ticket, round_g } = weighInTicket(cfg, g, 'boss', pieces, 10, DAY);
    for (const l of ticket.lines) {
      expect(l.g % 100).toBe(0);
      expect(l.amount).toBe(roundMoney((l.g / 1000) * l.price));
    }
    expect(ticket.todaysValue).toBe(sumAmounts(ticket.lines));
    expect(round_g).toBe(ticket.lines.reduce((a, l) => a + l.g, 0) - pieces.reduce((a, p) => a + p.g, 0));
    const v = ticketView(ticket);
    expect(v.lines.length).toBe(3);
    expect(v.more?.args?.n).toEqual({ n: ticket.lines.length - 3 });
    expect(v.legal[0].key).toBe('ticket.weighInLegal');
  });
  it('the lesson waits in the quiet minutes unless it is a value jump, and never shows twice', () => {
    const g = fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
    const li = weighInTicket(cfg, g, 'boss', [pc('a', 'li', 10_000)], 5, DAY).ticket;
    expect(li.lessonText).toBeNull();
    const after = { ...g, salvage: { ...g.salvage, tickets: [li] } };
    const bb = weighInTicket(cfg, after, 'boss', [pc('b', 'bb', 7_000)], 20, DAY).ticket;
    expect(bb.lessonText?.key).toBe('lesson.bb');
    const seen = { ...after, salvage: { ...after.salvage, tickets: [li, bb], lessonsSeen: ['bb'] } };
    expect(weighInTicket(cfg, seen, 'boss', [pc('c', 'bb', 7_000)], 400, DAY).ticket.lessonText).toBeNull();
    expect(weighInTicket(cfg, seen, 'boss', [pc('d', 'li', 7_000)], 400, DAY).ticket.lessonText?.key).toBe('lesson.li');
  });
  it('a lot line resolves down; the collection pays the sum of its lines', () => {
    const g = fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
    const lines = [lotLine(C, 'li', 20_099, DAY), lotLine(C, 'cab', 9_901, DAY), lotLine(C, 'brs', 4_444, DAY, { price: 21.37 })];
    expect(lines.map((l) => l.g)).toEqual([20_000, 9_900, 4_400]);
    const t = collectionTicket(g, lines, 30, DAY, true, ['li']);
    expect(t.paid).toBe(sumAmounts(lines));
    expect(ticketView(t).legal.map((l) => l.key)).toEqual(['ticket.lotSoldTo', 'ticket.weighedOut']);
  });
  it('the weighbridge: gross and tare at the bridge step, net their difference', () => {
    const g = fixtureGame('fresh', base(), FIXTURE_NOW) as SalvageGame;
    const t = skipTicket(C, g, { partner: 'partnerFarm', trial: true, load_g: 110_000, tare_g: 12_545_000, paid: 50, contents: { washer: 2 } }, 1, DAY);
    const step = C.scale.bridgeStepKg * 1000;
    expect(t.gross_g % step).toBe(0);
    expect(t.tare_g % step).toBe(0);
    expect(t.net_g).toBe(t.gross_g - t.tare_g);
  });
  it('every ticket of every frozen state views with text keys and exact totals', () => {
    for (const name of FIXTURE_NAMES) {
      const g = fixtureGame(name, base(), FIXTURE_NOW) as SalvageGame;
      for (const t of g.salvage.tickets) {
        if (t.kind === 'weighIn') expect(t.todaysValue).toBe(sumAmounts(t.lines));
        if (t.kind === 'collection') expect(t.paid).toBe(sumAmounts(t.lines));
        if (t.kind === 'weighIn' || t.kind === 'collection') for (const l of t.lines) expect(l.amount).toBe(roundMoney((l.g / 1000) * l.price));
        const v = ticketView(t);
        for (const x of [v.head, v.date, ...v.lines, ...v.legal, ...(v.more ? [v.more] : []), ...(v.value ? [v.value] : [])]) expect(KEYS.has(x.key), x.key).toBe(true);
      }
    }
  });
});
