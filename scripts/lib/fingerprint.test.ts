/**
 * The fingerprint check (spec 10.2 `scripts/lib/fingerprint.test.ts`, 10.3): on the two games'
 * declared fingerprints, the everyday mode passes with the pending dimensions unset and the
 * release mode fails; with the human, build and log entries filled the release mode passes with
 * 8 must and 18 of 19; one must value made equal, identical product kind sequences, a shared
 * sound or the same mode each fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { comparePair, pairFailures, type DeclaredFingerprint, type GameFacts } from './fingerprint';

const ROOT = path.join(__dirname, '..', '..');
const declared = (id: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'games', id, 'store', 'fingerprint.json'), 'utf8')) as DeclaredFingerprint;

function facts(id: string, over: Partial<GameFacts> = {}): GameFacts {
  const pizza = id === 'pizza-empire';
  return {
    id,
    mode: pizza ? 'sim' : 'haul',
    artKits: pizza ? ['mode sim', 'family tabs'] : ['mode haul'],
    soundPack: pizza ? 'warm' : null,
    declared: declared(id),
    store: pizza
      ? { title: 'Pizza Empire: Restaurant Sim', subtitle: 'Bake, serve & grow an empire', shortDescription: 'Bake pizzas and serve guests in your own restaurant.', description: 'Tap the oven, ring the bell and grow a chain of pizzerias across the city.', keywords: ['pizza', 'idle', 'tycoon', 'restaurant'] }
      : { title: 'Orbit Haulers', subtitle: 'Route ore drones, idle mining', shortDescription: 'Route drones, ship cargo by freighter and grow a station.', description: 'Drag hauler drones onto rocks to set their routes and swipe the freighter off the pad.', keywords: ['space', 'mining', 'asteroid', 'freighter'] },
    imageHashes: pizza ? ['p1', 'p2'] : [],
    soundHashes: pizza ? ['s1', 's2', 's3'] : ['h1', 'h2', 'h3'],
    musicHashes: pizza ? ['m1'] : ['m2'],
    strings: pizza ? ['ring the bell.', 'serve {n} customers'] : ['drone t-1 idle. send it to the rock.', 'move {n} units. any ore.'],
    productKinds: pizza ? ['noAds', 'skipAds', 'multiplier', 'gems'] : ['clearance', 'unlock', 'starterPack', 'gems'],
    productIds: pizza ? ['pizza_no_ads', 'pizza_x2'] : ['space_clearance', 'space_hangar'],
    bundleClean: null,
    lastSubmission: null,
    ...over,
  };
}

const filled = (id: string, other: string): Partial<GameFacts> => {
  const d = declared(id);
  return {
    declared: {
      ...d,
      human: {
        icon_and_screenshot_template: { value: 'own', checkedAgainst: other, by: 'Reviewer', date: '2026-12-01' },
        meta_screen_layouts: { value: 'different', checkedAgainst: other, by: 'Reviewer', date: '2026-12-01' },
      },
    },
    bundleClean: true,
  };
};

describe('fingerprint check', () => {
  it('the declared dimensions: 10 differ and 1 (prestige_model) is the same', () => {
    const r = comparePair(facts('pizza-empire'), facts('space-miner'));
    const declaredDims = [1, 2, 3, 4, 9, 10, 11, 12, 14, 15];
    const rows = r.rows.filter((x) => declaredDims.includes(x.dim.n));
    expect(rows.filter((x) => x.status === 'differs')).toHaveLength(9);
    expect(rows.filter((x) => x.status === 'same').map((x) => x.dim.id)).toEqual(['prestige_model']);
    // ...and dimension 17's declared voice differs too, with the measured share under 5 %: 10 differing declared values.
    expect(r.rows.find((x) => x.dim.n === 17)!.status).toBe('differs');
  });

  it('everyday mode: pending dimensions count neither way and the pair passes', () => {
    const r = comparePair(facts('pizza-empire'), facts('space-miner'));
    expect(r.pending).toBe(4);
    expect(r.verified).toBe(14);
    expect(pairFailures(r, 'everyday')).toEqual([]);
  });

  it('release mode fails while anything is pending', () => {
    const r = comparePair(facts('pizza-empire'), facts('space-miner'));
    expect(pairFailures(r, 'release').join('\n')).toMatch(/pending/);
  });

  it('with the human, bundle and release-log entries filled, release mode passes with 8 must and 18 of 19', () => {
    const day = 86_400_000;
    const r = comparePair(facts('pizza-empire', { ...filled('pizza-empire', 'space-miner'), lastSubmission: Date.UTC(2026, 11, 1) }), facts('space-miner', { bundleClean: true, lastSubmission: Date.UTC(2026, 11, 1) + 20 * day }));
    expect(r.mustVerified).toBe(8);
    expect(r.verified).toBe(18);
    expect(pairFailures(r, 'release')).toEqual([]);
  });

  it('one must value made equal fails in both modes', () => {
    const d = declared('space-miner');
    const r = comparePair(facts('pizza-empire'), facts('space-miner', { declared: { ...d, money_moment: 'customer-pays' } }));
    expect(pairFailures(r, 'everyday').join('\n')).toMatch(/money_moment/);
  });

  it('two games of the same mode cannot differ on the first four dimensions, whatever they declare', () => {
    const r = comparePair(facts('pizza-empire'), facts('space-miner', { mode: 'sim' }));
    expect(r.rows.slice(0, 4).every((x) => x.status === 'same')).toBe(true);
    expect(pairFailures(r, 'everyday')).not.toEqual([]);
  });

  it('a shared art kit, a shared image or a shared sound pack counts as overlap', () => {
    expect(comparePair(facts('pizza-empire'), facts('space-miner', { artKits: ['mode classic', 'family tabs'] })).rows[4].status).toBe('same');
    expect(comparePair(facts('pizza-empire'), facts('space-miner', { imageHashes: ['p1'] })).rows[4].status).toBe('same');
    expect(comparePair(facts('pizza-empire'), facts('space-miner', { soundPack: 'warm' })).rows[15].status).toBe('same');
  });

  it('identical product kind sequences, a borrowed product prefix and two "X: Y" titles fail', () => {
    const kinds = comparePair(facts('pizza-empire'), facts('space-miner', { productKinds: ['noAds', 'skipAds', 'multiplier', 'gems'] }));
    expect(pairFailures(kinds, 'everyday').join('\n')).toMatch(/same sequence of product kinds/);
    const prefix = comparePair(facts('pizza-empire'), facts('space-miner', { productIds: ['space_clearance', 'pizza_x9'] }));
    expect(pairFailures(prefix, 'everyday').join('\n')).toMatch(/prefix/);
    const titles = comparePair(facts('pizza-empire'), facts('space-miner', { store: { ...facts('space-miner').store, title: 'Orbit: Haulers' } }));
    expect(pairFailures(titles, 'everyday').join('\n')).toMatch(/X: Y/);
  });

  it('a value outside the closed vocabulary is a problem', () => {
    const d = declared('space-miner');
    const r = comparePair(facts('pizza-empire'), facts('space-miner', { declared: { ...d, core_verb: 'swipe-and-pray' } }));
    expect(r.problems.join('\n')).toMatch(/core_verb/);
  });
});
