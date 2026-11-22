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
  haul: ['src/modes/haul', 'src/ui/haul'],
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
      'src/ui/components/RollingNumber.tsx',
      'src/ui/components/TabBar.tsx',
      'src/ui/components/headerMetrics.ts',
      'src/ui/components/moneyWidth.ts',
      'src/ui/components/rollFormat.ts',
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
const NODE_ONLY = ['src/services/fx/catalog.ts', 'src/config/artIcons.ts', 'src/config/lint.ts'];

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

module.exports = { MODE_FOLDERS, FAMILIES, SHARED_UI, SHARED_SRC, CLASSIFIED_ROOT, NODE_ONLY, THEME_WORDS_ALLOWED, THEME_WORDS, MODE_PACKAGES, RESTAURANT_RIG, GENERATED_ENTRY, SOUND_PACKS };
