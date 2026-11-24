/**
 * The bars' metrics (spec 4.1, 10.2 "layout.test.ts and paperMetrics.test.ts ... the longest bar
 * strings; targets ≥ 44 × 44"): rows add up inside their zones at both phones and both font scales,
 * the term ribbon picks the right fixed form for the longest strings of every office, the goal line
 * keeps to 34 characters for every ministry's name, and every bottom-row target is at least 44 × 44.
 * The widths agree with the content desk's fit check (scripts/content/office/fit.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { measure, BOLD_FACTOR, fit } from '../../../../scripts/content/office/fit';
import { deskLayout } from '../layout';
import { S, aboutText, dibs } from '../strings';
import { BASELINE_EM, GOAL_BUTTON_W, GOAL_CLOSED_W, GOAL_GUTTER, GOAL_MAX_CHARS, RIBBON_GUTTER, ROW_INSET, buttonMetrics, clubStripMetrics, goalForm, ribbonForm, slopTo44, textW, topBarMetrics } from './metrics';
import { goalForms, ribbonTexts, type RibbonValues } from './texts';

const PHONES = [
  { w: 375, h: 667, insets: { top: 20, bottom: 0 } },
  { w: 390, h: 844, insets: { top: 47, bottom: 34 } },
];
const SCALES = [0.85, 1, 1.15, 1.3, 2];
const game = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/high-office/game.json'), 'utf8')) as {
  decree: { offices: { title: string; termDays: number; ministries: { name: string }[]; clubs: string[]; districts: unknown[]; stand: { nr: number; record: number } | null }[]; grandProjects: { name: string }[]; clubs: { id: string; short: string }[] };
};
const offices = game.decree.offices;

describe('the width table is the content desk’s', () => {
  it('measures as fit.ts does (regular and bold)', () => {
    for (const t of ['Acting Governor · Day 41/110 · NR 9/50 · Lv 152/170', '62 % ×1.14', '+999.9K/s', 'Call the election · poll 4 of 5']) {
      expect(Math.abs(textW(t, 14.3) - measure(t, 14.3))).toBeLessThanOrEqual(1);
      expect(Math.abs(textW(t, 14.3, true) - measure(t, 14.3) * BOLD_FACTOR)).toBeLessThanOrEqual(1);
    }
  });
});

describe('the top bar', () => {
  // The widest treasury and rate the number format prints (three significant figures and a suffix).
  const cashes = ['0', '999', '99.9K', '999K', '99.9Qa', '9.99Dc'];
  for (const p of PHONES)
    for (const fsc of SCALES)
      it(`adds up at ${p.w} × ${p.h}, font scale ${fsc}`, () => {
        const L = deskLayout(p.w, p.h, p.insets, fsc);
        for (const c of cashes) {
          const rate = S.hud.rate(c);
          const m = topBarMetrics(L.topBar.h, L.bar, fsc, c, rate, [S.hud.approvalChip(100, '1.60'), S.hud.approvalPreview(100, 100)], S.hud.gossipChip(9, 9));
          // Boxes inside the bar.
          expect(m.cashTop).toBeGreaterThanOrEqual(0);
          expect(m.cashTop + m.cashBox).toBeLessThanOrEqual(L.topBar.h);
          expect(m.rateTop).toBeGreaterThanOrEqual(0);
          expect(m.rateTop + m.rateBox).toBeLessThanOrEqual(L.topBar.h);
          // One baseline: centre + 0.355 em on both, within half a point.
          const base = (top: number, box: number, font: number) => top + box / 2 + BASELINE_EM * font;
          expect(Math.abs(base(m.cashTop, m.cashBox, m.cashFont) - base(m.rateTop, m.rateBox, m.rateFont))).toBeLessThanOrEqual(0.6);
          // The treasury and its rate fit their 156 pt; the chips their 86 and 48.
          expect(m.cashW + 4 + m.rateW).toBeLessThanOrEqual(L.bar.treasury.w + 2);
          expect(textW(S.hud.approvalChip(100, '1.60'), m.chipFont, true)).toBeLessThanOrEqual(L.bar.approval.w - 8 + 1);
          expect(textW(S.hud.approvalPreview(100, 100), m.chipFont, true)).toBeLessThanOrEqual(L.bar.approval.w - 8 + 1);
          expect(m.gossipIcon + 2 + textW(S.hud.gossipChip(9, 9), m.gossipFont, true)).toBeLessThanOrEqual(L.bar.gossip.w - 4 + 1);
          expect(m.chipTop + m.chipBox).toBeLessThanOrEqual(L.topBar.h);
        }
      });
  it('the parts do not overlap and stay on screen', () => {
    for (const p of PHONES) {
      const L = deskLayout(p.w, p.h, p.insets, 1.3);
      const parts = [L.bar.treasury, L.bar.approval, L.bar.gossip, L.bar.menu];
      for (let i = 1; i < parts.length; i++) expect(parts[i].x).toBeGreaterThanOrEqual(parts[i - 1].x + parts[i - 1].w);
      expect(parts[3].x + parts[3].w).toBeLessThanOrEqual(p.w);
      expect(slopTo44(L.bar.menu.w, L.topBar.h)).toBeTruthy();
    }
  });
});

describe('the club strip', () => {
  for (const p of PHONES)
    for (const fsc of SCALES)
      for (const n of [3, 5, 7])
        it(`${n} clubs fit at ${p.w} × ${p.h}, font scale ${fsc}`, () => {
          const L = deskLayout(p.w, p.h, p.insets, fsc);
          const m = clubStripMetrics(L.clubStrip, n, fsc);
          expect(m.slots).toHaveLength(n);
          for (let i = 0; i < n; i++) {
            const s = m.slots[i];
            expect(s.icon.x).toBeGreaterThanOrEqual(0);
            expect(s.icon.y + s.icon.h).toBeLessThanOrEqual(L.clubStrip.h);
            expect(s.num.y).toBeGreaterThanOrEqual(0);
            expect(s.num.y + s.num.h).toBeLessThanOrEqual(L.clubStrip.h);
            // "100" fits its number box.
            expect(textW('100', m.numFont, true) + 4).toBeLessThanOrEqual(s.num.w + 2);
            const right = Math.max(s.icon.x + s.icon.w, m.beside ? s.num.x + s.num.w : 0);
            expect(right).toBeLessThanOrEqual(L.clubStrip.w);
            if (i > 0) expect(s.icon.x).toBeGreaterThanOrEqual(Math.max(m.slots[i - 1].icon.x + m.slots[i - 1].icon.w, m.beside ? m.slots[i - 1].num.x + m.slots[i - 1].num.w : 0));
          }
          expect(m.beside).toBe(n === 3);
        });
});

describe('the term ribbon', () => {
  /** The longest values an office can show: Acting, 4-digit day counts and Name Recognition. */
  const longest = (o: (typeof offices)[number], next: (typeof offices)[number] | undefined): RibbonValues => ({
    acting: true,
    title: o.title,
    phase: 'governing',
    day: o.termDays,
    termDays: o.termDays,
    nr: 9999,
    nrTarget: next?.stand?.nr ?? null,
    record: 9999,
    recordTarget: next?.stand?.record ?? null,
    canCall: false,
    poll: { held: o.districts.length, of: o.districts.length },
  });
  for (const p of PHONES)
    for (const fsc of [1, 1.3])
      it(`picks the form that fits for every office at ${p.w} × ${p.h}, font scale ${fsc}`, () => {
        const L = deskLayout(p.w, p.h, p.insets, fsc);
        const room = L.ribbon.w - 2 * RIBBON_GUTTER;
        offices.forEach((o, i) => {
          for (const v of [longest(o, offices[i + 1]), { ...longest(o, offices[i + 1]), acting: false, nr: 7, record: 52, day: 9 }]) {
            const t = ribbonTexts(v);
            const m = ribbonForm(L.ribbon, fsc, t.long, t.short);
            const want = Math.round(11 * Math.min(1.3, fsc) * 10) / 10;
            // The long form exactly when it fits at the wanted size; never set smaller, never wrapped.
            expect(m.form).toBe(textW(t.long, want, true) <= room ? 'long' : 'short');
            expect(m.font).toBe(want);
            expect(m.width).toBeLessThanOrEqual(room);
            expect(m.top + m.box).toBeLessThanOrEqual(L.ribbon.h);
            // The short form drops the record to the Poll badge only while the next office needs it.
            expect(t.badge !== null).toBe(v.recordTarget !== null);
            // And the content desk's fit check agrees for the short form at 375 (4.1: 355 pt at 14.3).
            expect(fit(t.short, 'ribbonShort').fits).toBe(true);
          }
          for (const t of [ribbonTexts({ ...longest(o, offices[i + 1]), canCall: true }), ribbonTexts({ ...longest(o, offices[i + 1]), phase: 'campaign' }), ribbonTexts({ ...longest(o, offices[i + 1]), phase: 'count' })]) {
            const m = ribbonForm(L.ribbon, fsc, t.long, t.short);
            expect(m.width).toBeLessThanOrEqual(room);
          }
        });
      });
  it('the long form is used on the wide phone at font scale 1 for a mayor', () => {
    const L = deskLayout(390, 844, { top: 47, bottom: 34 }, 1);
    const t = ribbonTexts({ acting: false, title: offices[0].title, phase: 'governing', day: 41, termDays: offices[0].termDays, nr: 9, nrTarget: offices[1].stand?.nr ?? null, record: 52, recordTarget: offices[1].stand?.record ?? null, canCall: false, poll: { held: 3, of: 5 } });
    expect(ribbonForm(L.ribbon, 1, t.long, t.short).form).toBe('long');
  });
});

describe('the goal line', () => {
  it('its fixed words keep to 34 characters', () => {
    for (const t of [S.hud.goalApologise, S.hud.goalNone, S.hud.goalCourier, S.hud.goalSpin, S.hud.goalSettleShort, S.hud.goalMonument, S.hud.goalSayNothing(99), S.hud.goalCall(9, 9)]) expect(t.length).toBeLessThanOrEqual(GOAL_MAX_CHARS);
    for (const c of game.decree.clubs) expect(S.hud.goalSettle(c.short, 99).length).toBeLessThanOrEqual(GOAL_MAX_CHARS);
  });
  for (const p of PHONES)
    for (const fsc of [1, 1.3])
      it(`a form of every purchase fits 34 characters and the line at ${p.w} × ${p.h}, font scale ${fsc}`, () => {
        const L = deskLayout(p.w, p.h, p.insets, fsc);
        const names = [...offices.flatMap((o) => o.ministries.map((m) => m.name)), ...game.decree.grandProjects.map((g) => g.name)];
        for (const name of names)
          for (const type of ['level', 'open'] as const) {
            const forms = goalForms({ goal: { kind: 'purchase', purchase: { type, ministry: 1 }, price: 9.99e33, about: { value: 59, unit: 'min' } }, name, club: null, papersLeft: null, scandalLeft: null });
            const m = goalForm(L.goalLine, fsc, forms, null);
            expect(m.text.length).toBeLessThanOrEqual(GOAL_MAX_CHARS);
            expect(textW(m.text, m.font)).toBeLessThanOrEqual(m.room);
            expect(m.top + m.box).toBeLessThanOrEqual(L.goalLine.h);
          }
        // Beside the ad's button and the run-up's closed sign.
        for (const club of game.decree.clubs) {
          const forms = goalForms({ goal: { kind: 'ad', ad: 'courier' }, name: null, club: club.short, papersLeft: 8, scandalLeft: null });
          const m = goalForm(L.goalLine, fsc, forms, S.hud.watchAd);
          expect(m.text.length).toBeLessThanOrEqual(GOAL_MAX_CHARS);
          expect(textW(m.text, m.font)).toBeLessThanOrEqual(m.room);
          expect(GOAL_GUTTER + m.room + 6 + GOAL_BUTTON_W + GOAL_GUTTER).toBeLessThanOrEqual(L.goalLine.w);
          expect(textW(S.hud.watchAd, m.buttonFont, true)).toBeLessThanOrEqual(GOAL_BUTTON_W - 8 + 1);
          const c = goalForm(L.goalLine, fsc, goalForms({ goal: { kind: 'settle', club: 0 }, name: null, club: club.short, papersLeft: 8, scandalLeft: null }), S.hud.closedRunUp, GOAL_CLOSED_W);
          expect(textW(S.hud.closedRunUp, c.buttonFont, true)).toBeLessThanOrEqual(GOAL_CLOSED_W - 8 + 1);
          expect(textW(c.text, c.font)).toBeLessThanOrEqual(c.room);
        }
        expect(aboutText({ value: 59, unit: 'min' })).toBe('about 59 min');
        expect(dibs(9.99e33)).toBe('9.99Dc');
      });
});

describe('the bottom row', () => {
  const labels = [S.hud.inTray, S.hud.ledger, S.hud.cabinet, S.hud.poll, S.hud.office];
  for (const p of PHONES)
    for (const fsc of SCALES)
      it(`rows add up and every target is at least 44 × 44 at ${p.w} × ${p.h}, font scale ${fsc}`, () => {
        const L = deskLayout(p.w, p.h, p.insets, fsc);
        const m = buttonMetrics(L.bottomRow.h, L.buttons.ledger.w, fsc, labels, ['Lv 9999/9999', '10']);
        expect(m.iconTop).toBeGreaterThanOrEqual(0);
        expect(m.labelTop + m.labelBox).toBeLessThanOrEqual(m.h);
        expect(m.iconTop + m.iconSize + 2).toBeLessThanOrEqual(m.labelTop);
        for (const l of labels) expect(textW(l, m.labelFont, true)).toBeLessThanOrEqual(L.buttons.ledger.w - 4 + 1);
        expect(textW('Lv 9999/9999', m.badgeFont, true)).toBeLessThanOrEqual(L.buttons.ledger.w - 8 + 1);
        const b = L.buttons;
        const all = [b.inTray, b.ledger, b.cabinet, b.poll, b.office];
        for (const r of all) {
          expect(r.w).toBeGreaterThanOrEqual(44);
          expect(L.bottomRow.h - 2 * ROW_INSET).toBeGreaterThanOrEqual(44);
          expect(r.x).toBeGreaterThanOrEqual(0);
          expect(r.x + r.w).toBeLessThanOrEqual(p.w);
        }
        for (let i = 1; i < all.length; i++) expect(all[i].x).toBeGreaterThanOrEqual(all[i - 1].x + all[i - 1].w);
      });
  it('the hit slop makes the small controls 44 pt', () => {
    for (const [w, h] of [[40, 18], [48, 26], [84, 20], [32, 32]]) {
      const s = slopTo44(w, h);
      expect(w + s.left + s.right).toBeGreaterThanOrEqual(44);
      expect(h + s.top + s.bottom).toBeGreaterThanOrEqual(44);
    }
  });
});
