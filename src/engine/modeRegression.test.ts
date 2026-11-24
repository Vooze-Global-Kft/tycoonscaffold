/**
 * Regression gate for the first game (and the classic mode): the sim and classic engines on this
 * tree must give exactly the outputs the MAIN branch's engine gives. The recordings were made by
 * scripts/lib/recordModes.ts on a git archive of the main branch's commit (cc11615, before the
 * engine-mode seam), with that commit's own game files; the commit's full hash is stored in each
 * fixture. This test replays the same scenario (scripts/lib/modeScenario.ts) on this tree and
 * compares every output strictly. It never writes a fixture: a missing one fails (pizza-1).
 *
 * Configs here: Pizza Empire's shipped game.json (sim) and a frozen copy of Space Miner's last
 * classic game.json (fixtures/classic-space.json, the commit's games/space-miner/game.json plus the
 * soundPack key), so classic stays covered after Space Miner moved to haul.
 *
 * One kind of text inside the pinned config is listing text: a product's `description` (the stores'
 * 45 characters) and `shopLine`. Those two keys are compared apart (PRODUCT_LISTING_TEXTS below): the
 * recording stays whole and is what every line the game prints for a product is checked against.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { modeScenario, pinnedConfig, CONFIG_UNPINNED, INTENDED_DIFFERENCES, type ScenarioEngine } from '../../scripts/lib/modeScenario';
import { GameConfigSchema } from '../config/schema';
// The web build's presets (the bot): the phone file ./presets.ts has none.
import { buildPreset } from '../dev/presets.web';
import * as E from './economy';
import * as M from './meta';
import classicSpace from './fixtures/classic-space.json';

const FIXTURES = path.join(__dirname, 'fixtures');
const MAIN_COMMIT = /^cc11615[0-9a-f]{33}$/;

function fixture(name: string): Record<string, unknown> {
  const file = path.join(FIXTURES, name);
  if (!fs.existsSync(file)) throw new Error(`${name} is missing: record it from the main branch with "npx tsx scripts/lib/recordModes.ts" (never from this tree)`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const CONFIGS: Record<string, unknown> = { 'pizza-empire': pizza, 'classic-space': classicSpace };
const engine = { E, M, buildPreset } as unknown as ScenarioEngine;

/**
 * The two texts of a product that are listing text, not gameplay. `description` is what the stores
 * get for the product: App Store Connect takes 45 characters at most (scripts/lib/checks.ts), so the
 * recorded ones that were longer had to be shortened. `shopLine` is the line the game's own shop
 * prints when it says more than that. Both sit inside the pinned `monetization` block, and the
 * recording is older than the limit and than `shopLine` (and is never re-recorded). So the guard
 * compares the two configs without these two keys, and pins what a player reads instead: every
 * line the game prints for a product must still be the recorded one (`shopLines`, and a deal's
 * blurb). A description no screen prints (a gem pack's, a time warp's, a deal product's) is the
 * stores' text alone and is free to change.
 */
const PRODUCT_LISTING_TEXTS = ['description', 'shopLine'] as const;
type PinnedProduct = { id: string; kind: string; description?: string; shopLine?: string };
type PinnedDeal = { productId?: string; blurb?: string };
const productsOf = (config: unknown) => (config as { monetization: { iap: { products: PinnedProduct[] } } }).monetization.iap.products;
const dealsOf = (config: unknown) => (config as { meta: { deals: PinnedDeal[] } }).meta.deals;

/** A copy of a config without its products' listing texts; every other key of every product stays. */
function withoutProductListingTexts(config: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(config)) as unknown;
  for (const p of productsOf(copy)) for (const key of PRODUCT_LISTING_TEXTS) delete p[key];
  return copy;
}

/**
 * The kinds whose shop row prints the product's line in the tab shell (src/ui/meta/shop/Store.tsx:
 * the rows of its "Ads" and "Permanent boosts" sections). A gem pack and a time warp print amounts,
 * and a deal's card prints the deal's blurb: the description of those is read by the stores only.
 */
const ROW_KINDS = ['noAds', 'skipAds', 'starterPack', 'multiplier'];

/** The line each of those rows prints, by product id (the shop's own reading, M.shopLineOf); null where the config gives none. */
function shopLines(config: unknown): Record<string, string | null> {
  return Object.fromEntries(productsOf(config).filter((p) => ROW_KINDS.includes(p.kind)).map((p) => [p.id, M.shopLineOf(p) ?? null]));
}

describe('sim and classic engines give what the main branch gives', () => {
  const recorded = fixture('recorded-modes.json') as { commit: string; recordedBy: string; results: Record<string, Record<string, unknown>> };

  it('the recordings come from the main branch commit, by the recorder', () => {
    expect(recorded.commit).toMatch(MAIN_COMMIT);
    expect(recorded.recordedBy).toBe('scripts/lib/recordModes.ts');
    expect(Object.keys(recorded.results).sort()).toStrictEqual(Object.keys(CONFIGS).sort());
  });

  for (const [name, raw] of Object.entries(CONFIGS)) {
    const results = modeScenario(engine, GameConfigSchema.parse(raw));
    const keys = Object.keys(recorded.results[name] ?? {});
    it(`${name}: the scenario has the recorded outputs, no more and no fewer`, () => {
      expect(Object.keys(results).sort()).toStrictEqual(keys.sort());
    });
    for (const key of keys) {
      if ((INTENDED_DIFFERENCES as readonly string[]).includes(key)) continue;
      it(`${name}: ${key}`, () => {
        expect(results[key]).toStrictEqual(recorded.results[name][key]);
      });
    }

    // guard:new:3: the one intended difference from the main branch. With income, the gem Time Warp
    // is the main branch's to the bit; with zero income the main branch charged the gems for a warp
    // worth 0, and this tree refuses it: the same state with the gems still there.
    it(`${name}: buyWarpZero (intended difference: a warp worth 0 is refused, not charged)`, () => {
      const cfg = GameConfigSchema.parse(raw);
      const rec = recorded.results[name].buyWarpZero as { income: number; state: { gems: number } };
      const ours = results.buyWarpZero as { income: number; state: { gems: number } };
      expect(ours.income).toBe(rec.income);
      if (rec.income > 0) {
        expect(ours).toStrictEqual(rec);
        return;
      }
      // What the main branch did: 1000 gems in, the warp's price out, cash untouched.
      expect(rec.state.gems).toBe(1000 - cfg.economy.timeWarp.gemCost);
      expect(ours.state).toStrictEqual({ ...rec.state, gems: 1000 });
    });
  }

  it('the zero-income warp is really exercised for Pizza Empire (its early preset earns nothing yet)', () => {
    expect((recorded.results['pizza-empire'].buyWarpZero as { income: number }).income).toBe(0);
  });

  it('the parsed Pizza Empire config is the main branch one (store, the products\' listing texts, app release ids, tracking text and soundPack aside)', () => {
    const pinned = fixture('recorded-pizza-config.json') as { commit: string; unpinned: string[]; config: unknown };
    expect(pinned.commit).toMatch(MAIN_COMMIT);
    expect(pinned.unpinned).toStrictEqual([...CONFIG_UNPINNED]);
    const parsed = GameConfigSchema.parse(pizza);
    // Every key of the pinned config but each product's `description` and `shopLine` (PRODUCT_LISTING_TEXTS):
    // a product's id, kind, value, price, title, icon and highlight are the recording's, like all the rest.
    expect(withoutProductListingTexts(pinnedConfig(parsed))).toStrictEqual(withoutProductListingTexts(pinned.config));
    expect(parsed.soundPack).toBe('warm');
    // The name under the icon and the slug are pinned (guard:new:2), not left out with the ids.
    expect((pinned.config as { app: unknown }).app).toStrictEqual({ displayName: 'Pizza Empire', slug: 'pizza-empire-idle' });
  });

  it('Pizza Empire still prints every recorded product line, word for word: a shorter store description never shortens what the shop says', () => {
    const pinned = fixture('recorded-pizza-config.json') as { config: unknown };
    const parsed = GameConfigSchema.parse(pizza);
    // Each row that prints a line: the recording has no `shopLine`, so its lines are its descriptions.
    const recorded = shopLines(pinned.config);
    expect(productsOf(pinned.config).some((p) => 'shopLine' in p)).toBe(false);
    expect(shopLines(parsed)).toStrictEqual(recorded);
    // Really exercised: No Ads, the pass and the two multipliers, each with a recorded line.
    expect(Object.keys(recorded)).toStrictEqual(['pizza_no_ads', 'pizza_express_pass', 'pizza_x2', 'pizza_x3']);
    expect(Object.values(recorded).every((line) => typeof line === 'string' && line.length > 0)).toBe(true);
    // A deal's card prints the deal's blurb, never the product's description. The recorded description
    // of each deal product was that blurb, and the blurb is still the one the game holds.
    const dealProducts = productsOf(pinned.config).filter((p) => p.kind === 'deal');
    expect(dealProducts.length).toBeGreaterThan(0);
    for (const p of dealProducts) {
      expect(p.description).toBeTruthy();
      expect(dealsOf(pinned.config).find((d) => d.productId === p.id)?.blurb).toBe(p.description);
      expect(dealsOf(parsed).find((d) => d.productId === p.id)?.blurb).toBe(p.description);
    }
  });

  it('leaving the listing texts out hides nothing else: a product differing in any other key still fails', () => {
    const pinned = fixture('recorded-pizza-config.json') as { config: unknown };
    const strip = (config: unknown) => JSON.stringify(withoutProductListingTexts(config));
    // The stripped copy differs from the recording only by the two keys, and never changes the recording.
    const before = JSON.stringify(pinned.config);
    const stripped = withoutProductListingTexts(pinned.config);
    expect(JSON.stringify(pinned.config)).toBe(before);
    for (const [i, p] of productsOf(pinned.config).entries()) {
      const { description: _description, shopLine: _shopLine, ...rest } = p;
      expect(productsOf(stripped)[i]).toStrictEqual(rest);
    }
    // A changed price, title or value, an added product: each still shows.
    const changed = (edit: (products: Record<string, unknown>[]) => void) => {
      const copy = JSON.parse(before) as unknown;
      edit(productsOf(copy) as unknown as Record<string, unknown>[]);
      return strip(copy) !== strip(pinned.config);
    };
    expect(changed((ps) => void (ps[0].fallbackPrice = '$0.99'))).toBe(true);
    expect(changed((ps) => void (ps[0].title = 'No More Ads'))).toBe(true);
    expect(changed((ps) => void (ps[2].value = 4))).toBe(true);
    expect(changed((ps) => void ps.push({ id: 'pizza_extra', kind: 'gems', title: 'Extra', value: 1 }))).toBe(true);
    // ...and a changed description or shopLine alone does not (the lines a row prints are pinned by the test above).
    expect(changed((ps) => void (ps[0].description = 'Shorter.'))).toBe(false);
    expect(changed((ps) => void (ps[0].shopLine = 'Longer, for the shop.'))).toBe(false);
  });
});
