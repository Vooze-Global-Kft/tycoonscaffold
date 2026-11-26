/**
 * The away card as a docket (owner1-hud; the owner's first review, point 6): the rows exist only when they
 * hold something, every number on the card is CardData's (no sum, no rule computed by the screen), and the
 * docket fits the centred card at 667 x 375 and 844 x 390 at font scale 1.3 with its widest words.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AwayCard, Txt } from '../../../engine/salvage';
import { say } from '../strings';
import { measureW } from '../hud/metrics';
import { awayDocket } from './awayDocket';
import { AWAY_SAMPLES } from './awaySample';
import { PAD, TYPE, frameLayout, pt } from './layout';

const content = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage;
const w = (t: Txt | null | undefined) => (t ? say(t, content) : '');
const moneyOf = (t: Txt) => (t.args?.x as { money: number }).money;

describe('the docket prints what CardData holds, and only that', () => {
  it('two grades and one partner: two sold rows, one bought row, the net, no notes', () => {
    const a = AWAY_SAMPLES.two;
    const d = awayDocket(a);
    expect(d.sold.map((r) => r.id)).toEqual(['g:li', 'g:ci']);
    expect(d.bought.map((r) => r.id)).toEqual(['p:partnerFarm']);
    expect(d.notes).toEqual([]);
    expect(d.net?.up).toBe(true);
    expect(moneyOf(d.net!.big)).toBe(a.net);
    expect(moneyOf(d.salesTotal!.money)).toBe(a.money);
    expect(w(d.bought[0].qty)).toBe('1 load');
    expect(w(d.away)).toBe(w(d.ran));
    expect(d.ranShare).toBe(1);
    expect(d.unsold).toBeNull();
  });
  it('twelve grades: every one a row, the best first, each with its own weight and scrip', () => {
    const a = AWAY_SAMPLES.twelve;
    const d = awayDocket(a);
    const grades = d.sold.filter((r) => r.id.startsWith('g:'));
    expect(grades).toHaveLength(12);
    const money = grades.map((r) => moneyOf(r.money));
    expect([...money].sort((x, y) => y - x)).toEqual(money);
    for (const r of grades) {
      const l = a.lines.find((x) => `g:${x.grade}` === r.id)!;
      expect(moneyOf(r.money)).toBe(l.money);
      expect((r.qty!.args!.kg as { mass_g: number }).mass_g).toBe(l.g);
    }
    // the deal's delivery is a sold row; the held bay and the rivals passed are notes
    expect(d.sold.some((r) => r.id === 'deal:0')).toBe(true);
    expect(d.notes.map((n) => n.kind)).toEqual(['held', 'passed', 'passed']);
    expect(d.bought.map((r) => moneyOf(r.money))).toEqual([9_420, 3_000]);
    expect(d.bought.every((r) => r.cost)).toBe(true);
    expect(w(d.unsold)).toContain('In the bays');
    expect(d.longer?.key).toBe('away.longerNight');
    expect(d.ranShare).toBeCloseTo(4 / (9 + 41 / 60), 6);
  });
  it('the rows later stages add show only when they hold something', () => {
    const plain = awayDocket(AWAY_SAMPLES.twelve);
    for (const id of ['rack', 'van', 'bank']) expect([...plain.sold, ...plain.bought].some((r) => r.id === id)).toBe(false);
    const d = awayDocket(AWAY_SAMPLES.every);
    expect(d.sold.some((r) => r.id === 'rack')).toBe(true);
    expect(d.sold.some((r) => r.id === 'van')).toBe(true);
    const bank = d.bought.find((r) => r.id === 'bank')!;
    expect(moneyOf(bank.money)).toBe(AWAY_SAMPLES.every.bank);
    expect(w(bank.name)).toMatch(/^To /);
    expect(d.notes.map((n) => n.kind)).toEqual(['held', 'repaid', 'lots', 'passed', 'passed']);
    expect(w(d.notes[1].t)).toContain('Baler');
    // a partner without a lane mark gets the skip sign
    expect(d.bought.find((r) => r.id === 'p:partner.garage')!.mark).toEqual({ partner: 'partner.garage' });
  });
  it('held stock is never listed as sold, a loss reads as taken, and an empty card says so', () => {
    const a: AwayCard = { ...AWAY_SAMPLES.two, lines: [...AWAY_SAMPLES.two.lines, { grade: 'brs', g: 5_000, money: 0 }], net: -20, money: 130, spent: 150 };
    const d = awayDocket(a);
    expect(d.sold.some((r) => r.id === 'g:brs')).toBe(false);
    expect(d.net?.up).toBe(false);
    expect(w(d.net!.big)).toBe('−§20.00');
    expect(w(d.net!.sub)).toBe('Taken from your account');
    const none = awayDocket({ seconds: 600, capS: 7200, lines: [], supplied_g: 0, money: 0, loads: 0, deliveries: 0, passed: [], hint: null });
    expect(none.nothing?.key).toBe('away.nothing');
    expect(none.net).toBeNull();
    expect(none.sold).toEqual([]);
  });
});

describe('the docket fits the centred card at both phones and font scale 1.3', () => {
  const PHONES = [
    { name: '844 x 390', w: 844, h: 390, i: { top: 0, left: 47, right: 47, bottom: 21 } },
    { name: '667 x 375', w: 667, h: 375, i: { top: 0, left: 0, right: 0, bottom: 0 } },
  ];
  for (const p of PHONES)
    for (const fsc of [1, 1.15, 1.3])
      it(`${p.name} at ${fsc}`, () => {
        const L = frameLayout(p.w, p.h, p.i, fsc);
        const d = awayDocket(AWAY_SAMPLES.every);
        const n = pt(TYPE.name, L.fs);
        const mark = Math.round(16 * Math.min(L.fs, 1.15));
        // a row: the mark, the name, the weight column and the scrip column (AwayCard.tsx Rows)
        for (const rows of [d.sold, d.bought]) {
          const qtyW = Math.ceil(Math.max(0, ...rows.map((r) => (r.qty ? measureW(w(r.qty), n, false) : 0)))) + 4;
          const moneyW = Math.ceil(Math.max(...[...rows.map((r) => w(r.money)), '§999,999.99'].map((t) => measureW(t, n)))) + 4;
          const nameRoom = L.centred.w - 2.6 - 2 * PAD - mark - 9 - qtyW - 8 - moneyW - 12;
          const widestName = Math.max(...Object.keys(content.grades).map((g) => measureW(w({ key: 'away.grade', args: { grade: { grade: g } } }), n, false)), ...rows.map((r) => measureW(w(r.name), n, false)));
          expect(widestName, `${p.name} ${fsc}`).toBeLessThanOrEqual(nameRoom);
        }
        // the foot: NET's big number, its two small lines (each may take two), OK at its widest
        const big = pt(24, L.fs);
        const netW = measureW('+§999,999', big);
        const subW = L.centred.w - 2.6 - 2 * PAD - netW - 14 - 136 - 14;
        expect(measureW(w(d.net!.sub), pt(TYPE.line, L.fs))).toBeLessThanOrEqual(subW * 2);
        expect(measureW(w(d.unsold), pt(TYPE.line, L.fs), false)).toBeLessThanOrEqual(subW * 2);
        // the head: the two fields at their widest ("23 h 59 m") and room for the strip and the longer line
        const f17 = pt(17, L.fs);
        const fields = 2 * Math.max(measureW('23 h 59 m', f17), measureW('The yard ran', pt(TYPE.line, L.fs)) * 1.1) + 24;
        const right = L.centred.w - 2.6 - 2 * PAD - fields - 14;
        expect(right).toBeGreaterThanOrEqual(120);
        expect(measureW(w(d.longer), pt(TYPE.line, L.fs), false)).toBeLessThanOrEqual(right * 2);
        // heights: the title band, the head, the foot and at least two rows of the list within the 300 pt card
        const title = Math.max(34, pt(TYPE.title, L.fs) * 1.7);
        const head = 14 + Math.ceil(pt(TYPE.line, L.fs) * 1.25) + Math.ceil(f17 * 1.2);
        const foot = 18 + Math.max(Math.ceil(pt(TYPE.line, L.fs) * 1.25) + Math.ceil(big * 1.15), 36);
        const row = Math.ceil(n * 1.25) + 9;
        expect(title + head + foot + 8 + 2 * row, `${p.name} ${fsc}`).toBeLessThanOrEqual(L.centred.h);
      });
});
