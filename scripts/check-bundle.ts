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
 *   - a file under src/ui that modes.js does not classify, or a Node-only file (the fx catalogue);
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
 *                                           (about a minute per game; the release check)
 *   npm run check:bundle -- --export --from <dir>   read an export made earlier (dir holds one folder per game id)
 *   npm run check:bundle -- --game space-miner --as-mode haul   fast stage only: that game's data as if
 *                                           its mode were another (to check a mode before a game uses it)
 *   options: --platform ios|android|web (default ios), --top <n> (largest modules, default 12), --json,
 *            --list (every project file of each bundle with its level),
 *            --words (fast stage: the string literals of each bundle's shared and family files that use
 *            another mode's theme words, scripts/lib/modes.js THEME_WORDS; a list, it never fails)
 *
 * The fast stage reads `import`, `export ... from`, `require()` and `import()` with the platform's
 * file extensions (.ios.ts, .native.ts, .ts, ...), skips type-only imports, and uses the game's
 * generated files as scripts/lib/games.js would write them (nothing is written). It does not walk
 * into node_modules; it lists the packages imported directly. The export stage reads Metro's
 * source map, so it is exactly what ships. --export rewrites src/generated/ for each game and puts
 * back the game that was selected before.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { bundleViolations, groupOf, importViolations, levelOf, packageOf, themeWordsIn, type BundleContents, type BundleManifest, type Violation } from './lib/bundleRules';

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
  sharedUi: modes.SHARED_UI,
  uiRoot: modes.UI_ROOT,
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
  assetBytes: number;
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
function wordHits(r: Report): WordHit[] {
  const words = Object.entries(modes.THEME_WORDS as Record<string, string[]>)
    .filter(([mode]) => mode !== r.mode)
    .flatMap(([, w]) => w);
  const out: WordHit[] = [];
  for (const m of r.modules) {
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
  console.log(`\n  words of other modes' themes in ${r.game}'s shared and family files (mode ${r.mode}): ${hits.length} literal(s)`);
  for (const h of hits) console.log(`    ${h.group.padEnd(12)} ${`${h.file}:${h.line}`.padEnd(44)} [${h.words.join(', ')}] ${JSON.stringify(h.text.length > 90 ? h.text.slice(0, 87) + '...' : h.text)}`);
}

interface Graph {
  files: Set<string>;
  assets: Set<string>;
  packages: Set<string>;
  edges: [string, string][];
}

/** Walks from `entries`; `virtual` holds generated files by absolute path (text instead of disk). */
function walk(entries: string[], platform: string, virtual: Map<string, string>): Graph {
  const exts = platformExts(platform);
  const g: Graph = { files: new Set(), assets: new Set(), packages: new Set(), edges: [] };
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (g.files.has(file)) continue;
    g.files.add(file);
    if (file.endsWith('.json')) continue;
    const text = virtual.get(file) ?? fs.readFileSync(file, 'utf8');
    for (const spec of runtimeImports(file, text)) {
      if (!spec.startsWith('.') && !spec.startsWith('/')) {
        g.packages.add(packageOf(spec));
        continue;
      }
      const target = resolveFile(path.dirname(file), spec, exts, virtual);
      if (!target) {
        console.warn(`  (cannot resolve ${spec} from ${rel(file)})`);
        continue;
      }
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

function fastReport(id: string): Report {
  const game = gameData(id);
  const virtual = virtualFor(id);
  const g = walk([appEntry()], PLATFORM, virtual);
  const modules = [...g.files].map((f) => ({ path: rel(f), bytes: virtual.get(f)?.length ?? fileSize(f) }));
  const assets = [...g.assets].map(rel);
  return finish({ game: id, mode: games.gameMode(id, game), pack: games.soundPack(id, game), stage: 'fast', modules, assets, packages: [...g.packages].sort() });
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
          if (!spec.startsWith('.')) continue;
          const target = resolveFile(path.dirname(abs), spec, exts, new Map());
          if (target) edges.push([rel(abs), rel(target)]);
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

function runExport(id: string, out: string) {
  fs.rmSync(out, { recursive: true, force: true });
  console.log(`  expo export --platform ${PLATFORM} for ${id} (about a minute) ...`);
  execFileSync('npx', ['expo', 'export', '--platform', PLATFORM, '--source-maps', '--dump-assetmap', '--no-bytecode', '--output-dir', out], {
    cwd: ROOT,
    env: { ...process.env, GAME: id, CI: '1' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

/** A source map path as Metro writes it ("/../<package name>/src/x.ts", or absolute) -> repo-relative. */
function normaliseSource(src: string, pkgName: string): string {
  if (src.startsWith(ROOT + '/')) return rel(src);
  const prefix = `/../${pkgName}/`;
  if (src.startsWith(prefix)) return src.slice(prefix.length);
  return src.replace(/^\/+/, '');
}

function exportReport(id: string, dir: string): Report {
  const game = games.readGameJson(id);
  const pkgName = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name;
  const jsDir = path.join(dir, '_expo', 'static', 'js', PLATFORM);
  const bundleFile = fs.readdirSync(jsDir).find((f) => /\.(js|hbc)$/.test(f));
  if (!bundleFile) throw new Error(`no bundle in ${jsDir}`);
  const bundle = fs.readFileSync(path.join(jsDir, bundleFile), 'utf8');
  const map = JSON.parse(fs.readFileSync(path.join(jsDir, bundleFile + '.map'), 'utf8'));
  // Byte offset of each line start, to turn section offsets into module sizes.
  const lineStart = [0];
  for (let i = 0; i < bundle.length; i++) if (bundle.charCodeAt(i) === 10) lineStart.push(i + 1);
  const at = (o: { line: number; column: number }) => (lineStart[o.line] ?? bundle.length) + o.column;
  const sections: { offset: { line: number; column: number }; map: { sources: string[] } }[] = map.sections ?? [{ offset: { line: 0, column: 0 }, map }];
  const sizes = new Map<string, number>();
  sections.forEach((s, i) => {
    const start = at(s.offset);
    const end = i + 1 < sections.length ? at(sections[i + 1].offset) : bundle.length;
    const src = s.map.sources?.[0];
    if (!src) return;
    const p = normaliseSource(src, pkgName);
    sizes.set(p, (sizes.get(p) ?? 0) + Math.max(0, end - start));
  });
  const modules = [...sizes].map(([p, bytes]) => ({ path: p, bytes }));
  const assetMap = JSON.parse(fs.readFileSync(path.join(dir, 'assetmap.json'), 'utf8')) as Record<string, { files: string[] }>;
  const assets = [...new Set(Object.values(assetMap).flatMap((a) => a.files.map((f) => (f.startsWith(ROOT) ? rel(f) : f))))].sort();
  const packages = [...new Set(modules.filter((m) => m.path.includes('node_modules/')).map((m) => packageOf(m.path)))].sort();
  return finish({ game: id, mode: games.gameMode(id, game), pack: games.soundPack(id, game), stage: 'export', modules, assets, packages, bytes: bundle.length });
}

// ---------------------------------------------------------------------------

function finish(r: Omit<Report, 'violations' | 'bytes' | 'ownBytes' | 'assetBytes'> & { bytes?: number }): Report {
  const own = r.modules.filter((m) => !m.path.includes('node_modules/'));
  const contents: BundleContents = { game: r.game, mode: r.mode, pack: r.pack, modules: own.map((m) => m.path), assets: r.assets, packages: r.packages };
  return {
    ...r,
    bytes: r.bytes ?? r.modules.reduce((n, m) => n + m.bytes, 0),
    ownBytes: own.reduce((n, m) => n + m.bytes, 0),
    assetBytes: r.assets.reduce((n, a) => n + fileSize(path.join(ROOT, a)), 0),
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
    const tmp = from ?? fs.mkdtempSync(path.join(os.tmpdir(), 'check-bundle-'));
    try {
      for (const id of ids) {
        const dir = path.join(tmp, id);
        if (!from) runExport(id, dir);
        reports.push(exportReport(id, dir));
      }
    } finally {
      // The export selected each game in turn: put back the one that was selected.
      if (!from && before) games.writeActiveGame(before);
      if (!from) fs.rmSync(tmp, { recursive: true, force: true });
    }
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
