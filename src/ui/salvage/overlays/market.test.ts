/// <reference types="node" />
/**
 * The market's cards (overlays-b: yard-stage1.md 4.3, 4.4, 2.7 to 2.11, 4.6), on the frozen test states
 * (no tuned number pinned) and, for words that must fit, the game's own content (its grade names, the
 * register's names, Help's sentences):
 * - the board's rows fit the panel at 667 wide and font scale 1.3 (and at 844 / 1.0): the name, the
 *   price with the day word, the bars with the stock, the button slot 96 to 136 wide, rows ≥ 56 pt;
 * - the industry table's one-line rows fit (rank, logo, chip name ≤ 14, tonnes, "simulated"), 26 rows,
 *   one plate seed per rival, the nine rung cells fit;
 * - every line a card prints is a key of strings.ts and leaves no hole unfilled (away card, clipboard
 *   tickets, skip heads, rung sign, deal terms);
 * - Sell carries the step it shows (the stand-in's label total is the action's grams × price);
 * - every kind of the market has its view.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../../config/schema';
import { SalvageSchema } from '../../../config/schema.salvage';
import * as E from '../../../engine/economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { textW } from '../hud/metrics';
import { TEXT, say } from '../strings';
import { BUY_MAX, BUY_W, MIN_PT, TYPE, frameLayout, pt } from './layout';
import { BOARD_ROW_MIN, SIM_PT, LOGO, PICTO, BARS, boardOffsets, boardRow, barHeight, rungCells, tableCols } from './marketLayout';
import { boardWithSell, offeredTerms } from './marketSample';
import { AWAY_LINES, AWAY_LINES_LARGE, awayLines, converterNote, helpLessons, plateSeed, rowExtra, realPolicyUrl, rowExtraLine, rungBox, rungLines, skipHead, ticketSummary } from './marketLines';

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withTestContent(GameConfigSchema.parse(raw));
const real = SalvageSchema.parse(raw.salvage);
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const game = (n: (typeof FIXTURE_NAMES)[number]) => fixtureGame(n, base(), FIXTURE_NOW);
/** Words with the game's own names and grades (the register's, text.json's). */
const words = (t: R.Txt) => say(t, { ...cfg.salvage, names: real.names, grades: real.grades, objects: real.objects } as never);

const S844 = { w: 844, h: 390, insets: { top: 0, left: 47, right: 47, bottom: 21 } };
const S667 = { w: 667, h: 375, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const SIZES = [
  { name: '844 / 1.0', L: frameLayout(S844.w, S844.h, S844.insets, 1) },
  { name: '844 / 1.3', L: frameLayout(S844.w, S844.h, S844.insets, 1.3) },
  { name: '667 / 1.0', L: frameLayout(S667.w, S667.h, S667.insets, 1) },
  { name: '667 / 1.3', L: frameLayout(S667.w, S667.h, S667.insets, 1.3) },
];

// The frozen states are played once, lazily, on first read (director.ts): play them before the tests' 5 s clocks start.
beforeAll(() => {
  for (const f of FIXTURE_NAMES) game(f);
}, 120_000);

const unfilled = (s: string) => /\{[A-Za-z0-9_.|]+\}/.test(s);

describe('the price board (4.4)', () => {
  it('a row holds its three lines and a 36 pt button, at least 56 pt; the slot is 96 to 136 and holds "Sell §12,345"', () => {
    for (const { name, L } of SIZES) {
      const r = boardRow(L, false);
      expect(r.h, name).toBeGreaterThanOrEqual(BOARD_ROW_MIN);
      expect(r.slotW, name).toBeGreaterThanOrEqual(BUY_W);
      expect(r.slotW, name).toBeLessThanOrEqual(BUY_MAX);
      expect(textW('Sell §12,345', pt(TYPE.price, L.fs)) + 20, name).toBeLessThanOrEqual(r.slotW);
      expect(boardRow(L, true).h, name).toBeGreaterThan(r.h - 1);
    }
  });
  it("every grade's name, price line and stock line fit the text column at 667 and 1.3 (the game's own names)", () => {
    for (const { name, L } of SIZES) {
      const r = boardRow(L, true);
      const p = pt(TYPE.name, L.fs);
      const s = pt(TYPE.line, L.fs);
      for (const [id, gr] of Object.entries(real.grades)) {
        expect(textW(gr.name, p), `${name} ${id} "${gr.name}"`).toBeLessThanOrEqual(r.textW);
        const price = words({ key: 'ticket.gradeToday', args: { p: { price: 1234.56 } } });
        expect(textW(price, s) + 6 + textW(words({ key: 'board.highDay' }), s) + 12, name).toBeLessThanOrEqual(r.textW);
        const stock = words({ key: 'board.stock', args: { kg: { mass_g: 123_456_000, step: 'lot' } } });
        expect(BARS.w + 6 + textW(stock, s), `${name} ${stock}`).toBeLessThanOrEqual(r.textW);
      }
    }
  });
  it('rows stack at known offsets (one canvas draws every pictogram beside them)', () => {
    const L = SIZES[3].L;
    const o = boardOffsets(L, [false, true, false]);
    expect(o.tops).toEqual([0, o.heights[0], o.heights[0] + o.heights[1]]);
    expect(o.total).toBe(o.heights.reduce((a, b) => a + b, 0));
    expect(PICTO).toBeLessThanOrEqual(o.heights[0]);
  });
  it('the bars are a picture inside their box (the usual price at mid-height)', () => {
    expect(barHeight(1, 1)).toBe(BARS.h / 2);
    expect(barHeight(5, 1)).toBe(BARS.h);
    expect(barHeight(0, 1)).toBe(1);
    expect(barHeight(1.03, 1)).toBeGreaterThan(barHeight(1, 1));
    expect(barHeight(0.97, 1)).toBeLessThan(barHeight(1, 1));
  });
  it('the head prints the date and the time to the next prices; the hint and the fictional line are keys', () => {
    for (const n of FIXTURE_NAMES) {
      const b = R.priceBoard(cfg, game(n), FIXTURE_NOW);
      const head = words({ key: 'board.head', args: { date: { day: b.day }, t: { secs: b.nextInS } } });
      expect(unfilled(head), head).toBe(false);
      if (b.hint) expect(unfilled(words(b.hint)), words(b.hint)).toBe(false);
    }
  });
  it('Sell on a held row carries the step it shows (label total = grams × price; day and price are the row\'s)', () => {
    const g = game('m30');
    const b = boardWithSell(cfg, g, R.priceBoard(cfg, g, FIXTURE_NOW));
    const held = b.rows.filter((r) => r.held);
    expect(held.length).toBeGreaterThan(0);
    for (const r of b.rows) {
      if (!r.held) expect(r.sell).toBeNull();
      if (!r.sell) continue;
      expect(r.sell.action.act).toBe('sell');
      if (r.sell.action.act !== 'sell') continue;
      const { shown } = r.sell.action;
      expect(shown.day).toBe(b.day);
      expect(shown.price).toBe(r.price);
      expect(shown.grams % 100).toBe(0);
      expect(shown.grams).toBeLessThanOrEqual(r.bay_g - r.reserved_g - r.aside_g);
      const label = r.sell.label.args?.x;
      expect(label && 'money' in label ? label.money : -1).toBe(R.roundMoney((shown.grams / 1000) * shown.price));
      expect(rowExtra(r)).toBe(r.reserved_g > 0 || r.aside_g > 0);
    }
  });
});

describe('the industry table (2.11)', () => {
  it('26 rows, the player among them, one distinct plate seed per rival (0..24)', () => {
    for (const n of FIXTURE_NAMES) {
      const t = R.industryTable(cfg, game(n));
      expect(t.rows.length).toBe(26);
      expect(t.rows.filter((r) => r.id === 'you').length).toBe(1);
      const seeds = t.rows.map(plateSeed).filter((s): s is number => s !== null);
      expect(new Set(seeds).size).toBe(25);
      expect(Math.min(...seeds)).toBe(0);
      expect(Math.max(...seeds)).toBe(24);
    }
  });
  it('a row fits on one line at every size: rank, the 24 pt logo, the chip name (the register\'s, ≤ 14), tonnes, "simulated"', () => {
    const chips = Object.entries(real.names).filter(([k]) => /^rival\.\d+\.chip$/.test(k)).map(([, v]) => v);
    expect(chips.length).toBeGreaterThan(0);
    for (const { name, L } of SIZES) {
      const cols = tableCols(L);
      const p = pt(TYPE.name, L.fs);
      expect(cols.rowH, name).toBeGreaterThanOrEqual(LOGO);
      for (const chip of chips) expect(textW(chip, p), `${name} "${chip}"`).toBeLessThanOrEqual(cols.name);
      // The player's row prints no "simulated": its name takes that column too.
      expect(textW(real.names.homeYard ?? '', p), name).toBeLessThanOrEqual(cols.name + cols.gap + cols.sim);
      // W12: tonnes at the row's second size, with the inner margin left after the last digit.
      const tp = pt(TYPE.line, L.fs);
      expect(textW(R.fmtTonnes(1_472_697e6), tp) + 8, name).toBeLessThanOrEqual(cols.tonnes);
      expect(textW(R.fmtTonnes(12_345_678e6), tp) + 8, name).toBeLessThanOrEqual(cols.tonnes);
      // L8: the widest ordinal in bold fits its cell on one line (a seventh over the estimate).
      for (const o of ['22nd', '23rd', '26th']) expect(textW(o, p) * 1.12, `${name} ${o}`).toBeLessThanOrEqual(cols.rank);
      expect(textW(words({ key: 'table.simulated' }), SIM_PT), name).toBeLessThanOrEqual(cols.sim);
      expect(SIM_PT).toBeGreaterThanOrEqual(MIN_PT);
    }
  });
  it('the nine rung cells fit the panel and are at least 24 pt', () => {
    for (const { name, L } of SIZES) {
      const { cell, gap } = rungCells(L, 9);
      expect(cell, name).toBeGreaterThanOrEqual(24);
      expect(9 * cell + 8 * gap, name).toBeLessThanOrEqual(L.panel.w - 14 - L.panel.padRight);
    }
  });
  it('the table\'s lines are keys with every hole filled', () => {
    const t = R.industryTable(cfg, game('m30'));
    const cur = t.rungs.find((r) => r.current)!;
    for (const tx of [
      { key: 'table.headline' },
      { key: 'table.rivalsSimulated' },
      { key: 'table.rung', args: { t: { tonnes_g: cur.t * 1e6 }, r: { n: cur.range } } },
      ...(t.next ? [{ key: 'table.next', args: { rival: { name: t.next.chip }, t: { tonnes_g: t.next.need_g } } }] : []),
    ] as R.Txt[])
      expect(unfilled(words(tx)), words(tx)).toBe(false);
  });
});

describe('the away card, the clipboard, the skip, the rung sign, the deal, Help', () => {
  it('the away card (P3, P19, R6, R10): Sales, loads bought, Net in that order; never gross as "in your account"; next step before the grade lines; three at large type; every hole filled', () => {
    const a = game('back').salvage.away!;
    expect(a).toBeTruthy();
    const many = { ...a, lines: Array.from({ length: 8 }, (_, i) => ({ grade: a.lines[0]?.grade ?? 'li', g: 1000 * (i + 1), money: i })) };
    expect(awayLines(many).lines.length).toBe(AWAY_LINES + 1);
    expect(awayLines(many).lines[AWAY_LINES].key).toBe('ticket.more');
    expect(awayLines(many, true).lines.length).toBe(AWAY_LINES_LARGE + 1);
    // A pass that bought loads: the gross is "Sales", the cost is its own line, Net is what cash moved by.
    const bought = { ...a, money: 1000, spent: 300, net: 700, bought: [{ partner: 'partnerFarm', n: 3, spent: 300 }], absentS: 4 * 3600, seconds: 2 * 3600, deliveryList: [{ day: 1, g: 150000, paid: 90 }], runLonger: { rung: 3, capS: 4 * 3600 }, passed: ['rival.25' as never], next: { key: 'away.nothing' } as R.Txt };
    const L = awayLines(bought);
    expect(L.money.map((t) => t.key)).toEqual(['away.sales', 'away.bought']);
    expect(words(L.money[1])).toContain('3');
    expect(L.net!.key).toBe('away.net');
    expect(words(L.net!)).toContain(R.fmtMoney(700));
    expect(words(L.head)).toContain(R.fmtDuration(2 * 3600));
    expect(L.longer!.key).toBe('away.longerRung');
    expect(L.news.map((t) => t.key)).toEqual(['ticket.dealDelivery', 'away.passed']);
    const loss = awayLines({ ...bought, net: -50 });
    expect(loss.net!.key).toBe('away.netLoss');
    expect(words(loss.net!)).toContain(R.fmtMoney(50));
    // join3: a negative Net with value left in the bays says so right under Net.
    expect(awayLines({ ...bought, net: -50, unsold: 0 }).unsold).toBeNull();
    const held = awayLines({ ...bought, net: -1523, unsold: 4210 });
    expect(held.unsold!.key).toBe('away.unsold');
    expect(words(held.unsold!)).toContain(R.fmtMoney(4210));
    expect(unfilled(words(held.unsold!))).toBe(false);
    expect(awayLines({ ...bought, bought: [...bought.bought, { partner: 'partnerDemolition', n: 1, spent: 80 }] }).money.map((t) => t.key)).toEqual(['away.sales', 'away.boughtFrom', 'away.boughtFrom']);
    for (const x of [a, many, bought, { ...bought, runLonger: { item: 'night' as const, capS: 7200 } }]) {
      const o = awayLines(x);
      for (const t of [o.head, ...(o.longer ? [o.longer] : []), ...o.money, ...(o.net ? [o.net] : []), ...o.news, ...(o.next ? [o.next] : []), ...o.lines]) expect(unfilled(words(t)), words(t)).toBe(false);
    }
  });
  it("the rung box (P17, W13a, S10): the player's OWN tonnes, 'Next:' before the next rung, a bare tonnage past this stage", () => {
    for (const f of FIXTURE_NAMES) {
      const g = game(f);
      const t = R.industryTable(cfg, g);
      const rp = R.rungProgress(cfg, g);
      const b = rungBox(t, t.rows.find((r) => r.id === 'you') ?? null, rp);
      expect(b.own!.key).toBe('table.mine');
      expect(words(b.own!)).toContain(R.fmtTonnes(g.salvage.ladder.supplied_g));
      if (b.next) {
        expect(unfilled(words(b.next)), words(b.next)).toBe(false);
        expect(['table.nextRung', 'table.lockedBare']).toContain(b.next.key);
        expect(words(b.next)).not.toMatch(/^Opens/);
      }
    }
    // Past this stage's last rung: no "Opens", a tonnage only.
    const g = game('back');
    const t = R.industryTable(cfg, g);
    const past = { ...t, rungs: t.rungs.map((r) => ({ ...r, open: r.n <= 3, current: r.n === 3 })) };
    const b = rungBox(past, null, { ...R.rungProgress(cfg, g), next: null });
    expect(b.next!.key).toBe('table.lockedBare');
    expect(words(b.next!)).not.toMatch(/open/i);
  });
  it('the board: a held row prints "Held until ..." (W13b); an empty board says where rows come from (S9); the converter is paid on assay (W15); the placeholder policy hides', () => {
    const r = R.priceBoard(cfg, game('m30'), FIXTURE_NOW).rows[0];
    const held = { ...r, held: true, reserved_g: 0, aside_g: 0, heldLine: { key: 'board.heldUntil' } as R.Txt };
    expect(rowExtraLine(held)!.key).toBe('board.heldUntil');
    expect(rowExtra(held)).toBe(true);
    expect(rowExtra({ ...held, held: false })).toBe(false);
    expect(TEXT['board.empty']).toBeTruthy();
    const conv = converterNote(cfg)!;
    expect(conv.key).toBe('card.converterPaid');
    expect(unfilled(words(conv)), words(conv)).toBe(false);
    const tk = { kind: 'weighIn', no: 1, day: 1, at: 0, lines: [{ grade: 'conv', g: 1500, price: 1, amount: 1 }], todaysValue: 1 } as unknown as R.Ticket;
    expect(ticketSummary(tk, conv).lines[1]).toBe(conv);
    expect(realPolicyUrl('https://example.com/scrap-to-ingot/privacy')).toBeNull();
    expect(realPolicyUrl('https://owner.site/privacy')).toBe('https://owner.site/privacy');
  });
  it('every ticket of every frozen state prints its head, total and lines with no hole left', () => {
    let n = 0;
    for (const f of FIXTURE_NAMES)
      for (const t of game(f).salvage.tickets) {
        const s = ticketSummary(t);
        for (const tx of [s.head, ...(s.total ? [s.total] : []), ...s.lines]) {
          expect(tx.key in TEXT).toBe(true);
          expect(unfilled(words(tx)), `${t.kind}: ${words(tx)}`).toBe(false);
        }
        n++;
      }
    expect(n).toBeGreaterThan(0);
  });
  it("a skip's head names its state; its lines fill", () => {
    for (const f of FIXTURE_NAMES) {
      const g = game(f);
      for (const p of Object.keys(g.salvage.partners))
        for (const l of R.skipLabels(cfg, g, p)) {
          const h = words(skipHead(l));
          expect(unfilled(h), h).toBe(false);
          if (l.refusal) expect(unfilled(words(l.refusal)), words(l.refusal)).toBe(false);
        }
    }
  });
  it('the rung sign says "{homeYard} · {t} supplied" and what rungs 2 and 3 open', () => {
    for (const n of [2, 3]) {
      const r = rungLines(n, 2, 12);
      expect(unfilled(words(r.sign)), words(r.sign)).toBe(false);
      expect(r.opens).not.toBeNull();
      expect(unfilled(words(r.opens!)), words(r.opens!)).toBe(false);
    }
    expect(rungLines(4, 150, null).opens).toBeNull();
  });
  it('the offered deal shows its terms (q and days from the series) and Sign carries them', () => {
    const g = game('m15');
    const t = offeredTerms(cfg, g, FIXTURE_NOW)!;
    expect(t).toBeTruthy();
    const s = cfg.salvage.deal.series[g.salvage.deal.step!];
    expect(t.q_g).toBe(s.q_kg * 1000);
    expect(t.days).toBe(s.days);
    expect(t.price).toBeGreaterThan(0);
    expect(offeredTerms(cfg, game('m30'), FIXTURE_NOW)).toBeNull();
    const line = words({ key: 'card.dealTerms', args: { kg: { mass_g: t.q_g, step: 'lot' }, grade: { grade: 'ci' }, n: { n: t.days }, p: { price: t.price } } });
    expect(unfilled(line), line).toBe(false);
    expect(line).not.toMatch(/contract/i);
  });
  it('Help prints every lesson of the content in full and the glossary; nothing is under 11 pt', () => {
    const ls = helpLessons(real as never);
    expect(ls.length).toBe(Object.keys(real.text!.lessons).length);
    for (const l of ls) {
      expect(l.help.length).toBeGreaterThan(10);
      if (l.key) expect(unfilled(TEXT[l.key])).toBe(false);
    }
    expect(real.text!.glossary.length).toBeGreaterThan(0);
    for (const { L } of SIZES) for (const s of Object.values(TYPE)) expect(pt(s, L.fs)).toBeGreaterThanOrEqual(MIN_PT);
  });
});
