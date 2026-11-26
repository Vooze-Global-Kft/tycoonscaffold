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
    for (const t of r.tickets) if (!t.kind.includes('bank')) expect(t.height).toBeLessThanOrEqual(150); // the bank's ticket is a layout note for the hud (4.5)
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
      const plain = v.replace(/\{[^}]*\}/g, ' '); // a hole's modifier ({currency|cap}) is not a word
      expect(plain, k).not.toMatch(/\bcap\b/i);
      // stage 2's goals say "metals" (yard-stage2.md 1.3, T12); the first yard's range stays in materials
      if (!/^goal\.supplyRung[45]$/.test(k)) expect(v, k).not.toMatch(/\{r\} metals|\{n\} metals/);
    }
  });
});

describe('stage 2 (strings2; yard-stage2.md 5.3, 4, 2.14 to 2.16, 8.1 words)', () => {
  const names = { currency: 'scrip', bank: 'Tinmill Finance', 'bank.short': 'Tinmill', reclaimer: 'Pump Handle Reclamation', 'reclaimer.short': 'Pump Handle', 'partner.garage': "Parfitt's Garage", 'partner.boatyard': 'Saltreach Boatyard', 'partner.boatyard.short': 'the boatyard' };
  const c = async () => ({ names, grades: { lib: { name: 'Baled light iron', short: 'Iron bales' } }, objects: { propeller: { name: 'Bronze propeller' } } }) as unknown as Parameters<(typeof import('../../../src/ui/salvage/strings'))['say']>[1];

  it('prints the lead\'s fixed sentences word for word', async () => {
    const { say } = await import('../../../src/ui/salvage/strings');
    const cc = await c();
    expect(say({ key: 'card.finance.rule', args: { share: { text: 'share.fifth' }, x: { money: 69120 } } }, cc)).toBe('A fifth of each sale goes to the bank until §69,120 is repaid. No date.');
    expect(say({ key: 'card.shop.unconfirmed' }, cc)).toBe('The store has not confirmed this purchase yet. If you were charged, your scrip arrives when it does.');
    expect(say({ key: 'card.shop.packLine', args: { n: { n: 2 } } }, cc)).toBe('about 2 hours of your yard’s earnings');
    expect(say({ key: 'card.shop.unreachable' }, cc)).toBe('The store cannot be reached. Nothing was charged.');
    expect(say({ key: 'card.shop.expired' }, cc)).toBe('A purchase that was waiting never arrived. Nothing was added.');
    for (const k of ['card.shop.waiting', 'refusal.packPending'] as const) expect(say({ key: k }, cc)).toBe('Waiting for approval');
    for (const k of ['card.shop.noRoom', 'refusal.packHeadroom'] as const) expect(say({ key: k }, cc)).toBe('Nothing to spend it on yet');
    expect(say({ key: 'card.shop.nothingCharged' }, cc)).toBe('Nothing was charged.');
    expect(say({ key: 'card.works.loan' }, cc)).toBe('Bank loan');
    expect(say({ key: 'title.yardSale' }, cc)).toBe('Yard sale');
    expect(say({ key: 'card.works.saveUp', args: { t: { secs: 4080 } } }, cc)).toBe('Save up (about 1\u00a0h\u00a08\u00a0m)');
    expect(say({ key: 'chip.bridgeLimit' }, cc)).toBe('Axle limit 10 t');
    expect(say({ key: 'card.letter.rule', args: { share: { text: 'share.fifth' } } }, cc)).toBe('A fifth of each sale goes to the bank until it is repaid. No date.');
    expect(say({ key: 'ticket.bankSplit', args: { y: { money: 124 }, z: { money: 496 } } }, cc)).toBe('to the bank §124 · to you §496');
  });

  it('short names and capitals: {id|short}, a { name } argument with |short, {currency|cap}', async () => {
    const { fill } = await import('../../../src/ui/salvage/strings');
    const cc = await c();
    expect(fill('{bank|short}', undefined, cc)).toBe('Tinmill');
    expect(fill('{partner.garage|short}', undefined, cc)).toBe("Parfitt's Garage"); // no short form: the name
    expect(fill('From {partner|short}', { partner: { name: 'partner.boatyard' } }, cc)).toBe('From the boatyard');
    expect(fill('{currency|cap} packs', undefined, cc)).toBe('Scrip packs');
    expect(fill('{grade|short}', { grade: { grade: 'lib' } }, cc)).toBe('Iron bales');
    expect(fill('{nobody|short}', undefined, cc)).toBe('{nobody|short}');
  });

  it('bans 5.3\'s money words, wants "licensed waste carrier" on every waste line, allows the trade\'s own numbers only', () => {
    for (const t of ['Invest in a baler', 'Pay off the debt', 'A daily bonus', 'Get ahead', 'No interest', 'Best value', 'Buy now', 'Your lucky chance', 'Credited to you', 'Cash out'])
      expect(rules(t), t).toContain('banned');
    expect(rules('Waste to a licensed waste carrier')).toEqual([]);
    expect(rules('Waste goes in the skip')).toContain('waste');
    expect(rules('Axle limit 10 t')).toEqual([]);
    expect(rules('Weight limit 7.5 t')).toContain('number');
    expect(rules('A magnet hardly holds 304 stainless.')).toEqual([]);
    expect(rules('Holds 304 kg')).toContain('number'); // 304 only as the alloy's name
    expect(rules('Pay 20 % now')).toContain('number');
  });

  it('every key the contract names has words: the sixteen new refusals and the samples\' keys', async () => {
    const { TEXT } = await import('../../../src/ui/salvage/strings');
    const { REFUSAL_KEYS_V3 } = await import('../../../src/engine/salvage/refusals');
    const { SAMPLE_TEXT_KEYS } = await import('../../../src/engine/salvage/samples2');
    for (const k of REFUSAL_KEYS_V3) expect(TEXT, `refusal.${k}`).toHaveProperty([`refusal.${k}`]);
    for (const k of SAMPLE_TEXT_KEYS) expect(TEXT, k).toHaveProperty([k]);
  });

  it('boxes: every works plate line in 31, every plate name in 18 and in two lines of 12 on the process board', async () => {
    const { TEXT } = await import('../../../src/ui/salvage/strings');
    const { boxOf } = await import('./check');
    const keys = Object.keys(TEXT);
    expect(keys.filter((k) => k.startsWith('plate.works.')).length).toBeGreaterThanOrEqual(8);
    for (const k of keys.filter((x) => /^plate\.(works\.|reuse\.|lot|crate|opens$)/.test(x))) expect(boxOf(k).maxChars, k).toBe(31);
    const plates = keys.filter((k) => k.startsWith('title.works.'));
    expect(plates.length).toBe(13);
    for (const k of plates) {
      const v = (TEXT as Record<string, string>)[k];
      expect([...v].length, k).toBeLessThanOrEqual(18);
      expect(fitFindings(k, v, BOXES.plate), k).toEqual([]);
    }
  });
});
