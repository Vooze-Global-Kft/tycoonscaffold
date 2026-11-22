// Which folders and packages belong to which game mode. Read by scripts/check-bundle.ts (the
// bundle check) and its rules (scripts/lib/bundleRules.ts). Plain CommonJS, like games.js.
//
// Three levels of code (docs/design/space-bundle.md has the file-by-file table):
//   (a) shared by every game (SHARED_UI under src/ui and SHARED_SRC in the rest of src/): no drawn
//       art of any game, no screens of any game, no game words;
//   (b) a family (FAMILIES): code some modes have in common and the others must never bundle;
//   (c) a mode's own folders (MODE_FOLDERS).
// A mode file may import its own folders, its families and shared files; a family file only its
// family and shared files; a shared file only shared files. Modes are reached only through the
// generated entry (src/generated/mode.ts), which imports the active game's mode entry
// (src/modes/<mode>/index.tsx). A file anywhere in src/ in none of the lists is unclassified: it
// fails the check until it is listed.

/** Repo-relative folders owned by each mode. */
const MODE_FOLDERS = {
  sim: ['src/modes/sim', 'src/ui/sim'],
  classic: ['src/modes/classic', 'src/ui/scene'],
  // The haul rules too: only the haul entry reaches them (through src/engine/mode.ts), so no other game bundles them.
  // Its content schema as well (names like "Long Haul", "Twin Rig" in its starting content): the shared schema keeps
  // the haul block opaque, and the haul engine mode parses it at install (src/engine/haulMode.ts `config`).
  haul: ['src/modes/haul', 'src/ui/haul', 'src/engine/haul', 'src/engine/haul.ts', 'src/engine/haulMode.ts', 'src/engine/loadout.ts', 'src/engine/fixtures/haul.ts', 'src/config/schema.haul.ts'],
};

/**
 * Families: files shared by some modes only. "tabs" is what the sim and classic modes have in
 * common: the tab shell, its header, tab bar, banner and dialogs, the list homes, the meta
 * screens, and the first game's drawn kit (pens, chest, cards, coin, gem, sparkle, tutorial glove,
 * and the six "art:" icons drawn in that style). A mode outside `modes` never bundles them.
 */
const FAMILIES = {
  tabs: {
    modes: ['sim', 'classic'],
    paths: [
      'src/ui/shell',
      'src/ui/home',
      'src/ui/meta',
      'src/ui/components/Banner.tsx',
      'src/ui/components/Celebration.tsx',
      'src/ui/components/Header.tsx',
      'src/ui/components/Modals.tsx',
      'src/ui/components/TabBar.tsx',
      'src/ui/components/headerMetrics.ts',
      'src/ui/components/moneyWidth.ts',
      'src/ui/art/clock.ts',
      'src/ui/art/draw.ts',
      'src/ui/art/kit.ts',
      'src/ui/art/props.tsx',
      'src/ui/art/raster.ts',
      'src/ui/art/types.ts',
      'src/ui/play',
    ],
  },
};

/**
 * Files under src/ui that every game ships (level a): mechanics and a neutral kit, no drawings,
 * no screens, no game words.
 */
const SHARED_UI = [
  'src/ui/App.tsx',
  'src/ui/colors.ts',
  'src/ui/theme.ts',
  'src/ui/modeParts.tsx',
  'src/ui/art/ArtIcon.tsx',
  'src/ui/art/icons.ts',
  'src/ui/components/Button.tsx',
  'src/ui/components/GameIcon.tsx',
  // A number that rolls to its value (a TextInput driven on the UI thread) and its digit formats: no art, no
  // family import. Reclassed from the header group so the haul dock counter can use it (spec Decisions).
  'src/ui/components/RollingNumber.tsx',
  'src/ui/components/rollFormat.ts',
  'src/ui/components/counterPulse.ts',
  'src/ui/hints',
  'src/ui/juice',
  'src/ui/kit',
];

/**
 * Files and folders in src/ outside src/ui that every game ships (level a): the engine rules,
 * state, services, config, dev switches, the generated files and the mode contract. A new folder
 * or file in src/ goes here only if it holds nothing of one game (no drawings, no screens, no words).
 */
const SHARED_SRC = [
  'src/boot.ts',
  'src/boot.web.ts',
  'src/config',
  'src/dev',
  'src/engine',
  'src/generated',
  'src/modes/contract.ts',
  'src/services',
  'src/state',
];

/** The folder whose files must be classified (in SHARED_UI, SHARED_SRC, a family or a mode). */
const CLASSIFIED_ROOT = 'src';

/**
 * Files read by the Node tools only (validate, make_sfx, tests): never in any game's bundle. The
 * fx catalogue holds every event's description; the art icon list names every mode's icons; the
 * game-data lint's messages name every mode's things.
 */
const NODE_ONLY = ['src/services/fx/catalog.ts', 'src/services/fx/catalog.haul.ts', 'src/config/artIcons.ts', 'src/config/lint.ts'];

/**
 * Words that name a thing of a mode's theme. The bundle check fails on a string literal in a
 * game's shared or family files that uses another mode's words, unless that literal is in
 * THEME_WORDS_ALLOWED (the remainder known when the check started failing: shared identifiers
 * and event keys, listed file by file). `npm run check:bundle -- --words` lists every hit.
 * Matched as whole words in any case, plural and -ing/-ed forms included ("cook_done", "guestsPaid").
 */
const THEME_WORDS = {
  sim: [
    'kitchen', 'waiter', 'chef', 'guest', 'oven', 'pizza', 'restaurant', 'franchise', 'recipe', 'cook', 'table', 'dish',
    'stove', 'prep', 'dessert', 'espresso', 'fryer', 'dining', 'diner', 'menu', 'serve', 'seat', 'maitre', 'bell', 'dough',
    'truffle', 'nonna', 'pasta', 'gelato', 'plate', 'tray', 'food', 'meal', 'customer', 'storefront', 'venue', 'rush',
  ],
  haul: [
    'space', 'mining', 'miner', 'mine', 'asteroid', 'ore', 'drone', 'freighter', 'rocket', 'planet', 'galaxy', 'orbit',
    'haul', 'hauler', 'rock', 'crystal', 'fuel', 'cargo', 'station', 'warp', 'pod', 'rig', 'credit',
  ],
};

/** npm packages that only these modes may bundle (three.js and the GL view are the classic 3D asteroid's). */
const MODE_PACKAGES = {
  three: ['classic'],
  'expo-gl': ['classic'],
};

/**
 * The restaurant's cartoon-people rig: Character and its poses, the bust portraits and the looks.
 * Also inside the sim folders; named separately so a report says plainly when it leaks.
 */
const RESTAURANT_RIG = [
  'src/ui/sim/art/Character.tsx',
  'src/ui/sim/art/CharacterBust.tsx',
  'src/ui/sim/art/characterArt.ts',
  'src/ui/sim/art/rig.ts',
  'src/ui/sim/art/looks.ts',
];

/** The one shared file allowed to import a mode entry. */
const GENERATED_ENTRY = 'src/generated/mode.ts';

/** Folder of the sound packs: shared/sfx/<pack>/. */
const SOUND_PACKS = 'shared/sfx';

/**
 * The known remainder of other themes' words in shared and family code: { file: [literal, ...] }.
 * Only these exact literals pass; any new one fails the check. Shrink it, never grow it for text
 * a player reads (move that text into the game's data or into the mode's folders instead).
 */
const THEME_WORDS_ALLOWED = require('./themeWords.allowed.json');

/**
 * Development tools of the web preview that a phone bundle (ios, android) must never hold (store-13,
 * phone-12, perf-8): Metro takes these `.web.ts` files for the web build only, and their phone twins
 * (`devtools.ts`, `presets.ts`, `devViews.ts`) hold nothing; the balance bot and the rules'
 * fixtures are reached only from the web presets.
 */
const WEB_ONLY = [
  'src/dev/devtools.web.ts',
  'src/dev/presets.web.ts',
  'src/modes/haul/presets.web.ts',
  'src/modes/haul/devViews.web.ts',
  'src/modes/sim/devViews.web.ts',
  'src/ui/haul/dev.web.ts',
  'src/engine/haul/bot.ts',
  'src/engine/fixtures/haul.ts',
];

/**
 * Strings of those tools a phone bundle must not hold either: `text` is matched in the shipped
 * JavaScript (and in the source of the bundled files in the fast stage); `quoted` matches only as a
 * whole string literal ('staff' or "staff"); `modes` limits it to those modes' bundles (the tab
 * shell's tab names are real in sim and classic, and dead dev code of another game's screens in haul);
 * `exportOnly` matches only in the shipped JavaScript, not in the sources of the fast stage.
 */
// ('upgrades', the third of the tab shell's own tab names, is also a field of every save: not listed.)
const WEB_ONLY_STRINGS = [
  { text: 'runHaulBot' },
  { text: 'freshBotGame' },
  { text: 'haulFixtures' },
  // The page address's switches are read only by the .web.ts tools (src/dev/devtools.web.ts,
  // src/ui/haul/dev.web.ts); a library's own use (node_modules) is not counted. Haul only: the
  // first game's files keep their own web-guarded readers (they do not change). Shipped code only
  // (exportOnly): src/ui/haul/scene/Field.tsx reads it behind `__DEV__ &&`, which a release strips.
  { text: 'location.search', modes: ['haul'], exportOnly: true },
  { text: 'staff', quoted: true, modes: ['haul'] },
  { text: 'empire', quoted: true, modes: ['haul'] },
];

module.exports = { MODE_FOLDERS, FAMILIES, SHARED_UI, SHARED_SRC, CLASSIFIED_ROOT, NODE_ONLY, THEME_WORDS_ALLOWED, THEME_WORDS, MODE_PACKAGES, RESTAURANT_RIG, GENERATED_ENTRY, SOUND_PACKS, WEB_ONLY, WEB_ONLY_STRINGS };
