/** The first yard's text check (owner: strings): its rules on small cases, and the whole game's words at zero findings. */
import { describe, expect, it } from 'vitest';
import { BOXES, fitFindings, measure, runAll, wordFindings } from './check';

const opts = { names: { homeYard: 'Cinder Lane Yard', merchant: 'Tollbridge Metals' }, withdrawn: ['Kettle Lane Yard'], deny: () => [] };
const rules = (t: string) => wordFindings('test', t, opts).map((f) => f.rule);

describe('word rules', () => {
  it('fails banned words as whole words only', () => {
    expect(rules('Place an order')).toContain('banned');
    expect(rules('The night shift')).toContain('banned');
    expect(rules('Ore and more')).toContain('banned');
    expect(rules('Before the store opens')).not.toContain('banned');
    expect(rules('Well done!')).toContain('banned');
  });
  it('fails promises, fixed multiples and literal numbers, not computed holes', () => {
    expect(rules('More metals coming soon')).toContain('promise');
    expect(rules('Price updated: {a} → {b}')).not.toContain('promise');
    expect(rules('Copper pays 30 times iron')).toContain('multiple');
    expect(rules('Bare bright pays {n} times light iron today.')).toEqual([]);
    expect(rules('Holds 300 kg')).toContain('number');
    expect(rules('No.2 copper and HMS 80:20')).toEqual([]);
  });
  it('fails invented names written as literals and withdrawn names', () => {
    expect(rules('Lot sold to Tollbridge Metals')).toContain('name');
    expect(rules('Lot sold to {merchant}')).toEqual([]);
    expect(rules('Welcome to Kettle Lane Yard')).toContain('name');
  });
});

describe('fit', () => {
  it('measures at font scale 1.3 and enforces character caps', () => {
    expect(measure('Open', 13 * 1.3, true)).toBeGreaterThan(measure('Open', 13, true));
    expect(fitFindings('t', 'Take the washer apart', BOXES.goal)).toEqual([]);
    expect(fitFindings('t', 'Take the old washing machine apart now', BOXES.goal).length).toBeGreaterThan(0);
    expect(fitFindings('t', 'Platinum group and iridium', BOXES.greyPlate)).toEqual([]);
  });
});

describe('the game', () => {
  it('has zero findings over every word', () => {
    const r = runAll();
    expect(r.findings.map((f) => `${f.where}: ${f.reason}`)).toEqual([]);
  }, 60_000);
});
