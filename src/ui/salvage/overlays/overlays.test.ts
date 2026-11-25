/// <reference types="node" />
/**
 * The overlay frames and the yard's own cards (yard-stage1.md 4.3, 4.5, 4.6), on the frozen test
 * content and states (lesson 4: no tuned number pinned):
 * - the frames' boxes are the specification's at 844 × 390 (insets 47 / 47 / 21) and 667 × 375 (none);
 * - the process board's 308 pt fit the band at both sizes, its rows fit the wide card's width;
 * - every card row's words are keys, effect lines are at most 38 characters, every row's name and line
 *   fit beside a Buy button in the panel at 667 wide and font scale 1.3, nothing under 11 pt;
 * - every purchase button carries the price the card shows (the label's price is the action's), and a
 *   button that cannot be pressed names its refusal by key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { measure, wrap } from '../../../../scripts/content/office/fit';
import { TEXT, say } from '../strings';
import { BUY_MAX, BUY_W, MIN_PT, PAD, TYPE, boardLayout, breakLines, fitPt, frameLayout, pt, rowHeight } from './layout';
import { textW } from '../hud/metrics';
import { boardWithButtons, machineCard, machineRows, partnerRows, rackRows, rotaRows, withSample } from './sample';

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withTestContent(GameConfigSchema.parse(raw));
const base = () => E.createInitialState(cfg, FIXTURE_NOW);
const game = (n: (typeof FIXTURE_NAMES)[number]) => fixtureGame(n, base(), FIXTURE_NOW);
const c = cfg.salvage;

const S844 = { w: 844, h: 390, insets: { top: 0, left: 47, right: 47, bottom: 21 } };
const S667 = { w: 667, h: 375, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('the frames (4.3)', () => {
  it('844 × 390: panel 489 from the bar (36) to the bottom inset; wide card 726; centred at most 520 × 300', () => {
    const l = frameLayout(S844.w, S844.h, S844.insets, 1);
    expect(l.panel.w).toBe(489);
    expect(l.panel.x + l.panel.w).toBe(844);
    expect(l.panel.y).toBe(36);
    expect(l.panel.y + l.panel.h).toBe(390 - 21);
    expect(l.wide.w).toBe(726);
    expect(l.wide.h).toBe(333);
    expect(l.centred.w).toBeLessThanOrEqual(520);
    expect(l.centred.h).toBeLessThanOrEqual(300);
  });
  it('667 × 375: panel 413, wide card 611 in a band of 325', () => {
    const l = frameLayout(S667.w, S667.h, S667.insets, 1);
    expect(l.panel.w).toBe(413);
    expect(l.panel.y).toBe(34);
    expect(l.band.height).toBe(325);
    expect(l.wide.w).toBe(611);
  });
  it('text is never under 11 pt; the font scale is held to 1.3; a row is 44 pt at 1.0 and holds its 31 pt of text at 1.3', () => {
    for (const fs of [0.8, 1, 1.15, 1.3, 2]) for (const s of Object.values(TYPE)) expect(pt(s, frameLayout(844, 390, S844.insets, fs).fs)).toBeGreaterThanOrEqual(MIN_PT);
    expect(frameLayout(844, 390, S844.insets, 2).fs).toBe(1.3);
    expect(rowHeight(1)).toBe(44);
    expect(rowHeight(1.3)).toBeGreaterThanOrEqual(Math.ceil(pt(13, 1.3) * 1.25 + pt(11, 1.3) * 1.25));
  });
});

describe('the process board (4.5)', () => {
  for (const s of [S844, S667]) {
    it(`${s.w}: plates, bars and title make 308 pt inside the band, and every row fits the card's width`, () => {
      const l = frameLayout(s.w, s.h, s.insets, 1.3);
      const b = boardLayout(s.w);
      expect(b.total).toBe(308);
      // The title row (32) and the four rows with their gaps and the top padding (8).
      expect(32 + 8 + 4 * b.plateH + 3 * b.rowGap).toBeLessThanOrEqual(l.band.height);
      const board = R.processBoard(cfg, game('m30'));
      for (const r of board.rows) {
        const n = r.plates.length;
        const w = r.id === 'greyed' ? n * b.greyW + (n - 1) * (s.w === 844 ? 10 : 4) : n * b.plateW + (n - 1) * b.barW + BUY_W + 12;
        expect(w, r.id).toBeLessThanOrEqual(l.wide.w - 2 * PAD);
      }
    });
  }
  it('plate names break into two lines of 12 (greyed: three of 11) and fit the plate at 1.3', () => {
    const board = R.processBoard(cfg, game('fresh'));
    for (const r of board.rows)
      for (const p of r.plates) {
        const greyed = p.state === 'greyed';
        const lines = greyed ? breakLines(say(p.name, c), 11, 3) : breakLines(say(p.name, c), 12, 2);
        expect(lines.length).toBeLessThanOrEqual(greyed ? 3 : 2);
        for (const line of lines) expect(measure(line, pt(greyed ? 11 : 12, 1.3)), line).toBeLessThanOrEqual((greyed ? 108 : 120) - 12);
        if (greyed) expect(p.line).toBeNull();
      }
  });
  it('every plate\'s state line fits its plate on one line at 667 and font scale 1.3, at 11 pt or more', () => {
    const b = boardLayout(667);
    for (const n of FIXTURE_NAMES) {
      const g = game(n);
      for (const p of boardWithButtons(cfg, g, R.processBoard(cfg, g)).rows.flatMap((r) => r.plates)) {
        if (!p.line || p.state === 'greyed') continue;
        const text = say(p.line, c);
        const room = b.plateW - 8;
        const size = fitPt(text, pt(11, 1.3), room);
        expect(size).toBeGreaterThanOrEqual(MIN_PT);
        expect(textW(text, size), `${n} ${p.id}: ${text}`).toBeLessThanOrEqual(room);
      }
    }
  });
  it('a buyable plate\'s Buy carries the facade\'s price, and its label shows that price', () => {
    for (const n of FIXTURE_NAMES) {
      const g = game(n);
      const b = boardWithButtons(cfg, g, R.processBoard(cfg, g));
      for (const p of b.rows.flatMap((r) => r.plates)) {
        if (p.state !== 'buyable' || !p.button) continue;
        const a = p.button!.action;
        expect(a.act).toBe('buy');
        if (a.act === 'buy') {
          expect(a.price).toBe(R.shopPrice(cfg, g, a.item));
          expect(say(p.button!.label, c)).toContain(R.fmtMoney(a.price));
        }
      }
    }
  });
});

/** Every row of the yard's own cards in a frozen state. */
function cardRows(n: (typeof FIXTURE_NAMES)[number]) {
  const g = game(n);
  const machines = (['stripper', 'bench', 'crucible'] as const).flatMap((m) => machineRows(cfg, g, machineCard(cfg, g, m)));
  return { g, rows: [...rackRows(cfg, g), ...rotaRows(cfg, g), ...partnerRows(cfg, g), ...machines] };
}

describe('the yard cards (4.3, 4.6)', () => {
  it('fresh: the rack and rota show Owned base tools, Buy and Hire with prices, the torch behind its padlock', () => {
    const { g } = cardRows('fresh');
    const rack = rackRows(cfg, g);
    expect(rack.find((r) => r.id === 'spanners')?.button).toBeNull();
    const sack = rack.find((r) => r.id === 'sack')!;
    expect(sack.button?.action).toEqual({ act: 'buy', item: 'sack', price: R.shopPrice(cfg, g, 'sack') });
    const torch = rack.find((r) => r.id === 'torch')!;
    expect(torch.button).toBeNull();
    expect(torch.line?.key).toBe('refusal.rung');
    const rota = rotaRows(cfg, g);
    expect(rota.find((r) => r.id === 'hand.next')?.button?.action.act).toBe('hire');
  });
  it('m30: owned things show no button; the crucible has its numbers', () => {
    const { g } = cardRows('m30');
    expect(rackRows(cfg, g).every((r) => r.button === null)).toBe(true);
    const cr = machineCard(cfg, g, 'crucible');
    expect(cr.crucible).toBeDefined();
    expect(cr.crucible!.pot_g).toBeGreaterThan(0);
  });
  it('a card falls back to the stand-in rows only while the rules give none', () => {
    const g = game('m5');
    const rules = R.cardOf(cfg, g, { kind: 'place', place: 'rack' }, FIXTURE_NOW);
    const filled = withSample(cfg, g, { kind: 'place', place: 'rack' }, rules);
    expect(filled.rows.length).toBeGreaterThan(0);
    const given = { ...rules, rows: [{ id: 'x', name: { key: 'item.sack' as const }, line: null, button: null, icon: null }] };
    expect(withSample(cfg, g, { kind: 'place', place: 'rack' }, given)).toBe(given);
  });
  for (const n of FIXTURE_NAMES) {
    it(`${n}: every row is words by key, effect lines ≤ 38, and fits beside its button at 667 and font scale 1.3 (name and line each in at most two lines; one line at 1.0)`, () => {
      const { g, rows } = cardRows(n);
      const l = frameLayout(667, 375, S667.insets, 1.3);
      const text = l.panel.w - PAD - l.panel.padRight;
      for (const r of rows) {
        expect((TEXT as Record<string, string>)[r.name.key], r.id).toBeDefined();
        const name = say(r.name, c);
        const line = say(r.line ?? { key: 'card.empty' }, c);
        expect(name).not.toMatch(/\{[A-Za-z.0-9]+\}/);
        expect(line).not.toMatch(/\{[A-Za-z.0-9]+\}/);
        if (r.line?.key.startsWith('effect.')) expect(line.length, line).toBeLessThanOrEqual(38);
        const buttonW = r.button ? Math.min(BUY_MAX, Math.max(BUY_W, measure(say(r.button.label, c), pt(13, 1.3)) * 1.06 + 20)) : BUY_W;
        const room = text - buttonW - 10;
        // Names are bold 13 pt in at most two lines (a long tool name wraps; the row grows); effect lines 11 pt, one line (a padlock adds 16 pt).
        expect(wrap(name, pt(13, 1.3) * 1.06, room).lines.length, `${n} ${r.id}: ${name}`).toBeLessThanOrEqual(2);
        const lock = r.line?.key.startsWith('refusal.') ? 16 : 0;
        expect(wrap(line, pt(11, 1.3), room - lock).lines.length, `${n} ${r.id}: ${line}`).toBeLessThanOrEqual(2);
        // At font scale 1.0 the effect line keeps to one line beside a 96 pt button (the 44 pt row).
        const room1 = frameLayout(667, 375, S667.insets, 1).panel.w - PAD - l.panel.padRight - (r.button ? Math.max(BUY_W, measure(say(r.button.label, c), 13) * 1.06 + 20) : BUY_W) - 10;
        expect(measure(line, 11) + lock, `${n} ${r.id} at 1.0: ${line}`).toBeLessThanOrEqual(room1);
        if (r.button) {
          const a = r.button.action;
          if (a.act === 'buy' || a.act === 'hire' || a.act === 'level') expect(say(r.button.label, c)).toContain(R.fmtMoney(a.price));
          if (r.button.refusal) expect((TEXT as Record<string, string>)[r.button.refusal.key]).toBeDefined();
        }
      }
      void g;
    });
  }
});
