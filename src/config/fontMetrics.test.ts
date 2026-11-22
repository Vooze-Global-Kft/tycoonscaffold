/// <reference types="node" />
/**
 * The display font's measures in src/generated/activeGame.ts come from scripts/lib/fontMetrics.js,
 * which reads the font file itself. These tests pin it to a font whose numbers are known.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import fontMetrics from '../../scripts/lib/fontMetrics.js';
import games from '../../scripts/lib/games.js';

const LILITA = path.join(games.GAMES_DIR, 'pizza-empire', 'assets', 'fonts', 'LilitaOne.ttf');

describe('display font measures', () => {
  it('reads character widths and the line height from the font file', () => {
    const m = fontMetrics.readFontMetrics(LILITA, fontMetrics.moneyCharacters('$'));
    // Known values of Lilita One (1000 units per em).
    expect(m.line).toBe(1.143);
    expect(m.advances['0']).toBe(0.639);
    expect(m.advances['1']).toBe(0.406);
    expect(m.advances['$']).toBe(0.531);
    expect(m.advances['.']).toBe(0.229);
    expect(m.advances.M).toBe(0.907);
    expect(m.advances.T).toBe(0.502);
    for (const ch of '0123456789.KMBTQaixpOcNoD') expect(m.advances[ch], ch).toBeGreaterThan(0.1);
  });

  it('leaves out characters the font does not have', () => {
    const m = fontMetrics.readFontMetrics(LILITA, '0\u{1F355}');
    expect(Object.keys(m.advances)).toEqual(['0']);
  });

  it('refuses a file that is not a font', () => {
    expect(() => fontMetrics.readFontMetrics(path.join(games.GAMES_DIR, 'pizza-empire', 'game.json'), '0')).toThrow();
  });

  it('gives the pizza game its font and a game without a display font nothing', () => {
    const pizza = games.displayFontMetrics('pizza-empire', games.readGameJson('pizza-empire'));
    expect(pizza?.advances['0']).toBe(0.639);
    expect(games.displayFontMetrics('pizza-empire', { theme: {}, assets: {} })).toBeNull();
    // A font file that cannot be read must not stop a build.
    expect(games.displayFontMetrics('pizza-empire', { theme: { displayFont: 'f' }, assets: { f: 'game.json' } })).toBeNull();
  });
});
