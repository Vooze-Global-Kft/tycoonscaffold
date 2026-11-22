import { describe, expect, it } from 'vitest';
import { haulTestConfig } from '../../../engine/fixtures/haul';
import { fitTicker } from './bayMetrics';
import { manifestLots, metTexts, receiptTexts } from './receipt';

// Decision 59 (play-8, play-16, play:new:5): the receipt names every ore it shipped, the
// contract's first, in short figures, and a doubled bonus reads "+₵35 x2", the board's figure.
const cfg = haulTestConfig();

describe('the warp-out receipt', () => {
  it('names every ore, the contract ore first, in short figures', () => {
    expect(manifestLots(cfg, { iron: 15, copper: 5 }, ['copper'])).toEqual(['5 COPPER', '15 IRON']);
    expect(manifestLots(cfg, { iron: 9819, copper: 62340 })).toEqual(['62.3K COPPER', '9.8K IRON']);
  });
  it('a narrow row drops the words and the payout before any ore', () => {
    const texts = receiptTexts(cfg, { iron: 15, copper: 5 }, 43, ['copper']);
    expect(texts).toContain('WARPED · 5 COPPER · 15 IRON · ₵43');
    for (const width of [150, 166, 175]) expect(fitTicker(texts, width, 12).text).toContain('5 COPPER · 15 IRON');
    // The mid game's figures still name both ores on a 166 pt row.
    const mid = receiptTexts(cfg, { iron: 9819, copper: 62340 }, 183110, []);
    expect(fitTicker(mid, 166, 12).text).toContain('62.3K COPPER · 9.8K IRON');
    expect(fitTicker(texts, 166, 12).text).not.toContain('+1');
  });
  it('a met contract shows the board figure and the shift as "x2", never a second rounding', () => {
    // Board: +₵35 (34.5 rounded); the shift paid 69: the receipt reads +₵35 x2, not +₵69.
    const texts = metTexts(cfg, { copper: 5, iron: 15 }, 69 / 2, 2, ['copper']);
    expect(texts[0]).toBe('CONTRACT MET +₵35 x2 · 5 COPPER · 15 IRON');
    expect(texts.join('|')).not.toContain('69');
    expect(fitTicker(texts, 166, 12).text).toContain('+₵35 x2');
    expect(metTexts(cfg, { iron: 3 }, 19400, null)[0]).toBe('CONTRACT MET +₵19.4K · 3 IRON');
  });
});
