// Shared by app.config.ts and the CLI scripts. Plain CommonJS so the Expo
// config loader can require it without a TypeScript step.
const fs = require('fs');
const path = require('path');
const { readFontMetrics, moneyCharacters } = require('./fontMetrics.js');
const { fxTableFor } = require('./fxCatalog.js');

const ROOT = path.resolve(__dirname, '..', '..');
const GAMES_DIR = path.join(ROOT, 'games');
const GENERATED = path.join(ROOT, 'src', 'generated', 'activeGame.ts');
/** The generated mode entry: imports only the active game's mode (src/modes/<mode>). */
const GENERATED_MODE = path.join(ROOT, 'src', 'generated', 'mode.ts');
/**
 * Sound packs, one folder each: shared/sfx/<pack>/. A game names its pack in game.json
 * `soundPack` (default DEFAULT_SOUND_PACK) and gets only that pack; it overrides a sound with a
 * file of the same base name in its own assets/sfx/ folder.
 */
const SOUND_PACKS_DIR = path.join(ROOT, 'shared', 'sfx');
const DEFAULT_SOUND_PACK = 'warm';
/** game.json `mode` when it has none (the schema's default). */
const DEFAULT_MODE = 'classic';
/** The modes that have an entry in src/modes/<mode>/index.tsx. */
const MODES = ['sim', 'classic', 'haul'];
/** Where a game keeps its own sounds, relative to its folder. */
const GAME_SFX_REL = path.join('assets', 'sfx');
/** Sound file types (all bundled by Metro as assets). If one folder has `x.wav` and `x.mp3`, the earlier type wins. */
const SOUND_EXTS = ['wav', 'm4a', 'mp3'];

/** Every folder in games/ that has a game.json, except ones starting with "_". */
function listGames() {
  return fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(GAMES_DIR, d.name, 'game.json')))
    .map((d) => d.name)
    .sort();
}

/** GAME env var wins; otherwise the first game alphabetically. */
function resolveGameId() {
  const fromEnv = process.env.GAME;
  const games = listGames();
  if (fromEnv) {
    if (!games.includes(fromEnv)) {
      throw new Error(`GAME="${fromEnv}" but games/${fromEnv}/game.json does not exist. Known games: ${games.join(', ')}`);
    }
    return fromEnv;
  }
  if (games.length === 0) throw new Error('No games found in games/. Run `npm run new-game -- <id>`.');
  return games[0];
}

function gameDir(id) {
  return path.join(GAMES_DIR, id);
}

function readGameJson(id) {
  return JSON.parse(fs.readFileSync(path.join(gameDir(id), 'game.json'), 'utf8'));
}

/** First path that exists: the game's own file, else the shared default. */
function gameFileOr(id, rel, fallbackRel) {
  if (rel) {
    const p = path.join(gameDir(id), rel);
    if (fs.existsSync(p)) return p;
  }
  return fallbackRel ? path.join(ROOT, fallbackRel) : undefined;
}

/**
 * Sound files directly inside `dir`, as { key: absolute path }. A missing
 * folder is simply empty. Files are named like the catalogue keys in
 * src/services/fx/catalog.ts: lowercase letters, digits and "_", with a
 * lowercase extension. Anything else could never be played (and would not
 * survive Android's resource naming), so it is left out of the bundle.
 */
function soundsIn(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return {};
  }
  const best = {};
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const ext = path.extname(entry.name);
    if (!SOUND_EXTS.includes(ext.slice(1).toLowerCase())) continue;
    const rank = SOUND_EXTS.indexOf(ext.slice(1));
    const key = path.basename(entry.name, ext);
    const file = path.join(dir, entry.name);
    if (rank < 0 || !/^[a-z0-9_]+$/.test(key)) {
      console.warn(`[sounds] ignoring ${path.relative(ROOT, file)}: name sound files like "tap_3.wav" (lowercase, digits, "_")`);
      continue;
    }
    // An empty file is a sound that is still being written.
    if (fs.statSync(file).size === 0) continue;
    if (!best[key] || rank < best[key].rank) best[key] = { rank, file };
  }
  return Object.fromEntries(Object.entries(best).map(([key, v]) => [key, v.file]));
}

/**
 * Sound files from several folders merged into { key: absolute path }, sorted
 * by key. The key is the file's base name without its extension ("tap_3",
 * "music_main"). A later folder wins on the same key, whatever the file type.
 */
function mergeSoundDirs(dirs) {
  const merged = Object.assign({}, ...dirs.map(soundsIn));
  return Object.fromEntries(
    Object.keys(merged)
      .sort()
      .map((key) => [key, merged[key]]),
  );
}

/** The game's mode (game.json `mode`, default "classic"). Throws for a mode without an entry. */
function gameMode(id, game = readGameJson(id)) {
  const mode = game.mode || DEFAULT_MODE;
  if (!MODES.includes(mode)) throw new Error(`games/${id}/game.json: mode "${mode}" has no entry in src/modes/ (known: ${MODES.join(', ')})`);
  return mode;
}

/** The game's sound pack name (game.json `soundPack`, default "warm"). */
function soundPack(id, game = readGameJson(id)) {
  return game.soundPack || DEFAULT_SOUND_PACK;
}

/** Every sound pack folder name in shared/sfx/. */
function listSoundPacks() {
  return fs
    .readdirSync(SOUND_PACKS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

/** The folder of a game's sound pack. Throws when the game names a pack that does not exist. */
function soundPackDir(id, game = readGameJson(id)) {
  const pack = soundPack(id, game);
  const dir = path.join(SOUND_PACKS_DIR, pack);
  if (!/^[a-z0-9-]+$/.test(pack) || !fs.existsSync(dir)) {
    throw new Error(`games/${id}/game.json: soundPack "${pack}" is not a folder in shared/sfx/ (packs: ${listSoundPacks().join(', ')})`);
  }
  return dir;
}

/**
 * Every sound the game can play, as { key: path relative to the repo root }:
 * its sound pack in shared/sfx/<pack>/, overridden file by file by the game's
 * own assets/sfx/ folder. No other pack's files.
 */
function listSounds(id) {
  const merged = mergeSoundDirs([soundPackDir(id), path.join(gameDir(id), GAME_SFX_REL)]);
  return Object.fromEntries(
    Object.entries(merged).map(([key, file]) => [key, path.relative(ROOT, file).split(path.sep).join('/')]),
  );
}

/**
 * Line height and character widths of the game's display font (theme.displayFont), read from the
 * font file, or null: no display font, or a file this reader does not understand. With null the
 * app falls back to a cautious guess, so a problem here must never stop a build.
 * @param {string} id
 * @param {any} game
 * @returns {{ line: number, advances: Record<string, number> } | null}
 */
function displayFontMetrics(id, game) {
  const key = game.theme && game.theme.displayFont;
  const rel = key && game.assets && game.assets[key];
  if (!rel) return null;
  try {
    return readFontMetrics(path.join(gameDir(id), rel), moneyCharacters(game.strings && game.strings.currencySymbol));
  } catch (e) {
    console.warn(`[font] could not read ${rel}: ${e.message}. The cash counter will size itself by a guess.`);
    return null;
  }
}

/** Writes `text` to `file` only when it changes, so Metro doesn't reload for nothing. */
function writeIfChanged(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (prev !== text) fs.writeFileSync(file, text);
}

/** The text of src/generated/mode.ts for a game: it imports that game's mode entry and nothing else. */
function renderModeEntry(id, game = readGameJson(id)) {
  const mode = gameMode(id, game);
  return [
    '// AUTO-GENERATED by scripts/lib/games.js. Do not edit; set GAME=<id> instead.',
    '/* eslint-disable */',
    '// The active game\'s mode entry. The app reaches every mode-specific screen through this file only,',
    '// so a game\'s bundle holds its own mode and no other (docs/design/space-bundle.md).',
    `import entry from '../modes/${mode}';`,
    '',
    'export const MODE = ' + JSON.stringify(mode) + ';',
    'export const modeEntry = entry;',
    '',
  ].join('\n');
}

/** The text of src/generated/activeGame.ts for a game. */
function renderActiveGame(id, game = readGameJson(id)) {
  const assets = game.assets || {};
  const sounds = listSounds(id);
  const fxTable = fxTableFor(gameMode(id, game));
  const lines = [
    '// AUTO-GENERATED by scripts/lib/games.js. Do not edit; set GAME=<id> instead.',
    '/* eslint-disable */',
    `import raw from '../../games/${id}/game.json';`,
    '',
    'export const ACTIVE_GAME_ID = ' + JSON.stringify(id) + ';',
    'export const rawGame: unknown = raw;',
    'export const gameAssets: Record<string, number> = {',
    ...Object.entries(assets).map(
      ([key, rel]) => `  ${JSON.stringify(key)}: require(${JSON.stringify(`../../games/${id}/${rel}`)}),`,
    ),
    '};',
    `/** Sound files by base name: the "${soundPack(id, game)}" pack (shared/sfx/${soundPack(id, game)}/) overridden by the game\'s assets/sfx/. Played through src/services/fx. */`,
    'export const gameSounds: Record<string, number> = {',
    ...Object.entries(sounds).map(([key, rel]) => `  ${JSON.stringify(key)}: require(${JSON.stringify(`../../${rel}`)}),`),
    '};',
    '/** The display font\'s line height and character widths as fractions of the font size (null: no display font). */',
    'export const displayFontMetrics: { line: number; advances: Record<string, number> } | null = ' + JSON.stringify(displayFontMetrics(id, game)) + ';',
    '/** The fx events of this game\'s mode, from src/services/fx/catalog.ts without the briefs (scripts/lib/fxCatalog.js). */',
    'export const fxTable: Record<string, import(\'../services/fx/catalog\').FxRuntimeDef> = {',
    ...Object.entries(fxTable).map(([key, def]) => `  ${key}: ${JSON.stringify(def)},`),
    '};',
    '',
  ];
  return lines.join('\n');
}

/**
 * Writes src/generated/activeGame.ts and src/generated/mode.ts so the JS bundle
 * contains only this game's JSON, images, sounds, fx events and mode. Metro
 * needs static require() calls, so these files are generated instead of
 * computed at runtime. Re-run it (`npm run select`, or restart `expo start`)
 * after adding or removing a sound file.
 */
function writeActiveGame(id) {
  const game = readGameJson(id);
  writeIfChanged(GENERATED, renderActiveGame(id, game));
  writeIfChanged(GENERATED_MODE, renderModeEntry(id, game));
  return game;
}

module.exports = {
  ROOT,
  GAMES_DIR,
  listGames,
  resolveGameId,
  gameDir,
  readGameJson,
  gameFileOr,
  mergeSoundDirs,
  listSounds,
  listSoundPacks,
  soundPack,
  soundPackDir,
  gameMode,
  MODES,
  DEFAULT_MODE,
  DEFAULT_SOUND_PACK,
  SOUND_PACKS_DIR,
  displayFontMetrics,
  renderActiveGame,
  renderModeEntry,
  writeActiveGame,
};
