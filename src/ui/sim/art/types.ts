/**
 * Types for the code-drawn cast and props.
 *
 * A `CharacterLook` is plain JSON so it can be authored in game.json. Every
 * field is optional: `{}` is a perfectly good customer, and
 * `{ "kind": "chef" }` is a chef in whites and a toque. The `*_VALUES` arrays
 * are exported so the config schema can validate looks with `z.enum(...)`.
 */

export const CHARACTER_KINDS = ['chef', 'waiter', 'customer', 'manager'] as const;
export type CharacterKind = (typeof CHARACTER_KINDS)[number];

export const SPECIES = ['human', 'alien', 'robot'] as const;
export type Species = (typeof SPECIES)[number];

export const BODY_SHAPES = ['round', 'slim', 'small'] as const;
export type BodyShape = (typeof BODY_SHAPES)[number];

export const HAIR_STYLES = ['short', 'slick', 'curly', 'long', 'bob', 'bun', 'braids', 'ponytail', 'spiky', 'big', 'wild', 'bald'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HATS = ['none', 'toque', 'bandana', 'cap', 'tophat', 'bow', 'headscarf', 'helmet', 'straw', 'crown', 'minitoque'] as const;
export type Hat = (typeof HATS)[number];

export const OUTFIT_STYLES = ['tee', 'chef', 'vest', 'suit', 'dress', 'coat', 'overalls', 'spacesuit', 'robe'] as const;
export type OutfitStyle = (typeof OUTFIT_STYLES)[number];

export const PATTERNS = ['plain', 'pinstripe', 'dots', 'stripes'] as const;
export type Pattern = (typeof PATTERNS)[number];

export const GLASSES = ['round', 'square', 'goggles', 'shades'] as const;
export type Glasses = (typeof GLASSES)[number];

export const MOUSTACHES = ['bushy', 'curled', 'thin'] as const;
export type Moustache = (typeof MOUSTACHES)[number];

export const BEARDS = ['full', 'goatee'] as const;
export type Beard = (typeof BEARDS)[number];

export const BROWS = ['none', 'soft', 'thick', 'smug', 'worried'] as const;
export type Brows = (typeof BROWS)[number];

export const NECKWEAR = ['none', 'bowtie', 'tie', 'kerchief', 'sash', 'scarf'] as const;
export type Neckwear = (typeof NECKWEAR)[number];

/** How a character looks. Plain data; every field has a default (see `resolveLook`). */
export interface CharacterLook {
  /** The job. Picks the default outfit: chef whites and a toque, waiter vest and bow tie, and so on. Default `customer`. */
  kind?: CharacterKind;
  /** `human` (default), `alien` (green skin, three eyes, antennae) or `robot` (metal head, light-up eyes). */
  species?: Species;
  /** Body shape: `round` (default), `slim` or `small` (children, grandmothers, little aliens). */
  body?: BodyShape;
  /** Skin colour, #RRGGBB. For robots this is the metal colour. */
  skin?: string;
  /** Hair colour, #RRGGBB. */
  hair?: string;
  hairStyle?: HairStyle;
  /** Main clothing colour. */
  outfit?: string;
  /** Second colour: neckerchief, bow tie, trim, hat band. */
  accent?: string;
  /** Cut of the clothes. Default depends on `kind`. */
  outfitStyle?: OutfitStyle;
  /** Pattern printed on the outfit (and on a headscarf or bandana). */
  pattern?: Pattern;
  /** Trouser / skirt-leg colour. Default: a darker tone that suits the outfit. */
  pants?: string;
  shoes?: string;
  hat?: Hat;
  /** Hat colour. Default depends on the hat (white toque, accent-coloured cap, ...). */
  hatColor?: string;
  /** `true` for a white apron, or a colour. */
  apron?: boolean | string;
  /** `true` for round glasses. */
  glasses?: boolean | Glasses;
  /** `true` for a bushy moustache. */
  moustache?: boolean | Moustache;
  /** `true` for a full beard. */
  beard?: boolean | Beard;
  /** `true` for gold earrings, or a colour. */
  earrings?: boolean | string;
  /** Rosy cheeks. Default true. */
  blush?: boolean;
  /** Eyelashes. */
  lashes?: boolean;
  brows?: Brows;
  /** What is worn at the neck. Default depends on `kind`. */
  neck?: Neckwear;
  /** Iris colour for big busts and robot / alien eye glow. */
  eyes?: string;
}

export const POSES = ['idle', 'walk', 'carry', 'cook', 'toss', 'sit-wait', 'sit-eat', 'cheer', 'sleep', 'wave'] as const;
/**
 * What a character is doing.
 * - `idle`: standing, breathing, blinking now and then
 * - `walk`: feet alternate, body bobs and leans
 * - `carry`: a tray held up with a dish on it; the legs walk while the character moves and stand when it stops
 * - `cook`: whisking in a bowl at a station
 * - `toss`: throws a spinning disc of dough up and catches it
 * - `sit-wait`: seated, swinging feet, a small "hungry" thought bubble
 * - `sit-eat`: seated, munching, crumbs and a heart now and then
 * - `cheer`: jumps with both arms up
 * - `sleep`: head down, drifting z shapes
 * - `wave`: a greeting
 */
export type Pose = (typeof POSES)[number];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export const STATION_KINDS = ['oven', 'stove', 'prep', 'dessert', 'espresso', 'fryer'] as const;
export type StationKind = (typeof STATION_KINDS)[number];

export const DISH_KINDS = ['pizza', 'plate', 'bowl', 'dessert', 'cup', 'bites'] as const;
/** `pizza` is a whole pizza; the others are generic dishes whose food takes its colour from `DishColors.food`. */
export type DishKind = (typeof DISH_KINDS)[number];

/** Colours of one dish, so each station's food can look different. */
export interface DishColors {
  /** The food itself (cheese, pasta, gelato, coffee). */
  food?: string;
  /** Sauce, toppings or garnish. */
  topping?: string;
  /** Small green/fresh garnish. */
  garnish?: string;
  /** The plate, bowl or cup. */
  plate?: string;
}

/** A dish to draw: what kind and in which colours. */
export interface DishLook extends DishColors {
  kind?: DishKind;
}

export const TABLE_STATES = ['empty', 'food', 'finished'] as const;
export type TableState = (typeof TABLE_STATES)[number];

export const CHEST_TIERS = ['wood', 'silver', 'gold'] as const;
export type ChestTier = (typeof CHEST_TIERS)[number];

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

/**
 * The small palette every prop is drawn from, so a re-themed game recolours
 * its whole scene by changing a few values (see `makePalette`).
 */
export interface ArtPalette {
  /** Outline colour of everything. */
  outline: string;
  /** Brand colour: awning stripes, tablecloth checks, oven tiles, card backs. */
  primary: string;
  /** Second brand colour: trims, signs, cushions. */
  accent: string;
  /** Furniture and counters. */
  wood: string;
  /** Appliances and pans. */
  metal: string;
  /** Oven dome, bricks. */
  stone: string;
  /** Fire and warm light. */
  glow: string;
  /** Linen: tablecloth base, plates, napkins. */
  cloth: string;
  /** Wall colour. */
  wall: string;
  /** The two floor tile colours. */
  floorA: string;
  floorB: string;
}
