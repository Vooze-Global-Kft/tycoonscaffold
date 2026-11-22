// Which folders and packages belong to which game mode. Read by scripts/check-bundle.ts (the
// bundle check) and its rules (scripts/lib/bundleRules.ts). Plain CommonJS, like games.js.
//
// Three levels of code (docs/design/space-bundle.md has the file-by-file table):
//   (a) shared by every game (SHARED_UI under src/ui, and everything in src/ outside src/ui and the
//       mode folders): no drawn art of any game, no screens of any game, no game words;
//   (b) a family (FAMILIES): code some modes have in common and the others must never bundle;
//   (c) a mode's own folders (MODE_FOLDERS).
// A mode file may import its own folders, its families and shared files; a family file only its
// family and shared files; a shared file only shared files. Modes are reached only through the
// generated entry (src/generated/mode.ts), which imports the active game's mode entry
// (src/modes/<mode>/index.tsx). A file under src/ui in none of the lists is unclassified: it
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
 * no screens, no game words. Outside src/ui, everything in src/ that is not in a mode's folders
 * is level a too (engine, state, services, config, dev, generated, src/modes/contract.ts).
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

/** The folder whose files must be classified (in SHARED_UI, a family or a mode). */
const UI_ROOT = 'src/ui';

/**
 * Files read by the Node tools only (validate, make_sfx, tests): never in any game's bundle. The
 * fx catalogue holds every event's description; the art icon list names every mode's icons; the
 * game-data lint's messages name every mode's things.
 */
const NODE_ONLY = ['src/services/fx/catalog.ts', 'src/config/artIcons.ts', 'src/config/lint.ts'];

/**
 * Words that name a thing of a mode's theme, for `npm run check:bundle -- --words`: it lists the
 * string literals of every other mode's bundle (in its shared and family files) that use them.
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

module.exports = { MODE_FOLDERS, FAMILIES, SHARED_UI, UI_ROOT, NODE_ONLY, THEME_WORDS, MODE_PACKAGES, RESTAURANT_RIG, GENERATED_ENTRY, SOUND_PACKS };
