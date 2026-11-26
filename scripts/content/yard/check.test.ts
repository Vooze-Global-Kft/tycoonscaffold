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
  it('lets a part that shrinks its text fit at 11 pt, and no further', () => {
    expect(fitFindings('t', 'Level up §99,999', BOXES.button)).toEqual([]);
    expect(fitFindings('t', 'Level up the powered stripper §99,999', BOXES.button).length).toBeGreaterThan(0);
  });
});

describe('the game', () => {
  it('has zero findings over every word', () => {
    const r = runAll();
    expect(r.findings.map((f) => `${f.where}: ${f.reason}`)).toEqual([]);
    for (const t of r.tickets) expect(t.height).toBeLessThanOrEqual(150);
  }, 60_000);
});

describe('words of this pass (W3, W10, W20, P3)', () => {
  it('the converter lesson prints the record reference as written (W3: "0012", never "12")', async () => {
    const { say } = await import('../../../src/ui/salvage/strings');
    const c = { names: {}, grades: {}, objects: {} } as unknown as Parameters<typeof say>[1];
    expect(say({ key: 'lesson.conv', args: { ref: { ref: '0012' } } }, c)).toContain('ref. 0012');
    expect(say({ key: 'line.carName', args: { ref: { ref: '0012' } } }, c)).toContain('ref. 0012');
  });
  it('no player text says "cap" (W20) and a range is counted in materials, not metals (W10)', async () => {
    const { TEXT } = await import('../../../src/ui/salvage/strings');
    for (const [k, v] of Object.entries(TEXT)) {
      expect(v, k).not.toMatch(/\bcap\b/i);
      expect(v, k).not.toMatch(/\{r\} metals|\{n\} metals/);
    }
  });
});
