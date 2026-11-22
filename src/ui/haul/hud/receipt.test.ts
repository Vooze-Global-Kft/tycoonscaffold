import { describe, expect, it } from 'vitest';
import { haulTestConfig } from '../../../engine/fixtures/haul';
import { TICKER_MIN_FONT, fitTicker } from './bayMetrics';
import { manifestLots, metParts, receiptPages, receiptParts } from './receipt';

// Decision 59 (play-8, play-16, play:new:5): the receipt names every ore it shipped, the
// contract's first, in short figures, and a doubled bonus reads "+₵35 x2", the board's figure.
const cfg = haulTestConfig();
// The ticker row of the dock counter: 170 pt at 390 x 844, 12 pt type (./DockCounter.tsx).
const fitsRow = (width: number) => (line: string) => fitTicker([line], width, 12).font >= TICKER_MIN_FONT;

describe('the warp-out receipt', () => {
  it('names every ore, the contract ore first, in short figures', () => {
    expect(manifestLots(cfg, { iron: 15, copper: 5 }, ['copper'])).toEqual(['5 COPPER', '15 IRON']);
    expect(manifestLots(cfg, { iron: 9819, copper: 62340 })).toEqual(['62.3K COPPER', '9.8K IRON']);
  });
  it('one page when it fits: the words and the payout go before any ore', () => {
    const p = receiptParts(cfg, { iron: 15, copper: 5 }, 43, ['copper']);
    expect(receiptPages(p, fitsRow(260))).toEqual(['WARPED · 5 COPPER · 15 IRON · ₵43']);
    for (const width of [150, 166, 170]) {
      const pages = receiptPages(p, fitsRow(width));
      expect(pages).toHaveLength(1);
      expect(pages[0]).toContain('5 COPPER · 15 IRON');
    }
  });
  it('more ores than the row holds: pages, every ore named, never "+1" (s/m5.png: 58.4K IRON · 12.5K COPPER +1)', () => {
    const p = receiptParts(cfg, { iron: 58400, copper: 12500, ice: 17 }, 123470, ['iron', 'copper']);
    const pages = receiptPages(p, fitsRow(170));
    expect(pages.length).toBeGreaterThan(1);
    const text = pages.join(' · ');
    for (const lot of ['58.4K IRON', '12.5K COPPER', '17 ICE']) expect(text).toContain(lot);
    expect(text).not.toMatch(/\+\d/);
    expect(pages[0].startsWith('58.4K IRON')).toBe(true);
    for (const page of pages) expect(fitsRow(170)(page)).toBe(true);
    // Five ores at 375 pt.
    const five = receiptPages(receiptParts(cfg, { iron: 58400, copper: 12500, ice: 9870, titanium: 4100, platinum: 310 }, 1.2e6), fitsRow(166));
    expect(five.join(' · ').match(/(IRON|COPPER|ICE|TITANIUM|PLATINUM)/g)).toHaveLength(5);
  });
  it('a met contract shows the board figure and the shift as "x2", never a second rounding', () => {
    // Board: +₵35 (34.5 rounded); the shift paid 69: the receipt reads +₵35 x2, not +₵69.
    const p = metParts(cfg, { copper: 5, iron: 15 }, 69 / 2, 2, ['copper']);
    expect(receiptPages(p, fitsRow(400))).toEqual(['CONTRACT MET +₵35 x2 · 5 COPPER · 15 IRON']);
    const narrow = receiptPages(p, fitsRow(170));
    expect(narrow.join('|')).not.toContain('69');
    expect(narrow[0]).toContain('+₵35 x2');
    expect(narrow.join(' · ')).toContain('15 IRON');
    expect(receiptPages(metParts(cfg, { iron: 3 }, 19400, null), fitsRow(400))[0]).toBe('CONTRACT MET +₵19.4K · 3 IRON');
  });
});
