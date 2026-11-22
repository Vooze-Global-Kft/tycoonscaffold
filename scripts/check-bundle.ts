/**
 * The bundle check: what goes into each game's app, and nothing that belongs to another.
 *
 * Both games ship from one developer account, and both stores compare a developer's apps,
 * binaries included (docs/design/research/spam.md). So a game's bundle must hold none of the other
 * game's assets, strings or scene code. This script determines, per game, which source files,
 * packages and assets go into its app and fails when one of them belongs elsewhere:
 *   - another mode's folders (scripts/lib/modes.js), or a package only another mode may use (three.js);
 *   - a family's files (scripts/lib/modes.js FAMILIES: "tabs" is the sim and classic modes' tab
 *     shell, list homes, meta screens and drawn kit) in a game whose mode is not a member;
 *   - a file in src/ that modes.js does not classify, or a Node-only file (the fx catalogue);
 *   - an import the fast stage cannot resolve (it fails closed: Metro might bundle anything there);
 *   - a string literal in a shared or family file that uses another mode's theme words
 *     (scripts/lib/modes.js THEME_WORDS), unless it is in the known remainder (THEME_WORDS_ALLOWED);
 *   - another game's names and lines anywhere in the bundle (the string denylist, errata 6: its card,
 *     module, character, venue, galaxy and buyer names, story lines, store title, subtitle and
 *     description sentences; never keywords or plain words), unless scripts/bundle-allow.json lists
 *     the term with a reason. The fast stage reads every bundled file's literals, the export stage
 *     the shipped JavaScript itself;
 *   - another game's data folder (games/<other>/);
 *   - a sound file from a pack the game does not declare (shared/sfx/<pack>/, game.json soundPack);
 *   - for a game whose mode is not sim, the restaurant's cartoon-people rig.
 * It also fails on an import edge that breaks the three levels (a shared file importing a family
 * or a mode, a family file importing a mode, a mode importing a family it is not in; only the
 * generated entry src/generated/mode.ts imports a mode), and prints the largest modules so dead
 * weight is visible. Files are counted and reported in three groups: shared, family, mode.
 *
 *   npm run check:bundle                    fast: every game, through the TypeScript import graph (seconds)
 *   npm run check:bundle -- --game <id>     one game
 *   npm run check:bundle -- --export        the real thing: `expo export` per game with source maps
 *                                           (about a minute per game; the release check). Each export
 *                                           runs in a temporary copy of the project, so this checkout's
 *                                           selected game never changes; it writes
 *                                           games/<id>/store/bundle-report.json (fingerprint dimension 8)
 *   npm run check:bundle -- --export --from <dir>   read an export made earlier (dir holds one folder per game id)
 *   npm run check:bundle -- --game space-miner --as-mode haul   fast stage only: that game's data as if
 *                                           its mode were another (to check a mode before a game uses it)
 *   options: --platform ios|android|web (default ios), --top <n> (largest modules, default 12), --json,
 *            --list (every project file of each bundle with its level),
 *            --words (every string literal of each bundle's shared and family files that uses another
 *            mode's theme words, allowed or not; the new ones also fail the check)
 *
 * The fast stage reads `import`, `export ... from`, `require()` and `import()` with the platform's
 * file extensions (.ios.ts, .native.ts, .ts, ...), skips type-only imports, and uses the game's
 * generated files as scripts/lib/games.js would write them (nothing is written). A bare import
 * ("x/y") is first matched against tsconfig.json `paths` and `baseUrl`, as Metro does: one that
 * lands on a project file is walked like a relative one. It does not walk into node_modules; it
 * lists the packages imported directly, and an import that is neither a project file nor an
 * installed package fails. The export stage reads Metro's source map, so it is exactly what ships,
 * and judges it by the mode that was bundled (src/generated/mode.ts in the map). --export copies the
 * project (node_modules linked) to a temporary folder per game and exports there, so a dev server
 * running from this checkout keeps its game; --from <dir> reads earlier exports and writes no report.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { bundleViolations, denylistOf, denyMatcher, denyPattern, groupOf, importViolations, levelOf, packageOf, textOfData, themeWordsIn, type BundleContents, type BundleManifest, type DeniedHit, type DenyTerm, type Violation } from './lib/bundleRules';
import { INTERFACE_LABELS, sourceHashOf, type BundleReportFile } from './lib/fingerprint';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('./lib/games.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const modes = require('./lib/modes.js');

const ROOT: string = games.ROOT;
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const PLATFORM = option('--platform') ?? 'ios';
const TOP = Number(option('--top') ?? 12);

const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join('/');

export const MANIFEST: BundleManifest = {
  modeFolders: modes.MODE_FOLDERS,
  families: modes.FAMILIES,
  shared: [...modes.SHARED_UI, ...modes.SHARED_SRC],
  classifiedRoot: modes.CLASSIFIED_ROOT,
  nodeOnly: modes.NODE_ONLY,
  modePackages: modes.MODE_PACKAGES,
  rig: modes.RESTAURANT_RIG,
  generatedEntry: modes.GENERATED_ENTRY,
  soundPacks: modes.SOUND_PACKS,
  games: games.listGames(),
};

interface Module {
  path: string;
  bytes: number;
}

// ---------------------------------------------------------------------------
// the string denylist (errata 6)
// ---------------------------------------------------------------------------

/** scripts/bundle-allow.json: { "<game id>": { "<term>": "why it may stay in that game's bundle" } }. */
const BUNDLE_ALLOW: Record<string, Record<string, string>> = JSON.parse(fs.readFileSync(path.join(__dirname, 'bundle-allow.json'), 'utf8'));
const allowedFor = (id: string): Record<string, string> => Object.fromEntries(Object.entries(BUNDLE_ALLOW[id] ?? {}).filter(([k]) => !k.startsWith('_')));

/** Every other game's names and lines that `id`'s bundle may not hold. */
export function deniedTermsFor(id: string): DenyTerm[] {
  const ownText = textOfData(games.readGameJson(id));
  return (games.listGames() as string[]).filter((o) => o !== id).flatMap((o) => denylistOf(o, games.readGameJson(o), { labels: INTERFACE_LABELS, ownText }));
}

/** Fast stage: the literals of every bundled source file (JSON files by their text). */
function deniedInFiles(modules: readonly Module[], terms: readonly DenyTerm[], virtual: Map<string, string>): DeniedHit[] {
  const match = denyMatcher(terms);
  const out: DeniedHit[] = [];
  for (const m of modules) {
    if (m.path.includes('node_modules/') || ASSET_EXT.test(m.path)) continue;
    const abs = path.join(ROOT, m.path);
    const text = virtual.get(abs) ?? (fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '');
    const lits = m.path.endsWith('.json') ? [{ line: 0, text }] : stringLiterals(m.path, text);
    for (const lit of lits) for (const term of match(lit.text)) out.push({ file: m.path, line: lit.line || undefined, term });
  }
  return out;
}

interface Report {
  game: string;
  mode: string;
  pack: string;
  stage: 'fast' | 'export';
  modules: Module[];
  assets: string[];
  packages: string[];
  /** Total bytes: source bytes in the fast stage, bundle bytes in the export stage. */
  bytes: number;
  /** Bytes of the project's own modules (node_modules excluded). */
  ownBytes: number;
  /** Imports the fast stage could not resolve. */
  unresolved?: { file: string; spec: string }[];
  assetBytes: number;
  /** Another game's names and lines found in the bundle (before bundle-allow.json). */
  denied?: DeniedHit[];
  violations: Violation[];
}

// ---------------------------------------------------------------------------
// fast stage: the TypeScript import graph
// ---------------------------------------------------------------------------

const ASSET_EXT = /\.(png|jpe?g|gif|webp|wav|m4a|mp3|ttf|otf|mp4)$/i;

function platformExts(platform: string): string[] {
  const own = platform === 'web' ? ['.web'] : [`.${platform}`, '.native'];
  const out: string[] = [];
  for (const p of [...own, '']) for (const e of ['.tsx', '.ts', '.jsx', '.js']) out.push(p + e);
  return [...out, '.json'];
}

function resolveFile(fromDir: string, spec: string, exts: string[], virtual: Map<string, string>): string | null {
  const base = path.resolve(fromDir, spec);
  const exists = (f: string) => virtual.has(f) || (fs.existsSync(f) && fs.statSync(f).isFile());
  if (path.extname(base) && exists(base) && (ASSET_EXT.test(base) || base.endsWith('.json'))) return base;
  for (const e of exts) if (exists(base + e)) return base + e;
  for (const e of exts) if (exists(path.join(base, 'index' + e))) return path.join(base, 'index' + e);
  if (exists(base)) return base;
  return null;
}

/** tsconfig.json `paths` and `baseUrl`: Metro resolves bare imports through them (Expo's tsconfigPaths). */
export interface Aliases {
  /** Folder `paths` targets are relative to. */
  pathsBase: string;
  paths: [pattern: string, targets: string[]][];
  /** `baseUrl`, when set: a bare import may name a file under it. */
  baseUrl?: string;
}

export function readAliases(root: string): Aliases {
  const file = path.join(root, 'tsconfig.json');
  if (!fs.existsSync(file)) return { pathsBase: root, paths: [] };
  const read = ts.readConfigFile(file, ts.sys.readFile);
  if (read.error) throw new Error(`tsconfig.json: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root);
  const o = parsed.options as ts.CompilerOptions & { pathsBasePath?: string };
  return { pathsBase: o.baseUrl ?? o.pathsBasePath ?? root, paths: Object.entries(o.paths ?? {}), baseUrl: o.baseUrl };
}

/** A bare import resolved through the aliases to a file, or null when no alias matches a file. */
export function resolveAlias(spec: string, aliases: Aliases, exts: string[], virtual: Map<string, string> = new Map()): string | null {
  for (const [pattern, targets] of aliases.paths) {
    const star = pattern.indexOf('*');
    let middle: string | null = null;
    if (star < 0) middle = spec === pattern ? '' : null;
    else {
      const pre = pattern.slice(0, star);
      const post = pattern.slice(star + 1);
      if (spec.length >= pre.length + post.length && spec.startsWith(pre) && spec.endsWith(post)) middle = spec.slice(pre.length, spec.length - post.length);
    }
    if (middle === null) continue;
    for (const t of targets) {
      const hit = resolveFile(aliases.pathsBase, t.replace('*', middle), exts, virtual);
      if (hit) return hit;
    }
  }
  if (aliases.baseUrl) {
    const hit = resolveFile(aliases.baseUrl, spec, exts, virtual);
    if (hit && !hit.split(path.sep).includes('node_modules')) return hit;
  }
  return null;
}

/** Whether the package of a bare import is installed (node_modules/<name>, from `fromDir` up). */
function packageInstalled(spec: string, fromDir: string): boolean {
  if (spec.startsWith('node:')) return false;
  const name = packageOf(spec);
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'node_modules', name))) return true;
    if (path.dirname(dir) === dir) return false;
  }
}

/** Where an import leads: a project file, a package, or nowhere the check can follow. */
export function resolveImport(
  fromFile: string,
  spec: string,
  exts: string[],
  virtual: Map<string, string>,
  aliases: Aliases,
): { file: string } | { package: string } | { unresolved: true } {
  if (spec.startsWith('.') || spec.startsWith('/')) {
    const f = resolveFile(path.dirname(fromFile), spec, exts, virtual);
    return f ? { file: f } : { unresolved: true };
  }
  const f = resolveAlias(spec, aliases, exts, virtual);
  if (f && !f.split(path.sep).includes('node_modules')) return { file: f };
  if (f || packageInstalled(spec, path.dirname(fromFile))) return { package: packageOf(spec) };
  return { unresolved: true };
}

/** The module specifiers a file really imports at run time (type-only imports left out). */
export function runtimeImports(fileName: string, text: string): string[] {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const c = node.importClause;
      const typeOnly =
        c &&
        (c.isTypeOnly ||
          (!c.name && c.namedBindings && ts.isNamedImports(c.namedBindings) && c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly)));
      if (!typeOnly) out.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly || (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 && node.exportClause.elements.every((e) => e.isTypeOnly));
      if (!typeOnly) out.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if ((ts.isIdentifier(callee) && callee.text === 'require') || callee.kind === ts.SyntaxKind.ImportKeyword) out.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** The string literals and JSX texts of a file, with their line numbers (what survives minifying). */
export function stringLiterals(fileName: string, text: string): { line: number; text: string }[] {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: { line: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    // Module specifiers name files and types are erased: neither is in the binary.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return;
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
      const t = node.text.trim();
      if (t) out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: t });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

interface WordHit {
  file: string;
  group: string;
  line: number;
  text: string;
  words: string[];
}

/** Literals in a bundle's shared and family files that use the theme words of the other modes. */
export function wordHits(r: { mode: string; modules: readonly Module[] }): WordHit[] {
  const words = Object.entries(modes.THEME_WORDS as Record<string, string[]>)
    .filter(([mode]) => mode !== r.mode)
    .flatMap(([, w]) => w);
  const out: WordHit[] = [];
  for (const m of r.modules) {
    if (m.path.includes('node_modules/') || !fs.existsSync(path.join(ROOT, m.path))) continue;
    const level = levelOf(m.path, MANIFEST);
    if (level.level === 'mode' || !/^src\/.*\.(tsx?|jsx?)$/.test(m.path) || m.path.startsWith('src/generated/')) continue;
    for (const lit of stringLiterals(m.path, fs.readFileSync(path.join(ROOT, m.path), 'utf8'))) {
      if (/^\.{0,2}\//.test(lit.text)) continue;
      const found = themeWordsIn(lit.text, words);
      if (found.length) out.push({ file: m.path, group: groupOf(m.path, MANIFEST), line: lit.line, text: lit.text, words: found });
    }
  }
  return out;
}

function printWords(r: Report) {
  const hits = wordHits(r);
  const allowed = (h: WordHit) => (modes.THEME_WORDS_ALLOWED as Record<string, string[]>)[h.file]?.includes(h.text);
  console.log(`\n  words of other modes' themes in ${r.game}'s shared and family files (mode ${r.mode}): ${hits.length} literal(s), ${hits.filter((h) => !allowed(h)).length} not in the known remainder (✘)`);
  for (const h of hits) console.log(`    ${allowed(h) ? ' ' : '✘'} ${h.group.padEnd(12)} ${`${h.file}:${h.line}`.padEnd(44)} [${h.words.join(', ')}] ${JSON.stringify(h.text.length > 90 ? h.text.slice(0, 87) + '...' : h.text)}`);
}

interface Graph {
  files: Set<string>;
  assets: Set<string>;
  packages: Set<string>;
  edges: [string, string][];
  unresolved: { file: string; spec: string }[];
}

const ALIASES = readAliases(ROOT);

/** Walks from `entries`; `virtual` holds generated files by absolute path (text instead of disk). */
function walk(entries: string[], platform: string, virtual: Map<string, string>): Graph {
  const exts = platformExts(platform);
  const g: Graph = { files: new Set(), assets: new Set(), packages: new Set(), edges: [], unresolved: [] };
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (g.files.has(file)) continue;
    g.files.add(file);
    if (file.endsWith('.json')) continue;
    const text = virtual.get(file) ?? fs.readFileSync(file, 'utf8');
    for (const spec of runtimeImports(file, text)) {
      const r = resolveImport(file, spec, exts, virtual, ALIASES);
      if ('package' in r) {
        g.packages.add(r.package);
        continue;
      }
      if ('unresolved' in r) {
        g.unresolved.push({ file: rel(file), spec });
        continue;
      }
      const target = r.file;
      g.edges.push([rel(file), rel(target)]);
      if (ASSET_EXT.test(target)) g.assets.add(target);
      else queue.push(target);
    }
  }
  return g;
}

/** The game's data, with the mode replaced when --as-mode asks for it. */
function gameData(id: string) {
  const game = games.readGameJson(id);
  const asMode = option('--as-mode');
  return asMode ? { ...game, mode: asMode } : game;
}

/** The generated files for `id`, as games.js would write them (nothing is written). */
function virtualFor(id: string): Map<string, string> {
  const game = gameData(id);
  return new Map([
    [path.join(ROOT, 'src', 'generated', 'activeGame.ts'), games.renderActiveGame(id, game)],
    [path.join(ROOT, 'src', 'generated', 'mode.ts'), games.renderModeEntry(id, game)],
  ]);
}

function appEntry(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return path.join(ROOT, pkg.main ?? 'index.ts');
}

function fileSize(abs: string): number {
  try {
    return fs.statSync(abs).size;
  } catch {
    return 0;
  }
}

export function fastReport(id: string): Report {
  const game = gameData(id);
  const virtual = virtualFor(id);
  const g = walk([appEntry()], PLATFORM, virtual);
  const modules = [...g.files].map((f) => ({ path: rel(f), bytes: virtual.get(f)?.length ?? fileSize(f) }));
  const assets = [...g.assets].map(rel);
  const denied = deniedInFiles(modules, deniedTermsFor(id), virtual);
  return finish({ game: id, mode: games.gameMode(id, game), pack: games.soundPack(id, game), stage: 'fast', modules, assets, packages: [...g.packages].sort(), unresolved: g.unresolved, denied });
}

/** Every import edge in src/ (all files, reachable or not, generated ones as written now). */
function allSourceEdges(): [string, string][] {
  const exts = platformExts(PLATFORM);
  const edges: [string, string][] = [];
  const visit = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) visit(abs);
      else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
        for (const spec of runtimeImports(abs, fs.readFileSync(abs, 'utf8'))) {
          const r = resolveImport(abs, spec, exts, new Map(), ALIASES);
          if ('file' in r) edges.push([rel(abs), rel(r.file)]);
        }
      }
    }
  };
  visit(path.join(ROOT, 'src'));
  return edges;
}

// ---------------------------------------------------------------------------
// export stage: what Metro really bundled
// ---------------------------------------------------------------------------

function selectedGame(): string | null {
  const f = path.join(ROOT, 'src', 'generated', 'activeGame.ts');
  const m = fs.existsSync(f) ? /ACTIVE_GAME_ID = "([^"]+)"/.exec(fs.readFileSync(f, 'utf8')) : null;
  return m ? m[1] : null;
}

/** Top-level entries of the project an export does not need (or that are rebuilt): never copied. */
const COPY_SKIP = new Set(['node_modules', '.git', '.expo', 'dist', 'ios', 'android', 'web-build']);

/**
 * A private copy of the project for one export: every file but COPY_SKIP, with node_modules linked to
 * this checkout's (real) one. app.config.ts writes src/generated/ for GAME there, not here, so a dev
 * server running from this checkout keeps the game it shows (only GAME=space-miner may be selected in a
 * shared checkout while a preview runs from it).
 */
function projectCopy(id: string): string {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), `check-bundle-${id}-`));
  for (const e of fs.readdirSync(ROOT)) {
    if (COPY_SKIP.has(e)) continue;
    fs.cpSync(path.join(ROOT, e), path.join(copy, e), { recursive: true, dereference: false, verbatimSymlinks: true });
  }
  fs.symlinkSync(fs.realpathSync(path.join(ROOT, 'node_modules')), path.join(copy, 'node_modules'), 'dir');
  return copy;
}

function runExport(id: string, root: string, out: string) {
  fs.rmSync(out, { recursive: true, force: true });
  console.log(`  expo export --platform ${PLATFORM} for ${id} in a copy of the project (about a minute) ...`);
  execFileSync('npx', ['expo', 'export', '--platform', PLATFORM, '--source-maps', '--dump-assetmap', '--no-bytecode', '--output-dir', out], {
    cwd: root,
    env: { ...process.env, GAME: id, CI: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

/** A source map path as Metro writes it (absolute, or "/../<folder>/x" relative to the server root) -> repo-relative. */
function normaliseSource(src: string, root: string): string {
  const nm = src.lastIndexOf('/node_modules/');
  if (nm >= 0) return src.slice(nm + 1);
  for (const r of [root, ROOT]) if (src.startsWith(r + '/')) return path.relative(r, src).split(path.sep).join('/');
  const up = /^\/\.\.\/[^/]+\/(.*)$/.exec(src);
  if (up) return up[1];
  return src.replace(/^\/+/, '');
}

/** The files an export was made from, for bundle-report.json: its project modules and assets (generated files by their inputs), the lockfile. */
function reportSources(r: Report): string[] {
  const own = r.modules.map((m) => m.path).filter((p) => !p.includes('node_modules/') && !p.startsWith('src/generated/'));
  const inputs = ['package-lock.json', 'app.config.ts', 'scripts/lib/games.js', 'scripts/lib/fxCatalog.js', 'src/services/fx/catalog.ts', 'src/services/fx/catalog.haul.ts', `games/${r.game}/game.json`];
  return [...new Set([...own, ...r.assets, ...inputs])].filter((f) => fs.existsSync(path.join(ROOT, f))).sort();
}

/** Writes games/<id>/store/bundle-report.json from an export (fingerprint dimension 8, spec 10.4 step 4). */
function writeBundleReport(r: Report) {
  const sources = reportSources(r);
  const report: BundleReportFile = {
    game: r.game,
    date: new Date().toISOString(),
    platform: PLATFORM,
    stage: 'export',
    result: r.violations.length ? 'fail' : 'pass',
    sourceHash: sourceHashOf(ROOT, sources),
    sources,
    violations: r.violations.map(({ rule, file, message }) => ({ rule, file, message })),
    modules: r.modules.length,
    assets: r.assets.length,
    bytes: r.bytes,
  };
  const file = path.join(games.gameDir(r.game), 'store', 'bundle-report.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 1) + '\n');
  console.log(`  wrote ${rel(file)} (${report.result})`);
}

/** Export stage: the denylist over the shipped JavaScript itself, each hit traced to its module through the map's sections. */
function deniedInBundle(bundle: string, sectionStarts: { start: number; path: string }[], terms: readonly DenyTerm[]): DeniedHit[] {
  const out: DeniedHit[] = [];
  const seen = new Set<string>();
  const moduleAt = (i: number) => {
    let lo = 0;
    let hi = sectionStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (sectionStarts[mid].start <= i) lo = mid;
      else hi = mid - 1;
    }
    return sectionStarts[lo]?.path ?? 'bundle';
  };
  for (const term of terms) {
    const re = new RegExp(denyPattern(term), term.caseSensitive ? 'gu' : 'giu');
    for (const m of bundle.matchAll(re)) {
      const file = moduleAt(m.index ?? 0);
      if (seen.has(file + '\0' + term.term)) continue;
      seen.add(file + '\0' + term.term);
      out.push({ file, term });
    }
  }
  return out;
}

function exportReport(id: string, dir: string, root: string): Report {
  const game = games.readGameJson(id);
  const jsDir = path.join(dir, '_expo', 'static', 'js', PLATFORM);
  const bundleFile = fs.readdirSync(jsDir).find((f) => /\.(js|hbc)$/.test(f));
  if (!bundleFile) throw new Error(`no bundle in ${jsDir}`);
  const bundle = fs.readFileSync(path.join(jsDir, bundleFile), 'utf8');
  const map = JSON.parse(fs.readFileSync(path.join(jsDir, bundleFile + '.map'), 'utf8'));
  // Byte offset of each line start, to turn section offsets into module sizes.
  const lineStart = [0];
  for (let i = 0; i < bundle.length; i++) if (bundle.charCodeAt(i) === 10) lineStart.push(i + 1);
  const at = (o: { line: number; column: number }) => (lineStart[o.line] ?? bundle.length) + o.column;
  const sections: { offset: { line: number; column: number }; map: { sources: string[]; sourcesContent?: (string | null)[] } }[] = map.sections ?? [{ offset: { line: 0, column: 0 }, map }];
  const sizes = new Map<string, number>();
  const starts: { start: number; path: string }[] = [];
  // The mode that was bundled, from the generated entry in the map (not today's game.json).
  let bundledMode: string | null = null;
  sections.forEach((s, i) => {
    const start = at(s.offset);
    const end = i + 1 < sections.length ? at(sections[i + 1].offset) : bundle.length;
    const src = s.map.sources?.[0];
    if (!src) return;
    const p = normaliseSource(src, root);
    starts.push({ start, path: p });
    if (p === modes.GENERATED_ENTRY) bundledMode = /export const MODE = "([^"]+)"/.exec(s.map.sourcesContent?.[0] ?? '')?.[1] ?? null;
    sizes.set(p, (sizes.get(p) ?? 0) + Math.max(0, end - start));
  });
  starts.sort((a, b) => a.start - b.start);
  const modules = [...sizes].map(([p, bytes]) => ({ path: p, bytes }));
  const assetMap = JSON.parse(fs.readFileSync(path.join(dir, 'assetmap.json'), 'utf8')) as Record<string, { files: string[] }>;
  const relTo = (f: string) => {
    for (const r of [root, ROOT]) if (f.startsWith(r + '/')) return path.relative(r, f).split(path.sep).join('/');
    return f;
  };
  const assets = [...new Set(Object.values(assetMap).flatMap((a) => a.files.map(relTo)))].sort();
  const packages = [...new Set(modules.filter((m) => m.path.includes('node_modules/')).map((m) => packageOf(m.path)))].sort();
  const declared = games.gameMode(id, game);
  if (!bundledMode) throw new Error(`${dir}: the source map has no ${modes.GENERATED_ENTRY} with its MODE, so the bundled mode is unknown`);
  if (bundledMode !== declared) throw new Error(`${dir}: this export was built as mode "${bundledMode}", but games/${id}/game.json says "${declared}" (stale export?): export again`);
  const denied = deniedInBundle(bundle, starts, deniedTermsFor(id));
  return finish({ game: id, mode: bundledMode, pack: games.soundPack(id, game), stage: 'export', modules, assets, packages, bytes: bundle.length, denied, root });
}

// ---------------------------------------------------------------------------

function finish(input: Omit<Report, 'violations' | 'bytes' | 'ownBytes' | 'assetBytes'> & { bytes?: number; root?: string }): Report {
  const { root, ...r } = input;
  const own = r.modules.filter((m) => !m.path.includes('node_modules/'));
  const contents: BundleContents = {
    game: r.game,
    mode: r.mode,
    pack: r.pack,
    modules: own.map((m) => m.path),
    assets: r.assets,
    packages: r.packages,
    unresolved: r.unresolved,
    themeWords: wordHits(r),
    themeWordsAllowed: modes.THEME_WORDS_ALLOWED,
    denied: r.denied,
    deniedAllowed: allowedFor(r.game),
  };
  return {
    ...r,
    bytes: r.bytes ?? r.modules.reduce((n, m) => n + m.bytes, 0),
    ownBytes: own.reduce((n, m) => n + m.bytes, 0),
    assetBytes: r.assets.reduce((n, a) => n + fileSize(path.join(root ?? ROOT, a)), 0),
    violations: bundleViolations(contents, MANIFEST),
  };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
/** Report order of the groups: shared, then families, then modes. */
const rank = (group: string) => (group === 'shared' ? 0 : group.startsWith('family') ? 1 : group.startsWith('mode') ? 2 : 3);

function print(r: Report) {
  const own = r.modules.filter((m) => !m.path.includes('node_modules/'));
  const byMode = new Map<string, number>();
  for (const m of own) byMode.set(groupOf(m.path, MANIFEST), (byMode.get(groupOf(m.path, MANIFEST)) ?? 0) + 1);
  console.log(`\n${r.violations.length ? '✘' : '✔'} ${r.game}  [mode ${r.mode}, sound pack ${r.pack}]  (${r.stage})`);
  console.log(
    `  modules: ${r.modules.length} (${own.length} project files: ${[...byMode].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([k, v]) => `${k} ${v}`).join(', ')}), ${r.packages.length} packages; ` +
      `${r.stage === 'export' ? 'bundle' : 'source'} ${kb(r.bytes)} (project ${kb(r.ownBytes)}); assets: ${r.assets.length}, ${kb(r.assetBytes)}`,
  );
  const top = [...(r.stage === 'export' ? r.modules : own)].sort((a, b) => b.bytes - a.bytes).slice(0, TOP);
  console.log(`  largest ${r.stage === 'export' ? 'modules' : 'project files'}:`);
  for (const m of top) console.log(`    ${kb(m.bytes).padStart(10)}  ${m.path}`);
  for (const v of r.violations) console.log(`  ✘ [${v.rule}] ${v.file} ${v.message}`);
  if (flag('--list')) {
    console.log('  project files by level:');
    for (const m of [...own].sort((a, b) => groupOf(a.path, MANIFEST).localeCompare(groupOf(b.path, MANIFEST)) || a.path.localeCompare(b.path)))
      console.log(`    ${groupOf(m.path, MANIFEST).padEnd(14)} ${m.path}`);
  }
}

function main() {
  const ids: string[] = option('--game') ? [option('--game')!] : games.listGames();
  for (const id of ids) if (!games.listGames().includes(id)) throw new Error(`unknown game "${id}" (known: ${games.listGames().join(', ')})`);
  const reports: Report[] = [];
  if (flag('--export') && option('--as-mode')) throw new Error('--as-mode works with the fast stage only');
  if (flag('--export')) {
    const from = option('--from');
    const before = selectedGame();
    for (const id of ids) {
      if (from) {
        reports.push(exportReport(id, path.join(from, id), ROOT));
        continue;
      }
      // One private copy per game: this checkout's generated files are never touched.
      const copy = projectCopy(id);
      try {
        const out = path.join(copy, '.bundle-export');
        runExport(id, copy, out);
        const r = exportReport(id, out, copy);
        reports.push(r);
        writeBundleReport(r);
      } finally {
        fs.rmSync(copy, { recursive: true, force: true });
      }
    }
    if (before && selectedGame() !== before) throw new Error(`the selected game changed during the export (${before} -> ${selectedGame()}): run GAME=${before} node scripts/select-game.js`);
  } else {
    for (const id of ids) reports.push(fastReport(id));
  }
  const layering = importViolations(allSourceEdges(), MANIFEST);
  if (flag('--json')) {
    console.log(JSON.stringify({ reports: reports.map(({ modules, ...r }) => ({ ...r, modules: modules.length, top: [...modules].sort((a, b) => b.bytes - a.bytes).slice(0, TOP) })), layering }, null, 1));
  } else {
    reports.forEach(print);
    if (flag('--words')) reports.forEach(printWords);
    console.log(`\n${layering.length ? '✘' : '✔'} layering: ${layering.length ? `${layering.length} import(s) break the three levels` : 'shared files import only shared files; family files only their family and shared files; modes only themselves, their families and shared files'}`);
    for (const v of layering) console.log(`  ✘ [${v.rule}] ${v.file} ${v.message}`);
  }
  const failed = reports.some((r) => r.violations.length > 0) || layering.length > 0;
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();
