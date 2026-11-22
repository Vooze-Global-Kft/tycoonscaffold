/// <reference types="node" />
/**
 * What the sim and classic entries hand the shared code (src/modes/contract.ts). Every reader of
 * these pieces falls back quietly when one is missing (GameIcon draws ❔, the card window stays
 * empty, the tutorial shows no hand), so nothing else would notice a key dropped while editing an
 * entry: Pizza Empire would lose its glove or its portraits on the phone with every check green.
 *
 * The drawings import Skia, which does not load under node, so each module an entry imports is
 * replaced by named stand-ins and the test checks that the entry passes exactly those on.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PORTRAIT_MODES, SIM_ART_ICON_NAMES, TABS_ART_ICON_NAMES } from '../config/artIcons';

const s = vi.hoisted(() => {
  const named = (name: string) => Object.assign(() => null, { displayName: name });
  const table = (names: readonly string[]) => Object.fromEntries(names.map((n) => [n, { name: n }]));
  return { named, table };
});

vi.mock('../ui/art/props', async () => {
  const { TABS_ART_ICON_NAMES: tabs } = await import('../config/artIcons');
  return { HandPointer: s.named('HandPointer'), TABS_ART_ICONS: s.table(tabs), artIconSources: (defs: object) => ({ sources: defs }) };
});
vi.mock('../ui/home/hints', () => ({ listHints: { ask: () => [], name: 'listHints' } }));
vi.mock('../ui/shell/TabShell', () => ({ TabShell: s.named('TabShell') }));
vi.mock('../ui/sim/art', async () => {
  const { SIM_ART_ICON_NAMES: sim } = await import('../config/artIcons');
  return { CharacterBust: s.named('CharacterBust'), SIM_ART_ICONS: s.table(sim) };
});
vi.mock('../ui/sim/art/CardBust', () => ({ CardBust: s.named('CardBust') }));
vi.mock('../ui/sim/art/Gallery', () => ({ ArtGallery: s.named('ArtGallery') }));
vi.mock('../ui/sim/art/GalleryProps', () => ({ PropsGallery: s.named('PropsGallery') }));
vi.mock('../ui/sim/home/HomeSim', () => ({ HomeSim: s.named('HomeSim') }));
vi.mock('./classic/HomeClassic', () => ({ HomeClassic: s.named('HomeClassic') }));
vi.mock('./classic/ManagersPanel', () => ({ ManagersPanel: s.named('ManagersPanel') }));
vi.mock('../ui/art/icons', () => ({ registerArtIcons: vi.fn() }));

const nameOf = (c: unknown) => (c as { displayName?: string } | undefined)?.displayName;
const read = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8');

describe('the sim entry (Pizza Empire)', () => {
  it('hands over the portraits, the card bust, the glove, the 11 art icons and the list homes\' tutorial', async () => {
    const { default: sim } = await import('./sim');
    const { listHints } = await import('../ui/home/hints');
    expect(sim.id).toBe('sim');
    expect(typeof sim.Shell).toBe('function');
    expect(typeof sim.parts?.CharIcon).toBe('function');
    expect(nameOf(sim.parts?.CardBust)).toBe('CardBust');
    expect(nameOf(sim.parts?.HintPointer)).toBe('HandPointer');
    expect(sim.hints).toBe(listHints);
    const icons = Object.keys((sim.artIcons as unknown as { sources: object }).sources);
    expect(icons).toEqual([...TABS_ART_ICON_NAMES, ...SIM_ART_ICON_NAMES]);
    expect(icons).toHaveLength(11);
  });

  it('ships its review screens on the web only', async () => {
    expect((await import('./sim/devViews')).devViews).toBeUndefined();
    const web = (await import('./sim/devViews.web')).devViews!;
    expect(Object.fromEntries(Object.entries(web).map(([k, v]) => [k, nameOf(v)]))).toEqual({ art: 'ArtGallery', props: 'PropsGallery' });
    expect(read('sim/index.tsx')).toMatch(/import \{ devViews \} from '\.\/devViews';/);
  });

  it('is what installMode gives the shared readers', async () => {
    const { default: sim } = await import('./sim');
    const { installMode } = await import('./contract');
    const { modeParts } = await import('../ui/modeParts');
    const { hintSource } = await import('../ui/hints/source');
    const { registerArtIcons } = await import('../ui/art/icons');
    installMode(sim);
    expect(modeParts()).toBe(sim.parts);
    expect(hintSource()).toBe(sim.hints);
    expect(registerArtIcons).toHaveBeenCalledWith(sim.artIcons);
  });
});

describe('the classic entry', () => {
  it('hands over the glove, the tab-shell art icons and the list homes\' tutorial, and no people', async () => {
    const { default: classic } = await import('./classic');
    const { listHints } = await import('../ui/home/hints');
    expect(classic.id).toBe('classic');
    expect(nameOf(classic.parts?.HintPointer)).toBe('HandPointer');
    expect(classic.parts?.CharIcon).toBeUndefined();
    expect(PORTRAIT_MODES, 'validate warns about "char:" icons in modes without portraits').toEqual(['sim']);
    expect(classic.hints).toBe(listHints);
    expect(Object.keys((classic.artIcons as unknown as { sources: object }).sources)).toEqual([...TABS_ART_ICON_NAMES]);
  });
});

describe('App.tsx', () => {
  it('installs the generated entry at module level, before anything renders', () => {
    const app = read('../ui/App.tsx');
    const install = app.search(/^installMode\(modeEntry\);$/m);
    expect(install, 'a top-level `installMode(modeEntry);` line').toBeGreaterThan(0);
    expect(install).toBeLessThan(app.indexOf('export default function App'));
    expect(app).toMatch(/^import \{ modeEntry \} from '\.\.\/generated\/mode';$/m);
    expect(app).toMatch(/^import \{ installMode \} from '\.\.\/modes\/contract';$/m);
  });
});
