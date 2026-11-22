/** Types of the shared art kit (moved from src/ui/sim/art/types.ts; the restaurant's types stay there). */
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
