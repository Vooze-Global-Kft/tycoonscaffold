/// <reference types="node" />
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bundleViolations, denylistOf, denyMatcher, importViolations, levelOf, modeOf, packageOf, textOfData, themeWordsIn, type BundleContents, type BundleManifest } from './bundleRules';
import { readAliases, resolveImport, runtimeImports, webOnlyHitsIn } from '../check-bundle';

const M: BundleManifest = {
  modeFolders: { sim: ['src/modes/sim', 'src/ui/sim'], classic: ['src/modes/classic', 'src/ui/scene'], haul: ['src/modes/haul'] },
  families: { tabs: { modes: ['sim', 'classic'], paths: ['src/ui/shell', 'src/ui/home', 'src/ui/art/props.tsx'] } },
  shared: ['src/ui/App.tsx', 'src/ui/simulation.ts', 'src/ui/components/GameIcon.tsx', 'src/ui/art/icons.ts', 'src/ui/kit', 'src/engine', 'src/state', 'src/services', 'src/generated', 'src/modes/contract.ts'],
  classifiedRoot: 'src',
  nodeOnly: ['src/services/fx/catalog.ts'],
  modePackages: { three: ['classic'], 'expo-gl': ['classic'] },
  rig: ['src/ui/sim/art/Character.tsx', 'src/ui/sim/art/rig.ts'],
  generatedEntry: 'src/generated/mode.ts',
  soundPacks: 'shared/sfx',
  games: ['pizza-empire', 'space-miner'],
};

const clean = (over: Partial<BundleContents> = {}): BundleContents => ({
  game: 'space-miner',
  mode: 'classic',
  pack: 'synth',
  modules: ['src/ui/App.tsx', 'src/modes/classic/index.tsx', 'src/ui/scene/ThreeScene.tsx', 'games/space-miner/game.json'],
  assets: ['shared/sfx/synth/buy.wav', 'games/space-miner/assets/sfx/music_main.m4a'],
  packages: ['react', 'three'],
  ...over,
});

const rules = (b: BundleContents) => bundleViolations(b, M).map((v) => `${v.rule} ${v.file}`);

describe('bundle rules', () => {
  it('a bundle of its own mode, data, pack and packages passes', () => {
    expect(rules(clean())).toEqual([]);
  });

  it('another mode\'s folders fail, the shared ones and its own do not', () => {
    expect(rules(clean({ modules: ['src/ui/sim/scene/world/World.tsx', 'src/modes/haul/index.tsx', 'src/ui/simulation.ts', 'src/ui/scene/SkiaScene.tsx'] }))).toEqual([
      'other-mode src/ui/sim/scene/world/World.tsx',
      'other-mode src/modes/haul/index.tsx',
    ]);
  });

  it('another game\'s data fails, as a module or as an asset', () => {
    expect(rules(clean({ modules: ['games/pizza-empire/game.json'], assets: ['games/pizza-empire/assets/hero.png'] }))).toEqual([
      'other-game games/pizza-empire/game.json',
      'other-game games/pizza-empire/assets/hero.png',
    ]);
  });

  it('a sound from a pack the game does not declare fails', () => {
    expect(rules(clean({ assets: ['shared/sfx/warm/bell.wav', 'shared/sfx/synth/bell.wav'] }))).toEqual(['other-pack shared/sfx/warm/bell.wav']);
    expect(rules(clean({ game: 'pizza-empire', mode: 'sim', pack: 'warm', modules: [], packages: [], assets: ['shared/sfx/warm/bell.wav'] }))).toEqual([]);
  });

  it('the restaurant rig fails for every mode but sim, and is named as the rig', () => {
    expect(rules(clean({ mode: 'haul', modules: ['src/ui/sim/art/rig.ts'], packages: [] }))).toEqual(['other-mode src/ui/sim/art/rig.ts', 'restaurant-rig src/ui/sim/art/rig.ts']);
    expect(rules(clean({ game: 'pizza-empire', mode: 'sim', pack: 'warm', modules: ['src/ui/sim/art/rig.ts'], assets: [], packages: [] }))).toEqual([]);
  });

  it('three.js and the GL view are for the classic mode only', () => {
    expect(rules(clean({ game: 'pizza-empire', mode: 'sim', pack: 'warm', modules: [], assets: [], packages: ['three', 'expo-gl', 'react'] }))).toEqual([
      'mode-package node_modules/three',
      'mode-package node_modules/expo-gl',
    ]);
  });

  it('a mode is told by its folders, not by a name that starts the same', () => {
    expect(modeOf('src/ui/sim/x.ts', M)).toBe('sim');
    expect(modeOf('src/ui/simple.ts', M)).toBeNull();
    expect(modeOf('src/ui/scene', M)).toBe('classic');
  });
});

describe('three levels', () => {
  it('tells a mode\'s folders, a family, a shared file and an unclassified file under src/ui apart', () => {
    expect(levelOf('src/ui/sim/x.ts', M)).toEqual({ level: 'mode', mode: 'sim' });
    expect(levelOf('src/ui/home/rows.tsx', M)).toEqual({ level: 'family', family: 'tabs' });
    expect(levelOf('src/ui/art/props.tsx', M)).toEqual({ level: 'family', family: 'tabs' });
    expect(levelOf('src/ui/art/icons.ts', M)).toEqual({ level: 'shared' });
    expect(levelOf('src/ui/kit/Sheet.tsx', M)).toEqual({ level: 'shared' });
    expect(levelOf('src/engine/economy.ts', M)).toEqual({ level: 'shared' });
    expect(levelOf('src/ui/art/new.tsx', M)).toEqual({ level: 'unclassified' });
  });

  it('a new folder or file anywhere in src/ is unclassified until listed, not "shared" by default', () => {
    expect(levelOf('src/art2/chef.ts', M)).toEqual({ level: 'unclassified' });
    expect(levelOf('src/modes/other/index.tsx', M)).toEqual({ level: 'unclassified' });
    expect(levelOf('src/modes/contract.ts', M)).toEqual({ level: 'shared' });
    expect(levelOf('index.ts', M)).toEqual({ level: 'shared' });
    expect(rules(clean({ mode: 'haul', modules: ['src/ui/components/GameIcon.tsx', 'src/art2/chef.ts'], packages: [] }))).toEqual(['unclassified src/art2/chef.ts']);
    expect(importViolations([['src/ui/components/GameIcon.tsx', 'src/art2/chef.ts']], M).map((v) => v.rule)).toEqual(['imports-unclassified']);
  });

  it('a family file ships with its member modes only; an unclassified or Node-only file with none', () => {
    const files = ['src/ui/shell/TabShell.tsx', 'src/ui/art/props.tsx', 'src/ui/art/new.tsx', 'src/services/fx/catalog.ts', 'src/ui/kit/Sheet.tsx'];
    expect(rules(clean({ mode: 'haul', modules: files, packages: [] }))).toEqual([
      'other-family src/ui/shell/TabShell.tsx',
      'other-family src/ui/art/props.tsx',
      'unclassified src/ui/art/new.tsx',
      'node-only src/services/fx/catalog.ts',
    ]);
    expect(rules(clean({ modules: files }))).toEqual(['unclassified src/ui/art/new.tsx', 'node-only src/services/fx/catalog.ts']);
  });

  it('a family file may be imported by the family and its member modes only; shared code imports shared code only', () => {
    const edges = [
      ['src/ui/kit/Sheet.tsx', 'src/ui/art/props.tsx'],
      ['src/ui/components/GameIcon.tsx', 'src/ui/art/icons.ts'],
      ['src/ui/shell/TabShell.tsx', 'src/ui/home/rows.tsx'],
      ['src/ui/shell/TabShell.tsx', 'src/ui/kit/Sheet.tsx'],
      ['src/modes/classic/index.tsx', 'src/ui/shell/TabShell.tsx'],
      ['src/modes/haul/index.tsx', 'src/ui/shell/TabShell.tsx'],
      ['src/ui/home/rows.tsx', 'src/ui/sim/art/index.ts'],
      ['src/ui/kit/Sheet.tsx', 'src/ui/art/new.tsx'],
      ['src/ui/art/new.tsx', 'src/ui/home/rows.tsx'],
      ['src/ui/sim/home/HomeSim.tsx', 'src/ui/art/new.tsx'],
    ] as const;
    expect(importViolations(edges, M).map((v) => `${v.rule} ${v.file}`)).toEqual([
      'shared-imports-family src/ui/kit/Sheet.tsx',
      'imports-other-family src/modes/haul/index.tsx',
      'family-imports-mode src/ui/home/rows.tsx',
      'imports-unclassified src/ui/kit/Sheet.tsx',
      'shared-imports-family src/ui/art/new.tsx',
      'imports-unclassified src/ui/sim/home/HomeSim.tsx',
    ]);
  });

  it('a Node-only file may import any mode (it is in no bundle), but nothing shared may import it to reach one', () => {
    const edges = [
      ['src/services/fx/catalog.ts', 'src/modes/haul/fx.ts'],
      ['src/services/fx/index.ts', 'src/modes/haul/fx.ts'],
    ] as const;
    expect(importViolations(edges, M).map((v) => `${v.rule} ${v.file}`)).toEqual(['shared-imports-mode src/services/fx/index.ts']);
    // And a bundle that holds the Node-only file still fails.
    expect(rules(clean({ modules: ['src/ui/App.tsx', 'src/services/fx/catalog.ts'] }))).toContain('node-only src/services/fx/catalog.ts');
  });
});

describe('fails closed', () => {
  it('an import the check cannot resolve is a violation, not a warning', () => {
    expect(rules(clean({ unresolved: [{ file: 'src/ui/components/GameIcon.tsx', spec: './chef.mjs' }] }))).toEqual(['unresolved src/ui/components/GameIcon.tsx']);
  });

  it('a literal with another mode\'s theme word fails unless it is in the known remainder', () => {
    const themeWords = [
      { file: 'src/state/store.ts', text: 'cook_done', words: ['cook'] },
      { file: 'src/state/store.ts', text: 'Your chef is ready', words: ['chef'] },
      { file: 'src/engine/meta.ts', text: 'cook_done', words: ['cook'] },
    ];
    expect(rules(clean({ mode: 'haul', packages: [], modules: [], themeWords, themeWordsAllowed: { 'src/state/store.ts': ['cook_done'] } }))).toEqual([
      'theme-word src/state/store.ts',
      'theme-word src/engine/meta.ts',
    ]);
  });
});

describe('bare imports through tsconfig paths and baseUrl', () => {
  const exts = ['.tsx', '.ts', '.js', '.json'];
  const tree = (tsconfig: object) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-alias-'));
    const put = (rel: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    };
    put('tsconfig.json', JSON.stringify(tsconfig));
    put('src/ui/sim/art/looks.ts', 'export const LOOKS = {};');
    put('src/ui/components/GameIcon.tsx', "import { LOOKS } from '@/ui/sim/art/looks';");
    put('node_modules/react/package.json', '{"name":"react"}');
    return root;
  };

  it('an alias that lands on a project file is followed like a relative import (the hole the review found)', () => {
    const root = tree({ compilerOptions: { paths: { '@/*': ['./src/*'] } } });
    const from = path.join(root, 'src/ui/components/GameIcon.tsx');
    const aliases = readAliases(root);
    expect(resolveImport(from, '@/ui/sim/art/looks', exts, new Map(), aliases)).toEqual({ file: path.join(root, 'src/ui/sim/art/looks.ts') });
    expect(resolveImport(from, 'react', exts, new Map(), aliases)).toEqual({ package: 'react' });
    expect(resolveImport(from, '@/ui/nothing', exts, new Map(), aliases)).toEqual({ unresolved: true });
    expect(resolveImport(from, 'not-installed', exts, new Map(), aliases)).toEqual({ unresolved: true });
  });

  it('baseUrl makes "src/..." a project file; an installed package still is a package', () => {
    const root = tree({ compilerOptions: { baseUrl: '.' } });
    const from = path.join(root, 'src/ui/components/GameIcon.tsx');
    const aliases = readAliases(root);
    expect(resolveImport(from, 'src/ui/sim/art/looks', exts, new Map(), aliases)).toEqual({ file: path.join(root, 'src/ui/sim/art/looks.ts') });
    expect(resolveImport(from, 'react', exts, new Map(), aliases)).toEqual({ package: 'react' });
  });

  it('an import with an extension the check does not try is unresolved, not skipped', () => {
    const root = tree({});
    fs.writeFileSync(path.join(root, 'src/ui/chef.mjs'), 'export default 1;');
    const from = path.join(root, 'src/ui/components/GameIcon.tsx');
    expect(resolveImport(from, '../chef', exts, new Map(), readAliases(root))).toEqual({ unresolved: true });
  });
});

describe('theme words', () => {
  it('finds whole words in identifiers and sentences, with plurals and verb forms, not inside other words', () => {
    const w = ['cook', 'guest', 'table', 'serve', 'ore'];
    expect(themeWordsIn('cook_done', w)).toEqual(['cook']);
    expect(themeWordsIn('guestsPaid', w)).toEqual(['guest']);
    expect(themeWordsIn('Serving 3 tables', w).sort()).toEqual(['serve', 'table']);
    expect(themeWordsIn('cookie score before', w)).toEqual([]);
    expect(themeWordsIn('Ore', w)).toEqual(['ore']);
  });
});

describe('layering rule', () => {
  it('shared code may not import a mode\'s folders; the generated entry and the mode itself may', () => {
    const edges = [
      ['src/ui/components/GameIcon.tsx', 'src/ui/sim/art/index.ts'],
      ['src/generated/mode.ts', 'src/modes/sim/index.tsx'],
      ['src/modes/sim/index.tsx', 'src/ui/sim/home/HomeSim.tsx'],
      ['src/ui/sim/home/HomeSim.tsx', 'src/ui/home/rows.tsx'],
      ['src/modes/classic/HomeClassic.tsx', 'src/ui/sim/art/props.tsx'],
    ] as const;
    expect(importViolations(edges, M).map((v) => `${v.file} -> ${/imports (\S+)/.exec(v.message)![1]}`)).toEqual([
      'src/ui/components/GameIcon.tsx -> src/ui/sim/art/index.ts',
      'src/modes/classic/HomeClassic.tsx -> src/ui/sim/art/props.tsx',
    ]);
  });
});

describe('import reading', () => {
  it('keeps value imports, re-exports, require and import(); drops type-only ones', () => {
    const src = [
      "import a from './a';",
      "import { b, type B } from './b';",
      "import type { C } from './c';",
      "import { type D } from './d';",
      "export { e } from './e';",
      "export type { F } from './f';",
      "const g = require('./g.png');",
      "const h = () => import('./h');",
      "import './side-effect';",
    ].join('\n');
    expect(runtimeImports('x.ts', src).sort()).toEqual(['./a', './b', './e', './g.png', './h', './side-effect']);
  });

  it('names the package of a bare import or a node_modules path', () => {
    expect(packageOf('three/examples/jsm/x')).toBe('three');
    expect(packageOf('@shopify/react-native-skia')).toBe('@shopify/react-native-skia');
    expect(packageOf('node_modules/expo/node_modules/@expo/cli/build/x.js')).toBe('@expo/cli');
  });
});

describe('the string denylist (errata 6)', () => {
  const other = {
    characters: [{ id: 'tally', name: 'TALLY' }, { id: 'ops', name: 'OPS-2' }],
    meta: { cards: [{ name: 'Diamond Bit', title: 'Drill head', flavor: 'Cuts faster. Wears out never.' }], chests: [{ name: 'Scrap Pod' }] },
    haul: { names: { station: 'Tamsin Station', drone: 'Drone' }, galaxies: { names: ['Cygnus Drift'] }, contracts: { buyers: [{ name: 'Halden Yards' }] }, ores: [{ name: 'Iron' }] },
    story: [{ lines: ['Drone T-1 idle. Send it to the rock.'] }],
    strings: { gemName: 'Dark Matter' },
    store: { title: 'Orbit Haulers', subtitle: 'Route ore drones, idle mining', keywords: ['space', 'freighter cargo'], description: 'Orbit Haulers is an idle mining game about routes and cargo.\n\nFeatures\n- One-swipe freighter launches\n- Close' },
  };
  const own = { strings: { gemName: 'Truffles' }, meta: { cards: [{ name: 'Scrap Pod' }] } };
  const terms = denylistOf('space-miner', other, { labels: ['Close', 'Settings'], ownText: textOfData(own) });
  const names = terms.map((t) => t.term);

  it('holds the other game\'s names, lines and store sentences', () => {
    for (const t of ['TALLY', 'OPS-2', 'Diamond Bit', 'Drill head', 'Cuts faster. Wears out never.', 'Tamsin Station', 'Cygnus Drift', 'Halden Yards', 'Drone T-1 idle. Send it to the rock.', 'Orbit Haulers', 'Route ore drones, idle mining', 'Orbit Haulers is an idle mining game about routes and cargo.', 'One-swipe freighter launches'])
      expect(names).toContain(t);
  });

  it('never keywords, interface labels, plain nouns, short words, interface strings, or what the bundled game says itself', () => {
    for (const t of ['space', 'freighter cargo', 'Close', 'Drone', 'Iron', 'Features', 'Dark Matter', 'Scrap Pod']) expect(names).not.toContain(t);
  });

  it('single names match case-sensitively as whole words, phrases in any case and spacing', () => {
    const match = denyMatcher(terms);
    const hit = (text: string) => match(text).map((t) => t.term);
    expect(hit('TALLY: T-1 is dry.')).toEqual(['TALLY']);
    expect(hit('const tally = 3; talLY')).toEqual([]);
    expect(hit('TALLYING')).toEqual([]);
    expect(hit('welcome to tamsin   station')).toEqual(['Tamsin Station']);
    expect(hit('Tamsin Stationary')).toEqual([]);
  });

  it('a hit fails the bundle unless bundle-allow.json lists the term', () => {
    const term = terms.find((t) => t.term === 'Tamsin Station')!;
    const denied = [{ file: 'src/engine/meta.ts', line: 3, term }];
    expect(rules(clean({ denied }))).toEqual(['denied-string src/engine/meta.ts']);
    expect(rules(clean({ denied, deniedAllowed: { 'Tamsin Station': 'an engine identifier' } }))).toEqual([]);
  });
});


describe('web-only development tools (store-13, phone-12, perf-8)', () => {
  const W: BundleManifest = { ...M, webOnly: ['src/dev/presets.web.ts', 'src/engine/haul/bot.ts'] };
  const withDev = (platform: string, hits: { file: string; text: string }[] = []) =>
    bundleViolations(clean({ modules: [...clean().modules, 'src/engine/haul/bot.ts'], platform, webOnlyHits: hits }), W).filter((v) => v.rule === 'web-only').map((v) => v.file);
  it('a phone bundle holding one fails, the web bundle does not', () => {
    expect(withDev('ios')).toEqual(['src/engine/haul/bot.ts']);
    expect(withDev('android')).toEqual(['src/engine/haul/bot.ts']);
    expect(withDev('web')).toEqual([]);
  });
  it('a string of those tools found in a phone bundle fails', () => {
    expect(withDev('ios', [{ file: 'src/state/store.ts', text: 'empire' }])).toContain('src/state/store.ts');
  });
  it('the tab shell\'s tab names count in a haul phone bundle as quoted strings only, never in sim', () => {
    const files: [string, string][] = [['src/a.js', 'const t = ["home","staff"];'], ['src/b.js', 'staffing(); // staff']];
    expect(webOnlyHitsIn(files, 'haul', 'ios')).toEqual([{ file: 'src/a.js', text: 'staff' }]);
    expect(webOnlyHitsIn(files, 'sim', 'ios')).toEqual([]);
    expect(webOnlyHitsIn([['src/c.js', 'runHaulBot(cfg)']], 'haul', 'web')).toEqual([]);
    expect(webOnlyHitsIn([['src/c.js', 'runHaulBot(cfg)']], 'haul', 'android')).toEqual([{ file: 'src/c.js', text: 'runHaulBot' }]);
  });
  it('the page address (location.search) fails a haul phone bundle in shipped code only, never a library or sim', () => {
    const q: [string, string][] = [['src/ui/haul/dev.js', 'new URLSearchParams(location.search)']];
    expect(webOnlyHitsIn(q, 'haul', 'ios', 'export')).toEqual([{ file: 'src/ui/haul/dev.js', text: 'location.search' }]);
    expect(webOnlyHitsIn(q, 'haul', 'ios', 'fast')).toEqual([]);
    expect(webOnlyHitsIn(q, 'sim', 'ios', 'export')).toEqual([]);
    expect(webOnlyHitsIn([['node_modules/x/utm.js', 'location.search']], 'haul', 'android', 'export')).toEqual([]);
  });
  it('the haul address switches (src/ui/haul/dev.web.ts) are a web-only file', async () => {
    const modes = (await import('./modes.js')) as unknown as { WEB_ONLY: string[] };
    expect(modes.WEB_ONLY).toContain('src/ui/haul/dev.web.ts');
  });
});
