/**
 * The fingerprint check (spec 10.2 `scripts/lib/fingerprint.test.ts`, 10.3): on the two games'
 * declared fingerprints, the everyday mode passes with the pending dimensions unset and the
 * release mode fails; with the human, build and log entries filled the release mode passes with
 * 8 must and 18 of 19; one must value made equal, identical product kind sequences, a shared
 * sound or the same mode each fail.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../src/config/schema';
import { comparePair, declaredProblems, formatPair, gameFacts, humanCheckFor, pairFailures, readBundleReport, sameMultiset, sourceHashOf, tableStrings, textsOf, type AudioScore, type DeclaredFingerprint, type GameFacts, type PairReport } from './fingerprint';

/** compare.py's verdict when no shared key is close (what the two packs score today). */
const quiet: AudioScore = { keys: 10, failed: 0, maxJoint: 0.5, threshold: 0.6 };

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
    const r = comparePair(facts('pizza-empire'), facts('space-miner'), quiet);
    const declaredDims = [1, 2, 3, 4, 9, 10, 11, 12, 14, 15];
    const rows = r.rows.filter((x) => declaredDims.includes(x.dim.n));
    expect(rows.filter((x) => x.status === 'differs')).toHaveLength(9);
    expect(rows.filter((x) => x.status === 'same').map((x) => x.dim.id)).toEqual(['prestige_model']);
    // ...and dimension 17's declared voice differs too, with the measured share under 5 %: 10 differing declared values.
    expect(r.rows.find((x) => x.dim.n === 17)!.status).toBe('differs');
  });

  it('everyday mode: pending dimensions count neither way and the pair passes', () => {
    const r = comparePair(facts('pizza-empire'), facts('space-miner'), quiet);
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
    const r = comparePair(facts('pizza-empire', { ...filled('pizza-empire', 'space-miner'), lastSubmission: Date.UTC(2026, 11, 1) }), facts('space-miner', { bundleClean: true, lastSubmission: Date.UTC(2026, 11, 1) + 20 * day }), quiet);
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

  it('dimension 16 waits for compare.py when both games have sounds, and fails when it hears the same tunes', () => {
    const notRun = comparePair(facts('pizza-empire'), facts('space-miner'));
    expect(notRun.rows[15].status).toBe('pending');
    expect(comparePair(facts('pizza-empire'), facts('space-miner'), { error: 'No module named numpy' }).rows[15].note).toMatch(/numpy/);
    expect(comparePair(facts('pizza-empire'), facts('space-miner'), quiet).rows[15].status).toBe('differs');
    expect(comparePair(facts('pizza-empire'), facts('space-miner'), { keys: 10, failed: 1, maxJoint: 0.71, threshold: 0.6 }).rows[15].status).toBe('same');
    // A game without sounds: nothing to compare, the hashes decide.
    expect(comparePair(facts('pizza-empire'), facts('space-miner', { soundHashes: [], musicHashes: [] })).rows[15].status).toBe('differs');
  });

  it('dimension 6 reads the promotional text and the release notes too', () => {
    const pizza = facts('pizza-empire');
    const copied = 'Tap the oven, ring the bell and grow a chain of pizzerias across the city, one street at a time, all day long.';
    const r = comparePair(pizza, facts('space-miner', { store: { ...facts('space-miner').store, promotionalText: copied, releaseNotes: [pizza.store.description] } }), quiet);
    expect(r.rows[5].status).toBe('same');
  });

  it('a bundle report counts only while the sources it was made from are unchanged', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-report-'));
    try {
      const store = path.join(root, 'games', 'g1', 'store');
      fs.mkdirSync(store, { recursive: true });
      fs.mkdirSync(path.join(root, 'src'));
      fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export const a = 1;\n');
      expect(readBundleReport(root, 'g1').clean).toBeNull();
      const sources = ['src/a.ts'];
      const write = (result: 'pass' | 'fail') =>
        fs.writeFileSync(path.join(store, 'bundle-report.json'), JSON.stringify({ game: 'g1', date: '2026-11-22T12:00:00Z', platform: 'ios', stage: 'export', result, sourceHash: sourceHashOf(root, sources), sources, violations: [], modules: 1, assets: 0, bytes: 1 }));
      write('pass');
      expect(readBundleReport(root, 'g1').clean).toBe(true);
      write('fail');
      expect(readBundleReport(root, 'g1').clean).toBe(false);
      write('pass');
      fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export const a = 2;\n');
      const stale = readBundleReport(root, 'g1');
      expect(stale.clean).toBeNull();
      expect(stale.note).toMatch(/stale/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('fingerprint check with the third game (Night Market, market-design.md 1.2, 10.2)', () => {
  it('the Pizza-to-Orbit report is byte-identical to the one recorded before mode merge existed', () => {
    const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'fingerprint.pizzaOrbit.fixture.json'), 'utf8')) as { a: GameFacts; b: GameFacts; audio: AudioScore; report: PairReport; formatted: string };
    const r = comparePair(rec.a, rec.b, rec.audio);
    expect(JSON.stringify(r)).toBe(JSON.stringify(rec.report));
    expect(formatPair(r)).toBe(rec.formatted);
    expect(pairFailures(r, 'everyday')).toEqual(pairFailures(rec.report, 'everyday'));
  });

  it('accepts "grid-board" as a main screen layout and the declared night-market fingerprint has no vocabulary problem', () => {
    expect(declaredProblems(declared('night-market'))).toEqual([]);
    expect(declared('night-market').main_screen_layout).toBe('grid-board');
  });

  it('the same product kinds in another order fail (the multiset check beside the sequence check)', () => {
    expect(sameMultiset(['cosmetic', 'unlock'], ['unlock', 'cosmetic'])).toBe(true);
    expect(sameMultiset(['gems', 'gems', 'unlock'], ['gems', 'unlock', 'unlock'])).toBe(false);
    const swapped = comparePair(facts('pizza-empire', { productKinds: ['gems', 'noAds'] }), facts('space-miner', { productKinds: ['noAds', 'gems'] }), quiet);
    expect(pairFailures(swapped, 'everyday').join('\n')).toMatch(/same product kinds in another order/);
    // The sequence check still names an identical sequence once, as before.
    const same = comparePair(facts('pizza-empire', { productKinds: ['gems', 'noAds'] }), facts('space-miner', { productKinds: ['gems', 'noAds'] }), quiet);
    expect(same.problems.filter((p) => /product kinds/.test(p))).toEqual(['pizza-empire and space-miner sell the same sequence of product kinds (gems, noAds)']);
  });

  it('night-market against each game: 8 of 8 must differ or are pending, at least 15 known or pending, no problem', () => {
    const games = require('./games.js');
    const modes = require('./modes.js');
    const kits = (mode: string) => [`mode ${mode}`, ...Object.entries(modes.FAMILIES as Record<string, { modes: string[] }>).filter(([, f]) => f.modes.includes(mode)).map(([k]) => `family ${k}`)];
    const real = (id: string) => {
      const cfg = GameConfigSchema.parse(games.readGameJson(id));
      return gameFacts(ROOT, id, cfg, games, kits(cfg.mode));
    };
    const night = real('night-market');
    expect(night.mode).toBe('merge');
    // Decision M13: {cosmetic, unlock, skipAds}, a multiset neither first game has.
    expect([...night.productKinds].sort()).toEqual(['cosmetic', 'skipAds', 'unlock']);
    expect(night.productIds.every((p) => p.startsWith('night_'))).toBe(true);
    for (const other of ['pizza-empire', 'space-miner']) {
      const r = comparePair(night, real(other), null);
      expect(r.mustSame, `${other}: ${formatPair(r)}`).toBe(0);
      expect(r.verified + r.pending, other).toBeGreaterThanOrEqual(15);
      expect(pairFailures(r, 'everyday'), other).toEqual([]);
    }
  });
});

describe('human checks against each game, and the string table (store review, Night Market)', () => {
  const night = (human: DeclaredFingerprint['human']): Partial<GameFacts> => ({ id: 'night-market', mode: 'merge', artKits: ['mode merge'], declared: { ...declared('night-market'), human } });
  const row = (r: PairReport, n: number) => r.rows.find((x) => x.dim.n === n)!;

  it('a map keyed by game id holds one check per game; each pair reads its own entry', () => {
    const human: DeclaredFingerprint['human'] = {
      icon_and_screenshot_template: {
        'pizza-empire': { value: 'own', by: 'Reviewer', date: '2026-12-01' },
        'space-miner': { value: 'own', by: 'Reviewer', date: '2026-12-02' },
      },
      meta_screen_layouts: {
        'pizza-empire': { value: 'different', by: 'Reviewer', date: '2026-12-01' },
        'space-miner': { value: 'different', by: '', date: '' },
      },
    };
    const vsPizza = comparePair(facts('pizza-empire'), facts('night-market', night(human)), quiet);
    const vsOrbit = comparePair(facts('space-miner'), facts('night-market', night(human)), quiet);
    expect(row(vsPizza, 7).status).toBe('differs');
    expect(row(vsPizza, 7).note).toBe('checked by Reviewer on 2026-12-01');
    expect(row(vsPizza, 13).status).toBe('differs');
    expect(row(vsOrbit, 7).status).toBe('differs');
    expect(row(vsOrbit, 7).note).toBe('checked by Reviewer on 2026-12-02');
    // An entry without a name stays pending.
    expect(row(vsOrbit, 13).status).toBe('pending');
    expect(humanCheckFor(night(human).declared!, 'icon_and_screenshot_template', 'space-miner')).toEqual({ value: 'own', checkedAgainst: 'space-miner', by: 'Reviewer', date: '2026-12-02' });
    expect(humanCheckFor(night(human).declared!, 'icon_and_screenshot_template', 'other-game')).toBeNull();
  });

  it('the old shape (one check naming one game) is still read, and only for that game', () => {
    const one: DeclaredFingerprint['human'] = { icon_and_screenshot_template: { value: 'own', checkedAgainst: 'pizza-empire', by: 'Reviewer', date: '2026-12-01' } };
    expect(row(comparePair(facts('pizza-empire'), facts('night-market', night(one)), quiet), 7).status).toBe('differs');
    expect(row(comparePair(facts('space-miner'), facts('night-market', night(one)), quiet), 7).status).toBe('pending');
    expect(humanCheckFor(night(one).declared!, 'icon_and_screenshot_template', 'pizza-empire')?.by).toBe('Reviewer');
  });

  it('the string table yields single-quoted texts after a colon, double-quoted texts and the static parts of template literals, not comments', () => {
    const src = [
      '/** A `comment` with "quotes" */',
      "export const S = {",
      "  a: 'Fill the ticket',",
      '  b: "The fox\'s ticket",',
      '  c: (n: number) => `${n} goods wait at ${`the ${n} stalls`} tonight`,',
      '  // a "line comment"',
      '};',
    ].join('\n');
    const raw = tableStrings(src);
    expect(raw).toEqual(expect.arrayContaining(['Fill the ticket', "The fox's ticket", ' goods wait at ', 'the ', ' stalls', ' tonight']));
    // textsOf then keeps texts as before (single bare words read as ids and are left out).
    const got = textsOf(raw);
    expect(got).toEqual(['fill the ticket', "the fox's ticket", 'goods wait at']);
    expect(got.some((t) => /comment|quotes/.test(t))).toBe(false);
  });

  it('the haul table reads the same texts as before (no double-quoted or template text of its own): Orbit\'s facts do not move', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'ui', 'haul', 'strings.ts'), 'utf8');
    const before = new Set(textsOf([...src.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1])));
    const after = new Set(textsOf(tableStrings(src)));
    expect([...after].filter((t) => !before.has(t))).toEqual([]);
    expect(after.size).toBe(before.size);
  });
});

describe('fingerprint check with the fourth game (High Office, office-design.md 1.2, 10.2)', () => {
  const games = require('./games.js');
  const modes = require('./modes.js');
  const kits = (mode: string) => [`mode ${mode}`, ...Object.entries(modes.FAMILIES as Record<string, { modes: string[] }>).filter(([, f]) => f.modes.includes(mode)).map(([k]) => `family ${k}`)];
  const real = (id: string) => {
    const cfg = GameConfigSchema.parse(games.readGameJson(id));
    return gameFacts(ROOT, id, cfg, games, kits(cfg.mode));
  };

  it('every recorded report of the three existing pairs is byte-identical (recorded before mode decree existed)', () => {
    const po = JSON.parse(fs.readFileSync(path.join(__dirname, 'fingerprint.pizzaOrbit.fixture.json'), 'utf8')) as { a: GameFacts; b: GameFacts; audio: AudioScore; report: PairReport; formatted: string };
    const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'fingerprint.pairs.fixture.json'), 'utf8')) as { pairs: Record<string, { a: GameFacts; b: GameFacts; audio: AudioScore; report: PairReport; formatted: string }> };
    const all = { 'pizza-empire|space-miner': po, ...rec.pairs };
    expect(Object.keys(all).sort()).toEqual(['pizza-empire|night-market', 'pizza-empire|space-miner', 'space-miner|night-market']);
    for (const [pair, r] of Object.entries(all)) {
      const now = comparePair(r.a, r.b, r.audio);
      expect(JSON.stringify(now), pair).toBe(JSON.stringify(r.report));
      expect(formatPair(now), pair).toBe(r.formatted);
    }
  });

  it('accepts "office-ladder" as a progression structure, and the declared high-office fingerprint has no vocabulary problem', () => {
    const d = declared('high-office');
    expect(declaredProblems(d)).toEqual([]);
    expect(d.progression_structure).toBe('office-ladder');
    expect(declaredProblems({ ...d, progression_structure: 'office-tower' })).toEqual([expect.stringMatching(/progression_structure "office-tower"/)]);
    // The human checks are a map keyed by each of the three other games, all still empty (D9: no person has signed).
    for (const key of ['icon_and_screenshot_template', 'meta_screen_layouts'] as const) {
      expect(Object.keys(d.human[key] as object).sort()).toEqual(['night-market', 'pizza-empire', 'space-miner']);
      for (const other of ['pizza-empire', 'space-miner', 'night-market']) expect(humanCheckFor(d, key, other)?.by).toBe('');
    }
  });

  it('high-office against each game: 8 of 8 must differ or are pending, at least 15 known or pending, no problem', () => {
    const office = real('high-office');
    expect(office.mode).toBe('decree');
    // D11: {unlock, unlock, cosmetic, cosmetic, skipAds}, a multiset no other game has.
    expect([...office.productKinds].sort()).toEqual(['cosmetic', 'cosmetic', 'skipAds', 'unlock', 'unlock']);
    expect(office.productIds.every((p) => p.startsWith('office_'))).toBe(true);
    for (const other of ['pizza-empire', 'space-miner', 'night-market']) {
      const r = comparePair(office, real(other), null);
      expect(r.mustSame, `${other}: ${formatPair(r)}`).toBe(0);
      expect(r.verified + r.pending, other).toBeGreaterThanOrEqual(15);
      expect(pairFailures(r, 'everyday'), other).toEqual([]);
    }
  });
});
