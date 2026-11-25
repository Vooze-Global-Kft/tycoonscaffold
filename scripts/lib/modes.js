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
  // Night Market (docs/design/market-design.md 9.2): the merge rules, their schema (starting content names
  // "Pepper Skewer", "Old Brindle", ...) and fixtures belong to the merge mode exactly as haul's do.
  merge: ['src/modes/merge', 'src/ui/merge', 'src/engine/merge', 'src/engine/merge.ts', 'src/engine/mergeMode.ts', 'src/engine/fixtures/merge.ts', 'src/config/schema.merge.ts', 'src/config/merge.content.ts'],
  // High Office (docs/design/office-design.md 9.2): the decree rules, their schema (its runtime deck names
  // "Dithering-on-the-Dawdle", "Bus Spotters' Society", ...), fixtures and generated content, as merge's.
  decree: ['src/modes/decree', 'src/ui/decree', 'src/engine/decree', 'src/engine/decree.ts', 'src/engine/decreeMode.ts', 'src/engine/fixtures/decree.ts', 'src/engine/fixtures/decree.numbers.json', 'src/config/schema.decree.ts', 'src/config/decree.content.ts'],
  // The scrapyard (docs/design/yard-ground.md; the rules come with docs/design/yard-design.md): the salvage
  // rules, their schema, fixtures and content, the walkable yard and its screens, as decree's.
  salvage: ['src/modes/salvage', 'src/ui/salvage', 'src/engine/salvage', 'src/engine/salvage.ts', 'src/engine/salvageMode.ts', 'src/engine/fixtures/salvage.ts', 'src/config/schema.salvage.ts', 'src/config/salvage.content.ts'],
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
const NODE_ONLY = ['src/services/fx/catalog.ts', 'src/services/fx/catalog.haul.ts', 'src/services/fx/catalog.merge.ts', 'src/services/fx/catalog.decree.ts', 'src/services/fx/catalog.salvage.ts', 'src/config/artIcons.ts', 'src/config/lint.ts'];

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
  // Night Market (spec 9.2): each word only if `--words` finds no literal of it in shared or family files.
  // Not "merge": the shared engine seam's own literals use it ("engine.mergeReport" in src/state/store.ts,
  // the mode id "merge" in src/config/schema.ts), and the word names no thing a player reads.
  merge: ['stall', 'lantern', 'skewer', 'dumpling', 'noodle', 'steamer', 'minder', 'parade', 'festival', 'ticket'],
  // High Office (office-design.md 9.2): each word only where `--words` finds no literal of it in shared or
  // family files. Not "decree": the mode id itself is a shared literal (src/config/schema.ts), and names no thing a player reads.
  decree: ['mayor', 'governor', 'ministry', 'ward', 'gossip', 'scandal', 'boycott', 'dibs'],
  // The scrapyard (yard-ground.md): each word only where `--words` finds no literal of it in shared or family
  // files. Not "salvage": the mode id itself is a shared literal (src/config/schema.ts), and names no thing a player reads.
  salvage: ['scrapyard', 'scrap', 'wreck', 'ingot', 'furnace', 'smelter', 'shredder', 'baler', 'forklift'],
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
  // Night Market (spec 8.1, 9.2): the merge bot has no Node imports (the web presets are built from its states).
  'src/modes/merge/presets.web.ts',
  'src/modes/merge/devViews.web.ts',
  'src/engine/merge/bot.ts',
  'src/engine/fixtures/merge.ts',
  // High Office (office-design.md 8.1, 9.2): the decree bot, the rules' fixtures and the web-only tools.
  'src/modes/decree/presets.web.ts',
  'src/modes/decree/devViews.web.ts',
  'src/engine/decree/bot.ts',
  'src/engine/fixtures/decree.ts',
  'src/engine/fixtures/decree.numbers.json',
  // The merge screens' preview switches (lead, 23 Nov: the screens lead lists them; phones take each file's plain twin).
  'src/ui/merge/play/devSlow.web.ts',
  'src/ui/merge/spokes/dev.web.ts',
  'src/ui/merge/sheets/dev.web.ts',
  'src/ui/merge/hud/fontScale.web.ts',
  'src/ui/merge/devInsets.web.ts',
  // The decree screens' preview switches (the screens lead lists them; phones take each file's plain twin).
  'src/ui/decree/desk/dev.web.ts',
  'src/ui/decree/desk/devButtons.web.ts',
  'src/ui/decree/desk/fontScale.web.ts',
  'src/ui/decree/hud/fontScale.web.ts',
  'src/ui/decree/sheets/dev.web.ts',
  'src/ui/decree/views/dev.web.ts',
  // The scrapyard's preview tools (yard-ground.md): the review screens, the presets, the development panel
  // and its address switches (phones take each file's plain twin).
  'src/modes/salvage/presets.web.ts',
  'src/modes/salvage/devViews.web.ts',
  // The salvage rules' frozen test content and states and the balance bot (yard-stage1.md section 9, hour 0).
  'src/engine/fixtures/salvage.ts',
  'src/engine/salvage/bot.ts',
  'src/ui/salvage/dev/DevPanel.web.tsx',
  'src/ui/salvage/dev/switches.web.ts',
  // The loading animation's preview switches (lt=, ltitle=, lrm=, lready=, lseen=; the frame log).
  'src/ui/salvage/loading/dev.web.ts',
  // The first yard's screens' preview switches (requests.md, 25 November): the overlays' ?card= and
  // ?fontScale=, the world labels' fontScale= and fxdemo=, the hud's ?fontScale=1.3 and ?hudDemo=.
  'src/ui/salvage/overlays/devOpen.web.ts',
  'src/ui/salvage/world/labelsDev.web.ts',
  'src/ui/salvage/hud/fontScale.web.ts',
  'src/ui/salvage/hud/dev.web.ts',
  // The hints' scripted thumb of the preview (?autoplay=opening&route=1|2); phones take autoplay.tsx (null).
  'src/ui/salvage/hints/autoplay.web.tsx',
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
  { text: 'mergeFixtures' },
  { text: 'decreeFixtures' },
  { text: 'SALVAGE_TEST_RAW' },
  // The page address's switches are read only by the .web.ts tools (src/dev/devtools.web.ts,
  // src/ui/haul/dev.web.ts); a library's own use (node_modules) is not counted. Haul only: the
  // first game's files keep their own web-guarded readers (they do not change). Shipped code only
  // (exportOnly): src/ui/haul/scene/Field.tsx reads it behind `__DEV__ &&`, which a release strips.
  { text: 'location.search', modes: ['haul'], exportOnly: true },
  { text: 'staff', quoted: true, modes: ['haul'] },
  { text: 'empire', quoted: true, modes: ['haul'] },
];

module.exports = { MODE_FOLDERS, FAMILIES, SHARED_UI, SHARED_SRC, CLASSIFIED_ROOT, NODE_ONLY, THEME_WORDS_ALLOWED, THEME_WORDS, MODE_PACKAGES, RESTAURANT_RIG, GENERATED_ENTRY, SOUND_PACKS, WEB_ONLY, WEB_ONLY_STRINGS };
