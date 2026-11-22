/**
 * The rules of the bundle check (scripts/check-bundle.ts), as pure functions so they are tested
 * on their own (bundleRules.test.ts). Paths are repo-relative with forward slashes; packages are
 * npm names ("three", "@shopify/react-native-skia").
 */

export interface BundleManifest {
  /** Repo-relative folders owned by each mode (level c). */
  modeFolders: Record<string, readonly string[]>;
  /** Families (level b): files some modes share and the others never bundle. */
  families: Record<string, { modes: readonly string[]; paths: readonly string[] }>;
  /** Files and folders under `uiRoot` that every game ships (level a). */
  sharedUi: readonly string[];
  /** The folder whose files must be classified; outside it, non-mode files in src/ are level a. */
  uiRoot: string;
  /** Files the Node tools read and no bundle may hold. */
  nodeOnly: readonly string[];
  /** npm package -> the modes that may bundle it. */
  modePackages: Record<string, readonly string[]>;
  /** The restaurant rig's files (forbidden for every mode but sim). */
  rig: readonly string[];
  /** The one shared file allowed to import a mode entry. */
  generatedEntry: string;
  /** Folder of the sound packs (shared/sfx). */
  soundPacks: string;
  /** Every game id (folders in games/). */
  games: readonly string[];
}

export interface BundleContents {
  game: string;
  mode: string;
  /** The game's declared sound pack (null: none, only its own sounds). */
  pack: string | null;
  /** Project source files in the bundle (node_modules excluded). */
  modules: readonly string[];
  /** Asset files in the bundle (images, sounds, fonts). */
  assets: readonly string[];
  /** npm packages with at least one module in the bundle. */
  packages: readonly string[];
}

export interface Violation {
  rule:
    | 'other-mode'
    | 'other-family'
    | 'unclassified'
    | 'node-only'
    | 'other-game'
    | 'other-pack'
    | 'restaurant-rig'
    | 'mode-package'
    | 'shared-imports-mode'
    | 'shared-imports-family'
    | 'family-imports-mode'
    | 'imports-other-family'
    | 'imports-unclassified';
  file: string;
  message: string;
}

const inFolder = (file: string, folder: string) => file === folder || file.startsWith(folder.replace(/\/$/, '') + '/');

/** The mode whose folders hold `file`, or null for shared code. */
export function modeOf(file: string, m: BundleManifest): string | null {
  for (const [mode, folders] of Object.entries(m.modeFolders)) if (folders.some((f) => inFolder(file, f))) return mode;
  return null;
}

/** The family whose paths hold `file`, or null. */
export function familyOf(file: string, m: BundleManifest): string | null {
  for (const [family, f] of Object.entries(m.families)) if (f.paths.some((p) => inFolder(file, p))) return family;
  return null;
}

export type Level = { level: 'mode'; mode: string } | { level: 'family'; family: string } | { level: 'shared' } | { level: 'unclassified' };

/**
 * A file's level: a mode's folders (c), a family (b), shared by every game (a), or unclassified
 * (a file under `uiRoot` in none of the lists; read the strict way: it may import only shared
 * files, and nothing may import it or bundle it until it is listed). Tests are never bundled.
 */
export function levelOf(file: string, m: BundleManifest): Level {
  const mode = modeOf(file, m);
  if (mode) return { level: 'mode', mode };
  const family = familyOf(file, m);
  if (family) return { level: 'family', family };
  if (inFolder(file, m.uiRoot) && !m.sharedUi.some((p) => inFolder(file, p))) return { level: 'unclassified' };
  return { level: 'shared' };
}

/** "shared", "tabs" (a family) or "sim" (a mode): the group a report counts a file in. */
export function groupOf(file: string, m: BundleManifest): string {
  const l = levelOf(file, m);
  return l.level === 'mode' ? `mode ${l.mode}` : l.level === 'family' ? `family ${l.family}` : l.level;
}

/** What a game's bundle must not contain. */
export function bundleViolations(b: BundleContents, m: BundleManifest): Violation[] {
  const out: Violation[] = [];
  for (const file of [...b.modules, ...b.assets]) {
    const level = levelOf(file, m);
    if (level.level === 'mode' && level.mode !== b.mode) out.push({ rule: 'other-mode', file, message: `belongs to mode "${level.mode}", but ${b.game} is a "${b.mode}" game` });
    if (level.level === 'family' && !m.families[level.family].modes.includes(b.mode))
      out.push({ rule: 'other-family', file, message: `belongs to the family "${level.family}" (modes ${m.families[level.family].modes.join(', ')}), but ${b.game} is a "${b.mode}" game` });
    if (level.level === 'unclassified') out.push({ rule: 'unclassified', file, message: 'is under ' + m.uiRoot + ' but not classified: list it in scripts/lib/modes.js (SHARED_UI, a family or a mode)' });
    if (m.nodeOnly.includes(file)) out.push({ rule: 'node-only', file, message: 'is read by the Node tools only and must not be bundled (import its types only)' });
    const g = /^games\/([^/]+)\//.exec(file);
    if (g && g[1] !== b.game) out.push({ rule: 'other-game', file, message: `is data of the game "${g[1]}"` });
    if (b.mode !== 'sim' && m.rig.includes(file)) out.push({ rule: 'restaurant-rig', file, message: 'is the restaurant\'s cartoon-people rig' });
  }
  const packRoot = m.soundPacks.replace(/\/$/, '') + '/';
  for (const file of b.assets) {
    if (!file.startsWith(packRoot)) continue;
    const pack = file.slice(packRoot.length).split('/')[0];
    if (pack !== b.pack) out.push({ rule: 'other-pack', file, message: `is in the sound pack "${pack}", but ${b.game} declares ${b.pack === null ? 'no pack' : `"${b.pack}"`}` });
  }
  for (const pkg of b.packages) {
    const allowed = m.modePackages[pkg];
    if (allowed && !allowed.includes(b.mode)) out.push({ rule: 'mode-package', file: `node_modules/${pkg}`, message: `is only for mode ${allowed.map((x) => `"${x}"`).join(', ')}` });
  }
  return out;
}

/**
 * Import edges that break the layering. A mode's folders may be imported only by that mode (and
 * the generated entry); a family's files only by the family and its member modes; an unclassified
 * file by nobody. A shared or unclassified file imports shared files only.
 */
export function importViolations(edges: readonly (readonly [from: string, to: string])[], m: BundleManifest): Violation[] {
  const out: Violation[] = [];
  for (const [from, to] of edges) {
    if (from === m.generatedEntry) continue;
    const src = levelOf(from, m);
    const dst = levelOf(to, m);
    const fromName = src.level === 'mode' ? `mode "${src.mode}"` : src.level === 'family' ? `family "${src.family}"` : src.level;
    const push = (rule: Violation['rule'], why: string) => out.push({ rule, file: from, message: `(${fromName}) imports ${to} ${why}` });
    if (dst.level === 'mode') {
      if (src.level === 'mode' && src.mode === dst.mode) continue;
      push(src.level === 'family' ? 'family-imports-mode' : 'shared-imports-mode', `(mode "${dst.mode}"): a mode is reached only through ${m.generatedEntry}`);
    } else if (dst.level === 'family') {
      if (src.level === 'family' && src.family === dst.family) continue;
      if (src.level === 'mode' && m.families[dst.family].modes.includes(src.mode)) continue;
      push(src.level === 'shared' || src.level === 'unclassified' ? 'shared-imports-family' : 'imports-other-family', `(family "${dst.family}", modes ${m.families[dst.family].modes.join(', ')}): only those modes and the family may import it`);
    } else if (dst.level === 'unclassified') {
      push('imports-unclassified', `(unclassified): list it in scripts/lib/modes.js first`);
    }
  }
  return out;
}

/** The npm package of a bare import or a node_modules path ("@scope/name/x" -> "@scope/name"). */
export function packageOf(spec: string): string {
  const rest = spec.includes('node_modules/') ? spec.slice(spec.lastIndexOf('node_modules/') + 'node_modules/'.length) : spec;
  const parts = rest.split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

/** The words of a literal: split at non-letters and camelCase humps, lower case ("guestsPaid" -> guests, paid). */
export function wordsOf(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z\u00C0-\u024F]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** The theme words `text` uses (whole words, with plural, -ing, -ed and -er forms). */
export function themeWordsIn(text: string, words: readonly string[]): string[] {
  const found = new Set<string>();
  for (const w of wordsOf(text)) {
    for (const t of words) {
      const stem = t.endsWith('e') ? t.slice(0, -1) : t;
      if (w === t || w === t + 's' || w === t + 'es' || [ 'ing', 'ed', 'er', 'ers'].some((x) => w === stem + x)) found.add(t);
    }
  }
  return [...found];
}
