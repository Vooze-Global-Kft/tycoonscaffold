/**
 * The store-text checks of scripts/lib/checks.ts (validate.ts runs them for every game): the texts
 * of the listing, and each product's title and description as App Store Connect takes them when the
 * product is created (IAP_TEXT_LIMITS: a display name of 2 to 30 characters, a description of at
 * most 45).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../src/config/schema';
import { IAP_TEXT_LIMITS, productTextProblems, storeTextProblems, type ProductTexts } from './checks';

const ROOT = path.join(__dirname, '..', '..');

/** A listing with nothing wrong, so every problem below comes from what the test adds. */
const listing = {
  title: 'Harbour Lights',
  subtitle: 'Load ships, light the quay',
  shortDescription: 'Load the ships at the quay before the tide turns.',
  description: 'A small harbour, a crane and the evening tide.',
  keywords: ['harbour', 'crane', 'ships'],
};
const product = (over: Partial<ProductTexts> = {}): ProductTexts => ({ id: 'quay_lamps', title: 'Brass Lamps', description: 'Brass lamps along the quay. Looks only.', ...over });
/** A text of exactly `n` characters. */
const chars = (n: number) => 'x'.repeat(n);

describe('product texts (App Store Connect, "In-App Purchase information")', () => {
  it('the limits are Apple\'s: a display name of 2 to 30 characters, a description of at most 45', () => {
    expect(IAP_TEXT_LIMITS).toEqual({ titleMin: 2, titleMax: 30, descriptionMax: 45 });
  });

  it('a description of 45 characters passes; one of 46 is a problem naming the product and its length', () => {
    expect(storeTextProblems(listing, [product({ description: chars(45) })])).toEqual([]);
    const problems = storeTextProblems(listing, [product({ description: chars(46) })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^product "quay_lamps" description is 46 characters \(Apple allows 45 /);
    // ...and says where the longer text belongs, so nothing a shop says is lost to the limit.
    expect(problems[0]).toContain('shopLine');
  });

  it('each product is checked on its own, and a product without a description has nothing to count', () => {
    const problems = storeTextProblems(listing, [product({ id: 'quay_a' }), product({ id: 'quay_b', description: chars(60) }), product({ id: 'quay_c', description: undefined }), product({ id: 'quay_d', description: chars(107) })]);
    expect(problems.map((p) => p.slice(0, p.indexOf(' ('))).sort()).toEqual(['product "quay_b" description is 60 characters', 'product "quay_d" description is 107 characters']);
  });

  it('the characters are counted as typed: a multiplication sign is one, a space is one', () => {
    const line = 'Permanent ×3 on all income. Stacks with ×2.';
    expect(line).toHaveLength(43);
    expect(storeTextProblems(listing, [product({ description: line })])).toEqual([]);
    expect(storeTextProblems(listing, [product({ description: `${line}   ` })])).toHaveLength(1);
  });

  it('a product\'s shopLine is the game\'s own text: any length passes, only the description is counted', () => {
    const withShopLine = { ...product({ description: chars(45) }), shopLine: chars(200) };
    expect(storeTextProblems(listing, [withShopLine])).toEqual([]);
  });

  it('a title is the display name: 2 to 30 characters, one or 31 is a problem', () => {
    const titled = (n: number) => storeTextProblems(listing, [product({ title: chars(n) })]);
    expect(titled(2)).toEqual([]);
    expect(titled(30)).toEqual([]);
    expect(titled(1)).toEqual(['product "quay_lamps" title is 1 character (Apple allows 2 to 30 for an in-app purchase\'s display name)']);
    expect(titled(31)).toEqual(['product "quay_lamps" title is 31 characters (Apple allows 2 to 30 for an in-app purchase\'s display name)']);
    expect(titled(0)).toEqual(['product "quay_lamps" title is 0 characters (Apple allows 2 to 30 for an in-app purchase\'s display name)']);
  });

  it('a product can fail on both texts at once', () => {
    expect(storeTextProblems(listing, [product({ title: chars(40), description: chars(50) })])).toHaveLength(2);
  });

  it('the product checks alone (what the game generator reports) are the ones the store-text checks run', () => {
    const products = [product({ id: 'quay_a', title: chars(31) }), product({ id: 'quay_b', description: chars(46) }), product({ id: 'quay_c' })];
    expect(productTextProblems(products)).toHaveLength(2);
    expect(storeTextProblems(listing, products)).toEqual(productTextProblems(products));
    expect(productTextProblems([])).toEqual([]);
  });
});

describe('the listing checks are what they were', () => {
  it('a clean listing has no problem, with or without products', () => {
    expect(storeTextProblems(listing)).toEqual([]);
    expect(storeTextProblems(listing, [])).toEqual([]);
    expect(storeTextProblems(listing, [product()])).toEqual([]);
  });

  it('keywords over 100 characters, a banned word and an "Idle ... Tycoon" name are still problems', () => {
    expect(storeTextProblems({ ...listing, keywords: Array.from({ length: 21 }, () => 'quay') })).toEqual(['store.keywords is 104 characters joined with commas (Apple allows 100)']);
    expect(storeTextProblems({ ...listing, description: 'Earn a Michelin star for the harbour kitchen.' })).toEqual(['store.description contains "Michelin": a registered trademark (the guide\'s stars)']);
    expect(storeTextProblems({ ...listing, title: 'Idle Harbour Tycoon' })).toHaveLength(1);
  });

  it('product texts add to the listing\'s problems, they never replace them', () => {
    const problems = storeTextProblems({ ...listing, title: 'Idle Harbour Tycoon' }, [product({ description: chars(46) })]);
    expect(problems).toHaveLength(2);
  });
});

describe('every game in games/', () => {
  const gamesDir = path.join(ROOT, 'games');
  const ids = fs.readdirSync(gamesDir).filter((d) => !d.startsWith('_') && fs.existsSync(path.join(gamesDir, d, 'game.json')));
  const load = (id: string) => GameConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(gamesDir, id, 'game.json'), 'utf8')));

  it('there are games to check', () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it.each(ids)('%s: every product\'s title and description fit App Store Connect', (id) => {
    const g = load(id);
    expect(g.monetization.iap.products.length).toBeGreaterThan(0);
    expect(productTextProblems(g.monetization.iap.products)).toEqual([]);
    // The plain numbers too, so a change to the check's wording cannot hide a long text.
    for (const p of g.monetization.iap.products) {
      expect([p.id, (p.description ?? '').length <= 45]).toEqual([p.id, true]);
      expect([p.id, p.title.length >= 2 && p.title.length <= 30]).toEqual([p.id, true]);
    }
  });
});
