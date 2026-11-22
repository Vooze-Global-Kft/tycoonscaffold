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
  /** Files and folders under `classifiedRoot` that every game ships (level a). */
  shared: readonly string[];
  /** The folder whose files must be classified (src/): a file in it in none of the lists is unclassified. */
  classifiedRoot: string;
  /** Files the Node tools read and no bundle may hold. */
  nodeOnly: readonly string[];
  /** npm package -> the modes that may bundle it. */
  modePackages: Record<string, readonly string[]>;
  /** The restaurant rig's files (forbidden for every mode but sim). */
  rig: readonly string[];
  /** The one shared file allowed to import a mode entry. */
  generatedEntry: string;
  /** Development tools of the web preview that no phone bundle may hold (scripts/lib/modes.js WEB_ONLY). */
  webOnly?: readonly string[];
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
  /** Imports the check could not resolve (fast stage): each one fails, since Metro may bundle anything there. */
  unresolved?: readonly { file: string; spec: string }[];
  /** Literals in shared and family files that use another mode's theme words (fast and export stages). */
  themeWords?: readonly { file: string; text: string; words: readonly string[] }[];
  /** Literals allowed to do so: { file: [literal, ...] } (scripts/lib/themeWords.allowed.json). */
  themeWordsAllowed?: Readonly<Record<string, readonly string[]>>;
  /** Where another game's names and lines were found in the bundle (`deniedHits`), and the terms allowed to stay (bundle-allow.json). */
  denied?: readonly DeniedHit[];
  deniedAllowed?: Readonly<Record<string, string>>;
  /** Asset files in the bundle (images, sounds, fonts). */
  assets: readonly string[];
  /** npm packages with at least one module in the bundle. */
  packages: readonly string[];
  /** The platform bundled (ios, android, web). A phone platform may hold no `webOnly` file. */
  platform?: string;
  /** Where a `webOnlyStrings` text was found (computed by the caller for phone platforms). */
  webOnlyHits?: readonly { file: string; text: string }[];
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
    | 'imports-unclassified'
    | 'unresolved'
    | 'theme-word'
    | 'denied-string'
    | 'web-only';
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
 * (a file under `classifiedRoot` in none of the lists; read the strict way: it may import only shared
 * files, and nothing may import it or bundle it until it is listed). Tests are never bundled.
 */
export function levelOf(file: string, m: BundleManifest): Level {
  const mode = modeOf(file, m);
  if (mode) return { level: 'mode', mode };
  const family = familyOf(file, m);
  if (family) return { level: 'family', family };
  if (inFolder(file, m.classifiedRoot) && !m.shared.some((p) => inFolder(file, p))) return { level: 'unclassified' };
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
    if (level.level === 'unclassified') out.push({ rule: 'unclassified', file, message: 'is under ' + m.classifiedRoot + ' but not classified: list it in scripts/lib/modes.js (SHARED_UI, SHARED_SRC, a family or a mode)' });
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
  for (const u of b.unresolved ?? []) out.push({ rule: 'unresolved', file: u.file, message: `imports "${u.spec}", which the check cannot resolve (Metro might, and bundle anything): use a relative path to a project file or a package in node_modules` });
  for (const h of b.themeWords ?? []) {
    if (b.themeWordsAllowed?.[h.file]?.includes(h.text)) continue;
    out.push({ rule: 'theme-word', file: h.file, message: `has ${JSON.stringify(h.text.length > 70 ? h.text.slice(0, 67) + '...' : h.text)} with another mode's theme word(s) [${h.words.join(', ')}]: move the text into the game's data or the mode's folders (scripts/lib/modes.js THEME_WORDS_ALLOWED lists the known remainder)` });
  }
  for (const h of b.denied ?? []) {
    if (b.deniedAllowed && h.term.term in b.deniedAllowed) continue;
    out.push({ rule: 'denied-string', file: h.file, message: `${h.line ? `line ${h.line}: ` : ''}holds ${JSON.stringify(h.term.term)}, ${h.term.from} of the game "${h.term.game}" (errata 6): no game's bundle may name another game's things; move it out, or list it with a reason in scripts/bundle-allow.json if it is an engine identifier no player reads` });
  }
  if (b.platform && b.platform !== 'web') {
    for (const file of b.modules) {
      if (m.webOnly?.includes(file)) out.push({ rule: 'web-only', file, message: `is a development tool of the web preview, but this is the ${b.platform} bundle: import it only from a .web.ts file (its phone twin holds nothing)` });
    }
    for (const h of b.webOnlyHits ?? []) out.push({ rule: 'web-only', file: h.file, message: `holds ${JSON.stringify(h.text)}, a development tool's name of the web preview, in the ${b.platform} bundle (scripts/lib/modes.js WEB_ONLY_STRINGS): move it behind a .web.ts split` });
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
    // A Node-only file (validate's lint, the fx catalogues) is in no bundle (the node-only rule fails any
    // bundle that holds it), so what it imports cannot reach a game through it: it may read every mode.
    if (m.nodeOnly.includes(from)) continue;
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

// ---------------------------------------------------------------------------
// The string denylist (spec 10.4 step 3, errata 6, Decision 11)
// ---------------------------------------------------------------------------

/** One name or line of a game that no other game's bundle may hold. */
export interface DenyTerm {
  term: string;
  /** Which game it belongs to, and where in its data it was found ("a character name", ...). */
  game: string;
  from: string;
  /** Single names match case-sensitively as a whole word ("TALLY", not the identifier "tally"); phrases in any case. */
  caseSensitive: boolean;
}

export interface DeniedHit {
  file: string;
  line?: number;
  term: DenyTerm;
}

/** Where in a game's data its names and lines live, and whether a single word there is a name (kept) or a plain noun (dropped). */
const NAME_FIELDS: { path: RegExp; from: string; singleWordIsName: boolean }[] = [
  { path: /^characters\[\]\.name$/, from: 'a character or call-sign name', singleWordIsName: true },
  { path: /^meta\.cards\[\]\.(name|title)$/, from: 'a card or module name', singleWordIsName: true },
  { path: /^meta\.cards\[\]\.flavor$/, from: 'a card text', singleWordIsName: false },
  { path: /^meta\.chests\[\]\.(name|blurb)$/, from: 'a reward box name', singleWordIsName: false },
  { path: /^meta\.(deals|dailyShop\.offers)\[\]\.(title|blurb)$/, from: 'an offer name', singleWordIsName: false },
  { path: /^businesses\[\]\.(name|productName|managerName|flavor)$/, from: 'a station or product name', singleWordIsName: true },
  { path: /^(sim|economy)\.[A-Za-z]+\.(name|managerName|managerFlavor|workerName|seatName|bellName)$/, from: 'a name of the game\'s rules', singleWordIsName: false },
  { path: /^sim\.venues\[\]\.(name|blurb)$/, from: 'a venue name', singleWordIsName: true },
  { path: /^haul\.names\.(station|ai)$/, from: 'the station or AI name', singleWordIsName: true },
  { path: /^haul\.galaxies\.names\[\]$/, from: 'a galaxy name', singleWordIsName: true },
  { path: /^haul\.contracts\.buyers\[\]\.name$/, from: 'a buyer name', singleWordIsName: true },
  { path: /^haul\.(modules|conditions|rings|ores)\[\]\.name$/, from: 'a module, condition, ring or ore name', singleWordIsName: false },
  { path: /^haul\.conditions\[\]\.lines\[\]$/, from: 'a condition text', singleWordIsName: false },
  { path: /^haul\.starMap\.nodes\[\]\.name$/, from: 'a Star Map node name', singleWordIsName: false },
  { path: /^haul\.rig\.tiers\[\]\.name$/, from: 'a rig tier name', singleWordIsName: false },
  { path: /^story\[\]\.(lines\[\]|text)$/, from: 'a story line', singleWordIsName: false },
  { path: /^app\.displayName$/, from: 'the app name', singleWordIsName: true },
  { path: /^store\.(title|subtitle|shortDescription)$/, from: 'a store text', singleWordIsName: true },
];

/** Every string of a JSON value with its path ("meta.cards[].name"). */
function stringsWithPaths(value: unknown, at: string, out: [string, string][]): [string, string][] {
  if (typeof value === 'string') out.push([at, value]);
  else if (Array.isArray(value)) value.forEach((v) => stringsWithPaths(v, `${at}[]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) stringsWithPaths(v, at ? `${at}.${k}` : k, out);
  return out;
}

const normal = (s: string) => s.replace(/\s+/g, ' ').trim();

/** All strings of a game's data joined, lower case, spaces normalised: what `denylistOf` takes as `ownText`. */
export function textOfData(data: unknown): string {
  return stringsWithPaths(data, '', []).map(([, t]) => normal(t).toLowerCase()).join('\n');
}

/**
 * The denylist of one game (errata 6): its card or module names, character and call-sign names,
 * venue, galaxy and buyer names, story lines, and its store title, subtitle and description
 * sentences, with more than 4 characters. Never its store keywords, the interface labels, a single
 * lowercase word, a single plain noun outside the name fields, or anything the bundled game's own
 * data also says (`ownText`: all its strings joined, lower case; dimension 17 measures those).
 */
export function denylistOf(gameId: string, data: unknown, opts: { labels: readonly string[]; ownText: string }): DenyTerm[] {
  const d = (data ?? {}) as { store?: { keywords?: string[]; description?: string } };
  const skip = new Set([...opts.labels, ...(d.store?.keywords ?? [])].map((x) => x.toLowerCase()));
  const out = new Map<string, DenyTerm>();
  const add = (raw: string, from: string, singleWordIsName: boolean) => {
    for (const piece of raw.split(/\{[^}]*\}/)) {
      const term = normal(piece).replace(/^[\s"'“‘(]+|[\s"'”’):;,]+$/g, '');
      if (term.length <= 4 || skip.has(term.toLowerCase()) || opts.ownText.includes(term.toLowerCase())) continue;
      const single = !/\s/.test(term);
      if (single && (term === term.toLowerCase() || !singleWordIsName)) continue;
      if (!out.has(term)) out.set(term, { term, game: gameId, from, caseSensitive: single });
    }
  };
  for (const [at, text] of stringsWithPaths(data, '', [])) {
    const field = NAME_FIELDS.find((f) => f.path.test(at));
    if (field) add(text, field.from, field.singleWordIsName);
  }
  // The description sentence by sentence (a bullet line is a sentence too).
  for (const sentence of (d.store?.description ?? '').split(/(?<=[.!?])\s+|\n+/)) add(sentence.replace(/^[-•*]\s*/, ''), 'a store description sentence', false);
  return [...out.values()];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The regular expression source of one term: the whole term, not inside a longer word; any run of spaces between its words. Flags: `u`, plus `i` unless `caseSensitive`. */
export function denyPattern(t: DenyTerm): string {
  return `(?<![\\p{L}\\p{N}_])${escapeRe(t.term).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}_])`;
}

/** A matcher for the denylist: which terms a text holds (whole words; phrases in any case and spacing). */
export function denyMatcher(terms: readonly DenyTerm[]): (text: string) => DenyTerm[] {
  const compiled = terms.map((t) => ({ t, re: new RegExp(denyPattern(t), t.caseSensitive ? 'u' : 'iu') }));
  return (text: string) => compiled.filter(({ re }) => re.test(text)).map(({ t }) => t);
}
